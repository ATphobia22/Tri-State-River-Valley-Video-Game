import {build} from 'esbuild';
import fs from 'node:fs/promises';
import path from 'node:path';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url);
await build({entryPoints:['src/app.js'],outfile:'scene.js',bundle:true,minify:true,format:'iife',target:['es2020'],loader:{'.wasm':'binary'},plugins:[{name:'decoder-source',setup(b){
  b.onResolve({filter:/\?text$/},a=>({path:require.resolve(a.path.slice(0,-5)),namespace:'text'}));
  b.onLoad({filter:/.*/,namespace:'text'},async a=>({contents:await fs.readFile(a.path,'utf8'),loader:'text'}));
}}]});
