/** @jest-environment jsdom */
import fs from 'fs';
import path from 'path';
import ts from 'typescript';
const code=ts.transpileModule(fs.readFileSync(path.join(process.cwd(),'src/components/home/cinematic/loading-screen.js'),'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2020}}).outputText;
const api:Record<string,any>={};new Function('exports',code)(api);
let frames:Array<()=>void>;
beforeEach(()=>{document.body.innerHTML='<div id="root"><button id="motion">Motion</button></div>';frames=[];jest.spyOn(window,'requestAnimationFrame').mockImplementation(fn=>{frames.push(()=>fn(0));return frames.length});jest.spyOn(window,'cancelAnimationFrame').mockImplementation(()=>{});});
afterEach(()=>jest.restoreAllMocks());
function make(){return api.mountLoadingScreen(document.getElementById('root'),{onStatic:jest.fn(),onRetry:jest.fn()});}
test('bytes are exact, announcements are stage-only, and preparation is indeterminate',()=>{
 const ui=make();ui.start();const node=document.getElementById('art-loading')!,bar=node.querySelector('progress')!;
 expect(bar.hasAttribute('value')).toBe(false);ui.progress({loadedBytes:100,totalBytes:1000});frames.shift()!();expect(bar.value).toBe(100);expect(bar.max).toBe(1000);
 const announcement=node.querySelector('.loading-announcement')!.textContent;
 ui.progress({loadedBytes:400,totalBytes:1000});frames.shift()!();expect(bar.value).toBe(400);expect(node.querySelector('.loading-announcement')!.textContent).toBe(announcement);
 ui.received();expect(bar.hasAttribute('value')).toBe(false);expect(node.dataset.state).toBe('preparing');ui.complete();expect(node.dataset.state).toBe('ready');expect(node.getAttribute('aria-hidden')).toBe('true');ui.dispose();
});
test('a late chunk cannot revive failure, and a focused action stays usable at readiness',()=>{
 const ui=make();ui.start();ui.failure();ui.progress({loadedBytes:900,totalBytes:1000});expect(frames).toHaveLength(0);expect(document.getElementById('art-loading')!.dataset.state).toBe('error');
 ui.start();ui.focusStatic();const focused=document.activeElement;ui.complete();expect(document.activeElement).toBe(focused);expect(document.getElementById('art-loading')!.dataset.focused).toBe('true');
 document.getElementById('motion')!.focus();expect(document.getElementById('art-loading')!.hidden).toBe(true);ui.dispose();expect(document.getElementById('art-loading')).toBeNull();
});
test('off-story byte updates remain hidden and returning restores the current stage',()=>{
 const ui=make();ui.setVisible(false);ui.start();ui.progress({loadedBytes:120,totalBytes:1000});frames.shift()!();
 const node=document.getElementById('art-loading')!;expect(node.hidden).toBe(true);expect(node.dataset.state).toBe('receiving');
 ui.setVisible(true);expect(node.hidden).toBe(false);expect(node.querySelector('progress')!.value).toBe(120);ui.failure();ui.setVisible(false);expect(node.hidden).toBe(true);ui.dispose();
});
