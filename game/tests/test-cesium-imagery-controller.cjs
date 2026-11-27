const test=require('node:test');
const assert=require('node:assert/strict');
const path=require('node:path');
const {pathToFileURL}=require('node:url');
const loaded=import(pathToFileURL(path.resolve(__dirname,'../geospatial/cesium-imagery-controller.mjs')).href);
function fixture() {
 const layers=[];const calls=[];
 class Tile {constructor(opts){this.opts=opts;calls.push('xyz');}}
 class Wms {constructor(opts){this.opts=opts;calls.push('wms');}}
 return {calls,layers,Cesium:{
  ImageryLayer:{fromProviderAsync:asyncProvider=>({asyncProvider,alpha:1,brightness:1,show:true,errorEvent:{addEventListener:fn=>{}}})},
  UrlTemplateImageryProvider:Tile,WebMapServiceImageryProvider:Wms,
  IonImageryProvider:{fromAssetId:id=>{calls.push('ion:'+id);return Promise.resolve({id});}},
  Rectangle:{fromDegrees:(...parts)=>parts},
  SingleTileImageryProvider:{fromUrl:(url,opts)=>Promise.resolve({url,opts})}
 },viewer:{imageryLayers:{
  add(layer){layers.push(layer);},remove(layer){const i=layers.indexOf(layer);if(i>=0)layers.splice(i,1);},
  raise:layer=>calls.push('raise'),lower:layer=>calls.push('lower')
 }}};
}
const base={id:'historic-map',kind:'xyz',url:'./tiles/{z}/{x}/{y}.png',attribution:'Indiana public imagery',provenanceId:'indiana-imagery-2025',licenseReviewed:true};
test('imagery layer lifecycle, opacity and provenance stay bounded',async()=>{
 const {createCesiumImageryController}=await loaded;
 const f=fixture();const c=createCesiumImageryController({...f,maxLayers:2});
 assert.deepEqual(c.add(base),{id:'historic-map',kind:'xyz',contextOnly:true,surveyVerified:false});
 c.setAlpha(base.id,.4);c.setBrightness(base.id,1.2);c.setVisible(base.id,false);
 assert.equal(f.layers[0].alpha,.4);assert.equal(f.layers[0].brightness,1.2);
 assert.equal(f.layers[0].show,false);assert.equal(c.list()[0].provenanceId,base.provenanceId);
 c.raise(base.id);c.lower(base.id);
 c.remove(base.id);assert.equal(f.layers.length,0);
 c.dispose();c.dispose();assert.throws(()=>c.add(base),/disposed/);
});
test('licence, host, type, token and budget guards are fail-closed',async()=>{
 const {createCesiumImageryController}=await loaded;
 const f=fixture();const c=createCesiumImageryController({...f,maxLayers:1,allowedHosts:['tiles.example.org']});
 assert.throws(()=>c.add({...base,licenseReviewed:false}),/licence/);
 assert.throws(()=>c.add({...base,url:'https://evil.example/{z}/{x}/{y}.png'}),/allowlisted/);
 assert.throws(()=>c.add({...base,url:'https://tiles.example.org/{z}/{x}/{y}.png?token=secret'}),/token/);
 assert.throws(()=>c.add({...base,url:'http://tiles.example.org/{z}/{x}/{y}.png'}),/HTTPS/);
 assert.throws(()=>c.add({...base,kind:'ion',assetId:6204792,ionEnabled:true}),/not imagery/);
 assert.throws(()=>c.add({...base,kind:'ion',assetId:3812}),/opt-in/);
 assert.throws(()=>c.add({...base,kind:'bad'}),/unsupported/);
 assert.throws(()=>c.add({...base,alpha:2}),/alpha/);
 c.add(base);
 assert.throws(()=>c.add({...base,id:'second'}),/budget/);
 assert.throws(()=>c.add(base),/already registered/);
 assert.throws(()=>c.setBrightness(base.id,NaN),/brightness/);
 c.dispose();
});
test('ion and WMS only enter separate Cesium inspector on opt-in',async()=>{
 const {createCesiumImageryController}=await loaded;
 const f=fixture();const c=createCesiumImageryController({...f,allowedHosts:['imagery.example.org']});
 c.add({...base,id:'world-night',kind:'ion',assetId:3812,ionEnabled:true});
 c.add({...base,id:'county-wms',kind:'wms',url:'https://imagery.example.org/wms',layers:'orthos'});
 assert.deepEqual(f.calls,['ion:3812','wms']);
 assert.equal(f.layers.length,2);
 c.dispose();assert.equal(f.layers.length,0);
});
