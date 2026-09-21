'use strict';
(() => {
const output=document.querySelector('#results'),frame=document.querySelector('#app-frame');
const log=(message,err=false)=>{output.textContent+='\n'+message;(err?console.error:console.log)(message);};
const delay=ms=>new Promise(r=>setTimeout(r,ms));
frame.addEventListener('load',async()=>{
 const w=frame.contentWindow,d=w.document,A=w.Aura;
 const errors=[];w.addEventListener('error',e=>errors.push(e.message));
 const original={};Object.keys(w.localStorage).filter(k=>k.startsWith('aura.')).forEach(k=>original[k]=w.localStorage.getItem(k));
 let passed=0,failed=0;
 const assert=(condition,message)=>{if(!condition)throw Error(message);};
 const click=selector=>{const el=d.querySelector(selector);assert(el,'Missing element '+selector);el.click();return el;};
 const input=(selector,value)=>{const el=d.querySelector(selector);assert(el,'Missing input '+selector);el.value=value;el.dispatchEvent(new w.Event('input',{bubbles:true}));};
 const test=async(name,fn)=>{try{await fn();passed++;log('PASS '+name);}catch(e){failed++;log('FAIL '+name+': '+e.message,true);}finally{A.closeOverlay();}};
 if(!A){log('FAIL Aura runtime did not load',true);return;}
 // API-shaped fixtures make regressions repeatable. Real providers are smoke-tested separately.
 const nativeFetch=w.fetch.bind(w), requests=[];
 const forecast={timezone:'Asia/Tokyo',current:{time:'2026-09-19T09:00',temperature_2m:23,relative_humidity_2m:61,weather_code:1,wind_speed_10m:3.2},daily:{time:Array.from({length:7},(_,i)=>`2026-09-${19+i}`),temperature_2m_max:Array(7).fill(27),temperature_2m_min:Array(7).fill(18),weather_code:Array(7).fill(1),sunset:['2026-09-19T18:00'],uv_index_max:[5]},hourly:{time:Array.from({length:24},(_,i)=>`2026-09-19T${String(i).padStart(2,'0')}:00`),temperature_2m:Array(24).fill(23),weather_code:Array(24).fill(1),precipitation_probability:Array(24).fill(10)}};
 const json=data=>Promise.resolve(new w.Response(JSON.stringify(data),{status:200,headers:{'Content-Type':'application/json'}}));
 const fixtureFetch=w.fetch=(url,options)=>{
  requests.push(String(url));
  if(String(url).includes('api.open-meteo.com/v1/forecast'))return json(forecast);
  if(String(url).includes('geocoding-api.open-meteo.com'))return json({results:[{name:'Test City',latitude:40,longitude:10,country:'Test Country'}]});
  if(String(url).includes('nominatim.openstreetmap.org'))return json([{lat:'35.68',lon:'139.76',name:'Test Station',display_name:'Test Station <img src=x onerror=alert(1)>'}]);
  if(String(url).includes('ja.wikipedia.org/w/api.php'))return json({query:{pages:{123:{pageid:123,index:1,title:'Test <b>Tokyo</b>',extract:'Article <script>unsafe</script>',fullurl:'https://ja.wikipedia.org/?curid=123'}}}});
  if(String(url).includes('itunes.apple.com/search'))return json({results:[{trackName:'Test <b>Track</b>',artistName:'Test Artist',previewUrl:'https://audio.example.test/preview.m4a',trackViewUrl:'https://music.apple.com/jp/album/test/123'}]});
  if(String(url).includes('api.frankfurter.dev'))return json([{base:'USD',quote:'JPY',date:'2026-09-18',rate:150}]);
  return nativeFetch(url,options);
 };
 const submit=selector=>d.querySelector(selector).dispatchEvent(new w.Event('submit',{bubbles:true,cancelable:true}));
 const until=async(predicate)=>{for(let i=0;i<100;i++){if(predicate())return;await delay(30);}throw Error('Timed out waiting for application state');};

 await test('30 app registrations and home icons',()=>{assert(Object.keys(A.apps).length===30,'App count');assert(d.querySelectorAll('#app-grid .app-launcher').length===26,'Home icon count');assert(d.querySelectorAll('#home-dock .app-launcher').length===4,'Dock count');Object.values(A.apps).forEach(a=>assert(typeof a.render==='function','Missing renderer '+a.id));});
 await test('All 30 app identities have dedicated, self-contained SVG artwork',()=>{
  A.home();assert(d.querySelectorAll('#home-screen .app-artwork').length===30,'All home identities must use detailed art');
  const parser=new w.DOMParser();
  Object.keys(A.apps).forEach(id=>{
   const markup=A.appIcon(id),svg=parser.parseFromString(markup,'image/svg+xml');
   assert(!svg.querySelector('parsererror'),'Invalid SVG '+id);
   assert(svg.documentElement.dataset.appArt===id,'Missing dedicated art '+id);
   assert(svg.documentElement.getAttribute('viewBox')==='0 0 80 80','Wrong art canvas '+id);
   assert(svg.querySelectorAll('path,rect,circle,ellipse,line,text').length>=10,'Insufficient detail '+id);
   assert(!svg.querySelector('image,script,foreignObject'),'External or unsafe artwork '+id);
  });
 });
 await test('App art IDs remain unique across home, library, recents and notifications',()=>{
  const check=()=>{
   const ids=[...d.querySelectorAll('.app-artwork [id]')].map(el=>el.id);
   assert(new Set(ids).size===ids.length,'Duplicate SVG definitions');
   d.querySelectorAll('.app-artwork').forEach(svg=>{
    const localIds=new Set([...svg.querySelectorAll('[id]')].map(el=>el.id));
    for(const match of svg.outerHTML.matchAll(/url\(#([^)]+)\)/g))assert(localIds.has(match[1]),'Unresolved local paint '+match[1]);
   });
  };
  A.home();A.library();check();assert(d.querySelectorAll('#overlay .app-artwork').length>=30,'Library art missing');
  A.closeOverlay();A.recentApps=['calendar','photos','clock'];A.recents();check();assert(d.querySelectorAll('#overlay .app-artwork').length===3,'Recents art missing');
  A.closeOverlay();A.actions.appContext({dataset:{id:'calendar'}});check();assert(d.querySelector('.context-app [data-app-art="calendar"]'),'Mini art missing');
  A.closeOverlay();A.notify({app:'clock',title:'Icon check',body:'Local artwork validation'});A.notifications();check();
  assert(d.querySelector('.notification-stack [data-app-art="clock"]'),'Notification artwork missing');
  A.actions.dismissNotice(d.querySelector('.notification-stack [data-action="dismissNotice"]'));
 });
 await test('Calendar date and clock hands update without replacing launchers',()=>{
  A.home();const launcher=d.querySelector('[data-app="calendar"]'),day=launcher.querySelector('.app-calendar-date');
  day.textContent='0';A.updateWidgets();assert(day.textContent===String(new w.Date().getDate()),'Date did not refresh');
  assert(d.querySelector('[data-app="calendar"]')===launcher,'Launcher replaced');
  const svg=new w.DOMParser().parseFromString(A.appIcon('clock',new w.Date(2026,8,19,15,24,30)),'image/svg+xml');
  assert(svg.querySelector('.app-clock-hour').getAttribute('transform')==='rotate(102 40 40)','Hour hand');
  assert(svg.querySelector('.app-clock-minute').getAttribute('transform')==='rotate(144 40 40)','Minute hand');
  assert(svg.querySelector('.app-clock-second').getAttribute('transform')==='rotate(180 40 40)','Second hand');
  const live=d.querySelector('#home-screen [data-app-art="clock"]');assert(live,'Detailed clock missing');
  A.updateSystem();A.updateClock();
  assert(d.querySelector('#home-screen [data-app-art="clock"]')===live,'System tick replaced detailed clock');
  assert(!A.icon('search').includes('app-artwork'),'Action icons must remain separate');
 });
 await test('Detailed icons fit original, glass and tinted tiles in both themes',()=>{
  const saved={style:A.settings.iconStyle,dark:A.settings.dark};
  try {
   for(const style of ['standard','glass','tinted'])for(const dark of [false,true]){
    A.settings.iconStyle=style;A.settings.dark=dark;A.applySettings();A.home();
    d.querySelectorAll('#home-screen .app-icon').forEach(tile=>{
     const svg=tile.querySelector('.app-artwork');assert(svg,'Artwork missing');
     const art=svg.getBoundingClientRect(),box=tile.getBoundingClientRect();
     assert(art.width>40&&art.height>40,'Artwork too small');
     assert(art.width<=box.width+.1&&art.height<=box.height+.1,'Artwork overflow');
     assert(svg.getAttribute('aria-hidden')==='true','Decorative artwork must not duplicate accessible label');
    });
   }
  } finally {A.settings.iconStyle=saved.style;A.settings.dark=saved.dark;A.applySettings();A.home();}
 });
 for(const id of Object.keys(A.apps))await test('App opens: '+id,()=>{A.open(id);assert(!d.querySelector('#app-screen').hidden,'App hidden');assert(d.querySelector('#app-screen').textContent.trim().length>0,'Empty application');assert(A.current===id,'Wrong current app');const missing=[...d.querySelectorAll('#app-screen [data-action]')].filter(el=>!A.actions[el.dataset.action]);assert(!missing.length,'Missing handlers: '+missing.map(e=>e.dataset.action));});
 await test('Home / lock / unlock',()=>{A.home();A.lock();assert(!d.querySelector('#lock-screen').hidden,'Lock invisible');click('#unlock-button');assert(!d.querySelector('#home-screen').hidden,'Home invisible');});
 await test('Control center brightness and dark mode',()=>{A.controls();input('#control-brightness','75');assert(A.settings.brightness===75,'Brightness');click('[data-action="controlToggle"][data-key="dark"]');assert(d.querySelector('#phone-screen').classList.contains('screen-dark-mode')===A.settings.dark,'Dark mode');A.settings.dark=false;A.settings.brightness=100;A.applySettings();});
 await test('Spotlight filters applications',()=>{A.spotlight();input('#spotlight-query','メモ');assert(d.querySelectorAll('#spotlight-results .app-launcher').length===2,'Expected Notes and Voice Memos');});
 await test('Calculator arithmetic and repeat equals',()=>{A.open('calculator');for(const v of ['clear','1','2','+','7','='])click(`[data-action="calcKey"][data-value="${v}"]`);assert(d.querySelector('#calc-result').textContent==='19','12+7');click('[data-action="calcKey"][data-value="="]');assert(d.querySelector('#calc-result').textContent==='26','Repeat equals');});
 await test('Calculator divide by zero and recovery',()=>{for(const v of ['clear','5','/','0','='])click(`[data-action="calcKey"][data-value="${v}"]`);assert(d.querySelector('#calc-result').textContent==='エラー','Division by zero');click('[data-action="calcKey"][data-value="3"]');assert(d.querySelector('#calc-result').textContent==='3','Error recovery');});
 await test('Notes autosave and safe text rendering',()=>{A.open('notes');click('[data-action="noteNew"]');input('#note-title','QA <b>safe</b>');input('#note-body','A little world.\nRegression note.');A.home();A.open('notes');const notes=A.load('notes',[]);assert(notes.some(n=>n.title==='QA <b>safe</b>'),'Note not stored');const card=[...d.querySelectorAll('.note-card')].find(c=>c.textContent.includes('QA <b>safe</b>'));assert(card,'Escaping failed');assert(!card.querySelector('b'),'Markup injected');});
 // Isolated Notes Studio fixtures; restore the existing notes after each scenario.
 const noteStudioTest=(name,fn)=>test('Notes Studio: '+name,async()=>{
  const saved=JSON.parse(JSON.stringify(A.noteModel.get())),trash=A.load('noteTrash',[]),layout=A.load('noteLayout','grid');
  try{
   A.noteModel.replace([{id:'studio-a',title:'紙 <b>safe</b>',body:'☑ 完了\n☐ 次の一歩',tags:'idea <img src=x>',folder:'仕事 <b>safe</b>',pinned:true,updated:1000},{id:'studio-b',title:'白紙',body:'',updated:2000}]);
   A.open('notes');A.actions.pdNoteReset();await fn();
  }finally{A.closeOverlay();A.actions.pdNoteRetry();A.noteModel.replace(saved,{noteTrash:trash});A.actions.pdNoteReset();A.actions.pdNoteLayout({dataset:{id:layout}});}
 });
 await noteStudioTest('paper cards escape text and never migrate existing records',()=>{
  const before=JSON.stringify(A.noteModel.get());A.open('notes');assert(JSON.stringify(A.noteModel.get())===before,'Read rewrote model');
  const card=d.querySelector('.memo-card');assert(card.dataset.id==='studio-a','Pinned ordering');
  assert(card.querySelector('.memo-progress').textContent.includes('1 / 2'),'Progress text');assert(card.querySelector('.memo-progress-track i').style.width==='50%','Progress fill');
  assert(!d.querySelector('.memo-studio b,.memo-studio img'),'Unsafe text injected');assert(d.querySelector('.memo-art').getAttribute('aria-hidden')==='true','Decorative artwork announced');
 });
 await noteStudioTest('layout and search compose with pin and folder filters',()=>{
  click('[data-action="pdNoteLayout"][data-id="list"]');A.home();A.open('notes');assert(d.querySelector('#notes-grid').dataset.layout==='list'&&A.load('noteLayout')==='list','Layout did not persist');
  click('[data-action="pdNoteFilter"][data-id="pinned"]');assert(d.querySelectorAll('.memo-card').length===1&&d.querySelector('#pd-note-folder').value==='pinned','Pin filter mismatch');
  input('#notes-search','idea');assert(d.querySelectorAll('.memo-card').length===1,'Tag search');input('#notes-search','no-match-studio');assert(d.querySelector('.memo-empty'),'Empty results missing');
  click('[data-action="pdNoteReset"]');const folder=d.querySelector('#pd-note-folder');folder.value='仕事 <b>safe</b>';folder.dispatchEvent(new w.Event('change'));assert(d.querySelectorAll('.memo-card').length===1,'Folder filter');
 });
 await noteStudioTest('stationery and focus preserve textarea, selection and metadata',()=>{
  click('.memo-card');const body=d.querySelector('#note-body');body.setSelectionRange(2,4);
  for(const [key,id] of [['tone','lavender'],['paper','dots'],['font','serif']])A.actions.pdNoteStyle({dataset:{key,id}});
  click('[data-action="pdNoteFocus"]');assert(d.querySelector('.memo-editor').dataset.focus==='true','Focus not enabled');assert(d.querySelector('#note-body')===body&&body.selectionStart===2&&body.selectionEnd===4,'Appearance replaced editor');
  input('#note-body','new text');const n=A.noteModel.get()[0];assert(n.tone==='lavender'&&n.paper==='dots'&&n.font==='serif'&&n.tags==='idea <img src=x>','Editing lost metadata');
  click('[data-action="pdNoteFocus"]');A.actions.noteList();assert(d.querySelector('.memo-card').dataset.tone==='lavender','Card lost chosen color');
 });
 await noteStudioTest('invalid styles fall back and failed writes do not apply',()=>{
  const n=A.noteModel.get()[0];A.noteModel.replace([{...n,tone:'__proto__',paper:'bad',font:'bad'}]);A.actions.pdNoteReset();click('.memo-card');
  assert(d.querySelector('.memo-paper').dataset.paper==='ruled'&&d.querySelector('.memo-paper').dataset.font==='sans','Invalid style fallback');
  const before=JSON.stringify(A.noteModel.get()),replace=A.noteModel.replace;
  try{A.noteModel.replace=()=>false;A.actions.pdNoteStyle({dataset:{key:'paper',id:'dots'}});assert(d.querySelector('.memo-paper').dataset.paper==='ruled','Failed style applied');}finally{A.noteModel.replace=replace;}
  A.actions.pdNoteStyle({dataset:{key:'__proto__',id:'dots'}});assert(JSON.stringify(A.noteModel.get())===before,'Invalid key changed data');
 });
 await noteStudioTest('failed drafts survive navigation, export, retry and blocked redraws',async()=>{
  click('.memo-card');const replace=A.noteModel.replace,download=A.download;let blob;
  try{
   A.noteModel.replace=()=>false;input('#note-body','大切な未保存の下書き');assert(!d.querySelector('#memo-save-retry').hidden,'Retry missing');
   click('[data-action="pdNotePreview"]');assert(!d.querySelector('#note-body').hidden,'Failed draft discarded by preview');
   A.home();A.open('notes');assert(d.querySelector('.memo-card').textContent.includes('未保存'),'Unsaved badge missing');click('.memo-card');assert(d.querySelector('#note-body').value==='大切な未保存の下書き','Navigation lost draft');
   A.download=value=>blob=value;A.actions.pdNoteExport();assert((await blob.text()).includes('大切な未保存の下書き'),'Export omitted draft');
  }finally{A.noteModel.replace=replace;A.download=download;A.actions.pdNoteRetry();}
  assert(A.noteModel.get()[0].body==='大切な未保存の下書き','Retry did not save');assert(d.querySelector('#note-save-status').dataset.state==='saved'&&d.querySelector('#memo-save-warning').hidden,'Warning did not clear');
 });
 await noteStudioTest('IME composition and checklist previews save safely',()=>{
  click('.memo-card');const body=d.querySelector('#note-body'),before=A.noteModel.get()[0].body;
  body.value='変換中';body.dispatchEvent(new w.InputEvent('input',{isComposing:true,bubbles:true}));assert(A.noteModel.get()[0].body===before,'Composition saved prematurely');
  body.dispatchEvent(new w.CompositionEvent('compositionend',{bubbles:true}));assert(A.noteModel.get()[0].body==='変換中','IME completion not saved');
  input('#note-body','☐ 一歩\n☑ 完了');assert(d.querySelector('#note-length').textContent==='9字','Character count');click('[data-action="pdNotePreview"]');click('.pd-checkline');assert(A.noteModel.get()[0].body.startsWith('☑'),'Checklist toggle failed');
 });
 await noteStudioTest('empty-state creation, templates and trash preserve chosen appearance',()=>{
  A.noteModel.replace([]);A.actions.pdNoteReset();click('.memo-empty [data-action="noteNew"]');assert(d.querySelector('#note-title'),'Empty create');A.actions.noteList();click('.memo-quickstart [data-id="checklist"]');
  assert(d.querySelector('#note-body').value.split('☐').length===4,'Quick template');A.actions.pdNoteStyle({dataset:{key:'tone',id:'rose'}});const id=A.noteModel.get()[0].id;
  A.actions.noteDelete();A.actions.pdNoteTrash();A.actions.pdNoteRestore({dataset:{id}});assert(A.noteModel.get().find(n=>n.id===id).tone==='rose','Restore lost color');
 });
 await noteStudioTest('small screens, dark mode, large text and reduced motion fit',async()=>{
  const style=frame.getAttribute('style'),settings={...A.settings};
  try{for(const [width,height,dark,textSize] of [[320,568,false,'standard'],[390,844,true,'standard'],[320,568,true,'largest'],[844,390,false,'standard'],[1440,900,false,'standard']]){
   frame.style.width=width+'px';frame.style.height=height+'px';Object.assign(A.settings,{dark,textSize,reduceMotion:true});A.applySettings();A.actions.pdNoteReset();await delay(40);
   const library=d.querySelector('.memo-library');assert(library.scrollWidth<=library.clientWidth+1,'Library overflow '+width);assert(w.getComputedStyle(d.querySelector('.memo-card')).transitionDuration==='0s','Motion preference ignored');
   click('.memo-card');d.querySelector('.memo-style-panel').open=true;const editor=d.querySelector('.memo-editor');assert(editor.scrollWidth<=editor.clientWidth+1,'Editor overflow '+width);click('[data-action="pdNoteFocus"]');assert(editor.scrollWidth<=editor.clientWidth+1,'Focus overflow '+width);
  }}finally{Object.assign(A.settings,settings);A.applySettings();if(style===null)frame.removeAttribute('style');else frame.setAttribute('style',style);}
 });
 await test('Reminder create and toggle',()=>{A.open('reminders');const f=d.querySelector('#reminder-form');f.elements.text.value='QA reminder';f.dispatchEvent(new w.Event('submit',{bubbles:true,cancelable:true}));const item=A.load('reminders',[]).find(r=>r.text==='QA reminder');assert(item,'Reminder not persisted');click(`[data-action="reminderToggle"][data-id="${item.id}"]`);assert(A.load('reminders',[]).find(r=>r.id===item.id).done,'Reminder toggle');});

 // Reminder Studio regression fixtures never replace the user's original records.
 const reminderDay=(offset=0)=>{const date=new w.Date();date.setDate(date.getDate()+offset);return `${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,'0')}-${String(date.getDate()).padStart(2,'0')}`;};
 const reminderTest=async(name,fn)=>test('Reminder Studio: '+name,async()=>{
  const original=JSON.parse(JSON.stringify(A.reminderModel.get()));
  try{
   A.reminderModel.replace([
    {id:'rm-old',text:'過去の用事',due:reminderDay(-1),done:false,list:'仕事',note:'検索用 ABC',steps:[{id:'s1',text:'準備',done:true}]},
    {id:'rm-today',text:'今日の用事',due:reminderDay(),done:false,priority:true},
    {id:'rm-next',text:'次の用事',due:reminderDay(7),done:false,list:'暮らし'},
    {id:'rm-far',text:'先の用事',due:reminderDay(8),done:false},
    {id:'rm-none',text:'期限なし',due:'',done:false},
    {id:'rm-done',text:'終わった用事',due:reminderDay(),done:true}
   ]);A.open('reminders');A.actions.rmResetFilters();await fn();
  }finally{A.closeOverlay();A.reminderModel.replace(original);A.open('reminders');A.actions.rmResetFilters();}
 });
 await reminderTest('smart filters include overdue and exclude completed tasks',()=>{
  const filter=(id,count)=>{A.actions.reminderFilter({dataset:{id}});assert(d.querySelectorAll('.rm-task').length===count,id+' count');};
  filter('today',2);filter('upcoming',1);filter('priority',1);filter('pending',5);filter('done',1);filter('all',6);
  const none=d.querySelector('[data-action="epReminderOpen"][data-id="rm-none"]');assert(!none.textContent.includes('期限超過'),'Empty deadline marked overdue');
  assert(d.querySelectorAll('.rm-group').length===5,'Deadline groups missing');
 });
 await reminderTest('normalized search includes notes and steps; list filters compose',()=>{
  input('#ep-reminder-query','ａｂｃ');assert(d.querySelectorAll('.rm-task').length===1,'NFKC search failed');
  input('#ep-reminder-query','準備');assert(d.querySelectorAll('.rm-task').length===1,'Step search failed');
  const filter=d.querySelector('#rm-list-filter');filter.value='暮らし';filter.dispatchEvent(new w.Event('change'));assert(d.querySelector('.rm-empty'),'List and query do not compose');
  A.actions.rmResetFilters();assert(d.querySelectorAll('.rm-task').length===6,'Reset did not clear all conditions');
 });
 await reminderTest('quick capture keeps drafts across filters and applies date',()=>{
  input('#reminder-form input','新しい用事');A.actions.reminderFilter({dataset:{id:'today'}});assert(d.querySelector('#reminder-form input').value==='新しい用事','Draft lost');
  A.actions.rmQuickDue({dataset:{id:reminderDay(1)}});submit('#reminder-form');
  const item=A.reminderModel.get().find(x=>x.text==='新しい用事');assert(item&&item.due===reminderDay(1),'Quick date not saved');
  assert(d.querySelector('#reminder-form input')===d.activeElement,'Continuous capture lost focus');A.actions.rmUndo();assert(!A.reminderModel.get().some(x=>x.id===item.id),'Quick create undo');
  A.actions.rmQuickDue({dataset:{id:''}});
 });
 await reminderTest('editor preserves checklist identities and escapes content',()=>{
  A.actions.reminderDetails({dataset:{id:'rm-old'}});
  input('#ep-text','<img src=x onerror=alert(1)>');input('#ep-steps','準備\n仕上げ');input('#ep-list','企画');submit('#modal-form');
  const item=A.reminderModel.get().find(x=>x.id==='rm-old');assert(item.steps.length===2&&item.steps[0].id==='s1'&&item.steps[0].done,'Checklist identity lost');
  assert(item.list==='企画','List not saved');assert(!d.querySelector('.rm-detail-hero img'),'Unsafe title');assert(d.querySelectorAll('.rm-step').length===2,'Detail steps missing');
  click('[data-action="epReminderStep"][data-step="s1"]');assert(!A.reminderModel.get().find(x=>x.id==='rm-old').steps[0].done,'Step toggle failed');assert(!A.reminderModel.get().find(x=>x.id==='rm-old').done,'Step completed parent');
 });
 await reminderTest('daily recurrence resets steps and undo removes next instance',()=>{
  A.reminderModel.replace(A.reminderModel.get().map(x=>x.id==='rm-old'?{...x,repeat:'daily'}:x));
  A.actions.reminderToggle({dataset:{id:'rm-old'}});const all=A.reminderModel.get(),item=all.find(x=>x.id==='rm-old'),next=all.find(x=>x.id===item.repeatNextId);
  assert(item.done&&next&&next.due===reminderDay(1)&&!next.done,'Next daily instance missing');assert(!next.steps[0].done&&next.steps[0].id!=='s1','Checklist not reset');
  A.actions.rmUndo();assert(A.reminderModel.get().length===6&&!A.reminderModel.get().find(x=>x.id==='rm-old').done,'Recurring undo not atomic');
 });
 await reminderTest('weekly recurrence is shared with Today and never duplicates on retoggle',()=>{
  A.reminderModel.replace(A.reminderModel.get().map(x=>x.id==='rm-today'?{...x,repeat:'weekly'}:x));
  A.open('today');A.actions.evTodayCheck({dataset:{id:'rm-today'}});
  let all=A.reminderModel.get(),item=all.find(x=>x.id==='rm-today');assert(all.find(x=>x.id===item.repeatNextId)?.due===reminderDay(7),'Today skipped weekly repeat');
  A.open('reminders');A.actions.reminderToggle({dataset:{id:'rm-today'}});A.actions.reminderToggle({dataset:{id:'rm-today'}});assert(A.reminderModel.get().length===7,'Retoggle duplicated next task');
 });
 await reminderTest('priority changes and delete support undo',()=>{
  A.actions.rmPriority({dataset:{id:'rm-none'}});assert(A.reminderModel.get().find(x=>x.id==='rm-none').priority,'Priority missing');A.actions.rmUndo();assert(!A.reminderModel.get().find(x=>x.id==='rm-none').priority,'Priority undo failed');
  A.actions.reminderDelete({dataset:{id:'rm-old'}});click('#confirm-yes');assert(!A.reminderModel.get().some(x=>x.id==='rm-old'),'Delete failed');A.actions.rmUndo();assert(A.reminderModel.get().find(x=>x.id==='rm-old').steps[0].done,'Deleted steps not restored');
 });
 await reminderTest('undo refuses to overwrite external model changes',()=>{
  A.actions.rmPriority({dataset:{id:'rm-none'}});A.reminderModel.replace([...A.reminderModel.get(),{id:'rm-external',text:'他画面で追加',done:false}]);A.actions.rmUndo();
  assert(A.reminderModel.get().some(x=>x.id==='rm-external'),'Undo overwrote another edit');assert(A.reminderModel.get().find(x=>x.id==='rm-none').priority,'Stale undo applied');
 });
 await reminderTest('failed save keeps model, draft and last undo untouched',()=>{
  const saved=A.save,before=JSON.stringify(A.reminderModel.get());input('#reminder-form input','保存失敗の下書き');
  try{A.save=()=>false;submit('#reminder-form');A.actions.reminderToggle({dataset:{id:'rm-today'}});assert(JSON.stringify(A.reminderModel.get())===before,'Failed save changed model');assert(d.querySelector('#reminder-form input').value==='保存失敗の下書き','Failed save lost draft');}finally{A.save=saved;input('#reminder-form input','');}
 });
 await reminderTest('postponement and duplication preserve the original task',()=>{
  A.actions.epReminderPostpone({dataset:{id:'rm-old'}});assert(A.reminderModel.get().find(x=>x.id==='rm-old').due===reminderDay(1),'Overdue postponement should use tomorrow');A.actions.rmUndo();
  A.actions.epReminderDuplicate({dataset:{id:'rm-old'}});const copy=A.reminderModel.get().find(x=>x.text==='過去の用事 コピー');assert(copy&&!copy.done&&!copy.steps[0].done&&copy.steps[0].id!=='s1','Duplicate shares completed steps');A.actions.rmUndo();assert(A.reminderModel.get().length===6,'Duplicate undo failed');
 });
 await reminderTest('editor validates list names and checklist limits',()=>{
  A.actions.reminderDetails();input('#ep-text','制限の確認');input('#ep-list','*');submit('#modal-form');assert(!d.querySelector('#overlay').hidden,'Reserved list accepted');
  input('#ep-list','仕事');input('#ep-steps',Array(31).fill('手順').join('\n'));submit('#modal-form');assert(!d.querySelector('#overlay').hidden,'Too many steps accepted');
 });
 await reminderTest('bulk clear removes only done records and is reversible',()=>{
  A.actions.reminderClearDone();click('#confirm-yes');assert(A.reminderModel.get().length===5&&!A.reminderModel.get().some(x=>x.done),'Bulk clear affected pending');A.actions.rmUndo();assert(A.reminderModel.get().length===6,'Bulk clear undo failed');
 });
 await reminderTest('bulk selection drops hidden tasks before mutation',()=>{
  A.actions.rmSelectionMode();A.actions.rmSelectAll();assert(d.querySelectorAll('.rm-select[aria-pressed=true]').length===6,'Select all');
  input('#ep-reminder-query','過去の用事');assert(d.querySelectorAll('.rm-select[aria-pressed=true]').length===1,'Hidden selection retained');
  A.actions.rmBatchTomorrow();assert(A.reminderModel.get().find(x=>x.id==='rm-old').due===reminderDay(1),'Selected not postponed');assert(A.reminderModel.get().find(x=>x.id==='rm-today').due===reminderDay(),'Hidden item mutated');
  A.actions.rmUndo();assert(A.reminderModel.get().find(x=>x.id==='rm-old').due===reminderDay(-1),'Bulk undo failed');
 });
 await reminderTest('bulk completion commits recurring tasks together and undoes atomically',()=>{
  A.reminderModel.replace(A.reminderModel.get().map(x=>x.id==='rm-old'?{...x,repeat:'daily'}:x));
  A.actions.rmSelectionMode();for(const id of ['rm-old','rm-today','rm-done'])A.actions.rmSelect({dataset:{id}});A.actions.rmBatchComplete();
  const all=A.reminderModel.get();assert(all.length===7&&all.find(x=>x.id==='rm-old').done&&all.find(x=>x.id==='rm-today').done,'Bulk completion failed');
  A.actions.rmUndo();assert(A.reminderModel.get().length===6&&!A.reminderModel.get().find(x=>x.id==='rm-old').done,'Recurring bulk undo lost records');
 });
 await reminderTest('bulk recurrence date overflow rejects the entire change',()=>{
  A.reminderModel.replace(A.reminderModel.get().map(x=>x.id==='rm-old'?{...x,repeat:'daily',due:'9999-12-31'}:x));A.actions.rmResetFilters();
  A.actions.rmSelectionMode();for(const id of ['rm-today','rm-old'])A.actions.rmSelect({dataset:{id}});
  const before=JSON.stringify(A.reminderModel.get());A.actions.rmBatchComplete();assert(JSON.stringify(A.reminderModel.get())===before,'Partial batch committed');
 });
 await reminderTest('bulk move validates and deletion requires confirmation',()=>{
  A.actions.rmSelectionMode();A.actions.rmSelect({dataset:{id:'rm-old'}});A.actions.rmBatchMove();input('#ep-list','*');submit('#modal-form');assert(!d.querySelector('#overlay').hidden,'Reserved name accepted');
  input('#ep-list','新しいリスト');submit('#modal-form');assert(A.reminderModel.get().find(x=>x.id==='rm-old').list==='新しいリスト','Move failed');A.actions.rmUndo();
  A.actions.rmSelectionMode();A.actions.rmSelect({dataset:{id:'rm-old'}});A.actions.rmBatchDelete();A.closeOverlay();assert(A.reminderModel.get().length===6,'Cancellation deleted data');
  A.actions.rmBatchDelete();click('#confirm-yes');assert(A.reminderModel.get().length===5,'Batch delete failed');A.actions.rmUndo();assert(A.reminderModel.get().find(x=>x.id==='rm-old').steps.length===1,'Batch deletion lost steps');
 });
 await reminderTest('bulk storage failure keeps selections and supports retry',()=>{
  A.actions.rmSelectionMode();A.actions.rmSelect({dataset:{id:'rm-old'}});const before=JSON.stringify(A.reminderModel.get()),save=A.save;
  try{A.save=()=>false;A.actions.rmBatchComplete();assert(JSON.stringify(A.reminderModel.get())===before,'Failed batch changed data');assert(d.querySelector('.rm-select[aria-pressed=true]'),'Selection lost on failure');}finally{A.save=save;}
  A.actions.rmBatchComplete();assert(A.reminderModel.get().find(x=>x.id==='rm-old').done,'Retry failed');
 });
 await reminderTest('bulk capture validates limits and ignores empty lines',()=>{
  A.actions.rmBulkAdd();input('#ep-bulk',Array(51).fill('項目').join('\n'));submit('#modal-form');assert(A.reminderModel.get().length===6,'Oversized import accepted');
  input('#ep-bulk','一つ目\n\n二つ目');input('#ep-due',reminderDay(1));input('#ep-list','新しいリスト');submit('#modal-form');
  const added=A.reminderModel.get().filter(x=>x.list==='新しいリスト');assert(added.length===2&&added.every(x=>x.due===reminderDay(1)),'Bulk capture did not preserve options');A.actions.rmUndo();assert(A.reminderModel.get().length===6,'Bulk add undo failed');
 });
 await reminderTest('inline steps preserve existing steps and reject failed saves',()=>{
  A.actions.epReminderOpen({dataset:{id:'rm-old'}});input('#rm-step-form input','次の一歩');submit('#rm-step-form');let task=A.reminderModel.get().find(x=>x.id==='rm-old');assert(task.steps.length===2&&task.steps[0].done,'Inline step replaced history');
  const save=A.save;try{A.save=()=>false;input('#rm-step-form input','保存の再試行');submit('#rm-step-form');assert(d.querySelector('#rm-step-form input').value==='保存の再試行','Inline draft lost');assert(A.reminderModel.get().find(x=>x.id==='rm-old').steps.length===2,'Unsaved step appended');}finally{A.save=save;}
 });
 await reminderTest('selection keyboard escape stays inside the reminders app',()=>{
  A.actions.rmSelectionMode();const control=d.querySelector('[data-action=rmSelectionMode]');control.dispatchEvent(new w.KeyboardEvent('keydown',{key:'Escape',bubbles:true,cancelable:true}));
  assert(A.current==='reminders'&&d.querySelector('[data-action=rmSelectionMode]').getAttribute('aria-pressed')==='false','Escape left app');
 });
 await test('Calendar month navigation and event create',()=>{A.open('calendar');const before=d.querySelector('.calendar-month-head h3').textContent;click('[data-action="calendarMove"][data-value="1"]');assert(d.querySelector('.calendar-month-head h3').textContent!==before,'Month unchanged');click('[data-action="calendarAdd"]');const f=d.querySelector('#modal-form');f.elements.title.value='QA calendar event';f.elements.place.value='Local only';f.dispatchEvent(new w.Event('submit',{bubbles:true,cancelable:true}));assert(A.load('events',[]).some(e=>e.title==='QA calendar event'),'Event not saved');});
 await test('Photo gallery and favorite',()=>{A.open('photos');click('[data-action="photoOpen"][data-id="sample-lake"]');assert(d.querySelector('.photo-viewer img'),'Photo missing');click('[data-action="photoFavorite"]');assert(A.load('photoFavorites',[]).includes('sample-lake'),'Favorite not saved');});
 await test('Camera permission is opt-in',()=>{A.open('camera');assert(d.querySelector('#camera-placeholder'),'No permission prompt');assert(!d.querySelector('#camera-video').srcObject,'Camera started without gesture');click('[data-action="cameraCapture"]');assert(d.querySelector('#toast').textContent.includes('先に'),'Missing capture warning');});
 await test('Mail local compose and outbox',()=>{A.open('mail');click('[data-action="mailDemo"]');click('[data-action="mailCompose"]');const f=d.querySelector('#mail-compose');f.elements.to.value='demo@example.com';f.elements.subject.value='QA local mail';f.elements.body.value='This must never be externally sent.';f.dispatchEvent(new w.Event('submit',{bubbles:true,cancelable:true}));assert(A.load('mails',[]).some(m=>m.subject==='QA local mail'&&m.folder==='sent'),'No local outbox mail');});
 await test('Messages send and canned reply',async()=>{A.open('messages','misaki');const f=d.querySelector('#chat-form');f.elements.message.value='QA hello';f.dispatchEvent(new w.Event('submit',{bubbles:true,cancelable:true}));assert(A.load('chats',{}).misaki.at(-1).sent,'Outgoing message');await delay(1450);assert(!A.load('chats',{}).misaki.at(-1).sent,'Demo reply');});
 await test('Connected browser search reader and bookmarks',async()=>{A.open('safari');input('#browser-url','Tokyo');submit('#web-form');await until(()=>d.querySelector('[data-wiki-result]'));assert(!d.querySelector('#web-content b'),'Unsafe result title');click('[data-wiki-result]');await until(()=>d.querySelector('.live-reader'));assert(!d.querySelector('.live-reader script'),'Unsafe article');click('[data-action="webBookmark"]');assert(A.load('webBookmarks',[]).some(b=>b.url.includes('curid=123')),'Bookmark missing');click('[data-action="webSaved"]');assert(d.querySelector('.web-bookmark'),'Saved page absent');});
 await test('Real map search and external route link',async()=>{A.open('maps');await until(()=>d.querySelector('.leaflet-container'));const before=requests.filter(u=>u.includes('nominatim')).length;input('#live-map-search input','Tokyo');await delay(20);assert(requests.filter(u=>u.includes('nominatim')).length===before,'Autocomplete must not call geocoder');submit('#live-map-search');await until(()=>d.querySelector('[data-map-result]'));assert(!d.querySelector('#map-results img'),'Unsafe place markup');click('[data-map-result]');const link=d.querySelector('#map-results a[href*="/dir/"]');assert(link&&new URL(link.href).searchParams.get('destination')==='35.68,139.76','Wrong route destination');assert(d.querySelector('.leaflet-popup-content').textContent.includes('<img'),'Popup not safe text');});
 await test('Weather city selection and seven-day forecast',async()=>{A.open('weather');click('[data-action="weatherCities"]');click('[data-action="weatherSelect"][data-value="2"]');await until(()=>d.querySelectorAll('.live-forecast-row').length===7);assert(d.querySelector('.weather-summary h2').textContent==='札幌','City not selected');assert(A.load('weatherLive',{}).data.current.temperature_2m===23,'Forecast not cached');});
 await test('Music player, track selection, and likes',()=>{A.open('music','player');assert(d.querySelector('.player-art'),'Album missing');const old=A.music.track.id;A.music.select('tide',false);A.apps.music.render('player');assert(A.music.track.id!==old,'Track not changed');click('[data-action="musicLike"]');assert(A.load('musicLikes',[]).includes('tide'),'Music like not saved');});
 await test('Voice recorder permission is opt-in',()=>{A.open('recorder');assert(d.querySelector('.record-button'),'Record control missing');assert(!d.querySelector('.recording'),'Unexpected recording started');});
 await test('Phone offline dial and call history',async()=>{A.open('phone');click('[data-action="phoneDemo"]');for(const n of ['1','2','3'])click(`[data-action="dialKey"][data-value="${n}"]`);assert(d.querySelector('#dial-display').textContent==='123','Dialing');click('[data-action="phoneCall"]');assert(d.querySelector('.call-screen').textContent.includes('外部接続なし'),'Missing simulation label');await delay(1100);click('[data-action="phoneEnd"]');assert(A.load('callLog',[]).some(c=>c.number==='123'),'Call log');});
 await test('Stopwatch start, lap, and stop',async()=>{A.open('clock');click('[data-action="clockTab"][data-value="stopwatch"]');click('[data-action="stopwatchToggle"]');await delay(120);click('[data-action="stopwatchLap"]');assert(d.querySelector('.lap-row'),'Lap missing');click('[data-action="stopwatchToggle"]');assert(d.querySelector('#stopwatch-display').textContent!=='00:00.00','Clock did not advance');});
 await test('Timer completes and notifies',async()=>{click('[data-action="clockTab"][data-value="timer"]');input('#timer-minutes','0');input('#timer-seconds','1');click('[data-action="timerToggle"]');await delay(2100);assert(A.load('notifications',[]).some(n=>n.app==='clock'&&n.title.includes('タイマー終了')),'No timer notification in history');});
 await test('Health hydration update',()=>{A.open('health');const before=A.load('health',{water:1200}).water;click('[data-action="healthWater"]');assert(A.load('health',{}).water===before+200,'Water update');});
 await test('Wallet demo-only charge and purchase',()=>{A.open('wallet');const before=A.load('wallet',{balance:3240}).balance;click('[data-action="walletCharge"]');d.querySelector('#modal-form').dispatchEvent(new w.Event('submit',{bubbles:true,cancelable:true}));assert(A.load('wallet',{}).balance===before+1000,'Demo charge');click('[data-action="walletPay"]');d.querySelector('#modal-form').dispatchEvent(new w.Event('submit',{bubbles:true,cancelable:true}));assert(A.load('wallet',{}).balance===before+420,'Demo purchase');});
 await test('Text file create and preview',()=>{A.open('files');click('[data-action="fileNew"]');const f=d.querySelector('#modal-form');f.elements.name.value='QA.txt';f.elements.content.value='A little test.';f.dispatchEvent(new w.Event('submit',{bubbles:true,cancelable:true}));const file=A.load('files',[]).find(f=>f.name==='QA.txt');assert(file,'File not saved');A.actions.filesHome();click(`[data-action="fileOpen"][data-id="${file.id}"]`);assert(d.querySelector('.file-preview').textContent==='A little test.','File preview');});
 await test('2048 merge rules',()=>{const merge=A.gameMath.mergeLine;assert(JSON.stringify(merge([2,2,2,2]).line)==='[4,4,0,0]','Double merge');assert(merge([2,2,2,2]).gain===8,'Merge score');assert(JSON.stringify(merge([4,4,8,0]).line)==='[8,8,0,0]','Cascade merge occurred');assert(JSON.stringify(merge([0,2,0,2]).line)==='[4,0,0,0]','Gap compression');});
 await test('2048 interaction and persistence',()=>{A.open('games','2048');const before=[...d.querySelectorAll('.tile-2048')].map(c=>+c.dataset.value).reduce((a,b)=>a+b,0);for(const dir of ['left','up','right','down'])click(`[data-action="move2048"][data-value="${dir}"]`);const after=[...d.querySelectorAll('.tile-2048')].map(c=>+c.dataset.value).reduce((a,b)=>a+b,0);assert(after>before,'Moves did not spawn tiles');assert(A.load('2048state',null),'Board not saved');click('[data-action="undo2048"]');assert(d.querySelectorAll('.tile-2048').length===16,'Undo broke board');});
 await test('Snake start, pause and teardown',async()=>{A.open('games','snake');click('[data-action="snakeToggle"]');assert(d.querySelector('#snake-toggle').textContent.includes('一時停止'),'Snake not started');await delay(160);click('[data-action="snakeToggle"]');assert(d.querySelector('#snake-toggle').textContent.includes('スタート'),'Snake not paused');A.home();assert(A.current===null,'Snake teardown');});
 await test('Memory mismatch locks and conceals cards',async()=>{A.open('games','memory');assert(d.querySelectorAll('.memory-card').length===16,'Card count');click('[data-action="memoryFlip"][data-index="0"]');assert(d.querySelector('[data-index="0"]').classList.contains('flipped'),'Card not revealed');click('[data-action="memoryFlip"][data-index="1"]');assert(d.querySelector('#memory-moves').textContent==='1','Move count');await delay(900);assert(d.querySelectorAll('.memory-card.flipped').length===0||d.querySelectorAll('.memory-card.matched').length===2,'Cards stuck open');});
 await test('Recent apps deduplicate and cap at eight',()=>{A.recentApps=[];Object.keys(A.apps).slice(0,10).forEach(id=>A.open(id));A.open('notes');A.open('notes');assert(A.recentApps.length===8,'History cap');assert(A.recentApps[0]==='notes','Most recent ordering');assert(new Set(A.recentApps).size===8,'Duplicate history');});
 await test('Recent apps preserve active editor and switch safely',()=>{A.open('calendar');A.open('notes');click('[data-action="noteNew"]');input('#note-title','QA recent editor');const editor=d.querySelector('#note-title');A.recents();click('[data-action="recentOpen"][data-id="notes"]');assert(d.querySelector('#note-title')===editor,'Current editor was recreated');A.recents();click('[data-action="recentOpen"][data-id="calendar"]');assert(A.current==='calendar','App switch failed');assert(d.querySelector('#overlay').hidden,'Overlay still open');});
 await test('Recent history removal and empty state',()=>{A.recents();click('[data-action="recentRemove"][data-id="calendar"]');assert(!A.recentApps.includes('calendar'),'History removal failed');assert(A.current==='calendar','Removing history must not close current app');click('[data-action="recentClear"]');assert(d.querySelector('.switcher-empty'),'No empty state');assert(A.recentApps.length===0,'History not cleared');});
 await test('Lock screen does not reveal recent apps',()=>{A.lock();A.recents();assert(d.querySelector('#overlay').hidden,'Recent apps shown on lock');A.home();});
 await test('Home weather uses selected forecast and timestamp',async()=>{A.open('weather');A.actions.weatherSelect({dataset:{value:'2'}});await until(()=>A.weatherSnapshot().temp===23);A.home();assert(d.querySelector('.widget-top').textContent.includes('札幌'),'Wrong city');assert(d.querySelector('.weather-widget>strong').textContent==='23°','Wrong temperature');assert(d.querySelector('.weather-widget').textContent.includes('更新'),'Missing timestamp');assert(!d.querySelector('.weather-widget').textContent.includes('サンプル'),'Still sample weather');});
 await test('Home agenda is live, escaped, and opens today',()=>{A.open('calendar');A.actions.calendarToday();click('[data-action="calendarAdd"]');const form=d.querySelector('#modal-form');form.elements.title.value='QA <b>today</b>';form.elements.time.value=new w.Date().toTimeString().slice(0,5);form.dispatchEvent(new w.Event('submit',{bubbles:true,cancelable:true}));A.home();assert(d.querySelector('.widget-event>span').textContent==='QA <b>today</b>','Upcoming event absent');assert(!d.querySelector('.widget-event b'),'Unsafe event markup');A.open('calendar');A.actions.calendarMove({dataset:{value:'1'}});A.home();click('.calendar-widget');assert(d.querySelector('.calendar-agenda').textContent.includes('QA <b>today</b>'),'Widget did not open today');});
 await test('Profile greeting renders plain text',()=>{A.save('profileName','<b>QA</b>');A.home();assert(d.querySelector('.greeting-note').textContent.includes('<b>QA</b>'),'Name not synced');assert(!d.querySelector('.greeting-note b'),'Unsafe profile markup');});
 await test('Unsupported fullscreen has useful guidance',async()=>{const descriptor=Object.getOwnPropertyDescriptor(d,'fullscreenEnabled');try{Object.defineProperty(d,'fullscreenEnabled',{configurable:true,value:false});await A.actions.fullscreen();assert(d.querySelector('.fullscreen-help'),'No fullscreen guidance');}finally{if(descriptor)Object.defineProperty(d,'fullscreenEnabled',descriptor);else delete d.fullscreenEnabled;}});
 await test('Viewport coverage, dock reachability, and short-screen scrolling',async()=>{A.home();const originalStyle=frame.getAttribute('style');try{for(const [width,height] of [[320,568],[360,640],[390,844],[412,740],[430,932],[844,390],[980,1742],[1440,900]]){frame.style.width=width+'px';frame.style.height=height+'px';await delay(50);const screen=d.querySelector('#phone-screen').getBoundingClientRect(),dock=d.querySelector('#home-dock').getBoundingClientRect();assert(Math.abs(screen.width-w.innerWidth)<1&&Math.abs(screen.height-w.innerHeight)<1,'Not edge-to-edge '+width);assert(dock.bottom<=w.innerHeight&&dock.top>0,'Dock clipped '+width);assert(d.body.scrollWidth<=w.innerWidth,'Horizontal overflow '+width);assert(w.getComputedStyle(d.querySelector('.site-header')).display==='none','Landing page visible');const main=d.querySelector('.home-main');main.scrollTop=main.scrollHeight;const last=d.querySelector('#app-grid .app-launcher:last-child').getBoundingClientRect();assert(last.bottom<=main.getBoundingClientRect().bottom+1,'Last app unreachable '+width);}}finally{if(originalStyle===null)frame.removeAttribute('style');else frame.setAttribute('style',originalStyle);}});
 await test('Library groups contain every app and filter by English ID',()=>{
  A.home();A.library();
  const ids=new Set([...d.querySelectorAll('.library-category [data-app]')].map(el=>el.dataset.app));
  assert(ids.size===30,'Missing library apps');input('#library-query','CALCULATOR');
  assert(d.querySelectorAll('#library-results .app-launcher').length===1,'Library filter');
  click('#library-results [data-app="calculator"]');assert(A.current==='calculator','Library launch');
 });
 await test('Home edit swaps icons across dock and persists unique order',()=>{
  A.home();A.actions.editHome();click('#app-grid [data-app="calendar"]');click('#home-dock [data-app="messages"]');
  assert(A.current===null,'Editing launched app');assert(d.querySelector('#app-grid [data-app="messages"]'),'Swap failed');
  const order=A.load('homeOrder',[]);assert(order[0]==='messages'&&order[28]==='calendar','Order not saved');
  assert(new Set(order).size===30,'Duplicate app');A.actions.finishEditing();A.renderHome();
  assert(d.querySelector('#app-grid .app-launcher').dataset.app==='messages','Render lost order');
  A.actions.resetLayout();click('#confirm-yes');assert(A.load('homeOrder',[])[0]==='calendar','Reset failed');
 });
 await test('Home action leaves editing mode',()=>{
  A.home();A.actions.editHome();A.home();assert(!d.querySelector('#home-screen').classList.contains('home-editing'),'Editing stuck');
  click('#app-grid [data-app="notes"]');assert(A.current==='notes','Home launcher still intercepted');
 });
 await test('Long-press context quick action opens a new note',()=>{
  A.home();A.actions.appContext({dataset:{id:'notes'}});click('[data-action="quickLaunch"]');
  assert(A.current==='notes'&&d.querySelector('#note-title'),'Quick note missing');
 });
 await test('Six wallpapers and three icon styles persist',()=>{
  A.home();A.actions.personalize();assert(d.querySelectorAll('.wallpaper-pick').length===6,'Wallpaper count');
  click('[data-action="chooseWallpaper"][data-value="aurora"]');assert(A.load('settings',{}).wallpaper==='aurora','Wallpaper save');
  assert(d.querySelector('#wallpaper').classList.contains('aurora'),'Wallpaper not applied');
  click('[data-action="chooseIconStyle"][data-value="glass"]');assert(d.querySelector('#phone-screen').dataset.iconStyle==='glass','Style not applied');
  assert(A.load('settings',{}).iconStyle==='glass','Style not saved');
  A.settings.wallpaper='default';A.settings.iconStyle='standard';A.applySettings();
 });
 await test('Search finds seeded notes and safely opens saved content',()=>{
  A.spotlight();input('#spotlight-query','買いもの');assert(d.querySelector('[data-action="searchNote"]'),'Seeded note not indexed');
  input('#spotlight-query','QA <b>safe</b>');assert(d.querySelector('[data-action="searchNote"]'),'Saved note not indexed');
  assert(!d.querySelector('#spotlight-content b'),'Search injected HTML');click('[data-action="searchNote"]');
  assert(d.querySelector('#note-title').value==='QA <b>safe</b>','Search opened wrong note');
 });
 await test('Search finds reminders and displays an empty state',()=>{
  A.spotlight();input('#spotlight-query','QA reminder');assert(d.querySelector('#spotlight-content [data-app="reminders"]'),'Reminder not indexed');
  input('#spotlight-query','not-a-real-app-123');assert(d.querySelector('.search-empty'),'Missing search empty state');
 });
 await test('Notifications escape text, persist, and dismiss individually',()=>{
  A.actions.clearNotifications();click('#confirm-yes');A.closeOverlay();A.settings.focus=false;
  A.notify({app:'mail',title:'<b>QA notice</b>',body:'<img src=x onerror=alert(1)>'});
  assert(A.load('notifications',[]).length===1,'Notice not stored');assert(d.querySelector('#notification-banner'),'Missing banner');
  assert(!d.querySelector('#notification-banner img,#notification-banner b'),'Notification HTML injection');
  A.notifications();click('#overlay [data-action="dismissNotice"]');assert(A.load('notifications',[]).length===0,'Dismiss not saved');
  assert(d.querySelector('.notification-empty'),'No notification empty state');
 });
 await test('Focus silences banners without dropping notifications',()=>{
  A.closeOverlay();A.settings.focus=true;A.applySettings();A.notify({app:'mail',title:'Focus test',body:'Quietly saved'});
  assert(!d.querySelector('#notification-banner'),'Focus showed banner');assert(A.load('notifications',[]).length===1,'Focus lost notice');
  assert(!d.querySelector('#status-focus').hidden,'Focus status missing');
  A.settings.focus=false;A.applySettings();A.actions.clearNotifications();click('#confirm-yes');
 });
 await test('Message typing and background reply notify and deep-link',async()=>{
  A.open('messages','haru');const form=d.querySelector('#chat-form');form.elements.message.value='QA background reply';
  form.dispatchEvent(new w.Event('submit',{bubbles:true,cancelable:true}));
  assert(d.querySelector('.typing-indicator'),'Typing feedback missing');assert(d.querySelector('.bubble-time'),'Message time missing');
  A.home();await delay(1450);
  const notice=A.load('notifications',[]).find(n=>n.app==='messages'&&n.arg==='haru');assert(notice,'Reply not connected to notifications');
  A.notifications();click(`#overlay [data-action="openNotice"][data-id="${notice.id}"]`);
  assert(A.current==='messages'&&d.querySelector('.app-nav').textContent.includes('陽'),'Notice opened wrong chat');
  assert(!d.querySelector('.typing-indicator'),'Typing indicator stuck');assert(A.load('chatUnread',{}).haru===0,'Chat remains unread');
 });
 await test('Notifications are bounded and clear updates the lock screen',()=>{
  A.settings.focus=true;for(let i=0;i<105;i++)A.notify({app:'mail',title:'Notice '+i,body:'QA'});
  assert(A.load('notifications',[]).length===100,'Unbounded history');A.lock();
  assert(d.querySelectorAll('.lock-notifications .system-notification').length===2,'Lock history count');
  A.actions.clearNotifications();click('#confirm-yes');assert(A.load('notifications',[]).length===0,'Clear not persisted');
  assert(!d.querySelector('.lock-notifications .system-notification'),'Lock notifications stale');A.settings.focus=false;A.applySettings();A.home();
 });
 await test('Analog icon hands and simulated connection status update',()=>{
  A.home();A.updateSystem();assert(d.querySelector('.app-clock-second')?.getAttribute('transform').startsWith('rotate('),'Clock hands missing');
  A.settings.airplane=true;A.settings.wifi=false;A.applySettings();
  assert(!d.querySelector('#status-airplane').hidden,'Airplane indicator');assert(d.querySelector('#status-controls').getAttribute('aria-label').includes('オフ'),'Wi-Fi state label');
  A.settings.airplane=false;A.settings.wifi=true;A.applySettings();
 });
 await test('Lock media controls reflect selected music without unlocking',()=>{
  A.open('music','player');A.lock();A.updateSystem();assert(!d.querySelector('#lock-player').hidden,'Lock player missing');
  const old=A.music.track.id;click('#lock-player [data-action="musicNext"]');A.updateSystem();
  assert(A.music.track.id!==old,'Lock next track failed');assert(d.querySelector('#lock-track-title').textContent===A.music.track.title,'Lock title stale');
  assert(A.locked,'Media action unlocked screen');A.home();
 });
 await test('Overlay traps keyboard focus and restores opener',()=>{
  A.home();const opener=d.querySelector('#home-search');opener.focus();opener.click();
  const overlay=d.querySelector('#overlay');assert(overlay.getAttribute('role')==='dialog','Dialog semantics');
  const items=[...overlay.querySelectorAll('button:not(:disabled),input,textarea,select,a[href]'),...d.querySelectorAll('#toast.visible button')].filter(el=>el.getClientRects().length);
  items.at(-1).focus();items.at(-1).dispatchEvent(new w.KeyboardEvent('keydown',{key:'Tab',bubbles:true,cancelable:true}));
  assert(d.activeElement===items[0],'Focus escaped dialog');A.closeOverlay();assert(d.activeElement===opener,'Focus not restored');
 });
 await test('Common phone heights keep all home icons reachable by scrolling',async()=>{
  A.home();const originalStyle=frame.getAttribute('style');
  try{for(const [width,height] of [[390,844],[412,740],[430,932],[1440,900]]){
   frame.style.width=width+'px';frame.style.height=height+'px';await delay(60);
   const main=d.querySelector('.home-main');main.scrollTop=main.scrollHeight;
   assert(d.querySelector('#app-grid .app-launcher:last-child').getBoundingClientRect().bottom<=main.getBoundingClientRect().bottom+1,'Home icons clipped '+width+'x'+height);
  }}finally{if(originalStyle===null)frame.removeAttribute('style');else frame.setAttribute('style',originalStyle);}
 });
 await test('Long press release does not activate retargeted menu buttons',async()=>{
  A.home();const launcher=d.querySelector('#app-grid [data-app="notes"]');
  launcher.dispatchEvent(new w.PointerEvent('pointerdown',{bubbles:true,button:0,clientX:50,clientY:300}));await delay(600);
  assert(d.querySelector('.context-card'),'Long press missing');
  const action=d.querySelector('#overlay [data-action="quickLaunch"]');
  action.dispatchEvent(new w.MouseEvent('click',{bubbles:true,cancelable:true,detail:1}));
  assert(A.current===null&&!d.querySelector('#overlay').hidden,'Release activated menu');
  action.dispatchEvent(new w.PointerEvent('pointerdown',{bubbles:true,button:0}));action.click();
  assert(A.current==='notes'&&d.querySelector('#note-title'),'Fresh tap was suppressed');
 });
 await test('Clock style selection and lock preview persist',()=>{
  A.home();A.actions.personalize();click('[data-action="chooseClockStyle"][data-value="rounded"]');
  assert(A.load('settings',{}).clockStyle==='rounded','Clock style not saved');
  click('[data-action="previewLock"]');assert(A.locked&&d.querySelector('#phone-screen').dataset.clockStyle==='rounded','Lock style not applied');
  A.settings.clockStyle='classic';A.applySettings();A.home();
 });
 await test('Lock notification preview hides content but restores it when open',()=>{
  A.home();A.settings.focus=true;A.notify({app:'mail',title:'Private sender',body:'Private content'});
  A.actions.personalize();click('[data-action="toggleLockPreview"]');assert(A.load('settings',{}).lockPreview===false,'Preview preference not saved');
  A.lock();assert(!d.querySelector('.lock-notifications').textContent.includes('Private'),'Lock leaked content');
  A.notifications();assert(!d.querySelector('#overlay').textContent.includes('Private'),'Locked center leaked content');
  A.home();A.notifications();assert(d.querySelector('#overlay').textContent.includes('Private content'),'Unlocked center hid content');
  A.settings.focus=false;A.settings.lockPreview=true;A.applySettings();A.actions.clearNotifications();A.home();
 });
 await test('Settings opens complete gesture guide',()=>{
  A.open('settings');click('[data-action="gestureGuide"]');assert(d.querySelectorAll('.gesture-guide article').length===6,'Missing gesture instructions');
  assert(d.querySelector('#overlay').textContent.includes('Alt+Tab'),'Keyboard help missing');
 });
 await test('Native mail prepares encoded draft without claiming delivery',()=>{
  A.open('mail');const f=d.querySelector('#external-mail');f.elements.to.value='qa@example.com';f.elements.subject.value='A&B 日本語';f.elements.body.value='Line 1\nLine 2 & <b>text</b>';submit('#external-mail');
  const a=d.querySelector('#mail-handoff a[href^="mailto:"]');assert(a,'No mailto');assert(new URL(a.href).searchParams.get('subject')==='A&B 日本語','Incorrect encoding');assert(d.querySelector('#mail-handoff').textContent.includes('未送信'),'Delivery misrepresented');click('[data-action="saveExternalDraft"]');assert(A.load('externalMailDraft',{}).to==='qa@example.com','Draft missing');input('#external-mail [name=to]','other@example.com');assert(!d.querySelector('#mail-handoff a'),'Old recipient link persisted');
 });
 await test('Native SMS and WhatsApp validate recipient and preserve text',()=>{
  A.open('messages');const f=d.querySelector('#external-message');f.elements.number.value='+81 90 1234 5678';f.elements.body.value='Hello & 日本語';submit('#external-message');const sms=d.querySelector('a[href^="sms:"]');assert(sms?.getAttribute('href').startsWith('sms:+819012345678'),'Wrong number');assert(decodeURIComponent(sms.getAttribute('href')).includes('Hello & 日本語'),'Body encoding');assert(d.querySelector('a[href^="https://wa.me/819012345678"]'),'Missing WhatsApp');input('#external-message [name=number]','javascript:alert(1)');submit('#external-message');assert(!d.querySelector('#message-handoff a'),'Invalid recipient accepted');
 });
 await test('Native telephone handoff never invokes demo contacts',()=>{
  A.open('phone');assert(!d.querySelector('[data-action="contactCall"]'),'Demo contacts exposed');input('#live-phone-number','+81 3 1234 5678');submit('#external-phone');assert(d.querySelector('a[href="tel:+81312345678"]'),'Wrong tel link');assert(!d.querySelector('.call-screen'),'Invented active call');input('#live-phone-number','12#;evil');submit('#external-phone');assert(!d.querySelector('#phone-handoff a'),'Invalid dial accepted');
 });
 await test('URL protocols and credentials are rejected',()=>{
  for(const url of ['javascript:alert(1)','data:text/html,test','file:///etc/passwd','https://user:pass@example.com'])assert(A.network.safeURL(url)===null,'Unsafe URL accepted');
  A.open('safari');click('[data-action="webHome"]');input('#browser-url','javascript:alert(1)');submit('#web-form');assert(!d.querySelector('#web-preview iframe'),'Unsafe preview');assert(d.querySelector('#toast').textContent.includes('http'),'Missing validation');
 });
 await test('Browser URL preview is sandboxed with an external fallback',()=>{
  input('#browser-url','https://example.com/?a=1&b=2');submit('#web-form');click('[data-action="webPreview"]');const f=d.querySelector('.web-frame');assert(f?.getAttribute('sandbox')&&!f.sandbox.contains('allow-same-origin'),'Unsafe iframe sandbox');assert(d.querySelector('#web-content a[target="_blank"]')?.rel.includes('noopener'),'Unsafe external target');click('[data-action="webBack"]');assert(!d.querySelector('.web-frame'),'Preview remained on back');
 });
 await test('Weather refresh failure explicitly labels cached values',async()=>{
  A.open('weather');await A.actions.weatherRefresh();w.fetch=()=>Promise.resolve(new w.Response('{}',{status:429}));try{await A.actions.weatherRefresh();assert(d.querySelector('#live-weather').textContent.includes('保存データ')||d.querySelector('#live-weather').textContent.includes('最後に取得'),'Cache not explained');assert(A.weatherSnapshot().source.includes('保存データ'),'Widget stale data hidden');assert(d.querySelector('[data-action="weatherRefresh"]'),'Retry unavailable');}finally{w.fetch=fixtureFetch;}
 });
 await test('Weather location denial and late permission response are safe',async()=>{
  A.open('weather');const location=A.network.location;try{A.network.location=()=>Promise.reject(Error('位置情報が許可されていません'));await A.actions.weatherLocate();assert(d.querySelector('#toast').textContent.includes('許可'),'Permission denial missing');let resolve;A.network.location=()=>new Promise(r=>resolve=r);const promise=A.actions.weatherLocate();A.home();resolve({name:'Late',latitude:1,longitude:2});await promise;assert(A.current===null,'Late geolocation reopened weather');}finally{A.network.location=location;}
 });
 await test('Weather city search uses actual results and saves selection',async()=>{
  A.open('weather');click('[data-action="weatherCities"]');input('#city-search input','Test');submit('#city-search');await until(()=>d.querySelector('[data-city-index]'));click('[data-city-index]');await until(()=>d.querySelectorAll('.live-forecast-row').length===7);assert(A.load('weatherLocation',{}).name==='Test City','Selected location not saved');
 });
 await test('Service timeout is reported without infinite loading',async()=>{
  w.fetch=(url,{signal})=>new Promise((resolve,reject)=>signal.addEventListener('abort',()=>reject(new w.DOMException('Aborted','AbortError')),{once:true}));try{let message='';try{await A.network.request('https://example.test/',{timeout:10});}catch(e){message=e.message;}assert(/タイムアウト|通信時間切れ/.test(message),'No timeout message');}finally{w.fetch=fixtureFetch;}
 });
 await test('Music catalogue escapes titles and does not autoplay previews',async()=>{
  A.open('music');input('#music-search input','Test');submit('#music-search');await until(()=>d.querySelector('.connected-track'));assert(!d.querySelector('.connected-track b'),'Unsafe title');const audio=d.querySelector('.connected-track audio');assert(audio&&audio.paused&&!audio.autoplay,'Unrequested playback');A.home();assert(!audio.getAttribute('src'),'Audio not released on exit');
 });
 await test('Currency conversion uses dated rate and handles identical currency',async()=>{
  A.open('calculator');A.actions.currencyOpen();input('#currency-form [name=amount]','2');submit('#currency-form');await until(()=>d.querySelector('#currency-result h2'));assert(d.querySelector('#currency-result').textContent.includes('300 JPY'),'Wrong conversion');assert(d.querySelector('#currency-result').textContent.includes('2026-09-18'),'Missing rate date');d.querySelector('#currency-form [name=quote]').value='USD';submit('#currency-form');assert(d.querySelector('#currency-result').textContent.includes('同じ通貨'),'Same-currency handling');
 });
 await test('Calculator shortcuts do not intercept currency input',()=>{const field=d.querySelector('#currency-form [name=amount]');field.focus();const key=new w.KeyboardEvent('keydown',{key:'2',bubbles:true,cancelable:true});field.dispatchEvent(key);assert(!key.defaultPrevented,'Calculator intercepted currency input');});
 await test('Calendar exports real events as RFC5545 UTF8 and Google links',async()=>{
  A.open('calendar');A.actions.calendarExchange();assert(d.querySelector('a[href^="https://calendar.google.com/"]'),'Google creation missing');const download=A.download;let blob,name;A.download=(b,n)=>{blob=b;name=n;};try{A.actions.calendarICS();const text=await blob.text();assert(name.endsWith('.ics')&&text.includes('BEGIN:VEVENT'),'ICS absent');assert(text.includes('QA calendar event'),'Events lost');assert(text.split('\r\n').every(line=>new TextEncoder().encode(line).length<=75),'Invalid folding');}finally{A.download=download;}
 });
 await test('Reminders export VTODO instead of fabricated synchronization',async()=>{
  A.open('reminders');const download=A.download;let blob;A.download=b=>blob=b;try{A.actions.exportReminders();const text=await blob.text();assert(text.includes('BEGIN:VTODO')&&text.includes('QA reminder'),'Tasks missing');}finally{A.download=download;}
 });
 await test('Notes sharing uses edited text only when editor is active',()=>{
  A.open('notes');click('[data-action="noteNew"]');input('#note-title','Share title');input('#note-body','Private body');const share=A.network.share;let values;A.network.share=(...args)=>values=args;try{A.actions.shareNotes();assert(values[0]==='Share title'&&values[1]==='Private body','Wrong share payload');}finally{A.network.share=share;}
 });
 await test('URL file import accepts bounded text and persists contents',async()=>{
  A.open('files');A.actions.fileURLImport();w.fetch=()=>Promise.resolve(new w.Response('Remote text <b>safe</b>',{headers:{'Content-Type':'text/plain'}}));try{input('#remote-file [name=url]','https://example.test/document.txt');submit('#remote-file');await until(()=>d.querySelector('#remote-file-status').textContent.includes('保存しました'));assert(A.load('files',[]).some(f=>f.content==='Remote text <b>safe</b>'),'Remote file absent');}finally{w.fetch=fixtureFetch;}
 });
 await test('URL import rejects oversized and HTML responses',async()=>{
  for(const [body,type,expected] of [['<html>bad</html>','text/html','形式'],['x'.repeat(102401),'text/plain','100KB']]){A.open('files');A.actions.fileURLImport();w.fetch=()=>Promise.resolve(new w.Response(body,{headers:{'Content-Type':type}}));try{input('#remote-file [name=url]','https://example.test/file.txt');submit('#remote-file');await until(()=>d.querySelector('#remote-file-status').textContent.includes(expected));}finally{w.fetch=fixtureFetch;}}
 });
 await test('Binary sharing offers explicit save without automatic upload',()=>{
  A.network.offerFile(new w.Blob(['test'],{type:'text/plain'}),'qa.txt');assert(d.querySelector('#save-ready'),'Save fallback missing');assert(d.querySelector('#overlay').textContent.includes('選択後に共有'),'Consent explanation absent');
 });
 await test('Connection center covers all apps and labels unconnected services',()=>{
  A.open('settings');A.actions.connectionCenter();assert(d.querySelectorAll('#overlay [data-app]').length===30,'Missing app capability');assert(d.querySelector('#overlay').textContent.includes('実決済未接続'),'Payments misrepresented');assert(A.mailUnread()===0&&A.messageUnread()===0,'Fake native unread badges');
 });
 // Settings diagnostics must remain opt-in, bounded, private and recoverable.
 const stToggle=key=>click(`[data-action="stToggle"][data-key="${key}"]`);
 const stSelect=(key,value)=>{const el=d.querySelector(`[data-st-select="${key}"]`);el.value=value;el.dispatchEvent(new w.Event('change',{bubbles:true}));};
 const diagnosticReport=async()=>{const download=A.download;let blob;A.download=b=>blob=b;try{A.actions.stExportDiagnostics();return JSON.parse(await blob.text());}finally{A.download=download;}};
 await test('Settings search and home navigation',()=>{
  A.open('settings');assert(d.querySelectorAll('#st-results .list-row').length===18,'Missing setting entries');
  input('#st-search','ＦＰＳ');assert(d.querySelectorAll('#st-results .list-row').length===1,'Normalized search failed');
  input('#st-search','<img src=x onerror=alert(1)>');assert(d.querySelector('#st-results .st-empty'),'No empty state');assert(!d.querySelector('#st-results img'),'Search injection');
  input('#st-search','');click('#app-screen .app-nav [data-action="home"]');assert(A.current===null,'Settings back did not go home');
 });
 await test('Readability applies size, weight and contrast immediately',()=>{
  A.open('settings');click('[data-action="stAccessibility"]');stSelect('textSize','largest');stToggle('boldText');stToggle('highContrast');stToggle('reduceTransparency');
  const style=w.getComputedStyle(d.querySelector('.st-toggle strong'));assert(style.fontSize==='18px'&&style.fontWeight==='700','Text settings not applied');assert(style.color==='rgb(41, 33, 49)','Contrast not applied');
  assert(A.load('settings',{}).textSize==='largest','Size not saved');
  A.settings.dark=true;A.applySettings();assert(w.getComputedStyle(d.querySelector('.st-toggle strong')).color==='rgb(255, 255, 255)','Dark contrast incorrect');A.settings.dark=false;A.applySettings();
 });
 await test('Failed settings writes do not change state or controls',()=>{
  const save=A.save,before=A.settings.boldText;A.save=()=>false;
  try{stToggle('boldText');assert(A.settings.boldText===before,'Failed write applied');assert(d.querySelector('[data-key="boldText"]').getAttribute('aria-pressed')===String(before),'Failed write changed UI');stSelect('textSize','large');assert(d.querySelector('[data-st-select="textSize"]').value==='largest','Failed select not restored');}finally{A.save=save;}
 });
 await test('Home visibility preserves app accessibility labels',()=>{
  A.actions.stHome();stToggle('hideLabels');stToggle('hideWidgets');A.home();
  assert(w.getComputedStyle(d.querySelector('.home-widgets')).display==='none','Widgets still visible');
  assert(w.getComputedStyle(d.querySelector('.app-name')).visibility==='hidden','App name still visible');
  assert(d.querySelector('.app-launcher').getAttribute('aria-label'),'Accessible launcher label removed');
 });
 await test('Clock preferences survive live ticks',async()=>{
  A.open('settings');A.actions.stHome();stToggle('clock12');stToggle('clockSeconds');
  const before=d.querySelector('#status-time').textContent;await delay(1600);
  const after=d.querySelector('#status-time').textContent;assert(after!==before,'Seconds not ticking');assert(/\d+:\d+:\d+/.test(after),'Seconds disappeared');assert(/午前|午後/.test(after),'12-hour format disappeared');
 });
 await test('Volume and browser preferences share existing app state',()=>{
  A.actions.stSound();input('#st-volume','23');assert(A.settings.volume===23&&A.load('settings',{}).volume===23,'Volume not saved');
  A.actions.stConnection();stSelect('webEngine','duck');assert(A.load('webEngine','')==='duck','Engine not saved');stToggle('airplane');assert(A.settings.airplane&&!A.settings.cellular,'Airplane demo did not disable cellular');A.save('webEngine','wiki');
 });
 await test('Developer tools require explicit confirmation',()=>{
  A.actions.stDeveloper();assert(!A.settings.developerMode,'Developer default unsafe');assert(!d.querySelector('[data-key="devFps"]'),'Tools exposed before opt in');
  A.actions.stToggle({dataset:{key:'devFps'}});assert(!A.settings.devFps,'Bypassed disabled tools');
  click('[data-action="stDeveloperToggle"]');click('#overlay [data-action="closeOverlay"]');assert(!A.settings.developerMode,'Cancel enabled tools');
  click('[data-action="stDeveloperToggle"]');click('#confirm-yes');assert(A.settings.developerMode&&!A.settings.devLog,'Opt in did not keep tools off');
 });
 await test('Developer overlays and switch scroll retention',async()=>{
  stToggle('devFps');stToggle('devBounds');stToggle('devTouches');await delay(1200);assert(/\d+ FPS/.test(d.querySelector('#st-fps').textContent),'FPS not sampled');
  assert(d.querySelector('#phone-screen').classList.contains('st-dev-bounds'),'Bounds not enabled');
  const screen=d.querySelector('#phone-screen');screen.dispatchEvent(new w.PointerEvent('pointerdown',{bubbles:true,clientX:40,clientY:100}));assert(d.querySelector('.st-touch'),'Touch marker missing');
  screen.dispatchEvent(new w.PointerEvent('pointerup',{bubbles:true,clientX:40,clientY:100}));await delay(650);assert(!d.querySelector('.st-touch'),'Touch marker retained');
  d.querySelector('.st-settings').scrollTop=300;const before=d.querySelector('.st-settings').scrollTop;stToggle('devLog');assert(Math.abs(d.querySelector('.st-settings').scrollTop-before)<2,'Switch reset scroll');
 });
 await test('API diagnostics record only bounded sanitized metadata',async()=>{
  w.fetch=()=>json({secret:'PRIVATE_RESPONSE'});
  try{
   for(let i=0;i<32;i++)await A.network.request('https://private-user.example.test/PRIVATE_PATH?token=PRIVATE_TOKEN');
   const report=await diagnosticReport();assert(report.requests.length===30,'Log limit missing');const text=JSON.stringify(report);assert(!/PRIVATE|private-user|aura.notes/.test(text),'Private data leaked');assert(report.requests.every(r=>r.service==='その他のAPI'&&r.result==='成功'&&r.ms>=0),'Wrong metadata');
  }finally{w.fetch=fixtureFetch;}
 });
 await test('API simulation prevents fetch and can be released globally',async()=>{
  A.actions.stOffline();const before=requests.length;let message='';try{await A.network.request('https://api.open-meteo.com/v1/forecast');}catch(e){message=e.message;}
  assert(message.includes('開発者設定')&&requests.length===before,'Simulated request sent');assert(d.querySelector('#st-offline-warning'),'No persistent warning');
  A.home();click('#st-offline-warning');assert(!d.querySelector('#st-offline-warning'),'Warning not removed');await A.network.request('https://api.open-meteo.com/v1/forecast');assert(requests.length===before+1,'Request did not recover');
 });
 await test('Clearing logs discards in-flight records',async()=>{
  let finish;w.fetch=()=>new Promise(resolve=>finish=()=>resolve(new w.Response('{}')));
  try{const pending=A.network.request('https://example.test/');A.actions.stClearLogs();finish();await pending;assert((await diagnosticReport()).requests.length===0,'Cleared in-flight request returned to log');}finally{w.fetch=fixtureFetch;}
 });
 await test('Test notification and developer shutdown are safe',async()=>{
  A.open('settings');A.actions.stDeveloper();A.actions.stTestNotice();assert(A.load('notifications',[]).some(n=>n.app==='settings'&&n.demo),'No labeled demo notification');
  A.actions.stOffline();click('[data-action="stDeveloperToggle"]');assert(!A.settings.developerMode,'Mode did not turn off');assert(!d.querySelector('#st-fps,#st-offline-warning,.st-touch'),'Diagnostics survived shutdown');assert(!d.querySelector('#phone-screen').classList.contains('st-dev-bounds'),'Bounds survived shutdown');
  for(const k of ['devFps','devBounds','devTouches','devLog'])assert(!A.settings[k],'Tool flag retained');
  await A.network.request('https://api.open-meteo.com/v1/forecast');
 });
 await test('Additional settings reset preserves user records and existing preferences',()=>{
  const notes=w.localStorage.getItem('aura.notes'),wallpaper=A.settings.wallpaper,brightness=A.settings.brightness;
  A.actions.stReset();click('#overlay [data-action="closeOverlay"]');assert(A.settings.textSize==='largest','Cancel reset settings');
  A.actions.stReset();click('#confirm-yes');assert(A.settings.textSize==='standard'&&!A.settings.hideWidgets&&!A.settings.clockSeconds,'Reset incomplete');assert(w.localStorage.getItem('aura.notes')===notes,'Reset deleted notes');assert(A.settings.wallpaper===wallpaper&&A.settings.brightness===brightness,'Reset affected prior settings');
 });
 await test('App lifecycle cleanup and no captured errors',()=>{A.home();assert(A.cleanups.length===0,'Cleanup callbacks not drained');assert(!errors.length,errors.join('; '));});

 A.music.pause();A.home();w.fetch=nativeFetch;
 Object.keys(w.localStorage).filter(k=>k.startsWith('aura.')).forEach(k=>w.localStorage.removeItem(k));Object.entries(original).forEach(([k,v])=>w.localStorage.setItem(k,v));
 log(`RESULT: ${passed} passed, ${failed} failed.`);document.body.dataset.testComplete='true';
});
})();
