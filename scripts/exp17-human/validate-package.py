"""Validate fixture structure and blank human fields; never validate human semantics."""
import hashlib
import json
from pathlib import Path

root = Path('audit/exp17-human-authoring-20261011')
read = lambda name: json.loads((root / name).read_text())
inputs = read('developer-seed-inputs.json')
sources = {source['sourceId']: source for source in inputs['sources']}
cases = inputs['cases']
assert len(cases) == 16 and len({case['id'] for case in cases}) == 16
assert inputs['humanAuthoringStatus'] == 'NOT_RUN' and not inputs['externalData']
for source in sources.values():
    assert source['contentHash'] == hashlib.sha256(source['text'].encode()).hexdigest()
    assert source['text'][source['start']:source['end']] == source['text']
    assert source['revisionId'] and source['spanId'] and source['authorId'] and source['speakerId']
for case in cases:
    assert set(case['sourceIds']) <= sources.keys()
    assert 'developer' not in case and 'candidate' not in case
    assert all(relation['fromSource'] in case['sourceIds'] and relation['toSource'] in case['sourceIds'] for relation in case['relations'])
gold = read('human-gold-authoring-template.json')
assert gold['status'] == 'NOT_RUN' and gold['author'] is None and gold['sealedDatasetSha256'] is None
assert len(gold['cases']) == 16
assert all(value is None for case in gold['cases'] for key, value in case.items() if key != 'id')
ratings = read('human-evaluation-ratings-template.json')
assert ratings['status'] == 'NOT_RUN' and ratings['ratings'] == []
before, after = read('private-native-stress-pre-repair.json'), read('private-native-stress-post-repair.json')
for report in (before, after):
    assert report['caseCount'] == 16 and report['realProviderCalls'] == 0
    assert not report['actualNativeStoreAccess'] and report['semanticAssessment'] == 'UNMEASURED'
    assert all(trace['contractAgreement'] and trace['humanRating'] is None and trace['semanticModelRating'] is None for trace in report['traces'])
assert next(trace for trace in before['traces'] if trace['id'] == 'S17-U14')['outcome'] == 'released-synthetic-evaluation'
assert next(trace for trace in after['traces'] if trace['id'] == 'S17-U14')['outcome'] == 'blocked'
assert after['prohibitedNetworkAttempts'] == 0
hashes = read('package-hashes.json')
assert hashes['humanScore'] is None and hashes['semanticModelScore'] is None
for name, expected in hashes['hashes'].items():
    assert hashlib.sha256((root / name).read_bytes()).hexdigest() == expected, name
print(json.dumps(dict(status='PASS', cases=len(cases), sources=len(sources), humanAuthoring='NOT_RUN', semanticAssessment='UNMEASURED', providerCalls=0)))
