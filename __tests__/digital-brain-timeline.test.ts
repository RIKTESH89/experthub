import { chapters } from "../src/components/home/digital-brain/timeline";
import { scenePerspectives } from "../src/components/home/digital-brain/source-perspectives";
import { retargetSource, retargetView, cameraOffsetScale, brainBounds, sourceBounds } from "../src/components/home/digital-brain/source-retarget";

test("the source's ten unequal slots retain one text-free elevation and nine visible pairs", () => {
  expect(scenePerspectives.map(slot => slot.scrollProgress.start)).toEqual([0, 11.9, 23.7, 35.6, 45.8, 52.5, 62.7, 69.5, 77.9, 84.7]);
  expect(scenePerspectives.map(slot => slot.scrollProgress.end)).toEqual([11.9, 23.7, 35.6, 45.8, 52.5, 62.7, 69.5, 77.9, 84.7, 100]);
  expect(scenePerspectives.map(slot => slot.position)).toEqual(["center", "left", "right", "top-left", "top-right", "center", "bottom-right", "bottom-left", "top", "center"]);
  expect(scenePerspectives.filter(slot => slot.hideText)).toEqual([scenePerspectives[4]]);
  expect(scenePerspectives[4].title).toBe("");
  expect(scenePerspectives[4].subtitle).toBe("");
  expect(scenePerspectives.filter(slot => !slot.hideText && slot.title && slot.subtitle)).toHaveLength(9);
});

test("subscriber story retains seven semantic sections and sparse AI-identified cinematic copy", () => {
  expect(chapters).toHaveLength(7);
  expect(chapters[0].title).toBe("Learn from expert Digital Twins.");
  expect(chapters[6].title).toBe("Start your next conversation.");
  expect(scenePerspectives[0].subtitle).toContain("AI twin");
  expect(scenePerspectives[3].subtitle).toContain("AI");
  expect(scenePerspectives[8].subtitle).toContain("access");
  expect(scenePerspectives.filter(slot => !slot.hideText).flatMap(slot => `${slot.title} ${slot.subtitle}`.split(/\s+/))).toHaveLength(87);
  // The approved opening uses longer words at the same word count.
  scenePerspectives.filter(slot => !slot.hideText).forEach(slot => expect(slot.title.length + slot.subtitle.length).toBeLessThanOrEqual(slot === scenePerspectives[0] ? 64 : 56));
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

test("camera retarget preserves every source viewing direction and distance ratio, including overhead", () => {
  for (const aspect of [1470 / 900, 390 / 844, .75]) {
    const scale = cameraOffsetScale * Math.max(1, Math.min(1.5, 1 / aspect));
    for (const slot of scenePerspectives) {
      const mapped = retargetView(slot.camera, slot.target, aspect);
      for (const axis of ["x", "y", "z"] as const) expect(mapped.camera[axis] - mapped.target[axis]).toBeCloseTo((slot.camera[axis] - slot.target[axis]) * scale, 12);
      const norm = (point: {x:number;y:number;z:number}) => Math.hypot(point.x, point.y, point.z);
      const offset = {x: slot.camera.x-slot.target.x,y: slot.camera.y-slot.target.y,z: slot.camera.z-slot.target.z};
      const transformed = {x:mapped.camera.x-mapped.target.x,y:mapped.camera.y-mapped.target.y,z:mapped.camera.z-mapped.target.z};
      expect(norm(transformed)/norm(offset)).toBeCloseTo(scale,12);
    }
  }
  const high = scenePerspectives[4], view = retargetView(high.camera, high.target, 1.5);
  const pitch = Math.atan2(view.camera.y-view.target.y,Math.hypot(view.camera.x-view.target.x,view.camera.z-view.target.z))*180/Math.PI;
  expect(pitch).toBeCloseTo(64.760598,5);
});
