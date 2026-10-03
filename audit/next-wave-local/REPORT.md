# Next-wave local integration — 3 October 2026

Local-only branch `codex/next-wave-local-oct03`, isolated worktree `/Users/rikteshs20/Documents/Codex/2026-10-01/task-2/experthub-next-wave-integration`, frozen base `d8c4eb3acc2ee8a8595f3bc5bea67da763d48203`.

## Reviewed lane provenance

All source commits were preserved through cherry-picks; no squashing of lane history.

| Lane | Source commit | Local integration commit |
|---|---|---|
| Payments | 52b3162593717a5dbacf5ceaa065c665195595a3 | 6eebaf5e7614909c6fa650dda3e9475c6ddf2ce0 |
| Payments | ec2615e7fef5ed8074949b557694df27dbfb0ac3 | 5a9d286431154700bcd47b193992292aaf8cf42b |
| Payments | 5bf6a207c5b88865a519bfd0fd3cb2cf593bb6ff | 971e55e18e0855b048a7142321a1d8a1ec147459 |
| Payments | 1c34424e2b8199b8f2b84de9a27d547ebbfce010 | 6fa72343e5124383f4662ab02f007d2da2ed3364 |
| Payments | 58a4c814a30f40284d5ee26dac3cfdcaba21831b | f3d0fbe9a1ed4055edeefacb8dc336a5942e996d |
| Recovery | 21c2628e5cf99ea27e56041dfe5cc99f6eea510b | 3b1074269b4ad27fd790f25f45854ce24da2f0a3 |
| Recovery | 292734c878f6f7a9cb7e07242f43f8d295bb9b01 | 4495a03b89f16c340f1c87d00a6e83d974a31dc8 |
| Dialogue | 838f6ec290efbc421a1c5a2e342598ebbb51a830 | b40a58bc57e6c074ee2ee4ce8a005cb8a5b858f6 |
| Dialogue | b7b7d3e5953d5672fd6b09cc088c0795499863ae | c19fd36293735d93388dc296a711ca045e2881d9 |
| Dialogue | df48d1aa9198f21c77710d55a150e32ea4aca10c | f22bc3cf6ce149b51c2e54a3f25fc7a516adac30 |
| Dialogue | d447fec7d3e096317e1332e0579ee28fe6b5534e | f8b90d9f2e251037a55e93abbac8d79f347d0549 |

The recovery checkout shares the integration object database. Its initially guessed branch name did not resolve, but exact source commit objects were present and cherry-picked successfully. No external fetch was performed.

## Integration changes

- Local migration guard now pins 17 migrations, additive migration `20261003180000_billing_recovery_outbox`, SHA-256 `64d8320bc94d117ea4af9454791cb23f85c342739ddee0de855b7d40c36608b2`. Only exact completed predecessor16 or current17 history qualifies; predecessor46/current49 application tables, eight existing immutable triggers, predecessor4/current5 payment columns. Hosted target restrictions and standard Prisma engine retained; no hosted execution occurred.
- Added owned local native/build/browser runner. Specifies valid C locale, checks its loopback port is free, creates a fresh cluster, retains evidence and stops its own cluster. Initial locale setup attempts failed before tests; final run passed. No reset/resolve/fabricated ledger.
- Corrected four strict TypeScript errors in recovery harness: pipe nullability and job-array type.
- Updated API unit mocks to include transactional `findUniqueOrThrow` calls. Existing counter expectations now assert recomputation, not increments/decrements. Legacy unpaid E2E unsubscribe fixture is explicitly FREE. No additional production behavior changes beyond reviewed lanes and migration guard.
- Default dialogue delegates to frozen source. Exact source comparison differs only in exported function name. EXP15/17 is evaluation-only, explicitly opt-in for development/test and blocked in production/known hosted runtimes. No evaluation flag was set during builds/browser runs.

## Independently observed acceptance

