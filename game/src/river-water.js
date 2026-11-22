/* Original, dependency-free river shader: mobile-scaled ripple normals, Fresnel
 * sky reflection and directional sun glint. No reflection render target,
 * network assets, Unreal runtime or external models required.
 */
(function(root,factory){
 const api=factory();
 if(typeof module==='object'&&module.exports)module.exports=api;
 else root.ValleyRiverWater=api;
})(typeof globalThis==='object'?globalThis:this,function(){
 'use strict';
 const VS=`
 varying vec3 vWorld;
 void main(){
   vec4 world=modelMatrix*vec4(position,1.0);
   vWorld=world.xyz;
   gl_Position=projectionMatrix*viewMatrix*world;
 }`;
 const FS=`
 precision highp float;
 varying vec3 vWorld;
 uniform float uTime;
 uniform float uDetail;
 uniform float uSunHeight;
 uniform float uStorm;
 uniform vec3 uSunDirection;
 uniform vec3 uShallow;
 uniform vec3 uDeep;
 uniform vec3 uSky;
 float wave(vec2 p,float speed,float a,float b){
   return sin(dot(p,vec2(a,b))+uTime*speed);
 }
 void main(){
   vec2 p=vWorld.xz;
   float a=wave(p*.12, .72,1.10,.76);
   float b=wave(p*.16,-.53,-.75,1.17);
   float c=wave(p*.43, 1.23,.53,-1.24);
   vec3 n=normalize(vec3(
     (a*.16+b*.13+c*.045*uDetail),
     1.0,
     (b*.16-a*.12+c*.043*uDetail)
   ));
   vec3 viewDir=normalize(cameraPosition-vWorld);
   float facing=clamp(abs(dot(viewDir,n)),0.0,1.0);
   float fresnel=pow(1.0-facing,3.7);
   vec3 r=reflect(-viewDir,n);
   float glint=pow(max(dot(r,normalize(uSunDirection)),0.0),96.0);
   float smallGlint=pow(max(dot(r,normalize(uSunDirection)),0.0),280.0);
   float ripples=.5+.5*(a*.45+b*.35+c*.20*uDetail);
   vec3 base=mix(uDeep,uShallow,clamp(.2+.45*ripples,0.0,1.0));
   vec3 reflected=mix(uSky,vec3(0.91,0.81,0.62),clamp(uSunHeight*.2,0.0,.2));
   vec3 col=mix(base,reflected,clamp(.10+fresnel*.70,0.0,.87));
   col+=vec3(1.0,.78,.45)*glint*(1.6-uStorm*.72)*max(.1,uSunHeight);
   col+=vec3(.82,.92,1.0)*smallGlint*.16*uDetail;
   col=mix(col,vec3(.16,.22,.25),uStorm*.25);
   gl_FragColor=vec4(col,.89);
   #include <tonemapping_fragment>
   #include <colorspace_fragment>
 }`;
 function qualityDetail(quality){
   return quality==='lite'||quality==='low'?0:quality==='medium'?.55:1;
 }
 function parameters(weather,time,quality){
   const hour=Number.isFinite(time)?time:15;
   const daylight=Math.max(0,Math.sin((hour-6)*Math.PI/12));
   return {storm:weather==='rain'?1:weather==='mist'?.45:0,
     daylight,detail:qualityDetail(quality)};
 }
 function create(THREE,geometry,options={}){
   if(!THREE||typeof THREE.ShaderMaterial!=='function')throw new TypeError('THREE.ShaderMaterial required');
   const material=new THREE.ShaderMaterial({
     name:'RiverValley/ProceduralRiverV1',transparent:true,depthWrite:false,
     side:THREE.DoubleSide,toneMapped:true,
     uniforms:{
       uTime:{value:0},uDetail:{value:qualityDetail(options.quality)},
       uStorm:{value:0},uSunHeight:{value:.7},
       uSunDirection:{value:new THREE.Vector3(-.45,.7,-.2).normalize()},
       uShallow:{value:new THREE.Color('#378b98')},
       uDeep:{value:new THREE.Color('#144b60')},
       uSky:{value:new THREE.Color('#8cafbe')}
     },
     vertexShader:VS,fragmentShader:FS
   });
   return {mesh:new THREE.Mesh(geometry,material),material};
 }
 function update(material,stamp,weather,time,quality){
   if(!material||!material.uniforms)return;
   const p=parameters(weather,time,quality);
   material.uniforms.uTime.value=Math.max(0,Number.isFinite(stamp)?stamp:0)*.001;
   material.uniforms.uDetail.value=p.detail;
   material.uniforms.uStorm.value=p.storm;
   material.uniforms.uSunHeight.value=p.daylight;
   const angle=(time-6)*Math.PI/12;
   material.uniforms.uSunDirection.value.set(Math.cos(angle),Math.max(.08,Math.sin(angle)),-.16).normalize();
 }
 return Object.freeze({create,update,parameters,qualityDetail,vertexShader:VS,fragmentShader:FS});
});
