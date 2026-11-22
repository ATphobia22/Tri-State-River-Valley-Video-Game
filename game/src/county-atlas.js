/* Posey County Atlas: real Indiana GIO boundary and Census place centroids,
 * rendered as a 2D navigation overlay in the SAME offline game.
 * Travel destinations are explicitly labeled local interpretive vignettes,
 * not a claim of countywide surveyed 3D tiles. */
(function(root,factory){const api=factory(root);if(typeof module==='object'&&module.exports)module.exports=api;else root.ValleyCountyAtlas=api;})(typeof globalThis==='object'?globalThis:this,function(root){
'use strict';
const DATA=root.ValleyPoseyCounty;
const STAGES=Object.freeze({
 'mount-vernon':{x:16,z:504,title:'Downtown Mount Vernon',theme:'riverfront'},
 'new-harmony':{x:-1650,z:510,title:'New Harmony Heritage Garden',theme:'heritage'},
 'griffin':{x:1590,z:-1600,title:'Griffin Woodland Trail',theme:'woods'},
 'poseyville':{x:-1830,z:-1670,title:'Poseyville Farm Market',theme:'farm'},
 'cynthiana':{x:1670,z:430,title:'Cynthiana Grove',theme:'grove'}
});
function stage(id){const item=STAGES[id];return item?{...item,geographicAccuracy:'illustrative'}:null;}
function inside(lon,lat,ring){
 if(!Array.isArray(ring)||ring.length<3||![lon,lat].every(Number.isFinite))return false;
 let result=false;
 for(let i=0,j=ring.length-1;i<ring.length;j=i++){
  const a=ring[i],b=ring[j];
  if(((a[1]>lat)!==(b[1]>lat))&&lon<(b[0]-a[0])*(lat-a[1])/(b[1]-a[1])+a[0])result=!result;
 }
 return result;
}
function project(lon,lat,{width,height},data=DATA){
 if(!data||!data.bbox||![lon,lat,width,height].every(Number.isFinite)||width<=0||height<=0)throw Error('Invalid county map projection');
 const [west,south,east,north]=data.bbox,centerLon=(west+east)/2,centerLat=(north+south)/2;
 const cos=Math.cos(centerLat*Math.PI/180),pad=Math.max(12,Math.min(width,height)*.065);
 const scale=Math.min((width-2*pad)/((east-west)*cos),(height-2*pad)/(north-south));
 return {x:width/2+(lon-centerLon)*cos*scale,y:height/2-(lat-centerLat)*scale};
}
function pickTown(x,y,size,data=DATA){
 if(!data||!Array.isArray(data.places)||!Number.isFinite(x)||!Number.isFinite(y))return null;
 let best=null,dist=Infinity;
 for(const p of data.places){
  const pos=project(p.lon,p.lat,size,data),d=Math.hypot(pos.x-x,pos.y-y);
  if(d<dist&&d<=22){best=p;dist=d;}
 }
 return best;
}
function draw(canvas,{selected='mount-vernon',visited=[]}={},data=DATA){
 if(!canvas?.getContext||!data)return false;
 const width=canvas.width,height=canvas.height,ctx=canvas.getContext('2d');
 if(!ctx)return false;
 ctx.clearRect(0,0,width,height);
 ctx.fillStyle='#0e2330';ctx.fillRect(0,0,width,height);
 const ring=data.boundary||[];if(ring.length<3)return false;
 ctx.beginPath();
 for(let i=0;i<ring.length;i++){const p=project(ring[i][0],ring[i][1],{width,height},data);if(i===0)ctx.moveTo(p.x,p.y);else ctx.lineTo(p.x,p.y);}
 ctx.closePath();
 const fill=ctx.createLinearGradient(0,height,0,0);fill.addColorStop(0,'#456350');fill.addColorStop(.5,'#62765a');fill.addColorStop(1,'#869078');
 ctx.fillStyle=fill;ctx.fill();ctx.lineWidth=3;ctx.strokeStyle='#dfc789';ctx.stroke();
 ctx.save();ctx.clip();
 // Schematic, non-geospatial contour accents: decoration only.
 ctx.strokeStyle='rgba(215,224,195,.07)';ctx.lineWidth=1;
 for(let row=0;row<23;row++){ctx.beginPath();for(let x=0;x<=width;x+=9){const y=row*height/22+Math.sin(x/34+row*1.8)*9;if(x===0)ctx.moveTo(x,y);else ctx.lineTo(x,y);}ctx.stroke();}
 ctx.restore();
 ctx.font='bold 14px system-ui,sans-serif';ctx.textBaseline='middle';ctx.lineWidth=3;
 for(const p of data.places||[]){
  const loc=project(p.lon,p.lat,{width,height},data);
  const active=p.id===selected,seen=visited.includes(p.id);
  ctx.beginPath();ctx.arc(loc.x,loc.y,active?8:6,0,Math.PI*2);
  ctx.fillStyle=active?'#ffd57b':seen?'#a7e5ae':'#f0ebe0';ctx.fill();
  ctx.strokeStyle='#19303a';ctx.lineWidth=2;ctx.stroke();
  const tw=ctx.measureText(p.name).width,labelX=loc.x+12;
  ctx.fillStyle='rgba(8,28,34,.88)';ctx.fillRect(labelX-4,loc.y-11,tw+8,22);
  ctx.strokeStyle='rgba(253,242,196,.55)';ctx.lineWidth=.5;ctx.strokeRect(labelX-4,loc.y-11,tw+8,22);
  ctx.fillStyle=active?'#ffd57b':'#ffffff';ctx.fillText(p.name,labelX,loc.y+1);
 }
 ctx.font='12px system-ui,sans-serif';ctx.fillStyle='#d5e1db';
 ctx.fillText('Official county outline • schematic terrain decoration',14,height-15);
 return true;
}
return Object.freeze({stage,inside,project,pickTown,draw,STAGES});
});