/** @jest-environment jsdom */
import fs from 'node:fs';
import path from 'node:path';
const source=fs.readFileSync(path.join(process.cwd(),'public/embed/widget.js'),'utf8');
async function load(ok=true, config:Record<string,unknown>={}){
 document.body.innerHTML='';localStorage.clear();const script=document.createElement('script');script.src='http://localhost/embed/widget.js';script.setAttribute('data-api-key','synthetic');Object.defineProperty(document,'currentScript',{configurable:true,value:script});
 global.fetch=jest.fn().mockResolvedValue({ok,json:async()=>({primaryColor:'#123456',position:'bottom-right',greeting:'Synthetic greeting',expertName:'Synthetic expert',...config})});new Function(source)();await Promise.resolve();await Promise.resolve();await Promise.resolve();await Promise.resolve();
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

it('renders markup-like names and greetings as literal text and rejects injected color declarations',async()=>{
 const name='<img src=x onerror="document.documentElement.dataset.widgetExecuted=1"> Dr. A & B <b>expert</b>';
 await load(true,{expertName:name,greeting:'<script>synthetic only</script>',primaryColor:'red;position:absolute;z-index:1'});
 (document.getElementById('tw-widget-btn') as HTMLButtonElement).click();
 expect(document.getElementById('tw-expert-name')?.textContent).toBe(name);
 expect(document.querySelectorAll('#tw-widget-chat img, #tw-widget-chat script, #tw-widget-chat [onerror]')).toHaveLength(0);
 expect(document.getElementById('tw-msgs')?.textContent).toBe('<script>synthetic only</script>');
 expect(document.getElementById('tw-widget-btn')?.style.backgroundColor).toBe('rgb(99, 102, 241)');
 expect(document.getElementById('tw-send')?.style.backgroundColor).toBe('rgb(99, 102, 241)');
});
it('preserves legitimate names/colors, and constructs same-origin subscription links without HTML interpolation',async()=>{
 await load(true,{expertName:'Dr. A & B — <literal>',primaryColor:'#365449'});
 (document.getElementById('tw-widget-btn') as HTMLButtonElement).click();
 expect(document.getElementById('tw-expert-name')?.textContent).toBe('Dr. A & B — <literal>');
 expect(document.getElementById('tw-send')?.style.backgroundColor).toBe('rgb(54, 84, 73)');
 global.fetch=jest.fn().mockResolvedValue({status:403,headers:new Headers(),json:async()=>({subscribeUrl:'/subscriber/experts/synthetic?name="<img src=x onerror=alert(1)>'})});
 (document.getElementById('tw-input') as HTMLInputElement).value='Synthetic question';(document.getElementById('tw-send') as HTMLButtonElement).click();
 for(let i=0;i<8;i++) await Promise.resolve();
 const link=document.querySelector('#tw-widget-chat a') as HTMLAnchorElement;
 expect(link.origin).toBe('http://localhost');expect(link.pathname).toBe('/subscriber/experts/synthetic');expect(link.rel).toBe('noopener noreferrer');expect(link.textContent).toBe('Subscribe Now');expect(document.querySelector('#tw-widget-chat img')).toBeNull();
});
it.each(['javascript:alert(1)','//example.invalid/subscribe','https://example.invalid/subscribe','http://user:password@localhost/subscribe'])('omits unsafe subscription destination %s',async(url)=>{
 await load();(document.getElementById('tw-widget-btn') as HTMLButtonElement).click();
 global.fetch=jest.fn().mockResolvedValue({status:403,headers:new Headers(),json:async()=>({subscribeUrl:url})});
 (document.getElementById('tw-input') as HTMLInputElement).value='Synthetic question';(document.getElementById('tw-send') as HTMLButtonElement).click();for(let i=0;i<8;i++) await Promise.resolve();
 expect(document.querySelector('#tw-widget-chat a')).toBeNull();expect(document.getElementById('tw-msgs')?.textContent).toContain('Subscription link unavailable');
});

it('encodes the configured key as one query value and ignores the installation script query string',async()=>{
 await load();const script=document.currentScript as HTMLScriptElement;script.src='http://localhost/embed/widget.js?v=synthetic';script.setAttribute('data-api-key','synthetic&admin=true');new Function(source)();expect(global.fetch).toHaveBeenLastCalledWith('http://localhost/api/widget/config?apiKey=synthetic%26admin%3Dtrue');for(let i=0;i<4;i++) await Promise.resolve();
});
