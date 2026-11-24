/* Optional MapLibre GL JS + PMTiles reference map — online-first; offline uses ValleyGeoReference. */
(function(root,factory){
  const api=factory();
  if(typeof module==='object'&&module.exports)module.exports=api;
  else root.ValleyMapLibreReference=api;
})(typeof globalThis==='object'?globalThis:this,function(){
  'use strict';
  const DEFAULT_STYLE=Object.freeze({
    version:8,name:'River Valley Reference (online)',
    sources:{'valley-raster':{type:'raster',tiles:['https://tile.openstreetmap.org/{z}/{x}/{y}.png'],tileSize:256,
      attribution:'© OpenStreetMap contributors (ODbL)'}},
    layers:[
      {id:'background',type:'background',paint:{'background-color':'#0b1c22'}},
      {id:'osm',type:'raster',source:'valley-raster',minzoom:0,maxzoom:19}
    ]
  });
  function isOnline(){try{return typeof navigator!=='undefined'&&navigator.onLine===true;}catch(_){return false;}}
  function detectLibs(){
    return {maplibre:typeof maplibregl!=='undefined'?maplibregl:null,pmtiles:typeof pmtiles!=='undefined'?pmtiles:null};
  }
  function registerPmtilesProtocol(maplibre,pm){
    if(!maplibre||!pm||!pm.Protocol)return false;
    try{const protocol=new pm.Protocol();maplibre.addProtocol('pmtiles',protocol.tile);return true;}catch(_){return false;}
  }
  function mount(containerEl,opts={}){
    const libs=detectLibs();
    if(!isOnline())return {status:'OFFLINE_BACKUP',message:'Online map skipped; using bundled geo reference.'};
    if(!libs.maplibre)return {status:'LIBS_MISSING',message:'MapLibre GL JS not loaded — keep offline raster reference.'};
    registerPmtilesProtocol(libs.maplibre,libs.pmtiles);
    const style=opts.style||JSON.parse(JSON.stringify(DEFAULT_STYLE));
    if(opts.pmtilesUrl&&libs.pmtiles){
      style.sources={'valley-pmtiles':{type:'vector',url:'pmtiles://'+opts.pmtilesUrl,
        attribution:'Project PMTiles · OSM ODbL where applicable'}};
      if(!opts.style)style.layers=[
        {id:'background',type:'background',paint:{'background-color':'#0b1c22'}},
        {id:'water',type:'fill',source:'valley-pmtiles','source-layer':'water',paint:{'fill-color':'#1a4a66'}},
        {id:'roads',type:'line',source:'valley-pmtiles','source-layer':'roads',paint:{'line-color':'#c4a574','line-width':1.2}}
      ];
    }
    const map=new libs.maplibre.Map({container:containerEl,style,center:opts.center||[-87.895,37.9325],
      zoom:opts.zoom||12,attributionControl:true,cooperativeGestures:true});
    map.addControl(new libs.maplibre.NavigationControl({visualizePitch:true}),'top-right');
    return {status:'MOUNTED',map,online:true};
  }
  function describe(){
    const libs=detectLibs();
    return {onlineFirst:true,offlineBackup:'ValleyGeoReference bundled raster',maplibrePresent:!!libs.maplibre,
      pmtilesPresent:!!libs.pmtiles,defaultCenter:[-87.895,37.9325],
      note:'Reference map only — not engineering-grade survey control.'};
  }
  return Object.freeze({DEFAULT_STYLE,isOnline,detectLibs,registerPmtilesProtocol,mount,describe});
});
