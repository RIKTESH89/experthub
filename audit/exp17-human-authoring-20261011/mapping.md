# Source/input mapping and local seam

`developer-seed-inputs.json` version `exp17-human-authoring-seeds-v1` has a source registry and sixteen cases. Each case has `sourceIds`, query, represented person ID, history, evaluation clock, frame, declared temporal relations and delivery event. Empty history is explicit. The authoring registry contains complete provenance and both access snapshots for the human gold author; future access loss must not be made available to generation or semantic verification before it occurs.

`scripts/exp17-human/native-stress.cjs` maps selected source IDs to native EvidenceBundle evidenceTrace using only native reference/content/provenance fields. It maps declared validFrom/validUntil/recordedAt to temporal stances and attaches declared contradiction relations. Source-level author/speaker/endorsement metadata is retained; timestamps become Date values. Case frame controls claim recorded/as-of/current mode, while retrieval plan uses the evaluation clock or explicit as-of instant. `recordedAt` is not substituted for missing validity. `revisionId`, `spanId`, `contentHash`, and `sourceVersion` become references; raw source text hash is preserved.

The fixture-only `permittedAtDelivery`, `permittedAtRetrieval`, `provenanceNote`, expected labels and `deliveryEvent` are not forwarded into adapter context. The generator asserts their absence. The synthetic evidence revalidator consumes the delivery event: U10 removes evidence on the second read, after semantic review; U11 removes evidence on its first read. This models an invalidation response only, not the real access service or database transaction. No database module or native provider adapter is substituted as passing evidence.

Fixed candidate text/category and reviewer observedCategory/verdict are separately frozen in `private-fixed-candidate-profiles.json` before native invocation. Matching labels intentionally reproduce compromised/permissive classification; they are not independent semantic judgment. Snapshot digest binding and one-attempt behavior come from the actual pipeline. Reports call native `providerCalls` counters `syntheticAdapterInvocations` to avoid implying wire calls. Global fetch throws if dispatched. Native source hashes and kernel HEAD are recorded; code at a different HEAD requires explicit pin review.

Rebuild authored JSON with `python3 scripts/exp17-human/build-package.py`. After that, execute the fixed owned kernel from its checkout using:

```sh
EXP15_EXP17_LOCAL_EVALUATION=1 NODE_ENV=test TS_NODE_PROJECT=tsconfig.json \
EXP17_NATIVE_STRESS_TARGET=/Users/rikteshs20/Documents/Codex/2026-10-11/task-5/workers/exp-17 \
EXP17_NATIVE_STRESS_PHASE=post-repair EXP17_NATIVE_STRESS_HEAD=17543b1dfb4ac758f27632b649da7c9e61fd4288 \
node -r ./scripts/exp15-exp17/register-alias.cjs -r ./node_modules/ts-node/register/transpile-only scripts/exp17-human/native-stress.cjs
```

The alias bootstrap must precede ts-node so CommonJS options are set before compiler initialization. To target integration, use its tsconfig and its alias bootstrap, explicit current integration HEAD and `EXP17_NATIVE_STRESS_TARGET` accordingly; do not reuse this command after HEAD changes without reviewing source changes. Original pre-repair43b trace is preserved rather than recreated against repaired integration. This runner is not EXP-7's provider runner or the official human heldout evaluation.

After native reports are stable, rebuild package hashes with the builder again. `package-hashes.json` hashes every JSON file other than itself, plus README.md and mapping.md; scripts are covered by the Git commit. It never fills human gold or ratings.
