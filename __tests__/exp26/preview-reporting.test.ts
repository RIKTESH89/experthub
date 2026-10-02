const mockInit = jest.fn(); const mockReplay = jest.fn(); const mockCapture = jest.fn();
jest.mock('@sentry/nextjs', () => ({ init: mockInit, replayIntegration: mockReplay, captureRequestError: mockCapture, captureRouterTransitionStart: mockCapture }));
beforeEach(() => { process.env.VERCEL_ENV = 'preview'; process.env.NEXT_PUBLIC_EXPERTHUB_PREVIEW_ISOLATED = 'true'; mockInit.mockClear(); mockReplay.mockClear(); mockCapture.mockClear(); });
afterEach(() => { delete process.env.VERCEL_ENV; delete process.env.NEXT_PUBLIC_EXPERTHUB_PREVIEW_ISOLATED; });
test('server, Edge and browser reporting/replay remain uninitialized in Preview', () => {
 jest.isolateModules(() => {
  require('../../sentry.server.config'); require('../../sentry.edge.config');
  const client = require('@/instrumentation-client'); client.onRouterTransitionStart('synthetic', 'push', 'push');
  const server = require('@/instrumentation'); server.onRequestError(new Error('synthetic'), {}, {});
 });
 expect(mockInit).not.toHaveBeenCalled(); expect(mockReplay).not.toHaveBeenCalled(); expect(mockCapture).not.toHaveBeenCalled();
});
test('production retains all three reporting initializations', () => {
 process.env.VERCEL_ENV = 'production'; process.env.NEXT_PUBLIC_EXPERTHUB_PREVIEW_ISOLATED = 'false';
 jest.isolateModules(() => { require('../../sentry.server.config'); require('../../sentry.edge.config'); require('@/instrumentation-client'); });
 expect(mockInit).toHaveBeenCalledTimes(3); expect(mockReplay).toHaveBeenCalledTimes(1);
});
