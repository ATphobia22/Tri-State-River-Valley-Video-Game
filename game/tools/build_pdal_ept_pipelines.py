#!/usr/bin/env python3
"""Bounded, evidence-constrained USGS EPT -> Posey geospatial products.

No implicit remote requests. --execute requires live EPT metadata verification and
an installed PDAL executable. Never infers vertical datum or surveyed registration.
"""
from __future__ import annotations

import argparse
from datetime import datetime, timezone
import hashlib
import json
import math
from pathlib import Path
import shutil
import subprocess
from urllib.parse import urlparse
from urllib.request import Request, urlopen

EPT_URL = ('https://s3-us-west-2.amazonaws.com/usgs-lidar-public/'
           'USGS_LPC_IN_WT_B12_Posey_2013_LAS_2016/ept.json')
DEFAULT_BOUNDS = (-9791000.0, -9779000.0, 4562000.0, 4577000.0)
TARGET_CRS = 'EPSG:26916'
SOURCE_CRS = 'EPSG:3857'  # candidate; must be verified from actual EPT metadata
PRODUCTS = ('clip', 'dem', 'dsm', 'buildings')
MAX_METADATA_BYTES = 2_000_000


def validate_bounds(bounds):
    """Reject accidental county/state/global extraction and invalid coordinates."""
    if len(bounds) != 4 or any(not math.isfinite(v) for v in bounds):
        raise ValueError('bounds must be four finite EPSG:3857 coordinates')
    xmin, xmax, ymin, ymax = bounds
    if not (-20037508 <= xmin < xmax <= 20037508 and
            -20037508 <= ymin < ymax <= 20037508):
        raise ValueError('invalid EPSG:3857 coordinate ordering')
    if xmax - xmin > 20000 or ymax - ymin > 20000:
        raise ValueError('AOI exceeds 20 km by 20 km safety limit')
    if not (DEFAULT_BOUNDS[0] <= xmin < xmax <= DEFAULT_BOUNDS[1] and
            DEFAULT_BOUNDS[2] <= ymin < ymax <= DEFAULT_BOUNDS[3]):
        raise ValueError('AOI outside approved Mount Vernon processing window')
    return tuple(float(n) for n in bounds)


def validate_url(url):
    parsed = urlparse(url)
    if (parsed.scheme != 'https' or parsed.netloc != 's3-us-west-2.amazonaws.com'
            or not parsed.path.startswith('/usgs-lidar-public/')
            or not parsed.path.endswith('/ept.json') or parsed.query or parsed.fragment):
        raise ValueError('EPT source must be the official HTTPS USGS bucket EPT metadata URL')
    return url


def bounds_option(bounds):
    xmin, xmax, ymin, ymax = validate_bounds(bounds)
    return {'minx': xmin, 'maxx': xmax, 'miny': ymin,
            'maxy': ymax, 'crs': SOURCE_CRS}


def build_pipeline(product, output, bounds=DEFAULT_BOUNDS, source=EPT_URL):
    if product not in PRODUCTS:
        raise ValueError('unsupported output product')
    validate_url(source)
    if not isinstance(output, (str, Path)) or not str(output).strip():
        raise ValueError('output path is required')
    dest = Path(output)
    if dest.suffix.lower() != ('.laz' if product in ('clip', 'buildings') else '.tif'):
        raise ValueError('output extension must match product (.laz or .tif)')
    stages = [{'type': 'readers.ept', 'filename': source,
               'bounds': bounds_option(bounds), 'threads': 4, 'requests': 15}]
    if product in ('dem', 'buildings'):
        stages.append({'type': 'filters.expression',
                       'expression': 'Classification == ' + ('2' if product == 'dem' else '6')})
    stages.append({'type': 'filters.reprojection', 'out_srs': TARGET_CRS})
    if product in ('clip', 'buildings'):
        stages.append({'type': 'writers.las', 'filename': str(dest),
                       'compression': True, 'a_srs': TARGET_CRS})
    else:
        stages.append({'type': 'writers.gdal', 'filename': str(dest),
                       'resolution': 1.0,
                       'output_type': 'min' if product == 'dem' else 'max',
                       'data_type': 'float', 'nodata': -9999})
    return {'pipeline': stages}


