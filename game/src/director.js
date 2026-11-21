/* River Valley VFX supervisor: device-budgeted original weather/atmosphere FX.
   No network I/O or imported textures. All numbers are decorative, never physical simulation. */
(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;else root.ValleyDirector=api;})(typeof globalThis==='object'?globalThis:this,function(){
'use strict';
const LOOKS=Object.freeze({
 natural:{title:'Natural Countryside',time:14.5,weather:'clear',grade:'none',fog:1},
 golden:{title:'Golden Hour Riverfront',time:18.4,weather:'clear',grade:'sepia(.18) saturate(1.18) contrast(1.04)',fog:1.15},
 blue:{title:'Blue Hour Reflections',time:20.1,weather:'mist',grade:'hue-rotate(9deg) saturate(.92) contrast(1.12)',fog:1.32},
 storm:{title:'Stormfront Over the Ohio',time:16.4,weather:'rain',grade:'saturate(.72) contrast(1.18) brightness(.87)',fog:1.8},
 lantern:{title:'Lanterns and Fireflies',time:22,weather:'clear',grade:'saturate(.92) contrast(1.14) brightness(.86)',fog:1.24}
});
const QUALITY=Object.freeze({lite:{particles:16,pixelRatio:1,maxFPS:22},balanced:{particles:55,pixelRatio:1.25,maxFPS:30},cinematic:{particles:110,pixelRatio:1.5,maxFPS:45}});
const pickLook=id=>LOOKS[id]||LOOKS.natural;
const pickQuality=id=>QUALITY[id]||QUALITY.balanced;
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
function cleanSettings(v){v=v&&typeof v==='object'?v:{};return {
 look:Object.prototype.hasOwnProperty.call(LOOKS,v.look)?v.look:'natural',
 quality:Object.prototype.hasOwnProperty.call(QUALITY,v.quality)?v.quality:'balanced',
 strength:Number.isFinite(v.strength)?clamp(v.strength,0,1):.72,
 grain:!!v.grain,showStats:!!v.showStats};}
function rgba(r,g,b,a){return `rgba(${r},${g},${b},${clamp(a,0,1).toFixed(3)})`;}
// Self-contained overlay fallback: renders even when the browser has no WebGL context.
function draw2D(canvas,settings,frame,{weather='clear',time=17.5,season='summer',width,height}={}){
 if(!canvas)return 0;const s=cleanSettings(settings),budget=pickQuality(s.quality),w=Math.max(1,Math.floor(width||canvas.clientWidth||960)),h=Math.max(1,Math.floor(height||canvas.clientHeight||540));
 const ratio=Math.min(budget.pixelRatio,typeof devicePixelRatio!=='undefined'?devicePixelRatio:1);
 const pw=Math.round(w*ratio),ph=Math.round(h*ratio);if(canvas.width!==pw||canvas.height!==ph){canvas.width=pw;canvas.height=ph;}
 const ctx=canvas.getContext('2d');if(!ctx)return 0;ctx.setTransform(ratio,0,0,ratio,0,0);ctx.clearRect(0,0,w,h);
 const t=frame/1000,st=s.strength,night=time>=20||time<5,twilight=time>=17&&time<20;
 if(s.quality!=='lite'){
   const glare=ctx.createRadialGradient(w*.83,h*.2,0,w*.83,h*.2,Math.max(w,h)*.59);
   glare.addColorStop(0,rgba(255,199,100,(twilight?.18:night?.015:.055)*st));glare.addColorStop(1,'rgba(255,199,100,0)');ctx.fillStyle=glare;ctx.fillRect(0,0,w,h);
 }
 if(weather==='mist'||s.look==='blue'){
  for(let b=0;b<3;b++){const sy=h*(.45+b*.22)+Math.sin(t*.35+b)*14;let g=ctx.createLinearGradient(0,sy-90,0,sy+100);
   g.addColorStop(0,'rgba(178,213,206,0)');g.addColorStop(.53,rgba(167,216,211,(.12+b*.045)*st));g.addColorStop(1,'rgba(178,213,206,0)');ctx.fillStyle=g;ctx.fillRect(0,sy-90,w,200);}
 }
 let count=budget.particles;
 if(weather==='rain'||s.look==='storm'){
  ctx.strokeStyle=rgba(190,225,244,.45*st);ctx.lineWidth=1.5;
  for(let i=0;i<count;i++){let x=((i*79.77+t*210)% (w+100))-50,y=((i*137.1+t*385)%(h+75))-38;
   ctx.beginPath();ctx.moveTo(x,y);ctx.lineTo(x-7,y+27);ctx.stroke();}
 }else if(night){
  for(let i=0;i<count;i++){let x=((i*137.71)%w)+Math.sin(t*(.55+i%3*.13)+i)*11,y=h*.30+((i*91.23)%(h*.6))+Math.cos(t*.8+i)*8;
   let r=(1.6+(i%4)*.35);ctx.shadowColor='#ffd66a';ctx.shadowBlur=9;ctx.fillStyle=rgba(255,217,113,st*(.25+.45*(.5+.5*Math.sin(t*2+i))));ctx.beginPath();ctx.arc(x,y,r,0,6.283);ctx.fill();}
  ctx.shadowBlur=0;
 }else if(s.quality!=='lite'){
  for(let i=0;i<count;i++){let x=((i*83.7+t*(i%3+1)*3)%w),y=((i*111.7-t*(i%3+1)*2+h*8)%h);
   ctx.fillStyle=rgba(season==='autumn'?226:240,211,167,st*.17);ctx.beginPath();ctx.arc(x,y,1+(i%4)*.2,0,6.283);ctx.fill();}
 }
 if(s.grain&&s.quality==='cinematic'){
  for(let i=0;i<150;i++){const x=((i*317.27+Math.floor(t*9)*117.1)%w),y=((i*177.91+Math.floor(t*11)*63.7)%h);ctx.fillStyle=rgba(255,248,220,.045*st);ctx.fillRect(x,y,1,1);}
 }
 return count;
}
// One draw call for floating firefly/pollen motes, a second for clustered riverside reeds.
function makeWorldFX(THREE,scene,ground,limit,seed=3751){
 let n=seed>>>0;const rnd=()=>((n=(Math.imul(n,1664525)+1013904223)>>>0)/4294967296);
 const max=180,position=new Float32Array(max*3),base=new Float32Array(max*3);
 for(let i=0;i<max;i++){
  const x=(rnd()*2-1)*limit,z=(rnd()*2-1)*limit;
  base[i*3]=x;base[i*3+1]=ground(x,z)+5+rnd()*23;base[i*3+2]=z;
  position.set(base.subarray(i*3,i*3+3),i*3);
 }
 const pointsGeo=new THREE.BufferGeometry();pointsGeo.setAttribute('position',new THREE.BufferAttribute(position,3));
 const pointsMaterial=new THREE.PointsMaterial({color:0xf9dca0,size:5,transparent:true,opacity:.55,depthWrite:false,sizeAttenuation:true});
 const points=new THREE.Points(pointsGeo,pointsMaterial);points.frustumCulled=false;scene.add(points);
 const reedsCount=500,reedGeo=new THREE.ConeGeometry(.7,5.5,3),reedMaterial=new THREE.MeshLambertMaterial({color:0x879c62,side:THREE.DoubleSide});
 const reeds=new THREE.InstancedMesh(reedGeo,reedMaterial,reedsCount),dummy=new THREE.Object3D();
 for(let i=0;i<reedsCount;i++){
  const x=(rnd()*2-1)*limit,z=1180+125*Math.sin(x/550)+65*Math.cos(x/175)-(15+rnd()*95);
  const y=ground(x,z);dummy.position.set(x,y+2.3,z);dummy.rotation.y=rnd()*6.283;dummy.rotation.z=(rnd()-.5)*.19;dummy.scale.set(.7+rnd()*.9,.6+rnd()*1.25,.7+rnd()*.9);dummy.updateMatrix();reeds.setMatrixAt(i,dummy.matrix);
 }
 reeds.instanceMatrix.needsUpdate=true;reeds.frustumCulled=true;scene.add(reeds);
 function update(now,time,weather,strength,quality){
  const q=pickQuality(quality);const night=time>=20||time<5;
  points.visible=quality!=='lite'&&weather!=='rain';reeds.visible=true;
  pointsMaterial.opacity=(night?.67:.13)*clamp(strength,0,1);
  pointsMaterial.color.set(night?'#ffeb9d':'#f8edd2');
  if(points.visible){const t=now*.001;for(let i=0;i<max;i++){const k=i*3;position[k]=base[k]+Math.sin(t*.65+i*11.3)*4;position[k+1]=base[k+1]+Math.cos(t*.9+i*7.1)*3;position[k+2]=base[k+2]+Math.sin(t*.38+i*5.7)*4;}
   pointsGeo.attributes.position.needsUpdate=true;}
  pointsMaterial.size=q===QUALITY.cinematic?5:q===QUALITY.balanced?3.5:2;
 }
 function dispose(){scene.remove(points,reeds);pointsGeo.dispose();pointsMaterial.dispose();reedGeo.dispose();reedMaterial.dispose();}
 return {points,reeds,update,dispose,counts:{motes:max,reeds:reedsCount}};
}
return {LOOKS,QUALITY,pickLook,pickQuality,cleanSettings,draw2D,makeWorldFX};
});
