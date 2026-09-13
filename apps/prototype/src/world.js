import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { createRobot } from './models.mjs';
import { BUILDINGS } from './state.mjs';

const reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;
const modelById=id=>BUILDINGS.find(model=>model.id===id)??BUILDINGS[1];

export class World {
  constructor(){
    this.renderer=null;this.available=false;this.cache=new Map();this.loads=new Map();
    this.cachedGeometries=new Set();this.request=0;this.progress=0;this.mode=null;
    this.autoRotateEnabled=!reduced;this.ready=false;this.resumeAt=0;
    this.tick=this.tick.bind(this);this.resize=this.resize.bind(this);
    try{
      const canvas=document.createElement('canvas');
      const context=canvas.getContext('webgl2',{antialias:true,alpha:true,powerPreference:'low-power'});
      if(!context)return;
      this.renderer=new THREE.WebGLRenderer({canvas,context,alpha:true,antialias:true,powerPreference:'low-power'});
      const debug=context.getExtension('WEBGL_debug_renderer_info');
      this.deviceRenderer=debug?context.getParameter(debug.UNMASKED_RENDERER_WEBGL):'unknown';
      this.software=/swiftshader|software|Microsoft Basic|llvmpipe/i.test(this.deviceRenderer);
      this.renderer.setPixelRatio(Math.min(devicePixelRatio,this.software?1:1.5));this.renderer.setClearColor(0,0);
      this.renderer.outputColorSpace=THREE.SRGBColorSpace;this.renderer.toneMapping=THREE.ACESFilmicToneMapping;
      this.renderer.shadowMap.enabled=!this.software;this.renderer.shadowMap.type=THREE.PCFSoftShadowMap;
      this.renderer.localClippingEnabled=true;
      canvas.setAttribute('aria-hidden','true');
      canvas.addEventListener('webglcontextlost',event=>{event.preventDefault();this.available=false;this.ready=false;this.showPoster(this.host,this.currentId,false);});
      this.available=true;window.addEventListener('resize',this.resize);requestAnimationFrame(this.tick);
    }catch{this.available=false;}
  }
  async preload(){
    if(this.available)await Promise.allSettled(BUILDINGS.map(model=>this.load(model.id)));
  }
  load(id){
    if(!this.loads.has(id)){
      this.loads.set(id,new GLTFLoader().loadAsync(modelById(id).model).then(gltf=>{
        gltf.scene.traverse(object=>{if(object.isMesh)this.cachedGeometries.add(object.geometry);});
        this.cache.set(id,gltf.scene);return gltf.scene;
      }).catch(error=>{this.loads.delete(id);throw error;}));
    }
    return this.loads.get(id);
  }
  model(id){
    const source=this.cache.get(id).clone(true),group=new THREE.Group();
    source.updateMatrixWorld(true);
    const box=new THREE.Box3().setFromObject(source),size=box.getSize(new THREE.Vector3()),center=box.getCenter(new THREE.Vector3());
    const scale=5.4/Math.max(size.x,size.z);
    source.scale.setScalar(scale);source.position.set(-center.x*scale,-box.min.y*scale,-center.z*scale);
    source.traverse(object=>{
      if(!object.isMesh)return;
      object.material=[object.material].flat().map(original=>{
        const material=original.clone();
        // Preserve the supplied clay texture, bronze frames, plants and glass.
        if(/Light strips/i.test(material.name)){material.emissive.set('#ffc078');material.emissiveIntensity=1.65;}
        if(/Glazing/i.test(material.name)){material.depthWrite=false;material.roughness=0.23;material.envMapIntensity=0.55;}
        if(/Frames/i.test(material.name))material.envMapIntensity=0.7;
        if(this.software){const light=this.lightweightMaterial(material);material.dispose();return light;}
        return material;
      });
      if(object.material.length===1)object.material=object.material[0];
      object.castShadow=!/Glazing|Lighting/i.test(object.name);object.receiveShadow=true;
    });
    group.name=id;group.add(source);
    group.userData={buildingId:id,size:size.multiplyScalar(scale),sourceModel:modelById(id).model};
    const interior=new THREE.PointLight('#ffbc77',2.0,5.5,2);
    interior.name='Warm interior light';interior.position.set(0,1.0,0.45);group.add(interior);
    this.interiorLight=interior;return group;
  }
  lightweightMaterial(material){
    return new THREE.MeshLambertMaterial({name:material.name,color:material.color,map:material.map,
      emissive:material.emissive??0x000000,emissiveMap:material.emissiveMap??null,emissiveIntensity:material.emissiveIntensity??1,
      transparent:material.transparent,opacity:material.opacity,side:material.side,depthWrite:material.depthWrite});
  }
  surface(options){
    if(!this.software)return new THREE.MeshStandardMaterial(options);
    const {roughness,metalness,...simple}=options;return new THREE.MeshLambertMaterial(simple);
  }
  clearScene(){
    this.controls?.dispose();this.controls=null;
    const disposed=new Set();
    this.scene?.traverse(object=>{
      if(object.geometry&&!this.cachedGeometries.has(object.geometry)&&!disposed.has(object.geometry)){
        object.geometry.dispose();disposed.add(object.geometry);
      }
      for(const material of [object.material].flat().filter(Boolean)){
        if(!disposed.has(material)){material.dispose();disposed.add(material);}
      }
      object.shadow?.dispose();
    });
    this.scene=null;this.hero=null;this.robot=null;this.clip=null;this.interiorLight=null;
  }
  showPoster(host,id,loading){
    if(!host)return;
    host.classList.toggle('model-loading',loading);host.classList.toggle('fallback',!loading);
    host.classList.remove('ready');host.dataset.modelStatus=loading?'loading':'poster';
    host.setAttribute('aria-busy',String(loading));
    if(this.mode!=='planet')host.style.setProperty('--fallback-image','url("'+modelById(id).poster+'")');
    const hint=host.querySelector('.scene-hint');
    if(hint)hint.textContent=loading?'3Dモデルを読み込み中…':this.mode==='planet'?'MARS / 2036':'建物のプレビュー';
    this.updateRotationButton();
  }
  async attach(host,mode,id=BUILDINGS[1].id,parcel='A-03'){
    const request=++this.request;
    this.clearScene();this.mode=mode;this.host=host;this.currentId=id;this.ready=false;this.resumeAt=0;
    if(!this.available){this.showPoster(host,id,false);return;}
    host.tabIndex=0;host.setAttribute('role','group');
    host.setAttribute('aria-label',mode==='planet'?'火星の3D表示。ドラッグまたは左右キーで回転。':modelById(id).nameJa+'の3D表示。ドラッグまたは左右キーで回転。');
    if(mode!=='planet'){
      this.showPoster(host,id,true);
      try{await this.load(id);}catch{if(request===this.request)this.showPoster(host,id,false);return;}
      if(request!==this.request||!host.isConnected)return;
    }
    host.classList.remove('model-loading','fallback');host.classList.add('ready');
    host.dataset.modelStatus='ready';host.dataset.modelId=id;host.setAttribute('aria-busy','false');
    const hint=host.querySelector('.scene-hint');
    if(hint)hint.textContent=mode==='planet'?'ドラッグで火星を回す':'ドラッグ・左右キーで見わたす';
    host.append(this.renderer.domElement);
    this.scene=new THREE.Scene();this.camera=new THREE.PerspectiveCamera(mode==='planet'?37:36,1,0.1,120);
    this.renderer.toneMappingExposure=mode==='planet'?1.05:1.0;this.addLighting(mode);
    this.object=new THREE.Group();this.scene.add(this.object);
    if(mode==='planet')this.makePlanet();else this.makeHome(mode,id,parcel);
    this.controls=new OrbitControls(this.camera,this.renderer.domElement);
    this.controls.enablePan=false;this.controls.enableZoom=false;this.controls.enableDamping=true;this.controls.dampingFactor=0.07;
    this.controls.rotateSpeed=0.55;
    this.controls.minPolarAngle=mode==='planet'?0.9:0.65;this.controls.maxPolarAngle=mode==='planet'?2.1:1.48;
    this.controls.target.set(0,mode==='planet'?0:this.hero.userData.size.y*0.38,0);
    this.controls.autoRotate=this.autoRotateEnabled&&mode!=='printing';this.controls.autoRotateSpeed=mode==='planet'?0.55:0.42;
    this.controls.addEventListener('start',()=>{this.controls.autoRotate=false;this.resumeAt=Infinity;});
    this.controls.addEventListener('end',()=>{this.resumeAt=performance.now()+1800;});
    host.addEventListener('keydown',event=>{
      if(!['ArrowLeft','ArrowRight'].includes(event.key)||!this.controls)return;event.preventDefault();
      this.controls.autoRotate=false;this.resumeAt=performance.now()+1800;
      const offset=this.camera.position.clone().sub(this.controls.target);
      offset.applyAxisAngle(new THREE.Vector3(0,1,0),event.key==='ArrowLeft'?-0.12:0.12);
      this.camera.position.copy(offset.add(this.controls.target));this.controls.update();
    });
    this.ready=true;this.controls.update();this.resize();this.setProgress(this.progress);this.updateRotationButton();
  }
  addLighting(mode){
    if(mode==='planet'){
      this.scene.add(new THREE.HemisphereLight('#d9c4b8','#2c221b',0.55));
      const sun=new THREE.DirectionalLight('#ffe2c4',2.9);sun.position.set(-5,7,6);this.scene.add(sun);return;
    }
    if(!this.software&&!this.environment){
      const room=new RoomEnvironment(),pmrem=new THREE.PMREMGenerator(this.renderer);
      this.environment=pmrem.fromScene(room,0.05);room.dispose();pmrem.dispose();
    }
    if(this.environment){this.scene.environment=this.environment.texture;this.scene.environmentIntensity=0.25;}
    this.scene.add(new THREE.HemisphereLight('#c2d3e4','#70452e',0.75));
    const sun=new THREE.DirectionalLight('#ffead0',2.35);sun.position.set(-5,7,5);sun.castShadow=true;
    sun.shadow.mapSize.set(1024,1024);Object.assign(sun.shadow.camera,{left:-7,right:7,top:7,bottom:-7,near:0.1,far:30});
    sun.shadow.bias=-0.0003;sun.shadow.normalBias=0.02;this.scene.add(sun);
    const fill=new THREE.DirectionalLight('#c4d7ed',0.85);fill.position.set(5,3,3);this.scene.add(fill);
    const rim=new THREE.DirectionalLight('#ffad70',1.6);rim.position.set(-2,4,-5);this.scene.add(rim);
  }
  makePlanet(){
    this.camera.position.set(0,0,6.6);
    const texture=this.planetMap??(this.planetMap=new THREE.TextureLoader().load('/assets/mars-texture.webp'));
    texture.colorSpace=THREE.SRGBColorSpace;texture.anisotropy=4;
    const sphere=new THREE.Mesh(new THREE.SphereGeometry(1.85,64,48),new THREE.MeshStandardMaterial({map:texture,bumpMap:texture,bumpScale:0.026,roughness:1}));
    sphere.rotation.set(0.12,-0.35,0.15);this.object.add(sphere);
    const glow=new THREE.Mesh(new THREE.SphereGeometry(1.885,64,48),new THREE.ShaderMaterial({
      transparent:true,side:THREE.BackSide,blending:THREE.AdditiveBlending,depthWrite:false,
      vertexShader:'varying vec3 vNormal;varying vec3 vPos;void main(){vNormal=normalize(normalMatrix*normal);vec4 p=modelViewMatrix*vec4(position,1.);vPos=p.xyz;gl_Position=projectionMatrix*p;}',
      fragmentShader:'varying vec3 vNormal;varying vec3 vPos;void main(){float f=pow(1.-abs(dot(normalize(vNormal),normalize(-vPos))),4.);gl_FragColor=vec4(0.9,0.35,0.12,f*0.48);}'
    }));this.object.add(glow);
    const positions=[];for(let i=0;i<440;i++){const a=i*2.3999,b=Math.acos(1-2*(i+0.5)/440),r=35;positions.push(r*Math.sin(b)*Math.cos(a),r*Math.cos(b),r*Math.sin(b)*Math.sin(a));}
    const stars=new THREE.BufferGeometry();stars.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));
    this.scene.add(new THREE.Points(stars,new THREE.PointsMaterial({color:'#e6d9cb',size:0.048,transparent:true,opacity:0.6,sizeAttenuation:true})));
  }
  makeHome(mode,id,parcel){
    const hero=this.model(id);this.hero=hero;this.object.add(hero);
    this.camera.position.copy(new THREE.Vector3(...modelById(id).recommendedCameraDirection).normalize().multiplyScalar(11));
    const groundMap=this.groundMap??(this.groundMap=new THREE.TextureLoader().load('/assets/mars-surface.webp'));groundMap.colorSpace=THREE.SRGBColorSpace;
    const floor=new THREE.Mesh(new THREE.CircleGeometry(4.25,64),this.surface({map:groundMap,color:parcel==='A-01'?'#534b46':'#594536',roughness:1}));
    floor.rotation.x=-Math.PI/2;floor.position.y=-0.025;floor.receiveShadow=true;this.object.add(floor);
    if(!this.contactMap){
      const canvas=document.createElement('canvas');canvas.width=128;canvas.height=128;
      const ctx=canvas.getContext('2d'),gradient=ctx.createRadialGradient(64,64,10,64,64,64);
      gradient.addColorStop(0,'#000b');gradient.addColorStop(0.65,'#0006');gradient.addColorStop(1,'#0000');
      ctx.fillStyle=gradient;ctx.fillRect(0,0,128,128);this.contactMap=new THREE.CanvasTexture(canvas);
    }
    const contact=new THREE.Mesh(new THREE.PlaneGeometry(7.1,6.4),new THREE.MeshBasicMaterial({map:this.contactMap,transparent:true,depthWrite:false,opacity:0.68}));
    contact.rotation.x=-Math.PI/2;contact.position.y=-0.016;this.object.add(contact);
    const rockGeo=new THREE.DodecahedronGeometry(1,0),rockMat=this.surface({color:'#815c43',roughness:1});
    const rocks=new THREE.InstancedMesh(rockGeo,rockMat,26),dummy=new THREE.Object3D();
    for(let i=0;i<26;i++){const angle=i*2.399,radius=3.2+(i%7)*0.12,size=0.045+(i%4)*0.018;dummy.position.set(Math.sin(angle)*radius,0,Math.cos(angle)*radius);dummy.scale.set(size*1.5,size,size);dummy.rotation.set(i,i,0);dummy.updateMatrix();rocks.setMatrixAt(i,dummy.matrix);}
    this.object.add(rocks);
    if(mode==='printing'){
      this.clip=new THREE.Plane(new THREE.Vector3(0,-1,0),0);
      hero.traverse(object=>{if(object.isMesh&&!/^Foundation/i.test(object.name))for(const material of [object.material].flat()){material.clippingPlanes=[this.clip];material.clipShadows=true;}});
      this.robot=createRobot();this.robot.position.set(-3.25,0,1.2);this.robot.scale.setScalar(0.9);this.object.add(this.robot);
      if(this.software)this.robot.traverse(object=>{if(object.isMesh)object.material=this.lightweightMaterial(object.material);});
    }
  }
  setProgress(progress){
    this.progress=progress;if(this.mode!=='printing'||!this.clip)return;
    const height=this.hero.userData.size.y;this.clip.constant=-0.02+progress*(height+0.08);
    if(this.interiorLight)this.interiorLight.intensity=2.0*Math.max(0,(progress-0.55)/0.45);
    if(this.robot){this.robot.userData.pivot.position.y=0.68;this.robot.userData.pivot.scale.y=0.6+progress*height*0.46;this.robot.userData.pivot.rotation.y=Math.sin(progress*25)*0.38;}
  }
  setAutoRotate(enabled){
    this.autoRotateEnabled=enabled;this.resumeAt=0;
    if(this.controls)this.controls.autoRotate=enabled&&this.mode!=='printing';
    this.updateRotationButton();
  }
  updateRotationButton(){
    const button=document.querySelector('[data-action="rotation"]');if(!button)return;
    button.disabled=!this.ready;button.setAttribute('aria-pressed',String(this.autoRotateEnabled&&this.ready));
    button.textContent=this.ready?(this.autoRotateEnabled?'自動回転中':'自動回転オフ'):'3D PREVIEW';
  }
  resize(){
    if(!this.available||!this.host||!this.camera||!this.controls)return;
    const width=this.host.clientWidth,height=this.host.clientHeight;if(!width||!height)return;
    this.renderer.setSize(width,height);this.camera.aspect=width/height;
    this.camera.fov=this.mode==='planet'?(width/height<0.85?46:37):36;
    if(this.mode!=='planet'&&this.hero){
      const aspect=Math.min(1,this.camera.aspect),radius=Math.max(this.hero.userData.size.x,this.hero.userData.size.z)*0.58;
      const distance=radius/(Math.sin(THREE.MathUtils.degToRad(this.camera.fov/2))*aspect)*(this.mode==='printing'?1.18:1.03);
      const direction=this.camera.position.clone().sub(this.controls.target).normalize();
      this.camera.position.copy(this.controls.target).addScaledVector(direction,distance);
    }
    this.camera.updateProjectionMatrix();this.controls.update();
  }
  tick(time){
    requestAnimationFrame(this.tick);
    if(!this.available||!this.ready||!this.scene||!this.host?.isConnected||document.hidden)return;
    const delta=this.lastTime?Math.min((time-this.lastTime)/1000,0.1):1/60;this.lastTime=time;
    if(this.resumeAt&&time>this.resumeAt){this.resumeAt=0;this.controls.autoRotate=this.autoRotateEnabled&&this.mode!=='printing';}
    this.controls?.update(delta);this.renderer.render(this.scene,this.camera);
  }
  snapshot(){
    if(!this.available||!this.ready)return null;
    this.renderer.render(this.scene,this.camera);return this.renderer.domElement.toDataURL('image/png');
  }
}
