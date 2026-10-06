// Nonmodal, lightweight illustration loading UI. No scene or elapsed-time progress.
export function mountLoadingScreen(root,{onStatic,onRetry}) {
    const node=document.createElement('section');node.id='art-loading';node.className='art-loading';node.hidden=true;node.setAttribute('role','region');node.setAttribute('aria-label','Animation loading');
    node.innerHTML=`<div class="loading-brand" aria-hidden="true">EXPERTHUB / THE ILLUSTRATION</div>
    <svg class="loading-motif" viewBox="0 0 300 112" aria-hidden="true" focusable="false">
      <g class="loading-source" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round">
        <path d="M83 92C62 104 33 87 29 66C24 47 32 22 52 18C68 7 88 14 97 30C111 40 111 69 96 79C92 88 88 91 83 92Z"/>
        <path d="M52 19C47 28 57 34 49 43C37 48 38 62 49 63M72 16C64 27 78 32 71 43C63 51 70 61 65 72C55 77 57 87 65 94M91 28C80 26 79 43 88 48C97 51 93 64 83 66C73 70 81 81 83 91M31 56C39 55 40 47 35 42M48 83C48 72 36 75 34 66"/>
      </g>
      <path class="loading-connection" d="M113 57H183" fill="none" stroke="currentColor" stroke-width=".6" stroke-dasharray="2 7"/>
      <g class="loading-leaf" transform="translate(137 43)" fill="var(--bg)" stroke="var(--accent)" stroke-width="1.2"><path d="M0 0H20L27 7V27H0Z"/><path d="M20 0V7H27M5 12H20M5 17H17M5 22H13"/></g>
      <g class="loading-twin" fill="none" stroke="var(--accent)" stroke-width="1.2" stroke-linecap="round">
        <path d="M204 41C204 29 216 18 232 17C252 11 271 28 272 42C255 50 222 52 204 41Z"/>
        <path d="M200 48C219 61 260 58 276 47M198 57C219 71 261 67 278 57M200 67C221 80 259 78 276 68M204 78C225 90 258 86 272 78M212 89C229 97 251 96 263 90"/>
      </g>
    </svg>
    <h2 class="loading-title">Bringing the story into view.</h2>
    <p class="loading-stage" aria-hidden="true"></p>
    <progress aria-label="Artwork bytes received" aria-live="off"></progress>
    <p class="loading-count" aria-hidden="true"></p>
    <p class="loading-help">You can keep reading while it loads.</p>
    <div class="loading-actions"><button type="button" data-loading-static>Read without animation</button><button type="button" data-loading-retry hidden>Retry animation</button></div>
    <p class="loading-announcement" role="status" aria-live="polite" aria-atomic="true"></p>`;
    root.append(node);
    const stage=node.querySelector('.loading-stage'),count=node.querySelector('.loading-count'),bar=node.querySelector('progress'),announce=node.querySelector('.loading-announcement'),retry=node.querySelector('[data-loading-retry]');
    let disposed=false,visible=true,mode='hidden',lastAnnouncement='',ticket=0,pending,rect;
    const say=text=>{if(text!==lastAnnouncement){lastAnnouncement=text;announce.textContent=text;}};
    const mb=bytes=>(bytes/1000000).toFixed(1);
    function position(value=rect){rect=value;if(!rect)return;const error=mode==='error';Object.assign(node.style,{left:`${rect.x+rect.width/2}px`,top:`${error?rect.y+rect.height-8:rect.y+rect.height/2}px`,width:`${Math.max(1,Math.min(420,rect.width-16))}px`,maxHeight:`${Math.max(1,rect.height-12)}px`});node.dataset.compact=String(rect.height<400);}
    function setVisible(value){visible=value;node.hidden=!visible||mode==='hidden';node.inert=!visible||mode==='hidden'||(mode==='ready'&&!node.contains(document.activeElement));if(node.inert)node.setAttribute('aria-hidden','true');else node.removeAttribute('aria-hidden');}
    function show(next){mode=next;node.dataset.state=next;setVisible(visible);position();}
    function hide(){mode='hidden';cancelAnimationFrame(ticket);ticket=0;node.hidden=true;node.inert=true;node.setAttribute('aria-hidden','true');}
    function preparing(){show('preparing');stage.textContent='Preparing animation';count.textContent='The illustration is being checked and prepared.';bar.removeAttribute('value');bar.removeAttribute('max');retry.hidden=true;say('Preparing animation. You can keep reading or read without animation.');}
    function paint(){ticket=0;if(disposed||mode==='hidden'||mode==='ready'||mode==='error'||!pending)return;const {loadedBytes,totalBytes}=pending;show('receiving');bar.max=totalBytes;bar.value=loadedBytes;node.dataset.loadedBytes=String(loadedBytes);node.dataset.totalBytes=String(totalBytes);node.style.setProperty('--received',String(loadedBytes/totalBytes));stage.textContent='Loading artwork';count.textContent=`${mb(loadedBytes)} / ${mb(totalBytes)} MB received`;retry.hidden=true;say('Loading artwork. You can keep reading or read without animation.');}
    function progress(value){if(disposed||mode==='hidden'||mode==='ready'||mode==='error')return;pending=value;if(!ticket)ticket=requestAnimationFrame(paint);}
    function received(){if(disposed||mode==='hidden'||mode==='ready'||mode==='error')return;cancelAnimationFrame(ticket);ticket=0;if(pending){node.dataset.loadedBytes=String(pending.loadedBytes);node.dataset.totalBytes=String(pending.totalBytes);}preparing();}
    function complete(){if(disposed)return;cancelAnimationFrame(ticket);ticket=0;pending=null;say('Animation ready.');mode='ready';node.dataset.state='ready';stage.textContent='Animation ready';count.textContent='';bar.removeAttribute('value');retry.hidden=false;retry.textContent='Continue';retry.removeAttribute('aria-label');node.dataset.focused=String(node.contains(document.activeElement));if(!node.contains(document.activeElement)){node.inert=true;node.setAttribute('aria-hidden','true');}}
    function failure(){if(disposed)return;cancelAnimationFrame(ticket);ticket=0;pending=null;show('error');node.setAttribute('aria-label','Animation unavailable');stage.textContent='Static artwork';retry.hidden=false;retry.textContent='Retry';retry.setAttribute('aria-label','Retry animation');say('The animation could not load. Static artwork, the story and sources remain available. You can retry animation or read without it.');}
    const staticClick=()=>onStatic();const retryClick=()=>{if(mode==='error')onRetry();else if(mode==='ready'){root.querySelector('#motion')?.focus({preventScroll:true});hide();}};
    const blur=event=>{if(mode==='ready'&&!node.contains(event.relatedTarget))hide();};
    node.querySelector('[data-loading-static]').addEventListener('click',staticClick);retry.addEventListener('click',retryClick);node.addEventListener('focusout',blur);
    return {start(){pending=null;lastAnnouncement='';node.removeAttribute('data-loaded-bytes');node.removeAttribute('data-total-bytes');node.removeAttribute('data-focused');node.setAttribute('aria-label','Animation loading');preparing();},progress,received,complete,failure,position,setVisible,hide,focusStatic(){node.querySelector('[data-loading-static]').focus({preventScroll:true});},dispose(){disposed=true;hide();node.remove();}};
}
