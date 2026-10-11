"""Machine checks for prepared material, not human quality or acceptance."""
import collections, copy, csv, hashlib, json, pathlib, re
ROOT=pathlib.Path(__file__).resolve().parent
sha=lambda value:hashlib.sha256(value.encode('utf-8')).hexdigest()
context_sha=lambda context:sha(json.dumps(context,ensure_ascii=False,sort_keys=True,separators=(',',':')))
def check(condition,message):
    if not condition: raise AssertionError(message)
def validate(packet,key,cards,scores,manifest):
    answers=packet['answers']; entries=key['entries']; tasks=cards['tasks']
    check(packet['humanReview']=='NOT_RUN' and manifest['humanReview']=='NOT_RUN' and manifest['goldAuthoring']=='NOT_RUN','Human result invented')
    check(manifest['ratings'] is None and manifest['reviewerRoster'] is None and manifest['proposedCriteriaApproved'] is False,'Unapproved rating/roster/criteria')
    check(len(answers)==len(entries)==manifest['fixedTraceCount']==116,'Incomplete fixed inventory')
    ids=[r['blindId'] for r in answers]; check(len(set(ids))==116,'Duplicate blind IDs')
    check(set(r['blindId'] for r in entries)==set(ids),'Key/answer mismatch')
    check(set(r['traceIndex'] for r in entries)==set(range(116)),'Dropped/duplicated trace')
    km={r['blindId']:r for r in entries}
    label_keys={'variant','implementationLabel','expected','expectedSyntheticOutcome','observedSyntheticOutcome','logicalCase','traceIndex','repeat','nativeOutputDigest','requests','instructions','provider','configuration','outcome','reasons'}
    def scan(value):
        if isinstance(value,dict):
            check(not(label_keys & set(value)), 'Implementation/gold label leaked to reviewer')
            for v in value.values():scan(v)
        elif isinstance(value,list):
            for v in value:scan(v)
        elif isinstance(value,str):check(not re.search(r'\b(?:baseline|candidate)\b|H\d{2}-',value,re.I),'Implementation/case label leaked in reviewer value')
    scan(answers);scan(tasks)
    for answer in answers:
        check(answer['ratings'] is None,'Rating invented')
        check(answer['answerHash']==sha(answer['answer'])==km[answer['blindId']]['answerHash'],'Answer hash mismatch')
        ctx=answer['admissibleContext'];check('generationSnapshot' in ctx and 'semanticReviewSnapshot' in ctx and 'viewerEntitlement' in ctx,'Missing context/visibility limits')
        check(context_sha(ctx)==km[answer['blindId']]['sourceContextHash'],'Frozen source/context hash mismatch')
        for snapshot in [ctx['generationSnapshot'],ctx['semanticReviewSnapshot']]:
            if snapshot is not None:
                check(all(k in snapshot for k in ['sources','authoredSpans','temporal','gaps','visibilityLimit']),'Incomplete source snapshot')
                for row in snapshot['authoredSpans']:check(all(k in row for k in ['authorId','speakerId','speakerRole','endorsedByOwner','publishedAt','validFrom','validUntil','audience']),'Incomplete author/time/access fields')
        authored=ctx['generationSnapshot']['authoredSpans']+ctx['generationSnapshot']['temporal'].get('stances',[])
        by_id={r['spanId']:r for r in authored}
        for sample in ctx['styleAuthorOnlySamples']:
            row=by_id.get(sample['spanId']);check(row is not None and row.get('authorId')==row.get('speakerId')==answer['representedPersonId'] and row.get('speakerRole')=='author' and row.get('endorsedByOwner') is True and row.get('kind')=='explicit','Ineligible style author')
            check(sample.get('text')==row['text'][:500], 'Style text differs from frozen source excerpt')
            check(all(sample.get(field)==row.get(field) for field in ['authorId','speakerId','speakerRole','audience']), 'Style author/speaker/access differs from frozen source')
    check(len(tasks)==6 and {s for r in tasks for s in r['scopes']}=={'EXP-16','EXP-25'},'Workflow scope incomplete')
    for task in tasks:check(task['status']=='NOT_RUN' and task['observedOutput'] is None and task['ratings'] is None,'Human workflow invented')
    expected={(a['blindId'],a['answerHash'],slot,d) for a in answers for slot in ['independent-rater-1','independent-rater-2'] for d in a['dimensions']}
    expected|={(a['taskId'],'',slot,d) for a in tasks for slot in ['independent-rater-1','independent-rater-2'] for d in a['dimensions']}
    actual=[(r['blind_id'],r['answer_hash'],r['rater_slot'],r['dimension']) for r in scores]
    check(len(actual)==len(set(actual)) and set(actual)==expected,'Incomplete/duplicate score template')
    for row in scores:check(all(not row[k] for k in ['reviewer_id','score','not_assessable_reason','evidence_span_or_turn','rationale','critical_failure','elapsed_minutes']),'Human score/identity invented')
    check(set(manifest['scopeCoverage'])=={'EXP-7','EXP-14','EXP-15','EXP-16','EXP-17','EXP-25'},'Scope omission')
    check(manifest['logicalTurns']==29 and manifest['uniqueAnswerTexts']==15,'Inflated denominator')
    return {'fixedAnswers':len(answers),'scoreRows':len(scores),'workflowTasks':len(tasks),'ratingsEntered':0,'labelLeakage':0}
