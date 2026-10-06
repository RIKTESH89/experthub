"""Reproducible adaptation of the approved Sahil source; never edits upstream."""
from pathlib import Path
import json, re, shutil

app = Path(__file__).resolve().parents[1]
source = app.parent / 'digital-brain-foundation-sources/digital-brain'
art = app / 'src/components/home/digital-brain/art'
assets = app / 'public/uploads/digital-brain-foundation'
notice = '// Adapted from Digital Brain, Copyright (c) 2026 Sahil K (MIT).\n// See /uploads/digital-brain-foundation/CREDITS.md for source, license and modifications.\n'

def strip_method(text, name):
    # The upstream methods start at an indented class boundary.
    return re.sub(r'\n  '+name+r'\([^\n]*\) \{.*?(?=\n  (?:async )?[A-Za-z]+\(|\n\})', '', text, flags=re.S)

def imports(text):
    text = re.sub(r"import Game from '[^']+';\n", '', text)
    text = text.replace("import * as MATH from '../../../Utils/Math.class';", "import { random } from './random.js';")
    text = text.replace("import MersenneTwister from 'mersennetwister';", "import { MersenneTwister } from './random.js';")
    text = re.sub(r"from '[^']+/Shaders/([^']+)\.glsl'", lambda m: "from './shaders/"+m[1].replace('/', '-')+".js'", text)
    text = text.replace("from './NeuralThreads.class'", "from './neural-threads.js'").replace("from './ThreadParticles.class'", "from './thread-particles.js'").replace("from '../../../Input/Mouse.class'", "from './mouse.js'")
    text = text.replace('this.game = Game.getInstance();', 'this.game = context;')
    text = text.replace('this.debug = this.game.debug;', 'this.debug = null;')
    text = text.replace('Math.min(window.devicePixelRatio, 2)', 'this.game.pixelRatio')
    return notice + text

brain = (source / 'src/Game/World/Components/Brain/Brain.class.js').read_text()
brain = strip_method(brain, 'setupDebug')
brain = imports(brain).replace('constructor() {', 'constructor(context) {', 1)
brain = brain.replace('new NeuralThreads()', 'new NeuralThreads(this.game)').replace('    this.setupDebug();\n', '')
brain = brain.replace('MATH.random()', 'random()')
brain = brain.replace('const maxAttempts = targetParticleCount * 6;', 'const maxAttempts = targetParticleCount * 24;')
brain = brain.replace("    this.sampler = new MeshSurfaceSampler(this.brainMesh)\n      .setWeightAttribute(null)", "    const grooveWeight = new Float32Array(posAttr.count);\n    for (const index of redVertices) grooveWeight[index] = 1;\n    geometry.setAttribute('grooveWeight', new THREE.BufferAttribute(grooveWeight, 1));\n    this.sampler = new MeshSurfaceSampler(this.brainMesh)\n      .setWeightAttribute('grooveWeight')")
brain = brain.replace('uSize: { value: 50.0 }', 'uSize: { value: 15.0 }')
brain = brain.replace('await this.setupSurfaceSampling(onProgress);', 'await this.setupSurfaceSampling(onProgress);\n    this.game.signal.throwIfAborted();')
brain = brain.replace('      for (\n        let batch', '      this.game.signal.throwIfAborted();\n      for (\n        let batch')
brain = brain.replace('this.time.delta * 0.001', 'this.time.delta')
brain = brain.replace('    if (this.grooveParticles && this.brainMesh) {\n      this.updateGrooveParticlesPositions();\n    }\n', '')
brain = brain.replace('        child.material = this.material;', '''        const originals = Array.isArray(child.material) ? child.material : [child.material];
        for (const original of originals) {
          for (const value of Object.values(original)) if (value?.isTexture) { value.source?.data?.close?.(); value.dispose(); }
          original.dispose();
        }
        child.material = this.material;''')
brain = brain.replace('  dispose() {', '''  setPalette(palette) {
    this.material.uniforms.uBaseColor.value.set(palette.brain);
    this.material.uniforms.uFresnelColor.value.set(palette.rim);
    this.material.uniforms.uElectricColor.value.set(palette.electric);
    if (this.grooveParticlesMaterial) {
      this.grooveParticlesMaterial.uniforms.uColor1.value.set(palette.brass);
      this.grooveParticlesMaterial.uniforms.uColor2.value.set(palette.ivory);
    }
    this.neuralThreads?.setPalette(palette);
  }

  dispose() {
    this.scene.remove(this.brain);
    this.scene.remove(this.grooveParticles);
    this.brain.traverse(child => { if (child.isMesh) child.geometry.dispose(); });
    this.material.dispose();''')
(art / 'brain.js').write_text(brain)

threads = (source / 'src/Game/World/Components/Brain/NeuralThreads.class.js').read_text()
threads = strip_method(threads, 'setupDebug')
threads = imports(threads).replace('constructor() {', 'constructor(context) {', 1)
threads = threads.replace('new Mouse()', 'new Mouse(this.game)').replace('new ThreadParticles(this.threads)', 'new ThreadParticles(this.threads, this.game)')
threads = threads.replace('    this.createThreads();\n    this.threadParticles = new ThreadParticles(this.threads, this.game);\n    this.setupDebug();', '    this.createThreads();')
threads = threads.replace('      const originalPositions = thread.originalPositions;\n      const tubeSegments = thread.tubeSegments;\n      const radialSegments = 8;\n      const verticesPerRing = radialSegments + 1;\n\n      const phaseOffset', '      const tubeSegments = thread.tubeSegments;\n\n      const phaseOffset')
threads = threads.replace('  dispose() {', '''  setPalette(palette) {
    this.threads.forEach(thread => thread.material.color.set(palette.thread));
    this.threadParticles.particlesMaterial.uniforms.uColor1.value.set(palette.brass);
    this.threadParticles.particlesMaterial.uniforms.uColor2.value.set(palette.ivory);
  }

  dispose() {''')
