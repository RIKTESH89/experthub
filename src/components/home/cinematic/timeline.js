export const chapterLengths = { introduction: 1.25, contributions: 1.75, context: 1.65, construction: 2.25, conversation: 1.85, control: 1.4, close: 1.3 };

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
export function textOpacity(p) { if (p <= .85)
    return 1; return Math.max(0, 1 - (p - .85) / .13); }
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

// Geometry shared by runtime and regression tests. A full-viewport sticky panel
// begins departure one viewport before its containing chapter's bottom.
export function chapterProgress(scroll, top, height, viewport) {
    const pinnedDistance = Math.max(1, height - viewport);
    const distance = scroll - top;
    return {
        phase: Math.max(0, Math.min(1, distance / pinnedDistance)),
        exit: Math.max(0, Math.min(1, (distance - pinnedDistance) / Math.max(1, viewport))),
        pinnedDistance,
    };
}
