/** @jest-environment jsdom */
import { createSourceMotion } from "../src/components/home/digital-brain/source-motion";

jest.mock("gsap", () => {
  const state = { resources: [] as { alive: boolean; kind: string }[], fail: "", splitCalls: 0, timelineCalls: 0, active: null as null | { owned: {alive:boolean;kind:string}[] } };
  const resource = (kind: string, contextOwned = true) => { const r = { alive: true, kind }; state.resources.push(r); if (contextOwned) state.active?.owned.push(r); return r; };
  const core = {
    registerPlugin: jest.fn(),
    context: () => { const ctx = { owned: [] as {alive:boolean;kind:string}[], add: (fn: () => void) => { const previous = state.active; state.active = ctx; fn(); state.active = previous; }, revert: () => ctx.owned.forEach(r => { r.alive = false; }) }; return ctx; },
    quickSetter: () => { if (state.fail === "after-smoother") throw new Error("setup setter failure"); return () => {}; },
    set: jest.fn(),
    timeline: () => { state.timelineCalls++; const r = resource("timeline"); const tl = { to: () => tl, fromTo: () => { if (state.fail === "text-tween") throw new Error("setup tween failure"); return tl; }, progress: () => 0, kill: () => { r.alive = false; } }; return tl; },
  };
  return { __esModule: true, default: core, __state: state, __resource: resource };
});
jest.mock("gsap/ScrollTrigger", () => ({ ScrollTrigger: {} }));
jest.mock("gsap/ScrollSmoother", () => ({ ScrollSmoother: { create: () => { const m = jest.requireMock("gsap"); const r = m.__resource("smoother", false); return { kill: () => { r.alive = false; }, scrollTo: jest.fn() }; } } }));
jest.mock("gsap/SplitText", () => ({ SplitText: class {
  chars: HTMLElement[] = [];
  private owned: {alive:boolean;kind:string};
  constructor() { const m = jest.requireMock("gsap"); m.__state.splitCalls++; this.owned = m.__resource("split"); if (m.__state.fail === "second-split" && m.__state.splitCalls === 2) throw new Error("setup subtitle failure"); if (m.__state.fail === "later-split" && m.__state.splitCalls === 7) throw new Error("setup later split failure"); }
  revert() { this.owned.alive = false; }
} }));

type MockState = { resources: {alive:boolean;kind:string}[]; fail:string; splitCalls:number; timelineCalls:number; active:unknown };
const state = () => jest.requireMock("gsap").__state as MockState;
function fixture() {
  const root = document.createElement("div");
  root.innerHTML = '<div data-smooth-wrapper><div data-smooth-content><div data-story-sequence></div></div></div><div data-progress-bar></div><span data-progress-text></span>' + Array.from({length:10},(_,i)=>`<div data-source-slot="${i}"><h2>Title</h2><p>Subtitle</p></div>`).join("");
  document.body.append(root); return root;
}
beforeEach(() => { document.body.innerHTML = ""; Object.assign(state(), {resources:[],fail:"",splitCalls:0,timelineCalls:0,active:null}); Object.defineProperty(document,"fonts",{configurable:true,value:{ready:Promise.resolve()}}); });

test.each(["after-smoother", "second-split", "later-split", "text-tween"])("releases every partial resource after %s setup failure", async failure => {
  state().fail = failure;
  const controller = new AbortController();
  const add = jest.spyOn(controller.signal,"addEventListener"), remove = jest.spyOn(controller.signal,"removeEventListener");
  await expect(createSourceMotion(fixture(),controller.signal,()=>{})).rejects.toThrow("setup");
  expect(state().resources.length).toBeGreaterThan(0);
  expect(state().resources.filter(r=>r.alive)).toEqual([]);
  expect(state().active).toBeNull();
  expect(remove.mock.calls.filter(call=>call[0]==="abort")).toHaveLength(add.mock.calls.filter(call=>call[0]==="abort").length);
  controller.abort();
  expect(state().resources.filter(r=>r.alive)).toEqual([]);
});

test("abort during font readiness rejects promptly and never constructs animation resources", async () => {
  Object.defineProperty(document,"fonts",{configurable:true,value:{ready:new Promise(()=>{})}});
  const controller = new AbortController(), pending = createSourceMotion(fixture(),controller.signal,()=>{});
  controller.abort();
  await expect(pending).rejects.toMatchObject({ name: "AbortError" });
  expect(state().resources).toEqual([]);
});

test("successful setup has idempotent abort/dispose cleanup", async () => {
  const controller = new AbortController(), motion = await createSourceMotion(fixture(),controller.signal,()=>{});
  expect(state().resources.filter(r=>r.alive).length).toBeGreaterThan(20);
  motion.dispose(); motion.dispose(); controller.abort();
  expect(state().resources.filter(r=>r.alive)).toEqual([]);
});
