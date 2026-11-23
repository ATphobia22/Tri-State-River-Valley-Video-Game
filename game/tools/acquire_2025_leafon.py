#!/usr/bin/env python3
"""Build a source-hashed, partially transparent 2025 Indiana leaf-on overlay.

The supplied ArcGIS webmap is linked directly from the September 28, 2026 IGIO
announcement. Its "2025 Leaf-on - 6-inch" group is the sole discovery authority.
This tool does not mistake leaf-off, USGS NAIP, or outside-Indiana areas for
2025 Posey imagery. Missing pixels stay TRANSPARENT and preserve fallback layers.
No runtime network access is added.
"""
from __future__ import annotations
import argparse
import base64
from datetime import datetime, timezone
import hashlib
import io
import json
import math
from pathlib import Path
import urllib.parse
import urllib.request

from PIL import Image

IGIO_NOTICE = "https://secure.in.gov/gis/geoinsights/posts/indiana-leafoff-and-leaf-on-imagery-updates"
OFFICIAL_MAP = "https://www.arcgis.com/sharing/rest/content/items/91469d388ae34f2bacab2cb6897252fb/data?f=json"
SOURCE_ROOT = "https://iserver5.surdex.com/arcgis/rest/services/Indiana/P3500372s"
PUBLISHER = "Indiana Geographic Information Office (IGIO), 2025 statewide leaf-on"
WIDTH, HEIGHT = 2048, 1393
MAX_BYTES = 18_000_000

def get(url, cap=MAX_BYTES):
    allowed = (url == OFFICIAL_MAP or url.startswith(SOURCE_ROOT) or
               url.startswith("https://iserver5.surdex.com/arcgis/rest/directories/arcgisoutput/"))
    if not allowed:raise ValueError("URL not in the IGIO-authorized source allowlist")
    with urllib.request.urlopen(urllib.request.Request(url,headers={"User-Agent":"RiverValleyGame-2025-LeafOn/1.0"}),timeout=50) as r:
        if r.status != 200:raise ValueError(f"HTTP {r.status}")
        data=r.read(cap+1)
        if len(data)>cap:raise ValueError("Data exceeds 2025 imagery budget")
        return data

def json_get(url):
    data=json.loads(get(url,MAX_BYTES))
    if not isinstance(data,dict) or data.get("error"):raise ValueError("Invalid GIS JSON response: "+str(data.get("error") if isinstance(data,dict) else data))
    return data

def leafon_services(webmap):
    groups=[l for l in webmap.get("operationalLayers",[]) if l.get("title")=="2025 Leaf-on - 6-inch" and l.get("layerType")=="GroupLayer"]
    if len(groups)!=1:raise ValueError("Official webmap lacks an unambiguous 2025 leaf-on source group")
    services=[]
    for l in groups[0].get("layers",[]):
        u=l.get("url","")
        if u.startswith(SOURCE_ROOT) and u.endswith("/ImageServer") and u[len(SOURCE_ROOT):].split("/")[0].isdigit():
            if u not in services:services.append(u)
    return services

def verify_extent(expected,actual):
    w,s,e,n=expected
    a,b,c,d=actual
    if not all(math.isfinite(v) for v in (*expected,*actual)) or w>=e or s>=n or a>=c or b>=d:
        raise ValueError("Invalid imagery spatial extent")
    if min(e,c)-max(w,a)<=.01 or min(n,d)-max(s,b)<=.01:
        raise ValueError("Imagery not covering meaningful Mount Vernon area")
    if max(abs(v) for v in (a,c))>180 or max(abs(v) for v in (b,d))>90:
        raise ValueError("Imagery extent is not in EPSG:4326")
    if a<w-.05 or c>e+.05 or b<s-.05 or d>n+.05:
        raise ValueError("Returned export extends too far beyond requested area")

