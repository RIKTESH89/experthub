// Pure author-local channels. Host owns all clocks, actor TRS, camera and reveal.
export function createContributionEvaluator(scene,animations){
 const find=n=>{const o=scene.getObjectByName(n);if(!o)throw Error('Missing local geometry '+n);return o;};
 const evaluators=new Map();for(let id=1;id<=4;id++){const clip=animations.find(c=>c.name===`Contribution_Source0${id}`);if(!clip)throw Error('Missing contribution clip');evaluators.set(id,clip.tracks.map(track=>{const split=track.name.lastIndexOf('.'),node=find(track.name.slice(0,split)),property=track.name.slice(split+1),interpolant=track.createInterpolant();return{node,property,interpolant};}));}
 function apply(progress,{fillFoundation=true}={}){for(let id=1;id<=4;id++){if(id===1&&progress[1]===undefined)continue;const phase=Math.max(0,Math.min(1,progress[id]??0));for(const e of evaluators.get(id)){const values=e.interpolant.evaluate(phase);if(e.property==='morphTargetInfluences'){for(let i=0;i<values.length;i++){if(id===1&&((e.node.name==='Twin_Layers_Source01'&&i>=5)||(e.node.name==='Twin_Source01_Receiver'&&i>=1)))continue;e.node.morphTargetInfluences[i]=values[i];}}else if(e.property==='position')e.node.position.fromArray(values);else if(e.property==='quaternion')e.node.quaternion.fromArray(values);else throw Error('Forbidden author-global property '+e.property);}find(`Twin_Layers_Source0${id}`).visible=phase>1e-5;}
  if(fillFoundation){
   const phases=[1,2,3,4].map(id=>Math.max(0,Math.min(1,progress[id]??(id===1?find('Twin_Layers_Source01').morphTargetInfluences.slice(0,5).reduce((p,w,j)=>p+w*j/4,0):0))));
   const total=phases.reduce((sum,p)=>sum+p,0)/4;
   function blend(mesh,states){
    if(total>=1-1e-9)return;
    let a=states[0],b=states.at(-1);for(let i=0;i<states.length-1;i++)if(total>=states[i].fraction-1e-9&&total<=states[i+1].fraction+1e-9){a=states[i];b=states[i+1];break;}
    const t=Math.max(0,Math.min(1,(total-a.fraction)/(b.fraction-a.fraction||1)));
    if(a.slot!==null)mesh.morphTargetInfluences[a.slot]+=1-t;if(b.slot!==null)mesh.morphTargetInfluences[b.slot]+=t;
   }
   const foundation=find('Twin_Anatomical_Foundation'),f=foundation.userData.constructionFrontier;
   for(const state of f.states)foundation.morphTargetInfluences[state.slot]=0;
   blend(foundation,[...f.states,{fraction:1,slot:null}]);
   for(let id=1;id<=4;id++){const layer=find(`Twin_Layers_Source0${id}`),meta=layer.userData.constructionFrontier;
    for(const state of meta.laterStates)if(state.slot!==null&&state.slot>5)layer.morphTargetInfluences[state.slot]=0;
    if(phases[id-1]>=1-1e-9){for(const slot of meta.buildSlots)layer.morphTargetInfluences[slot]=0;blend(layer,meta.laterStates);}
   }
  }scene.updateMatrixWorld(true);
 }
 function highlight(source,strength){const actor=find(`Source0${source}_Original`),range=actor.userData.selectionRange;if(!range)throw Error('No exact selected glyph range');const amount=Math.max(0,Math.min(1,strength));for(const name of range.selectedGlyphMeshes){const m=find(name).material;m.color.setRGB(.00699,.00857,.0075);const target=m.color.clone().set('#9a763d');m.color.lerp(target,amount);}find(range.highlightObject).material.opacity=amount;}
 return{apply,highlight};
}
