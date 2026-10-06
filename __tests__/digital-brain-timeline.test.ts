import { chapters } from "../src/components/home/digital-brain/timeline";
import { scenePerspectives } from "../src/components/home/digital-brain/source-perspectives";
import { retargetSource, brainBounds, sourceBounds } from "../src/components/home/digital-brain/source-retarget";

test("the source's ten unequal slots retain one text-free elevation and nine visible pairs", () => {
  expect(scenePerspectives.map(slot => slot.scrollProgress.start)).toEqual([0, 11.9, 23.7, 35.6, 45.8, 52.5, 62.7, 69.5, 77.9, 84.7]);
  expect(scenePerspectives.map(slot => slot.scrollProgress.end)).toEqual([11.9, 23.7, 35.6, 45.8, 52.5, 62.7, 69.5, 77.9, 84.7, 100]);
  expect(scenePerspectives.map(slot => slot.position)).toEqual(["center", "left", "right", "top-left", "top-right", "center", "bottom-right", "bottom-left", "top", "center"]);
  expect(scenePerspectives.filter(slot => slot.hideText)).toEqual([scenePerspectives[4]]);
  expect(scenePerspectives[4].title).toBe("");
  expect(scenePerspectives[4].subtitle).toBe("");
  expect(scenePerspectives.filter(slot => !slot.hideText && slot.title && slot.subtitle)).toHaveLength(9);
});

test("all seven required semantic headings appear in the source-shaped narrative", () => {
  expect(chapters).toHaveLength(7);
  chapters.forEach(chapter => expect(scenePerspectives.some(slot => slot.title === chapter.title)).toBe(true));
  expect(scenePerspectives[6].subtitle).toContain("Citations do not guarantee correctness");
  expect(scenePerspectives[7].subtitle).toContain("manually correct");
  expect(scenePerspectives[8].subtitle).toContain("unshared");
});

test("bounds retarget maps both centers and axis extents without deforming the model", () => {
  const point = { x: sourceBounds.center[0], y: sourceBounds.center[1], z: sourceBounds.center[2] };
  expect(retargetSource(point)).toEqual({ x: brainBounds.center[0], y: brainBounds.center[1], z: brainBounds.center[2] });
  const corner = retargetSource({ x: point.x + sourceBounds.size[0] / 2, y: point.y + sourceBounds.size[1] / 2, z: point.z + sourceBounds.size[2] / 2 });
  ["x", "y", "z"].forEach((key, axis) => expect(corner[key as keyof typeof corner]).toBeCloseTo(brainBounds.center[axis] + brainBounds.size[axis] / 2, 12));
});

test("one affine retarget preserves linear camera/target travel and exact reverse endpoints", () => {
  for (let i = 1; i < scenePerspectives.length; i++) {
    for (const property of ["camera", "target"] as const) {
      const start = scenePerspectives[i - 1][property], end = scenePerspectives[i][property];
      for (const t of [0, .1, .37, .8, 1]) {
        const a = retargetSource(start), b = retargetSource(end);
        const mixed = retargetSource({ x: start.x + (end.x - start.x) * t, y: start.y + (end.y - start.y) * t, z: start.z + (end.z - start.z) * t });
        for (const key of ["x", "y", "z"] as const) expect(mixed[key]).toBeCloseTo(a[key] + (b[key] - a[key]) * t, 12);
      }
    }
  }
});
