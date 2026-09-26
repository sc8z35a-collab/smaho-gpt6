// Run against a local server in an isolated browser: AURA_TEST_URL defaults to localhost:8765.
const {chromium}=require('playwright');
const assert=require('node:assert/strict');

// Control-center coverage uses its own context: no external API or native permissions.
async function checkControlDesk(browser,url){
 const page=await browser.newPage({viewport:{width:390,height:844}}),errors=[];
 let count=0;
 const pass=name=>{count++;console.log('PASS control desk: '+name);};
 const open=()=>page.evaluate(()=>Aura.controls());
 const toggle=key=>page.locator(`[data-action=controlToggle][data-key="${key}"]`);
 const range=async(id,value)=>page.locator(id).evaluate((el,value)=>{el.value=value;el.dispatchEvent(new Event('input',{bubbles:true}));},String(value));
 const click=action=>page.locator(`#overlay [data-action="${action}"]`).click();
 page.on('pageerror',e=>errors.push(e.message));
 await page.route('**/*',r=>new URL(r.request().url()).origin===new URL(url).origin?r.continue():r.abort());
 try{
  await page.goto(url);await page.locator('#status-controls').click();
  assert.equal(await page.locator('#overlay').getAttribute('role'),'dialog');
  assert.equal(await page.locator('.cc-connection').count(),4);
  assert.equal(await page.locator('.cc-shortcut').count(),4);
  assert.deepEqual(await page.locator('#overlay [data-action]').evaluateAll(els=>els.filter(el=>!Aura.actions[el.dataset.action]).map(el=>el.dataset.action)),[]);
  pass('all original controls and action handlers remain available');

  await toggle('airplane').click();
  assert.equal(await page.evaluate(()=>Aura.settings.cellular),false);
  await toggle('cellular').click();
  assert.equal(await page.evaluate(()=>Aura.settings.airplane),false);
  await toggle('wifi').click();
  assert.equal(await toggle('wifi').getAttribute('aria-pressed'),'false');
  assert.equal(await page.evaluate(()=>document.activeElement.dataset.key),'wifi');
  pass('communication simulation and keyboard focus stay consistent');

  await range('#control-brightness',73);await range('#control-volume',37);
  assert.equal(await page.locator('#cc-brightness-value').innerText(),'73%');
  await page.locator('[data-action=controlScene][data-id=night]').click();
  assert.equal(await page.evaluate(()=>Aura.settings.dark&&Aura.settings.focus&&Aura.settings.warm),true);
  await page.locator('#toast button').click();
  assert.deepEqual(await page.evaluate(()=>[Aura.settings.brightness,Aura.settings.volume,Aura.settings.dark]),[73,37,false]);
  await click('controlMute');assert.equal(await page.locator('#control-volume').inputValue(),'0');
  await click('controlMute');assert.equal(await page.locator('#control-volume').inputValue(),'37');
  await toggle('warm').click();await page.reload();await open();
  assert.deepEqual(await page.evaluate(()=>[Aura.settings.brightness,Aura.settings.volume,Aura.settings.warm]),[73,37,true]);
  assert.match(await page.locator('#phone-screen').evaluate(el=>getComputedStyle(el).filter),/sepia\(0\.3\)/);
  pass('scenes, undo, mute, warmth and level settings survive reload');

  await page.locator('#cc-customize summary').click();
  for(const id of ['notes','recorder','focus','settings'])await page.locator(`.cc-choices input[value=${id}]`).check();
  assert.equal(await page.locator('.cc-shortcut').count(),8);
  await page.reload();await open();assert.equal(await page.locator('.cc-shortcut').count(),8);
  await page.locator('#cc-customize summary').click();
  for(const id of ['clock','calculator','camera','notes','recorder','focus','settings'])await page.locator(`.cc-choices input[value=${id}]`).uncheck();
  await page.locator('.cc-choices input[value=flashlight]').click();
  assert.equal(await page.locator('.cc-choices input:checked').count(),1);
  assert.equal(await page.locator('.cc-shortcut').count(),1);
  pass('shortcut editing persists and rejects an empty selection');

  await page.locator('.cc-shortcut').click();
  assert.equal(await page.locator('.flashlight-screen button').evaluate(el=>el===document.activeElement),true);
  await page.keyboard.press('Escape');
  assert.equal(await page.locator('.flashlight-screen').count(),0);
  assert.equal(await page.locator('#overlay').isVisible(),true);
  assert.equal(await page.locator('.cc-shortcut').evaluate(el=>el===document.activeElement),true);
  pass('screen light closes with Escape and restores focus');

  await page.evaluate(()=>{Aura.controlsTestSave=Aura.save;Aura.save=()=>false;});
  const previous=await page.evaluate(()=>JSON.stringify(Aura.settings));
  await toggle('dark').click();await range('#control-volume',12);
  await page.evaluate(()=>Aura.actions.controlTimerStart({dataset:{minutes:'1'}}));
  assert.equal(await page.evaluate(()=>JSON.stringify(Aura.settings)),previous);
  assert.equal(await page.evaluate(()=>Aura.load('controlTimer',null)),null);
  assert.equal(await page.locator('#control-volume').inputValue(),'37');
  await page.evaluate(()=>{Aura.save=Aura.controlsTestSave;delete Aura.controlsTestSave;});
  pass('failed storage writes do not apply settings or start a timer');

  await page.evaluate(()=>Aura.actions.controlTimerStart({dataset:{minutes:'5'}}));
  const timer=await page.evaluate(()=>Aura.load('controlTimer',null));
  assert.equal(timer.duration,300);
  await page.reload();await open();
  assert.equal(await page.evaluate(()=>Aura.load('controlTimer',null).end),timer.end);
  await click('controlTimerPause');
  const paused=await page.locator('#cc-timer-time').innerText();
  await page.reload();await open();await page.waitForTimeout(1200);
  assert.equal(await page.locator('#cc-timer-time').innerText(),paused);
  assert.equal(await page.evaluate(()=>Aura.load('controlTimer',null).end),0);
  await click('controlTimerPause');assert.ok(await page.evaluate(()=>Aura.load('controlTimer',null).end>Date.now()));
  await click('controlTimerReset');assert.equal(await page.evaluate(()=>Aura.load('controlTimer',null)),null);
  pass('quick timer preserves running and paused states and resets');

  await page.evaluate(()=>{Aura.save('controlTimer',{id:'control-expiry-proof',duration:60,remaining:60,end:Date.now()-1000});});
  await page.reload();
  assert.equal(await page.evaluate(()=>Aura.load('controlTimer',null)),null);
  assert.equal(await page.evaluate(()=>Aura.load('notifications',[]).filter(n=>n.key==='control-timer:control-expiry-proof').length),1);
  await page.reload();await page.waitForTimeout(1100);
  assert.equal(await page.evaluate(()=>Aura.load('notifications',[]).filter(n=>n.key==='control-timer:control-expiry-proof').length),1);
  pass('expired timer completes once on reload without duplicate notices');

  await open();await page.evaluate(()=>{Aura.actions.controlTimerStart({dataset:{minutes:'1'}});Aura.save('controlTimer',null);window.dispatchEvent(new StorageEvent('storage',{key:'aura.controlTimer'}));});
  assert.equal(await page.locator('#cc-timer-status').innerText(),'時間を選択');
  await page.evaluate(()=>{Aura.save('controlTimer',{id:'invalid',duration:-1,remaining:0,end:0});Aura.settings.controlShortcuts=['not-an-app'];Aura.applySettings();});
  await page.reload();await open();
  assert.equal(await page.locator('.cc-shortcut').count(),4);
  assert.equal(await page.locator('#cc-timer-status').innerText(),'時間を選択');
  pass('cross-tab cancellation and invalid stored state are handled');

  await click('controlPlay');assert.equal(await page.evaluate(()=>Aura.music.playing),true);
  await range('#control-seek',42);
  assert.match(await page.locator('#cc-elapsed').innerText(),/^0:4[23]$/);
  const title=await page.locator('#cc-track').innerText();await click('musicNext');
  assert.notEqual(await page.locator('#cc-track').innerText(),title);
  assert.equal(await page.locator('.cc-record').evaluate(el=>getComputedStyle(el).animationPlayState),'running');
  await page.emulateMedia({reducedMotion:'reduce'});
  assert.equal(await page.locator('.cc-record').evaluate(el=>el.getAnimations().length),0);
  await page.emulateMedia({reducedMotion:'no-preference'});await toggle('reduceMotion').click();
  assert.equal(await page.locator('.cc-record').evaluate(el=>el.getAnimations().length),0);
  await click('controlPlay');assert.equal(await page.evaluate(()=>Aura.music.playing),false);
  pass('real audio playback, next, seek and reduced-motion policies work');

  await page.evaluate(()=>{Aura.music.track={...Aura.music.track,title:'<img src=x onerror=alert(1)>'};Aura.controls();});
  assert.equal(await page.locator('#cc-track img').count(),0);
  assert.match(await page.locator('#cc-track').innerText(),/^<img/);
  pass('media titles are escaped rather than injected');

  for(const viewport of [{width:320,height:568},{width:390,height:844},{width:768,height:1024},{width:844,height:390},{width:1920,height:1080}]){
   await page.setViewportSize(viewport);await open();
   assert.equal(await page.locator('#overlay').evaluate(el=>el.scrollWidth<=el.clientWidth),true,`Overflow at ${viewport.width}`);
   await page.locator('#cc-customize summary').click();
   assert.equal(await page.locator('#overlay').evaluate(el=>el.scrollWidth<=el.clientWidth),true,`Editing overflow at ${viewport.width}`);
   await page.locator('[data-action=lock]').scrollIntoViewIfNeeded();
   assert.equal(await page.locator('[data-action=lock]').evaluate(el=>{const r=el.getBoundingClientRect();return r.top>=0&&r.bottom<=innerHeight;}),true);
  }
  pass('mobile, tablet, desktop and landscape layouts do not overflow');

  await page.setViewportSize({width:390,height:844});
  await page.evaluate(()=>{Aura.home();document.querySelector('#status-controls').focus();Aura.controls();});
  await page.locator('.close-button').focus();await page.keyboard.press('Shift+Tab');
  assert.equal(await page.locator('[data-action=lock]').evaluate(el=>el===document.activeElement),true);
  await page.keyboard.press('Tab');assert.equal(await page.locator('.close-button').evaluate(el=>el===document.activeElement),true);
  await page.keyboard.press('Escape');
  assert.equal(await page.locator('#status-controls').evaluate(el=>el===document.activeElement),true);
  pass('keyboard focus remains inside dialog and returns to opener');
  assert.deepEqual(errors,[]);pass('no uncaught browser errors');
  return count;
 } finally {await page.close();}
}

