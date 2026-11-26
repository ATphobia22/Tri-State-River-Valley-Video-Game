"""Fail-closed release evidence preflight for registered 3D game assets.

This module checks local file integrity and documentation presence; it is NOT a
geodetic survey, a signature verifier, 3D Tiles validator, CityGML processor,
KTX encoder or an automatic publishing authorization. Even fully populated
receipts require independent review of original data and signed approval.
No network access or publishing side effects occur.
"""
from __future__ import annotations
import argparse
import hashlib
import json
import math
import re
from pathlib import Path, PurePosixPath
from local_earth_registration import root_enu_to_ecef_transform

SHA256=re.compile(r'^[0-9a-f]{64}$')
KTX2=b'\xabKTX 20\xbb\r\n\x1a\n'
MANDATORY_ROLES=frozenset(('3d-tiles-glb','3d-tiles-tileset','pmtiles','ktx2'))

def _object(value,errors,label):
    if not isinstance(value,dict):
        errors.append(label+': object required')
        return {}
    return value

def _field(obj,name,errors,label):
    value=obj.get(name)
    if not isinstance(value,str) or not value.strip():
        errors.append(label+'.'+name+': nonempty value required')
        return ''
    return value.strip()

def _file(root,entry,errors,label,kind=None,check_contents=True):
    if not isinstance(entry,dict):
        errors.append(label+': immutable path and sha256 receipt required')
        return None
    name=entry.get('path')
    digest=entry.get('sha256')
    if not isinstance(name,str) or not name or '\\' in name or ':' in name:
        errors.append(label+': unsafe relative path')
        return None
    path=PurePosixPath(name)
    if path.is_absolute() or any(x in ('.','..','') for x in path.parts) or path.as_posix()!=name:
        errors.append(label+': unsafe relative path')
        return None
    if not isinstance(digest,str) or not SHA256.fullmatch(digest):
        errors.append(label+': invalid sha256')
        return None
    try:
        root=root.resolve(strict=True)
        target=root.joinpath(*path.parts)
        resolved=target.resolve(strict=True)
        if not resolved.is_relative_to(root) or target.is_symlink() or not resolved.is_file():
            errors.append(label+': path must be an existing non-symlink file under root')
            return None
        data=resolved.read_bytes()
    except (OSError,RuntimeError,ValueError):
        errors.append(label+': referenced source is unavailable')
        return None
    if hashlib.sha256(data).hexdigest()!=digest:
        errors.append(label+': SHA-256 mismatch')
        return None
    if kind=='asset':
        size=entry.get('bytes')
        if type(size) is not int or size<=0 or size!=len(data):
            errors.append(label+': declared byte length mismatch')
        role=entry.get('role')
        if role=='3d-tiles-glb':
            if len(data)<20 or data[:4]!=b'glTF' or int.from_bytes(data[4:8],'little')!=2 or int.from_bytes(data[8:12],'little')!=len(data):
                errors.append(label+': invalid GLB v2 header')
        elif role=='ktx2' and not data.startswith(KTX2):
            errors.append(label+': invalid KTX2 identifier')
        elif role=='pmtiles' and (len(data)<127 or data[:8]!=b'PMTiles\x03'):
            errors.append(label+': invalid PMTiles v3 header')
        elif role=='3d-tiles-tileset':
            try:
                obj=json.loads(data)
                if obj.get('asset',{}).get('version')!='1.1' or not isinstance(obj.get('root'),dict):
                    raise ValueError()
            except (ValueError,TypeError,AttributeError):
                errors.append(label+': invalid 3D Tiles 1.1 root')
    elif kind=='receipt' and check_contents:
        try:
            obj=json.loads(data)
            if not isinstance(obj,dict) or obj.get('schema')!='river-valley-authority-evidence/v1' or obj.get('status')!='VERIFIED':
                raise ValueError()
            for required in ('issuer','evidenceKind','sourceReference'):
                if not isinstance(obj.get(required),str) or not obj[required].strip():
                    raise ValueError()
        except (ValueError,TypeError,UnicodeError):
            errors.append(label+': receipt must contain a validated authority evidence record')
    return data

def _receipt(root,obj,name,errors,label):
    return _file(root,obj.get(name),errors,label+'.'+name,kind='receipt')

