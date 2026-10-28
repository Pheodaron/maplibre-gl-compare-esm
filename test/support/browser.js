import { readFile } from 'node:fs/promises';
import { createServer } from 'node:http';
import { dirname, resolve, sep, extname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const maplibreDist = process.env.MAPLIBRE_DIST_PATH || resolve(root, 'node_modules/maplibre-gl/dist');

export async function browserFixture(t) {
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
  await page.addInitScript(() => {
    const records = new WeakMap();
    const add = EventTarget.prototype.addEventListener, remove = EventTarget.prototype.removeEventListener;
    const capture = options => typeof options === 'boolean' ? options : !!options?.capture;
    EventTarget.prototype.addEventListener = function(type, callback, options) {
      add.call(this,type,callback,options);
      if (!callback || options?.signal?.aborted) return;
      if (!records.has(this)) records.set(this,new Map());
      const types = records.get(this);
      if (!types.has(type)) types.set(type,new Map());
      const callbacks = types.get(type);
      if (!callbacks.has(callback)) callbacks.set(callback,new Set());
      callbacks.get(callback).add(capture(options));
    };
    EventTarget.prototype.removeEventListener = function(type, callback, options) {
      remove.call(this,type,callback,options);
      records.get(this)?.get(type)?.get(callback)?.delete(capture(options));
    };
    window.listenerAudit = { count(target,callback) {
      let count=0;
      for (const callbacks of records.get(target)?.values() || []) {
        for (const [fn,captures] of callbacks) if (!callback || fn===callback) count+=captures.size;
      }
      return count;
    }};
  });
  const origin = `http://127.0.0.1:${server.address().port}`;
  await page.goto(`${origin}/test/fixture.html`);
  await page.waitForFunction(() => !!window.fixture, null, { timeout: 30000 });

  return { page, browser, errors, origin };
}
