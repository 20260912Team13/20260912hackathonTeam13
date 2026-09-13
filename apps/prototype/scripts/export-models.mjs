import { writeFile, mkdir } from 'node:fs/promises';
import { GLTFExporter } from 'three/addons/exporters/GLTFExporter.js';
import { createBuilding } from '../src/models.mjs';
globalThis.FileReader=class {
  readAsArrayBuffer(blob){blob.arrayBuffer().then(value=>{this.result=value;this.onloadend?.();});}
  readAsDataURL(blob){blob.arrayBuffer().then(value=>{this.result='data:application/octet-stream;base64,'+Buffer.from(value).toString('base64');this.onloadend?.();});}
};
await mkdir(new URL('../public/models/',import.meta.url),{recursive:true});
for(const id of ['home','dining','green']){
  const model=createBuilding(id);
  const data=await new GLTFExporter().parseAsync(model,{binary:true});
  await writeFile(new URL('../public/models/'+id+'.glb',import.meta.url),Buffer.from(data));
  console.log(id+'.glb: '+data.byteLength+' bytes');
}
