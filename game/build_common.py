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
    license_tag = soup.new_tag('script', attrs={'type': 'text/plain', 'id': 'h3-license'})
    license_tag.string = '\n'.join((ROOT / 'vendor' / name).read_text(encoding='utf-8') for name in ('H3-LICENSE.txt', 'H3-NOTICE.txt'))
    soup.head.append(license_tag)
    if 'serviceWorker.register(' in str(soup):
        raise RuntimeError('Service-worker registration is disabled')
    return soup

def serialize(soup):
    return '<!doctype html>\n' + str(soup).replace('<!DOCTYPE html>', '')
