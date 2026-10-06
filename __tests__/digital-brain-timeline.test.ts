import { chapters, evaluateStory } from "../src/components/home/digital-brain/timeline";

test("every chapter, including the final invitation, has a full reading hold", () => {
  for (let i = 0; i < chapters.length; i++) {
    for (const fraction of [.1, .35, .7]) {
      const frame = evaluateStory((i + fraction) / chapters.length);
      expect(frame.captionIndex).toBe(i);
      expect(frame.opacity).toBe(1);
      expect(frame.pose.yaw).toBe(chapters[i].yaw);
    }
  }
});

test("camera and caption are the same at a position approached forward or backward", () => {
  const forward = Array.from({ length: 801 }, (_, i) => evaluateStory(i / 800));
  const reverse = Array.from({ length: 801 }, (_, i) => evaluateStory(1 - i / 800)).reverse();
  forward.forEach((frame, i) => {
    expect(frame.pose.yaw).toBeCloseTo(reverse[i].pose.yaw, 12);
    expect(frame.pose.screenX).toBeCloseTo(reverse[i].pose.screenX, 12);
    expect(frame.opacity).toBeCloseTo(reverse[i].opacity, 12);
    if (frame.opacity > .1) expect(frame.captionIndex).toBe(reverse[i].captionIndex);
  });
});

test("caption exits before a text-free orbit, then enters with the next pose", () => {
  expect(evaluateStory(.7 / 7).opacity).toBe(1);
  expect(evaluateStory(.85 / 7).opacity).toBe(0);
  const incoming = evaluateStory(.98 / 7);
  expect(incoming.captionIndex).toBe(1);
  expect(incoming.opacity).toBeGreaterThan(.8);
  expect(incoming.pose.yaw).toBeCloseTo(chapters[1].yaw, 1);
});

test("pose remains continuous through all chapter boundaries and clamps overscroll", () => {
  for (let i = 1; i < chapters.length; i++) {
    const before = evaluateStory(i / 7 - 1e-8), after = evaluateStory(i / 7 + 1e-8);
    expect(before.pose.yaw).toBeCloseTo(after.pose.yaw, 8);
    expect(before.pose.screenX).toBeCloseTo(after.pose.screenX, 8);
  }
  expect(evaluateStory(-1).pose).toEqual(evaluateStory(0).pose);
  expect(evaluateStory(2).pose).toEqual(evaluateStory(1).pose);
});
