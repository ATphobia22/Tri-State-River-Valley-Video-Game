import * as THREE from 'three';
// GeoJSON parcel boundaries are batched by game zone; existing tiled building meshes are untouched.
const colors={NONE:0xbbaa7d,R1:0x95cc8a,R2:0x70c6c3,R3:0x5d94df,C:0xe4c36b,I:0xc38b8b,AG:0xb4b968};
export function createZoningView(root,manifest,heightAt,sim){
  const layer=new THREE.Group();layer.name='Simulation zoning';root.add(layer);
  let selected=null;
  const xy=([lon,lat])=>[(lon-manifest.origin[0])*manifest.metresPerDegree[0],(manifest.origin[1]-lat)*manifest.metresPerDegree[1]];
  const rings=g=>g.type==='Polygon'?g.coordinates:g.type==='MultiPolygon'?g.coordinates.flatMap(p=>p):[];
  function refresh(){
    while(layer.children.length){
      const o=layer.children[0];o.removeFromParent();o.geometry?.dispose();
      for(const m of [].concat(o.material||[]))m?.dispose();
    }
    const buckets=new Map();
    for(const f of sim.collection.features){
      const s=sim.state.get(f.id);if(!s)continue;
      const color=selected===f.id?0xffef8e:colors[s.zone]||colors.NONE;
      if(!buckets.has(color))buckets.set(color,[]);
      for(const ring of rings(f.geometry))for(let i=0;i<ring.length-1;i++){
        const [a,b]=xy(ring[i]),[c,d]=xy(ring[i+1]);
        buckets.get(color).push(a,heightAt(a,b)+.25,b,c,heightAt(c,d)+.25,d);
      }
      // Procedural additions use parcel footprints. Existing buildings remain in the GIS tile layer.
      if(s.built&&!sim.base.get(f.id).built){
        const ring=rings(f.geometry)[0];if(!ring||ring.length<4)continue;
        const coords=ring.slice(0,-1).map(xy);
        const x=coords.reduce((a,p)=>a+p[0],0)/coords.length,z=coords.reduce((a,p)=>a+p[1],0)/coords.length;
        const sh=new THREE.Shape();
        coords.forEach(([a,b],i)=>i?sh.lineTo((a-x)*.68,-(b-z)*.68):sh.moveTo((a-x)*.68,-(b-z)*.68));
        sh.closePath();
        const geo=new THREE.ExtrudeGeometry(sh,{depth:3.2+s.building_level*2.5,bevelEnabled:false});geo.rotateX(-Math.PI/2);
        const m=new THREE.Mesh(geo,new THREE.MeshStandardMaterial({color:colors[s.zone]||colors.R1,roughness:.9}));
        m.position.set(x,heightAt(x,z)+.2,z);m.castShadow=true;layer.add(m);
      }
    }
    for(const [color,v] of buckets){
      const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(v,3));
      const lines=new THREE.LineSegments(g,new THREE.LineBasicMaterial({color,transparent:true,opacity:.85}));
      lines.frustumCulled=false;layer.add(lines);
    }
  }
  function select(id){selected=id==null?null:String(id);refresh();}
  refresh();layer.visible=false;
  return {layer,refresh,select,get selected(){return selected;}};
}
