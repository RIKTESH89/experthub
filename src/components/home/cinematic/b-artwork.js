// Experimental B runtime adapter. App owns scroll/text/lifecycle and raster fallback.
import { createNarrativeRuntime } from './b-narrative-v9/narrative-runtime.js';

export async function createArtwork({canvas,viewport,composition,assets,signal,preparedAssetPromise,onMetrics,onError,frame=0,portrait=false,dark=false}) {
    let runtime,disposed=false,ticket=0,visible=true,dirty=true,currentFrame=frame,currentPortrait=portrait,currentDark=dark,currentComposition=composition;
    const metrics={version:'b-v9-q12-loading-preview',frames:0};
    function alive(){if(disposed||signal.aborted)throw new DOMException('Aborted','AbortError');}
    function dispose(){if(disposed)return;disposed=true;cancelAnimationFrame(ticket);ticket=0;signal.removeEventListener('abort',dispose);canvas.removeEventListener('webglcontextlost',lost);runtime?.dispose();}
    function lost(event){event.preventDefault();dispose();onError?.(new Error('webgl-context-lost'));}
    signal.addEventListener('abort',dispose,{once:true});canvas.addEventListener('webglcontextlost',lost);
    function fit(){const width=Math.max(1,viewport.clientWidth),height=Math.max(1,viewport.clientHeight),r=currentComposition;
        runtime.resize(width,height,devicePixelRatio||1,[r.x/width,r.y/height,r.width/width,r.height/height],currentPortrait);
    }
    function draw(){ticket=0;if(disposed||!visible||document.hidden||!dirty||!runtime)return;
        fit();runtime.setTheme(currentDark);runtime.setFrame(currentFrame);runtime.render();dirty=false;metrics.frames++;
        onMetrics?.({...runtime.inspect(),...metrics,frame:currentFrame,portrait:currentPortrait,dark:currentDark,composition:currentComposition,buffer:[canvas.width,canvas.height]});
    }
    function request(){if(!ticket&&!disposed&&visible&&!document.hidden&&runtime)ticket=requestAnimationFrame(draw);}
    async function readRegistry(){const r=await fetch(assets.registry,{signal});if(!r.ok)throw Error('Narrative source registry '+r.status);return r.json();}
    try {
        alive();const [envelope,sourceRegistry]=await Promise.all([fetch(assets.framing,{signal}).then(response=>{if(!response.ok)throw Error('B pose envelope '+response.status);return response.json();}),readRegistry()]);alive();
        const result=await createNarrativeRuntime({canvas,envelope,signal,initialDark:dark,assetMode:'b-local-v8',assetUrl:assets.scene,assetSha256:assets.sha256,sourceRegistry,preparedAssetPromise,copyHoldScale:.95});
        if(disposed||signal.aborted){result.dispose();alive();}runtime=result;draw();
        return {
            setFrame(value,isPortrait=currentPortrait){value=Math.max(0,Math.min(551,value));if(value!==currentFrame||isPortrait!==currentPortrait){currentFrame=value;currentPortrait=isPortrait;dirty=true;request();}},
            setComposition(rect){if(JSON.stringify(rect)!==JSON.stringify(currentComposition)){currentComposition={...rect};dirty=true;request();}},
            setTheme(theme){const next=theme==='dark';if(next!==currentDark){currentDark=next;dirty=true;request();}},
            setVisible(value){if(value===visible)return;visible=value;if(!value){cancelAnimationFrame(ticket);ticket=0;}else{dirty=true;request();}},
            resize(){dirty=true;request();},
            inspectResources(){return {disposed,visible,...runtime.inspect()};},
            inspectFraming(){return runtime.inspect();},dispose,
        };
    } catch(error){dispose();throw error;}
}
