// Adapted from Digital Brain, Copyright (c) 2026 Sahil K (MIT).
// See /uploads/digital-brain-foundation/CREDITS.md for source, license and modifications.
import * as THREE from 'three';
import { MersenneTwister } from './random.js';
import ThreadParticles from './thread-particles.js';
import Mouse from './mouse.js';

export default class NeuralThreads {
  constructor(context) {
    this.game = context;
    this.scene = this.game.scene;
    this.debug = null;
    this.time = this.game.time;

    this.rng = new MersenneTwister(100);
    this.mouse = new Mouse(this.game);

    this.threads = [];
    this.clusters = [];
    this.clusterCount = 20;
    this.threadsPerCluster = 6;
    this.threadSegments = 256;
    this.threadRadiusMin = 0.0003;
    this.threadRadiusMax = 0.003;
    this.minLength = 0.7;
    this.maxLength = 3.0;
    this.startRadiusMin = 0.35;
    this.startRadiusMax = 0.5;
    this.opacity = 0.4;
    this.waveAmplitude = 0.12;
    this.waveFrequency = 3.8;
    this.clusterSpread = 0.1;

    this.animationEnabled = true;
    this.animationSpeed = 3.0;
    this.animationAmplitude = 0.03;
    this.animationFrequency = 2.0;

    this.mouseRepulsionEnabled = true;
    this.mouseRepulsionRadius = 0.35;
    this.mouseRepulsionStrength = 0.08;
    this.repulsionSmoothness = 0.15;

    this.mouseGlowEnabled = true;
    this.mouseGlowOpacity = 1.0;
    this.glowTransitionSpeed = 0.1;

    this.updateThrottle = 0;
    this.updateInterval = 1;
    this.lastMousePos = new THREE.Vector3();
    this.mouseMovementThreshold = 0.01;

    this.createThreads();
  }

  createThreads() {
    this.threads.forEach((thread) => {
      this.scene.remove(thread.mesh);
      thread.geometry.dispose();
      thread.material.dispose();
    });
    this.threads = [];
    this.clusters = [];

    if (this.threadParticles) {
      this.threadParticles.dispose();
      this.threadParticles = null;
    }

    this.rng = new MersenneTwister(42);

    for (let c = 0; c < this.clusterCount; c++) {
      const clusterTheta = this.rng.random() * Math.PI * 2;
      const clusterPhi = this.rng.random() * Math.PI;
      const clusterRadius =
        this.startRadiusMin +
        this.rng.random() * (this.startRadiusMax - this.startRadiusMin);

      const clusterX =
        clusterRadius * Math.sin(clusterPhi) * Math.cos(clusterTheta);
      const clusterY =
        clusterRadius * Math.sin(clusterPhi) * Math.sin(clusterTheta);
      const clusterZ = clusterRadius * Math.cos(clusterPhi);

      const dirLength = Math.sqrt(
        clusterX * clusterX + clusterY * clusterY + clusterZ * clusterZ,
      );
      const outwardDirX = clusterX / dirLength;
      const outwardDirY = clusterY / dirLength;
      const outwardDirZ = clusterZ / dirLength;

      const clusterWavePhase = this.rng.random() * Math.PI * 2;
      const clusterWaveFreq =
        this.waveFrequency * (0.8 + this.rng.random() * 0.4);
      const clusterWaveAmp =
        this.waveAmplitude * (0.7 + this.rng.random() * 0.6);
      const clusterWavePhase2 = this.rng.random() * Math.PI * 2;

      const cluster = {
        center: new THREE.Vector3(clusterX, clusterY, clusterZ),
        originalCenter: new THREE.Vector3(clusterX, clusterY, clusterZ),
        currentOffset: new THREE.Vector3(0, 0, 0),
        threads: [],
      };

      for (let t = 0; t < this.threadsPerCluster; t++) {
        const thread = this.createSingleThread(
          clusterX,
          clusterY,
          clusterZ,
          outwardDirX,
          outwardDirY,
          outwardDirZ,
          clusterWavePhase,
          clusterWaveFreq,
          clusterWaveAmp,
          clusterWavePhase2,
        );
        thread.clusterIndex = c;
        this.threads.push(thread);
        cluster.threads.push(thread);
        this.scene.add(thread.mesh);
      }

      this.clusters.push(cluster);
    }

    if (this.threadParticles) {
      this.threadParticles.dispose();
    }
    this.threadParticles = new ThreadParticles(this.threads, this.game);
  }

