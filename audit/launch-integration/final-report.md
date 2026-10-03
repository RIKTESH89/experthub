# Final local launch integration

Worktree /Users/rikteshs20/Documents/Codex/2026-10-01/task-2/experthub-integration; branch codex/launch-integration-oct03; base c83bf907898d8a1ffc257888f5800f27a210e1d2. Canonical and lane checkouts remain untouched.

## Provenance and integration corrections

- EXP27 a42455d4cca0705b3ab0cf76cdcf3b51be0381e9 -> 037dea52849bb31e27d52f7349b3b485e47747e5.
- EXP30 08b5064ccca67bdcf13c9dea9ac5b1e0f8aca11c -> 9a153a5f4e3934c44ff8b2e3593bf5e926d4b111. Metadata correction/review 9c864f775d84a4323fd5526fcaf306c05fefc34c.
- EXP14 aef201079e79e658ccfc84853642cfe8b638ed61 -> cb353aa6e3dc17e5a565d06a952a468559b006c2; SQL/prompt follow-up 7be74c3cb74eb0b19ff9ea8b4002356d9e74ab4c -> a7e15c31e056c568342052551f4b469d4f14ba1f.
- EXP16 2c5eee36569b79d29ab40d04ea3edb9ebfb4b25e -> d9674eca26955dc551e58135c1a6a5316940681c; UI 5c8a0260efc8474ad1596b37d6bd835f58dcece6 -> 7adde300476d56a1628afe52da348b473a8c8cbc.
- Integration guard/rollback fixes 8cec7fbb92d269c826ebe53af45b804f396b12ae. Final correction aligns read-only rollback preview with authoritative rejection for either direction of current RAG permission change; two additional native regressions.

Local NODE_ENV=production alone cannot opt into indexing. Explicit VERCEL_ENV=production and configured HTTPS origin are required; IP/local/internal/nonstandard-port origins fail closed. Root noindex also changes SEO of public expert/post/shared routes; only home/about/pricing opt in. This requires an explicit release indexing decision; shared conversations must not silently become searchable. Policy drafts remain unrouted and unapproved.

## Final evidence actually rerun in integration

- Full Jest1063/1063 across66 suites; no failures. final-counts.json/final-jest.log. TypeScript noEmit and full Next lint pass. Generated timing artifacts restored to committed source bytes.
- Isolated dependency APFS copy, then standard Prisma6.19.2 generate only in integration copy. No installation or canonical/lane client generation.
- Production and Preview full Next builds pass via normal wrapper BUILD_ONLY branch, no hosted migration. Existing harness-only system-font substitution replaces Google download; not real font-serving/typography proof. Preview uses exact canonical branch/host gate and separate synthetic Google credentials/pin, derived public boolean, general provider isolation intact. Production mode remains preserved.
- Native EXP14 actual SQL10/10 on integration-owned PostgreSQL18/pgvector0.8.6. Integration copy changes only exact synthetic DB/role/port safety checks and evidence output paths; source publication/retrieval/extractor code remains actual. Evidence in exp14-native and native14.log.
- Native EXP16 actual SQL20/20 including concurrency, source/head/review CAS, idempotency, audit update rejection, additive rollback, imported-source refusal and both-direction RAG preview/confirm permission preservation. native16-final.log.
- Standard Prisma engine real predecessor15 verified42tables/6triggers then additive16 verified46tables/8triggers; separate fresh16 verified same. Reviewed migration name/checksum remains pinned. Guard mock preflight retains exact hosted PostgreSQL16 restriction; native18 is not hosted16 identity/runtime proof. Earlier predecessor attempt inherited root16 config; explicit isolated config/new database established genuine15; no reset/fabricated ledger.
- Fresh Chrome against compiled Preview:8 groups pass, including6 public width cases, anonymous redirect/API401, subscriber layout redirect/API403, owner cancel/no writes, repeated acceptance/one outbox job, stale source conflict, rollback preview/cancel/no writes then new release, existing synthetic session revocation after deactivation, Google button/provider canonical callback and five Preview provider503 guards. Zero page errors/external requests in final valid run. Real middleware/layout/API/DB/client, not component-only. built-browser.json and built-review.png.
- Fresh Chrome against production build:5 checks pass: three canonical/indexable public pages, anonymous review redirect, login noindex. production-browser.json. Local Next normalizes review redirect hostname to localhost; harness permits only equivalent loopback origin on same port.

## Harness boundaries and invalid attempts

Sessions are synthetic, signed with a synthetic-only secret for this loopback app/database; no owner or production token is read/created/exported. Preview HTTPS alias is intercepted to a hard-pinned loopback HTTP socket; no deployed TLS/Vercel protection proof. HTTP redirect destinations are verified locally then navigated through harness script because browser redirect-chain requests bypass Playwright routing. Early invalid proxy runs followed redirects to protected Preview/Vercel login; those runs are excluded, and final proxy never follows remote redirects. No real credentials, provider API action, hosted DB migration/write, push or deployment.

Other harness corrections were expectation-only: real expert layout redirects subscribers to their feed before page-level denial, authenticated owners do not remain on login, and production test server must match the synthetic build origin. No product auth exception added.

## Remaining feature/release gaps

Negative 'do not prefer' EXP13 projection still omits decision-case reasons/constraints/exceptions; null means unknown, not false. Do not claim constraint-complete counterevidence. Pattern/lexical routing, bounded candidate coverage and semantic paraphrases remain limited. Real model answer faithfulness, source-injection resistance, retrieval-to-delivery races, broad human judgments and load remain unproved.

Correction UI is dedicated /expert/reviews without global nav. Manual sources only; post/PDF/blog/document adapters unsupported. Imported/document evidence can block releases. Accepted source recomputation is queued, not actually run against a provider here. Outbox scheduling/serving completion requires separate acceptance. Persona release snapshots are not automatically adopted into chat or answer tracing.

Deployed DNS/TLS/S3 header/IAM behavior, multipart aggregate memory, full media decoding/malware, digest replay/durable dispatch remain open. Approved public policies, retention/export/deletion, operational contacts and public-route indexing choices remain release decisions. Google negative identity/natural session expiry and Razorpay Test Mode remain separate owner/provider acceptance; all payment/other provider gates remain disabled in Preview.

## Scope needed for future staging

This branch is local and staging still serves c83bf907. Future publication needs explicit exact-commit push/deployment approval and hosted additive migration16 authorization. Guard allows verified predecessor15 ->16 with standard engine, no seed/reset/resolve. Existing staging subscriber is not an expert; review UI hosted access requires a separately approved test identity/role/fixture plan. No role elevation or fixture creation is implicitly authorized. New feature serving and provider recomputation need explicit acceptance rather than declaring EXP14/16 complete.

All loopback servers and integration-owned database cluster are stopped at handoff; runtime directories ignored.
