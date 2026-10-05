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
export function textBeat(id,phase,original){
 const lines=copy[id]??[null],p=Math.max(0,Math.min(1,phase));
 const boundaries=lines.length===4?[.25,.5,.75]:lines.length===2?[id==='introduction'?.25:.5]:[];
 const index=boundaries.filter(boundary=>p>=boundary).length;
 const distance=boundaries.length?Math.min(...boundaries.map(boundary=>Math.abs(p-boundary))):1;
 return {index,text:lines[index]??original,opacity:smooth(distance/.05),marker:`${id}:${index}`};
}
