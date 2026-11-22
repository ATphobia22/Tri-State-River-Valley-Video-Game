from pathlib import Path
from bs4 import BeautifulSoup
p=Path(__file__).parent
html=(p/'River_Valley_Family_Adventure_OFFLINE.html').read_text()
soup=BeautifulSoup(html,'html.parser')
manifest=soup.new_tag('link',rel='manifest',href='./game.webmanifest');soup.head.append(manifest)
soup.head.append(soup.new_tag('meta',attrs={'name':'apple-mobile-web-app-capable','content':'yes'}))
soup.head.append(soup.new_tag('meta',attrs={'name':'apple-mobile-web-app-title','content':'River Valley'}))
script=soup.new_tag('script');script.string="""
if('serviceWorker' in navigator && ['https:','http:'].includes(location.protocol)) {
  navigator.serviceWorker.register('./game-sw.js',{scope:'./'}).then(async reg=>{
    try {
      await navigator.serviceWorker.ready;
      const cache=await caches.open('rva-game-1.9.6');
      const scoped=new URL('./game.html',location.href).pathname;
      const saved=await cache.match(scoped);
      const el=document.getElementById('offlineStatus');
      if(el)el.textContent=saved?'✓ Offline game cached · install from browser menu':'Offline install requires one successful online load';
    } catch(e){console.warn('Offline cache status unavailable',e);}
  }).catch(e=>{console.warn('PWA registration unavailable',e);const el=document.getElementById('offlineStatus');if(el)el.textContent='Offline install unavailable; try Safari/Chrome over HTTPS';});
}
"""
soup.body.append(script)
(p/'game.html').write_text('<!doctype html>\n'+str(soup))
print('Hosted HTML:',(p/'game.html').stat().st_size)
