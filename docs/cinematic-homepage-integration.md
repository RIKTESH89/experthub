# Cinematic homepage integration candidate

Base: `exp25-26-launch-auth-payments` remote head `64ced9adfb7ba57c58772cf65d094edc653ba6f9`, verified with `git ls-remote` before creating the independent clone. Local branch: `integration/cinematic-homepage`.

Ownership is limited to the signed-out homepage entry, `src/components/home/cinematic`, `public/cinematic`, its lifecycle tests and this evidence. Root layout, global CSS, shared navigation implementations, authentication, backend, providers, migration 18 and production master are unchanged. Signed-in role redirects in the homepage entry remain intact.

The server-rendered seven-chapter story uses the existing ThemeToggle, app-native `/about`, `/pricing`, `/login`, pricing definitions and expert application component at `/#apply-expert`. The login route retains the app's existing root callback and authenticated role redirect. No fake login or application submission is added. The four source records and response are explicitly fictional/scripted. Citations do not guarantee correctness; the brain is a metaphor. Existing BodyParts3D CC BY 4.0 credit and modification history are retained.

Frames and source registry retain the exact author's hashes. Manifest unchanged: `7ddd07a9b3884bad27f41a03e7394318c7d431fb5a796b9903fdb5bc161f7196`. Runtime resolves all 384 frames under `/cinematic/`. CSS is scoped by one CSS module; the renderer changes its local root attribute rather than body classes. Its media/scroll/hash/page listeners, manifest request, animation request and decoded frames are released on React unmount, including development remounts. No render-loop React state updates. Desktop decoded cache limit 10; portrait 6; parallel fetch/decode limit 2. The image buffer figures are not whole-browser memory measurements.

Cinematic artwork maintains the authored dark studio contrast in either app theme. Static story, continuation/application sections and navigation to other pages use the shared theme. Short viewports, reduced motion, constrained connections, missing assets and no JavaScript retain readable HTML. Native fragment anchors and source disclosures work independently of a live AI service.

## Local validation

- Reused installed dependencies via a checkout-local symlink. No package installs, Prisma generation or shared dependency edits.
- Type check and lint pass.
- Full Jest suite: 89 suites, 1327 tests pass. Three new lifecycle tests verify cancellation, cleanup/remount and missing manifest behavior.
- Next production build passes with synthetic loopback database URLs, synthetic auth secret, Preview mode and the existing network guard blocking external networking. This compile did not run the staging migration engine or access a live database. Build warnings from the inherited auth Edge dependency remain.
- Browser validation pending Mac unlock. No browser bypass or alternate executor used.

## Protected staging plan

1. Finish native integrated browser checks and freeze a tested local commit. Reconfirm remote head; reconcile any subsequent changes before proposing an exact candidate.
2. Parent reviews the exact commit and determines explicit authorization for the push and protected Preview publication. No push/deployment is authorized by the earlier standalone-site approval.
3. Use only the existing actual-app Vercel project and protected Preview environment, preserving its authentication, provider isolation, canonical-origin and migration guards. Do not use standalone hosting or production master. Do not copy local dotenv files, test fixtures, dependency symlinks or audit outputs to the deployment.
4. The existing Google staging gate is exact branch/hostname scoped. A Preview on `integration/cinematic-homepage` must keep Google disabled; do not broaden the gate to make this candidate log in. If owner-authenticated testing is needed, parent must choose the already authorized staging branch/origin with the candidate incorporated through its normal review workflow. No new credentials/providers are requested or introduced.
5. Migration history and schema stay at the inherited 18 migrations. Do not trigger database migration, seed, reset, application submission, checkout/payment or provider calls as part of this frontend validation. Authenticated writes and paid-provider journeys require their separate existing authorization and evidence.
6. After authorized protected staging publication, verify the actual hosted app homepage and public journeys on desktop/phone, source disclosures, Back/Forward, repeated scrolling and theme/static modes. Parent handles any owner sign-in needed for full dashboard journeys.
7. Production promotion is a separate final approval against the exact protected staging candidate and completed evidence. No production application change has occurred here.
