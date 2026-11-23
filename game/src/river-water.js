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
 varying float vShoreDistance;
 void main(){
   vec4 world=modelMatrix*vec4(position,1.0);
   vWorld=world.xyz;
   // Compute bank alignment only per vertex, not per shaded river pixel.
   float bankZ=1200.0+125.0*sin(world.x / 550.0)+65.0*cos(world.x / 175.0);
   vShoreDistance=max(0.0,world.z-bankZ);
   gl_Position=projectionMatrix*viewMatrix*world;
 }`;
 const FS=`
 precision highp float;
 varying vec3 vWorld;
 varying float vShoreDistance;
 uniform float uTime;
 uniform float uDetail;
 uniform float uSunHeight;
 uniform float uStorm;
 uniform float uWind;
 uniform vec3 uSunDirection;
 uniform vec3 uShallow;
 uniform vec3 uDeep;
 uniform vec3 uSky;
 float wave(vec2 p,float speed,float a,float b){
   return sin(dot(p,vec2(a,b))+uTime*speed);
 }
 void main(){
   vec2 p=vWorld.xz;
   float wind=clamp(uWind,0.0,1.5);
   float a=wave(p*.12, .72+wind*.14,1.10,.76);
   float b=wave(p*.16,-.53-wind*.13,-.75,1.17);
   float c=wave(p*.43, 1.23+wind*.18,.53,-1.24);
   float shore=1.0-smoothstep(2.0,26.0,vShoreDistance);
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
   float foamWave=clamp(.5+.5*(a*.6+b*.4),0.0,1.0);
   float foam=shore*shore*(.3+.5*foamWave)*uDetail*(1.0-uStorm*.34);
   col=mix(col,vec3(.9,.94,.97),clamp(foam*.58,0.0,.4));
   col=mix(col,vec3(.16,.22,.25),uStorm*.25);
   gl_FragColor=vec4(col,.89);
   #include <tonemapping_fragment>
   #include <colorspace_fragment>
 }`;
 function shorelineZ(x){return 1200+125*Math.sin(x/550)+65*Math.cos(x/175);}
 function foamMask(x,z,quality){
   if(!Number.isFinite(x)||!Number.isFinite(z))return 0;
   const d=Math.max(0,z-shorelineZ(x));
   const t=Math.max(0,Math.min(1,(d-2)/24));
   return (1-t*t*(3-2*t))*qualityDetail(quality);
 }
 function qualityDetail(quality){
   return quality==='lite'||quality==='low'?0:quality==='medium'?.55:1;
 }
 function parameters(weather,time,quality){
   const hour=Number.isFinite(time)?time:15;
   const daylight=Math.max(0,Math.sin((hour-6)*Math.PI/12));
   return {storm:weather==='rain'?1:weather==='mist'?.45:0,
     daylight,detail:qualityDetail(quality),
     wind:qualityDetail(quality)*(weather==='rain'?1.2:weather==='mist'?.14:.4)};
 }
 function create(THREE,geometry,options={}){
   if(!THREE||typeof THREE.ShaderMaterial!=='function')throw new TypeError('THREE.ShaderMaterial required');
   const material=new THREE.ShaderMaterial({
     name:'RiverValley/ProceduralRiverV1',transparent:true,depthWrite:false,
     side:THREE.DoubleSide,toneMapped:true,
     uniforms:{
       uTime:{value:0},uDetail:{value:qualityDetail(options.quality)},
       uStorm:{value:0},uWind:{value:.4},uSunHeight:{value:.7},
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
   if(material.uniforms.uWind)material.uniforms.uWind.value=p.wind;
   material.uniforms.uSunHeight.value=p.daylight;
   const angle=(time-6)*Math.PI/12;
   material.uniforms.uSunDirection.value.set(Math.cos(angle),Math.max(.08,Math.sin(angle)),-.16).normalize();
 }
 return Object.freeze({create,update,parameters,qualityDetail,shorelineZ,foamMask,vertexShader:VS,fragmentShader:FS});
});
