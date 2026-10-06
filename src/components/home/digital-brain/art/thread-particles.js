// Adapted from Digital Brain, Copyright (c) 2026 Sahil K (MIT).
// See /uploads/digital-brain-foundation/CREDITS.md for source, license and modifications.
import * as THREE from 'three';
import vertexShader from './shaders/threads-thread.vert.js';
import fragmentShader from './shaders/threads-thread.frag.js';

export default class ThreadParticles {
  constructor(threads, context) {
    this.game = context;
    this.scene = this.game.scene;
    this.time = this.game.time;
    this.threads = threads;

    this.particlesPerThread = 4;
    this.particleSpeed = 0.3;
    this.particleSize = 9.0;
    this.enabled = true;

    this.baseSpeedMultiplier = 1.0;
    this.chaosSpeedMultiplier = 1.0;
    this.maxChaosSpeed = 7.0;
    this.isDragging = false;
    this.easeK = 6.0;

    this.createParticles();
    this.setupPointerListeners();
  }

  setupPointerListeners() {
    this.onDown = () => { this.isDragging = true; this.randomizeParticleSpeeds(); };
    this.onUp = () => { this.isDragging = false; };
    this.game.canvas.addEventListener('pointerdown', this.onDown);
    this.game.canvas.addEventListener('pointerup', this.onUp);
    this.game.canvas.addEventListener('pointercancel', this.onUp);
    this.game.canvas.addEventListener('lostpointercapture', this.onUp);
  }

  randomizeParticleSpeeds() {
    if (!this.particlesGeometry) return;

    const speedAttr = this.particlesGeometry.getAttribute('aSpeed');

    for (let i = 0; i < speedAttr.count; i++) {
      speedAttr.array[i] = 0.5 + Math.random() * 2.5;
    }

    speedAttr.needsUpdate = true;
  }

  createParticles() {
    if (this.particlesMesh) {
      this.scene.remove(this.particlesMesh);
      this.particlesGeometry?.dispose();
      this.particlesMaterial?.dispose();
    }

    const totalParticles = this.threads.length * this.particlesPerThread;

    const positions = new Float32Array(totalParticles * 3);
    const progress = new Float32Array(totalParticles);
    const speeds = new Float32Array(totalParticles);
    const randoms = new Float32Array(totalParticles);
    const sizes = new Float32Array(totalParticles);

    let particleIndex = 0;
    this.threads.forEach(() => {
      for (let i = 0; i < this.particlesPerThread; i++) {
        const baseProgress = i / this.particlesPerThread;
        const randomOffset = Math.random() * 0.1;

        progress[particleIndex] = (baseProgress + randomOffset) % 1.0;
        speeds[particleIndex] = 0.8 + Math.random() * 0.4;
        randoms[particleIndex] = Math.random();
        sizes[particleIndex] = 0.7 + Math.random() * 0.6;

        particleIndex++;
      }
    });

    this.particlesGeometry = new THREE.BufferGeometry();
    this.particlesGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    this.particlesGeometry.setAttribute('aProgress', new THREE.BufferAttribute(progress, 1));
    this.particlesGeometry.setAttribute('aSpeed', new THREE.BufferAttribute(speeds, 1));
    this.particlesGeometry.setAttribute('aRandom', new THREE.BufferAttribute(randoms, 1));
    this.particlesGeometry.setAttribute('aSize', new THREE.BufferAttribute(sizes, 1));

    this.particlesMaterial = new THREE.ShaderMaterial({
      vertexShader,
      fragmentShader,
      transparent: true,
      depthWrite: false,
      depthTest: true,
      blending: THREE.AdditiveBlending,
      uniforms: {
        uTime: { value: 0 },
        uSize: { value: this.particleSize },
        uColor1: { value: new THREE.Color(0x7444ff) },
        uColor2: { value: new THREE.Color(0xff89d0) },
        uPixelRatio: { value: this.game.pixelRatio },
        uTexture: { value: this.game.resources.items.particlesTexture },
      },
    });

    this.particlesMesh = new THREE.Points(this.particlesGeometry, this.particlesMaterial);
    this.particlesMesh.frustumCulled = false;
    this.scene.add(this.particlesMesh);

    this.updateParticlePositions();
  }

