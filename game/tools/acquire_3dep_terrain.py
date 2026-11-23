#!/usr/bin/env python3
"""Build an offline, source-hashed USGS 3DEP bare-earth terrain sample for the Mount Vernon game.

The remote service is accessed ONLY during this explicit build step, not during gameplay.
The generated elevation is real source-derived relief, but registration is approximate
and not evidence of independently surveyed controls or a validated water datum.
"""
from __future__ import annotations
import argparse
import base64
from datetime import datetime, timezone
import hashlib
import json
import math
from pathlib import Path
import struct
from urllib.parse import urlencode
from urllib.request import Request, urlopen

SOURCE = "https://elevation.nationalmap.gov/arcgis/rest/services/3DEPElevation/ImageServer"
# Identical horizontal approximation used by game/src/reference-map.js.
LIMIT = 2450
LON0 = -87.895
LAT0 = 37.9325
Z0 = 430
DLON = 0.00001137489
DLAT = -0.000009009399
WIDTH = HEIGHT = 256
MAX_DOWNLOAD = 12_000_000


def local_to_lonlat(x: float, z: float) -> tuple[float, float]:
    return LON0 + x * DLON, LAT0 + (z - Z0) * DLAT


def requested_bounds() -> tuple[float, float, float, float]:
    west, north = local_to_lonlat(-LIMIT, -LIMIT)
    east, south = local_to_lonlat(LIMIT, LIMIT)
    return west, south, east, north


def build_export_url(bounds: tuple[float, float, float, float]) -> str:
    return SOURCE + "/exportImage?" + urlencode({
        "bbox": ",".join(format(v, ".10f") for v in bounds),
        "bboxSR": "4326", "imageSR": "4326",
        "size": f"{WIDTH},{HEIGHT}", "format": "tiff",
        "pixelType": "F32", "interpolation": "RSP_BilinearInterpolation", "f": "image"
    })


def fetch_tiff(url: str) -> bytes:
    if not url.startswith(SOURCE + "/exportImage?"):
        raise ValueError("Only official USGS ImageServer URL is permitted")
    req = Request(url, headers={"User-Agent": "RiverValleyFamilyGame-USGS3DEP/1.0"})
    with urlopen(req, timeout=120) as response:
        if response.status != 200:
            raise RuntimeError(f"USGS response {response.status}")
        data = response.read(MAX_DOWNLOAD + 1)
    if len(data) > MAX_DOWNLOAD:
        raise ValueError("Raster download exceeds byte budget")
    if not (data.startswith(b"II*\x00") or data.startswith(b"MM\x00*")):
        raise ValueError("USGS did not return a classic TIFF (rejecting HTML/error image)")
    return data


def validate_bounds(bounds: tuple[float, float, float, float]) -> None:
    w, s, e, n = bounds
    target = requested_bounds()
    if not all(math.isfinite(v) for v in bounds):
        raise ValueError("Invalid spatial bounds")
    # ArcGIS can expand the actual export bounds to preserve pixel aspect ratio.
    # Trust the TIFF transform, but only if it still covers the full game domain
    # without moving farther than approximately 2 km beyond our AOI.
    if not (w < e and s < n and w <= target[0] + 1e-4 and
            s <= target[1] + 1e-4 and e >= target[2] - 1e-4 and
            n >= target[3] - 1e-4 and max(abs(a - b) for a, b in zip(bounds, target)) < .02):
        raise ValueError(f"USGS raster extent is not a complete Mount Vernon AOI cover: actual={bounds}, requested={target}")


def encode_samples(values: list[float], width: int, height: int,
                   bounds: tuple[float, float, float, float]) -> dict:
    validate_bounds(bounds)
    if width != WIDTH or height != HEIGHT or len(values) != width * height:
        raise ValueError("DEM must cover the complete 256x256 grid")
    if any(not math.isfinite(v) or v < -100 or v > 1500 for v in values):
        raise ValueError("DEM contains invalid, void, or implausible elevation samples")
    min_m, max_m = min(values), max(values)
    if max_m - min_m < .50 or max_m - min_m > 655.34:
        raise ValueError("DEM is constant or exceeds 16-bit centimeter range")
    base = math.floor(min_m * 100) / 100
    encoded = [int(round((v - base) * 100)) for v in values]
    if min(encoded) < 0 or max(encoded) > 65535:
        raise ValueError("Unsigned elevation quantization overflow")
    payload = struct.pack("<" + "H" * len(encoded), *encoded)
    w, s, e, n = bounds
    return {
        "cols": width, "rows": height, "lonMin": w, "lonMax": e,
        "latMin": s, "latMax": n,
        "minFt": round(base * 3.28083989501312, 10),
        "stepFt": .0328083989501312,
        "b64": base64.b64encode(payload).decode("ascii")
    }