| Check | Result | Evidence |
|---|---|---|
| Full unit suite | 1148/1148, 72 suites | unit-tests.json, unit-tests.log |
| Combined native billing | 44/44, 5 suites | exp32-34/tests.json, tests.log |
| Combined recovery harness | 16/16, 2 suites | exp28-29/jest.json; recovery.json; checksums.json |
| Native retrieval | 10/10 | native14.json, native14.log |
| Native correction/release | 20/20 | native16.json, native16.log |
| Strict full TypeScript | PASS | typecheck.log |
| Full Next lint | PASS, no warnings/errors | lint.log |
| Client generation/schema | PASS in private dependency copy | generate.log; exp32-34/schema-validation.log |
| Real predecessor16 -> additive17 | PASS, matching completed ledger,49 tables/eight triggers | migration-ledger.json; native-predecessor16.log; native-upgrade17.log |
| Production build | PASS, wrapper BUILD_ONLY | production-build.log |
| Compiled production Chrome | 5 checks PASS | production-browser.json |
| Preview build | PASS, wrapper BUILD_ONLY | preview-build.log |
| Compiled Preview Chrome | 8 groups PASS, no page errors/external requests | built-browser.json; built-review.png |

Test totals overlap; do not sum them as unique cases. Native PostgreSQL18 is local runtime evidence, not proof of the hosted PostgreSQL16 environment. Builds use existing offline system-font substitution, not typography/font delivery proof. Browser harness uses installed Chrome, synthetic sessions/credentials and loopback SQL. No agent-browser CLI was available; compiled-server verification used the existing Playwright/Chrome harness without installing anything. No dev server was started.

Recovery checked full ordered row contents/checksums across all49 application tables before interruption, after restart and after restore, then recovered pending/running intents and verified20 replays unchanged. Synthetic nonzero embeddings exercise real ingestion/pgvector/publication; callback tests exercise actual SQL job lifecycle. This is not HTTP/chat capacity or a ten-user launch proof.

All owned PostgreSQL/Next/Chrome processes stopped after verification. Disposable database files remain locally for evidence. Standalone lane audit files were restored; integration run output lives here. Original frozen integration checkout remains d8c4eb3; canonical checkout remains c83bf907.

## Release limitations

No push, hosted migration, deployment, production access, credential changes, payment-provider calls or real email occurred. This wave requires separate exact-commit publication approval and hosted additive migration17 approval before serving it.

EXP15/17 natural dialogue remains unaccepted: semantic/free-form verification is unconditionally unreleased; source formatting is not voice/personality faithfulness; permission reads are not atomic with delivery. The unmarked hosted development-server limitation of the local environment gate remains documented.

EXP32 has no automated lookup of ambiguous provider objects. EXP33 has no production transport/scheduler/durable downstream dedupe; webhook and free-subscription email now enqueue only, so email will remain undelivered until an approved worker/receiver exists. Delivery is at-least-once, including operations outliving a lease. EXP34 has no production legacy scanner, provider-evidence fetcher or authenticated reviewer identity/signature workflow. Synthetic operator apply is loopback-database-only. Public-launch/payment acceptance must not infer those capabilities from these tests.

## Secondary Razorpay SSL inspection

Repository code/config search found no certificate pinning, checkServerIdentity override, custom HTTPS agent/CA trust bundle, NODE_EXTRA_CA_CERTS, or disabled TLS verification. `src/lib/razorpay.ts` initializes the SDK using only its API key ID/secret; no transport overrides. No environment values were read or disclosed.

Official Razorpay guidance confirms rotation on 5 October 2026 at 22:00 IST and says ordinary trust requires no replacement; affected configurations are certificate pinning/whitelists/custom trust stores: https://razorpay.com/docs/security/whitelists/guidelines-ssl-cert-rotation/ . Code evidence suggests no application change is needed, but deployed runtime environment names/trust configuration were not inspected, so runtime verification remains outstanding. No authenticated Razorpay call or TLS change was made.
