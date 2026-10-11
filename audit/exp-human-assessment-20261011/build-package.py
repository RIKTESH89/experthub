"""Prepare blinded local review material; never rate, contact people or call providers."""
import argparse, csv, hashlib, json, random, pathlib

ROOT = pathlib.Path(__file__).resolve().parent
DIMENSIONS = ['faithfulness', 'attribution_time_access', 'dialogue_state', 'style_resemblance', 'naturalness', 'usefulness', 'abstention_appropriateness']
SHA = lambda text: hashlib.sha256(text.encode('utf-8')).hexdigest()
CONTEXT_SHA = lambda context: SHA(json.dumps(context, ensure_ascii=False, sort_keys=True, separators=(',', ':')))
def dump(path, value):
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(value, ensure_ascii=False, indent=2) + '\n')
def evidence(bundle):
    fields = ['spanId','revisionId','sourceVersion','contentHash','text','authorId','speakerId','speakerRole','endorsedByOwner','kind','audience','publishedAt','publicationTimeBasis','sourceUpdatedAt','recordedAt','validFrom','validUntil','polarity','context','constraints','exceptions','documentedReasons','chosenAction','alternatives','tradeoffs','chunkIds']
    temporal = bundle.get('temporalTrace', {})
    return {'sources': [{'text':s.get('content'), 'sourceId':s.get('metadata',{}).get('knowledgeItemId'), 'chunkId':s.get('metadata',{}).get('vectorId'), 'sourceVersion':s.get('metadata',{}).get('sourceVersion')} for s in bundle.get('sources',[])],
      'authoredSpans':[{k:r.get(k) for k in fields} for r in bundle.get('evidenceTrace',[])],
      'temporal':{k:temporal.get(k) for k in ['mode','validAt','knownAt','stances','supersededStances','relations','coverage']},
      'gaps':bundle.get('gaps',[]),
      'visibilityLimit':'This is a captured request/review snapshot, not an atomic final-delivery authorization record. Missing author/time/access fields are unknown.'}
