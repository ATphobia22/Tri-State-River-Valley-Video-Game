"""Audit a repaired local-frame 3D Tiles preview. Never certify geography."""
import argparse
import hashlib
import json
import math
import struct
import zipfile
from pathlib import PurePosixPath


def box_limits(box):
    if not isinstance(box, list) or len(box) != 12 or any(type(n) not in (int, float) or not math.isfinite(n) for n in box):
        raise ValueError('invalid bounding volume box')
    center = box[:3]
    axes = [box[3:6], box[6:9], box[9:12]]
    if any(sum(c*c for c in axis) <= 0 for axis in axes):
        raise ValueError('degenerate bounding volume box')
    half = [sum(abs(axis[i]) for axis in axes) for i in range(3)]
    return [(center[i]-half[i], center[i]+half[i]) for i in range(3)]


def within(child, parent, tolerance=1e-5):
    return all(p[0]-tolerance <= c[0] and c[1] <= p[1]+tolerance for c, p in zip(child, parent))


def audit_package(path):
    errors = []
    with zipfile.ZipFile(path) as archive:
        members = archive.infolist()
        if len(members) > 10000 or sum(m.file_size for m in members) > 256*1024**2:
            raise ValueError('archive size limits exceeded')
        names = [m.filename for m in members if not m.is_dir()]
        if len(names) != len(set(names)):
            raise ValueError('duplicate archive member')
        for m in members:
            p = PurePosixPath(m.filename)
            if p.is_absolute() or '..' in p.parts or '\\' in m.filename or ':' in m.filename or (m.external_attr >> 16) & 0o170000 == 0o120000:
                raise ValueError('unsafe archive path')
        if 'preview/catalog.json' not in names or 'preview/mount-vernon/tileset.json' not in names:
            raise ValueError('missing catalog or tileset')
        catalog = json.loads(archive.read('preview/catalog.json'))
        tile = json.loads(archive.read('preview/mount-vernon/tileset.json'))
        if catalog.get('schema') != 'river-valley-local-tile-intake/v1':
            errors.append('unsupported catalog schema')
        files = catalog.get('assets')
        if not isinstance(files, list) or not files:
            raise ValueError('empty asset inventory')
        asset_names = set()
        repaired = 0
        for record in files:
            name = record.get('name', '')
            if not isinstance(name, str) or not name or '/' in name or name in asset_names:
                errors.append('invalid or duplicate asset name')
                continue
            asset_names.add(name)
            member = 'preview/mount-vernon/' + name
            if member not in names:
                errors.append('missing asset: '+name)
                continue
            payload = archive.read(member)
            if len(payload) != record.get('bytes') or hashlib.sha256(payload).hexdigest() != record.get('sha256'):
                errors.append('asset size or digest mismatch: '+name)
            if name.endswith('.glb'):
                if len(payload) < 20 or struct.unpack_from('<4sII', payload) != (b'glTF', 2, len(payload)):
                    errors.append('invalid GLB header: '+name)
            repaired += record.get('json_padding_repaired') is True
        actual_assets = set(n.removeprefix('preview/mount-vernon/') for n in names if n.startswith('preview/mount-vernon/'))
        if actual_assets != asset_names:
            errors.append('asset inventory differs from archive membership')
        if catalog.get('asset_count') != len(files) or catalog.get('glb_count') != sum(n.endswith('.glb') for n in asset_names) or catalog.get('repaired_glbs') != repaired:
            errors.append('catalog counts disagree with inventory')
        if tile.get('asset', {}).get('version') != '1.1' or not isinstance(tile.get('root'), dict):
            raise ValueError('invalid 3D Tiles 1.1 manifest')
        root = tile['root']
        if root.get('transform') or catalog.get('root_transform_present'):
            errors.append('unexpected transform: review coordinate registration separately')
        root_bounds = box_limits(root.get('boundingVolume', {}).get('box'))
        visited = []
        def walk(node):
            bounds = box_limits(node.get('boundingVolume', {}).get('box'))
            if not within(bounds, root_bounds):
                errors.append('tile outside declared root bounding volume: '+str((node.get('content') or {}).get('uri', 'root')))
            if 'transform' in node:
                errors.append('tile transform requires independent geographic review')
            content = node.get('content')
            if content is not None:
                uri = content.get('uri') if isinstance(content, dict) else None
                if not isinstance(uri, str) or uri not in asset_names or not uri.endswith('.glb'):
                    errors.append('unresolved tile payload: '+str(uri))
                else:
                    visited.append(uri)
            for child in node.get('children', []):
                walk(child)
        walk(root)
        features = catalog.get('features')
        if not isinstance(features, list) or len(features) != len(visited) or sorted(f['uri'] for f in features) != sorted(visited):
            errors.append('feature catalog does not match tileset references')
        if catalog.get('referenced_tiles') != len(visited):
            errors.append('referenced tile count mismatch')
        if catalog.get('classification') != 'local-frame preview only' or not str(catalog.get('geographic_registration','')).lower().startswith('unverified'):
            errors.append('misleading registration classification')
        return {'ok':not errors,'classification':'LOCAL_PREVIEW_ONLY','geographic_publishable':False,
                'assets_checked':len(asset_names),'tiles_checked':len(visited),'errors':errors,
                'next_gate':'Require independent control points, frame transform, terrain alignment, validated glTF and renderer QA.'}


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('package', help='Repaired preview ZIP from tile_intake.py')
    args = parser.parse_args()
    report = audit_package(args.package)
    print(json.dumps(report, indent=2))
    return 0 if report['ok'] else 1


if __name__ == '__main__':
    raise SystemExit(main())
