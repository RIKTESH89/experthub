/** @jest-environment jsdom */
import gsap from "gsap";
import { createSourceMotion } from "../src/components/home/digital-brain/source-motion";

// Keep the installed GSAP core and Context.add implementation real. The DOM
// plugins are replaced only to inject a failure after an owned tween exists.
jest.mock("gsap/ScrollTrigger", () => ({ ScrollTrigger: {} }));
jest.mock("gsap/ScrollSmoother", () => ({
  ScrollSmoother: {
    create: () => {
      const core = jest.requireActual("gsap").gsap;
      const tween = core.to({ value: 0 }, { value: 1, paused: true });
      return { kill: () => tween.kill(), scrollTo: jest.fn() };
    },
  },
}));
jest.mock("gsap/SplitText", () => ({ SplitText: class {} }));

test("failed setup restores real GSAP context and cannot capture an unrelated tween", async () => {
  expect(gsap.version).toBe("3.13.0");
  Object.defineProperty(document, "fonts", { configurable: true, value: { ready: Promise.resolve() } });
  const root = document.createElement("div");
  root.innerHTML = '<div data-smooth-wrapper><div data-smooth-content><div data-story-sequence></div></div></div><div data-progress-bar></div><span data-progress-text></span>';
  document.body.append(root);
  const actualCore = gsap.core as typeof gsap.core & { context: () => gsap.Context | undefined };
  const previous = actualCore.context();
  const contextFactory = gsap.context;
  let owned: gsap.Context | undefined;
  const contextSpy = jest.spyOn(gsap, "context").mockImplementation((callback, scope) => {
    owned = contextFactory(callback, scope);
    return owned;
  });
  const setterSpy = jest.spyOn(gsap, "quickSetter").mockImplementation(() => { throw new Error("injected setup failure"); });
  let unrelated: gsap.core.Tween | undefined;
  try {
    await expect(createSourceMotion(root, new AbortController().signal, () => {})).rejects.toThrow("injected setup failure");
    const currentAfterFailure = actualCore.context();
    const target = { value: 0 };
    unrelated = gsap.to(target, { value: 10, duration: 1, ease: "none", paused: true });
    expect(owned?.isReverted).toBe(true);
    expect(currentAfterFailure).toBe(previous);
    expect(owned?.getTweens()).not.toContain(unrelated);
    expect((unrelated as gsap.core.Tween & { _ctx?: gsap.Context })._ctx).toBeUndefined();
    owned?.revert();
    unrelated.totalTime(0.5);
    expect(target.value).toBeCloseTo(5);
  } finally {
    unrelated?.kill();
    owned?.revert();
    setterSpy.mockRestore();
    contextSpy.mockRestore();
    gsap.ticker.sleep();
    root.remove();
  }
});
