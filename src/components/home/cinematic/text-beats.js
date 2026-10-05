// Original editorial beats tied to existing authored camera/reading phases.
const smooth=value=>{const t=Math.max(0,Math.min(1,value));return t*t*(3-2*t);};
const copy={
 introduction:[null,'An AI representation starts with material you choose to share.'],
 contributions:[null,'02 · Diagram: question → context → decision.','03 · Case note: naming a constraint changes the next step.','04 · Decision example: compare options against the stated constraint.'],
 context:[null,'Select “a clear question” while keeping the original source in view.','The copied passage travels with its source identity.','Related ideas connect question, context and decision.'],
 construction:[null,'The first contribution joins an incomplete form.','Related records contribute further context.','The result is a partial representation of shared knowledge.'],
 conversation:[null,'Fictional question: How should I begin choosing an option?','Scripted answer: Begin with a clear question.','Scripted answer: compare options against the stated constraint. Check sources 01 and 04.'],
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
