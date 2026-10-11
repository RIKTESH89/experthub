import { authorizeWidgetPersistence, widgetAccessHash, widgetOriginAllowed } from "@/lib/persona/persistence";
import { createProviderStreamState } from "@/lib/ai/provider-stream";
import { createSSEDecoder } from "@/lib/ai/sse";
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

    const origin = request.headers.get("origin");
    if (!widgetOriginAllowed(widgetConfig.allowedDomains, origin)) return NextResponse.json({error:"Widget origin is not allowed"},{status:403,headers:corsHeaders});
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
    const { stream, sources, persistenceSnapshot } = await runChatEngine({
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

    const decoder=createSSEDecoder(), providerState=createProviderStreamState(), encoder=new TextEncoder();
    const persistenceIdentity={configId,sessionId,visitorId,configHash:widgetAccessHash(widgetConfig),origin};
    const collect=(data:string)=>{
      const content=providerState.accept(data);
      if(content){fullResponse+=content;if(fullResponse.length>100000)throw new Error("Provider response exceeds answer bound");}
    };
    const transformStream = new TransformStream<Uint8Array,Uint8Array>({
      transform(chunk) {
        checkSignal(request.signal);
        for(const data of decoder.push(chunk))collect(data);
      },
      async flush(controller) {
        checkSignal(request.signal);
        for(const data of decoder.push(undefined,true))collect(data);
        if(!providerState.done)throw new Error("Provider stream ended without DONE");
        if(!fullResponse.trim())throw new Error("Provider returned an empty answer");
        if (fullResponse) {
          await prisma.$transaction(async tx=>{
            checkSignal(request.signal);
            await authorizeWidgetPersistence(tx,persistenceSnapshot,persistenceIdentity);
            checkSignal(request.signal);
            await tx.widgetMessage.createMany({data:[
              {widgetSessionId:sessionId,role:"user",content:message},
              {widgetSessionId:sessionId,role:"assistant",content:fullResponse,sources:JSON.parse(JSON.stringify(sources))},
            ]});
            checkSignal(request.signal);
            await tx.widgetSession.update({where:{id:sessionId},data:{questionCount:{increment:1},updatedAt:new Date()}});
            await authorizeWidgetPersistence(tx,persistenceSnapshot,persistenceIdentity,true);
            checkSignal(request.signal);
          });
          checkSignal(request.signal);
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({content:fullResponse})}\n\n`));
        }
        checkSignal(request.signal);
        controller.enqueue(encoder.encode('data: [DONE]\n\n'));
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
