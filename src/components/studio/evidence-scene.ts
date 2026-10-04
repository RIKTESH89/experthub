import * as THREE from "three";

/** Owned geometry only. No models, textures, services or postprocessing. */
export function createEvidenceScene(canvas: HTMLCanvasElement, dark: boolean, mobile: boolean) {
  const renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true, powerPreference: "low-power" });
  renderer.setPixelRatio(Math.min(devicePixelRatio, mobile ? 1 : 1.5));
  renderer.setClearColor(0, 0);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.0;
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(32, 1, .1, 30);
  camera.position.set(0, .25, 8.6);
  const sculpture = new THREE.Group();
  sculpture.rotation.set(-.1, -.26, -.12);
  scene.add(sculpture);
  scene.add(new THREE.HemisphereLight(0xfff8eb, dark ? 0x35493e : 0x646e57, 1.5));
  const key = new THREE.DirectionalLight(0xffe7c2, 3.8); key.position.set(-3, 5, 6); scene.add(key);
  const rim = new THREE.DirectionalLight(0xc8f9e1, 2.5); rim.position.set(4, 1, -3); scene.add(rim);
  const paper = new THREE.MeshStandardMaterial({ color: 0xeee4cd, roughness: .85, metalness: .02 });
  const ink = new THREE.MeshStandardMaterial({ color: 0x536b58, roughness: .82 });
  const ceramic = new THREE.MeshStandardMaterial({ color: dark ? 0x21513e : 0x123e2b, roughness: .3, metalness: .2 });
  const brass = new THREE.MeshStandardMaterial({ color: 0xc0a46b, roughness: .38, metalness: .72 });
  const geometries: THREE.BufferGeometry[] = [];
  const own = <T extends THREE.BufferGeometry>(g: T) => { geometries.push(g); return g; };
  const shape = new THREE.Shape(); const w = 1.12, h = 1.55, r = .13;
  shape.moveTo(-w/2+r,-h/2); shape.lineTo(w/2-r,-h/2);shape.quadraticCurveTo(w/2,-h/2,w/2,-h/2+r);
  shape.lineTo(w/2,h/2-r);shape.quadraticCurveTo(w/2,h/2,w/2-r,h/2);shape.lineTo(-w/2+r,h/2);
  shape.quadraticCurveTo(-w/2,h/2,-w/2,h/2-r);shape.lineTo(-w/2,-h/2+r);shape.quadraticCurveTo(-w/2,-h/2,-w/2+r,-h/2);
  const sheetGeometry = own(new THREE.ExtrudeGeometry(shape, { depth: .055, bevelEnabled: true, bevelSegments: 2, steps: 1, bevelSize: .015, bevelThickness: .012, curveSegments: 5 }));
  // Bow the paper slightly rather than using flat rectangular cards.
  const positions = sheetGeometry.getAttribute("position");
  for(let i=0;i<positions.count;i++) positions.setZ(i,positions.getZ(i)+Math.pow(positions.getX(i),2)*.12);
  sheetGeometry.computeVertexNormals();
  const marksGeometry = own(new THREE.BoxGeometry(.68, .022, .012));
  const sheets: THREE.Group[] = [];
  const count = mobile ? 3 : 5;
  for(let i=0;i<count;i++) {
    const sheet = new THREE.Group(); sheet.add(new THREE.Mesh(sheetGeometry,paper));
    // One instanced draw for all engraved lines on each source fragment.
    const marks = new THREE.InstancedMesh(marksGeometry, ink, 7); const matrix = new THREE.Matrix4();
    for(let j=0;j<7;j++) { matrix.compose(new THREE.Vector3(j===0?-.07:0,.47-j*.13,.093),new THREE.Quaternion(),new THREE.Vector3(j===0?.55:j===6?.65:1,1,1)); marks.setMatrixAt(j,matrix); }
    sheet.add(marks); sculpture.add(sheet); sheets.push(sheet);
  }
  const core = new THREE.Group(); core.position.set(-.5,-.15,.6); core.rotation.x=Math.PI/2;
  const medallion = new THREE.Mesh(own(new THREE.CylinderGeometry(.72,.72,.18,64)),ceramic); core.add(medallion);
  const ribs = new THREE.InstancedMesh(own(new THREE.TorusGeometry(1,.015,6,64)),ceramic,4);
  const matrix = new THREE.Matrix4(); const rotation = new THREE.Quaternion().setFromEuler(new THREE.Euler(-Math.PI/2,0,0));
  for(let i=0;i<4;i++){const radius=.39+i*.075;matrix.compose(new THREE.Vector3(0,.108,0),rotation,new THREE.Vector3(radius,radius,radius)); ribs.setMatrixAt(i,matrix);}core.add(ribs);
  const seam = new THREE.Mesh(own(new THREE.TorusGeometry(.695,.014,6,64,Math.PI*1.1)),brass); seam.rotation.x=-Math.PI/2;seam.position.y=.1;core.add(seam);
  // Inset e mark formed as geometry, independent of font downloads.
  const mark = new THREE.Mesh(own(new THREE.TorusGeometry(.21,.028,8,36,Math.PI*1.72)),brass);mark.rotation.x=-Math.PI/2;mark.position.y=.115;core.add(mark);
  const bar = new THREE.Mesh(own(new THREE.BoxGeometry(.35,.028,.05)),brass);bar.position.set(.02,.115,0);core.add(bar);
  sculpture.add(core);
  let raf=0, active=true, elapsed=0, last=0, previous=0, px=0,py=0, disposed=false;
  const frameTimes:number[]=[];
  function pose(time:number){
    const progress=Math.min(time/5000,1); const eased=1-Math.pow(1-progress,3);
    sheets.forEach((sheet,i)=>{ const offset=i-(count-1)/2; const arrival=Math.min(1,Math.max(0,(eased-i*.035)/.82));
      sheet.position.set(.45+offset*.29, .24+offset*.21+(1-arrival)*.7, -.5+offset*.16);
      sheet.rotation.set(.05+offset*.025, offset*.13+Math.sin(progress*Math.PI)*.2, -.2+offset*.19+(1-arrival)*.3);
    });
    sculpture.rotation.y=-.26+Math.sin(progress*Math.PI)*.28+px*.08;
    sculpture.rotation.x=-.1+py*.08;
  }
  function draw(){if(disposed)return; renderer.render(scene,camera);canvas.dataset.drawCalls=String(renderer.info.render.calls);canvas.dataset.triangles=String(renderer.info.render.triangles);}
  function tick(now:number){raf=0;if(!active||disposed)return;if(previous)elapsed+=Math.min(now-previous,100);previous=now;
    if(now-last>=1000/30){ if(last)frameTimes.push(now-last);last=now;pose(elapsed);draw(); }
    if(elapsed<5000)raf=requestAnimationFrame(tick);else{canvas.dataset.settled="true";canvas.dataset.frameP95=String(frameTimes.sort((a,b)=>a-b)[Math.floor(frameTimes.length*.95)]??0);}
  }
  function resize(){const {width,height}=canvas.getBoundingClientRect();if(!width||!height)return;renderer.setSize(width,height,false);camera.aspect=width/height;camera.updateProjectionMatrix();pose(elapsed);draw();}
  resize();raf=requestAnimationFrame(tick);
  return {resize, replay(){elapsed=0;last=0;previous=0;delete canvas.dataset.settled;if(active&&!raf)raf=requestAnimationFrame(tick);},
    pointer(x:number,y:number){px=Math.max(-1,Math.min(1,x));py=Math.max(-1,Math.min(1,y));},
    active(value:boolean){active=value;previous=0;if(!value){cancelAnimationFrame(raf);raf=0;}else if(elapsed<5000&&!raf)raf=requestAnimationFrame(tick);},
    dispose(){disposed=true;cancelAnimationFrame(raf);geometries.forEach(g=>g.dispose());[paper,ink,ceramic,brass].forEach(m=>m.dispose());renderer.dispose();}
  };
}
