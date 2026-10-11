import { mkdirSync, readFileSync, writeFileSync } from 'fs';
import { relative, resolve, sep } from 'path';
import { localDialogueEvaluationEnabled } from '../../src/lib/ai/dialogue/local-evaluation';
import { runOffline, frozenManifest } from './runner';
import { DIMENSIONS, hash, type Manifest } from './protocol';

async function main() {
  if (!localDialogueEvaluationEnabled()) throw new Error('Explicit local test/development evaluation required');
  const output = resolve(process.argv[2] || 'audit/exp7-acceptance-20261011/run-1');
  const within = relative(process.cwd(), output);
  if (within.startsWith(`..${sep}`) || within === '..' || resolve(output) === resolve(process.cwd()) || within.startsWith(sep)) throw new Error('Output must remain in a child of this checkout');
  const manifest: Manifest = process.argv[3] ? JSON.parse(readFileSync(process.argv[3], 'utf8')) : frozenManifest();
  // No network/DB/credential imports. Also trip on an accidental future fetch.
  globalThis.fetch = async () => { throw new Error('External calls forbidden by offline evaluation'); };
  const result = await runOffline(manifest);
  mkdirSync(output, { recursive: true });
  writeFileSync(resolve(output, 'manifest.json'), JSON.stringify(result.manifest, null, 2) + '\n');
  writeFileSync(resolve(output, 'metrics.json'), JSON.stringify(result.summary, null, 2) + '\n');
  writeFileSync(resolve(output, 'traces.jsonl'), result.traces.map(t => JSON.stringify(t)).join('\n') + '\n');
  const deterministicHash = hash(result.traces.map(({ localElapsedMs, ...trace }) => { void localElapsedMs; return trace; }));
  writeFileSync(resolve(output, 'repeat-comparison.json'), JSON.stringify({ deterministicHash, pairs: result.pairs, timingExcluded: 'Local elapsed measurements vary; all inputs, outputs and adapter requests remain in comparison.' }, null, 2) + '\n');
  const first = result.traces.filter(t => t.repeat === 1);
  writeFileSync(resolve(output, 'coordinator-answer-key.json'), JSON.stringify(result.answers.map((a, i) => ({ ...a, caseId: first[i].caseId, turn: first[i].turn, variant: first[i].variant, expected: first[i].expected, requestsDigest: hash(first[i].requests) })), null, 2) + '\n');
  const csv = (v: string) => `"${v.replace(/"/g, '""')}"`;
  writeFileSync(resolve(output, 'blank-human-rating-form.csv'), 'reviewer,blindId,answerHash,dimension,score,evidence\n' + result.answers.flatMap(a => DIMENSIONS.map(d => ['', a.blindId, a.answerHash, d, '', ''].map(csv).join(','))).join('\n') + '\n');
  const packet = ['# Synthetic review packet — human ratings NOT RUN', '', 'The answers come from predefined synthetic adapters, not models. Partial label blinding only: response content may reveal condition. Keep coordinator-answer-key.json and raw traces with the coordinator. No reviewers have been contacted.', '', 'Score 1–5 or not-assessable with evidence for each dimension. Faithfulness: exact eligible-source entailment, correct person/time/polarity, unknowns. Style: author-only surface form; no personality claim. Naturalness: coherence, responsiveness, tone, repetition. Usefulness: appropriate continuity and constraints. Abstention: both invented specifics and needless refusal. Two independent raters and explicit disagreement adjudication are required.', '', '## Eligible source corpus shared by both answers', ...manifest.documents.filter(d => d.split === 'corpus').map(d => `\n${d.id} (${d.personId}, ${d.publishedAt}, public):\n${d.chunks.map(c => c.text).join('\n')}`), '', '## Excluded sources', 'August 2026 documents and their neighboring chunks, premium material, and another person’s source are withheld from every answer context. Do not credit an answer for inventing those facts.', '', ...result.answers.map((a, i) => {
    const t = first[i], reviewRequest = (t.requests.verification.at(-1) || t.requests.generation.at(-1)) as { context: { bundle: unknown } } | undefined;
    return `## ${a.blindId}\n\nQuestion: ${t.query}\n\nPrior conversation:\n\n${t.history.map(h => `${h.role}: ${h.content}`).join('\n\n') || '(none)'}\n\nAvailable source snapshot (including authorship, time, conflicts and gaps):\n\n\`\`\`json\n${JSON.stringify(reviewRequest?.context.bundle || null, null, 2)}\n\`\`\`\n\nAnswer:\n\n${a.text}\n\nAnswer SHA-256: ${a.answerHash}\n`;
  })];
  writeFileSync(resolve(output, 'reviewer-packet.md'), packet.join('\n') + '\n');
  process.stdout.write(JSON.stringify({ output: within, traces: result.traces.length, repeatPairs: result.pairs.length, deterministicHash, failures: result.summary.contractFailures.length, realProviderCalls: 0, humanRatings: 0 }) + '\n');
  if (result.summary.contractFailures.length || result.pairs.some(p => !p.sameInputs || !p.sameOutputs)) process.exitCode = 1;
}
main().catch(error => { process.stderr.write(String(error) + '\n'); process.exitCode = 1; });