def validate_release(manifest,root):
    """Evaluate verifiable prerequisites; never issue production certification."""
    errors=[]
    m=_object(manifest,errors,'manifest')
    if m.get('schema')!='river-valley-geographic-release/v1':
        errors.append('unsupported release schema')
    if m.get('classification')!='PRODUCTION_CANDIDATE':
        errors.append('local preview or other nonproduction content cannot be promoted')
    root=Path(root)
    reg=_object(m.get('registration'),errors,'registration')
    if reg.get('horizontalCrs')!='EPSG:4978':
        errors.append('registration must explicitly use WGS84 ECEF EPSG:4978')
    if reg.get('verticalDatum')!='WGS84_ELLIPSOIDAL':
        errors.append('NAVD88/NGVD29/unknown heights require independent geoid conversion')
    if reg.get('localFrame')!='ENU':
        errors.append('right-handed ENU tile frame must be documented')
    if reg.get('transformSource')!='survey-registered':
        errors.append('survey-backed local-to-earth registration evidence missing')
    _field(reg,'coordinateEpoch',errors,'registration')
    _receipt(root,reg,'controlPointReceipt',errors,'registration')
    _receipt(root,reg,'verticalTransformationReceipt',errors,'registration')
    origin=reg.get('originWGS84',None)
    transform=reg.get('rootTransform',None)
    try:
        if not isinstance(origin,list) or len(origin)!=3 or any(type(x) not in (int,float) or not math.isfinite(x) for x in origin):
            raise ValueError('lon, lat and ellipsoidal height must be explicit')
        expected=root_enu_to_ecef_transform(lon_deg=origin[0],lat_deg=origin[1],height_m=origin[2])
        if not isinstance(transform,list) or len(transform)!=16 or any(type(x) not in (int,float) or not math.isfinite(x) for x in transform):
            raise ValueError('16 finite column-major root transform elements required')
        if any(abs(float(a)-float(b))>1e-4 for a,b in zip(transform,expected)):
            raise ValueError('ECEF root transform disagrees with WGS84 ENU origin')
    except (ValueError,TypeError) as exc:
        errors.append('registration.rootTransform: '+str(exc))
    source=_object(m.get('source'),errors,'source')
    _field(source,'sourceDatasetId',errors,'source')
    _field(source,'license',errors,'source')
    _receipt(root,source,'provenanceReceipt',errors,'source')
    semantic=_object(m.get('semantic'),errors,'semantic')
    if semantic.get('citygmlVersion')!='3.0' or type(semantic.get('citydbMajor')) is not int or semantic['citydbMajor']!=5:
        errors.append('semantic: CityGML 3.0 and 3DCityDB v5 evidence required')
    if type(semantic.get('geometryLod')) is not int or semantic['geometryLod'] not in (1,2,3):
        errors.append('semantic: explicit LoD1–LoD3 geometry class required')
    _receipt(root,semantic,'semanticReceipt',errors,'semantic')
    assets=m.get('assets')
    if not isinstance(assets,list) or not assets:
        errors.append('assets: nonempty immutable inventory required')
        assets=[]
    seen=set();roles=set()
    for n,entry in enumerate(assets):
        label='assets['+str(n)+']'
        if not isinstance(entry,dict):
            errors.append(label+': object required')
            continue
        role=entry.get('role')
        if role not in MANDATORY_ROLES:
            errors.append(label+': unsupported content role')
        else:
            roles.add(role)
        name=entry.get('path')
        if name in seen:
            errors.append(label+': duplicate asset')
        else:
            seen.add(name)
        _file(root,entry,errors,label,kind='asset')
    for role in sorted(MANDATORY_ROLES-roles):
        errors.append('assets: missing required '+role)
    checks=_object(m.get('validation'),errors,'validation')
    for key in ('3dTiles','glTF','pmtiles','ktx2','renderer'):
        check=_object(checks.get(key),errors,'validation.'+key)
        if check.get('pass') is not True:
            errors.append('validation.'+key+': independent pass evidence required')
        _receipt(root,check,'receipt',errors,'validation.'+key)
    review=_object(m.get('review'),errors,'review')
    if review.get('independent') is not True or review.get('approved') is not True:
        errors.append('review: independent technical approval required')
    _receipt(root,review,'receipt',errors,'review')
    # Positive evidence screening is not cryptographic authorization to
    # publish. A separate trusted authority must sign off out-of-band.
    return {'schema':'river-valley-geographic-admission-result/v1',
            'status':'BLOCKED' if errors else 'EVIDENCE_SCREEN_PASSED_MANUAL_APPROVAL_REQUIRED',
            'evidence_screen_passed':not errors,
            'publishable':False,
            'errors':errors,
            'next_gate':'Independent source/control-point survey, datum conversion, licensed data and signed publication approval are required.'}

def main():
    parser=argparse.ArgumentParser(description=__doc__)
    parser.add_argument('manifest',type=Path)
    parser.add_argument('--root',type=Path)
    parser.add_argument('--output',type=Path)
    args=parser.parse_args()
    root=args.root or args.manifest.parent
    report=validate_release(json.loads(args.manifest.read_text()),root)
    payload=json.dumps(report,indent=2)+'\n'
    if args.output:
        args.output.write_text(payload)
    print(payload,end='')
    return 0 if report['evidence_screen_passed'] else 1

if __name__=='__main__':
    raise SystemExit(main())
