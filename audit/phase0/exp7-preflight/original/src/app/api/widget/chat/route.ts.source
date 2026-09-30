import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { runChatEngine } from "@/lib/ai/chat-engine";
import { rateLimit } from "@/lib/rate-limit";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: corsHeaders });
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { apiKey, visitorId, message } = body;

    if (!apiKey || !visitorId || !message) {
      return NextResponse.json(
        { error: "Missing required fields: apiKey, visitorId, message" },
        { status: 400, headers: corsHeaders }
      );
    }

    // Rate limit by visitorId
    const { allowed } = rateLimit(visitorId, 10, 60000);
    if (!allowed) {
      return NextResponse.json(
        { error: "Too many requests. Please slow down." },
        { status: 429, headers: corsHeaders }
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
      orderBy: { createdAt: "asc" },
      take: 20,
    });

    const chatHistory = previousMessages.map((msg) => ({
      role: msg.role as "user" | "assistant" | "system",
      content: msg.content,
    }));

    // Run chat engine
    const { stream } = await runChatEngine({
      expertId: widgetConfig.expertProfile.userId,
      query: message,
      chatHistory,
      enableWebSearch: false,
    });

    // Create a TransformStream to capture the full response while streaming
    let fullResponse = "";
    const sessionId = widgetSession.id;
    const configId = widgetConfig.id;

    const transformStream = new TransformStream({
      transform(chunk, controller) {
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

    const responseStream = stream.pipeThrough(transformStream);

    return new NextResponse(responseStream, {
      headers: {
        ...corsHeaders,
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