  updateParticlePositions() {
    if (!this.particlesGeometry) return;

    const positionAttr = this.particlesGeometry.getAttribute('position');
    const progressAttr = this.particlesGeometry.getAttribute('aProgress');
    const speedAttr = this.particlesGeometry.getAttribute('aSpeed');

    let particleIndex = 0;

    this.threads.forEach((thread) => {
      const threadPositions = thread.geometry.attributes.position;
      const positionCount = threadPositions.count;

      for (let i = 0; i < this.particlesPerThread; i++) {
        let currentProgress = progressAttr.array[particleIndex];
        const speed = speedAttr.array[particleIndex];

        currentProgress += this.time.delta * this.particleSpeed * speed * this.chaosSpeedMultiplier * 0.1;

        if (currentProgress > 1.0) {
          currentProgress = currentProgress % 1.0;
        }

        progressAttr.array[particleIndex] = currentProgress;

        const point = this.sampleThreadPosition(threadPositions, currentProgress, positionCount);

        positionAttr.array[particleIndex * 3] = point.x;
        positionAttr.array[particleIndex * 3 + 1] = point.y;
        positionAttr.array[particleIndex * 3 + 2] = point.z;

        particleIndex++;
      }
    });

    positionAttr.needsUpdate = true;
    progressAttr.needsUpdate = true;
  }

  sampleThreadPosition(threadPositions, progress, positionCount) {
    const radialSegments = 8;
    const segmentCount = Math.floor(positionCount / (radialSegments + 1));

    const exactSegment = progress * (segmentCount - 1);
    const segmentIndex = Math.floor(exactSegment);
    const segmentProgress = exactSegment - segmentIndex;

    const getCurrentRingCenter = (index) => {
      const ringStartIndex = index * (radialSegments + 1);
      let x = 0, y = 0, z = 0;

      for (let i = 0; i < radialSegments + 1; i++) {
        const vertexIndex = ringStartIndex + i;
        if (vertexIndex < positionCount) {
          x += threadPositions.array[vertexIndex * 3];
          y += threadPositions.array[vertexIndex * 3 + 1];
          z += threadPositions.array[vertexIndex * 3 + 2];
        }
      }

      const divisor = radialSegments + 1;
      return new THREE.Vector3(x / divisor, y / divisor, z / divisor);
    };

    const currentCenter = getCurrentRingCenter(segmentIndex);

    if (segmentIndex < segmentCount - 1) {
      const nextCenter = getCurrentRingCenter(segmentIndex + 1);
      return currentCenter.lerp(nextCenter, segmentProgress);
    }

    return currentCenter;
  }

  lerp(a, b, t) {
    return a + (b - a) * t;
  }

  update() {
    if (!this.enabled || !this.particlesMaterial) return;

    this.particlesMaterial.uniforms.uTime.value = this.time.elapsedTime;

    const targetSpeed = this.isDragging ? this.maxChaosSpeed : this.baseSpeedMultiplier;
    const lerpFactor = Math.min(this.time.delta * this.easeK, 1.0);
    this.chaosSpeedMultiplier = this.lerp(this.chaosSpeedMultiplier, targetSpeed, lerpFactor);

    this.updateParticlePositions();
  }

  setEnabled(enabled) {
    this.enabled = enabled;
    if (this.particlesMesh) {
      this.particlesMesh.visible = enabled;
    }
  }

  dispose() {
    this.game.canvas.removeEventListener('pointerdown', this.onDown);
    this.game.canvas.removeEventListener('pointerup', this.onUp);
    this.game.canvas.removeEventListener('pointercancel', this.onUp);
    this.game.canvas.removeEventListener('lostpointercapture', this.onUp);
    if (this.particlesMesh) {
      this.scene.remove(this.particlesMesh);
    }
    this.particlesGeometry?.dispose();
    this.particlesMaterial?.dispose();
  }
}
