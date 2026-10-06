// Adapted from Digital Brain, Copyright (c) 2026 Sahil K (MIT).
// See /uploads/digital-brain-foundation/CREDITS.md for source, license and modifications.
import * as THREE from 'three';
import sparkleVertexShader from './shaders/particles-sparkle.vert.js';
import sparkleFragmentShader from './shaders/particles-sparkle.frag.js';

export class SparkleParticleSystem {
  constructor(context) {
    this.scene = context.scene;
    this.game = context;
    this.debug = null;

    this.params = {
      count: 2000,
      size: 0.18,
      brightness: 1.6,
      minRadius: 0.8,
      maxRadius: 1.8,
      animationSpeed: 0.5,
      visible: true,
      skyBlueColor: '#ffffff',
      orangeColor: '#895d0d',
    };

    this.init();
  }

  init() {
    this.createGeometry();
    this.createMaterial();
    this.sparkles = new THREE.Points(this.geometry, this.material);
    this.scene.add(this.sparkles);
  }

  createGeometry() {
    this.geometry = new THREE.BufferGeometry();
    const positions = new Float32Array(this.params.count * 3);
    const randoms = new Float32Array(this.params.count);
    const colors = new Float32Array(this.params.count * 3);

    const skyBlue = new THREE.Color(this.params.skyBlueColor);
    const brightOrange = new THREE.Color(this.params.orangeColor);

    for (let i = 0; i < this.params.count; i++) {
      const radius = this.params.minRadius + Math.random() * (this.params.maxRadius - this.params.minRadius);
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);

      positions[i * 3] = radius * Math.sin(phi) * Math.cos(theta);
      positions[i * 3 + 1] = radius * Math.sin(phi) * Math.sin(theta) - 0.2;
      positions[i * 3 + 2] = radius * Math.cos(phi);
      randoms[i] = Math.random();

      const color = Math.random() > 0.5 ? skyBlue : brightOrange;
      colors[i * 3] = color.r;
      colors[i * 3 + 1] = color.g;
      colors[i * 3 + 2] = color.b;
    }

    this.geometry.setAttribute(
      'position',
      new THREE.BufferAttribute(positions, 3),
    );
    this.geometry.setAttribute(
      'aRandom',
      new THREE.BufferAttribute(randoms, 1),
    );
    this.geometry.setAttribute(
      'aColor',
      new THREE.BufferAttribute(colors, 3),
    );
  }

  createMaterial() {
    const particleTexture = this.game.resources.items.particlesTexture || null;

    if (!particleTexture) {
      console.warn('Particle texture not loaded yet');
    }

    this.material = new THREE.ShaderMaterial({
      uniforms: {
        uTime: { value: 0 },
        uPixelRatio: { value: this.game.pixelRatio },
        uSize: { value: this.params.size },
        uBrightness: { value: this.params.brightness },
        uTexture: { value: particleTexture },
        uColor: { value: new THREE.Color(0xffffff) },
        vAlpha: { value: 10.0 },
      },
      vertexShader: sparkleVertexShader,
      fragmentShader: sparkleFragmentShader,
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      depthTest: true,
    });
  }

  update(elapsedTime) {
    this.material.uniforms.uTime.value = elapsedTime * this.params.animationSpeed;
  }

  regenerateParticles() {
    this.scene.remove(this.sparkles);
    this.geometry.dispose();

    this.createGeometry();
    this.sparkles.geometry = this.geometry;
    this.scene.add(this.sparkles);
  }

  setPalette(palette) {
    this.params.skyBlueColor = palette.ivory;
    this.params.orangeColor = palette.brass;
    this.regenerateParticles();
  }
  dispose() {
    this.scene.remove(this.sparkles);
    this.geometry.dispose();
    this.material.dispose();
  }
}
