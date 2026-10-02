import prisma, { resetAllMocks } from '../mocks/prisma';
jest.mock('@/lib/auth', () => ({ auth: jest.fn() }));
jest.mock('next-auth/providers/google', () => ({ __esModule: true, default: jest.fn() }));
jest.mock('@/lib/knowledge/lifecycle', () => ({ removePostSource: jest.fn().mockResolvedValue(undefined) }));
jest.mock('@/lib/prisma', () => ({ __esModule: true, default: prisma }));
const mockSend = jest.fn(); const mockS3 = jest.fn(); const mockRazorpay = jest.fn();
jest.mock('resend', () => ({ Resend: class { constructor() { mockSend(); } } }));
jest.mock('@aws-sdk/client-s3', () => ({ S3Client: class { constructor() { mockS3(); } }, PutObjectCommand: jest.fn(), DeleteObjectsCommand: jest.fn() }));
jest.mock('razorpay', () => ({ __esModule: true, default: class { constructor() { mockRazorpay(); } } }));
import { isPreviewIsolated, assertExternalServiceAllowed } from '@/lib/preview-isolation';
import { runChatEngine } from '@/lib/ai/chat-engine';
import { retrieveContext, rerankWithLLM } from '@/lib/vector/retriever';
import { analyzePersonality } from '@/lib/ai/personality-analyzer';
import { runLifecycleJob } from '@/lib/knowledge/outbox';
import { extractEntities } from '@/lib/graph/entity-extractor';
import { extractMemories } from '@/lib/ai/memory-extractor';
import { callOpenAI } from '@/lib/ai/openai';
import { generateEmbedding } from '@/lib/vector/embeddings';
import { scrapeBlogContent } from '@/lib/import/blog-scraper';
import { searchWeb } from '@/lib/ai/web-search';
import { sendEmail } from '@/lib/email/resend';
import { getRazorpay } from '@/lib/razorpay';
import { POST as webhook } from '@/app/api/payments/webhook/route';
import { POST as upload } from '@/app/api/upload/route';
import { POST as digest } from '@/app/api/email/digest/route';
import { POST as create } from '@/app/api/payments/create-subscription/route';
import { POST as cancel } from '@/app/api/payments/cancel/route';
import { DELETE as deletePost } from '@/app/api/posts/[postId]/route';
import { auth } from '@/lib/auth';
import { createPOST } from '../helpers/request';
beforeEach(() => {
 resetAllMocks(); process.env.VERCEL_ENV = 'preview'; process.env.NEXT_PUBLIC_EXPERTHUB_PREVIEW_ISOLATED = 'false';
 for (const key of ['OPENAI_API_KEY','TAVILY_API_KEY','RESEND_API_KEY','AWS_ACCESS_KEY_ID','AWS_SECRET_ACCESS_KEY','RAZORPAY_KEY_ID','RAZORPAY_KEY_SECRET','RAZORPAY_WEBHOOK_SECRET','CRON_SECRET','GOOGLE_CLIENT_ID','GOOGLE_CLIENT_SECRET']) process.env[key] = 'synthetic-inherited-looking-not-a-real-key';
 global.fetch = jest.fn(() => { throw new Error('Forbidden external call'); }); mockSend.mockClear(); mockS3.mockClear(); mockRazorpay.mockClear();
});
afterEach(() => { delete process.env.VERCEL_ENV; delete process.env.NEXT_PUBLIC_EXPERTHUB_PREVIEW_ISOLATED; for (const key of ['OPENAI_API_KEY','TAVILY_API_KEY','RESEND_API_KEY','AWS_ACCESS_KEY_ID','AWS_SECRET_ACCESS_KEY','RAZORPAY_KEY_ID','RAZORPAY_KEY_SECRET','RAZORPAY_WEBHOOK_SECRET','CRON_SECRET','GOOGLE_CLIENT_ID','GOOGLE_CLIENT_SECRET']) delete process.env[key]; });
test('runtime Preview cannot be weakened by false client marker; client build marker independently fails closed', () => {
 expect(isPreviewIsolated()).toBe(true); delete process.env.VERCEL_ENV; process.env.NEXT_PUBLIC_EXPERTHUB_PREVIEW_ISOLATED = 'true'; expect(isPreviewIsolated()).toBe(true);
 expect(() => assertExternalServiceAllowed()).toThrow('disabled in Preview'); process.env.NEXT_PUBLIC_EXPERTHUB_PREVIEW_ISOLATED = 'false'; process.env.VERCEL_ENV = 'production'; expect(() => assertExternalServiceAllowed()).not.toThrow();
});
test('AI embeddings/extraction, URL imports, web search, email and Razorpay never call providers despite inherited credentials', async () => {
 await expect(callOpenAI({ messages: [{ role: 'user', content: 'synthetic' }] })).rejects.toThrow('disabled in Preview');
 await expect(runChatEngine({ expertId: 'synthetic', query: 'synthetic', chatHistory: [] })).rejects.toThrow('disabled in Preview');
 await expect(rerankWithLLM('synthetic', [{ content: 'synthetic', score: 1, metadata: {} }], 1)).rejects.toThrow('disabled in Preview');
 await expect(extractEntities('synthetic')).rejects.toThrow('disabled in Preview');
 await expect(retrieveContext('synthetic', 'synthetic')).rejects.toThrow('disabled in Preview');
 await expect(extractMemories('synthetic', 'synthetic')).rejects.toThrow('disabled in Preview');
 await expect(generateEmbedding('synthetic')).rejects.toThrow('disabled in Preview'); await expect(scrapeBlogContent('https://example.invalid')).rejects.toThrow('disabled in Preview');
 expect(await searchWeb('synthetic')).toEqual([]); expect(await sendEmail({ to: 'synthetic@example.invalid', subject: 'synthetic', html: '' })).toBe(false); expect(() => getRazorpay()).toThrow('disabled in Preview');
 expect(global.fetch).not.toHaveBeenCalled(); expect(mockSend).not.toHaveBeenCalled(); expect(mockS3).not.toHaveBeenCalled(); expect(mockRazorpay).not.toHaveBeenCalled();
});
test.each([webhook, upload, digest, create, cancel])('disabled route rejects before auth/body/provider/database work', async route => {
 const response = await route(createPOST('/api/synthetic', {})); expect(response.status).toBe(503);
 expect(prisma.$transaction).not.toHaveBeenCalled(); expect(prisma.expertSubscription.findUnique).not.toHaveBeenCalled(); expect(prisma.user.findMany).not.toHaveBeenCalled(); expect(global.fetch).not.toHaveBeenCalled();
});
test('Google provider configuration is empty in Preview', () => { jest.isolateModules(() => { const { authConfig } = require('@/lib/auth.config'); expect(authConfig.providers).toEqual([]); }); });

