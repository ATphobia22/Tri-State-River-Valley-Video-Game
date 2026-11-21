from pathlib import Path
from PIL import Image, ImageDraw, ImageFont
import math, shutil, subprocess
R=Path(__file__).resolve().parent.parent
caps=sorted((R/'capture/v1_2').glob('frame-*.jpg'))
assert len(caps)>=75
out=R/'capture/video_frames';out.mkdir(parents=True,exist_ok=True)
for p in out.glob('f*.jpg'):p.unlink()
W,H=1280,720
regular='/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf'
serif='/usr/share/fonts/truetype/dejavu/DejaVuSerif.ttf'
heading=ImageFont.truetype(serif,58);sub=ImageFont.truetype(regular,23);small=ImageFont.truetype(regular,17)

def title_card(title,tag,line):
 im=Image.new('RGB',(W,H));d=ImageDraw.Draw(im)
 for y in range(H):
  t=y/H;d.line([(0,y),(W,y)],fill=(round(14+44*t),round(37+40*t),round(52+48*t)))
 # sunset
 d.ellipse((960,110,1090,240),fill=(255,203,129))
 d.polygon([(0,460),(180,385),(320,445),(510,340),(700,428),(935,380),(1280,445),(1280,720),(0,720)],fill=(31,75,69))
 d.polygon([(0,530),(245,490),(480,551),(720,480),(940,529),(1280,463),(1280,720),(0,720)],fill=(16,55,51))
 d.rectangle((0,572,W,H),fill=(21,79,92))
 for i in range(25):
  x=(i*97)%W;y=585+(i*21)%125;d.line([(x,y),(x+48,y)],fill=(45,116,122),width=2)
 d.rounded_rectangle((104,166,940,475),radius=22,fill=(15,36,35))
 d.text((135,188),tag,font=sub,fill=(142,226,191))
 d.text((131,253),title,font=heading,fill=(251,230,183))
 d.text((139,364),line,font=sub,fill=(220,233,218))
 d.text((139,414),'Browser capture · real playable minigames · 2D mode',font=small,fill=(185,213,206))
 return im
counter=0
for item in [title_card('River Valley','FAMILY ADVENTURE · BUILD 1.2','Hunt · Fish · Cook · Explore'),]:
 for k in range(32):item.save(out/f'f{counter:04d}.jpg',quality=92);counter+=1
for p in caps:
 im=Image.open(p)
 for k in range(3):
  shutil.copyfile(p,out/f'f{counter:04d}.jpg');counter+=1
for item in [title_card('Play your story','YOUR VALLEY, YOUR ADVENTURE','Free family exploration · local saves · offline-ready on install')]:
 for k in range(34):item.save(out/f'f{counter:04d}.jpg',quality=92);counter+=1
mp4=R/'docs/River_Valley_v1_2_Actual_Min_games.mp4'
cmd=['ffmpeg','-hide_banner','-loglevel','error','-y','-framerate','24','-i',str(out/'f%04d.jpg'),'-c:v','libx264','-pix_fmt','yuv420p','-preset','medium','-crf','22','-profile:v','high','-movflags','+faststart',str(mp4)]
subprocess.run(cmd,check=True)
subprocess.run(['ffprobe','-hide_banner','-v','error','-select_streams','v:0','-show_entries','stream=codec_name,width,height,nb_frames,duration','-of','default=noprint_wrappers=1',str(mp4)],check=True)
print('Generated',mp4,mp4.stat().st_size,'total frames',counter)
