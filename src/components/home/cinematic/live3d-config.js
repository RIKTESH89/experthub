import { sceneParts } from './cache-delivery-v9/scene-parts-manifest.js';
// Versioned author/renderer handoff. No app copy or scroll mapping belongs here.
const root = '/uploads/live3d/b-narrative-v9/';
export const artworkAssets = Object.freeze({
    version: 'b-narrative-v9-cache-preparation',
    sha256: '1afc5656d4bedba13d5858465b6326105feca3a3ac96ba5720cc7b3a72cf7b0f',
    scene: `${root}scene-1afc5656d4bedba1.glb`,
    framing: `${root}contract/pose-envelope.json`,
    registry: `${root}contract/source-registry.json`,
    delivery: Object.freeze({...sceneParts, parts: sceneParts.parts.map(part => Object.freeze({...part, url: `/uploads/live3d/b-narrative-v9/${part.url.split('/').pop()}.br`}))}),
    maxSceneBytes: 24 * 1024 * 1024,
});
