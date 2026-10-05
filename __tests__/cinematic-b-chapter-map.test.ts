import fs from 'fs';import path from 'path';import ts from 'typescript';
const api:Record<string,any>={};new Function('exports',ts.transpileModule(fs.readFileSync(path.join(process.cwd(),'src/components/home/cinematic/b-chapter-map.js'),'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS}}).outputText)(api);
const ids=['introduction','contributions','context','construction','conversation','control','close'];
test('B app frame mapping is monotone with exact seven-chapter seams and reversibility',()=>{
 let last=0;for(let i=0;i<ids.length;i++){const chapter={id:ids[i]};if(i)expect(api.bChapterFrame(0,chapter)).toBe(last);for(let j=0;j<=100;j++){const f=api.bChapterFrame(j/100,chapter);expect(f).toBeGreaterThanOrEqual(last);last=f;expect(api.bChapterFrame(j/100,chapter)).toBe(f);} }expect(last).toBe(191);
});
test('context reaches physical source reading before construction and answer retains its hold',()=>{
 expect(api.bChapterFrame(.6,{id:'context'})).toBe(137);expect(api.bChapterFrame(.95,{id:'context'})).toBe(137);expect(api.bChapterFrame(.2,{id:'conversation'})).toBe(152);expect(api.bChapterFrame(.78,{id:'conversation'})).toBe(152);
});
