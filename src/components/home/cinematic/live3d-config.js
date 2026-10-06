import { sceneParts } from './cache-delivery-v9/scene-parts-manifest.js';
// Versioned author/renderer handoff. No app copy or scroll mapping belongs here.
const root = '/uploads/live3d/b-v9-q12/';
export const artworkAssets = Object.freeze({
    version: 'b-v9-q12-loading-preview',
    sha256: '0a21e41554221c1cb6edb3685ba7ad578fda414f0dd1b1607b2830ee4643a958',
    scene: `${root}scene-0a21e41554221c1c.glb`,
    framing: `${root}contract/pose-envelope.json`,
    registry: `${root}contract/source-registry.json`,
    delivery: Object.freeze({...sceneParts, parts: sceneParts.parts.map(part => Object.freeze({...part, url: `/uploads/live3d/b-v9-q12/${part.url.split('/').pop()}.br`}))}),
    maxSceneBytes: 24 * 1024 * 1024,
});
