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
  const assets = load("asset-config.js");
  const scheduler = load("scheduler.js");
  const artwork = load("live3d-adapter.js");
  const composition = load("stage-composition.js");
  const beats=load("text-beats.js");
  return load("sequence.js", name => name.includes("text-beats") ? beats : name.includes("stage-composition") ? composition : name.includes("live3d-adapter") ? artwork : name.includes("asset-config") ? assets : name.includes("scheduler") ? scheduler : timeline).mountSequence as Mount;
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
  expect(root.querySelector("#runtime-status")?.textContent).toMatch(/complete story/);
  expect(root.querySelectorAll(".chapter h2")).toHaveLength(7);
  expect(root.querySelector<HTMLButtonElement>("#motion")?.hidden).toBe(false);
  expect(root.querySelector<HTMLButtonElement>("#motion")?.textContent).toBe("Retry animation");
  expect(root.dataset.renderReason).toBe("manifest-unavailable");
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
  resolveBody(JSON.parse(fs.readFileSync(path.join(process.cwd(), "public/uploads/cinematic-homepage/copy-alignment-v2-03cf60b6/frame-manifest.json"), "utf8")));
  await settle();
  expect(root.dataset.cinematic).toBeUndefined();
  expect(root.innerHTML).toBe(before);
  expect(raf).not.toHaveBeenCalled();
  cleanupCurrent(); pending[1].resolve({ ok: false }); await settle();
});


test("local product shortcut scrolls to its target and focuses a heading while retaining the semantic fragment", () => {
  const root = fixture();
  root.insertAdjacentHTML("beforeend", '<a href="#plans">Pricing</a><section id="plans"><h2>Access</h2></section>');
  const scroll = jest.fn();
  Object.defineProperty(root.querySelector("#plans"), "scrollIntoView", {configurable:true,value:scroll});
  const dispose = loadRuntime()(root);
  (root.querySelector('a[href="#plans"]') as HTMLAnchorElement).click();
  expect(scroll).toHaveBeenCalledWith({block:"start",behavior:"instant"});
  expect(document.activeElement).toBe(root.querySelector("#plans h2"));
  expect(root.querySelector('a[href="#plans"]')?.getAttribute("href")).toBe("#plans");
  dispose();
});


test("a failed manifest offers a fresh retry and cleanup aborts that retry without reviving the renderer", async () => {
  const root = fixture(); const cleanup = loadRuntime()(root);
  pending[0].resolve({ok:false}); await settle();
  const button = root.querySelector<HTMLButtonElement>("#motion")!;
  expect(button.disabled).toBe(false); button.click();
  expect(pending).toHaveLength(2);
  expect(pending[0].signal.aborted).toBe(true);
  expect(button.disabled).toBe(true);
  expect(root.dataset.renderReason).toBe("loading");
  cleanup(); expect(pending[1].signal.aborted).toBe(true);
  const before = root.innerHTML;
  pending[1].resolve({ok:true,json:async()=>JSON.parse(fs.readFileSync(path.join(process.cwd(),"public/uploads/cinematic-homepage/copy-alignment-v2-03cf60b6/frame-manifest.json"),"utf8"))});
  await settle(); expect(root.innerHTML).toBe(before);
});

test("reduced motion remains respected and cannot be overridden through the animation button", async () => {
  Object.defineProperty(window,"matchMedia",{configurable:true,value:jest.fn(query=>{const media=new EventTarget();Object.assign(media,{matches:query.includes("prefers-reduced-motion")});return media})});
  const root=fixture();const cleanup=loadRuntime()(root);
  pending[0].resolve({ok:true,json:async()=>JSON.parse(fs.readFileSync(path.join(process.cwd(),"public/uploads/cinematic-homepage/copy-alignment-v2-03cf60b6/frame-manifest.json"),"utf8"))});await settle();
  expect(root.dataset.renderReason).toBe("reduced-motion");
  const button=root.querySelector<HTMLButtonElement>("#motion")!;expect(button.disabled).toBe(true);button.click();
  expect(root.dataset.renderReason).toBe("reduced-motion");expect(pending).toHaveLength(1);cleanup();
});

test.each(["source-01", "source-04"])("source fragment %s opens its details before scrolling and measures the header", id => {
   const root = fixture();
   root.insertAdjacentHTML("beforeend", `<header class="site-nav"></header><a href="#${id}">Read source</a><footer><details><summary>Sources</summary><div id="${id}"><h3>Source</h3><p>Complete quotation.</p></div></details></footer>`);
   const header = root.querySelector(".site-nav")!;
   jest.spyOn(header, "getBoundingClientRect").mockReturnValue({height:100} as DOMRect);
   const target = root.querySelector(`#${id}`)!;
   const scroll = jest.fn(() => {
     expect(target.closest("details")!.open).toBe(true);
     expect(root.style.getPropertyValue("--anchor-header-offset")).toBe("116px");
   });
   Object.defineProperty(target,"scrollIntoView",{configurable:true,value:scroll});
   const cleanup = loadRuntime()(root);
   (root.querySelector(`a[href="#${id}"]`) as HTMLAnchorElement).click();
   expect(scroll).toHaveBeenCalled();
   expect(document.activeElement).toBe(target);
   cleanup();
 });

test("rapid local fragments preserve synchronous history and existing router state", () => {
  const root=fixture();
  root.insertAdjacentHTML("beforeend", '<a href="#source-01">Source</a><footer><details><summary>Sources</summary><div id="source-01" tabindex="-1">Source words</div></details></footer>');
  const target=root.querySelector('#source-01')!;
  Object.defineProperty(target,'scrollIntoView',{configurable:true,value:jest.fn()});
  history.replaceState({__NA:true,tree:'existing-router-tree'},'', '/');
  const push=jest.spyOn(history,'pushState');
  const cleanup=loadRuntime()(root);
  const click=new MouseEvent('click',{bubbles:true,cancelable:true});
  root.querySelector('a[href="#source-01"]')!.dispatchEvent(click);
  expect(click.defaultPrevented).toBe(true);
  expect(location.hash).toBe('#source-01');
  expect(push).toHaveBeenCalledWith({__NA:true,tree:'existing-router-tree'},'', '#source-01');
  root.querySelector('a[href="#source-01"]')!.dispatchEvent(new MouseEvent('click',{bubbles:true,cancelable:true}));
  expect(push).toHaveBeenCalledTimes(1);
  const modified=new MouseEvent('click',{bubbles:true,cancelable:true,ctrlKey:true});
  root.querySelector('a[href="#source-01"]')!.dispatchEvent(modified);
  expect(modified.defaultPrevented).toBe(false);
  cleanup();history.replaceState(null,'','/');
});
