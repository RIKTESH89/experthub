// R3 camera remains unchanged; this version adds original opt-in studio contact cues.
import {createStudioRig as baseStudio} from './cinematic-runtime-r3.js';
import {createContactShadows} from './contact-shadows-r4.js';
export {createCameraDirector,shotWeights,ASSET_SHA256} from './cinematic-runtime-r3.js';
export const RUNTIME_VERSION='experthub-runtime-r4-contact';
export function createStudioRig(T,{scene,renderer,contactBounds,...options}){
 const base=baseStudio(T,{scene,renderer,...options});
 if(contactBounds&&contactBounds.assetSha256!=='c602aa49df4785c6c80bf14c9c74b0874076b97424cd1611285b07899a2a5ea0'){base.dispose();throw new Error('R4 contact bounds require unchanged frozen v7');}
 const contacts=contactBounds?createContactShadows(T,{scene,renderer,bounds:contactBounds}):null;
 const brain=scene.getObjectByName('Brain_Surface')?.material,brainColor=brain?.color.clone();
 scene.traverse(o=>{if(!o.isMesh)return;for(const m of Array.isArray(o.material)?o.material:[o.material])if(m?.isMeshStandardMaterial){if(/alabaster/i.test(m.name))m.roughness=.78;if(/lamellae|cut paper/i.test(m.name))m.roughness=.84;}if(o.name==='Runtime_Studio_Bed'){o.material.fragmentShader=o.material.fragmentShader.replace('gl_FragColor=vec4(color,a*a*strength);','gl_FragColor=vec4(color,a*a*strength);\n#include <colorspace_fragment>\n');o.material.toneMapped=false;o.material.needsUpdate=true;}});
 return {...base,contactInfo:contacts?.stats??{version:'r4-no-contact-bounds',fieldCount:0},setFrame(frame){base.setFrame(frame);if(brainColor){let t=Math.max(0,Math.min(1,(frame-92)/24));t=t*t*(3-2*t);brain.color.copy(brainColor).multiplyScalar(1-.55*t);}contacts?.setFrame(frame);},setTheme(dark){base.setTheme(dark);base.key.intensity=dark?2.25:2.3;base.fill.intensity=dark?.14:.22;scene.environmentIntensity=dark?.30:.32;base.rim.intensity=dark?1.4:1.1;base.ground.material.opacity=contacts?(dark?.035:.045):(dark?.10:.10);const bed=scene.getObjectByName('Runtime_Studio_Bed');if(bed)bed.material.uniforms.strength.value=dark?.12:0;contacts?.setTheme(dark);},renderContacts(now){contacts?.render(now);},contactDiagnostics(){return contacts?.inspectMasks()??[];},dispose(){contacts?.dispose();base.dispose();}};
}
