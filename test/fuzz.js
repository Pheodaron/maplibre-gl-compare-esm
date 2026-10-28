import assert from 'node:assert/strict';
import test from 'node:test';
import SourceCompare from '../index.js';
import BuiltCompare from '../dist/maplibre-gl-compare.js';
import syncMove from '../sync-move.js';
import { MockDocument, MockElement, MockMap } from './support/maps.js';

function random(seed) {
  let state=seed>>>0;
  return () => { state^=state<<13; state^=state>>>17; state^=state<<5; return (state>>>0)/4294967296; };
}
function environment() {
  const document=new MockDocument(),a=new MockMap(document),b=new MockMap(document);
  const wrapper=new MockElement(document);
  wrapper.appendChild(a.container);wrapper.appendChild(b.container);document.body.appendChild(wrapper);
  return {a,b,wrapper,document};
}
function event(target,type,properties={}) {
  const e=new Event(type,{cancelable:true});
  for (const [key,value] of Object.entries(properties)) Object.defineProperty(e,key,{value});
  target.dispatchEvent(e);
}
const eventTypes=['mousemove','mouseup','touchmove','touchend','touchcancel'];
function checkDisposed(env) {
  assert.equal(env.wrapper.children.length,2);
  for (const map of [env.a,env.b]) {
    for (const type of ['move','resize','remove']) assert.equal(map.listenerCount(type),0);
    assert.equal(map.container.count('mousemove'),0);
  }
  for (const type of eventTypes) assert.equal(env.document.count(type),0);
  assert.equal(env.document.defaultView.count('blur'),0);
}

