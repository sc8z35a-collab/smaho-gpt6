'use strict';
(() => {
const A=window.Aura,$=A.$,esc=A.escape,icon=A.icon;
const timeString=s=>`${String(Math.floor(Math.max(0,s)/60)).padStart(2,'0')}:${String(Math.floor(Math.max(0,s)%60)).padStart(2,'0')}`;
// Calculator uses an arithmetic state machine, never eval.
let calc={entry:'0',previous:null,operator:null,fresh:false,expression:'',lastOp:null,lastOperand:null},calcHistory=A.load('calcHistory',[]);
const opLabel={'+':'+','-':'−','*':'×','/':'÷'};
function calcApp(){A.statusTheme(true);$('#app-screen').classList.add('calc-app');A.view(A.nav('計算機',`<button data-action="calcHistory" style="color:#d3ba95" aria-label="計算履歴">${icon('clock')}</button>`)+`<div class="calc-display"><div class="calc-expression" id="calc-expression">${esc(calc.expression)}</div><div class="calc-result" id="calc-result">${esc(calc.entry)}</div></div><div class="calc-keypad">${[['AC','clear','utility'],['+/−','sign','utility'],['%','percent','utility'],['÷','/','operator'],['7','7',''],['8','8',''],['9','9',''],['×','*','operator'],['4','4',''],['5','5',''],['6','6',''],['−','-','operator'],['1','1',''],['2','2',''],['3','3',''],['+','+','operator'],['0','0','zero'],['.','.',''],['=','=','operator']].map(([label,v,c])=>`<button class="calc-key ${c}" data-action="calcKey" data-value="${v}">${label}</button>`).join('')}</div>`);const keydown=e=>{if(A.current!=='calculator'||!$('#overlay').hidden||!$('#calc-result')||e.target.closest('input,textarea,select,[contenteditable="true"]'))return;let v=e.key;if(v==='Enter')v='=';if(v==='Backspace'){e.preventDefault();if(calc.entry==='エラー'){pressCalc('clear');return;}const entry=calc.entry.slice(0,-1);calc.entry=entry&&Number.isFinite(Number(entry))?entry:'0';calc.fresh=false;calc.lastOp=null;calc.lastOperand=null;if(!calc.operator)calc.expression='';updateCalc();return;}if(v==='Delete')v='clear';if('0123456789.+-*/='.includes(v)||v==='clear'){e.preventDefault();pressCalc(v);}};document.addEventListener('keydown',keydown);A.cleanups.push(()=>document.removeEventListener('keydown',keydown));}
function compute(a,b,op){if(op==='/'&&b===0)return null;return op==='+'?a+b:op==='-'?a-b:op==='*'?a*b:a/b;}
function formatNumber(n){return n===null||!Number.isFinite(n)?'エラー':String(+n.toPrecision(12));}
function updateCalc(){if($('#calc-result')){$('#calc-result').textContent=calc.entry;$('#calc-result').style.fontSize=calc.entry.length>10?'37px':calc.entry.length>7?'49px':'';$('#calc-expression').textContent=calc.expression;}}
function pressCalc(v){A.haptic();if((/^\d$/.test(v)||v==='.')&&(calc.fresh||calc.entry==='エラー')){if(calc.entry==='エラー'){calc.previous=null;calc.operator=null;}if(!calc.operator){calc.lastOp=null;calc.lastOperand=null;calc.expression='';}}if(v==='clear'){calc={entry:'0',previous:null,operator:null,fresh:false,expression:'',lastOp:null,lastOperand:null};}
else if(/^\d$/.test(v)){if(calc.fresh||calc.entry==='エラー'){calc.entry=v;calc.fresh=false;}else if(calc.entry.length<13)calc.entry=calc.entry==='0'?v:calc.entry+v;}
else if(v==='.'){if(calc.fresh||calc.entry==='エラー'){calc.entry='0.';calc.fresh=false;}else if(!calc.entry.includes('.'))calc.entry+='.';}
else if(v==='sign'){if(calc.entry!=='0'&&calc.entry!=='エラー')calc.entry=calc.entry.startsWith('-')?calc.entry.slice(1):'-'+calc.entry;}
else if(v==='percent'){calc.entry=formatNumber(Number(calc.entry)/100);}
else if(['+','-','*','/'].includes(v)){const value=Number(calc.entry);if(!Number.isFinite(value))return;if(calc.operator!==null&&!calc.fresh){calc.entry=formatNumber(compute(calc.previous,value,calc.operator));calc.previous=Number(calc.entry);}else calc.previous=value;calc.operator=v;calc.expression=`${calc.entry} ${opLabel[v]}`;calc.fresh=true;}
else if(v==='='){const op=calc.operator||calc.lastOp;if(op){const a=calc.operator?calc.previous:Number(calc.entry),b=calc.operator?Number(calc.entry):calc.lastOperand;const expression=`${a} ${opLabel[op]} ${b}`;calc.entry=formatNumber(compute(a,b,op));calc.expression=expression+' =';calc.lastOp=op;calc.lastOperand=b;calc.previous=null;calc.operator=null;calc.fresh=true;calcHistory.unshift({expression,result:calc.entry});calcHistory=calcHistory.slice(0,30);A.save('calcHistory',calcHistory);}}
updateCalc();}
A.apps.calculator.render=calcApp;A.actions.calcKey=el=>pressCalc(el.dataset.value);A.actions.calcHistory=()=>A.overlay(`${A.overlayTitle('計算履歴')}<div>${calcHistory.map(h=>`<div style="padding:16px 4px;border-bottom:1px solid #ffffff20;text-align:right"><small style="color:#ffffff70;font-size:12px">${esc(h.expression)}</small><strong style="display:block;font-size:25px;font-weight:400;margin-top:7px">${esc(h.result)}</strong></div>`).join('')||'<p style="font-size:12px;color:#fffa">履歴なし</p>'}</div><button class="control-tile" data-action="calcClearHistory" style="width:100%;margin-top:20px">履歴をクリア</button>`);A.actions.calcClearHistory=()=>{calcHistory=[];A.save('calcHistory',[]);A.actions.calcHistory();};
// Phone: offline call simulation and local history.
const phoneContacts=[{name:'美咲',number:'09012345678',initial:'美',color:'#bf9f92'},{name:'陽',number:'08023456789',initial:'陽',color:'#8ba394'},{name:'aura サポート',number:'0120000000',initial:'a.',color:'#a494b6'},{name:'自宅',number:'0312345678',initial:'家',color:'#8cacc3'}];
let dial='',phoneTab='keypad',callTimer=null,callStarted=0,callNumber='',callLog=A.load('callLog',[]),toneContext=null;
const phoneTabs=()=>A.tabs([{id:'favorites',icon:'star',name:'よく使う項目',action:'phoneTab',value:'favorites'},{id:'recent',icon:'clock',name:'履歴',action:'phoneTab',value:'recent'},{id:'contacts',icon:'user',name:'連絡先',action:'phoneTab',value:'contacts'},{id:'keypad',icon:'grid',name:'キーパッド',action:'phoneTab',value:'keypad'}],phoneTab);
function phone(){A.statusTheme(false);A.view(A.nav('電話','<span class="demo-label">ローカルデモ</span>')+`<div class="app-content" style="padding-bottom:10px" id="phone-content"></div>`+phoneTabs());const el=$('#phone-content');if(phoneTab==='keypad'){el.innerHTML=`<div class="dial-display" id="dial-display">${esc(dial)}</div><p style="text-align:center;font-size:9px;color:#acafb7;margin:0 0 13px">デモ通話</p><div class="dial-keypad">${['1','2','3','4','5','6','7','8','9','*','0','#'].map((n,i)=>`<button class="dial-key" data-action="dialKey" data-value="${n}">${n}<small>${['','ABC','DEF','GHI','JKL','MNO','PQRS','TUV','WXYZ','','+',''][i]||'&nbsp;'}</small></button>`).join('')}</div><div class="dial-actions"><button class="call-button" data-action="phoneCall" aria-label="デモ通話を開始">${icon('phone')}</button><button class="dial-delete" data-action="dialDelete" aria-label="一文字削除">${icon('backspace')}</button></div>`;}else if(phoneTab==='recent'){el.innerHTML=`<h1 class="app-title">履歴</h1>${callLog.length?callLog.map(c=>`<button class="list-row" data-action="callFromLog" data-number="${esc(c.number)}"><span class="row-icon">${icon('phone')}</span><span class="row-main"><strong>${esc(c.name)}</strong><small>発信 · デモ通話 · ${c.duration}秒</small></span><span class="row-value">${new Date(c.date).toLocaleDateString('ja-JP',{month:'numeric',day:'numeric'})}</span></button>`).join(''):A.empty('履歴なし','phone')}`;}else{el.innerHTML=`<h1 class="app-title">${phoneTab==='favorites'?'よく使う項目':'連絡先'}</h1>${A.search('phone-contact-search','連絡先を検索')}<div id="phone-contact-list"></div><p class="notes-footer">架空の連絡先</p>`;const render=q=>{$('#phone-contact-list').innerHTML=phoneContacts.filter(c=>c.name.includes(q)||c.number.includes(q)).filter((_,i)=>phoneTab!=='favorites'||i<2).map(c=>`<button class="list-row" data-action="contactCall" data-number="${c.number}"><span class="avatar" style="background:${c.color}">${c.initial}</span><span class="row-main"><strong>${c.name}</strong><small>${c.number}</small></span>${icon('phone','style="width:19px;color:#7a9b89"')}</button>`).join('')||A.empty('連絡先が見つかりません。','user');};render('');$('#phone-contact-search').oninput=e=>render(e.target.value);}}
A.apps.phone.render=()=>{phone();A.cleanups.push(()=>{if(callTimer){clearInterval(callTimer);callTimer=null;saveCall();}});};A.actions.phoneTab=el=>{phoneTab=el.dataset.value;phone();};
function getAudioContext(){const Audio=window.AudioContext||window.webkitAudioContext;if(!Audio)return null;toneContext=toneContext||new Audio();toneContext.resume();return toneContext;}
function dialTone(n){if(!A.settings.sound)return;try{const context=getAudioContext();if(!context)return;const gain=context.createGain();gain.gain.setValueAtTime(.025,context.currentTime);gain.gain.exponentialRampToValueAtTime(.0001,context.currentTime+.13);gain.connect(context.destination);const key='123456789*0#'.indexOf(n);[697+Math.floor(key/3)*80,1209+(key%3)*135].forEach(f=>{const o=context.createOscillator();o.frequency.value=f;o.connect(gain);o.start();o.stop(context.currentTime+.14);o.onended=()=>o.disconnect();});setTimeout(()=>gain.disconnect(),200);}catch{}}
A.actions.dialKey=el=>{if(dial.length>=18)return;dial+=el.dataset.value;$('#dial-display').textContent=dial;dialTone(el.dataset.value);A.haptic();};A.actions.dialDelete=()=>{dial=dial.slice(0,-1);$('#dial-display').textContent=dial;};
function startCall(number){if(!number)return A.toast('番号を入力');callNumber=number;callStarted=Date.now();const contact=phoneContacts.find(c=>c.number===number);A.statusTheme(true);A.view(`<div class="call-screen"><span class="demo-label" style="background:#ffffff15;color:#c4ced4;margin-bottom:19px">デモ通話 · 外部接続なし</span><span class="avatar" style="width:78px;height:78px;font-size:28px;background:${contact?.color||'#677f91'}">${contact?.initial||'◉'}</span><h2>${esc(contact?.name||number)}</h2><p id="call-duration">00:00</p><div class="call-controls">${[['mic','消音'],['grid','キーパッド'],['volume','スピーカー'],['plus','追加'],['camera','ビデオ'],['user','連絡先']].map(([ic,label])=>`<button data-action="callControl" data-label="${label}" aria-pressed="false"><span>${icon(ic)}</span>${label}</button>`).join('')}</div><button class="call-button call-end" data-action="phoneEnd" aria-label="デモ通話を終了">${icon('phone')}</button><p style="font-size:9px;color:#a7b2be">回線未接続</p></div>`);clearInterval(callTimer);callTimer=setInterval(()=>{if($('#call-duration'))$('#call-duration').textContent=timeString((Date.now()-callStarted)/1000);},300);}
function saveCall(){if(!callNumber)return;callLog.unshift({number:callNumber,name:phoneContacts.find(c=>c.number===callNumber)?.name||callNumber,date:Date.now(),duration:Math.floor((Date.now()-callStarted)/1000)});callLog=callLog.slice(0,40);A.save('callLog',callLog);callNumber='';}
A.actions.phoneCall=()=>startCall(dial);A.actions.contactCall=el=>{dial=el.dataset.number;startCall(dial);};A.actions.callFromLog=el=>startCall(el.dataset.number);A.actions.phoneEnd=()=>{clearInterval(callTimer);callTimer=null;saveCall();phoneTab='recent';phone();};A.actions.callControl=el=>{const label=el.dataset.label;if(label==='消音'||label==='スピーカー'){el.classList.toggle('active');el.setAttribute('aria-pressed',el.classList.contains('active'));A.toast(`${label}を${el.classList.contains('active')?'オン':'オフ'}にしました（デモ）`);}else if(label==='キーパッド'){A.overlay(`${A.overlayTitle('通話中のキーパッド')}<div class="dial-keypad">${'123456789*0#'.split('').map(n=>`<button class="dial-key" style="color:#26303d" data-action="callDtmf" data-value="${n}">${n}</button>`).join('')}</div><p class="control-footer">音はこのブラウザ内だけで再生されます。</p>`);}else A.toast('デモでは利用不可');};A.actions.callDtmf=el=>{dialTone(el.dataset.value);A.haptic();};
// Clock: timers work while the document is open; no OS alarm integration.
let clockTab='world',stopwatch={running:false,start:0,elapsed:0,laps:[]},timer=readTimerStore().session,alarms=A.load('alarms',[{id:'alarm-1',time:'07:00',label:'ゆっくり、目覚めよう',enabled:false},{id:'alarm-2',time:'08:30',label:'一日をはじめる',enabled:false}]);let alarmLast='',clockInterval=null;
// One atomic record keeps completion history and the deadline in sync.
const TIMER_MAX=10859;
const timerModes={timer:{name:'タイマー',label:'自分のペースで',duration:300},work:{name:'集中',label:'ひとつのことに、集中',duration:1500},rest:{name:'休憩',label:'少し、ひと息',duration:300}};
function defaultTimer(){return {id:'',running:false,remaining:300,duration:300,end:0,mode:'timer',label:'自分のペースで',finished:false};}
function readTimerStore(){
  const raw=A.load('clockTimer',null),fallback={session:defaultTimer(),history:[],presets:[],sound:true};
  if(!raw||typeof raw!=='object')return fallback;
  const t=raw.session;
  if(t&&['timer','work','rest'].includes(t.mode)&&Number.isFinite(t.duration)&&t.duration>=1&&t.duration<=10859&&Number.isFinite(t.remaining)&&t.remaining>=0&&t.remaining<=t.duration&&Number.isFinite(t.end)&&t.end>=0&&t.end<=8640000000000000){
    fallback.session={...defaultTimer(),...t,label:String(t.label||'タイマー').slice(0,40),running:t.running===true&&t.end>0,finished:t.finished===true};
  }
  const valid=r=>r&&typeof r.id==='string'&&typeof r.label==='string'&&['timer','work','rest'].includes(r.mode)&&Number.isFinite(r.duration)&&r.duration>=1&&r.duration<=10859;
  fallback.history=Array.isArray(raw.history)?raw.history.filter(r=>valid(r)&&Number.isFinite(r.date)&&r.date>0&&r.date<=8640000000000000).slice(0,40):[];
  fallback.presets=Array.isArray(raw.presets)?raw.presets.filter(valid).slice(0,8):[];
  fallback.sound=raw.sound!==false;
  return fallback;
}
let timerStore=readTimerStore();
function saveTimer(next,extra={}){
  const store={...timerStore,...extra,session:next};
  if(!A.save('clockTimer',store))return false;
  timerStore=store;timer=next;return true;
}
const timerRemaining=()=>timer.running?Math.max(0,(timer.end-Date.now())/1000):timer.remaining;
const timerBusy=()=>timer.running||!!timer.id&&!timer.finished;
// Read-only projection of the same session used by the timer, never a second countdown.
A.clockTimerSnapshot=()=>timerBusy()?{label:timer.label,running:timer.running,remaining:Math.ceil(timerRemaining()),duration:timer.duration,end:timer.end}:null;
const timerLength=s=>s>=60?`${Math.floor(s/60)}分${s%60?`${s%60}秒`:''}`:`${s}秒`;
const timerTime=end=>new Date(end).toLocaleTimeString('ja-JP',{hour:'2-digit',minute:'2-digit',hour12:false});
function timerDial(){
  return `<svg class="tm-dial-art" viewBox="0 0 320 320" aria-hidden="true"><defs>
    <linearGradient id="tm-metal" x2=".8" y2="1"><stop stop-color="#fffdf7"/><stop offset=".45" stop-color="#e7d6c0"/><stop offset=".75" stop-color="#fcf7ed"/><stop offset="1" stop-color="#d6bfa3"/></linearGradient>
    <linearGradient id="tm-copper" x2="1" y2="1"><stop stop-color="#ecc098"/><stop offset=".5" stop-color="#c88b63"/><stop offset="1" stop-color="#925c42"/></linearGradient>
    <radialGradient id="tm-face" cx=".4" cy=".25" r=".8"><stop stop-color="#fffcf6"/><stop offset="1" stop-color="#eee6db"/></radialGradient>
  </defs><circle class="tm-metal" cx="160" cy="160" r="155" fill="url(#tm-metal)"/><circle cx="160" cy="160" r="151" fill="none" stroke="#fff" stroke-opacity=".65"/><circle class="tm-face" cx="160" cy="160" r="145" fill="url(#tm-face)"/>
  <g class="tm-ticks">${Array.from({length:60},(_,i)=>`<path d="M160 23v${i%5===0?10:4}" transform="rotate(${i*6} 160 160)" stroke="currentColor" stroke-width="${i%5===0?1.8:1}"/>`).join('')}</g>
  <g class="tm-dial-numbers" text-anchor="middle"><text x="160" y="51">00</text><text x="277" y="164">15</text><text x="160" y="278">30</text><text x="43" y="164">45</text></g>
  <circle class="tm-track" cx="160" cy="160" r="108" fill="none" stroke-width="4"/>
  <circle id="tm-progress" cx="160" cy="160" r="108" fill="none" stroke="url(#tm-copper)" stroke-width="5" stroke-linecap="round" pathLength="100" stroke-dasharray="100 100" transform="rotate(-90 160 160)"/>
  <g id="tm-hand"><circle cx="160" cy="52" r="7" fill="url(#tm-copper)"/><circle cx="158.5" cy="50.5" r="2" fill="#fff5df"/></g>
  </svg>`;
}
function timerView(){
  const busy=timerBusy(),done=timer.finished;
  const today=timerStore.history.filter(h=>new Date(h.date).toDateString()===new Date().toDateString());
  return `<div class="tm-heading"><div><h1>タイマー</h1></div><button class="tm-icon-button" data-action="timerHistory" aria-label="完了履歴">${icon('clock')}</button></div>
  <div class="tm-modes" aria-label="タイマーのモード">${Object.entries(timerModes).map(([id,m])=>`<button data-action="timerMode" data-value="${id}" aria-pressed="${timer.mode===id}" ${busy?'disabled':''}>${m.name}</button>`).join('')}</div>
  <div class="tm-stage ${timer.running?'is-running':''} ${done?'is-complete':''}" data-mode="${timer.mode}">
    <div class="tm-caption"><span class="tm-status-dot"></span><span id="tm-state" role="status">${done?'完了':timer.running?'計測中':busy?'一時停止':'待機中'}</span></div>
    <div class="tm-dial">${timerDial()}<div class="tm-dial-center"><span class="tm-dial-label">${esc(timer.label)}</span><strong id="timer-display" role="timer" aria-label="残り時間">${timeString(Math.ceil(timerRemaining()))}</strong><span class="tm-dial-state">${done?'COMPLETE':timer.running?'IN PROGRESS':busy?'PAUSED':'READY'}</span></div></div>
    <div class="tm-timing"><span>${icon('alarm')}<span id="tm-end"></span></span><span id="tm-percent"></span></div>
  </div>
  ${!busy?`<div class="tm-editor"><span>時間を設定</span><div><label><input type="number" id="timer-minutes" min="0" max="180" step="1" value="${Math.floor(timer.duration/60)}" aria-label="分"><span>分</span></label><span class="tm-colon">:</span><label><input type="number" id="timer-seconds" min="0" max="59" step="1" value="${timer.duration%60}" aria-label="秒"><span>秒</span></label></div><button data-action="timerLabel" aria-label="タイマーの名前を編集">${icon('edit')}</button></div>`:`<div class="tm-session-info"><span>${timerModes[timer.mode].name} · ${timerLength(timer.duration)}</span><button data-action="timerAdd">${icon('plus')} 1分追加</button></div>`}
  <div class="tm-actions"><button class="tm-reset" data-action="timerReset" aria-label="設定時間にリセット">${icon('refresh')}</button><button class="tm-start" data-action="timerToggle">${icon(timer.running?'pause':'play')}<span>${timer.running?'一時停止':done?'もう一度':busy?'再開する':'はじめる'}</span></button><button class="tm-sound" data-action="timerSound" aria-label="終了音" aria-pressed="${timerStore.sound}">${icon(timerStore.sound?'volume':'close')}</button></div>
  <section class="tm-presets"><div class="tm-section-heading"><h2>いつもの時間</h2><button data-action="timerSavePreset" ${busy?'disabled':''}>${icon('plus')} 保存</button></div><div class="tm-preset-grid">${[[1,'ひと呼吸','wind'],[3,'お茶の時間','sun'],[5,'ひと休み','leaf'],[10,'小さな作業','edit']].map(([m,label,ic])=>`<button class="tm-preset ${timer.duration===m*60?'selected':''}" data-action="timerPreset" data-value="${m}" ${busy?'disabled':''}><span class="tm-preset-icon">${icon(ic)}</span><strong>${m}<small> min</small></strong><span>${label}</span></button>`).join('')}</div>
  ${timerStore.presets.length?`<div class="tm-saved">${timerStore.presets.map(p=>`<div><button data-action="timerUsePreset" data-id="${esc(p.id)}" ${busy?'disabled':''}><span>${esc(p.label)}</span><small>${timerLength(p.duration)}</small></button><button data-action="timerDeletePreset" data-id="${esc(p.id)}" aria-label="${esc(p.label)}を削除">${icon('close')}</button></div>`).join('')}</div>`:''}</section>
  <div class="tm-today"><span class="tm-today-icon">${icon('check')}</span><div><strong>今日</strong><span>${today.length?`${today.length}回完了 · ${timerLength(today.reduce((s,h)=>s+h.duration,0))}`:'記録なし'}</span></div><button data-action="timerHistory" aria-label="すべての履歴を見る">${icon('chevronRight')}</button></div>
  <details class="tm-help"><summary>通知・保存について</summary><p>タイマーはこのブラウザに保存。画面を移動・再読み込みしても終了予定を維持します。ページ終了・端末スリープ中の通知は保証されません。集中モード・消音設定中は終了音が鳴りません。</p><p>集中・休憩は手動で切り替えます。「集中」アプリの記録とは別に保存します。Spaceキーで開始・一時停止できます。</p><button data-action="clockNotifyPermission">端末通知を有効にする</button><button data-action="timerTestSound">終了音を試す</button></details>`;
}
function updateTimerView(){
  if(!$('#timer-display'))return;
  const left=timerRemaining(),ratio=Math.min(1,Math.max(0,left/timer.duration));
  $('#timer-display').textContent=timeString(Math.ceil(left));
  $('#tm-progress').style.strokeDashoffset=String(100*(1-ratio));
  $('#tm-hand').setAttribute('transform',`rotate(${360*(1-ratio)} 160 160)`);
  $('#tm-percent').textContent=timer.finished?'完了':`${Math.floor((1-ratio)*100)}% 経過`;
  $('#tm-end').textContent=timer.finished?'あなたの時間を、次のことへ':`${timer.running?'終了予定':timerBusy()?'一時停止中 · 残り':'開始すると'} ${timerBusy()&&!timer.running?timerLength(Math.ceil(left)):timerTime(timer.running?timer.end:Date.now()+timer.duration*1000)}${!timerBusy()?' に終了':''}`;
}
function timerInputDuration(){
  const min=$('#timer-minutes'),sec=$('#timer-seconds');
  if(!min||!sec)return timer.duration;
  const m=Number(min.value),s=Number(sec.value);
  if(!min.value.trim()||!sec.value.trim()||!Number.isInteger(m)||!Number.isInteger(s)||m<0||m>180||s<0||s>59||m*60+s===0)return null;
  return m*60+s;
}
function setTimerDuration(duration,mode=timer.mode,label=timer.label){
  if(timerBusy())return A.toast('リセットしてから変更できます');
  if(!Number.isInteger(duration)||duration<1||duration>TIMER_MAX)return;
  if(saveTimer({...defaultTimer(),duration,remaining:duration,mode,label}))clock();
}
function finishTimer(){
  if(!timer.running||Date.now()<timer.end)return;
  const entry={id:timer.id,label:timer.label,mode:timer.mode,duration:timer.duration,date:timer.end};
  const next={...timer,running:false,remaining:0,finished:true};
  const history=[entry,...timerStore.history.filter(h=>h.id!==timer.id)].slice(0,40);
  if(!saveTimer(next,{history})){
    // Do not ring every second if storage fills up at the deadline.
    timer=next;timerStore={...timerStore,session:next,history};
    A.toast('タイマー終了。履歴を保存できませんでした');
  }
  if(A.current==='clock'&&clockTab==='timer')clock();
  alarmNotice('タイマーが終了しました',timerStore.sound,`${timer.label} · ${timerLength(timer.duration)}`);
}
const clockTabs=()=>A.tabs([{id:'world',icon:'globe',name:'世界時計',action:'clockTab',value:'world'},{id:'alarm',icon:'alarm',name:'アラーム',action:'clockTab',value:'alarm'},{id:'stopwatch',icon:'timer',name:'ストップウォッチ',action:'clockTab',value:'stopwatch'},{id:'timer',icon:'clock',name:'タイマー',action:'clockTab',value:'timer'}],clockTab);
const stopwatchElapsed=()=>stopwatch.elapsed+(stopwatch.running?Date.now()-stopwatch.start:0);
function stopwatchFormat(ms){return `${String(Math.floor(ms/60000)).padStart(2,'0')}:${String(Math.floor(ms/1000)%60).padStart(2,'0')}.${String(Math.floor(ms/10)%100).padStart(2,'0')}`;}
// World dials use the same timezone (and DST) as their accessible digital readout.
const worldCities=[['東京','Asia/Tokyo'],['ニューヨーク','America/New_York'],['ロンドン','Europe/London'],['パリ','Europe/Paris'],['シドニー','Australia/Sydney']];
const worldFormats=new Map(worldCities.map(([,zone])=>[zone,new Intl.DateTimeFormat('en-GB',{timeZone:zone,hour:'2-digit',minute:'2-digit',second:'2-digit',hourCycle:'h23'})]));
function worldDial(index){
  const id=`world-dial-${index}`;
  return `<svg class="world-dial" viewBox="0 0 180 180" aria-hidden="true" focusable="false"><defs><linearGradient id="${id}-rim" x2="1" y2="1"><stop stop-color="#fffaf0"/><stop offset=".3" stop-color="#ab947d"/><stop offset=".55" stop-color="#f9edda"/><stop offset="1" stop-color="#8c7b6a"/></linearGradient><radialGradient id="${id}-face" cx=".4" cy=".3" r=".8"><stop stop-color="#fffcf6"/><stop offset="1" stop-color="#e8dfd1"/></radialGradient></defs><circle cx="90" cy="90" r="87" fill="url(#${id}-rim)"/><circle cx="90" cy="90" r="83" fill="none" stroke="#fff7e6" stroke-opacity=".6"/><circle class="world-face" cx="90" cy="90" r="79" fill="url(#${id}-face)"/><circle cx="90" cy="90" r="55" fill="none" stroke="currentColor" opacity=".06"/>
  <g class="world-ticks" stroke="currentColor">${Array.from({length:60},(_,i)=>`<path d="M90 18v${i%5?3:8}" transform="rotate(${i*6} 90 90)" stroke-width="${i%5?.7:1.8}"/>`).join('')}</g>
  <g class="world-numerals" fill="currentColor" text-anchor="middle" font-size="12"><text x="90" y="43">12</text><text x="143" y="94">3</text><text x="90" y="145">6</text><text x="37" y="94">9</text></g>
  <g class="world-hour"><path d="M87 101 86 61 90 53l4 8-1 40Z" fill="currentColor"/></g><g class="world-minute"><path d="M88 103 88 38l2-7 2 7v65Z" fill="currentColor"/></g><g class="world-second" stroke="#b87755" stroke-width="1.2"><path d="M90 108V26"/><circle cx="90" cy="107" r="3" fill="#b87755"/></g><circle cx="90" cy="90" r="4" fill="#bf966f" stroke="#fff0d5"/><circle cx="90" cy="90" r="1.5" fill="#5a4940"/></svg>`;
}
function clock(){const active=document.activeElement?.dataset,scroll=$('#clock-content')?.scrollTop||0;A.statusTheme(false);$('#app-screen').classList.toggle('timer-studio',clockTab==='timer');A.view(A.nav('時計',clockTab==='alarm'?`<button data-action="alarmAdd" aria-label="アラームを追加">${icon('plus')}</button>`:'')+`<div class="app-content" id="clock-content"></div>`+clockTabs());const el=$('#clock-content');
if(clockTab==='world')el.innerHTML=`<div class="world-grid">${worldCities.map(([name,zone],i)=>`<article class="clock-world world-card ${i===0?'world-primary':''}" data-world-zone="${zone}">${worldDial(i)}<div class="world-city"><h3>${name}</h3><small data-world-date></small><strong data-timezone="${zone}"></strong></div></article>`).join('')}</div>`;
else if(clockTab==='alarm')el.innerHTML=`<h1 class="app-title">アラーム</h1><p class="app-subtitle">ページ稼働中のみ。背面・ロック中は保証なし</p>${alarms.map(a=>`<div class="alarm-row"><div><strong class="alarm-time" style="color:${a.enabled?'inherit':'#a9aab3'}">${a.time}</strong><small>${esc(a.label)} · 毎日</small></div><button class="toggle ${a.enabled?'on':''}" data-action="alarmToggle" data-id="${a.id}" aria-label="${a.time}のアラーム" aria-pressed="${a.enabled}"></button><button class="delete-small" data-action="alarmDelete" data-id="${a.id}" aria-label="アラーム削除">×</button></div>`).join('')}`;
else if(clockTab==='stopwatch')el.innerHTML=`<h1 class="app-title">ストップウォッチ</h1><div class="stopwatch-display" id="stopwatch-display">${stopwatchFormat(stopwatchElapsed())}</div><div class="stopwatch-actions"><button class="round-action" data-action="stopwatchLap">${stopwatch.running?'ラップ':'リセット'}</button><button class="round-action ${stopwatch.running?'stop':'start'}" data-action="stopwatchToggle">${stopwatch.running?'停止':'開始'}</button></div><div id="lap-list">${stopwatch.laps.map((l,i)=>`<div class="lap-row"><span>ラップ ${stopwatch.laps.length-i}</span><span>${stopwatchFormat(l-(stopwatch.laps[i+1]||0))}</span></div>`).join('')}</div>`;
else {el.classList.add('tm-content');el.innerHTML=timerView();
  ['#timer-minutes','#timer-seconds'].forEach(selector=>{const input=$(selector);if(input)input.oninput=()=>{
    const duration=timerInputDuration();if(!duration)return;
    if(saveTimer({...timer,duration,remaining:duration,finished:false,id:''})){
      updateTimerView();$('.tm-stage').classList.remove('is-complete');$('#tm-state').textContent='待機中';$('.tm-dial-state').textContent='READY';
      A.$$('.tm-preset').forEach(p=>p.classList.toggle('selected',Number(p.dataset.value)*60===duration));
    }
  };});
}
updateClockView();el.scrollTop=scroll;
if(active?.action){const target=A.$$('[data-action]',el).find(b=>b.dataset.action===active.action&&b.dataset.value===active.value&&b.dataset.id===active.id);target?.focus({preventScroll:true});}}
function updateClockView(){
  if(A.current!=='clock'||document.hidden)return;
  const now=new Date(),grid=$('.world-grid'),second=Math.floor(now.getTime()/1000);
  // Reuse DOM; avoid timezone formatting on the stopwatch's 80ms tick.
  if(grid&&grid.dataset.tick!==String(second)){
    grid.dataset.tick=String(second);
    A.$$('[data-world-zone]',grid).forEach(card=>{
      const zone=card.dataset.worldZone,parts=Object.fromEntries(worldFormats.get(zone).formatToParts(now).map(p=>[p.type,p.value]));
      const h=Number(parts.hour),m=Number(parts.minute),s=Number(parts.second);
      card.classList.toggle('world-night',h<6||h>=18);
      card.querySelector('[data-timezone]').textContent=`${parts.hour}:${parts.minute}`;
      card.querySelector('[data-world-date]').textContent=now.toLocaleDateString('ja-JP',{timeZone:zone,month:'numeric',day:'numeric',weekday:'short'});
      for(const [hand,angle] of [['hour',(h%12)*30+m/2],['minute',m*6+s/10],['second',s*6]])card.querySelector('.world-'+hand).setAttribute('transform',`rotate(${angle} 90 90)`);
    });
  }
  if($('#stopwatch-display'))$('#stopwatch-display').textContent=stopwatchFormat(stopwatchElapsed());updateTimerView();
}
function beep(){try{const c=getAudioContext();if(!c)return;for(let i=0;i<3;i++){const o=c.createOscillator(),g=c.createGain(),t=c.currentTime+i*.35;o.frequency.value=880;g.gain.setValueAtTime(.0001,t);g.gain.exponentialRampToValueAtTime(.1,t+.02);g.gain.exponentialRampToValueAtTime(.0001,t+.23);o.connect(g);g.connect(c.destination);o.start(t);o.stop(t+.25);o.onended=()=>{o.disconnect();g.disconnect();};}}catch{}}
function alarmNotice(title,sound=true,body='時計を開く'){A.notify({app:'clock',title:title==='タイマーが終了しました'?'タイマー終了':title,body});if(!A.settings.focus&&!A.noticeMuted?.('clock')){A.network?.clockNotice(title);if(sound&&A.settings.sound)beep();}}
A.clockTick=()=>{finishTimer();updateClockView();const n=new Date(),minute=n.toTimeString().slice(0,5),key=n.toDateString()+minute;if(key!==alarmLast){alarmLast=key;const alarm=alarms.find(a=>a.enabled&&a.time===minute);if(alarm)alarmNotice(alarm.label||'アラーム');}};
A.apps.clock.render=arg=>{
  if(['world','alarm','stopwatch','timer'].includes(arg))clockTab=arg;
  finishTimer();clock();clearInterval(clockInterval);clockInterval=setInterval(updateClockView,80);
  const keydown=e=>{if(e.code==='Space'&&!e.repeat&&A.current==='clock'&&clockTab==='timer'&&$('#overlay').hidden&&!e.target.closest('button,input,textarea,select,summary,[contenteditable]')){e.preventDefault();A.actions.timerToggle();}};
  document.addEventListener('keydown',keydown);A.cleanups.push(()=>{clearInterval(clockInterval);document.removeEventListener('keydown',keydown);});
};A.actions.clockTab=el=>{clockTab=el.dataset.value;clock();};
A.actions.stopwatchToggle=()=>{if(stopwatch.running){stopwatch.elapsed=stopwatchElapsed();stopwatch.running=false;}else{stopwatch.start=Date.now();stopwatch.running=true;}clock();};A.actions.stopwatchLap=()=>{if(stopwatch.running)stopwatch.laps.unshift(stopwatchElapsed());else stopwatch={running:false,start:0,elapsed:0,laps:[]};clock();};
A.actions.timerToggle=()=>{
  if(timer.running){if(Date.now()>=timer.end){finishTimer();return;}if(saveTimer({...timer,remaining:timerRemaining(),running:false,end:0}))clock();return;}
  const duration=timerBusy()?timer.duration:timerInputDuration();
  if(!duration)return A.toast('1秒〜180分59秒を整数で指定してください');
  const remaining=timerBusy()?timer.remaining:duration;
  if(saveTimer({...timer,id:timerBusy()?timer.id:A.id(),duration,remaining,running:true,finished:false,end:Date.now()+remaining*1000})){
    try{getAudioContext();}catch{}clock();
  }
};
A.actions.timerReset=()=>{const reset=()=>{if(saveTimer({...timer,id:'',running:false,finished:false,remaining:timer.duration,end:0}))clock();};if(timerBusy())A.confirm('タイマーをリセット','進行中の時間を取り消し、設定時間に戻します。完了履歴には残りません。',reset);else reset();};
A.actions.timerPreset=el=>{const duration=Number(el.dataset.value)*60;setTimerDuration(duration,'timer',({1:'ひと呼吸',3:'お茶の時間',5:'ひと休み',10:'小さな作業'})[el.dataset.value]||'タイマー');};
A.actions.timerMode=el=>{const mode=el.dataset.value;if(timerModes[mode])setTimerDuration(timerModes[mode].duration,mode,timerModes[mode].label);};
A.actions.timerAdd=()=>{
  if(!timerBusy())return;if(timer.running&&Date.now()>=timer.end)return finishTimer();
  if(timer.duration+60>TIMER_MAX)return A.toast('最大180分59秒まで追加できます');
  if(saveTimer({...timer,duration:timer.duration+60,remaining:timerRemaining()+60,end:timer.running?timer.end+60000:0}))clock();
};
A.actions.timerSound=()=>{if(saveTimer(timer,{sound:!timerStore.sound}))clock();};
A.actions.timerTestSound=()=>{if(!timerStore.sound||!A.settings.sound||A.settings.focus||A.noticeMuted?.('clock'))return A.toast('終了音・サウンドをオン、集中モード・通知の消音をオフにしてください');beep();};
A.actions.timerLabel=()=>{if(timerBusy())return;A.form('この時間に名前を',`<label class="form-label" for="tm-label">名前</label><input class="text-input" id="tm-label" name="label" maxlength="40" value="${esc(timer.label)}" required>`,v=>{if(!v.label.trim())return false;if(!saveTimer({...timer,label:v.label.trim()}))return false;clock();});};
A.actions.timerSavePreset=()=>{
  if(timerBusy())return;const duration=timerInputDuration();if(!duration)return A.toast('有効な時間を指定してください');
  if(timerStore.presets.length>=8)return A.toast('保存は8件まで。不要なプリセットを削除してください');
  A.form('いつもの時間に追加',`<p>${timerLength(duration)} · ${timerModes[timer.mode].name}</p><label class="form-label" for="tm-preset-name">名前</label><input class="text-input" id="tm-preset-name" name="label" maxlength="40" value="${esc(timer.label)}" required>`,v=>{
    if(!v.label.trim())return false;
    const preset={id:A.id(),duration,mode:timer.mode,label:v.label.trim()};
    if(!saveTimer(timer,{presets:[...timerStore.presets,preset]}))return false;clock();
  });
};
A.actions.timerUsePreset=el=>{const p=timerStore.presets.find(p=>p.id===el.dataset.id);if(p)setTimerDuration(p.duration,p.mode,p.label);};
A.actions.timerDeletePreset=el=>{const p=timerStore.presets.find(p=>p.id===el.dataset.id);if(p)A.confirm('プリセットを削除',`「${esc(p.label)}」を削除します。`,()=>{if(saveTimer(timer,{presets:timerStore.presets.filter(p=>p.id!==el.dataset.id)}))clock();});};
A.actions.timerHistory=()=>A.overlay(`${A.overlayTitle('時間の記録')}<p class="tm-history-intro">完了履歴・最新40件</p><div class="tm-history-list">${timerStore.history.map(h=>`<article><span class="tm-history-check">${icon('check')}</span><div><strong>${esc(h.label)}</strong><small>${new Date(h.date).toLocaleString('ja-JP',{month:'numeric',day:'numeric',hour:'2-digit',minute:'2-digit'})} · ${timerModes[h.mode].name}</small></div><b>${timerLength(h.duration)}</b></article>`).join('')||'<div class="tm-history-empty">履歴なし</div>'}</div>${timerStore.history.length?'<button class="tm-history-clear" data-action="timerClearHistory">完了履歴を削除</button>':''}`);
A.actions.timerClearHistory=()=>A.confirm('完了履歴を削除','すべてのタイマー完了履歴を削除します。進行中のタイマーとプリセットは残ります。',()=>{if(saveTimer(timer,{history:[]})){if(A.current==='clock'&&clockTab==='timer')clock();A.actions.timerHistory();}});
A.actions.alarmToggle=el=>{const a=alarms.find(a=>a.id===el.dataset.id);a.enabled=!a.enabled;A.save('alarms',alarms);if(a.enabled){try{getAudioContext();}catch{}}clock();};A.actions.alarmDelete=el=>{alarms=alarms.filter(a=>a.id!==el.dataset.id);A.save('alarms',alarms);clock();};A.actions.alarmAdd=()=>A.form('新しいアラーム','<label class="form-label">時刻</label><input class="text-input" type="time" name="time" value="07:00" required><label class="form-label">ラベル</label><input class="text-input" name="label" placeholder="一日をはじめよう" maxlength="60">',v=>{alarms.push({id:A.id(),...v,enabled:true});A.save('alarms',alarms);try{getAudioContext();}catch{}clock();});
// Health: consent-based sensor observations and timestamped local records only.
const HEALTH_LIMIT=20000;
const healthKinds={steps:['歩数','歩',100000],minutes:['運動','分',1440],water:['水分','ml',20000],bedtime:['就床','分',1440],heartRate:['心拍','bpm',300]};
const healthSources={manual:'手動記録',motion:'動作センサー推定',timer:'開始・終了時刻',bluetooth:'Bluetooth心拍計'};
const healthBlank=()=>({version:2,records:[],session:null,cup:200});
const healthDate=at=>{const d=new Date(at);return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;};
const healthValidDate=(date,at)=>typeof date==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(date)&&Number.isFinite(Date.parse(date+'T12:00:00Z'))&&new Date(date+'T12:00:00Z').toISOString().slice(0,10)===date&&Math.abs(Date.parse(date+'T12:00:00Z')-at)<38*3600000;
const healthValidRecord=r=>r&&typeof r.id==='string'&&/^[a-zA-Z0-9:_-]{1,100}$/.test(r.id)&&Object.hasOwn(healthKinds,r.kind)&&Object.hasOwn(healthSources,r.source)&&Number.isFinite(r.value)&&r.value>=0&&r.value<=healthKinds[r.kind][2]&&Number.isFinite(r.at)&&r.at>=946684800000&&r.at<=Date.now()+60000&&healthValidDate(r.date,r.at)&&(!['steps','water','heartRate'].includes(r.kind)||Number.isInteger(r.value))&&(r.kind!=='heartRate'||r.value>=20)&&(r.source!=='bluetooth'||r.kind==='heartRate')&&(r.source!=='motion'||r.kind==='steps')&&(r.source!=='timer'||['minutes','bedtime'].includes(r.kind));
function healthValidStore(s){return s?.version===2&&Array.isArray(s.records)&&s.records.length<=HEALTH_LIMIT&&s.records.every(healthValidRecord)&&new Set(s.records.map(r=>r.id)).size===s.records.length&&[100,150,200,250,300,500].includes(s.cup)&&(s.session===null||(s.session&&typeof s.session.id==='string'&&/^[a-zA-Z0-9_-]{1,80}$/.test(s.session.id)&&['minutes','bedtime'].includes(s.session.kind)&&Number.isFinite(s.session.start)&&s.session.start>=946684800000&&s.session.start<=Date.now()));}
let healthStore=healthBlank(),healthError='',healthDay=healthDate(Date.now()),healthPending=[],healthFlushing=false,healthInFlight=[],healthEpoch=0;
let healthMotion=false,healthMotionBusy=false,healthMotionRelease=null,healthMotionToken=0,healthMotionStatus='停止中',healthMotionAt=0,healthMotionBase=null,healthMotionHigh=false,healthLastStep=0,healthCandidate=0;
let healthDevice=null,healthCharacteristic=null,healthBluetoothBusy=false,healthBluetoothToken=0,healthBluetoothStatus='未接続',healthLiveHeart=null,healthLastHeartMinute='';
function healthRead(){
  try{
    const raw=localStorage.getItem('aura.health');
    if(raw===null){healthStore=healthBlank();return true;}
    const s=JSON.parse(raw);
    if(!healthValidStore(s))throw new Error('記録形式を確認できません。書き出して退避後、ヘルスケアの記録を削除してください。');
    healthStore=s;return true;
  }catch(e){healthStore=healthBlank();healthError=e.message||'保存領域を利用できません';return false;}
}
function healthMigrate(){
  try{
    const raw=localStorage.getItem('aura.health');if(raw===null)return;
    const old=JSON.parse(raw);if(old?.version===2)return;
    if(!old||Object.keys(old).some(k=>!['steps','minutes','water'].includes(k))||!['steps','minutes','water'].every(k=>Number.isFinite(old[k])))return;
    // Old totals have neither dates nor provenance; never silently treat them as real observations.
    const seed=old.steps===6240&&old.minutes===24&&old.water===1200;
    const next={health:healthBlank()};if(!seed)next.healthLegacy=old;
    if(!A.saveBatch(next))healthError='旧データの分離に失敗しました。保存容量を確認してください。';
  }catch{healthError='旧データを読み込めません。書き出して確認してください。';}
}
async function healthWrite(change){
  const run=()=>{
    if(!healthRead()){healthRefresh();return false;}
    const next=change(structuredClone(healthStore));if(!next)return false;
    if(!healthValidStore(next)){healthError='保存上限または記録形式を確認してください。上限は20,000件です。';healthRefresh();return false;}
    if(!A.save('health',next)){healthError='未保存です。容量・ブラウザ設定を確認し、再試行してください。';healthRefresh();return false;}
    healthStore=next;healthError='';healthRefresh();return true;
  };
  try{return navigator.locks?await navigator.locks.request('aura-health-write',run):run();}catch{healthError='保存処理を完了できませんでした。再試行してください。';healthRefresh();return false;}
}
function healthRecord(kind,value,source='manual',at=Date.now(),id=A.id()){return {id,kind,value,source,at,date:healthDate(at)};}
function healthSummary(date=healthDate(Date.now())){
  const records=healthStore.records.filter(r=>r.date===date),out={};
  for(const kind of Object.keys(healthKinds)){const list=records.filter(r=>r.kind===kind);out[kind]=list.length?(kind==='heartRate'?list.reduce((a,b)=>a.at>b.at?a:b).value:list.reduce((n,r)=>n+r.value,0)):null;}
  return out;
}
const healthNumber=value=>value===null?'—':Number(value.toFixed(1)).toLocaleString('ja-JP');
const healthProvenance=kind=>[...new Set(healthStore.records.filter(r=>r.date===healthDate(Date.now())&&r.kind===kind).map(r=>(r.imported?'取込・':'')+healthSources[r.source]))].join('・')||'未記録';
function healthRings(health){
  const values=[(health.steps||0)/8000,(health.minutes||0)/30,(health.water||0)/2000];
  return `<svg class="health-ring-art" viewBox="0 0 180 180" aria-hidden="true" focusable="false"><defs>${[['#ffb6cb','#ec527e'],['#e0f3a3','#8bc29b'],['#bdedf6','#6cb9d6']].map(([a,b],i)=>`<linearGradient id="health-ring-${i}" x1="0" y1="0" x2="1" y2="1"><stop stop-color="${a}"/><stop offset="1" stop-color="${b}"/></linearGradient>`).join('')}</defs><circle cx="90" cy="90" r="85" fill="#ffffff04" stroke="#ffffff0b"/>
  ${values.map((v,i)=>`<circle cx="90" cy="90" r="${70-i*19}" fill="none" stroke="#ffffff0c" stroke-width="13"/><circle class="health-progress-ring" cx="90" cy="90" r="${70-i*19}" fill="none" stroke="url(#health-ring-${i})" stroke-width="13" pathLength="100" stroke-dasharray="${Math.max(0,Math.min(1,v))*100} 100" stroke-linecap="${v>0?'round':'butt'}" transform="rotate(-90 90 90)"/>`).join('')}
  <path d="M78 91h7l4-9 5 16 4-7h5" fill="none" stroke="#e6e8e4" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
}
function waterVessel(health){
  const level=Math.max(0,Math.min(1,(health.water||0)/2000)),y=122-level*95;
  return `<svg class="water-vessel" viewBox="0 0 110 140" aria-hidden="true" focusable="false"><defs><linearGradient id="water-glass" x2="1" y2="0"><stop stop-color="#b9dbe8" stop-opacity=".3"/><stop offset=".4" stop-color="#e3f3fa" stop-opacity=".1"/><stop offset="1" stop-color="#97bfce" stop-opacity=".4"/></linearGradient><linearGradient id="water-fill" x2=".6" y2="1"><stop stop-color="#96d9e8"/><stop offset="1" stop-color="#418cae"/></linearGradient><clipPath id="water-clip"><path d="M24 21h62l-7 92c-1 12-47 12-48 0Z"/></clipPath></defs><ellipse cx="55" cy="128" rx="31" ry="5" fill="#3a769d" opacity=".12"/><path d="M22 20h66l-7 95c-2 17-51 17-53 0Z" fill="url(#water-glass)" stroke="#a6cadb"/>
  ${level>0?`<g clip-path="url(#water-clip)"><path class="water-level" d="M18 ${y}q18-5 37 0t38 0v125H18Z" fill="url(#water-fill)"/><path d="M18 ${y}q18-5 37 0t38 0" fill="none" stroke="#d4f7ff" stroke-width="2"/></g>`:''}<path d="m32 33 5 70" stroke="#fff" stroke-opacity=".65" stroke-width="3" stroke-linecap="round"/><ellipse cx="55" cy="20" rx="33" ry="5" fill="none" stroke="#bcdbe7"/><path d="M73 49h5m-7 22h5m-7 22h5" stroke="#e4f3f9" stroke-width="2"/></svg>`;
}
function healthApp(){
  const h=healthSummary(),session=healthStore.session,week=Array.from({length:7},(_,i)=>{const d=new Date();d.setDate(d.getDate()-6+i);return {date:healthDate(d),value:healthSummary(healthDate(d)).steps};});
  const scale=Math.max(1,...week.map(d=>d.value||0));healthDay=healthDate(Date.now());
  A.view(A.nav('ヘルスケア',`<button data-action="healthAdd" aria-label="記録を追加">${icon('plus')}</button>`)+`<div class="app-content health-dashboard health-real"><div class="health-heading"><h1>今日の記録</h1><span>${esc(healthDay)}</span></div>
  <div class="health-save-status" role="status">${esc(healthError|| (healthPending.length||healthFlushing?'記録を保存待ち':'このブラウザに保存・外部送信なし'))}${healthError||healthPending.length||healthFlushing?'<button data-action="healthRetry">保存を再試行</button>':''}</div>
  <section class="health-hero">${healthRings(h)}<div class="health-metrics">${['steps','minutes','water'].map(k=>`<div class="activity-stat"><small>${healthKinds[k][0]}</small><strong>${healthNumber(h[k])}<span> ${healthKinds[k][1]}</span></strong><small>${healthProvenance(k)}</small></div>`).join('')}</div><p class="health-energy">記録なしは「—」・自動取得は下で開始</p></section>
  <article class="health-card"><header><h3>歩数の自動記録</h3><small id="health-motion-status"></small></header><p class="health-caption">スマホを携帯して歩くと推定。振動でも増える場合があります。画面表示中のみ。</p><button class="secondary-button" data-action="healthMotion" ${healthMotionBusy?'disabled':''}>${healthMotion?'停止する':'動作センサーを有効にする'}</button></article>
  <article class="health-card"><header><h3>心拍計</h3><small id="health-bluetooth-status"></small></header><strong id="health-live-heart">—</strong><small> bpm</small><p class="health-caption" id="health-heart-caption"></p><button class="secondary-button" data-action="healthBluetooth" ${healthBluetoothBusy?'disabled':''}>${healthDevice?'切断する':'Bluetooth心拍計に接続'}</button><p class="health-caption">標準Heart Rate Service対応機器が必要。心拍は1分ごとに保存。</p></article>
  <article class="health-card health-water">${waterVessel(h)}<h3>水分補給</h3><strong>${healthNumber(h.water)}</strong><small> ml</small><div class="health-controls"><button class="secondary-button" data-action="healthWater">+ ${healthStore.cup} ml</button><button data-action="healthCup">容量を変更</button><button data-action="healthWaterUndo">直前の1杯を戻す</button></div></article>
  <article class="health-card"><h3>運動・就床の時間</h3><div class="health-controls">${[['minutes','運動'],['bedtime','就床']].map(([k,label])=>`<button class="secondary-button" data-action="healthSession" data-kind="${k}" ${session&&session.kind!==k?'disabled':''}>${session?.kind===k?label+'を終了・確認':label+'を開始'}</button>`).join('')}</div><p class="health-caption" id="health-session-status"></p>${session?'<button data-action="healthSessionDiscard">この計時を取り消す</button>':''}<p class="health-caption">今日の就床：${healthNumber(h.bedtime)} 分。就床は睡眠の実測ではありません。終了し忘れた場合は保存前に時刻を修正できます。</p></article>
  <article class="health-card health-steps"><header><h3>7日間の歩数</h3><small>保存された記録のみ</small></header><div class="bar-chart">${week.map(d=>`<div aria-label="${d.date} ${d.value===null?'未記録':healthNumber(d.value)+'歩'}"><span style="height:${(d.value||0)/scale*100}%"></span><small>${healthNumber(d.value)}</small>${d.date.slice(5)}</div>`).join('')}</div></article>
  <details class="health-card" id="health-history"><summary>履歴・削除（${healthStore.records.length}件）</summary><p class="health-caption">最新50件。すべての記録はJSONに書き出せます。</p>${healthStore.records.slice().sort((a,b)=>b.at-a.at).slice(0,50).map(r=>`<div class="health-record"><div><b>${healthKinds[r.kind][0]} ${healthNumber(r.value)} ${healthKinds[r.kind][1]}</b><small>${esc(new Date(r.at).toLocaleString('ja-JP'))} · ${r.imported?'取込・':''}${healthSources[r.source]}</small></div><button data-action="healthDelete" data-id="${esc(r.id)}" aria-label="${healthKinds[r.kind][0]}の記録を削除">削除</button></div>`).join('')||'<p>記録はまだありません。</p>'}</details>
  <details class="health-card" id="health-help"><summary>保存・連携・できること</summary><p class="health-caption">センサーは毎回の開始操作と許可が必要です。動作センサーは対応スマホ、Bluetoothは対応するChrome等とHTTPSで利用できます。iPhoneのSafariはWeb Bluetoothに非対応です。非対応・拒否時は手動記録を使えます。</p><p class="health-caption">画面非表示・アプリ移動でセンサーを停止します。ブラウザ終了中の常時計測、Appleヘルスケア・Health Connectの直接同期はありません。時間記録のみ開始時刻から復元できます。医療診断・緊急監視には使用できません。</p><p class="health-caption">リングの目盛りは8,000歩・30分・2,000mlを基準にした表示です。個人の推奨量ではありません。日付は記録した端末の現地日付。容量上限20,000件では自動削除せず保存を停止します。ブラウザのデータ消去で記録は消えます。</p><p class="health-caption">JSON取込はこの版の書き出し形式のみ。重複IDは追加しません。別機器で重複する活動を取り込むと合算されるため、不要な記録を削除してください。${navigator.locks?'':'このブラウザでは複数タブで同時編集しないでください。'}</p><div class="health-controls"><button data-action="healthExport">JSONを書き出す</button><button data-action="healthImport">JSONを一括取込</button><button data-action="healthClear">ヘルスケアの記録を削除</button></div></details>
  ${A.load('healthLegacy',null)?'<article class="health-card"><h3>旧形式の記録は集計から除外しました</h3><p class="health-caption">日付・出所がなく初期値との区別ができないため、別保管しています。必要な実記録だけ確認して追加してください。</p><button data-action="healthLegacyExport">旧記録を退避</button><button data-action="healthLegacyDelete">旧記録を削除</button></article>':''}</div>`);
  healthUpdateLive();
}
function healthRefresh(){
  if(A.current!=='health')return;
  const scroll=$('.health-dashboard')?.scrollTop||0,active=document.activeElement?.dataset,opened=A.$$('.health-dashboard details[open]').map(d=>d.id);
  healthApp();$('.health-dashboard').scrollTop=scroll;opened.forEach(id=>{if($('#'+id))$('#'+id).open=true;});
  if(active?.action)A.$$('[data-action]',$('.health-dashboard')).find(b=>b.dataset.action===active.action&&b.dataset.id===active.id&&b.dataset.kind===active.kind)?.focus({preventScroll:true});
}
function healthUpdateLive(){
  if(A.current!=='health')return;
  const set=(id,value)=>{const el=$('#'+id);if(el)el.textContent=value;};
  set('health-motion-status',healthMotion?(healthMotionAt&&Date.now()-healthMotionAt<4000?'受信中・歩数は推定':'データ受信待ち'):healthMotionStatus);
  const fresh=healthLiveHeart&&Date.now()-healthLiveHeart.at<15000&&healthDevice?.gatt?.connected;
  set('health-bluetooth-status',healthDevice?.gatt?.connected&&healthLiveHeart&&!fresh?'接続中・15秒以上受信なし':healthBluetoothStatus);
  set('health-live-heart',fresh?String(healthLiveHeart.value):'—');
  const last=healthStore.records.filter(r=>r.kind==='heartRate').sort((a,b)=>b.at-a.at)[0];
  set('health-heart-caption',fresh?'機器から受信中・医療用途ではありません':last?`最新の保存値：${last.value} bpm（${new Date(last.at).toLocaleString('ja-JP')}）。現在値ではありません。`:'心拍は未取得です。未接続時に数値を補いません。');
  const s=healthStore.session;set('health-session-status',s?`${healthKinds[s.kind][0]}の計時中 ${timeString((Date.now()-s.start)/1000)} · ${new Date(s.start).toLocaleString('ja-JP')}から`:'開始と終了の確認だけで時刻を記録');
}
A.healthData=()=>({...healthSummary()});
A.healthExportData=()=>{
  if(!healthRead()){let raw=null;try{raw=localStorage.getItem('aura.health');}catch{}return {format:'aura-health-recovery',raw,pending:[...healthInFlight,...healthPending]};}
  const records=new Map([...healthStore.records,...healthInFlight,...healthPending].map(r=>[r.id,r]));
  return {format:'aura-health',version:2,exportedAt:new Date().toISOString(),records:structuredClone([...records.values()]),pendingCount:healthPending.length+healthInFlight.length,session:healthStore.session};
};
A.apps.health.render=()=>{
  healthMigrate();healthRead();healthApp();
  const tick=setInterval(()=>{if(document.hidden)return;if(healthDay!==healthDate(Date.now()))healthRefresh();healthUpdateLive();},1000);
  const flush=setInterval(()=>{if(healthPending.length&&!healthError)healthFlush();},5000);
  A.cleanups.push(()=>{clearInterval(tick);clearInterval(flush);healthStopMotion('アプリ移動で停止');healthDisconnect('アプリ移動で切断');});
};
A.actions.healthWater=async()=>{
  if(!healthRead()){healthRefresh();return;}
  if(!healthQueue(healthRecord('water',healthStore.cup)))return;
  if(await healthFlush()){A.haptic();if(A.current==='health')$('[data-action="healthWater"]')?.focus({preventScroll:true});}
};
A.actions.healthWaterUndo=async()=>healthWrite(s=>{const r=s.records.filter(r=>r.kind==='water'&&r.source==='manual'&&!r.imported&&r.date===healthDate(Date.now())).sort((a,b)=>b.at-a.at)[0];if(!r){A.toast('今日の取り消せる水分記録はありません');return null;}s.records=s.records.filter(x=>x.id!==r.id);return s;});
function healthForm(title,html,save){
  A.form(title,html,()=>false);const form=$('#modal-form');
  form.onsubmit=async e=>{e.preventDefault();if(form.dataset.busy)return;form.dataset.busy='1';const button=form.querySelector('[type="submit"]');button.disabled=true;try{if(await save(Object.fromEntries(new FormData(form)))){if(form.isConnected)A.closeOverlay();}}catch{healthError='保存を完了できませんでした。入力を残しています。再試行してください。';A.toast(healthError);healthRefresh();}finally{delete form.dataset.busy;button.disabled=false;}};
}
A.actions.healthCup=()=>healthForm('いつもの1杯',`<label class="form-label" for="health-cup">容量（ml）</label><select class="text-input" id="health-cup" name="cup">${[100,150,200,250,300,500].map(n=>`<option ${healthStore.cup===n?'selected':''}>${n}</option>`).join('')}</select>`,v=>healthWrite(s=>({...s,cup:Number(v.cup)})));
A.actions.healthAdd=()=>healthForm('記録を追加',`<p>未取得分だけ追加してください。自動記録とは合算されます。</p><label class="form-label" for="health-kind">種類</label><select class="text-input" name="kind" id="health-kind">${Object.entries(healthKinds).filter(([k])=>k!=='heartRate').map(([k,[label,unit]])=>`<option value="${k}">${label}（${unit}）</option>`).join('')}</select><label class="form-label" for="health-value">追加する値</label><input class="text-input" id="health-value" name="value" type="number" min="0" max="100000" step="1" required><label class="form-label" for="health-date">日付</label><input class="text-input" id="health-date" name="date" type="date" min="2000-01-01" max="${healthDate(Date.now())}" value="${healthDate(Date.now())}" required>`,v=>{
  const at=v.date===healthDate(Date.now())?Date.now():new Date(v.date+'T12:00:00').getTime(),r=healthRecord(v.kind,Number(v.value),'manual',at);
  if(!v.value.trim()||!healthValidRecord(r)){A.toast('日付・値を確認してください');return false;}
  return healthWrite(s=>{s.records.push(r);return s;});
});
A.actions.healthSession=async el=>{
  healthRead();const kind=el.dataset.kind;if(!['minutes','bedtime'].includes(kind))return;
  const s=healthStore.session;if(s){if(s.kind!==kind)return;return healthFinishSession(s);}
  await healthWrite(store=>{if(store.session){A.toast('別の計時が進行中です');return null;}store.session={id:A.id(),kind,start:Date.now()};return store;});
};
const healthLocalTime=at=>{const d=new Date(at);return `${healthDate(at)}T${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}:${String(d.getSeconds()).padStart(2,'0')}`;};
function healthFinishSession(session){
  healthForm('終了時刻を確認',`<p>そのまま保存できます。終了し忘れた場合だけ修正してください。最大24時間です。</p><label class="form-label" for="health-end">終了時刻</label><input class="text-input" type="datetime-local" step="1" name="end" id="health-end" value="${healthLocalTime(Math.ceil(Date.now()/1000)*1000)}" required>`,v=>{
    const end=new Date(v.end).getTime();if(!Number.isFinite(end)||end<session.start||end>Date.now()+1000||end-session.start>86400000){A.toast('開始以降・現在以前の24時間以内を指定してください');return false;}
    return healthWrite(s=>{
      if(s.session?.id!==session.id){A.toast('この計時は別の画面で変更されました');return null;}
      // Split across local midnight instead of assigning a whole session to the end date.
      let at=session.start;while(at<end){const midnight=new Date(at);midnight.setHours(24,0,0,0);const next=Math.min(end,midnight.getTime());s.records.push(healthRecord(session.kind,(next-at)/60000,'timer',at,`${session.id}:${healthDate(at)}`));at=next;}
      s.session=null;return s;
    });
  });
}
A.actions.healthSessionDiscard=()=>{
  const id=healthStore.session?.id;if(!id)return;
  A.confirm('計時を取り消す','進行中の時間は記録しません。',()=>healthWrite(s=>{if(s.session?.id!==id){A.toast('この計時は別の画面で変更されました');return null;}return {...s,session:null};}));
};
A.actions.healthDelete=el=>{const id=el.dataset.id;A.confirm('この記録を削除','削除すると日別の合計にも反映されます。',()=>healthWrite(s=>({...s,records:s.records.filter(r=>r.id!==id)})));};
function healthOnMotion(e){
  if(!healthMotion||document.hidden)return;
  const a=e.accelerationIncludingGravity;if(!a||![a.x,a.y,a.z].every(Number.isFinite))return;
  const now=Date.now(),m=Math.hypot(a.x,a.y,a.z);healthMotionAt=now;
  if(healthMotionBase===null){healthMotionBase=m;return;}
  healthMotionBase=.9*healthMotionBase+.1*m;const delta=m-healthMotionBase;
  if(delta<.3)healthMotionHigh=false;
  if(delta>1.2&&!healthMotionHigh&&now-healthLastStep>280){
    healthMotionHigh=true;healthLastStep=now;
    if(healthCandidate&&now-healthCandidate<2000){healthQueue(healthRecord('steps',1,'motion',now));}healthCandidate=now;
  }
}
function healthQueue(r){
  if(healthPending.length+healthInFlight.length>=1000){healthError='未保存の記録が多いため新しい記録の受付と計測を停止しました。再試行か退避をしてください。';healthStopMotion('保存待ちで停止');healthDisconnect('保存待ちで切断');return false;}
  // Coalesce step observations in the same local minute; keep timestamp and source.
  const last=healthPending.at(-1);if(r.kind==='steps'&&last?.kind==='steps'&&last.date===r.date&&Math.floor(last.at/60000)===Math.floor(r.at/60000)){last.value+=r.value;}else healthPending.push(r);
  return true;
}
async function healthFlush(){
  if(healthFlushing||!healthPending.length)return;healthFlushing=true;
  const batch=healthPending,epoch=healthEpoch;healthInFlight=batch;healthPending=[];
  let saved=false;
  try{
    saved=await healthWrite(s=>{if(epoch!==healthEpoch)return null;const ids=new Set(s.records.map(r=>r.id));s.records.push(...batch.filter(r=>!ids.has(r.id)));return s;});
    if(!saved&&epoch===healthEpoch)healthPending.unshift(...batch);
  }finally{healthInFlight=[];healthFlushing=false;healthRefresh();}
  if(saved&&healthPending.length&&epoch===healthEpoch)return healthFlush();
  return saved;
}
function healthStopMotion(status='停止中'){
  healthMotionToken++;healthMotion=false;healthMotionStatus=status;window.removeEventListener('devicemotion',healthOnMotion);healthMotionRelease?.();healthMotionRelease=null;healthFlush();healthRefresh();
}
A.actions.healthMotion=async()=>{
  if(healthMotion)return healthStopMotion();if(healthMotionBusy)return;
  if(!window.isSecureContext||!window.DeviceMotionEvent){healthMotionStatus='この環境は非対応';healthRefresh();return;}
  healthMotionBusy=true;const token=++healthMotionToken;
  try{
    if(typeof DeviceMotionEvent.requestPermission==='function'&&await DeviceMotionEvent.requestPermission()!=='granted')throw new Error('動作センサーが許可されていません');
    if(token!==healthMotionToken||A.current!=='health'||document.hidden)return;
    if(navigator.locks){const acquired=await new Promise(resolve=>navigator.locks.request('aura-health-motion',{ifAvailable:true},lock=>{if(!lock){resolve(false);return;}return new Promise(release=>{healthMotionRelease=release;resolve(true);});}).catch(()=>resolve(false)));if(!acquired)throw new Error('別のタブが動作センサーを使用中です');}
    if(token!==healthMotionToken||A.current!=='health'||document.hidden){healthMotionRelease?.();healthMotionRelease=null;return;}
    healthMotion=true;healthMotionAt=0;healthMotionBase=null;healthMotionHigh=false;healthLastStep=0;healthCandidate=0;
    window.addEventListener('devicemotion',healthOnMotion);
  }catch(e){if(token===healthMotionToken)healthMotionStatus=e.message||'動作センサーを開始できません';}finally{healthMotionBusy=false;healthRefresh();}
};
function healthOnHeart(e){
  if(!healthDevice?.gatt?.connected||document.hidden)return;
  const v=e.target.value;if(!(v instanceof DataView)||v.byteLength<2)return;
  const flags=v.getUint8(0),wide=!!(flags&1);if(wide&&v.byteLength<3)return;
  // If the device supports contact detection, ignore samples while contact is absent.
  if((flags&4)&&!(flags&2)){healthLiveHeart=null;healthBluetoothStatus='装着を確認してください';healthUpdateLive();return;}
  const value=wide?v.getUint16(1,true):v.getUint8(1);if(value<20||value>300)return;
  const at=Date.now();healthLiveHeart={value,at};healthBluetoothStatus='接続・受信中';healthUpdateLive();
  const minute=String(Math.floor(at/60000));if(minute!==healthLastHeartMinute){healthLastHeartMinute=minute;healthQueue(healthRecord('heartRate',value,'bluetooth',at));healthFlush();}
}
function healthDisconnected(){healthDisconnect('機器が切断されました。再接続してください');}
function healthDisconnect(status='未接続'){
  healthBluetoothToken++;healthCharacteristic?.removeEventListener('characteristicvaluechanged',healthOnHeart);healthCharacteristic=null;
  const device=healthDevice;healthDevice=null;device?.removeEventListener('gattserverdisconnected',healthDisconnected);try{device?.gatt?.disconnect();}catch{/* Already disconnected or adapter unavailable. */}healthLiveHeart=null;healthBluetoothStatus=status;healthFlush();healthRefresh();
}
A.actions.healthBluetooth=async()=>{
  if(healthBluetoothBusy)return;if(healthDevice)return healthDisconnect();
  if(!window.isSecureContext||!navigator.bluetooth?.requestDevice){healthBluetoothStatus='この環境は非対応';healthRefresh();return;}
  healthBluetoothBusy=true;healthBluetoothStatus='機器の選択・接続待ち';healthRefresh();const token=++healthBluetoothToken;let device;
  try{
    device=await navigator.bluetooth.requestDevice({filters:[{services:['heart_rate']}]});
    if(token!==healthBluetoothToken||A.current!=='health'||document.hidden)return;
    healthDevice=device;device.addEventListener('gattserverdisconnected',healthDisconnected);
    const server=await device.gatt.connect(),service=await server.getPrimaryService('heart_rate'),characteristic=await service.getCharacteristic('heart_rate_measurement');
    if(token!==healthBluetoothToken||A.current!=='health'||document.hidden){device.gatt.disconnect();return;}
    healthCharacteristic=characteristic;characteristic.addEventListener('characteristicvaluechanged',healthOnHeart);await characteristic.startNotifications();
    if(token!==healthBluetoothToken){device.gatt.disconnect();return;}
    healthBluetoothStatus=healthLiveHeart?'接続・受信中':'接続済み・データ受信待ち';
  }catch(e){if(token===healthBluetoothToken)healthDisconnect(e.name==='NotFoundError'?'接続をキャンセルしました':'接続できません。許可・対応機器・電源を確認してください');else device?.gatt?.disconnect();}
  finally{healthBluetoothBusy=false;healthRefresh();}
};
A.actions.healthRetry=async()=>{if(healthFlushing)return;if(healthPending.length)await healthFlush();else{healthMigrate();if(healthRead())healthError='';healthRefresh();}};
A.actions.healthImport=()=>{
  A.overlay(`${A.overlayTitle('記録を一括取込')}<p>この版で書き出したaura-health JSON（5MB以下）。プレビュー後に追加します。端末内で処理し、外部送信しません。</p><input id="health-import" type="file" accept=".json,application/json" aria-label="ヘルスケアJSON"><p id="health-import-status" role="status"></p>`);
  $('#health-import').onchange=async e=>{
    const file=e.target.files[0],status=$('#health-import-status');if(!file)return;
    try{
      if(file.size>5*1024*1024)throw new Error('5MB以下のJSONを選択してください');const data=JSON.parse(await file.text());
      if(data?.format!=='aura-health'||data.version!==2||!Array.isArray(data.records)||data.records.length>HEALTH_LIMIT||!data.records.every(healthValidRecord)||new Set(data.records.map(r=>r.id)).size!==data.records.length)throw new Error('形式・日付・値に不正な記録があります。取り込みませんでした。');
      if(!status.isConnected)return;
      if(!healthRead())throw new Error(healthError);
      const ids=new Set(healthStore.records.map(r=>r.id)),fresh=data.records.filter(r=>!ids.has(r.id));
      A.confirm('取込内容を確認',`${fresh.length}件を追加、${data.records.length-fresh.length}件は既存IDのためスキップします。別IDの同じ活動は重複集計されます。`,async()=>{
        if(await healthWrite(s=>{const existing=new Set(s.records.map(r=>r.id));s.records.push(...data.records.filter(r=>!existing.has(r.id)).map(({id,kind,value,source,at,date})=>({id,kind,value,source,at,date,imported:true})));return s;}))A.toast('記録を取り込みました');
      });
    }catch(error){if(status.isConnected)status.textContent=error.message;}
  };
};
A.actions.healthLegacyExport=()=>A.download(new Blob([JSON.stringify(A.load('healthLegacy',null),null,2)],{type:'application/json'}),'aura-health-legacy-unverified.json');
A.actions.healthLegacyDelete=()=>A.confirm('旧形式の記録を削除','元に戻せません。必要なら先に旧記録を退避してください。',()=>{try{localStorage.removeItem('aura.healthLegacy');healthRefresh();}catch{A.toast('削除できませんでした');}});
A.actions.healthClear=()=>A.confirm('ヘルスケアの記録をすべて削除','計時・未保存データ・旧記録も削除します。他のアプリの記録は残します。必要なら先にJSONを書き出してください。',async()=>{
  const clear=()=>{if(!A.save('health',healthBlank())){healthError='記録を削除できませんでした。保存領域を確認してください。';healthRefresh();return;}healthEpoch++;healthPending=[];healthInFlight=[];healthStopMotion();healthDisconnect();healthStore=healthBlank();healthError='';try{localStorage.removeItem('aura.healthLegacy');}catch{healthError='旧記録を削除できませんでした';}healthRefresh();};
  try{if(navigator.locks)await navigator.locks.request('aura-health-write',clear);else clear();}catch{healthError='削除処理を完了できませんでした。再試行してください。';healthRefresh();}
});
window.addEventListener('storage',e=>{if(e.key==='aura.health'||e.key===null){healthRead();healthRefresh();}});
document.addEventListener('visibilitychange',()=>{if(document.hidden){healthStopMotion('画面非表示で停止');healthDisconnect('画面非表示で切断');}else if(A.current==='health'){healthRead();healthRefresh();}});
window.addEventListener('pagehide',()=>{healthStopMotion();healthDisconnect();});
window.addEventListener('beforeunload',e=>{if(healthPending.length||healthFlushing){e.preventDefault();e.returnValue='';}});
// Wallet holds fictional balance only, with no payment integrations.
let wallet=A.load('wallet',{balance:3240,transactions:[{id:'tx1',title:'喫茶 余白',amount:-580,date:Date.now()-3600000},{id:'tx2',title:'青葉駅 → 緑町駅',amount:-220,date:Date.now()-7200000},{id:'tx3',title:'デモチャージ',amount:2000,date:Date.now()-86400000}]});
// All artwork is local vector geometry. Paint IDs are unique even in app snapshots.
let walletPaintId=0;
function walletArt(kind){
  const id=`mori-art-${++walletPaintId}`;
  const gold=`url(#${id}-gold)`,green=`url(#${id}-green)`;
  const drawings={
    charge:`<ellipse cx="34" cy="53" rx="23" ry="5" fill="#173e3420"/><path d="M12 42v6c0 8 39 8 39 0v-6" fill="#af8045"/><ellipse cx="31.5" cy="42" rx="19.5" ry="7" fill="${gold}" stroke="#b48b50"/><path d="M17 47v5m6-3v5m7-4v5m7-5v4m7-5v3" stroke="#fce4aa"/><circle cx="32" cy="28" r="18" fill="${gold}" stroke="#ad8048"/><circle cx="32" cy="28" r="14" fill="none" stroke="#fff0c6"/><path d="M32 20v16m-8-8h16" stroke="#876436" stroke-width="2.5" stroke-linecap="round"/><path d="M20 17a17 17 0 0 1 18-5" fill="none" stroke="#fff7df" stroke-width="2"/>`,
    coffee:`<ellipse cx="32" cy="52" rx="24" ry="5" fill="#173e3420"/><ellipse cx="31" cy="47" rx="23" ry="6" fill="#d3b492"/><ellipse cx="31" cy="45" rx="22" ry="5" fill="#f6e9d8"/><path d="M45 24h5c13 0 10 17-4 17" fill="none" stroke="#b79675" stroke-width="5"/><path d="M14 23h32l-3 17c-2 10-24 10-26 0Z" fill="${gold}"/><ellipse cx="30" cy="23" rx="16" ry="6" fill="#fff2da"/><ellipse cx="30" cy="24" rx="12" ry="4" fill="#68442e"/><path d="M23 24q7-6 14 0q-7 6-14 0" fill="none" stroke="#d9b88c"/><path d="M24 15c-5-5 4-6 0-11m11 10c-4-4 4-6 1-10" fill="none" stroke="#82998c" stroke-width="1.5" stroke-linecap="round"/>`,
    train:`<ellipse cx="32" cy="55" rx="20" ry="4" fill="#173e3420"/><path d="M24 46l-6 12m22-12 6 12m-26-5h24" stroke="#617b72" stroke-width="2"/><rect x="15" y="8" width="34" height="41" rx="11" fill="${green}" stroke="#486d61"/><path d="M19 32h26v8H19Z" fill="#dec891"/><rect x="20" y="17" width="24" height="13" rx="4" fill="#c7e2db"/><path d="M32 17v13m-10-9 7-2m5 2 7-2" stroke="#f3fff3"/><path d="M26 12h12" stroke="#d1e2bc" stroke-width="2" stroke-linecap="round"/><circle cx="23" cy="40" r="3" fill="#fff3c8"/><circle cx="41" cy="40" r="3" fill="#fff3c8"/>`,
    book:`<ellipse cx="32" cy="54" rx="22" ry="4" fill="#173e3420"/><path d="M13 13 39 8l12 9v33l-27 6-11-9Z" fill="#385e50"/><path d="m17 16 24-5 7 6-25 6Z" fill="#fff2dc"/><path d="m23 23 28-6v33l-28 6Z" fill="${green}"/><path d="M17 17v29l6 6V23Z" fill="#87a38c"/><path d="m29 29 15-3m-15 8 11-2m-11 8 15-3" stroke="#d4dfbe" stroke-linecap="round"/><path d="m39 20 5-1v11l-3-2-2 3Z" fill="#d8b580"/>`,
    pay:`<ellipse cx="32" cy="53" rx="23" ry="5" fill="#173e3420"/><g transform="rotate(-12 30 34)"><rect x="9" y="21" width="44" height="29" rx="6" fill="#284e42"/><rect x="9" y="18" width="44" height="29" rx="6" fill="${green}" stroke="#8aaa94"/><rect x="15" y="27" width="10" height="8" rx="2" fill="${gold}"/><path d="M15 40h15m10-12q5 5 0 10m4-14q9 9 0 18" fill="none" stroke="#e6edd3" stroke-width="1.5"/></g><path d="M27 9q7-5 14 0m-11 5q4-3 8 0" fill="none" stroke="#587f68" stroke-width="2" stroke-linecap="round"/>`,
    receipt:`<ellipse cx="32" cy="55" rx="20" ry="4" fill="#173e3420"/><path d="M17 8h30v46l-5-3-5 3-5-3-5 3-5-3-5 3Z" fill="#fff4df" stroke="#b5a48b"/><circle cx="32" cy="22" r="8" fill="${green}"/><path d="m28 22 3 3 5-6M24 37h16m-16 6h11" fill="none" stroke="#7f977e" stroke-width="2"/><path d="m28 22 3 3 5-6" fill="none" stroke="#fff" stroke-width="1.5"/>`
  };
  return `<svg class="mori-object mori-object-${kind}" viewBox="0 0 64 64" fill="none" aria-hidden="true" focusable="false"><defs><linearGradient id="${id}-gold" x1="0" y1="0" x2="1" y2="1"><stop stop-color="#fff0c7"/><stop offset=".45" stop-color="#dfbf82"/><stop offset=".7" stop-color="#f4daa4"/><stop offset="1" stop-color="#b68c50"/></linearGradient><linearGradient id="${id}-green" x2="1" y2="1"><stop stop-color="#acc4a5"/><stop offset=".45" stop-color="#739982"/><stop offset="1" stop-color="#416b5b"/></linearGradient></defs>${drawings[kind]||drawings.receipt}</svg>`;
}
function walletLandscape(){
  const id=`mori-land-${++walletPaintId}`;
  return `<svg class="mori-landscape" viewBox="0 0 360 230" preserveAspectRatio="xMidYMid slice" aria-hidden="true" focusable="false"><defs>
    <linearGradient id="${id}-sky" x2="1" y2="1"><stop stop-color="#597c67"/><stop offset=".5" stop-color="#244f42"/><stop offset="1" stop-color="#123d35"/></linearGradient>
    <linearGradient id="${id}-ridge" x2=".3" y2="1"><stop stop-color="#a2b89a"/><stop offset="1" stop-color="#376754"/></linearGradient>
    <linearGradient id="${id}-foil" x2="1" y2=".6"><stop stop-color="#d2b57b"/><stop offset=".3" stop-color="#fff1be"/><stop offset=".5" stop-color="#b5965e"/><stop offset=".75" stop-color="#f9dfa1"/><stop offset="1" stop-color="#b38a4e"/></linearGradient>
    <radialGradient id="${id}-sun"><stop stop-color="#ffedbd"/><stop offset=".72" stop-color="#dbc993"/><stop offset="1" stop-color="#b5ad78"/></radialGradient>
    <pattern id="${id}-grain" width="5" height="5" patternUnits="userSpaceOnUse"><path d="M0 .5h5" stroke="#fff" stroke-opacity=".045" stroke-width=".5"/><circle cx="2" cy="3" r=".45" fill="#fff" opacity=".09"/></pattern>
  </defs><rect width="360" height="230" fill="url(#${id}-sky)"/>
  <g class="mori-orbits" fill="none" stroke="#dbd8a4" stroke-width=".55" opacity=".19">${Array.from({length:10},(_,i)=>`<ellipse cx="303" cy="100" rx="${45+i*9}" ry="${57+i*11}" transform="rotate(-28 303 100)"/>`).join('')}</g>
  <g class="mori-sun"><circle cx="276" cy="65" r="29" fill="url(#${id}-sun)"/><circle cx="276" cy="65" r="34" fill="none" stroke="#e6d5a1" stroke-opacity=".3"/><path d="M250 59h52m-54 6h56m-54 6h52" stroke="#797e55" stroke-opacity=".17" stroke-width=".6"/></g>
  <path d="m123 174 40-47 21 12 41-58 33 43 30-17 72 44v79H123Z" fill="#91aa8a" opacity=".36"/>
  <path d="m158 196 49-52 26 13 42-55 33 38 25-10 27 20v80H158Z" fill="url(#${id}-ridge)"/>
  <path d="m275 102-7 32 10-8 15 20-6-27Z" fill="#dce0b9" opacity=".52"/>
  <path d="M95 230c60-61 100-21 147-67s79 4 118-19v86Z" fill="#2e624f"/><path d="M172 230c45-34 60-26 92-47s70-9 96-16" fill="none" stroke="#c1c69a" stroke-width=".7" opacity=".6"/>
  <path d="M208 230c43-54 103-21 152-60v60Z" fill="#184a3e"/>
  <g fill="#0c382e">${[242,261,302,324,345].map((x,i)=>`<path d="m${x} ${179-i*3} -9 19h5l-9 15h11v15h4v-15h11l-9-15h5Z"/>`).join('')}</g>
  <rect width="360" height="230" fill="url(#${id}-grain)"/>
  <g transform="translate(26 78)"><rect width="39" height="29" rx="6" fill="url(#${id}-foil)" stroke="#f7e8b1" stroke-width=".7"/><g fill="none" stroke="#846d43" stroke-width=".7"><rect x="12" y="6" width="15" height="17" rx="4"/><path d="M0 9h12m15 0h12M0 20h12m15 0h12M9 0l6 7m15-7-6 7M9 29l6-7m15 7-6-7"/></g><path d="M5 2h28" stroke="#fff6d2"/></g>
  <g transform="translate(77 84)" fill="none" stroke="#e8e4c7" stroke-width="1.5" stroke-linecap="round"><path d="M0 6q4 4 0 8m5-12q8 8 0 16m5-20q12 12 0 24"/></g>
  <rect x="1" y="1" width="358" height="228" rx="21" fill="none" stroke="#ebefc6" stroke-opacity=".38"/><rect x="5" y="5" width="350" height="220" rx="18" fill="none" stroke="#d5d9b1" stroke-opacity=".12"/>
  </svg>`;
}
function walletApp(result){
  // Aura.open may pass route arguments; only an explicit successful transaction animates.
  const completed=result?.kind==='charge'||result?.kind==='pay';
  $('#app-screen').classList.add('mori-wallet');
  A.view(A.nav('ウォレット')+`<div class="app-content mori-content">
    <header class="mori-heading"><div><p class="mori-eyebrow">MORI / WALLET</p><h3>日々に、余白を。</h3></div><span class="demo-label">デモ・架空残高</span></header>
    <div class="mori-stage"><div class="mori-card-stack" aria-hidden="true"></div><div class="mori-card-float"><div class="wallet-card mori-card${completed?' mori-card-updated':''}">
      ${walletLandscape()}<div class="mori-card-sheen" aria-hidden="true"></div>
      <div class="mori-card-top"><h3>mori<span>.</span></h3><span>FOREST EDITION<br><b>DEMO CARD</b></span></div>
      <div class="mori-balance"><small>ご利用可能残高<span>架空</span></small><strong>¥${wallet.balance.toLocaleString()}</strong></div>
      <div class="mori-card-bottom"><span>•••• &nbsp;2048</span><span>mori / aura</span></div>
    </div></div><p class="mori-card-caption"><span aria-hidden="true"></span>このブラウザだけの、デモカード</p></div>
    ${completed?`<div class="mori-complete" role="status"><svg viewBox="0 0 48 48" aria-hidden="true" focusable="false"><circle cx="24" cy="24" r="20"/><path d="m15 24 6 6 13-14" pathLength="1"/></svg><div><strong>${result.kind==='charge'?'デモチャージ完了':'デモのお買いもの完了'}</strong><small>実際のお金は移動していません</small></div><span>${result.kind==='charge'?'+':'−'}¥${result.amount.toLocaleString()}</span></div>`:''}
    <div class="wallet-actions mori-actions"><button class="secondary-button" data-action="walletCharge">${walletArt('charge')}<span>デモチャージ<small>残高を追加</small></span><b aria-hidden="true">＋</b></button><button class="secondary-button" data-action="walletPay">${walletArt('pay')}<span>デモで支払う<small>お買いもの体験</small></span><b aria-hidden="true">↗</b></button></div>
    <section class="mori-history" aria-labelledby="mori-history-title"><header><h3 id="mori-history-title">デモ履歴</h3><span>最新 ${Math.min(wallet.transactions.length,15)} 件</span></header>
    <div class="mori-transactions">${wallet.transactions.slice(0,15).map((t,i)=>{const kind=t.amount>0?'charge':/喫茶|コーヒー/.test(t.title)?'coffee':/駅|乗車|青葉線/.test(t.title)?'train':/書店|文庫/.test(t.title)?'book':'receipt';return `<div class="transaction-row mori-transaction${completed&&i===0?' mori-transaction-new':''}" style="--mori-delay:${Math.min(i,5)*45}ms"><div class="mori-transaction-art">${walletArt(kind)}</div><div class="mori-transaction-info"><strong>${esc(t.title)}</strong><small>${new Date(t.date).toLocaleDateString('ja-JP',{month:'short',day:'numeric'})} <span>· ${t.amount>0?'チャージ':'お支払い'}</span></small></div><span class="mori-amount${t.amount>0?' mori-credit':''}">${t.amount>0?'+':'−'} ¥${Math.abs(t.amount).toLocaleString()}</span></div>`;}).join('')||`<div class="mori-empty">${walletArt('receipt')}<strong>まだ履歴はありません</strong><p>デモチャージから、はじめましょう。</p></div>`}</div></section>
    <footer class="mori-disclaimer">${icon('info')}<p>実決済・乗車はできません。<br>個人情報・カード番号は入力しないでください。</p></footer>
  </div>`);
  // Element-scoped handlers disappear with this view: no global listeners or RAF loops.
  const stage=$('.mori-stage'),card=$('.mori-card');
  const reset=()=>{card.style.removeProperty('--mori-rx');card.style.removeProperty('--mori-ry');card.style.removeProperty('--mori-light-x');card.style.removeProperty('--mori-light-y');};
  stage.onpointermove=e=>{
    if(e.pointerType!=='mouse'||A.settings.reduceMotion||matchMedia('(prefers-reduced-motion: reduce)').matches)return reset();
    const box=stage.getBoundingClientRect(),x=Math.max(0,Math.min(1,(e.clientX-box.left)/box.width)),y=Math.max(0,Math.min(1,(e.clientY-box.top)/box.height));
    card.style.setProperty('--mori-rx',`${(0.5-y)*8}deg`);card.style.setProperty('--mori-ry',`${(x-0.5)*10}deg`);
    card.style.setProperty('--mori-light-x',`${x*100}%`);card.style.setProperty('--mori-light-y',`${y*100}%`);
  };
  stage.onpointerleave=reset;stage.onpointercancel=reset;
}
function walletCommit(title,amount,kind){
  const next={...wallet,balance:wallet.balance+amount,transactions:[{id:A.id(),title,amount,date:Date.now()},...wallet.transactions]};
  // Never celebrate or change the displayed balance if persistence failed.
  if(!Number.isSafeInteger(next.balance)){A.toast('デモ残高の上限を超えています');return false;}
  if(!A.save('wallet',next)){A.toast('保存できませんでした。もう一度お試しください');return false;}
  wallet=next;walletApp({kind,amount:Math.abs(amount)});
  A.toast(kind==='charge'?'デモ残高を追加済み':'デモ完了・実決済なし');
}
A.apps.wallet.render=walletApp;
A.actions.walletCharge=()=>A.form('デモ残高を追加',`<div class="mori-form-art">${walletArt('charge')}<span>架空の残高を追加します。<br>実際のお金は移動しません。</span></div><label class="form-label">金額（デモ）</label><select class="text-input" name="amount"><option value="1000">¥1,000</option><option value="3000">¥3,000</option><option value="5000">¥5,000</option></select>`,v=>{
  const amount=Number(v.amount);if(![1000,3000,5000].includes(amount))return false;
  return walletCommit('デモチャージ',amount,'charge');
},'デモチャージ');
A.actions.walletPay=()=>A.form('デモのお買いもの',`<div class="mori-form-art">${walletArt('pay')}<span>架空の商品でお買いもの。<br>実決済・乗車はできません。</span></div><label class="form-label">購入するもの（架空）</label><select class="text-input" name="item"><option value="coffee">喫茶 余白 · コーヒー ¥580</option><option value="train">青葉線 · 乗車 ¥220</option><option value="book">栞の書店 · 文庫本 ¥820</option></select>`,v=>{
  const items={coffee:['喫茶 余白',580],train:['青葉線 デモ乗車',220],book:['栞の書店',820]};
  if(!Object.hasOwn(items,v.item))return false;
  const [title,amount]=items[v.item];
  if(wallet.balance<amount){A.toast('デモ残高が足りません。チャージしてください。');return false;}
  return walletCommit(title,-amount,'pay');
},'デモ支払い');
// Local text file CRUD and client-side downloads.
let files=A.load('files',[{id:'file-welcome',name:'はじめに.txt',content:'auraへようこそ。\n\nこのファイルアプリでは、テキストファイルを作成・保存・読み込むことができます。\n\n端末にあるすべてのファイルにはアクセスしません。\n選択して読み込んだテキストだけを、このブラウザに保存します。\n\nダウンロードボタンから、実際の端末に保存できます。',date:Date.now()},{id:'file-journey',name:'小さな旅の計画.md',content:'# 次の週末\n\n## 持っていくもの\n- 読みかけの本\n- カメラ\n- 小さなノート\n\n## やってみたいこと\n1. 知らない道を歩く\n2. 喫茶店でひと休み\n3. 空の写真を一枚撮る\n\n急がなくても、大丈夫。',date:Date.now()-86400000}]);let selectedFile=null;
function filesApp(){const bytes=new Blob([JSON.stringify(files)]).size;A.view(A.nav('ファイル',`<button data-action="fileNew" aria-label="ファイル作成">${icon('plus')}</button>`)+`<div class="app-content"><div class="storage-card"><header><span>このaura内のテキスト</span><small>${(bytes/1024).toFixed(1)} KB · ${files.length}ファイル</small></header><div class="storage-bar"><span></span><span></span><span></span></div><p>ブラウザ内保存 · 端末本体の容量表示ではありません</p></div>${A.search('file-search','ファイルを検索')}<div class="files-grid" id="files-grid"></div><button class="primary-button" data-action="fileImport" style="margin-top:22px">${icon('download')}テキストを読み込む</button><button class="secondary-button" data-action="fileExportNotes" style="width:100%;margin-top:10px">保存済みメモをJSONで書き出す</button><p class="setting-description" style="margin-top:17px">TXT・MD・JSON・CSV（100KB以下）</p></div>`);const render=q=>{$('#files-grid').innerHTML=files.filter(f=>f.name.includes(q)).map(f=>`<button class="file-tile" data-action="fileOpen" data-id="${f.id}">${icon('document')}<h3>${esc(f.name)}</h3><small>${new Blob([f.content]).size.toLocaleString()} bytes</small></button>`).join('')||'<p class="empty-state" style="grid-column:span 2">ファイルがありません。</p>';};render('');$('#file-search').oninput=e=>render(e.target.value);}
function openFile(id){const f=files.find(f=>f.id===id);if(!f)return;selectedFile=id;A.view(A.nav(esc(f.name),`<button data-action="fileDelete" aria-label="ファイル削除">${icon('trash')}</button>`,'filesHome','戻る')+`<div class="app-content"><p class="section-label">${new Blob([f.content]).size.toLocaleString()} BYTES</p><pre class="file-preview">${esc(f.content)}</pre><button class="primary-button" data-action="fileDownload" style="margin-top:20px">${icon('download')}端末に保存</button><button class="secondary-button" data-action="fileEdit" style="width:100%;margin-top:10px">編集</button></div>`);}
A.currentTextFile=()=>$('.file-preview')?files.find(f=>f.id===selectedFile):null;
A.fileModel={get:()=>files,replace:(list,related={})=>{if(!A.saveBatch({...related,files:list}))return false;files=list;return true;}};
A.importTextFile=(name,content)=>{const next=[{id:A.id(),name,content,date:Date.now()},...files];if(!A.save('files',next))return false;files=next;return true;};
A.apps.files.render=filesApp;A.actions.filesHome=filesApp;A.actions.fileOpen=el=>openFile(el.dataset.id);A.actions.fileDownload=()=>{const f=files.find(f=>f.id===selectedFile);if(f)A.download(new Blob([f.content],{type:'text/plain;charset=utf-8'}),f.name);};A.actions.fileNew=()=>fileEditor();A.actions.fileEdit=()=>fileEditor(selectedFile);
function fileEditor(id){const f=files.find(f=>f.id===id);A.form(f?'ファイルを編集':'新しいテキスト',`<label class="form-label">ファイル名</label><input class="text-input" name="name" value="${esc(f?.name||'新しいファイル.txt')}" required maxlength="80"><label class="form-label">内容</label><textarea class="text-input" name="content" style="height:240px" maxlength="100000">${esc(f?.content||'')}</textarea>`,v=>{if(f){f.name=v.name;f.content=v.content;f.date=Date.now();}else files.unshift({id:A.id(),...v,date:Date.now()});A.save('files',files);filesApp();});}
A.actions.fileDelete=()=>A.confirm('ファイルを削除','このaura内からファイルを削除します。',()=>{files=files.filter(f=>f.id!==selectedFile);A.save('files',files);filesApp();});A.actions.fileImport=()=>{const input=document.createElement('input');input.type='file';input.accept='.txt,.md,.json,.csv,text/plain,application/json';input.onchange=async()=>{const f=input.files[0];if(!f)return;if(f.size>100*1024)return A.toast('100KB以下のテキストファイルを選択');if(!/\.(txt|md|json|csv)$/i.test(f.name))return A.toast('TXT・MD・JSON・CSVに対応しています');try{const content=await f.text();files.unshift({id:A.id(),name:f.name,content,date:Date.now()});A.save('files',files);if(A.current==='files')filesApp();A.toast('ファイルを読み込みました');}catch{A.toast('ファイルを読み込めませんでした');}};input.click();};A.actions.fileExportNotes=()=>{const notes=A.load('notes',[]);A.download(new Blob([JSON.stringify({app:'aura',exportedAt:new Date().toISOString(),notes},null,2)],{type:'application/json'}),'aura-notes.json');A.toast('保存済みメモを書き出済み');};
})();
