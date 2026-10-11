import { writeFileSync } from 'fs';
import { runStructuredDialogue } from '../../src/lib/ai/dialogue/structured/pipeline';
import type { GenerationRequest, VerificationRequest } from '../../src/lib/ai/dialogue/structured/contracts';
import { baseBundle, draft } from '../../scripts/exp15-exp17/fixtures';
import { fixtureAdapters, evaluateHeldoutConversations } from '../../scripts/exp15-exp17/runner';
const pairs = [
 {id:'A-constraint-correction',turns:[
  {query:'I need a study plan within 3 days, under 500 rupees, using only a phone.',text:'Choose a small research question and collect notes on your phone; keep the activity within your stated time and budget.'},
  {query:'Correction: I have 5 days instead, still only a phone.',text:'Use the five-day limit you just supplied, keeping the phone and budget constraints. The earlier three-day limit has been corrected.'},
  {query:'Continue',text:'You can use the remaining five-day schedule to compare notes and write a short summary, using your phone and the same budget.'}]},
 {id:'B-topic-shift',turns:[
  {query:'Explain how to read a medical study, without dosing advice.',text:'Compare the groups, benefits, harms and uncertainty. Personal treatment decisions need qualified clinical advice.'},
  {query:'New topic: explain recursion in two short sentences.',text:'Recursion solves a problem through smaller versions of itself. A base case stops the process.'},
  {query:'Continue',text:'Trace the smallest input first, then one larger input. That shows where the base case stops further calls.'}]}
];
async function main() {
 const transcripts: unknown[]=[];
 for(const pair of pairs) {
  const history:{role:string;content:string}[]=[];
  const turns:unknown[]=[];
  for(const turn of pair.turns) {
   const seen={generation:[] as GenerationRequest[],verification:[] as VerificationRequest[]};
   const adapters=fixtureAdapters({query:turn.query,draft:draft(turn.text),expected:'released-synthetic-evaluation',dimensions:[]},seen);
   const result=await runStructuredDialogue({expertId:'expert-synthetic',query:turn.query,history,bundle:baseBundle(turn.query),adapters});
   if(result.outcome!=='released-synthetic-evaluation') throw new Error(pair.id+': '+result.decision.reasons.join(','));
   turns.push({query:turn.query,response:result.text,state:seen.generation[0].context.state,styleProfile:seen.generation[0].context.style.profile,verificationStateDigest:seen.verification[0].stateDigest,outcome:result.outcome,realProviderCalls:0,semanticQuality:null,humanRatings:{styleResemblance:null,naturalness:null,faithfulness:null}});
   history.push({role:'user',content:turn.query},{role:'assistant',content:result.text});
  }
  transcripts.push({id:pair.id,turns});
 }
 const report=await evaluateHeldoutConversations();
 if(report.turns.some(t=>Object.values(t.contractChecks).some(v=>!v))) throw new Error('existing synthetic contract failure');
 writeFileSync('audit/exp15-acceptance-20261011/paired-transcripts.json',JSON.stringify({version:'exp15-acceptance-20261011',mode:'fixed-synthetic-contracts',baseline:'0a2cd602',realProviderCalls:0,humanReview:'NOT RUN',transcripts},null,2)+'\n');
 writeFileSync('audit/exp15-acceptance-20261011/structured-evaluation.json',JSON.stringify(report,null,2)+'\n');
 console.log(JSON.stringify({pairedTurns:6,existingTurns:report.turns.length,contractFailures:0,realProviderCalls:0,humanReview:'NOT RUN'}));
}
main().catch(error=>{console.error(error);process.exitCode=1;});
