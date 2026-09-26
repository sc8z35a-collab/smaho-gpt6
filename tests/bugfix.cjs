'use strict';
// Regression checks for the 4.7.3 bug-fix sweep. Isolated contexts; external requests are blocked.
// Run: python3 -m http.server 8765 & node tests/bugfix.cjs   (AURA_TEST_URL / AURA_TEST_FILTER optional)
const {chromium}=require('playwright');
const assert=require('node:assert/strict');
const url=process.env.AURA_TEST_URL||'http://127.0.0.1:8765/';
const cases=[],test=(name,run)=>cases.push({name,run});
const submit=(p,values)=>p.evaluate(values=>{const f=document.querySelector('#modal-form');for(const [k,v] of Object.entries(values))f.elements[k].value=v;f.requestSubmit();},values);
const failKey=(p,key)=>p.evaluate(key=>{window.__save=Aura.save;Aura.save=(k,v)=>k===key?false:window.__save(k,v);},key);
const restoreSave=p=>p.evaluate(()=>{if(window.__save)Aura.save=window.__save;delete window.__save;});
const calc=(p,keys)=>p.evaluate(keys=>{Aura.open('calculator');Aura.actions.calcKey({dataset:{value:'clear'}});for(const k of keys)Aura.actions.calcKey({dataset:{value:k}});return document.querySelector('#calc-result').textContent;},keys);
const pageErrors=p=>{const errors=[];p.on('pageerror',e=>errors.push(e.stack||e.message));return errors;};

