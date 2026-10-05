// Original editorial beats tied to existing authored camera/reading phases.
const smooth=value=>{const t=Math.max(0,Math.min(1,value));return t*t*(3-2*t);};
const copy={
 introduction:[null,'An AI representation starts with material you choose to share.'],
 contributions:[null,'01 · Context note: begin with a clear question.','Source 01 keeps that question beside its context.','This illustrated journey follows one selected contribution from Source 01.'],
 context:[null,'Read Source 01: “Begin with a clear question. Keep its context in view.”','Select “a clear question” while preserving its original source.','Question and context stay related through the same Source 01 identity.'],
 construction:[null,'The Source 01 fragment approaches an incomplete twin.','Its citation keeps the fragment connected to the original note.','This prototype illustrates one contribution; further contributions are still being developed.'],
 conversation:[null,'Fictional question: How should I begin choosing an option?','Scripted answer: Begin with a clear question.','Scripted example: keep its context in view. Follow this passage back to Source 01.'],
 control:[null,'Correct shared source notes manually. Citations still need your judgment.'],
 close:[null,'Check available sources as you explore a conversation.'],
};
export function storyTitle(id,index,original){return id==='introduction'&&index===1?'Knowledge you choose to share.':original;}
export function storyCopyLines(id,original){return (copy[id]??[null]).map(line=>line??original);}
// Persistent visual clauses have complementary interruptible CSS opacity.
// CSS interpolates interrupted targets; settled state remains scroll-derived.
export function textBeat(id,phase,original){
 const lines=storyCopyLines(id,original),p=Math.max(0,Math.min(1,phase));
 const boundaries=lines.length===4?[.25,.5,.75]:lines.length===2?[id==='introduction'?.25:.5]:[];
 const index=boundaries.filter(boundary=>p>=boundary).length,weights=Array(lines.length).fill(0);
 weights[index]=1;
 return {index,text:lines[index],opacity:1,weights,marker:`${id}:${index}`};
}
export function chapterTextOpacity(scroll,top,end,viewport,first=false,last=false){
 // Targets settle on one chapter. The CSS dissolve supplies a long, reversible
 // interpolation without a permanently superimposed heading at a stopped seam.
 if(first&&scroll<top)return 1;
 if(scroll+2<top||scroll+2>=end)return 0;
 return last?1-smooth((scroll-(end-viewport*.28))/(viewport*.28)):1;
}
