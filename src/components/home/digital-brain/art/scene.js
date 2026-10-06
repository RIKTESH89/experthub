// Scene assembly reuses Sahil K's Digital Brain (MIT), with explicit ownership.
// One Versal Brain Areas model; no second brain geometry. See public credits.
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { DRACOLoader } from 'three/examples/jsm/loaders/DRACOLoader.js';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { BokehPass } from 'three/examples/jsm/postprocessing/BokehPass.js';
import { ShaderPass } from 'three/examples/jsm/postprocessing/ShaderPass.js';
import { OutputPass } from 'three/examples/jsm/postprocessing/OutputPass.js';
import Brain from './brain.js';
import SkyDome from './sky.js';
import { SparkleParticleSystem } from './sparkles.js';
import { VignettePass } from './vignette.js';

const palettes = {
  light: { background: '#222723', brain: '#244b3d', rim: '#b4c8b9', electric: '#7c9d85', thread: '#b99a62', brass: '#b99254', ivory: '#f2eddf', sky: '#314537' },
  dark: { background: '#141b17', brain: '#204536', rim: '#adc8b8', electric: '#659678', thread: '#b69860', brass: '#c29e5e', ivory: '#f2eddf', sky: '#223b2d' },
};
// A canvas can retain a deliberately lost context between reading/animation modes.
// Keep only a weak recovery handle; removed canvases remain collectible.
const recovery = new WeakMap();

function originalSprite() {
  // Original radial light sprite replaces the upstream uncredited JPEG.
  const side = 64, pixels = new Uint8Array(side * side * 4);
  for (let y = 0; y < side; y++) for (let x = 0; x < side; x++) {
    const radius = Math.hypot((x + .5) / side - .5, (y + .5) / side - .5) * 2;
    const intensity = Math.round(255 * Math.pow(Math.max(0, 1 - radius), 3));
    const offset = (y * side + x) * 4;
    pixels[offset] = pixels[offset + 1] = pixels[offset + 2] = intensity;
    pixels[offset + 3] = 255;
  }
  const texture = new THREE.DataTexture(pixels, side, side);
  texture.magFilter = THREE.LinearFilter;
  texture.minFilter = THREE.LinearFilter;
  texture.needsUpdate = true;
  return texture;
}

