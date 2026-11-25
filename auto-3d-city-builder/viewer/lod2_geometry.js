/**
 * WebGL LOD2 geometry helpers for Mount Vernon / River Valley open world.
 * CityGML LOD2 = solid walls + roof shape (gable/hip/flat).
 */
import * as THREE from 'three';

export const LOD2_VERSION = '1.0.0-webgl-pages';

export function configureRendererForPages(renderer, { maxRatio = 2 } = {}) {
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, maxRatio));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  if ('toneMapping' in renderer) {
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.05;
  }
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  return renderer;
}

export function buildLod2BuildingGeometry({
  width = 10, depth = 8, eaveHeight = 4, ridgeHeight = 6, roofType = 'gable',
} = {}) {
  const geom = new THREE.BoxGeometry(width, eaveHeight, depth);
  geom.translate(0, eaveHeight / 2, 0);
  const roof = new THREE.BufferGeometry();
  const hw = width / 2, hd = depth / 2;
  let positions, indices;
  if (roofType === 'hip') {
    positions = new Float32Array([-hw,eaveHeight,-hd, hw,eaveHeight,-hd, hw,eaveHeight,hd, -hw,eaveHeight,hd, 0,ridgeHeight,0]);
    indices = new Uint16Array([0,1,4, 1,2,4, 2,3,4, 3,0,4]);
  } else if (roofType === 'flat') {
    positions = new Float32Array([-hw,eaveHeight,-hd, hw,eaveHeight,-hd, hw,eaveHeight,hd, -hw,eaveHeight,hd]);
    indices = new Uint16Array([0,1,2, 0,2,3]);
  } else {
    positions = new Float32Array([-hw,eaveHeight,-hd, hw,eaveHeight,-hd, hw,eaveHeight,hd, -hw,eaveHeight,hd, -hw,ridgeHeight,0, hw,ridgeHeight,0]);
    indices = new Uint16Array([0,1,5, 0,5,4, 3,4,5, 3,5,2, 0,4,3, 1,2,5]);
  }
  roof.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  roof.setIndex(new THREE.BufferAttribute(indices, 1));
  roof.computeVertexNormals();
  return { walls: geom, roof };
}

export function createBuildingLod(highMesh, lowMesh, { highDistance = 40, lowDistance = 120 } = {}) {
  const lod = new THREE.LOD();
  lod.addLevel(highMesh, 0);
  lod.addLevel(lowMesh, highDistance);
  lod.addLevel(new THREE.Object3D(), lowDistance);
  return lod;
}

export async function mergeBuildingBatch(geometries) {
  try {
    const { mergeGeometries } = await import('three/addons/utils/BufferGeometryUtils.js');
    const merged = mergeGeometries(geometries, false);
    if (merged) merged.computeBoundingSphere();
    return merged;
  } catch { return null; }
}

export function adaptiveDetailBudget(renderer, { targetFps = 30, lastFrameMs = 16 } = {}) {
  const fps = 1000 / Math.max(lastFrameMs, 1);
  if (fps < targetFps * 0.75) return { maxBuildings: 40, shadow: false, pixelRatio: 1 };
  if (fps < targetFps) return { maxBuildings: 80, shadow: true, pixelRatio: 1.5 };
  return { maxBuildings: 200, shadow: true, pixelRatio: Math.min(window.devicePixelRatio || 1, 2) };
}

export default { LOD2_VERSION, configureRendererForPages, buildLod2BuildingGeometry, createBuildingLod, mergeBuildingBatch, adaptiveDetailBudget };
