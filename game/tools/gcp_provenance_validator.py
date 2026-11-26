"""Fail-closed NOAA/Indiana ground-control staging; never certify by file metadata.

Install pydantic v2 from tools/requirements-geodetic.txt.
No external IO: authoritative datasheets and independent field observations must
be supplied and audited separately. No build flag can mark a point PASSED.
"""
from __future__ import annotations

import argparse
import hashlib
import json
import math
import re
from enum import Enum
from pathlib import Path
from typing import Any
from urllib.parse import urlparse

from pydantic import BaseModel, ConfigDict, Field, field_validator, model_validator

PID_RE=re.compile(r"^(?:[A-Z]{2}[0-9]{4}|PCS-[A-Z0-9-]+)$")
SHA_RE=re.compile(r"^[a-f0-9]{64}$")
BAD_SOURCE=re.compile(r"(?:NEAREST[ _-]*ROAD|ROAD[ _-]*CENTERLINE|GEOCOD|INTERPOLAT|TIGER|SCALED[ _-]*MAP|DEM[ _-]*EXTRACT|ROAD[ _-]*SNAP|STREET[ _-]*SNAP)",re.I)

class GateState(str, Enum):
    QUARANTINED="QUARANTINED"
    BLOCKED_SUBSTANTIVE="BLOCKED_SUBSTANTIVE"
    EVIDENCE_REVIEW_REQUIRED="EVIDENCE_REVIEW_REQUIRED"

class ObservationMethod(str, Enum):
    DIFFERENTIAL_LEVELING="DIFFERENTIAL_LEVELING"
    STATIC_GNSS_OPUS="STATIC_GNSS_OPUS"
    RTK_SURVEY_GRADE="RTK_SURVEY_GRADE"
    TOTAL_STATION_TRAVERSE="TOTAL_STATION_TRAVERSE"

APPROVED_AGENCIES=frozenset({"NOAA_NGS","INDOT","IDNR","USGS","POSEY_COUNTY_SURVEYOR"})

class ControlPointRecord(BaseModel):
    model_config=ConfigDict(extra="forbid",str_strip_whitespace=True)
    pid:str
    designation:str=Field(min_length=2)
    source_agency:str
    loc_method:ObservationMethod
    provenance_notes:str=Field(min_length=5)
    latitude_deg:float=Field(ge=37.75,le=38.25,allow_inf_nan=False)
    longitude_deg:float=Field(ge=-88.10,le=-87.65,allow_inf_nan=False)
    horizontal_datum:str
    horizontal_source:str
    horizontal_epoch:str
    ortho_height_m:float=Field(ge=50,le=250,allow_inf_nan=False)
    vertical_datum:str
    vertical_source:str
    geoid_model:str
    order_class:str
    datasheet_sha256:str
    datasheet_url:str

    @field_validator("pid")
    @classmethod
    def valid_pid(cls,v):
        key=v.upper()
        if not PID_RE.fullmatch(key):raise ValueError("NGS PID or PCS-monument ID required")
        return key

    @field_validator("source_agency")
    @classmethod
    def valid_agency(cls,v):
        key=v.upper()
        if key not in APPROVED_AGENCIES:raise ValueError("Unknown authoritative control agency")
        return key

    @field_validator("horizontal_datum")
    @classmethod
    def valid_horizontal(cls,v):
        key=v.upper().replace(" ","")
        if key!="NAD83(2011)":raise ValueError("NAD83(2011) required; no inferred EPSG:2966 conversion")
        return "NAD83(2011)"

    @field_validator("horizontal_source")
    @classmethod
    def valid_horizontal_source(cls,v):
        key=v.upper()
        if key not in ("ADJUSTED","OPUS_SOLUTION"):raise ValueError("Scaled or approximate horizontal coordinates are not survey control")
        return key

    @field_validator("horizontal_epoch")
    @classmethod
    def valid_epoch(cls,v):
        if not re.fullmatch(r"[12][0-9]{3}\.[0-9]{2}",v):raise ValueError("Coordinate epoch is required")
        return v

    @field_validator("vertical_datum")
    @classmethod
    def valid_vertical(cls,v):
        if v.upper().replace(" ","") not in ("NAVD88","EPSG:5703"):raise ValueError("NAVD88 survey tie required")
        return "NAVD88"

    @field_validator("vertical_source")
    @classmethod
    def valid_height_source(cls,v):
        if v.upper() not in ("ADJUSTED","LEVELING"):raise ValueError("Vertical must come from adjusted leveling, not DEM or scaling")
        return v.upper()

    @field_validator("geoid_model")
    @classmethod
    def valid_geoid(cls,v):
        if v.upper()!="GEOID18":raise ValueError("GEOID18 model and coordinate realization required")
        return "GEOID18"

    @field_validator("order_class")
    @classmethod
    def valid_order(cls,v):
        if not v.strip() or len(v.strip())<3:raise ValueError("Published order/class required")
        return v.strip().upper()

    @field_validator("datasheet_sha256")
    @classmethod
    def valid_digest(cls,v):
        if not SHA_RE.fullmatch(v):raise ValueError("Immutable NOAA datasheet SHA-256 required")
        return v

    @field_validator("datasheet_url")
    @classmethod
    def valid_datasheet_url(cls,v):
        u=urlparse(v)
        if u.scheme!="https" or not u.hostname or u.username or u.password or u.port or u.fragment:
            raise ValueError("Official HTTPS source required")
        return v

    @model_validator(mode="after")
    def reject_unmeasured_provenance(self):
        if BAD_SOURCE.search(self.provenance_notes+" "+self.designation):
            raise ValueError("SUBSTANTIVE_PROVENANCE_DEFECT: road/geocode/interpolation is not a monument")
        host=urlparse(self.datasheet_url).hostname
        if self.source_agency=="NOAA_NGS":
            if host not in ("geodesy.noaa.gov","www.ngs.noaa.gov","ngs.noaa.gov"):
                raise ValueError("NGS PID must cite an official NOAA source")
        elif not (host.endswith(".gov") or host=="in.gov"):
            raise ValueError("Official agency datasheet URL required")
        return self

