from build_common import ROOT, compile_source, serialize

soup = compile_source()
for tag in soup.find_all('link', rel='manifest'):
    tag.decompose()
soup.head.append(soup.new_tag('link', rel='manifest', href='./game.webmanifest'))
soup.head.append(soup.new_tag('meta', attrs={'name':'apple-mobile-web-app-capable','content':'yes'}))
soup.head.append(soup.new_tag('meta', attrs={'name':'apple-mobile-web-app-title','content':'River Valley'}))
script = soup.new_tag('script')
script.string = """
const el=document.getElementById('offlineStatus');
if(el)el.textContent='Website caching is disabled. Download the standalone HTML for offline play; saves stay local.';
"""
soup.body.append(script)
target = ROOT / 'game.html'
target.write_text(serialize(soup), encoding='utf-8')
print('Hosted HTML:', target.stat().st_size)
