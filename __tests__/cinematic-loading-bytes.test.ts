/** @jest-environment node */
import fs from 'fs';
import path from 'path';
import ts from 'typescript';
test('reported progress equals actual bytes written by both streams, without a synthetic timer',async()=>{
 const source=fs.readFileSync(path.join(process.cwd(),'src/components/home/cinematic/cache-delivery-v9/load-scene.js'),'utf8'),api:Record<string,any>={};
 new Function('exports',ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2020}}).outputText)(api);
 const old=global.fetch;const seen:number[]=[];
 global.fetch=jest.fn(async(url:any)=>{
  const chunks=url==='first'?[new Uint8Array([1,2]),new Uint8Array([3,4])]:[new Uint8Array([5]),new Uint8Array([6,7])];
  return {ok:true,body:{getReader:()=>({read:async()=>chunks.length?{done:false,value:chunks.shift()}:{done:true},releaseLock:()=>{}})}};
 }) as any;
 try{const result=await api.prepareSceneBytes({manifest:{totalBytes:7,parts:[{url:'first',offset:0,bytes:4},{url:'second',offset:4,bytes:3}]},signal:new AbortController().signal,onProgress:({loadedBytes,totalBytes}:any)=>{expect(totalBytes).toBe(7);seen.push(loadedBytes);}});
 expect([...new Uint8Array(result.bytes)]).toEqual([1,2,3,4,5,6,7]);expect(seen[0]).toBe(0);expect(seen.at(-1)).toBe(7);expect(seen).toHaveLength(5);expect(seen.every((n,i)=>n<=7&&(!i||n>seen[i-1]))).toBe(true);expect(result.transport.maxActive).toBe(2);
 }finally{global.fetch=old;}
});
