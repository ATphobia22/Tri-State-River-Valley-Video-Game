import path from 'node:path';
import {NodeIO} from '@gltf-transform/core';
import {ALL_EXTENSIONS} from '@gltf-transform/extensions';
import draco from 'draco3dgltf';
const io=new NodeIO().registerExtensions(ALL_EXTENSIONS).registerDependencies({'draco3d.decoder':await draco.createDecoderModule()});
for(const name of ['river','bill_tucker','scout']){
  const doc=await io.read(path.join('assets',name+'.glb'));
  for(const ext of doc.getRoot().listExtensionsUsed()){
    if(ext.extensionName==='KHR_draco_mesh_compression')ext.dispose();
  }
  await io.write(path.join(process.argv[2],name+'.glb'),doc);
}
