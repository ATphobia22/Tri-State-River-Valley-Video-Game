// One 3DEP-derived surface for rendering, walking, farms and placement. Local Y-up metres.
export function createHeightAt(grid,{size=201,min=-2000,step=20,scale=.01}={}){
  if(!grid||grid.length!==size*size||size<2||step<=0)throw Error('Invalid terrain grid');
  return (x,z)=>{
    const u=Math.max(0,Math.min(size-1,(x-min)/step));
    const v=Math.max(0,Math.min(size-1,(z-min)/step));
    const i=Math.min(size-2,Math.floor(u)),j=Math.min(size-2,Math.floor(v));
    const a=u-i,b=v-j,p=j*size+i,q=(j+1)*size+i;
    return ((1-b)*((1-a)*grid[p]+a*grid[p+1])+b*((1-a)*grid[q]+a*grid[q+1]))*scale;
  };
}
