import fs from 'fs';import path from 'path';import ts from 'typescript';
const api:Record<string,any>={};new Function('exports',ts.transpileModule(fs.readFileSync(path.join(process.cwd(),'src/components/home/cinematic/text-beats.js'),'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS}}).outputText)(api);
test.each(['contributions','context','construction','conversation'])('semantic %s clauses settle at authored reading poses and reverse identically',id=>{
 for(const [i,p]of [.1,.34,.59,.84].entries()){const beat=api.textBeat(id,p,'original');expect(beat.index).toBe(i);expect(beat.opacity).toBe(1);}
 for(const boundary of [.25,.5,.75]){expect(api.textBeat(id,boundary,'original').opacity).toBe(0);expect(api.textBeat(id,boundary-.0001,'original').index+1).toBe(api.textBeat(id,boundary+.0001,'original').index);}
 const positions=[.1,.23,.25,.28,.375,.5,.625,.75,.85];expect(positions.map(p=>api.textBeat(id,p,'original')).reverse()).toEqual(positions.slice().reverse().map(p=>api.textBeat(id,p,'original')));
});
test('scripted source wording and original static copy remain distinct',()=>{
 expect(api.textBeat('conversation',.625,'original').text).toBe('Scripted answer: Begin with a clear question.');expect(api.textBeat('conversation',.85,'original').text).toContain('sources 01 and 04');
 expect(api.storyCopyLines('close','original')[0]).toBe('original');expect(api.textBeat('unknown',.9,'original').text).toBe('original');
});
