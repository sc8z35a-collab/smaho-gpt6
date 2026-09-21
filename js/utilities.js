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
  return `<div class="tm-heading"><div><span class="tm-eyebrow">A LITTLE TIME, JUST FOR YOU</span><h1>時間に、余白を。</h1></div><button class="tm-icon-button" data-action="timerHistory" aria-label="完了履歴">${icon('clock')}</button></div>
  <div class="tm-modes" aria-label="タイマーのモード">${Object.entries(timerModes).map(([id,m])=>`<button data-action="timerMode" data-value="${id}" aria-pressed="${timer.mode===id}" ${busy?'disabled':''}>${m.name}</button>`).join('')}</div>
  <div class="tm-stage ${timer.running?'is-running':''} ${done?'is-complete':''}" data-mode="${timer.mode}">
    <div class="tm-caption"><span class="tm-status-dot"></span><span id="tm-state" role="status">${done?'おつかれさまでした':timer.running?'時間を大切に、ひとつずつ':busy?'ひと息ついても、大丈夫':'準備ができたら、はじめよう'}</span></div>
    <div class="tm-dial">${timerDial()}<div class="tm-dial-center"><span class="tm-dial-label">${esc(timer.label)}</span><strong id="timer-display" role="timer" aria-label="残り時間">${timeString(Math.ceil(timerRemaining()))}</strong><span class="tm-dial-state">${done?'COMPLETE':timer.running?'IN PROGRESS':busy?'PAUSED':'READY WHEN YOU ARE'}</span></div></div>
    <div class="tm-timing"><span>${icon('alarm')}<span id="tm-end"></span></span><span id="tm-percent"></span></div>
  </div>
  ${!busy?`<div class="tm-editor"><span>時間を設定</span><div><label><input type="number" id="timer-minutes" min="0" max="180" step="1" value="${Math.floor(timer.duration/60)}" aria-label="分"><span>分</span></label><span class="tm-colon">:</span><label><input type="number" id="timer-seconds" min="0" max="59" step="1" value="${timer.duration%60}" aria-label="秒"><span>秒</span></label></div><button data-action="timerLabel" aria-label="タイマーの名前を編集">${icon('edit')}</button></div>`:`<div class="tm-session-info"><span>${timerModes[timer.mode].name} · ${timerLength(timer.duration)}</span><button data-action="timerAdd">${icon('plus')} 1分追加</button></div>`}
  <div class="tm-actions"><button class="tm-reset" data-action="timerReset" aria-label="設定時間にリセット">${icon('refresh')}</button><button class="tm-start" data-action="timerToggle">${icon(timer.running?'pause':'play')}<span>${timer.running?'一時停止':done?'もう一度':busy?'再開する':'はじめる'}</span></button><button class="tm-sound" data-action="timerSound" aria-label="終了音" aria-pressed="${timerStore.sound}">${icon(timerStore.sound?'volume':'close')}</button></div>
  <section class="tm-presets"><div class="tm-section-heading"><h2>いつもの時間</h2><button data-action="timerSavePreset" ${busy?'disabled':''}>${icon('plus')} 保存</button></div><div class="tm-preset-grid">${[[1,'ひと呼吸','wind'],[3,'お茶の時間','sun'],[5,'ひと休み','leaf'],[10,'小さな作業','edit']].map(([m,label,ic])=>`<button class="tm-preset ${timer.duration===m*60?'selected':''}" data-action="timerPreset" data-value="${m}" ${busy?'disabled':''}><span class="tm-preset-icon">${icon(ic)}</span><strong>${m}<small> min</small></strong><span>${label}</span></button>`).join('')}</div>
  ${timerStore.presets.length?`<div class="tm-saved">${timerStore.presets.map(p=>`<div><button data-action="timerUsePreset" data-id="${esc(p.id)}" ${busy?'disabled':''}><span>${esc(p.label)}</span><small>${timerLength(p.duration)}</small></button><button data-action="timerDeletePreset" data-id="${esc(p.id)}" aria-label="${esc(p.label)}を削除">${icon('close')}</button></div>`).join('')}</div>`:''}</section>
  <div class="tm-today"><span class="tm-today-icon">${icon('check')}</span><div><strong>今日の小さな積み重ね</strong><span>${today.length?`${today.length}回完了 · ${timerLength(today.reduce((s,h)=>s+h.duration,0))}`:'最初のひとつを、ここから。'}</span></div><button data-action="timerHistory" aria-label="すべての履歴を見る">${icon('chevronRight')}</button></div>
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
      updateTimerView();$('.tm-stage').classList.remove('is-complete');$('#tm-state').textContent='準備ができたら、はじめよう';$('.tm-dial-state').textContent='READY WHEN YOU ARE';
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
A.actions.timerHistory=()=>A.overlay(`${A.overlayTitle('時間の記録')}<p class="tm-history-intro">完了した時間だけを、このブラウザに。<br>最新40件を保存します。</p><div class="tm-history-list">${timerStore.history.map(h=>`<article><span class="tm-history-check">${icon('check')}</span><div><strong>${esc(h.label)}</strong><small>${new Date(h.date).toLocaleString('ja-JP',{month:'numeric',day:'numeric',hour:'2-digit',minute:'2-digit'})} · ${timerModes[h.mode].name}</small></div><b>${timerLength(h.duration)}</b></article>`).join('')||'<div class="tm-history-empty">まだ、まっさらな時間。<p>タイマーを完了すると、ここに記録されます。</p></div>'}</div>${timerStore.history.length?'<button class="tm-history-clear" data-action="timerClearHistory">完了履歴を削除</button>':''}`);
A.actions.timerClearHistory=()=>A.confirm('完了履歴を削除','すべてのタイマー完了履歴を削除します。進行中のタイマーとプリセットは残ります。',()=>{if(saveTimer(timer,{history:[]})){if(A.current==='clock'&&clockTab==='timer')clock();A.actions.timerHistory();}});
A.actions.alarmToggle=el=>{const a=alarms.find(a=>a.id===el.dataset.id);a.enabled=!a.enabled;A.save('alarms',alarms);if(a.enabled){try{getAudioContext();}catch{}}clock();};A.actions.alarmDelete=el=>{alarms=alarms.filter(a=>a.id!==el.dataset.id);A.save('alarms',alarms);clock();};A.actions.alarmAdd=()=>A.form('新しいアラーム','<label class="form-label">時刻</label><input class="text-input" type="time" name="time" value="07:00" required><label class="form-label">ラベル</label><input class="text-input" name="label" placeholder="一日をはじめよう" maxlength="60">',v=>{alarms.push({id:A.id(),...v,enabled:true});A.save('alarms',alarms);try{getAudioContext();}catch{}clock();});
// Health is sample/manual data, not measurements or medical advice.
let health=A.load('health',{steps:6240,minutes:24,water:1200});
function healthRings(){
  const values=[health.steps/8000,health.minutes/30,health.water/2000];
  return `<svg class="health-ring-art" viewBox="0 0 180 180" aria-hidden="true" focusable="false"><defs>${[['#ffb6cb','#ec527e'],['#e0f3a3','#8bc29b'],['#bdedf6','#6cb9d6']].map(([a,b],i)=>`<linearGradient id="health-ring-${i}" x1="0" y1="0" x2="1" y2="1"><stop stop-color="${a}"/><stop offset="1" stop-color="${b}"/></linearGradient>`).join('')}</defs><circle cx="90" cy="90" r="85" fill="#ffffff04" stroke="#ffffff0b"/>
  ${values.map((v,i)=>`<circle cx="90" cy="90" r="${70-i*19}" fill="none" stroke="#ffffff0c" stroke-width="13"/><circle class="health-progress-ring" cx="90" cy="90" r="${70-i*19}" fill="none" stroke="url(#health-ring-${i})" stroke-width="13" pathLength="100" stroke-dasharray="${Math.max(0,Math.min(1,v))*100} 100" stroke-linecap="${v>0?'round':'butt'}" transform="rotate(-90 90 90)"/>`).join('')}
  <path d="M78 91h7l4-9 5 16 4-7h5" fill="none" stroke="#e6e8e4" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
}
function waterVessel(){
  const level=Math.max(0,Math.min(1,health.water/2000)),y=122-level*95;
  return `<svg class="water-vessel" viewBox="0 0 110 140" aria-hidden="true" focusable="false"><defs><linearGradient id="water-glass" x2="1" y2="0"><stop stop-color="#b9dbe8" stop-opacity=".3"/><stop offset=".4" stop-color="#e3f3fa" stop-opacity=".1"/><stop offset="1" stop-color="#97bfce" stop-opacity=".4"/></linearGradient><linearGradient id="water-fill" x2=".6" y2="1"><stop stop-color="#96d9e8"/><stop offset="1" stop-color="#418cae"/></linearGradient><clipPath id="water-clip"><path d="M24 21h62l-7 92c-1 12-47 12-48 0Z"/></clipPath></defs><ellipse cx="55" cy="128" rx="31" ry="5" fill="#3a769d" opacity=".12"/><path d="M22 20h66l-7 95c-2 17-51 17-53 0Z" fill="url(#water-glass)" stroke="#a6cadb"/>
  ${level>0?`<g clip-path="url(#water-clip)"><path class="water-level" d="M18 ${y}q18-5 37 0t38 0v125H18Z" fill="url(#water-fill)"/><path d="M18 ${y}q18-5 37 0t38 0" fill="none" stroke="#d4f7ff" stroke-width="2"/></g>`:''}<path d="m32 33 5 70" stroke="#fff" stroke-opacity=".65" stroke-width="3" stroke-linecap="round"/><ellipse cx="55" cy="20" rx="33" ry="5" fill="none" stroke="#bcdbe7"/><path d="M73 49h5m-7 22h5m-7 22h5" stroke="#e4f3f9" stroke-width="2"/></svg>`;
}
function healthApp(){
  A.view(A.nav('ヘルスケア',`<button data-action="healthAdd" aria-label="記録を追加">${icon('plus')}</button>`)+`<div class="app-content health-dashboard"><div class="health-heading"><h1>アクティビティ</h1><span class="demo-label">サンプル・手入力</span></div>
  <section class="health-hero">${healthRings()}<div class="health-metrics"><div class="activity-stat"><small>歩数</small><strong>${health.steps.toLocaleString()}<span> / 8,000歩</span></strong></div><div class="activity-stat"><small>運動</small><strong>${health.minutes}<span> / 30分</span></strong></div><div class="activity-stat"><small>水分</small><strong>${health.water.toLocaleString()}<span> / 2,000 ml</span></strong></div></div><p class="health-energy">ムーブ ${Math.round(health.steps*.042)} kcal · デモ推計</p></section>
  <article class="health-card health-steps"><header><h3>歩数</h3><small>週間サンプル</small></header><strong>${health.steps.toLocaleString()}</strong> <small>歩</small><div class="bar-chart">${[48,67,52,86,73,94,Math.min(100,health.steps/90)].map((v,i)=>`<div><span style="height:${v}%"></span>${i===6?'入力値':['月','火','水','木','金','土'][i]}</div>`).join('')}</div><p class="health-caption">過去6本はサンプル・右端は入力値</p></article>
  <article class="health-card health-water">${waterVessel()}<h3>水分補給</h3><strong>${health.water.toLocaleString()}</strong><small class="health-water-goal"> / 2,000 ml</small><div class="health-water-track" aria-hidden="true"><span style="width:${Math.max(0,Math.min(100,health.water/20))}%"></span></div><button class="secondary-button" data-action="healthWater">+ 200 ml</button></article>
  <article class="health-card health-sleep"><span class="health-moon" aria-hidden="true"></span><h3>睡眠</h3><strong>7<small>時間</small> 32<small>分</small></strong><p class="health-caption">サンプルの睡眠記録 · スタンド 9 / 12時間</p></article><p class="setting-description">サンプル・手入力。センサー・医療連携なし。ムーブはデモ推計</p></div>`);
}
A.healthData=()=>({...health});
A.apps.health.render=healthApp;
A.actions.healthWater=()=>{
  const next={...health,water:health.water+200},scroll=$('.health-dashboard')?.scrollTop||0;
  if(!A.save('health',next))return;
  health=next;healthApp();$('.health-dashboard').scrollTop=scroll;
  $('[data-action="healthWater"]').focus({preventScroll:true});A.haptic();
};
A.actions.healthAdd=()=>A.form('アクティビティを記録',`<label class="form-label">今日の歩数</label><input class="text-input" type="number" name="steps" min="0" max="100000" value="${health.steps}" required><label class="form-label">運動した時間（分）</label><input class="text-input" type="number" name="minutes" min="0" max="1440" value="${health.minutes}" required>`,v=>{
  const steps=Number(v.steps),minutes=Number(v.minutes);
  if(!Number.isInteger(steps)||steps<0||steps>100000||!Number.isInteger(minutes)||minutes<0||minutes>1440)return false;
  const next={...health,steps,minutes};if(!A.save('health',next))return false;
  health=next;healthApp();
});
// Wallet holds fictional balance only, with no payment integrations.
let wallet=A.load('wallet',{balance:3240,transactions:[{id:'tx1',title:'喫茶 余白',amount:-580,date:Date.now()-3600000},{id:'tx2',title:'青葉駅 → 緑町駅',amount:-220,date:Date.now()-7200000},{id:'tx3',title:'デモチャージ',amount:2000,date:Date.now()-86400000}]});
function walletApp(){A.view(A.nav('ウォレット')+`<div class="app-content"><p class="app-subtitle">架空の交通系カード <span class="demo-label">DEMO</span></p><div class="wallet-card"><h3>mori.</h3><strong>¥${wallet.balance.toLocaleString()}</strong><span>•••• 2048</span></div><div class="wallet-actions"><button class="secondary-button" data-action="walletCharge" style="background:#e3ede8;color:#739082">＋ デモチャージ</button><button class="secondary-button" data-action="walletPay" style="background:#e3ede8;color:#739082">デモで支払う</button></div><p class="section-label">デモ履歴</p>${wallet.transactions.slice(0,15).map(t=>`<div class="transaction-row"><div><strong>${esc(t.title)}</strong><small>${new Date(t.date).toLocaleDateString('ja-JP',{month:'short',day:'numeric'})} · デモ取引</small></div><span style="color:${t.amount>0?'#72a080':'inherit'}">${t.amount>0?'+':'−'} ¥${Math.abs(t.amount).toLocaleString()}</span></div>`).join('')}<p class="setting-description" style="margin-top:23px">架空残高・実決済や乗車は不可。個人情報・カード番号を入力しないでください</p></div>`);}
A.apps.wallet.render=walletApp;A.actions.walletCharge=()=>A.form('デモ残高を追加','<p>実決済なし</p><label class="form-label">金額（デモ）</label><select class="text-input" name="amount"><option value="1000">¥1,000</option><option value="3000">¥3,000</option><option value="5000">¥5,000</option></select>',v=>{wallet.balance+=+v.amount;wallet.transactions.unshift({id:A.id(),title:'デモチャージ',amount:+v.amount,date:Date.now()});A.save('wallet',wallet);walletApp();A.toast('デモ残高を追加済み');},'デモチャージ');A.actions.walletPay=()=>A.form('デモのお買いもの','<label class="form-label">購入するもの（架空）</label><select class="text-input" name="item"><option value="coffee">喫茶 余白 · コーヒー ¥580</option><option value="train">青葉線 · 乗車 ¥220</option><option value="book">栞の書店 · 文庫本 ¥820</option></select>',v=>{const items={coffee:['喫茶 余白',580],train:['青葉線 デモ乗車',220],book:['栞の書店',820]},[title,amount]=items[v.item];if(wallet.balance<amount){A.toast('デモ残高が足りません。チャージしてください。');return false;}wallet.balance-=amount;wallet.transactions.unshift({id:A.id(),title,amount:-amount,date:Date.now()});A.save('wallet',wallet);walletApp();A.toast('デモ完了・実決済なし');},'デモ支払い');
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
