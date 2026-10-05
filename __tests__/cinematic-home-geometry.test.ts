import fs from "fs";
import path from "path";
import ts from "typescript";
const source = fs.readFileSync(path.join(process.cwd(), "src/components/home/cinematic/timeline.js"), "utf8");
const code = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 } }).outputText;
const functions: Record<string, unknown> = {};
new Function("exports", code)(functions);
const progress = functions.chapterProgress as (scroll: number, top: number, height: number, viewport: number) => {phase: number; exit: number; pinnedDistance: number};
const frameAt = functions.frameAt as (phase: number, count: number, keyframes: number[][]) => number;
const opacity = functions.textOpacity as (phase: number, opening?:boolean) => number;
const manifest = JSON.parse(fs.readFileSync(path.join(process.cwd(), "public/uploads/cinematic-homepage/copy-alignment-v2-03cf60b6/frame-manifest.json"), "utf8"));

test("the repaired source-reading pose stays open through the reading hold and returns monotonically", () => {
  for (const variant of Object.values(manifest.variants) as Array<{chapters:Array<{id:string;poster:string;frames:string[];keyframes:number[][]}>}>) {
    const chapter = variant.chapters.find(c => c.id === "conversation")!;
    expect(chapter.poster).toBe("assets/" + (variant === manifest.variants.desktop ? "desktop" : "portrait") + "/frame-137.webp");
    for (const phase of [.55,.625,.7,.8,.84,.86]) expect(chapter.frames[frameAt(phase,chapter.frames.length,chapter.keyframes)]).toMatch(/frame-137\.webp$/);
    let previous = -1;
    for (let step=0;step<=100;step++) {
      const frame = frameAt(step/100,chapter.frames.length,chapter.keyframes);
      expect(frame).toBeGreaterThanOrEqual(previous); previous=frame;
    }
    expect(chapter.frames[previous]).toMatch(/frame-151\.webp$/);
  }
});

test("SSR and runtime share one versioned namespace while the original manifest remains available", () => {
  const assetConfig = fs.readFileSync(path.join(process.cwd(),"src/components/home/cinematic/asset-config.js"),"utf8");
  const runtime = fs.readFileSync(path.join(process.cwd(),"src/components/home/cinematic/sequence.js"),"utf8");
  const markup = fs.readFileSync(path.join(process.cwd(),"src/components/home/cinematic/home.tsx"),"utf8");
  expect(assetConfig).toContain("/uploads/cinematic-homepage/copy-alignment-v2-03cf60b6/");
  expect(runtime).toContain("import { assetRoot } from './asset-config.js'");
  expect(markup).toContain('import { assetRoot } from "./asset-config.js"');
  expect(fs.existsSync(path.join(process.cwd(),"public/uploads/cinematic-homepage/frame-manifest.json"))).toBe(true);
});

test.each([640, 700, 750, 812, 844, 900, 915])("all seven fixed overlays use the full chapter distance and retain authored reading holds at viewport %i", viewport => {
  for (const variant of Object.values(manifest.variants) as Array<{chapters: Array<{id:string;scrollRange:number[];frames:string[];keyframes:number[][]}>}>) {
    let top = 88;
    for (const chapter of variant.chapters) {
      const height = (functions.chapterLengths as Record<string,number>)[chapter.id] * viewport;
      const pinned = height;
      expect(pinned).toBeGreaterThan(0);
      const anchor = progress(top, top, height, viewport);
      expect(anchor.phase).toBe(0); expect(anchor.exit).toBe(0);
      for (const reading of [.15, .375, .625, .85]) {
        const scroll = top + reading * pinned;
        const point = progress(scroll, top, height, viewport);
        expect(point.phase).toBeCloseTo(reading, 9);
        expect(point.exit).toBe(0);
        expect(scroll).toBeLessThan(top + pinned);
        expect(opacity(point.phase)).toBeCloseTo(1, 8);
      }
      for (let i=1; i<chapter.keyframes.length; i++) {
        const [endPhase,endFrame] = chapter.keyframes[i], [startPhase,startFrame] = chapter.keyframes[i-1];
        if (endFrame === startFrame) {
          const point = progress(top + ((startPhase+endPhase)/2)*pinned, top,height,viewport);
          expect(frameAt(point.phase,chapter.frames.length,chapter.keyframes)).toBe(endFrame);
          expect(point.exit).toBe(0);
        }
      }
      const departure = progress(top+pinned,top,height,viewport);
      expect(departure.phase).toBeCloseTo(1,9);expect(departure.exit).toBeCloseTo(0,9);
      expect(frameAt(departure.phase,chapter.frames.length,chapter.keyframes)).toBe(chapter.frames.length-1);
      expect(opacity(departure.phase)).toBe(0);
      const exit = progress(top+pinned+viewport/2,top,height,viewport);
      expect(exit.phase).toBe(1);expect(exit.exit).toBeCloseTo(.5,9);
      expect(progress(top+height,top+height,height,viewport).phase).toBe(0);
      top += height;
    }
  }
});

test("fixed overlay timing remains tied to chapter distance rather than viewport-sized departure", () => {
  const top=88,height=1620;
  for(const viewport of [640,812,900]) {
    expect(progress(top+.85*height,top,height,viewport).phase).toBeCloseTo(.85,9);
    expect(progress(top+height,top,height,viewport).phase).toBe(1);
    expect(progress(top+height,top,height,viewport).pinnedDistance).toBe(height);
  }
});

test("text fades at fixed positions with full reading holds and identical forward/reverse phase values", () => {
  expect(opacity(0,true)).toBe(1);
  expect(opacity(0)).toBe(0);expect(opacity(.05)).toBeCloseTo(.5,9);
  expect(opacity(.1)).toBe(1);expect(opacity(.88)).toBe(1);
  expect(opacity(.94)).toBeCloseTo(.5,9);expect(opacity(1)).toBe(0);
  for(const p of [.025,.05,.15,.375,.625,.85,.94,.98])expect(opacity(p)).toBe(opacity(progress(p*1500,0,1500,640).phase));
});

test("homepage asset paths use the existing anonymous static boundary without exposing protected APIs", () => {
  const {isPublicRoute}=require("@/lib/route-access");
  for(const variant of Object.values(manifest.variants) as Array<{chapters:Array<{frames:string[];poster:string}>}>) {
    for(const chapter of variant.chapters) {
      for(const frame of [chapter.poster,...chapter.frames]) {
        const route="/uploads/cinematic-homepage/copy-alignment-v2-03cf60b6/"+frame;
        expect(isPublicRoute(route)).toBe(true);
        expect(fs.existsSync(path.join(process.cwd(),"public",route))).toBe(true);
      }
    }
  }
  for(const route of ["/uploads-admin/cinematic-homepage", "/api/uploads/cinematic-homepage", "/api/expert/knowledge", "/expert/knowledge"])expect(isPublicRoute(route)).toBe(false);
});
