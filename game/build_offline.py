from pathlib import Path
from bs4 import BeautifulSoup
import hashlib,json,zipfile,subprocess,sys
ROOT=Path(__file__).resolve().parent
subprocess.run([sys.executable,str(ROOT/'tools'/'build_character_lods.py')],check=True)
subprocess.run([sys.executable,str(ROOT/'tools'/'build_landmark_anchors.py')],check=True)
soup=BeautifulSoup((ROOT/'index.html').read_text(encoding='utf-8'),'html.parser')
for tag in soup.find_all('script',src=True):
    path=ROOT/tag['src']
    raw=path.read_text(encoding='utf-8')
    if '</script' in raw.lower():
        raise RuntimeError(f'Unsafe inline close tag found in {path}')
    del tag['src']
    tag.string=raw
for tag in soup.find_all('link'):
    if tag.get('rel') and ('manifest' in tag['rel'] or 'apple-touch-icon' in tag['rel']):
        tag.decompose()
# The source HTML contains cleanup, not a worker registration.
# Preserve that cleanup in the self-contained download as well.
if 'serviceWorker.register(' in str(soup):
    raise RuntimeError('Service-worker registration is disabled in offline builds')
html='<!doctype html>\n'+str(soup).replace('<!DOCTYPE html>','')
target=ROOT/'River_Valley_Family_Adventure_OFFLINE.html'
target.write_text(html,encoding='utf-8')
print('Single offline HTML:',target,target.stat().st_size,hashlib.sha256(target.read_bytes()).hexdigest())
