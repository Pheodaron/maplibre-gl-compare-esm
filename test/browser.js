import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { createServer } from 'node:http';
import { dirname, resolve, sep, extname } from 'node:path';
import { fileURLToPath } from 'node:url';
import test from 'node:test';
import { chromium } from 'playwright';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const maplibreDist = process.env.MAPLIBRE_DIST_PATH || resolve(root, 'node_modules/maplibre-gl/dist');

test('MapLibre v6 browser integration', async (t) => {
  const server = createServer(async (request, response) => {
    try {
      const pathname = decodeURIComponent(new URL(request.url, 'http://localhost').pathname);
      const isMaplibre = pathname.startsWith('/maplibre/');
      const base = isMaplibre ? resolve(maplibreDist) : root;
      const filename = resolve(base, pathname.slice(isMaplibre ? '/maplibre/'.length : 1));
      if (!filename.startsWith(base + sep)) { response.writeHead(403).end(); return; }
      const data = await readFile(filename);
      const types = { '.js': 'text/javascript', '.mjs': 'text/javascript', '.css': 'text/css', '.html': 'text/html' };
      response.writeHead(200, { 'Content-Type': types[extname(filename)] || 'application/octet-stream' });
      response.end(data);
    } catch {
      response.writeHead(404).end();
    }
  });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  t.after(() => new Promise(resolve => server.close(resolve)));
  const browser = await chromium.launch({
    executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH,
    args: ['--disable-dev-shm-usage', '--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'],
  });
  t.after(() => browser.close());
  const page = await browser.newPage({ viewport: { width: 1000, height: 650 }, hasTouch: true });
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.goto(`http://127.0.0.1:${server.address().port}/test/fixture.html`);
  await page.waitForFunction(() => !!window.fixture, null, { timeout: 30000 });

  await t.test('initial camera, clipping and drag', async () => {
    assert.deepEqual(await page.evaluate(() => {
      const { a, b, compare } = window.fixture;
      return { a: a.getCenter().toArray(), b: b.getCenter().toArray(), zoomA: a.getZoom(), zoomB: b.getZoom(), position: compare.currentPosition,
        clipA: a.getContainer().style.clip, clipB: b.getContainer().style.clip };
    }), { a: [0,0], b: [0,0], zoomA: 2, zoomB: 2, position: 400,
      clipA: 'rect(0px, 400px, 400px, 0px)', clipB: 'rect(0px, 999em, 400px, 400px)' });
    const handle = await page.locator('.compare-swiper-vertical').boundingBox();
    await page.mouse.move(handle.x + handle.width / 2, handle.y + handle.height / 2);
    await page.mouse.down(); await page.mouse.move(580,200); await page.mouse.up();
    assert.deepEqual(await page.evaluate(() => [fixture.compare.currentPosition, fixture.slideEnds]), [580,[580]]);
  });

  await t.test('all camera parameters synchronize in both directions, including animations', async () => {
    const result = await page.evaluate(async () => {
      const { a, b } = window.fixture;
      function camera(map) {
        return { center: map.getCenter().toArray(), zoom: map.getZoom(), bearing: map.getBearing(), pitch: map.getPitch(),
          roll: map.getRoll(), fov: map.getVerticalFieldOfView(), elevation: map.getCenterElevation(), padding: map.getPadding() };
      }
      b.setVerticalFieldOfView(55);
      b.jumpTo({ center: [12,34], zoom: 4, bearing: 20, pitch: 35, roll: 20, elevation: 500,
        padding: { left: 100, right: 0, top: 0, bottom: 0 } });
      const forward = [camera(a), camera(b)];
      a.setVerticalFieldOfView(45);
      a.jumpTo({ center: [-20,10], zoom: 3, bearing: -10, pitch: 25, roll: -15, elevation: 200,
        padding: { left: 0, right: 80, top: 0, bottom: 0 } });
      const reverse = [camera(a), camera(b)];
      await new Promise(resolve => { b.once('moveend',resolve); b.easeTo({ center: [1,2], zoom: 4, duration: 100 }); });
      return { forward, reverse, animation: [camera(a),camera(b)] };
    });
    for (const [name, pair] of Object.entries(result)) {
      assert.deepEqual(pair[0], pair[1], name);
    }
  });

  await t.test('zero-position resize and scrolling use current bounds', async () => {
    const result = await page.evaluate(() => {
      const { a, b, compare } = window.fixture;
      compare.setSlider(0);
      document.querySelector('#wrapper').style.height = '500px';
      a.resize(); b.resize();
      return { position: compare.currentPosition, clipA: a.getContainer().style.clip, clipB: b.getContainer().style.clip };
    });
    assert.equal(result.position,0);
    assert.match(result.clipA,/500px/); assert.match(result.clipB,/500px/);
    await page.evaluate(() => {
      fixture.compare.remove();
      fixture.compare = new fixture.Compare(fixture.a,fixture.b,'#wrapper',{ mousemove: true });
      document.querySelector('#wrapper').style.marginLeft = '100px';
      document.body.style.height = '1600px';
      window.scrollTo(0,100);
    });
    await page.mouse.move(350,100);
    assert.equal(await page.evaluate(() => fixture.compare.currentPosition),250);
  });

  await t.test('horizontal touch gestures finish or cancel cleanly', async () => {
    await page.evaluate(() => {
      window.scrollTo(0,0);
      document.querySelector('#wrapper').style.marginLeft = '0px';
      fixture.compare.remove();
      fixture.compare = new fixture.Compare(fixture.a,fixture.b,'#wrapper',{ orientation: 'horizontal' });
      fixture.slideEnds = [];
      fixture.compare.on('slideend',e => fixture.slideEnds.push(e.currentPosition));
    });
    const handle = await page.locator('.compare-swiper-horizontal').boundingBox();
    const cdp = await page.context().newCDPSession(page);
    const touch = (type, points) => cdp.send('Input.dispatchTouchEvent',{ type, touchPoints: points });
    const touchX = handle.x + handle.width / 2;
    assert.equal(touchX,400, 'horizontal handle is centered');
    await touch('touchStart',[{ x: touchX,y: handle.y + handle.height / 2 }]);
    await touch('touchMove',[{ x: 400,y: 300 }]);
    await touch('touchEnd',[]);
    assert.deepEqual(await page.evaluate(() => [fixture.compare.currentPosition,fixture.slideEnds]),[300,[300]]);
    await touch('touchStart',[{ x: 400,y: 300 }]);
    await touch('touchCancel',[]);
    await touch('touchStart',[{ x: 700,y: 100 }]);
    await touch('touchMove',[{ x: 700,y: 150 }]);
    await touch('touchEnd',[]);
    assert.deepEqual(await page.evaluate(() => [fixture.compare.currentPosition,fixture.slideEnds]),[300,[300]]);
  });

  await t.test('removal during drag leaves maps unclipped and unsynchronized', async () => {
    const handle = await page.locator('.compare-swiper-horizontal').boundingBox();
    await page.mouse.move(handle.x + handle.width / 2,handle.y + handle.height / 2);
    await page.mouse.down();
    const before = await page.evaluate(() => {
      const { a, b, compare } = window.fixture;
      compare.remove(); compare.remove();
      const oldZoom = a.getZoom(); b.jumpTo({ zoom: oldZoom + 1 });
      return { oldZoom, zoom: a.getZoom() };
    });
    await page.mouse.move(600,350); await page.mouse.up();
    assert.equal(before.oldZoom,before.zoom);
    assert.deepEqual(await page.evaluate(() => [fixture.a.getContainer().style.clip,fixture.b.getContainer().style.clip,
      document.querySelectorAll('.maplibregl-compare').length]),['','',0]);
  });
  assert.deepEqual(errors,[]);
  assert.deepEqual(await page.evaluate(() => fixture.errors),[]);
  await page.evaluate(() => { fixture.a.remove(); fixture.b.remove(); });
});
