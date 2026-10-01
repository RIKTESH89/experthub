/** Incremental UTF-8 / SSE line decoder. Network chunks are not message boundaries. */
export function createSSEDecoder() {
  const decoder = new TextDecoder();
  let pending = "";
  return {
    push(bytes?: Uint8Array, final = false): string[] {
      pending += bytes ? decoder.decode(bytes, { stream: !final }) : final ? decoder.decode() : "";
      const lines = pending.split("\n");
      pending = final ? "" : lines.pop() || "";
      return lines.map(line => line.endsWith("\r") ? line.slice(0, -1) : line)
        .filter(line => line.startsWith("data:")).map(line => line.slice(5).replace(/^ /, ""));
    },
  };
}
