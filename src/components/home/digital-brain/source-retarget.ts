// The source scene is a tall tower; the unchanged brain is a compact volume.
// Apply ONE fixed model-bounds affine transform to source camera AND target.
// All source knots/XYZ curves stay unchanged in source space. This transforms
// world angles and distances (documented), without inventing individual shots.
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
