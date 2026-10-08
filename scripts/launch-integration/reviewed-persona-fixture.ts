// Synthetic harness adapter only: never imported by application code.
import {releasePersona as activate,previewPersonaActivation} from '@/lib/persona/store';
import {canonical} from '@/lib/persona/manifest';
type Input=Parameters<typeof activate>[0];
/** Retain the exact preview receipt for retrying an identical fixture operation. */
export function createReviewedFixturePublisher(){
 const receipts=new Map<string,Promise<string|undefined>>();
 const publish=async(input:Input)=>{
  const key=canonical(input);
  if(!receipts.has(key))receipts.set(key,previewPersonaActivation(input).then(p=>p.approvalHash||undefined));
  return activate({...input,approvalHash:await receipts.get(key)});
 };
 publish.clear=()=>receipts.clear();return publish;
}
