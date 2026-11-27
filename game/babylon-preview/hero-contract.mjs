/** Deterministic runtime admission for the repository's generated River Explorer GLB. */
const HEX_SHA=/^[0-9a-f]{64}$/i;
const ACTIONS=Object.freeze(['Idle','Walk','Run','Sprint','FishingCast','Cook','Track','Drive','Interact','Jump','Land','Farm','Wave']);
export function chooseHeroAction(distance,dt,sprint=false){
 if(!Number.isFinite(distance)||distance<=0||!Number.isFinite(dt)||dt<=0)return 'Idle';
 const speed=distance/dt;
 if(speed<0.05)return 'Idle';
 return sprint&&speed>=11?'Sprint':speed>=11?'Run':'Walk';
}
export async function verifyHeroBytes(bytes,manifest,subtle=globalThis.crypto?.subtle){
 if(!(bytes instanceof Uint8Array))throw Error('GLB bytes must be Uint8Array');
 if(!manifest||manifest.name!=='RiverExplorer'||manifest.boneCount!==27)
  throw Error('incompatible rig manifest');
 if(!Array.isArray(manifest.clips)||ACTIONS.some(a=>!manifest.clips.includes(a))||manifest.clips.length!==13)
  throw Error('incompatible animation clips');
 if(!Number.isSafeInteger(manifest.bytes)||manifest.bytes!==bytes.byteLength||!HEX_SHA.test(manifest.sha256||''))
  throw Error('GLB size or SHA256 metadata mismatch');
 if(bytes.byteLength<20||bytes[0]!==0x67||bytes[1]!==0x6c||bytes[2]!==0x54||bytes[3]!==0x46)
  throw Error('invalid GLB magic');
 const view=new DataView(bytes.buffer,bytes.byteOffset,bytes.byteLength);
 if(view.getUint32(4,true)!==2||view.getUint32(8,true)!==bytes.byteLength)throw Error('invalid GLB version or length');
 if(!subtle?.digest)throw Error('Web Crypto SHA256 unavailable');
 const hash=Array.from(new Uint8Array(await subtle.digest('SHA-256',bytes))).map(value=>value.toString(16).padStart(2,'0')).join('');
 if(hash!==manifest.sha256.toLowerCase())throw Error('GLB SHA256 integrity mismatch');
 return Object.freeze({bytes:bytes.byteLength,sha256:hash});
}
export const REQUIRED_HERO_ACTIONS=ACTIONS;

/** Babylon 9 can expose disposal as a boolean property; older adapters use a method. */
export function isSceneDisposed(scene){
 if(!scene)return true;
 return typeof scene.isDisposed==='function'?Boolean(scene.isDisposed()):scene.isDisposed===true;
}
