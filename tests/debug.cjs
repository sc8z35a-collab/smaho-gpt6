// Isolated edge-case regressions. AURA_TEST_URL defaults to localhost:8765.
const {chromium}=require('playwright');
const assert=require('node:assert/strict');
const url=process.env.AURA_TEST_URL||'http://127.0.0.1:8765/';
const cases=[],test=(name,run)=>cases.push({name,run});
const act=(p,name,id)=>p.evaluate(({name,id})=>Aura.actions[name]({dataset:{id}}),{name,id});
const open=(p,id,arg)=>p.evaluate(({id,arg})=>Aura.open(id,arg),{id,arg});
const seed=(p,key,value)=>p.evaluate(({key,value})=>Aura.save(key,value),{key,value});
const load=(p,key)=>p.evaluate(key=>Aura.load(key,null),key);
const submit=(p,values)=>p.evaluate(values=>{const f=document.querySelector('#modal-form');for(const [key,value] of Object.entries(values))f.elements[key].value=value;f.requestSubmit();},values);
const confirm=p=>p.locator('#confirm-yes').click();
const failWrites=(p,key)=>p.evaluate(key=>{const save=Aura.save;Aura.save=(k,v)=>k===key?false:save(k,v);},key);

test('B01 checklist state uses leading marker, not body text',async p=>{
 await p.evaluate(()=>Aura.noteModel.replace([{id:'n',title:'Checklist',body:'☐ Read about ☑ marks',updated:1}]));
 await open(p,'notes');await act(p,'noteOpen','n');await act(p,'pdNotePreview');
 assert.equal(await p.locator('.pd-checkline').getAttribute('aria-pressed'),'false');
});
test('B02 file version restores its original filename',async p=>{
 await p.evaluate(()=>Aura.fileModel.replace([{id:'f',name:'new.txt',content:'new',date:2}]));
 await seed(p,'fileVersions',[{id:'v',fileId:'f',name:'old.md',content:'old',date:1}]);
 await open(p,'files');await act(p,'fileOpen','f');await act(p,'pdFileRestore','v');await confirm(p);
 assert.equal((await load(p,'files'))[0].name,'old.md');
});
test('B03 failed file edit does not consume version history',async p=>{
 await p.evaluate(()=>Aura.fileModel.replace([{id:'f',name:'a.txt',content:'old',date:1}]));
 await seed(p,'fileVersions',[]);await open(p,'files');await act(p,'fileOpen','f');await act(p,'fileEdit');
 await failWrites(p,'files');await submit(p,{content:'new'});
 assert.deepEqual(await load(p,'fileVersions'),[]);assert.equal((await load(p,'files'))[0].content,'old');
});
test('B04 failed version restore preserves history',async p=>{
 await p.evaluate(()=>Aura.fileModel.replace([{id:'f',name:'a.txt',content:'new',date:2}]));
 const history=[{id:'v',fileId:'f',name:'a.txt',content:'old',date:1}];await seed(p,'fileVersions',history);
 await open(p,'files');await act(p,'fileOpen','f');await failWrites(p,'files');await act(p,'pdFileRestore','v');await confirm(p);
 assert.deepEqual(await load(p,'fileVersions'),history);
});
test('B05 shopping list names cannot escape select options',async p=>{
 await seed(p,'shoppingLists',[{id:'list',name:'</option></select><img id="injected" src="x">'}]);
 await open(p,'shopping');await act(p,'evShoppingEdit');assert.equal(await p.locator('#injected').count(),0);
 assert.ok((await p.locator('#ev-listId option').allTextContents()).includes('</option></select><img id="injected" src="x">'));
});
test('B06 recurring expense identity is retained in first write',async p=>{
 await seed(p,'expenses',[{id:'e',kind:'expense',amount:10,category:'fixed',note:'Rent',date:'2026-09-20',recurringId:'r'}]);
 await open(p,'expenses');await act(p,'evExpenseEdit','e');
 await p.evaluate(()=>{const save=Aura.save;let writes=0;Aura.save=(k,v)=>k==='expenses'&&++writes>1?false:save(k,v);});
 await submit(p,{note:'Updated rent'});assert.equal((await load(p,'expenses'))[0].recurringId,'r');
});
test('B07 clearing an existing journal persists cleared text',async p=>{
 await seed(p,'journal',[{id:'j',date:'2026-09-20',mood:'3',title:'',body:'Private text'}]);
 await open(p,'journal');await act(p,'evJournalEdit','j');await p.locator('#ev-journal-body').fill('');
 assert.equal((await load(p,'journal'))[0].body,'');
});
test('B08 contact validation counts normalized phone digits',async p=>{
 await seed(p,'contacts',[]);await open(p,'contacts');await act(p,'evContactEdit');await submit(p,{name:'Test',phone:'---'});
 assert.deepEqual(await load(p,'contacts'),[]);assert.equal(await p.locator('#modal-form').count(),1);
});
test('B09 focus presets unlock after returning and pausing',async p=>{
 await open(p,'focus');await act(p,'evFocusToggle');await open(p,'notes');await open(p,'focus');await act(p,'evFocusToggle');
 assert.equal(await p.locator('[data-action="evFocusDuration"]:disabled').count(),0);
});
test('B10 focus completion refreshes daily goal and history',async p=>{
 await seed(p,'focusHistory',[]);await seed(p,'focusSession',{id:'finish',mode:'work',duration:60,remaining:60,end:Date.now()+2000,label:'Regression focus'});
 await p.reload({waitUntil:'domcontentloaded'});await open(p,'focus');await p.waitForTimeout(3000);
 assert.ok((await p.locator('.ev-daily-goal strong').innerText()).startsWith('1 /'));
 assert.ok((await p.locator('.ev-focus .ev-card').last().innerText()).includes('Regression focus'));
});
test('B11 focus start rolls back on persistence failure',async p=>{
 await open(p,'focus');await failWrites(p,'focusSession');await act(p,'evFocusToggle');
 assert.equal(await p.locator('#ev-focus-toggle').innerText(),'開始');
});
test('B12 sketch undo cannot operate behind an open modal',async p=>{
 await seed(p,'sketches',[{id:'s',title:'Sketch',updated:1,strokes:[{color:'#000000',width:4,points:[[10,10],[20,20]]}]}]);
 await open(p,'sketch');await act(p,'evSketchOpen','s');await act(p,'evSketchMenu');await p.keyboard.press('Control+z');
 assert.equal((await load(p,'sketches'))[0].strokes.length,1);
});
test('B13 location erasure removes saved cities and map coordinates',async p=>{
 await seed(p,'weatherFavorites',[{name:'Secret',latitude:1,longitude:2}]);await seed(p,'mapSavedPlaces',[{id:'secret',latitude:1,longitude:2}]);
 await act(p,'forgetLocation');await confirm(p);await p.waitForTimeout(400);
 assert.equal(await load(p,'weatherFavorites'),null);assert.equal(await load(p,'mapSavedPlaces'),null);
});
test('B14 clipboard permission rejection falls back to text download',async p=>{
 const result=await p.evaluate(async()=>{Object.defineProperty(navigator,'share',{configurable:true,value:undefined});Object.defineProperty(navigator,'clipboard',{configurable:true,value:{writeText:async()=>{throw new DOMException('Denied','NotAllowedError');}}});let downloaded=null;Aura.download=blob=>{downloaded=blob;};await Aura.network.share('Title','Body');return downloaded?await downloaded.text():null;});
 assert.equal(result,'Title\nBody');
});
test('B15 email draft save does not submit handoff form',async p=>{
 await open(p,'mail');await p.locator('#external-mail [name=to]').fill('test@example.com');await p.locator('[data-action=saveExternalDraft]').click();
 assert.equal(await p.locator('#mail-handoff').innerText(),'');assert.equal((await load(p,'externalMailDraft')).to,'test@example.com');
});
test('B16 fresh calculator entry clears repeat-equals operation',async p=>{
 await open(p,'calculator');await p.evaluate(()=>{for(const value of ['clear','2','+','3','=','7','='])Aura.actions.calcKey({dataset:{value}});});
 assert.equal(await p.locator('#calc-result').innerText(),'7');
});
test('B17 calculator backspace after error recovers to zero',async p=>{
 await open(p,'calculator');await p.evaluate(()=>{for(const value of ['clear','5','/','0','='])Aura.actions.calcKey({dataset:{value}});});await p.keyboard.press('Backspace');
 assert.equal(await p.locator('#calc-result').innerText(),'0');
});
test('B18 stopwatch laps measure intervals, not cumulative time',async p=>{
 const laps=await p.evaluate(()=>{Aura.open('clock');Aura.actions.clockTab({dataset:{value:'stopwatch'}});const now=Date.now;let t=100000;Date.now=()=>t;Aura.actions.stopwatchToggle();t+=1000;Aura.actions.stopwatchLap();t+=2000;Aura.actions.stopwatchLap();Date.now=now;return [...document.querySelectorAll('.lap-row')].map(x=>x.lastElementChild.textContent);});
 assert.deepEqual(laps,['00:02.00','00:01.00']);
});
test('B19 photo deletion removes dangling favorites',async p=>{
 await p.evaluate(()=>Aura.storePhoto('data:image/png;base64,iVBORw0KGgo=','Photo'));const id=(await load(p,'photos'))[0].id;
 await open(p,'photos');await act(p,'photoOpen',id);await act(p,'photoFavorite');await act(p,'photoDelete');await confirm(p);
 assert.deepEqual(await load(p,'photoFavorites'),[]);
});
test('B20 photo navigation stays in selected album',async p=>{
 await open(p,'photos');await act(p,'photoOpen','sample-lake');await act(p,'photoFavorite');
 await p.evaluate(()=>Aura.actions.photoFilter({dataset:{value:'favorites'}}));await act(p,'photoOpen','sample-lake');await act(p,'photoNext');
 assert.equal(await p.locator('.photo-viewer img').getAttribute('alt'),'静かな湖');
});
test('B21 failed photo deletion preserves runtime photo',async p=>{
 await p.evaluate(()=>Aura.storePhoto('data:image/png;base64,iVBORw0KGgo=','Keep'));const id=(await load(p,'photos'))[0].id;
 await open(p,'photos');await act(p,'photoOpen',id);await failWrites(p,'photos');await act(p,'photoDelete');await confirm(p);await open(p,'photos');
 assert.equal(await p.locator(`[data-action=photoOpen][data-id="${id}"]`).count(),1);
});
test('B22 recorder constructor failure releases microphone',async p=>{
 const stopped=await p.evaluate(async()=>{Aura.open('recorder');let stopped=0;Object.defineProperty(navigator,'mediaDevices',{configurable:true,value:{getUserMedia:async()=>({getTracks:()=>[{stop:()=>stopped++}]})}});window.MediaRecorder=class{constructor(){throw Error('unsupported codec');}};await Aura.actions.recordToggle();return stopped;});
 assert.equal(stopped,1);
});
test('B23 replaying daily Sudoku does not inflate wins',async p=>{
 const wins=await p.evaluate(()=>{Aura.open('games','sudoku');const solve=()=>{const s=Aura.load('sudokuState',{});s.solution.forEach((v,i)=>{if(!s.givens[i]){Aura.actions.sudokuSelect({dataset:{index:String(i)}});Aura.actions.sudokuNumber({dataset:{value:String(v)}});}});};for(let i=0;i<2;i++){Aura.actions.sudokuDaily();document.querySelector('#confirm-yes').click();solve();}return Aura.load('sudokuWins',0);});
 assert.equal(wins,1);
});
test('B24 Sudoku hint on correct cell does not spend a hint',async p=>{
 const result=await p.evaluate(()=>{Aura.open('games','sudoku');const s=Aura.load('sudokuState',{}),i=s.givens.findIndex(x=>!x);Aura.actions.sudokuSelect({dataset:{index:String(i)}});Aura.actions.sudokuNumber({dataset:{value:String(s.solution[i])}});Aura.actions.sudokuHint();return Aura.load('sudokuState',{}).hints;});assert.equal(result,3);
});
test('B25 Sudoku pencil on filled cell has no phantom undo',async p=>{
 const value=await p.evaluate(()=>{Aura.open('games','sudoku');const s=Aura.load('sudokuState',{}),i=s.givens.findIndex(x=>!x);Aura.actions.sudokuSelect({dataset:{index:String(i)}});Aura.actions.sudokuNumber({dataset:{value:String(s.solution[i])}});Aura.actions.sudokuPencil();Aura.actions.sudokuNumber({dataset:{value:'1'}});Aura.actions.sudokuUndo();return Aura.load('sudokuState',{}).values[i];});assert.equal(value,0);
});
test('B26 H shortcut does not interrupt select editing',async p=>{
 await open(p,'converter');await p.locator('#ev-from').focus();await p.keyboard.press('h');assert.equal(await p.evaluate(()=>Aura.current),'converter');
});
test('B27 failed photo favorite save preserves displayed state',async p=>{
 await open(p,'photos');await act(p,'photoOpen','sample-lake');await failWrites(p,'photoFavorites');await act(p,'photoFavorite');
 assert.equal(await p.locator('[data-action=photoFavorite]').getAttribute('aria-pressed'),'false');
});
test('B28 profile save retains enhanced settings controls',async p=>{
 await open(p,'settings');await act(p,'settingsProfile');await submit(p,{name:'Debugger'});
 assert.equal(await p.locator('[data-action=pdDataExport]').count(),1);assert.equal(await p.locator('[data-action=pdStorage]').count(),1);
});

(async()=>{
 const browser=await chromium.launch({headless:true});let passed=0;const failures=[];
 try{for(const {name,run} of cases){const context=await browser.newContext({viewport:{width:390,height:844}}),p=await context.newPage();
  await p.route('**/*',route=>route.request().url().startsWith(url)?route.continue():route.abort());
  try{await p.goto(url,{waitUntil:'domcontentloaded'});await p.waitForFunction(()=>!!window.Aura?.actions.pdStorage);await run(p);passed++;console.log('PASS '+name);}
  catch(error){failures.push(name+': '+error.message);console.error('FAIL '+name+': '+error.message);}
  finally{await context.close();}
 }}finally{await browser.close();}
 console.log(`RESULT: ${passed} passed, ${failures.length} failed.`);if(failures.length)process.exitCode=1;
})().catch(error=>{console.error(error);process.exitCode=1;});
