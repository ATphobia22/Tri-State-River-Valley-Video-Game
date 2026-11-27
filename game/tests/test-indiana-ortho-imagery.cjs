const test=require('node:test');
const assert=require('node:assert/strict');
const path=require('node:path'),{pathToFileURL}=require('node:url');
const modulePromise=import(pathToFileURL(path.resolve(__dirname,'../geospatial/indiana-ortho-imagery.mjs')).href);
const controllerPromise=import(pathToFileURL(path.resolve(__dirname,'../geospatial/cesium-imagery-controller.mjs')).href);
function fixture(){
 const mounted=[];let provider=null;
 class WebMapServiceImageryProvider {constructor(options){provider=options;}}
 return {
  mounted,
  get provider(){return provider;},
  Cesium:{
   WebMapServiceImageryProvider,
   ImageryLayer:{fromProviderAsync:promise=>({providerPromise:promise,alpha:1,brightness:1,show:true})}
  },
  viewer:{imageryLayers:{
   add:layer=>mounted.push(layer),
   remove:layer=>{const i=mounted.indexOf(layer);if(i!==-1)mounted.splice(i,1);}
  }}
 };
}
test('verified Indiana GIO WMS descriptor admits namespaced layer to Cesium inspector only',async()=>{
 const {attachIndianaOrthoImagery,INDIANA_CURRENT_ORTHO}=await modulePromise;
 const f=fixture();
 const {controller,registered}=attachIndianaOrthoImagery(f);
 assert.equal(INDIANA_CURRENT_ORTHO.layers,'Indiana_Current_Imagery:None');
 assert.match(f.provider.url,/^https:\/\/di-ingov\.img\.arcgis\.com\//);
 assert.equal(f.provider.layers,INDIANA_CURRENT_ORTHO.layers);
 assert.match(f.provider.credit,/CC0/);
 assert.equal(registered.contextOnly,true);assert.equal(registered.surveyVerified,false);
 assert.equal(f.mounted.length,1);
 controller.setAlpha(registered.id,.55);
 assert.equal(f.mounted[0].alpha,.55);
 controller.dispose();assert.equal(f.mounted.length,0);
});
test('namespaced WMS layer permits colon but rejects query syntax injection',async()=>{
 const {createCesiumImageryController}=await controllerPromise;
 const f=fixture();
 const c=createCesiumImageryController({...f,allowedHosts:['di-ingov.img.arcgis.com']});
 const base={id:'igio-2025',kind:'wms',
  url:'https://di-ingov.img.arcgis.com/arcgis/services/DynamicWebMercator/Indiana_Current_Imagery/ImageServer/WMSServer',
  layers:'Indiana_Current_Imagery:None',licenseReviewed:true,
  attribution:'Indiana GIO (CC0)',provenanceId:'indiana-gio-ortho'};
 assert.throws(()=>c.add({...base,layers:'Indiana_Current_Imagery:None;DROP'}),/WMS layer names/);
 assert.throws(()=>c.add({...base,layers:'x?access_token=BAD'}),/WMS layer names/);
 c.add(base);assert.equal(f.mounted.length,1);c.dispose();
});
