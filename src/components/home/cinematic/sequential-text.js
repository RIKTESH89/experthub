// One displayed target. Content changes only at zero opacity; newer requests
// collapse into the pending target without extending the current exit.
const ease=value=>{const t=Math.max(0,Math.min(1,value));return t*t*(3-2*t);};
export function createSequentialFade(initial){
 let displayed=initial,target=initial,opacity=1,leg='idle',start=0,duration=0,from=1;
 const begin=(next,now,value)=>{leg=next;start=now;from=value;duration=(next==='out'?280*value:360*(1-value));};
 function valueAt(now){const p=duration?(now-start)/duration:1;return leg==='out'?from*(1-ease(p)):from+(1-from)*ease(p);}
 function advance(now){
  if(leg==='idle')return;
  opacity=valueAt(now);
  if(now-start<duration)return;
  if(leg==='out'){
   const switchAt=start+duration;displayed=target;begin('in',switchAt,0);opacity=valueAt(now);
   if(now-start<duration)return;
  }
  opacity=1;leg='idle';
 }
 return {sample(next,now){
  target=next;
  if(leg==='out'&&next===displayed){opacity=valueAt(now);begin('in',now,opacity);}
  else advance(now);
  if(leg!=='out'&&displayed!==next){begin('out',now,opacity);advance(now);}
  return {displayed,target,opacity,leg,moving:leg!=='idle'};
 },reset(next){displayed=target=next;opacity=1;leg='idle';},get target(){return target;}};
}
