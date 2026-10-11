/* Offline protocol probe. No secret access or provider transport is implemented. */
const fs = require('fs'), path = require('path'), crypto = require('crypto'), cp = require('child_process');
const [kernelRoot, expectedCommit, output] = process.argv.slice(2);
if (!kernelRoot || !expectedCommit || !output) throw new Error('Require kernel root, exact commit and owned output file');
const hash = value => crypto.createHash('sha256').update(value).digest('hex');
if (cp.execFileSync('git', ['rev-parse', 'HEAD'], { cwd: kernelRoot, encoding: 'utf8' }).trim() !== expectedCommit) throw new Error('Kernel pin mismatch');
if (cp.execFileSync('git', ['status', '--porcelain', '--untracked-files=no'], { cwd: kernelRoot, encoding: 'utf8' }).trim()) throw new Error('Tracked kernel drift');
process.env.NODE_ENV = 'test'; process.env.EXP15_EXP17_LOCAL_EVALUATION = '1';
global.fetch = () => { throw new Error('Offline network denied'); };
require('http').request = require('https').request = () => { throw new Error('Offline network denied'); };
require(path.join(kernelRoot, 'scripts/exp15-exp17/register-alias.cjs'));
require(path.join(__dirname, '../../node_modules/ts-node/register'));
const { runStructuredDialogue } = require(path.join(kernelRoot, 'src/lib/ai/dialogue/structured/pipeline.ts'));
const { fixtureAdapters } = require(path.join(__dirname, '../exp15-exp17/runner.ts'));
const { evaluationCases } = require(path.join(__dirname, 'fixtures.ts'));
const { generationPayload, verificationPayload, dispatchDeniedAdapters, CALIBRATION_CASE_IDS } = require(path.join(__dirname, 'provider-plan.ts'));
function graph() {
  const seen = new Map(), pending = ['src/lib/ai/dialogue/structured/pipeline.ts', 'scripts/exp15-exp17/register-alias.cjs', 'package-lock.json'];
  while (pending.length) {
    const file = pending.pop(); if (seen.has(file)) continue;
    if (!/^(src|scripts)\//.test(file) && file !== 'package-lock.json') throw new Error('Graph escaped controlled roots');
    const text = fs.readFileSync(path.join(kernelRoot, file), 'utf8'); seen.set(file, hash(text));
    if (seen.size > 100) throw new Error('Unbounded graph');
    if (file === 'package-lock.json') continue;
    for (const match of text.matchAll(/\bimport\s+(?!type\b)(?:[^;]+?\s+from\s*)?["']([^"']+)["']/g)) {
      const specifier = match[1];
      const local = specifier.startsWith('@/') ? `src/${specifier.slice(2)}` : specifier.startsWith('.') ? path.posix.normalize(path.posix.join(path.posix.dirname(file), specifier)) : null;
      if (local) pending.push(/\.(ts|tsx|js|cjs)$/.test(local) ? local : `${local}.ts`);
    }
  }
  return Object.fromEntries([...seen.entries()].sort());
}
(async () => {
  const rows = [];
  for (const id of CALIBRATION_CASE_IDS) {
    const scenario = evaluationCases().find(x => x.id === id), turn = scenario.turns[0];
    const seen = { generation: [], verification: [] };
    const input = { expertId: scenario.expertId, query: turn.query, history: scenario.history, bundle: scenario.bundle, maxAttempts: 1 };
    const result = await runStructuredDialogue({ ...input, adapters: fixtureAdapters(turn, seen) });
    const denied = await runStructuredDialogue({ ...input, adapters: dispatchDeniedAdapters() });
    if (denied.providerCalls !== 0 || !denied.decision.reasons.includes('real-model-evaluation-not-authorized')) throw new Error('Kernel real-model seam not denied');
    rows.push({ caseId: id, inputHash: hash(JSON.stringify(input)), syntheticOutcome: result.outcome, syntheticReasons: result.decision.reasons,
      generationExamples: seen.generation.map(generationPayload), verificationExamples: seen.verification.map(verificationPayload),
      note: 'Known calibration; verification example uses fixed mock draft, never a fresh model result. No human heldout payload exists yet.',
      localRenderedTokens: null, hostedTokens: null, paidCost: null, actualProviderRequests: 0, realSeamReason: denied.decision.reasons });
  }
  const sourceGraph = graph();
  fs.mkdirSync(path.dirname(output), { recursive: true });
  fs.writeFileSync(output, JSON.stringify({ kernelCommit: expectedCommit, sourceGraph, sourceGraphHash: hash(JSON.stringify(sourceGraph)),
    mode: 'offline-known-calibration-payload-probe', realProviderCalls: 0, rows }, null, 2) + '\n');
  process.stdout.write(JSON.stringify({ kernelCommit: expectedCommit, sourceGraphHash: hash(JSON.stringify(sourceGraph)), cases: rows.length, realProviderCalls: 0 }) + '\n');
})().catch(error => { process.stderr.write(error.stack + '\n'); process.exitCode = 1; });
