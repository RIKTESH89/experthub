// Adapted from Digital Brain, Copyright (c) 2026 Sahil K (MIT).
// See /uploads/digital-brain-foundation/CREDITS.md for source, license and modifications.
import * as THREE from 'three';
import { MeshSurfaceSampler } from 'three/examples/jsm/math/MeshSurfaceSampler.js';
import { random } from './random.js';
import vertexShaderGrooveParticles from './shaders/particles-groove.vert.js';
import fragmentShaderGrooveParticles from './shaders/particles-groove.frag.js';
import vertexShaderBrain from './shaders/brain-brain.vert.js';
import fragmentShaderBrain from './shaders/brain-brain.frag.js';
import NeuralThreads from './neural-threads.js';

export default class Brain {
  constructor(context) {
    this.game = context;
    this.scene = this.game.scene;
    this.debug = null;
    this.time = this.game.time;

    this.modelResource = this.game.resources.items.brainModel;

    this.outset = 0.003;
    this.redThreshold = 0.5;
    this.grooveAnimationSpeed = 1.0;
    this.targetParticleCount = 7000;
    this.isReady = false;

    this.setMaterial();
    this.setModelInstance();
  }

  async initialize(onProgress) {
    await this.setupSurfaceSampling(onProgress);
    this.game.signal.throwIfAborted();
    this.neuralThreads = new NeuralThreads(this.game);
    this.isReady = true;
    return this;
  }

  setMaterial() {
    this.material = new THREE.ShaderMaterial({
      vertexShader: vertexShaderBrain,
      fragmentShader: fragmentShaderBrain,
      uniforms: {
        uBaseColor: { value: new THREE.Color(0x492469) },
        uFresnelColor: { value: new THREE.Color(0xb3a1cf) },
        uFresnelPower: { value: 2.5 },
        uFresnelIntensity: { value: 1.2 },

        uSpecularIntensity: { value: 0.6 },
        uSpecularShininess: { value: 32.0 },
        uRoughness: { value: 0.3 },

        uLightPosition: { value: new THREE.Vector3(2.0, 3.0, 2.0) },

        uTime: { value: 0 },
        uElectricColor: { value: new THREE.Color(0x8b5cf6) },
        uElectricIntensity: { value: 2.5 },
        uElectricSpeed: { value: 1.5 },
        uElectricFrequency: { value: 8.0 },
      },
      side: THREE.FrontSide,
      depthWrite: true,
      depthTest: true,
    });
  }

  setModelInstance() {
    this.brain = this.modelResource.scene;

    this.brain.traverse((child) => {
      if (child.isMesh) {
        const originals = Array.isArray(child.material) ? child.material : [child.material];
        for (const original of originals) {
          for (const value of Object.values(original)) if (value?.isTexture) { value.source?.data?.close?.(); value.dispose(); }
          original.dispose();
        }
        child.material = this.material;
        child.castShadow = true;
        child.receiveShadow = true;
      }
    });

    this.scene.add(this.brain);
  }

  buildRedVertexSet() {
    const geometry = this.brainMesh.geometry;
    const colorAttr = geometry.getAttribute('color');

    if (!colorAttr) {
      console.warn('No vertex color attribute found');
      return new Set();
    }

    const redVertices = new Set();

    for (let i = 0; i < colorAttr.count; i++) {
      const r = colorAttr.getX(i);
      const g = colorAttr.getY(i);
      const b = colorAttr.getZ(i);

      if (r > this.redThreshold && r > g * 1.5 && r > b * 1.5) {
        redVertices.add(i);
      }
    }

    return redVertices;
  }

