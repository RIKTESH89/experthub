import { frameAt, textOpacity, validateManifest, chapterProgress, chapterLengths } from './timeline.js';
import { artExitOpacity } from './stage-composition.js';
import { mountLiveArtwork } from './live3d-adapter.js';
import { assetRoot } from './asset-config.js';
import { frameWindow, nearestReadyFrame, canServeChapter } from './scheduler.js';
export function mountSequence(root) {
    const lifecycle = new AbortController();
    const artwork = mountLiveArtwork(root, () => schedule());
    let manifestController = new AbortController();
    let manifestTimer;
    let disposed = false;
    const listen = (target, type, handler, options = {}) => target.addEventListener(type, handler, { ...options, signal: lifecycle.signal });
    const assetBase = new URL(assetRoot, location.origin);
    const body = root, chapters = [...root.querySelectorAll('.chapter')], nav = [...root.querySelectorAll('.chapter-nav a')];
    const panels = chapters.map(ch => ch.querySelector('.panel'));
    const controls = panels.map(panel => [...(panel?.querySelectorAll('a[href],button,input,select,textarea,[tabindex]') ?? [])].map(element => ({element, tabindex:element.getAttribute('tabindex')})));
    const interactive = Array(chapters.length);
    function panelInteractive(index, enabled) {
        if (interactive[index] === enabled) return;
        interactive[index] = enabled;
        if (panels[index]) panels[index].style.pointerEvents = enabled ? 'auto' : 'none';
        controls[index].forEach(({element, tabindex}) => {
            if (!enabled) element.setAttribute('tabindex', '-1');
            else if (tabindex === null) element.removeAttribute('tabindex');
            else element.setAttribute('tabindex', tabindex);
        });
    }
    const canvas = root.querySelector('#sequence'), ctx = canvas.getContext('2d', { alpha: false }), stage = root.querySelector('#stage'), poster = root.querySelector('#stage-poster');
    const status = root.querySelector('#runtime-status'), warning = root.querySelector('#asset-status'), button = root.querySelector('#motion');
    const reduced = matchMedia('(prefers-reduced-motion: reduce)'), portrait = matchMedia('(max-width: 900px)');
    const compact = matchMedia('(orientation: landscape) and (max-height: 480px)');
    const connection = navigator.connection;
    let manifestState = 'loading', assetError = '', modeReason = 'loading';
    let manifest, variant, active = 0, local = 0, cinematic = false, userStatic = false, ticket = 0, generation = 0, desired = '', lastDrawn = '', windowUrls = [], failures = 0;
    const primaryImage = chapters[0].querySelector('.static-visual img');
    const cache = new Map(), inflight = new Map(), bad = new Set(), failedDemands = new Set(), blobs = new Map();
    let blobBytes=0, latencyMs=100, scrollVelocity=0, previousScroll=scrollY, previousScrollTime=performance.now();
    let prepared, geometry, geometryDirty=true, posterObjectURL='', posterStarted=0;
    const metrics = { requests: 0, receivedBytes: 0, cachePeak: 0, decodedBytesPeak: 0, rendered: 0, missingDemands: 0, aborts: 0, errors: 0, blobHits:0, decoded:0, skippedDraws:0, crossChapterHides:0, lastFetchMs:0, lastDecodeMs:0, lastDrawMs:0, posterSwitches:0, posterLoads:0, posterErrors:0, posterBlobHits:0, lastPosterMs:0 };
    function report() { Object.assign(canvas.dataset, { backend:root.dataset.artwork==='live'?'live3d':'raster', chapter: chapters[active].id, phase: local.toFixed(4), frame: desired, drawn: lastDrawn, mode: cinematic ? 'sequence' : 'static', reason: modeReason || 'none', cache: String(cache.size), pending: String(inflight.size), blobBytes:String(blobBytes), blobCache:String(blobs.size), posterPrimed:String(posterKeys().filter(k=>blobs.has(k)||primaryAvailable(k)).length), primerPending:String([...inflight.values()].filter(j=>j.primer).length), jobs:JSON.stringify([...inflight].map(([url,j])=>({frame:url,age:performance.now()-j.started,demanded:j.demanded,primer:j.primer,posterAnchor:j.posterAnchor}))), posterFrame:poster.dataset.frame??'', posterReady:String(!poster.hidden && poster.complete && poster.naturalWidth>0), posterAgeMs:String(posterStarted ? performance.now()-posterStarted : 0), visualChapter:root.dataset.artwork==='live'?'':lastDrawn ? chapters[active].id : '', visualPending:String(desired!==lastDrawn), ...Object.fromEntries(Object.entries(metrics).map(([k, v]) => [k, String(v)])) }); }
    function free(image) { image.close?.(); if (image instanceof HTMLImageElement)
        image.src = ''; }
    function clearFrames() { if(posterObjectURL){URL.revokeObjectURL(posterObjectURL);posterObjectURL='';}poster.hidden=true;delete poster.dataset.frame;generation++; inflight.forEach(v => v.controller.abort()); inflight.clear(); cache.forEach(v => free(v.image)); cache.clear(); bad.clear(); failedDemands.clear(); failures = 0; windowUrls = []; desired = ''; lastDrawn = ''; blobs.clear(); blobBytes=0; canvas.classList.remove('ready'); }
    function limit() { return portrait.matches ? 6 : 10; }
    function primaryAvailable(key) { return Boolean(variant && primaryImage?.complete && primaryImage.currentSrc===key && primaryImage.naturalWidth===variant.width && primaryImage.naturalHeight===variant.height); }
    function posterKeys() { return variant ? variant.chapters.map(ch=>new URL(ch.poster,assetBase).href) : []; }
    function anchors() { return variant ? [active,active+1,active-1].filter(i=>i>=0 && i<variant.chapters.length).map(i=>new URL(variant.chapters[i].poster,assetBase).href) : []; }
    function evict() { while (cache.size > limit()) {
        const protectedKeys = new Set([desired,...anchors()]);
        const key = [...cache.keys()].find(k => !protectedKeys.has(k)) ?? [...cache.keys()].find(k=>k!==desired) ?? cache.keys().next().value;
        free(cache.get(key).image);
        cache.delete(key);
    } }
    function reasonForStatic() {
        if (reduced.matches) return 'reduced-motion';
        if (connection?.saveData) return 'save-data';
        if (['slow-2g', '2g'].includes(connection?.effectiveType)) return 'slow-connection';
        if (!ctx) return 'canvas-unavailable';
        if (manifestState !== 'ready') return manifestState === 'failed' ? 'manifest-unavailable' : 'loading';
        if (assetError) return assetError;
        if (userStatic) return 'user-choice';
        if (compact.matches) return 'short-landscape';
        if (portrait.matches && !manifest.variants.portrait) return 'portrait-unavailable';
        return '';
    }
    function setMode(preserve = false) {
        const current = chapters[active];
        const outsideStory = stage.classList.contains('off');
        const focused = document.activeElement;
        const preserveFocus = root.contains(focused) && focused.matches('input,select,textarea') && !focused.closest('#story');
        modeReason = reasonForStatic();
        const next = !modeReason;
        if (next !== cinematic) {
            cinematic = next;
            body.dataset.cinematic = String(next);
            geometryDirty=true;
            clearFrames();
            if (preserve && preserveFocus) focused.scrollIntoView({ block: 'center', behavior: 'instant' });
            else if (preserve && !outsideStory) current.scrollIntoView({ block: 'start', behavior: 'instant' });
        }
        body.dataset.renderReason = modeReason || 'none';
        const messages = {
            'loading': 'Loading scroll animation. The complete story remains readable.',
            'reduced-motion': 'Animation is off to respect your reduced-motion setting. The complete story follows.',
            'save-data': 'Animation is off to respect Save Data. The complete story follows.',
            'slow-connection': 'Animation is paused on this slow connection. The complete story follows.',
            'canvas-unavailable': 'Scroll animation is unavailable in this browser. The complete story follows.',
            'manifest-unavailable': 'Animation could not load. Retry animation, or read the complete story below.',
            'image-unavailable': 'Some animation images could not load. Retry animation, or read the complete story below.',
            'user-choice': 'You chose the static story. Select Show animation to resume.',
            'short-landscape': 'Rotate to portrait for scroll animation. The complete story remains readable in this short landscape view.',
            'portrait-unavailable': 'Portrait animation is unavailable. The complete story follows.'
        };
        button.hidden = false;
        button.disabled = Boolean(modeReason && !['user-choice', 'manifest-unavailable', 'image-unavailable'].includes(modeReason));
        button.setAttribute('aria-pressed', String(Boolean(modeReason)));
        button.textContent = cinematic ? 'Reduce motion' : modeReason === 'user-choice' ? 'Show animation' : ['manifest-unavailable', 'image-unavailable'].includes(modeReason) ? 'Retry animation' : modeReason === 'loading' ? 'Loading animation' : 'Static story';
        artwork?.setMode(cinematic);
        status.textContent = cinematic ? 'Scroll to follow the story. Choose Reduce motion for a static version.' : messages[modeReason];
        warning.textContent = cinematic ? '' : messages[modeReason];
        warning.hidden = cinematic;
        schedule();
    }
    function measureGeometry() {
        const story=root.querySelector('#story'), plans=root.querySelector('#plans');
        geometry={chapters:chapters.map(ch=>({top:ch.getBoundingClientRect().top+scrollY,height:ch.offsetHeight})),
            end:story.getBoundingClientRect().top+scrollY+story.offsetHeight,
            plans:plans ? plans.getBoundingClientRect().top+scrollY : Infinity,
            chrome:root.querySelector('.site-nav')?.getBoundingClientRect().height??0};
        root.style.setProperty('--anchor-header-offset', `${geometry.chrome+16}px`);
        geometryDirty=false;
    }
    function locate() {
        if(geometryDirty || !cinematic) measureGeometry();
        const y=scrollY, now=performance.now();
        if(y!==previousScroll) { scrollVelocity=(y-previousScroll)/Math.max(16,now-previousScrollTime);previousScroll=y;previousScrollTime=now; }
        active=0;
        for(let i=0;i<chapters.length;i++) if(geometry.chapters[i].top<=y+2)active=i;
        const beyondStory=y>=geometry.end-1 || geometry.plans-y<=geometry.chrome+32;
        const bounds=geometry.chapters[active];
        const progress=chapterProgress(y,bounds.top,bounds.height,innerHeight);
        local=progress.phase;
        const stageOpacity = beyondStory ? 0 : active===chapters.length-1 ? artExitOpacity(local) : 1;
        root.style.setProperty('--story-stage-opacity',String(stageOpacity));
        canvas.dataset.stageOpacity=String(stageOpacity);
        canvas.dataset.exit=progress.exit.toFixed(4);
        chapters.forEach((el, i) => {
            const opacity = cinematic ? (!beyondStory && i === active ? textOpacity(local, i === 0) : 0) : 1;
            el.style.setProperty('--text-opacity', String(opacity));
            el.dataset.beat = String(Math.min(3, Math.floor((i === active ? local : 0) * 4)));
            const readable = !cinematic || opacity >= .99;
            if (!readable && panels[i]?.contains(document.activeElement) && document.activeElement.matches('a,button,input,select,textarea,[tabindex]')) (beyondStory ? button : nav[active])?.focus({preventScroll:true});
            panelInteractive(i, readable);
        });
        canvas.dataset.textOpacity = String(cinematic && !beyondStory ? textOpacity(local, active === 0) : 0);
        root.dataset.activeChapter = cinematic && !beyondStory ? chapters[active].id : '';
        nav.forEach((a, i) => i === active ? a.setAttribute('aria-current', 'location') : a.removeAttribute('aria-current'));
        const beat = Math.min(3, Math.floor(local * 4));
        root.querySelectorAll('.build-beats li').forEach((li, i) => i === beat ? li.setAttribute('data-active', '') : li.removeAttribute('data-active'));
        const captions = { context: ['01 / Original source', '01 / “a clear question”', '01 / A passage in context', '01 + 02 / Related ideas'], construction: ['A sparse foundation', '01 / First context layer', '02 + 03 + 04 / Related knowledge', 'A partial Digital Twin'], conversation: ['Fictional question', '01 + 04 / Available sources', '01 + 04 / Check the source passages', 'Scripted example · not live AI'] };
        const caption = chapters[active].querySelector('[data-caption]');
        if (caption && captions[chapters[active].id]) caption.textContent = captions[chapters[active].id][beat];
        if(portrait.matches){
            const title=chapters[active].querySelector('.title-lane');
            const top=geometry.chrome+12;
            root.style.setProperty('--portrait-title-top',`${top}px`);
            root.style.setProperty('--portrait-shade-end',`${top+(title?.offsetHeight??60)+6}px`);
            const weight=Math.max(0,Math.min(1,local/.15,(1-local)/.15));
            const context=chapters[active].id==='context',question=chapters[active].id==='conversation';
            const questionShift=3-Math.max(0,Math.min(1,(local-.45)/.1));
            root.style.setProperty('--portrait-body-top',`${78+(context?8:0)*weight}%`);
            root.style.setProperty('--portrait-shade-bottom-start',`${75+(context?8:0)*weight}%`);
            root.style.setProperty('--portrait-shade-bottom-end',`${78+(context?7:0)*weight}%`);
            root.style.setProperty('--portrait-shift',`${-10+(context?4:question?questionShift:0)*weight}svh`);
            root.style.setProperty('--portrait-scale',String(1-(context ? .05 : 0)*weight));
        }
        stage.classList.toggle('off', beyondStory);
        root.querySelector('.chapter-nav').hidden = beyondStory;
    }
    function resize() { const ratio = Math.min(devicePixelRatio || 1, 1.5); const w = Math.round(innerWidth * ratio), h = Math.round(innerHeight * ratio); if (canvas.width !== w || canvas.height !== h) {
        canvas.width = w;
        canvas.height = h;
        lastDrawn = '';canvas.classList.remove('ready');
    } }
    function draw(image, key) { const started=performance.now(); ctx.fillStyle = '#151411'; ctx.fillRect(0, 0, canvas.width, canvas.height); const width=image.naturalWidth||image.width,height=image.naturalHeight||image.height;const scale=Math.min(canvas.width/width,canvas.height/height);const w=width*scale,h=height*scale; ctx.drawImage(image, (canvas.width - w) / 2, (canvas.height - h) / 2, w, h); canvas.classList.add('ready'); lastDrawn = key; metrics.rendered++; metrics.lastDrawMs=performance.now()-started; }
    async function decode(blob) { if ('createImageBitmap' in window)
        return createImageBitmap(blob); const url = URL.createObjectURL(blob), image = new Image(); try {
        image.src = url;
        await image.decode();
        return image;
    }
    finally {
        URL.revokeObjectURL(url);
    } }
    function currentFailure(key) { if (key !== desired || failedDemands.has(key))
        return; failedDemands.add(key); failures++; status.textContent = 'A scene image is unavailable. The readable static story is available below.'; if (failures >= 3) {
        assetError = 'image-unavailable';
        setMode(true);
    } }
    function retainBlob(key,blob) {
        if(blobs.has(key))blobBytes-=blobs.get(key).size;
        blobs.delete(key);blobs.set(key,blob);blobBytes+=blob.size;
        const budget=portrait.matches ? 2*1024*1024 : 4*1024*1024;
        while(blobBytes>budget || blobs.size>64) {const primers=new Set(posterKeys());const oldest=[...blobs.keys()].find(k=>!primers.has(k))??blobs.keys().next().value;blobBytes-=blobs.get(oldest).size;blobs.delete(oldest);}
    }
    function pump() {
        if(!cinematic)return;
        // A current demand can displace speculative work, never an earlier demand.
        if(!cache.has(desired) && !inflight.has(desired) && inflight.size>=2) {
            const speculative=[...inflight].find(([url,job])=>!job.demanded && !job.primer && !job.posterAnchor && !anchors().includes(url));
            if(speculative){speculative[1].cancelled=true;speculative[1].controller.abort();inflight.delete(speculative[0]);metrics.aborts++;}
        }
        const primers=posterKeys().filter(key=>!blobs.has(key));
        const jobs=[...new Set([...anchors(),...primers,desired,...windowUrls])];
        for(const key of jobs) {
            if(inflight.size>=2)break;
            const primer=!windowUrls.includes(key);
            // The priority hero image already has a browser request/decoded surface.
            // Borrow only its exact authored pose; do not duplicate that fetch.
            if(primaryAvailable(key) || (primaryImage && !primaryImage.complete && (primaryImage.currentSrc===key || primaryImage.src===key)))continue;
            if(cache.has(key)||inflight.has(key)||bad.has(key)||(primer&&blobs.has(key)))continue;
            const controller=new AbortController(),epoch=generation,job={controller,demanded:key===desired,cancelled:false,primer,posterAnchor:posterKeys().includes(key),started:performance.now()};
            inflight.set(key,job);
            const timeout=setTimeout(()=>controller.abort(),8000);
            (async()=>{let decoded;
                try {
                    let blob=blobs.get(key),fetchDuration=0;
                    if(blob){metrics.blobHits++;blobs.delete(key);blobs.set(key,blob);}
                    else {
                        const started=performance.now();metrics.requests++;
                        const response=await fetch(key,{signal:controller.signal});
                        if(!response.ok)throw Error(`Image ${response.status}`);
                        blob=await response.blob();
                        metrics.lastFetchMs=fetchDuration=performance.now()-started;
                        metrics.receivedBytes+=blob.size;
                        if(epoch!==generation || !cinematic)return;
                        retainBlob(key,blob);
                    }
                    if(controller.signal.aborted || primer)return;
                    const started=performance.now();decoded=await decode(blob);
                    metrics.lastDecodeMs=performance.now()-started;metrics.decoded++;
                    if(epoch!==generation || !cinematic || controller.signal.aborted){free(decoded);return;}
                    if(decoded.width!==variant.width || decoded.height!==variant.height){free(decoded);throw Error('Unexpected frame dimensions');}
                    latencyMs=Math.max(24,Math.min(1000,latencyMs*.75+(fetchDuration+metrics.lastDecodeMs)*.25));
                    cache.set(key,{image:decoded,bytes:decoded.width*decoded.height*4});evict();
                    metrics.cachePeak=Math.max(metrics.cachePeak,cache.size);
                    metrics.decodedBytesPeak=Math.max(metrics.decodedBytesPeak,[...cache.values()].reduce((n,v)=>n+v.bytes,0));
                    if(key===desired)failures=0;
                }catch{
                    if(epoch!==generation)return;
                    if(job.cancelled)return;
                    bad.add(key);metrics.errors++;currentFailure(key);
                }finally{
                    clearTimeout(timeout);
                    if(epoch===generation){if(inflight.get(key)?.controller===controller)inflight.delete(key);schedule();}
                }
            })();
        }
    }
    function update() {
        ticket = 0;
        locate();
        if (!cinematic) {
            artwork?.setMode(false);
            report();
            return;
        }
        const next = portrait.matches ? manifest.variants.portrait : manifest.variants.desktop;
        if (next !== variant) {
            variant = next;
            clearFrames();
        }
        resize();
        const ch=variant.chapters[active], frames=prepared.get(variant)[active];
        if (artwork?.update({ cinematic, chapter:ch, phase:local, portrait:portrait.matches, visible:!stage.classList.contains('off') })) {
            metrics.aborts+=inflight.size; inflight.forEach(job => {job.cancelled=true;job.controller.abort();}); inflight.clear();
            report(); return;
        }
        const posterURL=new URL(ch.poster,assetBase).href;
        const availableBlob=blobs.get(posterURL);
        const pendingRemote=poster.dataset.frame===posterURL && !posterObjectURL && !(poster.complete && poster.naturalWidth>0);
        if(poster.dataset.frame!==posterURL || (pendingRemote && availableBlob)){
            if(posterObjectURL)URL.revokeObjectURL(posterObjectURL);
            posterObjectURL='';poster.hidden=true;poster.dataset.frame=posterURL;posterStarted=performance.now();metrics.posterSwitches++;
            if(availableBlob){posterObjectURL=URL.createObjectURL(availableBlob);poster.src=posterObjectURL;metrics.posterBlobHits++;}
            else if(poster.src!==posterURL)poster.src=posterURL;
        }
        if(poster.complete && poster.naturalWidth>0 && poster.currentSrc===poster.src)poster.hidden=false;
        const index=frameAt(local,ch.frames.length,ch.keyframes),key=frames[index];
        desired=key;
        const direction=scrollVelocity<0?-1:1;
        const lookAhead=Math.max(0,Math.min(1,local+scrollVelocity*latencyMs/geometry.chapters[active].height));
        const predicted=frameAt(lookAhead,ch.frames.length,ch.keyframes);
        const adjacent=anchors();
        windowUrls=[...new Set([key,...adjacent,...frameWindow(frames,index,predicted,direction,portrait.matches?2:3)])].slice(0,portrait.matches?5:7);
        if(inflight.has(key))inflight.get(key).demanded=true;
        // Keep same-chapter demand and adjacent posters; preempt unusable old chapters.
        for(const [url,job]of inflight)if(!job.primer && !job.posterAnchor && !canServeChapter(url,frames,adjacent)){job.cancelled=true;job.controller.abort();inflight.delete(url);metrics.aborts++;}
        if(!cache.has(key) && canvas.dataset.frame!==key)metrics.missingDemands++;
        if (bad.has(key)) {
            currentFailure(key);
            if (cinematic && windowUrls.every(url => bad.has(url))) {
                assetError = 'image-unavailable';
                setMode(true);
            }
            if (!cinematic) {
                report();
                return;
            }
        }
        const held=ch.keyframes?.some(([end,frame],i)=>i>0 && frame===ch.keyframes[i-1][1] && local>=ch.keyframes[i-1][0] && local<=end);
        const ready=nearestReadyFrame(frames,index,cache,direction,held?0:4);
        const primaryReady=primaryAvailable(key);
        if(primaryReady){
            if(lastDrawn!==key)draw(primaryImage,key);
        } else if(ready) {
            if(ready.key===key){failures=0;failedDemands.clear();}
            const item=ready.item;cache.delete(ready.key);cache.set(ready.key,item);
            if(lastDrawn!==ready.key){if(ready.key!==key)metrics.skippedDraws++;draw(item.image,ready.key);}
        } else if(lastDrawn) {
            // Never leave an ASK pose behind BUILD/CONTEXT/SHARE copy.
            canvas.classList.remove('ready');lastDrawn='';metrics.crossChapterHides++;
        }
        pump();
        report();
    }
    function schedule() { if (!disposed && !ticket)
        ticket = requestAnimationFrame(update); }
    listen(button, 'click', () => {
        if (button.disabled) return;
        if (manifestState === 'failed') { userStatic = false; start(true); return; }
        if (assetError) { assetError = ''; userStatic = false; clearFrames(); }
        else userStatic = !userStatic;
        setMode(true);
    });
    listen(reduced, 'change', () => setMode(true));
    listen(portrait, 'change', () => setMode(true));
    listen(compact, 'change', () => setMode(true));
    if (connection)
        listen(connection, 'change', () => setMode(true));
    listen(root, 'focusin', event => {
        if (!cinematic) return;
        const chapter = event.target.closest('.chapter');
        if (!chapter) return;
        const index = chapters.indexOf(chapter);
        if (index !== active || textOpacity(local, index === 0) < .99) chapter.scrollIntoView({block:'start',behavior:'instant'});
        schedule();
    });
    listen(poster,'load',()=>{const expected=variant ? new URL(variant.chapters[active].poster,assetBase).href : '';poster.hidden=!(poster.complete && poster.naturalWidth>0 && poster.currentSrc===poster.src && poster.dataset.frame===expected);if(!poster.hidden){metrics.posterLoads++;metrics.lastPosterMs=performance.now()-posterStarted;}schedule();});
    listen(window, 'scroll', schedule, { passive: true });
    listen(window, 'resize', () => {geometryDirty=true;schedule();}, { passive: true });
    listen(window, 'pagehide', clearFrames);
    listen(window, 'pageshow', schedule);
    function anchorTarget(hash, focus = false, scroll = false) {
        const el = document.getElementById(hash.slice(1));
        if (!el || !root.contains(el)) return;
        // Opening first forces target geometry to represent the readable content.
        const details = el.closest('details');
        if (details) details.open = true;
        const header = root.querySelector('.site-nav');
        const headerHeight = header?.getBoundingClientRect().height ?? 0;
        root.style.setProperty('--anchor-header-offset', `${headerHeight+16}px`);
        if (scroll) el.scrollIntoView({ block: 'start', behavior: 'instant' });
        if (focus) {
        const target = el.querySelector('h1,h2') ?? el;
        if (!target.hasAttribute('tabindex')) target.setAttribute('tabindex', '-1');
        target.focus({ preventScroll: true });
    } schedule(); }
    root.querySelectorAll('a[href^="#"]').forEach(a => listen(a, 'click', event => {
        if (event.defaultPrevented || event.button > 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
        const hash = a.getAttribute('href');
        // Local fragment journeys are synchronous. Do not race a deferred router
        // transition against a second keyboard activation in the same document.
        event.preventDefault();
        if (location.hash !== hash) history.pushState(history.state, '', hash);
        anchorTarget(hash, true, true);
    }));
    listen(window, 'hashchange', () => anchorTarget(location.hash, true, true));
    root.querySelectorAll('.static-visual img').forEach(img => listen(img,'load',schedule));
    root.querySelectorAll('.static-visual img').forEach(img => listen(img, 'error', () => { img.hidden = true; img.closest('figure').querySelector('figcaption').textContent = 'Scene image unavailable. The complete explanation follows in text.'; }));
    listen(poster, 'error', () => { poster.hidden=true;poster.style.visibility='hidden';metrics.posterErrors++;schedule(); });
    listen(poster, 'load', () => { poster.style.visibility = 'visible'; });
    async function start(preserve = false) {
        manifestController.abort();
        const abort = manifestController = new AbortController();
        manifestState = 'loading';
        assetError = '';
        button.disabled = true;
        button.hidden = false;
        button.textContent = 'Loading animation';
        body.dataset.renderReason = 'loading';
        modeReason = 'loading';
        canvas.dataset.reason = 'loading';
        warning.textContent = 'Loading scroll animation. The complete story remains readable.';
        warning.hidden = false;
        status.textContent = 'Loading scroll animation. The complete story remains readable.';
        const timeout = manifestTimer = setTimeout(() => abort.abort(), 6000);
        try {
            const response = await fetch(new URL('frame-manifest.json', assetBase), { signal: abort.signal, cache: 'no-store' });
            if (!response.ok)
                throw Error('Manifest unavailable');
            if (disposed || abort !== manifestController)
                return;
            const parsed = await response.json();
            if (disposed || abort !== manifestController)
                return;
            manifest = validateManifest(parsed, chapters.map(s => s.id));
            prepared=new Map(Object.values(manifest.variants).map(v=>[v,v.chapters.map(ch=>ch.frames.map(f=>new URL(f,assetBase).href))]));
            geometryDirty=true;
            if (manifest.contractOnly)
                throw Error('Unrendered contract is not a runnable manifest');
            chapters.forEach(ch => ch.style.setProperty('--length', String(chapterLengths[ch.id])));
            warning.textContent = '';
            warning.title = '';
            warning.hidden = true;
            for (const v of Object.values(manifest.variants))
                for (const ch of v.chapters) {
                    for (const path of [ch.poster, ...ch.frames]) {
                        const url = new URL(path, assetBase);
                        if (url.origin !== location.origin || !/^\.(png|jpe?g|webp|avif)$/i.test(url.pathname.slice(url.pathname.lastIndexOf('.'))))
                            throw Error('Unsupported frame URL');
                    }
                }
            const staticVariant = portrait.matches && manifest.variants.portrait ? manifest.variants.portrait : manifest.variants.desktop;
            chapters.forEach((ch, i) => { const image=ch.querySelector('.static-visual img'); if(image) image.src = new URL(staticVariant.chapters[i].poster, assetBase).href; });
            manifestState = 'ready';
            setMode(preserve);
            if (location.hash) {
                const fragment = document.getElementById(location.hash.slice(1));
                anchorTarget(location.hash, Boolean(fragment?.closest('footer')), true);
            }
        }
        catch {
            if (disposed || abort !== manifestController) return;
            manifestState = 'failed';
            manifest = undefined;
            setMode(preserve);
        }
        finally {
            clearTimeout(timeout);
        }
    }
    const observer='ResizeObserver' in window ? new ResizeObserver(()=>{geometryDirty=true;schedule();}) : null;
    if(observer){observer.observe(root.querySelector('#story'));chapters.forEach(ch=>observer.observe(ch));}
    start();
    return () => { disposed = true; artwork?.dispose(); observer?.disconnect(); manifestController.abort(); clearTimeout(manifestTimer); lifecycle.abort(); cancelAnimationFrame(ticket); ticket = 0; clearFrames(); chapters.forEach((_chapter,index)=>panelInteractive(index,true)); delete root.dataset.activeChapter; delete root.dataset.cinematic; };
}
