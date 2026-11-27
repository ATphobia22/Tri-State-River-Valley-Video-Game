/**
 * Opt-in CesiumJS imagery inspector for geographic context, not Babylon gameplay.
 * Display admission requires reviewed licences and attribution.
 * This module deliberately contains no access tokens or network operations.
 */
const LAYER_KINDS = new Set(['xyz', 'wms', 'ion', 'single-tile']);
const DANGEROUS_QUERY = /(?:^|[?&])(?:token|access_token|api[_-]?key|password|signature|sig|authorization)=/i;
function checkId(id) {
  if (typeof id !== 'string' || !/^[a-z][a-z0-9_-]{1,63}$/.test(id)) throw Error('invalid imagery id');
}
function checkRange(value, min, max, label) {
  if (!Number.isFinite(value) || value < min || value > max) throw Error('invalid ' + label);
}
function validateUrl(raw, allowedHosts) {
  if (typeof raw !== 'string' || raw.length > 2048 || !raw) throw Error('imagery URL required');
  if (raw.startsWith('//') || /^(?:data|blob|javascript|file):/i.test(raw)) throw Error('unsafe imagery URL');
  const absolute = /^https?:\/\//i.test(raw);
  if (absolute && !raw.startsWith('https://')) throw Error('HTTPS required for hosted imagery');
  if (!absolute && !/^(?:\.\/|\.\.\/|\/(?!\/))/.test(raw)) throw Error('imagery must use relative path or approved HTTPS host');
  const parsed = new URL(raw, 'https://river-valley.invalid');
  if (parsed.username || parsed.password || DANGEROUS_QUERY.test(raw) || parsed.hash) throw Error('token or URL fragment forbidden');
  if (absolute && !allowedHosts.has(parsed.hostname.toLowerCase())) throw Error('imagery origin not allowlisted');
  return raw;
}
function validateRectangle(rectangle) {
  if (!Array.isArray(rectangle) || rectangle.length !== 4) throw Error('rectangle west/south/east/north required');
  const [w,s,e,n] = rectangle;
  checkRange(w,-180,180,'west'); checkRange(e,-180,180,'east');
  checkRange(s,-90,90,'south'); checkRange(n,-90,90,'north');
  if (w>=e || s>=n) throw Error('rectangle must have positive extent');
}
export function createCesiumImageryController({Cesium,viewer,allowedHosts=[],maxLayers=4,onError=()=>{}}={}) {
  if (!Cesium?.ImageryLayer?.fromProviderAsync || !viewer?.imageryLayers?.add || !viewer.imageryLayers.remove)
    throw Error('CesiumJS Viewer imagery interface required');
  if (!Number.isSafeInteger(maxLayers) || maxLayers < 1 || maxLayers > 8) throw Error('invalid imagery layer budget');
  if (!Array.isArray(allowedHosts) || allowedHosts.some(h=>typeof h!=='string' || !/^[a-z0-9.-]+$/.test(h)))
    throw Error('invalid allowlisted origins');
  const hosts = new Set(allowedHosts.map(h=>h.toLowerCase()));
  const active = new Map();
  let disposed = false;
  function ensureOpen() { if(disposed) throw Error('imagery controller disposed'); }
  function source(spec) {
    if (!LAYER_KINDS.has(spec.kind)) throw Error('unsupported imagery provider');
    if(spec.kind === 'ion') {
      if (!Number.isSafeInteger(spec.assetId) || spec.assetId < 1) throw Error('invalid ion imagery ID');
      if ([6204792,6155964].includes(spec.assetId)) throw Error('3D Tiles and terrain are not imagery');
      if (spec.ionEnabled !== true) throw Error('ion requires explicit opt-in and runtime credentials');
      if (!Cesium.IonImageryProvider?.fromAssetId) throw Error('Cesium ion imagery unavailable');
      return Cesium.IonImageryProvider.fromAssetId(spec.assetId);
    }
    const url = validateUrl(spec.url,hosts);
    if(spec.kind==='xyz') {
      if(!/\{x\}/.test(url)||!/\{y\}/.test(url)||!/\{z\}/.test(url)) throw Error('XYZ template must include x/y/z');
      return new Cesium.UrlTemplateImageryProvider({url,credit:spec.attribution,maximumLevel:spec.maxLevel??18});
    }
    if(spec.kind==='wms') {
      if(typeof spec.layers!=='string'||!/^[-\w,.]+$/.test(spec.layers)) throw Error('WMS layer names required');
      return new Cesium.WebMapServiceImageryProvider({url,layers:spec.layers,credit:spec.attribution});
    }
    validateRectangle(spec.rectangle);
    if(!Cesium.SingleTileImageryProvider?.fromUrl || !Cesium.Rectangle?.fromDegrees) throw Error('single tile support missing');
    return Cesium.SingleTileImageryProvider.fromUrl(url,{rectangle:Cesium.Rectangle.fromDegrees(...spec.rectangle),credit:spec.attribution});
  }
  function add(spec) {
    ensureOpen();
    if(!spec || typeof spec!=='object') throw Error('imagery source descriptor required');
    checkId(spec.id);
    if(active.has(spec.id)) throw Error('imagery ID already registered');
    if(active.size>=maxLayers) throw Error('imagery layer budget exceeded');
    if(spec.licenseReviewed!==true || typeof spec.attribution!=='string' || spec.attribution.trim().length<2)
      throw Error('licence review and visible attribution required');
    if(typeof spec.provenanceId!=='string' || !/^[a-zA-Z0-9_.:-]{2,100}$/.test(spec.provenanceId))
      throw Error('provenance record required');
    const alpha=spec.alpha??1, brightness=spec.brightness??1;
    checkRange(alpha,0,1,'alpha');checkRange(brightness,.2,3,'brightness');
    const provider = source(spec);
    const layer=Cesium.ImageryLayer.fromProviderAsync(Promise.resolve(provider));
    layer.alpha=alpha;layer.brightness=brightness;layer.show=true;
    layer.errorEvent?.addEventListener?.(()=>onError({id:spec.id,code:'IMAGERY_PROVIDER_ERROR'}));
    try {viewer.imageryLayers.add(layer);} catch(error) {layer.destroy?.();throw error;}
    active.set(spec.id,{layer,kind:spec.kind,provenanceId:spec.provenanceId});
    return Object.freeze({id:spec.id,kind:spec.kind,contextOnly:true,surveyVerified:false});
  }
  function get(id){ensureOpen();const hit=active.get(id);if(!hit)throw Error('imagery layer not found');return hit.layer;}
  function setAlpha(id,alpha){checkRange(alpha,0,1,'alpha');get(id).alpha=alpha;}
  function setBrightness(id,brightness){checkRange(brightness,.2,3,'brightness');get(id).brightness=brightness;}
  function setVisible(id,visible){if(typeof visible!=='boolean')throw Error('visibility must be boolean');get(id).show=visible;}
  function raise(id){const layer=get(id);viewer.imageryLayers.raise?.(layer);}
  function lower(id){const layer=get(id);viewer.imageryLayers.lower?.(layer);}
  function remove(id){const layer=get(id);active.delete(id);viewer.imageryLayers.remove(layer,true);}
  function dispose(){
    if(disposed)return;
    for(const [id,{layer}] of active){active.delete(id);viewer.imageryLayers.remove(layer,true);}
    disposed=true;
  }
  return Object.freeze({add,setAlpha,setBrightness,setVisible,raise,lower,remove,dispose,
    list:()=>Array.from(active,([id,{kind,provenanceId}])=>({id,kind,provenanceId}))});
}
