# V8 production cache/loading contract — transport-only handoff

The app owner applies this contract. No app/provider/auth/backend/publish changes were made here. FrozenV8 geometry, evaluator,551clock, source registry, camera/global root behavior and materials stay unchanged. Two transport files join to the exact existing packed GLB SHA9ee878ef93e15f01677391c2c3b88f67e6f5045c156114ab6af535c5fec0d802,19,068,944decoded bytes.

## Files and identity

- `load-scene.js`: bounded streamed preparation, max2in-flight fetches, max24MiB assembled output, AbortSignal ownership and size/truncation checks.
- `scene-parts-manifest.js`: embedded canonical SHA, decoded size, contiguous offsets, stable content-addressed part URLs and full part hashes.
- `assets/part-7b7be3f20d0efc4a708b3c9c.bin` + `.br`:9,600,000decoded bytes,5,203,795B Brotli.
- `assets/part-15ab2595363286afa4209ed6.bin` + `.br`:9,468,944decoded bytes,4,256,816B Brotli.

Total wire9,460,611B,106,425B more than the9,354,186B monolith. Each part is under the size that fails the observed Chrome context's cache. Both parts actually report cache hits and0transfer on repeat. Do not silently rewrite old content-addressed objects to different decoded bytes, append changing tokens/cache-busters, or assume a cache header means a hit. New geometry releases must generate a new manifest/content hash and repeat cache testing.

Prototype URLs end`.bin` and local server negotiates sidecars. The current app uses explicit`.glb.br`; it can use explicit`.bin.br` equivalents. Rebase each manifest URL to the deployed static asset prefix, keeping exact part hashes/offsets/decoded byte lengths. The parser's assetUrl can remain the canonical packed-GLB logical URL for relative resolution; this texture-free model needs no additional model resource request. No39MBraw fallback.

## Required responses

For encodedpart responses: Content-Type application/octet-stream; Content-Encoding br; Content-Length equal the encoded file byte count; Cache-Control public,max-age=31536000,immutable. Use stable hash URLs. Vary Accept-Encoding when negotiating representations; ETag identifies the encoded representation (the local proof uses SHA256 of sent bytes). A valid If-None-Match may return304; fresh immutable repeat visits normally use cached200without a network body. Cross-origin assets need the ordinary CORS contract for readable fetch; use the same origin/cache partition in comparison tests.

Retain app auth/guard behavior. Verify the actual asset response has no no-store/cache-busting/session-dependent representation. App receipt already shows correct immutable monolith headers and enabledcache; repeating those headers alone did not solve the larger-entry miss. This transport is for the same original/static scene; it is not a private-source or app-session cache.

## Adapter loading order

The read-only app audit found defaultfetch, but serialized envelope→registry→runtimeasset preparation in b-artwork.js. Start the settled preparation promise immediately after the host's reduced/static/loading-budget decision, in parallel with module/metadata reads:

```js
const preparedAssetPromise = prepareSceneBytes({ manifest, signal })
  .catch(error => ({ error }));
const [envelope, sourceRegistry, runtimeModule] = await Promise.all([
  readEnvelope(signal), readRegistry(signal), importRuntime()
]);
alive(); // reject obsolete/disposed/aborted generation before renderer creation
const next = await runtimeModule.createNarrativeRuntime({
  canvas, envelope, sourceRegistry, signal,
  preparedAssetPromise,
  assetMode: 'b-local-v8',
  assetUrl: logicalPackedAssetUrl,
  assetSha256: manifest.assetSha256,
  initialDark: dark, copyHoldScale: .95
});
if (disposed || signal.aborted) { next.dispose(); return; }
```

This uses the existing factory hook and existing SHA allowlist. Whole assembled bytes are hashed before GLTF parse; corrupted/truncated parts must fall back without displaying unverified geometry. `prepareSceneBytes` keeps at most2streams active, writes directly into the fixed assembled buffer, rejects oversized/truncated streams and aborts siblings on failure. Each codecwindow8MiB; max2active =>16MiB window bound, same as the original monolith's configured window. Browser/network/cache and total process memory are not measured by that bound.

Keep the20-second deadline and abort/generation cleanup; no automatic deadline extension/retry or persistent parsed-scene cache. Keep immediate source-specific poster/DOM, initial reduced-motion skipping parts/heavy runtime, current keyboard/source provenance and single-canvas demand renderer. Static artwork remains correct when firstvisit misses the budget.

## App verification required after applying

Use actual compiled app, not only this prototype. Cache enabled and cleared only before cold; repeat in same browsercontext. Preserve exact URL/credentials/cachemode/profile and capture request/response headers, from-cache flags, transfer sizes and HTTPstatus including conditional304where tested. Don't label a19-second refetch a cache-warm result. Distinguish ResourceTiming encodedBodySize (cached representation size) from bytes transferred; a304can report a cached body's size with only header traffic.

Recheck20-second abort, malformedpart fallback, context restoration, source-specific poster/no-JS/reducedmotion and ownership after the adapter swap. This packet shows80actual canvas pairs identical to frozenV8, keyboard/context/idle/cancellation checks, max2worker/sizeguard andcorruption refusal. It does not certify the app change until the app owner reruns it.

Prototype simulated4Mbps/150ms cold19.982s, warm0.499s across3pairs. Cold is slightly worse than monolith19.784s and remainsHOLD; warm fixes the19.240srefetch regression. Actual app baseline is receipt3917cold21.409sfallback/warm19.908srefetch, not the prototype result. The early parallel preparation may remove metadata serialization, but only actual app measurement can claim that improvement. PhysicalAndroid/CDN/WAN and finalart remain unverified.
