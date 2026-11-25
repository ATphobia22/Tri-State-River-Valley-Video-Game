"""Non-destructive intake of a Mount Vernon local-frame 3D Tiles preview.
Container checks only; not a complete glTF/3D Tiles validator or georeferencer.
"""
import argparse
import hashlib
import json
import math
import sqlite3
import stat
import struct
import zipfile
from pathlib import Path, PurePosixPath


def sha(data):
    return hashlib.sha256(data).hexdigest()


def normalize_glb(data):
    if len(data) < 20 or struct.unpack_from('<4sII', data) != (b'glTF', 2, len(data)):
        raise ValueError('invalid GLB v2 header')
    length, kind = struct.unpack_from('<I4s', data, 12)
    end = 20 + length
    if kind != b'JSON' or length % 4 or end > len(data):
        raise ValueError('invalid JSON chunk')
    raw = data[20:end]
    zeros = len(raw) - len(raw.rstrip(b'\0'))
    if zeros > 3:
        raise ValueError('excess JSON padding')
    fixed = raw[:-zeros] + b' ' * zeros if zeros else raw
    try:
        obj = json.loads(fixed.decode('utf-8'))
    except (UnicodeError, ValueError) as e:
        raise ValueError('invalid GLB JSON') from e
    if not isinstance(obj, dict) or obj.get('asset', {}).get('version') != '2.0':
        raise ValueError('invalid glTF asset version')
    offset, bin_length = end, None
    while offset < len(data):
        if len(data) - offset < 8:
            raise ValueError('truncated GLB chunk')
        size, tag = struct.unpack_from('<I4s', data, offset)
        if size % 4 or offset + 8 + size > len(data) or tag == b'JSON':
            raise ValueError('invalid GLB chunk extent')
        if tag == b'BIN\0':
            if offset != end or bin_length is not None:
                raise ValueError('invalid BIN chunk order')
            bin_length = size
        offset += 8 + size
    for i, buf in enumerate(obj.get('buffers', [])):
        if 'uri' in buf or i != 0 or bin_length is None or not isinstance(buf.get('byteLength'), int) or not 0 <= bin_length - buf['byteLength'] <= 3:
            raise ValueError('invalid or external GLB buffer')
    if any('uri' in image for image in obj.get('images', [])):
        raise ValueError('external GLB image')
    return data[:20] + fixed + data[end:], bool(zeros)


