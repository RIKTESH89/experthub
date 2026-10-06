// Adapted from Digital Brain, Copyright (c) 2026 Sahil K (MIT).
// See /uploads/digital-brain-foundation/CREDITS.md for source, license and modifications.
const shaderCode = "uniform float uBrightness;\nuniform sampler2D uTexture;\nvarying vec3 vColor;\nvarying float vColorMix;\n\nvoid main() {\n  vec4 particleTexture = texture2D(uTexture, gl_PointCoord);\n\n  float alpha = particleTexture.r;\n\n  if (alpha < 0.01) {\n    vec2 center = gl_PointCoord - 0.5;\n    float dist = length(center);\n    if (dist > 0.5) discard;\n    alpha = 1.0 - smoothstep(0.0, 0.5, dist);\n    alpha = pow(alpha, 2.0);\n  }\n\n  vec3 finalColor = vColor * uBrightness;\n\n  gl_FragColor = vec4(finalColor, alpha);\n}\n";
export default shaderCode;