test('BF01 missing UI icons (eye, chevronRight) are defined',async p=>{
 assert.deepEqual(await p.evaluate(()=>['eye','chevronRight'].filter(n=>!Aura.icons[n])),[]);
});
test('BF02 Escape, H and Alt+Tab never bypass the lock screen',async p=>{
 await p.evaluate(()=>Aura.lock());
 await p.keyboard.press('Escape');assert.equal(await p.evaluate(()=>Aura.locked),true);
 await p.keyboard.press('h');assert.equal(await p.evaluate(()=>Aura.locked),true);
 await p.evaluate(()=>document.body.dispatchEvent(new KeyboardEvent('keydown',{key:'Tab',altKey:true,bubbles:true})));
 assert.equal(await p.locator('#overlay').isVisible(),false);
 await p.locator('#unlock-button').click();assert.equal(await p.evaluate(()=>Aura.locked),false);
});
test('BF03 keydown dispatched on document itself does not throw',async p=>{
 const errors=pageErrors(p);
 await p.evaluate(()=>{for(const key of ['h','Escape','Tab'])document.dispatchEvent(new KeyboardEvent('keydown',{key,altKey:key==='Tab',bubbles:true}));});
 await p.waitForTimeout(50);assert.deepEqual(errors,[]);
});
test('BF04 spotlight tolerates legacy notes / reminders without text fields',async p=>{
 const errors=pageErrors(p);
 await p.evaluate(()=>{Aura.noteModel.replace([{id:'n1',title:'abc'},{id:'n2',body:'abc body'}]);Aura.reminderModel.replace([{id:'r',done:false},{id:'r2',text:'abc task',done:false}]);Aura.spotlight();});
 await p.locator('#spotlight-query').fill('abc');await p.waitForTimeout(50);
 assert.deepEqual(errors,[]);
 assert.equal(await p.locator('[data-action=searchNote]').count(),2);
});
test('BF05 spotlight does not match literal "undefined" from missing fields',async p=>{
 await p.evaluate(()=>{Aura.save('contacts',[{id:'c',name:'山田'}]);Aura.spotlight();});
 await p.locator('#spotlight-query').fill('undefined');
 assert.equal(await p.locator('[data-app-id=contacts]').count(),0);
});
test('BF06 alarm toggle ignores removed alarms instead of throwing',async p=>{
 const errors=pageErrors(p);
 await p.evaluate(()=>{Aura.open('clock','alarm');Aura.actions.alarmToggle({dataset:{id:'missing'}});});
 await p.waitForTimeout(50);assert.deepEqual(errors,[]);
});
test('BF07 failed alarm writes leave the schedule unchanged',async p=>{
 await p.evaluate(()=>Aura.open('clock','alarm'));
 const before=await p.evaluate(()=>JSON.stringify(Aura.load('alarms',null)));
 const first=await p.locator('[data-action=alarmToggle]').first().getAttribute('aria-pressed');
 await failKey(p,'alarms');
 await p.locator('[data-action=alarmToggle]').first().click();
 assert.equal(await p.locator('[data-action=alarmToggle]').first().getAttribute('aria-pressed'),first);
 await p.evaluate(()=>Aura.actions.alarmAdd());await submit(p,{time:'06:15',label:'x'});
 await restoreSave(p);
 assert.equal(await p.evaluate(()=>JSON.stringify(Aura.load('alarms',null))),before);
 assert.equal(await p.locator('.alarm-row').count(),2);
});
test('BF08 duplicate alarms (same time and label) are rejected',async p=>{
 await p.evaluate(()=>{Aura.open('clock','alarm');Aura.actions.alarmAdd();});await submit(p,{time:'09:30',label:'散歩'});
 await p.evaluate(()=>Aura.actions.alarmAdd());await submit(p,{time:'09:30',label:'散歩'});
 assert.equal(await p.evaluate(()=>Aura.load('alarms',[]).filter(a=>a.time==='09:30').length),1);
 assert.equal(await p.locator('.alarm-row').count(),3);
});
test('BF09 wallet balance changes only after a successful save',async p=>{
 await p.evaluate(()=>Aura.open('wallet'));
 const shown=await p.locator('.wallet-card strong').textContent();
 await failKey(p,'wallet');await p.evaluate(()=>Aura.actions.walletCharge());await submit(p,{amount:'1000'});await restoreSave(p);
 assert.equal(await p.locator('.wallet-card strong').textContent(),shown);
 await p.evaluate(()=>{Aura.closeOverlay();Aura.actions.walletCharge();});await submit(p,{amount:'1000'});
 assert.notEqual(await p.locator('.wallet-card strong').textContent(),shown);
});
test('BF10 calculator percent follows the standard add-on convention',async p=>{
 assert.equal(await calc(p,['5','0','+','1','0','percent','=']),'55');
 assert.equal(await calc(p,['2','0','0','-','1','0','percent','=']),'180');
 assert.equal(await calc(p,['5','0','*','1','0','percent','=']),'5');
 assert.equal(await calc(p,['5','0','percent']),'0.5');
});
test('BF11 ± after an operator negates the next operand, not the first one',async p=>{
 assert.equal(await calc(p,['5','+','sign','3','=']),'2');
 assert.equal(await calc(p,['8','sign']),'-8');
});
test('BF12 profile name must contain visible characters',async p=>{
 await p.evaluate(()=>{Aura.save('profileName','aura');Aura.open('settings');Aura.actions.settingsProfile();});
 await submit(p,{name:'   '});
 assert.equal(await p.evaluate(()=>Aura.load('profileName','')),'aura');
 await submit(p,{name:'  花子 '});assert.equal(await p.evaluate(()=>Aura.load('profileName','')),'花子');
});
test('BF13 calendar rejects identical start and end; overnight end is marked',async p=>{
 await p.evaluate(()=>{Aura.eventModel.replace([]);Aura.open('calendar');Aura.actions.calendarAdd();});
 await submit(p,{title:'同時刻',date:'2026-09-26',time:'15:00',endTime:'15:00',count:'1'});
 assert.equal(await p.evaluate(()=>Aura.eventModel.get().length),0);
 await p.evaluate(()=>{Aura.closeOverlay();Aura.actions.calendarAdd();});
 await submit(p,{title:'夜勤',date:'2026-09-26',time:'22:00',endTime:'02:00',count:'1'});
 assert.equal(await p.evaluate(()=>Aura.eventModel.get().length),1);
 await p.evaluate(()=>Aura.actions.calendarSelect({dataset:{date:'2026-09-26'}}));
 assert.match(await p.locator('.pd-agenda-row time small').first().textContent(),/翌02:00/);
});
test('BF14 calendar repeat count is validated',async p=>{
 await p.evaluate(()=>{Aura.eventModel.replace([]);Aura.open('calendar');Aura.actions.calendarAdd();});
 await p.evaluate(()=>{const f=document.querySelector('#modal-form');f.elements.count.removeAttribute('max');f.elements.count.removeAttribute('min');});
 await submit(p,{title:'繰り返し',date:'2026-09-26',time:'10:00',repeat:'weekly',count:'500'});
 assert.equal(await p.evaluate(()=>Aura.eventModel.get().length),0);
});
test('BF15 over-budget expenses show the excess, not a negative remainder',async p=>{
 await p.evaluate(()=>{const d=new Date(),m=`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`;Aura.save('expenseBudgets',{[m]:{total:1000,categories:{}}});Aura.save('expenses',[{id:'e',kind:'expense',amount:1500,category:'food',date:m+'-01',note:'x'}]);Aura.open('expenses');});
 const text=await p.locator('.ev-budget strong').textContent();
 assert.match(text,/¥500 超過/);assert.doesNotMatch(text,/-/);
});
test('BF16 photos grid stays within the screen at 320px and 390px',async p=>{
 for(const width of [320,390]){
  await p.setViewportSize({width,height:700});await p.evaluate(()=>Aura.open('photos'));await p.waitForTimeout(100);
  const [content,grid]=await p.evaluate(()=>[document.querySelector('#app-screen .app-content').getBoundingClientRect(),document.querySelector('.photo-grid').getBoundingClientRect()].map(r=>[r.left,r.right]));
  assert.ok(grid[0]>=content[0]-.5&&grid[1]<=content[1]+.5,JSON.stringify({width,content,grid}));
 }
});
test('BF17 form labels are programmatically associated with their fields',async p=>{
 await p.evaluate(()=>{Aura.open('clock','alarm');Aura.actions.alarmAdd();});
 assert.equal(await p.getByLabel('時刻').count(),1);
 await p.evaluate(()=>{Aura.closeOverlay();Aura.open('mail');});
 assert.equal(await p.getByLabel('宛先').count(),1);assert.equal(await p.getByLabel('本文').count(),1);
});
test('BF18 saveBatch honours A.save failures and rolls back earlier keys',async p=>{
 const result=await p.evaluate(()=>{Aura.save('a1',1);Aura.save('a2',1);const save=Aura.save;Aura.save=(k,v)=>k==='a2'?false:save(k,v);const ok=Aura.saveBatch({a1:2,a2:2});Aura.save=save;return [ok,Aura.load('a1'),Aura.load('a2')];});
 assert.deepEqual(result,[false,1,1]);
});
test('BF19 failed demo-mail writes do not add mail',async p=>{
 await p.evaluate(()=>{Aura.open('mail');Aura.actions.mailDemo();});
 const before=await p.evaluate(()=>JSON.stringify(Aura.load('mails',null)));
 await p.evaluate(()=>Aura.actions.mailCompose());
 await p.evaluate(()=>{const f=document.querySelector('#mail-compose');f.elements.to.value='a@example.com';f.elements.subject.value='件名';f.elements.body.value='本文';});
 await failKey(p,'mails');await p.evaluate(()=>Aura.actions.mailSave());await restoreSave(p);
 assert.equal(await p.evaluate(()=>JSON.stringify(Aura.load('mails',null))),before);
 assert.equal(await p.locator('#mail-compose').count(),1);
});
test('BF20 compact reminders default is kept; invalid stored value falls back to compact',async p=>{
 await p.evaluate(()=>localStorage.setItem('aura.reminderCompact','"invalid"'));await p.reload();
 await p.evaluate(()=>Aura.open('reminders'));assert.equal(await p.locator('.ev-reminders.rm-compact').count(),1);
});
test('BF21 demo mail search is case-insensitive',async p=>{
 await p.evaluate(()=>{Aura.open('mail');Aura.actions.mailDemo();});
 await p.locator('#mail-search').fill('the slow letter');
 assert.equal(await p.locator('.inbox-row').count(),1);
});

(async()=>{
 const browser=await chromium.launch({headless:true});let passed=0,failed=0;
 const filter=process.env.AURA_TEST_FILTER||'';
 try{
  for(const {name,run} of cases.filter(c=>c.name.includes(filter))){
   const context=await browser.newContext({viewport:{width:390,height:844}}),page=await context.newPage();
   await page.route('**/*',route=>new URL(route.request().url()).origin===new URL(url).origin?route.continue():route.abort());
   try{await page.goto(url);await page.waitForFunction(()=>window.Aura?.apps?.games?.render);await run(page);passed++;console.log('PASS '+name);}
   catch(error){failed++;console.log('FAIL '+name+': '+error.message.split('\n').slice(0,6).join('\n'));}
   finally{await context.close();}
  }
 }finally{await browser.close();}
 console.log(`RESULT: ${passed} passed, ${failed} failed.`);if(failed)process.exitCode=1;
})();
