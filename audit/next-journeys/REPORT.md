# Product journey batch

Code commit: `176d53773bfe989c609145f6ec5e812d4b0279b6`.

## Integration basis and scope

Independent local checkout `product-journeys-next`, branch `exp40-42-next-journeys`, starts exactly at deployed `8897903fb7820532994a9f0f72c210449a46afb2`, following the parent's later baseline instruction. Reconciled `CURRENT-RELEASE-CHECKLIST.md`, `LINEAR-MIRROR-20261008T063115Z.json` and `combined-checks/REVIEW.md` under the existing full-site-staging evidence directory. Prior journey/widget commits were already integrated; they were not reimplemented. Existing parent combined test/HTTP/browser counts are historical, not this batch's verification.

Overlap warning issued before profile/knowledge/admin UI edits and again before the knowledge table accessibility change. No auth/billing/release backend, shared shell, widget, schema, homepage or API contracts edited. Parent coordinates integration and Linear; no Linear writes.

## Concrete changes

- Profile: failed photo upload prevents false profile success and preserves draft/file; successful upload URL is reused across failed profile saves; synchronously guard repeated saves; disable edits during mutation; visible stage/error/success announcements; keyboard photo chooser; bounded file validation/object-URL cleanup; dirty hard-leave warning; phone photo controls stack within the card. Subscriber page retries load in place and suppresses stale reads.
- Knowledge: reject whitespace-only required fields; label source selector and field errors; guard repeated mutations and pending Cancel; retain draft on denial; announce uncertain network outcome; abort client request/suppress stale success on unmount; disable clean post-save repeats while allowing changed fields/source to save again. Library actions identify their source; hide edit when no handler exists.
- Admin: deletion requires identity-bearing confirmation; Cancel initially receives focus; menu close no longer steals dialog focus; Escape/cancel restores row focus; pending mutation locks repeats/Escape; denial retains selected user/error and retry; confirmed synthetic success removes row and focuses search. Existing ban requests also share the mutation lock. No backend authorization change.

Client abort does not guarantee server rollback. An interrupted response can represent a completed server mutation: UI guidance requests review before retry. There is no new idempotency service. Dirty-profile hard-leave warning does not intercept Next client navigation. Broader draft persistence, delete/ban privilege/audit and processing acceptance remain open.

## Verification performed

- Guarded synthetic Jest regression: **13 suites / 78 tests passed**, including **7 new suites / 28 tests**. Existing import/post/admin/local isolation checks included. See `regression.log` and focused `tests.log`.
- TypeScript `tsc --noEmit` passed; targeted Next lint passed without warnings/errors; `git diff --check` passed. Existing node_modules reused via symlink; no install or Prisma generate.
- Native Chrome on local `127.0.0.1:3471`, clean synthetic environment, unreachable loopback DB and external-network guard. Actual page/forms/table/menu/dialog/role navigation are rendered using a development-only client fixture with explicit synthetic SessionProvider and intercepted API responses. Production gate test rejects this route. The root provider's focus refresh is explicitly answered anonymous in the fixture; no auth cookie or server access grant exists.
- Subscriber: GET denial → retry → populated form; failed PATCH retains values → retry → saved status. Expert: populated edit →403 draft retained → retry → updated library → reopen saved values. Admin: real dropdown → identified confirm with Cancel focus → Escape restores row focus;403 remains dialog/row → confirmed synthetic retry removes row and focuses search.
- Expert pending save followed by role switch: reopening shows last saved title and no stale success. Deterministic unit tests prove aborted signal/stale callback suppression; browser scheduling does not prove real server cancellation.
- Browser Back from blank remounts initial subscriber fixture, shows expected load failure, retry restores populated view. Synthetic state resets on remount; no persisted-draft assertion.
- Representative dark mobile subscriber/library and dark desktop expert/admin, plus light mobile expert/profile screenshots inspected. Document width equals viewport at390 and1440. Final photo button remains within phone card. Temporary viewport override reset.

## Actual limits and external gates

No full production build or complete repository suite in this checkout; parent must run combined checks/build and independent review. No real Auth.js authenticated HTTP/SQL in this batch: actual server layouts use mocked-auth tests, and browser session is presentation-only. No real upload/native picker/indexing/replay/provider, full permission/audit/pagination, physical Android/iOS, screen reader, performance or all-theme/viewport route matrix acceptance. Chrome native file picker remains blocked by existing extension file permission; no grants or bypass attempted.

Browser diagnostics captured historical and fixture root-provider Auth.js ClientFetchError entries while the unmatched session endpoint was403; the fixture now responds anonymous to GET `/api/auth/session`. This batch does not claim a clean-console runtime acceptance, and the final session-refresh adjustment was type/lint tested rather than a fresh complete browser rerun. Initial development hydration was recovered with reload; no claim of production startup verification.

No credentials inspected, external services used, live/shared database writes, provider transactions, installs, deployments, publication, production changes or sensitive actions. Local server stopped at handoff. No escalation of reasoning effort needed.
