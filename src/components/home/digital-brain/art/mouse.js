// Adapted from Digital Brain, Copyright (c) 2026 Sahil K (MIT).
// See /uploads/digital-brain-foundation/CREDITS.md for source, license and modifications.
import * as THREE from 'three';

export default class Mouse {
  constructor(context) {
    this.game = context;
    this.camera = this.game.camera;
    this.canvas = this.game.canvas;

    this.mouse = new THREE.Vector2();
    this.raycaster = new THREE.Raycaster();
    this.isActive = false;

    this.setupEventListeners();
  }

  setupEventListeners() {
    this.onMouseMove = this.handleMouseMove.bind(this);
    this.onMouseEnter = this.handleMouseEnter.bind(this);
    this.onMouseLeave = this.handleMouseLeave.bind(this);

    this.canvas.addEventListener('pointermove', this.onMouseMove);
    this.canvas.addEventListener('mouseenter', this.onMouseEnter);
    this.canvas.addEventListener('mouseleave', this.onMouseLeave);
  }

  handleMouseMove(event) {
    const rect = this.canvas.getBoundingClientRect();
    this.mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    this.mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

    if (!this.camera.cameraInstance) return;

    this.raycaster.setFromCamera(this.mouse, this.camera.cameraInstance);
  }

  handleMouseEnter() {
    this.isActive = true;
  }

  handleMouseLeave() {
    this.isActive = false;
  }

  dispose() {
    this.canvas.removeEventListener('pointermove', this.onMouseMove);
    this.canvas.removeEventListener('mouseenter', this.onMouseEnter);
    this.canvas.removeEventListener('mouseleave', this.onMouseLeave);
  }
}
