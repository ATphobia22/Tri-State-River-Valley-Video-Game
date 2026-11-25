# Mount Vernon 3D Tiles (GitHub Pages)

**Version:** 2.4.0-gpu-instancing-ion

## Hosted paths (after deploy)

- Tileset: `/auto-3d-city-builder/tiles/mount-vernon/tileset.json`
- Full binary package: project artifact `mount-vernon-tiles-2.4.0.zip` or `Auto-3D-City-Builder-Mount-Vernon.zip`

## Cesium ion

Ion upload requires **your** `CESIUM_ION_TOKEN` (no shared private token available in CI):

```bash
export CESIUM_ION_TOKEN=your_token_here
bash auto-3d-city-builder/pipeline/cesium_ion_upload.sh
# Upload tiles/mount-vernon/* to the S3 location ion returns, then uploadComplete
```

Create a token: https://ion.cesium.com/tokens

## Local / Pages streaming

Online-first open world probes relative `tiles/mount-vernon/tileset.json`.
Unzip `mount-vernon-tiles-2.4.0.zip` into `auto-3d-city-builder/tiles/` on Pages.
