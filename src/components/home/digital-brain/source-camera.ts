import { brainBounds, type SourceVector } from "./source-retarget";
import { scenePerspectives } from "./source-perspectives";

// Camera changes share the source GSAP progress and intervals. Caption placement,
// SplitText character effects, scrub and scrolling remain in source-motion.ts.
const knots = [0, ...scenePerspectives.map(shot => shot.scrollProgress.end / 100)];
const shots = [
  { azimuth: -85, radius: 2.60, height: .45, targetHeight: .04 },
  { azimuth:   5, radius: 2.20, height: .40, targetHeight: .00 },
  { azimuth:  30, radius: 1.35, height: .28, targetHeight: .02 },
  { azimuth: -65, radius:  .72, height: .18, targetHeight: .06 },
  { azimuth: -95, radius: 1.10, height: .30, targetHeight: .12 },
  { azimuth:  20, radius: 2.30, height: .75, targetHeight: .04 },
  { azimuth:  50, radius: 1.80, height: .55, targetHeight: .08 },
  { azimuth:  95, radius: 1.35, height: .38, targetHeight: .03 },
  { azimuth: 145, radius:  .88, height: .23, targetHeight: -.03 },
  { azimuth: 205, radius: 2.35, height: .48, targetHeight: .01 },
  { azimuth: 255, radius: 2.20, height: .38, targetHeight: .00 },
] as const;

// Shape-preserving cubic Hermite slopes (PCHIP). Positive radius and height
// controls stay within their interval's endpoints, including between keyframes.
// Shared knot derivatives give continuous velocity in both scroll directions.
function curve(values: readonly number[]) {
  const intervals = knots.slice(1).map((end, index) => end - knots[index]);
  const secants = intervals.map((width, index) => (values[index + 1] - values[index]) / width);
  const slopes = values.map(() => 0);
  for (let i = 1; i < values.length - 1; i++) {
    const previous = secants[i - 1], next = secants[i];
    if (previous * next <= 0) continue;
    const w1 = 2 * intervals[i] + intervals[i - 1];
    const w2 = intervals[i] + 2 * intervals[i - 1];
    slopes[i] = (w1 + w2) / (w1 / previous + w2 / next);
  }
  function endpoint(h0: number, h1: number, d0: number, d1: number) {
    const slope = ((2 * h0 + h1) * d0 - h0 * d1) / (h0 + h1);
    if (slope * d0 <= 0) return 0;
    return d0 * d1 <= 0 && Math.abs(slope) > Math.abs(3 * d0) ? 3 * d0 : slope;
  }
  const last = intervals.length - 1;
  slopes[0] = endpoint(intervals[0], intervals[1], secants[0], secants[1]);
  slopes[values.length - 1] = endpoint(intervals[last], intervals[last - 1], secants[last], secants[last - 1]);
  return (progress: number) => {
    if (progress <= 0) return values[0];
    if (progress >= 1) return values[values.length - 1];
    const index = knots.findIndex((end, i) => i > 0 && progress <= end) - 1;
    const width = intervals[index], t = (progress - knots[index]) / width;
    const t2 = t * t, t3 = t2 * t;
    return (2 * t3 - 3 * t2 + 1) * values[index]
      + (t3 - 2 * t2 + t) * width * slopes[index]
      + (-2 * t3 + 3 * t2) * values[index + 1]
      + (t3 - t2) * width * slopes[index + 1];
  };
}

const azimuthAt = curve(shots.map(shot => shot.azimuth));
const radiusAt = curve(shots.map(shot => shot.radius));
const heightAt = curve(shots.map(shot => shot.height));
const targetHeightAt = curve(shots.map(shot => shot.targetHeight));
const modelTop = brainBounds.center[1] + brainBounds.size[1] / 2;

export function sideAboveView(progress: number, aspect: number): { camera: SourceVector; target: SourceVector } {
  const p = Number.isFinite(progress) ? Math.min(1, Math.max(0, progress)) : 0;
  const safeAspect = Number.isFinite(aspect) && aspect > 0 ? aspect : 1;
  // Continuous portrait framing; no aspect threshold or abrupt height clamp.
  const framing = Math.hypot(1, .8 / safeAspect) / Math.hypot(1, .8 / 1.6);
  const angle = azimuthAt(p) * Math.PI / 180;
  const radius = radiusAt(p) * framing;
  const target = {
    x: brainBounds.center[0],
    y: brainBounds.center[1] + targetHeightAt(p),
    z: brainBounds.center[2],
  };
  return {
    target,
    camera: {
      x: target.x + Math.sin(angle) * radius,
      // A positive, bounded cubic clearance above the anatomical model's top
      // guarantees an upper-side view throughout every interpolated interval.
      y: modelTop + heightAt(p) * framing,
      z: target.z + Math.cos(angle) * radius,
    },
  };
}
