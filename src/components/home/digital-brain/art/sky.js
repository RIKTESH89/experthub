// Adapted from Digital Brain, Copyright (c) 2026 Sahil K (MIT).
// See /uploads/digital-brain-foundation/CREDITS.md for source, license and modifications.
import * as THREE from 'three';
import vertexShader from './shaders/sky-sky.vert.js';
import fragmentShader from './shaders/sky-sky.frag.js';

export default class SkyDome {
    constructor(context) {
        this.scene = context.scene;
        this.mesh = null;
        this.game = context;

        this.config = {
            speed: 5.2,
            opacity: 0.38,
            tint: new THREE.Color(0x772599),
        };

        this.uniforms = null;

        this.init();
    }

    init() {
        const material = new THREE.ShaderMaterial({
            uniforms: {
                uTime: { value: 0 },
                uOpacity: { value: this.config.opacity },
                uTint: { value: this.config.tint },
            },
            vertexShader,
            fragmentShader,
            transparent: true,
            depthWrite: false,
            side: THREE.BackSide,
        });

        const geometry = new THREE.SphereGeometry(50, 32, 16);
        this.mesh = new THREE.Mesh(geometry, material);
        this.mesh.renderOrder = -100;
        this.mesh.matrixAutoUpdate = false;
        this.mesh.updateMatrix();

        this.uniforms = material.uniforms;

        this.scene.add(this.mesh);
    }

    update(elapsedTime) {
        this.uniforms.uTime.value = elapsedTime * this.config.speed;
    }

    setOpacity(value) {
        this.config.opacity = value;
        this.uniforms.uOpacity.value = value;
    }

    setTint(color) {
        this.config.tint.set(color);
        this.uniforms.uTint.value = this.config.tint;
    }

    dispose() {
        if (this.mesh) {
            this.mesh.geometry.dispose();
            this.mesh.material.dispose();
            this.scene.remove(this.mesh);
        }
    }
}