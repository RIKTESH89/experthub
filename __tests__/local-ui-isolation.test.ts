import { execFileSync } from "child_process";
import { localUiConfig } from "../local-ui-isolation.cjs";

const synthetic = {
  NODE_ENV: "test" as const, EXPERTHUB_LOCAL_UI_TEST: "1", EXPERTHUB_UI_FIXTURES: "1",
  AUTH_SECRET: "synthetic-local-ui-only", NEXT_TELEMETRY_DISABLED: "1",
  EXPERTHUB_LOCAL_UI_ORIGIN: "http://127.0.0.1:3417",
  DATABASE_URL: "postgresql://fixture:fixture@127.0.0.1:59999/fixture",
  DIRECT_URL: "postgresql://fixture:fixture@127.0.0.1:59999/fixture",
};
const guarded = { networkGuardLoaded: true };
const guardPath = `${process.cwd()}/scripts/ui-preview/network-guard.cjs`;

test("no flag preserves ordinary hosted configuration", () => {
  expect(localUiConfig({ NODE_ENV: "production", VERCEL: "1" }, guarded)).toBeNull();
});

test("explicit synthetic guarded test permits only a loopback origin", () => {
  expect(localUiConfig(synthetic, guarded)).toEqual({ origin: "http://127.0.0.1:3417" });
  expect(() => localUiConfig(synthetic)).toThrow("network guard");
});

test.each([
  { NODE_ENV: "production" }, { NODE_ENV: "" }, { VERCEL: "1" }, { VERCEL_ENV: "preview" },
  { VERCEL_ENV: "production" }, { VERCEL_URL: "x.vercel.app" }, { VERCEL_BRANCH_URL: "x.vercel.app" },
  { VERCEL_GIT_COMMIT_REF: "main" }, { EXPERTHUB_LOCAL_UI_TEST: "true" },
  { EXPERTHUB_UI_FIXTURES: "0" }, { AUTH_SECRET: "real-secret" }, { NEXT_TELEMETRY_DISABLED: "0" },
  { EXPERTHUB_LOCAL_UI_ORIGIN: "https://127.0.0.1:3417" },
  { EXPERTHUB_LOCAL_UI_ORIGIN: "http://127.0.0.1.evil.invalid:3417" },
  { EXPERTHUB_LOCAL_UI_ORIGIN: "http://localhost:3417/path" },
  { EXPERTHUB_LOCAL_UI_ORIGIN: "http://user:secret@localhost:3417" },
  { EXPERTHUB_LOCAL_UI_ORIGIN: "http://localhost:3417?key=x" },
  { EXPERTHUB_LOCAL_UI_ORIGIN: "http://localhost" },
  { DATABASE_URL: "postgresql://fixture:fixture@remote.invalid:5432/fixture" },
  { DIRECT_URL: "postgresql://fixture:fixture@127.0.0.1:59998/fixture" },
  { GOOGLE_CLIENT_ID: "inherited" }, { OPENAI_API_KEY: "inherited" }, { SENTRY_DSN: "inherited" },
  { AUTH_URL: "https://external.invalid" },
])("rejects unsafe local configuration %j", change => {
  expect(() => localUiConfig({ ...synthetic, ...change }, guarded)).toThrow();
});

test("real Next config exports local origins and omits Sentry wrapper", () => {
  const script = `const assert = (await import('node:assert/strict')).default;
    const {default:config} = await import('./next.config.mjs');
    assert.equal(config.env.NEXT_PUBLIC_EXPERTHUB_LOCAL_UI_ISOLATED,'true');
    assert.equal(config.env.NEXT_PUBLIC_EXPERTHUB_STAGING_GOOGLE_ENABLED,'false');
    for (const key of ['AUTH_URL','NEXTAUTH_URL','NEXT_PUBLIC_APP_URL','NEXT_PUBLIC_EXPERTHUB_LOCAL_UI_ORIGIN']) assert.equal(config.env[key],'http://127.0.0.1:3417');
    assert.equal(config.env.NEXT_PUBLIC_EXPERTHUB_PREVIEW_ISOLATED,'false');
    assert.equal(config.webpack,undefined); console.log('PASS');`;
  expect(execFileSync(process.execPath, ["--require", guardPath, "--input-type=module", "-e", script], {
    env: { PATH: process.env.PATH, ...synthetic }, encoding: "utf8", timeout: 15000,
  }).trim()).toBe("PASS");
});

test("preload blocks external fetch, HTTP overrides and socket/DNS targets", () => {
  const script = `const assert=require('node:assert/strict');
    assert.throws(()=>fetch('https://example.invalid'),/External network blocked/);
    assert.throws(()=>require('http').request('http://localhost:3417',{hostname:'example.invalid'}),/External network blocked/);
    assert.throws(()=>new (require('net').Socket)().connect({host:'example.invalid',port:443}),/External network blocked/);
    assert.throws(()=>require('dns').lookup('example.invalid',()=>{}),/External network blocked/);
    console.log('PASS');`;
  expect(execFileSync(process.execPath, ["--require", guardPath, "-e", script], {
    env: { PATH: process.env.PATH, NODE_ENV: "test" }, encoding: "utf8", timeout: 15000,
  }).trim()).toBe("PASS");
});

test("actual config rejects a local flag in production and without the guard", () => {
  const script = `const assert=(await import('node:assert/strict')).default;
    await assert.rejects(import('./next.config.mjs'),/Local UI test/); console.log('PASS');`;
  for (const env of [{ ...synthetic, NODE_ENV: "production" as const }, synthetic]) {
    expect(execFileSync(process.execPath, ["--input-type=module", "-e", script], {
      env: { PATH: process.env.PATH, ...env }, encoding: "utf8", timeout: 15000,
    }).trim()).toBe("PASS");
  }
});

test("actual production config overrides an inherited local client marker to false", () => {
  const script = `const assert=(await import('node:assert/strict')).default;
    const {default:config}=await import('./next.config.mjs');
    assert.equal(config.env.NEXT_PUBLIC_EXPERTHUB_LOCAL_UI_ISOLATED,'false');
    assert.equal(config.env.NEXT_PUBLIC_EXPERTHUB_LOCAL_UI_ORIGIN,'');
    assert.equal(config.env.AUTH_URL,undefined);console.log('PASS');`;
  expect(execFileSync(process.execPath, ["--require", guardPath, "--input-type=module", "-e", script], {
    env: { PATH: process.env.PATH, NODE_ENV: "production", VERCEL_ENV: "production", NEXT_PUBLIC_EXPERTHUB_LOCAL_UI_ISOLATED: "true" },
    encoding: "utf8", timeout: 15000,
  }).trim()).toBe("PASS");
});
