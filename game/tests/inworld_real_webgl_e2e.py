"""Mesa software-OpenGL integration test of in-world 3D gameplay without GPU mocks.
UI controls invoke same production window.RiverValleyDebug actions. Save rehydration uses
synthetic localStorage because this sandbox blocks HTTP(S) navigation / local-file navigation.
"""
from playwright.sync_api import sync_playwright
from pathlib import Path
from bs4 import BeautifulSoup
import json, sys
root=Path(__file__).resolve().parent.parent
soup=BeautifulSoup((root/'River_Valley_Family_Adventure_OFFLINE.html').read_text(),'html.parser')
shim=soup.new_tag('script');shim.string="""window.__gameStore={};Object.defineProperty(window,'localStorage',{configurable:true,value:{getItem(k){return window.__gameStore[k]??null},setItem(k,v){window.__gameStore[k]=String(v)},removeItem(k){delete window.__gameStore[k]}}});""";soup.head.insert(0,shim)
html=str(soup)
errors=[];checks={}
with sync_playwright() as p:
  browser=p.chromium.launch(executable_path='/usr/bin/chromium',headless=False,args=['--no-sandbox','--use-gl=angle','--use-angle=gl','--ignore-gpu-blocklist','--enable-webgl','--disable-dev-shm-usage'])
  page=browser.new_page(viewport={'width':1280,'height':800})
  page.on('pageerror',lambda e:errors.append(str(e)))
  page.set_content(html,wait_until='domcontentloaded',timeout=45000)
  page.evaluate("document.getElementById('playBtn').click()")
  checks['webgl']=page.evaluate("RiverValleyDebug.getState().renderMode==='webgl'")
  checks['four_physical_sites']=page.evaluate('RiverValleyDebug.getState().worldSites===4')
  # Shared inventory is consumed/awarded by in-world actions, no 2D minigame modal.
  r=page.evaluate("""() => {
    const d=RiverValleyDebug;
    d.teleport('farm');d.complete();
    const initial=d.getState().coins;
    d.openWorldActivity('farm');d.worldAction('plot');
    const growing=d.getState().worldActivity==='farm';
    // Fast-forward to the saved harvest timestamp without bypassing core farm rules.
    const field=JSON.parse(localStorage.getItem('river-family-adventure-v1-slot-0'));
    const harvestAt=field.farmPlots.find(t=>t>0);
    const beforeHarvest=Date.now;Date.now=()=>harvestAt+100;
    try{d.worldAction('plot')}finally{Date.now=beforeHarvest;}
    const corn=d.getState().inventory.corn;
    d.openWorldActivity('hunt');d.worldAction('track');
    const target=d.getState().worldHuntTarget;
    const aim=document.getElementById('worldAim');aim.value=String(Math.round(target*100));aim.dispatchEvent(new Event('input',{bubbles:true}));
    d.worldAction('shoot');const game=d.getState().inventory.game;
    d.openWorldActivity('fish');d.worldAction('cast');
    const bite=d.getState().worldFishBiteAt;
    const savedNow=Date.now;let simulated=bite+100;Date.now=()=>simulated;
    let hooked=false;
    try{
      d.worldAction('reel');hooked=d.getState().worldFishPhase==='fight';
      for(let i=0;i<3;i++){
        simulated+=320;
        const target=d.getState().worldFishTarget;
        const meter=document.getElementById('worldAim');
        meter.value=String(Math.round(target*100));
        meter.dispatchEvent(new Event('input',{bubbles:true}));
        d.worldAction('reel');
      }
    }finally{Date.now=savedNow;}
    const fish=d.getState().inventory.fish;
    d.openWorldActivity('cook');d.worldAction('fishFry');
    const meals=d.getState().inventory.meals;
    document.getElementById('driveBtn').click();
    const mode=d.getState().mode;
    const isModal=document.getElementById('activityPanel').classList.contains('open');
    const persisted=!!localStorage.getItem('river-family-adventure-v1-slot-0');
    d.closeWorldActivity();
    return {initial,growing,corn,game,fish,meals,mode,isModal,persisted,stored:JSON.stringify(window.__gameStore)};
  }""")
  checks.update({'reward_coins':r['initial']>0,'farm_in_world':r['growing'],'corn_harvested':r['corn']==1,'hunt_success':r['game']==1,'fish_success':r['fish']==1,'cook_success':r['meals']==1,'drive_mode':r['mode']=='drive','no_legacy_modal':not r['isModal'],'local_save':r['persisted']})
  page.screenshot(path=str(root/'docs/v17-inworld-browser-verified.png'),animations='disabled',timeout=12000)
  restored=BeautifulSoup(html,'html.parser');init=restored.new_tag('script');init.string='Object.assign(window.__gameStore,'+r['stored']+');';restored.head.insert(1,init)
  page.set_content(str(restored),wait_until='domcontentloaded',timeout=45000)
  page.evaluate("document.getElementById('resumeBtn').click()")
  checks['save_reload_meals']=page.evaluate('RiverValleyDebug.getState().inventory.meals')==r['meals']
  checks['save_reload_drive']=page.evaluate('RiverValleyDebug.getState().mode')=='drive'
  browser.close()
print(json.dumps({'checks':checks,'errors':errors},indent=2))
if errors or not all(checks.values()):sys.exit(1)
