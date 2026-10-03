# Receiver local integration — 4 October 2026

New branch `codex/receiver-integration-local`, worktree `/Users/rikteshs20/Documents/Codex/2026-10-01/task-2/experthub-receiver-integration`, base published `2fe72a1a0b51450dd8b3fcfa929d04e0af7bfec8`. No push, hosted migration18, hosted roles/credentials, deployment, provider request or installation. Hosted state remains the previously verified protected2fe72a1 Preview and17 migrations. Separate receiver host-adapter work is not included and its checkout was not edited.

## Preserved provenance

| Source commit | Local integration commit |
|---|---|
| 9fc5b67e4abffd28d6c26406ac13ea2969606531 | 9638510d639a2c6f229e27cf9501af2f4e95632d |
| da030b9879e5071c547c233d8a1f42726bb44f67 | 1ebe4bddf335078dcd446a7e17c3e96ee3b059c8 |
| 0acd3241d811a15d3c2e483b2434c87d2dd19ef4 | 93133e08edc5d9c1c45fc464f6486e1b517ae65e |
| d493920cf7dda4ca004bfa0bdc964b778a108447 | d8d972d19ccced6b99f96b36b63fe10b577212b1 |
| 771f3a35abbfc83d9fc29234d948142554f93cc1 | 16032c5876918d7601991c725e1dc9ba9baa4289 |
| a51303dfc9f8b215ab56e588da7c136a2f7335fd | c94da303902b5a8e28a08e6ae82454a7e842649d |
| 82e279b0fbe4f28637ee0462fd7669b105dc34a1 | 43c17373c53fabbf1e367181364c23cddfdd343e |

No conflicts, squashing or edits to accepted receiver source. Integration owns only migration wrapper, wrapper tests, native integration runner and audit evidence.

## Guarded17→18 upgrade

Manifest now pins18 migrations and exact migration `20261004000100_staging_webhook_inbox`, SHA256 `b66506651f55e743e5c36477b6294d90154df254ac6db7db55962b9d7c52619c`. Safe manifest parser recognizes reviewed quoted and unquoted simple CREATE TABLE names; this includes `staging_webhook_inbox` rather than silently ignoring it.

Only exact completed predecessor17 or current18 histories qualify. Predecessor49/current50 application tables plus ledger, existing8 immutable triggers,5 payment columns. Current state additionally verifies inbox9 columns/types/nullability/defaults, digest primary key, all4 exact CHECK definitions and exact partial due index. Fixed safe SCHEMA_INBOX diagnostic added. Selection/environment/origin/URL allowlists, required hostedPG16 identity, checksum/completion enforcement and standard Prisma migration engine remain fail closed. No reset/resolve/seed or fabricated ledger.

Owned local runner applies17 migrations through ordinary Prisma config, verifies predecessor, applies only18, then verifies full ledger/schema. Five transactional drift probes prove missing attempt/digest CHECKs, changed attempts default, weakened raw-body nullability and dropped due index reject SCHEMA_INBOX; probes roll back and final schema re-verifies.

## Observed results on the complete candidate

| Check | Result / evidence |
|---|---|
| Full standalone TypeScript after integration edits and private client generation | PASS; typecheck.log |
| Full unit suite | 1239/1239,76 suites; unit-tests.json/log |
| Full Next lint | PASS, no warnings/errors; lint.log |
| Guard suite | 84/84 including predecessor17/current18/old16 rejection and inbox failure; guard-tests.log |
| Receiver native | 26/26 including actual restricted-role grants/denials; receiver/tests.json/log |
| Existing native billing parity | 86/86,7 suites; receiver/parity-tests.json/log |
| Native retrieval / correction | 10/10 /20/20; native14.json /native16.json |
| Exact local17→18 migration and schema drift rejection | PASS; migration-ledger.json, inbox-constraints.json, native-run.log |
| Production/Preview builds | PASS/PASS, offline font fixture and BUILD_ONLY; production-build.log /preview-build.log |
| Compiled Chrome production/Preview | 5 checks /8 groups PASS; zero external requests/page errors; production-browser.json /built-browser.json |

Counts overlap; do not add them as unique cases. Independent accepted receiver review30/30 plus86/86 parity is preserved under independent-receiver, including the original four regression cases as non-executable .ts.txt. Its historical full-unit/type diagnostics describe the original lane before wrapper/audit integration, not this candidate. No executable audit TypeScript files were added after the full check. Final evidence additions are JSON/log/text only.

Owned local PostgreSQL/Next/Chrome processes stopped; owned ports55447/55439 have no listeners. Native runtime is PostgreSQL18.6, not proof of PostgreSQL16. Local synthetic login roles/grants exist only in disposable test cluster files and were removed with those stopped clusters; no hosted roles created. Browser credentials/sessions and loopback aliases are synthetic, not actual Google OAuth/deployed TLS/protection evidence. Offline font fixture does not prove font delivery. Source hashes cover src, accepted staging-webhook files and migration wrapper.

## PostgreSQL16 availability and smallest setup

No PostgreSQL16 executable at Homebrew16 paths or Postgres.app16; only Homebrew PostgreSQL18.6 installed. No docker/podman/colima/nerdctl/limactl executable available. No persistent service installed and no hosted database substituted.

Smallest additional test prerequisite is a supplied isolated PostgreSQL16 binary/runtime with a matching pgvector extension (at least0.5), or an already-configured disposable container runtime with a PG16+pgvector image. Run the same owned synthetic17→18, inbox drift, receiver/grant and billing parity checks there; shut it down afterward. Current work does not authorize installing/provisioning that prerequisite.

## Remaining gates

Receiver host packaging/path/method policy, generated Prisma engine/alias resolution and deployment lifecycle are still separate lane work. No new receiver HTTP route is exposed in this candidate; existing protected Preview webhook remains isolated. Keep receiver and all experimental/billing flags off.

Before hosted18: independently review packaged adapters, obtain PG16 compatibility evidence, verify exact control-plane staging identity/capability/plan/limits, then request separate exact-commit publication/migration18 approval. Dedicated receiver/worker roles, grants/default/PUBLIC privileges/RLS, distinct secrets/pool/direct URLs, raw-body retention, dead-letter ownership and replay procedure require separately approved setup. Column grants should be narrowed wherever reducer queries permit. No owner client reuse is allowed.

Authenticated wake/recovery scheduling and Razorpay Test webhook registration/plans/transactions remain separately approved steps. Natural-model quality, actual OAuth/payment/email acceptance, ops restore/load limits and genuine volunteer feedback remain public-launch gates. Distinct serialization still increments billingVersion and may require a fresh admin review despite idempotent business effects. Acceptance here is a verified local candidate, not hosted18 or launch approval.