/** @param {{canvas:HTMLCanvasElement,signal:AbortSignal,onStage:(stage:string)=>void}} options */
export async function createBrainScene({ canvas, signal, onStage }) {
  let renderer, composer, brain, sky, sparkles, sprite, bokeh, renderPass, vignette, output, contextGL;
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(35, 1, .01, 100);
  const decoder = new DRACOLoader();
  let disposed = false;
  const mobile = matchMedia('(max-width: 760px)').matches;
  const rasterRatio = (width, height) => Math.min(window.devicePixelRatio || 1, width < 760 ? 1.35 : 1.65, Math.sqrt(2500000 / (width * height)));
  let pixelRatio = rasterRatio(window.innerWidth, window.innerHeight);
  const time = { delta: 0, elapsedTime: 0 };
  let lastWidth = 1, lastHeight = 1, lastTheme = '', drawCount = 0;
  const dispose = () => {
    if (disposed) return;
    disposed = true;
    signal.removeEventListener('abort', dispose);
    brain?.dispose(); sky?.dispose(); sparkles?.dispose(); sprite?.dispose();
    renderPass?.dispose(); bokeh?.dispose(); vignette?.dispose(); output?.dispose();
    composer?.dispose(); decoder.dispose();
    renderer?.dispose();
    if (contextGL && !contextGL.isContextLost()) {
      // Context loss is delivered asynchronously, after the runtime has detached.
      // Prevent its default here so an explicitly requested retry can restore it.
      const allowRestore = event => { event.preventDefault(); canvas.removeEventListener('webglcontextlost', allowRestore); };
      canvas.addEventListener('webglcontextlost', allowRestore, { once: true });
      if (renderer) renderer.forceContextLoss(); else recovery.get(canvas)?.loseContext();
    }
  };
  signal.addEventListener('abort', dispose, { once: true });
  try {
    signal.throwIfAborted();
    onStage('Preparing the illustration');
    contextGL = canvas.getContext('webgl2', { antialias: true, alpha: false, depth: true, stencil: false, powerPreference: 'high-performance' });
    if (!contextGL) throw new Error('Illustration context unavailable');
    if (contextGL.isContextLost()) {
      const extension = recovery.get(canvas);
      if (!extension) throw new Error('Illustration context cannot be restored');
      await new Promise((resolve, reject) => {
        const cleanup = () => { canvas.removeEventListener('webglcontextrestored', restored); signal.removeEventListener('abort', cancelled); };
        const restored = () => { cleanup(); resolve(); };
        const cancelled = () => { cleanup(); reject(signal.reason); };
        canvas.addEventListener('webglcontextrestored', restored, { once: true });
        signal.addEventListener('abort', cancelled, { once: true });
        try { extension.restoreContext(); } catch (error) { cleanup(); reject(error); }
      });
      signal.throwIfAborted();
    }
    recovery.set(canvas, contextGL.getExtension('WEBGL_lose_context'));
    renderer = new THREE.WebGLRenderer({ canvas, context: contextGL, antialias: true, alpha: false, powerPreference: 'high-performance' });
    renderer.setPixelRatio(pixelRatio);
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1;
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.info.autoReset = false;
    decoder.setDecoderPath('/uploads/digital-brain-foundation/draco/');
    decoder.setDecoderConfig({ type: 'wasm' });
    decoder.setWorkerLimit(1);
    onStage('Loading the illustration');
    const response = await fetch('/uploads/digital-brain-foundation/brain-areas.glb', { signal });
    if (!response.ok) throw new Error('Illustration asset unavailable');
    const bytes = await response.arrayBuffer();
    signal.throwIfAborted();
    const loader = new GLTFLoader().setDRACOLoader(decoder);
    const model = await loader.parseAsync(bytes, '/uploads/digital-brain-foundation/');
    if (signal.aborted) {
      model.scene.traverse(object => {
        if (!object.isMesh) return;
        object.geometry.dispose();
        const materials = Array.isArray(object.material) ? object.material : [object.material];
        materials.forEach(material => { Object.values(material).forEach(value => { if (value?.isTexture) { value.source?.data?.close?.(); value.dispose(); } }); material.dispose(); });
      });
      signal.throwIfAborted();
    }
    sprite = originalSprite();
    const context = { scene, canvas, signal, time, pixelRatio, camera: { cameraInstance: camera }, resources: { items: { brainModel: model, particlesTexture: sprite } } };
    brain = new Brain(context);
    onStage('Preparing the shared knowledge illustration');
    await brain.initialize();
    signal.throwIfAborted();
    sparkles = new SparkleParticleSystem(context);
    sky = new SkyDome(context);
    composer = new EffectComposer(renderer);
    composer.setPixelRatio(pixelRatio);
    renderPass = new RenderPass(scene, camera);
    composer.addPass(renderPass);
    bokeh = new BokehPass(scene, camera, { focus: 2.2, aperture: .003, maxblur: mobile ? .004 : .007 });
    // Preserve the source's particle exclusion during the depth-only pass.
    const originalRender = bokeh.render.bind(bokeh);
    bokeh.render = (...args) => {
      const points = [];
      scene.traverse(object => { if (object.isPoints) { points.push([object, object.visible]); object.visible = false; } });
      try { originalRender(...args); } finally { points.forEach(([object, visible]) => { object.visible = visible; }); }
    };
    composer.addPass(bokeh);
    vignette = new ShaderPass(VignettePass);
    vignette.uniforms.offset.value = .5;
    vignette.uniforms.darkness.value = 2.7;
    composer.addPass(vignette);
    output = new OutputPass();
    composer.addPass(output);

    function resize(width, height) {
      if (disposed) return;
      lastWidth = Math.max(1, width); lastHeight = Math.max(1, height);
      const nextRatio = rasterRatio(lastWidth, lastHeight);
      if (Math.abs(nextRatio - pixelRatio) > .005) {
        pixelRatio = nextRatio; context.pixelRatio = pixelRatio;
        renderer.setPixelRatio(pixelRatio); composer.setPixelRatio(pixelRatio);
        brain.grooveParticlesMaterial.uniforms.uPixelRatio.value = pixelRatio;
        brain.neuralThreads.threadParticles.particlesMaterial.uniforms.uPixelRatio.value = pixelRatio;
        sparkles.material.uniforms.uPixelRatio.value = pixelRatio;
      }
      bokeh.uniforms.maxblur.value = lastWidth < 760 ? .004 : .007;
      renderer.setSize(lastWidth, lastHeight, false);
      composer.setSize(lastWidth, lastHeight);
      camera.aspect = lastWidth / lastHeight;
      camera.updateProjectionMatrix();
    }
    function setTheme(dark) {
      const theme = dark ? 'dark' : 'light';
      if (lastTheme === theme || disposed) return;
      lastTheme = theme;
      const palette = palettes[theme];
      scene.background = new THREE.Color(palette.background);
      brain.setPalette(palette); sparkles.setPalette(palette);
      sky.setTint(palette.sky); sky.setOpacity(dark ? .38 : .28);
      vignette.uniforms.color.value.set(palette.background);
    }
    function setPose(pose, yawOffset = 0) {
      if (disposed) return;
      const portrait = lastWidth < 760;
      let distance = pose.distance * Math.max(1, (1 / camera.aspect) * .95);
      const yaw = pose.yaw + yawOffset;
      camera.position.set(Math.sin(yaw) * Math.cos(pose.pitch) * distance, Math.sin(pose.pitch) * distance, Math.cos(yaw) * Math.cos(pose.pitch) * distance);
      camera.lookAt(0, -.015, 0);
      const screenX = portrait ? .5 : pose.screenX;
      const screenY = portrait ? (lastHeight < 740 ? .33 : .34) : .49;
      camera.setViewOffset(lastWidth, lastHeight, -lastWidth * (screenX - .5), lastHeight * (.5 - screenY), lastWidth, lastHeight);
      camera.updateMatrixWorld();
      if (portrait) {
        // Check the actual brain silhouette samples for each orbit angle.
        // A single aspect multiplier clips its deeper profile on narrow phones.
        const projected = new THREE.Vector3();
        let widthExtent = 0;
        for (const point of framingPoints) widthExtent = Math.max(widthExtent, Math.abs(projected.copy(point).project(camera).x));
        if (widthExtent > .86) {
          distance *= widthExtent / .86 * 1.025;
          camera.position.set(Math.sin(yaw) * Math.cos(pose.pitch) * distance, Math.sin(pose.pitch) * distance, Math.cos(yaw) * Math.cos(pose.pitch) * distance);
          camera.lookAt(0, -.015, 0); camera.updateMatrixWorld();
        }
      }
      bokeh.uniforms.focus.value = distance;
    }
    function render(delta, elapsed, animate = true) {
      if (disposed) return;
      time.delta = Math.min(delta, .05); time.elapsedTime = elapsed;
      if (animate) { brain.update(); sparkles.update(elapsed * .5); sky.update(elapsed); }
      renderer.info.reset();
      composer.render(delta);
      if (drawCount === 0 && renderer.info.programs.some(program => program.diagnostics?.runnable === false)) throw new Error('Illustration shader unavailable');
      drawCount++;
    }
    const bounds = new THREE.Box3().setFromObject(model.scene).getSize(new THREE.Vector3());
    const framingPoints = [];
    const positions = brain.brainMesh.geometry.getAttribute('position');
    brain.brainMesh.updateMatrixWorld(true);
    for (let i = 0, stride = Math.max(1, Math.floor(positions.count / 1024)); i < positions.count; i += stride) {
      framingPoints.push(new THREE.Vector3().fromBufferAttribute(positions, i).applyMatrix4(brain.brainMesh.matrixWorld));
    }
    let modelCount = 0;
    model.scene.traverse(object => { if (object.isMesh) modelCount++; });
    return { resize, setTheme, setPose, render, dispose, metrics: () => ({ drawCount, modelCount, grooveParticles: brain.grooveParticlesCount, neuralThreads: brain.neuralThreads.threads.length, sparkleParticles: sparkles.params.count, pixelRatio, bounds: bounds.toArray(), triangles: renderer.info.render.triangles, calls: renderer.info.render.calls }) };
  } catch (error) {
    dispose();
    throw error;
  }
}