  createSingleThread(
    clusterX,
    clusterY,
    clusterZ,
    outwardDirX,
    outwardDirY,
    outwardDirZ,
    clusterWavePhase,
    clusterWaveFreq,
    clusterWaveAmp,
    clusterWavePhase2,
  ) {
    const offsetX = (this.rng.random() - 0.5) * this.clusterSpread;
    const offsetY = (this.rng.random() - 0.5) * this.clusterSpread;
    const offsetZ = (this.rng.random() - 0.5) * this.clusterSpread;

    const startX = clusterX + offsetX;
    const startY = clusterY + offsetY;
    const startZ = clusterZ + offsetZ;

    const threadLength =
      this.minLength + this.rng.random() * (this.maxLength - this.minLength);

    const dirVariation = 0.15;
    const finalDirX = outwardDirX + (this.rng.random() - 0.5) * dirVariation;
    const finalDirY = outwardDirY + (this.rng.random() - 0.5) * dirVariation;
    const finalDirZ = outwardDirZ + (this.rng.random() - 0.5) * dirVariation;

    const finalDirLength = Math.sqrt(
      finalDirX * finalDirX + finalDirY * finalDirY + finalDirZ * finalDirZ,
    );
    const normDirX = finalDirX / finalDirLength;
    const normDirY = finalDirY / finalDirLength;
    const normDirZ = finalDirZ / finalDirLength;

    let perpX, perpY, perpZ;
    if (Math.abs(normDirX) < 0.9) {
      perpX = 0;
      perpY = normDirZ;
      perpZ = -normDirY;
    } else {
      perpX = -normDirZ;
      perpY = 0;
      perpZ = normDirX;
    }
    const perpLength = Math.sqrt(perpX * perpX + perpY * perpY + perpZ * perpZ);
    perpX /= perpLength;
    perpY /= perpLength;
    perpZ /= perpLength;

    const perp2X = normDirY * perpZ - normDirZ * perpY;
    const perp2Y = normDirZ * perpX - normDirX * perpZ;
    const perp2Z = normDirX * perpY - normDirY * perpX;

    const points = [];
    const segments = this.threadSegments;

    for (let i = 0; i <= segments; i++) {
      const t = i / segments;
      const distance = t * threadLength;

      const wave1 =
        Math.sin(t * Math.PI * clusterWaveFreq + clusterWavePhase) *
        clusterWaveAmp;
      const wave2 =
        Math.cos(t * Math.PI * clusterWaveFreq * 0.7 + clusterWavePhase2) *
        clusterWaveAmp *
        0.6;

      const x = startX + normDirX * distance + perpX * wave1 + perp2X * wave2;
      const y = startY + normDirY * distance + perpY * wave1 + perp2Y * wave2;
      const z = startZ + normDirZ * distance + perpZ * wave1 + perp2Z * wave2;

      points.push(new THREE.Vector3(x, y, z));
    }

    const curve = new THREE.CatmullRomCurve3(points);
    curve.tension = 0.5;

    const threadRadius =
      this.threadRadiusMin +
      this.rng.random() * (this.threadRadiusMax - this.threadRadiusMin);

    const tubeSegments = Math.max(64, Math.floor(segments * 0.75));
    const geometry = new THREE.TubeGeometry(
      curve,
      tubeSegments,
      threadRadius,
      8,
      false,
    );

    const threadOpacity = this.opacity * (0.6 + this.rng.random() * 0.4);

    const material = new THREE.MeshBasicMaterial({
      color: 0xb089ff,
      transparent: true,
      opacity: threadOpacity,
      side: THREE.DoubleSide,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      depthTest: true,
    });

    const mesh = new THREE.Mesh(geometry, material);

    const originalPositions = new Float32Array(geometry.attributes.position.array);

    const perpVectors = [];
    for (let i = 0; i <= tubeSegments; i++) {
      const t = i / tubeSegments;
      const nextT = Math.min(t + 0.01, 1.0);
      const prevT = Math.max(t - 0.01, 0.0);
      const nextPoint = curve.getPointAt(nextT);
      const prevPoint = curve.getPointAt(prevT);

      const tangent = new THREE.Vector3()
        .subVectors(nextPoint, prevPoint)
        .normalize();

      let perp1 = new THREE.Vector3();
      if (Math.abs(tangent.x) < 0.9) {
        perp1.set(0, tangent.z, -tangent.y).normalize();
      } else {
        perp1.set(-tangent.z, 0, tangent.x).normalize();
      }

      const perp2 = new THREE.Vector3()
        .crossVectors(tangent, perp1)
        .normalize();

      perpVectors.push({ perp1, perp2 });
    }

    return {
      mesh,
      geometry,
      material,
      curve,
      points,
      originalPositions,
      tubeSegments,
      perpVectors,
      offset: this.rng.random(),
      clusterIndex: -1,
      needsUpdate: false,
      baseOpacity: threadOpacity,
      targetOpacity: threadOpacity,
      currentOpacity: threadOpacity,
    };
  }

