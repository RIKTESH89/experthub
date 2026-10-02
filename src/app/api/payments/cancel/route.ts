import { isPreviewIsolated } from "@/lib/preview-isolation";
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { cancelSubscription } from "@/lib/payments/cancel";
import { PaymentError } from "@/lib/payments/state";
export async function POST(request: NextRequest) {
  if (isPreviewIsolated()) return NextResponse.json({ error: "External services are disabled in Preview" }, { status: 503 });
  try {
    const session = await auth();
    if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const { subscriptionId } = await request.json();
    if (typeof subscriptionId !== "string" || !subscriptionId) return NextResponse.json({ error: "subscriptionId is required" }, { status: 400 });
    return NextResponse.json(await cancelSubscription(subscriptionId, session.user.id));
  } catch (error) {
    return NextResponse.json({ error: error instanceof PaymentError ? error.message : "Cancellation unavailable" }, { status: error instanceof PaymentError ? error.status : 500 });
  }
}