async function checkNotesStudio(browser,url){
 const page=await browser.newPage({viewport:{width:390,height:844}}),errors=[];
 page.on('pageerror',e=>errors.push(e.message));
 await page.route('**/*',r=>new URL(r.request().url()).origin===new URL(url).origin?r.continue():r.abort());
 try{
  await page.goto(url+'#app=notes');
  await page.evaluate(()=>{Aura.noteModel.replace([{id:'legacy-note',title:'引き継ぐメモ',body:'本文',updated:1000}]);Aura.actions.pdNoteReset();});
  const saved=await page.evaluate(()=>localStorage.getItem('aura.notes'));
  await page.reload();assert.equal(await page.evaluate(()=>localStorage.getItem('aura.notes')),saved);
  await page.locator('.memo-card').click();await page.locator('.memo-style-panel summary').click();
  for(const [key,id] of [['tone','lavender'],['paper','dots'],['font','serif']])await page.locator(`[data-action=pdNoteStyle][data-key=${key}][data-id=${id}]`).click();
  await page.locator('#note-body').fill('再読込後にも残る本文');await page.locator('[data-action=noteList]').click();await page.locator('[data-action=pdNoteLayout][data-id=list]').click();
  await page.reload();assert.equal(await page.locator('#notes-grid').getAttribute('data-layout'),'list');
  await page.locator('.memo-card').click();assert.deepEqual(await page.locator('.memo-paper').evaluate(el=>({...el.dataset})),{tone:'lavender',paper:'dots',font:'serif'});
  assert.equal(await page.locator('#note-body').inputValue(),'再読込後にも残る本文');
  console.log('PASS notes reload: legacy notes, chosen stationery, text and layout persist');
  await page.evaluate(()=>{Aura.testReplace=Aura.noteModel.replace;Aura.noteModel.replace=()=>false;});
  await page.locator('#note-body').fill('再試行する下書き');await page.locator('[data-action=noteList]').click();await page.locator('.memo-card').click();
  assert.equal(await page.locator('#note-body').inputValue(),'再試行する下書き');assert.equal(await page.locator('#memo-save-retry').isVisible(),true);
  await page.evaluate(()=>{Aura.noteModel.replace=Aura.testReplace;delete Aura.testReplace;});await page.locator('#memo-save-retry').click();
  await page.reload();await page.locator('.memo-card').click();assert.equal(await page.locator('#note-body').inputValue(),'再試行する下書き');
  assert.equal(await page.locator('#memo-save-warning').isVisible(),false);assert.deepEqual(errors,[]);
  console.log('PASS notes reload: retry commits recovered draft; no uncaught errors');return 2;
 }finally{await page.close();}
}

