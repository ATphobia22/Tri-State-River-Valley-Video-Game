from pathlib import Path
from bs4 import BeautifulSoup
from playwright.sync_api import sync_playwright
import json
root=Path(__file__).resolve().parent.parent
soup=BeautifulSoup((root/'River_Valley_Family_Adventure_OFFLINE.html').read_text(),'html.parser')
shim=soup.new_tag('script');shim.string="""const __store={};Object.defineProperty(window,'localStorage',{configurable:true,value:{getItem:k=>__store[k]??null,setItem:(k,v)=>__store[k]=String(v),removeItem:k=>delete __store[k]}});"""
soup.head.insert(0,shim)
report={};errs=[]
with sync_playwright() as p:
 browser=p.chromium.launch(executable_path='/usr/bin/chromium',headless=True,args=['--no-sandbox','--disable-dev-shm-usage','--disable-gpu'])
 for kind,opts in [('desktop',{'viewport':{'width':1240,'height':820},'accept_downloads':True}),('mobile',{'viewport':{'width':390,'height':844},'is_mobile':True,'has_touch':True,'accept_downloads':True})]:
  page=browser.new_page(**opts);page.on('pageerror',lambda e:errs.append(str(e)))
  page.set_content(str(soup),wait_until='domcontentloaded');page.locator('#playBtn').click();page.locator('#settingsBtn').click();page.locator('#openCinema').click();page.locator('#openStage').click();page.wait_for_timeout(250)
  report[kind+'_initial']=page.evaluate("window.RiverValleyDebug.getState().shotIndex===0")
  page.locator('#stageNext').click();report[kind+'_next']=page.evaluate("window.RiverValleyDebug.getState().shotIndex===1 && window.RiverValleyDebug.getState().backdropLocation==='farm'")
  page.locator('#stagePrev').click();report[kind+'_prev']=page.evaluate("window.RiverValleyDebug.getState().shotIndex===0")
  page.locator('#stageTour').click();report[kind+'_running']=page.evaluate('window.RiverValleyDebug.getState().shotPlaying')
  page.wait_for_timeout(4460);report[kind+'_auto_advance']=page.evaluate('window.RiverValleyDebug.getState().shotIndex')==1
  page.locator('#stageTour').click();report[kind+'_pause']=not page.evaluate('window.RiverValleyDebug.getState().shotPlaying')
  with page.expect_download(timeout=10000) as download:
   page.locator('#stageBoard').click()
  report[kind+'_board']=download.value.suggested_filename=='River_Valley_Director_Shot_Board.png'
  with page.expect_download(timeout=10000) as download:
   page.locator('#stageCapture').click()
  report[kind+'_postcard']=download.value.suggested_filename.startswith('river-valley-')
  page.close()
 browser.close()
print(json.dumps({'checks':report,'errors':errs},indent=2));assert not errs and all(report.values())