def validate_control_point(record:dict[str,Any])->ControlPointRecord:
    """A valid schema is NOT proof of an authentic mark or current recovery."""
    try:
        return ControlPointRecord.model_validate(record)
    except (TypeError,ValueError) as exc:
        raise ValueError(str(exc)) from exc

def _reason_report(path,state,reasons,valid_count=0,rejected_count=0):
    return {"schema":"river-valley-gcp-provenance-report/v1","file":str(path),
            "gate_state":state.value,"modeling_eligible":False,
            "allow_vertical_rmse":False,"allow_3dtiles_registration":False,
            "failure_class":("SUBSTANTIVE_PROVENANCE_DEFECT" if state==GateState.QUARANTINED
              else "SUBSTANTIVE_CONTROL_INSUFFICIENCY" if state==GateState.BLOCKED_SUBSTANTIVE else "INDEPENDENT_REVIEW_REQUIRED"),
            "reasons":reasons,"valid_count":valid_count,"rejected_count":rejected_count}

def evaluate_control_file(file_path:Path)->dict[str,Any]:
    """Only classify evidence. This function never promotes to PASSED."""
    path=Path(file_path)
    try: raw=json.loads(path.read_text(encoding="utf-8"))
    except (OSError,UnicodeError,ValueError) as exc:
        return _reason_report(path,GateState.BLOCKED_SUBSTANTIVE,["Unreadable or invalid control evidence: "+type(exc).__name__])
    if not isinstance(raw,dict):
        return _reason_report(path,GateState.BLOCKED_SUBSTANTIVE,["Control file must be a JSON object"])
    if raw.get("type")=="FeatureCollection":
        features=raw.get("features",[])
        hits=[]
        for f in features if isinstance(features,list) else []:
            props=f.get("properties",{}) if isinstance(f,dict) else {}
            if isinstance(props,dict) and BAD_SOURCE.search(json.dumps({k:v for k,v in props.items() if k in ("kind","loc_method","method","source_type","note","provenance_notes")},ensure_ascii=True)):
                hits.append(str(props.get("id","unknown")))
        if hits:
            return _reason_report(path,GateState.QUARANTINED,
                ["Road/geocoded feature is reference-only, not a surveyed monument: "+", ".join(hits)],
                rejected_count=len(features))
        return _reason_report(path,GateState.BLOCKED_SUBSTANTIVE,["GeoJSON features are not approved survey-control records"],rejected_count=len(features) if isinstance(features,list) else 0)
    meta=raw.get("metadata",{})
    if not isinstance(meta,dict):meta={}
    source={k:v for k,v in meta.items() if k.lower() in ("loc_method","method","source_type","registration","provenance","location_method")}
    if BAD_SOURCE.search(json.dumps(source)):
        return _reason_report(path,GateState.QUARANTINED,["File metadata indicates road-centerline / geocoded positional approximation"])
    records=raw.get("control_points")
    if not isinstance(records,list) or not records:
        return _reason_report(path,GateState.BLOCKED_SUBSTANTIVE,["No surveyed monument records supplied"])
    valid=[]; errors=[];quarantined=[]
    for idx,item in enumerate(records):
        if not isinstance(item,dict):
            errors.append(f"Row {idx}: control point must be an object")
            continue
        if BAD_SOURCE.search(json.dumps({k:v for k,v in item.items() if k.lower() in ("loc_method","source_type","provenance_notes","designation","horizontal_source","vertical_source")})):
            quarantined.append(str(item.get("pid",idx)))
            continue
        try: valid.append(validate_control_point(item))
        except ValueError as exc:errors.append(f"Row {idx} ({item.get('pid','UNKNOWN')}): {exc}")
    if quarantined:
        return _reason_report(path,GateState.QUARANTINED,["Geocoded/road/scaled/DEM-derived monument provenance: "+", ".join(quarantined)]+errors,len(valid),len(quarantined)+len(errors))
    if errors or len(valid)<3 or len({r.pid for r in valid})!=len(valid):
        if len(valid)<3:errors.append("At least three distinct independently recovered control monuments are required")
        if len({r.pid for r in valid})!=len(valid):errors.append("Duplicate PID is not independent control")
        return _reason_report(path,GateState.BLOCKED_SUBSTANTIVE,errors,len(valid),len(errors))
    return _reason_report(path,GateState.EVIDENCE_REVIEW_REQUIRED,
         ["Schema valid, but NOAA datasheet authenticity, monument recovery, independence, residuals, datum/grid transformation and signed review remain unverified"],
         len(valid),0)