// AURA_TEST_SCOPE=reminders runs only these isolated reminder integration checks.
async function checkReminderStudio(browser,url){
 const page=await browser.newPage({viewport:{width:390,height:844}}),errors=[];
 let count=0;const pass=name=>{count++;console.log('PASS reminders: '+name);};
 page.on('pageerror',e=>errors.push(e.message));
 await page.route('**/*',r=>new URL(r.request().url()).origin===new URL(url).origin?r.continue():r.abort());
 try{
  await page.goto(url+'#app=reminders');
  await page.evaluate(()=>{Aura.reminderModel.replace([{id:'legacy-reminder',text:'以前のタスク',done:false},{id:'repeat-reminder',text:'繰り返すタスク',due:'2020-01-01',repeat:'daily',list:'生活',note:'大切なメモ',steps:[{id:'legacy-step',text:'準備',done:true}],done:false}]);Aura.actions.rmResetFilters();});
  const legacy=await page.evaluate(()=>localStorage.getItem('aura.reminders'));await page.reload();
  assert.equal(await page.evaluate(()=>localStorage.getItem('aura.reminders')),legacy);
  await page.locator('#reminder-form input').fill('保存するタスク');await page.locator('#reminder-form input').press('Enter');
  const saved=await page.evaluate(()=>localStorage.getItem('aura.reminders'));await page.reload();
  assert.equal(await page.evaluate(()=>localStorage.getItem('aura.reminders')),saved);
  assert.equal(await page.locator('.rm-task-main').filter({hasText:'保存するタスク'}).count(),1);
  pass('legacy records and quick capture survive reload');

  await page.locator('.rm-task-main[data-id=repeat-reminder]').click();
  await page.locator('#app-screen .app-nav [data-action=reminderDetails]').click();
  await page.locator('#ep-list').fill('暮らし');await page.locator('#ep-note').fill('編集したメモ');await page.keyboard.press('Control+Enter');
  assert.equal(await page.locator('#overlay').isVisible(),false);
  await page.locator('#rm-step-form input').fill('片づけ');await page.locator('#rm-step-form input').press('Enter');
  await page.locator('[data-action=epReminderComplete]').click();
  const repeated=await page.evaluate(()=>Aura.reminderModel.get()),parent=repeated.find(x=>x.id==='repeat-reminder'),child=repeated.find(x=>x.id===parent.repeatNextId);
  assert.ok(child&&!child.done&&child.list==='暮らし'&&child.note==='編集したメモ');assert.equal(child.steps.length,2);assert.ok(child.steps.every(x=>!x.done));
  await page.reload();assert.deepEqual(await page.evaluate(()=>Aura.reminderModel.get()),repeated);
  await page.evaluate(()=>{Aura.actions.reminderToggle({dataset:{id:'repeat-reminder'}});Aura.actions.reminderToggle({dataset:{id:'repeat-reminder'}});});
  assert.equal(await page.evaluate(()=>Aura.reminderModel.get().length),repeated.length);
  pass('editing, inline steps and recurrence persist without duplicate instances');

  await page.evaluate(()=>{Aura.actions.rmResetFilters();document.querySelector('#rm-list-heading').focus();});
  await page.keyboard.press('n');assert.equal(await page.locator('#reminder-form input').evaluate(el=>el===document.activeElement),true);
  await page.locator('#reminder-form input').fill('保持する下書き');await page.keyboard.press('n');assert.equal(await page.locator('#reminder-form input').inputValue(),'保持する下書きn');
  await page.locator('#rm-list-heading').focus();await page.keyboard.press('/');assert.equal(await page.locator('#ep-reminder-query').evaluate(el=>el===document.activeElement),true);
  await page.locator('[data-action=rmSelectionMode]').click();await page.keyboard.press('Escape');assert.equal(await page.evaluate(()=>Aura.current),'reminders');
  assert.equal(await page.locator('[data-action=rmSelectionMode]').getAttribute('aria-pressed'),'false');
  pass('shortcuts respect input fields and Escape exits selection only');

  await page.locator('#reminder-form input').evaluate(el=>{const data=new DataTransfer();data.setData('text/plain','まとめ一件目\nまとめ二件目');el.dispatchEvent(new ClipboardEvent('paste',{clipboardData:data,bubbles:true,cancelable:true}));});
  assert.equal(await page.locator('#ep-bulk').inputValue(),'まとめ一件目\nまとめ二件目');
  await page.locator('#overlay [data-action=closeOverlay]').click();assert.equal(await page.locator('#reminder-form input').inputValue(),'保持する下書きn');
  await page.evaluate(()=>Aura.actions.rmBulkAdd());await page.locator('#ep-bulk').fill('まとめ一件目\nまとめ二件目');await page.keyboard.press('Control+Enter');
  const bulk=await page.evaluate(()=>Aura.reminderModel.get());assert.equal(bulk.length,repeated.length+2);
  await page.reload();assert.deepEqual(await page.evaluate(()=>Aura.reminderModel.get()),bulk);
  pass('multiline paste, cancellation and bulk capture preserve data');

  await page.evaluate(()=>Aura.actions.rmResetFilters());await page.locator('[data-action=rmSelectionMode]').click();
  await page.locator('.rm-select[data-id=legacy-reminder]').click();await page.locator('[data-action=rmBatchTomorrow]').click();
  const changed=await page.evaluate(()=>Aura.reminderModel.get().find(x=>x.id==='legacy-reminder').due);assert.match(changed,/^\d{4}-\d{2}-\d{2}$/);
  await page.locator('[data-action=rmUndo]').click();assert.equal(await page.evaluate(()=>Aura.reminderModel.get().find(x=>x.id==='legacy-reminder').due),undefined);
  pass('actual selection controls and undo operate correctly');

  // Compact is the default since #17; toggling persists the relaxed view.
  const compactBefore=await page.locator('.ev-reminders.rm-compact').count();
  await page.evaluate(()=>Aura.actions.rmCompact());await page.reload();assert.equal(await page.locator('.ev-reminders.rm-compact').count(),1-compactBefore);
  await page.evaluate(()=>{localStorage.setItem('aura.reminderCompact','"invalid"');});await page.reload();assert.equal(await page.locator('.ev-reminders.rm-compact').count(),1);
  pass('compact view persists and invalid preferences fall back safely');

  for(const viewport of [{width:320,height:568},{width:390,height:844},{width:768,height:1024},{width:844,height:390},{width:1920,height:1080}]){
   await page.setViewportSize(viewport);
   for(const dark of [false,true]){
    await page.evaluate(dark=>{Aura.settings.dark=dark;Aura.applySettings();Aura.actions.rmResetFilters();},dark);
    assert.equal(await page.locator('.ev-reminders').evaluate(el=>el.scrollWidth<=el.clientWidth),true,`List overflow ${viewport.width}/${dark}`);
    await page.evaluate(()=>{Aura.actions.rmSelectionMode();Aura.actions.rmSelectAll();});
    assert.equal(await page.locator('.rm-batch').evaluate(el=>el.scrollWidth<=el.clientWidth),true,`Batch overflow ${viewport.width}`);
    await page.evaluate(()=>Aura.actions.epReminderOpen({dataset:{id:'repeat-reminder'}}));
    assert.equal(await page.locator('.ev-reminders').evaluate(el=>el.scrollWidth<=el.clientWidth),true,`Detail overflow ${viewport.width}`);
    await page.evaluate(()=>Aura.actions.reminderDetails({dataset:{id:'repeat-reminder'}}));
    assert.equal(await page.locator('#overlay').evaluate(el=>el.scrollWidth<=el.clientWidth),true,`Editor overflow ${viewport.width}`);
    await page.locator('#modal-form button[type=submit]').scrollIntoViewIfNeeded();
    assert.equal(await page.locator('#modal-form button[type=submit]').evaluate(el=>{const r=el.getBoundingClientRect();return r.top>=0&&r.bottom<=innerHeight;}),true,`Save clipped ${viewport.width}`);
    await page.evaluate(()=>Aura.closeOverlay());
   }
  }
  pass('five viewport sizes in light and dark keep all controls reachable');
  await page.emulateMedia({reducedMotion:'reduce'});await page.evaluate(()=>Aura.actions.rmResetFilters());
  assert.equal(await page.locator('.rm-orbit-value').evaluate(el=>getComputedStyle(el).transitionDuration),'0s');
  assert.deepEqual(errors,[]);pass('reduced motion works with no uncaught errors');
  return count;
 }finally{await page.close();}
}