def bbox_to_wgs84(ex):
    if not isinstance(ex,dict):raise ValueError("Missing source ImageServer extent")
    sr=ex.get("spatialReference") or {}
    wkid=sr.get("latestWkid") or sr.get("wkid")
    if wkid not in (4326,3857,102100,2966,26916):
        raise ValueError(f"Unsupported source CRS {wkid}")
    w,s,e,n=(float(ex[k]) for k in ("xmin","ymin","xmax","ymax"))
    if wkid==4326:return (w,s,e,n)
    from pyproj import Transformer
    tr=Transformer.from_crs(f"EPSG:{3857 if wkid==102100 else wkid}","EPSG:4326",always_xy=True)
    pts=[tr.transform(x,y) for x in (w,e) for y in (s,n)]
    return (min(x for x,y in pts),min(y for x,y in pts),
            max(x for x,y in pts),max(y for x,y in pts))

def intersects(a,b):
    w,s,e,n=a;W,S,E,N=b
    return min(e,E)>max(w,W) and min(n,N)>max(s,S)

def align_layer(im,actual,requested,size):
    verify_extent(requested,actual)
    w,s,e,n=requested
    a,b,c,d=actual
    # Pillow affine maps each output pixel location to its input geography
    x0=(w-a)/(c-a)*im.width
    y0=(d-n)/(d-b)*im.height
    sx=(e-w)/(c-a)*im.width/size[0]
    sy=(n-s)/(d-b)*im.height/size[1]
    return im.transform(size,Image.Transform.AFFINE,(sx,0,x0,0,sy,y0),
                        resample=Image.Resampling.BILINEAR,fillcolor=(0,0,0,0))

def verify_coverage(im):
    if im.mode!="RGBA":raise ValueError("Imagery must be an RGBA mask with auditable transparency")
    mask=im.getchannel("A")
    extrema=mask.getextrema()
    if extrema[1]<240:raise ValueError("No opaque 2025 imagery source pixels")
    hist=mask.histogram()
    total=im.width*im.height
    fraction=sum(hist[240:])/total
    if fraction < .20:raise ValueError(f"Insufficient 2025 imagery coverage: {fraction:.3f}")
    # Atmospheric flat-color placeholders and error tiles must never pass.
    opaque=im.convert("RGB")
    thumb=opaque.resize((48,48))
    if len(set(thumb.getdata()))<24:
        raise ValueError("Insufficient image pixel diversity; suspect empty/map-error image")
    return round(fraction,6)

def render_export(url, bbox):
    param={"bbox":",".join(f"{x:.9f}" for x in bbox),"bboxSR":4326,"imageSR":4326,
           "size":f"{WIDTH},{HEIGHT}","format":"png32","transparent":"true",
           "noDataInterpretation":"esriNoDataMatchAny","f":"json"}
    response=json_get(url+"/exportImage?"+urllib.parse.urlencode(param))
    href=response.get("href")
    if not isinstance(href,str) or not (href.startswith(SOURCE_ROOT) or
          href.startswith("https://iserver5.surdex.com/arcgis/rest/directories/arcgisoutput/")):
        raise ValueError("ImageServer returned an untrusted image URI")
    extent=bbox_to_wgs84(response.get("extent") or {})
    verify_extent(bbox,extent)
    raw=get(href)
    with Image.open(io.BytesIO(raw)) as source:
        if source.width != response.get("width") or source.height!=response.get("height"):
            raise ValueError("ImageServer image dimensions disagree with response")
        if source.mode!="RGBA":
            raise ValueError("ImageServer export lacks an alpha channel; cannot validate boundaries")
        im=align_layer(source.convert("RGBA"),extent,bbox,(WIDTH,HEIGHT))
    return im,hashlib.sha256(raw).hexdigest(),extent

