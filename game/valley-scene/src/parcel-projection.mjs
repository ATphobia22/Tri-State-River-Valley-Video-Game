// Keep polygon rings and holes in source order for both drawing and picking.
export function projectParcels({buffer, origin, scales}) {
  const base = JSON.parse(new TextDecoder().decode(buffer));
  const polygons = base.features.map(({geometry}) => {
    const parts = geometry.type === 'Polygon' ? [geometry.coordinates] :
      geometry.type === 'MultiPolygon' ? geometry.coordinates : [];
    return parts.map(poly => poly.map(ring => ring.map(([lon, lat]) =>
      [(lon-origin[0])*scales[0], (origin[1]-lat)*scales[1]])));
  });
  return {base, polygons};
}

export async function prepareParcels(input) {
  let worker, url;
  try {
    const code = 'const project=' + projectParcels.toString() +
      ';onmessage=({data})=>postMessage(project(data));';
    url = URL.createObjectURL(new Blob([code], {type:'text/javascript'}));
    worker = new Worker(url, {name:'Parcel projection'});
    return await new Promise((resolve, reject) => {
      worker.onmessage = event => resolve({...event.data, mode:'worker'});
      worker.onmessageerror = reject;
      worker.onerror = event => {event.preventDefault(); reject(event.message);};
      worker.postMessage(input);
    });
  } catch {
    return {...projectParcels(input), mode:'inline'};
  } finally {
    worker?.terminate();
    if (url) URL.revokeObjectURL(url);
  }
}
