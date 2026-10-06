Historical V8 cache baseline at3927. Current V9 release is documented in [V9-INTEGRATION.md](V9-INTEGRATION.md); no V8 speed result substitutes for its actual measurements.

# V8 cache transport integration

Local candidate http://127.0.0.1:3927/, branch `integration/b-v8-cache-transport`, base58cb0b40f61136ebc97b7c9f966ee8428fd06684. The original V8 review instance remains unchanged at3917. This changes only transport/startup concurrency. No V9/Q12 adoption, app/backend/auth/provider/source geometry changes, installs, push or publication.

Verified renderer packet: `/Users/rikteshs20/Documents/Codex/2026-10-05/task-4/experthub-b-delivery-v8-r1`,170files with zero byte/hash mismatch. Copied `load-scene.js` and `scene-parts-manifest.js` remain byte-identical; host config rebases part URLs only. All6 V8 runtime modules remain byte-identical to the accepted app baseline, including the V8 evaluator after Story/defaultfillFoundation:true. The accepted551clock, source text/timing/contact, copy controller, geometry, camera, responsive lanes, theme, citation/AI/sample limits and licensing remain unchanged.

Two content-addressed static `.bin.br` files decode to9,600,000 and9,468,944bytes. Both decoded part hashes independently pass; their concatenation matches packed V8SHA9ee878ef93e15f01677391c2c3b88f67e6f5045c156114ab6af535c5fec0d802,19,068,944bytes. Wire payload9,460,611B,106,425B larger than the original monolith. No raw39MB fallback. Logical packed GLBURL is used for parser relative-resolution only; no monolith request occurs on the prepared path.

After enhancement eligibility/poster/deadline setup, lightweight bounded preparation starts before lazy heavy runtime import. Envelope/registry reads run in parallel. Settled preparation failures are passed to the runtime’s existing preparedAssetPromise hook, preserving whole-asset SHA checking before parsing. At most2streams, one fixed19,068,944-byte assembled buffer,24MiB ceiling, contiguous offsets andoversize/truncation checks, sibling abort andouter abort cleanup remain. These bounds do not measure total process/GPU memory. Existing20-second deadline, noautomaticretry/extension, generation/context-loss/disposal safeguards andsource-specific fallback remain.

Next static headers for only the content-addressed part paths: application/octet-stream, Content-Encodingbr, immutable one-year cache, correct encoded Content-Length, VaryAccept-Encoding, Next’s encoded-file ETag. Both HEAD200 andmatchingIf-None-Match304/zero-body verified. Existing auth/cookies/guards are retained. Same-origin actual app caching was measured, not assumed from headers; hosted CDN/CORS/device lifetime remain unverified.

Build/lint/types and96suites/1378tests pass. Installed Chrome checks:68source/history/reload/keyboard/reduced/no-JS journeys;20viewport/theme/idle/navigation resource checks;10part/metadatafailure/motion/orientation/contextloss-restoration checks;2delayedloading;2source03failed/22seconddelay checks. New4browser integrity/ownership cases reject truncated,oversized,correct-length corruptedparts without unverifiedscene display andprevent lateactivation aftermotionwithdrawal. Initialreduced/no-JS zero part fetches. The canonical decoded asset and renderer are unchanged; this transport check does not replace parent native art/cadence/device review.

## Actual compiled app cache/delivery

Loopback-only allowlisting HTTPproxy rejects outside origins/HTTPS CONNECT andanotherlocalport; noPlaywright routing/CDPFetch interception. Serviceworkersblocked; Chrome cacheenabled, clearedbeforecold, samecontextwarm. One pair per profile with ownotherbrowserQA finished; unrelated parentnative activity is not controlled. Singlelocal/CDPsimulations, notpercentiles/WAN/CDN/Android measurements.

| Profile | Cold navigation→result | Warm navigation→result |
|---|---:|---:|
| Localhost |325ms live|258ms live|
| 4Mbps/150ms |21,414ms static fallback|768ms live|

4Mbps means500,000B/sdown,125,000B/sup with150msCDPlatency. Bothwarm parts return cachedHTTP200/fromDiskCache:true, ResourceTimingtransfer0, zero partrequests atproxy. EncodedBodySize9,460,611B describes cachedrepresentations, not transferred bytes. Cold receives bothparts with9,461,211transferbytes/9,460,611encoded/19,068,944decoded butmisses20-second activationbudget; nodeadlineextension ismade. Cold textFCP580ms, heroposter resourceends3,198ms; warm188ms/528ms. Postertransfercompletion isnot measuredfirstvisiblepixels. Warm fixesrefetch; coldloadremainsHOLD. No publicperformance guarantee.

## Next handoff

V9 packet now exists at `experthub-b-narrative-v9-r1/handoff-v9/RUNTIME-CONTRACT.md` and `IMPORT-MANIFEST.json`. Readonly independent verification of70permitted files passes. V9 is not adopted here; parent coordinates its final validated handoff and separate3937-or-other-port candidate. Keep b-local-v8 factorydispatch perthatpacket, use new packedSHA/new content-addressedparts and52newposters; neverreuseV8partURLfornewbytes. Q12excluded. Preserve3917 untilnativeQAcompletes. Art/native/Android/hostedCDN/coldload gates remain.
