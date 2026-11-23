"""Download the public regional inputs for build_geography.py."""
import io
import json
import sys
import zipfile
from pathlib import Path
from urllib.parse import urlencode
from urllib.request import urlopen

out = Path(sys.argv[1])
out.mkdir(parents=True, exist_ok=True)
bounds = '-88.115,37.76,-87.64,38.25'
common = dict(bbox=bounds, bboxSR=4326, imageSR=4326)
def request(url, **args):
    if args:
        url += '?' + urlencode(args)
    with urlopen(url, timeout=180) as response:
        return response.read()
elevation = 'https://elevation.nationalmap.gov/arcgis/rest/services/3DEPElevation/ImageServer/exportImage'
(out/'posey.tif').write_bytes(request(elevation, **common, size='320,330', format='tiff', pixelType='F32',
    interpolation='RSP_BilinearInterpolation', adjustAspectRatio='false', f='image'))
imagery = 'https://basemap.nationalmap.gov/arcgis/rest/services/USGSImageryOnly/MapServer/export'
params = dict(**common, size='1536,1584', format='jpg', f='pjson')
meta = json.loads(request(imagery, **params))
(out/'regional.jpg').write_bytes(request(meta['href']))
(out/'regional-imagery.json').write_text(json.dumps(dict(request=imagery+'?'+urlencode(params), extent=meta['extent'])))
# Official lower-case objectid is required; the older OBJECTID field fails.
# Pagination and source IDs are mandatory for stable per-parcel game save diffs.
from datetime import datetime, timezone
import hashlib

parcels = 'https://gisdata.in.gov/server/rest/services/Hosted/Parcel_Boundaries_of_Indiana_2025/FeatureServer/0/query'
envelope = dict(xmin=-87.898, ymin=37.930, xmax=-87.892, ymax=37.934, spatialReference=dict(wkid=4326))
query = dict(where='1=1', geometry=json.dumps(envelope), geometryType='esriGeometryEnvelope',
             inSR=4326, outSR=4326, f='json')
count_response = json.loads(request(parcels, **query, returnCountOnly='true'))
expected = count_response.get('count')
if not isinstance(expected, int) or expected < 100:
    raise ValueError('Missing or implausible GIO parcel count')
records = []
for offset in range(0, expected, 100):
    result = json.loads(request(parcels, **query, outFields='objectid',
                                orderByFields='objectid ASC', returnGeometry='true',
                                resultOffset=offset, resultRecordCount=100))
    if result.get('error') or result.get('exceededTransferLimit'):
        raise ValueError(f'Incomplete 2025 parcel data at offset {offset}: {result.get("error")}')
    for feature in result.get('features', []):
        fid = feature.get('attributes', {}).get('objectid')
        geom = feature.get('geometry', {})
        if not isinstance(fid, int) or not geom.get('rings'):
            raise ValueError('GIO parcel missing objectid or polygon rings')
        records.append({'id': str(fid), 'properties': {'parcel_id': str(fid)},
                        'geometry': geom})
if len(records) != expected or len({row['id'] for row in records}) != expected:
    raise ValueError('Duplicate or missing authoritative parcel identifiers')
raw = json.dumps({'features': records}, separators=(',', ':')).encode()
(out/'parcels-response.json').write_bytes(raw)
(out/'parcels-receipt.json').write_text(json.dumps({
    'count': expected, 'recordCount': len(records), 'source': parcels,
    'sourceField': 'objectid', 'bboxWGS84': envelope,
    'capturedUTC': datetime.now(timezone.utc).isoformat(),
    'sha256': hashlib.sha256(raw).hexdigest(),
    'surveyOrLegalZoning': False}, indent=2))
for layer, counties, folder in [('areawater', ('18129','17059','17193','21101','21225'), 'water'),
                                ('roads', ('18129',), 'countyroads')]:
    for fips in counties:
        name=f'tl_2025_{fips}_{layer}'
        data=request(f'https://www2.census.gov/geo/tiger/TIGER2025/{layer.upper()}/{name}.zip')
        with zipfile.ZipFile(io.BytesIO(data)) as archive:
            for item in archive.namelist():
                if Path(item).name.startswith(name+'.'):
                    (out/folder).mkdir(exist_ok=True)
                    (out/folder/Path(item).name).write_bytes(archive.read(item))
