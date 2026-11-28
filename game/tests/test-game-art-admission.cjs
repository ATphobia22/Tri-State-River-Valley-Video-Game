const test=require('node:test');
const assert=require('node:assert/strict');
const {pathToFileURL}=require('node:url');
const path=require('node:path');
const source=pathToFileURL(path.resolve(__dirname,'../babylon-preview/game-art-admission.mjs')).href;
const fixture=()=>({id:'courthouse-preview',kind:'building',license:'CC0-1.0',
 source:'Indiana GIO / original artistic extrusion',technicallyUsable:true,
 integrityVerified:true,geometry:{vertices:120,triangles:80},
 surveyVerified:false,registrationVerified:false,verticalDatumVerified:false});
test('admits technically sound unregistered artistic game geometry',async()=>{
 const {assessGameArt}=await import(source);
 const result=assessGameArt(fixture());
 assert.equal(result.admitted,true);assert.equal(result.surveyAuthority,false);
 assert.equal(result.requiresSurveyControl,false);assert.equal(result.geodeticRegistrationRequired,false);
});
test('rejects missing provenance, license, integrity and unusable geometry',async()=>{
 const {assessGameArt}=await import(source);
 const bad={...fixture(),license:'unknown',source:'',integrityVerified:false,geometry:{vertices:0,triangles:2}};
 const result=assessGameArt(bad);assert.equal(result.admitted,false);
 for(const reason of ['unapproved-license','missing-source','integrity-not-verified','invalid-mesh-budgets'])
  assert.ok(result.reasons.includes(reason));
});
test('preserves attribution, share-alike and proprietary distribution checks',async()=>{
 const {assessGameArt}=await import(source);
 assert.ok(assessGameArt({...fixture(),license:'CC-BY-4.0'}).reasons.includes('missing-attribution'));
 assert.ok(assessGameArt({...fixture(),license:'CC-BY-SA-4.0',attribution:'Source author'}).reasons.includes('share-alike-not-confirmed'));
 assert.ok(assessGameArt({...fixture(),license:'licensed-proprietary'}).reasons.includes('distribution-not-authorized'));
});
test('never admits opaque or malformed payloads',async()=>{
 const {assessGameArt}=await import(source);
 assert.equal(assessGameArt(null).admitted,false);
 assert.equal(assessGameArt({...fixture(),geometry:undefined}).admitted,false);
 assert.equal(assessGameArt({...fixture(),id:'../oops'}).admitted,false);
});
