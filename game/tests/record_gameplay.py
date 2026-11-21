"""Recorded browser 2D minigame footage; no scripted screenshots represented as native 3D."""
from pathlib import Path
from playwright.sync_api import sync_playwright
from PIL import Image,ImageDraw,ImageFont
import time
ROOT=Path(__file__).resolve().parent.parent
OUT=ROOT/'capture'/ 'v1_2';OUT.mkdir(parents=True,exist_ok=True)
html=(ROOT/'River_Valley_Family_Adventure_OFFLINE.html').read_text()
errors=[]
with sync_playwright() as p:
 b=p.chromium.launch(headless=True,executable_path='/usr/bin/chromium',args=['--no-sandbox','--disable-dev-shm-usage','--enable-unsafe-swiftshader','--use-angle=swiftshader'])
 pg=b.new_page(viewport={'width':1280,'height':720},device_scale_factor=1)
 pg.on('pageerror',lambda e:errors.append(str(e)))
 pg.set_content(html,wait_until='domcontentloaded',timeout=60000);pg.wait_for_timeout(800)
 pg.locator('#playBtn').click();pg.wait_for_timeout(500)
 stages=[];counter=0
 def frame(scene,step):
  global counter
  path=OUT/f'frame-{counter:04d}.jpg';pg.screenshot(path=str(path),type='jpeg',quality=85,animations='allow')
  stages.append({'frame':counter,'scene':scene,'step':step});counter+=1
  pg.wait_for_timeout(110)
 # Hunting scene, actual UI and tracking reaction
 pg.locator('#huntBtn').click();pg.locator('#trackAnimal').click();pg.wait_for_timeout(160)
 val=float(pg.locator('.targetAnimal').get_attribute('style').split(':')[1].strip().replace('%',''))
 for j in range(20):
  a=50+(val-50)*min(1,j/17);pg.locator('#aimSlider').evaluate('(el,val)=>{el.value=val;el.dispatchEvent(new Event("input",{bubbles:true}))}',round(a))
  frame('hunt',j)
 pg.locator('#takeShot').click();[frame('hunt-result',j) for j in range(6)]
 pg.locator('#closeActivity').click()
 # Fishing; show cast, bobber, then reel
 pg.locator('#fishBtn').click();[frame('fishing-ready',j) for j in range(6)]
 pg.locator('#castBtn').click();
 for j in range(27):
  if pg.locator('#biteMessage').inner_text().find('BITE!')>=0:break
  frame('fishing-cast',j)
 try:
  pg.wait_for_function("document.getElementById('biteMessage').textContent.includes('BITE!')",timeout=6000,polling=10)
  frame('fishing-bite',0)
  pg.locator('#reelBtn').click()
 except Exception as e:
  errors.append('fish reel capture '+str(e)[:200]);pg.locator('#reelBtn').click()
 assert pg.evaluate('window.RiverValleyDebug.getState().inventory.fish')==1, 'Fishing catch was not recorded; capture rejected'
 for j in range(6):frame('fishing-result',j)
 pg.locator('#closeActivity').click()
 # Farm one corn; capture meadow then craft if eligible, actual gameplay not mocked
 pg.evaluate("window.RiverValleyDebug.teleport('farm')");pg.wait_for_timeout(200)
 pg.locator('#interactBtn').click();pg.locator('#interactBtn').click()
 pg.locator('#farmGrid button').first.click();pg.wait_for_timeout(8250);pg.locator('#farmGrid button').first.click();pg.locator('#farmDone').click()
 pg.locator('#cookBtn').click()
 for j in range(18):frame('campfire-cooking',j)
 assert pg.locator('[data-recipe="fishFry"]').is_enabled(), 'Fish-fry recipe disabled; gameplay capture rejected'
 pg.locator('[data-recipe="fishFry"]').click()
 assert pg.evaluate('window.RiverValleyDebug.getState().inventory.meals')==1, 'Cooking was not completed'
 for j in range(8):frame('cooked-meal',j)
 print('Recorded frames',counter,'errors',errors,'state',pg.evaluate('window.RiverValleyDebug.getState()'))
 b.close()
if errors:print('Warnings',errors)
# Add a transparent lower-third label to all frames from actual screen capture.
font_path='/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf';font=ImageFont.truetype(font_path,16)
for rec in stages:
 path=OUT/f"frame-{rec['frame']:04d}.jpg";im=Image.open(path).convert('RGB');ov=Image.new('RGBA',im.size,(0,0,0,0));d=ImageDraw.Draw(ov)
 d.rounded_rectangle((13,670,350,704),radius=10,fill=(5,26,25,195));d.text((24,680),'REAL 2D GAMEPLAY · v1.2',font=font,fill=(255,230,180,255))
 im=Image.alpha_composite(im.convert('RGBA'),ov).convert('RGB');im.save(path,quality=88)
(OUT/'capture_log.json').write_text(__import__('json').dumps({'frames':stages,'errors':errors,'note':'Browser frame capture of functional minigames in Chromium 2D mode, not GPU 3D'},indent=2))
