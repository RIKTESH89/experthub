export const chapterLengths = { introduction: 1.0, contributions: 1.2, context: 1.2, construction: 1.35, conversation: 1.4, control: 1.05, close: 1.05 };

export function frameAt(phase, count, keys) {
    const end = count - 1, points = keys ?? [[0, 0], [.12, 0], [.32, 0], [.72, end], [.88, end], [1, end]], p = Math.max(0, Math.min(1, phase));
    for (let i = 1; i < points.length; i++) {
        const [x, b] = points[i], [prev, a] = points[i - 1];
        if (p <= x) {
            const t = x === prev ? 0 : (p - prev) / (x - prev);
            return Math.max(0, Math.min(end, Math.round(a + (b - a) * t)));
        }
    }
    return end;
}
export function textOpacity(p, opening = false) {
    const smooth = value => { const x = Math.max(0, Math.min(1, value)); return x * x * (3 - 2 * x); };
    const enter = opening ? 1 : smooth(p / .06);
    const leave = 1 - smooth((p - .86) / .14);
    return Math.min(enter, leave);
}
export function validateManifest(m, ids) { if (m.version !== 1 || !['concept', 'final'].includes(m.status) || !m.variants?.desktop)
    throw Error('Unsupported manifest'); for (const v of Object.values(m.variants)) {
    if (!Number.isInteger(v.width) || !Number.isInteger(v.height) || v.width < 1 || v.height < 1 || v.width > 4096 || v.height > 4096 || v.chapters?.length !== ids.length)
        throw Error('Invalid dimensions/chapters');
    v.chapters.forEach((c, i) => { if (c.id !== ids[i] || typeof c.poster !== 'string' || !Array.isArray(c.frames) || !c.frames.length || c.frames.some(f => typeof f !== 'string'))
        throw Error('Invalid chapter'); if (c.keyframes) {
        if (c.keyframes.length < 2 || c.keyframes[0][0] !== 0 || c.keyframes.at(-1)[0] !== 1)
            throw Error('Invalid timeline boundaries');
        c.keyframes.forEach(([p, f], j) => { if (!Number.isFinite(p) || p < 0 || p > 1 || !Number.isInteger(f) || f < 0 || f >= c.frames.length || (j && p <= c.keyframes[j - 1][0]))
            throw Error('Invalid timeline'); });
    } });
} return m; }

// Fixed scene overlays consume the full chapter distance; they never depart
// with their containing document section. The same phase drives text and camera.
export function chapterProgress(scroll, top, height, viewport) {
    const pinnedDistance = Math.max(1, height);
    const distance = scroll - top;
    return {
        phase: Math.max(0, Math.min(1, distance / pinnedDistance)),
        exit: Math.max(0, Math.min(1, (distance - pinnedDistance) / Math.max(1, viewport))),
        pinnedDistance,
    };
}

// App timing over unchanged authored frame indices. Never mutate the frozen manifest.
export function retimeChapter(chapter){
 const end=chapter.frames.length-1;
 const four=(a,b)=>[[0,0],[.06,a],[.14,a],[.30,b],[.38,b],[.55,end===43?34:20],[.63,end===43?34:20],[.80,end],[.90,end],[1,end]];
 const map={
  introduction:[[0,0],[.16,0],[.76,22],[.88,22],[1,22]],
  contributions:four(6,13),
  context:[[0,0],[.06,4],[.14,4],[.30,6],[.38,6],[.55,15],[.63,15],[.80,27],[.90,27],[1,27]],
  construction:[[0,0],[.12,0],[.30,18],[.38,18],[.55,34],[.63,34],[.80,43],[.90,43],[1,43]],
  conversation:[[0,0],[.06,6],[.14,6],[.30,9],[.38,9],[.60,18],[.78,18],[.96,30],[1,32]],
  control:[[0,0],[.16,0],[.76,21],[.88,21],[1,21]],
  close:[[0,0],[.16,0],[.76,19],[.88,19],[1,19]],
 };
 return {...chapter,keyframes:map[chapter.id]??chapter.keyframes};
}
