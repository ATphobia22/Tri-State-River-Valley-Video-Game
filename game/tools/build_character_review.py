"""Build a self-contained opt-in character review edition of the normal game."""
import base64
import hashlib
import json
import sys
from pathlib import Path


def build(game, target):
    shell = (game / 'River_Valley_Family_Adventure_OFFLINE.html').read_bytes()
    review = {'build': hashlib.sha256(shell).hexdigest()}
    for actor in ('river', 'scout'):
        data = (game / 'art' / 'character-review' / (actor + '.glb')).read_bytes()
        review[actor] = base64.b64encode(data).decode('ascii')
        review[actor + 'Hash'] = hashlib.sha256(data).hexdigest()
    boot = '<script>window.ValleyCharacterReview=' + json.dumps(review) + ';</script>'
    if shell.count(b'</head>') != 1:
        raise ValueError('Unexpected game shell')
    target.write_bytes(shell.replace(b'</head>', boot.encode() + b'</head>'))


if __name__ == '__main__':
    build(Path(__file__).resolve().parents[1], Path(sys.argv[1]))
