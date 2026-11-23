/* Point Township Family + Friends: user-provided collectible-box reference registry.
 * Reference photography is local-only until deliberately imported.
 * Packaging names are labels, not independently verified identities.
 * No image is an automatically rigged or playable 3D character.
 */
(function(root,factory){const api=factory(root);if(typeof module==='object'&&module.exports)module.exports=api;else root.ValleyFamilyCast=api;})(typeof globalThis==='object'?globalThis:this,function(root){
'use strict';
const ENTRIES=Object.freeze([
 {id:'pete-yeida',number:'01',name:'Pete Yeida',kind:'figure',style:'Orange knit cap; eyeglasses; light-blue work shirt; blue jeans; brown boots',imageSource:'IMG_4646(1).jpeg'},
 {id:'larry-goldman',number:'02',name:'Larry Goldman',kind:'figure',style:'Dark baseball cap; sunglasses and mustache; bark-pattern hunting jacket; jeans',imageSource:'IMG_4635.jpeg'},
 {id:'richard-stratton',number:'03',name:'Richard Stratton',kind:'figure',style:'Orange knit cap; gray beard; black-and-gray plaid overshirt; jeans; ATV display',imageSource:'file_1792041563104.jpeg'},
 {id:'marcus-stevens',number:'04',name:'Marcus Stevens',kind:'figure',style:'Orange knit cap; sunglasses; dark beard; green camouflage jacket and trousers',imageSource:'IMG_4639.jpeg'},
 {id:'roy-tenney',number:'05',name:'Roy Tenney',kind:'figure',style:'Red knit cap; mustache; bark-camouflage jacket; blue layered hood; jeans',imageSource:'IMG_4636.jpeg'},
 {id:'bill-tucker',number:'06',name:'Bill Tucker',kind:'figure',style:'Light camouflage cap; bark-camouflage hooded jacket; red inner collar; jeans',imageSource:'file_1792041191233.png'},
 {id:'wally-wallace',number:'07',name:'Wally Wallace',kind:'figure',style:'Camo cap; eyeglasses; gray beard; camouflage jacket; olive pants',imageSource:'IMG_4645.jpeg'},
 {id:'allen-tucker',number:'08',name:'Allen Tucker',kind:'figure',style:'Camouflage baseball cap and long-sleeve shirt; jeans; deer-antler display',imageSource:'IMG_4637.jpeg'},
 {id:'tucker-family-set',number:null,name:'The Tucker Family',kind:'group',style:'Special-edition group in a Point Township Family + Friends collector box',imageSource:'IMG_4643.jpeg'},
 {id:'yeida-family-set',number:null,name:'The Yeida Family',kind:'memorial',style:'Family collector set with “In memory of Tony” and “In memory of Jerry” inscriptions',imageSource:'IMG_4657.jpeg'}
].map(e=>Object.freeze({...e,source:'user-2026-11-22',assetStatus:'PHOTO_REFERENCE_ONLY',playable:false})));
const DB='river-valley-figure-references-v1',STORE='photos',MAX_PHOTO=3_000_000;
function byId(id){return ENTRIES.find(x=>x.id===id)||null;}
function validatePhoto(file){
 if(!file||!['image/jpeg','image/png','image/webp'].includes(file.type))throw Error('Select a local JPG, PNG, or WebP photograph');
 if(!Number.isFinite(file.size)||file.size<100||file.size>MAX_PHOTO)throw Error('Local reference photograph must be under 3 MB');
 return {bytes:file.size,mime:file.type};
}
function openDB(){
 return new Promise((resolve,reject)=>{
  if(!root.indexedDB)return reject(Error('Offline photo storage unavailable'));
  const req=root.indexedDB.open(DB,1);
  req.onupgradeneeded=()=>{if(!req.result.objectStoreNames.contains(STORE))req.result.createObjectStore(STORE);};
  req.onerror=()=>reject(req.error||Error('Unable to open offline photos'));
  req.onsuccess=()=>resolve(req.result);
 });
}
async function transaction(mode,fn){
 const db=await openDB();
 try{return await new Promise((resolve,reject)=>{
  const tx=db.transaction(STORE,mode);const request=fn(tx.objectStore(STORE));
  request.onsuccess=()=>resolve(request.result||null);
  request.onerror=()=>reject(request.error||Error('Offline photo access failed'));
  tx.onerror=()=>reject(tx.error||Error('Offline reference transaction failed'));
 });}finally{db.close();}
}
function readPhoto(id){if(!byId(id))return Promise.reject(Error('Unknown figure'));return transaction('readonly',st=>st.get(id));}
function writePhoto(id,blob){if(!byId(id))return Promise.reject(Error('Unknown figure'));validatePhoto(blob);return transaction('readwrite',st=>st.put(blob,id));}
function removePhoto(id){if(!byId(id))return Promise.reject(Error('Unknown figure'));return transaction('readwrite',st=>st.delete(id));}
function install(){
 const doc=root.document;if(!doc)return null;
 const panel=doc.getElementById('familyCastPanel'),open=doc.getElementById('familyCastOpen'),close=doc.getElementById('familyCastClose'),grid=doc.getElementById('familyCastGrid'),status=doc.getElementById('familyCastStatus');
 if(!panel||!open||!close||!grid||!status)return null;
 const urls=new Map();
 function release(){for(const url of urls.values())URL.revokeObjectURL(url);urls.clear();}
 function makeCard(ref){
  const card=doc.createElement('article');card.className='familyCastCard';
  const figure=doc.createElement('div');figure.className='familyCastPortrait';
  const placeholder=doc.createElement('span');placeholder.textContent=ref.kind==='memorial'?'🕯️':ref.kind==='group'?'👨‍👩‍👧‍👦':'🧍';placeholder.className='familyCastPlaceholder';
  figure.append(placeholder);
  const label=doc.createElement('small');label.textContent=ref.number?'FIG. '+ref.number:'COLLECTOR SET';
  const title=doc.createElement('h3');title.textContent=ref.name;
  const description=doc.createElement('p');description.textContent=ref.style;
  const note=doc.createElement('small');note.textContent=ref.kind==='memorial'?'Commemorative reference only; no playable NPC.':'Photo reference only; no rigged 3D model supplied.';
  const input=doc.createElement('input');input.type='file';input.accept='image/jpeg,image/png,image/webp';input.setAttribute('aria-label','Import local reference photograph for '+ref.name);
  const remove=doc.createElement('button');remove.type='button';remove.textContent='Clear photo';
  remove.addEventListener('click',async()=>{
   try{await removePhoto(ref.id);const previous=urls.get(ref.id);if(previous)URL.revokeObjectURL(previous);urls.delete(ref.id);figure.replaceChildren(placeholder);status.textContent='Local photo cleared: '+ref.name;}
   catch(error){status.textContent='Unable to clear saved photo on this browser: '+String(error.message);}
  });
  input.addEventListener('change',async()=>{
   const file=input.files?.[0];if(!file)return;
   try{
    validatePhoto(file);await writePhoto(ref.id,file);
    const old=urls.get(ref.id);if(old)URL.revokeObjectURL(old);
    const url=URL.createObjectURL(file);urls.set(ref.id,url);
    const img=doc.createElement('img');img.src=url;img.alt='User-imported collectible-box reference for '+ref.name;
    figure.replaceChildren(img);status.textContent='Saved '+ref.name+' reference photograph locally for offline viewing.';
   }catch(error){status.textContent='Photo not stored: '+String(error.message);}
  });
  if(ref.kind==='figure'){
   const play=doc.createElement('button');play.type='button';play.className='castPrototypeSelect';play.textContent='Play stylized 3D prototype';play.setAttribute('aria-label','Play stylized three-dimensional prototype based on '+ref.name);
   play.addEventListener('click',()=>{
    const wardrobe=root.ValleyCastWardrobe;
    if(!wardrobe?.STYLE?.[ref.id]){status.textContent='Prototype wardrobe assets unavailable; original hero preserved.';return;}
    wardrobe.saveSelection(ref.id);
    root.ValleyCastBridge?.applySelection?.();
    status.textContent='Selected '+ref.name+' wardrobe prototype for gameplay. This is a generic 27-joint avatar with inspired clothing, not an exact 3D likeness.';
   });
   card.append(play);
  }
  card.append(figure,label,title,description,note,input,remove);
  return {card,figure,placeholder};
 }
 async function show(){
  grid.replaceChildren();release();panel.hidden=false;open.setAttribute('aria-expanded','true');status.textContent='Reference-only figures; no new 3D actors are implied.';
  const created=ENTRIES.map(ref=>({ref,...makeCard(ref)}));
  for(const x of created)grid.append(x.card);
  close.focus();
  await Promise.all(created.map(async x=>{
   try{
    const file=await readPhoto(x.ref.id);
    if(!file||panel.hidden)return;
    const url=URL.createObjectURL(file);urls.set(x.ref.id,url);
    const img=doc.createElement('img');img.src=url;img.alt='Saved local collectible-box photo for '+x.ref.name;x.figure.replaceChildren(img);
   }catch(_){}
  }));
 }
 function hide(){panel.hidden=true;open.setAttribute('aria-expanded','false');release();open.focus();}
 open.addEventListener('click',show);close.addEventListener('click',hide);
 doc.addEventListener('keydown',e=>{if(e.key==='Escape'&&!panel.hidden)hide();});
 return Object.freeze({show,hide,get open(){return !panel.hidden;}});
}
return Object.freeze({ENTRIES,byId,validatePhoto,readPhoto,writePhoto,removePhoto,install,MAX_PHOTO,DB});
});