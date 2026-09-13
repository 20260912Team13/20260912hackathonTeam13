"""Verify supplied GLBs across catalog, printing, completion, and fallback."""
import json, os, pathlib, sys
from playwright.sync_api import sync_playwright, expect

root = pathlib.Path(__file__).resolve().parents[1]
out = root / '.visual-qa/model-integration' / (sys.argv[1] if len(sys.argv)>1 else 'acceptance')
out.mkdir(parents=True, exist_ok=True)
base = os.environ.get('MARS_BASE_URL', 'http://127.0.0.1:5178/').rstrip('/') + '/'
models = json.loads((root / 'src/catalog.json').read_text(encoding='utf-8-sig'))['models']
results, errors = [], []

def ready(page, model_id):
    page.wait_for_function('(id)=>window.marsPreview.world.ready && window.marsPreview.world.hero?.userData.buildingId===id', arg=model_id)

def screenshot(page, name):
    page.wait_for_timeout(650)
    assert page.evaluate('document.documentElement.scrollWidth<=innerWidth+2'), 'horizontal overflow'
    assert 'undefined' not in page.locator('main').inner_text()
    page.screenshot(path=str(out/(name+'.png')), full_page=True)

with sync_playwright() as pw:
    args = ['--enable-gpu','--use-angle=d3d11','--ignore-gpu-blocklist'] if os.environ.get('MARS_USE_GPU')=='1' else ['--use-angle=swiftshader','--enable-unsafe-swiftshader']
    browser = pw.chromium.launch(args=args)
    page = browser.new_page(viewport={'width':1440,'height':900}, accept_downloads=True)
    page.on('pageerror', lambda error: errors.append(str(error)))
    for model in models:
        model_id = model['id']
        page.goto(base+'?preview=catalog&model='+model_id, wait_until='networkidle')
        ready(page, model_id)
        assert page.evaluate('window.marsPreview.world.controls.autoRotate')
        assert page.locator('.model-option.selected img').get_attribute('src').endswith(model['poster'])
        a = page.evaluate('window.marsPreview.world.controls.getAzimuthalAngle()')
        page.wait_for_timeout(1100)
        b = page.evaluate('window.marsPreview.world.controls.getAzimuthalAngle()')
        assert 0.015 < abs(a-b) < 0.15, 'rotation must be automatic and slow'
        page.locator('[data-action="rotation"]').click()
        page.wait_for_timeout(700)
        a = page.evaluate('window.marsPreview.world.controls.getAzimuthalAngle()')
        page.wait_for_timeout(350)
        b = page.evaluate('window.marsPreview.world.controls.getAzimuthalAngle()')
        assert abs(a-b)<0.001, 'pause must stop rotation'
        screenshot(page, model_id+'-catalog')
        page.locator('[data-action="rotation"]').click()
        page.locator('#build-button').click()
        expect(page.locator('body')).to_have_attribute('data-stage','building')
        ready(page, model_id)
        page.wait_for_timeout(4200)
        assert page.evaluate('window.marsPreview.world.mode')=='printing'
        assert page.evaluate('window.marsPreview.world.clip.constant') > 0
        # Full progress must reveal even the tallest model, then restore live progress.
        assert page.evaluate('''()=>{const w=window.marsPreview.world,p=w.progress;w.setProgress(1);const ok=w.clip.constant>w.hero.userData.size.y;w.setProgress(p);return ok;}''')
        screenshot(page, model_id+'-building')
        expect(page.locator('body')).to_have_attribute('data-stage','complete', timeout=20000)
        ready(page, model_id)
        assert page.evaluate('window.marsPreview.world.mode')=='home'
        assert page.evaluate('window.marsPreview.world.object.children.filter(o=>o.userData.buildingId).length')==1
        assert page.evaluate('window.marsPreview.world.clip') is None
        expected = '居場所' if model_id=='01-mars-commons' else 'お家'
        assert expected in page.locator('h1').inner_text()
        screenshot(page, model_id+'-complete')
        page.locator('[data-action="explore"]').click()
        page.locator('#world-host').press('ArrowLeft')
        page.locator('[data-action="explore-close"]').click()
        page.locator('[data-action="share"]').click()
        with page.expect_download() as pending:
            page.locator('[data-action="download-card"]').click()
        pending.value.save_as(str(out/(model_id+'-share.png')))
        assert (out/(model_id+'-share.png')).stat().st_size>10000
        page.locator('[data-action="close"]').click()
        results.append({'model':model_id,'catalog_rotation_printing_completion_share':'pass'})
        print(model_id+': passed', flush=True)
    renderer = page.evaluate('window.marsPreview.world.deviceRenderer')
    fps = page.evaluate('''()=>new Promise(resolve=>{let frames=0;const start=performance.now();function step(){frames++;if(performance.now()-start>=3000)resolve(frames*1000/(performance.now()-start));else requestAnimationFrame(step);}requestAnimationFrame(step);})''')
    # Narrow screens and fast repeated selection retain the last chosen model.
    page.set_viewport_size({'width':390,'height':844})
    for model in models:
        page.goto(base+'?preview=catalog&model='+model['id'],wait_until='networkidle')
        ready(page,model['id']);screenshot(page,'mobile-'+model['id'])
    page.evaluate('''()=>{for(let i=0;i<9;i++)document.querySelectorAll('[data-action="model"]')[i%3].click();}''')
    ready(page,models[-1]['id'])
    page.goto(base+'?preview=complete&model=02-greenhouse-home',wait_until='networkidle')
    ready(page,'02-greenhouse-home');screenshot(page,'mobile-complete')
    # Loading failures must show the matching supplied poster, never a legacy model.
    fallback = browser.new_context(viewport={'width':390,'height':844})
    fallback.route('**/*.glb',lambda route:route.abort())
    fallback_page=fallback.new_page()
    fallback_page.goto(base+'?preview=catalog&model=03-terrace-habitat',wait_until='networkidle')
    expect(fallback_page.locator('#world-host')).to_have_attribute('data-model-status','poster')
    assert '03-terrace-habitat-hero.png' in fallback_page.locator('#world-host').get_attribute('style')
    assert fallback_page.locator('[data-action="rotation"]').is_disabled()
    fallback.close()
    reduced = browser.new_context(reduced_motion='reduce')
    reduced_page=reduced.new_page();reduced_page.goto(base+'?preview=catalog',wait_until='networkidle')
    ready(reduced_page,'02-greenhouse-home')
    assert not reduced_page.evaluate('window.marsPreview.world.controls.autoRotate')
    reduced_page.locator('[data-action="rotation"]').click()
    assert reduced_page.evaluate('window.marsPreview.world.controls.autoRotate')
    reduced.close();browser.close()

assert not errors, errors
report={'models':results,'renderer':renderer,'fps':round(fps,1),'mobile_catalogs':'pass','rapid_selection':'pass','failed_glb_poster':'pass','reduced_motion':'pass','errors':errors}
(out/'report.json').write_text(json.dumps(report,ensure_ascii=False,indent=2),encoding='utf-8')
print(json.dumps(report,ensure_ascii=False),flush=True)
