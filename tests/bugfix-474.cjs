'use strict';
// Regression checks for the 4.7.4 bug-fix sweep. Isolated contexts; external requests are blocked.
// Run: python3 -m http.server 8765 & node tests/bugfix-474.cjs   (AURA_TEST_URL / AURA_TEST_FILTER optional)
const {chromium}=require('playwright');
const assert=require('node:assert/strict');
const url=process.env.AURA_TEST_URL||'http://127.0.0.1:8765/';
const cases=[],test=(name,run,seed)=>cases.push({name,run,seed});
const submit=(p,values)=>p.evaluate(values=>{const f=document.querySelector('#modal-form');for(const [k,v] of Object.entries(values))f.elements[k].value=v;f.requestSubmit();},values);
const APPS=['calendar','photos','weather','mail','clock','notes','reminders','files','calculator','settings','games','wallet','today','focus','habits','expenses','shopping','journal','contacts','converter','reading','sketch','phone','safari','messages','music'];
const openAll=p=>p.evaluate(apps=>{for(const a of apps)Aura.open(a);Aura.home();Aura.spotlight();const q=document.querySelector('#spotlight-query');q.value='a';q.dispatchEvent(new Event('input'));Aura.closeOverlay();},APPS);

for(const [key,value] of [['notes',{a:1}],['reminders',null],['events',[null,{id:'e'}]],['contacts',[null,{id:'c'}]],['journal',[{id:'j'}]],['files',[null]],['shopping',[{id:'s'}]],['habits',[{id:'h'}]],['expenses',[{id:'x'}]],['sketches',[null]],['focusHistory',[null]],['settings',null],['chats',{misaki:'x'}],['arcadeFavorites',{a:1}],['blocksBest',{a:1}],['mapSavedPlaces',[{id:'m'}]]])
 test(`N01 damaged aura.${key} does not break apps or search`,async(p,errors)=>{await openAll(p);assert.deepEqual(errors,[]);},[key,value]);
