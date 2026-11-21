from pathlib import Path
from bs4 import BeautifulSoup
import hashlib,json,zipfile
ROOT=Path(__file__).resolve().parent
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
for script in soup.find_all('script'):
    if script.string and "navigator.serviceWorker.register('./sw.js')" in str(script.string):
        script.decompose()
html='<!doctype html>\n'+str(soup).replace('<!DOCTYPE html>','')
target=ROOT/'River_Valley_Family_Adventure_OFFLINE.html'
target.write_text(html,encoding='utf-8')
print('Single offline HTML:',target,target.stat().st_size,hashlib.sha256(target.read_bytes()).hexdigest())