def main():
    load=lambda path:json.loads((ROOT/path).read_text())
    p=load('reviewer/fixed-outputs.json'); k=load('coordinator/fixed-output-key.json'); w=load('reviewer/workflow-tasks.json'); m=load('coordinator/manifest.json')
    scores=list(csv.DictReader((ROOT/'reviewer/blank-scores.csv').open()))
    result=validate(p,k,w,scores,m); adversarial=[]
    readable=(ROOT/'reviewer/fixed-outputs.md').read_text()
    check(not re.search(r'\b(?:baseline|candidate)\b|H\d{2}-',readable,re.I),'Readable packet leaked labels')
    for answer in p['answers']:
        check(readable.count('## '+answer['blindId']+'\n')==1 and answer['answerHash'] in readable and answer['answer'] in readable,'Readable packet incomplete or changed answer')
    attacks=[('answer-hash',lambda x:x['answers'][0].update(answer='changed')),
      ('duplicate-id',lambda x:x['answers'][1].update(blindId=x['answers'][0]['blindId'])),
      ('label-leakage',lambda x:x['answers'][0].update(variant='candidate')),
      ('invented-rating',lambda x:x['answers'][0].update(ratings={'faithfulness':5}))]
    style_index=next(i for i,a in enumerate(p['answers']) if a['admissibleContext']['styleAuthorOnlySamples'])
    def change_style(x,**fields):
        x['answers'][style_index]['admissibleContext']['styleAuthorOnlySamples'][0].update(**fields)
    attacks.extend([
      ('invented-style-text',lambda x:change_style(x,text='An invented owner-authored stylistic sample.')),
      ('style-author-mismatch',lambda x:change_style(x,authorId='visitor-invented')),
      ('style-speaker-mismatch',lambda x:change_style(x,speakerId='visitor-invented')),
      ('style-audience-mismatch',lambda x:change_style(x,audience='private')),
      ('source-text-mutation',lambda x:x['answers'][style_index]['admissibleContext']['generationSnapshot']['authoredSpans'][0].update(text='Invented source text.'))])
    for name,attack in attacks:
        changed=copy.deepcopy(p);attack(changed)
        try:validate(changed,k,w,scores,m)
        except AssertionError:adversarial.append(name)
        else:raise AssertionError('Validator accepted '+name)
    # Exercise the sample-to-source relationship separately from the frozen hash.
    # Even an accidentally regenerated key must not bless fabricated sample text.
    for name,fields in [('style-text-source-binding',{'text':'An invented owner-authored stylistic sample.'}),
      ('style-author-source-binding',{'authorId':'visitor-invented'}),
      ('style-speaker-source-binding',{'speakerId':'visitor-invented'}),
      ('style-audience-source-binding',{'audience':'private'})]:
        changed=copy.deepcopy(p);changed_key=copy.deepcopy(k);change_style(changed,**fields)
        bid=changed['answers'][style_index]['blindId']
        next(e for e in changed_key['entries'] if e['blindId']==bid)['sourceContextHash']=context_sha(changed['answers'][style_index]['admissibleContext'])
        try:validate(changed,changed_key,w,scores,m)
        except AssertionError:adversarial.append(name)
        else:raise AssertionError('Validator accepted '+name)
    result.update({'mode':'package-integrity-only','result':'PASS','readablePacketComplete':True,'adversarialRejections':adversarial,'humanReview':'NOT_RUN','providerCalls':0})
    (ROOT/'validation.json').write_text(json.dumps(result,indent=2)+'\n');print(json.dumps(result))
if __name__=='__main__':main()