  async setupSurfaceSampling(onProgress) {
    if (this.grooveParticles) {
      this.scene.remove(this.grooveParticles);
      this.grooveParticles = null;
    }
    if (this.grooveParticlesGeometry) {
      this.grooveParticlesGeometry.dispose();
      this.grooveParticlesGeometry = null;
    }
    if (this.grooveParticlesMaterial) {
      this.grooveParticlesMaterial.dispose();
      this.grooveParticlesMaterial = null;
    }

    this.brainMesh = null;

    this.brain.traverse((child) => {
      if (child.isMesh && child.geometry && !this.brainMesh) {
        this.brainMesh = child;
      }
    });

    if (!this.brainMesh) {
      console.warn('No mesh found for surface sampling');
      return;
    }

    const geometry = this.brainMesh.geometry;
    const colorAttr = geometry.getAttribute('color');

    if (!colorAttr) {
      console.warn('No vertex color attribute found on mesh');
      return;
    }

    const redVertices = this.buildRedVertexSet();

    if (redVertices.size === 0) {
      console.warn('No red vertices found!');
      return;
    }

    const posAttr = geometry.getAttribute('position');
    const redVertexData = [];

    for (const vertexIndex of redVertices) {
      const pos = new THREE.Vector3().fromBufferAttribute(posAttr, vertexIndex);
      redVertexData.push({
        index: vertexIndex,
        position: pos,
      });
    }

    const gridSize = 0.01;
    const spatialGrid = new Map();

    const getGridKey = (pos) => {
      const x = Math.floor(pos.x / gridSize);
      const y = Math.floor(pos.y / gridSize);
      const z = Math.floor(pos.z / gridSize);
      return `${x},${y},${z}`;
    };

    for (const data of redVertexData) {
      const key = getGridKey(data.position);
      if (!spatialGrid.has(key)) {
        spatialGrid.set(key, []);
      }
      spatialGrid.get(key).push(data);
    }

    if (onProgress) onProgress(5);

    const targetParticleCount = this.targetParticleCount;
    const maxAttempts = targetParticleCount * 24;

    const grooveWeight = new Float32Array(posAttr.count);
    for (const index of redVertices) grooveWeight[index] = 1;
    geometry.setAttribute('grooveWeight', new THREE.BufferAttribute(grooveWeight, 1));
    this.sampler = new MeshSurfaceSampler(this.brainMesh)
      .setWeightAttribute('grooveWeight')
      .build();

    this.sampledData = [];
    const tempPosition = new THREE.Vector3();
    const tempNormal = new THREE.Vector3();

    let attempts = 0;
    const batchSize = 5000;
    const samplingWeight = 0.8;
    const geometryWeight = 0.2;

    const findNearestRedVertex = (pos) => {
      const centerKey = getGridKey(pos);
      const [cx, cy, cz] = centerKey.split(',').map(Number);

      let closestDist = Infinity;
      let closestData = null;

      const searchRadius = 1;
      for (let dx = -searchRadius; dx <= searchRadius; dx++) {
        for (let dy = -searchRadius; dy <= searchRadius; dy++) {
          for (let dz = -searchRadius; dz <= searchRadius; dz++) {
            const key = `${cx + dx},${cy + dy},${cz + dz}`;
            const cellData = spatialGrid.get(key);

            if (cellData) {
              for (const data of cellData) {
                const dist = data.position.distanceToSquared(pos);
                if (dist < closestDist) {
                  closestDist = dist;
                  closestData = data;
                }
              }
            }
          }
        }
      }

      return closestData;
    };

    if (onProgress) onProgress(10);

    while (
      this.sampledData.length < targetParticleCount &&
      attempts < maxAttempts
    ) {
      this.game.signal.throwIfAborted();
      for (
        let batch = 0;
        batch < batchSize &&
        attempts < maxAttempts &&
        this.sampledData.length < targetParticleCount;
        batch++
      ) {
        this.sampler.sample(tempPosition, tempNormal);
        attempts++;

        const nearestData = findNearestRedVertex(tempPosition);

        if (!nearestData) continue;

        const maxDistance = gridSize * 1;
        if (nearestData.position.distanceTo(tempPosition) > maxDistance)
          continue;

        this.sampledData.push({
          vertexIndex: nearestData.index,
          offset: tempPosition.clone().sub(nearestData.position),
          normal: tempNormal.clone(),
          random: random(),
          size: random() * 0.5 + 0.5,
        });
      }

      if (onProgress) {
        const samplingProgress = Math.min((attempts / maxAttempts) * 100, 100);
        const weightedProgress = 10 + samplingProgress * samplingWeight * 0.9;
        onProgress(weightedProgress);
      }

      await new Promise((resolve) => setTimeout(resolve, 5));
    }

    this.grooveParticlesCount = this.sampledData.length;

    if (this.grooveParticlesCount === 0) {
      console.warn('No particles created! Check vertex colors and threshold.');
      if (onProgress) onProgress(100);
      return;
    }

    const baseProgress = samplingWeight * 100;

    if (onProgress) onProgress(baseProgress + geometryWeight * 100 * 0.1);

    const positions = new Float32Array(this.grooveParticlesCount * 3);
    const randoms = new Float32Array(this.grooveParticlesCount);
    const sizes = new Float32Array(this.grooveParticlesCount);

    for (let i = 0; i < this.grooveParticlesCount; i++) {
      randoms[i] = this.sampledData[i].random;
      sizes[i] = this.sampledData[i].size;
    }

    if (onProgress) onProgress(baseProgress + geometryWeight * 100 * 0.3);

    this.grooveParticlesGeometry = new THREE.BufferGeometry();
    this.grooveParticlesGeometry.setAttribute(
      'position',
      new THREE.BufferAttribute(positions, 3),
    );
    this.grooveParticlesGeometry.setAttribute(
      'aRandom',
      new THREE.BufferAttribute(randoms, 1),
    );
    this.grooveParticlesGeometry.setAttribute(
      'aSize',
      new THREE.BufferAttribute(sizes, 1),
    );

    if (onProgress) onProgress(baseProgress + geometryWeight * 100 * 0.6);

    this.grooveParticlesMaterial = new THREE.ShaderMaterial({
      vertexShader: vertexShaderGrooveParticles,
      fragmentShader: fragmentShaderGrooveParticles,
      transparent: true,
      depthWrite: false,
      depthTest: true,
      blending: THREE.AdditiveBlending,
      uniforms: {
        uTime: { value: 0 },
        uSize: { value: 15.0 },
        uColor1: { value: new THREE.Color(0xff9b57) },
        uColor2: { value: new THREE.Color(0xd5750f) },
        uPixelRatio: { value: this.game.pixelRatio },
        uTexture: { value: this.game.resources.items.particlesTexture },
      },
    });

    this.grooveParticles = new THREE.Points(
      this.grooveParticlesGeometry,
      this.grooveParticlesMaterial,
    );
    this.grooveParticles.frustumCulled = false;

    this.scene.add(this.grooveParticles);

    if (onProgress) onProgress(baseProgress + geometryWeight * 100 * 0.85);

    this.updateGrooveParticlesPositions();

    if (onProgress) {
      onProgress(100);
    }
  }