(async()=>{
 const browser=await chromium.launch({headless:true});
 try {
  const page=await browser.newPage({viewport:{width:390,height:844}}),errors=[];
  page.on('pageerror',e=>errors.push(e.message));
  const url=process.env.AURA_TEST_URL||'http://127.0.0.1:8765/';
  if(process.env.AURA_TEST_SCOPE==='reminders'){const count=await checkReminderStudio(browser,url);console.log(`RESULT: ${count} passed, 0 failed.`);return;}
  if(process.env.AURA_TEST_SCOPE==='notes'){const count=await checkNotesStudio(browser,url);console.log(`RESULT: ${count} passed, 0 failed.`);return;}
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
  const storedPoints=await page.evaluate(()=>Aura.load('sketches',[])[0].strokes[0].points);
  assert.ok(storedPoints.length>=13,'Pointer samples missing');
  await page.reload();await page.evaluate(()=>Aura.actions.evSketchOpen({dataset:{id:Aura.load('sketches',[])[0].id}}));
  assert.deepEqual(await page.evaluate(()=>Aura.load('sketches',[])[0].strokes[0].points),storedPoints);
  console.log('PASS real pointer drawing survives reload');
  await page.evaluate(()=>{Aura.open('settings');Aura.actions.stAccessibility();});
  await page.locator('[data-st-select="textSize"]').selectOption('large');
  await page.locator('[data-key="boldText"]').click();
  await page.evaluate(()=>Aura.actions.stHome());
  await page.locator('[data-key="clockSeconds"]').click();
  await page.reload();await page.waitForTimeout(1200);
  assert.equal(await page.evaluate(()=>Aura.settings.textSize),'large');
  assert.equal(await page.evaluate(()=>Aura.settings.boldText),true);
  assert.match(await page.locator('#status-time').innerText(),/\d+:\d+:\d+/);
  assert.equal(await page.evaluate(()=>Aura.load('notes',[])[0].id),'keep');
  console.log('PASS new preferences survive reload and retain existing notes');
  await page.evaluate(()=>{Aura.open('settings');Aura.actions.stDeveloper();});
  await page.locator('[data-action="stDeveloperToggle"]').click();await page.locator('#confirm-yes').click();
  await page.locator('[data-key="devLog"]').click();await page.locator('[data-action="stOffline"]').click();
  await page.evaluate(async()=>{try{await Aura.network.request('https://example.test/private');}catch{}});
  await page.reload();await page.evaluate(()=>{Aura.open('settings');Aura.actions.stDeveloper();});
  assert.equal(await page.evaluate(()=>Aura.settings.developerMode),true);
  assert.equal(await page.locator('[data-action="stOffline"]').getAttribute('aria-pressed'),'false');
  assert.equal(await page.locator('.st-api-log li').count(),0);
  assert.equal(await page.locator('#st-offline-warning').count(),0);
  console.log('PASS reload clears API simulation and diagnostic records');
  await page.evaluate(()=>{const s=Aura.load('settings',{});s.textSize='bad';s.devFps='true';Aura.save('settings',s);});
  await page.reload();
  assert.equal(await page.evaluate(()=>Aura.settings.textSize),'standard');
  assert.equal(await page.evaluate(()=>Aura.settings.devFps),false);
  console.log('PASS invalid new preference values fall back safely');
  assert.deepEqual(errors,[]);
  console.log('PASS no uncaught browser errors');
  await checkReminderStudio(browser,url);
  const notes=await checkNotesStudio(browser,url);
  const controls=await checkControlDesk(browser,url);
  console.log(`RESULT: ${12+controls+notes} passed, 0 failed.`);
 } finally {await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
