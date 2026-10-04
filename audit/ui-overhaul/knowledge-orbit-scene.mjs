// Prepared original source. Not imported by the application until dependencies
// are approved. No remote models, textures, fonts, shaders or executable assets.
import {
  Scene, Group, OrthographicCamera, WebGLRenderer, Mesh, BoxGeometry,
  SphereGeometry, MeshBasicMaterial,
} from "three";

export function createEvidenceScene(canvas, { palette, mobile = false, onFailure }) {
  const scene = new Scene();
  const sculpture = new Group();
  scene.add(sculpture);
  const camera = new OrthographicCamera(-2, 2, 1.25, -1.25, 0.1, 20);
  camera.position.z = 8;
  const renderer = new WebGLRenderer({ canvas, alpha: true, antialias: !mobile, powerPreference: "low-power" });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, mobile ? 1 : 1.5));
  renderer.setClearColor(0, 0);
  const resources = [];
  const material = (color) => {
    const value = new MeshBasicMaterial({ color });
    resources.push(value);
    return value;
  };
  const coreMaterial = material(palette.primary);
  const paperMaterial = material("#f4f0e6");
  const edgeMaterial = material(palette.border);
  const coreGeometry = new SphereGeometry(0.34, mobile ? 12 : 24, mobile ? 8 : 16);
  const sheetGeometry = new BoxGeometry(0.53, 0.66, 0.045);
  const lineGeometry = new BoxGeometry(0.32, 0.018, 0.01);
  resources.push(coreGeometry, sheetGeometry, lineGeometry);
  const core = new Mesh(coreGeometry, coreMaterial);
  sculpture.add(core);
  const sheets = Array.from({ length: mobile ? 3 : 4 }, (_, index) => {
    const sheet = new Group();
    sheet.add(new Mesh(sheetGeometry, paperMaterial));
    // Two source-line marks, not generated text or a fabricated citation.
    const first = new Mesh(lineGeometry, edgeMaterial);
    first.position.set(0, 0.12, 0.03);
    sheet.add(first);
    if (!mobile) {
      const second = new Mesh(lineGeometry, edgeMaterial);
      second.position.set(0, 0.04, 0.03);
      second.scale.x = 0.68;
      sheet.add(second);
    }
    sculpture.add(sheet);
    return { node: sheet, angle: index * Math.PI * 2 / (mobile ? 3 : 4) };
  });

  let disposed = false;
  let active = false;
  let elapsed = 0;
  let lastTime = 0;
  let frame = 0;
  let lastPaint = 0;
  let scrollProgress = 0;
  let slowFrames = 0;
  let pointerX = 0;
  let pointerY = 0;

  function position() {
    // The opening orbit gently becomes an ordered stack; scroll can accelerate
    // this settling but never captures or modifies the browser's scrolling.
    const progress = Math.max(Math.min(elapsed / 5, 1), scrollProgress);
    const settle = progress * progress * (3 - 2 * progress);
    sculpture.rotation.x = pointerY * 0.08;
    sculpture.rotation.y = pointerX * 0.08;
    sheets.forEach(({ node, angle }, index) => {
      const phase = angle + elapsed * 0.18 * (1 - settle);
      const orbitX = Math.cos(phase) * 1.16;
      const orbitY = Math.sin(phase) * 0.57;
      node.position.set(
        orbitX * (1 - settle) + (0.63 + index * 0.035) * settle,
        orbitY * (1 - settle) + (0.17 - index * 0.065) * settle,
        Math.sin(phase) * 0.35 * (1 - settle) - index * 0.065 * settle,
      );
      node.rotation.y = Math.cos(phase) * 0.22 * (1 - settle);
      node.rotation.z = Math.sin(phase) * 0.16 * (1 - settle) - 0.05 * settle;
    });
    core.position.x = -0.36 * settle;
    renderer.render(scene, camera);
  }

  function fail() {
    active = false;
    cancelAnimationFrame(frame);
    onFailure?.();
  }

  function tick(now) {
    if (disposed || !active) return;
    if (!lastTime) lastTime = now;
    const delta = now - lastTime;
    lastTime = now;
    elapsed = Math.min(5, elapsed + Math.min(delta, 100) / 1000);
    // Monitor scheduling health as a conservative fallback, not a GPU benchmark.
    slowFrames = delta > 80 ? slowFrames + 1 : 0;
    if (slowFrames > 10) elapsed = 5;
    if (now - lastPaint >= 1000 / 30 || elapsed >= 5) {
      try { position(); } catch { fail(); return; }
      lastPaint = now;
    }
    if (elapsed < 5) frame = requestAnimationFrame(tick);
    else active = false;
  }

  const contextLost = (event) => { event.preventDefault(); fail(); };
  canvas.addEventListener("webglcontextlost", contextLost);

  return {
    setPalette(next) {
      coreMaterial.color.set(next.primary);
      edgeMaterial.color.set(next.border);
      if (!disposed) position();
    },
    setPointer(x, y) {
      pointerX = Math.max(-1, Math.min(1, x));
      pointerY = Math.max(-1, Math.min(1, y));
      // Pointer depth stops when the five-second sequence finishes.
      if (active && !disposed) position();
    },
    setScrollProgress(progress) {
      scrollProgress = Math.max(0, Math.min(1, progress));
      if (active && !disposed) position();
    },
    setActive(next) {
      if (disposed) return;
      cancelAnimationFrame(frame);
      active = next && elapsed < 5;
      lastTime = 0;
      if (active) frame = requestAnimationFrame(tick);
    },
    replay() {
      if (disposed) return;
      elapsed = 0;
      scrollProgress = 0;
      slowFrames = 0;
      this.setActive(true);
    },
    resize(width, height) {
      if (disposed || width <= 0 || height <= 0) return;
      camera.left = -1.25 * width / height;
      camera.right = 1.25 * width / height;
      camera.updateProjectionMatrix();
      renderer.setSize(width, height, false);
      position();
    },
    getMetrics() { return { drawCalls: renderer.info.render.calls, triangles: renderer.info.render.triangles }; },
    dispose() {
      if (disposed) return;
      disposed = true;
      active = false;
      cancelAnimationFrame(frame);
      canvas.removeEventListener("webglcontextlost", contextLost);
      resources.forEach((resource) => resource.dispose());
      renderer.dispose();
      renderer.forceContextLoss();
    },
  };
}
