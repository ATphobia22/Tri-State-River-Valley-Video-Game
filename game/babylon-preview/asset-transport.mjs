/** Bounded same-origin asset transport for future PMTiles/3D Tiles streaming.
 * SHA-256 byte identity never certifies geographic coordinates or a survey.
 */
const MAX_BYTES=32*1024*1024;
const SHA_RE=/^[0-9a-f]{64}$/i;
const MAGIC_KTX2=[0xab,0x4b,0x54,0x58,0x20,0x32,0x30,0xbb,0x0d,0x0a,0x1a,0x0a];
function validateMagic(bytes,kind){
 if(kind==='glb'){
  if(bytes.length<12||String.fromCharCode(...bytes.subarray(0,4))!=='glTF')throw Error('invalid GLB magic');
  const header=new DataView(bytes.buffer,bytes.byteOffset,12);
  if(header.getUint32(4,true)!==2||header.getUint32(8,true)!==bytes.length)throw Error('invalid GLB header length/version');
 }else if(kind==='ktx2'){
  if(bytes.length<12||!MAGIC_KTX2.every((v,i)=>bytes[i]===v))throw Error('invalid KTX2 magic');
 }else if(kind==='pmtiles'){
  if(bytes.length<8||String.fromCharCode(...bytes.subarray(0,7))!=='PMTiles'||bytes[7]!==3)throw Error('invalid PMTiles v3 magic');
 }else if(kind==='tileset'){
  const document=JSON.parse(new TextDecoder('utf-8',{fatal:true}).decode(bytes));
  if(!document||typeof document!=='object'||!document.asset?.version||!document.root?.boundingVolume)throw Error('invalid 3D Tiles root manifest');
 }else throw Error('unknown asset kind');
}
async function limitedRead(response,maximum){
 const declared=Number(response.headers.get('Content-Length'));
 if(Number.isFinite(declared)&&declared>maximum)throw Error('response exceeds max byte budget');
 if(!response.body){const v=new Uint8Array(await response.arrayBuffer());if(v.length>maximum)throw Error('response exceeds max byte budget');return v;}
 const reader=response.body.getReader();let size=0;const parts=[];
 try{
  while(true){const {done,value}=await reader.read();if(done)break;size+=value.byteLength;
   if(size>maximum){await reader.cancel('max byte budget exceeded');throw Error('response exceeds max byte budget');}
   parts.push(value);
  }
 }finally{reader.releaseLock();}
 const out=new Uint8Array(size);let offset=0;for(const part of parts){out.set(part,offset);offset+=part.length;}return out;
}
export function createAssetTransport({origin=globalThis.location?.origin,fetchImpl=globalThis.fetch,maxBytes=MAX_BYTES}={}){
 if(typeof origin!=='string'||!origin.startsWith('http')||typeof fetchImpl!=='function'||!Number.isSafeInteger(maxBytes)||maxBytes<12)throw Error('valid origin, fetch and max byte budget required');
 const allowed=new URL(origin).origin;
 function urlFor(input){
  if(typeof input!=='string'||!input)throw Error('asset URL required');
  const url=new URL(input,allowed+'/');
  if(url.username||url.password)throw Error('embedded credentials prohibited');
  if(url.origin!==allowed||!['https:','http:'].includes(url.protocol))throw Error('origin is not approved');
  if(url.hash)throw Error('URL fragments not allowed');
  return url.href;
 }
 async function readRange(input,start,length,{signal,requireVersion=false,etag,totalBytes}={}){
  const url=urlFor(input);
  if(!Number.isSafeInteger(start)||start<0||!Number.isSafeInteger(length)||length<1||length>maxBytes||!Number.isSafeInteger(start+length-1))throw Error('invalid range or max byte budget');
  const end=start+length-1;
  const strong=value=>typeof value==='string'&&/^"[^"\r\n]*"$/.test(value);
  if(etag!==undefined&&!strong(etag))throw Error('strong archive version required');
  if(totalBytes!==undefined&&(!Number.isSafeInteger(totalBytes)||totalBytes<=end))throw Error('invalid archive total');
  const headers={Range:'bytes='+start+'-'+end};
  if(etag!==undefined)headers['If-Match']=etag;
  const response=await fetchImpl(url,{headers,signal,redirect:'error'});
  if(response.redirected||(response.url&&response.url!==url))throw Error('redirect prohibited');
  if(response.status!==206)throw Error('HTTP 206 required for byte range');
  const header=response.headers.get('Content-Range')||'';
  const m=/^bytes (\d+)-(\d+)\/(\d+|\*)$/.exec(header);
  if(!m||Number(m[1])!==start||Number(m[2])!==end||!Number.isSafeInteger(Number(m[3]))||Number(m[3])<=end)throw Error('incorrect Content-Range');
  const total=Number(m[3]),version=response.headers.get('ETag');
  if((requireVersion||etag!==undefined)&&!strong(version))throw Error('strong archive version required');
  if((etag!==undefined&&version!==etag)||(totalBytes!==undefined&&total!==totalBytes))throw Error('archive version changed');
  const bytes=await limitedRead(response,length);
  if(bytes.length!==length)throw Error('incorrect range byte count');
  return {url,bytes,byteLength:bytes.length,verified:false,trust:'UNVERIFIED_RANGE',etag:version,totalBytes:total};
 }
 async function fetchVerified(input,{sha256,expectedBytes,kind,signal}={}){
  const url=urlFor(input);
  if(!SHA_RE.test(sha256||'')||!Number.isSafeInteger(expectedBytes)||expectedBytes<1||expectedBytes>maxBytes)throw Error('sha256 digest and bounded expectedBytes required');
  const response=await fetchImpl(url,{signal,redirect:'error'});
  if(response.redirected||(response.url&&response.url!==url))throw Error('redirect prohibited');
  if(response.status!==200)throw Error('HTTP 200 required for complete asset');
  const bytes=await limitedRead(response,expectedBytes);
  if(bytes.length!==expectedBytes)throw Error('asset expected byte length mismatch');
  validateMagic(bytes,kind);
  if(!globalThis.crypto?.subtle)throw Error('Web Crypto SHA-256 unavailable');
  const hash=Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',bytes)),n=>n.toString(16).padStart(2,'0')).join('');
  if(hash.toLowerCase()!==sha256.toLowerCase())throw Error('asset SHA-256 digest mismatch');
  return {url,bytes,byteLength:bytes.length,sha256:hash,verified:true,trust:'BYTE_INTEGRITY_ONLY'};
 }
 return Object.freeze({readRange,fetchVerified});
}
