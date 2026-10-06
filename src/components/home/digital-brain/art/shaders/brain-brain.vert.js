// Adapted from Digital Brain, Copyright (c) 2026 Sahil K (MIT).
// See /uploads/digital-brain-foundation/CREDITS.md for source, license and modifications.
const shaderCode = "varying vec3 vNormal;\nvarying vec3 vViewPosition;\nvarying vec3 vWorldPosition;\nvarying vec3 vWorldNormal;\n\nvoid main() {\n    vNormal = normalize(normalMatrix * normal);\n    vWorldNormal = normalize((modelMatrix * vec4(normal, 0.0)).xyz);\n\n    vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);\n    vViewPosition = -mvPosition.xyz;\n    vWorldPosition = (modelMatrix * vec4(position, 1.0)).xyz;\n\n    gl_Position = projectionMatrix * mvPosition;\n}\n";
export default shaderCode;
