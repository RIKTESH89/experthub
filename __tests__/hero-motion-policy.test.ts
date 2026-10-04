import { canEnhanceHero, HERO_MOTION_BUDGET } from "@/components/studio/hero-motion-policy";

const capable = { reducedMotion: false, saveData: false, webgl2: true };

describe("homepage motion eligibility", () => {
  it("allows capable devices without relying on optional browser hints", () => {
    expect(canEnhanceHero(capable)).toBe(true);
  });

  it.each([
    { reducedMotion: true }, { saveData: true }, { webgl2: false },
    { hardwareConcurrency: 2 }, { deviceMemory: 2 },
  ])("keeps the static diagram when %j", (restriction) => {
    expect(canEnhanceHero({ ...capable, ...restriction })).toBe(false);
  });

  it("caps the active sequence and framebuffer scale", () => {
    expect(HERO_MOTION_BUDGET.maxActiveSeconds).toBeLessThanOrEqual(5);
    expect(HERO_MOTION_BUDGET.maxPixelRatio).toBeLessThanOrEqual(1.5);
  });
});
