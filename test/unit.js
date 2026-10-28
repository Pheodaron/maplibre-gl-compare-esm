import assert from 'node:assert/strict';
import test from 'node:test';
import SourceCompare from '../index.js';
import BuiltCompare from '../dist/maplibre-gl-compare.js';
import syncMove from '../sync-move.js';
import { MockDocument, MockElement, MockMap } from './support/maps.js';

for (const [name, Compare] of [['source', SourceCompare], ['dist', BuiltCompare]]) {
  test(`${name}: component regressions`, async (t) => {
    const originalDocument = globalThis.document;
    const originalElement = globalThis.Element;
    const instances = [];
    t.after(() => {
      for (const instance of instances) instance.remove();
      if (originalDocument === undefined) delete globalThis.document;
      else globalThis.document = originalDocument;
      if (originalElement === undefined) delete globalThis.Element;
      else globalThis.Element = originalElement;
    });
    function setup(options = {}) {
      const document = new MockDocument();
      globalThis.document = document;
      globalThis.Element = MockElement;
      const a = new MockMap(document), b = new MockMap(document);
      const compare = new Compare(a, b, new MockElement(document), options);
      instances.push(compare);
      return { a, b, compare, document };
    }

    await t.test('clamps slider positions and rejects invalid numbers', () => {
      const { compare } = setup();
      compare.setSlider(-20);
      assert.equal(compare.currentPosition, 0);
      compare.setSlider(900);
      assert.equal(compare.currentPosition, 400);
      for (const value of [NaN, Infinity, -Infinity, '20', null, undefined]) {
        assert.throws(() => compare.setSlider(value), TypeError);
        assert.equal(compare.currentPosition, 400);
      }
    });
    await t.test('recalculates clipping on resize at zero in both orientations', () => {
      for (const orientation of ['vertical', 'horizontal']) {
        const { a, b, compare } = setup({ orientation });
        compare.setSlider(0);
        b.container.bounds.height = 500;
        b.emit('resize');
        assert.equal(compare.currentPosition, 0);
        assert.match(b.container.style.clip, /500px/);
        if (orientation === 'vertical') assert.match(a.container.style.clip, /500px/);
      }
    });
    await t.test('uses current coordinates after scroll and layout changes', () => {
      for (const mousemove of [false, true]) {
        const { b, compare } = setup({ mousemove });
        b.container.bounds.left = 200;
        if (!mousemove) compare._onDown({ button: 0 });
        compare._onMove({ clientX: 250 });
        assert.equal(compare.currentPosition, 50);
        b.container.bounds.left = 220;
        compare._onMove({ clientX: 250 });
        assert.equal(compare.currentPosition, 30);
      }
    });
    await t.test('removal during mouse or touch drag clears handlers and cannot reclip maps', () => {
      for (const touches of [undefined, [{ clientX: 200, clientY: 100 }]]) {
        const { a, b, compare, document } = setup();
        let slideEnds = 0;
        compare.on('slideend', () => slideEnds++);
        compare._onDown({ touches });
        compare.remove();
        compare.remove();
        for (const type of ['mousemove', 'mouseup', 'touchmove', 'touchend', 'touchcancel']) {
          assert.equal(document.count(type), 0, type);
          document.dispatchEvent(new Event(type));
        }
        compare._onMove({ clientX: 250 });
        compare.setSlider(100);
        assert.equal(a.container.style.clip, null);
        assert.equal(b.container.style.clip, null);
        assert.equal(slideEnds, 0);
        assert.equal(a.listenerCount('move'), 0);
        assert.equal(b.listenerCount('move'), 0);
        assert.equal(a.listenerCount('resize'), 0);
        assert.equal(b.listenerCount('resize'), 0);
      }
    });
    await t.test('touch cancellation and focus loss stop dragging without slideend', () => {
      for (const cancel of ['touchcancel', 'blur']) {
        const { compare, document } = setup();
        let slideEnds = 0;
        compare.on('slideend', () => slideEnds++);
        compare._onDown({ touches: [{}] });
        if (cancel === 'blur') document.defaultView.dispatchEvent(new Event('blur'));
        else document.dispatchEvent(new Event('touchcancel'));
        assert.equal(compare._dragging, false);
        assert.equal(document.count('touchmove'), 0);
        assert.equal(document.count('touchend'), 0);
        assert.equal(document.count('touchcancel'), 0);
        assert.equal(slideEnds, 0);
      }
    });
    await t.test('a completed gesture fires exactly one slideend', () => {
      const { compare, document } = setup();
      const positions = [];
      compare.on('slideend', e => positions.push(e.currentPosition));
      compare._onDown({ button: 0 });
      compare._onMove({ clientX: 250 });
      document.dispatchEvent(new Event('mouseup'));
      document.dispatchEvent(new Event('mouseup'));
      assert.deepEqual(positions, [150]);
    });
  });
}

test('camera synchronization', async (t) => {
  await t.test('initializes from map A and mirrors all camera parameters in both directions', () => {
    const doc = new MockDocument();
    const a = new MockMap(doc, { zoom: 3, roll: 12, elevation: 50, fov: 45 });
    const b = new MockMap(doc);
    const stop = syncMove(a, b);
    assert.deepEqual(b.camera, a.camera);
    b.setVerticalFieldOfView(55);
    b.jumpTo({ center: { lng: 20, lat: 30 }, zoom: 4, bearing: 20, pitch: 35, roll: 25,
      elevation: 500, padding: { left: 100, right: 0, top: 0, bottom: 0 } });
    assert.deepEqual(a.camera, b.camera);
    a.jumpTo({ roll: -10, elevation: 200 });
    assert.deepEqual(a.camera, b.camera);
    stop(); stop();
    b.jumpTo({ zoom: 9 });
    assert.equal(a.getZoom(), 4);
  });
  await t.test('supports older maps without optional camera APIs', () => {
    const a = new MockMap(), b = new MockMap();
    for (const map of [a, b]) {
      for (const method of ['getRoll', 'getPadding', 'getCenterElevation',
        'getVerticalFieldOfView', 'setVerticalFieldOfView']) map[method] = undefined;
    }
    const stop = syncMove(a, b);
    b.jumpTo({ zoom: 5 });
    assert.equal(a.getZoom(), 5);
    stop();
  });
  await t.test('an exception does not permanently lock synchronization', () => {
    const a = new MockMap(), b = new MockMap();
    const stop = syncMove(a, b);
    const jumpTo = a.jumpTo;
    a.jumpTo = () => { throw new Error('camera failure'); };
    assert.throws(() => b.jumpTo({ zoom: 4 }), /camera failure/);
    a.jumpTo = jumpTo;
    b.jumpTo({ zoom: 5 });
    assert.equal(a.getZoom(), 5);
    stop();
  });
});
