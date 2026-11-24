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
    const url=pmtilesUrl||PROJECT_PMTILES_URL||DEMO_PMTILES_URL;
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

  function resolveUrl(opts){
    return opts.pmtilesUrl||PROJECT_PMTILES_URL||DEMO_PMTILES_URL;
  }

  function mount(containerEl,opts={}){
    const libs=detectLibs();
    if(!isOnline()){
      return {status:'OFFLINE_BACKUP',message:'Online map skipped; using bundled geo reference.'};
    }
    if(!libs.maplibre){
      return {status:'LIBS_MISSING',message:'MapLibre GL JS not loaded — keep offline raster reference.'};
    }
    const hasPm=registerPmtilesProtocol(libs.maplibre,libs.pmtiles);
    const pmUrl=resolveUrl(opts);
    const style=opts.style
      ||(hasPm?protomapsStyle(pmUrl):JSON.parse(JSON.stringify(RASTER_FALLBACK)));

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
    mount,
    describe
  });
});
