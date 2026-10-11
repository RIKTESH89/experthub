# Independent PG16 installation proposal review

Read-only review of integration/audit/remaining-acceptance/PG16-APPROVAL-PROPOSAL.md. Reviewed document SHA256: `f234ce530eebedb814fdcd31a0e8a59cdf0a7f7e96cc4c91d68e4c48f7c52fd1`. No installation, build, download by package manager, server/daemon startup or package mutation was performed. Primary web source reads and installed Homebrew source inspection were used to check the proposal. Integration owner owns the final proposal and user decision.

The revised bounded plan is feasible after explicit approval, a frozen matching bottle/dependency plan and a successful extension build. It is not evidence that PG16 acceptance already passes.

## Checked boundaries

- Installed Homebrew `formula_installer.rb` links an opt-prefix even when normal prefix linking is skipped. Its `finish()` writes service-definition files and can create var/log before deciding whether to skip the formula post-install. Those artifacts persist; no service is started by the reviewed install path. The revised proposal includes them. PostgreSQL16 default cluster initialization belongs to the skipped formula post-install.
- Dependency installer objects do not receive the target's skip-post-install or skip-link flags. Disabling dependent checks does not prohibit dependency actions needed to install the requested bottle. The proposal now stops for any new/updated dependency or source build beyond the frozen authorized plan.
- The installed formula metadata reported by the integration owner uses openssl@3; public formula HEAD currently lists openssl@4. Independent local filesystem checks found the reported direct dependencies already installed: icu4c@78 78.3, krb5 1.22.2, lz4 1.10.0, openssl@3 3.6.5, readline 8.3.6, zstd 1.5.7_1 and gettext1.0. Public HEAD must not silently replace the frozen local bottle plan. Direct dependencies alone do not prove that the selected bottle's transitive dependency plan requires no action.
- Upstream pgvector0.8.7 uses PG_CONFIG-selected PGXS and also installs three headers in the selected server include tree under extension/vector. Library/share and that include tree are now explicitly covered. Existing clang and make are available. The PG18 binary must not be copied across majors; compilation success remains a future gate.
- Proposed invocation controls should include `HOMEBREW_NO_ANALYTICS=1`, `HOMEBREW_NO_AUTO_UPDATE=1`, `HOMEBREW_NO_INSTALLED_DEPENDENTS_CHECK=1`, `HOMEBREW_NO_INSTALL_UPGRADE=1` and `HOMEBREW_NO_INSTALL_CLEANUP=1`, plus `--force-bottle --skip-post-install --skip-link`. Disabling analytics keeps the authorized network activity to package/source acquisition. These flags do not extend approval to an unlisted dependency change.

## Test feasibility after approval

The existing retrieval, persistence/replay and compiled authenticated local test runners use fresh owned synthetic private-socket clusters and already applied all18 migrations on PG18. They currently hardcode PG18 paths; passing the current command unchanged would not prove PG16 parity. Adapt only test runners to select explicitly guarded PG16 binaries, then assert SQL `server_version_num` in [160000,170000), private-socket identity and vector extension version before migrations/tests. Preserve the migration checksum/catalog verification and all existing acceptance assertions. Use separate PG16 report paths, retain any failures, and stop/remove owned cluster/processes after every completed or failed run. Do not weaken shared staging preflight's live DB identity guards to reuse its CLI against a fixture; reuse its catalog verifier as the existing fixture does.

Fresh local native fixtures can cover all18 migration/schema checks, strict persistence and source/account/subscription revocation, concurrent locks, correction/release manifest/settings replay and rollback, plus compiled local authentication/browser coverage. They cannot establish hosted/provider/human quality acceptance or authorize V2 activation.

## Concise approval option

Authorize the frozen PostgreSQL16.15 binary bottle and pgvector0.8.7 build for local synthetic parity testing, including persistent PG16 Cellar/opt/service-definition/log/cache/metadata and selected extension files; the test clusters will be removed. Stop if the frozen plan requires any new/updated dependency, source PostgreSQL build, sudo or additional tools. Alternatively, supply an existing compatible PG16 runtime and vector extension.

This approval does not include a persistent service, PG18 replacement/upgrade, global PATH change, live database, provider call, external credentials or V2 activation. No approval is inferred from staging publication or PG18 fixture permission.

Sources: [Homebrew install documentation](https://docs.brew.sh/Manpage#install-options-formulacask-), [current official PG16 formula](https://raw.githubusercontent.com/Homebrew/homebrew-core/HEAD/Formula/p/postgresql@16.rb), [pinned pgvector0.8.7 Makefile](https://raw.githubusercontent.com/pgvector/pgvector/v0.8.7/Makefile), [pinned pgvector installation notes](https://github.com/pgvector/pgvector/tree/v0.8.7#installation-notes---linux-and-mac), and installed `/opt/homebrew/Library/Homebrew/formula_installer.rb` (dependency constructors, finish, link and install_service).
