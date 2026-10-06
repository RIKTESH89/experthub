"use client";

import { useEffect, useRef, useState } from "react";
import { retargetView, type SourceVector } from "./source-retarget";
import type { createSourceMotion } from "./source-motion";
import type { createBrainScene } from "./art/scene.js";

type Scene = Awaited<ReturnType<typeof createBrainScene>>;
type Mode = "auto" | "static" | "animated";
type Motion = Awaited<ReturnType<typeof createSourceMotion>>;
type Diagnostic = { progress: number; targetProgress: number; captionIndex: number; captionOpacity: number; captions: ReturnType<Motion["captions"]>; sourceCamera: SourceVector; sourceTarget: SourceVector; camera: SourceVector; target: SourceVector; metrics: ReturnType<Scene["metrics"]>; status: string };
declare global { interface Window { __expertHubBrain?: Diagnostic } }

export function BrainRuntime() {
  const [mode, setMode] = useState<Mode>("auto");
  const [reduced, setReduced] = useState<boolean | null>(null);
  const [compact, setCompact] = useState<boolean | null>(null);
  const [status, setStatus] = useState("The complete story is available in text.");
  const [loading, setLoading] = useState(false);
  const [failed, setFailed] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const readingFrame = useRef(0);
  const staticMode = compact === true || mode === "static" || (mode === "auto" && reduced === true);

  useEffect(() => () => cancelAnimationFrame(readingFrame.current), []);

  useEffect(() => {
    const media = matchMedia("(prefers-reduced-motion: reduce)");
    const height = matchMedia("(orientation: landscape) and (max-height: 580px)");
    const update = () => { setReduced(media.matches); setCompact(height.matches); };
    update(); media.addEventListener("change", update); height.addEventListener("change", update);
    if (window.location.hash === "#story-reading") {
      setMode("static");
      readingFrame.current = requestAnimationFrame(() => document.getElementById("story-reading")?.focus({ preventScroll: true }));
    }
    return () => { media.removeEventListener("change", update); height.removeEventListener("change", update); };
  }, []);

  useEffect(() => {
    const root = document.querySelector<HTMLElement>("[data-digital-brain-home]");
    const sequence = root?.querySelector<HTMLElement>("[data-story-sequence]");
    const canvas = root?.querySelector<HTMLCanvasElement>("[data-brain-canvas]");
    const reading = root?.querySelector<HTMLElement>("#story-reading");
    if (!root || !sequence || !canvas || !reading || reduced === null || compact === null) return;
    const readingLinks = Array.from(reading.querySelectorAll<HTMLAnchorElement>("a[href]"));
    const originalTabIndexes = new Map(readingLinks.map(link => [link, link.getAttribute("tabindex")]));
    const readingInteractive = (enabled: boolean) => readingLinks.forEach(link => {
      const original = originalTabIndexes.get(link);
      if (!enabled) link.tabIndex = -1;
      else if (original == null) link.removeAttribute("tabindex");
      else link.setAttribute("tabindex", original);
    });
    const enterReading = (event: FocusEvent) => {
      root.dataset.renderer = "static"; readingInteractive(true); setMode("static");
      const target = event.target;
      cancelAnimationFrame(readingFrame.current);
      // Next's hash navigation and the mode change both move layout. Position
      // the focused story only after their updates have reached the browser.
      readingFrame.current = requestAnimationFrame(() => {
        readingFrame.current = requestAnimationFrame(() => {
          readingFrame.current = 0;
          if (!root.isConnected || root.dataset.renderer === "ready" || !(target instanceof HTMLElement)) return;
          const headerBottom = root.querySelector("header")?.getBoundingClientRect().bottom || 0;
          if (target === reading) {
            const introduction = reading.querySelector("h1");
            if (introduction) window.scrollTo({ top: window.scrollY + introduction.getBoundingClientRect().top - headerBottom - 16, behavior: "instant" });
          } else {
            const rect = target.getBoundingClientRect();
            if (rect.top < headerBottom + 16 || rect.bottom > window.innerHeight - 16) target.scrollIntoView({ block: "center", behavior: "instant" });
          }
        });
      });
    };
    reading.addEventListener("focusin", enterReading);
    if (staticMode) {
      root.dataset.renderer = "static";
      readingInteractive(true);
      setLoading(false); setFailed(false);
      setStatus("The complete story is available without motion.");
      return () => reading.removeEventListener("focusin", enterReading);
    }
    const abort = new AbortController();
    let scene: Scene | undefined, motion: Motion | undefined, raf = 0, alive = true;
    let elapsed = 0, lastTime = 0;
    setLoading(true); setFailed(false);
    root.dataset.renderer = "loading";
    root.dataset.motionReady = "false";
    root.dataset.onStory = "true";
    const failToReading = (message: string) => {
      abort.abort(); motion?.dispose(); scene?.dispose();
      root.dataset.renderer = "error"; root.dataset.motionReady = "false"; readingInteractive(true);
      setLoading(false); setFailed(true); setStatus(message);
      cancelAnimationFrame(raf); raf = 0; delete window.__expertHubBrain;
    };
    const deadline = window.setTimeout(() => {
      if (!alive || root.dataset.motionReady === "true") return;
      failToReading("The illustration is taking longer to load. You can read the complete story below.");
    }, 20000);
    const resize = () => {
      const rect = canvas.getBoundingClientRect();
      if (rect.width && rect.height) scene?.resize(rect.width, rect.height);
      schedule();
    };
    const theme = () => { scene?.setTheme(document.documentElement.classList.contains("dark")); schedule(); };
    const observer = new ResizeObserver(resize);
    const themeObserver = new MutationObserver(theme);
    const frame = (now: number) => {
      raf = 0;
      if (!alive || !scene || !motion || abort.signal.aborted || document.hidden) { lastTime = 0; return; }
      const rect = sequence.getBoundingClientRect();
      const visible = rect.bottom >= window.innerHeight - 1 && rect.top < window.innerHeight;
      root.dataset.onStory = String(visible);
      if (!visible) { lastTime = 0; return; }
      const delta = lastTime ? Math.min((now - lastTime) / 1000, .05) : 0;
      lastTime = now; elapsed += delta;
      const { camera, target } = retargetView(motion.camera, motion.target, window.innerWidth / window.innerHeight);
      scene.setSourcePose(camera, target);
      scene.render(delta, elapsed);
      const captions = motion.captions();
      const active = captions.reduce((best, caption) => caption.opacity > best.opacity ? caption : best, captions[0]);
      window.__expertHubBrain = {
        progress: motion.progress(), targetProgress: Math.max(0, Math.min(1, window.scrollY / Math.max(1, sequence.offsetHeight - window.innerHeight))),
        captionIndex: active.index, captionOpacity: active.opacity, captions,
        sourceCamera: { x: motion.camera.x, y: motion.camera.y, z: motion.camera.z },
        sourceTarget: { x: motion.target.x, y: motion.target.y, z: motion.target.z }, camera, target, metrics: scene.metrics(), status: "ready",
      };
      schedule();
    };
    function schedule() { if (alive && !abort.signal.aborted && !raf && !document.hidden) raf = requestAnimationFrame(frame); }
    const tabVisibility = () => { if (document.hidden) { cancelAnimationFrame(raf); raf = 0; lastTime = 0; } else schedule(); };
    const contextLost = (event: Event) => { event.preventDefault(); if (alive && !abort.signal.aborted) failToReading("The illustration is unavailable. You can read the complete story below."); };
    const followHash = () => {
      if (!motion || !alive || location.pathname !== "/" || location.hash === "#story-reading") return;
      const target = document.getElementById(location.hash.slice(1));
      if (target) motion.scrollTo(target);
    };
    const anchor = (event: MouseEvent) => {
      const link = event.target instanceof Element ? event.target.closest<HTMLAnchorElement>('a[href^="#"]') : null;
      const href = link?.getAttribute("href");
      if (!motion || event.button || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey || !href || href === "#story-reading") return;
      const target = document.getElementById(href.slice(1));
      if (!target) return;
      event.preventDefault(); event.stopPropagation();
      history.pushState(history.state, "", href);
      motion.scrollTo(target);
      target.querySelector<HTMLElement>('h2[tabindex="-1"]')?.focus({ preventScroll: true });
    };
    root.addEventListener("click", anchor, true);
    window.addEventListener("popstate", followHash);
    window.addEventListener("scroll", schedule, { passive: true });
    window.addEventListener("resize", resize);
    document.addEventListener("visibilitychange", tabVisibility);
    canvas.addEventListener("webglcontextlost", contextLost);
    themeObserver.observe(document.documentElement, { attributes: true, attributeFilter: ["class"] });
    observer.observe(canvas);
    (async () => {
      try {
        const [{ createBrainScene }, { createSourceMotion }] = await Promise.all([import("./art/scene.js"), import("./source-motion")]);
        if (!alive) return;
        scene = await createBrainScene({ canvas, signal: abort.signal, onStage: message => { if (alive) setStatus(message); } });
        if (!alive) { scene.dispose(); return; }
        root.dataset.renderer = "ready";
        resize(); theme();
        motion = await createSourceMotion(root, abort.signal, schedule);
        if (!alive || abort.signal.aborted) { motion.dispose(); scene.dispose(); return; }
        root.dataset.motionReady = "true";
        readingInteractive(false);
        followHash();
        const initial = retargetView(motion.camera, motion.target, window.innerWidth / window.innerHeight);
        scene.setSourcePose(initial.camera, initial.target); scene.render(0, 0);
        clearTimeout(deadline);
        setLoading(false); setStatus("Illustration ready. Scroll to follow the story.");
        schedule();
      } catch {
        clearTimeout(deadline);
        if (!alive || abort.signal.aborted) return;
        failToReading("The illustration is unavailable. You can read the complete story below.");
      }
    })();
    return () => {
      alive = false; clearTimeout(deadline); abort.abort(); motion?.dispose(); cancelAnimationFrame(raf); scene?.dispose();
      observer.disconnect(); themeObserver.disconnect();
      window.removeEventListener("scroll", schedule); window.removeEventListener("resize", resize); document.removeEventListener("visibilitychange", tabVisibility);
      canvas.removeEventListener("webglcontextlost", contextLost); reading.removeEventListener("focusin", enterReading);
      root.removeEventListener("click", anchor, true); window.removeEventListener("popstate", followHash);
      root.dataset.renderer = "static"; root.dataset.motionReady = "false"; readingInteractive(true); delete window.__expertHubBrain;
    };
  }, [mode, reduced, compact, staticMode, attempt]);

  return <div className="motion-toolbar" hidden={compact === true}>
    <p role="status" className={loading || failed ? "loading-status" : "sr-only"}>{status}</p>
    <button type="button" aria-pressed={staticMode} onClick={() => { cancelAnimationFrame(readingFrame.current); if (failed) setAttempt(value => value + 1); setMode(staticMode || failed ? "animated" : "static"); window.scrollTo({ top: 0, behavior: "instant" }); }}>{staticMode || failed ? "View animation" : "Read without motion"}</button>
  </div>;
}
