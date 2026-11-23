from pathlib import Path
from bs4 import BeautifulSoup
p=Path(__file__).parent
html=(p/'River_Valley_Family_Adventure_OFFLINE.html').read_text()
soup=BeautifulSoup(html,'html.parser')
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
