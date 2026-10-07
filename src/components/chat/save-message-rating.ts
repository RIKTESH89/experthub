/** Only a confirmed rating receipt counts as success. Internal review IDs stay server-side. */
export async function saveMessageRating(sessionId: string, messageId: string, rating: 1 | -1, transport: typeof fetch = fetch) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 15000);
  try {
    const response = await transport(`/api/chat/sessions/${encodeURIComponent(sessionId)}/messages/${encodeURIComponent(messageId)}/rate`, {
      method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ rating }), signal: controller.signal,
    });
    if (!response.ok) throw new Error("Rating not confirmed");
    const receipt: unknown = await response.json();
    if (!receipt || typeof receipt !== "object" || !("success" in receipt) || receipt.success !== true ||
        !("rating" in receipt) || receipt.rating !== rating) throw new Error("Rating not confirmed");
  } finally { clearTimeout(timeout); }
}
