// Adapted from Digital Brain, Copyright (c) 2026 Sahil K (MIT).
// See /uploads/digital-brain-foundation/CREDITS.md for source, license and modifications.
import * as THREE from 'three';

const VignettePass = {
  uniforms: {
    tDiffuse: { value: null },
    offset: { value: 1.0 },
    darkness: { value: 1.0 },
    color: { value: new THREE.Color(0x000000) },
  },
  vertexShader: `
    varying vec2 vUv;
    void main() {
      vUv = uv;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `,
  fragmentShader: `
    uniform sampler2D tDiffuse;
    uniform float offset;
    uniform float darkness;
    uniform vec3 color;
    varying vec2 vUv;
    
    void main() {
      vec4 texel = texture2D(tDiffuse, vUv);
      vec2 uv = (vUv - vec2(0.5)) * vec2(offset);
      float vignette = 1.0 - dot(uv, uv);
      vignette = clamp(pow(vignette, darkness), 0.0, 1.0);
      vec3 finalColor = mix(color, texel.rgb, vignette);
      gl_FragColor = vec4(finalColor, texel.a);
    }
  `,
};

export { VignettePass };
