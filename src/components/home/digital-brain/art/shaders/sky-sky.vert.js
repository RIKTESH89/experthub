// Adapted from Digital Brain, Copyright (c) 2026 Sahil K (MIT).
// See /uploads/digital-brain-foundation/CREDITS.md for source, license and modifications.
const shaderCode = "varying vec2 vUv;\nvarying vec3 vPosition;\n\nvoid main() {\n    vUv = uv;\n    vPosition = normalize(position);\n    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);\n}\n";
export default shaderCode;
