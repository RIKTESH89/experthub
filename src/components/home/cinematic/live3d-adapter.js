import { artworkAssets } from './live3d-config.js';
import { authoredFrame } from './live3d-timeline.js';

// App owns scroll, eligibility, source links, theme and fallback. Artwork owns WebGL.
export function mountLiveArtwork(root, requestUpdate) {
    const viewport = root.querySelector('#live-art');
    const canvas = root.querySelector('#live-artwork');
    if (!viewport || !canvas) return null;
    const lifetime = new AbortController();
    const loadingPoster=document.createElement('img');loadingPoster.alt='';loadingPoster.id='b-loading-poster';loadingPoster.hidden=true;viewport.append(loadingPoster);
    let posterGeneration=0,posterURL='';
    function preparePoster(){
        if(!state||!composition||root.dataset.artwork!=='loading')return;
        const f=authoredFrame(state.phase,state.chapter),phase=f<24?'hero':f<96?'overview':f<143?'reading':'formation';
        const sourceWidth=state.portrait?360:1470,sourceHeight=state.portrait?640:801;
        const reference=state.portrait?[0,164,360,416]:[411.6,40,1058.4,711];
        const ratio=composition.width/reference[2];
        Object.assign(loadingPoster.style,{width:`${sourceWidth*ratio}px`,height:`${sourceHeight*ratio}px`,left:`${composition.x+composition.width/2-(reference[0]+reference[2]/2)*ratio}px`,top:`${composition.y+composition.height/2-(reference[1]+reference[3]/2)*ratio}px`});
        const url=`/uploads/live3d/b-r1/fallback-${state.portrait?'portrait':'desktop'}-${phase}-${dark()?'dark':'light'}.png`;
        if(url===posterURL)return;posterURL=url;loadingPoster.hidden=true;delete root.dataset.bPoster;const mine=++posterGeneration;loadingPoster.src=url;
        (loadingPoster.decode ? loadingPoster.decode() : new Promise((resolve,reject)=>{loadingPoster.onload=resolve;loadingPoster.onerror=reject;})).then(()=>{if(!disposed&&mine===posterGeneration&&root.dataset.artwork==='loading'){loadingPoster.hidden=false;root.dataset.bPoster='ready';}},()=>{});
    }
    let controller, load, timeout, generation = 0, disposed = false, eligible = false, failed = false, state, composition, rectKey = '', physicalKey = '';
    root.dataset.artwork = 'raster';
    function diagnostics(values) { Object.assign(canvas.dataset, Object.fromEntries(Object.entries(values).map(([key,value]) => [key, typeof value === 'object' ? JSON.stringify(value) : String(value)]))); }
    function position() {
        if (!state) return;
        const chapter = root.querySelector(`#${state.chapter.id}`), title = chapter?.querySelector('.title-lane')?.getBoundingClientRect(), body = chapter?.querySelector('.body-lane')?.getBoundingClientRect();
        const header = root.querySelector('.site-nav')?.getBoundingClientRect();
        viewport.style.setProperty('--art-chrome-bottom', `${Math.max(0,header?.bottom ?? 0)}px`);
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
            composition = { x,y,width,height };
            viewport.dataset.focusRect = JSON.stringify(composition);
            controller?.setComposition(composition);
        }
        const physical = `${innerWidth},${innerHeight}`;
        if (physical !== physicalKey) {
            physicalKey = physical;
            Object.assign(viewport.style,{ left:'0px',top:'0px',width:`${innerWidth}px`,height:`${innerHeight}px` });
            controller?.resize();
        }
        diagnostics({ viewport:[0,0,innerWidth,innerHeight], focusRect:composition }); preparePoster();
    }
    function activate() {
        if (!controller || !eligible || !state?.visible || disposed || root.dataset.artwork === 'live') return;
        // Do not expose the boot pose under a later chapter after a slow load.
        if (!(Number(canvas.dataset.frames)>0) || Math.abs(Number(canvas.dataset.frame)-authoredFrame(state.phase,state.chapter))>.00001 || canvas.dataset.dark!==String(dark()) || canvas.dataset.composition!==JSON.stringify(composition) || canvas.dataset.portrait!==String(state.portrait)) return;
        root.dataset.artwork = 'live';loadingPoster.hidden=true;delete root.dataset.bPoster; diagnostics({ state:'live' });
        root.querySelector('#runtime-status').textContent = 'Scroll to follow the story. Choose Reduce motion for a static version. Live artwork is a prototype.';
        requestUpdate();
    }
    function dark() { return document.documentElement.classList.contains('dark'); }
    function release() {
        generation++;posterGeneration++;posterURL='';loadingPoster.hidden=true;delete root.dataset.bPoster; clearTimeout(timeout); load?.abort(); load = null;
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
        root.querySelector('#runtime-status').textContent='Loading experimental artwork. A static B composition is shown while the live scene prepares.';
        timeout = setTimeout(()=> { if (mine === generation) fail(new Error('artwork-readiness-timeout')); },15000);
        try {
            const { createArtwork } = await import('./b-artwork.js');
            if (disposed || mine !== generation || abort.signal.aborted) return;
            const artwork = await createArtwork({ canvas,viewport,composition,assets:artworkAssets,signal:abort.signal,frame:authoredFrame(state.phase,state.chapter),portrait:state.portrait,dark:dark(),onMetrics:values=>{ if(mine===generation && !disposed) {diagnostics(values);activate();} },onError:fail });
            if (disposed || mine !== generation || abort.signal.aborted || !eligible) { artwork.dispose(); return; }
            controller = artwork; clearTimeout(timeout);
            controller.setComposition(composition);
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
        canvas.addEventListener('inspect-resources', event => { event.detail.readResources = controller?.inspectResources; }, { signal:lifetime.signal });
        canvas.addEventListener('inspect-artwork', event => { event.detail.result = controller?.inspectFraming(); }, { signal:lifetime.signal });
    }
    const themeObserver = new MutationObserver(()=>{controller?.setTheme(dark()?'dark':'light');preparePoster();});
    themeObserver.observe(document.documentElement,{ attributes:true,attributeFilter:['class'] });
    document.addEventListener('visibilitychange',()=>controller?.setVisible(Boolean(state?.visible) && !document.hidden),{signal:lifetime.signal});
    canvas.addEventListener('webglcontextrestored',()=> { failed = false; start(); },{signal:lifetime.signal});
    window.addEventListener('pagehide',release,{signal:lifetime.signal});
    window.addEventListener('pageshow',()=> { if (eligible) start(); },{signal:lifetime.signal});
    return { update, setMode:eligibility, dispose() { disposed = true; release(); themeObserver.disconnect(); lifetime.abort();loadingPoster.remove(); } };
}
