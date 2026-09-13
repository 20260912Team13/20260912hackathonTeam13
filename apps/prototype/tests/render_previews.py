"""Render review images without overwriting the supplied catalog posters."""
import base64,json,os,pathlib
from playwright.sync_api import sync_playwright
root=pathlib.Path(__file__).resolve().parents[1]
base=os.environ.get('MARS_BASE_URL','http://127.0.0.1:5178/').rstrip('/')+'/'
out=root/'.visual-qa/model-previews';out.mkdir(parents=True,exist_ok=True)
models=json.loads((root/'src/catalog.json').read_text(encoding='utf-8-sig'))['models']
with sync_playwright() as pw:
 browser=pw.chromium.launch(args=['--use-angle=swiftshader','--enable-unsafe-swiftshader'])
 page=browser.new_page(viewport={'width':1440,'height':900})
 for model in models:
  page.goto(base+'?preview=catalog&model='+model['id'],wait_until='networkidle')
  page.wait_for_function('window.marsPreview.world.ready')
  page.evaluate('window.marsPreview.world.setAutoRotate(false)')
  page.wait_for_timeout(700)
  raw=page.evaluate('window.marsPreview.world.snapshot()')
  (out/(model['id']+'.png')).write_bytes(base64.b64decode(raw.split(',')[1]))
 browser.close()
print(out)
