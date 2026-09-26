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
 assert.ok((await p.locator('#ep-listId option').allTextContents()).includes('</option></select><img id="injected" src="x">'));
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
 await open(p,'converter');await p.locator('#ep-unit-from').focus();await p.keyboard.press('h');assert.equal(await p.evaluate(()=>Aura.current),'converter');
});
test('B27 failed photo favorite save preserves displayed state',async p=>{
 await open(p,'photos');await act(p,'photoOpen','sample-lake');await failWrites(p,'photoFavorites');await act(p,'photoFavorite');
 assert.equal(await p.locator('[data-action=photoFavorite]').getAttribute('aria-pressed'),'false');
});
test('B28 profile save retains enhanced settings controls',async p=>{
 await open(p,'settings');await act(p,'settingsProfile');await submit(p,{name:'Debugger'});
 assert.equal(await p.locator('[data-action=pdDataExport]').count(),1);assert.equal(await p.locator('[data-action=pdStorage]').count(),1);
});

// Sketch Studio: real pointer, pixel, import/export and recovery contracts.
const skDoc=async p=>(await load(p,'sketches'))[0];
const skNew=async p=>{await open(p,'sketch');await act(p,'evSketchNew');};
const skTool=(p,id)=>act(p,'evSketchTool',id);
const skRange=(p,id,value)=>p.locator(id).evaluate((el,value)=>{el.value=value;el.dispatchEvent(new Event('input',{bubbles:true}));},String(value));
const skOption=(p,id,value)=>p.locator(id).evaluate((el,value)=>{el.checked=value;el.dispatchEvent(new Event('change',{bubbles:true}));},value);
async function skDraw(p,from=[100,100],to=[350,250]){
 await p.locator('#ev-canvas').scrollIntoViewIfNeeded();const b=await p.locator('#ev-canvas').boundingBox();
 await p.mouse.move(b.x+from[0]*b.width/800,b.y+from[1]*b.height/800);await p.mouse.down();
 if(to)await p.mouse.move(b.x+to[0]*b.width/800,b.y+to[1]*b.height/800,{steps:12});await p.mouse.up();
}
const skPixel=(p,x,y)=>p.locator('#ev-canvas').evaluate((c,[x,y])=>[...c.getContext('2d').getImageData(x,y,1,1).data],[x,y]);
const skCapture=p=>p.evaluate(()=>{window.skDownloads=[];Aura.download=(blob,name)=>window.skDownloads.push({blob,name});});
const skUpload=async(p,data)=>{await act(p,'evSketchImport');await p.locator('#sk-import').setInputFiles({name:'drawing.json',mimeType:'application/json',buffer:Buffer.from(typeof data==='string'?data:JSON.stringify(data))});};
test('SK01 drawing tools and atomic undo redo',async p=>{
 await skNew(p);assert.equal(await p.locator('[data-action=evSketchTool]').count(),14);
 for(const tool of ['pen','pencil','marker','erase','line','arrow','rect','ellipse','triangle','star']){await skTool(p,tool);await skDraw(p);assert.equal((await skDoc(p)).strokes.at(-1).tool,tool);}
 assert.equal((await skDoc(p)).strokes.length,10);await act(p,'evSketchUndo');assert.equal((await skDoc(p)).strokes.length,9);await act(p,'evSketchRedo');assert.equal((await skDoc(p)).strokes.length,10);
 await act(p,'evSketchUndo');await skTool(p,'pen');await skDraw(p,[80,80],null);assert.equal(await p.locator('[data-action=evSketchRedo]').isDisabled(),true);
});
test('SK02 legacy migration and reload preserve points and eraser semantics',async p=>{
 const points=[[10,10],[25,26],[30,45]];await seed(p,'sketches',[{id:'old',title:'旧作品',updated:1,tone:'dark',paper:'grid',strokes:[{color:'#ffffff',width:4,points},{tool:'erase',width:10,points:[[200,200],[230,230]]}]}]);
 await open(p,'sketch');await act(p,'evSketchOpen','old');await skTool(p,'pen');await skDraw(p);let d=await skDoc(p);assert.deepEqual(d.strokes[0].points,points);assert.equal(d.strokes[1].legacyErase,true);assert.equal(d.layers.length,1);
 await p.reload();await open(p,'sketch');await act(p,'evSketchOpen','old');d=await skDoc(p);assert.deepEqual(d.strokes[0].points,points);assert.equal(d.tone,'dark');
});
test('SK03 fill symmetry snap opacity and eyedropper pixels',async p=>{
 await skNew(p);await skTool(p,'rect');await act(p,'evPenColor','#e96c58');await skOption(p,'#sk-fill',true);await skOption(p,'#sk-symmetry',true);await skOption(p,'#sk-snap',true);await skDraw(p,[103,103],[203,203]);
 const s=(await skDoc(p)).strokes[0];assert.equal(s.fill,true);assert.equal(s.symmetry,true);assert.deepEqual(s.points,[[100,100],[200,200]]);assert.deepEqual(await skPixel(p,150,150),[233,108,88,255]);assert.deepEqual(await skPixel(p,650,150),[233,108,88,255]);
 await skTool(p,'picker');await skDraw(p,[150,150],null);assert.equal(await p.locator('#ev-pen-custom').inputValue(),'#e96c58');assert.equal((await skDoc(p)).strokes.length,1);
 await skRange(p,'#sk-opacity',25);await skTool(p,'line');await skDraw(p,[50,50],[300,50]);assert.equal((await skDoc(p)).strokes[1].opacity,.25);
});
test('SK04 upper-layer eraser reveals lower layer and locks block edits',async p=>{
 await skNew(p);await skTool(p,'rect');await skOption(p,'#sk-fill',true);await act(p,'evPenColor','#e96c58');await skDraw(p,[100,100],[400,400]);await act(p,'evSketchLayerAdd');const layer=(await skDoc(p)).activeLayer;
 await act(p,'evPenColor','#6f91b6');await skDraw(p,[100,100],[400,400]);assert.deepEqual(await skPixel(p,200,200),[111,145,182,255]);
 await skTool(p,'erase');await skRange(p,'#ev-pen-width',80);await skDraw(p,[200,200],null);assert.deepEqual(await skPixel(p,200,200),[233,108,88,255]);
 await act(p,'evSketchLayerLock',layer);const count=(await skDoc(p)).strokes.length;await skDraw(p);assert.equal((await skDoc(p)).strokes.length,count);
 await act(p,'evSketchLayerVisible',layer);assert.deepEqual(await skPixel(p,300,300),[233,108,88,255]);await act(p,'evSketchUndo');assert.deepEqual(await skPixel(p,300,300),[111,145,182,255]);
});
test('SK05 layer order copy settings deletion and count limits',async p=>{
 await skNew(p);await skTool(p,'pen');await skDraw(p);await act(p,'evSketchLayerCopy');let d=await skDoc(p);assert.equal(d.layers.length,2);assert.equal(d.strokes.length,2);const copy=d.activeLayer;
 await act(p,'evSketchLayerDown');assert.equal((await skDoc(p)).layers[0].id,copy);await act(p,'evSketchLayerUp');assert.equal((await skDoc(p)).layers[1].id,copy);
 await act(p,'evSketchLayerEdit',copy);await submit(p,{name:'仕上げ',opacity:35});assert.equal((await skDoc(p)).layers[1].opacity,.35);
 await act(p,'evSketchLayerDelete');await confirm(p);assert.equal((await skDoc(p)).layers.length,1);await act(p,'evSketchUndo');assert.equal((await skDoc(p)).layers.length,2);
 for(let i=0;i<8;i++)await act(p,'evSketchLayerAdd');assert.equal((await skDoc(p)).layers.length,8);assert.equal(await p.locator('#sk-layer-count').innerText(),'8 / 8');
});
test('SK06 selection move copy deletion and undo',async p=>{
 await skNew(p);await skTool(p,'rect');await skDraw(p,[100,100],[250,250]);await skTool(p,'select');await skDraw(p,[150,150],[210,190]);const d=await skDoc(p);assert.ok(Math.abs(d.strokes[0].dx-60)<2);assert.ok(Math.abs(d.strokes[0].dy-40)<2);
 await act(p,'evSketchObjectCopy');assert.equal((await skDoc(p)).strokes.length,2);await skDraw(p,[210,200],null);await p.keyboard.press('Delete');assert.equal((await skDoc(p)).strokes.length,1);await act(p,'evSketchUndo');assert.equal((await skDoc(p)).strokes.length,2);
});
test('SK07 multiline text stays editable and cannot inject HTML',async p=>{
 await skNew(p);await skTool(p,'text');await skDraw(p,[100,100],null);await submit(p,{text:'Hello\n<img src=x onerror=alert(1)>',fontSize:32});assert.equal((await skDoc(p)).strokes[0].tool,'text');assert.equal(await p.locator('.ev-sketch img').count(),0);
 await skTool(p,'select');await skDraw(p,[110,110],null);await act(p,'evSketchTextEdit');await submit(p,{text:'変更\n二行目',fontSize:40});assert.equal((await skDoc(p)).strokes[0].text,'変更\n二行目');await act(p,'evSketchUndo');assert.equal((await skDoc(p)).strokes[0].fontSize,32);
});
test('SK08 paper and clear are undoable transactions',async p=>{
 await skNew(p);await skTool(p,'pen');await skDraw(p);await skDraw(p,[300,300],[400,400]);await act(p,'evSketchPaper');await submit(p,{paper:'ruled',tone:'dark'});assert.equal((await skDoc(p)).paper,'ruled');await act(p,'evSketchUndo');assert.equal((await skDoc(p)).paper,'plain');
 await act(p,'evSketchClear');await confirm(p);assert.equal((await skDoc(p)).strokes.length,0);await act(p,'evSketchUndo');assert.equal((await skDoc(p)).strokes.length,2);await act(p,'evSketchRedo');assert.equal((await skDoc(p)).strokes.length,0);
});
test('SK09 gallery thumbnails search favorites sorting and copies',async p=>{
 await skNew(p);await p.locator('#ev-sketch-title').fill('Zebra');await skTool(p,'pen');await skDraw(p);await act(p,'evSketchFavorite');await act(p,'evSketchDuplicate');assert.equal((await load(p,'sketches')).length,2);await p.locator('#ev-sketch-title').fill('Apple');await act(p,'evSketchFavorite');await act(p,'evSketchHome');
 assert.equal(await p.locator('#sk-gallery canvas').count(),2);await p.locator('#sk-sort').selectOption('title');assert.equal(await p.locator('#sk-gallery strong').first().innerText(),'Apple');await p.locator('#sk-search').fill('Zebra');assert.equal(await p.locator('#sk-gallery canvas').count(),1);await p.locator('#sk-search').fill('');await act(p,'evSketchFavorites');assert.equal(await p.locator('#sk-gallery canvas').count(),1);
});
test('SK10 PNG dimensions transparency JPEG background and no selection handles',async p=>{
 await skNew(p);await skTool(p,'rect');await skOption(p,'#sk-fill',true);await skDraw(p,[100,100],[200,200]);await skTool(p,'select');await skDraw(p,[150,150],null);await skCapture(p);
 await act(p,'evSketchExport');await submit(p,{format:'png',size:'1600',background:'transparent'});await p.waitForFunction(()=>skDownloads.length===1);
 const image=await p.evaluate(async()=>{const b=await createImageBitmap(skDownloads[0].blob),c=document.createElement('canvas');c.width=c.height=1600;const ctx=c.getContext('2d');ctx.drawImage(b,0,0);return {width:b.width,type:skDownloads[0].blob.type,blank:[...ctx.getImageData(20,20,1,1).data],edge:[...ctx.getImageData(184,184,1,1).data]};});assert.equal(image.width,1600);assert.equal(image.type,'image/png');assert.equal(image.blank[3],0);assert.equal(image.edge[3],0);
 await act(p,'evSketchExport');await submit(p,{format:'jpeg',size:'800',background:'transparent'});await p.waitForFunction(()=>skDownloads.length===2);assert.equal(await p.evaluate(()=>skDownloads[1].blob.type),'image/jpeg');
});
test('SK11 JSON roundtrip makes independent document and rejects bad files',async p=>{
 await skNew(p);await skTool(p,'star');await skDraw(p);await act(p,'evSketchLayerAdd');await skCapture(p);await act(p,'evSketchJSON');const json=await p.evaluate(()=>skDownloads[0].blob.text()),old=await skDoc(p);
 await skUpload(p,json);await p.waitForSelector('#sk-import',{state:'detached'});const copy=await skDoc(p);assert.notEqual(copy.id,old.id);assert.deepEqual(copy.strokes[0].points,old.strokes[0].points);assert.equal(copy.layers.length,2);assert.equal(copy.strokes[0].tool,'star');
 const count=(await load(p,'sketches')).length;for(const data of ['{broken',{format:'other'},{format:'aura-sketch',version:2,document:{strokes:[{points:[[null,0]]}]}}]){await skUpload(p,data);await p.waitForFunction(()=>document.querySelector('#sk-import-status')?.textContent!=='読み込み中…');assert.equal((await load(p,'sketches')).length,count);assert.ok(await p.locator('#sk-import-status').innerText());}
});
test('SK12 failed saves retain drafts across navigation and retry',async p=>{
 await skNew(p);await p.evaluate(()=>window.skOriginalSave=Aura.save);await failWrites(p,'sketches');await skTool(p,'pen');await skDraw(p);assert.match(await p.locator('#ev-sketch-status').innerText(),/未保存/);assert.equal((await skDoc(p)).strokes.length,0);
 await open(p,'notes');await open(p,'sketch');assert.match(await p.locator('#sk-gallery small').innerText(),/未保存/);await act(p,'evSketchOpen',(await skDoc(p)).id);await skCapture(p);await act(p,'evSketchJSON');assert.equal(await p.evaluate(async()=>JSON.parse(await skDownloads[0].blob.text()).document.strokes.length),1);
 await p.evaluate(()=>Aura.save=skOriginalSave);await act(p,'evSketchRetry');assert.equal((await skDoc(p)).strokes.length,1);assert.match(await p.locator('#ev-sketch-status').innerText(),/保存済み/);
});
test('SK13 lifecycle finalizes partial strokes exactly once',async p=>{
 await skNew(p);await skTool(p,'pen');await p.locator('#ev-canvas').scrollIntoViewIfNeeded();const b=await p.locator('#ev-canvas').boundingBox();await p.mouse.move(b.x+20,b.y+20);await p.mouse.down();await p.mouse.move(b.x+40,b.y+40);await open(p,'notes');await p.mouse.up();assert.equal((await skDoc(p)).strokes.length,1);await open(p,'sketch');await act(p,'evSketchOpen',(await skDoc(p)).id);await p.locator('#ev-canvas').dispatchEvent('pointercancel',{pointerId:1});assert.equal((await skDoc(p)).strokes.length,1);
});
test('SK14 keyboard modal guards and responsive dark layouts',async p=>{
 await skNew(p);await skTool(p,'pen');await skDraw(p);await p.locator('#ev-canvas').focus();await p.keyboard.press('Control+z');assert.equal((await skDoc(p)).strokes.length,0);await p.locator('#ev-canvas').focus();await p.keyboard.press('Control+Shift+z');assert.equal((await skDoc(p)).strokes.length,1);
 await act(p,'evSketchHelp');await p.keyboard.press('Control+z');assert.equal((await skDoc(p)).strokes.length,1);await act(p,'closeOverlay');
 for(const size of [{width:320,height:700},{width:390,height:844},{width:844,height:390}]){await p.setViewportSize(size);await p.evaluate(()=>{Aura.settings.dark=true;Aura.applySettings();});assert.equal(await p.locator('.ev-sketch').evaluate(el=>el.scrollWidth<=el.clientWidth+1),true);}
});
test('SK15 transformed objects render move undo and survive JSON',async p=>{
 await skNew(p);await skTool(p,'rect');await skDraw(p,[150,150],[250,200]);await skTool(p,'select');await skDraw(p,[180,180],null);await act(p,'evSketchObjectStyle');await submit(p,{color:'#e96c58',width:4,opacity:100,scale:200,rotation:90,flipX:'yes',flipY:'no',fill:'yes'});
 let d=await skDoc(p);assert.equal(d.strokes[0].scale,2);assert.equal(d.strokes[0].rotation,90);assert.equal(d.strokes[0].flipX,true);assert.deepEqual(await skPixel(p,200,250),[233,108,88,255]);
 await skDraw(p,[200,250],[220,260]);d=await skDoc(p);assert.ok(d.strokes[0].dx>18);await act(p,'evSketchUndo');assert.equal((await skDoc(p)).strokes[0].dx||0,0);await skCapture(p);await act(p,'evSketchJSON');const json=await p.evaluate(()=>skDownloads[0].blob.text());await skUpload(p,json);await p.waitForSelector('#sk-import',{state:'detached'});assert.equal((await skDoc(p)).strokes[0].rotation,90);
});
test('SK16 layer-local object stacking affects pixels and is reversible',async p=>{
 await skNew(p);await skTool(p,'rect');await skOption(p,'#sk-fill',true);await act(p,'evPenColor','#e96c58');await skDraw(p,[100,100],[300,300]);await act(p,'evPenColor','#6f91b6');await skDraw(p,[150,150],[350,350]);assert.deepEqual(await skPixel(p,200,200),[111,145,182,255]);
 await skTool(p,'select');await skDraw(p,[120,120],null);await act(p,'evSketchObjectOrder','front');assert.deepEqual(await skPixel(p,200,200),[233,108,88,255]);await act(p,'evSketchUndo');assert.deepEqual(await skPixel(p,200,200),[111,145,182,255]);
});
test('SK17 pan zoom focus never change document contents',async p=>{
 await skNew(p);await skTool(p,'pen');await skDraw(p);const before=(await skDoc(p)).strokes;await act(p,'evSketchFocus');assert.equal(await p.locator('.sk-settings').isVisible(),false);await p.locator('#sk-zoom').selectOption('3');await skTool(p,'pan');await p.locator('#sk-viewport').scrollIntoViewIfNeeded();const b=await p.locator('#sk-viewport').boundingBox(),left=await p.locator('#sk-viewport').evaluate(el=>el.scrollLeft);
 await p.mouse.move(b.x+180,b.y+80);await p.mouse.down();await p.mouse.move(b.x+100,b.y+80,{steps:5});await p.mouse.up();assert.ok(await p.locator('#sk-viewport').evaluate(el=>el.scrollLeft)>left);assert.deepEqual((await skDoc(p)).strokes,before);await act(p,'evSketchFocus');assert.equal(await p.locator('.sk-settings').isVisible(),true);
});

(async()=>{
 const browser=await chromium.launch({headless:true});let passed=0;const failures=[];
 try{for(const {name,run} of cases.filter(c=>!process.env.AURA_TEST_FILTER||c.name.includes(process.env.AURA_TEST_FILTER))){const context=await browser.newContext({viewport:{width:390,height:844}}),p=await context.newPage();
  await p.route('**/*',route=>route.request().url().startsWith(url)?route.continue():route.abort());
  try{await p.goto(url,{waitUntil:'domcontentloaded'});await p.waitForFunction(()=>!!window.Aura?.actions.pdStorage);const errors=[];p.on('pageerror',e=>errors.push(e.message));await run(p);assert.deepEqual(errors,[]);passed++;console.log('PASS '+name);}
  catch(error){failures.push(name+': '+error.message);console.error('FAIL '+name+': '+error.message);}
  finally{await context.close();}
 }}finally{await browser.close();}
 console.log(`RESULT: ${passed} passed, ${failures.length} failed.`);if(failures.length)process.exitCode=1;
})().catch(error=>{console.error(error);process.exitCode=1;});
