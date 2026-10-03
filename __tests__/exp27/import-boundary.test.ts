import * as mockLifecycle from "../mocks/lifecycle";
jest.mock('@/lib/prisma', () => ({ __esModule: true, default: mockPrisma }));
jest.mock('@/lib/auth', () => ({ auth: mockAuth }));
jest.mock('@/lib/knowledge/lifecycle', () => mockLifecycle);
jest.mock('@/lib/import/blog-scraper', () => ({ scrapeBlogContent: jest.fn() }));
import mockPrisma, { resetAllMocks } from '../mocks/prisma';
import { mockAuth, mockSession } from '../mocks/auth';
import { createPOST } from '../helpers/request';
import { POST } from '@/app/api/knowledge/import/blog/route';
import { scrapeBlogContent } from '@/lib/import/blog-scraper';
beforeEach(() => { resetAllMocks(); mockAuth.mockResolvedValue(mockSession.expert); });
it.each(['https://user:private-password@example.com/', 'http://example.com/', 'https://169.254.169.254/', 'https://[::1]/'])('rejects unsafe import input before job persistence: %s', async url => {
  const res = await POST(createPOST('/api/knowledge/import/blog', { urls: [url] })); expect(res.status).toBe(400); expect(mockPrisma.importJob.create).not.toHaveBeenCalled(); expect(mockPrisma.expertProfile.findUnique).not.toHaveBeenCalled(); expect(scrapeBlogContent).not.toHaveBeenCalled();
});
