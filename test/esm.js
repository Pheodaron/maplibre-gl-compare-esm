import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import Compare from '@maplibre/maplibre-gl-compare';

test('package entry exports Compare without browser globals', () => {
  assert.equal(typeof Compare, 'function');
  assert.equal(typeof globalThis.window, 'undefined');
});

test('distribution loads as a standalone ES module', async () => {
  const source = await readFile(new URL('../dist/maplibre-gl-compare.js', import.meta.url));
  const module = await import(`data:text/javascript;base64,${source.toString('base64')}`);
  assert.deepEqual(Object.keys(module), ['default']);
  assert.equal(typeof module.default, 'function');
});