  updateGrooveParticlesPositions() {
    if (
      !this.brainMesh ||
      !this.grooveParticlesGeometry ||
      !this.grooveParticles
    )
      return;

    const positionAttribute =
      this.grooveParticlesGeometry.getAttribute('position');
    const posAttr = this.brainMesh.geometry.getAttribute('position');

    this.brainMesh.updateMatrixWorld(true);

    for (let i = 0; i < this.grooveParticlesCount; i++) {
      const data = this.sampledData[i];

      const basePos = new THREE.Vector3().fromBufferAttribute(
        posAttr,
        data.vertexIndex,
      );

      const finalPos = basePos
        .add(data.offset)
        .add(data.normal.clone().multiplyScalar(this.outset));

      finalPos.applyMatrix4(this.brainMesh.matrixWorld);

      positionAttribute.array[i * 3] = finalPos.x;
      positionAttribute.array[i * 3 + 1] = finalPos.y;
      positionAttribute.array[i * 3 + 2] = finalPos.z;
    }

    positionAttribute.needsUpdate = true;
  }

  update() {
    if (this.material) {
      this.material.uniforms.uTime.value += this.time.delta;
    }

    if (this.grooveParticlesMaterial) {
      this.grooveParticlesMaterial.uniforms.uTime.value +=
        this.time.delta * this.grooveAnimationSpeed;
    }


    if (this.neuralThreads) {
      this.neuralThreads.update();
    }
  }

  setPalette(palette) {
    this.material.uniforms.uBaseColor.value.set(palette.brain);
    this.material.uniforms.uFresnelColor.value.set(palette.rim);
    this.material.uniforms.uElectricColor.value.set(palette.electric);
    this.material.uniforms.uElectricIntensity.value = palette.electricIntensity;
    this.material.uniforms.uFresnelIntensity.value = palette.rimIntensity;
    if (this.grooveParticlesMaterial) {
      this.grooveParticlesMaterial.uniforms.uColor1.value.set(palette.brass);
      this.grooveParticlesMaterial.uniforms.uColor2.value.set(palette.ivory);
      this.grooveParticlesMaterial.blending = palette.additive ? THREE.AdditiveBlending : THREE.NormalBlending;
    }
    this.neuralThreads?.setPalette(palette);
  }

  dispose() {
    this.scene.remove(this.brain);
    this.scene.remove(this.grooveParticles);
    this.brain.traverse(child => { if (child.isMesh) child.geometry.dispose(); });
    this.material.dispose();
    if (this.grooveParticlesGeometry) {
      this.grooveParticlesGeometry.dispose();
    }
    if (this.grooveParticlesMaterial) {
      this.grooveParticlesMaterial.dispose();
    }
    if (this.neuralThreads) {
      this.neuralThreads.dispose();
    }
  }
}
