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
 await test('20 app registrations and home icons',()=>{assert(Object.keys(A.apps).length===20,'App count');assert(d.querySelectorAll('#app-grid .app-launcher').length===16,'Home icon count');assert(d.querySelectorAll('#home-dock .app-launcher').length===4,'Dock count');Object.values(A.apps).forEach(a=>assert(typeof a.render==='function','Missing renderer '+a.id));});
 for(const id of Object.keys(A.apps))await test('App opens: '+id,()=>{A.open(id);assert(!d.querySelector('#app-screen').hidden,'App hidden');assert(d.querySelector('#app-screen').textContent.trim().length>0,'Empty application');assert(A.current===id,'Wrong current app');const missing=[...d.querySelectorAll('#app-screen [data-action]')].filter(el=>!A.actions[el.dataset.action]);assert(!missing.length,'Missing handlers: '+missing.map(e=>e.dataset.action));});
 await test('Home / lock / unlock',()=>{A.home();A.lock();assert(!d.querySelector('#lock-screen').hidden,'Lock invisible');click('#unlock-button');assert(!d.querySelector('#home-screen').hidden,'Home invisible');});
 await test('Control center brightness and dark mode',()=>{A.controls();input('#control-brightness','75');assert(A.settings.brightness===75,'Brightness');click('[data-action="controlToggle"][data-key="dark"]');assert(d.querySelector('#phone-screen').classList.contains('screen-dark-mode')===A.settings.dark,'Dark mode');A.settings.dark=false;A.settings.brightness=100;A.applySettings();});
 await test('Spotlight filters applications',()=>{A.spotlight();input('#spotlight-query','メモ');assert(d.querySelectorAll('#spotlight-results .app-launcher').length===2,'Expected Notes and Voice Memos');});
 await test('Calculator arithmetic and repeat equals',()=>{A.open('calculator');for(const v of ['clear','1','2','+','7','='])click(`[data-action="calcKey"][data-value="${v}"]`);assert(d.querySelector('#calc-result').textContent==='19','12+7');click('[data-action="calcKey"][data-value="="]');assert(d.querySelector('#calc-result').textContent==='26','Repeat equals');});
 await test('Calculator divide by zero and recovery',()=>{for(const v of ['clear','5','/','0','='])click(`[data-action="calcKey"][data-value="${v}"]`);assert(d.querySelector('#calc-result').textContent==='エラー','Division by zero');click('[data-action="calcKey"][data-value="3"]');assert(d.querySelector('#calc-result').textContent==='3','Error recovery');});
 await test('Notes autosave and safe text rendering',()=>{A.open('notes');click('[data-action="noteNew"]');input('#note-title','QA <b>safe</b>');input('#note-body','A little world.\nRegression note.');A.home();A.open('notes');const notes=A.load('notes',[]);assert(notes.some(n=>n.title==='QA <b>safe</b>'),'Note not stored');const card=[...d.querySelectorAll('.note-card')].find(c=>c.textContent.includes('QA <b>safe</b>'));assert(card,'Escaping failed');assert(!card.querySelector('b'),'Markup injected');});
 await test('Reminder create and toggle',()=>{A.open('reminders');const f=d.querySelector('#reminder-form');f.elements.text.value='QA reminder';f.dispatchEvent(new w.Event('submit',{bubbles:true,cancelable:true}));const item=A.load('reminders',[]).find(r=>r.text==='QA reminder');assert(item,'Reminder not persisted');click(`[data-action="reminderToggle"][data-id="${item.id}"]`);assert(A.load('reminders',[]).find(r=>r.id===item.id).done,'Reminder toggle');});
 await test('Calendar month navigation and event create',()=>{A.open('calendar');const before=d.querySelector('.calendar-month-head h3').textContent;click('[data-action="calendarMove"][data-value="1"]');assert(d.querySelector('.calendar-month-head h3').textContent!==before,'Month unchanged');click('[data-action="calendarAdd"]');const f=d.querySelector('#modal-form');f.elements.title.value='QA calendar event';f.elements.place.value='Local only';f.dispatchEvent(new w.Event('submit',{bubbles:true,cancelable:true}));assert(A.load('events',[]).some(e=>e.title==='QA calendar event'),'Event not saved');});
 await test('Photo gallery and favorite',()=>{A.open('photos');click('[data-action="photoOpen"][data-id="sample-lake"]');assert(d.querySelector('.photo-viewer img'),'Photo missing');click('[data-action="photoFavorite"]');assert(A.load('photoFavorites',[]).includes('sample-lake'),'Favorite not saved');});
 await test('Camera permission is opt-in',()=>{A.open('camera');assert(d.querySelector('#camera-placeholder'),'No permission prompt');assert(!d.querySelector('#camera-video').srcObject,'Camera started without gesture');click('[data-action="cameraCapture"]');assert(d.querySelector('#toast').textContent.includes('先に'),'Missing capture warning');});
 await test('Mail local compose and outbox',()=>{A.open('mail');click('[data-action="mailCompose"]');const f=d.querySelector('#mail-compose');f.elements.to.value='demo@example.com';f.elements.subject.value='QA local mail';f.elements.body.value='This must never be externally sent.';f.dispatchEvent(new w.Event('submit',{bubbles:true,cancelable:true}));assert(A.load('mails',[]).some(m=>m.subject==='QA local mail'&&m.folder==='sent'),'No local outbox mail');});
 await test('Messages send and canned reply',async()=>{A.open('messages','misaki');const f=d.querySelector('#chat-form');f.elements.message.value='QA hello';f.dispatchEvent(new w.Event('submit',{bubbles:true,cancelable:true}));assert(A.load('chats',{}).misaki.at(-1).sent,'Outgoing message');await delay(1450);assert(!A.load('chats',{}).misaki.at(-1).sent,'Demo reply');});
 await test('Browser reader and bookmarks',()=>{A.open('safari');click('[data-action="browserRead"][data-id="slow"]');assert(d.querySelector('.reader-body'),'Reader absent');click('[data-action="browserBookmark"]');assert(A.load('bookmarks',[]).includes('slow'),'Bookmark missing');click('[data-action="browserBookmarks"]');assert(d.querySelector('.browser-article'),'Saved article absent');});
 await test('Map category filter and route',()=>{A.open('maps');click('[data-action="mapCategory"][data-value="公園"]');assert(d.querySelectorAll('.place-row').length===1,'Category filtering');click('.place-row');click('[data-action="mapRoute"]');assert(d.querySelector('#map-route').style.display!=='none','Route missing');});
 await test('Weather city selection',()=>{A.open('weather');click('[data-action="weatherCities"]');click('[data-action="weatherSelect"][data-value="2"]');assert(d.querySelector('.weather-summary h2').textContent==='札幌','City not selected');});
 await test('Music player, track selection, and likes',()=>{A.open('music','player');assert(d.querySelector('.player-art'),'Album missing');const old=A.music.track.id;A.music.select('tide',false);A.apps.music.render('player');assert(A.music.track.id!==old,'Track not changed');click('[data-action="musicLike"]');assert(A.load('musicLikes',[]).includes('tide'),'Music like not saved');});
 await test('Voice recorder permission is opt-in',()=>{A.open('recorder');assert(d.querySelector('.record-button'),'Record control missing');assert(!d.querySelector('.recording'),'Unexpected recording started');});
 await test('Phone offline dial and call history',async()=>{A.open('phone');for(const n of ['1','2','3'])click(`[data-action="dialKey"][data-value="${n}"]`);assert(d.querySelector('#dial-display').textContent==='123','Dialing');click('[data-action="phoneCall"]');assert(d.querySelector('.call-screen').textContent.includes('外部接続なし'),'Missing simulation label');await delay(1100);click('[data-action="phoneEnd"]');assert(A.load('callLog',[]).some(c=>c.number==='123'),'Call log');});
 await test('Stopwatch start, lap, and stop',async()=>{A.open('clock');click('[data-action="clockTab"][data-value="stopwatch"]');click('[data-action="stopwatchToggle"]');await delay(120);click('[data-action="stopwatchLap"]');assert(d.querySelector('.lap-row'),'Lap missing');click('[data-action="stopwatchToggle"]');assert(d.querySelector('#stopwatch-display').textContent!=='00:00.00','Clock did not advance');});
 await test('Timer completes and notifies',async()=>{click('[data-action="clockTab"][data-value="timer"]');input('#timer-minutes','0');input('#timer-seconds','1');click('[data-action="timerToggle"]');await delay(2100);assert(!d.querySelector('#overlay').hidden,'No timer notification');assert(d.querySelector('#overlay').textContent.includes('終了'),'Wrong notification');});
 await test('Health hydration update',()=>{A.open('health');const before=A.load('health',{water:1200}).water;click('[data-action="healthWater"]');assert(A.load('health',{}).water===before+200,'Water update');});
 await test('Wallet demo-only charge and purchase',()=>{A.open('wallet');const before=A.load('wallet',{balance:3240}).balance;click('[data-action="walletCharge"]');d.querySelector('#modal-form').dispatchEvent(new w.Event('submit',{bubbles:true,cancelable:true}));assert(A.load('wallet',{}).balance===before+1000,'Demo charge');click('[data-action="walletPay"]');d.querySelector('#modal-form').dispatchEvent(new w.Event('submit',{bubbles:true,cancelable:true}));assert(A.load('wallet',{}).balance===before+420,'Demo purchase');});
 await test('Text file create and preview',()=>{A.open('files');click('[data-action="fileNew"]');const f=d.querySelector('#modal-form');f.elements.name.value='QA.txt';f.elements.content.value='A little test.';f.dispatchEvent(new w.Event('submit',{bubbles:true,cancelable:true}));const file=A.load('files',[]).find(f=>f.name==='QA.txt');assert(file,'File not saved');click(`[data-action="fileOpen"][data-id="${file.id}"]`);assert(d.querySelector('.file-preview').textContent==='A little test.','File preview');});
 await test('2048 merge rules',()=>{const merge=A.gameMath.mergeLine;assert(JSON.stringify(merge([2,2,2,2]).line)==='[4,4,0,0]','Double merge');assert(merge([2,2,2,2]).gain===8,'Merge score');assert(JSON.stringify(merge([4,4,8,0]).line)==='[8,8,0,0]','Cascade merge occurred');assert(JSON.stringify(merge([0,2,0,2]).line)==='[4,0,0,0]','Gap compression');});
 await test('2048 interaction and persistence',()=>{A.open('games','2048');const before=[...d.querySelectorAll('.tile-2048')].map(c=>+c.dataset.value).reduce((a,b)=>a+b,0);for(const dir of ['left','up','right','down'])click(`[data-action="move2048"][data-value="${dir}"]`);const after=[...d.querySelectorAll('.tile-2048')].map(c=>+c.dataset.value).reduce((a,b)=>a+b,0);assert(after>before,'Moves did not spawn tiles');assert(A.load('2048state',null),'Board not saved');click('[data-action="undo2048"]');assert(d.querySelectorAll('.tile-2048').length===16,'Undo broke board');});
 await test('Snake start, pause and teardown',async()=>{A.open('games','snake');click('[data-action="snakeToggle"]');assert(d.querySelector('#snake-toggle').textContent.includes('一時停止'),'Snake not started');await delay(160);click('[data-action="snakeToggle"]');assert(d.querySelector('#snake-toggle').textContent.includes('スタート'),'Snake not paused');A.home();assert(A.current===null,'Snake teardown');});
 await test('Memory mismatch locks and conceals cards',async()=>{A.open('games','memory');assert(d.querySelectorAll('.memory-card').length===16,'Card count');click('[data-action="memoryFlip"][data-index="0"]');assert(d.querySelector('[data-index="0"]').classList.contains('flipped'),'Card not revealed');click('[data-action="memoryFlip"][data-index="1"]');assert(d.querySelector('#memory-moves').textContent==='1','Move count');await delay(900);assert(d.querySelectorAll('.memory-card.flipped').length===0||d.querySelectorAll('.memory-card.matched').length===2,'Cards stuck open');});
 await test('Recent apps deduplicate and cap at eight',()=>{A.recentApps=[];Object.keys(A.apps).slice(0,10).forEach(id=>A.open(id));A.open('notes');A.open('notes');assert(A.recentApps.length===8,'History cap');assert(A.recentApps[0]==='notes','Most recent ordering');assert(new Set(A.recentApps).size===8,'Duplicate history');});
 await test('Recent apps preserve active editor and switch safely',()=>{A.open('calendar');A.open('notes');click('[data-action="noteNew"]');input('#note-title','QA recent editor');const editor=d.querySelector('#note-title');A.recents();click('[data-action="recentOpen"][data-id="notes"]');assert(d.querySelector('#note-title')===editor,'Current editor was recreated');A.recents();click('[data-action="recentOpen"][data-id="calendar"]');assert(A.current==='calendar','App switch failed');assert(d.querySelector('#overlay').hidden,'Overlay still open');});
 await test('Recent history removal and empty state',()=>{A.recents();click('[data-action="recentRemove"][data-id="calendar"]');assert(!A.recentApps.includes('calendar'),'History removal failed');assert(A.current==='calendar','Removing history must not close current app');click('[data-action="recentClear"]');assert(d.querySelector('.switcher-empty'),'No empty state');assert(A.recentApps.length===0,'History not cleared');});
 await test('Lock screen does not reveal recent apps',()=>{A.lock();A.recents();assert(d.querySelector('#overlay').hidden,'Recent apps shown on lock');A.home();});
 await test('Home weather follows selected sample city',()=>{A.open('weather');A.actions.weatherSelect({dataset:{value:'2'}});A.home();assert(d.querySelector('.widget-top').textContent.includes('札幌'),'Wrong home city');assert(d.querySelector('.weather-widget>strong').textContent==='22°','Wrong temperature');assert(d.querySelector('.weather-widget').textContent.includes('サンプル'),'Missing sample label');});
 await test('Home agenda is live, escaped, and opens today',()=>{A.open('calendar');A.actions.calendarToday();click('[data-action="calendarAdd"]');const form=d.querySelector('#modal-form');form.elements.title.value='QA <b>today</b>';form.elements.time.value=new w.Date().toTimeString().slice(0,5);form.dispatchEvent(new w.Event('submit',{bubbles:true,cancelable:true}));A.home();assert(d.querySelector('.widget-event>span').textContent==='QA <b>today</b>','Upcoming event absent');assert(!d.querySelector('.widget-event b'),'Unsafe event markup');A.open('calendar');A.actions.calendarMove({dataset:{value:'1'}});A.home();click('.calendar-widget');assert(d.querySelector('.calendar-agenda').textContent.includes('QA <b>today</b>'),'Widget did not open today');});
 await test('Profile greeting renders plain text',()=>{A.save('profileName','<b>QA</b>');A.home();assert(d.querySelector('.greeting-note').textContent.includes('<b>QA</b>'),'Name not synced');assert(!d.querySelector('.greeting-note b'),'Unsafe profile markup');});
 await test('Unsupported fullscreen has useful guidance',async()=>{const descriptor=Object.getOwnPropertyDescriptor(d,'fullscreenEnabled');try{Object.defineProperty(d,'fullscreenEnabled',{configurable:true,value:false});await A.actions.fullscreen();assert(d.querySelector('.fullscreen-help'),'No fullscreen guidance');}finally{if(descriptor)Object.defineProperty(d,'fullscreenEnabled',descriptor);else delete d.fullscreenEnabled;}});
 await test('Viewport coverage, dock reachability, and short-screen scrolling',async()=>{A.home();const originalStyle=frame.getAttribute('style');try{for(const [width,height] of [[320,568],[360,640],[390,844],[412,740],[430,932],[844,390],[980,1742],[1440,900]]){frame.style.width=width+'px';frame.style.height=height+'px';await delay(50);const screen=d.querySelector('#phone-screen').getBoundingClientRect(),dock=d.querySelector('#home-dock').getBoundingClientRect();assert(Math.abs(screen.width-w.innerWidth)<1&&Math.abs(screen.height-w.innerHeight)<1,'Not edge-to-edge '+width);assert(dock.bottom<=w.innerHeight&&dock.top>0,'Dock clipped '+width);assert(d.body.scrollWidth<=w.innerWidth,'Horizontal overflow '+width);assert(w.getComputedStyle(d.querySelector('.site-header')).display==='none','Landing page visible');const main=d.querySelector('.home-main');main.scrollTop=main.scrollHeight;const last=d.querySelector('#app-grid .app-launcher:last-child').getBoundingClientRect();assert(last.bottom<=main.getBoundingClientRect().bottom+1,'Last app unreachable '+width);}}finally{if(originalStyle===null)frame.removeAttribute('style');else frame.setAttribute('style',originalStyle);}});
 await test('Library groups contain every app and filter by English ID',()=>{
  A.home();A.library();
  const ids=new Set([...d.querySelectorAll('.library-category [data-app]')].map(el=>el.dataset.app));
  assert(ids.size===20,'Missing library apps');input('#library-query','CALCULATOR');
  assert(d.querySelectorAll('#library-results .app-launcher').length===1,'Library filter');
  click('#library-results [data-app="calculator"]');assert(A.current==='calculator','Library launch');
 });
 await test('Home edit swaps icons across dock and persists unique order',()=>{
  A.home();A.actions.editHome();click('#app-grid [data-app="calendar"]');click('#home-dock [data-app="messages"]');
  assert(A.current===null,'Editing launched app');assert(d.querySelector('#app-grid [data-app="messages"]'),'Swap failed');
  const order=A.load('homeOrder',[]);assert(order[0]==='messages'&&order[18]==='calendar','Order not saved');
  assert(new Set(order).size===20,'Duplicate app');A.actions.finishEditing();A.renderHome();
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
  A.actions.clearNotifications();A.closeOverlay();A.settings.focus=false;
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
  A.settings.focus=false;A.applySettings();A.actions.clearNotifications();
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
  A.settings.focus=true;for(let i=0;i<45;i++)A.notify({app:'mail',title:'Notice '+i,body:'QA'});
  assert(A.load('notifications',[]).length===40,'Unbounded history');A.lock();
  assert(d.querySelectorAll('.lock-notifications .system-notification').length===2,'Lock history count');
  A.actions.clearNotifications();assert(A.load('notifications',[]).length===0,'Clear not persisted');
  assert(!d.querySelector('.lock-notifications .system-notification'),'Lock notifications stale');A.settings.focus=false;A.applySettings();A.home();
 });
 await test('Analog icon hands and simulated connection status update',()=>{
  A.home();A.updateSystem();assert(d.querySelector('.clock-second')?.getAttribute('transform').startsWith('rotate('),'Clock hands missing');
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
  const items=[...overlay.querySelectorAll('button:not(:disabled),input,textarea,select,a[href]')].filter(el=>el.getClientRects().length);
  items.at(-1).focus();items.at(-1).dispatchEvent(new w.KeyboardEvent('keydown',{key:'Tab',bubbles:true,cancelable:true}));
  assert(d.activeElement===items[0],'Focus escaped dialog');A.closeOverlay();assert(d.activeElement===opener,'Focus not restored');
 });
 await test('Common phone heights fit every home icon without scrolling',async()=>{
  A.home();const originalStyle=frame.getAttribute('style');
  try{for(const [width,height] of [[390,844],[412,740],[430,932],[1440,900]]){
   frame.style.width=width+'px';frame.style.height=height+'px';await delay(60);
   const main=d.querySelector('.home-main');main.scrollTop=0;
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
 await test('App lifecycle cleanup and no captured errors',()=>{A.home();assert(A.cleanups.length===0,'Cleanup callbacks not drained');assert(!errors.length,errors.join('; '));});
 A.music.pause();A.home();
 Object.keys(w.localStorage).filter(k=>k.startsWith('aura.')).forEach(k=>w.localStorage.removeItem(k));Object.entries(original).forEach(([k,v])=>w.localStorage.setItem(k,v));
 log(`RESULT: ${passed} passed, ${failed} failed.`);document.body.dataset.testComplete='true';
});
})();