def main():
    parser=argparse.ArgumentParser(); parser.add_argument('--source',type=pathlib.Path,required=True); args=parser.parse_args()
    source=args.source; raw=(source/'traces.jsonl').read_text(); traces=[json.loads(line) for line in raw.splitlines()]
    assert len(traces)==116, 'Expected exact final fixed trace inventory'
    order=list(range(len(traces))); random.Random('exp-human-assessment-20261011-v1').shuffle(order)
    packet=[]; key=[]
    for n,index in enumerate(order,1):
        trace=traces[index]; gen=trace['requests']['generation'][-1]['context']; reviews=trace['requests']['verification']; reviewed=reviews[-1]['context'] if reviews else None
        bid=f'R{n:03d}'; answer=trace['answer']; ah=SHA(answer)
        samples=gen['style']['samples']; selected={r['spanId']:r for r in gen['bundle'].get('evidenceTrace',[])+gen['bundle'].get('temporalTrace',{}).get('stances',[])}
        style=[]
        for sample in samples:
            row=selected.get(sample['spanId']); eligible=row and row.get('authorId')==gen['state']['expertId'] and row.get('speakerId')==gen['state']['expertId'] and row.get('speakerRole')=='author' and row.get('endorsedByOwner') and row.get('kind')=='explicit'
            if eligible:
                assert sample['text']==row['text'][:500], 'Style sample does not match its frozen source excerpt'
                style.append({'spanId':sample['spanId'],'text':sample['text'],'authorId':row['authorId'],'speakerId':row['speakerId'],'speakerRole':row['speakerRole'],'audience':row.get('audience')})
        packet.append({'blindId':bid,'track':'fixed-synthetic-output-review','representedPersonId':gen['state']['expertId'],'query':trace['query'],'recentConversation':trace['history'],
          'answer':answer,'answerHash':ah,'admissibleContext':{'generationSnapshot':evidence(gen['bundle']), 'semanticReviewSnapshot':evidence(reviewed['bundle']) if reviewed else None,
          'styleAuthorOnlySamples':style,'styleAssessability':'Sparse selected snippets; resemblance requires sufficient authored references. Mark not-assessable with reason when insufficient.',
          'viewerEntitlement':'Viewer role/entitlement is not serialized in these traces; source audiences and selected request snapshots are available, but do not establish final authorization.',
          'unknownPrivateExperience':'No source access beyond these snapshots is implied. Visitor/assistant history is continuity, never evidence of represented-person beliefs.'},
          'dimensions':DIMENSIONS,'ratings':None})
        key.append({'blindId':bid,'answerHash':ah,'sourceContextHash':CONTEXT_SHA(packet[-1]['admissibleContext']),'traceIndex':index,'logicalCase':trace['caseId'],'turn':trace['turn'],'repeat':trace['repeat'],'implementationLabel':trace['variant'],'expectedSyntheticOutcome':trace['expected'],'observedSyntheticOutcome':trace['outcome'],'nativeOutputDigest':trace['outputHash']})
    dump(ROOT/'reviewer/fixed-outputs.json',{'version':'blinded-human-review-v1','mode':'fixed-synthetic-output-review','humanReview':'NOT_RUN','answers':packet})
    readable=['# Fixed synthetic output review\n\nHuman review NOT RUN. Use the instructions and separate rubric. Preserve exact answer hashes; do not treat repeated fixed records as independent model evidence.\n']
    for row in packet:
        readable.append(f"## {row['blindId']}\n\nQuestion: {row['query']}\n\nRepresented person: {row['representedPersonId']}\n\nAnswer SHA-256: {row['answerHash']}\n\nExact answer:\n\n```text\n{row['answer']}\n```\n\nRecent conversation:\n\n```json\n{json.dumps(row['recentConversation'],ensure_ascii=False,indent=2)}\n```\n\nAdmissible source/style context and visibility limits:\n\n```json\n{json.dumps(row['admissibleContext'],ensure_ascii=False,indent=2)}\n```\n")
    (ROOT/'reviewer/fixed-outputs.md').write_text('\n'.join(readable))
    dump(ROOT/'coordinator/fixed-output-key.json',{'distribution':'coordinator-only; never distribute with reviewer material','entries':key})
    workflows=[
      ('W001',['EXP-16'],'A visitor supplies a mistaken professional credential as feedback. Explain what remains pending and what the owner must independently verify before any belief is changed.','local isolated fixture; feedback never constitutes expert-authored evidence'),
      ('W002',['EXP-16'],'Review one changed manual-source proposal and its effective/draft settings. Identify exactly which claim/settings the preview would change and which unrelated claims must remain stable.','local isolated fixture; expert owner role; immutable approved preview receipt; no hosted activation'),
      ('W003',['EXP-16'],'Compare current and historical release manifests where a previously available source is now removed/restricted. Explain safe rollback choices without restoring inaccessible evidence.','local isolated fixture; explicit current source visibility; no live rollback'),
      ('W004',['EXP-25'],'A release preview is blocked by safeguards or evidence indexing. Explain the cause in plain language and identify the next permitted action.','local isolated fixture; blocked preview never enables confirmation'),
      ('W005',['EXP-25'],'A valid preview is followed by a malformed replacement preview or failed refresh. Identify whether an old approval remains usable and how to recover.','local isolated fixture; prior approval must be invalidated; no external requests'),
      ('W006',['EXP-25'],'Activation confirmation has an ambiguous network failure, then owner access is revoked with a non-JSON response. Explain the same-request retry boundary and identify what private information remains visible.','local isolated fixture; no real activation; owner private UI should disappear on authorization loss')]
    cards=[{'taskId':tid,'scopes':scopes,'track':'isolated-human-workflow-task','task':task,'admissibleContext':context,'status':'NOT_RUN','observedOutput':None,'ratings':None,'dimensions':['recovery_clarity','task_success','privacy_identity_boundary','usefulness']} for tid,scopes,task,context in workflows]
    dump(ROOT/'reviewer/workflow-tasks.json',{'version':'human-workflow-task-v1','tasks':cards})
    fields=['rater_slot','reviewer_id','blind_id','answer_hash','dimension','score','not_assessable_reason','evidence_span_or_turn','rationale','critical_failure','elapsed_minutes']
    with (ROOT/'reviewer/blank-scores.csv').open('w',newline='') as handle:
        writer=csv.DictWriter(handle,fieldnames=fields);writer.writeheader()
        for row in packet:
            for slot in ['independent-rater-1','independent-rater-2']:
                for dimension in DIMENSIONS: writer.writerow({'rater_slot':slot,'blind_id':row['blindId'],'answer_hash':row['answerHash'],'dimension':dimension})
        for card in cards:
            for slot in ['independent-rater-1','independent-rater-2']:
                for dimension in card['dimensions']:writer.writerow({'rater_slot':slot,'blind_id':card['taskId'],'dimension':dimension})
    dump(ROOT/'coordinator/manifest.json',{'version':'human-assessment-package-v1','stageCommit':'43b784a4e71fc985ae178e1d7ab764f0ff4a85d1','traceFileHash':SHA(raw),'sourceManifestHash':SHA((source/'manifest.json').read_text()),'fixedTraceCount':len(traces),'logicalTurns':len({(t['caseId'],t['turn']) for t in traces}),'uniqueAnswerTexts':len({t['answer'] for t in traces}),'implementationComparability':'same current native pipeline and fixed adapters under two labels; not two genuine implementations','humanReview':'NOT_RUN','goldAuthoring':'NOT_RUN','providerCalls':0,'ratings':None,'reviewerRoster':None,'proposedCriteriaApproved':False,'scopeCoverage':['EXP-7','EXP-14','EXP-15','EXP-16','EXP-17','EXP-25'],'seedCasePackage':{'path':'audit/exp17-human-authoring-20261011/developer-seed-inputs.json','sha256':'0289ede542af512ece538998902ea9375b11e2b7c2b751720e516da6d6a73ff7','caseIds':'S17-U01..S17-U16','provenance':'developer-authored/stress-exercised calibration; no human-gold validation; not genuinely human-heldout','officialNewHumanIds':'HG001..HG016'}})
    print(json.dumps({'fixedAnswers':len(packet),'workflowTasks':len(cards),'humanReview':'NOT_RUN','providerCalls':0}))
if __name__=='__main__': main()
