#!/usr/bin/env bash
# Cesium ion asset upload helper (REST) — Mount Vernon / TSM
# Requires: CESIUM_ION_TOKEN
# Docs: https://cesium.com/learn/ion/ion-upload-rest/
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
NAME="${ION_ASSET_NAME:-Mount Vernon LOD2 Tiles}"
DESC="${ION_ASSET_DESC:-Tri-State River Valley Auto-3D City Builder tileset (EPSG:26916). Online-first; surveyed/derived only.}"
TYPE="${ION_ASSET_TYPE:-3DTILES}"
SOURCE_TYPE="${ION_SOURCE_TYPE:-3DTILES}"
TOKEN="${CESIUM_ION_TOKEN:-}"
if [[ -z "$TOKEN" ]]; then
  echo "[ion] Set CESIUM_ION_TOKEN to upload."
  echo "[ion] Create token at https://ion.cesium.com/tokens"
  cat <<JSON
{
  "name": "$NAME",
  "description": "$DESC",
  "type": "$TYPE",
  "options": { "sourceType": "$SOURCE_TYPE" }
}
JSON
  exit 0
fi
echo "[ion] Creating asset metadata…"
RESP=$(curl -sS -X POST "https://api.cesium.com/v1/assets" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d "{\"name\":\"$NAME\",\"description\":\"$DESC\",\"type\":\"$TYPE\",\"options\":{\"sourceType\":\"$SOURCE_TYPE\"}}")
echo "$RESP" | python3 -m json.tool || echo "$RESP"
ASSET_ID=$(echo "$RESP" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('assetMetadata',d).get('id',''))")
echo "[ion] asset id=$ASSET_ID"
echo "[ion] Upload tiles/mount-vernon/* to S3 uploadLocation, then POST uploadComplete"
echo "[ion] Viewer: Cesium3DTileset.fromIonAssetId($ASSET_ID)"
python3 - <<PY
import json
from pathlib import Path
cfg = {"assetId": "$ASSET_ID" or None, "name": "$NAME", "type": "$TYPE", "localTileset": "tiles/mount-vernon/tileset.json", "srid": 26916}
Path("$ROOT/viewer/cesium_ion.json").write_text(json.dumps(cfg, indent=2))
print("[ion] wrote viewer/cesium_ion.json")
PY
