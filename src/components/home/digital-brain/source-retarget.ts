// The source scene is a tall tower; the unchanged brain is a compact volume.
// Map target locations into brain bounds; scale camera-to-target offsets
// uniformly to preserve the source viewing direction, pitch and distance ratios.
// Source coordinates and every timing interval remain unchanged.
export type SourceVector = { x: number; y: number; z: number };
export const sourceBounds = {
  center: [-.026283455190102556, 13.272128811726391, .3179698377374611],
  size: [5.572935378933888, 25.891032126388932, 7.321799977539959],
} as const;
export const brainBounds = {
  center: [.004501223564147949, -.07729429006576538, .04949992895126343],
  size: [1.0584893226623535, 1.1238867044448853, 1.3162224292755127],
} as const;
export const retargetScale = brainBounds.size.map((size, axis) => size / sourceBounds.size[axis]);
export function retargetSource(point: SourceVector): SourceVector {
  return {
    x: brainBounds.center[0] + (point.x - sourceBounds.center[0]) * retargetScale[0],
    y: brainBounds.center[1] + (point.y - sourceBounds.center[1]) * retargetScale[1],
    z: brainBounds.center[2] + (point.z - sourceBounds.center[2]) * retargetScale[2],
  };
}

// Calibrated model-bounds scale, constant for every shot. Compact volume replaces
// a tall tower; no per-shot fit, clamps, view offsets or invented camera poses.
export const cameraOffsetScale = Math.max(...brainBounds.size) / sourceBounds.size[1] * 1.8;
export function retargetView(camera: SourceVector, target: SourceVector, aspect: number) {
  const mappedTarget = retargetSource(target);
  const scale = cameraOffsetScale * Math.max(1, Math.min(1.5, 1 / aspect));
  return {
    target: mappedTarget,
    camera: {
      x: mappedTarget.x + (camera.x - target.x) * scale,
      y: mappedTarget.y + (camera.y - target.y) * scale,
      z: mappedTarget.z + (camera.z - target.z) * scale,
    },
  };
}
