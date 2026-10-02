# Safe staging guard diagnostics

Base: 86db7277d531b9aa3c004a60fcad56b0688899de. Local diagnostics only; no push, second deployment, migration, reset, seed, or environment modification in this slice.

## Observed failed deployment

Exactly one approved manual Preview was admitted: dpl_HqDPSwuHgcCQDVv7MvRXtGfw8iLD, GitHub ref exp25-26-launch-auth-payments and SHA 86db7277d531b9aa3c004a60fcad56b0688899de. Terminal ERROR / BUILD_UTILS_SPAWN_1. Captured logs were filtered in memory to fixed markers: wrapper invoked, Prisma 6.19.2 installed, guard stopped, no migration success marker, no application build. Raw logs, credential values and tokens were neither printed nor saved.

Read-only staging inspection after failure found zero public base tables, no migration ledger, no installed vector extension. No migration DDL persisted. The original blanket catch erased the exact failing condition, so the cause remains unconfirmed.

## Implementation

The guard now emits fixed stage markers BUILD_ONLY, SELECTED, TARGET_VALIDATED, PREFLIGHT_PASSED, ENGINE_COMPLETED, and the existing schema-verification success marker. Errors are a closed enum: environment/branch/flag; branch hostname missing versus malformed; URL missing/format/protocol/port/host/database/role/password/query/TLS; manifest and Prisma version; client initialization; preflight query, empty result, database/role/version/privileges/extension/nonempty; ledger query/count/checksum/completion; schema query/extension/tables/view/triggers/payment; engine/disconnect/build/internal. Only internally created guard errors may supply a diagnostic code; opaque external errors are replaced with fixed stage codes. CLI output never uses the original exception message or stack. No URLs, passwords, tokens, SQL payloads, driver diagnostics or observed mismatched values enter messages. External errors with forged code properties are rejected. Host/TLS/branch selection and migration rules remain unchanged.

Preflight casts current_database() and current_user to text. PostgreSQL returns both as catalog type name, confirmed on this exact staging branch. Casting makes the results explicit supported strings for Prisma raw-query decoding. This is a narrow compatibility improvement and a plausible failure cause, not a confirmed diagnosis: the failed deployment may have stopped earlier in variable validation or connection setup.

Additional read-only staging checks: expected database/role match, PG16 true, CREATE privileges true, vector available 0.8.0, zero public tables. These checks use the Neon connector and do not prove Vercel credentials, network reachability, or Prisma driver behavior.

Vercel documents VERCEL_BRANCH_URL as a scheme-free generated Git branch hostname, available at build/runtime; VERCEL_GIT_COMMIT_REF is the triggered branch. Project system-variable exposure was enabled, and admitted Git source metadata had the correct branch/SHA. Metadata establishes configured names/scopes, not actual build variable contents. Missing versus malformed URL/hostname can only be distinguished by a future instrumented build; no secret was fetched to guess the cause.

## Validation

- Full Jest 884/884, 55 suites (full.log/json).
- Wrapper 79/79 (focused.log/json), including failure-code classification, stage errors with poisoned values, forged external codes, actual CLI sanitized failure, query casts, and unchanged rejection boundaries. Two synthetic URL fixtures initially changed the username/protocol instead of the intended path/port; fixtures were corrected without weakening checks.
- TypeScript and lint pass (types.log, lint.log).
- Actual Preview build-only succeeds with synthetic unreachable DB URLs, offline fonts and network guard (preview-build.log). No selected migration build was run.
- Prior audit latency artifact restored byte-for-byte from base.

## Next step

Parent reviews this local commit first. A newly authorized instrumented Preview would identify the enum and last completed stage; it would still enforce exact staging target and stop on failure. No retry is currently authorized by this diagnostic slice. If URL_MISSING versus URL_FORMAT appears, fix branch-scoped configuration through a secure value-handling workflow; do not export/decrypt values for diagnosis. If PREFLIGHT_QUERY appears, investigate connection/driver compatibility without raw exception output. No reset or repair DDL is suggested.

Sources: https://vercel.com/docs/environment-variables/system-environment-variables ; https://www.postgresql.org/docs/16/functions-info.html ; https://www.prisma.io/docs/orm/prisma-client/using-raw-sql/raw-queries .