def _dms(degrees,minutes,seconds,hemisphere):
    d=float(degrees);m=float(minutes);s=float(seconds)
    if not (0<=m<60 and 0<=s<60):raise ValueError("Invalid DMS coordinate")
    return (d+m/60+s/3600)*(-1 if hemisphere in ("W","S") else 1)

def parse_ngs_datasheet(text:str,pid:str)->dict[str,Any]:
    """Extract current-survey header only; never assert the file came from NOAA."""
    pid=pid.upper()
    if not PID_RE.fullmatch(pid) or not re.search(r"^"+re.escape(pid)+r"\s+PID\s*-\s*"+re.escape(pid)+r"\s*$",text,re.M):
        raise ValueError("NGS PID and datasheet body do not agree")
    pref=r"^"+re.escape(pid)+r"\*?\s+"
    designation=re.search(pref+r"DESIGNATION\s*-\s*(.+)$",text,re.M)
    pos=re.search(pref+r"NAD\s+83\(2011\)\s+POSITION\s*-\s*(\d+)\s+(\d+)\s+([\d.]+)\(([NS])\)\s+(\d+)\s+(\d+)\s+([\d.]+)\(([EW])\)\s+(\S+)",text,re.M)
    height=re.search(pref+r"NAVD\s+88\s+ORTHO\s+HEIGHT\s*-\s*(-?[\d.]+)\s+\(meters\).*?\s+([A-Z]+)\s*$",text,re.M)
    geoid=re.search(pref+r"GEOID\s+HEIGHT\s*-\s*(-?[\d.]+)\s+\(meters\)\s+(GEOID\w+)\s*$",text,re.M)
    return {"pid":pid,"designation":designation.group(1).strip() if designation else None,
      "status":"EXTRACTED_NOT_VALIDATED","modeling_eligible":False,
      "latitude_deg":_dms(*pos.groups()[0:4]) if pos else None,
      "longitude_deg":_dms(*pos.groups()[4:8]) if pos else None,
      "horizontal_datum":"NAD83(2011)" if pos else None,
      "horizontal_source":pos.group(9) if pos else None,
      "horizontal_survey_grade":bool(pos and pos.group(9)=="ADJUSTED"),
      "ortho_height_m":float(height.group(1)) if height else None,
      "vertical_source":height.group(2) if height else None,
      "geoid_model":geoid.group(2) if geoid else None,
      "datasheet_sha256":hashlib.sha256(text.encode("utf-8")).hexdigest(),
      "missing_fields":[n for n,v in (
          ("adjusted_position",bool(pos and pos.group(9)=="ADJUSTED")),
          ("adjusted_NAVD88_height",bool(height and height.group(2)=="ADJUSTED")),
          ("GEOID18",bool(geoid and geoid.group(2)=="GEOID18"))) if not v]}

def main():
    p=argparse.ArgumentParser(description=__doc__)
    p.add_argument("control_file",type=Path)
    p.add_argument("--report",type=Path)
    a=p.parse_args()
    report=evaluate_control_file(a.control_file)
    rendered=json.dumps(report,indent=2)+"\n"
    if a.report:a.report.write_text(rendered,encoding="utf-8")
    print(rendered,end="")
    return 0 if report["gate_state"]==GateState.EVIDENCE_REVIEW_REQUIRED.value else 2

if __name__=="__main__":
    raise SystemExit(main())
