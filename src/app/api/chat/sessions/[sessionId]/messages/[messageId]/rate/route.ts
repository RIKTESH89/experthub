import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { ReviewError } from "@/lib/persona/store";
import { failure } from "@/lib/corrections/http";
import { rateMessageForReview, ratingSchema } from "@/lib/corrections/rating";

export async function POST(request: NextRequest, { params }: { params: Promise<{ sessionId: string; messageId: string }> }) {
  try {
    const session = await auth();
    if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const { sessionId, messageId } = await params;
    const body = await request.json().catch(() => { throw new ReviewError(400, "Invalid request"); });
    const { rating } = ratingSchema.parse(body);
    return NextResponse.json(await rateMessageForReview({ actorId: session.user.id, sessionId, messageId, rating }));
  } catch (error) { return failure(error); }
}