  updateMouseRepulsion() {
    if (!this.mouseRepulsionEnabled) {
      return;
    }

    if (!this.mouse.isActive) {
      const anyNeedsReset = this.threads.some(t => t.needsUpdate);
      if (!anyNeedsReset) return;

      this.threads.forEach((thread) => {
        if (thread.needsUpdate) {
          this.resetThreadToOriginal(thread);
        }
      });
      return;
    }

    const ray = this.mouse.raycaster.ray;

    this.threads.forEach((thread) => {
      this.deformThreadWithRay(thread, ray, 1.0);
    });
  }

  deformThreadWithRay(thread, ray, intensity) {
    const positions = thread.geometry.attributes.position;
    const originalPositions = thread.originalPositions;
    const tubeSegments = thread.tubeSegments;
    const radialSegments = 8;
    const verticesPerRing = radialSegments + 1;

    const threadCenter = thread.curve.getPointAt(0.5);
    const closestToCenter = new THREE.Vector3();
    ray.closestPointToPoint(threadCenter, closestToCenter);
    const centerDistance = threadCenter.distanceTo(closestToCenter);

    if (centerDistance > this.mouseRepulsionRadius * 2) {
      if (thread.needsUpdate) {
        this.resetThreadToOriginal(thread);
      }
      if (this.mouseGlowEnabled) {
        thread.targetOpacity = thread.baseOpacity;
      }
      return;
    }

    let hasChanged = false;
    let maxInfluence = 0;

    for (let i = 0; i <= tubeSegments; i++) {
      const t = i / tubeSegments;
      const curvePoint = thread.curve.getPointAt(t);

      let offset = new THREE.Vector3(0, 0, 0);

      if (ray && intensity > 0) {
        const closestPoint = new THREE.Vector3();
        ray.closestPointToPoint(curvePoint, closestPoint);

        const distance = curvePoint.distanceTo(closestPoint);

        if (distance < this.mouseRepulsionRadius) {
          const repulsionDir = new THREE.Vector3()
            .subVectors(curvePoint, closestPoint)
            .normalize();

          const falloff = Math.pow(1 - (distance / this.mouseRepulsionRadius), 2);
          const threadFalloff = Math.sin(t * Math.PI);

          const strength = this.mouseRepulsionStrength * falloff * threadFalloff * intensity;
          offset = repulsionDir.multiplyScalar(strength);

          maxInfluence = Math.max(maxInfluence, falloff);
        }
      }

      const waveOffset = this.animationEnabled && thread.waveOffsets && thread.waveOffsets[i]
        ? thread.waveOffsets[i]
        : new THREE.Vector3(0, 0, 0);

      const ringStart = i * verticesPerRing;
      const ringEnd = ringStart + verticesPerRing;
      for (let vertexIndex = ringStart; vertexIndex < ringEnd; vertexIndex++) {
        const baseIndex = vertexIndex * 3;

        const targetX = originalPositions[baseIndex] + offset.x + waveOffset.x;
        const targetY = originalPositions[baseIndex + 1] + offset.y + waveOffset.y;
        const targetZ = originalPositions[baseIndex + 2] + offset.z + waveOffset.z;

        const deltaX = (targetX - positions.array[baseIndex]) * this.repulsionSmoothness;
        const deltaY = (targetY - positions.array[baseIndex + 1]) * this.repulsionSmoothness;
        const deltaZ = (targetZ - positions.array[baseIndex + 2]) * this.repulsionSmoothness;

        if (Math.abs(deltaX) > 0.0001 || Math.abs(deltaY) > 0.0001 || Math.abs(deltaZ) > 0.0001) {
          hasChanged = true;
          positions.array[baseIndex] += deltaX;
          positions.array[baseIndex + 1] += deltaY;
          positions.array[baseIndex + 2] += deltaZ;
        }
      }
    }

    if (this.mouseGlowEnabled) {
      if (maxInfluence > 0) {
        thread.targetOpacity = thread.baseOpacity + (this.mouseGlowOpacity - thread.baseOpacity) * maxInfluence;
      } else {
        thread.targetOpacity = thread.baseOpacity;
      }
    }

    if (hasChanged) {
      positions.needsUpdate = true;
      thread.needsUpdate = true;
    }
  }

