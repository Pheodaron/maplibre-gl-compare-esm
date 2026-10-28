import assert from 'node:assert/strict';
import test from 'node:test';
import { browserFixture } from './support/browser.js';

test('MapLibre v6 adversarial browser scenarios',async t=>{
  const {page,errors,browser,origin}=await browserFixture(t);
  await page.evaluate(()=>{
    window.resetFixture=()=>{
      const {a,b}=fixture;
      fixture.compare.remove();
      const wrapper=document.querySelector('#wrapper');
      wrapper.style.cssText='position:relative;width:800px;height:400px';
      document.body.style.height='650px';window.scrollTo(0,0);
      for(const map of [a,b]) {
        map.stop();map.setMaxZoom(22);map.setMinZoom(0);map.resize();
        map.setVerticalFieldOfView(36.86989764584402);
        map.jumpTo({center:[0,0],zoom:2,pitch:0,bearing:0,roll:0,elevation:0,padding:{left:0,right:0,top:0,bottom:0}});
      }
    };
  });

  await t.test('constructor misuse and failed initialization leave no DOM or subscriptions',async()=>{
    const result=await page.evaluate(()=>{
      resetFixture();
      const {a,b,Compare}=fixture,wrapper=document.querySelector('#wrapper');
      const baseline=[(a._listeners?.move||[]).length,(b._listeners?.move||[]).length];
      const cases=[
        ()=>Compare(a,b,wrapper),()=>new Compare(a,a,wrapper),()=>new Compare(null,b,wrapper),
        ()=>new Compare(a,b,'['),()=>new Compare(a,b,'#missing'),()=>new Compare(a,b,document.createElement('div')),
        ()=>new Compare(a,b,null),()=>new Compare(a,b,wrapper,{orientation:'bad'}),
        ()=>new Compare(a,b,wrapper,{mousemove:'false'}),()=>new Compare(a,b,wrapper,[]),
      ];
      const failures=cases.map(run=>{try{run();return null;}catch(error){return error.name;}});
      const jump=b.jumpTo;
      b.jumpTo=()=>{throw new Error('injected init failure');};
      try{new Compare(a,b,wrapper);failures.push(null);}catch(error){failures.push(error.message);}
      finally{b.jumpTo=jump;}
      const after=[(a._listeners?.move||[]).length,(b._listeners?.move||[]).length];
      const c=new Compare(a,b,wrapper);
      try{new Compare(b,a,wrapper);failures.push(null);}catch(error){failures.push(error.message);}
      c.remove();
      return {failures,baseline,after,controls:document.querySelectorAll('.maplibregl-compare').length,
        clips:[a.getContainer().style.clip,b.getContainer().style.clip]};
    });
    assert.equal(result.failures.length,12);
    assert.ok(result.failures.every(Boolean));
    assert.deepEqual(result.after,result.baseline);assert.equal(result.controls,0);assert.deepEqual(result.clips,['','']);
  });

  await t.test('CSS scaling uses local coordinates in both orientations',async()=>{
    for(const [scaleX,scaleY] of [[.5,2],[1.25,.75],[2,.5]]) {
      for(const orientation of ['vertical','horizontal']) {
        await page.evaluate(({scaleX,scaleY,orientation})=>{
          resetFixture();
          document.querySelector('#wrapper').style.transformOrigin='0 0';
          document.querySelector('#wrapper').style.transform=`scale(${scaleX},${scaleY})`;
          fixture.compare=new fixture.Compare(fixture.a,fixture.b,'#wrapper',{orientation});
        },{scaleX,scaleY,orientation});
        const handle=await page.locator(orientation==='vertical'?'.compare-swiper-vertical':'.compare-swiper-horizontal').boundingBox();
        await page.mouse.move(handle.x+handle.width/2,handle.y+handle.height/2);await page.mouse.down();
        await page.mouse.move(100*scaleX,100*scaleY);await page.mouse.up();
        const actual=await page.evaluate(()=>fixture.compare.currentPosition);
        assert.ok(Math.abs(actual-100)<1e-6,`${orientation} scale(${scaleX},${scaleY}) = ${actual}`);
      }
    }
  });

  await t.test('hover followed by a real two-finger touch keeps the initiating finger',async()=>{
    await page.evaluate(()=>{resetFixture();fixture.compare=new fixture.Compare(fixture.a,fixture.b,'#wrapper',{mousemove:true});});
    await page.mouse.move(300,200);
    const handle=await page.locator('.compare-swiper-vertical').boundingBox();
    const x=handle.x+handle.width/2,y=handle.y+handle.height/2;
    const cdp=await page.context().newCDPSession(page);
    const touch=(type,touchPoints)=>cdp.send('Input.dispatchTouchEvent',{type,touchPoints});
    await touch('touchStart',[{id:7,x,y}]);
    await touch('touchStart',[{id:7,x,y},{id:8,x:700,y:200}]);
    await touch('touchMove',[{id:8,x:650,y:200},{id:7,x:350,y:200}]);
    assert.equal(await page.evaluate(()=>fixture.compare.currentPosition),350);
    // CDP touchEnd lists the contacts being released, not the remaining ones.
    await touch('touchEnd',[{id:8,x:650,y:200}]);
    assert.equal(await page.evaluate(()=>fixture.compare._dragging),true);
    await touch('touchMove',[{id:7,x:400,y:200}]);
    await touch('touchEnd',[]);
    assert.equal(await page.evaluate(()=>fixture.compare.currentPosition),400);
    assert.equal(await page.evaluate(()=>fixture.compare._dragging),false);
  });

  await t.test('foreign-realm containers and shadow DOM work; mixed documents are rejected',async()=>{
    await page.evaluate(()=>{resetFixture();const frame=document.createElement('iframe');frame.id='realm';frame.src='/test/fixture.html';document.body.appendChild(frame);});
    await page.waitForFunction(()=>!!document.querySelector('#realm').contentWindow.fixture);
    const foreign=await page.evaluate(()=>{
      const frame=document.querySelector('#realm'),f=frame.contentWindow.fixture;
      f.compare.remove();let mixed=false;
      try{new fixture.Compare(fixture.a,f.b,document.querySelector('#wrapper'));}catch(error){mixed=error instanceof TypeError;}
      const c=new fixture.Compare(f.a,f.b,frame.contentDocument.querySelector('#wrapper'));
      c.setSlider(123);const position=c.currentPosition;c.remove();
      f.a.remove();f.b.remove();frame.remove();return {mixed,position,errors:f.errors};
    });
    assert.deepEqual(foreign,{mixed:true,position:123,errors:[]});
    const shadow=await page.evaluate(async()=>{
      const host=document.createElement('div');document.body.appendChild(host);
      const shadow=host.attachShadow({mode:'open'}),link=document.createElement('link');
      link.rel='stylesheet';link.href='/maplibre/maplibre-gl.css';
      const loaded=new Promise(resolve=>link.onload=resolve);shadow.appendChild(link);await loaded;
      const wrapper=document.createElement('div');wrapper.style.cssText='position:relative;width:400px;height:200px';shadow.appendChild(wrapper);
      const containers=[document.createElement('div'),document.createElement('div')];
      for(const container of containers){container.style.cssText='position:absolute;inset:0;width:100%;height:100%';wrapper.appendChild(container);}
      const maps=containers.map(container=>new fixture.Map({container,style:fixture.style('#00ff00'),attributionControl:false}));
      const mapErrors=[];for(const map of maps)map.on('error',e=>mapErrors.push(e.error.message));
      await Promise.all(maps.map(map=>new Promise(resolve=>map.on('load',resolve))));
      const c=new fixture.Compare(maps[0],maps[1],wrapper);c.setSlider(75);const position=c.currentPosition;
      c.remove();for(const map of maps)map.remove();host.remove();return {position,errors:mapErrors};
    });
    assert.deepEqual(shadow,{position:75,errors:[]});
  });

  await t.test('20,000 slider operations and 200 mount/unmount cycles do not leak handlers',async()=>{
    const result=await page.evaluate(()=>{
      resetFixture();
      const {a,b,Compare}=fixture,wrapper=document.querySelector('#wrapper');
      const baseline=[(a._listeners?.move||[]).length,(b._listeners?.move||[]).length];
      let operations=0;
      for(let cycle=0;cycle<200;cycle++) {
        const c=new Compare(a,b,wrapper,{orientation:cycle%2?'horizontal':'vertical',mousemove:!!(cycle%3)});
        const limit=cycle%2?400:800;
        for(let step=0;step<100;step++) {
          const x=((cycle*31+step*17)%1200)-200;c.setSlider(x);operations++;
          if(c.currentPosition!==Math.max(0,Math.min(limit,x)))throw new Error('position invariant');
        }
        c._swiper.dispatchEvent(new MouseEvent('mousedown',{button:0,cancelable:true}));
        c.remove();c.remove();
        for(const [target,handler] of [[document,c._onMove],[document,c._onMouseUp],[document,c._onTouchEnd],
          [document,c._onTouchCancel],[window,c._onTouchCancel],[a.getContainer(),c._onMove],[b.getContainer(),c._onMove],
          [c._swiper,c._onDown],[c._controlContainer,c._onMove]]) {
          if(listenerAudit.count(target,handler)!==0)throw new Error('leaked event handler');
        }
        if(wrapper.querySelector('.maplibregl-compare'))throw new Error('orphan control');
      }
      return {operations,baseline,after:[(a._listeners?.move||[]).length,(b._listeners?.move||[]).length],
        clips:[a.getContainer().style.clip,b.getContainer().style.clip]};
    });
    assert.equal(result.operations,20000);assert.deepEqual(result.after,result.baseline);assert.deepEqual(result.clips,['','']);
  });

  await t.test('overlapping animations and incompatible constraints stay bounded',async()=>{
    const result=await page.evaluate(async()=>{
      resetFixture();const {a,b}=fixture;
      fixture.compare=new fixture.Compare(a,b,'#wrapper');
      let moves=0;const count=()=>moves++;a.on('move',count);b.on('move',count);
      a.easeTo({center:[10,20],zoom:4,duration:100});
      await new Promise(resolve=>setTimeout(resolve,20));b.easeTo({center:[-20,30],zoom:5,duration:100});
      await new Promise(resolve=>setTimeout(resolve,250));
      const animation=[a.getCenter().toArray(),b.getCenter().toArray(),a.getZoom(),b.getZoom()];
      b.setMaxZoom(3);a.jumpTo({zoom:12});
      const constrained=[a.getZoom(),b.getZoom()];
      a.off('move',count);b.off('move',count);fixture.compare.remove();b.setMaxZoom(22);
      return {animation,constrained,moves};
    });
    assert.deepEqual(result.animation[0],result.animation[1]);assert.equal(result.animation[2],result.animation[3]);
    assert.deepEqual(result.constrained,[12,3]);assert.ok(result.moves<1000,`unexpected feedback loop: ${result.moves}`);
  });

  await t.test('unbounded camera callbacks fail clearly and synchronization can recover',async()=>{
    const result=await page.evaluate(()=>{
      resetFixture();const {a,b}=fixture;fixture.compare=new fixture.Compare(a,b,'#wrapper');
      let count=0;const interfere=()=>{count++;a.jumpTo({zoom:a.getZoom()+.1});};
      b.on('move',interfere);let message='';
      try{a.jumpTo({zoom:3});}catch(error){message=error.message;}
      b.off('move',interfere);a.jumpTo({zoom:4});
      const result={message,count,zoomA:a.getZoom(),zoomB:b.getZoom()};fixture.compare.remove();return result;
    });
    assert.match(result.message,/converge/);assert.ok(result.count<=16);assert.equal(result.zoomA,4);assert.equal(result.zoomB,4);
  });

  await t.test('retina viewport uses CSS pixels, not device pixels',async()=>{
    const context=await browser.newContext({viewport:{width:900,height:600},deviceScaleFactor:2});
    try {
      const retina=await context.newPage();await retina.goto(`${origin}/test/fixture.html`);
      await retina.waitForFunction(()=>!!window.fixture);
      const result=await retina.evaluate(()=>{fixture.compare.setSlider(123);return {dpr:devicePixelRatio,position:fixture.compare.currentPosition,
        clip:fixture.a.getContainer().style.clip};});
      assert.equal(result.dpr,2);assert.equal(result.position,123);assert.match(result.clip,/123px/);
    } finally {await context.close();}
  });

  await t.test('removing a map mid-gesture disposes compare before later camera updates',async()=>{
    const result=await page.evaluate(()=>{
      resetFixture();const {a,b}=fixture;fixture.compare=new fixture.Compare(a,b,'#wrapper');
      const c=fixture.compare;c._swiper.dispatchEvent(new MouseEvent('mousedown',{button:0,cancelable:true}));
      a.remove();b.jumpTo({zoom:3});c.remove();
      const result={removed:c._removed,controls:document.querySelectorAll('.maplibregl-compare').length,
        handlers:listenerAudit.count(document,c._onMove),clip:b.getContainer().style.clip};b.remove();return result;
    });
    assert.deepEqual(result,{removed:true,controls:0,handlers:0,clip:''});
  });
  assert.deepEqual(errors,[]);assert.deepEqual(await page.evaluate(()=>fixture.errors),[]);
});
