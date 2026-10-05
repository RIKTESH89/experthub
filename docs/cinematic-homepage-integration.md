# Cinematic homepage integration candidate

Base: `exp25-26-launch-auth-payments` remote head `64ced9adfb7ba57c58772cf65d094edc653ba6f9`, verified with `git ls-remote` before creating the independent clone. Local branch: `integration/cinematic-homepage`.

Ownership is limited to the signed-out homepage entry, `src/components/home/cinematic`, `public/uploads/cinematic-homepage`, its lifecycle tests and this evidence. Root layout, global CSS, shared navigation implementations, authentication, backend, providers, migration 18 and production master are unchanged. Signed-in role redirects in the homepage entry remain intact.

The server-rendered seven-chapter story uses the existing ThemeToggle, app-native `/about`, `/pricing`, `/login`, pricing definitions and expert application component at `/#apply-expert`. The login route retains the app's existing root callback and authenticated role redirect. No fake login or application submission is added. The four source records and response are explicitly fictional/scripted. Citations do not guarantee correctness; the brain is a metaphor. Existing BodyParts3D CC BY 4.0 credit and modification history are retained.

Frames and source registry retain the exact author's hashes. Manifest unchanged: `7ddd07a9b3884bad27f41a03e7394318c7d431fb5a796b9903fdb5bc161f7196`. Runtime resolves all 384 frames under `/uploads/cinematic-homepage/`. CSS is scoped by one CSS module; the renderer changes its local root attribute rather than body classes. Its media/scroll/hash/page listeners, manifest request, animation request and decoded frames are released on React unmount, including development remounts. No render-loop React state updates. Desktop decoded cache limit 10; portrait 6; parallel fetch/decode limit 2. The image buffer figures are not whole-browser memory measurements.

Cinematic artwork maintains the authored dark studio contrast in either app theme. Static story, continuation/application sections and navigation to other pages use the shared theme. Short viewports, reduced motion, constrained connections, missing assets and no JavaScript retain readable HTML. Native fragment anchors and source disclosures work independently of a live AI service.

## Local validation

- Reused installed dependencies via a checkout-local symlink. No package installs, Prisma generation or shared dependency edits.
- Type check and lint pass.
- Full Jest suite: 90 suites, 1333 tests pass. Four lifecycle tests verify cancellation, cleanup/remount, missing manifest behavior and delayed-body disposal; four geometry regressions verify visible held poses and panel departure.
- Prior candidate Next production build passed with synthetic loopback database URLs, synthetic auth secret, Preview mode and the existing network guard blocking external networking. This compile did not run the staging migration engine or access a live database. Build warnings from the inherited auth Edge dependency remain. A fresh production compile for the public namespace repair is pending a coordinated browser QA pause.
- Native Chrome worker validation pending fresh reload after the public asset repair. No browser bypass or alternate executor used.

## Protected staging plan

1. Finish native integrated browser checks and freeze a tested local commit. Reconfirm remote head; reconcile any subsequent changes before proposing an exact candidate.
2. Parent reviews the exact commit and determines explicit authorization for the push and protected Preview publication. No push/deployment is authorized by the earlier standalone-site approval.
3. Use only the existing actual-app Vercel project and protected Preview environment, preserving its authentication, provider isolation, canonical-origin and migration guards. Do not use standalone hosting or production master. Do not copy local dotenv files, test fixtures, dependency symlinks or audit outputs to the deployment.
4. The existing Google staging gate is exact branch/hostname scoped. A Preview on `integration/cinematic-homepage` must keep Google disabled; do not broaden the gate to make this candidate log in. If owner-authenticated testing is needed, parent must choose the already authorized staging branch/origin with the candidate incorporated through its normal review workflow. No new credentials/providers are requested or introduced.
5. Migration history and schema stay at the inherited 18 migrations. Do not trigger database migration, seed, reset, application submission, checkout/payment or provider calls as part of this frontend validation. Authenticated writes and paid-provider journeys require their separate existing authorization and evidence.
6. After authorized protected staging publication, verify the actual hosted app homepage and public journeys on desktop/phone, source disclosures, Back/Forward, repeated scrolling and theme/static modes. Parent handles any owner sign-in needed for full dashboard journeys.
7. Production promotion is a separate final approval against the exact protected staging candidate and completed evidence. No production application change has occurred here.

