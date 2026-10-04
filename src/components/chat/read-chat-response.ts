import { createSSEDecoder } from "@/lib/ai/sse";

/** Presentation transport contract: completion requires the persisted-message acknowledgement. */
export async function readChatResponse(
  reader: ReadableStreamDefaultReader<Uint8Array>,
  onEvent: (event: { content?: string; thinking?: string; messageId?: string; sources?: unknown }) => void,
) {
  const decoder = createSSEDecoder();
  try {
    while (true) {
      const { done, value } = await reader.read();
      for (const data of decoder.push(value, done)) {
        if (data === "[DONE]") throw new Error("Missing saved-message acknowledgement");
        const event = JSON.parse(data);
        if (!event || typeof event !== "object" || Array.isArray(event) || event.error) throw new Error("Chat stream failed");
        if (event.content !== undefined && typeof event.content !== "string") throw new Error("Invalid response content");
        if (event.thinking !== undefined && typeof event.thinking !== "string") throw new Error("Invalid response status");
        if (event.done === true) {
          if (typeof event.messageId !== "string" || !event.messageId) throw new Error("Missing saved-message acknowledgement");
          onEvent(event);
          return; // Do not consume any data after the authoritative terminal event.
        }
        onEvent({ content: event.content, thinking: event.thinking });
      }
      if (done) throw new Error("Response ended before completion");
    }
  } finally {
    try { void reader.cancel().catch(() => {}); } catch { /* Cancellation must not replace the original outcome. */ }
    reader.releaseLock();
  }
}
