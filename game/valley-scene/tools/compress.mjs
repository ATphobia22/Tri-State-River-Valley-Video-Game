import fs from 'node:fs/promises';
import path from 'node:path';
import {NodeIO} from '@gltf-transform/core';
import {ALL_EXTENSIONS} from '@gltf-transform/extensions';
import {dedup,draco,prune,resample,weld} from '@gltf-transform/functions';
import draco3d from 'draco3dgltf';
import sharp from 'sharp';

const folder=process.argv[2];
const io=new NodeIO().registerExtensions(ALL_EXTENSIONS).registerDependencies({
  'draco3d.encoder':await draco3d.createEncoderModule(),
  'draco3d.decoder':await draco3d.createDecoderModule()
});
for(const file of (await fs.readdir(folder)).filter(f=>f.endsWith('.glb'))){
  const target=path.join(folder,file),doc=await io.read(target);
  if(doc.getRoot().listExtensionsRequired().some(e=>e.extensionName==='KHR_draco_mesh_compression'))continue;
  for(const texture of doc.getRoot().listTextures()){
    if(file.startsWith('mount_vernon')||file==='posey_terrain.glb'){
      texture.setImage(await sharp(texture.getImage()).jpeg({quality:87}).toBuffer()).setMimeType('image/jpeg');
    }
  }
  await doc.transform(resample(),dedup(),prune(),weld(),draco({method:'edgebreaker',quantizePosition:16,quantizeTexcoord:14}));
  await io.write(target,doc);
  const check=await io.read(target);
  if(!check.getRoot().listMeshes().length)throw new Error(file+' lost geometry');
}
