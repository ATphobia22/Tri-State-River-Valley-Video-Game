/* Original procedurally painted playable virtual-backdrop gallery.
   Scenic illustrations, not photographs, satellite imagery or real 3D output. */
(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;else root.ValleyStoryscape=api;})(typeof globalThis==='object'?globalThis:this,function(){
'use strict';
const SCENES=Object.freeze({riverfront:'Ohio River · Evening on the Water',farm:'Valley Farm · Harvest Morning',woods:'Oak Grove · Woodland Lanterns'});
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
function render(canvas,sceneId,lookId,stamp,quality='balanced'){
 if(!canvas)return false;const c=canvas.getContext('2d');if(!c)return false;const w=1280,h=720;
 if(canvas.width!==w||canvas.height!==h){canvas.width=w;canvas.height=h;}
 c.clearRect(0,0,w,h);const t=stamp/1000,night=lookId==='lantern',storm=lookId==='storm',blue=lookId==='blue',gold=lookId==='golden';
 const sky=c.createLinearGradient(0,0,0,h);
 for(const [p,k] of (night?[[0,'#0c1434'],[.55,'#25415b'],[1,'#4e5160']]:storm?[[0,'#334759'],[.63,'#788c88'],[1,'#a6a792']]:blue?[[0,'#162954'],[.65,'#6b8f9b'],[1,'#9c8795']]:gold?[[0,'#2b4a7a'],[.54,'#d89078'],[1,'#f0c27e']]:[[0,'#538ab0'],[.66,'#b6d3c6'],[1,'#e8d7b0']]))sky.addColorStop(p,k);c.fillStyle=sky;c.fillRect(0,0,w,h);
 function poly(points,col){c.fillStyle=col;c.beginPath();points.forEach((p,i)=>i?c.lineTo(...p):c.moveTo(...p));c.closePath();c.fill();}
 function oval(x,y,rx,ry,col){c.beginPath();c.ellipse(x,y,rx,ry,0,0,Math.PI*2);c.fillStyle=col;c.fill();}
 function line(points,col,width=2){c.beginPath();points.forEach((p,i)=>i?c.lineTo(...p):c.moveTo(...p));c.lineWidth=width;c.strokeStyle=col;c.stroke();}
 const starCount=night?90:0;for(let i=0;i<starCount;i++){const x=(i*251.37)%w,y=(i*93.19)%260;oval(x,y,1+(i%3)*.4,1+(i%3)*.4,'rgba(246,239,209,.75)');}
 const sunX=875,sunY=night?125:gold?220:blue?190:170;const glow=c.createRadialGradient(sunX,sunY,15,sunX,sunY,240);glow.addColorStop(0,night?'rgba(248,246,219,.3)':'rgba(255,217,151,.42)');glow.addColorStop(1,'rgba(255,218,151,0)');c.fillStyle=glow;c.fillRect(500,0,780,470);oval(sunX,sunY,night?34:gold?62:46,night?34:gold?62:46,night?'#f1efcf':'#ffdeb1');
 for(let i=0;i<13;i++){let x=((i*129+stamp*.008*(i%4+1))%1500)-120,y=76+(i*37)%190;oval(x,y,70+(i%5)*15,12+(i%3)*9,night?'rgba(212,211,224,.15)':'rgba(251,240,225,.30)');}
 // Distant three-band terrain and atmospheric separation.
 for(const [level,y,color] of [[0,340,night?'#243c53':'#739499'],[1,388,night?'#1e3947':'#5f8278'],[2,432,night?'#16392f':'#486c5a']]){
  const pts=[[0,h],[0,y]];for(let x=0;x<=w;x+=16)pts.push([x,y+Math.sin(x/135+level*1.8)*18+Math.sin(x/43+level)*6]);pts.push([w,h]);poly(pts,color);
 }
 if(sceneId==='riverfront'){
  // Animated reflective Ohio River, shoreline and stylized brick skyline.
  const water=c.createLinearGradient(0,398,0,720);water.addColorStop(0,night?'#214358':'#4b8794');water.addColorStop(1,night?'#112d4b':'#173f5d');c.fillStyle=water;c.fillRect(0,430,w,290);
  for(let j=0;j<100;j++){let x=(j*187+t*23*(1+j%3))%1350-70,y=453+(j*43)%270;line([[x,y],[x+14+j%9*3,y+Math.sin(t*2+j)*1.7]],night?'rgba(217,224,190,.22)':'rgba(236,225,187,.25)',1.1+(j%3));}
  poly([[0,380],[340,396],[475,445],[0,480]],'#354b40');
  for(let i=0;i<12;i++){
   const x=22+i*33,y=338+(i%3)*8,bh=35+(i*11)%62;
   c.fillStyle=['#865f54','#ae7865','#b68a73'][i%3];c.fillRect(x,y-bh,31,bh);
   c.fillStyle='#443e40';c.fillRect(x-3,y-bh-6,37,6);
   for(let k=0;k<3;k++)for(let a=0;a<2;a++){c.fillStyle=night?'#eac584':'#a9b9aa';c.fillRect(x+6+a*14,y-bh+8+k*14,6,8);}
  }
  // Court-inspired cupola, scenic geometry only.
  c.fillStyle='#b7aaa0';c.fillRect(205,260,46,67);poly([[192,260],[228,219],[266,260]],'#655961');c.fillRect(223,205,10,24);
  // The small riverboat visibly moves in foreground.
  const boatX=760+Math.sin(t*.34)*85,boatY=518+Math.sin(t*1.4)*3;
  poly([[boatX-125,boatY+5],[boatX+140,boatY+5],[boatX+109,boatY+41],[boatX-90,boatY+41]],'#34454b');c.fillStyle='#f1e7d2';c.fillRect(boatX-44,boatY-46,103,52);c.fillStyle='#9b6257';c.fillRect(boatX-51,boatY-52,117,10);c.fillStyle='#e6b971';c.fillRect(boatX+10,boatY-77,12,31);c.fillStyle='#75959c';for(let k=0;k<4;k++)c.fillRect(boatX-32+k*23,boatY-30,15,15);
  // Riverside path and lamppost.
  poly([[0,530],[290,503],[436,720],[0,720]],'#4a473e');line([[290,503],[435,720]],'#e1bd83',6);
  for(const x of [61,149,248]){line([[x,522],[x+3,440]],'#333a38',6);oval(x+3,439,8,12,night?'#ffdca1':'#f6ecd0');}
 }else if(sceneId==='farm'){
  const g=c.createLinearGradient(0,380,0,720);g.addColorStop(0,'#638256');g.addColorStop(1,'#9c8453');c.fillStyle=g;c.fillRect(0,420,w,300);
  for(let i=0;i<22;i++){let x=640+(i-11)*140;poly([[x,422],[x+8,422],[x+110,720],[x+80,720]],i%2?'rgba(63,82,41,.44)':'rgba(234,187,96,.42)');}
  // Farmhouse barn, sloped roof and copper silo.
  c.fillStyle='#a64f40';c.fillRect(245,305,278,191);poly([[226,314],[388,204],[544,314]],'#554b47');c.fillStyle='#e4bb7e';c.fillRect(358,377,62,119);c.fillStyle='#f2dca4';c.fillRect(271,351,41,45);c.fillRect(457,351,41,45);line([[390,377],[390,493]],'#88613c',5);
  c.fillStyle='#b3b2a5';c.fillRect(553,250,73,256);oval(590,248,38,19,'#cbd0ba');poly([[552,250],[590,222],[626,250]],'#727e7d');
  for(let i=0;i<16;i++){let x=i*81+12;oval(x,444+(i%3)*7,26,14,i%2?'#63743d':'#9cad61');}
 }else{
  // Woods: silhouettes, layers, foreground river mist, stylized wildlife in background.
  for(let i=0;i<35;i++){let x=i*41+(i%3)*13;let y=460+(i%5)*16;line([[x,y],[x,y-180-(i%3)*50]],'#312e28',8+i%4*2);
   poly([[x-50,y-69],[x,y-248-(i%3)*34],[x+50,y-69]],i%3?'#285340':'#1d4239');}
  poly([[0,598],[260,555],[520,620],[840,575],[1280,580],[1280,720],[0,720]],'#29433b');
  oval(705,561,61,31,'#a47a55');oval(757,532,22,24,'#b99062');for(const x of [665,703,746,759])line([[x,580],[x-3,631]],'#67523b',8);
  line([[756,522],[771,494],[785,482]],'#d5ac74',5);line([[771,494],[766,480]],'#d5ac74',3);
  if(night){for(let i=0;i<35;i++){let x=(i*187)%1280+Math.sin(t*.7+i)*9,y=410+(i*67)%245+Math.cos(t*1.8+i)*12;oval(x,y,2+(i%3),2+(i%3),'rgba(255,221,118,.7)');}}
 }
 if(storm){for(let i=0;i<(quality==='lite'?35:180);i++){let x=(i*79+t*210)%1400-60,y=(i*137+t*380)%750;line([[x,y],[x-9,y+31]],'rgba(222,236,248,.37)',1.5);}}
 // Controlled cinematic vignette (in original scene, not browser color filter).
 let vig=c.createRadialGradient(w/2,h/2,140,w/2,h/2,850);vig.addColorStop(0,'rgba(0,0,0,0)');vig.addColorStop(1,'rgba(8,16,29,.51)');c.fillStyle=vig;c.fillRect(0,0,w,h);
 c.fillStyle='#f9f2d8';c.font='bold 17px system-ui';c.fillText('RIVER VALLEY · CINEMATIC BACKDROPS',34,54);
 c.font='italic 28px Georgia';c.fillText(SCENES[sceneId]||SCENES.riverfront,34,87);
 c.font='12px system-ui';c.fillText('Original procedural concept scene · NOT a photograph or surveyed 3D render',34,694);
 return true;
}
return {SCENES,render};
});
