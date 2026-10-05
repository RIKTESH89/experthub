import fs from 'fs';import path from 'path';import ts from 'typescript';
const api:Record<string,any>={};new Function('exports',ts.transpileModule(fs.readFileSync(path.join(process.cwd(),'src/components/home/cinematic/text-beats.js'),'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS}}).outputText)(api);
test.each(['contributions','context','construction','conversation'])('semantic %s clauses settle at authored reading poses and reverse identically',id=>{
 for(const [i,p]of [.1,.34,.59,.84].entries()){const beat=api.textBeat(id,p,'original');expect(beat.index).toBe(i);expect(beat.opacity).toBe(1);}
 for(const boundary of [.25,.5,.75]){const mid=api.textBeat(id,boundary,'original');expect(mid.opacity).toBe(1);expect(mid.weights.filter((w:number)=>w>0)).toEqual([1]);expect(api.textBeat(id,boundary-.0001,'original').index+1).toBe(api.textBeat(id,boundary+.0001,'original').index);}
 const positions=[.1,.23,.25,.28,.375,.5,.625,.75,.85];expect(positions.map(p=>api.textBeat(id,p,'original')).reverse()).toEqual(positions.slice().reverse().map(p=>api.textBeat(id,p,'original')));
});
test('scripted source wording and original static copy remain distinct',()=>{
 expect(api.textBeat('conversation',.625,'original').text).toBe('Scripted answer: Begin with a clear question.');expect(api.textBeat('conversation',.85,'original').text).toContain('sources 01 and 04');
 expect(api.storyCopyLines('close','original')[0]).toBe('original');expect(api.textBeat('unknown',.9,'original').text).toBe('original');
});

test('clause and chapter blends preserve nonblank complementary weights in both directions',()=>{
 for(let i=0;i<=1000;i++){const p=i/1000,beat=api.textBeat('conversation',p,'original');expect(beat.weights.reduce((a:number,b:number)=>a+b,0)).toBeCloseTo(1,8);expect(Math.max(...beat.weights)).toBeGreaterThanOrEqual(.5);}
 for(let y=900;y<=1100;y+=4){const old=api.chapterTextOpacity(y,0,1000,800,true,false),next=api.chapterTextOpacity(y,1000,2000,800,false,false);expect(old+next).toBeCloseTo(1,8);}
});
