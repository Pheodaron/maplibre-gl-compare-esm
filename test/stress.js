import assert from 'node:assert/strict';
import test from 'node:test';
import SourceCompare from '../index.js';
import BuiltCompare from '../dist/maplibre-gl-compare.js';
import syncMove from '../sync-move.js';
import { MockDocument, MockElement, MockMap } from './support/maps.js';

for (const [name, Compare] of [['source', SourceCompare], ['dist', BuiltCompare]]) {
  test(`${name}: hostile inputs and lifecycle`, async t => {
    const previous = { document: globalThis.document, Element: globalThis.Element };
    const instances = [];
    t.after(() => {
      for (const instance of instances) instance.remove();
      for (const [key,value] of Object.entries(previous)) {
        if (value === undefined) delete globalThis[key]; else globalThis[key] = value;
      }
    });
    function setup() {
      const document = new MockDocument();
      globalThis.document = document; globalThis.Element = MockElement;
      const a = new MockMap(document), b = new MockMap(document);
      const wrapper = new MockElement(document);
      wrapper.appendChild(a.container); wrapper.appendChild(b.container);
      document.body.appendChild(wrapper);
      return { a,b,wrapper,document };
    }
    function create(env,options) {
      const instance = new Compare(env.a,env.b,env.wrapper,options);
      instances.push(instance);
      return instance;
    }
    function clean(env) {
      assert.equal(env.wrapper.children.length,2,'no orphan controls');
      for (const map of [env.a,env.b]) {
        for (const type of ['move','resize','remove']) assert.equal(map.listenerCount(type),0,type);
      }
      for (const type of ['mousemove','mouseup','touchmove','touchend','touchcancel']) {
        assert.equal(env.document.count(type),0,type);
      }
    }
    await t.test('invalid map objects fail before changing the DOM', () => {
      for (const bad of [null,undefined,{},[],42,'map',false,Symbol('map')]) {
        const env=setup();
        assert.throws(() => new Compare(bad,env.b,env.wrapper),TypeError);
        assert.throws(() => new Compare(env.a,bad,env.wrapper),TypeError);
        clean(env);
      }
      for (const method of ['getContainer','getCenter','getZoom','getBearing','getPitch','jumpTo','on','off']) {
        const env=setup(); env.a[method]=undefined;
        assert.throws(() => new Compare(env.a,env.b,env.wrapper),TypeError);
        clean(env);
      }
    });
    await t.test('same map, shared DOM container and removed maps are rejected', () => {
      const env=setup();
      assert.throws(() => new Compare(env.a,env.a,env.wrapper),/distinct|different/i);
      env.b.container=env.a.container;
      assert.throws(() => new Compare(env.a,env.b,env.wrapper),/distinct|different/i);
      env.b.container=new MockElement(env.document); env.a._removed=true;
      assert.throws(() => new Compare(env.a,env.b,env.wrapper),/removed/i);
      clean(env);
    });
    await t.test('invalid option types and values are rejected atomically', () => {
      const values=[false,true,1,'horizontal',[],()=>{},Symbol('options'),
        {orientation:'diagonal'},{orientation:5},{mousemove:'false'},{mousemove:1}];
      for (const options of values) {
        const env=setup();
        assert.throws(() => new Compare(env.a,env.b,env.wrapper,options),TypeError);
        clean(env);
      }
    });
    await t.test('a container must wrap both maps', () => {
      const env=setup();
      assert.throws(() => new Compare(env.a,env.b,new MockElement(env.document)),/contain|wrap/i);
      clean(env);
    });
    await t.test('failed initial synchronization rolls back DOM, styles and subscriptions', () => {
      const env=setup();
      env.a.container.style.clip='rect(1px, 50px, 80px, 2px)';
      env.b.container.style.clip='rect(2px, 60px, 90px, 3px)';
      const jump=env.b.jumpTo;
      env.b.jumpTo=()=>{throw new Error('initial camera failure');};
      assert.throws(() => create(env),/initial camera failure/);
      clean(env);
      assert.equal(env.a.container.style.clip,'rect(1px, 50px, 80px, 2px)');
      assert.equal(env.b.container.style.clip,'rect(2px, 60px, 90px, 3px)');
      env.b.jumpTo=jump;
      create(env).remove(); clean(env);
    });
    await t.test('duplicate components cannot compete over a map', () => {
      const env=setup(), compare=create(env);
      assert.throws(() => create(env),/already|active/i);
      assert.throws(() => new Compare(env.b,env.a,env.wrapper),/already|active/i);
      assert.equal(env.wrapper.children.length,3);
      compare.remove(); create(env).remove(); clean(env);
    });
    await t.test('removal restores pre-existing clipping', () => {
      const env=setup();
      env.a.container.style.clip='rect(1px, 10px, 20px, 2px)';
      env.b.container.style.clip='rect(2px, 30px, 40px, 3px)';
      const compare=create(env); compare.setSlider(180); compare.remove();
      assert.equal(env.a.container.style.clip,'rect(1px, 10px, 20px, 2px)');
      assert.equal(env.b.container.style.clip,'rect(2px, 30px, 40px, 3px)');
      clean(env);
    });
    await t.test('removing either map automatically disposes a dragging compare', () => {
      for (const side of ['a','b']) {
        const env=setup(), compare=create(env);
        compare._onDown({touches:[{identifier:1,clientX:200,clientY:100}]});
        env[side]._removed=true; env[side].emit('remove');
        assert.equal(compare._removed,true);
        clean(env);
      }
    });
    await t.test('empty and multi-touch starts do not create a gesture', () => {
      for (const touches of [[],[{identifier:1},{identifier:2}]]) {
        const env=setup(), compare=create(env);
        compare._onDown({touches});
        assert.equal(compare._dragging,false);
        assert.equal(env.document.count('touchmove'),0);
      }
    });
    await t.test('only the initiating finger controls and ends the gesture', () => {
      const env=setup(), compare=create(env), positions=[];
      compare.on('slideend',e=>positions.push(e.currentPosition));
      compare._onDown({touches:[{identifier:7,clientX:200,clientY:100}]});
      compare._onMove({touches:[{identifier:8,clientX:490,clientY:100},{identifier:7,clientX:250,clientY:100}]});
      assert.equal(compare.currentPosition,150);
      compare._onTouchEnd({changedTouches:[{identifier:8}]});
      assert.equal(compare._dragging,true);
      compare._onTouchEnd({changedTouches:[{identifier:7}]});
      assert.deepEqual(positions,[150]);
    });
    await t.test('mutation of the original options does not reconfigure live handlers', () => {
      const env=setup(), options={mousemove:true,orientation:'vertical'};
      const compare=create(env,options);
      options.mousemove=false; options.orientation='horizontal';
      assert.equal(compare.options.mousemove,true);
      assert.equal(compare.options.orientation,'vertical');
    });
    await t.test('invalid pointer coordinates are ignored without corrupting state', () => {
      const env=setup(), compare=create(env);
      const before=compare.currentPosition;
      for (const point of [{},{clientX:NaN},{clientX:Infinity},{clientX:'250'},{touches:[]}]) {
        assert.doesNotThrow(()=>compare._onMove(point));
        assert.equal(compare.currentPosition,before);
      }
    });
    await t.test('callbacks may remove or throw without leaking active gestures', () => {
      const env=setup(), compare=create(env);
      compare.on('slideend',()=>{compare.remove();throw new Error('user callback');});
      compare._onDown({button:0});
      assert.throws(()=>compare._onMouseUp(),/user callback/);
      clean(env);
      compare.on('slideend',()=>{throw new Error('disposed callback');});
      assert.doesNotThrow(()=>compare.fire('slideend',{}));
    });
    await t.test('zero-sized maps recover and CSS-scaled maps use local pixels', () => {
      const env=setup();
      env.b.container.offsetWidth=400; env.b.container.offsetHeight=200;
      env.b.container.bounds.width=800; env.b.container.bounds.height=400;
      const compare=create(env);
      assert.equal(compare.currentPosition,200);
      compare._onMove({clientX:500,clientY:100});
      assert.equal(compare.currentPosition,200);
      env.b.container.offsetWidth=0; env.b.container.offsetHeight=0;
      env.b.container.bounds.width=0; env.b.container.bounds.height=0;
      env.b.emit('resize');
      assert.equal(compare.currentPosition,0);
      compare._onMove({clientX:100,clientY:50});
      assert.equal(compare.currentPosition,0);
      env.b.container.offsetWidth=400; env.b.container.offsetHeight=200;
      env.b.container.bounds.width=400; env.b.container.bounds.height=200;
      env.b.emit('resize'); compare.setSlider(200);
      assert.equal(compare.currentPosition,200);
    });
  });
}

test('camera reentrancy and removal',async t=>{
  await t.test('external camera changes inside a move callback are reconciled',()=>{
    const a=new MockMap(),b=new MockMap();
    const stop=syncMove(a,b);
    let once=true;
    b.on('move',()=>{if(once){once=false;a.jumpTo({zoom:7});}});
    a.jumpTo({zoom:3});
    assert.equal(a.getZoom(),7);assert.equal(b.getZoom(),7);
    stop();
  });
  await t.test('removal during field-of-view update prevents the subsequent jump',()=>{
    const a=new MockMap(),b=new MockMap();
    const stop=syncMove(a,b);
    let jumps=0;
    const jump=b.jumpTo;
    b.jumpTo=function(camera,event){jumps++;return jump.call(this,camera,event);};
    b.on('move',()=>{b._removed=true;b.emit('remove');});
    a.setVerticalFieldOfView(55);
    assert.equal(jumps,0);
    stop();
    assert.equal(a.listenerCount('move'),0);
  });
});
