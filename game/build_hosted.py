from pathlib import Path
from bs4 import BeautifulSoup
p=Path(__file__).parent
import subprocess, sys
for tool in ('build_character_lods.py', 'build_landmark_anchors.py'):
    subprocess.run([sys.executable, str(p/'tools'/tool)], check=True)
html=(p/'index.html').read_text(encoding='utf-8')
soup=BeautifulSoup(html,'html.parser')
for tag in soup.find_all('script',src=True):
    raw=(p/tag['src']).read_text(encoding='utf-8')
    if '</script' in raw.lower():
        raise RuntimeError('Unsafe inline script: '+tag['src'])
    del tag['src']
    tag.string=raw
for tag in soup.find_all('link',rel='manifest'):
    tag.decompose()
manifest=soup.new_tag('link',rel='manifest',href='./game.webmanifest');soup.head.append(manifest)
soup.head.append(soup.new_tag('meta',attrs={'name':'apple-mobile-web-app-capable','content':'yes'}))
soup.head.append(soup.new_tag('meta',attrs={'name':'apple-mobile-web-app-title','content':'River Valley'}))
script=soup.new_tag('script');script.string="""
const el=document.getElementById('offlineStatus');
if(el)el.textContent='Website caching is disabled. Download the standalone HTML for offline play; saves stay local.';
"""
soup.body.append(script)
(p/'game.html').write_text('<!doctype html>\n'+str(soup))
print('Hosted HTML:',(p/'game.html').stat().st_size)
