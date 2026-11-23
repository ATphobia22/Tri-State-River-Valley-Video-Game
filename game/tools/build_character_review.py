"""Build a self-contained opt-in character review edition of the normal game."""
import base64
import hashlib
import json
import sys
import struct
from pathlib import Path


def require_candidate(raw, actor):
    if len(raw) < 20 or len(raw) > 2_000_000 or raw[:4] != b'glTF':
        raise ValueError(f'{actor}: invalid GLB candidate')
    version, total, json_length, kind = struct.unpack_from('<IIII', raw, 4)
    if version != 2 or total != len(raw) or kind != 0x4e4f534a or json_length > len(raw) - 20:
        raise ValueError(f'{actor}: invalid GLB header/chunk')
    doc = json.loads(raw[20:20 + json_length])
    clips = {animation.get('name') for animation in doc.get('animations', [])}
    expected = (27, {'Idle','Walk','Run','Sprint','Jump','Land','Farm','FishingCast','Cook','Track','Drive','Interact','Wave'}) if actor == 'river' else (16, {'Idle','Walk','Run'})
    if doc.get('asset', {}).get('version') != '2.0' or len(doc.get('skins', [])) != 1 or len(doc['skins'][0].get('joints', [])) != expected[0] or not expected[1].issubset(clips):
        raise ValueError(f'{actor}: failed joint/animation contract')
    if doc.get('extensionsRequired') or any('uri' in b for b in doc.get('buffers', [])) or any('uri' in i for i in doc.get('images', [])):
        raise ValueError(f'{actor}: external resources/extensions prohibited')
    return doc


def build(game, target):
    shell = (game / 'River_Valley_Family_Adventure_OFFLINE.html').read_bytes()
    review = {'build': hashlib.sha256(shell).hexdigest()}
    for actor in ('river', 'scout'):
        data = (game / 'art' / 'character-review' / (actor + '.glb')).read_bytes()
        require_candidate(data, actor)
        review[actor] = base64.b64encode(data).decode('ascii')
        review[actor + 'Hash'] = hashlib.sha256(data).hexdigest()
    boot = '<script>window.ValleyCharacterReview=' + json.dumps(review) + ';</script>'
    if shell.count(b'</head>') != 1:
        raise ValueError('Unexpected game shell')
    target.write_bytes(shell.replace(b'</head>', boot.encode() + b'</head>'))


if __name__ == '__main__':
    build(Path(__file__).resolve().parents[1], Path(sys.argv[1]))
