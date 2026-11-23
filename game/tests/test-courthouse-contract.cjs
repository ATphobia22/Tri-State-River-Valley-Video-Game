const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),crypto=require('node:crypto'),vm=require('node:vm'),path=require('node:path');
const root=path.join(__dirname,'..');
const get=p=>fs.readFileSync(path.join(root,p));
const manifest=JSON.parse(get('assets/models/MANIFEST.json'));
test('courthouse GLB has detailed cupola and facade architecture but no fabricated height authority',()=>{
 const art=manifest.models.find(x=>x.name==='courthouse');
 assert.ok(art,'Courthouse binary missing');
 assert.ok(art.bytes>23000,'Old five-box courthouse model is not a detailed replacement');
 assert.ok(art.meshes>=6);
 assert.equal(art.architecturalProvenance?.horizontalFootprintSourceObjectID,741267);
 assert.equal(art.architecturalProvenance?.heightEvidence,'UNMEASURED_ARTISTIC_PROPORTIONS');
 assert.ok(art.architecturalProvenance?.architecturalFeatures?.archedWindows>=40);
 assert.ok(art.bounds[1][1]>26&&art.bounds[1][1]<36);
 const binary=get('assets/models/courthouse.glb');
 assert.equal(binary.subarray(0,4).toString(),'glTF');
 assert.equal(crypto.createHash('sha256').update(binary).digest('hex'),art.sha256);
});
test('offline model bundle includes the exact source-built courthouse GLB',()=>{
 const scope={window:{}};vm.runInNewContext(get('data/models.js').toString(),scope);
 const packed=scope.window.ValleyModelData.courthouse;
 assert.ok(packed);
 assert.equal(crypto.createHash('sha256').update(Buffer.from(packed,'base64')).digest('hex'),
  manifest.models.find(m=>m.name==='courthouse').sha256);
});
test('2020 geometry is checksummed and horizontal-only with no roof lidar claim',()=>{
 const obj={window:{}};vm.runInNewContext(get('data/landmark-anchors.js').toString(),obj);
 const anchor=obj.window.ValleyLandmarkAnchors,proof=JSON.parse(get('reference/mount-vernon/landmark-anchors-receipt.json'));
 assert.equal(anchor.courthouse.footprintObjectID,741267);
 assert.equal(anchor.courthouse.sourceYear,2020);
 assert.equal(anchor.courthouse.roofHeightStatus,'UNVERIFIED_NOT_FROM_BARE_EARTH_DEM');
 assert.equal(anchor.courthouse.measuredRoofHeightMeters,null);
 assert.equal(proof.provenance.measuredRoofElevation,false);
 assert.equal(proof.provenance.inputSHA256,crypto.createHash('sha256').update(get('reference/mount-vernon/buildings.geojson')).digest('hex'));
});
test('game contains a single landmark mesh registered at source footprint, not displaced prototype',()=>{
 const s=get('src/game.js').toString();
 assert.match(s,/LANDMARKS\.courthouse/);
 assert.match(s,/group\.rotation\.y=angle/);
 assert.match(s,/courthouseFootprintIndex/);
 assert.match(s,/roofHeightStatus:match\.roofHeightStatus/);
});