test('post deletion cannot initialize production S3 cleanup in Preview', async () => {
 (auth as jest.Mock).mockResolvedValue({ user: { id: 'synthetic-owner', role: 'EXPERT' } });
 prisma.post.findUnique.mockResolvedValue({ id: 'synthetic-post', authorId: 'synthetic-owner' });
 prisma.postMedia.findMany.mockResolvedValue([{ url: 'https://experthub-uploads.s3.ap-south-1.amazonaws.com/synthetic' }]);
 prisma.post.delete.mockResolvedValue({});
 const response = await deletePost(createPOST('/api/posts/synthetic-post', {}), { params: Promise.resolve({ postId: 'synthetic-post' }) });
 expect(response.status).toBe(200); expect(mockS3).not.toHaveBeenCalled(); expect(global.fetch).not.toHaveBeenCalled();
});

test('personality analysis and claimed background index job reach guarded providers without any external call', async () => {
 prisma.knowledgeItem.findMany.mockResolvedValue([{ content: 'Synthetic writing sample' }]);
 prisma.expertProfile.findUnique.mockResolvedValue(null);
 await expect(analyzePersonality('synthetic-expert')).rejects.toThrow('disabled in Preview');
 let leaseToken: string | undefined;
 prisma.knowledgeLifecycleJob.updateMany.mockImplementation(async ({ data }: { data: { leaseToken?: string } }) => { if(data.leaseToken) leaseToken=data.leaseToken; return {count:1}; });
 prisma.knowledgeLifecycleJob.findUnique.mockImplementation(async () => ({ id:'synthetic-job', expertProfileId:'synthetic-expert', kind:'INDEX', leaseToken, attempts:1 }));
 await expect(runLifecycleJob('synthetic-job', 'synthetic-expert', async () => { await generateEmbedding('synthetic'); })).rejects.toThrow('disabled in Preview');
 expect(prisma.knowledgeLifecycleJob.updateMany).toHaveBeenLastCalledWith(expect.objectContaining({data:expect.objectContaining({state:'PENDING',lastError:'External services are disabled in Preview'})}));
 expect(global.fetch).not.toHaveBeenCalled();
});
