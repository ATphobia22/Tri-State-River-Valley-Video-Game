#!/usr/bin/env python3
"""Deterministic, data-bound OKVIZ Synoptic admission status schematic.

The SVG is a three-source operations dashboard, not an invented geographic map.
No network, rendered asset or external credentials are involved.
"""
import argparse
import csv
import io
import json
from pathlib import Path
from xml.etree import ElementTree as ET

ROOT = Path(__file__).resolve().parents[1]
REGISTRY = ROOT / "data" / "geographic" / "source-registry.json"
SVG = ROOT / "ops" / "source-admission-synoptic.svg"
CSV = ROOT / "ops" / "source-admission.csv"
LABELS = {
    "usgs-posey-2013-ept": ("USGS 3DEP EPT", "LiDAR source", "CRS and datum unverified"),
    "cesium-ion-mount-vernon-buildings": ("Mount Vernon LoD2", "3D Tiles buildings", "Ion status only user reported"),
    "cesium-ion-posey-terrain": ("Posey Terrain", "Cesium ion terrain", "Ion status only user reported"),
}

def render():
    registry = json.loads(REGISTRY.read_text(encoding="utf-8"))
    sources = registry["sources"]
    ids = [s["id"] for s in sources]
    if len(ids) != 3 or len(set(ids)) != 3 or any(i not in LABELS for i in ids):
        raise ValueError("admission schematic requires exactly the three registered sources; update design explicitly")
    rows = [(i, *LABELS[i]) for i in ids]
    svg = []
    svg.append('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 920 365" data-okviz-svg-author="River Valley Engineering" data-okviz-svg-attribution="River Valley geographic source registry; candidate inventory only">')
    svg.append('<rect x="0" y="0" width="920" height="365" rx="20" fill="#f7f9fc" data-okviz-area-type="decoration"/>')
    svg.append('<g data-okviz-area-type="decoration" fill="#182d46" font-family="Arial, sans-serif">')
    svg.append('<text x="32" y="37" font-size="23" font-weight="bold">RIVER VALLEY  /  SOURCE ADMISSION</text>')
    svg.append('<text x="32" y="61" fill="#475b70" font-size="13">Three independent source candidates · Not a geographic map or surveyed overlay</text>')
    for i, (_, title, subtitle, note) in enumerate(rows):
        x = 32 + i * 302
        svg.append(f'<text x="{x}" y="105" font-size="17" font-weight="bold">{title}</text>')
        svg.append(f'<text x="{x}" y="123" font-size="12" fill="#586b7b">{subtitle}</text>')
        svg.append(f'<text x="{x}" y="273" font-size="12" fill="#586b7b">{note}</text>')
    svg.append('<text x="32" y="326" fill="#586b7b" font-size="12">Power BI Category column: id   ·   Resting fills are neutral; Synoptic Panel colors regions from bound status data</text>')
    svg.append('</g>')
    for i, (id, _, _, _) in enumerate(rows):
        x = 32 + i * 302
        svg.append(f'<rect id="{id}" x="{x}" y="137" width="270" height="109" rx="11" fill="#e3e9f2" stroke="#7386a6" stroke-width="2" data-okviz-area-type="area"/>')
    svg.append('</svg>')
    text = '\n'.join(svg)
    ET.fromstring(text)
    output = io.StringIO()
    writer = csv.writer(output, lineterminator='\n')
    writer.writerow(['id', 'kind', 'registration_status', 'production_approved', 'verified'])
    for source in sources:
        identifier = source['id']
        kind = LABELS[identifier][1]
        # Never claim verified unless both source and independent registration checks are true.
        source_verified = source.get('actualStatusVerified', source.get('sourceCRSVerified', False)) is True
        georeg_verified = source.get('georegistrationVerified', source.get('verticalDatumVerified', False)) is True
        verified = bool(source_verified and georeg_verified)
        approved = bool(verified and source.get('productionApproved') is True)
        writer.writerow([identifier, kind, 'verified' if verified else 'candidate_unverified',
                         int(approved), int(verified)])
    return text, output.getvalue()

def main():
    p = argparse.ArgumentParser()
    g = p.add_mutually_exclusive_group(required=True)
    g.add_argument('--write', action='store_true')
    g.add_argument('--check', action='store_true')
    args = p.parse_args()
    svg, csv_text = render()
    if args.write:
        SVG.parent.mkdir(parents=True, exist_ok=True)
        SVG.write_text(svg, encoding='utf-8')
        CSV.write_text(csv_text, encoding='utf-8')
        print('updated three-source Synoptic SVG and CSV from registry')
        return
    for path, expected in ((SVG, svg), (CSV, csv_text)):
        if not path.is_file() or path.read_text(encoding='utf-8') != expected:
            raise SystemExit(f'{path}: stale or not synchronized with source registry; use --write')
    print('Synoptic keys, statuses and production gates match the source registry')

if __name__ == '__main__':
    main()
