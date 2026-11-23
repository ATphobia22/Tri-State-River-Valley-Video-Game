// Player-circle versus authored rotated building rectangles. Never test render triangles.
export function resolveCircleBoxes(x,z,radius,boxes,passes=3){
  if(!(radius>0))throw Error('Invalid collision radius');
  for(let pass=0;pass<passes;pass++){
    let changed=false;
    for(const b of boxes){
      const c=Math.cos(b.yaw||0),s=Math.sin(b.yaw||0),dx=x-b.x,dz=z-b.z;
      if(!(b.halfX>0&&b.halfZ>0))continue;
      let a=c*dx-s*dz,d=s*dx+c*dz;
      const qa=Math.max(-b.halfX,Math.min(b.halfX,a));
      const qd=Math.max(-b.halfZ,Math.min(b.halfZ,d));
      let na=a-qa,nd=d-qd,len=Math.hypot(na,nd);
      if(len>=radius)continue;
      if(len>1e-8){const f=(radius-len)/len;a+=na*f;d+=nd*f;}
      else if(b.halfX-Math.abs(a)<=b.halfZ-Math.abs(d))a=(a<0?-1:1)*(b.halfX+radius);
      else d=(d<0?-1:1)*(b.halfZ+radius);
      x=b.x+c*a+s*d;z=b.z-s*a+c*d;changed=true;
    }
    if(!changed)break;
  }
  return {x,z};
}
