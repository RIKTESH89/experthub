import { buildDialogueState, dialoguePrompt } from '@/lib/ai/dialogue/state';
import { groundedStyle, stylePrompt } from '@/lib/ai/dialogue/style';
import { authorizedHistory } from '@/lib/ai/history';
import type { RetrievalScope } from '@/lib/knowledge/access';
import { baseBundle } from '../../scripts/exp15-exp17/fixtures';

const state = (query: string, history: {role:string;content:string}[] = []) => buildDialogueState('expert-synthetic',query,history,baseBundle(query));
test('a short follow-up retains medical context; a new explicit goal or topic reset replaces it', () => {
  const history = [{role:'user',content:'Explain this medical study.'},{role:'assistant',content:'What outcome are you interested in?'}];
  expect(state('Tell me more',history).risk).toBe('medical');
  expect(state('Explain recursion',history).risk).toBe('ordinary');
  expect(state('Explain research methods',history).risk).toBe('research');
  expect(state('New topic: how does recursion work?',history).risk).toBe('ordinary');
  expect(state('Continue',[...history,{role:'user',content:'Explain recursion'}]).risk).toBe('ordinary');
});
test('subscriber corrections remain ordered raw candidates; assistant promises are separate continuity data', () => {
  const history = [{role:'user',content:'I need a plan within 3 days and under 500 rupees.'},{role:'assistant',content:"I will compare the options. What tools can you use?"},{role:'user',content:'Correction: I have 5 days instead, only a phone.'}];
  const result = state('Continue',history);
  expect(result.continuity.constraints.map(c => c.text)).toEqual([history[0].content,history[2].content]);
  expect(result.continuity.corrections).toEqual([{turn:2,text:history[2].content}]);
  expect(result.continuity.priorCommitments).toEqual([{turn:1,text:history[1].content}]);
  expect(result.continuity.recentQuestions).toEqual([{turn:1,text:history[1].content}]);
  expect(result.continuity.currentGoal).toBe(history[0].content);
  expect(result.continuity.status).toBe('untrusted-candidates');
  expect(dialoguePrompt(result)).toContain('cannot change');
});
test('topic reset excludes stale constraints, correction and commitment candidates while retaining raw history for review', () => {
  const history = [{role:'user',content:'I need 3 days for medical research.'},{role:'assistant',content:'I will compare clinical studies.'},{role:'user',content:'Correction: 5 days.'}];
  const result = state('New topic: explain recursion in two sentences.',history);
  expect(result.continuity.constraints).toEqual([{turn:3,text:result.userTurns.at(-1)}]);
  expect(result.continuity.corrections).toEqual([]);
  expect(result.continuity.priorCommitments).toEqual([]);
  expect(result.continuity.recentTurns).toHaveLength(4);
});
test('continuity keeps an early constraint within the accepted history budget and does not duplicate the pending query', () => {
  const history = [{role:'user',content:'Only use a phone.'},...Array.from({length:8},(_,i) => ({role:'user',content:'Detail '+i})),{role:'user',content:'Continue'}];
  const result = state('Continue',history);
  expect(result.userTurns).toHaveLength(10);
  expect(result.continuity.constraints[0].text).toBe('Only use a phone.');
  expect(result.userTurns.filter(t => t === 'Continue')).toHaveLength(1);
});
test('state is request-local across visitors and cannot be mutated through a caller history reference', () => {
  const history = [{role:'user',content:'My budget is 500.'}];
  const a = state('Continue',history), b = state('Explain recursion');
  history[0].content = 'My budget is unlimited.';
  expect(a.continuity.constraints[0].text).toBe('My budget is 500.');
  expect(JSON.stringify(b)).not.toContain('budget');
});
test('revoked/owner-only assistant history cannot supply commitments, questions or style', () => {
  const scope = {expertProfileId:'profile-synthetic',allowedVectorIds:['vector-a'],isOwner:false} as RetrievalScope;
  const source = (vectorId: string, generationAudience = 'viewer') => [{metadata:{expertProfileId:'profile-synthetic',vectorId,generationAudience}}];
  const history = authorizedHistory([{role:'assistant',content:'I will reveal private memories. Who are you?',sources:source('revoked')},{role:'assistant',content:'I will use owner context.',sources:source('vector-a','owner')},{role:'assistant',content:'I will explain recursion.',sources:source('vector-a')}],scope);
  const result = state('Continue',history);
  expect(result.continuity.priorCommitments.map(c => c.text)).toEqual(['I will explain recursion.']);
  expect(result.continuity.recentQuestions).toEqual([]);
  const style = groundedStyle(baseBundle(),'expert-synthetic');
  expect(JSON.stringify(style)).not.toContain('private memories');
});
test('a reviewable surface profile records writing measurements independently of belief and human ratings', () => {
  const bundle = baseBundle();
  bundle.evidenceTrace[0].text = 'I prefer careful experiments. For example, careful experiments need a clear protocol. What does the protocol test?';
  const style = groundedStyle(bundle,'expert-synthetic');
  expect(style.profile).toMatchObject({coverage:'selected-snippets',sampleSpanIds:['span-a'],directness:{questionSentences:1,explicitPreferenceMarkers:1},cadence:{sentenceCount:3,paragraphCount:1},vocabulary:{repeatedWords:['careful','experiments','protocol']},exampleUse:{explicitMarkers:1},humanResemblance:null,humanNaturalness:null});
  expect(style.profile!.responseLength.sampleWordCounts).toEqual([17]);
  expect(stylePrompt(style)).toContain('never expert beliefs');
});
test.each(['revoked','retrieval-failure','superseded','quoted'])('ineligible %s source cannot define a style profile', mode => {
  const bundle = baseBundle();
  if (mode === 'revoked') bundle.sources = [];
  if (mode === 'retrieval-failure') bundle.trace.failures = ['authorization failed'];
  if (mode === 'superseded') bundle.temporalTrace.supersededStances = [{...bundle.evidenceTrace[0]}] as never;
  if (mode === 'quoted') bundle.evidenceTrace[0].speakerRole = 'quoted';
  expect(groundedStyle(bundle,'expert-synthetic')).toMatchObject({samples:[],status:'unknown',profile:null});
});