for (const [name,Compare] of [['source',SourceCompare],['dist',BuiltCompare]]) {
  test(`${name}: 40,000 seeded state-machine operations`,async t=>{
    for(let seed=1;seed<=16;seed++) {
      await t.test(`seed ${seed}`,()=>{
        const rand=random(seed*0x9e3779b1), env=environment();
        let compare,orientation,hover,drag=null,position=0,ends=0,seen=[];
        let width=400,height=200,scaleX=1,scaleY=1;
        const originalA='rect(1px, 300px, 190px, 2px)',originalB='rect(2px, 310px, 195px, 3px)';
        env.a.container.style.clip=originalA;env.b.container.style.clip=originalB;
        function clamp(value){return Math.max(0,Math.min(orientation==='horizontal'?height:width,value));}
        function start() {
          orientation=rand()<.5?'horizontal':'vertical';hover=rand()<.5;drag=null;ends=0;seen=[];
          compare=new Compare(env.a,env.b,env.wrapper,{orientation,mousemove:hover});
          compare.on('slideend',e=>seen.push(e.currentPosition));
          position=(orientation==='horizontal'?height:width)/2;
        }
        function point(local) {
          return {clientX:env.b.container.bounds.left+local*scaleX,
            clientY:env.b.container.bounds.top+local*scaleY};
        }
        start();
        try {
          for(let step=0;step<2500;step++) {
            const op=Math.floor(rand()*16),value=(rand()*4-1)*(orientation==='horizontal'?height:width);
            if(compare._removed && op!==15) {
              assert.doesNotThrow(()=>compare.setSlider(Symbol('disposed')));
              if(op%3===0) start();
            } else if(op<=1) {compare.setSlider(value);position=clamp(value);}
            else if(op===2) {
              const before=compare.currentPosition;
              for(const bad of [NaN,Infinity,null,{},[],Symbol('bad'),1n]) assert.throws(()=>compare.setSlider(bad),TypeError);
              assert.equal(compare.currentPosition,before);
            } else if(op===3) {
              width=Math.floor(rand()*1200);height=Math.floor(rand()*800);
              scaleX=[.5,1,1.25,2][Math.floor(rand()*4)];scaleY=[.5,1,1.25,2][Math.floor(rand()*4)];
              Object.assign(env.b.container,{offsetWidth:width,offsetHeight:height});
              Object.assign(env.b.container.bounds,{width:width*scaleX,height:height*scaleY});
              env.b.emit('resize');position=clamp(position);
            } else if(op===4) {
              const target=drag==='mouse'?env.document:env.b.container;
              event(target,'mousemove',point(value));
              if(drag==='mouse'||(hover&&drag!=='touch'))position=clamp(value);
            } else if(op===5) {
              event(compare._swiper,'mousedown',{button:0});if(!drag)drag='mouse';
            } else if(op===6) {
              event(env.document,'mouseup');if(drag==='mouse'){drag=null;ends++;}
            } else if(op===7) {
              event(compare._swiper,'touchstart',{touches:[{identifier:1,...point(position)}]});
              if(!drag)drag='touch';
            } else if(op===8) {
              event(env.document,'touchmove',{touches:[{identifier:2,...point(999)},{identifier:1,...point(value)}]});
              if(drag==='touch')position=clamp(value);
            } else if(op===9) {
              const id=rand()<.5?1:2;
              event(env.document,'touchend',{changedTouches:[{identifier:id}]});
              if(drag==='touch'&&id===1){drag=null;ends++;}
            } else if(op===10) {
              if(rand()<.5){event(env.document.defaultView,'blur');drag=null;}
              else {event(env.document,'touchcancel',{changedTouches:[{identifier:1}]});if(drag==='touch')drag=null;}
            } else if(op===11) {
              compare.remove();compare.remove();drag=null;
            } else if(op===12) {
              const map=rand()<.5?env.a:env.b;
              map.jumpTo({zoom:rand()*20,bearing:rand()*360-180,pitch:rand()*60,roll:rand()*40-20,elevation:rand()*1000});
              assert.deepEqual(env.a.camera,env.b.camera);
            } else if(op===13) {
              event(drag==='mouse'?env.document:env.b.container,'mousemove',{clientX:NaN,clientY:NaN});
            } else if(op===14) {
              env.b.container.bounds.left=rand()*1000-500;env.b.container.bounds.top=rand()*1000-500;
            } else {
              compare.remove();checkDisposed(env);start();
            }
            if(compare._removed) {
              checkDisposed(env);
              assert.equal(env.a.container.style.clip,originalA);assert.equal(env.b.container.style.clip,originalB);
            } else {
              assert.ok(Math.abs(compare.currentPosition-position)<1e-7,`seed=${seed} step=${step} op=${op}: ${compare.currentPosition} != ${position}`);
              assert.ok(Number.isFinite(compare.currentPosition));
              assert.equal(compare._dragging,!!drag);
              assert.equal(seen.length,ends);
              for(const map of [env.a,env.b]) {
                assert.equal(map.listenerCount('move'),1);assert.equal(map.listenerCount('resize'),1);
                assert.equal(map.listenerCount('remove'),2);
                assert.doesNotMatch(map.container.style.clip,/NaN|Infinity/);
              }
              for(const type of eventTypes) assert.ok(env.document.count(type)<=1);
              assert.ok(env.document.defaultView.count('blur')<=1);
              assert.equal(env.wrapper.children.length,3);
            }
          }
        } finally {compare.remove();checkDisposed(env);}
      });
    }
  });
  test(`${name}: 1,000 create/drag/remove cycles release all subscriptions`,()=>{
    const env=environment();
    for(let i=0;i<1000;i++) {
      const compare=new Compare(env.a,env.b,env.wrapper,{mousemove:!!(i%2),orientation:i%3?'vertical':'horizontal'});
      event(compare._swiper,'mousedown',{button:0});
      compare.remove();checkDisposed(env);
      assert.equal(compare._swiper.count('mousedown'),0);assert.equal(compare._swiper.count('touchstart'),0);
      assert.equal(compare._controlContainer.count('mousemove'),0);
    }
  });
}

test('10,000 bidirectional camera updates do not accumulate handlers or recurse',()=>{
  const {a,b}=environment(),rand=random(0x12345678);
  const stop=syncMove(a,b);
  let moves=0;a.on('move',count);b.on('move',count);
  function count(){moves++;}
  for(let i=0;i<10000;i++) {
    const map=i%2?a:b;
    map.jumpTo({zoom:rand()*22,center:{lng:rand()*360-180,lat:rand()*160-80},roll:rand()*90,pitch:rand()*60});
    assert.deepEqual(a.camera,b.camera);
  }
  assert.equal(moves,20000);
  assert.equal(a.listenerCount('move'),2);assert.equal(b.listenerCount('move'),2);
  stop();a.off('move',count);b.off('move',count);
  assert.equal(a.listenerCount('move'),0);assert.equal(b.listenerCount('move'),0);
});
