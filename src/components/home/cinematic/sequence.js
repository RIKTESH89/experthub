import { frameAt, textOpacity, validateManifest } from './timeline.js';
export function mountSequence(root) {
    const lifecycle = new AbortController(), manifestController = new AbortController();
    let manifestTimer;
    let disposed = false;
    const listen = (target, type, handler, options = {}) => target.addEventListener(type, handler, { ...options, signal: lifecycle.signal });
    const assetBase = new URL('/cinematic/', location.origin);
    const body = root, chapters = [...root.querySelectorAll('.chapter')], nav = [...root.querySelectorAll('.chapter-nav a')];
    const canvas = root.querySelector('#sequence'), ctx = canvas.getContext('2d', { alpha: false }), stage = root.querySelector('#stage'), poster = root.querySelector('#stage-poster');
    const status = root.querySelector('#runtime-status'), warning = root.querySelector('#asset-status'), button = root.querySelector('#motion');
    const reduced = matchMedia('(prefers-reduced-motion: reduce)'), portrait = matchMedia('(max-width: 900px)');
    const compact = matchMedia('(max-width: 900px) and (max-height: 720px)');
    const connection = navigator.connection, constrained = () => connection?.saveData || ['slow-2g', '2g'].includes(connection?.effectiveType);
    let manifest, variant, active = 0, local = 0, cinematic = false, userStatic = false, ticket = 0, generation = 0, desired = '', lastDrawn = '', windowUrls = [], failures = 0;
    const cache = new Map(), inflight = new Map(), bad = new Set(), failedDemands = new Set();
    const metrics = { requests: 0, receivedBytes: 0, cachePeak: 0, decodedBytesPeak: 0, rendered: 0, missingDemands: 0, aborts: 0, errors: 0 };
    function report() { Object.assign(canvas.dataset, { chapter: chapters[active].id, phase: local.toFixed(4), frame: desired, drawn: lastDrawn, mode: cinematic ? 'sequence' : 'static', cache: String(cache.size), pending: String(inflight.size), ...Object.fromEntries(Object.entries(metrics).map(([k, v]) => [k, String(v)])) }); }
    function free(image) { image.close?.(); if (image instanceof HTMLImageElement)
        image.src = ''; }
    function clearFrames() { generation++; inflight.forEach(v => v.controller.abort()); inflight.clear(); cache.forEach(v => free(v.image)); cache.clear(); bad.clear(); failedDemands.clear(); failures = 0; windowUrls = []; desired = ''; lastDrawn = ''; canvas.classList.remove('ready'); }
    function limit() { return portrait.matches ? 6 : 10; }
    function evict() { while (cache.size > limit()) {
        const key = [...cache.keys()].find(k => k !== desired) ?? cache.keys().next().value;
        free(cache.get(key).image);
        cache.delete(key);
    } }
    function setMode(preserve = false) {
        const current = chapters[active];
        const next = Boolean(manifest && ctx && !reduced.matches && !constrained() && !userStatic && !compact.matches && (!portrait.matches || manifest.variants.portrait));
        if (next !== cinematic) {
            cinematic = next;
            body.dataset.cinematic = String(next);
            clearFrames();
            if (preserve)
                current.scrollIntoView({ block: 'start' });
        }
        button.hidden = compact.matches;
        button.setAttribute('aria-pressed', String(userStatic || reduced.matches || constrained()));
        button.textContent = cinematic ? 'Reduce motion' : 'Static story';
        status.textContent = cinematic ? 'Scroll-controlled image sequence. Use Reduce motion for the static story.' : reduced.matches ? 'Static story follows your reduced-motion preference.' : compact.matches ? 'Static story fits this short viewport.' : constrained() ? 'Static story uses fewer images on this connection.' : portrait.matches && !manifest?.variants.portrait ? 'Static mobile story. Dedicated portrait sequence is pending.' : 'Static story with all sources and context.';
        schedule();
    }
    function locate() {
        const y = scrollY;
        active = 0;
        for (let i = 0; i < chapters.length; i++) {
            if ((chapters[i].getBoundingClientRect().top + scrollY) <= y + 2)
                active = i;
        }
        local = Math.min(1, Math.max(0, (y - (chapters[active].getBoundingClientRect().top + scrollY)) / chapters[active].offsetHeight));
        chapters.forEach((el, i) => { el.style.setProperty('--text-opacity', String(cinematic ? (i === active ? textOpacity(local) : 0) : 1)); el.dataset.beat = String(Math.min(3, Math.floor((i === active ? local : 0) * 4))); });
        nav.forEach((a, i) => i === active ? a.setAttribute('aria-current', 'step') : a.removeAttribute('aria-current'));
        const beat = Math.min(3, Math.floor(local * 4));
        root.querySelectorAll('.build-beats li').forEach((li, i) => i === beat ? li.setAttribute('data-active', '') : li.removeAttribute('data-active'));
        const captions = { context: ['Original record stays in place · 01 / Context note', 'Exact selection · 01 / “a clear question”', 'A copied passage keeps its source index · 01', 'Question → Context · 01 + 02'], construction: ['Sparse foundation · contributed copies remain distinct', '01 / “a clear question” · first context layer', '02 + 03 + 04 · related records connect and join', 'A partial representation · contributed sources stay whole'], conversation: ['Illustrative question · How should I begin choosing an option?', 'Relevant ideas and indexed layers · 01 + 04', 'The same source fragments reopen beside the answer', 'Scripted answer with sources · then the leaf returns'] };
        if (captions[chapters[active].id])
            chapters[active].querySelector('[data-caption]').textContent = captions[chapters[active].id][beat];
        const story = root.querySelector('#story');
        stage.classList.toggle('off', y >= story.getBoundingClientRect().top + scrollY + story.offsetHeight - 1);
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
        userStatic = true;
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
                userStatic = true;
                setMode(true);
                status.textContent = 'Scene images unavailable. The complete static story remains readable.';
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
    listen(button, 'click', () => { if (reduced.matches || constrained()) {
        userStatic = true;
        status.textContent = 'Static story follows your motion or connection preference.';
        return;
    } userStatic = !userStatic; setMode(true); });
    listen(reduced, 'change', () => setMode(true));
    listen(portrait, 'change', () => setMode(true));
    listen(compact, 'change', () => setMode(true));
    if (connection)
        listen(connection, 'change', () => setMode(true));
    listen(window, 'scroll', schedule, { passive: true });
    listen(window, 'resize', schedule, { passive: true });
    listen(window, 'pagehide', clearFrames);
    listen(window, 'pageshow', schedule);
    function anchorTarget(hash, focus = false, scroll = false) { const el = root.querySelector('#' + CSS.escape(hash.slice(1))); if (!el)
        return; const details = el.closest('details'); if (details)
        details.open = true; if (scroll)
        el.scrollIntoView({ block: 'start' }); if (focus) {
        const target = el.querySelector('h1,h2') ?? el;
        target.focus({ preventScroll: true });
    } schedule(); }
    root.querySelectorAll('a[href^="#"]').forEach(a => listen(a, 'click', () => { const hash = a.getAttribute('href'); anchorTarget(hash, true); }));
    listen(window, 'hashchange', () => anchorTarget(location.hash, true));
    root.querySelectorAll('.static-visual img').forEach(img => listen(img, 'error', () => { img.hidden = true; img.closest('figure').querySelector('figcaption').textContent = 'Scene image unavailable. The complete explanation follows in text.'; }));
    listen(poster, 'error', () => { poster.style.visibility = 'hidden'; });
    listen(poster, 'load', () => { poster.style.visibility = 'visible'; });
    async function start() {
        const abort = manifestController;
        const timeout = manifestTimer = setTimeout(() => abort.abort(), 6000);
        try {
            const response = await fetch(new URL('frame-manifest.json', assetBase), { signal: abort.signal, cache: 'no-store' });
            if (!response.ok)
                throw Error('Manifest unavailable');
            if (disposed)
                return;
            manifest = validateManifest(await response.json(), chapters.map(s => s.id));
            if (manifest.contractOnly)
                throw Error('Unrendered contract is not a runnable manifest');
            if (manifest.variants.desktop.chapters.every(c => c.scrollRange)) {
                manifest.variants.desktop.chapters.forEach((c, i) => chapters[i].style.setProperty('--length', String(18 * (c.scrollRange[1] - c.scrollRange[0]))));
            }
            warning.textContent = manifest.status === 'final' ? '' : manifest.validation?.actualSequenceRendered ? 'Concept sequence · awaiting visual acceptance' : manifest.description;
            warning.title = manifest.description;
            warning.hidden = manifest.status === 'final';
            for (const v of Object.values(manifest.variants))
                for (const ch of v.chapters) {
                    for (const path of [ch.poster, ...ch.frames]) {
                        const url = new URL(path, assetBase);
                        if (url.origin !== location.origin || !/^\.(png|jpe?g|webp|avif)$/i.test(url.pathname.slice(url.pathname.lastIndexOf('.'))))
                            throw Error('Unsupported frame URL');
                    }
                }
            const staticVariant = portrait.matches && manifest.variants.portrait ? manifest.variants.portrait : manifest.variants.desktop;
            chapters.forEach((ch, i) => { ch.querySelector('.static-visual img').src = new URL(staticVariant.chapters[i].poster, assetBase).href; });
            setMode();
            if (location.hash)
                anchorTarget(location.hash, false, true);
        }
        catch {
            if (disposed)
                return;
            userStatic = true;
            status.textContent = 'Scene assets unavailable. The complete story remains readable.';
            button.hidden = true;
            schedule();
        }
        finally {
            clearTimeout(timeout);
        }
    }
    start();
    return () => { disposed = true; manifestController.abort(); clearTimeout(manifestTimer); lifecycle.abort(); cancelAnimationFrame(ticket); ticket = 0; clearFrames(); delete root.dataset.cinematic; };
}
