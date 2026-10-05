import fs from "fs";
import path from "path";
import ts from "typescript";
const source=fs.readFileSync(path.join(process.cwd(),"src/components/home/cinematic/scheduler.js"),"utf8");
const code=ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2020}}).outputText;
const functions:Record<string,any>={};new Function("exports",code)(functions);
const {frameWindow,nearestReadyFrame,canServeChapter}=functions;
const frames=Array.from({length:30},(_,i)=>`frame-${i}`);

test("current demand remains first with bounded unique future and reverse candidates",()=>{
 for(const direction of [-1,1]){
  const result=frameWindow(frames,10,direction<0?5:15,direction,2);
  expect(result[0]).toBe("frame-10");expect(result[1]).toBe(direction<0?"frame-5":"frame-15");
  expect(result.length).toBeLessThanOrEqual(5);expect(new Set(result).size).toBe(result.length);
 }
});
test("boundary prediction cannot create out-of-range URLs",()=>{
 for(const index of [0,29])for(const predicted of [-100,100]){
  const result=frameWindow(frames,index,predicted,index===0?1:-1,3);
  expect(result[0]).toBe(frames[index]);expect(result.every((x:string)=>frames.includes(x))).toBe(true);
  expect(result.length).toBeLessThanOrEqual(7);
 }
});
test("a completed previous chapter can cache without becoming the current display",()=>{
 const cache=new Map([["other-chapter",{}],["frame-8",{id:8}]]);
 const current=nearestReadyFrame(frames,10,cache,1,4);
 expect(current.key).toBe("frame-8");expect(current.item.id).toBe(8);
 expect(nearestReadyFrame(["new-chapter"],0,cache,1,4)).toBeUndefined();
});
test("latest exact demand wins over previously completed near frames",()=>{
 const cache=new Map([["frame-8",{}],["frame-12",{}],["frame-10",{latest:true}]]);
 expect(nearestReadyFrame(frames,10,cache,1,4).item.latest).toBe(true);
});
test("equal-distance fallback follows the new scroll direction",()=>{
 const cache=new Map([["frame-8",{}],["frame-12",{}]]);
 expect(nearestReadyFrame(frames,10,cache,1,4).key).toBe("frame-12");
 expect(nearestReadyFrame(frames,10,cache,-1,4).key).toBe("frame-8");
});
test("a source-reading hold requires its exact pose and far frames do not substitute",()=>{
 const cache=new Map([["frame-8",{}],["frame-18",{}]]);
 expect(nearestReadyFrame(frames,10,cache,1,0)).toBeUndefined();
 expect(nearestReadyFrame(frames,10,cache,1,1)).toBeUndefined();
 cache.set("frame-10",{});expect(nearestReadyFrame(frames,10,cache,1,0).key).toBe("frame-10");
});

 test("previously demanded work cannot occupy slots for an unrelated chapter",()=>{
   const current=["context-start","context-hold"];
   expect(canServeChapter("old-introduction-demand",current,["previous-poster","next-poster"])).toBe(false);
   expect(canServeChapter("context-start",current,["previous-poster","next-poster"])).toBe(true);
 });
 test("bounded adjacent poster work remains useful on either direction of travel",()=>{
   const current=["context-hold"];
   for(const anchor of ["previous-poster","current-poster","next-poster"])
     expect(canServeChapter(anchor,current,["previous-poster","current-poster","next-poster"])).toBe(true);
   expect(canServeChapter("distant-poster",current,["previous-poster","current-poster","next-poster"])).toBe(false);
 });
