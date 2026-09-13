import * as THREE from 'three';

const mat = (color, more={}) => new THREE.MeshStandardMaterial({ color, roughness:0.88, ...more });
function mesh(group, geometry, material, x=0,y=0,z=0) {
  const object=new THREE.Mesh(geometry,material);object.position.set(x,y,z);object.castShadow=true;object.receiveShadow=true;group.add(object);return object;
}
function cylinder(group,r,h,material,x=0,y=0,z=0) { return mesh(group,new THREE.CylinderGeometry(r,r,h,48),material,x,y,z); }
function archShape(width,height,base=0) {
  const r=width/2, s=new THREE.Shape();
  s.moveTo(-r,base);s.lineTo(r,base);s.lineTo(r,height-r);
  s.absarc(0,height-r,r,0,Math.PI,false);s.lineTo(-r,base);return s;
}
function dome(group,radius,height,materials, x=0,z=0) {
  const points=[];
  const count=44;
  for(let i=0;i<=count;i++){
    const y=i/count*height;
    const t=i/count;
    const r=radius*Math.pow(Math.max(0.015,1-t*t),0.46);
    points.push(new THREE.Vector2(r,y),new THREE.Vector2(r+0.023,y+0.018));
  }
  points.push(new THREE.Vector2(0,height+0.035));
  const shell=mesh(group,new THREE.LatheGeometry(points,48),materials.soil,x,0.09,z);shell.name='Regolith shell';
  cylinder(group,radius+0.12,0.16,materials.trim,x,0.1,z);
  const skylight=mesh(group,new THREE.SphereGeometry(radius*0.29,32,16,0,Math.PI*2,0,Math.PI/2),materials.glass,x,height*0.982,z);
  skylight.scale.y=0.25;
  const ring=mesh(group,new THREE.TorusGeometry(radius*0.3,0.045,8,40),materials.frame,x,height,z);
  ring.rotation.x=Math.PI/2;
  return shell;
}
function windowArch(group,width,height,z,materials,x=0) {
  const outer=archShape(width+0.23,height+0.13);
  const hole=archShape(width,height,0.02);
  outer.holes.push(new THREE.Path(hole.getPoints(32)));
  mesh(group,new THREE.ExtrudeGeometry(outer,{depth:0.16,bevelEnabled:true,bevelSegments:2,steps:1,bevelSize:0.035,bevelThickness:0.025,curveSegments:28}),materials.frame,x,0.12,z);
  const glassGeometry=new THREE.ShapeGeometry(archShape(width,height),28);
  const uv=glassGeometry.attributes.uv;
  for(let i=0;i<uv.count;i++)uv.setXY(i,(uv.getX(i)+width/2)/width,uv.getY(i)/height);
  const glass=mesh(group,glassGeometry,materials.window,x,0.12,z+0.035);
  glass.name='Warm interior glazing';
  for(const t of [-0.32,0,0.32]) mesh(group,new THREE.BoxGeometry(0.035,height*0.8,0.035),materials.dark,x+width*t,height*0.43+0.12,z+0.09);
  mesh(group,new THREE.BoxGeometry(width,0.045,0.035),materials.dark,x,height*0.44,z+0.09);
  const light=mesh(group,new THREE.BoxGeometry(0.045,height*0.62,0.025),materials.light,x-width/2-0.18,height*0.38+0.12,z+0.13);
  light.name='Entrance light';
  for(let i=0;i<3;i++)mesh(group,new THREE.BoxGeometry(width+0.5+i*0.18,0.075,0.22),materials.trim,x,0.08-i*0.015,z+0.25+i*0.2);
}
function greenhouse(group,r,materials,x=0,z=0) {
  cylinder(group,r+0.12,0.28,materials.soil,x,0.16,z);
  mesh(group,new THREE.SphereGeometry(r,28,16,0,Math.PI*2,0,Math.PI/2),materials.glass,x,0.29,z);
  for(let i=0;i<8;i++){
    const a=i/8*Math.PI;const points=[];
    for(let j=0;j<=24;j++){const b=j/24*Math.PI;points.push(new THREE.Vector3(x+r*Math.cos(b)*Math.cos(a),0.29+r*Math.sin(b),z+r*Math.cos(b)*Math.sin(a)));}
    mesh(group,new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points),24,0.018,5,false),materials.frame);
  }
  for(let i=1;i<4;i++){
    const y=r*i/4;const ring=mesh(group,new THREE.TorusGeometry(Math.sqrt(r*r-y*y),0.018,5,40),materials.frame,x,y+0.29,z);
    ring.rotation.x=Math.PI/2;
  }
  for(let row=-1;row<=1;row++){
    mesh(group,new THREE.BoxGeometry(r*1.25,0.22,0.25),materials.trim,x,0.34,z+row*0.5);
    for(let j=0;j<5;j++){
      const leaf=mesh(group,new THREE.IcosahedronGeometry(0.15+(j%2)*0.07,1),materials.leaf,x+(j-2)*0.26,0.6+(j%2)*0.12,z+row*0.5);leaf.scale.y=1.7;
    }
  }
}
export function createBuilding(id='dining') {
  const group=new THREE.Group();group.name=id.toUpperCase()+' POD';
  const materials={
    soil:mat('#ac7450'),trim:mat('#776354'),frame:mat('#c6a778',{metalness:0.25,roughness:0.48}),dark:mat('#3b302a'),
    window:mat('#d6a558',{emissive:'#ffb758',emissiveIntensity:0.43,roughness:0.22,metalness:0.4,side:THREE.DoubleSide}),
    glass:mat('#b5c6bd',{metalness:0.2,roughness:0.1,transparent:true,opacity:0.27,side:THREE.DoubleSide,depthWrite:false}),
    light:mat('#ffedba',{emissive:'#ffbc66',emissiveIntensity:2}),leaf:mat('#698050')
  };
  if(id==='green'){
    greenhouse(group,1.72,materials);
    dome(group,0.65,1.03,materials,-1.66,0.57);
    windowArch(group,0.6,0.85,1.28,materials,-1.66);
  }else{
    const dining=id==='dining',r=dining?1.8:1.55,h=dining?2.2:2.05;
    dome(group,r,h,materials);
    windowArch(group,dining?2.0:1.28,dining?1.75:1.65,r+0.035,materials);
    if(dining){
      dome(group,0.78,1.12,materials,-1.65,-0.3);
      const sideRing=mesh(group,new THREE.TorusGeometry(0.3,0.06,8,32),materials.frame,1.18,1.22,1.12);sideRing.rotation.y=0.6;
      const sideGlass=mesh(group,new THREE.CircleGeometry(0.27,32),materials.window,1.2,1.22,1.15);sideGlass.rotation.y=0.6;
    }else{
      const disk=mesh(group,new THREE.CircleGeometry(0.28,32),materials.window,1.0,1.08,1.15);disk.rotation.y=0.4;
    }
  }
  const ground=mesh(group,new THREE.CylinderGeometry(3,3.1,0.11,64),mat('#724b38'),0,-0.06,0);ground.name='Foundation';
  for(let i=0;i<10;i++){
    const a=i*2.399, r=2.5+(i%3)*0.13;
    const rock=mesh(group,new THREE.DodecahedronGeometry(0.08+(i%3)*0.05,0),materials.soil,Math.cos(a)*r,0.04,Math.sin(a)*r);
    rock.scale.set(1.5,0.65,1);rock.rotation.set(i,i*1.3,0);
  }
  return group;
}
export function createRobot() {
  const g=new THREE.Group();const dark=mat('#303635'),body=mat('#b4aca1',{metalness:0.35}),amber=mat('#e48b4b'),light=mat('#ffe4aa',{emissive:'#ff9c42',emissiveIntensity:2});
  mesh(g,new THREE.BoxGeometry(1.3,0.34,1.1),dark,0,0.22,0);
  for(const x of [-0.64,0.64]){
    mesh(g,new THREE.BoxGeometry(0.24,0.35,1.35),dark,x,0.18,0);
    for(let i=0;i<6;i++){const wheel=mesh(g,new THREE.CylinderGeometry(0.13,0.13,0.26,12),body,x,0.17,(i-2.5)*0.2);wheel.rotation.z=Math.PI/2;}
  }
  cylinder(g,0.48,0.3,body,0,0.53,0);
  const pivot=new THREE.Group();pivot.position.y=0.68;g.add(pivot);
  const arm=mesh(pivot,new THREE.BoxGeometry(0.23,1.55,0.3),body,-0.28,0.58,0);arm.rotation.z=-0.5;
  const upper=mesh(pivot,new THREE.BoxGeometry(1.75,0.2,0.24),body,0.57,1.22,0);
  for(const x of [-0.35,1.38]){const joint=mesh(pivot,new THREE.CylinderGeometry(0.17,0.17,0.31,20),amber,x,1.22,0);joint.rotation.x=Math.PI/2;}
  const nozzle=mesh(pivot,new THREE.CylinderGeometry(0.075,0.045,0.42,12),dark,1.37,0.95,0);
  mesh(pivot,new THREE.SphereGeometry(0.065,8,8),light,1.37,0.71,0);
  g.userData.pivot=pivot;return g;
}
