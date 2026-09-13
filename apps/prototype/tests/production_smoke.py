import pathlib,json,os
from playwright.sync_api import sync_playwright,expect
root=pathlib.Path(__file__).resolve().parents[1];out=root/".visual-qa/production";out.mkdir(parents=True,exist_ok=True)
errors=[]
preview_url=os.environ.get("MARS_PREVIEW_URL","http://127.0.0.1:4178/")
with sync_playwright() as pw:
 browser=pw.chromium.launch(args=["--use-angle=swiftshader","--enable-unsafe-swiftshader"])
 page=browser.new_page(viewport={"width":390,"height":844},device_scale_factor=1)
 page.on("pageerror",lambda e:errors.append(str(e)))
 page.goto(preview_url,wait_until="networkidle")
 assert page.evaluate("typeof window.marsPreview")=="undefined"
 page.locator("#start-button").click();page.locator("#buy-button").click();page.locator("#confirm-purchase").click()
 page.locator("#build-button").click();page.wait_for_timeout(6000)
 page.screenshot(path=str(out/"mobile-building.png"),full_page=True)
 expect(page.locator("body")).to_have_attribute("data-stage","complete",timeout=15000)
 page.screenshot(path=str(out/"mobile-complete.png"),full_page=True)
 renderer=page.evaluate("""() => { const c=document.querySelector('canvas').getContext('webgl2');const e=c.getExtension('WEBGL_debug_renderer_info');return e?c.getParameter(e.UNMASKED_RENDERER_WEBGL):'unknown'; }""")
 browser.close()
assert not errors,errors
(out/"report.json").write_text(json.dumps({"production_journey":"pass","development_preview_disabled":True,"errors":errors,"renderer":renderer},ensure_ascii=False,indent=2),encoding="utf-8")
print("Production journey passed; review routes absent; console errors 0.")
