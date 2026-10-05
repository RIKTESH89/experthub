// The authored clip uses the raster manifest's seven ranges and reading holds.
// Interpolation remains fractional so live motion does not quantize to WebP frames.
export function authoredFrame(phase, chapter) {
    const start = Number(chapter.frames[0].match(/frame-(\d+)\./)?.[1]);
    const end = chapter.frames.length - 1;
    const keys = chapter.keyframes ?? [[0,0],[.12,0],[.32,0],[.72,end],[.88,end],[1,end]];
    const p = Math.max(0, Math.min(1, phase));
    for (let i = 1; i < keys.length; i++) {
        const [a, first] = keys[i-1], [b, last] = keys[i];
        if (p <= b) return start + first + (last-first) * (p-a)/(b-a);
    }
    return start + end;
}
