import fs from "fs";
import path from "path";
import ts from "typescript";
const source = fs.readFileSync(path.join(process.cwd(), "src/components/home/cinematic/timeline.js"), "utf8");
const code = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 } }).outputText;
const functions: Record<string, unknown> = {};
new Function("exports", code)(functions);
const progress = functions.chapterProgress as (scroll: number, top: number, height: number, viewport: number) => {phase: number; exit: number; pinnedDistance: number};
const frameAt = functions.frameAt as (phase: number, count: number, keyframes: number[][]) => number;
const opacity = functions.textOpacity as (phase: number) => number;
const manifest = JSON.parse(fs.readFileSync(path.join(process.cwd(), "public/uploads/cinematic-homepage/frame-manifest.json"), "utf8"));

test.each([900, 844, 812])("all seven timelines finish holds, final pose and text exit before sticky departure at viewport %i", viewport => {
  for (const variant of Object.values(manifest.variants) as Array<{chapters: Array<{id:string;scrollRange:number[];frames:string[];keyframes:number[][]}>}>) {
    let top = 88;
    for (const chapter of variant.chapters) {
      const height = (functions.chapterLengths as Record<string,number>)[chapter.id] * viewport;
      const pinned = height - viewport;
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

test("pinned timing uses the rendered panel height when small viewport units differ from the layout viewport", () => {
  const top=88, chapterHeight=1620, actualPanelHeight=812;
  const point=progress(top+.85*(chapterHeight-actualPanelHeight),top,chapterHeight,actualPanelHeight);
  expect(point.phase).toBeCloseTo(.85,9);expect(point.exit).toBe(0);
  expect(point.pinnedDistance).toBe(808);
  const departure=progress(top+808,top,chapterHeight,actualPanelHeight);
  expect(departure.phase).toBe(1);expect(opacity(departure.phase)).toBe(0);
});

test("homepage asset paths use the existing anonymous static boundary without exposing protected APIs", () => {
  const {isPublicRoute}=require("@/lib/route-access");
  for(const variant of Object.values(manifest.variants) as Array<{chapters:Array<{frames:string[];poster:string}>}>) {
    for(const chapter of variant.chapters) {
      for(const frame of [chapter.poster,...chapter.frames]) {
        const route="/uploads/cinematic-homepage/"+frame;
        expect(isPublicRoute(route)).toBe(true);
        expect(fs.existsSync(path.join(process.cwd(),"public",route))).toBe(true);
      }
    }
  }
  for(const route of ["/uploads-admin/cinematic-homepage", "/api/uploads/cinematic-homepage", "/api/expert/knowledge", "/expert/knowledge"])expect(isPublicRoute(route)).toBe(false);
});