def intake(archive, out):
    archive, out = Path(archive), Path(out)
    if out.exists():
        raise ValueError('output must not already exist')
    files, records, features = {}, [], []
    with zipfile.ZipFile(archive) as z:
        if len(z.infolist()) > 10000 or sum(i.file_size for i in z.infolist()) > 256 * 1024**2:
            raise ValueError('archive exceeds intake limits')
        for info in z.infolist():
            p = PurePosixPath(info.filename)
            if p.is_absolute() or '..' in p.parts or '\\' in info.filename or ':' in info.filename or stat.S_ISLNK(info.external_attr >> 16):
                raise ValueError('unsafe archive path')
            if info.is_dir():
                continue
            if len(p.parts) != 2 or p.parts[0] != 'mount-vernon' or p.suffix not in {'.glb', '.json', '.png'} or p.name in files:
                raise ValueError('unexpected or duplicate archive member')
            raw = z.read(info)
            fixed, repaired = normalize_glb(raw) if p.suffix == '.glb' else (raw, False)
            files[p.name] = fixed
            records.append({'name': p.name, 'bytes': len(fixed), 'source_sha256': sha(raw), 'sha256': sha(fixed), 'json_padding_repaired': repaired})
    doc = json.loads(files.get('tileset.json', b'{}'))
    if doc.get('asset', {}).get('version') != '1.1' or not isinstance(doc.get('root'), dict):
        raise ValueError('expected 3D Tiles 1.1 root')
    def visit(tile):
        box = tile.get('boundingVolume', {}).get('box')
        content = tile.get('content')
        if content:
            uri = content.get('uri')
            if uri not in files or not uri.endswith('.glb'):
                raise ValueError('missing or nonlocal tile payload: '+str(uri))
            if not isinstance(box, list) or len(box) != 12 or not all(isinstance(n, (int,float)) and math.isfinite(n) for n in box):
                raise ValueError('invalid tile box')
            props = tile.get('metadata', {}).get('properties', {})
            features.append({'uri': uri, 'kind': tile.get('metadata', {}).get('class', 'unknown'), 'feature_id': props.get('building_id', uri), 'quality': props.get('ql_tag'), 'source': props.get('source'), 'box': box, 'geometric_error': tile.get('geometricError'), 'properties': props})
        for child in tile.get('children', []):
            visit(child)
    visit(doc['root'])
    if not features:
        raise ValueError('no tile content')
    for key in ('featureIdAtlas','propertyAtlas'):
        uri=doc.get('extras',{}).get('featureTextures',{}).get(key)
        if uri and uri not in files:raise ValueError('missing feature texture: '+uri)
    inst=doc.get('extras',{}).get('instancing',{})
    for key in ('vegetation','prototype','prototypeGlb'):
        if inst.get(key) and inst[key] not in files:raise ValueError('missing instancing asset: '+inst[key])
    records.sort(key=lambda r:r['name']);features.sort(key=lambda r:r['uri'])
    summary={'schema':'river-valley-local-tile-intake/v1','source_archive_sha256':sha(archive.read_bytes()),'classification':'local-frame preview only','geographic_registration':'unverified; no authoritative local-to-earth transform supplied','declared_srid':doc.get('extras',{}).get('srid'),'root_transform_present':bool(doc['root'].get('transform')),'asset_count':len(records),'glb_count':sum(r['name'].endswith('.glb') for r in records),'repaired_glbs':sum(r['json_padding_repaired'] for r in records),'referenced_tiles':len(features),'assets':records,'features':features}
    out.mkdir(parents=True);tiles=out/'mount-vernon';tiles.mkdir()
    for name,data in files.items():(tiles/name).write_bytes(data)
    (out/'catalog.json').write_text(json.dumps(summary,indent=2,allow_nan=False)+'\n')
    with sqlite3.connect(out/'catalog.sqlite3') as db:
        db.executescript('CREATE TABLE assets(name TEXT PRIMARY KEY, bytes INTEGER NOT NULL, source_sha256 TEXT NOT NULL, sha256 TEXT NOT NULL, repaired INTEGER NOT NULL); CREATE TABLE features(uri TEXT PRIMARY KEY REFERENCES assets(name), kind TEXT, feature_id TEXT, quality TEXT, source TEXT, x REAL, y REAL, z REAL, properties_json TEXT); CREATE INDEX feature_kind ON features(kind); CREATE INDEX feature_id ON features(feature_id); CREATE TABLE metadata(key TEXT PRIMARY KEY,value TEXT);')
        db.executemany('INSERT INTO assets VALUES(?,?,?,?,?)',[(r['name'],r['bytes'],r['source_sha256'],r['sha256'],int(r['json_padding_repaired'])) for r in records])
        db.executemany('INSERT INTO features VALUES(?,?,?,?,?,?,?,?,?)',[(r['uri'],r['kind'],r['feature_id'],r['quality'],r['source'],*r['box'][:3],json.dumps(r['properties'])) for r in features])
        db.executemany('INSERT INTO metadata VALUES(?,?)',[(k,json.dumps(v)) for k,v in summary.items() if k not in ('assets','features')])
    return summary


if __name__=='__main__':
    p=argparse.ArgumentParser(description=__doc__);p.add_argument('archive',type=Path);p.add_argument('output',type=Path);a=p.parse_args();s=intake(a.archive,a.output);print(json.dumps({k:v for k,v in s.items() if k not in ('assets','features')},indent=2))