  resetThreadToOriginal(thread) {
    const positions = thread.geometry.attributes.position;
    const originalPositions = thread.originalPositions;
    const tubeSegments = thread.tubeSegments;
    const radialSegments = 8;
    const verticesPerRing = radialSegments + 1;

    const hasWaveAnimation = this.animationEnabled && thread.waveOffsets;

    let hasChanged = false;

    for (let i = 0; i <= tubeSegments; i++) {
      const waveOffset = hasWaveAnimation && thread.waveOffsets[i]
        ? thread.waveOffsets[i]
        : new THREE.Vector3(0, 0, 0);

      const ringStart = i * verticesPerRing;
      const ringEnd = ringStart + verticesPerRing;

      for (let vertexIndex = ringStart; vertexIndex < ringEnd; vertexIndex++) {
        const baseIndex = vertexIndex * 3;

        const targetX = originalPositions[baseIndex] + waveOffset.x;
        const targetY = originalPositions[baseIndex + 1] + waveOffset.y;
        const targetZ = originalPositions[baseIndex + 2] + waveOffset.z;

        const deltaX = (targetX - positions.array[baseIndex]) * this.repulsionSmoothness;
        const deltaY = (targetY - positions.array[baseIndex + 1]) * this.repulsionSmoothness;
        const deltaZ = (targetZ - positions.array[baseIndex + 2]) * this.repulsionSmoothness;

        if (Math.abs(deltaX) > 0.0001 || Math.abs(deltaY) > 0.0001 || Math.abs(deltaZ) > 0.0001) {
          positions.array[baseIndex] += deltaX;
          positions.array[baseIndex + 1] += deltaY;
          positions.array[baseIndex + 2] += deltaZ;
          hasChanged = true;
        }
      }
    }

    if (hasChanged) {
      positions.needsUpdate = true;
    } else {
      thread.needsUpdate = false;
    }
  }

  deformThread(thread, mousePos, intensity) {
    const positions = thread.geometry.attributes.position;
    const originalPositions = thread.originalPositions;
    const tubeSegments = thread.tubeSegments;
    const radialSegments = 8;
    const verticesPerRing = radialSegments + 1;

    let hasChanged = false;

    for (let i = 0; i <= tubeSegments; i++) {
      const t = i / tubeSegments;
      const curvePoint = thread.curve.getPointAt(t);

      let offset = new THREE.Vector3(0, 0, 0);

      if (mousePos && intensity > 0) {
        const distance = curvePoint.distanceTo(mousePos);

        if (distance < this.mouseRepulsionRadius) {
          const repulsionDir = new THREE.Vector3()
            .subVectors(curvePoint, mousePos)
            .normalize();

          const falloff = Math.pow(1 - (distance / this.mouseRepulsionRadius), 2);

          const threadFalloff = Math.sin(t * Math.PI);

          const strength = this.mouseRepulsionStrength * falloff * threadFalloff * intensity;
          offset = repulsionDir.multiplyScalar(strength);
        }
      }

      for (let j = 0; j < verticesPerRing; j++) {
        const vertexIndex = i * verticesPerRing + j;
        const baseIndex = vertexIndex * 3;

        const targetX = originalPositions[baseIndex] + offset.x;
        const targetY = originalPositions[baseIndex + 1] + offset.y;
        const targetZ = originalPositions[baseIndex + 2] + offset.z;

        const deltaX = (targetX - positions.array[baseIndex]) * this.repulsionSmoothness;
        const deltaY = (targetY - positions.array[baseIndex + 1]) * this.repulsionSmoothness;
        const deltaZ = (targetZ - positions.array[baseIndex + 2]) * this.repulsionSmoothness;

        if (Math.abs(deltaX) > 0.0001 || Math.abs(deltaY) > 0.0001 || Math.abs(deltaZ) > 0.0001) {
          hasChanged = true;
          positions.array[baseIndex] += deltaX;
          positions.array[baseIndex + 1] += deltaY;
          positions.array[baseIndex + 2] += deltaZ;
        }
      }
    }

    if (hasChanged) {
      positions.needsUpdate = true;
    }
  }

