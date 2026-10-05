import fs from 'fs';import path from 'path';import ts from 'typescript';
const api:Record<string,any>={};new Function('exports',ts.transpileModule(fs.readFileSync(path.join(process.cwd(),'src/components/home/cinematic/sequential-text.js'),'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS}}).outputText)(api);
test('outgoing target reaches zero before the incoming target gains opacity',()=>{
 const fade=api.createSequentialFade('a');fade.sample('b',0);
 for(let t=0;t<280;t+=4){const s=fade.sample('b',t);expect(s.displayed).toBe('a');expect(s.opacity).toBeGreaterThanOrEqual(0);}
 expect(fade.sample('b',280)).toMatchObject({displayed:'b',opacity:0,leg:'in'});
 expect(fade.sample('b',640)).toMatchObject({displayed:'b',opacity:1,moving:false});
});
test('new pending targets collapse without restarting the exit',()=>{
 const fade=api.createSequentialFade('a');fade.sample('b',0);fade.sample('c',100);fade.sample('d',220);
 expect(fade.sample('d',280)).toMatchObject({displayed:'d',opacity:0});
 expect(fade.sample('d',640)).toMatchObject({displayed:'d',opacity:1,moving:false});
});
test('reverse toward shown wording preserves opacity and cancels the exit',()=>{
 const fade=api.createSequentialFade('a');fade.sample('b',0);const before=fade.sample('b',100);const reverse=fade.sample('a',100);
 expect(reverse.displayed).toBe('a');expect(reverse.opacity).toBe(before.opacity);expect(reverse.leg).toBe('in');
 expect(fade.sample('a',500)).toMatchObject({displayed:'a',opacity:1,moving:false});
});
test('an interrupted entrance exits continuously before showing its latest target',()=>{
 const fade=api.createSequentialFade('a');fade.sample('b',0);fade.sample('b',280);const before=fade.sample('b',360),after=fade.sample('c',360);
 expect(after.displayed).toBe('b');expect(after.opacity).toBe(before.opacity);expect(after.leg).toBe('out');
 expect(fade.sample('c',1000)).toMatchObject({displayed:'c',opacity:1,moving:false});
});
test('late clocks carry elapsed time through both legs and reset settles immediately',()=>{
 const fade=api.createSequentialFade(0);fade.sample(1,0);expect(fade.sample(2,2000)).toMatchObject({displayed:2,opacity:1,moving:false});
 fade.sample(3,2010);fade.reset(4);expect(fade.sample(4,2020)).toMatchObject({displayed:4,opacity:1,moving:false});
});
