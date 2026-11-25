from pathlib import Path
import subprocess
import sys
from bs4 import BeautifulSoup

ROOT = Path(__file__).resolve().parent

def compile_source():
    for tool in ('build_character_lods.py', 'build_landmark_anchors.py'):
        subprocess.run([sys.executable, str(ROOT / 'tools' / tool)], check=True)
    soup = BeautifulSoup((ROOT / 'index.html').read_text(encoding='utf-8'), 'html.parser')
    for tag in soup.find_all('script', src=True):
        path = ROOT / tag['src']
        raw = path.read_text(encoding='utf-8')
        if '</script' in raw.lower():
            raise RuntimeError(f'Unsafe inline close tag found in {path}')
        del tag['src']
        tag.string = raw
    if 'serviceWorker.register(' in str(soup):
        raise RuntimeError('Service-worker registration is disabled')
    return soup

def serialize(soup):
    return '<!doctype html>\n' + str(soup).replace('<!DOCTYPE html>', '')
