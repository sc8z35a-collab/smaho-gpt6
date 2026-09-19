'use strict';
(() => {
const A=window.Aura, $=A.$, esc=A.escape, icon=A.icon;
const now=new Date();
const dayKey=d=>`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
// Shared compact controls keep app-specific tools keyboard and touch accessible.
const UI=A.workbench={
 button:(action,label,attrs='')=>`<button class="work-button" data-action="${action}" ${attrs}>${label}</button>`,
 chips:(items,active,action)=>`<div class="work-chips" role="group">${items.map(([id,label])=>`<button data-action="${action}" data-value="${esc(id)}" aria-pressed="${id===active}" class="${id===active?'selected':''}">${esc(label)}</button>`).join('')}</div>`,
 field:(label,name,value='',type='text',extra='')=>`<label class="form-label">${label}<input class="text-input" name="${name}" type="${type}" value="${esc(value)}" ${extra}></label>`,
 select:(label,name,items,value)=>`<label class="form-label">${label}<select class="text-input" name="${name}">${items.map(([id,text])=>`<option value="${esc(id)}" ${id===value?'selected':''}>${esc(text)}</option>`).join('')}</select></label>`,
 day:dayKey,
 date:date=>new Date(date+'T12:00:00').toLocaleDateString('ja-JP',{month:'long',day:'numeric',weekday:'short'})
};
// Calendar: month, week and searchable agenda share the same persisted records.
let calendarDate=new Date(now.getFullYear(),now.getMonth(),1),selectedDate=dayKey(now),calendarMode='month',eventQuery='';
let events=A.load('events',[{id:'welcome-event',date:dayKey(now),time:'15:00',title:'ひと息つく時間',place:'お気に入りのカフェ'}]);
const categories=[['personal','プライベート'],['work','仕事'],['life','暮らし']];
const eventColor=e=>({personal:'#aa8ac2',work:'#6196d9',life:'#6ca68e'}[e.category]||'#aa8ac2');
const eventCard=e=>`<article class="event-card" style="border-left-color:${eventColor(e)}"><div class="event-time">${esc(e.time)}<br>${esc(e.endTime||'1時間')}</div><button class="event-info" data-action="calendarEdit" data-id="${esc(e.id)}"><strong>${esc(e.title)}</strong><small>${esc(e.place||'場所の指定なし')}</small></button><button data-action="calendarDelete" data-id="${esc(e.id)}" aria-label="予定を削除">×</button></article>`;
function calendar(){
 const today=dayKey(new Date()),y=calendarDate.getFullYear(),m=calendarDate.getMonth();
 let cells=['日','月','火','水','木','金','土'].map(d=>`<span class="weekday">${d}</span>`).join('');
 const dates=[];
 if(calendarMode==='week'){
  const start=new Date(selectedDate+'T12:00:00');start.setDate(start.getDate()-start.getDay());
  for(let i=0;i<7;i++){const d=new Date(start);d.setDate(start.getDate()+i);dates.push(d);}
 }else{
  for(let i=0;i<new Date(y,m,1).getDay();i++)cells+='<span></span>';
  for(let i=1;i<=new Date(y,m+1,0).getDate();i++)dates.push(new Date(y,m,i));
 }
 dates.forEach(d=>{const key=dayKey(d);cells+=`<button class="month-day ${key===today?'today':''} ${key===selectedDate?'selected':''} ${events.some(e=>e.date===key)?'has-event':''}" data-action="calendarSelect" data-date="${key}" aria-label="${key}" aria-pressed="${key===selectedDate}">${d.getDate()}</button>`;});
 A.view(A.nav('カレンダー',`<button data-action="calendarAdd" aria-label="予定を追加">${icon('plus')}</button>`)+`<div class="app-content work-app calendar-work"><div class="work-heading"><div><span class="work-eyebrow">MAKE TIME FOR YOU</span><h1 class="app-title">予定に、余白を。</h1></div><span class="work-count">${events.filter(e=>e.date===today).length}<small>今日の予定</small></span></div>${UI.chips([['month','月'],['week','週'],['agenda','予定一覧']],calendarMode,'calendarMode')}<div class="calendar-month-head"><h3>${y}年 ${m+1}月</h3><div><button data-action="calendarMove" data-value="-1" aria-label="前へ">‹</button><button data-action="calendarToday" class="work-today">今日</button><button data-action="calendarMove" data-value="1" aria-label="次へ">›</button></div></div>${calendarMode==='agenda'?A.search('event-search','タイトル・場所を検索'):`<div class="month-grid">${cells}</div>`}<div class="calendar-agenda" id="calendar-agenda"></div><div class="work-note">予定をタップして編集 · このブラウザに保存</div></div>`);
 const render=()=>{
  const list=events.filter(e=>calendarMode==='agenda'?(e.title+' '+(e.place||'')).toLowerCase().includes(eventQuery.toLowerCase()):e.date===selectedDate).sort((a,b)=>(a.date+a.time).localeCompare(b.date+b.time));
  let last='';$('#calendar-agenda').innerHTML=(calendarMode!=='agenda'?`<h3>${UI.date(selectedDate)}</h3>`:'')+list.map(e=>{const head=calendarMode==='agenda'&&last!==e.date?`<h3>${UI.date(e.date)}</h3>`:'';last=e.date;return head+eventCard(e);}).join('')||A.empty('予定はありません。右上の＋から追加できます。','calendar');
  if(!list.length&&calendarMode!=='agenda')$('#calendar-agenda').innerHTML+=A.empty('予定のない日。自由な時間を楽しもう。','sun');
 };
 render();if($('#event-search')){$('#event-search').value=eventQuery;$('#event-search').oninput=e=>{eventQuery=e.target.value;render();};}
}
A.apps.calendar.render=calendar;A.todayEvents=date=>events.filter(e=>e.date===date);A.allEvents=()=>events.map(e=>({...e}));
A.actions.calendarMode=el=>{calendarMode=el.dataset.value;calendar();};
A.actions.calendarMove=el=>{if(calendarMode==='week'){const d=new Date(selectedDate+'T12:00:00');d.setDate(d.getDate()+7*Number(el.dataset.value));selectedDate=dayKey(d);calendarDate=new Date(d.getFullYear(),d.getMonth(),1);}else calendarDate.setMonth(calendarDate.getMonth()+Number(el.dataset.value));calendar();};
A.actions.calendarSelect=el=>{selectedDate=el.dataset.date;calendar();};
A.actions.calendarToday=()=>{const d=new Date();calendarDate=new Date(d.getFullYear(),d.getMonth(),1);selectedDate=dayKey(d);calendarMode='month';calendar();};
function eventEditor(id){
 const e=events.find(e=>e.id===id);
 A.form(e?'予定を編集':'新しい予定',UI.field('タイトル','title',e?.title||'','text','required maxlength="80"')+UI.field('日付','date',e?.date||selectedDate,'date','required')+`<div class="work-form-grid">${UI.field('開始','time',e?.time||'15:00','time','required')}${UI.field('終了（任意）','endTime',e?.endTime||'','time')}</div>`+UI.select('カレンダー','category',categories,e?.category||'personal')+UI.field('場所','place',e?.place||'','text','maxlength="80"')+`<label class="form-label">メモ<textarea class="text-input" name="description" maxlength="2000">${esc(e?.description||'')}</textarea></label>`,v=>{
  if(!v.title.trim()||!/^\d{4}-\d{2}-\d{2}$/.test(v.date))return false;
  if(v.endTime&&v.endTime<=v.time){A.toast('終了時刻は開始より後にしてください');return false;}
  const entry={...e,...v,title:v.title.trim(),id:e?.id||A.id()},next=e?events.map(x=>x.id===id?entry:x):[...events,entry];
  if(!A.save('events',next))return false;events=next;selectedDate=v.date;calendarDate=new Date(v.date+'T12:00:00');calendarDate.setDate(1);calendar();
 });
}
A.actions.calendarAdd=()=>eventEditor();A.actions.calendarEdit=el=>eventEditor(el.dataset.id);
A.actions.calendarDelete=el=>A.confirm('予定を削除','この予定を削除しますか？',()=>{const next=events.filter(e=>e.id!==el.dataset.id);if(A.save('events',next)){events=next;calendar();}});
// Notes — autosave each edit, no network or accounts.
let notes=A.load('notes',[
{id:'note-1',title:'週末にしたいこと',body:'朝、いつもより少し早く起きる。\n\n☐ 気になっていたパン屋さんへ\n☐ 本を一冊、読み終える\n☐ フィルムみたいな写真を撮る\n\n何もしない時間も、大切に。',updated:Date.now()},
{id:'note-2',title:'ふと思いついたこと',body:'日常の小さな発見を、\nここに集めていこう。\n\n光の入り方。\nコーヒーの香り。\n帰り道で聴いた音楽。',updated:Date.now()-86400000},
{id:'note-3',title:'買いものリスト',body:'オーツミルク\n季節のフルーツ\nコーヒー豆\n小さな花束',updated:Date.now()-172800000},
{id:'note-4',title:'auraへようこそ',body:'ここは、あなたのもう一台。\n\nメモは自動的に、このブラウザに保存されます。\n\n右上のペンから、新しいメモを書いてみてください。',updated:Date.now()-259200000}]);
A.searchableNotes=()=>notes.filter(n=>!n.trashed);
let noteFolder='all';
const noteFolders=[['all','すべて'],['personal','自分用'],['work','仕事'],['ideas','アイデア'],['trash','ゴミ箱']];
let currentNote=null,noteQuery='';
let noteSort=A.load('noteSort','updated');
if(!['updated','title'].includes(noteSort))noteSort='updated';
function renderNoteList(q=noteQuery){
 const el=$('#notes-grid');if(!el)return;noteQuery=q;
 const query=q.trim().toLocaleLowerCase('ja');
 const list=notes.filter(n=>noteFolder==='trash'?n.trashed:!n.trashed&&(noteFolder==='all'||(n.folder||'personal')===noteFolder)).filter(n=>(n.title+'\n'+n.body).toLocaleLowerCase('ja').includes(query)).sort((a,b)=>{
  const pinned=Number(!!b.pinned)-Number(!!a.pinned);
  return pinned||(noteSort==='title'?(a.title||'新しいメモ').localeCompare(b.title||'新しいメモ','ja'):b.updated-a.updated);
 });
 el.innerHTML=list.map(n=>`<button class="note-card ${n.pinned?'is-pinned':''}" data-action="noteOpen" data-id="${esc(n.id)}">${n.pinned?`<span class="note-pin-label">${icon('pin')}ピン留め</span>`:''}<h3>${esc(n.title||'新しいメモ')}</h3><p>${esc(n.body)||'書き始めてみよう。'}</p><small>${new Date(n.updated).toLocaleDateString('ja-JP',{month:'short',day:'numeric'})}</small></button>`).join('')||'<p class="empty-state" style="grid-column:span 2">メモが見つかりません。<br>別の言葉で検索するか、新しく書いてみましょう。</p>';
 $('#notes-count').textContent=query?`${list.length} / ${notes.length}件`:`${notes.length}件のメモ`;
}
function noteList(){
 currentNote=null;
 A.view(A.nav('メモ',`<button data-action="noteNew" aria-label="新規メモ">${icon('edit')}</button>`)+`<div class="app-content work-app notes-work"><span class="work-eyebrow">YOUR THOUGHTS, A LITTLE CLEARER</span><h1 class="app-title">小さな、思いつき。</h1><p class="app-subtitle">忘れたくないことを、ここに。</p>${UI.chips(noteFolders,noteFolder,'noteFolder')}${A.search('notes-search','メモを検索')}<div class="work-toolbar">${UI.button('noteTemplates','テンプレートから作成')}</div><div class="notes-toolbar"><span id="notes-count" role="status"></span><select id="notes-sort" aria-label="メモの並べ替え"><option value="updated">更新が新しい順</option><option value="title">タイトル順</option></select></div><div class="notes-grid" id="notes-grid"></div><p class="notes-footer">ピン留めしたメモは先頭に · このブラウザに保存</p></div>`);
 $('#notes-search').value=noteQuery;$('#notes-sort').value=noteSort;renderNoteList();
 $('#notes-search').oninput=e=>renderNoteList(e.target.value);
 $('#notes-sort').onchange=e=>{noteSort=e.target.value;A.save('noteSort',noteSort);renderNoteList();};
}
const noteLength=body=>Array.from(body).length;
function noteEdit(id){
 const n=notes.find(n=>n.id===id);if(!n)return;currentNote=id;
 if(n.trashed){A.view(A.nav('ゴミ箱','','noteList','メモ')+`<div class="app-content work-app"><h1 class="app-title">${esc(n.title||'無題')}</h1><pre class="file-preview">${esc(n.body)}</pre><div class="work-toolbar">${UI.button('noteRestore','復元する')}${UI.button('notePurge','完全に削除')}</div></div>`);return;}
 A.view(A.nav('メモ',`<button data-action="noteDelete" aria-label="削除">${icon('trash')}</button>`,'noteList','メモ')+`<div class="app-content"><small id="note-save-status" role="status">自動保存されています</small><div class="note-editor-tools"><button class="note-pin-button" data-action="notePin" aria-pressed="${!!n.pinned}">${icon('pin')}<span>${n.pinned?'ピン留め済み':'ピン留め'}</span></button><span id="note-length">本文 ${noteLength(n.body)}文字</span></div>${UI.chips(noteFolders.slice(1,4),n.folder||'personal','noteMove')}<div class="work-toolbar">${UI.button('noteChecklist','チェック項目を挿入')}${UI.button('noteDuplicate','複製')}</div><input class="note-title-input" id="note-title" aria-label="メモのタイトル" placeholder="タイトル" maxlength="120" value="${esc(n.title)}"><textarea class="note-body-input" id="note-body" aria-label="メモ本文" placeholder="自由に書いてみよう。">${esc(n.body)}</textarea></div>`);
 const save=()=>{n.title=$('#note-title').value;n.body=$('#note-body').value;n.updated=Date.now();const ok=A.save('notes',notes);$('#note-save-status').textContent=ok?'保存しました':'保存できませんでした';$('#note-length').textContent=`本文 ${noteLength(n.body)}文字`;};
 $('#note-title').oninput=save;$('#note-body').oninput=save;
}
A.apps.notes.render=noteList;A.actions.noteList=noteList;A.actions.noteOpen=el=>noteEdit(el.dataset.id);
A.actions.noteNew=()=>{const id=A.id();notes.unshift({id,title:'',body:'',updated:Date.now(),pinned:false});A.save('notes',notes);noteQuery='';noteFolder='all';noteEdit(id);$('#note-title').focus();};
A.actions.notePin=()=>{
 const n=notes.find(n=>n.id===currentNote);if(!n)return;
 n.pinned=!n.pinned;const ok=A.save('notes',notes);
 if(!ok)n.pinned=!n.pinned;
 const button=$('[data-action="notePin"]');button.setAttribute('aria-pressed',String(!!n.pinned));button.querySelector('span').textContent=n.pinned?'ピン留め済み':'ピン留め';
 $('#note-save-status').textContent=ok?'保存しました':'保存できませんでした';
};
A.actions.noteFolder=el=>{noteFolder=el.dataset.value;noteList();};
function updateNote(change){const next=notes.map(n=>n.id===currentNote?{...n,...change,updated:Date.now()}:n);if(!A.save('notes',next))return false;notes=next;return true;}
A.actions.noteMove=el=>{if(updateNote({folder:el.dataset.value}))noteEdit(currentNote);};
A.actions.noteChecklist=()=>{const input=$('#note-body'),start=input.selectionStart;input.setRangeText((start&&input.value[start-1]!=='\n'?'\n':'')+'☐ ',start,input.selectionEnd,'end');input.dispatchEvent(new Event('input'));input.focus();};
A.actions.noteDuplicate=()=>{const n=notes.find(n=>n.id===currentNote);if(!n)return;const entry={...n,id:A.id(),title:(n.title||'メモ')+' のコピー',updated:Date.now()};const next=[entry,...notes];if(A.save('notes',next)){notes=next;noteEdit(entry.id);}};
A.actions.noteDelete=()=>A.confirm('メモをゴミ箱へ','ゴミ箱からいつでも復元できます。',()=>{if(updateNote({trashed:true}))noteList();});
A.actions.noteRestore=()=>{if(updateNote({trashed:false})){noteFolder='all';noteList();A.toast('メモを復元しました');}};
A.actions.notePurge=()=>A.confirm('完全に削除','この操作は元に戻せません。',()=>{const next=notes.filter(n=>n.id!==currentNote);if(A.save('notes',next)){notes=next;noteList();}});
const templates=[['一日のふり返り','今日よかったこと\n\n\n学んだこと\n\n\n明日の自分へ\n'],['ミーティング','日時：\n参加者：\n\n議題\n・\n\n決まったこと\n・\n\n次のアクション\n☐ '],['旅のしおり','行き先：\n日程：\n\n持ちもの\n☐ チケット\n☐ 充電器\n\n訪れたい場所\n・']];
A.actions.noteTemplates=()=>A.overlay(`${A.overlayTitle('書きはじめのヒント')}<div class="template-list">${templates.map(([title,body],i)=>`<button class="template-card" data-action="noteTemplate" data-value="${i}">${icon('document')}<strong>${title}</strong><p>${esc(body.slice(0,50))}</p></button>`).join('')}</div>`);
A.actions.noteTemplate=el=>{const t=templates[Number(el.dataset.value)];if(!t)return;const n={id:A.id(),title:t[0],body:t[1],updated:Date.now(),folder:'personal'},next=[n,...notes];if(A.save('notes',next)){notes=next;noteFolder='all';A.closeOverlay();noteEdit(n.id);}};
// Reminders: due dates, priority and lists; no unsupported background alarms.
let reminders=A.load('reminders',[{id:'r1',text:'朝のストレッチ',done:true},{id:'r2',text:'お気に入りの音楽を聴く',done:true},{id:'r3',text:'コーヒー豆を買う',done:false},{id:'r4',text:'本を20ページ読む',done:false},{id:'r5',text:'夕暮れの空を撮る',done:false}]);
let reminderFilter='all',reminderList='all',reminderQuery='';
const reminderLists=[['personal','自分のこと'],['work','仕事'],['shopping','買いもの']];
A.searchableReminders=()=>reminders;
function saveReminders(next){if(!A.save('reminders',next))return false;reminders=next;return true;}
function reminderApp(){
 const today=dayKey(new Date()),done=reminders.filter(r=>r.done).length;
 const due=reminders.filter(r=>!r.done&&r.due&&r.due<=today).length;
 A.view(A.nav('リマインダー',`<button data-action="reminderAdd" aria-label="詳細付きリマインダーを追加">${icon('plus')}</button>`)+`<div class="app-content work-app reminder-work"><span class="work-eyebrow">ONE SMALL STEP AT A TIME</span><h1 class="app-title">今日を、ひとつずつ。</h1><div class="task-summary"><div><span>できたこと</span><strong>${done}<small> / ${reminders.length}</small></strong><div class="progress-track"><span style="width:${reminders.length?done/reminders.length*100:0}%"></span></div></div><div><span>今日までの未完了</span><strong>${due}</strong><small>あなたのペースで。</small></div></div>${UI.chips([['all','すべて'],['today','今日まで'],['flagged','優先'],['done','完了']],reminderFilter,'reminderFilter')}${A.search('reminder-search','タスクを検索')}<select class="work-select" id="reminder-list-filter" aria-label="リストを絞り込み"><option value="all">すべてのリスト</option>${reminderLists.map(([id,label])=>`<option value="${id}">${label}</option>`).join('')}</select><div id="reminder-items"></div><form class="add-inline" id="reminder-form"><input class="text-input" name="text" placeholder="新しいリマインダー" aria-label="新しいリマインダー" required maxlength="100"><button type="submit" aria-label="追加">+</button></form><div class="work-toolbar">${UI.button('reminderAdd','期限・詳細をつけて追加')}${done?UI.button('reminderClearDone','完了済みを整理'):''}</div><p class="work-note">タスクをタップして編集 · 期限は表示用（自動通知なし）</p></div>`);
 const render=()=>{
 const list=reminders.filter(r=>(reminderFilter==='all'||reminderFilter==='today'&&!r.done&&r.due&&r.due<=today||reminderFilter==='flagged'&&!r.done&&r.priority==='high'||reminderFilter==='done'&&r.done)&&(reminderList==='all'||(r.list||'personal')===reminderList)&&r.text.toLowerCase().includes(reminderQuery.toLowerCase())).sort((a,b)=>Number(a.done)-Number(b.done)||Number(b.priority==='high')-Number(a.priority==='high')||(a.due||'9999').localeCompare(b.due||'9999'));
 $('#reminder-items').innerHTML=list.map(r=>`<div class="reminder-row ${r.done?'done':''}"><button class="check-circle ${r.done?'checked':''}" data-action="reminderToggle" data-id="${esc(r.id)}" aria-label="${esc(r.text)}" aria-pressed="${r.done}">${r.done?'✓':''}</button><button class="task-detail" data-action="reminderEdit" data-id="${esc(r.id)}"><span>${esc(r.text)}</span><small class="${!r.done&&r.due<today?'overdue':''}">${r.priority==='high'?'! 優先 · ':''}${esc(reminderLists.find(([id])=>id===(r.list||'personal'))?.[1]||'自分のこと')}${r.due?' · '+UI.date(r.due):''}</small>${r.detail?`<small>${esc(r.detail)}</small>`:''}</button><button class="delete-small" data-action="reminderDelete" data-id="${esc(r.id)}" aria-label="削除">×</button></div>`).join('')||A.empty('ここにはタスクがありません。','check');
 };
 $('#reminder-search').value=reminderQuery;$('#reminder-search').oninput=e=>{reminderQuery=e.target.value;render();};$('#reminder-list-filter').value=reminderList;$('#reminder-list-filter').onchange=e=>{reminderList=e.target.value;render();};render();
 $('#reminder-form').onsubmit=e=>{e.preventDefault();const text=e.currentTarget.elements.text.value.trim();if(text&&saveReminders([...reminders,{id:A.id(),text,done:false,list:reminderList==='all'?'personal':reminderList}])){reminderFilter='all';reminderQuery='';reminderApp();}};
}
function reminderEditor(id){const r=reminders.find(r=>r.id===id);A.form(r?'タスクを編集':'新しいタスク',UI.field('タスク','text',r?.text||'','text','required maxlength="100"')+UI.field('期限（任意）','due',r?.due||'','date')+UI.select('リスト','list',reminderLists,r?.list||'personal')+UI.select('優先度','priority',[['normal','通常'],['high','高い']],r?.priority||'normal')+UI.field('詳細','detail',r?.detail||'','text','maxlength="300"'),v=>{if(!v.text.trim())return false;const entry={...r,...v,text:v.text.trim(),id:r?.id||A.id(),done:r?.done||false};if(!saveReminders(r?reminders.map(x=>x.id===id?entry:x):[...reminders,entry]))return false;reminderApp();});}
A.apps.reminders.render=reminderApp;A.actions.reminderFilter=el=>{reminderFilter=el.dataset.value;reminderApp();};A.actions.reminderAdd=()=>reminderEditor();A.actions.reminderEdit=el=>reminderEditor(el.dataset.id);
A.actions.reminderToggle=el=>{if(saveReminders(reminders.map(r=>r.id===el.dataset.id?{...r,done:!r.done}:r))){A.haptic();reminderApp();}};
A.actions.reminderDelete=el=>A.confirm('タスクを削除','このタスクを削除しますか？',()=>{if(saveReminders(reminders.filter(r=>r.id!==el.dataset.id)))reminderApp();});
A.actions.reminderClearDone=()=>A.confirm('完了済みを整理','完了したタスクを削除します。未完了のタスクは残ります。',()=>{if(saveReminders(reminders.filter(r=>!r.done)))reminderApp();});
// Settings
function settingToggle(key,label,ic,color){return `<div class="list-row"><span class="row-icon" style="background:${color};color:white">${icon(ic)}</span><span class="row-main"><strong>${label}</strong></span><button class="toggle ${A.settings[key]?'on':''}" data-action="settingToggle" data-key="${key}" aria-label="${label}" aria-pressed="${A.settings[key]}"></button></div>`;}
function settings(){A.statusTheme(false);A.view(A.nav('設定')+`<div class="app-content"><h1 class="app-title">設定</h1><button class="profile-card" data-action="settingsProfile" style="width:100%;text-align:left"><span class="avatar">a.</span><div><h3>${esc(A.load('profileName','あなたのaura'))}</h3><p>この小さな世界を、あなたらしく。</p></div><span class="chevron" style="margin-left:auto">›</span></button><div class="group-card">${settingToggle('airplane','機内モード','airplane','#efa557')}${settingToggle('wifi','Wi-Fi','wifi','#508af0')}${settingToggle('bluetooth','Bluetooth','bluetooth','#508af0')}</div><div class="group-card">${A.row('globe','接続とプライバシー','実連携・未接続機能を確認','connectionCenter','','#508af0')}${A.row('grid','全画面で使う','','fullscreen','','#697287')}${A.row('sun','画面表示と明るさ','','settingsDisplay','','#528be5')}${A.row('layers','光と奥行き','影の深さ・動きの設定','settingsAppearance','','#9981b4')}${A.row('photos','壁紙とホーム画面','','personalize','','#b094cf')}${A.row('messages','通知センター','','showNotifications','','#e88192')}${settingToggle('dark','ダークモード','moon','#697287')}${settingToggle('focus','集中モード','moon','#8b75c0')}${settingToggle('sound','触覚フィードバック','volume','#e88192')}</div><div class="group-card">${A.row('grid','操作ガイド','','gestureGuide','','#6d9aab')}${A.row('user','このデバイスについて','','settingsAbout','','#8d939c')}${A.row('trash','データをリセット','','settingsReset','','#db7777')}</div><p class="setting-description">接続設定はシミュレーションです。実際の端末の通信状態は変更しません。</p><p class="notes-footer">auraOS 3.0 · Crafted with care.</p></div>`);}
A.apps.settings.render=settings;A.actions.settingsHome=settings;A.actions.settingToggle=el=>{A.settings[el.dataset.key]=!A.settings[el.dataset.key];A.applySettings();if($('#settings-brightness'))A.actions.settingsDisplay();else settings();};
A.actions.settingsProfile=()=>A.form('あなたの名前',`<label class="form-label">表示名</label><input class="text-input" name="name" required maxlength="24" value="${esc(A.load('profileName','あなたのaura'))}">`,v=>{A.save('profileName',v.name);settings();});
A.actions.settingsDisplay=()=>{A.view(A.nav('画面表示と明るさ','','settingsHome','設定')+`<div class="app-content"><h1 class="app-title">心地よい、明るさ。</h1><p class="app-subtitle">この体験内の画面の明るさを調整します。</p><div class="group-card" style="padding:25px 20px;display:flex;align-items:center;gap:15px">${icon('sun','style="width:25px;flex-shrink:0;color:#aaa"')}<input id="settings-brightness" style="width:100%;accent-color:#6588c7" type="range" min="10" max="100" value="${A.settings.brightness}" aria-label="画面の明るさ"></div><div class="group-card">${settingToggle('dark','ダークモード','moon','#697287')}</div></div>`);$('#settings-brightness').oninput=e=>{A.settings.brightness=+e.target.value;A.applySettings();};};
A.actions.settingsAppearance=()=>A.view(A.nav('光と奥行き','','settingsHome','設定')+`<div class="app-content"><h1 class="app-title">光を、ひとさじ。</h1><p class="app-subtitle">影が重なると、小さな世界が深くなる。</p>${A.appearancePanel()}</div>`);
A.actions.settingsWallpaper=()=>{A.view(A.nav('壁紙','','settingsHome','設定')+`<div class="app-content"><h1 class="app-title">あなたの、色。</h1><p class="app-subtitle">流れるようなグラデーションを、気分に合わせて。</p><div class="wallpaper-options">${[['default','Dusk'],['ocean','Ocean'],['forest','Forest'],['mono','Stone']].map(([v,n])=>`<button class="wallpaper-option ${v} ${A.settings.wallpaper===v?'active':''}" data-action="wallpaperSet" data-value="${v}" aria-label="壁紙 ${n}"></button>`).join('')}</div><div style="display:flex;justify-content:space-around;font-size:10px;color:#9b95a1"><span>Dusk</span><span>Ocean</span><span>Forest</span><span>Stone</span></div><p class="setting-description" style="margin-top:30px">壁紙をタップすると、ホーム画面とロック画面に反映されます。</p></div>`);};
A.actions.wallpaperSet=el=>{A.settings.wallpaper=el.dataset.value;A.applySettings();A.actions.settingsWallpaper();A.toast('壁紙を変更しました');};
A.actions.settingsAbout=()=>A.view(A.nav('情報','','settingsHome','設定')+`<div class="app-content"><div class="about-hero" style="text-align:center;margin:35px 0">aura.</div><div class="group-card">${A.row('','名前','',null,'aura Phone')}${A.row('','OSバージョン','',null,'auraOS 3.0')}${A.row('','モデル','',null,'Browser Edition')}${A.row('','アプリ','',null,'20')}${A.row('','ゲーム','',null,'3')}</div><p class="setting-description">架空のスマートフォンシミュレーター。<br>データの保存先：このブラウザのローカルストレージ。実際のスマートフォンの設定やファイルにはアクセスしません。</p></div>`);
A.actions.settingsReset=()=>A.confirm('auraのデータをリセット','保存したメモ、予定、写真、ゲーム記録など、aura内のデータをすべて削除します。この操作は元に戻せません。',()=>{try{Object.keys(localStorage).filter(k=>k.startsWith('aura.')).forEach(k=>localStorage.removeItem(k));location.reload();}catch{A.toast('データを削除できませんでした');}});
// Local message simulation.
const contacts=[{id:'misaki',name:'美咲',initial:'美',color:'linear-gradient(140deg,#d6b6a5,#ad897f)',time:'10:24',preview:'週末は、どこか出かけよう ☀',messages:[{text:'おはよう！今日はいい天気だね ☀',sent:false},{text:'本当だね。窓を開けたら気持ちいい。',sent:true},{text:'週末は、どこか出かけよう ☀',sent:false}]},{id:'haru',name:'陽',initial:'陽',color:'linear-gradient(140deg,#aac2b2,#738e85)',time:'昨日',preview:'この曲、きっと気に入ると思う。',messages:[{text:'最近、どんな音楽を聴いてる？',sent:false},{text:'ゆっくりした曲が多いかな。',sent:true},{text:'この曲、きっと気に入ると思う。ミュージックアプリの「Golden Hour」を聴いてみて 🎧',sent:false}]},{id:'aura',name:'aura studio',initial:'a.',color:'linear-gradient(140deg,#b6abd0,#8a80a2)',time:'金曜日',preview:'小さな世界へ、ようこそ。',messages:[{text:'auraへようこそ。ここはあなたのもう一台のスマートフォンです。',sent:false},{text:'この会話はローカルデモです。メッセージを送ると、用意された返信が届きます。外部への送信はありません。',sent:false}]}];
let chats=A.load('chats',Object.fromEntries(contacts.map(c=>[c.id,c.messages]))),activeChat=null;
const pendingReplies={};
A.actions.showNotifications=()=>A.notifications();
let chatUnread=A.load('chatUnread',{misaki:1,haru:1,aura:0});
A.messageUnread=()=>Object.values(chatUnread).reduce((a,b)=>a+b,0);
function messages(arg){if(arg&&contacts.some(c=>c.id===arg))return chat(arg);A.view(A.nav('メッセージ',`<button data-action="messageCompose" aria-label="新しい会話">${icon('edit')}</button>`)+`<div class="app-content"><h1 class="app-title">メッセージ <span class="demo-label">DEMO</span></h1>${A.search('chat-search','人やメッセージを検索')}<div id="chat-list"></div><p class="notes-footer">会話は、このブラウザ内だけのデモです。</p></div>`);const list=q=>{$('#chat-list').innerHTML=contacts.filter(c=>(c.name+chats[c.id].map(m=>m.text).join('')).includes(q)).map(c=>`<button class="chat-row" data-action="chatOpen" data-id="${c.id}"><span class="avatar" style="background:${c.color}">${c.initial}</span><div class="chat-preview"><header>${c.name}${chatUnread[c.id]?'<span class="chat-unread-dot" aria-label="未読"></span>':''}<time>${chats[c.id].at(-1)?.time?new Date(chats[c.id].at(-1).time).toLocaleTimeString('ja-JP',{hour:'2-digit',minute:'2-digit'}):c.time} ›</time></header><p>${esc(chats[c.id].at(-1)?.text||c.preview)}</p></div></button>`).join('')||A.empty('会話が見つかりません。','messages');};list('');$('#chat-search').oninput=e=>list(e.target.value);}
function chat(id){activeChat=id;chatUnread[id]=0;A.save('chatUnread',chatUnread);const c=contacts.find(c=>c.id===id);A.view(A.nav(c.name,'<span class="demo-label">ローカルデモ</span>','messagesList','戻る')+`<div class="app-content chat-area" id="chat-area"><p class="chat-date">デモの会話 · 外部には送信されません</p><div id="chat-bubbles"></div></div><form class="chat-composer" id="chat-form"><input name="message" placeholder="メッセージ" aria-label="メッセージ" required maxlength="1000" autocomplete="off"><button type="submit" aria-label="送信">↑</button></form>`);renderChat();$('#chat-form').onsubmit=e=>{e.preventDefault();const input=e.currentTarget.elements.message;const text=input.value.trim();if(!text)return;chats[id].push({text,sent:true,time:Date.now()});pendingReplies[id]=(pendingReplies[id]||0)+1;A.save('chats',chats);input.value='';renderChat();const replies=id==='aura'?['気になるアプリを、自由に開いてみてください ✨','メモや写真はこのブラウザに保存されます。あなたらしく使ってみてください。']:['いいね！楽しみにしてる 😊','うん、ゆっくり過ごそう。','そうだね！あとでまた話そう ☀','わかった！素敵な一日になりますように。'];const count=chats[id].filter(m=>m.sent).length;setTimeout(()=>{const reply=replies[(count-1)%replies.length];chats[id].push({text:reply,sent:false,time:Date.now()});pendingReplies[id]=Math.max(0,(pendingReplies[id]||1)-1);A.save('chats',chats);if(A.current==='messages'&&activeChat===id&&$('#chat-bubbles'))renderChat();else{chatUnread[id]=(chatUnread[id]||0)+1;A.save('chatUnread',chatUnread);if(!A.current)A.renderHome();A.notify({app:'messages',arg:id,title:c.name,body:reply});}},1200);};}
function renderChat(){
 if(!$('#chat-bubbles'))return;
 const messages=chats[activeChat],lastSent=messages.map(m=>m.sent).lastIndexOf(true);
 $('#chat-bubbles').innerHTML=messages.map((m,i)=>`<div class="message-bubble ${m.sent?'sent':''}">${esc(m.text)}${m.time?`<time class="bubble-time">${new Date(m.time).toLocaleTimeString('ja-JP',{hour:'2-digit',minute:'2-digit'})}</time>`:''}</div>${m.sent&&i===lastSent?`<span class="message-delivery">${pendingReplies[activeChat]?'送信済み':'既読'} · デモ</span>`:''}`).join('')+(pendingReplies[activeChat]?'<div class="typing-indicator" role="status" aria-label="デモ返信を入力中"><i></i><i></i><i></i></div>':'');
 $('#chat-area').scrollTop=$('#chat-area').scrollHeight;
}
A.apps.messages.render=messages;A.actions.messagesList=()=>{activeChat=null;messages();};A.actions.chatOpen=el=>chat(el.dataset.id);A.actions.messageCompose=()=>A.overlay(`${A.overlayTitle('会話をはじめる')}<div class="group-card">${contacts.map(c=>`<button class="list-row" data-action="chooseChat" data-id="${c.id}"><span class="avatar" style="background:${c.color}">${c.initial}</span><span class="row-main"><strong>${c.name}</strong><small>ローカルデモの連絡先</small></span><span class="chevron">›</span></button>`).join('')}</div>`);A.actions.chooseChat=el=>{A.closeOverlay();chat(el.dataset.id);};
// Mail — seeded inbox and explicitly local drafts/outbox.
let mails=A.load('mails',[
{id:'mail-1',sender:'aura studio',initial:'a.',subject:'小さな世界へ、ようこそ。',preview:'あなたのもう一台が、ここにあります。',body:'こんにちは。\n\nauraへようこそ。\n\n日々の小さな発見や、ふと浮かんだ思いつき。お気に入りの景色と、心地よい音楽。\n\nこの小さな世界が、あなたの日常に、少しの余白を届けられますように。\n\nまずは、気になるアプリをタップしてみてください。きっと、あなたのお気に入りが見つかります。\n\n心をこめて、\naura studio\n\n※ このメールはシミュレーター内のサンプルです。',time:'10:00',read:false,folder:'inbox'},
{id:'mail-2',sender:'THE SLOW LETTER',initial:'S',subject:'日曜日の、ちょうどいい過ごし方。',preview:'急がなくていい朝。コーヒーを淹れながら、読む手紙。',body:'SUNDAY, AT YOUR OWN PACE.\n\n目覚ましをかけない朝。\nお気に入りのカップ。\n読みかけの本。\n\n何かを「しなければ」ではなく、何かを「したい」と思うまで待ってみる。\n\n今週は、そんな休日のご提案です。\n\n1. 近所の知らない道を歩いてみる\n2. 一枚だけ、写真を撮る\n3. 自分に短い手紙を書く\n\n素敵な日曜日を。\nTHE SLOW LETTER',time:'8:30',read:false,folder:'inbox'},
{id:'mail-3',sender:'緑のある暮らし',initial:'葉',subject:'窓辺の植物と、小さな変化。',preview:'季節が少しずつ、移り変わっています。',body:'窓から入る光が、少し柔らかくなりました。\n\n植物たちも、季節の変化を感じているようです。新しい葉が開く瞬間は、何度見ても嬉しいものですね。\n\n今日の小さなヒント：\n朝、カーテンを開けたら、葉っぱの裏も覗いてみましょう。\n\n小さな発見があるかもしれません。',time:'昨日',read:false,folder:'inbox'},
{id:'mail-4',sender:'美咲',initial:'美',subject:'行ってみたいお店、見つけたよ',preview:'この前話していたカフェ、週末に行かない？',body:'この前話していたカフェ、覚えてる？\n\n静かな路地にあって、窓が大きくて、コーヒーがおいしそうなお店。\n\n週末に行かない？\n午後なら空いてるよ ☀\n\n美咲',time:'金曜日',read:true,folder:'inbox'}]);
let mailFolder='inbox';
A.mailUnread=()=>mails.filter(m=>m.folder==='inbox'&&!m.read).length;
function mailApp(){A.view(A.nav('メール',`<button data-action="mailCompose" aria-label="作成">${icon('edit')}</button>`)+`<div class="app-content"><h1 class="app-title">${{inbox:'受信トレイ',sent:'デモ送信済み',draft:'下書き'}[mailFolder]} <span class="demo-label">LOCAL</span></h1>${A.search('mail-search','メールを検索')}<div id="mail-list"></div></div>`+A.tabs([{id:'inbox',icon:'mail',name:'受信',action:'mailFolder',value:'inbox'},{id:'sent',icon:'share',name:'デモ送信済み',action:'mailFolder',value:'sent'},{id:'draft',icon:'document',name:'下書き',action:'mailFolder',value:'draft'}],mailFolder));const render=q=>{$('#mail-list').innerHTML=mails.filter(m=>m.folder===mailFolder&&(m.sender+m.subject+m.body).includes(q)).map(m=>`<button class="inbox-row" data-action="mailOpen" data-id="${m.id}"><span class="inbox-unread ${m.read?'read':''}"></span><div class="inbox-body"><header><strong>${esc(m.sender)}</strong><time>${esc(m.time)} ›</time></header><h3>${esc(m.subject)}</h3><p>${esc(m.preview||m.body)}</p></div></button>`).join('')||A.empty('ここには、まだメールがありません。','mail');};render('');$('#mail-search').oninput=e=>render(e.target.value);}
A.apps.mail.render=mailApp;A.actions.mailList=mailApp;A.actions.mailFolder=el=>{mailFolder=el.dataset.value;mailApp();};
let openMail=null;
A.actions.mailOpen=el=>{const m=mails.find(m=>m.id===el.dataset.id);if(!m)return;openMail=m.id;m.read=true;A.save('mails',mails);A.view(A.nav('メール',`<button data-action="mailDelete" aria-label="削除">${icon('trash')}</button>`,'mailList','戻る')+`<div class="app-content"><h1 class="mail-detail-title">${esc(m.subject)}</h1><div class="mail-sender"><span class="avatar" style="background:linear-gradient(135deg,#c8b9a7,#a295ab)">${esc(m.initial||'私')}</span><div class="row-main"><strong>${esc(m.sender)}</strong><small>${esc(m.time)} · 宛先：${esc(m.to||'あなた')}</small></div></div><article class="mail-body">${esc(m.body)}</article><button class="secondary-button" data-action="mailReply" style="width:100%;margin:30px 0 10px">返信を書く</button></div>`);};
function mailCompose(reply){const m=reply?mails.find(m=>m.id===openMail):null;A.view(A.nav('新規メール',`<button data-action="mailSave" style="font-size:12px">保存</button>`,'mailList','キャンセル')+`<div class="app-content"><p class="setting-description">ローカルデモです。外部のアドレスには送信されません。</p><form id="mail-compose"><label class="form-label">宛先</label><input class="text-input" name="to" placeholder="name@example.com" value="${m?esc(m.sender):''}" required maxlength="150"><label class="form-label">件名</label><input class="text-input" name="subject" value="${m?'Re: '+esc(m.subject):''}" placeholder="件名" required maxlength="150"><label class="form-label">本文</label><textarea class="text-input" name="body" style="min-height:240px;line-height:1.9" placeholder="メッセージを書く…" required maxlength="10000"></textarea><button type="submit" class="primary-button" style="margin-top:20px">デモ送信</button></form></div>`);$('#mail-compose').onsubmit=e=>{e.preventDefault();storeMail('sent');};}
function storeMail(folder){const form=$('#mail-compose');if(!form)return;const v=Object.fromEntries(new FormData(form));mails.unshift({id:A.id(),sender:'あなた',initial:'私',...v,subject:v.subject||'件名なし',time:'今',read:true,folder});A.save('mails',mails);mailFolder=folder;mailApp();A.toast(folder==='sent'?'デモ送信済みに保存しました（外部送信なし）':'下書きに保存しました');}
A.actions.mailCompose=()=>mailCompose(false);A.actions.mailReply=()=>mailCompose(true);A.actions.mailSave=()=>storeMail('draft');A.actions.mailDelete=()=>A.confirm('メールを削除','このメールを削除しますか？',()=>{mails=mails.filter(m=>m.id!==openMail);A.save('mails',mails);mailApp();});
// Browser — polished local reading experience plus safe external navigation.
A.images={mountain:'https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?auto=format&fit=crop&w=900&q=85',forest:'https://images.unsplash.com/photo-1448375240586-882707db888b?auto=format&fit=crop&w=900&q=85',coffee:'https://images.unsplash.com/photo-1442512595331-e89e73853f31?auto=format&fit=crop&w=900&q=85',sea:'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=900&q=85',city:'https://images.unsplash.com/photo-1519501025264-65ba15a82390?auto=format&fit=crop&w=900&q=85',flower:'https://images.unsplash.com/photo-1490750967868-88aa4486c946?auto=format&fit=crop&w=900&q=85',desert:'https://images.unsplash.com/photo-1509316785289-025f5b846b35?auto=format&fit=crop&w=900&q=85',lake:'https://images.unsplash.com/photo-1470770841072-f978cf4d019e?auto=format&fit=crop&w=900&q=85',interior:'https://images.unsplash.com/photo-1600210492486-724fe5c67fb0?auto=format&fit=crop&w=900&q=85'};
// Connected browsing is implemented in connected.js.
})();
