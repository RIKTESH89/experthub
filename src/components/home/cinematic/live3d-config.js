// Versioned author/renderer handoff. No app copy or scroll mapping belongs here.
const root = '/uploads/live3d/b-r1/';
export const artworkAssets = Object.freeze({
    version: 'b-r1-local-v4-experimental',
    sha256: '142d85fe44f17f6838b16b9e8d91221a8e5d0a5a843c4b7ca1b73f920ccd1966',
    scene: `${root}scene-b-local-v4.glb`,
    framing: `${root}contract/pose-envelope.json`,
    registry: `${root}contract/source-registry.json`,
    validation: `${root}author-local-v4-validation.json`,
    maxSceneBytes: 12 * 1024 * 1024,
});
