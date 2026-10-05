import { artworkAssets } from './live3d-config.js';
import { authoredFrame } from './live3d-timeline.js';

// App owns scroll, eligibility, source links, theme and fallback. Artwork owns WebGL.
export function mountLiveArtwork(root, requestUpdate) {
    const viewport = root.querySelector('#live-art');
    const canvas = root.querySelector('#live-artwork');
    if (!viewport || !canvas) return null;
    const lifetime = new AbortController();
    let controller, load, timeout, generation = 0, disposed = false, eligible = false, failed = false, state, rectKey = '';
    root.dataset.artwork = 'raster';
    function diagnostics(values) { Object.assign(canvas.dataset, Object.fromEntries(Object.entries(values).map(([key,value]) => [key, typeof value === 'object' ? JSON.stringify(value) : String(value)]))); }
    function position() {
        if (!state) return;
        const chapter = root.querySelector(`#${state.chapter.id}`), title = chapter?.querySelector('.title-lane')?.getBoundingClientRect(), body = chapter?.querySelector('.body-lane')?.getBoundingClientRect();
        const header = root.querySelector('.site-nav')?.getBoundingClientRect();
        let x, y, width, height;
        if (state.portrait) {
            x = 8; y = Math.max(header?.bottom ?? 0,title?.bottom ?? 0)+12;
            width = innerWidth-16; height = Math.max(1,(body?.top ?? innerHeight*.78)-12-y);
        } else {
            x = (title?.right ?? innerWidth*.28)+20; y = (header?.bottom ?? 88)+24;
            width = Math.max(1,(body?.left ?? innerWidth*.73)-20-x); height = Math.max(1,innerHeight-y-32);
        }
        const next = [x,y,width,height].map(n=>Math.round(n)).join(',');
        if (next !== rectKey) {
            rectKey = next;
            Object.assign(viewport.style,{ left:`${x}px`,top:`${y}px`,width:`${width}px`,height:`${height}px` });
            controller?.resize();
        }
        diagnostics({ viewport: [x,y,width,height] });
    }
    function activate() {
        if (!controller || !eligible || !state?.visible || disposed || root.dataset.artwork === 'live') return;
        // Do not expose the boot pose under a later chapter after a slow load.
        if (!(Number(canvas.dataset.frames)>0) || Math.abs(Number(canvas.dataset.frame)-authoredFrame(state.phase,state.chapter))>.00001 || canvas.dataset.dark!==String(dark())) return;
        root.dataset.artwork = 'live'; diagnostics({ state:'live' });
        root.querySelector('#runtime-status').textContent = 'Scroll to follow the story. Choose Reduce motion for a static version. Live artwork is a prototype.';
        requestUpdate();
    }
    function dark() { return document.documentElement.classList.contains('dark'); }
    function release() {
        generation++; clearTimeout(timeout); load?.abort(); load = null;
        controller?.dispose(); controller = null;
        root.dataset.artwork = 'raster'; viewport.hidden = true;
        diagnostics({ state: 'raster' });
    }
    function fail(error) {
        failed = true; release(); diagnostics({ state: 'fallback', error: error.message }); requestUpdate();
    }
    async function start() {
        if (disposed || failed || !eligible || !state || load || controller) return;
        const mine = ++generation, abort = load = new AbortController();
        viewport.hidden = false; root.dataset.artwork = 'loading'; diagnostics({ state:'loading',version:artworkAssets.version }); position();
        timeout = setTimeout(()=> { if (mine === generation) fail(new Error('artwork-readiness-timeout')); },15000);
        try {
            const { createArtwork } = await import('./artwork.js');
            if (disposed || mine !== generation || abort.signal.aborted) return;
            const artwork = await createArtwork({ canvas,viewport,assets:artworkAssets,signal:abort.signal,frame:authoredFrame(state.phase,state.chapter),portrait:state.portrait,dark:dark(),onMetrics:values=>{ if(mine===generation && !disposed) {diagnostics(values);activate();} },onError:fail });
            if (disposed || mine !== generation || abort.signal.aborted || !eligible) { artwork.dispose(); return; }
            controller = artwork; clearTimeout(timeout);
            controller.setFrame(authoredFrame(state.phase,state.chapter),state.portrait); controller.setTheme(dark()?'dark':'light'); controller.setVisible(state.visible && !document.hidden);
            activate(); requestUpdate();
        } catch (error) { if (mine === generation && !disposed && !abort.signal.aborted) fail(error); }
    }
    function eligibility(next) {
        if (eligible === next) return;
        eligible = next;
        if (!next) { failed = false; release(); } else start();
    }
    function update(next) {
        state = next; position(); eligibility(next.cinematic);
        if (!controller) { start(); return false; }
        controller.setFrame(authoredFrame(next.phase,next.chapter),next.portrait);
        controller.setVisible(next.visible && !document.hidden);
        return root.dataset.artwork === 'live';
    }
    // Local QA calls an explicit measurement; normal rendering never scans vertices.
    if (location.hostname === '127.0.0.1' && new URLSearchParams(location.search).has('artwork-test')) {
        canvas.addEventListener('inspect-artwork', event => { event.detail.result = controller?.inspectFraming(); }, { signal:lifetime.signal });
    }
    const themeObserver = new MutationObserver(()=>controller?.setTheme(dark()?'dark':'light'));
    themeObserver.observe(document.documentElement,{ attributes:true,attributeFilter:['class'] });
    document.addEventListener('visibilitychange',()=>controller?.setVisible(Boolean(state?.visible) && !document.hidden),{signal:lifetime.signal});
    canvas.addEventListener('webglcontextrestored',()=> { failed = false; start(); },{signal:lifetime.signal});
    window.addEventListener('pagehide',release,{signal:lifetime.signal});
    window.addEventListener('pageshow',()=> { if (eligible) start(); },{signal:lifetime.signal});
    return { update, setMode:eligibility, dispose() { disposed = true; release(); themeObserver.disconnect(); lifetime.abort(); } };
}
