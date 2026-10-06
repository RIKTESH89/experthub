import { prepareSceneBytes } from './cache-delivery-v9/load-scene.js';
import { narrativeState } from './b-narrative-v9/narrative-clock.js';
import { artworkAssets } from './live3d-config.js';
import { bChapterFrame as authoredFrame, portraitWidthPerHeight } from './b-chapter-map.js';

// App owns scroll, eligibility, source links, theme and fallback. Artwork owns WebGL.
export function mountLiveArtwork(root, requestUpdate) {
    const viewport = root.querySelector('#live-art');
    const canvas = root.querySelector('#live-artwork');
    if (!viewport || !canvas) return null;
    const lifetime = new AbortController();
    const loadingPoster=document.createElement('img');loadingPoster.alt='';loadingPoster.id='b-loading-poster';loadingPoster.hidden=true;viewport.append(loadingPoster);
    let posterGeneration=0,posterURL='';
    function preparePoster(){
        if(!state||!composition||!['loading','fallback'].includes(root.dataset.artwork))return;
        const f=authoredFrame(state.phase,state.chapter),phase=f<24?'hero':f<96?'overview':f<143?'reading':'formation';
        const sourceWidth=state.portrait?360:1470,sourceHeight=state.portrait?640:801;
        const reference=state.portrait?[0,164,360,416]:[411.6,40,1058.4,711];
        const ratio=composition.width/reference[2];
        Object.assign(loadingPoster.style,{width:`${sourceWidth*ratio}px`,height:`${sourceHeight*ratio}px`,left:`${composition.x+composition.width/2-(reference[0]+reference[2]/2)*ratio}px`,top:`${composition.y+composition.height/2-(reference[1]+reference[3]/2)*ratio}px`});
        const n=narrativeState(f),view=state.portrait?'portrait':'desktop',theme=dark()?'dark':'light';
        const posterName=n.chapter==='secondary'?`narrative-source-${n.source}-${n.phase==='seat'?'formation':n.phase==='copy'||n.phase==='approach'?'copy':'reading'}-${view}-${theme}`:`fallback-${view}-${phase}-${theme}`;
        const url=`/uploads/live3d/b-narrative-v9/${posterName}.png`;
        if(url===posterURL)return;posterURL=url;loadingPoster.hidden=true;delete root.dataset.bPoster;const mine=++posterGeneration;loadingPoster.src=url;
        (loadingPoster.decode ? loadingPoster.decode() : new Promise((resolve,reject)=>{loadingPoster.onload=resolve;loadingPoster.onerror=reject;})).then(()=>{if(!disposed&&mine===posterGeneration&&['loading','fallback'].includes(root.dataset.artwork)){loadingPoster.hidden=false;root.dataset.bPoster='ready';}},()=>{});
    }
    let controller, load, timeout, generation = 0, disposed = false, eligible = false, failed = false, state, composition, rectKey = '', physicalKey = '';
    root.dataset.artwork = 'raster';
    function diagnostics(values) { Object.assign(canvas.dataset, Object.fromEntries(Object.entries(values).map(([key,value]) => [key, typeof value === 'object' ? JSON.stringify(value) : String(value)]))); }
    function position() {
        if (!state) return;
        const chapter = root.querySelector(`#${state.chapter.id}`), title = chapter?.querySelector('.title-lane')?.getBoundingClientRect();
        // Reserve both the target and any still-visible outgoing chapter. The
        // sequential fade may retain old copy while the scroll pose advances.
        const occupied=[...new Set([...root.querySelectorAll('.chapter'),chapter])].filter(Boolean).filter(el=>el===chapter||Number(getComputedStyle(el.querySelector('.panel')).opacity)>.001);
        const titleBottom=Math.max(...occupied.map(el=>el.querySelector('.title-lane').getBoundingClientRect().bottom));
        const bodyTop=Math.min(...occupied.map(el=>el.querySelector('.body-lane').getBoundingClientRect().top));
        const header = root.querySelector('.site-nav')?.getBoundingClientRect();
        viewport.style.setProperty('--art-chrome-bottom', `${Math.max(0,header?.bottom ?? 0)}px`);
        let x, y, width, height;
        if (state.portrait) {
            y = Math.max(header?.bottom ?? 0,titleBottom)+16;
            height = Math.max(1,bodyTop-16-y);
            width = Math.max(1,Math.min(innerWidth-16,height*portraitWidthPerHeight(authoredFrame(state.phase,state.chapter))));
            x = (innerWidth-width)/2;
        } else {
            x = (title?.right ?? innerWidth*.28)+32; y = (header?.bottom ?? 88)+24;
            height = Math.max(1,innerHeight-y-48);
            width = Math.max(1,Math.min(innerWidth-x-48,height*(1058.4/711)));
        }
        viewport.style.clipPath=`inset(${y}px ${Math.max(0,innerWidth-x-width)}px ${Math.max(0,innerHeight-y-height)}px ${x}px)`;
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
        failed = true; release();root.dataset.artwork='fallback';viewport.hidden=false;preparePoster();diagnostics({ state:'fallback',error:error.message });root.querySelector('#runtime-status').textContent='Static source-specific artwork — the experimental live scene could not load. The story and source links remain available.'; requestUpdate();
    }
    async function start() {
        if (disposed || failed || !eligible || !state || load || controller) return;
        const mine = ++generation, abort = load = new AbortController();
        viewport.hidden = false; root.dataset.artwork = 'loading'; diagnostics({ state:'loading',version:artworkAssets.version }); position();
        root.querySelector('#runtime-status').textContent='Loading experimental artwork. A static B composition is shown while the live scene prepares.';
        timeout = setTimeout(()=> { if (mine === generation) fail(new Error('artwork-readiness-timeout')); },20000);
        const preparedAssetPromise = prepareSceneBytes({manifest:artworkAssets.delivery,signal:abort.signal}).catch(error=>({error}));
        try {
            const { createArtwork } = await import('./b-artwork.js');
            if (disposed || mine !== generation || abort.signal.aborted) return;
            const artwork = await createArtwork({ canvas,viewport,composition,assets:artworkAssets,signal:abort.signal,preparedAssetPromise,frame:authoredFrame(state.phase,state.chapter),portrait:state.portrait,dark:dark(),onMetrics:values=>{ if(mine===generation && !disposed) {diagnostics(values);activate();} },onError:fail });
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
