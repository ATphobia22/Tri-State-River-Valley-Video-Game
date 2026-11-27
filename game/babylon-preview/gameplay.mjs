/** Deterministic playable Babylon game state. All geometry here is illustrative, not surveyed. */
const KEY='river-babylon-webgl2-adventure-v1';
const BOUNDS=57,SPEED=9;
export const BUILDINGS=Object.freeze(Array.from({length:24},(_,i)=>Object.freeze({
 id:'block-'+i,x:(i%6-2.5)*15,z:(Math.floor(i/6)-1.5)*18,width:8,height:6+(i%4)*2,depth:9
})));
export const STOPS=Object.freeze([
 Object.freeze({id:'pier',title:'River Pier',x:-38,z:49}),
 Object.freeze({id:'grove',title:'Oak Grove',x:38,z:49}),
 Object.freeze({id:'farm',title:'Valley Farm',x:0,z:-50})
]);
const finite=n=>typeof n==='number'&&Number.isFinite(n);
const clamp=(n,a,b)=>Math.min(b,Math.max(a,n));
const collision=(x,z)=>BUILDINGS.some(b=>Math.abs(x-b.x)<b.width/2+2.5&&Math.abs(z-b.z)<b.depth/2+2.5);
const validPosition=(x,z)=>finite(x)&&finite(z)&&Math.abs(x)<=BOUNDS&&Math.abs(z)<=BOUNDS&&!collision(x,z);
export function getBrowserStorage(host){try{return host?.localStorage??null;}catch{return null;}}
export function createAdventure({storage=null}={}){
 let persisted={};
 try{persisted=JSON.parse(storage?.getItem(KEY)||'{}')||{};}catch{/* unavailable or damaged storage */}
 const ids=new Set(STOPS.map(s=>s.id));
 const discovered=new Set(Array.isArray(persisted.discovered)?persisted.discovered.filter(id=>ids.has(id)):[]);
 let x=0,z=49,hour=finite(persisted.hour)&&persisted.hour>=0&&persisted.hour<24?persisted.hour:16;
 if(validPosition(persisted.position?.x,persisted.position?.z)){x=persisted.position.x;z=persisted.position.z;}
 const save=()=>{try{storage?.setItem(KEY,JSON.stringify({version:1,discovered:[...discovered],hour,position:{x,z}}));}catch{/* no persistence permission */}};
 function move(dx,dz,dt,sprint=false){
  if(!finite(dx)||!finite(dz)||!finite(dt)||dt<=0)return snapshot();
  const n=Math.hypot(dx,dz);if(n<1e-9)return snapshot();
  const distance=Math.min(dt,1)*(sprint?15:SPEED),ux=dx/n,uz=dz/n,steps=Math.ceil(distance/1.25);
  for(let i=0;i<steps;i++){
   const nx=clamp(x+ux*distance/steps,-BOUNDS,BOUNDS);if(!collision(nx,z))x=nx;
   const nz=clamp(z+uz*distance/steps,-BOUNDS,BOUNDS);if(!collision(x,nz))z=nz;
  }
  return snapshot();
 }
 function nearby(){return STOPS.find(s=>Math.hypot(s.x-x,s.z-z)<=8)||null;}
 function discover(id){const stop=STOPS.find(s=>s.id===id);
  if(!stop||Math.hypot(stop.x-x,stop.z-z)>8||discovered.has(id))return {ok:false};
  discovered.add(id);save();return {ok:true,title:stop.title};
 }
 function setTime(t){if(!finite(t)||t<0||t>=24)return false;hour=t;save();return true;}
 function setPosition(nx,nz){if(!validPosition(nx,nz))return false;x=nx;z=nz;return true;}
 function snapshot(){return {position:{x,z},hour,discovered:[...discovered],total:STOPS.length,nearby:nearby()?.id||null};}
 return Object.freeze({move,nearby,discover,setTime,setPosition,snapshot});
}
