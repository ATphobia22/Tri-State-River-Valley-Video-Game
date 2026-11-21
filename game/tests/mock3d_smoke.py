"""No GPU required: execute complete 3D scene graph with a fake WebGLRenderer, validating 3D wiring, terrain quadtree, road draping and UI."""
from pathlib import Path
from bs4 import BeautifulSoup
from playwright.sync_api import sync_playwright
import json,sys
root=Path(__file__).parent.parent
soup=BeautifulSoup((root/'River_Valley_Family_Adventure_OFFLINE.html').read_text(),'html.parser')
shim=soup.new_tag('script')
shim.string="""THREE.WebGLRenderer=class{constructor(){this.domElement=document.getElementById('world');this.info={render:{calls:0,triangles:0}};}setPixelRatio(){}setSize(){}render(){}dispose(){}};"""
# Insert after vendor scripts are defined but before the game module uses THREE.
for tag in soup.find_all('script'):
 if tag.string and '/* River Valley Family Adventure: self-contained' in tag.string:
  tag.insert_before(shim);break
else:raise Exception('Game entry not found')
results={};errors=[]
with sync_playwright() as p:
 b=p.chromium.launch(headless=True,executable_path='/usr/bin/chromium',args=['--no-sandbox','--disable-dev-shm-usage'])
 page=b.new_page(viewport={'width':1280,'height':720});page.on('pageerror',lambda err:errors.append(str(err)))
 page.set_content(str(soup),wait_until='domcontentloaded',timeout=60000);page.wait_for_timeout(900)
 state=page.evaluate('window.RiverValleyDebug?.getState()');results['loaded']=bool(state);results['3d_wired']=state['renderMode']=='webgl';results['terrain_tiles']=state['terrainTiles'];results['models_loaded']=state['modelCount'];results['atmosphere']=state['atmosphere'];results['triangles']=state['terrainTriangles'];results['roads']=state['roadSections'];results['building_near']=state['buildingDetailCount'];results['levels']=state['terrainLevels'];results['errorless_initialization']=not errors
 page.locator('#playBtn').click()
 for quality in ['low','high','auto']:
  page.locator('#settingsBtn').click();page.locator('#terrainDetail').select_option(quality);page.locator('#settingsBtn').click();page.wait_for_timeout(200)
  results[quality]=page.evaluate('window.RiverValleyDebug.getState()')['terrainTiles']
 page.evaluate("window.RiverValleyDebug.teleport('courthouse')");page.wait_for_timeout(180)
 results['moved_tiles']=page.evaluate('window.RiverValleyDebug.getState().terrainTiles')
 page.screenshot(path=str(root/'docs/3d-scene-graph-mock.png'))
 b.close()
print(json.dumps({'results':results,'errors':errors},indent=2))
if errors or not results['3d_wired'] or results['terrain_tiles']<16 or results['roads']<100 or results['auto']<16 or results['models_loaded']!=5 or not results['atmosphere'] or results['atmosphere']['flowerCount']<900:sys.exit(1)
