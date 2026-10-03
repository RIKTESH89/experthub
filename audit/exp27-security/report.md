# EXP27 bounded local security fixes

Base: `c83bf907898d8a1ffc257888f5800f27a210e1d2`.
Branch: `codex/exp27-security-oct03-task6`.
Worktree: `/Users/rikteshs20/Documents/Codex/2026-10-03/task-6/experthub-exp27`.

## Contracts and ownership

Own scraper/import URL boundary, upload route/validation, digest authentication, email delivery logging and `__tests__/exp27`. No schema, post deletion, retrieval, UI, provider configuration or infrastructure changes. Parent was informed before edits. No applicable AGENTS.md found; repository memories inspected. Existing dependencies are read through an ignored worktree node_modules symlink; no installation, client generation, dependency writes or full build performed.

`fetchPublicHtml` accepts public HTTPS on standard port without credentials, rejects every nonpublic DNS answer, pins one approved address using the socket lookup callback with an explicit family, preserves TLS hostname validation, uses a fresh unpooled direct HTTPS connection, and revalidates every redirect (maximum 3). IPv4 special/private/metadata/multicast ranges and non-global/special IPv6 are denied, including mapped IPv4 and transition ranges. A single 15-second deadline spans DNS, connections, redirects and body reads. Maximum HTML bytes are 2 MiB; both declared length and streaming chunks are checked. Only HTML/XHTML with identity encoding is accepted. Connection/DNS errors do not expose target/system details.

Jina Reader delegation was removed because local checks cannot enforce its downstream DNS/redirect behavior. Imports that need JavaScript rendering may now fail with the existing meaningful-content message; this is intentional security tightening. Scraper result `{title, content}` and knowledge evidence interfaces are unchanged. Import schema rejects credentials and obvious forbidden destinations before storing import jobs.

Upload multipart streams are capped at 10 MiB + 64 KiB before form parsing, including chunked requests. Existing category file limits remain. SVG is denied. Supported byte signatures must match declared MIME, and generated filename extensions derive from recognized media, never caller filenames. Hosted (non-development) uploads require explicit S3 credentials and bucket before reading the body; same-origin local fallback is restricted to development. S3 puts set Content-Disposition attachment. Unknown signatures are rejected.

Digest dispatch returns 503 for missing/empty/whitespace CRON_SECRET and 401 for absent/wrong caller keys before DB/email work. Preview rejection remains first. Successful authorization keeps existing recipient/period selection; delivery outcomes now count failed sends. Email SDK returned errors are false. Disabled delivery and failures log fixed text without subject, recipient, body or raw provider errors. Upload, digest and import outer failure logs likewise omit raw exceptions.

## Validation

- Focused Jest command: `./node_modules/.bin/jest --runInBand __tests__/exp27 __tests__/api/knowledge-import.test.ts __tests__/api/search-notifications.test.ts __tests__/exp26/preview-isolation.test.ts`
- **8 suites / 106 tests passed**. See `focused-tests.log`.
- `./node_modules/.bin/tsc --noEmit --incremental false`: passed, no diagnostics.
- Focused ESLint over seven changed source files and `__tests__/exp27`: passed, no diagnostics.
- `git diff --check`: passed.

Attack fixtures cover literal/encoded loopback, private/link-local/metadata IPv4, IPv6/mapped/transition ranges, credential URLs, protocols/ports, mixed DNS answers, same-host DNS rebinding, forbidden and relative redirects, redirect loops, DNS/socket deadline, declared/chunked oversize, compressed/non-HTML responses, active SVG and MIME spoofing, recognized supported containers, multipart cap/cancellation, unsafe filenames, missing hosted storage, digest unauthorized/config-missing zero side effects, and redacted email errors. DNS and HTTPS transport, S3 and email are mocked; no outbound fetch/provider calls were made.

## Remaining evidence and integration limits

- Deployed runtime Node DNS/socket/TLS behavior, egress restrictions, real URL availability and redirect behavior remain unproved. DNS resolution cannot itself be canceled by Node lookup, but the deadline rejects promptly and prevents late resolution opening a socket.
- Media validation recognizes container signatures; it is not a full decoder, malware scanner or proof against every media polyglot. Ogg/WebM category uses the declared category after container verification. Only recognized safe extensions are produced; deployed S3 origin/headers/IAM still need separately authorized inspection.
- Multipart parser runs only after the capped read, but framework/hosting request buffering and aggregate concurrency/memory limits require deployment proof. No distributed rate/budget infrastructure added.
- Digest replay deduplication, durable delivery jobs, batching and retention/deletion policy remain separate work; no schema invented. This fixes authentication and truthful delivery counts, not exactly-once dispatch.
- Retention/export/deletion process and provider disclosures still need owner decisions. No cloud edits, production data reads, remote push/merge/deploy, external participant messages or Linear state changes.
- Integrate by cherry-picking this lane's final commit onto the shared base, reviewing overlaps in upload/digest/import with any later launch/service gate changes. Keep staging guards. Parent coordinates expensive full build and combined checks.
