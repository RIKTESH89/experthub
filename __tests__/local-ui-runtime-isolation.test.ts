jest.mock("@sentry/nextjs", () => ({
  init: jest.fn(), replayIntegration: jest.fn(),
  captureRouterTransitionStart: jest.fn(), captureRequestError: jest.fn(),
}));
jest.mock("next-auth/providers/google", () => ({ __esModule: true, default: jest.fn(options => ({ id: "google", ...options })) }));

const savedEnvironment = { ...process.env };
beforeEach(() => {
  jest.resetModules();
  for (const key of Object.keys(process.env)) delete process.env[key];
  Object.assign(process.env, { NODE_ENV: "test" });
});
afterEach(() => {
  for (const key of Object.keys(process.env)) delete process.env[key];
  Object.assign(process.env, savedEnvironment);
});

function enableDerivedLocalMarker() {
  process.env.EXPERTHUB_LOCAL_UI_TEST = "1";
  process.env.NEXT_PUBLIC_EXPERTHUB_LOCAL_UI_ISOLATED = "true";
  process.env.NEXT_PUBLIC_EXPERTHUB_LOCAL_UI_ORIGIN = "http://127.0.0.1:3417";
}

test("local mode disables real Google, providers and external service calls", () => {
  enableDerivedLocalMarker();
  const isolation = require("@/lib/preview-isolation");
  expect(isolation.isPreviewIsolated()).toBe(true);
  expect(isolation.previewCanonicalOrigin()).toBe("http://127.0.0.1:3417");
  expect(() => isolation.assertExternalServiceAllowed()).toThrow("disabled in local UI tests");
  expect(require("@/lib/google-sign-in").isGoogleSignInEnabled()).toBe(false);
  expect(require("@/lib/auth.config").authConfig.providers).toEqual([]);
});

test("local mode prevents Sentry client/server/edge initialization and capture", async () => {
  enableDerivedLocalMarker();
  const client = require("../src/instrumentation-client");
  const instrumentation = require("../src/instrumentation");
  require("../sentry.server.config");
  require("../sentry.edge.config");
  await instrumentation.register();
  client.onRouterTransitionStart("/login", "push");
  instrumentation.onRequestError(new Error("synthetic"), {}, {});
  const sentry = require("@sentry/nextjs");
  expect(sentry.init).not.toHaveBeenCalled();
  expect(sentry.replayIntegration).not.toHaveBeenCalled();
  expect(sentry.captureRouterTransitionStart).not.toHaveBeenCalled();
  expect(sentry.captureRequestError).not.toHaveBeenCalled();
});

test.each([
  { NODE_ENV: "production" }, { VERCEL: "1" }, { VERCEL_ENV: "preview" },
  { VERCEL_URL: "deployment.vercel.app" }, { VERCEL_BRANCH_URL: "deployment.vercel.app" },
])("local runtime marker fails closed for %j", change => {
  enableDerivedLocalMarker();
  Object.assign(process.env, change);
  const isolation = require("@/lib/preview-isolation");
  expect(() => isolation.isPreviewIsolated()).toThrow("forbidden");
  expect(() => isolation.previewCanonicalOrigin()).toThrow("forbidden");
});

test("ordinary runtime still initializes Sentry and retains Google availability", () => {
  require("../src/instrumentation-client");
  expect(require("@sentry/nextjs").init).toHaveBeenCalledTimes(1);
  expect(require("@/lib/google-sign-in").isGoogleSignInEnabled()).toBe(true);
  expect(require("@/lib/preview-isolation").previewCanonicalOrigin()).toBeUndefined();
});
