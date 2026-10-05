// App-owned WebGL lifecycle around the immutable renderer-r2 camera/studio handoff.
import * as T from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { createCameraDirector, createStudioRig } from './cinematic-runtime-r2.js';
import { MeshoptDecoder } from 'three/addons/libs/meshopt_decoder.module.js';

function releaseScene(scene) {
    scene?.userData?.environmentTarget?.dispose();
    const geometries = new Set(), materials = new Set(), textures = new Set();
    scene?.traverse(node => {
        if (node.isLight) node.dispose?.();
        if (node.geometry) geometries.add(node.geometry);
        for (const material of Array.isArray(node.material) ? node.material : [node.material]) if (material) {
            materials.add(material);
            for (const value of Object.values(material)) if (value?.isTexture) textures.add(value);
        }
    });
    geometries.forEach(g => g.dispose());
    textures.forEach(t => { t.source?.data?.close?.(); t.dispose(); });
    materials.forEach(m => m.dispose());
}
export async function createArtwork({ canvas, viewport, assets, signal, onMetrics, onError, frame = 0, portrait = false, dark = false }) {
    let scene, renderer, mixer, actions = [], contract, framing, cameras;
    let disposed = false, ticket = 0, visible = true, dirty = true, currentFrame = frame, currentPortrait = portrait, currentDark = dark;
    let last = 0, compiled = false;
    const metrics = { version: assets.version, frames: 0, loadMs: 0, parseMs: 0, compileMs: 0, drawMs: 0, firstFrameMs: 0, assetBytes: 0, revision: T.REVISION };
    const started = performance.now();
    const camera = new T.PerspectiveCamera(35, 1, .15, 120);
    let director, studio;
    function dispose() {
        if (disposed) return;
        disposed = true; cancelAnimationFrame(ticket); ticket = 0;
        signal.removeEventListener('abort', dispose);
        canvas.removeEventListener('webglcontextlost', contextLost);
        mixer?.stopAllAction(); if (mixer) mixer.uncacheRoot(mixer.getRoot());
        studio?.dispose(); releaseScene(scene); renderer?.dispose();
    }
    function ensureAlive() { if (disposed || signal.aborted) throw new DOMException('Artwork aborted', 'AbortError'); }
    function contextLost(event) { event.preventDefault(); dispose(); onError?.(new Error('webgl-context-lost')); }
    signal.addEventListener('abort', dispose, { once: true });
    canvas.addEventListener('webglcontextlost', contextLost);
    async function read(url, json = false) {
        const resolved = new URL(url, location.origin);
        if (resolved.origin !== location.origin) throw Error('Artwork must use same-origin assets');
        const response = await fetch(resolved, { signal });
        if (!response.ok) throw Error(`Artwork asset ${response.status}`);
        if (json) return response.json();
        if (Number(response.headers.get('content-length')) > assets.maxSceneBytes) throw Error('Artwork exceeds byte budget');
        const data = await response.arrayBuffer();
        if (data.byteLength > assets.maxSceneBytes) throw Error('Artwork exceeds byte budget');
        return data;
    }
    function pose() {
        actions.forEach(action => { action.paused = false; action.enabled = true; });
        mixer.setTime(currentFrame/24);
        const variant = currentPortrait ? 'portrait' : 'desktop';
        const sourceCamera = cameras[currentPortrait ? 1 : 0];
        const track = contract.tracks[variant][Math.min(191,Math.round(currentFrame))];
        metrics.framing = director.apply({ camera,sourceCamera,frame:currentFrame,aspect:camera.aspect,variant,track });
        studio.setTheme(currentDark);
    }
    function draw(now) {
        ticket = 0;
        if (disposed || !visible || document.hidden || !dirty) return;
        pose(); const start = performance.now(); renderer.render(scene,camera);
        metrics.drawMs = performance.now()-start; metrics.frames++;
        metrics.frame = currentFrame; metrics.dark = currentDark; metrics.intervalMs = last ? now-last : 0; last = now;
        metrics.drawCalls = renderer.info.render.calls; metrics.triangles = renderer.info.render.triangles;
        metrics.geometries = renderer.info.memory.geometries; metrics.textures = renderer.info.memory.textures;
        metrics.buffer = [canvas.width,canvas.height]; metrics.dpr = renderer.getPixelRatio();
        if (!metrics.firstFrameMs) metrics.firstFrameMs = performance.now()-started;
        dirty = false; onMetrics?.({ ...metrics });
    }
    function request() { if (!ticket && visible && !disposed && !document.hidden && renderer && compiled) ticket = requestAnimationFrame(draw); }
    function resize() {
        if (disposed || !renderer) return;
        const width = Math.max(1,viewport.clientWidth), height = Math.max(1,viewport.clientHeight);
        camera.aspect = width/height; camera.updateProjectionMatrix();
        const ratio = Math.min(devicePixelRatio || 1,currentPortrait ? 1 : 1.5,Math.sqrt(1600000/(width*height)));
        renderer.setPixelRatio(ratio); renderer.setSize(width,height,false); dirty = true; request();
    }
    try {
        const start = performance.now();
        const [data, metadata, bounds] = await Promise.all([read(assets.scene), read(assets.camera,true), read(assets.framing,true)]);
        metrics.loadMs = performance.now()-start; metrics.assetBytes = data.byteLength; ensureAlive();
        contract = metadata; framing = bounds;
        if (!contract.tracks?.desktop?.length || !contract.tracks?.portrait?.length || !framing.samples?.length) throw Error('Artwork metadata unavailable');
        const digest = [...new Uint8Array(await crypto.subtle.digest('SHA-256',data))].map(n=>n.toString(16).padStart(2,'0')).join('');
        if (digest !== assets.sha256) throw Error('Artwork asset hash mismatch');
        ensureAlive(); director = createCameraDirector(T,framing); metrics.assetSha256 = digest;
        const parseStart = performance.now();
        const gltf = await new GLTFLoader().setMeshoptDecoder(MeshoptDecoder).parseAsync(data,new URL(assets.scene,location.origin).href);
        metrics.parseMs = performance.now()-parseStart;
        if (disposed || signal.aborted) { releaseScene(gltf.scene); ensureAlive(); }
        const names = ['Brain_Root','Sources_Root','Twin_Root','Camera_Hero','Camera_Portrait'];
        if (names.some(name => !gltf.scene.getObjectByName(name)) || gltf.cameras.length < 2 || !gltf.animations.length) { releaseScene(gltf.scene); throw Error('Artwork hierarchy/camera/clip contract unavailable'); }
        scene = new T.Scene(); scene.add(gltf.scene); cameras = ['Camera_Hero','Camera_Portrait'].map(name=>gltf.scene.getObjectByName(name));
        mixer = new T.AnimationMixer(gltf.scene);
        actions = gltf.animations.map(clip => { const action = mixer.clipAction(clip); action.setLoop(T.LoopOnce,1); action.clampWhenFinished = true; action.play(); return action; });
        renderer = new T.WebGLRenderer({canvas,alpha:true,antialias:true,powerPreference:'low-power'});
        renderer.setClearColor(0x000000,0); renderer.shadowMap.enabled = true; renderer.shadowMap.type = T.VSMShadowMap;
        const room = new RoomEnvironment(), pmrem = new T.PMREMGenerator(renderer);
        const environmentTarget = pmrem.fromScene(room,.04); room.dispose(); pmrem.dispose();
        scene.environment = environmentTarget.texture; scene.environmentIntensity = .38; scene.userData.environmentTarget = environmentTarget;
        scene.traverse(node => {
            if (!node.isMesh) return;
            const name = node.material?.name || ''; let ancestor = node, copy = false;
            while (ancestor) { if (/^Source0[1-4]_Copy|Traveling|Repeated original|Persistent source/.test(ancestor.name)) copy = true; ancestor = ancestor.parent; }
            if (name === 'Quiet dark studio desk') node.visible = false;
            node.castShadow = !/desk|ink|bronze/i.test(name); node.receiveShadow = !copy && !/selected|ink|bronze|folio/i.test(name);
        });
        renderer.outputColorSpace = T.SRGBColorSpace; renderer.toneMapping = T.ACESFilmicToneMapping;
        studio = createStudioRig(T,{ scene,renderer });
        resize(); pose(); const compileStart = performance.now();
        await renderer.compileAsync(scene,camera); metrics.compileMs = performance.now()-compileStart; ensureAlive();
        compiled = true; cancelAnimationFrame(ticket); ticket = 0; draw(performance.now());
        return {
            setFrame(value, isPortrait = currentPortrait) {
                value = Math.max(0,Math.min(191,value));
                if (value !== currentFrame || isPortrait !== currentPortrait) { currentFrame = value; currentPortrait = isPortrait; dirty = true; request(); }
            },
            setTheme(theme) { const next = theme === 'dark'; if (next !== currentDark) { currentDark = next; dirty = true; request(); } },
            setVisible(value) { if (visible === value) return; visible = value; if (!visible) { cancelAnimationFrame(ticket); ticket = 0; last = 0; } else { dirty = true; request(); } },
            inspectFraming() {
                scene.updateMatrixWorld(true); camera.updateMatrixWorld(true);
                const point = new T.Vector3(), extent = {min:[Infinity,Infinity],max:[-Infinity,-Infinity],count:0,outside:0};
                const weights=metrics.framing.weights,focus=weights.brain>0 ? 'Brain_Root' : weights.twin>0 ? 'Twin_Root' : null;
                scene.traverse(node => {
                    if (!node.isMesh || node.userData.runtimeGround) return;
                    let ancestor=node,member=!focus; while(ancestor) { if (!ancestor.visible) return; if(ancestor.name===focus || (focus==='Twin_Root' && ancestor.name==='Studio_Authored_Details'))member=true; ancestor=ancestor.parent; }
                    if(!member)return;
                    for(let i=0;i<node.geometry.attributes.position.count;i++) {
                        node.getVertexPosition(i,point); point.applyMatrix4(node.matrixWorld);
                        if(point.y < -1.105)continue;
                        point.project(camera); extent.count++;
                        extent.min[0]=Math.min(extent.min[0],point.x);extent.min[1]=Math.min(extent.min[1],point.y);
                        extent.max[0]=Math.max(extent.max[0],point.x);extent.max[1]=Math.max(extent.max[1],point.y);
                        if(Math.abs(point.x)>1 || Math.abs(point.y)>1 || point.z < -1 || point.z > 1)extent.outside++;
                    }
                }); return extent;
            },
            resize, dispose,
        };
    } catch (error) { dispose(); throw error; }
}
