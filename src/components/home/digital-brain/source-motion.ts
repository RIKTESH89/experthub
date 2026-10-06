// Official GSAP 3.13.0 source port, using the pinned variant-2 configuration.
// Exact source engine: JosephASG / Codrops variant 2, MIT,
// commit 7a56d1fdc12058e3a955348a7a9f3387a2bf57da.
// App-specific adaptation: local DOM arguments, abort/readiness, owned cleanup.
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { ScrollSmoother } from "gsap/ScrollSmoother";
import { SplitText } from "gsap/SplitText";
import { scenePerspectives } from "./source-perspectives";

gsap.registerPlugin(ScrollTrigger, ScrollSmoother, SplitText);

export async function createSourceMotion(root: HTMLElement, signal: AbortSignal, wake: () => void) {
  await document.fonts.ready;
  signal.throwIfAborted();
  const wrapper = root.querySelector<HTMLElement>("[data-smooth-wrapper]")!;
  const content = root.querySelector<HTMLElement>("[data-smooth-content]")!;
  const container = root.querySelector<HTMLElement>("[data-story-sequence]")!;
  const texts = Array.from(root.querySelectorAll<HTMLElement>("[data-source-slot]"));
  const camera = { x: -20, y: 0, z: 0 };
  const target = { x: 0, y: 15, z: 0 };
  const rotation = { useRotation: false };
  const splits: SplitText[] = [];
  let smoother: ScrollSmoother | undefined;
  const textTimelines: gsap.core.Timeline[] = [];
  const titleCharacters: HTMLElement[][] = [];
  let progress = 0;
  let disposed = false;
  const context = gsap.context(() => {
    smoother = ScrollSmoother.create({ wrapper, content, smooth: 4, effects: false, smoothTouch: 2 });
    const setProgressWidth = gsap.quickSetter(root.querySelector("[data-progress-bar]"), "width", "%");
    const setProgressText = gsap.quickSetter(root.querySelector("[data-progress-text]"), "textContent");
    const timeline = gsap.timeline({
      scrollTrigger: {
        trigger: container, start: "top top", end: "bottom bottom", scrub: true,
        onUpdate: self => {
          progress = self.progress;
          wake();
          setProgressWidth(progress * 100);
          setProgressText(Math.round(progress * 100).toString().padStart(3, "0") + "%");
        },
      },
    });
    scenePerspectives.forEach(perspective => {
      const start = perspective.scrollProgress.start / 100;
      const end = perspective.scrollProgress.end / 100;
      timeline.to(camera, { x: perspective.camera.x, y: perspective.camera.y, z: perspective.camera.z, duration: end - start, ease: "none" }, start);
      timeline.to(target, { x: perspective.target.x, y: perspective.target.y, z: perspective.target.z, duration: end - start, ease: "none" }, start);
      timeline.to(rotation, { useRotation: false, duration: end - start, ease: "none" }, start);
    });
    scenePerspectives.forEach((perspective, index) => {
      const text = texts[index];
      if (perspective.hideText) { gsap.set(text, { opacity: 0, pointerEvents: "none" }); return; }
      const title = text.querySelector("h2")!;
      const subtitle = text.querySelector("p")!;
      const titleSplit = new SplitText(title, { type: "chars", smartWrap: true });
      const subtitleSplit = new SplitText(subtitle, { type: "chars", smartWrap: true });
      splits.push(titleSplit, subtitleSplit);
      titleCharacters[index] = titleSplit.chars as HTMLElement[];
      const textTimeline = gsap.timeline({
        scrollTrigger: {
          trigger: container,
          start: `${perspective.scrollProgress.start}% top`,
          end: `${perspective.scrollProgress.end}% top`,
          scrub: 0.5,
        },
      });
      textTimelines[index] = textTimeline;
      if (index === 0) {
        gsap.set([titleSplit.chars, subtitleSplit.chars], { x: 0, opacity: 1 });
        textTimeline.to([subtitleSplit.chars, titleSplit.chars], { x: 100, opacity: 0, duration: 1, stagger: -0.02, ease: "power2.in" });
      } else {
        const last = index === scenePerspectives.length - 1;
        textTimeline.fromTo(
          [subtitleSplit.chars, titleSplit.chars], { x: -100, opacity: 0 },
          { x: 0, opacity: 1, duration: last ? 0.2 : 0.25, stagger: last ? -0.01 : -0.02, ease: "power2.out" },
        ).to({}, { duration: last ? 1.0 : 0.5 })
          .to([subtitleSplit.chars, titleSplit.chars], { x: 100, opacity: 0, duration: 0.25, stagger: -0.02, ease: "power2.in" });
      }
    });
  }, root);
  const dispose = () => {
    if (disposed) return;
    disposed = true;
    signal.removeEventListener("abort", dispose);
    context.revert();
    splits.forEach(split => split.revert());
    smoother?.kill();
  };
  signal.addEventListener("abort", dispose, { once: true });
  if (signal.aborted) { dispose(); signal.throwIfAborted(); }
  return {
    camera, target, progress: () => progress, dispose,
    // Native Next hash offsets are wrong while content is transformed. This
    // app-only anchor adapter uses the official engine's instantaneous jump.
    scrollTo: (element: HTMLElement) => smoother?.scrollTo(element, false, "top 96px"),
    captions: () => scenePerspectives.map((perspective, index) => {
      const chars = titleCharacters[index] || [];
      const opacity = chars.length ? chars.reduce((sum, char) => sum + Number(char.style.opacity || 0), 0) / chars.length : 0;
      return { index, opacity, timelineProgress: textTimelines[index]?.progress() || 0, hidden: !!perspective.hideText };
    }),
  };
}
