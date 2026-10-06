"use client";

import { useEffect, useState } from "react";
import { evaluateStory, chapters } from "./timeline";
import type { createBrainScene } from "./art/scene.js";

type Scene = Awaited<ReturnType<typeof createBrainScene>>;
type Mode = "auto" | "static" | "animated";
type Diagnostic = { progress: number; captionIndex: number; captionOpacity: number; pose: ReturnType<typeof evaluateStory>["pose"]; yawOffset: number; metrics: ReturnType<Scene["metrics"]>; status: string };
declare global { interface Window { __expertHubBrain?: Diagnostic } }

export function BrainRuntime() {
  const [mode, setMode] = useState<Mode>("auto");
  const [reduced, setReduced] = useState<boolean | null>(null);
  const [compact, setCompact] = useState<boolean | null>(null);
  const [status, setStatus] = useState("The complete story is available in text.");
  const [loading, setLoading] = useState(false);
  const [failed, setFailed] = useState(false);
  const [ready, setReady] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const staticMode = compact === true || mode === "static" || (mode === "auto" && reduced === true);

  useEffect(() => {
    const media = matchMedia("(prefers-reduced-motion: reduce)");
    const height = matchMedia("(orientation: landscape) and (max-height: 580px)");
    const update = () => { setReduced(media.matches); setCompact(height.matches); };
    update(); media.addEventListener("change", update); height.addEventListener("change", update);
    return () => { media.removeEventListener("change", update); height.removeEventListener("change", update); };
  }, []);

  useEffect(() => {
    const root = document.querySelector<HTMLElement>("[data-digital-brain-home]");
    const sequence = root?.querySelector<HTMLElement>("[data-story-sequence]");
    const canvas = root?.querySelector<HTMLCanvasElement>("[data-brain-canvas]");
    const artwork = root?.querySelector<HTMLElement>("[data-artwork]");
    const reading = root?.querySelector<HTMLElement>("#story-reading");
    if (!root || !sequence || !canvas || !artwork || !reading || reduced === null || compact === null) return;
    const enterReading = () => setMode("static");
    reading.addEventListener("focus", enterReading);
    if (staticMode) {
      root.dataset.renderer = "static";
      setReady(false); setLoading(false); setFailed(false);
      setStatus("The complete story is available without motion.");
      return () => reading.removeEventListener("focus", enterReading);
    }
    const abort = new AbortController();
    let scene: Scene | undefined, raf = 0, alive = true, visible = true;
    let elapsed = 0, lastTime = 0, lastDraw = 0, yawOffset = 0, dirty = true;
    let progress = 0, offsetTop = 0, travel = 1, activeCaption = -1;
    let drag: { x: number; y: number; yaw: number; horizontal: boolean; id: number } | null = null;
    const captions = Array.from(root.querySelectorAll<HTMLElement>("[data-caption-index]"));
    const actions = root.querySelector<HTMLElement>("[data-scene-actions]");
    setLoading(true); setReady(false); setFailed(false);
    root.dataset.renderer = "loading";
    const deadline = window.setTimeout(() => {
      if (!alive || scene) return;
      root.dataset.renderer = "error"; setLoading(false); setReady(false); setFailed(true);
      setStatus("The illustration is taking longer to load. You can read the complete story below.");
      abort.abort();
    }, 20000);
    const calculate = () => {
      offsetTop = sequence.getBoundingClientRect().top + window.scrollY;
      travel = Math.max(1, sequence.offsetHeight - window.innerHeight);
      progress = Math.max(0, Math.min(1, (window.scrollY - offsetTop) / travel));
      dirty = true;
    };
    const resize = () => { const rect = canvas.getBoundingClientRect(); scene?.resize(rect.width, rect.height); calculate(); };
    const scroll = () => { progress = Math.max(0, Math.min(1, (window.scrollY - offsetTop) / travel)); dirty = true; };
    const theme = () => { scene?.setTheme(document.documentElement.classList.contains("dark")); dirty = true; };
    const observer = new ResizeObserver(resize);
    const themeObserver = new MutationObserver(theme);
    const visibility = new IntersectionObserver(entries => { visible = entries[0].isIntersecting; root.dataset.onStory = String(visible); dirty = true; if (visible) schedule(); });
    const frame = (now: number) => {
      raf = 0;
      if (!alive || !scene || document.hidden || !visible) { lastTime = 0; return; }
      const delta = lastTime ? Math.min((now - lastTime) / 1000, .05) : 0;
      lastTime = now;
      elapsed += delta;
      const mobile = window.innerWidth < 760;
      // Keep every source thread and particle. Only raster resolution/frame rate differ.
      if (dirty || now - lastDraw >= (mobile ? 1000 / 30 : 1000 / 60)) {
        const state = evaluateStory(progress);
        if (mobile) {
          const captionBottom = captions[state.captionIndex].getBoundingClientRect().bottom;
          const actionBottom = actions ? parseFloat(getComputedStyle(actions).bottom) : 0;
          const invitation = state.captionIndex === 0 || state.captionIndex === chapters.length - 1;
          const availableBottom = invitation ? window.innerHeight - actionBottom - 44 - 12 : window.innerHeight - 72;
          if (captionBottom > availableBottom + 2) { setMode("static"); return; }
        }
        scene.setPose(state.pose, yawOffset);
        scene.render(lastDraw ? Math.min((now - lastDraw) / 1000, .05) : 0, elapsed);
        if (activeCaption !== state.captionIndex) {
          captions.forEach((caption, i) => { caption.style.opacity = "0"; caption.dataset.active = String(i === state.captionIndex); });
          activeCaption = state.captionIndex;
          root.dataset.captionSide = chapters[activeCaption].side;
          if (actions) actions.hidden = activeCaption !== 0 && activeCaption !== chapters.length - 1;
        }
        const caption = captions[state.captionIndex];
        caption.style.opacity = String(state.opacity);
        caption.style.transform = `translate3d(${(1 - state.opacity) * (chapterDirection(state.captionIndex)) * 24}px,0,0)`;
        if (actions) { actions.style.opacity = String(state.opacity); actions.inert = state.opacity < .8; }
        window.__expertHubBrain = { progress, captionIndex: state.captionIndex, captionOpacity: state.opacity, pose: state.pose, yawOffset, metrics: scene.metrics(), status: "ready" };
        lastDraw = now; dirty = false;
      }
      schedule();
    };
    function schedule() { if (alive && scene && !raf && !document.hidden && visible) raf = requestAnimationFrame(frame); }
    const tabVisibility = () => { if (document.hidden) { cancelAnimationFrame(raf); raf = 0; lastTime = 0; } else { dirty = true; schedule(); } };
    const down = (event: PointerEvent) => { if (event.isPrimary) drag = { x: event.clientX, y: event.clientY, yaw: yawOffset, horizontal: false, id: event.pointerId }; };
    const move = (event: PointerEvent) => {
      if (!drag || event.pointerId !== drag.id) return;
      const x = event.clientX - drag.x, y = event.clientY - drag.y;
      if (!drag.horizontal && Math.abs(y) > 10 && Math.abs(y) > Math.abs(x)) { drag = null; return; }
      if (Math.abs(x) > 8 && Math.abs(x) > Math.abs(y)) { drag.horizontal = true; canvas.setPointerCapture(event.pointerId); }
      if (drag.horizontal) { yawOffset = drag.yaw - x * .006; dirty = true; }
    };
    const up = () => { drag = null; };
    const keys = (event: KeyboardEvent) => {
      if (event.key === "ArrowLeft" || event.key === "ArrowRight") { event.preventDefault(); yawOffset += event.key === "ArrowLeft" ? -.15 : .15; dirty = true; }
      if (event.key === "Home") { event.preventDefault(); yawOffset = 0; dirty = true; }
    };
    const contextLost = (event: Event) => { event.preventDefault(); if (alive && !abort.signal.aborted) { setFailed(true); setReady(false); setLoading(false); setStatus("The illustration is unavailable. You can read the complete story below."); root.dataset.renderer = "error"; abort.abort(); } };
    window.addEventListener("scroll", scroll, { passive: true });
    window.addEventListener("resize", resize);
    document.addEventListener("visibilitychange", tabVisibility);
    canvas.addEventListener("pointerdown", down); canvas.addEventListener("pointermove", move); canvas.addEventListener("pointerup", up); canvas.addEventListener("pointercancel", up);
    canvas.addEventListener("webglcontextlost", contextLost); artwork.addEventListener("keydown", keys);
    themeObserver.observe(document.documentElement, { attributes: true, attributeFilter: ["class"] });
    observer.observe(canvas); visibility.observe(canvas);
    (async () => {
      try {
        const { createBrainScene } = await import("./art/scene.js");
        if (!alive) return;
        scene = await createBrainScene({ canvas, signal: abort.signal, onStage: message => { if (alive) setStatus(message); } });
        if (!alive) { scene.dispose(); return; }
        root.dataset.renderer = "ready";
        resize(); theme();
        const state = evaluateStory(progress);
        scene.setPose(state.pose, yawOffset); scene.render(0, 0);
        clearTimeout(deadline);
        setLoading(false); setReady(true); setStatus("Illustration ready. Drag to rotate or scroll to follow the story.");
        schedule();
      } catch {
        clearTimeout(deadline);
        if (!alive || abort.signal.aborted) return;
        root.dataset.renderer = "error";
        setLoading(false); setReady(false); setFailed(true);
        setStatus("The illustration is unavailable. You can read the complete story below.");
      }
    })();
    return () => {
      alive = false; clearTimeout(deadline); abort.abort(); cancelAnimationFrame(raf); scene?.dispose();
      observer.disconnect(); themeObserver.disconnect(); visibility.disconnect();
      window.removeEventListener("scroll", scroll); window.removeEventListener("resize", resize); document.removeEventListener("visibilitychange", tabVisibility);
      canvas.removeEventListener("pointerdown", down); canvas.removeEventListener("pointermove", move); canvas.removeEventListener("pointerup", up); canvas.removeEventListener("pointercancel", up);
      canvas.removeEventListener("webglcontextlost", contextLost); artwork.removeEventListener("keydown", keys); reading.removeEventListener("focus", enterReading);
      root.dataset.renderer = "static"; delete window.__expertHubBrain;
    };
  }, [mode, reduced, compact, staticMode, attempt]);

  return <div className="motion-toolbar" hidden={compact === true}>
    <p role="status" className={loading || failed ? "loading-status" : "sr-only"}>{status}</p>
    <button type="button" aria-pressed={staticMode} onClick={() => { if (failed) setAttempt(value => value + 1); setMode(staticMode || failed ? "animated" : "static"); if (ready) window.scrollTo({ top: 0, behavior: "instant" }); }}>{staticMode || failed ? "View animation" : "Read without motion"}</button>
  </div>;
}
function chapterDirection(index: number) { return chapters[index].side === "right" ? -1 : 1; }
