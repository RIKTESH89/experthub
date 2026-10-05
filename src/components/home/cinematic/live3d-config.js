// Versioned author/renderer handoff. No app copy or scroll mapping belongs here.
const root = '/uploads/live3d/v7-runtime-r3/';
export const artworkAssets = Object.freeze({
    version: 'v7-runtime-r4-contact-prototype',
    sha256: 'c602aa49df4785c6c80bf14c9c74b0874076b97424cd1611285b07899a2a5ea0',
    scene: `${root}scene.glb`,
    camera: `${root}camera-contract.json`,
    framing: `${root}camera-envelope-r3.json`,
    contact: '/uploads/live3d/v7-runtime-r4/contact-bounds-r4.json',
    maxSceneBytes: 12 * 1024 * 1024,
});
