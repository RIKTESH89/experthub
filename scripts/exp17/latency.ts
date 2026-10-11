import { writeFileSync } from 'node:fs';
import { performance } from 'node:perf_hooks';
import { runStructuredDialogue } from '../../src/lib/ai/dialogue/structured/pipeline';
import { baseBundle, draft } from '../exp15-exp17/fixtures';
import { fixtureAdapters } from '../exp15-exp17/runner';
const delay = () => new Promise<void>(resolve => setTimeout(resolve, 5));
async function main() {
    const samples: { unverifiedGenerationMs: number; verifiedFullBufferMs: number; outcome: string; calls: number }[] = [];
    for (let index = 0; index < 10; index++) {
        const response = draft('A base case gives recursion a stopping condition.');
        const provider = fixtureAdapters({ query: 'Explain recursion', draft: response, expected: 'released-synthetic-evaluation', dimensions: [] }, { generation: [], verification: [] });
        const generate = provider.generator.generate, verify = provider.verifier.verify, revalidate = provider.evidence.revalidate;
        provider.generator.generate = async request => { await delay(); return generate(request); };
        provider.verifier.verify = async request => { await delay(); return verify(request); };
        provider.evidence.revalidate = async (...args) => { await delay(); return revalidate(...args); };
        // A simulation of first unverified generation bytes, not a product baseline.
        let at = performance.now(); await delay(); const unverifiedGenerationMs = performance.now() - at;
        at = performance.now();
        const result = await runStructuredDialogue({ expertId: 'expert-synthetic', query: 'Explain recursion', history: [], bundle: baseBundle(), adapters: provider, deadlineMs: 500 });
        samples.push({ unverifiedGenerationMs, verifiedFullBufferMs: performance.now() - at, outcome: result.outcome, calls: result.providerCalls });
    }
    const percentile = (key: 'unverifiedGenerationMs' | 'verifiedFullBufferMs', p: number) => [...samples].sort((a, b) => a[key] - b[key])[Math.ceil(samples.length * p) - 1][key];
    const provider = fixtureAdapters({ query: 'Explain recursion', draft: draft('UNVERIFIED_RISKY_TEXT'), expected: 'blocked', dimensions: [] }, { generation: [], verification: [] });
    provider.verifier.verify = async () => new Promise(() => {});
    const timeout = await runStructuredDialogue({ expertId: 'expert-synthetic', query: 'Explain recursion', history: [], bundle: baseBundle(), adapters: provider, deadlineMs: 15 });
    const report = { mode: 'synthetic-full-buffer-latency-only', realProviderCalls: 0, sampleCount: samples.length, adapterDelayMs: 5, summary: { unverifiedGenerationP50Ms: percentile('unverifiedGenerationMs', .5), verifiedFullBufferP50Ms: percentile('verifiedFullBufferMs', .5), verifiedFullBufferP95Ms: percentile('verifiedFullBufferMs', .95) }, samples, deadline: { requestedMs: 15, observedMs: timeout.elapsedMs, outcome: timeout.outcome, reasons: timeout.decision.reasons, emittedRiskyText: timeout.text.includes('UNVERIFIED_RISKY_TEXT') }, limit: 'No production/provider streaming latency or atomic permission-at-emission guarantee; full-buffer returns only after all verification gates.' };
    writeFileSync('audit/exp17-acceptance-20261011/latency.json', JSON.stringify(report, null, 2) + '\n');
    process.stdout.write(JSON.stringify(report.summary) + '\n');
}
void main().catch(error => { process.stderr.write(String(error) + '\n'); process.exitCode = 1; });
