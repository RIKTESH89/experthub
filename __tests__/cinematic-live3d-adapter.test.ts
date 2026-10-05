/** @jest-environment jsdom */
import fs from 'fs';
import path from 'path';
import ts from 'typescript';
function moduleAt(name: string, requireModule: (id: string) => unknown = () => ({})) {
  const source = fs.readFileSync(path.join(process.cwd(),'src/components/home/cinematic',name),'utf8');
  const code = ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2020}}).outputText;
  const exports: Record<string,any> = {};
  new Function('exports','require',code)(exports,requireModule);
  return exports;
}
const chapters = JSON.parse(fs.readFileSync(path.join(process.cwd(),'public/uploads/cinematic-homepage/copy-alignment-v2-03cf60b6/frame-manifest.json'),'utf8')).variants.desktop.chapters;
const timeline = moduleAt('live3d-timeline.js');
const bMap = moduleAt('b-chapter-map.js');
const raster = moduleAt('timeline.js');
test('live frame mapping preserves all seven authored ranges, shared seams and reading holds',()=>{
  expect(chapters).toHaveLength(7);
  chapters.forEach((chapter: any,i: number)=>{
    const start = Number(chapter.frames[0].match(/frame-(\d+)/)[1]);
    for (let step=0;step<=100;step++) {
      const p=step/100;
      expect(Math.abs(timeline.authoredFrame(p,chapter)-start-raster.frameAt(p,chapter.frames.length,chapter.keyframes))).toBeLessThanOrEqual(.500001);
    }
    if(i)expect(timeline.authoredFrame(0,chapter)).toBe(timeline.authoredFrame(1,chapters[i-1]));
    chapter.keyframes.forEach(([end,frame]:number[],j:number)=>{
      if(j&&frame===chapter.keyframes[j-1][1])expect(timeline.authoredFrame((end+chapter.keyframes[j-1][0])/2,chapter)).toBe(start+frame);
    });
  });
  expect(timeline.authoredFrame(1,chapters[6])).toBe(191);
  expect(timeline.authoredFrame(.7,chapters[4])).toBe(137);
  expect(timeline.authoredFrame(0,chapters[0])).toBe(0);
  expect(Number.isInteger(timeline.authoredFrame(.255,chapters[3]))).toBe(false);
});
function fixture() {
  document.body.innerHTML='<div><header class="site-nav"></header><section id="introduction"><h1 class="title-lane">Title</h1><p class="body-lane">Copy</p></section><div id="live-art" hidden><canvas id="live-artwork"></canvas></div><p id="runtime-status"></p></div>';
  return document.body.firstElementChild as HTMLElement;
}
async function settle(){for(let i=0;i<12;i++)await Promise.resolve();}
function adapter(create: jest.Mock) {
  return moduleAt('live3d-adapter.js',id=>id.includes('config')?{artworkAssets:{version:'test'}}:id.includes('b-chapter-map')?bMap:id.includes('timeline')?timeline:{createArtwork:create}).mountLiveArtwork;
}
const state={cinematic:true,chapter:chapters[0],phase:.375,portrait:true,visible:true};
test('static eligibility does not import/create WebGL and disposal aborts a late renderer',async()=>{
  let resolve: (value:any)=>void=()=>{};
  const create=jest.fn((_options: any)=>new Promise(r=>{resolve=r})),update=jest.fn(),root=fixture();
  const instance=adapter(create)(root,update);
  instance.update({...state,cinematic:false});await settle();expect(create).not.toHaveBeenCalled();
  instance.update(state);await settle();expect(create).toHaveBeenCalledTimes(1);
  const abort=create.mock.calls[0][0].signal;
  instance.dispose();expect(abort.aborted).toBe(true);
  const stale={dispose:jest.fn()};resolve(stale);await settle();expect(stale.dispose).toHaveBeenCalledTimes(1);expect(root.dataset.artwork).toBe('raster');
});
test('a readiness failure retains raster, and a fresh motion cycle can retry',async()=>{
  const controller={dispose:jest.fn(),setFrame:jest.fn(),setComposition:jest.fn(),setTheme:jest.fn(),setVisible:jest.fn(),resize:jest.fn()};
  const create=jest.fn().mockRejectedValueOnce(new Error('missing scene')).mockImplementationOnce((options:any)=>{options.onMetrics({frames:1,frame:options.frame,dark:false,composition:options.composition,portrait:options.portrait});return Promise.resolve(controller)});
  const root=fixture(),instance=adapter(create)(root,jest.fn());
  instance.update(state);await settle();expect(root.dataset.artwork).toBe('raster');expect(root.querySelector<HTMLElement>('#live-artwork')!.dataset.error).toBe('missing scene');
  instance.update(state);await settle();expect(create).toHaveBeenCalledTimes(1);
  instance.setMode(false);instance.update(state);await settle();expect(root.dataset.artwork).toBe('live');expect(controller.setFrame).toHaveBeenCalled();
  instance.dispose();expect(controller.dispose).toHaveBeenCalledTimes(1);
});
test('a decoded loading poster cannot revive after motion is disabled',async()=>{
  let ready:()=>void=()=>{};
  const old=HTMLImageElement.prototype.decode;
  HTMLImageElement.prototype.decode=jest.fn(()=>new Promise<void>(resolve=>{ready=resolve}));
  const root=fixture(),instance=adapter(jest.fn(()=>new Promise(()=>{})))(root,jest.fn());
  try {instance.update(state);await settle();instance.setMode(false);ready();await settle();
    expect(root.dataset.bPoster).toBeUndefined();expect(root.querySelector<HTMLImageElement>('#b-loading-poster')!.hidden).toBe(true);
  } finally {instance.dispose();HTMLImageElement.prototype.decode=old;}
});
test('only the latest loading poster can become visible after a theme change',async()=>{
  const resolve:Array<()=>void>=[],old=HTMLImageElement.prototype.decode;
  HTMLImageElement.prototype.decode=jest.fn(()=>new Promise<void>(r=>{resolve.push(r)}));
  const root=fixture(),instance=adapter(jest.fn(()=>new Promise(()=>{})))(root,jest.fn());
  try {instance.update(state);await settle();document.documentElement.classList.add('dark');await settle();
    expect(resolve).toHaveLength(2);resolve[0]();await settle();expect(root.dataset.bPoster).toBeUndefined();
    resolve[1]();await settle();expect(root.dataset.bPoster).toBe('ready');expect(root.querySelector<HTMLImageElement>('#b-loading-poster')!.src).toContain('dark.png');
  } finally {instance.dispose();document.documentElement.classList.remove('dark');HTMLImageElement.prototype.decode=old;}
});
