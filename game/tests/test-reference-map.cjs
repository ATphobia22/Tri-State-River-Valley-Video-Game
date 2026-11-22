const test=require('node:test'),assert=require('node:assert/strict');
const R=require('../src/reference-map.js');
test('world and WGS84 round trip at city, riverfront and game limits',()=>{for(const [x,z] of [[0,430],[16,504],[-1350,1050],[2450,-2450]]){const [lon,lat]=R.worldToLonLat(x,z),[xx,zz]=R.lonLatToWorld(lon,lat);assert.ok(Math.abs(xx-x)<1e-6);assert.ok(Math.abs(zz-z)<1e-6);}});
test('no north-south reversal in image and world coordinates',()=>{const rect=R.worldRect();assert.ok(rect.width>0&&rect.height>0);const a=R.worldToPixel(0,430),b=R.worldToPixel(0,600);assert.ok(b[1]>a[1]);});
test('pixel and WGS84 map positions are reversible',()=>{for(const p of [[0,0],[2048,1792],[800,650]]){const [x,z]=R.pixelToWorld(p[0],p[1]),q=R.worldToPixel(x,z);assert.ok(Math.abs(q[0]-p[0])<1e-7);assert.ok(Math.abs(q[1]-p[1])<1e-7);}});
test('bounding box rejects invalid coordinates',()=>{assert.equal(R.within(-87.895,37.931),true);assert.equal(R.within(-80,37),false);assert.throws(()=>R.worldRect([0,0,-1,-1]));});
test('geodesic distance is finite and symmetric',()=>{const a=[-87.895,37.9325],b=[-87.896,37.933];assert.ok(R.haversineMeters(a,b)>70);assert.ok(Math.abs(R.haversineMeters(a,b)-R.haversineMeters(b,a))<1e-8);});
test('geospatial reference roads do not use the prototype quarter-scale factor',()=>{const a=R.worldToLonLat(18,590),b=R.worldToLonLat(20,602);const roads=R.referenceRoadsToGame([{geometry:{type:'LineString',coordinates:[a,b]}}]);assert.equal(roads.length,1);assert.ok(Math.abs(roads[0][1][1]-602)<1e-6);});
