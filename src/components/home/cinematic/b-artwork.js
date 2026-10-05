// Experimental B runtime adapter. App owns scroll/text/lifecycle and raster fallback.
import { createBRuntime } from './b-r1/b-runtime.js';

export async function createArtwork({canvas,viewport,composition,assets,signal,onMetrics,onError,frame=0,portrait=false,dark=false}) {
    let runtime,disposed=false,ticket=0,visible=true,dirty=true,currentFrame=frame,currentPortrait=portrait,currentDark=dark,currentComposition=composition;
    const metrics={version:'b-r1-local-v4-experimental',frames:0};
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
    try {
        alive();const response=await fetch(assets.framing,{signal});if(!response.ok)throw Error('B pose envelope '+response.status);const envelope=await response.json();alive();
        const result=await createBRuntime({canvas,envelope,signal,initialDark:dark,assetMode:'b-local-v4',assetUrl:assets.scene,assetSha256:assets.sha256,registryUrl:assets.registry,validationUrl:assets.validation});
        if(disposed||signal.aborted){result.dispose();alive();}runtime=result;draw();
        return {
            setFrame(value,isPortrait=currentPortrait){value=Math.max(0,Math.min(191,value));if(value!==currentFrame||isPortrait!==currentPortrait){currentFrame=value;currentPortrait=isPortrait;dirty=true;request();}},
            setComposition(rect){if(JSON.stringify(rect)!==JSON.stringify(currentComposition)){currentComposition={...rect};dirty=true;request();}},
            setTheme(theme){const next=theme==='dark';if(next!==currentDark){currentDark=next;dirty=true;request();}},
            setVisible(value){if(value===visible)return;visible=value;if(!value){cancelAnimationFrame(ticket);ticket=0;}else{dirty=true;request();}},
            resize(){dirty=true;request();},
            inspectResources(){return {disposed,visible,...runtime.inspect()};},
            inspectFraming(){return runtime.inspect();},dispose,
        };
    } catch(error){dispose();throw error;}
}