def verify_metadata(metadata):
    """Only explicit EPT authority codes count: a WKT name is not proof."""
    if not isinstance(metadata, dict):
        raise ValueError('EPT metadata must be JSON object')
    srs = metadata.get('srs')
    if not isinstance(srs, dict):
        raise ValueError('EPT srs metadata absent')
    authority = str(srs.get('authority', '')).upper()
    horizontal = str(srs.get('horizontal', ''))
    if authority != 'EPSG' or horizontal != '3857':
        raise ValueError('EPT horizontal CRS not explicitly EPSG:3857; do not execute')
    if not isinstance(metadata.get('schema'), list):
        raise ValueError('EPT dimension schema absent')
    dims = {item.get('name') for item in metadata['schema'] if isinstance(item, dict)}
    if not {'X', 'Y', 'Z', 'Classification'}.issubset(dims):
        raise ValueError('EPT schema lacks X/Y/Z/Classification')
    return {'horizontalCRS': SOURCE_CRS, 'dimensionsVerified': True,
            'verticalDatumVerified': False}


def fetch_metadata(url=EPT_URL):
    validate_url(url)
    request = Request(url, headers={'User-Agent': 'RiverValley-EPT-Preflight/1.0'})
    with urlopen(request, timeout=30) as response:
        if response.status != 200:
            raise RuntimeError('EPT metadata HTTP status ' + str(response.status))
        data = response.read(MAX_METADATA_BYTES + 1)
    if len(data) > MAX_METADATA_BYTES:
        raise ValueError('EPT metadata exceeds safety budget')
    result = json.loads(data)
    verified = verify_metadata(result)
    verified['sourceMetadataSHA256'] = hashlib.sha256(data).hexdigest()
    return verified


def run(product, output, bounds=DEFAULT_BOUNDS, *, execute=False,
        metadata_fetcher=fetch_metadata, runner=subprocess.run):
    pipeline = build_pipeline(product, output, bounds)
    if not execute:
        return {'status': 'PLAN_ONLY', 'pipeline': pipeline,
                'sourceCRSUnverified': True, 'verticalDatumVerified': False}
    metadata = metadata_fetcher()
    if metadata.get('horizontalCRS') != SOURCE_CRS or not metadata.get('dimensionsVerified'):
        raise ValueError('source metadata not verified')
    binary = shutil.which('pdal')
    if not binary:
        raise RuntimeError('PDAL executable not installed')
    out_path = Path(output)
    out_path.parent.mkdir(parents=True, exist_ok=True)
    runner([binary, 'pipeline', '--stdin'], input=json.dumps(pipeline),
           text=True, check=True, timeout=3600)
    if not out_path.exists() or out_path.stat().st_size == 0:
        raise RuntimeError('PDAL reported success but product is absent')
    digest = hashlib.sha256()
    with out_path.open('rb') as stream:
        for block in iter(lambda: stream.read(1024 * 1024), b''):
            digest.update(block)
    evidence = {'status': 'SOURCE_DERIVED_NOT_SURVEY_VALIDATED', 'product': product,
                'sourceUrl': EPT_URL, 'sourceMetadataSHA256': metadata['sourceMetadataSHA256'],
                'bounds3857': list(validate_bounds(bounds)), 'outputCRS': TARGET_CRS,
                'outputSHA256': digest.hexdigest(), 'bytes': out_path.stat().st_size,
                'verticalDatumVerified': False, 'spatialControlVerified': False,
                'capturedUTC': datetime.now(timezone.utc).isoformat()}
    receipt = out_path.with_suffix(out_path.suffix + '.receipt.json')
    receipt.write_text(json.dumps(evidence, indent=2) + '\n', encoding='utf-8')
    return evidence


def main(argv=None):
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('product', choices=PRODUCTS)
    parser.add_argument('output', type=Path)
    parser.add_argument('--bounds', nargs=4, type=float, metavar=('XMIN','XMAX','YMIN','YMAX'),
                        default=DEFAULT_BOUNDS)
    parser.add_argument('--execute', action='store_true', help='explicitly download bounded data and run PDAL')
    args = parser.parse_args(argv)
    result = run(args.product, args.output, args.bounds, execute=args.execute)
    print(json.dumps(result, indent=2))
    return 0


if __name__ == '__main__':
    raise SystemExit(main())
