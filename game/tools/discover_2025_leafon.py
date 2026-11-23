#!/usr/bin/env python3
"""Read-only discovery of official Indiana 2025 leaf-on map sources.

This never downloads third-party map imagery or mutates game assets. All reported
URLs and S3 keys are candidates, not validated source imagery.
"""
import argparse
import json
import urllib.parse
import urllib.request
import xml.etree.ElementTree as ET
from pathlib import Path

S3 = "https://gisimageryleafoningov.s3.us-east-2.amazonaws.com"
WEBMAP = "https://www.arcgis.com/sharing/rest/content/items/91469d388ae34f2bacab2cb6897252fb/data?f=json"
BUDGET = 3_000_000

def get(url):
    with urllib.request.urlopen(urllib.request.Request(url,headers={"User-Agent":"Tri-State-River-Valley-Game/Imagery-Audit"}), timeout=35) as r:
        data=r.read(BUDGET+1)
        if len(data)>BUDGET:raise ValueError("Source response exceeds discovery budget")
        if r.status!=200:raise ValueError(f"Bad upstream status {r.status}")
        return data

def parse_s3(xml):
    root=ET.fromstring(xml)
    getval=lambda node,name: node.findtext("{*}"+name)
    prefixes=[getval(n,"Prefix") for n in root.findall(".//{*}CommonPrefixes")]
    keys=[getval(n,"Key") for n in root.findall(".//{*}Contents")]
    return {"prefixes":[p for p in prefixes if p], "sampleKeys":[k for k in keys if k],
            "truncated":getval(root,"IsTruncated")=="true"}

def parse_map(data):
    obj=json.loads(data)
    if not isinstance(obj,dict) or "operationalLayers" not in obj:raise ValueError("Not an ArcGIS web map")
    result=[]
    for layer in obj["operationalLayers"]:
        u=layer.get("url")
        if u and not u.startswith(("https://di-ingov.img.arcgis.com/","https://gisdata.in.gov/","https://services.arcgis.com/","https://www.arcgis.com/")):
            u=None
        result.append({"name":layer.get("title") or layer.get("id"),"url":u,
                       "layerType":layer.get("layerType"),"itemId":layer.get("itemId")})
    return result

def walk_map_layers(data):
    obj=json.loads(data)
    def walk(layers, path=""):
        out=[]
        for layer in layers:
            name=layer.get("title") or layer.get("id") or "unnamed"
            url=layer.get("url")
            out.append({"path":path+"/"+name,"url":url,"layerType":layer.get("layerType")})
            out.extend(walk(layer.get("layers") or [],path+"/"+name))
        return out
    return walk(obj.get("operationalLayers") or [])

def list_prefix(prefix):
    query=urllib.parse.urlencode({"list-type":"2","prefix":prefix,"max-keys":"40","delimiter":"/"})
    return parse_s3(get(S3+"?"+query))

def discover():
    result={"officialRegistry":"https://registry.opendata.aws/in-imageryleafon/",
            "bucket":"s3://gisimageryleafoningov", "webmap":WEBMAP,
            "s3":None,"webmapLayers":None,"deepLayers":None,"subtrees":{},"failures":[]}
    url=S3+"?"+urllib.parse.urlencode({"list-type":"2","max-keys":"100","delimiter":"/"})
    try:result["s3"]=parse_s3(get(url))
    except Exception as e:result["failures"].append("S3 LIST: "+str(e))
    if result["s3"]:
        roots=result["s3"]["prefixes"]
        for root in roots:
            try:
                level1=list_prefix(root)
                result["subtrees"][root]=level1
                # Just the first three branches under optimized, raw and compressed imagery.
                if root in ("imageryoptimized/","imageryraw/","imagerymrsid/"):
                    for prefix in level1["prefixes"][:6]:
                        result["subtrees"][prefix]=list_prefix(prefix)
            except Exception as e:
                result["failures"].append(f"Subtree {root}: {e}")
    try:
        raw=get(WEBMAP)
        result["webmapLayers"]=parse_map(raw)
        result["deepLayers"]=walk_map_layers(raw)
    except Exception as e:result["failures"].append("ArcGIS map: "+str(e))
    return result

if __name__=="__main__":
    p=argparse.ArgumentParser()
    p.add_argument("--output",type=Path,default=Path("/tmp/indiana-2025-leafon-sources.json"))
    a=p.parse_args()
    doc=discover()
    a.output.parent.mkdir(parents=True,exist_ok=True)
    a.output.write_text(json.dumps(doc,indent=2)+"\n")
    print(json.dumps(doc,indent=2))
