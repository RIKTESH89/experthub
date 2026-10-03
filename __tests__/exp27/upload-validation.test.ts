import { boundedMultipart, MAX_MULTIPART_BYTES, verifiedMedia } from "@/lib/upload/validation";
it.each(["image/svg+xml", "image/png", "image/jpeg"])('blocks SVG even disguised as %s', type => expect(verifiedMedia(Buffer.from('<svg xmlns="http://www.w3.org/2000/svg"><script>alert(1)</script></svg>'), type)).toBeNull());
it('verifies PNG bytes independent of unsafe filename', () => {
  const png = Buffer.from([137,80,78,71,13,10,26,10,0,0,0,13,73,72,68,82,0,0,0,1]);
  expect(verifiedMedia(png, "image/png")).toEqual({ mime: "image/png", ext: "png", category: "image" });
  expect(verifiedMedia(png, "image/jpeg")).toBeNull();
});
it('rejects unknown and empty content', () => { expect(verifiedMedia(Buffer.from('not actually a media container'), 'video/mp4')).toBeNull(); expect(verifiedMedia(Buffer.alloc(0), 'image/png')).toBeNull(); });
it('rejects oversized declared multipart before reading body', async () => {
  const req = new Request('https://upload.invalid', { method: 'POST', headers: { 'content-type': 'multipart/form-data; boundary=x', 'content-length': String(MAX_MULTIPART_BYTES + 1) }, body: 'x' });
  await expect(boundedMultipart(req)).rejects.toThrow('too large'); expect(req.bodyUsed).toBe(false);
});
it('caps streamed multipart without content length and cancels', async () => {
  const cancel = jest.fn();
  const stream = new ReadableStream({ start(c) { c.enqueue(new Uint8Array(MAX_MULTIPART_BYTES)); c.enqueue(new Uint8Array(1)); }, cancel });
  const req = new Request('https://upload.invalid', { method: 'POST', headers: { 'content-type': 'multipart/form-data; boundary=x' }, body: stream, duplex: 'half' } as RequestInit);
  await expect(boundedMultipart(req)).rejects.toThrow('too large'); expect(cancel).toHaveBeenCalled();
});
it('parses valid bounded multipart', async () => { const data = new FormData(); data.set('file', new Blob(['fixture'], { type: 'image/png' }), 'photo.svg'); const result = await boundedMultipart(new Request('https://upload.invalid', { method: 'POST', body: data })); expect((result.get('file') as File).name).toBe('photo.svg'); });
it.each([
  [Buffer.from([255,216,255,...Array(13).fill(0)]), 'image/jpeg', 'jpg'],
  [Buffer.from('GIF89a' + '\0'.repeat(12)), 'image/gif', 'gif'],
  [Buffer.from('RIFF0000WEBP' + '\0'.repeat(12)), 'image/webp', 'webp'],
  [Buffer.from('RIFF0000WAVE' + '\0'.repeat(12)), 'audio/wav', 'wav'],
  [Buffer.from('0000ftypisom' + '\0'.repeat(12)), 'video/mp4', 'mp4'],
  [Buffer.from('OggS' + '\0'.repeat(12)), 'audio/ogg', 'ogg'],
  [Buffer.from([0x1a,0x45,0xdf,0xa3,...Array.from(Buffer.from('webm')),...Array(12).fill(0)]), 'video/webm', 'webm'],
  [Buffer.from([73,68,51,4,...Array(12).fill(0)]), 'audio/mpeg', 'mp3'],
])('recognizes supported %s container', (bytes, type, ext) => { expect(verifiedMedia(bytes as Buffer, type as string)?.ext).toBe(ext); });
