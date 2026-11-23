"""Build a self-contained opt-in character review edition of the normal game."""
import base64
import hashlib
import json
import re
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
        raise ValueError(f'{actor}: failed joint/animation contract (joints={len(doc.get("skins", [{}])[0].get("joints", []))}, clips={sorted(clips)})')
    if doc.get('extensionsRequired') or any('uri' in b for b in doc.get('buffers', [])) or any('uri' in i for i in doc.get('images', [])):
        raise ValueError(f'{actor}: external resources/extensions prohibited')
    return doc


def build(game, target):
    offline = game / 'River_Valley_Family_Adventure_OFFLINE.html'
    if not offline.is_file():
        raise FileNotFoundError(f'Missing offline shell: {offline} (run npm --prefix game run build first)')
    shell = offline.read_bytes()
    if len(shell) < 2_000_000:
        raise ValueError(f'Offline shell too small ({len(shell)} bytes); rebuild required')

    # Idempotent: remove any prior review injection so count stays exactly 1.
    shell = re.sub(
        br'<script>\s*window\.ValleyCharacterReview\s*=\s*\{.*?\}\s*;?\s*</script>',
        b'',
        shell,
        flags=re.DOTALL,
    )

    review = {'build': hashlib.sha256(shell).hexdigest()}
    for actor in ('river', 'scout'):
        path = game / 'art' / 'character-review' / (actor + '.glb')
        if not path.is_file():
            raise FileNotFoundError(f'Missing character-review candidate: {path}')
        data = path.read_bytes()
        require_candidate(data, actor)
        review[actor] = base64.b64encode(data).decode('ascii')
        review[actor + 'Hash'] = hashlib.sha256(data).hexdigest()

    boot = '<script>window.ValleyCharacterReview=' + json.dumps(review, separators=(',', ':')) + ';</script>'
    if shell.count(b'</head>') != 1:
        raise ValueError('Unexpected game shell: expected exactly one </head>')
    target.write_bytes(shell.replace(b'</head>', boot.encode('utf-8') + b'</head>', 1))

    # Post-condition for Pages isolation test
    text = target.read_text(encoding='utf-8', errors='replace')
    if text.count('window.ValleyCharacterReview=') != 1:
        raise ValueError('character-review.html must contain exactly one ValleyCharacterReview assignment')


if __name__ == '__main__':
    build(Path(__file__).resolve().parents[1], Path(sys.argv[1]))
