#!/usr/bin/env python3
"""Inspect allowlisted ion asset metadata via a scoped token; never persist secrets.

This verifies service state and type, not geographic accuracy, licensed reuse,
vertical alignment, ownership, regulatory fitness, or a production release.
No deletes, uploads, or automatic publish operations are supported.
"""
from __future__ import annotations

import argparse
from datetime import datetime, timezone
import json
import os
from pathlib import Path
from urllib.parse import urlparse
from urllib.request import Request, urlopen

API = 'https://api.cesium.com/v1/assets'
ASSETS = {6204792: {'type': '3DTILES', 'label': 'Mount Vernon LOD2 (user-reported)'},
          6155964: {'type': 'TERRAIN', 'label': 'Posey terrain (user-reported)'}}
MAX_RESPONSE_BYTES = 1_000_000


def read_json(url, token, opener=urlopen):
    if not isinstance(token, str) or not token.strip():
        raise ValueError('CESIUM_ION_TOKEN must be set')
    if not url.startswith(API + '/'):
        raise ValueError('unapproved ion API URL')
    req = Request(url, headers={'Authorization': 'Bearer ' + token.strip(),
                                'Accept': 'application/json'})
    with opener(req, timeout=25) as response:
        if response.status != 200:
            raise RuntimeError('ion metadata returned HTTP status ' + str(response.status))
        payload = response.read(MAX_RESPONSE_BYTES + 1)
    if len(payload) > MAX_RESPONSE_BYTES:
        raise ValueError('ion metadata exceeds byte budget')
    obj = json.loads(payload)
    if not isinstance(obj, dict):
        raise ValueError('ion metadata expected JSON object')
    return obj


def sanitize(asset_id, metadata, endpoint):
    if asset_id not in ASSETS:
        raise ValueError('asset ID is not in the approved candidate inventory')
    expected = ASSETS[asset_id]['type']
    if metadata.get('id') != asset_id:
        raise ValueError('returned metadata does not match requested asset')
    typ = metadata.get('type')
    state = metadata.get('status')
    if typ != expected or endpoint.get('type') != expected:
        raise ValueError('ion asset type mismatch')
    if state != 'COMPLETE':
        raise ValueError('ion asset not COMPLETE')
    tiles_url = endpoint.get('url')
    if not isinstance(tiles_url, str):
        raise ValueError('ion endpoint URL missing')
    parsed = urlparse(tiles_url)
    if (parsed.scheme != 'https' or not parsed.hostname or
            not (parsed.hostname == 'cesium.com' or parsed.hostname.endswith('.cesium.com'))):
        raise ValueError('ion endpoint host is not trusted Cesium HTTPS')
    return {'id': asset_id, 'expectedType': expected, 'status': 'ION_COMPLETE_METADATA_ONLY',
            'assetLabel': ASSETS[asset_id]['label'], 'endpointHost': parsed.hostname,
            'verifiedAtUTC': datetime.now(timezone.utc).isoformat(),
            'georegistrationVerified': False, 'verticalDatumVerified': False,
            'productionApproved': False}


def inspect(asset_id, token, reader=read_json):
    if asset_id not in ASSETS:
        raise ValueError('candidate asset not allowlisted')
    meta = reader(f'{API}/{asset_id}', token)
    end = reader(f'{API}/{asset_id}/endpoint', token)
    return sanitize(asset_id, meta, end)


def main(argv=None):
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument('--asset-id', type=int, choices=tuple(ASSETS), action='append')
    ap.add_argument('--out', type=Path, help='optional sanitized receipt path')
    args = ap.parse_args(argv)
    token = os.environ.get('CESIUM_ION_TOKEN')
    if not token:
        ap.error('CESIUM_ION_TOKEN read-only scoped secret is required; no token is stored')
    ids = args.asset_id or list(ASSETS)
    receipts = [inspect(asset_id, token) for asset_id in ids]
    result = {'schema': 'river-valley-ion-discovery/v1', 'assets': receipts,
              'claim': 'service metadata only; NOT surveyed or engineering-verified'}
    output = json.dumps(result, indent=2) + '\n'
    if args.out:
        args.out.parent.mkdir(parents=True, exist_ok=True)
        args.out.write_text(output, encoding='utf-8')
    print(output, end='')
    return 0

if __name__ == '__main__':
    raise SystemExit(main())
