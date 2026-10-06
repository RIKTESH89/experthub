import { sideAboveView } from "../src/components/home/digital-brain/source-camera";
import { brainBounds } from "../src/components/home/digital-brain/source-retarget";
import { scenePerspectives } from "../src/components/home/digital-brain/source-perspectives";

const top = brainBounds.center[1] + brainBounds.size[1] / 2;
const aspects = [1470 / 900, 390 / 844, 360 / 640];

test("all intermediate camera poses stay above the model, look downward and retain wide/macro zoom", () => {
  for (const aspect of aspects) {
    const distances: number[] = [];
    for (let sample = 0; sample <= 2000; sample++) {
      const { camera, target } = sideAboveView(sample / 2000, aspect);
      expect(camera.y).toBeGreaterThan(top);
      expect(camera.y).toBeGreaterThan(target.y);
      distances.push(Math.hypot(camera.x - target.x, camera.y - target.y, camera.z - target.z));
    }
    expect(Math.max(...distances) / Math.min(...distances)).toBeGreaterThan(2.1);
  }
});

test("camera velocity is continuous at the original unequal GSAP intervals", () => {
  const epsilon = 1e-7;
  for (const aspect of aspects) {
    for (const shot of scenePerspectives.slice(0, -1)) {
      const progress = shot.scrollProgress.end / 100;
      const a = sideAboveView(progress - epsilon, aspect).camera;
      const b = sideAboveView(progress, aspect).camera;
      const c = sideAboveView(progress + epsilon, aspect).camera;
      for (const axis of ["x", "y", "z"] as const) {
        expect(Math.abs((c[axis] - b[axis]) / epsilon - (b[axis] - a[axis]) / epsilon)).toBeLessThan(.02);
      }
    }
  }
});

test("reverse traversal is exact and resizing has no aspect threshold", () => {
  const progress = [0, .119, .237, .356, .458, .525, .627, .695, .779, .847, 1];
  const forward = progress.map(p => sideAboveView(p, 390 / 844));
  const reverse = [...progress].reverse().map(p => sideAboveView(p, 390 / 844)).reverse();
  expect(reverse).toEqual(forward);
  for (const p of progress) {
    for (const aspect of [.46, .5625, .75, 1, 1.5, 1.6, 2]) {
      const a = sideAboveView(p, aspect - 1e-6).camera;
      const b = sideAboveView(p, aspect + 1e-6).camera;
      expect(Math.hypot(a.x - b.x, a.y - b.y, a.z - b.z)).toBeLessThan(.001);
    }
  }
});
