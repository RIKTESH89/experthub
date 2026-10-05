import { frameAt, textOpacity, validateManifest, chapterProgress, chapterLengths } from './timeline.js';
export function mountSequence(root) {
    const lifecycle = new AbortController();
    let manifestController = new AbortController();
    let manifestTimer;
    let disposed = false;
    const listen = (target, type, handler, options = {}) => target.addEventListener(type, handler, { ...options, signal: lifecycle.signal });
    const assetBase = new URL('/uploads/cinematic-homepage/', location.origin);
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
    const cache = new Map(), inflight = new Map(), bad = new Set(), failedDemands = new Set();
    const metrics = { requests: 0, receivedBytes: 0, cachePeak: 0, decodedBytesPeak: 0, rendered: 0, missingDemands: 0, aborts: 0, errors: 0 };
    function report() { Object.assign(canvas.dataset, { chapter: chapters[active].id, phase: local.toFixed(4), frame: desired, drawn: lastDrawn, mode: cinematic ? 'sequence' : 'static', reason: modeReason || 'none', cache: String(cache.size), pending: String(inflight.size), ...Object.fromEntries(Object.entries(metrics).map(([k, v]) => [k, String(v)])) }); }
    function free(image) { image.close?.(); if (image instanceof HTMLImageElement)
        image.src = ''; }
    function clearFrames() { generation++; inflight.forEach(v => v.controller.abort()); inflight.clear(); cache.forEach(v => free(v.image)); cache.clear(); bad.clear(); failedDemands.clear(); failures = 0; windowUrls = []; desired = ''; lastDrawn = ''; canvas.classList.remove('ready'); }
    function limit() { return portrait.matches ? 6 : 10; }
    function evict() { while (cache.size > limit()) {
        const key = [...cache.keys()].find(k => k !== desired) ?? cache.keys().next().value;
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
        status.textContent = cinematic ? 'Scroll to follow the story. Choose Reduce motion for a static version.' : messages[modeReason];
        warning.textContent = cinematic ? '' : messages[modeReason];
        warning.hidden = cinematic;
        schedule();
    }
    function locate() {
        const y = scrollY;
        active = 0;
        for (let i = 0; i < chapters.length; i++) {
            if ((chapters[i].getBoundingClientRect().top + scrollY) <= y + 2)
                active = i;
        }
        const story = root.querySelector('#story');
        const plans = root.querySelector('#plans');
        const chromeHeight = root.querySelector('.site-nav')?.getBoundingClientRect().height ?? 0;
        const beyondStory = y >= story.getBoundingClientRect().top + scrollY + story.offsetHeight - 1 || Boolean(plans && plans.getBoundingClientRect().top <= chromeHeight + 32);
        const panelHeight = panels[active]?.getBoundingClientRect().height || innerHeight;
        const progress = chapterProgress(y, chapters[active].getBoundingClientRect().top + scrollY, chapters[active].offsetHeight, panelHeight);
        local = progress.phase;
        canvas.dataset.exit = progress.exit.toFixed(4);
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
        nav.forEach((a, i) => i === active ? a.setAttribute('aria-current', 'step') : a.removeAttribute('aria-current'));
        const beat = Math.min(3, Math.floor(local * 4));
        root.querySelectorAll('.build-beats li').forEach((li, i) => i === beat ? li.setAttribute('data-active', '') : li.removeAttribute('data-active'));
        const captions = { context: ['01 / Original source', '01 / “a clear question”', '01 / A passage in context', '01 + 02 / Related ideas'], construction: ['A sparse foundation', '01 / First context layer', '02 + 03 + 04 / Related knowledge', 'A partial Digital Twin'], conversation: ['Fictional question', '01 + 04 / Available sources', 'Check the source passages', 'Scripted answer · not live AI'] };
        const caption = chapters[active].querySelector('[data-caption]');
        if (caption && captions[chapters[active].id]) caption.textContent = captions[chapters[active].id][beat];
        stage.classList.toggle('off', beyondStory);
        root.querySelector('.chapter-nav').hidden = beyondStory;
    }
    function resize() { const ratio = Math.min(devicePixelRatio || 1, 1.5); const w = Math.round(innerWidth * ratio), h = Math.round(innerHeight * ratio); if (canvas.width !== w || canvas.height !== h) {
        canvas.width = w;
        canvas.height = h;
        lastDrawn = '';
    } }
    function draw(image, key) { ctx.fillStyle = '#151411'; ctx.fillRect(0, 0, canvas.width, canvas.height); const scale = Math.min(canvas.width / image.width, canvas.height / image.height); const w = image.width * scale, h = image.height * scale; ctx.drawImage(image, (canvas.width - w) / 2, (canvas.height - h) / 2, w, h); canvas.classList.add('ready'); lastDrawn = key; metrics.rendered++; }
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
    function pump() {
        if (!cinematic)
            return;
        for (const key of windowUrls) {
            if (inflight.size >= 2)
                break;
            if (cache.has(key) || inflight.has(key) || bad.has(key))
                continue;
            const controller = new AbortController(), epoch = generation;
            inflight.set(key, { controller });
            metrics.requests++;
            const timeout = setTimeout(() => controller.abort(), 8000);
            (async () => {
                let decoded;
                try {
                    const response = await fetch(key, { signal: controller.signal });
                    if (!response.ok)
                        throw Error(`Image ${response.status}`);
                    const blob = await response.blob();
                    metrics.receivedBytes += blob.size;
                    decoded = await decode(blob);
                    if (epoch !== generation || !cinematic || !windowUrls.includes(key)) {
                        free(decoded);
                        return;
                    }
                    if (decoded.width !== variant.width || decoded.height !== variant.height) {
                        free(decoded);
                        throw Error('Unexpected frame dimensions');
                    }
                    cache.set(key, { image: decoded, bytes: decoded.width * decoded.height * 4 });
                    evict();
                    metrics.cachePeak = Math.max(metrics.cachePeak, cache.size);
                    metrics.decodedBytesPeak = Math.max(metrics.decodedBytesPeak, [...cache.values()].reduce((n, v) => n + v.bytes, 0));
                    if (key === desired)
                        failures = 0;
                }
                catch {
                    if (epoch !== generation)
                        return;
                    if (controller.signal.aborted && !windowUrls.includes(key)) {
                        metrics.aborts++;
                        return;
                    }
                    bad.add(key);
                    metrics.errors++;
                    currentFailure(key);
                }
                finally {
                    clearTimeout(timeout);
                    if (epoch === generation) {
                        if (inflight.get(key)?.controller === controller)
                            inflight.delete(key);
                        schedule();
                    }
                }
            })();
        }
    }
    function update() {
        ticket = 0;
        locate();
        if (!cinematic) {
            report();
            return;
        }
        const next = portrait.matches ? manifest.variants.portrait : manifest.variants.desktop;
        if (next !== variant) {
            variant = next;
            clearFrames();
        }
        resize();
        const ch = variant.chapters[active];
        poster.src = new URL(ch.poster, assetBase).href;
        const index = frameAt(local, ch.frames.length, ch.keyframes);
        const key = new URL(ch.frames[index], assetBase).href;
        if (key !== desired) {
            desired = key;
            const all = variant.chapters.flatMap(c => c.frames.map(f => new URL(f, assetBase).href));
            const base = variant.chapters.slice(0, active).reduce((n, c) => n + c.frames.length, 0) + index;
            const radius = portrait.matches ? 2 : 3;
            windowUrls = [key, ...Array.from({ length: radius }, (_, i) => [all[base + i + 1], all[base - i - 1]]).flat().filter(Boolean)];
            windowUrls = [...new Set(windowUrls)];
            for (const [url, item] of inflight) {
                if (!windowUrls.includes(url)) {
                    item.controller.abort();
                    inflight.delete(url);
                    metrics.aborts++;
                }
            }
            if (!cache.has(key))
                metrics.missingDemands++;
        }
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
        if (cache.has(key)) {
            failures = 0;
            failedDemands.clear();
            const item = cache.get(key);
            cache.delete(key);
            cache.set(key, item);
            if (lastDrawn !== key)
                draw(item.image, key);
        }
        else if (bad.has(key) && !lastDrawn) {
            canvas.classList.remove('ready');
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
    listen(window, 'scroll', schedule, { passive: true });
    listen(window, 'resize', schedule, { passive: true });
    listen(window, 'pagehide', clearFrames);
    listen(window, 'pageshow', schedule);
    function anchorTarget(hash, focus = false, scroll = false) { const el = document.getElementById(hash.slice(1)); if (!el || !root.contains(el))
        return; const details = el.closest('details'); if (details)
        details.open = true; if (scroll)
        el.scrollIntoView({ block: 'start', behavior: 'instant' }); if (focus) {
        const target = el.querySelector('h1,h2') ?? el;
        if (!target.hasAttribute('tabindex')) target.setAttribute('tabindex', '-1');
        target.focus({ preventScroll: true });
    } schedule(); }
    root.querySelectorAll('a[href^="#"]').forEach(a => listen(a, 'click', () => { const hash = a.getAttribute('href'); anchorTarget(hash, true, true); }));
    listen(window, 'hashchange', () => anchorTarget(location.hash, true, true));
    root.querySelectorAll('.static-visual img').forEach(img => listen(img, 'error', () => { img.hidden = true; img.closest('figure').querySelector('figcaption').textContent = 'Scene image unavailable. The complete explanation follows in text.'; }));
    listen(poster, 'error', () => { poster.style.visibility = 'hidden'; });
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
            if (location.hash)
                anchorTarget(location.hash, false, true);
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
    start();
    return () => { disposed = true; manifestController.abort(); clearTimeout(manifestTimer); lifecycle.abort(); cancelAnimationFrame(ticket); ticket = 0; clearFrames(); chapters.forEach((_chapter,index)=>panelInteractive(index,true)); delete root.dataset.activeChapter; delete root.dataset.cinematic; };
}
