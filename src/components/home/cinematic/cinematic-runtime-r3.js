// Original DOM-independent ExpertHub camera/studio adapter. Three r186; no new dependencies.
const clamp=t=>Math.max(0,Math.min(1,t));
const smooth=t=>{t=clamp(t);return t*t*(3-2*t);};
export const RUNTIME_VERSION='experthub-runtime-r3';
export const ASSET_SHA256='c602aa49df4785c6c80bf14c9c74b0874076b97424cd1611285b07899a2a5ea0';
export function shotWeights(frame,variant='desktop'){
 const brain=1-smooth((frame-12)/28),twin=smooth((frame-96)/20)*(1-brain);
 const body=smooth((frame-145)/22)*twin;
 const sources=variant==='portrait'?(1-brain-twin):0;
 return {brain,twin:twin-body,body,sources,wide:1-brain-twin-sources};
}
export function createCameraDirector(T,envelope){
 if(envelope.assetSha256!==ASSET_SHA256)throw new Error('Camera envelope asset hash does not match runtime-r3 v7 contract');
 const center=new T.Vector3(),lo=new T.Vector3(),hi=new T.Vector3(),half=new T.Vector3(),offset=new T.Vector3();
 return {apply({camera,sourceCamera,frame,aspect,variant,track,compositionRect=[0,0,1,1]}){
  if(!Number.isFinite(frame)||!Number.isFinite(aspect)||aspect<=0)throw new Error('Finite frame and positive canvas aspect required');frame=Math.max(0,Math.min(191,frame));
  sourceCamera.updateWorldMatrix(true,false);sourceCamera.matrixWorld.decompose(camera.position,camera.quaternion,camera.scale);
  camera.scale.setScalar(1);camera.aspect=aspect;
  // Keep a stable authored lens; no portrait roll or whole-scene automatic zoom on macro shots.
  camera.fov=(track?.yfov??35*Math.PI/180)*180/Math.PI;
  const samples=envelope.samples;let i=0;while(i<samples.length-2&&samples[i+1].frame<frame)i++;
  const a=samples[i],b=samples[i+1],t=clamp((frame-a.frame)/Math.max(1,b.frame-a.frame)),weights=shotWeights(frame,variant);
  const [rx,ry,rw,rh]=compositionRect;if(![rx,ry,rw,rh].every(Number.isFinite)||rw<=0||rh<=0||rx<0||ry<0||rx+rw>1.001||ry+rh>1.001)throw new Error('compositionRect must be normalized inside canvas');
  center.set(0,0,0);let distance=0;
  for(const kind of ['brain','wide','twin','sources','body']){const weight=weights[kind];if(weight<=0)continue;
   const x=a.groups[variant][kind],y=b.groups[variant][kind];
   lo.fromArray(x.min).lerp(offset.fromArray(y.min),t);hi.fromArray(x.max).lerp(offset.fromArray(y.max),t);
   const c=lo.clone().add(hi).multiplyScalar(.5);half.copy(hi).sub(lo).multiplyScalar(.5);
   const padding=kind==='wide'?1.12:kind==='brain'?1.17:kind==='sources'?1.15:1.16;
   const d=Math.max(half.x/(Math.tan(camera.fov*Math.PI/360)*aspect*rw),half.y/(Math.tan(camera.fov*Math.PI/360)*rh))*padding+half.z;
   center.addScaledVector(c,weight);distance+=d*weight;
  }
  camera.position.copy(center).add(offset.set(0,0,distance)).applyQuaternion(camera.quaternion);
  camera.near=.15;camera.far=120;camera.updateProjectionMatrix();
  // A restrained upward composition shift creates room below the hero; none on wide holds.
  camera.projectionMatrix.elements[8]=1-2*(rx+rw/2);camera.projectionMatrix.elements[9]=2*(ry+rh/2)-1+.025*weights.brain*rh;
  camera.projectionMatrixInverse.copy(camera.projectionMatrix).invert();
  return {version:RUNTIME_VERSION,frame,variant,weights,distance,center:center.toArray(),rollDegrees:0,compositionRect};
 }};
}
export function createStudioRig(T,{scene,renderer,key,fill,rim,ground}){
 const owned=[];
 if(!key){key=new T.DirectionalLight(0xfff2dc,3.2);key.target.position.set(.24,-1.08,-1.08);key.castShadow=true;key.shadow.mapSize.set(1024,1024);Object.assign(key.shadow.camera,{left:-8,right:8,top:8,bottom:-8,near:.5,far:40});scene.add(key,key.target);owned.push(key,key.target);}
 if(!fill){fill=new T.HemisphereLight(0xdde9e2,0x423322,.30);scene.add(fill);owned.push(fill);}
 if(!rim){rim=new T.DirectionalLight(0xd5e5df,1.2);scene.add(rim);owned.push(rim);}
 if(!ground){ground=new T.Mesh(new T.PlaneGeometry(28,22),new T.ShadowMaterial({opacity:.12,color:0x354037}));ground.rotation.x=-Math.PI/2;ground.position.set(0,-1.085,0);ground.receiveShadow=true;ground.userData.runtimeGround=true;ground.name='Runtime_Soft_Ground';scene.add(ground);owned.push(ground);}
 renderer.shadowMap.enabled=true;renderer.shadowMap.type=T.VSMShadowMap;
 const detail=new T.DirectionalLight(0xffe7be,.32);detail.position.set(-4,.8,6);scene.add(detail);
 const bed=new T.Mesh(new T.PlaneGeometry(22,18),new T.ShaderMaterial({transparent:true,depthWrite:false,uniforms:{color:{value:new T.Color(0x554b3b)},strength:{value:.12}},vertexShader:'varying vec2 uvBed;void main(){uvBed=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);}',fragmentShader:'varying vec2 uvBed;uniform vec3 color;uniform float strength;void main(){float d=length((uvBed-.5)*vec2(1.0,1.1));float a=(1.0-smoothstep(.05,.48,d));gl_FragColor=vec4(color,a*a*strength);}'}));bed.rotation.x=-Math.PI/2;bed.position.set(0,-1.083,0);bed.name='Runtime_Studio_Bed';bed.userData.runtimeGround=true;scene.add(bed);
 const materials=new Set();scene.traverse(o=>{if(o.isMesh)for(const m of Array.isArray(o.material)?o.material:[o.material])if(m?.isMeshStandardMaterial)materials.add(m);});
 for(const m of materials){if(/alabaster/i.test(m.name)){m.roughness=.88;m.metalness=0;m.color.set(0xd5cfbf);}if(/lamellae|cut paper/i.test(m.name)){m.roughness=.92;m.metalness=0;m.color.set(/cut paper/i.test(m.name)?0xbeb5a0:0xe0dacb);}}
 scene.traverse(node=>{if(!node.isMesh)return;let n=node,floatingPaper=false;while(n){if(/^Source0[1-4]_Copy|^Source0[2-4]_Original|Traveling|Repeated_original/.test(n.name))floatingPaper=true;n=n.parent;}if(floatingPaper)node.castShadow=false;});
 // Broad directional contrast gives the authored folds depth without adding textures or shadow lights.
 key.position.set(-4.5,11,5.5);rim.position.set(4.5,4,-4);key.shadow.radius=6;key.shadow.blurSamples=6;key.shadow.normalBias=.0035;key.shadow.bias=-.000035;
 const sourceBrain=scene.getObjectByName('Brain_Surface')?.material,sourceBrainColor=sourceBrain?.color?.clone();
 return {key,fill,rim,ground,setFrame(frame){if(sourceBrainColor)sourceBrain.color.copy(sourceBrainColor).multiplyScalar(1-.40*smooth((frame-92)/24));},setTheme(dark){key.color.set(dark?0xffecd2:0xfff2dc);key.intensity=dark?2.45:2.6;fill.intensity=dark?.14:.22;rim.color.set(dark?0xc5e4da:0xd5e5df);rim.intensity=dark?1.25:1.0;detail.intensity=dark?.42:.28;scene.environmentIntensity=dark?.24:.29;renderer.toneMappingExposure=dark?1.03:1.08;ground.material.opacity=dark?.12:.10;bed.material.uniforms.strength.value=dark?.14:0;ground.material.color.set(dark?0x100e0a:0x413b30);},dispose(){scene.remove(detail,bed);detail.dispose();bed.geometry.dispose();bed.material.dispose();for(const object of owned){scene.remove(object);object.geometry?.dispose();object.material?.dispose();object.dispose?.();}}};
}