  updateWaveAnimation() {
    if (!this.animationEnabled) return;

    const time = this.time.elapsedTime * this.animationSpeed;

    this.threads.forEach((thread) => {
      const tubeSegments = thread.tubeSegments;

      const phaseOffset = thread.offset * Math.PI * 2;

      if (!thread.waveOffsets) {
        thread.waveOffsets = [];
      }

      for (let i = 0; i <= tubeSegments; i++) {
        const t = i / tubeSegments;

        const amplitudeFalloff = t * t;

        const wave1 = Math.sin(t * Math.PI * this.animationFrequency + time + phaseOffset);
        const wave2 = Math.cos(t * Math.PI * this.animationFrequency * 1.3 + time * 0.7 + phaseOffset);

        const { perp1, perp2 } = thread.perpVectors[i];

        const amplitude = this.animationAmplitude * amplitudeFalloff;

        if (!thread.waveOffsets[i]) {
          thread.waveOffsets[i] = new THREE.Vector3();
        }

        thread.waveOffsets[i].set(
          perp1.x * wave1 * amplitude + perp2.x * wave2 * amplitude,
          perp1.y * wave1 * amplitude + perp2.y * wave2 * amplitude,
          perp1.z * wave1 * amplitude + perp2.z * wave2 * amplitude
        );
      }
    });
  }

  update() {
    this.updateWaveAnimation();

    if (this.animationEnabled) {
      this.applyWaveAnimation();
    }

    this.updateMouseRepulsion();

    if (this.mouseGlowEnabled) {
      this.updateGlowOpacity();
    }

    if (this.threadParticles) {
      this.threadParticles.update();
    }
  }

  updateGlowOpacity() {
    this.threads.forEach((thread) => {
      const delta = thread.targetOpacity - thread.currentOpacity;
      if (Math.abs(delta) > 0.001) {
        thread.currentOpacity += delta * this.glowTransitionSpeed;
        thread.material.opacity = thread.currentOpacity;
      }
    });
  }

  applyWaveAnimation() {
    this.threads.forEach((thread) => {
      if (thread.needsUpdate) return;

      const positions = thread.geometry.attributes.position;
      const originalPositions = thread.originalPositions;
      const tubeSegments = thread.tubeSegments;
      const radialSegments = 8;
      const verticesPerRing = radialSegments + 1;

      if (!thread.waveOffsets) return;

      for (let i = 0; i <= tubeSegments; i++) {
        const waveOffset = thread.waveOffsets[i];
        if (!waveOffset) continue;

        const ringStart = i * verticesPerRing;
        const ringEnd = ringStart + verticesPerRing;

        for (let vertexIndex = ringStart; vertexIndex < ringEnd; vertexIndex++) {
          const baseIndex = vertexIndex * 3;

          positions.array[baseIndex] = originalPositions[baseIndex] + waveOffset.x;
          positions.array[baseIndex + 1] = originalPositions[baseIndex + 1] + waveOffset.y;
          positions.array[baseIndex + 2] = originalPositions[baseIndex + 2] + waveOffset.z;
        }
      }

      positions.needsUpdate = true;
    });
  }

  setPalette(palette) {
    this.threads.forEach(thread => thread.material.color.set(palette.thread));
    this.threadParticles.particlesMaterial.uniforms.uColor1.value.set(palette.brass);
    this.threadParticles.particlesMaterial.uniforms.uColor2.value.set(palette.ivory);
  }

  dispose() {
    this.threads.forEach((thread) => {
      this.scene.remove(thread.mesh);
      thread.geometry.dispose();
      thread.material.dispose();
    });
    this.threads = [];
    this.clusters = [];

    if (this.threadParticles) {
      this.threadParticles.dispose();
    }

    if (this.mouse) {
      this.mouse.dispose();
    }
  }
}
