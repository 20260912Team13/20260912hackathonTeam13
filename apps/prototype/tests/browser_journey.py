"""End-to-end acceptance: real clicks, persistence, downloads, responsive and reduced motion."""
import json,pathlib,os
from playwright.sync_api import sync_playwright,expect
root=pathlib.Path(__file__).resolve().parents[1];out=root/".visual-qa/acceptance";out.mkdir(parents=True,exist_ok=True)
results=[];errors=[]
base_url=os.environ.get("MARS_BASE_URL","http://127.0.0.1:5178/")
with sync_playwright() as pw:
 browser=pw.chromium.launch(args=["--use-angle=swiftshader","--enable-unsafe-swiftshader"])
 for name,width,height,touch in [("desktop",1440,900,False),("mobile",390,844,True)]:
  context=browser.new_context(viewport={"width":width,"height":height},has_touch=touch,is_mobile=touch,accept_downloads=True)
  page=context.new_page();page.on("pageerror",lambda e:errors.append(str(e)))
  page.goto(base_url,wait_until="networkidle")
  page.locator('[data-action="skip"]').click()
  title=page.locator("h1").bounding_box();start=page.locator("#start-button").bounding_box()
  if touch:assert start["y"]>title["y"]+title["height"],"title and start overlap"
  page.locator("#start-button").click();expect(page.locator("body")).to_have_attribute("data-stage","land")
  page.locator('[data-action="parcel"][data-id="A-02"]').click()
  expect(page.locator(".land-panel h2")).to_have_text("HORIZON HILL")
  page.locator("#buy-button").click();expect(page.locator("dialog")).to_be_visible()
  page.locator('[data-action="close"]').first.click();expect(page.locator("dialog")).not_to_be_visible()
  page.locator("#buy-button").click();page.locator("#confirm-purchase").click()
  expect(page.locator("body")).to_have_attribute("data-stage","catalog")
  assert page.evaluate("window.marsPreview.getState().credits")==3400
  for model in ["02-greenhouse-home","03-terrace-habitat","01-mars-commons"]:
   page.locator('[data-action="model"][data-id="'+model+'"]').click()
   assert page.evaluate("window.marsPreview.getState().buildingId")==model
  page.wait_for_function("window.marsPreview.world.ready")
  page.screenshot(path=str(out/(name+"-catalog.png")),full_page=True)
  host=page.locator("#world-host").bounding_box()
  before=page.evaluate("window.marsPreview.world.camera.position.toArray()")
  page.mouse.move(host["x"]+host["width"]*.5,host["y"]+host["height"]*.5)
  page.mouse.down();page.mouse.move(host["x"]+host["width"]*.75,host["y"]+host["height"]*.5,steps=8);page.mouse.up()
  after=page.evaluate("window.marsPreview.world.camera.position.toArray()");assert before!=after,"3D drag had no effect"
  page.locator("#build-button").click();expect(page.locator("body")).to_have_attribute("data-stage","building")
  page.wait_for_timeout(3500)
  percent=int(page.locator("#progress-number").inner_text());assert 0<percent<100
  page.screenshot(path=str(out/(name+"-building.png")),full_page=True)
  page.reload(wait_until="networkidle");expect(page.locator("body")).to_have_attribute("data-stage","title")
  page.locator("#start-button").click()
  expect(page.locator("body")).to_have_attribute("data-stage","complete",timeout=22000)
  assert page.evaluate("window.marsPreview.getState().parcelId")=="A-02"
  assert page.evaluate("window.marsPreview.getState().buildingId")=="01-mars-commons"
  page.locator('[data-action="explore"]').click();expect(page.locator(".complete-page")).to_have_class("page complete-page explore-mode")
  page.locator('[data-action="explore-close"]').click()
  page.locator('[data-action="share"]').click();expect(page.locator(".share-image")).to_be_visible()
  with page.expect_download() as d:page.locator('[data-action="download-card"]').click()
  download=d.value;download.save_as(str(out/(name+"-share.png")))
  assert pathlib.Path(out/(name+"-share.png")).stat().st_size>10000
  page.locator('[data-action="close"]').click()
  page.locator('[data-action="reset"]').click();page.locator('[data-action="confirm-reset"]').click()
  expect(page.locator("body")).to_have_attribute("data-stage","title");assert page.evaluate("window.marsPreview.getState().credits")==5000
  results.append({"case":name,"status":"pass","checks":16});context.close()
 context=browser.new_context(viewport={"width":375,"height":667},reduced_motion="reduce")
 page=context.new_page();page.goto(base_url,wait_until="networkidle")
 assert page.evaluate("getComputedStyle(document.querySelector('.title-planet')).animationName")=="none"
 page.locator("#start-button").click();expect(page.locator("body")).to_have_attribute("data-stage","land")
 for w,h in [(320,640),(768,1024),(1024,768),(1920,1080)]:
  page.set_viewport_size({"width":w,"height":h})
  assert page.evaluate("document.documentElement.scrollWidth<=innerWidth+2")
 results.append({"case":"reduced motion and additional viewport widths","status":"pass","checks":6});context.close()
 context=browser.new_context(viewport={"width":390,"height":844})
 page=context.new_page()
 page.add_init_script("""const orig=HTMLCanvasElement.prototype.getContext;HTMLCanvasElement.prototype.getContext=function(type,...args){return type==='webgl2'?null:orig.call(this,type,...args)}""")
 page.goto(base_url,wait_until="networkidle")
 assert not page.evaluate("window.marsPreview.world.available")
 page.locator("#start-button").click();page.locator("#buy-button").click();page.locator("#confirm-purchase").click()
 expect(page.locator(".scene-canvas.fallback")).to_be_visible()
 results.append({"case":"no-WebGL fallback","status":"pass","checks":3});context.close()
 browser.close()
assert not errors,errors
(out/"report.json").write_text(json.dumps({"results":results,"page_errors":errors},ensure_ascii=False,indent=2),encoding="utf-8")
print(json.dumps({"results":results,"page_errors":errors},ensure_ascii=False))
