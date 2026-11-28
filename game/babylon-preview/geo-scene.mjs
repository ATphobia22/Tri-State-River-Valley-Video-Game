/** Horizontally georeferenced WGS84 scene geometry; no terrain/roof-height claim. */
const RAD = Math.PI / 180;
const EARTH_RADIUS = 6371008.8;
const MAX_LINES = 700;
const MAX_VERTICES = 24000;
export function validPoint(value) {
  return Array.isArray(value) && value.length >= 2 &&
    Number.isFinite(value[0]) && Number.isFinite(value[1]) &&
    Math.abs(value[0]) <= 180 && Math.abs(value[1]) <= 90;
}
export function localMeters(point, origin) {
  if (!validPoint(point) || !validPoint(origin)) throw Error('valid WGS84 lon/lat required');
  const latitude = origin[1] * RAD;
  const x = (point[0] - origin[0]) * RAD * EARTH_RADIUS * Math.cos(latitude);
  const z = -(point[1] - origin[1]) * RAD * EARTH_RADIUS;
  return [x, z];
}
export function aerialPlane(bbox, origin) {
  if (!Array.isArray(bbox) || bbox.length !== 4 ||
      !bbox.every(Number.isFinite) || bbox[0] >= bbox[2] || bbox[1] >= bbox[3])
    throw Error('invalid image geographic bounds');
  const corners = [
    [bbox[0], bbox[3]], [bbox[2], bbox[3]],
    [bbox[2], bbox[1]], [bbox[0], bbox[1]]
  ];
  if (!corners.every(validPoint)) throw Error('invalid WGS84 extent');
  const positions = [];
  for (const corner of corners) {
    const [x,z] = localMeters(corner, origin);
    positions.push(x, -0.2, z);
  }
  return Object.freeze({
    positions, indices:[0,2,1,0,3,2],
    // NW, NE, SE, SW. Source image is north-up.
    uvs:[0,1,1,1,1,0,0,0],
    center:origin.slice(0,2), sourceHorizontalCRS:'EPSG:4326',
    elevationStatus:'UNVERIFIED_FLAT_REFERENCE_ONLY'
  });
}
function sequences(geometry) {
  if (!geometry) return [];
  if (geometry.type === 'LineString') return [geometry.coordinates];
  if (geometry.type === 'MultiLineString') return geometry.coordinates;
  if (geometry.type === 'Polygon') return geometry.coordinates.length === 1 ? [geometry.coordinates[0]] : [];
  if (geometry.type === 'MultiPolygon')
    return geometry.coordinates.filter(p => p.length === 1).map(p => p[0]);
  return [];
}
/** Decimate outside the local window and bound every emitted segment. */
export function geographicLines(collection, origin, {radiusMeters=650, maxLines=MAX_LINES, maxVertices=MAX_VERTICES}={}) {
  if (!validPoint(origin) || !Number.isFinite(radiusMeters) || radiusMeters <= 0 ||
      !Number.isInteger(maxLines) || maxLines < 1 || maxLines > 2000 ||
      !Number.isInteger(maxVertices) || maxVertices < 2 || maxVertices > 50000)
    throw Error('invalid geographic viewport budget');
  const lines = [];
  let totalVertices = 0;
  for (const feature of collection?.features || []) {
    if (lines.length >= maxLines || totalVertices >= maxVertices) break;
    for (const seq of sequences(feature?.geometry)) {
      if (!Array.isArray(seq) || lines.length >= maxLines) break;
      let segment = [];
      const flush = () => {
        if (segment.length >= 2 && lines.length < maxLines) lines.push(segment);
        segment=[];
      };
      for (const point of seq) {
        if (!validPoint(point)) { flush(); continue; }
        const [x,z] = localMeters(point,origin);
        if (Math.hypot(x,z) > radiusMeters) { flush(); continue; }
        if (totalVertices >= maxVertices) { flush(); break; }
        segment.push([x,0,z]);
        totalVertices++;
      }
      flush();
    }
  }
  return lines;
}
