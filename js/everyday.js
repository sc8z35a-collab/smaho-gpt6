'use strict';
// Local-first everyday tools. No accounts, tracking, or automatic network requests.
(() => {
  const A = window.Aura, $ = A.$, esc = A.escape;
  const dateKey = (d = new Date()) => `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
  const daysAgo = n => { const d = new Date(); d.setDate(d.getDate()-n); return dateKey(d); };
  const read = key => { const data = A.load(key, []); return Array.isArray(data) ? data : []; };
  const money = value => '¥' + Math.round(value).toLocaleString('ja-JP');
  const btn = (action, label, icon, id = '') => `<button class="ev-icon-button" data-action="${action}" data-id="${esc(id)}" aria-label="${esc(label)}" title="${esc(label)}">${A.icon(icon)}</button>`;
  const field = (label, name, value = '', type = 'text', attrs = '') => `<label class="form-label" for="ev-${name}">${label}</label><input class="text-input" id="ev-${name}" name="${name}" type="${type}" value="${esc(value)}" ${attrs}>`;
  const area = (label, name, value = '') => `<label class="form-label" for="ev-${name}">${label}</label><textarea class="text-input" id="ev-${name}" name="${name}" rows="5" maxlength="12000">${esc(value)}</textarea>`;
  const select = (label, name, options, value) => `<label class="form-label" for="ev-${name}">${label}</label><select class="text-input" id="ev-${name}" name="${name}">${options.map(([id,text])=>`<option value="${esc(id)}" ${id===value?'selected':''}>${esc(text)}</option>`).join('')}</select>`;
  const page = (id, content, actions = '') => { A.view(A.nav(A.apps[id].name, actions) + `<div class="app-content everyday ev-${id}">${content}</div>`); A.decorateEveryday?.(id); };
  const empty = text => `<div class="ev-empty">${esc(text)}</div>`;
  const section = (label, action = '') => `<header class="ev-section"><h3>${label}</h3>${action}</header>`;
  const progress = (value, label) => `<div class="ev-progress" role="progressbar" aria-label="${esc(label)}" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${Math.round(value)}"><i style="width:${Math.max(0,Math.min(100,value))}%"></i></div>`;
  const chips = (items, current, action) => `<div class="ev-chips">${items.map(([id,label])=>`<button data-action="${action}" data-id="${id}" class="${id===current?'selected':''}" aria-pressed="${id===current}">${label}</button>`).join('')}</div>`;
  const saveList = (key, list, render) => { if (!A.save(key, list)) return false; render?.(); return true; };
  const remove = (key, id, render) => A.confirm('削除しますか？', '', () => saveList(key, read(key).filter(x=>x.id!==id), render));
  const upsert = (key, record, render) => { const list=read(key), at=list.findIndex(x=>x.id===record.id); if(at<0)list.unshift(record);else list[at]=record;return saveList(key,list,render); };
  const exportText = (name, text, type='text/plain') => A.download(new Blob([text],{type:type+';charset=utf-8'}), name);
  Object.assign(A.icons, {
    today:'<rect x="3" y="4" width="18" height="17" rx="4"/><path d="M7 2v4m10-4v4M3 9h18m-14 5 3 3 6-5"/>',
    focus:'<circle cx="12" cy="12" r="9"/><path d="M12 6v6l4 2M9 1h6"/>',
    habits:'<path d="M12 21v-9M12 15C3 15 2 9 3 4c7 0 10 4 9 11Zm0-4c0-6 4-8 9-8 0 6-3 9-9 8Z"/>',
    expenses:'<rect x="3" y="3" width="18" height="18" rx="4"/><path d="m8 6 4 5 4-5M7 12h10M7 16h10M12 11v8"/>',
    shopping:'<path d="M4 7h16l-1 15H5ZM8 8V5a4 4 0 0 1 8 0v3"/>',
    journal:'<path d="M5 3h13a2 2 0 0 1 2 2v16H5a2 2 0 0 1 0-4h15M5 3a2 2 0 0 0-2 2v14M8 7h8M8 11h5"/>',
    contacts:'<rect x="3" y="2" width="18" height="20" rx="4"/><circle cx="12" cy="8" r="3"/><path d="M6 19v-1a6 6 0 0 1 12 0v1"/>',
    converter:'<path d="M3 7h17m-4-4 4 4-4 4M21 17H4m4-4-4 4 4 4"/>',
    reading:'<path d="M12 5v17M2 3c4-1 7 0 10 2 3-2 6-3 10-2v16c-4-1-7 0-10 2-3-2-6-3-10-2Z"/>',
    sketch:'<path d="m15 3 6 6M3 21l6-1L22 7l-5-5L4 15ZM4 15l5 5"/>'
  });

  // Today shares the actual calendar and reminder models, including unsaved seed data.
  function today() {
    const events = A.todayEvents(dateKey()).sort((a,b)=>a.time.localeCompare(b.time));
    const tasks = A.searchableReminders().filter(r=>!r.done && (!r.due || r.due<=dateKey()));
    const habits = read('habits'), checked = habits.filter(h=>h.days.includes(dateKey())).length;
    const minutes = read('focusHistory').filter(h=>h.date===dateKey()).reduce((n,h)=>n+h.minutes,0);
    page('today', `<div class="ev-heading"><span>${new Date().toLocaleDateString('ja-JP',{month:'long',day:'numeric',weekday:'long'})}</span></div><div class="ev-metrics"><button data-app="focus"><strong>${minutes}<small>分</small></strong><span>集中</span></button><button data-app="habits"><strong>${checked}<small> / ${habits.length}</small></strong><span>習慣</span></button><button data-app="reminders"><strong>${tasks.length}</strong><span>タスク</span></button></div><button class="ev-focus-link" data-app="focus">${A.icon('focus')}<span>集中する</span>${A.icon('arrow')}</button>${section('予定',btn('evTodayEvent','予定を追加','plus'))}<div class="ev-card">${events.map(e=>`<button class="ev-timeline" data-action="evTodayCalendar"><time>${esc(e.time)}</time><span><strong>${esc(e.title)}</strong><small>${esc(e.place)}</small></span>${A.icon('arrow')}</button>`).join('')||empty('予定なし')}</div>${section('タスク',btn('evTodayTask','タスクを追加','plus'))}<div class="ev-card">${tasks.slice(0,8).map(r=>`<div class="ev-row"><button class="check-circle" data-action="evTodayCheck" data-id="${esc(r.id)}" aria-label="${esc(r.text)}を完了"></button><span>${esc(r.text)}</span>${r.due&&r.due<dateKey()?'<small class="ev-alert">期限超過</small>':''}</div>`).join('')||empty('すべて完了')}</div>${section('よく使う')}<div class="ev-quick-grid">${['journal','shopping','expenses','reading'].map(id=>`<button data-app="${id}">${A.icon(id)}<span>${A.apps[id].name}</span></button>`).join('')}</div>`);
  }
  A.apps.today.render=today;
  A.actions.evTodayCalendar=()=>{A.open('calendar');A.actions.calendarToday();};
  A.actions.evTodayEvent=()=>{A.actions.evTodayCalendar();A.actions.calendarAdd();};
  A.actions.evTodayTask=()=>{A.open('reminders');A.actions.reminderDetails();};
  A.actions.evTodayCheck=el=>{A.actions.reminderToggle(el);today();};

  // Deadline-based timer survives app switches, reloads, and throttled intervals.
  let focus = A.load('focusSession',null) || {mode:'work',duration:25*60,remaining:25*60,end:0};
  if(!['work','rest'].includes(focus.mode)||!Number.isFinite(focus.remaining)||!Number.isFinite(focus.duration)||!Number.isFinite(focus.end))focus={mode:'work',duration:1500,remaining:1500,end:0};
  const commitFocus = next => {if(!A.save('focusSession',next))return false;focus=next;return true;};
  const secondsLeft = () => focus.end ? Math.max(0,Math.ceil((focus.end-Date.now())/1000)) : focus.remaining;
  A.focusTimerSnapshot=()=>focus.id||focus.end?{label:focus.mode==='rest'?'休憩':'集中',running:!!focus.end,remaining:secondsLeft(),duration:focus.duration,end:focus.end}:null;
  function finishFocus() {
    if(!focus.end||secondsLeft()>0)return;
    if(focus.mode==='work') {
      const history=read('focusHistory');
      if(!history.some(h=>h.id===focus.id) && !A.save('focusHistory',[{id:focus.id,date:dateKey(new Date(focus.end)),minutes:focus.duration/60,label:focus.label||''},...history].slice(0,3650)))return;
    }
    if(!commitFocus({...focus,end:0,remaining:0,id:null}))return false;
    A.notify({app:'focus',title:focus.mode==='work'?'集中完了':'休憩終了',body:focus.mode==='work'?'おつかれさま':'次の集中へ'});
    return true;
  }
  function focusTick(){const completed=finishFocus();if(A.current!=='focus')return;const el=$('#ev-focus-time');if(!el)return;if(completed){focusApp();return;}A.$$('[data-action="evFocusDuration"]').forEach(button=>button.disabled=!!focus.end);const s=secondsLeft();el.textContent=`${String(Math.floor(s/60)).padStart(2,'0')}:${String(s%60).padStart(2,'0')}`;$('#ev-focus-ring').style.setProperty('--progress',`${(1-s/focus.duration)*360}deg`);const toggle=$('#ev-focus-toggle');toggle.textContent=focus.end?'一時停止':s===0?'もう一度':'開始';}
  function focusApp(){
    finishFocus();const history=read('focusHistory');
    page('focus', `${chips([['work','集中'],['rest','休憩']],focus.mode,'evFocusMode')}<div class="ev-focus-ring" id="ev-focus-ring"><div><strong id="ev-focus-time"></strong><span>${Math.round(focus.duration/60)}分</span></div></div><div class="ev-chips ev-center">${(focus.mode==='work'?[15,25,50]:[5,10,15]).map(n=>`<button data-action="evFocusDuration" data-id="${n}" ${focus.end?'disabled':''} class="${focus.duration===n*60?'selected':''}">${n}分</button>`).join('')}</div><div class="ev-controls"><button class="secondary-button" data-action="evFocusReset">リセット</button><button class="primary-button" id="ev-focus-toggle" data-action="evFocusToggle">開始</button></div>${section('今週')}<div class="ev-card ev-week-chart">${Array.from({length:7},(_,i)=>{const date=daysAgo(6-i),sum=history.filter(h=>h.date===date).reduce((s,h)=>s+h.minutes,0);return `<div><span>${sum}</span><i style="height:${Math.min(96,sum/2)+4}px"></i><small>${new Date(date+'T12:00:00').toLocaleDateString('ja-JP',{weekday:'short'})}</small></div>`;}).join('')}</div><p class="ev-caption">ページ終了中は通知なし</p>`);focusTick();
  }
  A.apps.focus.render=focusApp;
  A.actions.evFocusToggle=()=>{finishFocus();const remaining=secondsLeft()||focus.duration,next={...focus,remaining,end:focus.end?0:Date.now()+remaining*1000};if(next.end&&!next.id)next.id=A.id();if(!next.end&&remaining===next.duration)next.id=null;if(commitFocus(next))focusTick();};
  const resetFocus = (changes={}) => {const next={...focus,...changes,end:0,id:null};next.remaining=next.duration;if(commitFocus(next))focusApp();};
  A.actions.evFocusReset=()=>focus.end?A.confirm('集中をリセット？','今回の記録は残りません。',resetFocus):resetFocus();
  A.actions.evFocusMode=el=>{if(focus.end)return A.toast('先に一時停止してください');resetFocus({mode:el.dataset.id,duration:el.dataset.id==='work'?1500:300});};
  A.actions.evFocusDuration=el=>{if(focus.end)return;resetFocus({duration:Number(el.dataset.id)*60});};
  setInterval(focusTick,1000);

  function streak(days){let count=0;for(let i=days.includes(dateKey())?0:1;i<3660;i++){if(!days.includes(daysAgo(i)))break;count++;}return count;}
  function habitsApp(){const list=read('habits'),done=list.filter(h=>h.days.includes(dateKey())).length;
    page('habits',`<div class="ev-hero sage"><span>今日の達成</span><strong>${done}<small> / ${list.length}</small></strong>${progress(list.length?done/list.length*100:0,'今日の習慣')}</div>${list.map(h=>`<article class="ev-card ev-habit"><div class="ev-row"><button class="check-circle ${h.days.includes(dateKey())?'checked':''}" aria-label="${esc(h.name)}" aria-pressed="${h.days.includes(dateKey())}" data-action="evHabitToggle" data-id="${h.id}">${h.days.includes(dateKey())?'✓':''}</button><div class="ev-grow"><strong>${esc(h.name)}</strong><small>${streak(h.days)}日連続</small></div>${btn('evHabitEdit','習慣を編集','edit',h.id)}</div><div class="ev-week">${Array.from({length:7},(_,i)=>{const date=daysAgo(6-i);return `<span class="${h.days.includes(date)?'done':''}"><small>${new Date(date+'T12:00:00').toLocaleDateString('ja-JP',{weekday:'short'})}</small><i>${h.days.includes(date)?'✓':'·'}</i></span>`;}).join('')}</div></article>`).join('')||empty('＋で習慣を追加')}`,btn('evHabitEdit','習慣を追加','plus'));
  }
  A.apps.habits.render=habitsApp;
  A.actions.evHabitEdit=el=>{const h=read('habits').find(h=>h.id===el.dataset.id);A.form(h?'習慣を編集':'習慣を追加',field('習慣','name',h?.name||'','text','required maxlength="60"')+(h?`<button type="button" class="ev-danger" data-action="evHabitDelete" data-id="${h.id}">削除</button>`:''),v=>{if(!v.name.trim())return false;return upsert('habits',{id:h?.id||A.id(),name:v.name.trim(),days:h?.days||[]},habitsApp);});};
  A.actions.evHabitToggle=el=>{const list=read('habits'),h=list.find(x=>x.id===el.dataset.id);if(!h)return;h.days=h.days.includes(dateKey())?h.days.filter(d=>d!==dateKey()):[...h.days,dateKey()];saveList('habits',list,habitsApp);};
  A.actions.evHabitDelete=el=>remove('habits',el.dataset.id,habitsApp);

  const categories=[['food','食費'],['daily','日用品'],['travel','交通'],['fun','趣味'],['fixed','固定費'],['other','その他']];
  let expenseMonth=dateKey().slice(0,7);
  const expenseTotals = rows => ({income:rows.filter(x=>x.kind==='income').reduce((s,x)=>s+x.amount,0),expense:rows.filter(x=>x.kind==='expense').reduce((s,x)=>s+x.amount,0)});
  function expensesApp(){const rows=read('expenses').filter(x=>x.date.startsWith(expenseMonth)).sort((a,b)=>b.date.localeCompare(a.date)), totals=expenseTotals(rows),budget=A.load('expenseBudget',0);
    page('expenses',`<label class="ev-month"><input aria-label="表示月" type="month" id="ev-expense-month" value="${expenseMonth}"></label><div class="ev-hero teal"><span>今月の支出</span><strong>${money(totals.expense)}</strong><div class="ev-hero-foot"><span>収入 ${money(totals.income)}</span><span>収支 ${money(totals.income-totals.expense)}</span></div></div><button class="ev-budget" data-action="evExpenseBudget"><span>月の予算</span><strong>${budget?money(budget-totals.expense)+' 残り':'設定'}</strong></button>${budget?progress(totals.expense/budget*100,'予算の使用率'):''}${section('内訳')}<div class="ev-card ev-breakdown">${categories.map(([id,name])=>{const n=rows.filter(x=>x.kind==='expense'&&x.category===id).reduce((s,x)=>s+x.amount,0);return n?`<div><span>${name}</span><i><b style="width:${n/(totals.expense||1)*100}%"></b></i><strong>${money(n)}</strong></div>`:'';}).join('')||empty('支出なし')}</div>${section('履歴',btn('evExpenseExport','CSVを書き出す','download'))}<div class="ev-card">${rows.map(x=>`<button class="ev-row ev-wide" data-action="evExpenseEdit" data-id="${x.id}"><span class="ev-grow"><strong>${esc(x.note||categories.find(c=>c[0]===x.category)?.[1]||'収入')}</strong><small>${esc(x.date)} · ${x.kind==='income'?'収入':categories.find(c=>c[0]===x.category)?.[1]||'その他'}</small></span><strong class="${x.kind==='income'?'ev-positive':''}">${x.kind==='income'?'+':'−'}${money(x.amount)}</strong></button>`).join('')||empty('＋で収支を記録')}</div>`,btn('evExpenseEdit','収支を追加','plus'));
    $('#ev-expense-month').onchange=e=>{if(e.target.value){expenseMonth=e.target.value;expensesApp();}};
  }
  A.apps.expenses.render=expensesApp;
  A.actions.evExpenseEdit=el=>{const x=read('expenses').find(x=>x.id===el.dataset.id);A.form(x?'収支を編集':'収支を追加',select('種類','kind',[['expense','支出'],['income','収入']],x?.kind||'expense')+field('金額（円）','amount',x?.amount||'','number','required min="1" max="999999999" step="1"')+select('カテゴリ','category',categories,x?.category||'food')+field('日付','date',x?.date||dateKey(),'date','required')+field('内容','note',x?.note||'','text','maxlength="80"')+(x?`<button type="button" class="ev-danger" data-action="evExpenseDelete" data-id="${x.id}">削除</button>`:''),v=>{const amount=Number(v.amount);if(!Number.isSafeInteger(amount)||amount<=0||amount>999999999)return false;return upsert('expenses',{...x,...v,amount,id:x?.id||A.id()},expensesApp);});};
  A.actions.evExpenseDelete=el=>remove('expenses',el.dataset.id,expensesApp);
  A.actions.evExpenseBudget=()=>A.form('月の予算',field('金額（円）','amount',A.load('expenseBudget',0),'number','min="0" max="999999999" step="1" required'),v=>{if(!A.save('expenseBudget',Number(v.amount)))return false;expensesApp();});
  const csvCell = value => '"'+String(value).replace(/^[=+@\-\t\r]/,"'$&").replace(/"/g,'""')+'"';
  A.actions.evExpenseExport=()=>exportText('aura-expenses-'+expenseMonth+'.csv','\ufeff'+[['日付','種類','カテゴリ','内容','金額'],...read('expenses').filter(x=>x.date.startsWith(expenseMonth)).map(x=>[x.date,x.kind==='income'?'収入':'支出',categories.find(c=>c[0]===x.category)?.[1]||'',x.note,x.amount])].map(row=>row.map(csvCell).join(',')).join('\r\n'),'text/csv');

  let shoppingFilter='all';
  function shoppingApp(){const list=read('shopping'),pending=list.filter(x=>!x.done),sum=pending.reduce((s,x)=>s+x.price*x.quantity,0),shown=shoppingFilter==='pending'?pending:list;
    page('shopping',`<div class="ev-hero sand"><span>買うもの</span><strong>${pending.length}<small>点</small></strong><span>予定額 ${money(sum)}</span></div>${chips([['all','すべて'],['pending','未購入']],shoppingFilter,'evShoppingFilter')}<div class="ev-card">${shown.map(x=>`<div class="ev-row ${x.done?'ev-done':''}"><button class="check-circle ${x.done?'checked':''}" data-action="evShoppingToggle" data-id="${x.id}" aria-label="${esc(x.name)}" aria-pressed="${x.done}">${x.done?'✓':''}</button><button class="ev-grow ev-plain" data-action="evShoppingEdit" data-id="${x.id}"><strong>${esc(x.name)}</strong><small>${x.quantity}点${x.price?' · '+money(x.price*x.quantity):''}</small></button>${btn('evShoppingDelete','削除','trash',x.id)}</div>`).join('')||empty('＋で買うものを追加')}</div>${list.some(x=>x.done)?'<button class="ev-text-button" data-action="evShoppingClear">購入済みを削除</button>':''}`,btn('evShoppingShare','リストを書き出す','share')+btn('evShoppingEdit','買うものを追加','plus'));
  }
  A.apps.shopping.render=shoppingApp;
  A.actions.evShoppingFilter=el=>{shoppingFilter=el.dataset.id;shoppingApp();};
  A.actions.evShoppingEdit=el=>{const x=read('shopping').find(x=>x.id===el.dataset.id);A.form(x?'買うものを編集':'買うものを追加',field('品名','name',x?.name||'','text','required maxlength="80"')+field('数量','quantity',x?.quantity||1,'number','required min="1" max="999" step="1"')+field('単価（円）','price',x?.price||0,'number','min="0" max="9999999" required step="1"'),v=>{if(!v.name.trim())return false;return upsert('shopping',{id:x?.id||A.id(),name:v.name.trim(),quantity:Number(v.quantity),price:Number(v.price),done:x?.done||false},shoppingApp);});};
  A.actions.evShoppingToggle=el=>{const list=read('shopping'),x=list.find(x=>x.id===el.dataset.id);if(x){x.done=!x.done;saveList('shopping',list,shoppingApp);}};
  A.actions.evShoppingDelete=el=>remove('shopping',el.dataset.id,shoppingApp);
  A.actions.evShoppingClear=()=>A.confirm('購入済みを削除？','未購入の項目は残ります。',()=>saveList('shopping',read('shopping').filter(x=>!x.done),shoppingApp));
  A.actions.evShoppingShare=()=>exportText('買い物リスト.txt',read('shopping').map(x=>`${x.done?'☑':'☐'} ${x.name} ×${x.quantity}${x.price?' '+money(x.price*x.quantity):''}`).join('\n'));

  const moods=[['5','晴れ'],['4','穏やか'],['3','ふつう'],['2','曇り'],['1','雨']];
  const moodIcon={5:'☀',4:'◒',3:'○',2:'☁',1:'☂'};
  function journalApp(){const list=read('journal').sort((a,b)=>b.date.localeCompare(a.date));
    page('journal',`<div class="ev-heading"><span>${dateKey()}</span></div><div class="ev-mood-strip">${Array.from({length:7},(_,i)=>{const date=daysAgo(6-i),entry=list.find(x=>x.date===date);return `<div><span>${entry?moodIcon[entry.mood]:'·'}</span><small>${new Date(date+'T12:00:00').getDate()}</small></div>`;}).join('')}</div>${A.search('ev-journal-search','日記を検索')}<div id="ev-journal-list"></div>`,btn('evJournalExport','日記を書き出す','download')+btn('evJournalEdit','日記を書く','plus'));
    const render=q=>{$('#ev-journal-list').innerHTML=list.filter(x=>(x.title+' '+x.body).toLowerCase().includes(q.toLowerCase())).map(x=>`<button class="ev-card ev-journal-entry" data-action="evJournalEdit" data-id="${x.id}"><header><time>${esc(x.date)}</time><span>${moodIcon[x.mood]}</span></header><h3>${esc(x.title||'日記')}</h3><p>${esc(x.body)}</p></button>`).join('')||empty('＋で今日を記録');};render('');$('#ev-journal-search').oninput=e=>render(e.target.value);
  }
  A.apps.journal.render=journalApp;
  A.actions.evJournalEdit=el=>{const list=read('journal'),x=list.find(x=>x.id===el.dataset.id)||(!el.dataset.id?list.find(x=>x.date===dateKey()):null);A.form(x?'日記を編集':'日記を書く',field('日付','date',x?.date||dateKey(),'date','required')+select('気分','mood',moods,x?.mood||'3')+field('タイトル','title',x?.title||'','text','maxlength="100"')+area('本文','body',x?.body||'')+(x?`<button type="button" class="ev-danger" data-action="evJournalDelete" data-id="${x.id}">削除</button>`:''),v=>{if(!v.title.trim()&&!v.body.trim()){A.toast('本文かタイトルを入力');return false;}if(list.some(e=>e.date===v.date&&e.id!==x?.id)){A.toast('この日の日記は作成済みです');return false;}return upsert('journal',{id:x?.id||A.id(),...v},journalApp);});};
  A.actions.evJournalDelete=el=>remove('journal',el.dataset.id,journalApp);
  A.actions.evJournalExport=()=>exportText('aura-journal.txt',read('journal').sort((a,b)=>a.date.localeCompare(b.date)).map(x=>`${x.date} ${moods.find(m=>m[0]===x.mood)?.[1]||''}\n${x.title}\n\n${x.body}`).join('\n\n────────\n\n'));

  function contactsApp(){page('contacts',`${A.search('ev-contacts-search','名前・電話番号を検索')}<div class="ev-card" id="ev-contacts-list"></div>`,btn('evContactsExport','連絡先を書き出す','download')+btn('evContactEdit','連絡先を追加','plus'));
    const render=q=>{$('#ev-contacts-list').innerHTML=read('contacts').filter(x=>(x.name+x.phone+x.email).toLowerCase().includes(q.toLowerCase())).sort((a,b)=>Number(b.favorite)-Number(a.favorite)||a.name.localeCompare(b.name,'ja')).map(x=>`<button class="ev-row ev-wide" data-action="evContactOpen" data-id="${x.id}"><span class="ev-avatar">${esc(Array.from(x.name)[0])}</span><span class="ev-grow"><strong>${esc(x.name)}</strong><small>${esc(x.phone||x.email)}</small></span>${x.favorite?A.icon('star'):A.icon('arrow')}</button>`).join('')||empty('＋で連絡先を追加');};render('');$('#ev-contacts-search').oninput=e=>render(e.target.value);
  }
  A.apps.contacts.render=contactsApp;
  A.actions.evContactEdit=el=>{const x=read('contacts').find(x=>x.id===el.dataset.id);A.form(x?'連絡先を編集':'連絡先を追加',field('名前','name',x?.name||'','text','required maxlength="80"')+field('電話番号','phone',x?.phone||'','tel','maxlength="24"')+field('メール','email',x?.email||'','email','maxlength="254"')+area('メモ','note',x?.note||''),v=>{if(!v.name.trim())return false;if(v.phone&&!/^\+?[0-9]{3,15}$/.test(v.phone.replace(/[\s()-]/g,''))){A.toast('電話番号を確認');return false;}return upsert('contacts',{id:x?.id||A.id(),...v,name:v.name.trim(),favorite:x?.favorite||false},contactsApp);});};
  A.actions.evContactOpen=el=>{const x=read('contacts').find(x=>x.id===el.dataset.id);if(!x)return;page('contacts',`<div class="ev-contact-hero"><span class="ev-avatar">${esc(Array.from(x.name)[0])}</span><h1>${esc(x.name)}</h1><button class="ev-text-button" data-action="evContactFavorite" data-id="${x.id}" aria-pressed="${x.favorite}">${x.favorite?'★ お気に入り':'☆ お気に入り'}</button></div><div class="ev-contact-actions">${x.phone?`<a href="tel:${esc(x.phone.replace(/[\s()-]/g,''))}">${A.icon('phone')}電話</a><a href="sms:${esc(x.phone.replace(/[\s()-]/g,''))}">${A.icon('messages')}SMS</a>`:''}${x.email?`<a href="mailto:${esc(encodeURIComponent(x.email))}">${A.icon('mail')}メール</a>`:''}</div><div class="ev-card ev-contact-info"><p>${esc(x.phone)}</p><p>${esc(x.email)}</p><p>${esc(x.note)}</p></div><p class="ev-caption">発信・送信は移動先で確認</p><button class="ev-text-button" data-action="evContactsHome">一覧に戻る</button><button class="ev-danger" data-action="evContactDelete" data-id="${x.id}">連絡先を削除</button>`,btn('evContactEdit','連絡先を編集','edit',x.id));};
  A.actions.evContactsHome=contactsApp;
  A.actions.evContactFavorite=el=>{const list=read('contacts'),x=list.find(x=>x.id===el.dataset.id);if(x){x.favorite=!x.favorite;saveList('contacts',list,()=>A.actions.evContactOpen(el));}};
  A.actions.evContactDelete=el=>remove('contacts',el.dataset.id,contactsApp);
  const vcf = s => String(s||'').replace(/\\/g,'\\\\').replace(/\r?\n/g,'\\n').replace(/[,;]/g,'\\$&');
  A.actions.evContactsExport=()=>exportText('aura-contacts.vcf',read('contacts').map(x=>['BEGIN:VCARD','VERSION:3.0','FN:'+vcf(x.name),'N:'+vcf(x.name)+';;;;','TEL:'+vcf(x.phone),'EMAIL:'+vcf(x.email),'NOTE:'+vcf(x.note),'END:VCARD'].join('\r\n')).join('\r\n'),'text/vcard');

  const units={length:{name:'長さ',units:{m:['m',1],km:['km',1000],cm:['cm',.01],mm:['mm',.001],in:['inch',.0254],ft:['ft',.3048],mi:['mile',1609.344]}},mass:{name:'重さ',units:{kg:['kg',1],g:['g',.001],lb:['lb',.45359237],oz:['oz',.028349523125]}},temperature:{name:'温度',units:{c:['°C',1],f:['°F',1],k:['K',1]}},volume:{name:'体積',units:{l:['L',1],ml:['mL',.001],cup:['cup（200mL）',.2],gal:['US gal',3.785411784]}},area:{name:'面積',units:{m2:['m²',1],km2:['km²',1e6],ha:['ha',1e4],ft2:['ft²',.09290304]}},speed:{name:'速度',units:{kmh:['km/h',1],ms:['m/s',3.6],mph:['mph',1.609344]}},data:{name:'データ',units:{b:['B',1],kb:['KB',1000],mb:['MB',1e6],gb:['GB',1e9],kib:['KiB',1024],mib:['MiB',1048576],gib:['GiB',1073741824]}}};
  function convert(value,category,from,to){if(category==='temperature'){const c=from==='f'?(value-32)*5/9:from==='k'?value-273.15:value;return to==='f'?c*9/5+32:to==='k'?c+273.15:c;}return value*units[category].units[from][1]/units[category].units[to][1];}
  A.everydayMath={convert,streak,expenseTotals};
  A.everydayUnits=units;
  let unitCategory='length';
  function converterApp(){const options=Object.entries(units[unitCategory].units).map(([id,[label]])=>[id,label]);page('converter',`<div class="ev-chips ev-wrap">${Object.entries(units).map(([id,u])=>`<button data-action="evUnitCategory" data-id="${id}" class="${id===unitCategory?'selected':''}">${u.name}</button>`).join('')}</div><div class="ev-converter">${field('数値','value',1,'number','step="any"')}${select('変換元','from',options,options[0][0])}<button class="ev-unit-swap" data-action="evUnitSwap" aria-label="単位を入れ替え">${A.icon('converter')}</button>${select('変換先','to',options,options[1][0])}<output id="ev-unit-result" aria-live="polite"></output><button class="ev-text-button" data-action="evUnitCopy">結果をコピー</button></div>`);['value','from','to'].forEach(id=>$('#ev-'+id).oninput=unitUpdate);unitUpdate();}
  function unitUpdate(){const raw=$('#ev-value').value,n=Number(raw),result=convert(n,unitCategory,$('#ev-from').value,$('#ev-to').value);$('#ev-unit-result').textContent=raw===''||!Number.isFinite(result)?'—':Number(result.toPrecision(12)).toLocaleString('ja-JP',{maximumSignificantDigits:12})+' '+units[unitCategory].units[$('#ev-to').value][0];}
  A.apps.converter.render=converterApp;
  A.actions.evUnitCategory=el=>{unitCategory=el.dataset.id;converterApp();};
  A.actions.evUnitSwap=()=>{const from=$('#ev-from'),to=$('#ev-to'),old=from.value;from.value=to.value;to.value=old;unitUpdate();};
  A.actions.evUnitCopy=async()=>{try{await navigator.clipboard.writeText($('#ev-unit-result').textContent);A.toast('コピー済み');}catch{A.toast('コピーできません');}};

  let readingFilter='all';
  function readingApp(){const list=read('reading'),finished=list.filter(x=>x.page>=x.total).length;page('reading',`<div class="ev-hero sand"><span>本棚</span><strong>${list.length}<small>冊</small></strong><span>読了 ${finished}冊</span></div>${chips([['all','すべて'],['reading','読書中'],['finished','読了']],readingFilter,'evReadingFilter')}<div class="ev-book-list">${list.filter(x=>readingFilter==='all'||(readingFilter==='finished'?x.page>=x.total:x.page<x.total)).map((x,i)=>`<article class="ev-card ev-book"><div class="ev-book-cover tone-${i%3}">${A.icon('reading')}</div><div class="ev-grow"><button class="ev-plain" data-action="evBookEdit" data-id="${x.id}"><strong>${esc(x.title)}</strong><small>${esc(x.author)}</small></button>${progress(x.page/x.total*100,x.title)}<button class="ev-book-progress" data-action="evBookProgress" data-id="${x.id}">${x.page} / ${x.total} ページ <span>›</span></button></div></article>`).join('')||empty('＋で本を追加')}</div>`,btn('evBookEdit','本を追加','plus'));}
  A.apps.reading.render=readingApp;
  A.actions.evReadingFilter=el=>{readingFilter=el.dataset.id;readingApp();};
  A.actions.evBookEdit=el=>{const x=read('reading').find(x=>x.id===el.dataset.id);A.form(x?'本を編集':'本を追加',field('書名','title',x?.title||'','text','required maxlength="160"')+field('著者','author',x?.author||'','text','maxlength="80"')+field('ページ数','total',x?.total||300,'number','required min="1" max="100000" step="1"')+area('読書メモ','note',x?.note||'')+(x?`<button type="button" class="ev-danger" data-action="evBookDelete" data-id="${x.id}">削除</button>`:''),v=>{if(!v.title.trim())return false;return upsert('reading',{...v,id:x?.id||A.id(),total:Number(v.total),page:Math.min(x?.page||0,Number(v.total))},readingApp);});};
  A.actions.evBookDelete=el=>remove('reading',el.dataset.id,readingApp);
  A.actions.evBookProgress=el=>{const x=read('reading').find(x=>x.id===el.dataset.id);if(x)A.form('読書の進捗',field('読んだページ','page',x.page,'number',`required min="0" max="${x.total}" step="1"`),v=>upsert('reading',{...x,page:Number(v.page)},readingApp));};

  // Detailed habit history. Old boolean day records remain the canonical data.
  let habitDay=dateKey(),habitMonth=dateKey().slice(0,7),activeHabit=null;
  const monthDays = month => {const [y,m]=month.split('-').map(Number);return Array.from({length:new Date(y,m,0).getDate()},(_,i)=>`${month}-${String(i+1).padStart(2,'0')}`);};
  const longestStreak = dates => {let best=0,current=0,last='';for(const day of [...new Set(dates)].sort()){const previous=new Date(day+'T12:00:00');previous.setDate(previous.getDate()-1);current=last===dateKey(previous)?current+1:1;best=Math.max(best,current);last=day;}return best;};
  const weekCount = h => h.days.filter(day=>day>=daysAgo(6)&&day<=dateKey()).length;
  habitsApp = function(){const list=read('habits'),done=list.filter(h=>h.days.includes(habitDay)).length;
    page('habits',`<div class="ev-date-switch"><button data-action="evHabitDay" data-id="-1" aria-label="前の日">‹</button><input id="ev-habit-day" type="date" aria-label="記録する日" max="${dateKey()}" value="${habitDay}"><button data-action="evHabitDay" data-id="1" aria-label="次の日" ${habitDay>=dateKey()?'disabled':''}>›</button></div><div class="ev-hero sage"><span>${habitDay===dateKey()?'今日':esc(habitDay)}の達成</span><strong>${done}<small> / ${list.length}</small></strong>${progress(list.length?done/list.length*100:0,'習慣の達成率')}</div>${list.map(h=>`<article class="ev-card ev-habit"><div class="ev-row"><button class="check-circle ${h.days.includes(habitDay)?'checked':''}" aria-label="${esc(h.name)}" aria-pressed="${h.days.includes(habitDay)}" data-action="evHabitToggle" data-id="${h.id}">${h.days.includes(habitDay)?'✓':''}</button><button class="ev-grow ev-plain" data-action="evHabitHistory" data-id="${h.id}"><strong>${esc(h.name)}</strong><small>${streak(h.days)}日連続 · 直近7日 ${weekCount(h)}/${h.goal||7}日</small></button>${btn('evHabitEdit','習慣を編集','edit',h.id)}</div><div class="ev-week">${Array.from({length:7},(_,i)=>{const day=daysAgo(6-i);return `<span class="${h.days.includes(day)?'done':''}"><small>${new Date(day+'T12:00:00').toLocaleDateString('ja-JP',{weekday:'short'})}</small><i>${h.days.includes(day)?'✓':'·'}</i></span>`;}).join('')}</div></article>`).join('')||empty('＋で習慣を追加')}`,btn('evHabitEdit','習慣を追加','plus'));
    $('#ev-habit-day').onchange=e=>{if(e.target.value&&e.target.value<=dateKey()){habitDay=e.target.value;habitsApp();}};
  };
  A.apps.habits.render=habitsApp;
  A.actions.evHabitDay=el=>{const d=new Date(habitDay+'T12:00:00');d.setDate(d.getDate()+Number(el.dataset.id));if(dateKey(d)<=dateKey()){habitDay=dateKey(d);habitsApp();}};
  A.actions.evHabitToggle=el=>{const list=read('habits'),h=list.find(x=>x.id===el.dataset.id);if(!h)return;h.days=h.days.includes(habitDay)?h.days.filter(d=>d!==habitDay):[...h.days,habitDay];saveList('habits',list,habitsApp);};
  A.actions.evHabitEdit=el=>{const h=read('habits').find(x=>x.id===el.dataset.id);A.form(h?'習慣を編集':'習慣を追加',field('習慣','name',h?.name||'','text','required maxlength="60"')+field('7日間の目標（日）','goal',h?.goal||7,'number','required min="1" max="7" step="1"')+(h?`<button type="button" class="ev-danger" data-action="evHabitDelete" data-id="${h.id}">削除</button>`:''),v=>{if(!v.name.trim())return false;return upsert('habits',{id:h?.id||A.id(),name:v.name.trim(),goal:Number(v.goal),days:h?.days||[]},habitsApp);});};
  function habitHistory(){const h=read('habits').find(x=>x.id===activeHabit);if(!h)return habitsApp();const dates=monthDays(habitMonth),start=new Date(dates[0]+'T12:00:00').getDay();page('habits',`<div class="ev-heading"><h1>${esc(h.name)}</h1></div><div class="ev-metrics"><button><strong>${h.days.length}<small>日</small></strong><span>累計</span></button><button><strong>${streak(h.days)}<small>日</small></strong><span>連続</span></button><button><strong>${longestStreak(h.days)}<small>日</small></strong><span>最長</span></button></div><label class="ev-month ev-spaced"><input id="ev-habit-month" type="month" aria-label="記録月" value="${habitMonth}" max="${dateKey().slice(0,7)}"></label><div class="ev-heatmap">${['日','月','火','水','木','金','土'].map(x=>`<small>${x}</small>`).join('')}${'<span></span>'.repeat(start)}${dates.map(day=>`<button class="${h.days.includes(day)?'done':''} ${day===dateKey()?'today':''}" data-action="evHabitHistoryToggle" data-id="${day}" ${day>dateKey()?'disabled':''} aria-label="${day}" aria-pressed="${h.days.includes(day)}">${Number(day.slice(-2))}</button>`).join('')}</div><p class="ev-caption">日付から記録</p><button class="ev-text-button" data-action="evHabitsHome">一覧</button>`);$('#ev-habit-month').onchange=e=>{if(e.target.value){habitMonth=e.target.value;habitHistory();}};}
  A.actions.evHabitHistory=el=>{activeHabit=el.dataset.id;habitMonth=dateKey().slice(0,7);habitHistory();};
  A.actions.evHabitHistoryToggle=el=>{const day=el.dataset.id;if(day>dateKey())return;const list=read('habits'),h=list.find(x=>x.id===activeHabit);if(h){h.days=h.days.includes(day)?h.days.filter(d=>d!==day):[...h.days,day];saveList('habits',list,habitHistory);}};
  A.actions.evHabitsHome=habitsApp;

  // Monthly and category budgets, comparisons, transaction search, and recurring entries.
  let expenseKind='all',expenseQuery='';
  const getBudget = () => A.load('expenseBudgets',{})[expenseMonth]||{total:A.load('expenseBudget',0),categories:{}};
  expensesApp = function(){const rows=read('expenses').filter(x=>x.date.startsWith(expenseMonth)).sort((a,b)=>b.date.localeCompare(a.date)), totals=expenseTotals(rows),budget=getBudget();const previous=new Date(expenseMonth+'-15T12:00:00');previous.setMonth(previous.getMonth()-1);const last=expenseTotals(read('expenses').filter(x=>x.date.startsWith(dateKey(previous).slice(0,7)))).expense;
    page('expenses',`<label class="ev-month"><input aria-label="表示月" type="month" id="ev-expense-month" value="${expenseMonth}"></label><div class="ev-hero teal"><span>今月の支出</span><strong>${money(totals.expense)}</strong><div class="ev-hero-foot"><span>収入 ${money(totals.income)}</span><span>収支 ${money(totals.income-totals.expense)}</span></div><div class="ev-comparison">前月比 ${totals.expense-last>0?'+':''}${money(totals.expense-last)}</div></div><button class="ev-budget" data-action="evExpenseBudget"><span>月の予算</span><strong>${budget.total?money(budget.total-totals.expense)+' 残り':'設定'}</strong></button>${budget.total?progress(totals.expense/budget.total*100,'予算の使用率'):''}${section('内訳')}<div class="ev-card ev-breakdown">${categories.map(([id,name])=>{const n=rows.filter(x=>x.kind==='expense'&&x.category===id).reduce((s,x)=>s+x.amount,0),cap=budget.categories?.[id]||0;return n||cap?`<div class="ev-category-budget"><span>${name}</span><i><b class="${cap&&n>cap?'over':''}" style="width:${Math.min(100,n/(cap||totals.expense||1)*100)}%"></b></i><strong>${money(n)}${cap?`<small>/ ${money(cap)}</small>`:''}</strong></div>`:'';}).join('')||empty('支出なし')}</div><button class="ev-recurring-link" data-action="evRecurringHome">${A.icon('refresh')}固定費<span>›</span></button>${section('履歴',btn('evExpenseExport','CSVを書き出す','download'))}${chips([['all','すべて'],['expense','支出'],['income','収入']],expenseKind,'evExpenseKind')}${A.search('ev-expense-search','内容を検索')}<div class="ev-card" id="ev-expense-rows"></div>`,btn('evExpenseEdit','収支を追加','plus'));
    const render=()=>{$('#ev-expense-rows').innerHTML=rows.filter(x=>(expenseKind==='all'||x.kind===expenseKind)&&(x.note||'').toLowerCase().includes(expenseQuery.toLowerCase())).map(x=>`<button class="ev-row ev-wide" data-action="evExpenseEdit" data-id="${x.id}"><span class="ev-grow"><strong>${esc(x.note||(x.kind==='income'?'収入':categories.find(c=>c[0]===x.category)?.[1])||'支出')}</strong><small>${esc(x.date)} · ${x.kind==='income'?'収入':categories.find(c=>c[0]===x.category)?.[1]||'その他'}${x.recurringId?' · 固定費':''}</small></span><strong class="${x.kind==='income'?'ev-positive':''}">${x.kind==='income'?'+':'−'}${money(x.amount)}</strong></button>`).join('')||empty('記録なし');};render();$('#ev-expense-search').value=expenseQuery;$('#ev-expense-search').oninput=e=>{expenseQuery=e.target.value;render();};$('#ev-expense-month').onchange=e=>{if(e.target.value){expenseMonth=e.target.value;expensesApp();}};
  };
  A.apps.expenses.render=expensesApp;
  A.actions.evExpenseKind=el=>{expenseKind=el.dataset.id;expensesApp();};
  A.actions.evExpenseBudget=()=>{const budget=getBudget();A.form(expenseMonth+'の予算',field('全体（円）','total',budget.total||0,'number','required min="0" max="999999999" step="1"')+categories.map(([id,name])=>field(name+'（円）',id,budget.categories?.[id]||0,'number','required min="0" max="999999999" step="1"')).join(''),v=>{const budgets=A.load('expenseBudgets',{});budgets[expenseMonth]={total:Number(v.total),categories:Object.fromEntries(categories.map(([id])=>[id,Number(v[id])]))};if(!A.save('expenseBudgets',budgets))return false;expensesApp();});};
  A.actions.evRecurringHome=()=>page('expenses',`${section('固定費',btn('evRecurringEdit','固定費を追加','plus'))}<div class="ev-card">${read('recurringExpenses').map(x=>`<div class="ev-row"><button class="ev-grow ev-plain" data-action="evRecurringEdit" data-id="${x.id}"><strong>${esc(x.note)}</strong><small>毎月${x.day}日 · ${money(x.amount)}</small></button>${btn('evRecurringDelete','固定費を削除','trash',x.id)}</div>`).join('')||empty('固定費なし')}</div><button class="primary-button ev-full" data-action="evRecurringApply">${expenseMonth}に記帳</button><button class="ev-text-button" data-action="evExpensesHome">家計簿に戻る</button>`);
  A.actions.evExpensesHome=expensesApp;
  A.actions.evRecurringEdit=el=>{const x=read('recurringExpenses').find(x=>x.id===el.dataset.id);A.form(x?'固定費を編集':'固定費を追加',field('内容','note',x?.note||'','text','required maxlength="80"')+field('金額（円）','amount',x?.amount||'','number','required min="1" max="999999999" step="1"')+select('カテゴリ','category',categories,x?.category||'fixed')+field('毎月の日付','day',x?.day||1,'number','required min="1" max="31" step="1"'),v=>{if(!v.note.trim())return false;return upsert('recurringExpenses',{id:x?.id||A.id(),...v,amount:Number(v.amount),day:Number(v.day)},A.actions.evRecurringHome);});};
  A.actions.evRecurringDelete=el=>remove('recurringExpenses',el.dataset.id,A.actions.evRecurringHome);
  A.actions.evRecurringApply=()=>{const list=read('expenses'),end=monthDays(expenseMonth).length;let count=0;for(const x of read('recurringExpenses')){if(list.some(e=>e.recurringId===x.id&&e.date.startsWith(expenseMonth)))continue;list.unshift({id:A.id(),kind:'expense',amount:x.amount,category:x.category,note:x.note,date:expenseMonth+'-'+String(Math.min(end,x.day)).padStart(2,'0'),recurringId:x.id});count++;}if(saveList('expenses',list,expensesApp))A.toast(count?`${count}件を記帳しました`:'すべて記帳済みです');};
  const baseExpenseEdit=A.actions.evExpenseEdit;
  A.actions.evExpenseEdit=el=>{baseExpenseEdit(el);const x=read('expenses').find(x=>x.id===el.dataset.id);if(x){$('#modal-form .modal-actions').insertAdjacentHTML('beforebegin',`<button type="button" class="ev-text-button" data-action="evExpenseDuplicate" data-id="${x.id}">複製</button>`);}};
  A.actions.evExpenseDuplicate=el=>{const x=read('expenses').find(x=>x.id===el.dataset.id);if(!x)return;A.closeOverlay();A.actions.evExpenseEdit({dataset:{}});const f=$('#modal-form');for(const key of ['kind','amount','category','note'])f.elements[key].value=x[key];};

  // Named shopping lists, aisle grouping, and quick multi-line entry.
  let shoppingList='default';const aisles=[['food','食品'],['daily','日用品'],['other','その他']];
  const shoppingLists=()=>[{id:'default',name:'買い物'},...read('shoppingLists')];
  shoppingApp=function(){if(!shoppingLists().some(x=>x.id===shoppingList))shoppingList='default';const list=read('shopping').filter(x=>(x.listId||'default')===shoppingList),pending=list.filter(x=>!x.done),sum=pending.reduce((s,x)=>s+x.price*x.quantity,0),shown=shoppingFilter==='pending'?pending:list;
    page('shopping',`<div class="ev-list-picker"><select id="ev-shopping-list" aria-label="買い物リスト">${shoppingLists().map(x=>`<option value="${x.id}" ${x.id===shoppingList?'selected':''}>${esc(x.name)}</option>`).join('')}</select>${btn('evShoppingListNew','リストを追加','plus')}${btn('evShoppingListEdit','リストを編集','edit')}</div><div class="ev-hero sand"><span>買うもの</span><strong>${pending.length}<small>点</small></strong><span>予定額 ${money(sum)}</span></div>${chips([['all','すべて'],['pending','未購入']],shoppingFilter,'evShoppingFilter')}${aisles.map(([category,label])=>{const items=shown.filter(x=>(x.category||'other')===category).sort((a,b)=>Number(a.done)-Number(b.done));return items.length?`${section(label)}<div class="ev-card">${items.map(x=>`<div class="ev-row ${x.done?'ev-done':''}"><button class="check-circle ${x.done?'checked':''}" data-action="evShoppingToggle" data-id="${x.id}" aria-label="${esc(x.name)}" aria-pressed="${x.done}">${x.done?'✓':''}</button><button class="ev-grow ev-plain" data-action="evShoppingEdit" data-id="${x.id}"><strong>${esc(x.name)}</strong><small>${x.quantity}点${x.price?' · '+money(x.price*x.quantity):''}</small></button>${btn('evShoppingDelete','削除','trash',x.id)}</div>`).join('')}</div>`:'';}).join('')||empty('＋で買うものを追加')}<button class="ev-text-button" data-action="evShoppingBulk">まとめて追加</button>${list.some(x=>x.done)?'<button class="ev-text-button" data-action="evShoppingClear">購入済みを削除</button>':''}`,btn('evShoppingShare','リストを書き出す','share')+btn('evShoppingEdit','買うものを追加','plus'));$('#ev-shopping-list').onchange=e=>{shoppingList=e.target.value;shoppingApp();};
  };
  A.apps.shopping.render=shoppingApp;
  A.actions.evShoppingEdit=el=>{const x=read('shopping').find(x=>x.id===el.dataset.id);A.form(x?'買うものを編集':'買うものを追加',field('品名','name',x?.name||'','text','required maxlength="80"')+select('分類','category',aisles,x?.category||'food')+field('数量','quantity',x?.quantity||1,'number','required min="1" max="999" step="1"')+field('単価（円）','price',x?.price||0,'number','min="0" max="9999999" required step="1"')+select('リスト','listId',shoppingLists().map(x=>[x.id,x.name]),x?.listId||shoppingList),v=>{if(!v.name.trim())return false;return upsert('shopping',{id:x?.id||A.id(),...v,name:v.name.trim(),quantity:Number(v.quantity),price:Number(v.price),done:x?.done||false},shoppingApp);});};
  A.actions.evShoppingListNew=()=>A.form('リストを作成',field('名前','name','','text','required maxlength="40"'),v=>{if(!v.name.trim())return false;const id=A.id();if(!upsert('shoppingLists',{id,name:v.name.trim()}))return false;shoppingList=id;shoppingApp();});
  A.actions.evShoppingListEdit=()=>{if(shoppingList==='default'){A.toast('標準リストです');return;}const x=shoppingLists().find(x=>x.id===shoppingList);A.form('リストを編集',field('名前','name',x.name,'text','required maxlength="40"')+`<button type="button" class="ev-danger" data-action="evShoppingListDelete">リストを削除</button>`,v=>{if(!v.name.trim())return false;return upsert('shoppingLists',{...x,name:v.name.trim()},shoppingApp);});};
  A.actions.evShoppingListDelete=()=>A.confirm('リストを削除？','中の項目は標準リストに移動します。',()=>{const items=read('shopping').map(x=>x.listId===shoppingList?{...x,listId:'default'}:x);if(!A.save('shopping',items))return;if(!A.save('shoppingLists',read('shoppingLists').filter(x=>x.id!==shoppingList)))return;shoppingList='default';shoppingApp();});
  A.actions.evShoppingBulk=()=>A.form('まとめて追加',area('1行に1品','items'),v=>{const names=v.items.split(/\r?\n/).map(x=>x.trim().slice(0,80)).filter(Boolean).slice(0,100);if(!names.length)return false;const list=read('shopping');for(const name of names){const found=list.find(x=>!x.done&&(x.listId||'default')===shoppingList&&x.name===name);if(found)found.quantity=Math.min(999,found.quantity+1);else list.push({id:A.id(),name,quantity:1,price:0,category:'other',listId:shoppingList,done:false});}return saveList('shopping',list,shoppingApp);},'追加');
  A.actions.evShoppingClear=()=>A.confirm('購入済みを削除？','このリストの購入済みだけを削除します。',()=>saveList('shopping',read('shopping').filter(x=>!((x.listId||'default')===shoppingList&&x.done)),shoppingApp));
  A.actions.evShoppingShare=()=>exportText((shoppingLists().find(x=>x.id===shoppingList)?.name||'買い物')+'.txt',read('shopping').filter(x=>(x.listId||'default')===shoppingList).map(x=>`${x.done?'☑':'☐'} ${x.name} ×${x.quantity}${x.price?' '+money(x.price*x.quantity):''}`).join('\n'));

  // Journal editor saves text in place; search, tags and favorite filters use persisted records.
  let journalMood='all',journalFavorites=false,journalQuery='',journalDraft=null;
  journalApp=function(){const list=read('journal').sort((a,b)=>b.date.localeCompare(a.date));page('journal',`<div class="ev-mood-strip">${Array.from({length:7},(_,i)=>{const day=daysAgo(6-i),x=list.find(x=>x.date===day);return `<button data-action="evJournalDay" data-id="${day}"><span>${x?moodIcon[x.mood]:'·'}</span><small>${Number(day.slice(-2))}</small></button>`;}).join('')}</div><div class="ev-journal-filters"><select id="ev-journal-mood" aria-label="気分で絞り込み"><option value="all">すべての気分</option>${moods.map(([id,label])=>`<option value="${id}" ${id===journalMood?'selected':''}>${label}</option>`).join('')}</select><button data-action="evJournalFavorites" aria-pressed="${journalFavorites}">${journalFavorites?'★':'☆'}</button></div>${A.search('ev-journal-search','本文・タグを検索')}<div id="ev-journal-list"></div>`,btn('evJournalExport','日記を書き出す','download')+btn('evJournalEdit','日記を書く','plus'));const render=()=>{$('#ev-journal-list').innerHTML=list.filter(x=>(journalMood==='all'||x.mood===journalMood)&&(!journalFavorites||x.favorite)&&(x.title+' '+x.body+' '+(x.tags||'')).toLowerCase().includes(journalQuery.toLowerCase())).map(x=>`<button class="ev-card ev-journal-entry" data-action="evJournalEdit" data-id="${x.id}"><header><time>${esc(x.date)}${x.favorite?' · ★':''}</time><span>${moodIcon[x.mood]||'○'}</span></header><h3>${esc(x.title||'日記')}</h3><p>${esc(x.body.slice(0,320))}${x.body.length>320?'…':''}</p>${x.tags?`<div class="ev-tags">${x.tags.split(/[,、\s]+/).filter(Boolean).map(t=>`<span>#${esc(t.replace(/^#/,''))}</span>`).join('')}</div>`:''}</button>`).join('')||empty('＋で日記を書く');};render();$('#ev-journal-search').value=journalQuery;$('#ev-journal-search').oninput=e=>{journalQuery=e.target.value;render();};$('#ev-journal-mood').onchange=e=>{journalMood=e.target.value;render();};};
  A.apps.journal.render=journalApp;
  A.actions.evJournalFavorites=()=>{journalFavorites=!journalFavorites;journalApp();};
  function journalEditor(entry){journalDraft=entry;page('journal',`<div class="ev-editor-meta"><input id="ev-journal-date" type="date" aria-label="日記の日付" value="${entry.date}"><select id="ev-journal-feeling" aria-label="気分">${moods.map(([id,name])=>`<option value="${id}" ${entry.mood===id?'selected':''}>${moodIcon[id]} ${name}</option>`).join('')}</select></div><input class="ev-editor-title" id="ev-journal-title" aria-label="タイトル" placeholder="タイトル" maxlength="100" value="${esc(entry.title)}"><div class="ev-editor-toolbar"><button data-action="evJournalInsert" data-id="• " aria-label="箇条書き">•</button><button data-action="evJournalInsert" data-id="☐ " aria-label="チェック項目">☐</button><button data-action="evJournalInsert" data-id="— " aria-label="区切り">—</button><span id="ev-journal-count">${entry.body.length}字</span></div><textarea class="ev-journal-body" id="ev-journal-body" aria-label="日記の本文" placeholder="今日のこと" maxlength="12000">${esc(entry.body)}</textarea><input class="text-input" id="ev-journal-tags" aria-label="タグ" placeholder="タグ（空白で区切る）" maxlength="120" value="${esc(entry.tags||'')}"><div class="ev-editor-footer"><span id="ev-journal-status" role="status">${read('journal').some(x=>x.id===entry.id)?'保存済み':''}</span><button class="ev-text-button" data-action="evJournalHome">一覧</button><button class="ev-danger" data-action="evJournalDelete" data-id="${entry.id}">削除</button></div>`,btn('evJournalFavorite','お気に入り','star'));
    const save=()=>{const date=$('#ev-journal-date').value;if(!date)return;if(read('journal').some(x=>x.date===date&&x.id!==journalDraft.id)){$('#ev-journal-date').value=journalDraft.date;A.toast('この日の日記は作成済みです');return;}journalDraft={...journalDraft,date,mood:$('#ev-journal-feeling').value,title:$('#ev-journal-title').value,body:$('#ev-journal-body').value,tags:$('#ev-journal-tags').value};$('#ev-journal-count').textContent=journalDraft.body.length+'字';if(!journalDraft.title.trim()&&!journalDraft.body.trim()&&!read('journal').some(x=>x.id===journalDraft.id)){$('#ev-journal-status').textContent='本文かタイトルを入力';return;}$('#ev-journal-status').textContent=upsert('journal',journalDraft)?'保存済み':'保存できません';};for(const id of ['date','feeling','title','body','tags'])$('#ev-journal-'+id).oninput=save;const star=$('[data-action=evJournalFavorite]');star.setAttribute('aria-pressed',String(!!entry.favorite));star.classList.toggle('ev-starred',!!entry.favorite);
  }
  A.actions.evJournalEdit=el=>{const list=read('journal'),x=list.find(x=>x.id===el.dataset.id)||(!el.dataset.id?list.find(x=>x.date===dateKey()):null);journalEditor(x?{...x}:{id:A.id(),date:dateKey(),title:'',body:'',mood:'3',tags:'',favorite:false});};
  A.actions.evJournalDay=el=>{const x=read('journal').find(x=>x.date===el.dataset.id);journalEditor(x?{...x}:{id:A.id(),date:el.dataset.id,title:'',body:'',mood:'3',tags:'',favorite:false});};
  A.actions.evJournalHome=journalApp;
  A.actions.evJournalInsert=el=>{const body=$('#ev-journal-body');const insertion=(body.selectionStart&&body.value[body.selectionStart-1]!=='\n'?'\n':'')+el.dataset.id;if(body.value.length-(body.selectionEnd-body.selectionStart)+insertion.length>body.maxLength)return A.toast('本文の上限に達しています');body.setRangeText(insertion,body.selectionStart,body.selectionEnd,'end');body.dispatchEvent(new Event('input'));body.focus();};
  A.actions.evJournalFavorite=()=>{if(!journalDraft)return;journalDraft.favorite=!journalDraft.favorite;if(journalDraft.title.trim()||journalDraft.body.trim()){if(!upsert('journal',journalDraft)){journalDraft.favorite=!journalDraft.favorite;return;}}const star=$('[data-action=evJournalFavorite]');star.classList.toggle('ev-starred',!!journalDraft.favorite);star.setAttribute('aria-pressed',String(journalDraft.favorite));};

  // Reading sessions, yearly goals, ratings and quotations enrich each book.
  let activeBook=null;
  const bookSessions=id=>read('readingSessions').filter(x=>x.bookId===id);
  const bookQuotes=id=>read('readingQuotes').filter(x=>x.bookId===id);
  readingApp=function(){const list=read('reading'),finished=list.filter(x=>x.page>=x.total).length,year=String(new Date().getFullYear()),goal=A.load('readingGoal',12),annual=list.filter(x=>x.page>=x.total&&x.finishedAt?.startsWith(year)).length;page('reading',`<div class="ev-hero sand"><span>本棚</span><strong>${list.length}<small>冊</small></strong><span>読了 ${finished}冊</span></div><button class="ev-budget" data-action="evReadingGoal"><span>${year}年の目標</span><strong>${annual} / ${goal}冊</strong></button>${progress(annual/goal*100,'年間読書目標')}${chips([['all','すべて'],['planned','未読'],['reading','読書中'],['finished','読了']],readingFilter,'evReadingFilter')}<div class="ev-book-list">${list.filter(x=>readingFilter==='all'||(readingFilter==='finished'?x.page>=x.total:readingFilter==='planned'?x.page===0:x.page>0&&x.page<x.total)).map((x,i)=>`<article class="ev-card ev-book"><button class="ev-book-cover tone-${i%3}" data-action="evBookOpen" data-id="${x.id}" aria-label="${esc(x.title)}を開く">${A.icon('reading')}</button><div class="ev-grow"><button class="ev-plain" data-action="evBookOpen" data-id="${x.id}"><strong>${esc(x.title)}</strong><small>${esc(x.author)}${x.rating?' · '+'★'.repeat(x.rating):''}</small></button>${progress(x.page/x.total*100,x.title)}<button class="ev-book-progress" data-action="evBookProgress" data-id="${x.id}">${x.page} / ${x.total} ページ <span>›</span></button></div></article>`).join('')||empty('＋で本を追加')}</div>`,btn('evBookEdit','本を追加','plus'));};
  A.apps.reading.render=readingApp;
  A.actions.evReadingGoal=()=>A.form('年間読書目標',field('冊数','goal',A.load('readingGoal',12),'number','required min="1" max="1000" step="1"'),v=>{if(!A.save('readingGoal',Number(v.goal)))return false;readingApp();});
  A.actions.evBookEdit=el=>{const x=read('reading').find(x=>x.id===el.dataset.id);A.form(x?'本を編集':'本を追加',field('書名','title',x?.title||'','text','required maxlength="160"')+field('著者','author',x?.author||'','text','maxlength="80"')+field('ページ数','total',x?.total||300,'number','required min="1" max="100000" step="1"')+area('読書メモ','note',x?.note||'')+(x?`<button type="button" class="ev-danger" data-action="evBookDelete" data-id="${x.id}">削除</button>`:''),v=>{if(!v.title.trim())return false;const total=Number(v.total),page=Math.min(x?.page||0,total);return upsert('reading',{...x,...v,id:x?.id||A.id(),total,page,finishedAt:page>=total?(x?.finishedAt||dateKey()):null},readingApp);});};
  function bookDetail(){const x=read('reading').find(x=>x.id===activeBook);if(!x)return readingApp();const sessions=bookSessions(x.id),quotes=bookQuotes(x.id);page('reading',`<div class="ev-book-detail"><div class="ev-book-cover">${A.icon('reading')}</div><h1>${esc(x.title)}</h1><p>${esc(x.author)}</p><div class="ev-rating">${[1,2,3,4,5].map(n=>`<button data-action="evBookRate" data-id="${n}" aria-label="${n}つ星" aria-pressed="${n<=Number(x.rating||0)}">${n<=Number(x.rating||0)?'★':'☆'}</button>`).join('')}</div></div>${progress(x.page/x.total*100,x.title)}<div class="ev-book-detail-stats"><span>${x.page} / ${x.total}ページ</span><span>${sessions.reduce((s,x)=>s+x.minutes,0)}分</span></div><button class="primary-button ev-full" data-action="evReadingSession">読書を記録</button>${section('読書メモ',btn('evBookEdit','本を編集','edit',x.id))}<div class="ev-card ev-note-copy">${esc(x.note||'メモはありません')}</div>${section('引用',btn('evQuoteAdd','引用を追加','plus'))}${quotes.map(q=>`<blockquote class="ev-card ev-quote"><p>${esc(q.text)}</p><footer><span>${q.page?'p. '+q.page:''}</span>${btn('evQuoteDelete','引用を削除','trash',q.id)}</footer></blockquote>`).join('')||empty('残しておきたい一節を追加')}${section('読書の履歴')}<div class="ev-card">${sessions.slice(0,20).map(s=>`<div class="ev-row"><span class="ev-grow"><strong>${esc(s.date)}</strong><small>${s.from} → ${s.to}ページ</small></span><strong>${s.minutes}分</strong></div>`).join('')||empty('記録なし')}</div><button class="ev-text-button" data-action="evReadingHome">本棚に戻る</button>`,btn('evBookExport','読書記録を書き出す','download'));}
  A.actions.evBookOpen=el=>{activeBook=el.dataset.id;bookDetail();};A.actions.evReadingHome=readingApp;
  A.actions.evBookRate=el=>{const x=read('reading').find(x=>x.id===activeBook);if(x)upsert('reading',{...x,rating:x.rating===Number(el.dataset.id)?0:Number(el.dataset.id)},bookDetail);};
  A.actions.evBookProgress=el=>{const x=read('reading').find(x=>x.id===el.dataset.id);if(x)A.form('読書の進捗',field('読んだページ','page',x.page,'number',`required min="0" max="${x.total}" step="1"`),v=>{const page=Number(v.page);return upsert('reading',{...x,page,finishedAt:page>=x.total?(x.finishedAt||dateKey()):null},readingApp);});};
  A.actions.evReadingSession=()=>{const x=read('reading').find(x=>x.id===activeBook);if(!x)return;A.form('読書を記録',field('読んだページ','page',x.page,'number',`required min="${x.page}" max="${x.total}" step="1"`)+field('読書時間（分）','minutes',15,'number','required min="1" max="1440" step="1"'),v=>{const to=Number(v.page),session={id:A.id(),bookId:x.id,date:dateKey(),from:x.page,to,minutes:Number(v.minutes)},books=read('reading'),at=books.findIndex(b=>b.id===x.id),next={...x,page:to,finishedAt:to>=x.total?(x.finishedAt||dateKey()):null};books[at]=next;if(!A.saveBatch({readingSessions:[session,...read('readingSessions')],reading:books}))return false;bookDetail();});};
  A.actions.evQuoteAdd=()=>A.form('引用を追加',area('引用','text')+field('ページ','page','','number','min="1" max="100000" step="1"'),v=>{if(!v.text.trim())return false;return upsert('readingQuotes',{id:A.id(),bookId:activeBook,text:v.text.trim(),page:v.page?Number(v.page):null},bookDetail);});
  A.actions.evQuoteDelete=el=>remove('readingQuotes',el.dataset.id,bookDetail);
  A.actions.evBookDelete=el=>A.confirm('本を削除？','読書の履歴と引用も削除します。',()=>{const id=el.dataset.id;if(A.saveBatch({reading:read('reading').filter(x=>x.id!==id),readingSessions:read('readingSessions').filter(x=>x.bookId!==id),readingQuotes:read('readingQuotes').filter(x=>x.bookId!==id)}))readingApp();});
  A.actions.evBookExport=()=>{const x=read('reading').find(x=>x.id===activeBook);if(!x)return;const sessions=bookSessions(x.id);exportText('読書記録.txt',[x.title,x.author,x.page+'/'+x.total+'ページ','★'.repeat(x.rating||0),'',x.note||'','','引用',...bookQuotes(x.id).map(q=>q.text+'\n'+(q.page?'p. '+q.page:'')),'','読書の履歴',...sessions.map(s=>s.date+' · '+s.from+' → '+s.to+'ページ · '+s.minutes+'分'),'合計 '+sessions.reduce((n,s)=>n+s.minutes,0)+'分'].join('\n'));};

  // Personal focus durations, a daily goal, and named session history.
  const focusPreferences = () => ({work:25,rest:5,goal:120,...A.load('focusPreferences',{})});
  const simpleFocusApp=focusApp;
  focusApp=function(){simpleFocusApp();const prefs=focusPreferences(),history=read('focusHistory'),sum=history.filter(x=>x.date===dateKey()).reduce((s,x)=>s+x.minutes,0);$('.app-nav .nav-action:last-child').insertAdjacentHTML('beforeend',btn('evFocusSettings','集中の設定','settings'));$('.ev-focus-ring').insertAdjacentHTML('beforebegin',`<button class="ev-focus-label" data-action="evFocusLabel">${esc(focus.label||'集中することを選ぶ')} ${A.icon('edit')}</button>`);$('.ev-controls').insertAdjacentHTML('afterend',`<div class="ev-daily-goal"><span>今日の目標</span><strong>${sum} / ${prefs.goal}分</strong>${progress(sum/prefs.goal*100,'集中の目標')}</div>`);$('.ev-focus').insertAdjacentHTML('beforeend',`${section('最近の集中')}<div class="ev-card">${history.slice(0,8).map(h=>`<div class="ev-row"><span class="ev-grow"><strong>${esc(h.label||'集中')}</strong><small>${esc(h.date)}</small></span><strong>${h.minutes}分</strong></div>`).join('')||empty('完了した集中がここに残ります')}</div>`);};
  A.apps.focus.render=focusApp;
  A.actions.evFocusSettings=()=>{const p=focusPreferences();A.form('集中の設定',field('集中（分）','work',p.work,'number','required min="1" max="180" step="1"')+field('休憩（分）','rest',p.rest,'number','required min="1" max="60" step="1"')+field('1日の目標（分）','goal',p.goal,'number','required min="1" max="1440" step="1"'),v=>{const next=Object.fromEntries(Object.entries(v).map(([k,value])=>[k,Number(value)]));if(!A.save('focusPreferences',next))return false;if(!focus.end&&!commitFocus({...focus,duration:next[focus.mode]*60,remaining:next[focus.mode]*60,id:null})){A.save('focusPreferences',p);return false;}focusApp();});};
  A.actions.evFocusMode=el=>{if(focus.end)return A.toast('先に一時停止してください');resetFocus({mode:el.dataset.id,duration:focusPreferences()[el.dataset.id]*60});};
  A.actions.evFocusLabel=()=>{const tasks=A.searchableReminders().filter(x=>!x.done);A.form('集中すること',field('内容','label',focus.label||'','text','maxlength="100"')+(tasks.length?`<div class="ev-task-options">${tasks.slice(0,8).map(t=>`<button type="button" data-action="evFocusChooseTask" data-id="${esc(t.id)}">${esc(t.text)}</button>`).join('')}</div>`:''),v=>{if(!commitFocus({...focus,label:v.label.trim()}))return false;focusApp();});};
  A.actions.evFocusChooseTask=el=>{const task=A.searchableReminders().find(x=>x.id===el.dataset.id);if(task)$('#ev-label').value=task.text;};

  // Sketch Studio: versioned vector documents, bounded history and local-only exports.
  // Keep `strokes` at the top level so existing documents and backups remain readable.
  const SK_SIZE=800, SK_MAX_STROKES=1000, SK_MAX_POINTS=100000;
  const skTools=[['pen','ペン'],['pencil','鉛筆'],['marker','マーカー'],['brush','筆'],['airbrush','エアブラシ'],['erase','消しゴム'],['line','直線'],['arrow','矢印'],['rect','四角'],['ellipse','円'],['triangle','三角'],['star','星'],['text','文字'],['picker','スポイト'],['select','選択・移動'],['pan','手のひら']];
  const skShapes=['line','arrow','rect','ellipse','triangle','star'];
  const skColors=['#514752','#ad6c82','#739686','#6f91b6','#d1a054','#ffffff','#282633','#e96c58','#8464b5','#38a8a0'];
  let drawing=null,stroke=null,skTool='pen',penColor='#514752',penWidth=4;
  let skOpacity=1,skFill=false,skSymmetry=false,skSnap=false,skPressure=false,skSmooth=false;
  let skZoom=1,skSelected=-1,skOffset=null,skUndo=[],skRedo=[],skFinish=null;
  let skQuery='',skSort='updated',skFavorites=false,skFocus=false,skRevision=0;
  let skPanel='',skAxis='vertical',skDash=false,skReference=null,skTrace=false,skReferenceOpacity=.35,skLastBrush='pen';
  let skAddSelect=false,skMarquee=null,skGuides=false,skPaletteId='atelier',skClipboard=[];
  const skSelection=new Set();
  const skToolMemory=new Map();
  const skDefaultWidths={pen:4,pencil:3,marker:24,brush:18,airbrush:60,erase:32};
  const skCustomPalettes=()=>read('sketchPalettes').filter(p=>p&&typeof p.id==='string'&&p.id.startsWith('custom-')&&typeof p.name==='string'&&Array.isArray(p.colors)).slice(0,8).map(p=>({id:p.id,name:p.name.slice(0,30),colors:[...new Set(p.colors.filter(c=>typeof c==='string'&&/^#[0-9a-f]{6}$/i.test(c)).map(c=>c.toLowerCase()))].slice(0,12)}));
  const skBlendModes=[['source-over','通常'],['multiply','乗算'],['screen','スクリーン'],['overlay','オーバーレイ']];
  const skFonts=[['sans-serif','ゴシック'],['serif','明朝'],['monospace','等幅']];
  const skPalettes={atelier:['#514752','#ad6c82','#739686','#6f91b6','#d1a054','#ffffff','#282633','#e96c58','#8464b5','#38a8a0'],earth:['#352f2a','#725b44','#a37757','#be9673','#d8b997','#eee0c9','#536552','#889579','#acb6a0','#fffdf8'],ocean:['#132c48','#275678','#427e99','#70afba','#a7d6d4','#e2f0e9','#766d97','#ad9cc3','#d5c9df','#ffffff']};
  const skRecent=()=>read('sketchRecentColors').filter(c=>typeof c==='string'&&/^#[0-9a-f]{6}$/i.test(c)).slice(0,8);
  const skPresets=()=>read('sketchBrushPresets').filter(p=>p&&typeof p.name==='string'&&['pen','pencil','marker','brush','airbrush','erase'].includes(p.tool)).slice(0,6).map(p=>({...p,name:p.name.slice(0,24)}));
  const skToolIcons={pen:'M4 20l4-1L20 7l-3-3L5 16Z M14 7l3 3',pencil:'M4 20l4-1L20 7l-3-3L5 16Z M6 15l3 3',marker:'M5 16l8-12 6 4-8 12Z M4 20h8',brush:'M9 15l9-12 3 3-10 10 M10 16c-5-3-6 3-6 5 5 0 8-1 6-5Z',airbrush:'M5 9h6v10H5Z M7 9V5h3 M15 6h1 M18 10h1 M15 14h1 M20 5h1',erase:'M4 14l9-10 8 7-9 10H9Z M8 10l8 7 M12 21h9',line:'M4 20L20 4',arrow:'M4 20L20 4 M10 4h10v10',rect:'M4 4h16v16H4Z',ellipse:'M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18',triangle:'M12 3l10 18H2Z',star:'M12 3l3 6 7 1-5 5 1 7-6-3-6 3 1-7-5-5 7-1Z',text:'M4 5h16 M12 5v15 M8 20h8',picker:'M4 20l3-6L18 3l3 3L10 17Z M12 6l6 6',select:'M5 3v17l5-5 4 7 3-2-4-6h7Z',pan:'M6 11V7a2 2 0 0 1 4 0v5-8a2 2 0 0 1 4 0v8-6a2 2 0 0 1 4 0v7-3a2 2 0 0 1 4 0v7c0 4-3 6-7 6h-2c-3 0-5-3-7-6l-2-3a2 2 0 0 1 3-2l3 3',layers:'M12 3L2 8l10 5 10-5Z M2 12l10 5 10-5 M2 16l10 5 10-5',color:'M12 3a9 9 0 1 0 0 18c3 0 0-4 3-4h3c5-3 3-14-6-14Z M7 8h.1 M12 6h.1 M17 9h.1 M6 13h.1',paper:'M5 2h10l5 5v15H5Z M15 2v6h5 M8 12h9 M8 16h9',reference:'M3 4h18v16H3Z M3 16l6-6 5 5 3-3 4 4 M16 8h.1'};
  const skIcon=id=>`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="${skToolIcons[id]||skToolIcons.pen}"/></svg>`;
  const skRenderCache=new WeakMap();
  const skMeasure=document.createElement('canvas').getContext('2d');
  const skDrafts=new Map();
  const skClone=value=>JSON.parse(JSON.stringify(value));
  const skNumber=(v,min,max,fallback)=>Number.isFinite(v)?Math.max(min,Math.min(max,v)):fallback;
  const skColor=v=>typeof v==='string'&&/^#[0-9a-f]{6}$/i.test(v)?v:'#514752';
  const skPaper=d=>d.tone==='dark'?'#282633':d.tone==='white'?'#ffffff':'#fffdf8';
  const skButton=(action,label,id='',extra='')=>`<button type="button" data-action="${action}" data-id="${esc(id)}" ${extra}>${label}</button>`;
  const skList=()=>{const list=read('sketches');for(const [id,doc] of skDrafts){const i=list.findIndex(x=>x.id===id);if(i<0)list.unshift(doc);else list[i]=doc;}return list;};
  function skNormalize(raw){
    if(!raw||typeof raw!=='object'||!Array.isArray(raw.strokes)||raw.strokes.length>SK_MAX_STROKES)throw Error('作品形式が不正です');
    const layers=(Array.isArray(raw.layers)&&raw.layers.length?raw.layers:[{id:'base',name:'レイヤー 1'}]);
    if(layers.length>8)throw Error('レイヤーは8枚までです');
    const ids=new Set();
    const doc={version:2,id:typeof raw.id==='string'?raw.id:A.id(),title:String(raw.title||'スケッチ').slice(0,80),updated:skNumber(raw.updated,0,1e15,Date.now()),favorite:!!raw.favorite,
      paper:['plain','grid','dots','ruled'].includes(raw.paper)?raw.paper:'plain',tone:['cream','white','dark'].includes(raw.tone)?raw.tone:'cream',
      layers:layers.map((l,i)=>{if(!l||typeof l.id!=='string'||ids.has(l.id))throw Error('レイヤー形式が不正です');ids.add(l.id);return {id:l.id,name:String(l.name||`レイヤー ${i+1}`).slice(0,40),visible:l.visible!==false,locked:!!l.locked,opacity:skNumber(l.opacity,0,1,1),blend:skBlendModes.some(([id])=>id===l.blend)?l.blend:'source-over'};})};
    doc.activeLayer=ids.has(raw.activeLayer)?raw.activeLayer:doc.layers[0].id;
    let points=0;
    doc.strokes=raw.strokes.map(s=>{
      if(!s||!Array.isArray(s.points)||!s.points.length||s.points.length>5000||(points+=s.points.length)>SK_MAX_POINTS)throw Error('描画データの上限を超えています');
      const tool=s.tool||'pen';if(!skTools.some(t=>t[0]===tool)||['select','picker','pan'].includes(tool))throw Error('未対応の描画ツールです');
      return {tool,color:skColor(s.color),width:skNumber(s.width,1,120,4),opacity:skNumber(s.opacity,0.01,1,1),layer:ids.has(s.layer)?s.layer:doc.layers[0].id,
        fill:!!s.fill,symmetry:!!s.symmetry,symmetryAxis:['vertical','horizontal','both'].includes(s.symmetryAxis)?s.symmetryAxis:'vertical',dash:!!s.dash,fontFamily:skFonts.some(([id])=>id===s.fontFamily)?s.fontFamily:'sans-serif',pressure:!!s.pressure,text:String(s.text||'').slice(0,200),fontSize:skNumber(s.fontSize,12,160,48),
        scale:skNumber(s.scale,.1,4,1),rotation:skNumber(s.rotation,-180,180,0),flipX:!!s.flipX,flipY:!!s.flipY,
        dx:skNumber(s.dx,-1600,1600,0),dy:skNumber(s.dy,-1600,1600,0),legacyErase:tool==='erase'&&(!s.layer||!!s.legacyErase),
        points:s.points.map(p=>{if(!Array.isArray(p)||p.length<2||!Number.isFinite(p[0])||!Number.isFinite(p[1])||Math.abs(p[0])>2400||Math.abs(p[1])>2400)throw Error('座標が不正です');return p.length>2?[p[0],p[1],skNumber(p[2],.05,1,.5)]:[p[0],p[1]];})};
    });
    return doc;
  }
  function skStatus(){
    const el=$('#ev-sketch-status');if(el)el.textContent=skDrafts.has(drawing?.id)?'未保存 — 再試行かJSON保存を':'保存済み · このブラウザ内';
    const retry=$('[data-action=evSketchRetry]');if(retry)retry.hidden=!skDrafts.has(drawing?.id);
    for(const [action,disabled] of [['evSketchUndo',!skUndo.length],['evSketchRedo',!skRedo.length]]){const b=$(`[data-action=${action}]`);if(b)b.disabled=disabled;}
    const count=$('#sk-layer-count');if(count&&drawing)count.textContent=drawing.layers.length+' / 8';
    const info=$('#sk-document-info');if(info&&drawing)info.textContent=`${drawing.strokes.length}要素 · ${skLayer()?.name||'レイヤー'}`;
    if(skPanel==='layers')skLayerThumbnails();
  }
  function sketchSave(){
    if(!drawing)return true;skRevision++;drawing.updated=Date.now();const ok=upsert('sketches',drawing);
    if(ok)skDrafts.delete(drawing.id);else skDrafts.set(drawing.id,skClone(drawing));skStatus();return ok;
  }
  // Snapshots are capped both by count and bytes; history is intentionally session-only.
  function skRemember(){skUndo.push(JSON.stringify(drawing));while(skUndo.length>30||skUndo.length>1&&skUndo.reduce((n,s)=>n+s.length,0)>3000000)skUndo.shift();skRedo=[];}
  function skChange(fn,rerender=false){if(!drawing)return;skFinish?.();skRemember();fn();skSelected=-1;skSelection.clear();skMarquee=null;skOffset=null;sketchSave();if(rerender)sketchEditor();else{paint();skSelectionBar();}}
  const skLayer=()=>drawing?.layers.find(l=>l.id===drawing.activeLayer);
  function skEditable(){const l=skLayer();if(!l||l.locked||!l.visible){A.toast('表示中でロックされていないレイヤーを選んでください');return false;}return true;}
  function skCapacity(count=1,points=1){if(drawing.strokes.length+count>SK_MAX_STROKES||drawing.strokes.reduce((n,s)=>n+s.points.length,0)+points>SK_MAX_POINTS){A.toast('描画の上限です。作品を複製して整理してください');return false;}return true;}
  function skBackground(ctx,d,transparent){
    ctx.clearRect(0,0,SK_SIZE,SK_SIZE);if(transparent)return;
    ctx.fillStyle=skPaper(d);ctx.fillRect(0,0,SK_SIZE,SK_SIZE);
    ctx.strokeStyle=d.tone==='dark'?'#ffffff20':'#645b6520';ctx.fillStyle=d.tone==='dark'?'#ffffff45':'#73677745';ctx.lineWidth=1;ctx.beginPath();
    for(let p=40;p<SK_SIZE;p+=40){if(['grid','ruled'].includes(d.paper)){ctx.moveTo(0,p);ctx.lineTo(SK_SIZE,p);}if(d.paper==='grid'){ctx.moveTo(p,0);ctx.lineTo(p,SK_SIZE);}if(d.paper==='dots')for(let y=40;y<SK_SIZE;y+=40){ctx.moveTo(p+1.8,y);ctx.arc(p,y,1.8,0,Math.PI*2);}}
    if(d.paper==='dots')ctx.fill();else ctx.stroke();
  }
  function skDrawStroke(ctx,s,d){
    ctx.save();ctx.translate(s.dx||0,s.dy||0);
    if(s.rotation||s.scale&&s.scale!==1||s.flipX||s.flipY){const b=skRawBounds(s),cx=b.x+b.w/2,cy=b.y+b.h/2;ctx.translate(cx,cy);ctx.rotate((s.rotation||0)*Math.PI/180);ctx.scale((s.scale||1)*(s.flipX?-1:1),(s.scale||1)*(s.flipY?-1:1));ctx.translate(-cx,-cy);}
    ctx.globalCompositeOperation=s.tool==='erase'&&!s.legacyErase?'destination-out':'source-over';
    ctx.globalAlpha=(s.opacity??1)*(s.tool==='marker'?.32:s.tool==='pencil'?.65:1);
    ctx.strokeStyle=ctx.fillStyle=s.legacyErase?skPaper(d):s.color;ctx.lineWidth=s.width;ctx.lineCap=ctx.lineJoin='round';
    if(s.dash&&skShapes.includes(s.tool))ctx.setLineDash([s.width*3,s.width*2]);
    const draw=()=>{
      const [x,y]=s.points[0],[ex,ey]=s.points.at(-1);ctx.beginPath();
      if(s.tool==='text'){ctx.font=`${s.fontSize||48}px ${s.fontFamily||'sans-serif'}`;ctx.textBaseline='top';s.text.split('\n').forEach((line,i)=>ctx.fillText(line,x,y+i*(s.fontSize||48)*1.2));return;}
      if(s.tool==='airbrush'){
        // Soft radial stamps are deterministic in previews, thumbnails and exports.
        const stamp=(px,py)=>{const r=Math.max(1,s.width/2),g=ctx.createRadialGradient(px,py,0,px,py,r);g.addColorStop(0,s.color+'38');g.addColorStop(1,s.color+'00');ctx.fillStyle=g;ctx.fillRect(px-r,py-r,r*2,r*2);};
        stamp(x,y);for(let i=1;i<s.points.length;i++){const a=s.points[i-1],b=s.points[i],n=Math.ceil(Math.hypot(b[0]-a[0],b[1]-a[1])/Math.max(2,s.width*.16));for(let j=1;j<=n;j++)stamp(a[0]+(b[0]-a[0])*j/n,a[1]+(b[1]-a[1])*j/n);}return;
      }
      if(s.tool==='brush'&&s.points.length>1){for(let i=1;i<s.points.length;i++){const a=s.points[i-1],b=s.points[i],weight=s.pressure?(b[2]??.5):Math.max(.18,1-Math.hypot(b[0]-a[0],b[1]-a[1])/65);ctx.beginPath();ctx.lineWidth=s.width*(.15+weight*.85);ctx.moveTo(a[0],a[1]);ctx.lineTo(b[0],b[1]);ctx.stroke();}return;}
      if(s.tool==='rect')ctx.rect(Math.min(x,ex),Math.min(y,ey),Math.abs(ex-x),Math.abs(ey-y));
      else if(s.tool==='ellipse')ctx.ellipse((x+ex)/2,(y+ey)/2,Math.abs(ex-x)/2,Math.abs(ey-y)/2,0,0,Math.PI*2);
      else if(s.tool==='triangle'){ctx.moveTo((x+ex)/2,y);ctx.lineTo(ex,ey);ctx.lineTo(x,ey);ctx.closePath();}
      else if(s.tool==='star'){const cx=(x+ex)/2,cy=(y+ey)/2,rx=Math.abs(ex-x)/2,ry=Math.abs(ey-y)/2;for(let i=0;i<10;i++){const a=i*Math.PI/5-Math.PI/2,r=i%2?.43:1;const px=cx+Math.cos(a)*rx*r,py=cy+Math.sin(a)*ry*r;i?ctx.lineTo(px,py):ctx.moveTo(px,py);}ctx.closePath();}
      else if(['line','arrow'].includes(s.tool)){ctx.moveTo(x,y);ctx.lineTo(ex,ey);if(s.tool==='arrow'){const a=Math.atan2(ey-y,ex-x),n=Math.max(18,s.width*3);ctx.moveTo(ex-n*Math.cos(a-.5),ey-n*Math.sin(a-.5));ctx.lineTo(ex,ey);ctx.lineTo(ex-n*Math.cos(a+.5),ey-n*Math.sin(a+.5));}}
      else if(s.pressure&&s.points.length>1){for(let i=1;i<s.points.length;i++){ctx.beginPath();ctx.lineWidth=s.width*(.2+.8*(s.points[i][2]??.5));ctx.moveTo(...s.points[i-1].slice(0,2));ctx.lineTo(...s.points[i].slice(0,2));ctx.stroke();}return;}
      else{s.points.forEach(([px,py],i)=>i?ctx.lineTo(px,py):ctx.moveTo(px,py));if(s.points.length===1){ctx.arc(x,y,s.width/2,0,Math.PI*2);ctx.fill();return;}}
      if(s.fill&&['rect','ellipse','triangle','star'].includes(s.tool))ctx.fill();ctx.stroke();
    };
    draw();if(s.symmetry){const axis=s.symmetryAxis||'vertical';for(const [fx,fy] of axis==='both'?[[-1,1],[1,-1],[-1,-1]]:axis==='horizontal'?[[1,-1]]:[[-1,1]]){ctx.save();ctx.translate(fx<0?SK_SIZE:0,fy<0?SK_SIZE:0);ctx.scale(fx,fy);draw();ctx.restore();}}ctx.restore();
  }
  function skRender(canvas,d,{transparent=false,preview=false}={}){
    const ctx=canvas.getContext('2d');ctx.save();ctx.scale(canvas.width/SK_SIZE,canvas.height/SK_SIZE);skBackground(ctx,d,transparent);
    let cache=preview?skRenderCache.get(canvas):null;
    if(!cache){const buffer=document.createElement('canvas');buffer.width=canvas.width;buffer.height=canvas.height;cache={buffer,layers:new Map()};if(preview)skRenderCache.set(canvas,cache);}
    if(cache.revision!==skRevision||cache.document!==d){cache.layers.clear();cache.revision=skRevision;cache.document=d;}
    const buffer=cache.buffer,layerCtx=buffer.getContext('2d');
    const reset=()=>{layerCtx.setTransform(1,0,0,1,0,0);layerCtx.clearRect(0,0,buffer.width,buffer.height);layerCtx.scale(buffer.width/SK_SIZE,buffer.height/SK_SIZE);};
    for(const layer of d.layers){
      if(!layer.visible)continue;
      const selected=preview?skSelectionIndices():[],moving=preview&&skOffset&&selected.some(i=>d.strokes[i]?.layer===layer.id);
      let base=preview?cache.layers.get(layer.id):null;
      if(!base||moving){
        reset();d.strokes.forEach((s,i)=>{if(s.layer===layer.id)skDrawStroke(layerCtx,moving&&selected.includes(i)?{...s,dx:(s.dx||0)+skOffset[0],dy:(s.dy||0)+skOffset[1]}:s,d);});
        if(preview&&!moving){base=document.createElement('canvas');base.width=canvas.width;base.height=canvas.height;base.getContext('2d').drawImage(buffer,0,0);cache.layers.set(layer.id,base);}
      }else{reset();layerCtx.drawImage(base,0,0,SK_SIZE,SK_SIZE);}
      if(preview&&stroke?.layer===layer.id)skDrawStroke(layerCtx,stroke,d);
      ctx.globalCompositeOperation=layer.blend||'source-over';ctx.globalAlpha=layer.opacity;ctx.drawImage(buffer,0,0,SK_SIZE,SK_SIZE);
    }ctx.restore();
  }
  function skRawBounds(s){
    const xs=s.points.map(p=>p[0]),ys=s.points.map(p=>p[1]);let x=Math.min(...xs),y=Math.min(...ys),w=Math.max(...xs)-x,h=Math.max(...ys)-y;
    if(s.tool==='text'){skMeasure.font=`${s.fontSize||48}px ${s.fontFamily||'sans-serif'}`;w=Math.max(...s.text.split('\n').map(t=>skMeasure.measureText(t).width));h=s.text.split('\n').length*(s.fontSize||48)*1.2;}
    if(s.symmetry){if(s.symmetryAxis!=='horizontal'){const right=Math.max(x+w,SK_SIZE-x);x=Math.min(x,SK_SIZE-x-w);w=right-x;}if(['horizontal','both'].includes(s.symmetryAxis)){const bottom=Math.max(y+h,SK_SIZE-y);y=Math.min(y,SK_SIZE-y-h);h=bottom-y;}}
    return {x,y,w,h};
  }
  function skBounds(s){
    const b=skRawBounds(s),cx=b.x+b.w/2,cy=b.y+b.h/2,angle=(s.rotation||0)*Math.PI/180,scale=s.scale||1;
    const pad=Math.max(8,s.tool==='arrow'?s.width*3:s.width/2),hw=(b.w/2+pad)*scale,hh=(b.h/2+pad)*scale;
    const w=Math.abs(Math.cos(angle))*hw+Math.abs(Math.sin(angle))*hh,h=Math.abs(Math.sin(angle))*hw+Math.abs(Math.cos(angle))*hh;
    return {x:cx+(s.dx||0)-w,y:cy+(s.dy||0)-h,w:w*2,h:h*2};
  }
  function skSelectionIndices(){return [...new Set([...skSelection,...(skSelected>=0?[skSelected]:[])])].filter(i=>drawing?.strokes[i]?.layer===drawing.activeLayer).sort((a,b)=>a-b);}
  function skGroupBounds(indices=skSelectionIndices()){
    const boxes=indices.map(i=>skBounds(drawing.strokes[i]));if(!boxes.length)return null;
    const x=Math.min(...boxes.map(b=>b.x)),y=Math.min(...boxes.map(b=>b.y));return {x,y,w:Math.max(...boxes.map(b=>b.x+b.w))-x,h:Math.max(...boxes.map(b=>b.y+b.h))-y};
  }
  function skRestoreSelection(objects){skSelection.clear();objects.forEach(obj=>{const i=drawing.strokes.indexOf(obj);if(i>=0)skSelection.add(i);});skSelected=[...skSelection].at(-1)??-1;skSelectionBar();paint();}
  function skClampMove(indices,dx,dy){
    for(const i of indices){const s=drawing.strokes[i];dx=Math.max(-1600-(s.dx||0),Math.min(1600-(s.dx||0),dx));dy=Math.max(-1600-(s.dy||0),Math.min(1600-(s.dy||0),dy));}return [dx,dy];
  }
  function skMoveSelected(dx,dy){const indices=skSelectionIndices();if(!indices.length||!skEditable())return;const objects=indices.map(i=>drawing.strokes[i]);[dx,dy]=skClampMove(indices,dx,dy);if(!dx&&!dy)return;skChange(()=>objects.forEach(s=>{s.dx=(s.dx||0)+dx;s.dy=(s.dy||0)+dy;}));skRestoreSelection(objects);}
  function paint(){
    const c=$('#ev-canvas');if(!c||!drawing)return;skRender(c,drawing,{preview:true});const ctx=c.getContext('2d');ctx.save();
    if(skGuides){ctx.strokeStyle='#728d8a80';ctx.lineWidth=1;ctx.setLineDash([8,8]);ctx.beginPath();for(const p of [SK_SIZE/3,SK_SIZE*2/3]){ctx.moveTo(p,0);ctx.lineTo(p,SK_SIZE);ctx.moveTo(0,p);ctx.lineTo(SK_SIZE,p);}ctx.stroke();}
    if(skSymmetry){ctx.strokeStyle='#a48a6155';ctx.lineWidth=1;ctx.setLineDash([5,8]);ctx.beginPath();if(skAxis!=='horizontal'){ctx.moveTo(400,0);ctx.lineTo(400,800);}if(skAxis!=='vertical'){ctx.moveTo(0,400);ctx.lineTo(800,400);}ctx.stroke();}
    const indices=skSelectionIndices(),box=skGroupBounds(indices);ctx.strokeStyle='#526f61';ctx.lineWidth=2;ctx.setLineDash([9,6]);
    if(box){if(indices.length>1){ctx.globalAlpha=.35;for(const i of indices){const b=skBounds(drawing.strokes[i]);ctx.strokeRect(b.x+(skOffset?.[0]||0),b.y+(skOffset?.[1]||0),b.w,b.h);}ctx.globalAlpha=1;}ctx.strokeRect(box.x+(skOffset?.[0]||0),box.y+(skOffset?.[1]||0),box.w,box.h);}
    if(skMarquee){const m=skMarquee,x=Math.min(m.from[0],m.to[0]),y=Math.min(m.from[1],m.to[1]),w=Math.abs(m.to[0]-m.from[0]),h=Math.abs(m.to[1]-m.from[1]);ctx.fillStyle='#526f6118';ctx.fillRect(x,y,w,h);ctx.strokeRect(x,y,w,h);}
    ctx.restore();
  }
  function skGallery(){
    skFinish?.();drawing=null;skSelected=-1;skSelection.clear();skMarquee=null;skReference=null;skTrace=false;
    page('sketch',`<div class="sk-hero"><span>SKETCHBOOK</span><h1>思いつくまま、描こう。</h1><p>一枚の紙から、次のアイデアへ。</p><button class="primary-button" data-action="evSketchNew">新しいスケッチ</button>${skButton('evSketchTemplate','用紙からはじめる')}</div>${A.search('sk-search','作品名を検索')}<div class="sk-gallery-tools">${skButton('evSketchFavorites','お気に入り','',`aria-pressed="${skFavorites}"`)}<select id="sk-sort" aria-label="作品の並べ替え"><option value="updated">更新順</option><option value="title">名前順</option><option value="oldest">古い順</option></select>${skButton('evSketchImport','JSON読込')}</div><div class="ev-sketch-grid" id="sk-gallery"></div><p class="ev-caption">ブラウザ内保存・バックアップはJSONで</p>`,btn('evSketchNew','スケッチを作成','plus'));
    const render=()=>{
      const list=skList().filter(d=>(!skFavorites||d.favorite)&&String(d.title).toLowerCase().includes(skQuery.toLowerCase())).sort((a,b)=>skSort==='title'?String(a.title).localeCompare(String(b.title),'ja'):skSort==='oldest'?a.updated-b.updated:b.updated-a.updated);
      $('#sk-gallery').innerHTML=list.map(d=>`<button class="ev-card ev-sketch-tile sk-tile" data-action="evSketchOpen" data-id="${esc(d.id)}"><canvas width="240" height="240" aria-hidden="true"></canvas><strong>${d.favorite?'★ ':''}${esc(d.title||'スケッチ')}</strong><small>${skDrafts.has(d.id)?'未保存 · ':''}${new Date(d.updated).toLocaleDateString('ja-JP')} · ${d.strokes?.length||0}要素</small></button>`).join('')||empty(skQuery||skFavorites?'該当する作品はありません':'作品なし');
      A.$$('#sk-gallery canvas').forEach((c,i)=>{try{skRender(c,skNormalize(list[i]));}catch{c.parentElement.querySelector('small').textContent='読込できない作品';}});
    };
    $('#sk-search').value=skQuery;$('#sk-search').oninput=e=>{skQuery=e.target.value;render();};$('#sk-sort').value=skSort;$('#sk-sort').onchange=e=>{skSort=e.target.value;render();};render();
  }
  A.apps.sketch.render=skGallery;
  function skSelectionBar(){
    const el=$('#sk-selection');if(!el)return;const indices=skSelectionIndices(),single=indices.length===1?drawing.strokes[indices[0]]:null;el.hidden=skTool!=='select'&&!indices.length;
    el.innerHTML=`<div class="sk-selection-head"><strong>${indices.length?indices.length+'個を選択':'選択・移動'}</strong>${skButton('evSketchSelectAdd','追加選択','',`aria-pressed="${skAddSelect}"`)}${skButton('evSketchSelectAll','すべて')}${skButton('evSketchSelectClear','解除')}</div>${indices.length?`<div class="sk-selection-actions">${skButton('evSketchObjectStyle',indices.length>1?'一括スタイル':'変形・色')}${skButton('evSketchArrange','整列・移動')}${skButton('evSketchObjectOrder','手前へ','front')}${skButton('evSketchObjectOrder','奥へ','back')}${skButton('evSketchObjectCopy','複製')}${skButton('evSketchClipboardCopy','コピー')}${skButton('evSketchObjectDelete','削除')}${skButton('evSketchSelectionExport','選択をPNG保存')}${single?.tool==='text'?skButton('evSketchTextEdit','文字編集'):''}</div>`:'<p>要素をタップ。空白からドラッグして範囲選択。</p>'}${skClipboard.length?skButton('evSketchClipboardPaste','貼り付け'):''}`;
  }
  function skLayerPanel(){
    const el=$('#sk-layers');if(!el)return;
    el.innerHTML=[...drawing.layers].reverse().map(l=>`<div class="sk-layer ${l.id===drawing.activeLayer?'active':''}">${skButton('evSketchLayerSelect',`<canvas width="64" height="64" aria-hidden="true"></canvas><span>${esc(l.name)}<small>${Math.round(l.opacity*100)}% · ${esc(skBlendModes.find(([id])=>id===(l.blend||'source-over'))?.[1]||'通常')}</small></span>`,l.id,`aria-pressed="${l.id===drawing.activeLayer}"`)}${skButton('evSketchLayerVisible',l.visible?'表示':'非表示',l.id,`aria-label="${esc(l.name)}の表示" aria-pressed="${l.visible}"`)}${skButton('evSketchLayerLock',l.locked?'固定':'自由',l.id,`aria-label="${esc(l.name)}のロック" aria-pressed="${l.locked}"`)}${btn('evSketchLayerEdit','レイヤー設定','settings',l.id)}</div>`).join('');skLayerThumbnails();
  }
  function skLayerThumbnails(){
    if(skPanel!=='layers'||!drawing)return;
    A.$$('#sk-layers canvas').forEach(c=>{const layer=drawing.layers.find(l=>l.id===c.closest('button').dataset.id);if(!layer)return;skRender(c,{...drawing,layers:[{...layer,visible:true,opacity:1,blend:'source-over'}]},{transparent:true});});
  }
  function sketchEditor(){
    A.cleanup();skFinish=null;if(!drawing)return;
    page('sketch',`<div class="sk-title-row">${skButton('evSketchHome','‹','', 'aria-label="作品一覧に戻る" title="作品一覧"')}<input class="ev-sketch-title" id="ev-sketch-title" aria-label="スケッチ名" maxlength="80" value="${esc(drawing.title)}">${skButton('evSketchFavorite',skIcon('star'),'',`aria-label="お気に入り" aria-pressed="${drawing.favorite}"`)}</div>
      <div class="sk-command-bar">${btn('evSketchUndo','元に戻す','previous')}${btn('evSketchRedo','やり直す','next')}<button class="sk-active-tool" id="sk-active-tool" data-action="evSketchPanel" data-id="brush" title="ブラシ設定"></button><button id="sk-current-color" data-action="evSketchPanel" data-id="color" aria-label="現在の色・パレットを開く"><i style="background:${penColor}"></i></button><select id="sk-zoom" aria-label="表示倍率">${[1,1.5,2,3,4].map(n=>`<option value="${n}" ${n===skZoom?'selected':''}>${n*100}%</option>`).join('')}</select>${skButton('evSketchFit','全体')}${skButton('evSketchFocus','集中','',`aria-label="集中表示" aria-pressed="${skFocus}"`)}</div>
      <div class="sk-viewport" id="sk-viewport"><div id="sk-canvas-size" style="width:${skZoom*100}%"><canvas id="ev-canvas" width="800" height="800" aria-label="スケッチ用キャンバス" tabindex="0"></canvas><img id="sk-trace-image" alt="参照画像（保存・書き出しには含まれません）" hidden></div></div>
      <div class="sk-quick-tools" role="toolbar" aria-label="よく使う道具">${[['pen','ペン'],['erase','消しゴム'],['select','選択'],['rect','図形'],['text','文字'],['picker','スポイト'],['pan','移動']].map(([id,label])=>skButton('evSketchQuick',skIcon(id)+`<span>${label}</span>`,id,`aria-label="${label}" title="${label}" aria-pressed="${skTool===id}"`)).join('')}</div>
      <div class="ev-sketch-footer"><span id="ev-sketch-status" role="status"></span>${skButton('evSketchRetry','再試行')}<span id="sk-document-info"></span></div>
      <div class="sk-selection" id="sk-selection"></div><div class="sk-panel-tabs" role="toolbar" aria-label="制作パネル">${[['brush','ブラシ'],['color','色'],['layers','レイヤー'],['paper','用紙'],['reference','参照']].map(([id,label])=>skButton('evSketchPanel',skIcon(id)+`<span>${label}</span>`,id,`id="sk-tab-${id}" aria-controls="sk-panel-${id}" aria-expanded="${skPanel===id}"`)).join('')}</div>
      <section class="sk-inspector" id="sk-panel-brush" aria-labelledby="sk-tab-brush" ${skPanel==='brush'?'':'hidden'}><div class="sk-panel-heading"><h2>道具とブラシ</h2>${skButton('evSketchPanelClose','閉じる')}</div><div class="sk-toolbar" role="toolbar" aria-label="描画ツール">${skTools.map(([id,label])=>skButton('evSketchTool',skIcon(id)+`<span>${label}</span>`,id,`aria-pressed="${skTool===id}"`)).join('')}</div>
      <canvas id="sk-brush-preview" width="600" height="100" aria-label="現在のブラシの試し描き"></canvas><div class="sk-settings"><label>太さ <output id="sk-width-value">${penWidth}</output><input id="ev-pen-width" aria-label="ペンの太さ" type="range" min="1" max="120" value="${penWidth}"></label><label>不透明度 <output id="sk-opacity-value">${Math.round(skOpacity*100)}%</output><input id="sk-opacity" aria-label="不透明度" type="range" min="1" max="100" value="${skOpacity*100}"></label></div><div id="sk-presets" class="sk-preset-list"></div>${skButton('evSketchPresetSave','このブラシを保存')}
      <details class="sk-options"><summary>描画アシスト</summary><div class="sk-checks">${[['fill','図形の塗りつぶし',skFill],['symmetry','対称描画',skSymmetry],['snap','20pxに吸着',skSnap],['pressure','筆圧を使う',skPressure],['smooth','手ぶれ補正',skSmooth],['dash','図形を破線に',skDash]].map(([id,label,value])=>`<label><input id="sk-${id}" type="checkbox" ${value?'checked':''}>${label}</label>`).join('')}</div><label class="sk-inline-label">対称軸 <select id="sk-axis">${[['vertical','左右'],['horizontal','上下'],['both','四方向']].map(([id,label])=>`<option value="${id}" ${skAxis===id?'selected':''}>${label}</option>`).join('')}</select></label><p class="ev-caption">Shift＋ドラッグで正方形・正円・45°の直線</p></details></section>
      <section class="sk-inspector" id="sk-panel-color" aria-labelledby="sk-tab-color" ${skPanel==='color'?'':'hidden'}><div class="sk-panel-heading"><h2>カラーパレット</h2>${skButton('evSketchPanelClose','閉じる')}</div><label class="sk-inline-label">配色 <select id="sk-palette-select"><option value="atelier">アトリエ</option><option value="earth">アース</option><option value="ocean">オーシャン</option></select></label><div class="ev-drawing-tools sk-palette" id="sk-color-swatches"></div><div class="sk-color-custom"><input type="color" id="ev-pen-custom" aria-label="色を選択" value="${penColor}"><strong id="sk-color-code">${penColor.toUpperCase()}</strong><span>カスタムカラー</span></div><h3>最近使った色</h3><div id="sk-recent-colors" class="sk-palette ev-drawing-tools"></div><div class="sk-layer-actions">${skButton('evSketchPaletteSave','最近の色を配色に保存')}${skButton('evSketchPaletteFromArtwork','作品の色を抽出')}${skButton('evSketchPaletteEdit','配色を編集')}${skButton('evSketchPaletteDelete','配色を削除')}</div><p class="sk-hint">カスタム配色は8組・各12色まで。</p></section>
      <section class="sk-inspector" id="sk-panel-layers" aria-labelledby="sk-tab-layers" ${skPanel==='layers'?'':'hidden'}><div class="sk-panel-heading"><h2>レイヤー <span id="sk-layer-count">${drawing.layers.length} / 8</span></h2>${skButton('evSketchPanelClose','閉じる')}</div><div id="sk-layers"></div><div class="sk-layer-actions">${skButton('evSketchLayerAdd','追加')}${skButton('evSketchLayerCopy','複製')}${skButton('evSketchLayerUp','手前へ')}${skButton('evSketchLayerDown','奥へ')}${skButton('evSketchLayerSolo','この層だけ表示')}${skButton('evSketchLayersShow','すべて表示')}${skButton('evSketchLayerClear','内容消去')}${skButton('evSketchLayerDelete','削除')}</div><p class="ev-caption">上が手前。消しゴムは選択レイヤーだけに適用。</p></section>
      <section class="sk-inspector" id="sk-panel-paper" aria-labelledby="sk-tab-paper" ${skPanel==='paper'?'':'hidden'}><div class="sk-panel-heading"><h2>用紙と表示</h2>${skButton('evSketchPanelClose','閉じる')}</div><div class="sk-paper-choices">${[['plain','無地'],['grid','方眼'],['dots','ドット'],['ruled','罫線']].map(([id,label])=>skButton('evSketchPaperQuick',`<i class="sk-paper-sample ${id}"></i><span>${label}</span>`,id,`aria-pressed="${drawing.paper===id}"`)).join('')}</div><div class="sk-layer-actions">${skButton('evSketchPaper','用紙の色・模様')}${skButton('evSketchFit','表示をリセット')}${skButton('evSketchTimeline','編集履歴')}${skButton('evSketchHelp','使い方')}</div><label class="sk-inline-label"><span>三分割ガイド（保存には含めない）</span><input id="sk-guides" type="checkbox" ${skGuides?'checked':''}></label><p class="ev-caption">800 × 800 px · 最大 2400 px で書き出し</p></section>
      <section class="sk-inspector" id="sk-panel-reference" aria-labelledby="sk-tab-reference" ${skPanel==='reference'?'':'hidden'}><div class="sk-panel-heading"><h2>参照画像</h2>${skButton('evSketchPanelClose','閉じる')}</div><p class="sk-hint">見本や下絵に。画像はこの編集画面だけで表示し、作品の保存・書き出しには含みません。</p><input id="sk-reference-file" type="file" accept="image/png,image/jpeg,image/webp" aria-label="参照画像を選択"><p id="sk-reference-status" role="status"></p><img id="sk-reference-preview" alt="描画の参照画像" hidden><div class="sk-reference-options"><label><input id="sk-trace" type="checkbox" ${skTrace?'checked':''}>下絵として重ねる</label><label>濃さ<input id="sk-reference-opacity" type="range" min="5" max="90" value="${skReferenceOpacity*100}"></label>${skButton('evSketchReferenceRemove','参照を外す')}</div></section>
      `,btn('evSketchMenu','スケッチのメニュー','share'));
    $('#ev-sketch-title').oninput=e=>{drawing.title=e.target.value;sketchSave();};
    $('#ev-pen-width').oninput=e=>{penWidth=Number(e.target.value);$('#sk-width-value').textContent=penWidth;skToolStatus();};
    $('#sk-opacity').oninput=e=>{skOpacity=Number(e.target.value)/100;$('#sk-opacity-value').textContent=e.target.value+'%';skBrushPreview();};
    $('#ev-pen-custom').oninput=e=>skSetColor(e.target.value);
    $('#sk-fill').onchange=e=>skFill=e.target.checked;$('#sk-symmetry').onchange=e=>{skSymmetry=e.target.checked;paint();};$('#sk-snap').onchange=e=>skSnap=e.target.checked;$('#sk-pressure').onchange=e=>skPressure=e.target.checked;$('#sk-smooth').onchange=e=>skSmooth=e.target.checked;
    $('#sk-zoom').onchange=e=>{skFinish?.();const viewport=$('#sk-viewport'),old=skZoom,cx=(viewport.scrollLeft+viewport.clientWidth/2)/old,cy=(viewport.scrollTop+viewport.clientHeight/2)/old;skZoom=Number(e.target.value);$('#sk-canvas-size').style.width=skZoom*100+'%';viewport.scrollLeft=cx*skZoom-viewport.clientWidth/2;viewport.scrollTop=cy*skZoom-viewport.clientHeight/2;};
    $('.ev-sketch').classList.toggle('sk-focused',skFocus);$('#ev-canvas').dataset.tool=skTool;
    $('#sk-dash').onchange=e=>skDash=e.target.checked;$('#sk-axis').onchange=e=>{skAxis=e.target.value;paint();};$('#sk-guides').onchange=e=>{skGuides=e.target.checked;paint();};
    $('#sk-palette-select').onchange=e=>{skPaletteId=e.target.value;skPaletteRender();};
    $('#sk-reference-file').onchange=skLoadReference;$('#sk-trace').onchange=e=>{skTrace=e.target.checked;skReferenceRender();};$('#sk-reference-opacity').oninput=e=>{skReferenceOpacity=Number(e.target.value)/100;skReferenceRender();};
    skPaletteRender();skPresetRender();skReferenceRender();skToolStatus();skLayerPanel();skSelectionBar();skStatus();paint();skBindCanvas();
  }
  function skSetColor(color){penColor=skColor(color).toLowerCase();const current=$('#sk-current-color i');if(current)current.style.background=penColor;const code=$('#sk-color-code');if(code)code.textContent=penColor.toUpperCase();skBrushPreview();const custom=$('#ev-pen-custom');if(custom)custom.value=penColor;A.$$('.ev-swatch').forEach(b=>{b.classList.toggle('selected',b.dataset.id===penColor);b.setAttribute('aria-pressed',String(b.dataset.id===penColor));});}
  function skBindCanvas(){
    const canvas=$('#ev-canvas');let pointer=null,frame=0,start=null,pan=null,limit=5000;
    const point=e=>{const r=canvas.getBoundingClientRect();let x=Math.max(0,Math.min(SK_SIZE,(e.clientX-r.left)*SK_SIZE/r.width)),y=Math.max(0,Math.min(SK_SIZE,(e.clientY-r.top)*SK_SIZE/r.height));if(skSnap){x=Math.round(x/20)*20;y=Math.round(y/20)*20;}return skPressure&&e.pointerType==='pen'?[x,y,e.pressure||.5]:[x,y];};
    const queue=()=>{if(!frame)frame=requestAnimationFrame(()=>{frame=0;if(canvas.isConnected)paint();});};
    const append=e=>{let next=point(e),last=stroke.points.at(-1);if(next[0]===last[0]&&next[1]===last[1])return;if(skShapes.includes(stroke.tool)){if(e.shiftKey){const [x,y]=stroke.points[0],dx=next[0]-x,dy=next[1]-y;if(['line','arrow'].includes(stroke.tool)){const angle=Math.round(Math.atan2(dy,dx)/(Math.PI/4))*Math.PI/4,r=Math.hypot(dx,dy);next=[x+Math.cos(angle)*r,y+Math.sin(angle)*r];}else{const size=Math.max(Math.abs(dx),Math.abs(dy));next=[x+(dx<0?-size:size),y+(dy<0?-size:size)];}}stroke.points=[stroke.points[0],next];}else if(stroke.points.length<limit){if(skSmooth&&!skSnap&&e.type!=='pointerup')next=[last[0]+(next[0]-last[0])*.55,last[1]+(next[1]-last[1])*.55,...next.slice(2)];stroke.points.push(next);}};
    const finish=e=>{
      if(e&&e.pointerId!==pointer)return;if(frame){cancelAnimationFrame(frame);frame=0;}
      if(stroke&&drawing){if(e?.type==='pointerup')append(e);skRemember();drawing.strokes.push(stroke);if(stroke.tool!=='erase')skRememberColor(stroke.color);stroke=null;sketchSave();}
      if(e?.type==='pointerup'&&skTool==='select'&&start&&skSelectionIndices().length&&!skMarquee){const p=point(e);skOffset=skClampMove(skSelectionIndices(),p[0]-start[0],p[1]-start[1]);}
      if(skMarquee&&drawing){const m=skMarquee;if(e?.type==='pointerup')m.to=point(e);if(e?.type!=='pointercancel'){const left=Math.min(m.from[0],m.to[0]),top=Math.min(m.from[1],m.to[1]),right=Math.max(m.from[0],m.to[0]),bottom=Math.max(m.from[1],m.to[1]);if(!m.add)skSelection.clear();drawing.strokes.forEach((s,i)=>{if(s.layer!==drawing.activeLayer)return;const b=skBounds(s);if(b.x>=left&&b.y>=top&&b.x+b.w<=right&&b.y+b.h<=bottom)skSelection.add(i);});skSelected=[...skSelection].at(-1)??-1;}skMarquee=null;}
      if(skOffset&&drawing&&(skOffset[0]||skOffset[1])){skRemember();for(const i of skSelectionIndices()){const s=drawing.strokes[i];s.dx=(s.dx||0)+skOffset[0];s.dy=(s.dy||0)+skOffset[1];}sketchSave();}
      skOffset=null;pan=null;start=null;const id=pointer;pointer=null;if(id!==null&&canvas.hasPointerCapture(id))canvas.releasePointerCapture(id);if(canvas.isConnected){paint();skSelectionBar();}
    };
    skFinish=finish;A.cleanups.push(()=>{finish();skFinish=null;});
    canvas.onpointerdown=e=>{
      if(pointer!==null||e.button!==0||!$('#overlay').hidden)return;e.preventDefault();canvas.focus({preventScroll:true});const p=point(e);
      if(skTool==='pan'){const v=$('#sk-viewport');pan={x:e.clientX,y:e.clientY,left:v.scrollLeft,top:v.scrollTop};pointer=e.pointerId;canvas.setPointerCapture(pointer);return;}
      if(skTool==='picker'){const c=document.createElement('canvas');c.width=c.height=SK_SIZE;skRender(c,drawing);const rgb=c.getContext('2d').getImageData(Math.min(799,Math.floor(p[0])),Math.min(799,Math.floor(p[1])),1,1).data;skSetColor('#'+[...rgb].slice(0,3).map(v=>v.toString(16).padStart(2,'0')).join(''));A.toast('色を取得しました');return;}
      if(!skEditable())return;
      if(skTool==='text'){skTextForm(p);return;}
      if(skTool==='select'){
        let hit=-1;for(let i=drawing.strokes.length-1;i>=0;i--){const s=drawing.strokes[i];if(s.layer!==drawing.activeLayer)continue;const b=skBounds(s);if(p[0]>=b.x&&p[0]<=b.x+b.w&&p[1]>=b.y&&p[1]<=b.y+b.h){hit=i;break;}}
        const additive=e.shiftKey||skAddSelect;start=p;
        if(hit<0){if(!additive){skSelected=-1;skSelection.clear();}skMarquee={from:p,to:p,add:additive};}
        else if(additive){const selected=skSelectionIndices();skSelection.clear();selected.forEach(i=>skSelection.add(i));if(skSelection.has(hit))skSelection.delete(hit);else skSelection.add(hit);skSelected=[...skSelection].at(-1)??-1;paint();skSelectionBar();return;}
        else{if(!skSelectionIndices().includes(hit))skSelection.clear();skSelection.add(hit);skSelected=hit;}
        paint();skSelectionBar();
      }else{if(!skCapacity())return;limit=Math.min(5000,SK_MAX_POINTS-drawing.strokes.reduce((n,s)=>n+s.points.length,0));if(skShapes.includes(skTool)&&limit<2)return;skSelected=-1;skSelection.clear();skMarquee=null;stroke={tool:skTool,color:penColor,width:penWidth,opacity:skOpacity,fill:skFill,symmetry:skSymmetry,symmetryAxis:skAxis,dash:skDash,pressure:skPressure&&e.pointerType==='pen',layer:drawing.activeLayer,points:[p]};}
      pointer=e.pointerId;canvas.setPointerCapture(pointer);queue();
    };
    canvas.onpointermove=e=>{if(e.pointerId!==pointer)return;if(pan){const v=$('#sk-viewport');v.scrollLeft=pan.left+pan.x-e.clientX;v.scrollTop=pan.top+pan.y-e.clientY;return;}if(stroke){const events=e.getCoalescedEvents?.();for(const sample of events?.length?events:[e])append(sample);}else if(skMarquee){skMarquee.to=point(e);}else if(skSelectionIndices().length){const p=point(e);skOffset=skClampMove(skSelectionIndices(),p[0]-start[0],p[1]-start[1]);}queue();};
    canvas.onpointerup=finish;canvas.onpointercancel=finish;canvas.onlostpointercapture=finish;
    const flush=()=>{finish();};
    const hidden=()=>{if(document.hidden)finish();};window.addEventListener('pagehide',flush);document.addEventListener('visibilitychange',hidden);
    A.cleanups.push(()=>{window.removeEventListener('pagehide',flush);document.removeEventListener('visibilitychange',hidden);});
  }
  // Keep the unload warning active even after leaving the editor with a failed save.
  window.addEventListener('beforeunload',e=>{skFinish?.();if(skDrafts.size){e.preventDefault();e.returnValue='';}});
  function skTextForm(point,index=-1){
    const old=drawing.strokes[index];A.form(old?'文字を編集':'文字を配置',area('文字（200字まで）','text',old?.text||'')+field('文字サイズ','fontSize',old?.fontSize||48,'number','required min="12" max="160" step="1"')+select('書体','fontFamily',skFonts,old?.fontFamily||'sans-serif'),v=>{
      if(!v.text.trim()||v.text.length>200){A.toast('文字は1〜200字で入力してください');return false;}if(!skEditable()||(!old&&!skCapacity()))return false;
      skChange(()=>{if(old){drawing.strokes[index]={...old,text:v.text,fontSize:Number(v.fontSize),fontFamily:v.fontFamily};}else drawing.strokes.push({tool:'text',layer:drawing.activeLayer,color:penColor,width:penWidth,opacity:skOpacity,points:[point],text:v.text,fontSize:Number(v.fontSize),fontFamily:v.fontFamily});});
    });$('#ev-text').maxLength=200;
  }
  A.actions.evSketchNew=()=>{A.cleanup();skReference=null;skTrace=false;skPanel='';skFocus=false;drawing=skNormalize({id:A.id(),title:'スケッチ',strokes:[],updated:Date.now()});skUndo=[];skRedo=[];skZoom=1;skSelected=-1;skSelection.clear();skMarquee=null;sketchSave();sketchEditor();};
  A.actions.evSketchOpen=el=>{A.cleanup();skReference=null;skTrace=false;skPanel='';skFocus=false;try{const raw=skList().find(d=>d.id===el.dataset.id);if(!raw)return;drawing=skNormalize(raw);skUndo=[];skRedo=[];skZoom=1;skSelected=-1;skSelection.clear();skMarquee=null;sketchEditor();}catch(e){A.toast(e.message);}};
  A.actions.evSketchHome=()=>{A.cleanup();skGallery();};
  A.actions.evSketchRetry=()=>sketchSave();
  A.actions.evSketchFavorites=()=>{skFavorites=!skFavorites;skGallery();};
  A.actions.evSketchFavorite=()=>skChange(()=>drawing.favorite=!drawing.favorite,true);
  A.actions.evPenColor=el=>skSetColor(el.dataset.id);
  A.actions.evSketchTool=el=>{
    const next=el.dataset.id;if(!skTools.some(t=>t[0]===next))return;skFinish?.();
    if(!['select','picker','pan'].includes(skTool))skToolMemory.set(skTool,{width:penWidth,opacity:skOpacity});
    if(next!==skTool&&!['select','picker','pan'].includes(next)){const setting=skToolMemory.get(next);penWidth=setting?.width||skDefaultWidths[next]||4;skOpacity=setting?.opacity??1;}
    skTool=next;if(['pen','pencil','marker','brush','airbrush'].includes(skTool))skLastBrush=skTool;skSelected=-1;skSelection.clear();skMarquee=null;$('#ev-canvas').dataset.tool=skTool;
    $('#ev-pen-width').value=penWidth;$('#sk-width-value').textContent=penWidth;$('#sk-opacity').value=Math.round(skOpacity*100);$('#sk-opacity-value').textContent=Math.round(skOpacity*100)+'%';
    skToolStatus();skSelectionBar();paint();
  };
  function skToolStatus(){
    A.$$('[data-action=evSketchTool]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.id===skTool)));
    const label=skTools.find(t=>t[0]===skTool)?.[1]||'ペン';const el=$('#sk-active-tool');if(el)el.textContent=label+' · '+penWidth;
    A.$$('[data-action=evSketchQuick]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.id===skTool||b.dataset.id==='rect'&&skShapes.includes(skTool)||b.dataset.id==='pen'&&['pencil','marker','brush','airbrush'].includes(skTool))));skBrushPreview();
  }
  function skBrushPreview(){const c=$('#sk-brush-preview');if(!c)return;const ctx=c.getContext('2d');ctx.clearRect(0,0,c.width,c.height);const points=Array.from({length:70},(_,i)=>[30+i*7.8,50+Math.sin(i/11)*17,.3+Math.sin(i/69*Math.PI)*.7]);skDrawStroke(ctx,{tool:['pen','pencil','marker','brush','airbrush'].includes(skTool)?skTool:'pen',color:penColor,width:penWidth,opacity:skOpacity,pressure:skPressure,points},drawing);}
  function skPanelShow(id){skFinish?.();skPanel=id;for(const name of ['brush','color','layers','paper','reference']){const el=$('#sk-panel-'+name);if(el)el.hidden=id!==name;$('#sk-tab-'+name)?.setAttribute('aria-expanded',String(id===name));}if(id&&skFocus)A.actions.evSketchFocus();if(id==='layers')skLayerThumbnails();}
  A.actions.evSketchPanel=el=>skPanelShow(skPanel===el.dataset.id?'':el.dataset.id);
  A.actions.evSketchPanelClose=()=>{const id=skPanel;skPanelShow('');$('#sk-tab-'+id)?.focus({preventScroll:true});};
  A.actions.evSketchQuick=el=>{const id=el.dataset.id;A.actions.evSketchTool({dataset:{id:id==='pen'?skLastBrush:id}});if(id==='rect')skPanelShow('brush');};
  A.actions.evSketchFit=()=>{skFinish?.();skZoom=1;$('#sk-zoom').value='1';$('#sk-canvas-size').style.width='100%';$('#sk-viewport').scrollTo(0,0);};
  function skPaletteRender(){
    const custom=skCustomPalettes(),picker=$('#sk-palette-select');if(!picker)return;
    const options=[['atelier','アトリエ'],['earth','アース'],['ocean','オーシャン'],...custom.map(p=>[p.id,p.name])];if(!options.some(([id])=>id===skPaletteId))skPaletteId='atelier';
    picker.innerHTML=options.map(([id,name])=>`<option value="${esc(id)}" ${id===skPaletteId?'selected':''}>${esc(name)}</option>`).join('');
    const render=colors=>colors.map(c=>skButton('evPenColor','',c,`class="ev-swatch" style="--swatch:${c}" aria-label="色 ${c}" aria-pressed="${penColor===c}"`)).join('');
    $('#sk-color-swatches').innerHTML=render(custom.find(p=>p.id===skPaletteId)?.colors||skPalettes[skPaletteId]||skColors);
    $('#sk-recent-colors').innerHTML=render(skRecent())||'<span class="sk-hint">描くと、ここに色が残ります。</span>';
    const editable=custom.some(p=>p.id===skPaletteId);for(const action of ['evSketchPaletteEdit','evSketchPaletteDelete'])$(`[data-action=${action}]`).disabled=!editable;skSetColor(penColor);
  }
  A.actions.evSketchPaletteSave=()=>{const palettes=skCustomPalettes();if(palettes.length>=8)return A.toast('配色は8組までです');A.form('配色を保存',field('名前','name','マイパレット','text','required maxlength="30"')+area('HEXカラー（空白・カンマ区切り、12色まで）','colors',[penColor,...skRecent().filter(c=>c!==penColor)].join(' ')),v=>skStorePalette(v));};
  A.actions.evSketchPaletteFromArtwork=()=>{const counts=new Map();for(const s of drawing.strokes){if(s.tool==='erase')continue;const color=skColor(s.color).toLowerCase();counts.set(color,(counts.get(color)||0)+1);}const colors=[...counts].sort((a,b)=>b[1]-a[1]).slice(0,12).map(([color])=>color);if(!colors.length)return A.toast('色のある描画を追加してください');if(skCustomPalettes().length>=8)return A.toast('配色は8組までです');A.form('作品の色を保存',field('名前','name',(drawing.title+' の配色').slice(0,30),'text','required maxlength="30"')+area('使用頻度順の描画色（合成前・12色まで）','colors',colors.join(' ')),v=>skStorePalette(v));};
  function skStorePalette(v,id){const colors=[...new Set(v.colors.split(/[\s,]+/).filter(Boolean).map(c=>c.toLowerCase()))];if(!v.name.trim()||!colors.length||colors.length>12||colors.some(c=>!/^#[0-9a-f]{6}$/.test(c))){A.toast('名前と1〜12個の #RRGGBB を入力してください');return false;}const list=skCustomPalettes(),index=list.findIndex(p=>p.id===id),palette={id:id||'custom-'+A.id(),name:v.name.trim().slice(0,30),colors};if(index<0){if(list.length>=8)return false;list.push(palette);}else list[index]=palette;if(!A.save('sketchPalettes',list))return false;skPaletteId=palette.id;skPaletteRender();}
  A.actions.evSketchPaletteEdit=()=>{const palette=skCustomPalettes().find(p=>p.id===skPaletteId);if(palette)A.form('配色を編集',field('名前','name',palette.name,'text','required maxlength="30"')+area('HEXカラー（12色まで）','colors',palette.colors.join(' ')),v=>skStorePalette(v,palette.id));};
  A.actions.evSketchPaletteDelete=()=>{const id=skPaletteId;if(!skCustomPalettes().some(p=>p.id===id))return;A.confirm('この配色を削除？','作品に使われている色は変わりません。',()=>{if(A.save('sketchPalettes',skCustomPalettes().filter(p=>p.id!==id))){skPaletteId='atelier';skPaletteRender();}});};
  function skRememberColor(c){const colors=[c,...skRecent().filter(x=>x!==c)].slice(0,8);if(A.save('sketchRecentColors',colors))skPaletteRender();}
  function skPresetRender(){const el=$('#sk-presets');if(el)el.innerHTML=skPresets().map((p,i)=>`<div>${skButton('evSketchPresetApply',esc(p.name),String(i))}${skButton('evSketchPresetDelete','×',String(i),`aria-label="${esc(p.name)}を削除"`)}</div>`).join('');}
  A.actions.evSketchPresetSave=()=>{if(!['pen','pencil','marker','brush','airbrush','erase'].includes(skTool))return A.toast('ブラシを選択してください');if(skPresets().length>=6)return A.toast('保存は6件まで。不要な設定を削除してください');A.form('ブラシを保存',field('名前','name',skTools.find(t=>t[0]===skTool)[1],'text','required maxlength="24"'),v=>{if(!v.name.trim())return false;const presets=[...skPresets(),{name:v.name.trim(),tool:skTool,width:penWidth,opacity:skOpacity,color:penColor,pressure:skPressure,smooth:skSmooth}];if(!A.save('sketchBrushPresets',presets))return false;skPresetRender();});};
  A.actions.evSketchPresetApply=el=>{const p=skPresets()[Number(el.dataset.id)];if(!p)return;skFinish?.();penWidth=skNumber(p.width,1,120,4);skOpacity=skNumber(p.opacity,.01,1,1);skPressure=!!p.pressure;skSmooth=!!p.smooth;skTool=p.tool;if(skTool!=='erase')skLastBrush=skTool;penColor=skColor(p.color);skPanel='brush';sketchEditor();};
  A.actions.evSketchPresetDelete=el=>{const presets=skPresets();presets.splice(Number(el.dataset.id),1);if(A.save('sketchBrushPresets',presets))skPresetRender();};
  A.actions.evSketchPaperQuick=el=>{if(!['plain','grid','dots','ruled'].includes(el.dataset.id))return;skChange(()=>drawing.paper=el.dataset.id);A.$$('[data-action=evSketchPaperQuick]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.id===drawing.paper)));};
  A.actions.evSketchTemplate=()=>A.form('新しい用紙',field('作品名','title','スケッチ','text','required maxlength="80"')+select('テンプレート','template',[['plain','白紙 / アイデア'],['grid','方眼 / 設計'],['dots','ドット / レタリング'],['ruled','罫線 / 手書きノート']],'plain')+select('用紙色','tone',[['cream','クリーム'],['white','白'],['dark','ダーク']],'cream'),v=>{if(!v.title.trim())return false;A.cleanup();skReference=null;skTrace=false;skPanel='';skFocus=false;drawing=skNormalize({id:A.id(),title:v.title,paper:v.template,tone:v.tone,strokes:[]});skUndo=[];skRedo=[];skZoom=1;skSelected=-1;skSelection.clear();skMarquee=null;sketchSave();sketchEditor();});
  A.actions.evSketchArrange=()=>{
    skFinish?.();const indices=skSelectionIndices(),objects=indices.map(i=>drawing.strokes[i]);if(!objects.length||!skEditable())return;const layers=drawing.layers.filter(l=>!l.locked&&l.visible);
    A.form('整列・レイヤー移動',select('選択全体をキャンバスに整列','align',[['none','位置を維持'],['center','中央'],['horizontal','左右中央'],['vertical','上下中央'],['left','左端'],['right','右端'],['top','上端'],['bottom','下端']],'none')+select('移動先レイヤー','layer',layers.map(l=>[l.id,l.name]),drawing.activeLayer),v=>{
      const target=drawing.layers.find(l=>l.id===v.layer);if(!skEditable()||!target||target.locked||!target.visible)return false;const b=skGroupBounds(indices);let dx=0,dy=0;
      if(['center','horizontal'].includes(v.align))dx=400-b.x-b.w/2;if(['center','vertical'].includes(v.align))dy=400-b.y-b.h/2;if(v.align==='left')dx=-b.x;if(v.align==='right')dx=800-b.x-b.w;if(v.align==='top')dy=-b.y;if(v.align==='bottom')dy=800-b.y-b.h;
      [dx,dy]=skClampMove(indices,dx,dy);skChange(()=>{for(const s of objects){s.dx=(s.dx||0)+dx;s.dy=(s.dy||0)+dy;s.layer=target.id;}drawing.activeLayer=target.id;skLayerPanel();});skRestoreSelection(objects);
    });
  };
  A.actions.evSketchSelectAdd=()=>{skFinish?.();skAddSelect=!skAddSelect;skSelectionBar();};
  A.actions.evSketchSelectAll=()=>{skFinish?.();if(!skEditable())return;skTool='select';skSelection.clear();drawing.strokes.forEach((s,i)=>{if(s.layer===drawing.activeLayer)skSelection.add(i);});skSelected=[...skSelection].at(-1)??-1;$('#ev-canvas').dataset.tool='select';skToolStatus();A.$$('[data-action=evSketchTool]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.id==='select')));skSelectionBar();paint();};
  A.actions.evSketchSelectClear=()=>{skFinish?.();skSelected=-1;skSelection.clear();skMarquee=null;skSelectionBar();paint();};
  A.actions.evSketchClipboardCopy=()=>{skFinish?.();const selected=skSelectionIndices();if(!selected.length)return;skClipboard=skClone(selected.map(i=>drawing.strokes[i]));skSelectionBar();A.toast(`${skClipboard.length}個をコピーしました（このタブ内）`);};
  A.actions.evSketchClipboardPaste=()=>{skFinish?.();if(!skClipboard.length)return A.toast('先に要素をコピーしてください');if(!skEditable()||!skCapacity(skClipboard.length,skClipboard.reduce((n,s)=>n+s.points.length,0)))return;const copies=skClone(skClipboard).map(s=>({...s,layer:drawing.activeLayer,dx:Math.min(1600,(s.dx||0)+20),dy:Math.min(1600,(s.dy||0)+20)}));skChange(()=>drawing.strokes.push(...copies));A.closeOverlay();skTool='select';$('#ev-canvas').dataset.tool='select';skToolStatus();skRestoreSelection(copies);};
  function skBatchStyle(){
    const indices=skSelectionIndices(),objects=indices.map(i=>drawing.strokes[i]);if(!objects.length||!skEditable())return;
    A.form(`${objects.length}個のスタイル`,select('変更する項目','property',[['color','色'],['width','太さ'],['opacity','不透明度'],['fill','図形の塗りつぶし']],'color')+field('色','color',penColor,'color')+field('太さ','width',penWidth,'number','required min="1" max="120"')+field('不透明度（%）','opacity',Math.round(skOpacity*100),'number','required min="1" max="100"')+select('図形の塗りつぶし','fill',[['no','なし'],['yes','あり']],'yes'),v=>{if(!skEditable())return false;skChange(()=>{for(const s of objects){if(v.property==='color')s.color=skColor(v.color);if(v.property==='width')s.width=skNumber(Number(v.width),1,120,4);if(v.property==='opacity')s.opacity=skNumber(Number(v.opacity)/100,.01,1,1);if(v.property==='fill'&&['rect','ellipse','triangle','star'].includes(s.tool))s.fill=v.fill==='yes';}});skRestoreSelection(objects);});
  }
  A.actions.evSketchSelectionExport=()=>{
    skFinish?.();const indices=skSelectionIndices();if(!indices.length)return;const bounds=skGroupBounds(indices),left=Math.max(0,Math.floor(bounds.x-12)),top=Math.max(0,Math.floor(bounds.y-12)),right=Math.min(800,Math.ceil(bounds.x+bounds.w+12)),bottom=Math.min(800,Math.ceil(bounds.y+bounds.h+12));if(right<=left||bottom<=top)return A.toast('選択が用紙の外にあります');
    const doc={...drawing,strokes:indices.map(i=>drawing.strokes[i])},source=document.createElement('canvas');source.width=source.height=1600;skRender(source,doc,{transparent:true});const crop=document.createElement('canvas');crop.width=(right-left)*2;crop.height=(bottom-top)*2;crop.getContext('2d').drawImage(source,left*2,top*2,crop.width,crop.height,0,0,crop.width,crop.height);const filename=skFilename()+'-selection.png';crop.toBlob(blob=>{if(blob)A.download(blob,filename);else A.toast('書き出せませんでした');},'image/png');
  };
  A.actions.evSketchTimeline=()=>{
    skFinish?.();const states=[...skUndo,JSON.stringify(drawing),...skRedo.slice().reverse()],current=skUndo.length;
    A.overlay(`${A.overlayTitle('編集履歴')}<div class="ev-menu-sheet sk-history-sheet"><p>この編集セッションの履歴。開き直すと消えます。過去の状態を選ぶと、その時点まで戻ります。</p><div class="sk-timeline">${states.map((state,i)=>{const doc=JSON.parse(state);return skButton('evSketchHistoryJump',`<span>${i===current?'現在':i<current?'戻る':'やり直す'} · ${Math.abs(i-current)}操作</span><small>${doc.strokes.length}要素 / ${doc.layers.length}レイヤー · ${esc(doc.title)}</small>`,String(i),`aria-current="${i===current?'step':'false'}" ${i===current?'disabled':''}`);}).reverse().join('')}</div></div>`,'sheet-overlay');
  };
  A.actions.evSketchHistoryJump=el=>{
    const target=Number(el.dataset.id),states=[...skUndo,JSON.stringify(drawing),...skRedo.slice().reverse()];if(!Number.isInteger(target)||target<0||target>=states.length||target===skUndo.length)return;
    drawing=JSON.parse(states[target]);skUndo=states.slice(0,target);skRedo=states.slice(target+1).reverse();skSelected=-1;skSelection.clear();skMarquee=null;skOffset=null;sketchSave();A.closeOverlay();sketchEditor();
  };
  function skReferenceRender(){const image=$('#sk-reference-preview'),trace=$('#sk-trace-image');if(!image||!trace)return;for(const el of [image,trace]){if(skReference)el.src=skReference;else el.removeAttribute('src');}image.hidden=!skReference;trace.hidden=!skReference||!skTrace;trace.style.opacity=skReferenceOpacity;$('#sk-trace').checked=skTrace;}
  async function skLoadReference(e){const input=e.target,file=input.files[0],id=drawing.id,status=$('#sk-reference-status');if(!file)return;input.disabled=true;status.textContent='読み込み中…';let bitmap;
    try{if(!['image/png','image/jpeg','image/webp'].includes(file.type)||file.size>8*1024*1024)throw Error('8MB以下のPNG・JPEG・WebPを選択してください');bitmap=await createImageBitmap(file);if(bitmap.width*bitmap.height>16000000)throw Error('1600万画素以下の画像を選択してください');if(!input.isConnected||drawing?.id!==id)return;const c=document.createElement('canvas'),ratio=Math.min(1,1000/Math.max(bitmap.width,bitmap.height));c.width=Math.max(1,Math.round(bitmap.width*ratio));c.height=Math.max(1,Math.round(bitmap.height*ratio));c.getContext('2d').drawImage(bitmap,0,0,c.width,c.height);skReference=c.toDataURL('image/png');skReferenceRender();status.textContent='参照中 · 作品には保存されません';}
    catch(error){if(input.isConnected)status.textContent=error.message||'画像を読み込めませんでした';}finally{bitmap?.close();if(input.isConnected){input.disabled=false;input.value='';}}
  }
  A.actions.evSketchReferenceRemove=()=>{skReference=null;skTrace=false;skReferenceRender();$('#sk-reference-status').textContent='';};
  function skHistory(redo){skFinish?.();const from=redo?skRedo:skUndo,to=redo?skUndo:skRedo;if(!drawing||!from.length)return;to.push(JSON.stringify(drawing));drawing=JSON.parse(from.pop());skSelected=-1;skSelection.clear();skMarquee=null;sketchSave();sketchEditor();}
  A.actions.evSketchUndo=()=>skHistory(false);A.actions.evSketchRedo=()=>skHistory(true);
  A.actions.evSketchFocus=()=>{
    skFinish?.();skFocus=!skFocus;$('.ev-sketch').classList.toggle('sk-focused',skFocus);
    $('[data-action=evSketchFocus]').setAttribute('aria-pressed',String(skFocus));
    $('#sk-viewport').scrollIntoView({block:'nearest'});
  };
  A.actions.evSketchObjectStyle=()=>{
    if(skSelectionIndices().length>1)return skBatchStyle();
    const index=skSelected,s=drawing?.strokes[index];if(!s||!skEditable())return;
    A.form('要素の変形・色',field('色','color',s.color,'color')+field('太さ','width',s.width,'number','required min="1" max="120"')+field('不透明度（%）','opacity',Math.round((s.opacity??1)*100),'number','required min="1" max="100"')+field('拡大率（%）','scale',Math.round((s.scale||1)*100),'number','required min="10" max="400"')+field('回転（度）','rotation',s.rotation||0,'number','required min="-180" max="180"')+select('左右反転','flipX',[['no','なし'],['yes','反転']],s.flipX?'yes':'no')+select('上下反転','flipY',[['no','なし'],['yes','反転']],s.flipY?'yes':'no')+select('図形の塗りつぶし','fill',[['no','なし'],['yes','あり']],s.fill?'yes':'no'),v=>{
      if(!skEditable())return false;
      skChange(()=>{drawing.strokes[index]={...s,color:skColor(v.color),width:Number(v.width),opacity:Number(v.opacity)/100,scale:Number(v.scale)/100,rotation:Number(v.rotation),flipX:v.flipX==='yes',flipY:v.flipY==='yes',fill:v.fill==='yes'};});
      skSelected=index;skSelectionBar();paint();
    });
  };
  A.actions.evSketchObjectOrder=el=>{
    skFinish?.();const indices=skSelectionIndices(),objects=indices.map(i=>drawing.strokes[i]);if(!objects.length||!skEditable())return;
    const siblings=drawing.strokes.filter(s=>s.layer===drawing.activeLayer),rest=siblings.filter(s=>!objects.includes(s)),ordered=el.dataset.id==='front'?[...rest,...objects]:[...objects,...rest];if(siblings.every((s,i)=>s===ordered[i]))return;
    skChange(()=>{let i=0;drawing.strokes=drawing.strokes.map(s=>s.layer===drawing.activeLayer?ordered[i++]:s);});skRestoreSelection(objects);
  };
  A.actions.evSketchObjectCopy=()=>{skFinish?.();const objects=skSelectionIndices().map(i=>drawing.strokes[i]);if(objects.length&&skEditable()&&skCapacity(objects.length,objects.reduce((n,s)=>n+s.points.length,0))){const copies=skClone(objects).map(s=>({...s,dx:Math.min(1600,(s.dx||0)+20),dy:Math.min(1600,(s.dy||0)+20)}));skChange(()=>drawing.strokes.push(...copies));skRestoreSelection(copies);}};
  A.actions.evSketchObjectDelete=()=>{skFinish?.();const indices=new Set(skSelectionIndices());if(indices.size&&skEditable())skChange(()=>drawing.strokes=drawing.strokes.filter((s,i)=>!indices.has(i)));};
  A.actions.evSketchTextEdit=()=>{if(skSelected>=0&&skEditable())skTextForm(null,skSelected);};
  A.actions.evSketchPaper=()=>A.form('用紙',select('模様','paper',[['plain','無地'],['grid','方眼'],['dots','ドット'],['ruled','罫線']],drawing.paper)+select('色','tone',[['cream','クリーム'],['white','白'],['dark','ダーク']],drawing.tone),v=>{skChange(()=>{drawing.paper=v.paper;drawing.tone=v.tone;},true);});
  A.actions.evSketchClear=()=>A.confirm('すべての描画をクリア？','ロック中のレイヤーも含みます。元に戻す操作で復元できます。',()=>skChange(()=>drawing.strokes=[]));
  A.actions.evSketchLayerSelect=el=>{skFinish?.();drawing.activeLayer=el.dataset.id;skSelected=-1;skSelection.clear();skMarquee=null;sketchSave();skLayerPanel();skSelectionBar();paint();};
  for(const [action,key] of [['evSketchLayerVisible','visible'],['evSketchLayerLock','locked']])A.actions[action]=el=>skChange(()=>{const l=drawing.layers.find(l=>l.id===el.dataset.id);if(l)l[key]=!l[key];skLayerPanel();});
  A.actions.evSketchLayerAdd=()=>{if(drawing.layers.length>=8)return A.toast('レイヤーは8枚までです');skChange(()=>{const id=A.id();drawing.layers.push({id,name:`レイヤー ${drawing.layers.length+1}`,visible:true,locked:false,opacity:1});drawing.activeLayer=id;skLayerPanel();});};
  A.actions.evSketchLayerCopy=()=>{if(drawing.layers.length>=8)return A.toast('レイヤーは8枚までです');const l=skLayer(),strokes=drawing.strokes.filter(s=>s.layer===l.id);if(!skCapacity(strokes.length,strokes.reduce((n,s)=>n+s.points.length,0)))return;skChange(()=>{const id=A.id();drawing.layers.splice(drawing.layers.indexOf(l)+1,0,{...l,id,name:(l.name+' コピー').slice(0,40),locked:false});drawing.strokes.push(...skClone(strokes).map(s=>({...s,layer:id})));drawing.activeLayer=id;skLayerPanel();});};
  function skMoveLayer(delta){const i=drawing.layers.findIndex(l=>l.id===drawing.activeLayer),j=i+delta;if(j<0||j>=drawing.layers.length)return;skChange(()=>{[drawing.layers[i],drawing.layers[j]]=[drawing.layers[j],drawing.layers[i]];skLayerPanel();});}
  A.actions.evSketchLayerUp=()=>skMoveLayer(1);A.actions.evSketchLayerDown=()=>skMoveLayer(-1);
  A.actions.evSketchLayerEdit=el=>{const l=drawing.layers.find(l=>l.id===el.dataset.id);if(l)A.form('レイヤー設定',field('名前','name',l.name,'text','required maxlength="40"')+field('不透明度（%）','opacity',Math.round(l.opacity*100),'number','required min="0" max="100" step="1"')+select('合成モード','blend',skBlendModes,l.blend||'source-over'),v=>{if(!v.name.trim())return false;skChange(()=>{l.name=v.name.trim();l.opacity=Number(v.opacity)/100;l.blend=v.blend;skLayerPanel();});});};
  A.actions.evSketchLayerSolo=()=>skChange(()=>{for(const layer of drawing.layers)layer.visible=layer.id===drawing.activeLayer;skLayerPanel();});
  A.actions.evSketchLayersShow=()=>skChange(()=>{for(const layer of drawing.layers)layer.visible=true;skLayerPanel();});
  A.actions.evSketchLayerClear=()=>{if(skEditable())A.confirm('レイヤーの内容を消去？','元に戻す操作で復元できます。',()=>skChange(()=>drawing.strokes=drawing.strokes.filter(s=>s.layer!==drawing.activeLayer)));};
  A.actions.evSketchLayerDelete=()=>{if(drawing.layers.length===1)return A.toast('最後のレイヤーは削除できません');if(skEditable())A.confirm('レイヤーを削除？','中の描画も削除します。元に戻す操作で復元できます。',()=>skChange(()=>{drawing.strokes=drawing.strokes.filter(s=>s.layer!==drawing.activeLayer);drawing.layers=drawing.layers.filter(l=>l.id!==drawing.activeLayer);drawing.activeLayer=drawing.layers.at(-1).id;skLayerPanel();}));};
  A.actions.evSketchMenu=()=>{skFinish?.();A.overlay(`${A.overlayTitle('作品メニュー')}<div class="ev-menu-sheet">${[['evSketchExport','画像を書き出す（PNG / JPEG）'],['evSketchJSON','編集用JSONを保存'],['evSketchImport','JSONから作品を読み込む'],['evSketchPhoto','写真に追加'],['evSketchTimeline','編集履歴から戻す'],['evSketchClipboardPaste','コピーした要素を貼り付け'],['evSketchDuplicate','作品を複製'],['evSketchClear','すべての描画をクリア'],['evSketchDelete','作品を削除']].map(([a,t])=>skButton(a,t,drawing.id)).join('')}</div>`,'sheet-overlay');};
  const skFilename=()=>((drawing?.title||'sketch').replace(/[\\/:*?"<>|\x00-\x1f]/g,'_').trim().slice(0,80)||'sketch');
  A.actions.evSketchJSON=()=>{skFinish?.();exportText(skFilename()+'.aura-sketch.json',JSON.stringify({format:'aura-sketch',version:2,document:drawing}), 'application/json');A.toast('編集用データを書き出しました');};
  A.actions.evSketchExport=()=>A.form('画像を書き出す',select('形式','format',[['png','PNG'],['jpeg','JPEG']],'png')+select('サイズ','size',[['800','800 × 800'],['1600','1600 × 1600'],['2400','2400 × 2400']],'1600')+select('背景（透過はPNGのみ）','background',[['paper','用紙あり'],['transparent','透過（模様なし）']],'paper'),v=>{skFinish?.();const c=document.createElement('canvas');c.width=c.height=Number(v.size);skRender(c,drawing,{transparent:v.format==='png'&&v.background==='transparent'});const name=skFilename()+'.'+(v.format==='jpeg'?'jpg':'png');c.toBlob(blob=>{if(blob)A.download(blob,name);else A.toast('画像を書き出せませんでした');},'image/'+v.format,.94);},'書き出す');
  A.actions.evSketchPhoto=()=>{skFinish?.();const c=document.createElement('canvas');c.width=c.height=800;skRender(c,drawing);if(A.storePhoto(c.toDataURL('image/jpeg',.92),drawing.title)){A.closeOverlay();A.toast('写真に追加済み');}};
  A.actions.evSketchDuplicate=()=>{skFinish?.();const copy={...skClone(drawing),id:A.id(),title:(drawing.title+' コピー').slice(0,80),updated:Date.now()};if(upsert('sketches',copy)){A.closeOverlay();skReference=null;skTrace=false;drawing=copy;skUndo=[];skRedo=[];skSelected=-1;skSelection.clear();skMarquee=null;sketchEditor();}};
  A.actions.evSketchDelete=el=>{const id=el.dataset.id;A.confirm('スケッチを削除？','この操作は元に戻せません。JSONを書き出しておくと復元できます。',()=>{skFinish?.();if(saveList('sketches',read('sketches').filter(d=>d.id!==id))){skDrafts.delete(id);A.cleanup();drawing=null;skGallery();}});};
  A.actions.evSketchImport=()=>{
    A.overlay(`${A.overlayTitle('JSONを読み込む')}<div class="ev-menu-sheet"><p>このアプリで保存した編集用JSON（12MB以下）を、新しい作品として追加します。既存の作品は上書きしません。</p><input type="file" id="sk-import" accept=".json,application/json" aria-label="スケッチJSON"><p id="sk-import-status" role="status"></p></div>`,'sheet-overlay');
    const input=$('#sk-import'),status=$('#sk-import-status');input.onchange=async()=>{
      const file=input.files[0];if(!file)return;input.disabled=true;status.textContent='読み込み中…';
      try{if(file.size>12*1024*1024)throw Error('12MB以下のJSONを選択してください');const data=JSON.parse(await file.text());if(data.format!=='aura-sketch'||data.version!==2)throw Error('対応するスケッチJSONではありません');const doc=skNormalize(data.document);doc.id=A.id();doc.updated=Date.now();
        if(!input.isConnected||A.current!=='sketch')return;if(!upsert('sketches',doc))throw Error('容量不足などで保存できません。既存作品は変更していません');A.cleanup();skReference=null;skTrace=false;drawing=doc;skUndo=[];skRedo=[];skSelected=-1;skSelection.clear();skMarquee=null;skZoom=1;A.closeOverlay();sketchEditor();
      }catch(e){if(input.isConnected){status.textContent=e instanceof SyntaxError?'JSONを読み取れませんでした':e.message;input.disabled=false;input.value='';}}
    };
  };
  A.actions.evSketchHelp=()=>A.overlay(`${A.overlayTitle('スケッチの使い方')}<div class="ev-menu-sheet sk-help"><h3>新しい制作パネル</h3><p>キャンバス下のブラシ・色・レイヤー・用紙・参照で必要な設定だけを開きます。筆は描画点の間隔や筆圧で線幅が変化し、エアブラシは柔らかく重なります。道具ごとの太さ・不透明度はこのタブ内で保持します。ブラシ設定は6件、最近使った色は8色までブラウザ内に保存します。</p><h3>描画アシスト</h3><p>対称描画は左右・上下・四方向。Shift＋ドラッグで正方形・正円・45度刻みの線を描けます。図形の破線、文字の3書体、レイヤーの乗算・スクリーン・オーバーレイにも対応。選択した要素は「整列・移動」で位置やレイヤーを変更できます。</p><h3>参照画像</h3><p>PNG・JPEG・WebP（8MB、1600万画素まで）を見本や下絵に表示します。編集画面だけの表示で、保存・画像書き出し・JSONには含めません。作品一覧へ戻ると解除します。</p><h3>複数選択</h3><p>選択ツールで空白からドラッグし、囲み枠が完全に入る要素をまとめて選択します。追加選択ボタンまたはShift＋タップで選択を追加・解除。同じレイヤーの要素を一括移動・複製・削除・スタイル変更・整列できます。コピーはタブ内に保持し、別作品にも貼り付け可能です。「選択をPNG保存」は用紙内の選択部分だけを透過・2倍解像度で書き出します。未選択要素・参照・ガイドは含みません。</p><h3>配色と履歴</h3><p>カスタム配色は8組・各12色までブラウザ内に保存。作品の描画色を使用回数順に抽出して配色にできます（合成後のピクセル色ではありません）。編集履歴から過去の状態に戻り、やり直すことができます。履歴は編集中のみで、戻った後に描くと未来の履歴は消えます。</p><h3>描画と編集</h3><p>図形はドラッグ、文字は配置場所をタップ。選択ツールは現在のレイヤーの要素を囲み枠で選択し、移動・複製・削除できます。「変形・色」で回転・拡大縮小・反転・色の変更、「手前へ／奥へ」でレイヤー内の重なりを調整できます。選択判定は外接矩形です。</p><h3>レイヤーと拡大</h3><p>最大8レイヤー。サムネイルで内容を確認し、「この層だけ表示」「すべて表示」で表示を切り替えられます。自由／固定でロックを切り替えます。拡大時は「手のひら」ツールでドラッグして移動。「集中表示」で設定を隠し、同じボタンで戻せます。消しゴムは現在のレイヤーだけを透明にします。旧作品の消しゴムは見た目を保つため用紙色のままです。</p><h3>ショートカット</h3><p>Ctrl / ⌘ + Z：元に戻す<br>Ctrl / ⌘ + Shift + Z、Ctrl + Y：やり直す<br>B：ペン、E：消しゴム、V：選択、I：スポイト、P：手のひら<br>Delete：選択要素を削除<br>Ctrl / ⌘ + A：全選択、C：タブ内コピー、V：貼り付け<br>[ / ]：太さを変更、矢印：選択要素を1px移動（Shiftで10px）<br>Esc：選択解除・パネルを閉じる、0：表示リセット</p><h3>保存の範囲</h3><p>自動保存はこのブラウザのみ。履歴は編集中のみ最大30操作（容量により減少）。1作品1,000要素・合計100,000点、1ストローク5,000点。容量不足時の未保存作品はタブ内で保持しますが、再読み込み前にJSONで退避してください。</p></div>`,'sheet-overlay');
  document.addEventListener('keydown',e=>{
    if(A.current!=='sketch'||!$('#overlay').hidden||!$('#ev-canvas')||e.isComposing||e.target.closest('input,textarea,select,[contenteditable]'))return;
    const key=e.key.toLowerCase(),mod=e.ctrlKey||e.metaKey;
    if(mod&&key==='a'){e.preventDefault();A.actions.evSketchSelectAll();}
    else if(mod&&key==='c'&&skSelectionIndices().length){e.preventDefault();A.actions.evSketchClipboardCopy();}
    else if(mod&&key==='v'&&skClipboard.length){e.preventDefault();A.actions.evSketchClipboardPaste();}
    else if(mod&&['z','y'].includes(key)){e.preventDefault();(key==='y'||e.shiftKey?A.actions.evSketchRedo:A.actions.evSketchUndo)();}
    else if(!mod&&!e.altKey){
      if(key==='escape'){e.preventDefault();skFinish?.();skSelected=-1;skSelection.clear();skMarquee=null;skPanelShow('');skSelectionBar();paint();return;}
      if(key==='0'){e.preventDefault();A.actions.evSketchFit();return;}
      if(['[',']'].includes(key)){e.preventDefault();penWidth=Math.max(1,Math.min(120,penWidth+(key==='['?-1:1)));$('#ev-pen-width').value=penWidth;$('#sk-width-value').textContent=penWidth;skToolStatus();return;}
      if(['arrowleft','arrowright','arrowup','arrowdown'].includes(key)&&skSelectionIndices().length){e.preventDefault();const n=e.shiftKey?10:1;skMoveSelected(key==='arrowleft'?-n:key==='arrowright'?n:0,key==='arrowup'?-n:key==='arrowdown'?n:0);return;}
      const tool={b:'pen',e:'erase',v:'select',i:'picker',p:'pan'}[key];if(tool){e.preventDefault();A.actions.evSketchTool({dataset:{id:tool}});}else if(key==='delete'&&skSelected>=0){e.preventDefault();A.actions.evSketchObjectDelete();}}
  });

  // Extend Spotlight without duplicating or caching the existing app models.
  A.searchAdditional = query => {
    const sources=[['contacts','連絡先',x=>x.name,x=>x.phone+' '+x.email,'evContactOpen'],['journal','日記',x=>x.title||x.date,x=>x.body,'evJournalEdit'],['reading','読書',x=>x.title,x=>x.author+' '+x.note,'evBookEdit'],['shopping','買い物',x=>x.name,x=>String(x.quantity),'evShoppingEdit'],['habits','習慣',x=>x.name,()=>'', 'evHabitEdit']];
    return sources.map(([key,label,title,detail,action])=>{const items=read(key).filter(x=>(title(x)+' '+detail(x)).toLowerCase().includes(query)).slice(0,4);return items.length?`<p class="spotlight-label">${label}</p><div class="search-content-group">${items.map(x=>`<button data-action="evSearchOpen" data-app-id="${key}" data-target="${action}" data-id="${esc(x.id)}">${A.icon(key)}<span><strong>${esc(title(x))}</strong><small>${esc(detail(x).slice(0,65))}</small></span>${A.icon('arrow')}</button>`).join('')}</div>`:'';}).join('');
  };
  A.actions.evSearchOpen=el=>{const {appId,target,id}=el.dataset;A.open(appId);A.actions[target]?.({dataset:{id}});};
  A.renderHome();
})();
