# Frozen source-alignment integration

Author export: `brain-homepage-scene-copy-alignment-v2/export` in task-10. Integrated manifest SHA-256: `03cf60b67a13c31dc57e18fd52666623a1764dfd4a2eea70990864d7ad3331c0`. It retains the author's concept status; publication and final visual acceptance remain with the parent.

The app owner verified the required original manifest `7ddd07a9b3884bad27f41a03e7394318c7d431fb5a796b9903fdb5bc161f7196`, every replacement/base hash and replacement byte count, and all 384 image comparisons before copying. Exactly desktop/portrait frames 120–150 changed (62 files); 322 are byte-identical. Registry SHA `22d81bc47ff1a1c361a45c4186eb365a5330a2dfce87f708da90ac9a91b072ce` and attribution bytes match the original. Author files were read only. The author's boundary/camera continuity evidence is preserved at its source; the app owner did not re-evaluate the Blender scene.

## Cache and integration contract

The full 387-file runtime export is added under `/uploads/cinematic-homepage/copy-alignment-v2-03cf60b6/`. Its manifest is copied byte-for-byte, not rewritten. `asset-config.js` is the single namespace imported by both SSR markup and the sequence renderer. All manifest-relative image paths resolve within this namespace. The original 387 runtime files remain unchanged, allowing old documents and scripts to resolve their original matching manifest and images. No mutable old asset URL is reused for changed content. Manifest fetching still uses no-store. Future revisions must create a new immutable namespace and update the shared constant atomically with their code; do not overwrite this one.

The existing public uploads boundary permits the new static paths without exposing an API or adding an auth exception. No cache/CDN/project/service-worker setting was changed. This is a cache-safe artifact contract, not a claim that a deployment was performed.

Conversation keyframes are `[[0,0],[0.06,6],[0.20,6],[0.30,9],[0.45,9],[0.55,18],[0.70,18],[0.80,18],[0.86,18],[0.96,30],[1,32]]`. Global 125/128 are activation/relevance holds. Global 137 is the open source-reading pose held through .86. Frame 145 occurs around .927 during the return and text fade; it is not a new reading hold. Entry119 and exit151 are retained. Static/no-JavaScript conversation artwork now uses137. Runtime source caption says `01 + 04 / Check the source passages`, and the final caption says `Scripted example · not live AI`; the control caption says `Shared sources remain distinct`.

## Integrated browser evidence

Owned evidence lives in task-13 `product-homepage-qa/`: `combined-theme`, `combined-final-pinned-text-review`, `combined-answer-holds`, `combined-authored-holds`, `combined-final-android-recovery.json`, and `combined-final-no-js-decoded-review`. The answer report captures actual desktop1470x801 and phone360x640 draws for125/128/137 and145, including an extra late137 hold. Versioned asset responses were200; the exact DOM question/answer/source01/source04 wording was retained. The original image/manifest paths remain available but are not requested by the new homepage.

Full-screen inspection found the previous phone support plate covered the newly opened source leaves. The conversation-only phone support lane is now fixed at66% viewport height, leaving the opening leaves above it and the caption below. Desktop framing is unchanged. At360px the physical printed fragments are small; accessible source details provide their full exact text. Do not claim that all baked text is independently legible at every phone size. The sculpture illustrates the contributed records, while the exact question and full scripted answer remain in the accessible disclosure; it does not pretend to render a live response.

All source IDs, fictional record disclaimers, source-citation accuracy limits, private-memory/brain-scan limits and BodyParts3D CC BY4 credit remain. No AI/provider call, correction submission, live authentication, billing or backend behavior was added. See the exact-candidate verification receipt for full tests/types/lint/build and the final Git SHA. Native-browser parent acceptance and publication are separate.
