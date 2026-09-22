'use strict';
// Run with a local HTTP server; use an isolated browser context, never user storage.
const {chromium}=require('playwright');
const assert=require('node:assert/strict');
(async()=>{
 const browser=await chromium.launch({headless:true});
 const context=await browser.newContext({viewport:{width:390,height:844}});
 const page=await context.newPage(),errors=[];
 const url=process.env.AURA_TEST_URL||'http://127.0.0.1:8765/';
 let count=0;
 const pass=name=>{count++;console.log('PASS '+name);};
 const section=action=>page.evaluate(action=>{Aura.open('settings');Aura.actions[action]();},action);
 const select=(key,value)=>page.locator(`[data-st-select="${key}"]`).selectOption(value);
 const toggle=key=>page.locator(`[data-action="stToggle"][data-key="${key}"]`).click();
 const preferences={lineSpacing:'wide',letterSpacing:'wide',underlineLinks:true,largeControls:true,homeColumns:'3',hideBadges:true,hideSearch:true,dateStyle:'year',hapticDuration:'long',keyboardShortcuts:false};
 page.on('pageerror',e=>errors.push(e.message));
 await page.route('**/*',route=>new URL(route.request().url()).origin===new URL(url).origin?route.continue():route.abort());
 try{
  await page.goto(url);
  await page.evaluate(()=>{Aura.save('notes',[{id:'settings-keep',title:'保持',body:'消さない',updated:Date.now()}]);Aura.settings.wallpaper='forest';Aura.applySettings();});
  const order=await page.evaluate(()=>Aura.load('homeOrder',[]));
  await section('settingsHome');
  for(const term of ['行間','文字間隔','下線','タップ領域','キーボード','列数','バッジ','検索ボタン','日付','振動の長さ']){
   await page.locator('#st-search').fill(term);
   assert.equal(await page.locator('#st-results .list-row').count(),1,term);
  }
  await page.locator('#st-search').fill('');pass('all ten preferences are searchable');

  await section('stAccessibility');await select('lineSpacing','wide');await select('letterSpacing','wide');
  const style=await page.locator('.st-preview p').evaluate(el=>{const s=getComputedStyle(el);return [parseFloat(s.lineHeight)/parseFloat(s.fontSize),parseFloat(s.letterSpacing)];});
  assert.ok(Math.abs(style[0]-2.4)<.01);assert.ok(style[1]>0);
  await toggle('underlineLinks');await toggle('largeControls');
  assert.ok(await page.locator('.app-nav button').first().evaluate(el=>el.getBoundingClientRect().height>=48));
  await page.evaluate(()=>{const a=document.createElement('a');a.href='#';a.textContent='リンク';a.id='test-link';document.querySelector('.st-preview').append(a);});
  assert.match(await page.locator('#test-link').evaluate(el=>getComputedStyle(el).textDecorationLine),/underline/);
  pass('spacing, underline and touch targets affect computed CSS');

  await toggle('keyboardShortcuts');await page.locator('.app-nav button').first().focus();await page.keyboard.press('h');
  assert.equal(await page.evaluate(()=>Aura.current),'settings');
  await page.evaluate(()=>document.body.dispatchEvent(new KeyboardEvent('keydown',{key:'Tab',altKey:true,bubbles:true})));
  assert.equal(await page.locator('#overlay').isVisible(),false);
  await page.keyboard.press('Escape');assert.equal(await page.evaluate(()=>Aura.current),null);
  await section('stAccessibility');await toggle('keyboardShortcuts');
  await page.locator('.app-nav button').first().focus();await page.keyboard.press('h');assert.equal(await page.evaluate(()=>Aura.current),null);
  await section('settingsHome');await page.locator('#st-search').fill('h');await page.keyboard.press('h');assert.equal(await page.evaluate(()=>Aura.current),'settings');
  await page.locator('#st-search').fill('');await section('stAccessibility');await toggle('keyboardShortcuts');
  pass('home shortcuts respect opt-out and inputs; Escape remains available');

  await section('stHome');await select('homeColumns','3');await toggle('hideBadges');await toggle('hideSearch');await select('dateStyle','year');
  await page.evaluate(()=>Aura.home());
  assert.equal(await page.locator('#app-grid').evaluate(el=>getComputedStyle(el).gridTemplateColumns.split(' ').length),3);
  assert.equal(await page.locator('#app-grid .app-launcher').count(),26);assert.equal(await page.locator('#home-dock .app-launcher').count(),4);
  assert.equal(await page.locator('#home-search').isVisible(),false);
  await page.evaluate(()=>document.querySelector('#home-dock .app-launcher').insertAdjacentHTML('beforeend','<span class="app-badge" id="test-badge">3</span>'));
  assert.equal(await page.locator('#test-badge').isVisible(),false);
  assert.deepEqual(await page.evaluate(()=>Aura.load('homeOrder',[])),order);
  pass('home layout and visibility preserve all apps, order and dock');

  await page.waitForTimeout(1200);
  const dates=await page.evaluate(()=>[document.querySelector('#home-date').textContent,document.querySelector('#lock-date').textContent,new Date().toLocaleDateString('ja-JP',{year:'numeric',month:'long',day:'numeric',weekday:'long'})]);
  assert.equal(dates[0],dates[2]);assert.equal(dates[1],dates[2]);
  await section('stHome');await select('dateStyle','short');
  assert.equal(await page.locator('#home-date').textContent(),await page.evaluate(()=>new Date().toLocaleDateString('ja-JP',{month:'numeric',day:'numeric'})));
  await select('dateStyle','year');pass('date formats survive live clock ticks');

  await section('stSound');await select('hapticDuration','long');
  const vibrations=await page.evaluate(()=>{
   const vibrate=Object.getOwnPropertyDescriptor(navigator,'vibrate'),activation=Object.getOwnPropertyDescriptor(navigator,'userActivation'),calls=[];
   try{Object.defineProperty(navigator,'vibrate',{configurable:true,value:n=>calls.push(n)});Object.defineProperty(navigator,'userActivation',{configurable:true,value:{hasBeenActive:true}});Aura.haptic();Aura.settings.sound=false;Aura.haptic();Aura.settings.sound=true;return calls;}
   finally{if(vibrate)Object.defineProperty(navigator,'vibrate',vibrate);else delete navigator.vibrate;if(activation)Object.defineProperty(navigator,'userActivation',activation);else delete navigator.userActivation;}
  });
  assert.deepEqual(vibrations,[25]);pass('haptic duration respects feedback switch (mocked vibration)');

  await page.reload();
  for(const [key,value] of Object.entries(preferences))assert.equal(await page.evaluate(key=>Aura.settings[key],key),value,key);
  assert.equal(await page.evaluate(()=>Aura.load('notes',[])[0].id),'settings-keep');
  pass('all ten preferences survive reload and preserve notes');

  await section('stAccessibility');await page.evaluate(()=>{window.originalSave=Aura.save;Aura.save=()=>false;});
  await select('lineSpacing','relaxed');assert.equal(await page.locator('[data-st-select=lineSpacing]').inputValue(),'wide');
  await toggle('largeControls');assert.equal(await page.locator('[data-key=largeControls]').getAttribute('aria-pressed'),'true');
  await page.evaluate(()=>{Aura.save=window.originalSave;delete window.originalSave;Aura.actions.stToggle({dataset:{key:'homeColumns'}});});
  assert.equal(await page.evaluate(()=>Aura.settings.homeColumns),'3');
  pass('failed writes restore controls; enum values cannot be toggled');

  for(const viewport of [{width:320,height:640},{width:390,height:844},{width:844,height:390}]){
   await page.setViewportSize(viewport);
   for(const dark of [false,true]){
    await page.evaluate(dark=>{Aura.settings.dark=dark;Aura.settings.textSize='largest';Aura.applySettings();},dark);
    for(const action of ['stAccessibility','stHome','stSound']){
     await section(action);
     assert.ok(await page.locator('.st-settings').evaluate(el=>el.scrollWidth<=el.clientWidth+1),`${action} overflow at ${viewport.width}`);
     assert.deepEqual(await page.locator('.st-settings [data-action]').evaluateAll(els=>els.filter(el=>!Aura.actions[el.dataset.action]).map(el=>el.dataset.action)),[]);
    }
   }
  }
  pass('320px, 390px and landscape layouts support dark mode and large text');

  await page.evaluate(()=>{Object.assign(Aura.settings,{lineSpacing:'bad',letterSpacing:null,homeColumns:99,dateStyle:'bad',hapticDuration:-1,largeControls:'true',keyboardShortcuts:'false'});Aura.save('settings',Aura.settings);});
  await page.reload();
  assert.deepEqual(await page.evaluate(()=>[Aura.settings.lineSpacing,Aura.settings.letterSpacing,Aura.settings.homeColumns,Aura.settings.dateStyle,Aura.settings.hapticDuration,Aura.settings.largeControls,Aura.settings.keyboardShortcuts]),['standard','standard','4','long','short',false,true]);
  pass('invalid persisted values safely fall back');

  await section('stConnection');await toggle('airplane');await toggle('cellular');
  assert.deepEqual(await page.evaluate(()=>[Aura.settings.airplane,Aura.settings.cellular]),[false,true]);
  await page.evaluate(()=>Aura.actions.stReset());await page.locator('#confirm-yes').click();
  assert.deepEqual(await page.evaluate(()=>[Aura.settings.homeColumns,Aura.settings.hideSearch,Aura.settings.hideBadges,Aura.settings.underlineLinks,Aura.settings.wallpaper]),['4',false,false,false,'forest']);
  assert.equal(await page.evaluate(()=>Aura.load('notes',[])[0].id),'settings-keep');
  pass('reset preserves records and wallpaper; communication demo stays consistent');
  assert.deepEqual(errors,[]);pass('no uncaught browser errors');
  console.log(`RESULT: ${count} passed, 0 failed.`);
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
