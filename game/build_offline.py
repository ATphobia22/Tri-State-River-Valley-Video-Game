from build_common import ROOT, compile_source, serialize
import hashlib

soup = compile_source()
for tag in soup.find_all('link'):
    if tag.get('rel') and ('manifest' in tag['rel'] or 'apple-touch-icon' in tag['rel']):
        tag.decompose()
target = ROOT / 'River_Valley_Family_Adventure_OFFLINE.html'
target.write_text(serialize(soup), encoding='utf-8')
print('Single offline HTML:', target, target.stat().st_size, hashlib.sha256(target.read_bytes()).hexdigest())
