# 3D Tileset compression

## Applied

- Compact tileset.json + gzip sidecar
- Cesium ion asset **6204792** (COMPLETE) — cloud-optimized tiles

## Production codecs

| Layer | Codec |
|-------|--------|
| Geometry | Draco / meshopt |
| Textures | KTX2 / BasisU |
| JSON | minify + CDN gzip/brotli |

```js
Cesium.Ion.defaultAccessToken = '<token>';
const tileset = await Cesium.Cesium3DTileset.fromIonAssetId(6204792);
viewer.scene.primitives.add(tileset);
```