## Independent review corrections

A delayed manifest JSON body now receives a second disposal check after decoding and before validation or any DOM mutation. Regression coverage pauses body decoding, disposes the old renderer, mounts its replacement, then releases the old valid manifest and verifies no overwrite.

Timeline phase now uses the actual pinned interval: chapter height minus rendered panel height, measured rather than assuming browser viewport height equals `100svh`. All authored keyframes, quarter reading holds and the text fade complete while the panel is pinned. The remaining panel-height interval is an explicit departure phase; it holds the last camera pose with outgoing text faded. Native chapter anchors still start at phase zero. Geometry regressions cover all seven chapters and both variants at desktop/phone heights, including the short closing chapter. Native geometry validation remains pending worker QA.

## Local browser serving correction

Native QA found the original `/cinematic/` asset prefix intercepted by the existing login guard. The immutable homepage assets now live under the already-public `/uploads/cinematic-homepage/` namespace. No route/auth policy changed. Existing upload routes remain untouched; the new directory contains only these static authored frames, manifest, source registry and attribution. Tests cover anonymous public routing and rejection of protected neighboring/API paths.

The reported layout-chunk SyntaxError was not reproduced by read-only inspection: served bytes matched disk, top-level syntax parsed, and all134 embedded eval modules parsed. Pre-restart served chunk preserved outside the app at task-13/server-diagnosis/pre-restart-layout.js. A clean dev-cache restart is a diagnostic recovery; browser reload must determine whether the earlier syntax error was stale/truncated dev output.

## Independent headless verification and mobile chrome repair

Installed Playwright 1.63 with a fresh temporary headless system Chrome context verified desktop hydration, all 28 reading holds, reverse frame continuity, keyboard anchors, source disclosure, shared theme switching and manual static mode. Portrait 390×844 checks verified the same seven chapters, decoded cache limit6 and request limit2. Reduced-motion and short-viewport modes made no sequence frame requests; JavaScript-disabled HTML retained seven chapters and seven decoded source images; simulated missing assets retained complete text. External page requests were blocked. Native Chrome visual QA remains pending.

The source-fragment→Pricing→Back diagnostic established an app navigation defect: the URL returned to /#source-01 while Pricing's DOM remained mounted and the homepage root/canvas were absent. A fresh journey without a source fragment remounted normally. Manual static mode did not persist; the controlled variation had explicitly resumed animation before navigating. Installed Next14 restore handling retains the current route tree when a regular fragment history entry lacks its route tree. The homepage now uses Next Link for all internal fragment navigation, preserving semantic anchor markup, keyboard focus behavior, and native no-JavaScript links while recording the route state. No private history state manipulation or renderer lifecycle workaround was added.

The repeatable local regression is scripts/ui-preview/cinematic-navigation-regression.cjs. It uses installed Playwright and fresh headless Chrome contexts against synthetic loopback3467, blocks external page requests, and never submits forms or accesses a profile. Both desktop and portrait cases verify source disclosure, explicit motion off/on, then Pricing/About/Sign in Back and Forward journeys, restored homepage root/seven chapters/decoded frames, and capture actual failure state on error. All six route cases passed with no page errors. Run with node scripts/ui-preview/cinematic-navigation-regression.cjs /tmp/experthub-cinematic-navigation while the existing guarded dev fixture is running. Raw browser evidence remains outside the app at task-13/headless-qa-8df3.

Screenshot review established a separate mobile layout defect: the three-row header covered the status and chapter eyebrow. Mobile navigation now uses one row beneath the wordmark, with compact motion control. Actual 320px and390px browser geometry verifies header bottom≤status top and status bottom≤title top with all controls inside the viewport and no horizontal overflow. No auth, application form or backend changes.
