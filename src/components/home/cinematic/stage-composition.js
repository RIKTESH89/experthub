// Preserve the logical focal composition while extending the physical frustum
// across the page. Secondary geometry and contact shadows can render past the
// copy gutters instead of meeting a hard embedded-canvas boundary.
export function expandProjection(matrix, rect, width, height) {
    const sx = rect.width / width, sy = rect.height / height;
    const cx = 2 * (rect.x + rect.width / 2) / width - 1;
    const cy = 1 - 2 * (rect.y + rect.height / 2) / height;
    matrix[0] *= sx; matrix[5] *= sy;
    matrix[8] = matrix[8] * sx - cx;
    matrix[9] = matrix[9] * sy - cy;
}
export function artExitOpacity(phase) {
    const t = Math.max(0, Math.min(1, (phase - .82) / .16));
    return 1 - t * t * (3 - 2 * t);
}
