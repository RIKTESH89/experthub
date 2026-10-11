import { authorizeChatPersistence } from "@/lib/persona/persistence";
import { createProviderStreamState } from "@/lib/ai/provider-stream";
import { createChatRequestLifecycle, abortableDelay, ChatRequestStopped } from "@/lib/ai/request-lifecycle";
import { hasSubscriptionAccess } from "@/lib/payments/access";
import { createSSEDecoder } from "@/lib/ai/sse";
import { toMessageSources } from "@/lib/ai/citations";
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { z } from "zod";
import { runChatEngine } from "@/lib/ai/chat-engine";
import { checkTrialAccess, incrementTrialUsage } from "@/lib/trial";
import { extractMemories } from "@/lib/ai/memory-extractor";
import { chronologicalHistory } from "@/lib/ai/history";
import { saveMemories } from "@/lib/ai/memory-manager";

const sendMessageSchema = z.object({
  content: z.string().min(1, "Message content is required"),
  enableWebSearch: z.boolean().default(false),
});

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ sessionId: string }> }
) {
  const lifecycle = createChatRequestLifecycle(request.signal);
  let returnedStream = false;
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { sessionId } = await params;

    const chatSession = await prisma.chatSession.findUnique({
      where: { id: sessionId },
      include: {
        expertProfile: {
          select: {
            userId: true,
            vectorNamespace: true,
          },
        },
        messages: {
          orderBy: [{ createdAt: "desc" }, { id: "desc" }],
          take: 20,
        },
      },
    });

    if (!chatSession) {
      return NextResponse.json(
        { error: "Chat session not found" },
        { status: 404 }
      );
    }

    if (chatSession.subscriberId !== session.user.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Check trial limits if this is a trial session
    if (chatSession.isTrial) {
      const trial = await checkTrialAccess(
        session.user.id,
        chatSession.expertProfileId
      );
      if (!trial.allowed) {
        return NextResponse.json(
          {
            error: "Free trial exhausted",
            code: "TRIAL_EXHAUSTED",
            questionsUsed: trial.used,
            questionsAllowed: trial.limit,
          },
          { status: 403 }
        );
      }
    } else {
      // Subscribed user — enforce tier-based monthly limits
      const subscription = await prisma.expertSubscription.findUnique({
        where: {
          subscriberId_expertProfileId: {
            subscriberId: session.user.id,
            expertProfileId: chatSession.expertProfileId,
          },
        },
      });

      if (!hasSubscriptionAccess(subscription) && chatSession.expertProfile.userId !== session.user.id) {
        return NextResponse.json({ error: "Your paid period has ended or is not confirmed. Start a free session or subscribe.", code: "NO_CURRENT_SUBSCRIPTION" }, { status: 403 });
      }
      if (subscription && hasSubscriptionAccess(subscription)) {
        const pricingTier = await prisma.expertPricingTier.findUnique({
          where: {
            expertProfileId_tier: {
              expertProfileId: chatSession.expertProfileId,
              tier: subscription.tier,
            },
          },
        });

        const monthlyLimit = pricingTier?.monthlyQuestions ?? null;

        if (monthlyLimit !== null) {
          const now = new Date();
          const monthKey = now.getFullYear() * 100 + (now.getMonth() + 1);

          const monthlyUsage = await prisma.monthlyTwinUsage.findUnique({
            where: {
              subscriberId_expertProfileId_month: {
                subscriberId: session.user.id,
                expertProfileId: chatSession.expertProfileId,
                month: monthKey,
              },
            },
          });

          const questionsUsed = monthlyUsage?.questionCount ?? 0;

          if (questionsUsed >= monthlyLimit) {
            return NextResponse.json(
              {
                error: "Monthly question limit reached",
                code: "QUOTA_EXHAUSTED",
                questionsUsed,
                questionsAllowed: monthlyLimit,
                tier: subscription.tier,
              },
              { status: 403 }
            );
          }
        }
      }
    }

    const body = await request.json();
    const validation = sendMessageSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { error: "Validation failed", details: validation.error.flatten() },
        { status: 400 }
      );
    }

    const { content, enableWebSearch } = validation.data;

    // Save user message
    await prisma.chatMessage.create({
      data: {
        chatSessionId: sessionId,
        senderId: session.user.id,
        role: "user",
        content,
      },
    });

    // Increment usage counters
    if (chatSession.isTrial) {
      await incrementTrialUsage(session.user.id, chatSession.expertProfileId);
    } else {
      // Increment monthly usage for subscribed users
      const now = new Date();
      const monthKey = now.getFullYear() * 100 + (now.getMonth() + 1);

      await prisma.monthlyTwinUsage.upsert({
        where: {
          subscriberId_expertProfileId_month: {
            subscriberId: session.user.id,
            expertProfileId: chatSession.expertProfileId,
            month: monthKey,
          },
        },
        create: {
          subscriberId: session.user.id,
          expertProfileId: chatSession.expertProfileId,
          month: monthKey,
          questionCount: 1,
        },
        update: {
          questionCount: { increment: 1 },
        },
      });
    }

    // Build chat history for context
    const chatHistory = chronologicalHistory(chatSession.messages).map((msg: { role: string; content: string; sources?: unknown }) => ({
      role: msg.role as "user" | "assistant" | "system",
      content: msg.content,
      sources: msg.sources,
    }));

    // Run chat engine with streaming (now includes subscriberId for memory)
    const { stream, sources, thinkingSteps, persistenceSnapshot } = await runChatEngine({
      expertId: chatSession.expertProfile.userId,
      subscriberId: chatSession.subscriberId,
      query: content,
      chatHistory,
      enableWebSearch,
      signal: lifecycle.signal,
    });

    // Own the provider reader before thinking pacing, so an early disconnect
    // cancels the body even when no model bytes have been read yet.
    const reader = stream.getReader();
    const decoder = createSSEDecoder();
    const encoder = new TextEncoder();
    const providerState = createProviderStreamState();
    let fullResponse = "", thinkingIndex = 0, ended = false;
    let background: Promise<void> | undefined;
    let stop: (() => void) | undefined;
    const finish = () => {
      if (ended) return false;
      ended = true;
      if (stop) lifecycle.signal.removeEventListener("abort", stop);
      if (!background) lifecycle.dispose();
      return true;
    };
    const cancelReader = () => reader.cancel(lifecycle.signal.reason).catch(() => {}).finally(() => { try { reader.releaseLock(); } catch { /* read cancellation still settling */ } });
    const parse = (data: string, controller: ReadableStreamDefaultController<Uint8Array>) => {
      lifecycle.check();
      const content = providerState.accept(data);
      if (typeof content === "string" && content) {
        fullResponse += content;
        controller.enqueue(encoder.encode(`data: ${JSON.stringify({ content })}\n\n`));
        return true;
      }
      return false;
    };
    const thinkingAndContentStream = new ReadableStream<Uint8Array>({
      start(controller) {
        stop = () => {
          void cancelReader();
          if (finish()) controller.error(lifecycle.signal.reason);
        };
        lifecycle.signal.addEventListener("abort", stop, { once: true });
        if (lifecycle.signal.aborted) stop();
      },
      async pull(controller) {
        if (ended) return;
        try {
          lifecycle.check();
          if (thinkingIndex < thinkingSteps.length) {
            controller.enqueue(encoder.encode(`data: ${JSON.stringify({ thinking: thinkingSteps[thinkingIndex++] })}\n\n`));
            await abortableDelay(400, lifecycle.signal);
            return;
          }
          // A split UTF-8/SSE chunk may produce no downstream event. Keep
          // reading while demand is pending; yield as soon as content enqueues.
          while (true) {
          const { done, value } = await reader.read();
          lifecycle.check();
          let emitted = false;
          for (const data of decoder.push(value, done)) emitted = parse(data, controller) || emitted;
          if (!done) { if (emitted) return; continue; }
          if (!providerState.done) throw new Error("Provider stream ended without DONE");
          let messageId: string | undefined;
          if (fullResponse) {
            // The synchronous commit decision is the cancellation boundary.
            // Cancellation during any awaited SQL write rolls this transaction
            // back. A disconnect after COMMIT starts cannot undo committed data.
            const saved = await prisma.$transaction(async tx => {
              lifecycle.check();
              await authorizeChatPersistence(tx, persistenceSnapshot, sessionId, chatSession.subscriberId, session.user.role);
              lifecycle.check();
              const message = await tx.chatMessage.create({ data: {
                chatSessionId: sessionId, role: "assistant", content: fullResponse,
                sources: JSON.parse(JSON.stringify(sources)),
              } });
              lifecycle.check();
              await tx.chatSession.update({ where: { id: sessionId }, data: { updatedAt: new Date() } });
              lifecycle.check();
              // Recheck clock-based subscription expiry immediately before commit.
              await authorizeChatPersistence(tx, persistenceSnapshot, sessionId, chatSession.subscriberId, session.user.role);
              lifecycle.check();
              lifecycle.decideCommit();
              return message;
            });
            messageId = saved.id;
            lifecycle.check();
            // Preserve best-effort analytics/memory policy, but bind both work
            // and their SQL transactions to the same request/deadline signal.
            background = (async () => {
              try {
                await prisma.$transaction(async tx => {
                  lifecycle.check();
                  await tx.twinInteraction.create({ data: {
                    expertProfileId: chatSession.expertProfileId, chatSessionId: sessionId,
                    question: content, answerQuality: sources.length ? sources.reduce((sum: number, s: { score: number }) => sum + (s.score || 0), 0) / sources.length : 0,
                    sourcesUsed: sources.length, isFromWidget: false,
                  } });
                  lifecycle.check();
                  lifecycle.decideCommit();
                });
              } catch { lifecycle.check(); /* noncritical analytics failure */ }
              lifecycle.check();
              const memories = await extractMemories(content, fullResponse, lifecycle.signal);
              lifecycle.check();
              if (memories.length) await saveMemories(chatSession.subscriberId, chatSession.expertProfileId, memories, lifecycle.signal);
            })().catch(() => {}).finally(() => lifecycle.dispose());
          }
          lifecycle.check();
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ done: true, messageId, sources: toMessageSources(sources) })}\n\n`));
          reader.releaseLock();
          if (finish()) controller.close();
          return;
          }
        } catch (error) {
          lifecycle.abort(error instanceof Error ? error : new ChatRequestStopped("cancelled"));
          await cancelReader();
          if (finish()) controller.error(error);
        }
      },
      async cancel() {
        lifecycle.abort();
        await cancelReader();
        finish();
      },
    });
    returnedStream = true;

    return new NextResponse(thinkingAndContentStream, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
      },
    });
  } catch (error) {
    if (lifecycle.signal.aborted) {
      const reason = lifecycle.signal.reason;
      return NextResponse.json({ error: reason instanceof ChatRequestStopped && reason.kind === "deadline" ? "Chat request deadline exceeded" : "Chat request cancelled" }, { status: reason instanceof ChatRequestStopped && reason.kind === "deadline" ? 504 : 499 });
    }
    console.error("Send message error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  } finally {
    if (!returnedStream) lifecycle.dispose();
  }
}
