/* MapLibre + PMTiles reference map with Protomaps basemap schema.
 * Online-first: vector water / roads / buildings. Offline: ValleyGeoReference.
 * Schema: https://docs.protomaps.com/basemaps/layers (ODbL attribution required).
 */
(function(root,factory){
  const api=factory();
  if(typeof module==='object'&&module.exports)module.exports=api;
  else root.ValleyMapLibreReference=api;
})(typeof globalThis==='object'?globalThis:this,function(){
  'use strict';

  const PROJECT_PMTILES_URL='';
  const DEMO_PMTILES_URL='https://pmtiles.io/protomaps(vector)ODbL_firenze.pmtiles';

  const PROTOMAPS_LAYERS=Object.freeze({
    water:'water',
    roads:'roads',
    buildings:'buildings',
    landuse:'landuse',
    places:'places',
    physical_line:'physical_line'
  });

  const ATTRIBUTION='© <a href="https://openstreetmap.org/copyright">OpenStreetMap</a> · Protomaps';

  function protomapsStyle(pmtilesUrl){
    const url=pmtilesUrl||PROJECT_PMTILES_URL;
    if(!url)throw new Error('Explicit PMTiles archive required');
    return {
      version:8,
      name:'River Valley · Protomaps vector',
      sources:{
        protomaps:{
          type:'vector',
          url:'pmtiles://'+url,
          attribution:ATTRIBUTION
        }
      },
      layers:[
        {id:'background',type:'background',paint:{'background-color':'#0b1c22'}},
        {
          id:'earth',
          type:'fill',
          source:'protomaps',
          'source-layer':'landuse',
          paint:{'fill-color':'#1a2e28','fill-opacity':0.35}
        },
        {
          id:'water',
          type:'fill',
          source:'protomaps',
          'source-layer':PROTOMAPS_LAYERS.water,
          paint:{'fill-color':'#1a4a66','fill-opacity':0.92}
        },
        {
          id:'waterway',
          type:'line',
          source:'protomaps',
          'source-layer':'physical_line',
          filter:['==',['get','pmap:kind'],'waterway'],
          paint:{'line-color':'#2a6a8a','line-width':1.2}
        },
        {
          id:'buildings',
          type:'fill',
          source:'protomaps',
          'source-layer':PROTOMAPS_LAYERS.buildings,
          minzoom:13,
          paint:{'fill-color':'#3d4a52','fill-opacity':0.85,'fill-outline-color':'#2a3338'}
        },
        {
          id:'buildings-3d',
          type:'fill-extrusion',
          source:'protomaps',
          'source-layer':PROTOMAPS_LAYERS.buildings,
          minzoom:14,
          paint:{
            'fill-extrusion-color':'#4a5860',
            'fill-extrusion-height':['coalesce',['get','height'],8],
            'fill-extrusion-base':['coalesce',['get','min_height'],0],
            'fill-extrusion-opacity':0.72
          }
        },
        {
          id:'roads-minor',
          type:'line',
          source:'protomaps',
          'source-layer':PROTOMAPS_LAYERS.roads,
          filter:['in',['get','pmap:kind'],['literal',['minor_road','other','path']]],
          paint:{'line-color':'#5a5040','line-width':0.8}
        },
        {
          id:'roads-major',
          type:'line',
          source:'protomaps',
          'source-layer':PROTOMAPS_LAYERS.roads,
          filter:['in',['get','pmap:kind'],['literal',['highway','major_road','medium_road']]],
          paint:{
            'line-color':'#c4a574',
            'line-width':['interpolate',['linear'],['zoom'],8,0.6,14,2.4]
          }
        }
      ]
    };
  }

  const RASTER_FALLBACK=Object.freeze({
    version:8,name:'River Valley Reference (raster fallback)',
    sources:{
      'valley-raster':{
        type:'raster',
        tiles:['https://tile.openstreetmap.org/{z}/{x}/{y}.png'],
        tileSize:256,
        attribution:'© OpenStreetMap contributors (ODbL)'
      }
    },
    layers:[
      {id:'background',type:'background',paint:{'background-color':'#0b1c22'}},
      {id:'osm',type:'raster',source:'valley-raster',minzoom:0,maxzoom:19}
    ]
  });

  function isOnline(){
    try{return typeof navigator!=='undefined'&&navigator.onLine===true;}
    catch(_){return false;}
  }

  function detectLibs(){
    return {
      maplibre:typeof maplibregl!=='undefined'?maplibregl:null,
      pmtiles:typeof pmtiles!=='undefined'?pmtiles:null
    };
  }

  function registerPmtilesProtocol(maplibre,pm){
    if(!maplibre||!pm||!pm.Protocol)return false;
    try{
      const protocol=new pm.Protocol();
      maplibre.addProtocol('pmtiles',protocol.tile);
      return true;
    }catch(_){return false;}
  }

  // No demonstration archive may serve as production geography.
  const PROJECT_BOUNDS=Object.freeze([-87.928,37.909,-87.853,37.960]);
  const verifiedArchives=new WeakSet();
  function resolveArchive(opts={}){
    const value=opts.pmtilesUrl||PROJECT_PMTILES_URL;
    if(typeof value!=='string'||!value||value===DEMO_PMTILES_URL)return null;
    try{
      const url=new URL(value);
      if(url.protocol!=='https:'||url.username||url.password||url.hash||!url.pathname.toLowerCase().endsWith('.pmtiles'))return null;
      return url.href;
    }catch(_){return null;}
  }
  function inspectArchiveHeader(buffer,bounds=PROJECT_BOUNDS){
    if(!(buffer instanceof ArrayBuffer)||buffer.byteLength!==127)throw new Error('Invalid PMTiles v3 header length');
    const v=new DataView(buffer);
    if(String.fromCharCode(...new Uint8Array(buffer,0,7))!=='PMTiles'||v.getUint8(7)!==3)throw new Error('Invalid PMTiles v3 header');
    if(v.getUint8(99)!==1)throw new Error('PMTiles archive must contain MVT vector tiles');
    const minZoom=v.getUint8(100),maxZoom=v.getUint8(101);
    if(minZoom>maxZoom||maxZoom<14||maxZoom>30)throw new Error('PMTiles archive lacks detailed zoom coverage');
    const actual=[102,106,110,114].map(offset=>v.getInt32(offset,true)/1e7);
    if(actual[0]<-180||actual[1]<-90||actual[2]>180||actual[3]>90||actual[0]>actual[2]||actual[1]>actual[3]||
       !Array.isArray(bounds)||bounds.length!==4||!bounds.every(Number.isFinite)||bounds[0]>bounds[2]||bounds[1]>bounds[3]||
       actual[0]>bounds[0]||actual[1]>bounds[1]||actual[2]<bounds[2]||actual[3]<bounds[3])throw new Error('PMTiles geographic coverage does not include requested region');
    return {bounds:actual,minZoom,maxZoom,tileType:'MVT'};
  }
  async function preflightArchive(url,{fetcher=globalThis.fetch,timeoutMs=5000,bounds=PROJECT_BOUNDS}={}){
    url=resolveArchive({pmtilesUrl:url});
    if(!url||typeof fetcher!=='function')throw new Error('No approved project PMTiles archive');
    const controller=new AbortController();
    const timeout=setTimeout(()=>controller.abort(),Math.max(100,Math.min(15000,Number.isFinite(timeoutMs)?timeoutMs:5000)));
    try{
      const response=await fetcher(url,{headers:{Range:'bytes=0-126'},signal:controller.signal,credentials:'omit',redirect:'error'});
      const range=response.headers?.get('Content-Range')||'';
      const match=/^bytes 0-126\/([0-9]+)$/.exec(range);
      if(response.status!==206||!match||!Number.isSafeInteger(Number(match[1]))||Number(match[1])<127){
        try{await response.body?.cancel();}catch(_){}
        throw new Error('PMTiles server must support exact HTTP byte range responses');
      }
      let buffer;
      if(response.body?.getReader){
        const reader=response.body.getReader(),bytes=new Uint8Array(127);let offset=0;
        try{
          while(true){
            const {done,value}=await reader.read();if(done)break;
            if(offset+value.byteLength>127)throw new Error('PMTiles range exceeded header length');
            bytes.set(value,offset);offset+=value.byteLength;
          }
          if(offset!==127)throw new Error('PMTiles range truncated');
          buffer=bytes.buffer;
        }finally{try{await reader.cancel();}catch(_){}reader.releaseLock();}
      }else buffer=await response.arrayBuffer();
      const info=inspectArchiveHeader(buffer,bounds);
      const receipt=Object.freeze({...info,bounds:Object.freeze(info.bounds),url,archiveBytes:Number(match[1])});
      if(info.bounds[0]<=PROJECT_BOUNDS[0]&&info.bounds[1]<=PROJECT_BOUNDS[1]&&info.bounds[2]>=PROJECT_BOUNDS[2]&&info.bounds[3]>=PROJECT_BOUNDS[3])verifiedArchives.add(receipt);
      return receipt;
    }finally{clearTimeout(timeout);}
  }

  function mount(containerEl,opts={}){
    const libs=detectLibs();
    if(!isOnline()){
      return {status:'OFFLINE_BACKUP',message:'Online map skipped; using bundled geo reference.'};
    }
    if(!libs.maplibre){
      return {status:'LIBS_MISSING',message:'MapLibre GL JS not loaded — keep offline raster reference.'};
    }
    const pmUrl=resolveArchive(opts);
    if(!pmUrl)return {status:'OFFLINE_BACKUP',message:'No verified regional archive configured; retain bundled reference.'};
    if(!verifiedArchives.has(opts.archiveReceipt)||opts.archiveReceipt.url!==pmUrl)
      return {status:'ARCHIVE_UNVERIFIED',message:'Run PMTiles coverage and HTTP range preflight before mounting.'};
    const hasPm=registerPmtilesProtocol(libs.maplibre,libs.pmtiles);
    if(!hasPm)return {status:'OFFLINE_BACKUP',message:'PMTiles protocol unavailable; retain bundled reference.'};
    const style=protomapsStyle(pmUrl);

    const map=new libs.maplibre.Map({
      container:containerEl,
      style,
      center:opts.center||[-87.895,37.9325],
      zoom:opts.zoom||12,
      attributionControl:true,
      cooperativeGestures:true
    });
    map.addControl(new libs.maplibre.NavigationControl({visualizePitch:true}),'top-right');
    return {
      status:'MOUNTED',
      map,
      online:true,
      schema:'protomaps',
      layers:['water','roads','buildings'],
      pmtilesUrl:hasPm?pmUrl:null
    };
  }

  async function mountVerified(containerEl,opts={}){
    const url=resolveArchive(opts);
    if(!isOnline()||!url)return mount(containerEl,opts);
    try{
      const archiveReceipt=await preflightArchive(url);
      return mount(containerEl,{...opts,archiveReceipt});
    }catch(error){return {status:'OFFLINE_BACKUP',message:'PMTiles preflight failed: '+error.message};}
  }
  function describe(){
    const libs=detectLibs();
    return {
      onlineFirst:true,
      offlineBackup:'ValleyGeoReference bundled raster',
      maplibrePresent:!!libs.maplibre,
      pmtilesPresent:!!libs.pmtiles,
      projectPmtilesUrl:PROJECT_PMTILES_URL||null,
      demoPmtilesUrl:DEMO_PMTILES_URL,
      protomapsLayers:PROTOMAPS_LAYERS,
      defaultCenter:[-87.895,37.9325],
      note:'Reference map only — not engineering-grade survey control. OSM ODbL applies.'
    };
  }

  return Object.freeze({
    PROJECT_PMTILES_URL,
    DEMO_PMTILES_URL,
    PROTOMAPS_LAYERS,
    protomapsStyle,
    RASTER_FALLBACK,
    isOnline,
    detectLibs,
    registerPmtilesProtocol,
    resolveArchive,inspectArchiveHeader,preflightArchive,
    mount,mountVerified,
    describe
  });
});
