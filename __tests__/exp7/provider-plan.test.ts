import { PROVIDER_PLAN, CALIBRATION_CASE_IDS, dryRunSchedule, generationPayload, verificationPayload, validatePlannedInput, refuseProviderDispatch, dispatchDeniedAdapters } from '../../scripts/exp7/provider-plan';
import { fixtureAdapters } from '../../scripts/exp15-exp17/runner';
import { runStructuredDialogue } from '../../src/lib/ai/dialogue/structured/pipeline';
import { evaluationCases } from '../../scripts/exp7/fixtures';
import type { GenerationRequest, VerificationRequest } from '../../src/lib/ai/dialogue/structured/contracts';

test('proposal has distinct kernels and complete bounded fresh repeats, no spare/retry requests', () => {
  expect(PROVIDER_PLAN.baselineCommit).not.toBe(PROVIDER_PLAN.candidateCommit);
  const schedule = dryRunSchedule();
  expect(schedule).toHaveLength(64);
  expect(schedule.reduce((n, x) => n + x.maxCalls, 0)).toBe(128);
  for (const batch of [1, 2, 3, 4]) expect(schedule.filter(x => x.batch === batch).reduce((n, x) => n + x.maxCalls, 0)).toBe(32);
  expect(schedule.map(x => x.batch)).toEqual([1, 2, 3, 4].flatMap(batch => Array(16).fill(batch)));
  for (const batch of [1, 2, 3, 4]) expect(new Set(schedule.filter(x => x.batch === batch).map(x => x.repeat))).toEqual(new Set([1, 2]));
  expect(PROVIDER_PLAN.plannedInput + PROVIDER_PLAN.maxRequestedOutput).toBe(PROVIDER_PLAN.plannedTotal);
  for (const id of PROVIDER_PLAN.caseIds) expect(schedule.filter(x => x.caseId === id)).toHaveLength(4);
  expect(PROVIDER_PLAN.paidAllowanceUsd).toBe(0);
  expect(PROVIDER_PLAN.retries).toBe(0);
  expect(() => refuseProviderDispatch()).toThrow('not implemented or authorized');
});
test('native captured stage payloads exclude signal and evaluator labels; generation excludes gold draft', async () => {
  process.env.EXP15_EXP17_LOCAL_EVALUATION = '1';
  const seen = { generation: [] as GenerationRequest[], verification: [] as VerificationRequest[] };
  const scenario = evaluationCases().find(x => x.id === CALIBRATION_CASE_IDS[0])!;
  const oldFetch = global.fetch;
  global.fetch = jest.fn(() => { throw new Error('Network forbidden'); });
  try {
    await runStructuredDialogue({ expertId: scenario.expertId, query: scenario.turns[0].query, history: scenario.history, bundle: scenario.bundle, adapters: fixtureAdapters(scenario.turns[0], seen), maxAttempts: 1 });
    const generation = generationPayload(seen.generation[0]), verification = verificationPayload(seen.verification[0]);
    const input = JSON.parse(generation.messages[1].content);
    expect(Object.keys(input).sort()).toEqual(['attempt', 'context', 'feedback', 'version']);
    expect(JSON.stringify(generation)).not.toMatch(/expected|claimVerdict|dimensions|currentUserSentinel|"draft"|"signal"/);
    expect(Object.keys(JSON.parse(verification.messages[1].content)).sort()).toEqual(['context', 'draft', 'draftDigest', 'evidenceDigest', 'stateDigest', 'version']);
    expect(generation.max_completion_tokens).toBe(2048);
    expect(verification.max_completion_tokens).toBe(1024);
    expect(generation.tool_choice).toBe('none');
    expect(global.fetch).not.toHaveBeenCalled();
    expect(validatePlannedInput(generation, 1792).plannedTokens).toBe(2048);
    expect(validatePlannedInput(generation, 1792).hostedCountGuaranteed).toBe(false);
    expect(() => validatePlannedInput(generation, 1793)).toThrow('reservation');
    expect(() => validatePlannedInput(generation, NaN)).toThrow('reservation');
  } finally { global.fetch = oldFetch; }
});
test('real adapter seam remains categorically blocked in the native kernel', async () => {
  process.env.EXP15_EXP17_LOCAL_EVALUATION = '1';
  const scenario = evaluationCases()[0];
  const adapters = dispatchDeniedAdapters();
  const result = await runStructuredDialogue({ expertId: scenario.expertId, query: scenario.turns[0].query, history: scenario.history, bundle: scenario.bundle, adapters });
  expect(result.decision.reasons).toContain('real-model-evaluation-not-authorized');
  expect(result.providerCalls).toBe(0);
  await expect(adapters.generator.generate({} as GenerationRequest)).rejects.toThrow('not implemented or authorized');
});
