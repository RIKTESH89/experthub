/** Dependency-free contract for the optional homepage WebGL enhancement. */
export const HERO_MOTION_BUDGET = {
  maxPixelRatio: 1.5,
  framesPerSecond: 30,
  maxDrawCalls: 16,
  maxTriangles: 12_000,
  maxPointerTiltRadians: 0.08,
  maxActiveSeconds: 5,
} as const;

export interface HeroMotionCapabilities {
  reducedMotion: boolean;
  saveData: boolean;
  hardwareConcurrency?: number;
  deviceMemory?: number;
  webgl2: boolean;
}

export function canEnhanceHero(capabilities: HeroMotionCapabilities): boolean {
  return capabilities.webgl2 && !capabilities.reducedMotion && !capabilities.saveData
    && (capabilities.hardwareConcurrency === undefined || capabilities.hardwareConcurrency > 2)
    && (capabilities.deviceMemory === undefined || capabilities.deviceMemory > 2);
}

/** Runtime implementation will be lazy-imported only after eligibility checks. */
export interface HeroSceneController {
  setPalette(palette: { primary: string; border: string; surface: string }): void;
  setPointer(normalizedX: number, normalizedY: number): void;
  setActive(active: boolean): void;
  resize(width: number, height: number): void;
  dispose(): void;
}
