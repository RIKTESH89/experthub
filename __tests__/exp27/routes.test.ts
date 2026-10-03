import mockPrisma, { resetAllMocks } from "../mocks/prisma";
import { mockAuth, mockSession } from "../mocks/auth";
import { NextRequest } from "next/server";
jest.mock("@/lib/prisma", () => ({ __esModule: true, default: mockPrisma }));
jest.mock("@/lib/auth", () => ({ auth: mockAuth }));
jest.mock("@/lib/email/resend", () => ({ sendEmail: jest.fn() }));
jest.mock("node:fs/promises", () => ({ mkdir: jest.fn(), writeFile: jest.fn() }));
jest.mock("fs/promises", () => ({ mkdir: jest.fn(), writeFile: jest.fn() }));
jest.mock("@aws-sdk/client-s3", () => ({ S3Client: jest.fn().mockImplementation(() => ({ send: jest.fn().mockResolvedValue({}) })), PutObjectCommand: jest.fn() }));
import { POST as digest } from "@/app/api/email/digest/route";
import { POST as upload } from "@/app/api/upload/route";
import { sendEmail } from "@/lib/email/resend";
import { PutObjectCommand } from "@aws-sdk/client-s3";
import { writeFile } from "fs/promises";
const env = { ...process.env };
beforeEach(() => { resetAllMocks(); mockAuth.mockReset(); process.env = { ...env, NODE_ENV: 'production' }; delete process.env.VERCEL_ENV; delete process.env.NEXT_PUBLIC_EXPERTHUB_PREVIEW_ISOLATED; delete process.env.CRON_SECRET; delete process.env.AWS_ACCESS_KEY_ID; delete process.env.AWS_SECRET_ACCESS_KEY; delete process.env.AWS_S3_BUCKET; });
afterAll(() => { process.env = env; });
function digestRequest(secret?: string) { return new NextRequest('https://app.invalid/api/email/digest', { method: 'POST', headers: secret ? { 'x-api-key': secret } : {}, body: '{}' }); }
it.each([undefined, '', '   '])('digest fails closed for missing/blank config %s', async secret => { if (secret !== undefined) process.env.CRON_SECRET = secret; const res = await digest(digestRequest()); expect(res.status).toBe(503); expect(mockPrisma.user.findMany).not.toHaveBeenCalled(); expect(sendEmail).not.toHaveBeenCalled(); });
it.each([undefined, 'wrong'])('digest rejects unauthorized %s', async secret => { process.env.CRON_SECRET = 'synthetic-secret'; expect((await digest(digestRequest(secret))).status).toBe(401); expect(mockPrisma.user.findMany).not.toHaveBeenCalled(); expect(sendEmail).not.toHaveBeenCalled(); });
it('authorized digest reports failed deliveries truthfully', async () => {
  process.env.CRON_SECRET = 'synthetic-secret'; mockPrisma.user.findMany.mockResolvedValue([{ id: 'expert', name: 'Synthetic', email: 'fixture@example.invalid', expertProfile: { id: 'profile' } }]); mockPrisma.expertSubscription.count.mockResolvedValue(1); mockPrisma.comment.count.mockResolvedValue(0); mockPrisma.chatSession.count.mockResolvedValue(0); (sendEmail as jest.Mock).mockResolvedValue(false);
  const res = await digest(digestRequest('synthetic-secret')); expect(await res.json()).toEqual({ sent: 0, skipped: 0, failed: 1 });
});
function uploadRequest(bytes: Buffer, mime: string, filename = 'photo.svg') { const data = new FormData(); data.set('file', new Blob([new Uint8Array(bytes)], { type: mime }), filename); return new NextRequest('https://app.invalid/api/upload', { method: 'POST', body: data }); }
function storage() { process.env.AWS_ACCESS_KEY_ID = 'synthetic'; process.env.AWS_SECRET_ACCESS_KEY = 'synthetic'; process.env.AWS_S3_BUCKET = 'synthetic-bucket'; }
it('hosted upload fails before body read/write when storage is absent', async () => { mockAuth.mockResolvedValue(mockSession.expert); const req = uploadRequest(Buffer.alloc(15), 'image/png'); expect((await upload(req)).status).toBe(503); expect(req.bodyUsed).toBe(false); expect(writeFile).not.toHaveBeenCalled(); expect(PutObjectCommand).not.toHaveBeenCalled(); });
it.each(['image/svg+xml', 'image/png'])('upload rejects active SVG claiming %s before storage writes', async mime => { storage(); mockAuth.mockResolvedValue(mockSession.expert); expect((await upload(uploadRequest(Buffer.from('<svg><script>alert(1)</script></svg>'), mime))).status).toBe(400); expect(PutObjectCommand).not.toHaveBeenCalled(); expect(writeFile).not.toHaveBeenCalled(); });
it('valid upload derives safe extension and sets attachment disposition', async () => { storage(); mockAuth.mockResolvedValue(mockSession.expert); const png = Buffer.from([137,80,78,71,13,10,26,10,0,0,0,13,73,72,68,82,0,0,0,1]); const res = await upload(uploadRequest(png, 'image/png', '../../evil.svg')); expect(res.status).toBe(201); const json = await res.json(); expect(json.filename).toMatch(/^[a-f0-9-]+\.png$/); expect(PutObjectCommand).toHaveBeenCalledWith(expect.objectContaining({ ContentType: 'image/png', ContentDisposition: 'attachment' })); expect(writeFile).not.toHaveBeenCalled(); });
it('preserves isolated Preview guard before auth/body', async () => { process.env.VERCEL_ENV = 'preview'; const req = digestRequest(); expect((await digest(req)).status).toBe(503); expect((await upload(req)).status).toBe(503); expect(mockAuth).not.toHaveBeenCalled(); expect(req.bodyUsed).toBe(false); });
