'use strict';
// Exploratory behaviour probes used during the 4.7.4 sweep. Prints results; not an assertion suite.
// Run: python3 -m http.server 8765 & node tests/probe.cjs   (P=<substring> to filter)
const {chromium}=require('playwright');
const probes=[];const probe=(name,fn)=>probes.push({name,fn});
const submit=(p,values)=>p.evaluate(values=>{const f=document.querySelector('#modal-form');for(const [k,v] of Object.entries(values))f.elements[k].value=v;f.requestSubmit();},values);
const calc=(p,keys)=>p.evaluate(keys=>{Aura.open('calculator');const k=v=>Aura.actions.calcKey({dataset:{value:v}});k('clear');keys.forEach(k);return document.querySelector('#calc-result').textContent+' | '+document.querySelector('#calc-expression').textContent;},keys);

probe('calc chain after equals 2+3=×2=',p=>calc(p,['2','+','3','=','*','2','=']));
probe('calc 0.1+0.2',p=>calc(p,['0','.','1','+','0','.','2','=']));
probe('calc 5==',p=>calc(p,['5','=','=']));
probe('calc 9/0 then 3',p=>calc(p,['9','/','0','=','3']));
probe('calc operator replace 2+×3=',p=>calc(p,['2','+','*','3','=']));
probe('calc big product',p=>calc(p,['9','9','9','9','9','9','9','9','9','*','9','9','9','9','9','9','9','9','9','=']));
probe('calc 5+.=',p=>calc(p,['5','+','.','=']));
probe('calc 3 = 4 (new entry after =)',p=>calc(p,['3','+','1','=','4']));
probe('calc percent alone 50%',p=>calc(p,['5','0','percent']));
probe('converter temp -300C',p=>p.evaluate(()=>{Aura.open('converter');Aura.actions.evUnitCategory({dataset:{id:'temperature'}});const v=document.querySelector('#ep-unit-value');v.value='-300';v.dispatchEvent(new Event('input'));return document.querySelector('#ev-unit-result').textContent;}));
probe('reading progress >total',async p=>{await p.evaluate(()=>{Aura.save('reading',[{id:'b',title:'T',author:'',total:100,page:0}]);Aura.open('reading');Aura.actions.evBookProgress({dataset:{id:'b'}});});await submit(p,{page:'150'});return JSON.stringify(await p.evaluate(()=>Aura.load('reading')));});
probe('notes search literal null tags',p=>p.evaluate(()=>{Aura.noteModel.replace([{id:'a',title:'x',body:'y',updated:1}]);Aura.open('notes');const s=document.querySelector('#notes-search');s.value='undefined';s.dispatchEvent(new Event('input'));return document.querySelector('#notes-count').textContent;}));
probe('calendar month move from Jan31',p=>p.evaluate(()=>{Aura.open('calendar');Aura.actions.calendarSelect({dataset:{date:'2027-01-31'}});Aura.actions.calendarMove({dataset:{value:'1'}});return document.querySelector('.calendar-month-head h3').textContent;}));
probe('mail demo reply twice subject',p=>p.evaluate(()=>{Aura.actions.mailDemo();Aura.actions.mailOpen({dataset:{id:'mail-1'}});Aura.actions.mailReply();return document.querySelector('#mail-compose [name=subject]').value+' / to='+document.querySelector('#mail-compose [name=to]').value;}));
probe('focus start then pause',p=>p.evaluate(()=>{Aura.open('focus');Aura.actions.evFocusToggle();const a=Aura.focusTimerSnapshot();Aura.actions.evFocusToggle();const b=Aura.focusTimerSnapshot();Aura.actions.evFocusReset();return JSON.stringify([a?.running,b?.running,b?.remaining]);}));
probe('spotlight fullwidth ｃａｌ',p=>p.evaluate(()=>{Aura.home();Aura.spotlight();const q=document.querySelector('#spotlight-query');q.value='ｃａｌ';q.dispatchEvent(new Event('input'));const r=document.querySelectorAll('#spotlight-results .app-launcher').length;Aura.closeOverlay();return r;}));
probe('stopwatch laps',p=>p.evaluate(async()=>{Aura.open('clock','stopwatch');Aura.actions.stopwatchToggle();await new Promise(r=>setTimeout(r,120));Aura.actions.stopwatchLap();await new Promise(r=>setTimeout(r,60));Aura.actions.stopwatchLap();Aura.actions.stopwatchToggle();return [...document.querySelectorAll('.lap-row')].map(x=>x.textContent).join(' | ');}));
probe('weather widget',p=>p.evaluate(()=>{Aura.home();return document.querySelector('.weather-widget').textContent;}));
probe('lock glance weather',p=>p.evaluate(()=>document.querySelector('#lock-glance-weather').textContent));
probe('status 12h',p=>p.evaluate(()=>{Aura.settings.clock12=true;Aura.applySettings();Aura.updateClock();const t=document.querySelector('#status-time').textContent;Aura.settings.clock12=false;Aura.applySettings();return t;}));
probe('expense edit amount 1.5',async p=>{await p.evaluate(()=>{Aura.open('expenses');Aura.actions.evExpenseEdit({dataset:{}});});await submit(p,{amount:'1.5',date:'2026-09-10'});return JSON.stringify(await p.evaluate(()=>[Aura.load('expenses',[]).length,!document.querySelector('#overlay').hidden]));});
probe('habit toggle future day guard',p=>p.evaluate(()=>{Aura.save('habits',[{id:'h',name:'x',days:[]}]);Aura.open('habits');return document.querySelector('[data-action=evHabitDay][data-id="1"]').disabled;}));
probe('contacts avatar for emoji name',async p=>{await p.evaluate(()=>{Aura.save('contacts',[{id:'c',name:'👨‍👩‍👧 家族'}]);Aura.open('contacts');});return p.evaluate(()=>document.querySelector('.ev-avatar').textContent);});
probe('shopping total with qty',p=>p.evaluate(()=>{Aura.save('shopping',[{id:'s',name:'a',quantity:3,price:100,done:false}]);Aura.open('shopping');return document.querySelector('.ev-hero').textContent.replace(/\s+/g,' ');}));
probe('journal count chars emoji',p=>p.evaluate(()=>{Aura.open('journal');Aura.actions.evJournalEdit({dataset:{}});const b=document.querySelector('#ev-journal-body');b.value='😀😀';b.dispatchEvent(new Event('input'));return document.querySelector('#ev-journal-count').textContent;}));
probe('timer label escape',p=>p.evaluate(()=>{Aura.open('clock','timer');return document.querySelector('.tm-dial-label').textContent;}));
probe('recents after open',p=>p.evaluate(()=>{Aura.open('notes');Aura.open('calendar');Aura.home();Aura.recents();const n=document.querySelectorAll('.recent-card').length;Aura.closeOverlay();return n;}));
probe('home order persist dock',p=>p.evaluate(()=>document.querySelectorAll('#home-dock .app-launcher').length));

