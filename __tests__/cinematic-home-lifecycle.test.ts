/** @jest-environment jsdom */
import fs from "fs";
import path from "path";
import ts from "typescript";

type Mount = (root: HTMLElement) => () => void;
function loadRuntime(): Mount {
  const directory = path.join(process.cwd(), "src/components/home/cinematic");
  const load = (name: string, requireModule: (name: string) => unknown = () => ({})) => {
    const source = fs.readFileSync(path.join(directory, name), "utf8");
    const code = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 } }).outputText;
    const exports: Record<string, unknown> = {};
    new Function("exports", "require", code)(exports, requireModule);
    return exports;
  };
  const timeline = load("timeline.js");
  return load("sequence.js", () => timeline).mountSequence as Mount;
}
const ids = ["introduction", "contributions", "context", "construction", "conversation", "control", "close"];
function fixture() {
  document.body.innerHTML = `<div data-cinematic-home><button id="motion"></button><canvas id="sequence"></canvas><div id="stage"></div><img id="stage-poster"><p id="runtime-status"></p><p id="asset-status"></p><nav class="chapter-nav">${ids.map(id => `<a href="#${id}">${id}</a>`).join("")}</nav><main id="story">${ids.map(id => `<section class="chapter" id="${id}"><h2 tabindex="-1">${id}</h2><span data-caption></span><figure class="static-visual"><img><figcaption></figcaption></figure></section>`).join("")}</main></div>`;
  return document.querySelector<HTMLElement>("[data-cinematic-home]")!;
}
let raf: jest.Mock;
let pending: Array<{ signal: AbortSignal; resolve: (response: unknown) => void }>;
beforeEach(() => {
  raf = jest.fn(() => 1); pending = [];
  Object.defineProperty(window, "requestAnimationFrame", { configurable: true, value: raf });
  Object.defineProperty(window, "cancelAnimationFrame", { configurable: true, value: jest.fn() });
  Object.defineProperty(window, "matchMedia", { configurable: true, value: jest.fn(() => new EventTarget()) });
  Object.defineProperty(HTMLCanvasElement.prototype, "getContext", { configurable: true, value: jest.fn(() => ({})) });
  Object.defineProperty(window, "fetch", { configurable: true, value: jest.fn((_url, options) => new Promise(resolve => pending.push({ signal: options.signal, resolve }))) });
});
afterEach(() => jest.restoreAllMocks());
async function settle() { for (let i=0;i<8;i++) await Promise.resolve(); }

test("navigation unmount aborts manifest and detaches scroll/media listeners without changing body", async () => {
  const root = fixture(); const before = document.body.className;
  const cleanup = loadRuntime()(root); expect(pending).toHaveLength(1);
  cleanup(); expect(pending[0].signal.aborted).toBe(true);
  window.dispatchEvent(new Event("scroll")); expect(raf).not.toHaveBeenCalled();
  pending[0].resolve({ ok: true, json: () => Promise.resolve({}) }); await settle();
  expect(root.dataset.cinematic).toBeUndefined(); expect(document.body.className).toBe(before);
});

test("StrictMode-style cleanup and remount leaves only the active renderer scheduling work", async () => {
  const root = fixture(); const mount = loadRuntime(); const cleanup = mount(root); cleanup();
  const cleanupAgain = mount(root);
  window.dispatchEvent(new Event("scroll")); expect(raf).toHaveBeenCalledTimes(1);
  cleanupAgain(); window.dispatchEvent(new Event("scroll")); expect(raf).toHaveBeenCalledTimes(1);
  for (const item of pending) item.resolve({ ok: false }); await settle();
});

test("a missing manifest leaves semantic story readable and reports fallback", async () => {
  const root = fixture(); const cleanup = loadRuntime()(root);
  pending[0].resolve({ ok: false }); await settle();
  expect(root.querySelector("#runtime-status")?.textContent).toMatch(/complete story remains readable/);
  expect(root.querySelectorAll(".chapter h2")).toHaveLength(7);
  expect(root.querySelector<HTMLButtonElement>("#motion")?.hidden).toBe(true);
  cleanup();
});


test("a delayed manifest body cannot revive an unmounted renderer or overwrite its remount", async () => {
  const root = fixture(); const mount = loadRuntime(); const cleanup = mount(root);
  let resolveBody!: (value: unknown) => void;
  const body = new Promise(resolve => { resolveBody = resolve; });
  pending[0].resolve({ ok: true, json: () => body }); await settle();
  cleanup();
  const cleanupCurrent = mount(root);
  root.querySelector("#runtime-status")!.textContent = "Current renderer awaiting its own response";
  const before = root.innerHTML;
  resolveBody(JSON.parse(fs.readFileSync(path.join(process.cwd(), "public/cinematic/frame-manifest.json"), "utf8")));
  await settle();
  expect(root.dataset.cinematic).toBeUndefined();
  expect(root.innerHTML).toBe(before);
  expect(raf).not.toHaveBeenCalled();
  cleanupCurrent(); pending[1].resolve({ ok: false }); await settle();
});
