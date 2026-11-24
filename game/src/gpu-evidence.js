/* Real-device GPU evidence capture schema for issue #6 quality gates. */
(function(root,factory){
  const api=factory();
  if(typeof module==='object'&&module.exports)module.exports=api;
  else root.ValleyGpuEvidence=api;
})(typeof globalThis==='object'?globalThis:this,function(){
  'use strict';
  function collectBrowser(){
    const nav=typeof navigator!=='undefined'?navigator:{};
    return {userAgent:nav.userAgent||null,platform:nav.platform||null,deviceMemory:nav.deviceMemory||null,
      hardwareConcurrency:nav.hardwareConcurrency||null,
      webgl2:typeof document!=='undefined'?!!document.createElement('canvas').getContext('webgl2'):null,
      webgpu:typeof navigator!=='undefined'&&!!nav.gpu};
  }
  function collectWebGL(renderer){
    if(!renderer||!renderer.getContext)return {available:false};
    try{
      const gl=renderer.getContext();
      const dbg=gl.getExtension('WEBGL_debug_renderer_info');
      return {available:true,
        vendor:dbg?gl.getParameter(dbg.UNMASKED_VENDOR_WEBGL):gl.getParameter(gl.VENDOR),
        renderer:dbg?gl.getParameter(dbg.UNMASKED_RENDERER_WEBGL):gl.getParameter(gl.RENDERER),
        version:gl.getParameter(gl.VERSION),maxTextureSize:gl.getParameter(gl.MAX_TEXTURE_SIZE)};
    }catch(e){return {available:false,error:String(e)};}
  }
  function fromFrameProbe(probeReport,renderer,extra={}){
    const info=renderer&&renderer.info?renderer.info:{};
    return {capturedUtc:new Date().toISOString(),browser:collectBrowser(),webgl:collectWebGL(renderer),
      fps:probeReport&&probeReport.fps||null,frameMs:probeReport&&probeReport.frameMs||null,
      drawCalls:info.render?info.render.calls:null,triangles:info.render?info.render.triangles:null,
      geometries:info.memory?info.memory.geometries:null,textures:info.memory?info.memory.textures:null,
      viewport:extra.viewport||null,quality:extra.quality||null,streaming:extra.streaming||null,
      note:'Fill screenshots + p50/p95/p99 on real iOS Safari / Windows Chrome devices.'};
  }
  return Object.freeze({collectBrowser,collectWebGL,fromFrameProbe});
});
