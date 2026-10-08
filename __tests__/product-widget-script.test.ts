/** @jest-environment jsdom */
import fs from 'node:fs';
import path from 'node:path';
const source=fs.readFileSync(path.join(process.cwd(),'public/embed/widget.js'),'utf8');
async function load(ok=true){
 document.body.innerHTML='';localStorage.clear();const script=document.createElement('script');script.src='http://localhost/embed/widget.js';script.setAttribute('data-api-key','synthetic');Object.defineProperty(document,'currentScript',{configurable:true,value:script});
 global.fetch=jest.fn().mockResolvedValue({ok,json:async()=>({primaryColor:'#123456',position:'bottom-right',greeting:'Synthetic greeting',expertName:'Synthetic expert'})});new Function(source)();await Promise.resolve();await Promise.resolve();await Promise.resolve();await Promise.resolve();
}
it('exposes a keyboard launcher, bounded phone panel, labeled input and escape focus return',async()=>{
 await load();const launcher=document.getElementById('tw-widget-btn') as HTMLButtonElement;expect(launcher.tagName).toBe('BUTTON');expect(launcher.getAttribute('aria-label')).toBe('Open AI Twin chat');launcher.click();const panel=document.getElementById('tw-widget-chat')!;expect(panel.getAttribute('role')).toBe('dialog');expect(panel.style.maxWidth).toContain('100vw');expect(panel.style.maxHeight).toContain('100dvh');expect(document.activeElement?.getAttribute('aria-label')).toBe('Question for AI Twin');panel.dispatchEvent(new KeyboardEvent('keydown',{key:'Escape',bubbles:true}));expect(document.getElementById('tw-widget-chat')).toBeNull();expect(document.activeElement).toBe(launcher);expect(launcher.getAttribute('aria-expanded')).toBe('false');
});
it('does not create a broken launcher when configuration access is denied',async()=>{
 const warning=jest.spyOn(console,'warn').mockImplementation(()=>{});await load(false);await Promise.resolve();expect(document.getElementById('tw-widget-btn')).toBeNull();warning.mockRestore();
});

it('does not duplicate the launcher if the installation script runs twice',async()=>{
 await load();new Function(source)();await Promise.resolve();await Promise.resolve();await Promise.resolve();await Promise.resolve();expect(document.querySelectorAll('#tw-widget-btn')).toHaveLength(1);
});
