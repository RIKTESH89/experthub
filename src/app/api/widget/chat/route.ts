import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { runChatEngine } from "@/lib/ai/chat-engine";
import { chronologicalHistory } from "@/lib/ai/history";
import { widgetIdentity } from "@/lib/ai/widget-identity";
import { rateLimit } from "@/lib/rate-limit";
import { checkSignal } from "@/lib/ai/request-lifecycle";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
  "Access-Control-Expose-Headers": "X-Widget-Visitor-Id, X-Widget-Token",
};

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: corsHeaders });
}

export async function POST(request: NextRequest) {
  try {
    checkSignal(request.signal);
    const body = await request.json();
    const { apiKey, visitorId: requestedVisitorId, visitorToken, message } = body;

    if (!apiKey || !requestedVisitorId || !message) {
      return NextResponse.json(
        { error: "Missing required fields: apiKey, visitorId, message" },
        { status: 400, headers: corsHeaders }
      );
    }

    // Look up widget config
    const widgetConfig = await prisma.widgetConfig.findUnique({
      where: { apiKey },
      include: {
        expertProfile: {
          select: {
            id: true,
            userId: true,
          },
        },
      },
    });

    if (!widgetConfig || !widgetConfig.isEnabled) {
      return NextResponse.json(
        { error: "Widget not found or disabled" },
        { status: 404, headers: corsHeaders }
      );
    }

    let identity;
    try { identity = widgetIdentity(widgetConfig.id, requestedVisitorId, visitorToken); }
    catch (error) {
      return NextResponse.json({ error: error instanceof Error ? error.message : "Invalid widget identity" }, { status: process.env.AUTH_SECRET ? 403 : 503, headers: corsHeaders });
    }
    const { visitorId } = identity;
    const identityHeaders = { ...corsHeaders, "X-Widget-Visitor-Id": visitorId, "X-Widget-Token": identity.token };
    const { allowed } = rateLimit(`${widgetConfig.id}:${visitorId}`, 10, 60000);
    if (!allowed) return NextResponse.json({ error: "Too many requests. Please slow down." }, { status: 429, headers: identityHeaders });

    // Upsert widget session
    const widgetSession = await prisma.widgetSession.upsert({
      where: {
        widgetConfigId_visitorId: {
          widgetConfigId: widgetConfig.id,
          visitorId,
        },
      },
      update: {},
      create: {
        widgetConfigId: widgetConfig.id,
        visitorId,
      },
    });

    // Check question limit
    if (widgetSession.questionCount >= widgetConfig.freeQuestions) {
      return NextResponse.json(
        {
          error: "limit_reached",
          subscribeUrl: `/subscriber/experts/${widgetConfig.expertProfile.userId}`,
        },
        { status: 403, headers: corsHeaders }
      );
    }

    // Load previous messages for context (last 20)
    const previousMessages = await prisma.widgetMessage.findMany({
      where: { widgetSessionId: widgetSession.id },
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      take: 20,
    });

    const chatHistory = chronologicalHistory(previousMessages).map((msg) => ({
      role: msg.role as "user" | "assistant" | "system",
      content: msg.content,
      sources: msg.sources,
    }));

    // Run chat engine
    const { stream, sources } = await runChatEngine({
      expertId: widgetConfig.expertProfile.userId,
      query: message,
      chatHistory,
      enableWebSearch: false,
      signal: request.signal,
    });

    // Create a TransformStream to capture the full response while streaming
    let fullResponse = "";
    const sessionId = widgetSession.id;
    const configId = widgetConfig.id;

    const transformStream = new TransformStream({
      transform(chunk, controller) {
        checkSignal(request.signal);
        const text = new TextDecoder().decode(chunk);
        const lines = text.split("\n");
        for (const line of lines) {
          if (line.startsWith("data: ")) {
            const data = line.slice(6);
            if (data === "[DONE]") {
              controller.enqueue(
                new TextEncoder().encode(`data: [DONE]\n\n`)
              );
              continue;
            }
            try {
              const parsed = JSON.parse(data);
              const content = parsed.choices?.[0]?.delta?.content || "";
              if (content) {
                fullResponse += content;
                controller.enqueue(
                  new TextEncoder().encode(
                    `data: ${JSON.stringify({ content })}\n\n`
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
        checkSignal(request.signal);
        // Save messages after streaming completes
        if (fullResponse) {
          await prisma.widgetMessage.createMany({
            data: [
              {
                widgetSessionId: sessionId,
                role: "user",
                content: message,
              },
              {
                widgetSessionId: sessionId,
                role: "assistant",
                content: fullResponse,
                sources: JSON.parse(JSON.stringify(sources)),
              },
            ],
          });

          // Increment question count
          await prisma.widgetSession.update({
            where: {
              widgetConfigId_visitorId: {
                widgetConfigId: configId,
                visitorId,
              },
            },
            data: {
              questionCount: { increment: 1 },
              updatedAt: new Date(),
            },
          });
        }
      },
    });

    const responseStream = stream.pipeThrough(transformStream, { signal: request.signal });

    return new NextResponse(responseStream, {
      headers: {
        ...identityHeaders,
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
      },
    });
  } catch (error) {
    console.error("Widget chat error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500, headers: corsHeaders }
    );
  }
}