probe('control timer start/pause/resume',p=>p.evaluate(()=>{Aura.controls();Aura.actions.controlTimerStart({dataset:{minutes:'1'}});Aura.actions.controlTimerPause();const a=Aura.controlTimerSnapshot();Aura.actions.controlTimerPause();const b=Aura.controlTimerSnapshot();Aura.actions.controlTimerReset();Aura.closeOverlay();return JSON.stringify([a.running,a.remaining,b.running]);}));
probe('control scene undo restores warm',p=>p.evaluate(()=>{Aura.settings.warm=false;Aura.controls();Aura.actions.controlScene({dataset:{id:'night'}});const w=Aura.settings.warm;document.querySelector('#toast button')?.click();const r=[w,Aura.settings.warm,Aura.settings.dark];Aura.closeOverlay();return JSON.stringify(r);}));
probe('notify + open marks read',p=>p.evaluate(()=>{Aura.notify({app:'clock',title:'t1',body:'b'});Aura.notifications();const n=document.querySelectorAll('.notice-card').length;Aura.closeOverlay();return n;}));
probe('wallet pay insufficient',async p=>{await p.evaluate(()=>{Aura.save('wallet',{balance:100,transactions:[]});});await p.reload();await p.waitForTimeout(300);await p.evaluate(()=>{Aura.open('wallet');Aura.actions.walletPay();});await submit(p,{item:'coffee'});return p.evaluate(()=>[Aura.load('wallet').balance,!document.querySelector('#overlay').hidden].join());});
probe('profile name greeting',async p=>{await p.evaluate(()=>{Aura.open('settings');Aura.actions.settingsProfile();});await submit(p,{name:'  花子 '});return p.evaluate(()=>{Aura.home();return document.querySelector('.greeting-note').textContent;});});
probe('home edit swap persists',p=>p.evaluate(()=>{Aura.home();Aura.actions.editHome();const [a,b]=[...document.querySelectorAll('#app-grid .app-launcher')].slice(0,2);a.click();b.click();Aura.actions.finishEditing();return Aura.load('homeOrder',[]).slice(0,2).join();}));
probe('recents remove current app',p=>p.evaluate(()=>{Aura.open('notes');Aura.recents();Aura.actions.recentRemove({dataset:{id:'notes'}});const r=document.querySelectorAll('.recent-card').length;Aura.closeOverlay();return r+' current='+Aura.current;}));
probe('files create bad extension',async p=>{await p.evaluate(()=>{Aura.open('files');Aura.actions.fileNew();});await submit(p,{name:'a.exe',content:'x'});return p.evaluate(()=>!document.querySelector('#overlay').hidden);});
probe('notes new then back empty note kept?',p=>p.evaluate(()=>{const n=Aura.noteModel.get().length;Aura.open('notes');Aura.actions.noteNew();Aura.actions.noteList();return (Aura.noteModel.get().length-n)+' added';}));
probe('reminder add via form',p=>p.evaluate(()=>{Aura.open('reminders');const f=document.querySelector('#reminder-form');f.elements.text.value='  テスト  ';f.requestSubmit();return Aura.reminderModel.get().some(r=>r.text==='テスト');}));
probe('habit goal>7 via edit',async p=>{await p.evaluate(()=>{Aura.open('habits');Aura.actions.evHabitEdit({dataset:{}});});await submit(p,{name:'x',goal:'8'});return p.evaluate(()=>!document.querySelector('#overlay').hidden);});
probe('expense budget negative',async p=>{await p.evaluate(()=>{Aura.open('expenses');Aura.actions.evExpenseBudget();});await submit(p,{total:'-5',food:'0',daily:'0',travel:'0',fun:'0',fixed:'0',other:'0'});return p.evaluate(()=>JSON.stringify(Aura.load('expenseBudgets',{})));});
probe('reading goal 0',async p=>{await p.evaluate(()=>{Aura.open('reading');Aura.actions.evReadingGoal();});await submit(p,{goal:'0'});return p.evaluate(()=>Aura.load('readingGoal',12));});
probe('focus settings 0',async p=>{await p.evaluate(()=>{Aura.open('focus');Aura.actions.evFocusSettings();});await submit(p,{work:'0',rest:'5',goal:'10'});return p.evaluate(()=>JSON.stringify(Aura.load('focusPreferences',{})));});
(async()=>{
 const browser=await chromium.launch();
 const ctx=await browser.newContext({viewport:{width:390,height:844}});await ctx.route(/^https?:\/\/(?!127\.0\.0\.1)/,r=>r.abort());
 const p=await ctx.newPage();const errs=[];p.on('pageerror',e=>errs.push(e.message));await p.goto(process.env.AURA_TEST_URL||'http://127.0.0.1:8765/');await p.waitForTimeout(300);
 for(const {name,fn} of probes){if(process.env.P&&!name.includes(process.env.P))continue;try{console.log(name,'=>',await fn(p));}catch(e){console.log(name,'EXC',e.message.split('\n')[0]);}if(errs.length)console.log('  pageerror:',errs.splice(0).join(' || '));await p.evaluate(()=>Aura.closeOverlay());}
 await browser.close();
})();
