"""Render actual GLB catalog assets, also used if WebGL is unavailable."""
import base64,pathlib,os
from playwright.sync_api import sync_playwright
root=pathlib.Path(__file__).resolve().parents[1]
base_url=os.environ.get("MARS_BASE_URL","http://127.0.0.1:5178/").rstrip("/")+"/"
with sync_playwright() as pw:
 browser=pw.chromium.launch(args=["--use-angle=swiftshader","--enable-unsafe-swiftshader"])
 page=browser.new_page(viewport={"width":1440,"height":900})
 page.goto(base_url+"?preview=catalog",wait_until="networkidle")
 page.wait_for_timeout(1500)
 for model in ["home","dining","green"]:
  page.locator('[data-action="model"][data-id="'+model+'"]').click()
  page.wait_for_timeout(900)
  page.evaluate("""() => {const w=window.marsPreview.world;w.controls.autoRotate=false;w.camera.position.set(5.3,3.8,7.7);w.controls.update();}""")
  raw=page.evaluate("window.marsPreview.world.snapshot()")
  (root/"public/models"/(model+".png")).write_bytes(base64.b64decode(raw.split(",")[1]))
 page.goto(base_url+"?preview=complete",wait_until="networkidle")
 page.wait_for_timeout(1400)
 raw=page.evaluate("window.marsPreview.world.snapshot()")
 (root/"public/models/colony.png").write_bytes(base64.b64decode(raw.split(",")[1]))
 browser.close()
print("Rendered 3 model thumbnails and colony fallback.")
