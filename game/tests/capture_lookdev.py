from pathlib import Path
from playwright.sync_api import sync_playwright
from PIL import Image,ImageDraw,ImageFont
import io,sys,json
R=Path(__file__).parent.parent
with sync_playwright() as p:
 b=p.chromium.launch(executable_path='/usr/bin/chromium',headless=True,args=['--no-sandbox','--disable-dev-shm-usage','--disable-gpu'])
 pg=b.new_page(viewport={'width':1280,'height':720})
 pg.set_content((R/'River_Valley_Family_Adventure_OFFLINE.html').read_text(),wait_until='domcontentloaded',timeout=60000)
 pg.evaluate('''()=>{window.ValleyStoryscape.render(document.querySelector('#stageCanvas'),'riverfront','golden',12345);}''')
 choices=[('riverfront','golden','01-sunset-riverfront'),('farm','natural','02-harvest-farm'),('woods','lantern','03-firefly-woods'),('riverfront','storm','04-ohio-stormfront')]
 im=[]
 for place,look,stem in choices:
  pg.evaluate('(a)=>window.ValleyStoryscape.render(document.querySelector("#stageCanvas"),a[0],a[1],4300)',[place,look])
  import base64
  raw=base64.b64decode(pg.evaluate('document.querySelector("#stageCanvas").toDataURL("image/png")').split(',',1)[1])
  path=R/'docs'/f'{stem}.png';path.write_bytes(raw)
  art=Image.open(io.BytesIO(raw)).convert('RGB').resize((640,360),Image.Resampling.LANCZOS)
  im.append((stem.replace('-',' ').title(),art))
 pg.close();b.close()
board=Image.new('RGB',(1320,844),(9,27,30));d=ImageDraw.Draw(board)
font=ImageFont.truetype('/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf',18)
serif=ImageFont.truetype('/usr/share/fonts/truetype/dejavu/DejaVuSerif.ttf',34)
d.text((28,16),'RIVER VALLEY | VFX SUPERVISOR LOOK DEVELOPMENT',font=serif,fill=(241,211,151))
d.text((30,66),'Four original programmatic virtual backgrounds · independent of WebGL',font=font,fill=(180,209,193))
for i,(name,art) in enumerate(im):
 x=16+i%2*660;y=110+i//2*362
 board.paste(art,(x,y));d.text((x+15,y+318),name,font=font,fill=(240,227,204))
board.save(R/'docs/VFX_LOOKDEV_STORYBOARD.png')
print('Captured',len(im),'looks and storyboard', (R/'docs/VFX_LOOKDEV_STORYBOARD.png').stat().st_size)
