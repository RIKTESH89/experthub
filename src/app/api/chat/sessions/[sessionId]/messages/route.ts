import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { z } from "zod";
import { runChatEngine } from "@/lib/ai/chat-engine";
import { checkTrialAccess, incrementTrialUsage } from "@/lib/trial";
import { extractMemories } from "@/lib/ai/memory-extractor";
import { saveMemories } from "@/lib/ai/memory-manager";

const sendMessageSchema = z.object({
  content: z.string().min(1, "Message content is required"),
  enableWebSearch: z.boolean().default(false),
});

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ sessionId: string }> }
) {
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
          orderBy: { createdAt: "asc" },
          take: 50,
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

      if (subscription && subscription.status === "ACTIVE") {
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
    const chatHistory = chatSession.messages.map((msg: { role: string; content: string }) => ({
      role: msg.role as "user" | "assistant" | "system",
      content: msg.content,
    }));

    // Run chat engine with streaming (now includes subscriberId for memory)
    const { stream, sources, thinkingSteps } = await runChatEngine({
      expertId: chatSession.expertProfile.userId,
      subscriberId: chatSession.subscriberId,
      query: content,
      chatHistory,
      enableWebSearch,
    });

    // Create a TransformStream to capture the full response while streaming
    let fullResponse = "";
    const encoder = new TextEncoder();

    const transformStream = new TransformStream({
      transform(chunk, controller) {
        const text = new TextDecoder().decode(chunk);
        const lines = text.split("\n");
        for (const line of lines) {
          if (line.startsWith("data: ")) {
            const data = line.slice(6);
            if (data === "[DONE]") {
              controller.enqueue(
                encoder.encode(
                  `data: ${JSON.stringify({ done: true, sources: sources.map((s: { content: string; score: number; metadata: Record<string, unknown> }) => ({ title: (s.metadata?.title as string) || s.content.split("\n")[0]?.slice(0, 80) || "Source", snippet: s.content.slice(0, 200), score: s.score })) })}\n\n`
                )
              );
              continue;
            }
            try {
              const parsed = JSON.parse(data);
              const deltaContent = parsed.choices?.[0]?.delta?.content || "";
              if (deltaContent) {
                fullResponse += deltaContent;
                controller.enqueue(
                  encoder.encode(
                    `data: ${JSON.stringify({ content: deltaContent })}\n\n`
                  )
                );
              }
            } catch {
              // Skip unparseable chunks
            }
          }
        }
      },
      async flush() {
        // Save the AI response after streaming completes
        if (fullResponse) {
          await prisma.chatMessage.create({
            data: {
              chatSessionId: sessionId,
              role: "assistant",
              content: fullResponse,
              sources: JSON.parse(JSON.stringify(sources)),
            },
          });

          // Update session timestamp
          await prisma.chatSession.update({
            where: { id: sessionId },
            data: { updatedAt: new Date() },
          });

          // Record twin interaction for analytics (fire-and-forget)
          const avgScore = sources.length > 0
            ? sources.reduce((sum: number, s: { score: number }) => sum + (s.score || 0), 0) / sources.length
            : 0;
          prisma.twinInteraction.create({
            data: {
              expertProfileId: chatSession.expertProfileId,
              chatSessionId: sessionId,
              question: content,
              answerQuality: avgScore,
              sourcesUsed: sources.length,
              isFromWidget: false,
            },
          }).catch(() => {});

          // Extract and save subscriber memories (fire-and-forget)
          extractMemories(content, fullResponse)
            .then((memories) => {
              if (memories.length > 0) {
                return saveMemories(
                  chatSession.subscriberId,
                  chatSession.expertProfileId,
                  memories
                );
              }
            })
            .catch(() => {});
        }
      },
    });

    // Build combined stream: thinking steps first, then content
    const thinkingAndContentStream = new ReadableStream({
      async start(controller) {
        // Emit thinking steps with pacing
        for (const step of thinkingSteps) {
          controller.enqueue(
            encoder.encode(`data: ${JSON.stringify({ thinking: step })}\n\n`)
          );
          await new Promise((r) => setTimeout(r, 400));
        }

        // Pipe the OpenAI stream through the transform
        const reader = stream.pipeThrough(transformStream).getReader();
        try {
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            controller.enqueue(value);
          }
        } finally {
          controller.close();
        }
      },
    });

    return new NextResponse(thinkingAndContentStream, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
      },
    });
  } catch (error) {
    console.error("Send message error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
