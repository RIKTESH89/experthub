# Offline real-model protocol preparation

No model transport or secret lookup exists. All public documentation research used official Groq pages; no synthetic payload was sent. Three new protocol tests plus 36 existing EXP7 tests pass; types/lint pass. Two exact clean native kernels were exercised using fixed calibration fixtures, with identical external input hashes, distinct recursive source graphs and real-adapter denial. Known stage samples fit a 2,048 planned input reservation using existing cached Harmony assets; future human-heldout/generated-verifier payloads still require their own checks.

Run tests locally:

```sh
node node_modules/jest/bin/jest.js --runInBand __tests__/exp7
node node_modules/typescript/bin/tsc --noEmit --incremental false
node node_modules/next/dist/bin/next lint --file scripts/exp7/provider-plan.ts --file __tests__/exp7/provider-plan.test.ts
```

To reproduce the two-kernel probe, create separate clean disposable checkouts at the exact baseline/candidate commits, provide existing locked dependencies by read-only symlink, then:

```sh
node scripts/exp7/dry-provider-kernel.cjs /absolute/kernel-checkout EXACT_FULL_COMMIT /absolute/owned-output.json
```

The probe refuses tracked drift and wrong HEAD, blocks fetch/http/https request, records exact local source closure and captures four known native synthetic stage payloads. Direct real seam invocation also refuses. Remove only these owned checkouts after preserving evidence. Current source guard remains unchanged. The four calibration cases are not external-call targets or human gold. Verification examples are mock drafts, plainly labeled. Actual future generated drafts must be passed through the same serializer and budget/schema gate without supplying expected fixtures.

`proposal-manifest.json` describes 128 maximum wire attempts / 64 logical targets over four batch-contiguous daily groups, not an activated run. It records NOT_AUTHORIZED and uncreated HG001..016 gold. `approval-package.md` carries history, exact recipient/fields/budgets/measurements and two unresolved human/provider scope decisions. `issue-gates.md` keeps six-issue acceptance separate. `human-gate-pins.json` pins EXP15's proposed blank human gate packet, which does not supply completed ratings or authoring.

Independent EXP14 prep review found inconsistent official case IDs and repeat-major ordering incompatible with daily batches; both were repaired, and explicit batch-contiguous/repeat-membership regression added. It also flagged the newly discovered 43b U14 candidate weakness; source 43b is retained as an honest dry historical pin, and future execution requires a newly reviewed repaired sourcefreeze. No quality approval or issue Done is inferred.
