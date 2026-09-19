// Run against a local server in an isolated browser: AURA_TEST_URL defaults to localhost:8765.
const {chromium}=require('playwright');
const assert=require('node:assert/strict');
(async()=>{
 const browser=await chromium.launch({headless:true});
 try {
  const page=await browser.newPage({viewport:{width:390,height:844}}),errors=[];
  page.on('pageerror',e=>errors.push(e.message));
  const url=process.env.AURA_TEST_URL||'http://127.0.0.1:8765/';
  await page.goto(url);
  const legacy=['calendar','photos','camera','weather','mail','clock','maps','notes','reminders','files','calculator','settings','games','health','wallet','recorder','phone','safari','messages','music'];
  [legacy[0],legacy[18]]=[legacy[18],legacy[0]];
  await page.evaluate(order=>{
   localStorage.setItem('aura.homeOrder',JSON.stringify(order));
   localStorage.setItem('aura.notes',JSON.stringify([{id:'keep',title:'残すメモ',body:'既存データ',updated:Date.now()}]));
   localStorage.setItem('aura.habits',JSON.stringify([{id:'keep-habit',name:'朝の散歩',days:['2026-09-18']}]));
   localStorage.setItem('aura.focusSession',JSON.stringify({id:'finish-on-load',mode:'work',duration:60,remaining:60,end:Date.now()-1000}));
  },legacy);
  await page.goto(url+'#app=focus');
  // Fragment navigation does not reload the runtime or newly seeded localStorage.
  await page.reload();
  await page.waitForFunction(()=>Aura.load('focusHistory',[]).length===1);
  assert.equal(await page.evaluate(()=>Aura.load('focusHistory',[])[0].minutes),1);
  console.log('PASS expired timer completes once after reload');
  await page.reload();await page.waitForTimeout(1100);
  assert.equal(await page.evaluate(()=>Aura.load('focusHistory',[]).length),1);
  console.log('PASS completion is not duplicated by another reload');
  await page.evaluate(()=>Aura.home());
  assert.deepEqual(await page.locator('#home-dock [data-app]').evaluateAll(els=>els.map(e=>e.dataset.app)),legacy.slice(-4));
  assert.equal(await page.locator('#app-grid [data-app]').first().getAttribute('data-app'),'messages');
  assert.equal(await page.locator('#app-grid [data-app]').count(),26);
  assert.equal(await page.locator('#home-screen .app-artwork').count(),30);
  await page.waitForTimeout(1100);
  assert.equal(await page.locator('#home-screen [data-app-art=clock]').count(),1);
  console.log('PASS old custom home order, dock and detailed icons survive reload');
  await page.evaluate(()=>Aura.open('notes'));
  assert.ok((await page.locator('#notes-grid').innerText()).includes('残すメモ'));
  await page.evaluate(()=>Aura.open('habits'));
  assert.ok((await page.locator('.ev-habit').innerText()).includes('朝の散歩'));
  console.log('PASS existing and new records survive reload');
  await page.evaluate(()=>{Aura.open('focus');Aura.actions.evFocusToggle();});
  const running=await page.evaluate(()=>Aura.load('focusSession',{}));
  assert.ok(running.id&&running.id!=='finish-on-load');
  await page.reload();await page.evaluate(()=>Aura.open('focus'));
  assert.equal(await page.evaluate(()=>Aura.load('focusSession',{}).end),running.end);
  console.log('PASS restarted timer uses a new session and keeps its deadline');
  await page.evaluate(()=>{const f=Aura.load('focusSession',{});f.end=Date.now()-1000;Aura.save('focusSession',f);});
  await page.reload();await page.evaluate(()=>Aura.open('focus'));
  await page.waitForFunction(()=>Aura.load('focusHistory',[]).length===2);
  console.log('PASS second completed session earns a separate record');
  for(const id of ['today','focus','habits','expenses','shopping','journal','contacts','converter','reading','sketch']){
   await page.goto(url+'#app='+id);assert.equal(await page.evaluate(()=>Aura.current),id);
  }
  console.log('PASS all ten app deep links open after navigation');
  await page.evaluate(()=>{Aura.open('sketch');Aura.actions.evSketchNew();});
  const box=await page.locator('#ev-canvas').boundingBox();
  await page.mouse.move(box.x+20,box.y+20);await page.mouse.down();await page.mouse.move(box.x+150,box.y+120,{steps:12});await page.mouse.up();
  assert.equal(await page.evaluate(()=>Aura.load('sketches',[])[0].strokes.length),1);
  await page.reload();await page.evaluate(()=>Aura.actions.evSketchOpen({dataset:{id:Aura.load('sketches',[])[0].id}}));
  assert.equal(await page.evaluate(()=>Aura.load('sketches',[])[0].strokes[0].points.length),13);
  console.log('PASS real pointer drawing survives reload');
  assert.deepEqual(errors,[]);
  console.log('PASS no uncaught browser errors');
  console.log('RESULT: 9 passed, 0 failed.');
 } finally {await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
