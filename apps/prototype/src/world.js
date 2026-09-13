import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { createBuilding, createRobot } from './models.mjs';

const reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;
export class World {
  constructor(){
    this.renderer=null;this.available=false;this.cache=new Map();this.thumbnails={};this.rotation=0;this.mode=null;
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
      this.renderer.toneMappingExposure=1.35;this.renderer.shadowMap.enabled=!this.software;this.renderer.shadowMap.type=THREE.PCFShadowMap;
      this.renderer.localClippingEnabled=true;
      canvas.setAttribute('aria-hidden','true');
      canvas.addEventListener('webglcontextlost',e=>{e.preventDefault();this.available=false;this.host?.classList.add('fallback');});
      this.available=true;window.addEventListener('resize',this.resize);requestAnimationFrame(this.tick);
    }catch{this.available=false;}
  }
  async preload(){
    if(!this.available)return;
    const loader=new GLTFLoader();
    await Promise.all(['home','dining','green'].map(async id=>{
      try{this.cache.set(id,(await loader.loadAsync('/models/'+id+'.glb')).scene);}
      catch{this.cache.set(id,createBuilding(id));}
    }));
  }
  model(id){
    const original=this.cache.get(id)??createBuilding(id);const g=original.clone(true);
    g.traverse(o=>{if(o.isMesh){o.material=Array.isArray(o.material)?o.material.map(m=>m.clone()):o.material.clone();o.castShadow=true;o.receiveShadow=true;
      if(o.name==='Regolith_shell'||o.name==='Regolith shell'){o.material.map=this.soilTexture();o.material.color.set('#e0c7ad');o.material.roughness=0.98;}
      if(o.name==='Warm_interior_glazing'||o.name==='Warm interior glazing'){o.material.map=this.windowTexture();o.material.color.set('#eed6b7');o.material.emissive.set('#ffa756');o.material.emissiveIntensity=0.15;o.material.roughness=0.48;o.material.metalness=0.08;}
    }});
    return g;
  }
  soilTexture(){
    if(this.soilMap)return this.soilMap;
    const c=document.createElement('canvas');c.width=256;c.height=512;const ctx=c.getContext('2d');
    const pixels=ctx.createImageData(256,512);
    let seed=19;const rand=()=>{seed=(seed*1664525+1013904223)>>>0;return seed/4294967296;};
    for(let y=0;y<512;y++)for(let x=0;x<256;x++){const i=(y*256+x)*4;const v=(rand()-.5)*30+(y%8===0?-34:y%8===1?10:0);pixels.data.set([141+v,107+v*.8,78+v*.65,255],i);}
    ctx.putImageData(pixels,0,0);this.soilMap=new THREE.CanvasTexture(c);this.soilMap.colorSpace=THREE.SRGBColorSpace;return this.soilMap;
  }
  windowTexture(){
    if(this.windowMap)return this.windowMap;
    const c=document.createElement('canvas');c.width=256;c.height=256;const x=c.getContext('2d');
    const g=x.createLinearGradient(0,0,0,256);g.addColorStop(0,'#66503a');g.addColorStop(.4,'#9a7043');g.addColorStop(1,'#4c3524');x.fillStyle=g;x.fillRect(0,0,256,256);
    x.fillStyle='#efd099';x.fillRect(8,18,240,5);x.fillStyle='#b99568';x.fillRect(18,28,220,2);
    x.fillStyle='#443322';x.fillRect(120,110,10,93);x.fillStyle='#bb945d';x.beginPath();x.ellipse(128,127,80,17,0,0,Math.PI*2);x.fill();
    x.fillStyle='#42352a';for(const [xx,yy]of [[30,130],[78,153],[173,153],[213,130]]){x.fillRect(xx,yy,13,30);x.fillRect(xx,yy+32,3,28);x.fillRect(xx+10,yy+32,3,28);}
    x.fillStyle='#748361';x.fillRect(222,70,8,41);x.beginPath();x.ellipse(222,64,17,24,.4,0,Math.PI*2);x.fill();
    this.windowMap=new THREE.CanvasTexture(c);this.windowMap.colorSpace=THREE.SRGBColorSpace;return this.windowMap;
  }
  attach(host,mode,id='dining',parcel='A-03'){
    this.mode=mode;this.host=host;
    if(!this.available){
      host?.classList.add('fallback');
      if(mode!=='planet')host.style.setProperty('--fallback-image','url("/models/'+(mode==='colony'?'colony':id)+'.png")');
      const hint=host.querySelector('.scene-hint');if(hint)hint.textContent=mode==='planet'?'MARS / 2036':'建物のプレビュー';
      return;
    }
    host.tabIndex=0;host.setAttribute('role','group');host.setAttribute('aria-label',mode==='planet'?'火星の3D表示。ドラッグまたは左右キーで回転。':'建物の3D表示。ドラッグまたは左右キーで回転。');
    host.addEventListener('keydown',e=>{
      if(!['ArrowLeft','ArrowRight'].includes(e.key))return;e.preventDefault();
      this.controls.autoRotate=false;
      const offset=this.camera.position.clone().sub(this.controls.target);
      offset.applyAxisAngle(new THREE.Vector3(0,1,0),e.key==='ArrowLeft'?-0.12:0.12);
      this.camera.position.copy(offset.add(this.controls.target));this.controls.update();
    });
    this.controls?.dispose();
    if(this.scene)this.scene.traverse(o=>{if(o.isMesh&&o.material){o.geometry.dispose();for(const m of [o.material].flat())m.dispose();}});
    host.append(this.renderer.domElement);host.classList.add('ready');
    this.scene=new THREE.Scene();
    this.camera=new THREE.PerspectiveCamera(mode==='planet'?37:36,1,0.1,120);
    this.renderer.toneMappingExposure=mode==='planet'?1.05:1.13;
    this.scene.add(new THREE.HemisphereLight(mode==='planet'?'#d9c4b8':'#d2c9bd','#2c221b',mode==='planet'?0.55:1.4));
    const sun=new THREE.DirectionalLight('#ffe2c4',mode==='planet'?2.9:3.0);sun.position.set(-5,7,6);
    sun.castShadow=mode!=='planet';sun.shadow.mapSize.set(512,512);sun.shadow.camera.left=-12;sun.shadow.camera.right=12;sun.shadow.camera.top=12;sun.shadow.camera.bottom=-12;sun.shadow.bias=-0.001;
    this.scene.add(sun);this.scene.add(new THREE.DirectionalLight('#b6c3ce',0.55));
    this.object=new THREE.Group();this.scene.add(this.object);
    if(mode==='planet')this.makePlanet();
    else this.makeSettlement(mode,id,parcel);
    this.controls=new OrbitControls(this.camera,this.renderer.domElement);
    this.controls.enablePan=false;this.controls.enableZoom=false;this.controls.enableDamping=true;this.controls.dampingFactor=0.07;
    this.controls.rotateSpeed=0.55;
    this.controls.minPolarAngle=mode==='planet'?0.9:0.55;this.controls.maxPolarAngle=mode==='planet'?2.1:1.5;
    this.controls.target.set(0,mode==='planet'?0:0.65,0);
    this.controls.autoRotate=!reduced&&mode!=='printing';this.controls.autoRotateSpeed=mode==='planet'?0.55:0.7;
    this.controls.addEventListener('start',()=>{this.controls.autoRotate=false;});
    this.controls.update();this.resize();
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
  makeSettlement(mode,id,parcel){
    const hero=this.model(id);this.hero=hero;this.object.add(hero);
    this.camera.position.set(5.3,3.8,7.7);
    if(mode==='colony'){
      const others=[['home',-5,-2],['green',4.6,-3.3],['home',0,-6.5]];
      for(const [type,x,z]of others){const b=this.model(type);b.position.set(x,0,z);b.scale.setScalar(0.8);this.object.add(b);}
      const pathMaterial=new THREE.MeshStandardMaterial({color:'#aa8a70',roughness:1});
      for(const [x,z,angle,length] of [[-2.8,-1.1,-1.1,5],[2.5,-1.8,0.98,5],[0,-4.3,0,5]]){
        const path=new THREE.Mesh(new THREE.BoxGeometry(0.7,0.055,length),pathMaterial);path.position.set(x,0.01,z);path.rotation.y=angle;path.receiveShadow=true;this.object.add(path);
      }
      for(let i=0;i<9;i++){
        const angle=i*2.399,r=3+(i%3);
        const pole=new THREE.Mesh(new THREE.CylinderGeometry(.045,.06,.6,8),new THREE.MeshStandardMaterial({color:'#5c5146'}));pole.position.set(Math.sin(angle)*r,.3,Math.cos(angle)*r);this.object.add(pole);
        const lamp=new THREE.Mesh(new THREE.CylinderGeometry(.085,.085,.1,12),new THREE.MeshStandardMaterial({color:'#ffda99',emissive:'#ffab42',emissiveIntensity:1.8}));lamp.position.copy(pole.position);lamp.position.y=.62;this.object.add(lamp);
      }
      this.camera.position.set(11,9,16);
    }
    const groundMap=this.groundMap??(this.groundMap=new THREE.TextureLoader().load('/assets/mars-surface.webp'));groundMap.colorSpace=THREE.SRGBColorSpace;
    const floor=new THREE.Mesh(new THREE.CircleGeometry(mode==='colony'?11:4.2,80),new THREE.MeshStandardMaterial({map:groundMap,color:parcel==='A-02'?'#b4987d':parcel==='A-01'?'#99948d':'#b49887',roughness:1}));
    floor.rotation.x=-Math.PI/2;floor.position.y=-0.13;floor.receiveShadow=true;this.object.add(floor);
    const count=mode==='colony'?64:20,rockGeo=new THREE.DodecahedronGeometry(1,0),rockMat=new THREE.MeshStandardMaterial({color:'#896750',roughness:1});
    const rocks=new THREE.InstancedMesh(rockGeo,rockMat,count),dummy=new THREE.Object3D();
    for(let i=0;i<count;i++){const a=i*2.399,r=3.5+(i%11)*(mode==='colony'?0.9:0.17),sz=0.07+(i%4)*0.045;dummy.position.set(Math.sin(a)*r,-0.02,Math.cos(a)*r);dummy.scale.set(sz*1.5,sz,sz);dummy.rotation.set(i,i,0);dummy.updateMatrix();rocks.setMatrixAt(i,dummy.matrix);}
    this.object.add(rocks);
    if(mode==='printing'){
      this.clip=new THREE.Plane(new THREE.Vector3(0,-1,0),0.1);
      hero.traverse(o=>{if(o.isMesh && o.name!=='Foundation')for(const m of [o.material].flat()){m.clippingPlanes=[this.clip];m.clipShadows=true;}});
      this.robot=createRobot();this.robot.position.set(-3,0,0.5);this.object.add(this.robot);
      this.camera.position.set(6.5,4.2,8.5);this.setProgress(0);
    }
  }
  setProgress(p){
    if(this.mode!=='printing'||!this.available)return;
    this.clip.constant=0.05+p*2.65;
    if(this.robot){
      this.robot.userData.pivot.position.y=0.68;
      this.robot.userData.pivot.scale.y=0.6+p*1.35;
      this.robot.userData.pivot.rotation.y=Math.sin(p*25)*0.38;
    }
  }
  resize(){
    if(!this.available||!this.host||!this.camera)return;
    const w=this.host.clientWidth,h=this.host.clientHeight;if(!w||!h)return;
    this.renderer.setSize(w,h);this.camera.aspect=w/h;
    this.camera.fov=this.mode==='planet'?(w/h<0.85?46:37):(w/h<0.8?45:36);this.camera.updateProjectionMatrix();
  }
  tick(time){
    requestAnimationFrame(this.tick);
    if(!this.available||!this.scene||!this.host?.isConnected||document.hidden)return;
    const delta=this.lastTime?Math.min((time-this.lastTime)/1000,0.1):1/60;
    this.lastTime=time;this.controls?.update(delta);this.renderer.render(this.scene,this.camera);
  }
  snapshot(){
    if(!this.available)return null;
    this.renderer.render(this.scene,this.camera);return this.renderer.domElement.toDataURL('image/png');
  }
}
