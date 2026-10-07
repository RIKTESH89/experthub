"use client";

import { useEffect, useRef, useState } from "react";
import type { SourceVector } from "./source-retarget";
import { sideAboveView } from "./source-camera";
import { decodePoster, nextFrame } from "./illustration-ready";
import type { createSourceMotion } from "./source-motion";
import type { createBrainScene } from "./art/scene.js";

type Scene = Awaited<ReturnType<typeof createBrainScene>>;
type Motion = Awaited<ReturnType<typeof createSourceMotion>>;
type Phase = { state: "loading" | "ready" | "error"; message: string };
type Diagnostic = { progress: number; targetProgress: number; captionIndex: number; captionOpacity: number; captions: ReturnType<Motion["captions"]>; sourceCamera: SourceVector; sourceTarget: SourceVector; camera: SourceVector; target: SourceVector; metrics: ReturnType<Scene["metrics"]>; status: string };
declare global { interface Window { __expertHubBrain?: Diagnostic } }

export function BrainRuntime() {
  const [preferences, setPreferences] = useState<{ reduced: boolean; compact: boolean } | null>(null);
  const [reading, setReading] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const [phase, setPhase] = useState<Phase>({ state: "loading", message: "Loading" });
  const generation = useRef(0);

  useEffect(() => {
    const media = matchMedia("(prefers-reduced-motion: reduce)");
    const height = matchMedia("(orientation: landscape) and (max-height: 580px)");
    const update = () => setPreferences({ reduced: media.matches, compact: height.matches });
    update(); media.addEventListener("change", update); height.addEventListener("change", update);
    if (location.hash === "#story-reading") setReading(true);
    return () => { media.removeEventListener("change", update); height.removeEventListener("change", update); };
  }, []);

  useEffect(() => {
    const root = document.querySelector<HTMLElement>("[data-digital-brain-home]");
    const sequence = root?.querySelector<HTMLElement>("[data-story-sequence]");
    const canvas = root?.querySelector<HTMLCanvasElement>("[data-brain-canvas]");
    const story = root?.querySelector<HTMLElement>("#story-reading");
    const content = root?.querySelector<HTMLElement>("[data-smooth-wrapper]");
    const poster = story?.querySelector<HTMLImageElement>(".reading-poster");
    if (!root || !sequence || !canvas || !story || !content || !poster || !preferences) return;
    const run = ++generation.current;
    const abort = new AbortController();
    let alive = true, scene: Scene | undefined, motion: Motion | undefined, raf = 0, focusFrame = 0;
    let elapsed = 0, lastTime = 0;
    const current = () => alive && run === generation.current && root.isConnected && !abort.signal.aborted;
    const readingLinks = Array.from(story.querySelectorAll<HTMLAnchorElement>("a[href]"));
    const originalTabIndexes = new Map(readingLinks.map(link => [link, link.getAttribute("tabindex")]));
    const headingsMadeFocusable = new Set<HTMLElement>();
    const readingInteractive = (enabled: boolean) => readingLinks.forEach(link => {
      const original = originalTabIndexes.get(link);
      if (!enabled) link.tabIndex = -1;
      else if (original == null) link.removeAttribute("tabindex");
      else link.setAttribute("tabindex", original);
    });
    const dispose = () => {
      cancelAnimationFrame(raf); raf = 0;
      motion?.dispose(); scene?.dispose();
      delete window.__expertHubBrain;
    };
    root.dataset.illustrationReady = "false"; root.dataset.renderer = "loading";
    root.dataset.motionReady = "false"; root.dataset.onStory = "true";
    delete root.dataset.firstDraw; delete root.dataset.posterDecoded;
    content.inert = true;
    setPhase({ state: "loading", message: "Loading" });
    const fail = (message: string) => {
      if (!current()) return;
      clearTimeout(deadline); abort.abort(); dispose();
      root.dataset.renderer = "error"; root.dataset.motionReady = "false";
      root.dataset.illustrationReady = "false"; content.inert = true;
      setPhase({ state: "error", message });
    };
    const deadline = window.setTimeout(() => fail("The illustration is taking longer to load. Please try again."), 20000);
    const positionReading = () => {
      cancelAnimationFrame(focusFrame);
      focusFrame = requestAnimationFrame(() => {
        if (!current() || location.pathname !== "/" || location.hash !== "#story-reading" || root.dataset.renderer !== "static" || root.dataset.illustrationReady !== "true") return;
        story.focus({ preventScroll: true });
        const heading = story.querySelector("h1");
        const headerBottom = root.querySelector("header")?.getBoundingClientRect().bottom || 0;
        if (heading) window.scrollTo({ top: scrollY + heading.getBoundingClientRect().top - headerBottom - 16, behavior: "instant" });
      });
    };
    const positionStaticTarget = (target: HTMLElement, hash: string) => {
      cancelAnimationFrame(focusFrame);
      focusFrame = requestAnimationFrame(() => {
        if (!current() || location.pathname !== "/" || location.hash !== hash || root.dataset.renderer !== "static" || root.dataset.illustrationReady !== "true" || !root.contains(target)) return;
        const heading = target.querySelector<HTMLElement>("h1,h2,h3") || target;
        if (!heading.hasAttribute("tabindex")) { heading.tabIndex = -1; headingsMadeFocusable.add(heading); }
        heading.focus({ preventScroll: true });
        const headerBottom = root.querySelector("header")?.getBoundingClientRect().bottom || 0;
        window.scrollTo({ top: scrollY + heading.getBoundingClientRect().top - headerBottom - 16, behavior: "instant" });
      });
    };
    const reveal = (renderer: "ready" | "static") => {
      if (!current()) return;
      clearTimeout(deadline);
      root.dataset.renderer = renderer; root.dataset.illustrationReady = "true";
      content.inert = false; readingInteractive(renderer === "static");
      setPhase({ state: "ready", message: "Illustration ready" });
      if (renderer === "static") {
        followHash();
      }
    };
    const resize = () => {
      const rect = canvas.getBoundingClientRect();
      if (rect.width && rect.height) scene?.resize(rect.width, rect.height);
      schedule();
    };
    const observer = new ResizeObserver(resize);
    const frame = (now: number) => {
      raf = 0;
      if (!current() || !scene || !motion || document.hidden) { lastTime = 0; return; }
      const rect = sequence.getBoundingClientRect();
      const visible = rect.bottom > 0 && rect.top < innerHeight;
      root.dataset.onStory = String(visible);
      if (!visible) { lastTime = 0; return; }
      const delta = lastTime ? Math.min((now - lastTime) / 1000, .05) : 0;
      lastTime = now; elapsed += delta;
      const { camera, target } = sideAboveView(motion.progress(), innerWidth / innerHeight);
      try {
        scene.setSourcePose(camera, target); scene.render(delta, elapsed);
      } catch { fail("The illustration is unavailable. Please try again."); return; }
      const captions = motion.captions();
      const active = captions.reduce((best, caption) => caption.opacity > best.opacity ? caption : best, captions[0]);
      window.__expertHubBrain = {
        progress: motion.progress(), targetProgress: Math.max(0, Math.min(1, scrollY / Math.max(1, sequence.offsetHeight - innerHeight))),
        captionIndex: active.index, captionOpacity: active.opacity, captions,
        sourceCamera: { x: motion.camera.x, y: motion.camera.y, z: motion.camera.z },
        sourceTarget: { x: motion.target.x, y: motion.target.y, z: motion.target.z }, camera, target, metrics: scene.metrics(), status: "ready",
      };
      schedule();
    };
    function schedule() { if (current() && motion && !raf && !document.hidden) raf = requestAnimationFrame(frame); }
    const tabVisibility = () => { if (document.hidden) { cancelAnimationFrame(raf); raf = 0; lastTime = 0; } else schedule(); };
    const contextLost = (event: Event) => {
      event.preventDefault();
      // Disposing a preceding animated attempt deliberately loses its context
      // asynchronously. It cannot invalidate this attempt's decoded poster
      // or scene that has not yet been handed to this runtime.
      if (scene) fail("The illustration is unavailable. Please try again.");
    };
    const followHash = () => {
      if (!current() || location.pathname !== "/") return;
      if (location.hash === "#story-reading") {
        if (root.dataset.renderer === "static" && root.dataset.illustrationReady === "true") positionReading();
        else setReading(true);
        return;
      }
      const target = document.getElementById(location.hash.slice(1));
      if (target && root.contains(target)) {
        if (motion) motion.scrollTo(target);
        else if (root.dataset.renderer === "static" && root.dataset.illustrationReady === "true") positionStaticTarget(target, location.hash);
      }
    };
    const anchor = (event: MouseEvent) => {
      const link = event.target instanceof Element ? event.target.closest<HTMLAnchorElement>('a[href^="#"]') : null;
      const href = link?.getAttribute("href");
      if (event.button || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey || !href) return;
      const target = document.getElementById(href.slice(1));
      if (!target) return;
      if (href === "#story-reading" || motion || root.dataset.illustrationReady !== "true") {
        event.preventDefault(); event.stopPropagation(); history.pushState(history.state, "", href);
        if (href === "#story-reading") {
          if (root.dataset.renderer === "static" && root.dataset.illustrationReady === "true") positionReading();
          else setReading(true);
        }
        else if (motion && root.dataset.illustrationReady === "true") {
          motion.scrollTo(target); target.querySelector<HTMLElement>('h2[tabindex="-1"]')?.focus({ preventScroll: true });
        }
      }
    };
    window.addEventListener("scroll", schedule, { passive: true }); window.addEventListener("resize", resize);
    document.addEventListener("visibilitychange", tabVisibility); canvas.addEventListener("webglcontextlost", contextLost);
    root.addEventListener("click", anchor, true); window.addEventListener("popstate", followHash); observer.observe(canvas);
    (async () => {
      try {
        if (preferences.reduced || preferences.compact || reading) {
          setPhase({ state: "loading", message: "Loading" });
          await decodePoster(poster, abort.signal, attempt);
          if (!current()) return;
          root.dataset.posterDecoded = "true"; reveal("static"); return;
        }
        const [{ createBrainScene }, { createSourceMotion }] = await Promise.all([import("./art/scene.js"), import("./source-motion")]);
        if (!current()) return;
        const prepared = await createBrainScene({ canvas, signal: abort.signal, onStage: () => {} });
        if (!current()) { prepared.dispose(); return; }
        scene = prepared;
        // Build the unchanged GSAP layout behind the loading screen. Asset
        // completion alone must never expose a blank canvas or the story.
        root.dataset.renderer = "preparing"; resize(); scene.setTheme(true);
        const preparedMotion = await createSourceMotion(root, abort.signal, schedule);
        if (!current()) { preparedMotion.dispose(); scene.dispose(); return; }
        motion = preparedMotion;
        const initial = sideAboveView(motion.progress(), innerWidth / innerHeight);
        scene.setSourcePose(initial.camera, initial.target); scene.render(0, 0);
        const metrics = scene.metrics();
        if (!metrics.drawCount || !metrics.modelCount || !metrics.triangles || !metrics.calls) throw new Error("Illustration did not draw");
        root.dataset.firstDraw = String(metrics.drawCount);
        // Give the successfully submitted frame a paint opportunity before
        // atomically exposing the illustration and its real headline/body.
        await nextFrame(abort.signal);
        if (!current()) return;
        root.dataset.motionReady = "true"; reveal("ready"); followHash(); schedule();
      } catch { if (current()) fail("The illustration couldn’t load. Please try again."); }
    })();
    return () => {
      alive = false; clearTimeout(deadline); abort.abort(); dispose(); cancelAnimationFrame(focusFrame);
      observer.disconnect(); window.removeEventListener("scroll", schedule); window.removeEventListener("resize", resize);
      document.removeEventListener("visibilitychange", tabVisibility); canvas.removeEventListener("webglcontextlost", contextLost);
      root.removeEventListener("click", anchor, true); window.removeEventListener("popstate", followHash);
      content.inert = false; readingInteractive(true);
      headingsMadeFocusable.forEach(heading => heading.removeAttribute("tabindex"));
      headingsMadeFocusable.clear();
      if (root.isConnected) { root.dataset.illustrationReady = "false"; root.dataset.renderer = "boot"; root.dataset.motionReady = "false"; }
    };
  }, [preferences, reading, attempt]);

  return <div className="brain-load-screen" data-load-state={phase.state} hidden={phase.state === "ready"}>
    <div className="brain-loader-art" aria-hidden="true"><svg viewBox="0 0 280 280" fill="none">
      <circle cx="140" cy="140" r="89" />
      <g className="loader-orbit"><ellipse cx="140" cy="140" rx="89" ry="32" /><ellipse cx="140" cy="140" rx="89" ry="32" transform="rotate(60 140 140)" /><ellipse cx="140" cy="140" rx="89" ry="32" transform="rotate(120 140 140)" /></g>
      <circle className="loader-center" cx="140" cy="140" r="7" /><circle className="loader-satellite" cx="140" cy="51" r="3" />
    </svg></div>
    <div className="brain-loader-copy"><p className="eyebrow">EXPERT DIGITAL TWINS</p>
      <h2>{phase.state === "error" ? "A moment out of view." : "Bringing ExpertHub\nto you"}</h2>
      <p role={phase.state === "error" ? "alert" : "status"}>{phase.message}</p>
      {phase.state === "error" && <button className="brain-retry" type="button" onClick={() => { window.scrollTo({ top: 0, behavior: "instant" }); setAttempt(value => value + 1); }}>Try again <span aria-hidden="true">↗</span></button>}
    </div>
    <p className="brain-loader-note">Expert ideas. New perspectives.</p>
  </div>;
}
