import { bChapterFrame } from './b-chapter-map.js';
import { narrativeState } from './b-narrative-v7/narrative-clock.js';
// Original editorial beats tied to existing authored camera/reading phases.
const smooth=value=>{const t=Math.max(0,Math.min(1,value));return t*t*(3-2*t);};
const copy={
 introduction:[null,'An AI representation starts with material you choose to share.'],
 contributions:[null,'01 · Context note: begin with a clear question.','Source 01 keeps that question beside its context.','This illustrated journey follows one selected contribution from Source 01.'],
 context:[null,'Read Source 01: “Begin with a clear question. Keep its context in view.”','Select “a clear question” while preserving its original source.','Question and context stay related through the same Source 01 identity.'],
 construction:[null,'01 · The first fragment keeps its source identity as the form develops.',
 ...[ [2,'original diagram','Question → Context'],[3,'whole shared case note','naming the constraint'],[4,'original decision example','the stated constraint'] ].flatMap(([id,title,quote])=>[`${String(id).padStart(2,'0')} · Read the ${title}, before selecting a passage.`,`${String(id).padStart(2,'0')} · Select “${quote}” within the intact original.`,`${String(id).padStart(2,'0')} · Copied passage: “${quote}”. The source stays identifiable.`,`${String(id).padStart(2,'0')} · The copied passage approaches its own receiving layer.`,`${String(id).padStart(2,'0')} · Contribution seated; its original source remains available.`]),],
 conversation:[null,'Fictional question: How should I begin choosing an option?','Scripted answer: Begin with a clear question.','Scripted example: compare options against the stated constraint. Check sources 01 and 04.'],
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
 let index=boundaries.filter(boundary=>p>=boundary).length;
 if(id==='construction'){const state=narrativeState(bChapterFrame(p,{id}));index=state.chapter==='primary'?(state.frame<152?0:1):2+(state.source-2)*5+({enter:0,reading:0,selection:1,copy:2,approach:3,seat:4}[state.phase]);}
 const weights=Array(lines.length).fill(0);
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