def acquire(out, receipt, preview, registration):
    bbox=tuple(json.loads(Path(registration).read_text())["bboxReturnedWGS84"])
    webmap=json_get(OFFICIAL_MAP)
    sources=leafon_services(webmap)
    if not sources:raise ValueError("IGIO 2025 webmap contains no validated image services")
    composite=Image.new("RGBA",(WIDTH,HEIGHT),(0,0,0,0))
    used=[]; failures=[]
    for url in sources:
        try:
            meta=json_get(url+"?f=json")
            extent=bbox_to_wgs84(meta.get("extent") or meta.get("fullExtent") or {})
            if not intersects(bbox,extent):continue
            image, digest, returned=render_export(url,bbox)
            alpha=image.getchannel("A")
            if alpha.getextrema()[1]<240:continue
            composite.alpha_composite(image)
            used.append({"service":url,"exportImageSHA256":digest,"returnedExtentWGS84":returned})
        except Exception as e:
            failures.append({"service":url,"reason":str(e)})
    if not used:raise ValueError("No authenticated 2025 leaf-on source intersected Mount Vernon: "+repr(failures))
    coverage=verify_coverage(composite)
    data=io.BytesIO();composite.save(data,format="PNG",optimize=True)
    png=data.getvalue()
    timestamp=datetime.now(timezone.utc).isoformat()
    sha=hashlib.sha256(png).hexdigest()
    meta={"year":2025,"publisher":PUBLISHER,"license":"CC0",
          "validPixelCoverageFraction":coverage,"colorTreatment":"RGB natural-color projection of four-band COG / ImageServer",
          "sourceKind":"IGIO-endorsed 2025 leaf-on map group, 6-inch source raster downsampled for game",
          "captureUTC":timestamp,"overlaySHA256":sha,
          "noClaimOfFullBboxCoverage":True,"noClaimOfSurveyedVerticalDatum":True}
    bundle={"schemaVersion":1,"bboxWGS84":list(bbox),
            "imageDataUrl":"data:image/png;base64,"+base64.b64encode(png).decode("ascii"),
            "metadata":meta}
    js="/* IGIO 2025 leaf-on public-domain partial overlay; transparency preserves older imagery. */\nwindow.ValleyLeafOn2025="+json.dumps(bundle,separators=(",",":"))+";\n"
    out=Path(out);out.parent.mkdir(parents=True,exist_ok=True);out.write_text(js)
    preview=Path(preview);preview.parent.mkdir(parents=True,exist_ok=True);preview.write_bytes(png)
    receipt=Path(receipt);receipt.parent.mkdir(parents=True,exist_ok=True)
    proof={"timestampUTC":timestamp,"sourceYear":2025,"officialIGIONotice":IGIO_NOTICE,
           "officialViewer":OFFICIAL_MAP,"s3Originals":"s3://gisimageryleafoningov/imageryoptimized/2025/SPW/06in/",
           "sourceRenderServices":used,"failedCandidateServices":failures,
           "coveredFraction":coverage,"geographicExtentWGS84":bbox,
           "dimensions":[WIDTH,HEIGHT],"sourceOverlaySHA256":sha,
           "JS_SHA256":hashlib.sha256(js.encode()).hexdigest(),"verticalDatumValidated":False,
           "status":"SOURCE_DERIVED_PARTIAL_2025_OVERLAY"}
    receipt.write_text(json.dumps(proof,indent=2)+"\n")
    return {"usedServices":len(used),"unsuitableSources":len(failures),
            "coverageFraction":coverage,"sourceSHA256":sha,"captureUTC":timestamp}

if __name__=="__main__":
    p=argparse.ArgumentParser(description=__doc__)
    p.add_argument("--out",type=Path,default=Path("game/data/leafon-2025-bundle.js"))
    p.add_argument("--receipt",type=Path,default=Path("game/reference/mount-vernon/leafon-2025-receipt.json"))
    p.add_argument("--preview",type=Path,default=Path("game/reference/mount-vernon/leafon-2025-overlay.png"))
    p.add_argument("--registration",type=Path,default=Path("game/reference/mount-vernon/registration.json"))
    a=p.parse_args()
    print(json.dumps(acquire(a.out,a.receipt,a.preview,a.registration),indent=2))
