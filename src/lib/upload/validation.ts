// Conservative container signatures. Unknown formats and active SVG are rejected.
export function verifiedMedia(bytes: Buffer, declared: string): { mime: string; ext: string; category: string } | null {
  const starts = (...values: number[]) => values.every((value, i) => bytes[i] === value);
  const text = (start: number, end: number) => bytes.subarray(start, end).toString("ascii");
  let mime = "", ext = "", category = "";
  if (bytes.length < 12) return null;
  if (starts(0xff, 0xd8, 0xff)) [mime, ext, category] = ["image/jpeg", "jpg", "image"];
  else if (starts(137, 80, 78, 71, 13, 10, 26, 10) && text(12, 16) === "IHDR") [mime, ext, category] = ["image/png", "png", "image"];
  else if (["GIF87a", "GIF89a"].includes(text(0, 6))) [mime, ext, category] = ["image/gif", "gif", "image"];
  else if (text(0, 4) === "RIFF" && text(8, 12) === "WEBP") [mime, ext, category] = ["image/webp", "webp", "image"];
  else if (text(0, 4) === "RIFF" && text(8, 12) === "WAVE") [mime, ext, category] = ["audio/wav", "wav", "audio"];
  else if (text(4, 8) === "ftyp" && /^(isom|iso[2-9]|mp4[12]|avc1|M4V )$/.test(text(8, 12))) [mime, ext, category] = ["video/mp4", "mp4", "video"];
  else if (text(0, 4) === "OggS" && ["audio/ogg", "video/ogg"].includes(declared)) [mime, ext, category] = [declared, "ogg", declared.split("/")[0]];
  else if (starts(0x1a, 0x45, 0xdf, 0xa3) && bytes.subarray(4, 4096).includes(Buffer.from("webm")) && ["audio/webm", "video/webm"].includes(declared)) [mime, ext, category] = [declared, "webm", declared.split("/")[0]];
  else if ((text(0, 3) === "ID3" && bytes[3] >= 2 && bytes[3] <= 4) || (starts(0xff) && (bytes[1] & 0xe0) === 0xe0 && (bytes[1] & 6) !== 0 && (bytes[2] & 0xf0) !== 0xf0)) [mime, ext, category] = ["audio/mpeg", "mp3", "audio"];
  return mime && mime === declared ? { mime, ext, category } : null;
}

export const MAX_MULTIPART_BYTES = 10 * 1024 * 1024 + 64 * 1024;
export async function boundedMultipart(request: Request): Promise<FormData> {
  if (!/^multipart\/form-data;\s*boundary=/i.test(request.headers.get("content-type") || "")) throw new Error("Invalid multipart body");
  const size = request.headers.get("content-length");
  if (size && (!/^\d+$/.test(size) || Number(size) > MAX_MULTIPART_BYTES)) throw new Error("Upload request too large");
  if (!request.body) throw new Error("Missing upload body");
  const reader = request.body.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;
  try {
    for (;;) {
      const { value, done } = await reader.read();
      if (done) break;
      total += value.byteLength;
      if (total > MAX_MULTIPART_BYTES) { await reader.cancel(); throw new Error("Upload request too large"); }
      chunks.push(value);
    }
  } finally { reader.releaseLock(); }
  return new Request("https://upload.invalid", { method: "POST", headers: { "content-type": request.headers.get("content-type")! }, body: Buffer.concat(chunks) }).formData();
}