(art / 'neural-threads.js').write_text(threads)

particles = (source / 'src/Game/World/Components/Brain/ThreadParticles.class.js').read_text()
particles = imports(particles).replace('constructor(threads) {', 'constructor(threads, context) {', 1)
start = particles.index('  setupPointerListeners() {')
end = particles.index('  randomizeParticleSpeeds()', start)
particles = particles[:start] + '''  setupPointerListeners() {
    this.onDown = () => { this.isDragging = true; this.randomizeParticleSpeeds(); };
    this.onUp = () => { this.isDragging = false; };
    this.game.canvas.addEventListener('pointerdown', this.onDown);
    this.game.canvas.addEventListener('pointerup', this.onUp);
    this.game.canvas.addEventListener('pointercancel', this.onUp);
    this.game.canvas.addEventListener('lostpointercapture', this.onUp);
  }

''' + particles[end:]
particles = particles.replace('const radialSegments = 4;', 'const radialSegments = 8;')
particles = particles.replace('this.threads.forEach((thread, threadIndex) => {', 'this.threads.forEach(() => {')
particles = particles.replace('this.particleSize = 30.0;', 'this.particleSize = 9.0;')
particles = particles.replace('  dispose() {', '''  dispose() {
    this.game.canvas.removeEventListener('pointerdown', this.onDown);
    this.game.canvas.removeEventListener('pointerup', this.onUp);
    this.game.canvas.removeEventListener('pointercancel', this.onUp);
    this.game.canvas.removeEventListener('lostpointercapture', this.onUp);''')
(art / 'thread-particles.js').write_text(particles)

mouse = (source / 'src/Game/Input/Mouse.class.js').read_text()
mouse = imports(mouse).replace('constructor() {', 'constructor(context) {', 1)
mouse = mouse.replace("window.addEventListener('mousemove', this.onMouseMove)", "this.canvas.addEventListener('pointermove', this.onMouseMove)")
mouse = mouse.replace("window.removeEventListener('mousemove', this.onMouseMove)", "this.canvas.removeEventListener('pointermove', this.onMouseMove)")
mouse = mouse.replace('    this.mouse.x = (event.clientX / window.innerWidth) * 2 - 1;\n    this.mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;', '''    const rect = this.canvas.getBoundingClientRect();
    this.mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    this.mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;''')
(art / 'mouse.js').write_text(mouse)

sparkles = (source / 'src/Game/World/Components/Particles/SparkleParticles.class.js').read_text()
sparkles = strip_method(sparkles, 'setupDebug')
sparkles = imports(sparkles).replace('constructor(scene) {\n    this.scene = scene;', 'constructor(context) {\n    this.scene = context.scene;')
sparkles = sparkles.replace('    this.setupDebug();\n', '')
sparkles = sparkles.replace('size: 0.5,', 'size: 0.18,').replace('brightness: 6.0,', 'brightness: 1.6,')
sparkles = sparkles.rsplit('\n}', 1)[0] + '''
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
'''
(art / 'sparkles.js').write_text(sparkles)

sky = (source / 'src/Game/World/Components/SkyDome/SkyDome.class.js').read_text()
sky = re.sub(r'\n    setupDebugGUI\(\) \{.*?(?=\n    dispose\()', '', sky, flags=re.S)
sky = imports(sky).replace('constructor(scene) {\n        this.scene = scene;', 'constructor(context) {\n        this.scene = context.scene;').replace('        this.setupDebugGUI();\n', '')
(art / 'sky.js').write_text(sky)
(art / 'vignette.js').write_text(notice + (source / 'src/Game/Passes/Vignette.pass.js').read_text())

shaderdir = art / 'shaders'
shaderdir.mkdir(exist_ok=True)
for path in (source / 'src/Shaders').rglob('*.glsl'):
    target = shaderdir / (str(path.relative_to(source / 'src/Shaders')).replace('/', '-').replace('.glsl', '.js'))
    target.write_text(notice + 'const shaderCode = ' + json.dumps(path.read_text()) + ';\nexport default shaderCode;\n')

shutil.copy(source / 'public/assets/models/brain_c.glb', assets / 'brain-areas.glb')
shutil.copy(source / 'public/assets/models/license.txt', assets / 'licenses/brain-areas-source.txt')
shutil.copy(source / 'LICENSE', assets / 'licenses/sahil-MIT.txt')
shutil.copy(app / 'node_modules/three/LICENSE', assets / 'licenses/three-MIT.txt')
(assets / 'draco').mkdir(exist_ok=True)
for name in ['draco_wasm_wrapper.js', 'draco_decoder.wasm']:
    shutil.copy(app / 'node_modules/three/examples/jsm/libs/draco/gltf' / name, assets / 'draco' / name)