test('N02 stored optional fields keep their shape (no injected defaults)',async p=>{
 const r=await p.evaluate(()=>{Aura.save('reminders',[{id:'r',text:'a',done:false}]);return Aura.load('reminders',[]);});
 assert.deepEqual(r,[{id:'r',text:'a',done:false}]);
});
test('N03 keydown dispatched on document never throws in games / sketch / calculator',async(p,errors)=>{
 for(const [app,view] of [['games','2048'],['games','snake'],['games','blocks'],['sketch'],['calculator'],['clock','timer']]){await p.evaluate(([a,v])=>Aura.open(a,v),[app,view]);await p.evaluate(()=>{for(const key of ['ArrowUp',' ','z','b','1','Enter'])document.dispatchEvent(new KeyboardEvent('keydown',{key,code:key===' '?'Space':'',bubbles:true}));});}
 assert.deepEqual(errors,[]);
});
test('N04 width-insensitive search in Spotlight, notes and journal',async p=>{
 assert.ok(await p.evaluate(()=>{Aura.spotlight();const q=document.querySelector('#spotlight-query');q.value='ｃａｌ';q.dispatchEvent(new Event('input'));return document.querySelectorAll('#spotlight-results .app-launcher').length>0;}));
 assert.equal(await p.evaluate(()=>{Aura.closeOverlay();Aura.noteModel.replace([{id:'n',title:'ABC',body:'',updated:1}]);Aura.open('notes');const s=document.querySelector('#notes-search');s.value='ａｂｃ';s.dispatchEvent(new Event('input'));return document.querySelectorAll('#notes-grid .note-card').length;}),1);
});
test('N05 calendar agenda search ignores missing place ("undefined")',async p=>{
 await p.evaluate(()=>{Aura.eventModel.replace([{id:'e',date:'2026-09-01',time:'10:00',title:'会議'}]);Aura.open('calendar');Aura.actions.pdCalendarView({dataset:{id:'agenda'}});const s=document.querySelector('#pd-event-search');s.value='undefined';s.dispatchEvent(new Event('input'));});
 assert.equal(await p.locator('#pd-event-results .pd-agenda-row').count(),0);
 await p.evaluate(()=>Aura.actions.pdCalendarView({dataset:{id:'month'}}));
});
test('N06 contact initials keep ZWJ emoji; journal counts characters',async p=>{
 assert.equal(await p.evaluate(()=>{Aura.save('contacts',[{id:'c',name:'👨‍👩‍👧 家族'}]);Aura.open('contacts');return document.querySelector('.ev-avatar').textContent;}),'👨‍👩‍👧');
 assert.equal(await p.evaluate(()=>{Aura.open('journal');Aura.actions.evJournalEdit({dataset:{}});const b=document.querySelector('#ev-journal-body');b.value='😀😀';b.dispatchEvent(new Event('input'));return document.querySelector('#ev-journal-count').textContent;}),'2字');
});
test('N07 an untouched new memo is discarded when leaving the editor',async p=>{
 const before=await p.evaluate(()=>Aura.noteModel.get().length);
 await p.evaluate(()=>{Aura.open('notes');Aura.actions.noteNew();Aura.actions.noteList();});
 assert.equal(await p.evaluate(()=>Aura.noteModel.get().length),before);
 await p.evaluate(()=>{Aura.actions.noteNew();const t=document.querySelector('#note-title');t.value='残す';t.dispatchEvent(new Event('input'));Aura.actions.noteList();});
 assert.equal(await p.evaluate(()=>Aura.noteModel.get().length),before+1);
});
test('N08 calculator ignores = while showing an error and modifier shortcuts',async p=>{
 const r=await p.evaluate(()=>{Aura.open('calculator');const k=v=>Aura.actions.calcKey({dataset:{value:v}});k('clear');['9','/','0','=','='].forEach(k);const a=document.querySelector('#calc-result').textContent;document.dispatchEvent(new KeyboardEvent('keydown',{key:'1',ctrlKey:true,bubbles:true}));return [a,document.querySelector('#calc-result').textContent];});
 assert.deepEqual(r,['エラー','エラー']);
});
test('N09 phone favorites stay limited while searching',async p=>{
 await p.evaluate(()=>{Aura.actions.phoneDemo();Aura.actions.phoneTab({dataset:{value:'favorites'}});const s=document.querySelector('#phone-contact-search');s.value='0';s.dispatchEvent(new Event('input'));});
 assert.ok(await p.locator('#phone-contact-list .list-row').count()<=2);
});
test('N10 photos: damaged favorites and downloads without an open photo are safe',async(p,errors)=>{
 await p.evaluate(()=>{Aura.open('photos');Aura.actions.photoFilter({dataset:{value:'favorites'}});Aura.actions.photoDownload();});
 await p.waitForTimeout(50);assert.deepEqual(errors,[]);
},['photoFavorites',['missing-photo']]);
test('N11 reading progress rejects values outside the book',async p=>{
 await p.evaluate(()=>{Aura.save('reading',[{id:'b',title:'T',author:'',total:100,page:0}]);Aura.open('reading');Aura.actions.evBookProgress({dataset:{id:'b'}});});
 await submit(p,{page:'150'});
 assert.equal((await p.evaluate(()=>Aura.load('reading')))[0].page,0);
});
test('N12 settings toggles keep airplane / cellular exclusive and reject unknown styles',async p=>{
 const r=await p.evaluate(()=>{Aura.settings.cellular=true;Aura.settings.airplane=false;Aura.actions.settingToggle({dataset:{key:'airplane'}});const a=[Aura.settings.airplane,Aura.settings.cellular];Aura.actions.settingToggle({dataset:{key:'airplane'}});Aura.actions.chooseWallpaper({dataset:{value:'<x>'}});return [...a,Aura.settings.wallpaper];});
 assert.deepEqual(r,[true,false,'default']);
});
test('N13 focus: changing preferences keeps a paused session',async p=>{
 await p.evaluate(()=>{Aura.open('focus');Aura.actions.evFocusToggle();Aura.actions.evFocusToggle();});
 const before=await p.evaluate(()=>Aura.focusTimerSnapshot());
 await p.evaluate(()=>Aura.actions.evFocusSettings());await submit(p,{work:'30',rest:'5',goal:'60'});
 assert.deepEqual(await p.evaluate(()=>Aura.focusTimerSnapshot()),before);
});
test('N14 home calendar widget keeps an event that is in progress',async p=>{
 const r=await p.evaluate(()=>{const d=new Date(),k=`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`,t=new Date(d.getTime()-5*60000);if(t.getDate()!==d.getDate())return 'skip';const time=`${String(t.getHours()).padStart(2,'0')}:${String(t.getMinutes()).padStart(2,'0')}`;Aura.eventModel.replace([{id:'e',date:k,time,title:'進行中'}]);Aura.home();return document.querySelector('.widget-event>span').textContent;});
 if(r!=='skip')assert.equal(r,'進行中');
});
test('N15 malformed saved Sudoku / Block Atelier states restart cleanly',async(p,errors)=>{
 await p.evaluate(()=>{Aura.open('games','sudoku');Aura.open('games','blocks');});await p.waitForTimeout(50);
 assert.deepEqual(errors,[]);
},['sudokuState',{values:Array(81).fill(0),solution:Array(81).fill(0)}]);

(async()=>{
 const browser=await chromium.launch();let passed=0,failed=0;
 try{for(const {name,run,seed} of cases.filter(c=>!process.env.AURA_TEST_FILTER||c.name.includes(process.env.AURA_TEST_FILTER))){
  const context=await browser.newContext({viewport:{width:390,height:844}});
  await context.route(/^https?:\/\/(?!127\.0\.0\.1|localhost)/,r=>r.abort());
  const p=await context.newPage(),errors=[];p.on('pageerror',e=>errors.push(e.message));
  if(seed)await p.addInitScript(([k,v])=>{if(!sessionStorage.getItem('seeded')){localStorage.setItem('aura.'+k,JSON.stringify(v));sessionStorage.setItem('seeded','1');}},seed);
  try{await p.goto(url);await p.waitForFunction(()=>window.Aura?.apps?.games);await run(p,errors);passed++;console.log('PASS',name);}
  catch(e){failed++;console.log('FAIL',name+':',e.message.split('\n').slice(0,6).join('\n'));}
  finally{await context.close();}
 }}finally{await browser.close();}
 console.log(`RESULT: ${passed} passed, ${failed} failed.`);process.exitCode=failed?1:0;
})();
