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
parcels = 'https://gisdata.in.gov/server/rest/services/Hosted/Parcel_Boundaries_of_Indiana_2025/FeatureServer/0/query'
envelope=dict(xmin=-87.898,ymin=37.930,xmax=-87.892,ymax=37.934,spatialReference=dict(wkid=4326))
data = json.loads(request(parcels, where='1=1', outFields='objectid', geometry=json.dumps(envelope),
    geometryType='esriGeometryEnvelope',inSR=4326,outSR=4326,returnGeometry='true',f='geojson'))
if not data.get('features') or data.get('properties', {}).get('exceededTransferLimit'):
    raise ValueError('Incomplete Indiana parcel response')
if any(f.get('properties', {}).get('objectid') is None for f in data['features']):
    raise ValueError('Parcels lack source objectid; refuse unstable saves')
(out/'parcels-response.json').write_text(json.dumps(data))
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
