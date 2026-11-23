"""Publish the streamed scene and a single-file copy with embedded assets."""
import base64
import hashlib
import json
import shutil
import sys
from pathlib import Path

source = Path(__file__).resolve().parents[1]

def package(destination):
    destination.mkdir(parents=True, exist_ok=True)
    for name in ('index.html', 'scene.js', 'THREE-LICENSE.txt', 'DRACO-LICENSE.txt'):
        shutil.copyfile(source / name, destination / name)
    shutil.copytree(source / 'assets', destination / 'assets', dirs_exist_ok=True)
    shutil.copyfile(source / 'evidence/cast-graded.mp4', destination / 'cast-graded.mp4')
    files = {p.name: p.read_bytes() for p in sorted((source / 'assets').iterdir()) if p.name != 'hashes.json'}
    hashes = {name: hashlib.sha256(data).hexdigest() for name, data in files.items()}
    hashes['scene.js'] = hashlib.sha256((source / 'scene.js').read_bytes()).hexdigest()
    files['hashes.json'] = json.dumps(hashes, sort_keys=True).encode()
    (destination / 'assets/hashes.json').write_bytes(files['hashes.json'])
    embedded = {name: base64.b64encode(data).decode() for name, data in files.items()}
    scripts = '<script>window.ValleySceneFiles=' + json.dumps(embedded) + ';</script>'
    scripts += '<script>' + (source / 'scene.js').read_text().replace('</script', '<\\/script') + '</script>'
    html = (source / 'index.html').read_text().replace('<script src="scene.js"></script>', scripts)
    import re
    html = re.sub(r'<p id="downloads">.*?</p>', '', html, count=1)
    (destination / 'valley-offline.html').write_text(html)

if __name__ == '__main__':
    package(Path(sys.argv[1]))