def acquire(out: Path, receipt: Path) -> dict:
    try:
        from rasterio.io import MemoryFile
    except ImportError as exc:
        raise RuntimeError("Install rasterio before acquiring USGS terrain") from exc
    bounds = requested_bounds()
    url = build_export_url(bounds)
    raw = fetch_tiff(url)
    with MemoryFile(raw) as mem:
        with mem.open() as ds:
            if ds.crs is None or ds.crs.to_epsg() != 4326:
                raise ValueError(f"Unverified exported DEM projection: {ds.crs}")
            if ds.count != 1 or ds.dtypes[0] != "float32":
                raise ValueError("Expected single-band raw F32 USGS DEM")
            if ds.width != WIDTH or ds.height != HEIGHT:
                raise ValueError("Unexpected USGS raster dimensions")
            values = ds.read(1, masked=True)
            if values.mask is not False and bool(values.mask.any()):
                raise ValueError("USGS DEM has masked or missing pixels; do not synthesize heights")
            coverage = (float(ds.bounds.left), float(ds.bounds.bottom), float(ds.bounds.right), float(ds.bounds.top))
            grid = encode_samples(values.reshape(-1).tolist(), ds.width, ds.height, coverage)
            cell_size = [float(ds.res[0]), float(ds.res[1])]
    stamp = datetime.now(timezone.utc).isoformat()
    metadata = {
        "sourceId": "USGS_3DEP", "sourceUrl": SOURCE, "exportUrl": url,
        "captureUTC": stamp, "sourceTIFFSHA256": hashlib.sha256(raw).hexdigest(),
        "pixelSizeDegrees": cell_size, "horizontalCRS": "EPSG:4326",
        "verticalUnits": "meters", "verticalDatumClaim": "USGS 3DEP CONUS products typically NAVD88",
        "verticalDatumVerified": False, "spatialControlVerified": False,
        "gamePurpose": "approximate 3D terrain relief; not survey, flood guidance, or verified waterfront stage"
    }
    candidate = {"schemaVersion": 1, "grid": grid, "metadata": metadata}
    js = ("/* Official USGS 3DEP export. SHA-256 and datum limitations in matching receipt. */\n"
          "window.ValleySourceTerrain=" + json.dumps(candidate, separators=(",", ":")) + ";\n")
    out.parent.mkdir(parents=True, exist_ok=True)
    out.write_text(js, encoding="utf-8")
    audit = {"sourceUrl": url, "sourceTIFFSHA256": metadata["sourceTIFFSHA256"],
             "outputSHA256": hashlib.sha256(js.encode("utf-8")).hexdigest(),
             "captureUTC": stamp, "spatialBoundsWGS84": [grid[k] for k in ("lonMin", "latMin", "lonMax", "latMax")],
             "dimensions": [WIDTH, HEIGHT], "samples": WIDTH * HEIGHT,
             "datumVerified": False, "verticalSourceUnits": "meters",
             "status": "SOURCE_DERIVED_NOT_SURVEY_VALIDATED"}
    receipt.parent.mkdir(parents=True, exist_ok=True)
    receipt.write_text(json.dumps(audit, indent=2) + "\n", encoding="utf-8")
    return audit


if __name__ == "__main__":
    p = argparse.ArgumentParser(description=__doc__)
    p.add_argument("--out", type=Path, default=Path(__file__).resolve().parents[1] / "data/usgs-3dep-terrain.js")
    p.add_argument("--receipt", type=Path, default=Path(__file__).resolve().parents[1] / "reference/mount-vernon/usgs-3dep-receipt.json")
    args = p.parse_args()
    print(json.dumps(acquire(args.out, args.receipt), indent=2))
