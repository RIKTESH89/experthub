// eslint-disable-next-line @typescript-eslint/no-require-imports
const pdfParse = require("pdf-parse");

export async function parsePdfContent(buffer: Buffer): Promise<{ title: string; content: string; numPages: number }> {
  const data = await pdfParse(buffer);

  const content = data.text?.replace(/\s+/g, " ").trim() || "";

  if (content.length < 20) {
    throw new Error("Could not extract text from this PDF. It may be a scanned/image-only PDF.");
  }

  const title = data.info?.Title || "Imported PDF Document";
  const numPages = data.numpages || 0;

  return { title, content, numPages };
}
