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
    page('journal',`<div class="ev-heading"><span>${dateKey()}</span><h1>日々の記録</h1></div><div class="ev-mood-strip">${Array.from({length:7},(_,i)=>{const date=daysAgo(6-i),entry=list.find(x=>x.date===date);return `<div><span>${entry?moodIcon[entry.mood]:'·'}</span><small>${new Date(date+'T12:00:00').getDate()}</small></div>`;}).join('')}</div>${A.search('ev-journal-search','日記を検索')}<div id="ev-journal-list"></div>`,btn('evJournalExport','日記を書き出す','download')+btn('evJournalEdit','日記を書く','plus'));
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
  const skTools=[['pen','ペン'],['pencil','鉛筆'],['marker','マーカー'],['erase','消しゴム'],['line','直線'],['arrow','矢印'],['rect','四角'],['ellipse','円'],['triangle','三角'],['star','星'],['text','文字'],['picker','スポイト'],['select','選択・移動'],['pan','手のひら']];
  const skShapes=['line','arrow','rect','ellipse','triangle','star'];
  const skColors=['#514752','#ad6c82','#739686','#6f91b6','#d1a054','#ffffff','#282633','#e96c58','#8464b5','#38a8a0'];
  let drawing=null,stroke=null,skTool='pen',penColor='#514752',penWidth=4;
  let skOpacity=1,skFill=false,skSymmetry=false,skSnap=false,skPressure=false,skSmooth=false;
  let skZoom=1,skSelected=-1,skOffset=null,skUndo=[],skRedo=[],skFinish=null;
  let skQuery='',skSort='updated',skFavorites=false,skFocus=false,skRevision=0;
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
      layers:layers.map((l,i)=>{if(!l||typeof l.id!=='string'||ids.has(l.id))throw Error('レイヤー形式が不正です');ids.add(l.id);return {id:l.id,name:String(l.name||`レイヤー ${i+1}`).slice(0,40),visible:l.visible!==false,locked:!!l.locked,opacity:skNumber(l.opacity,0,1,1)};})};
    doc.activeLayer=ids.has(raw.activeLayer)?raw.activeLayer:doc.layers[0].id;
    let points=0;
    doc.strokes=raw.strokes.map(s=>{
      if(!s||!Array.isArray(s.points)||!s.points.length||s.points.length>5000||(points+=s.points.length)>SK_MAX_POINTS)throw Error('描画データの上限を超えています');
      const tool=s.tool||'pen';if(!skTools.some(t=>t[0]===tool)||['select','picker','pan'].includes(tool))throw Error('未対応の描画ツールです');
      return {tool,color:skColor(s.color),width:skNumber(s.width,1,120,4),opacity:skNumber(s.opacity,0.01,1,1),layer:ids.has(s.layer)?s.layer:doc.layers[0].id,
        fill:!!s.fill,symmetry:!!s.symmetry,pressure:!!s.pressure,text:String(s.text||'').slice(0,200),fontSize:skNumber(s.fontSize,12,160,48),
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
    const info=$('#sk-document-info');if(info&&drawing)info.textContent=`${drawing.strokes.length} / ${SK_MAX_STROKES}要素 · ${drawing.layers.length}レイヤー`;
  }
  function sketchSave(){
    if(!drawing)return true;skRevision++;drawing.updated=Date.now();const ok=upsert('sketches',drawing);
    if(ok)skDrafts.delete(drawing.id);else skDrafts.set(drawing.id,skClone(drawing));skStatus();return ok;
  }
  // Snapshots are capped both by count and bytes; history is intentionally session-only.
  function skRemember(){skUndo.push(JSON.stringify(drawing));while(skUndo.length>30||skUndo.length>1&&skUndo.reduce((n,s)=>n+s.length,0)>3000000)skUndo.shift();skRedo=[];}
  function skChange(fn,rerender=false){if(!drawing)return;skFinish?.();skRemember();fn();skSelected=-1;skOffset=null;sketchSave();if(rerender)sketchEditor();else{paint();skSelectionBar();}}
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
    const draw=()=>{
      const [x,y]=s.points[0],[ex,ey]=s.points.at(-1);ctx.beginPath();
      if(s.tool==='text'){ctx.font=`${s.fontSize||48}px sans-serif`;ctx.textBaseline='top';s.text.split('\n').forEach((line,i)=>ctx.fillText(line,x,y+i*(s.fontSize||48)*1.2));return;}
      if(s.tool==='rect')ctx.rect(Math.min(x,ex),Math.min(y,ey),Math.abs(ex-x),Math.abs(ey-y));
      else if(s.tool==='ellipse')ctx.ellipse((x+ex)/2,(y+ey)/2,Math.abs(ex-x)/2,Math.abs(ey-y)/2,0,0,Math.PI*2);
      else if(s.tool==='triangle'){ctx.moveTo((x+ex)/2,y);ctx.lineTo(ex,ey);ctx.lineTo(x,ey);ctx.closePath();}
      else if(s.tool==='star'){const cx=(x+ex)/2,cy=(y+ey)/2,rx=Math.abs(ex-x)/2,ry=Math.abs(ey-y)/2;for(let i=0;i<10;i++){const a=i*Math.PI/5-Math.PI/2,r=i%2?.43:1;const px=cx+Math.cos(a)*rx*r,py=cy+Math.sin(a)*ry*r;i?ctx.lineTo(px,py):ctx.moveTo(px,py);}ctx.closePath();}
      else if(['line','arrow'].includes(s.tool)){ctx.moveTo(x,y);ctx.lineTo(ex,ey);if(s.tool==='arrow'){const a=Math.atan2(ey-y,ex-x),n=Math.max(18,s.width*3);ctx.moveTo(ex-n*Math.cos(a-.5),ey-n*Math.sin(a-.5));ctx.lineTo(ex,ey);ctx.lineTo(ex-n*Math.cos(a+.5),ey-n*Math.sin(a+.5));}}
      else if(s.pressure&&s.points.length>1){for(let i=1;i<s.points.length;i++){ctx.beginPath();ctx.lineWidth=s.width*(.2+.8*(s.points[i][2]??.5));ctx.moveTo(...s.points[i-1].slice(0,2));ctx.lineTo(...s.points[i].slice(0,2));ctx.stroke();}return;}
      else{s.points.forEach(([px,py],i)=>i?ctx.lineTo(px,py):ctx.moveTo(px,py));if(s.points.length===1){ctx.arc(x,y,s.width/2,0,Math.PI*2);ctx.fill();return;}}
      if(s.fill&&['rect','ellipse','triangle','star'].includes(s.tool))ctx.fill();ctx.stroke();
    };
    draw();if(s.symmetry){ctx.translate(SK_SIZE,0);ctx.scale(-1,1);draw();}ctx.restore();
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
      const moving=preview&&skOffset&&d.strokes[skSelected]?.layer===layer.id;
      let base=preview?cache.layers.get(layer.id):null;
      if(!base||moving){
        reset();d.strokes.forEach((s,i)=>{if(s.layer===layer.id)skDrawStroke(layerCtx,moving&&i===skSelected?{...s,dx:(s.dx||0)+skOffset[0],dy:(s.dy||0)+skOffset[1]}:s,d);});
        if(preview&&!moving){base=document.createElement('canvas');base.width=canvas.width;base.height=canvas.height;base.getContext('2d').drawImage(buffer,0,0);cache.layers.set(layer.id,base);}
      }else{reset();layerCtx.drawImage(base,0,0,SK_SIZE,SK_SIZE);}
      if(preview&&stroke?.layer===layer.id)skDrawStroke(layerCtx,stroke,d);
      ctx.globalAlpha=layer.opacity;ctx.drawImage(buffer,0,0,SK_SIZE,SK_SIZE);
    }ctx.restore();
  }
  function skRawBounds(s){
    const xs=s.points.map(p=>p[0]),ys=s.points.map(p=>p[1]);let x=Math.min(...xs),y=Math.min(...ys),w=Math.max(...xs)-x,h=Math.max(...ys)-y;
    if(s.tool==='text'){skMeasure.font=`${s.fontSize||48}px sans-serif`;w=Math.max(...s.text.split('\n').map(t=>skMeasure.measureText(t).width));h=s.text.split('\n').length*(s.fontSize||48)*1.2;}
    if(s.symmetry){const right=Math.max(x+w,SK_SIZE-x);x=Math.min(x,SK_SIZE-x-w);w=right-x;}
    return {x,y,w,h};
  }
  function skBounds(s){
    const b=skRawBounds(s),cx=b.x+b.w/2,cy=b.y+b.h/2,angle=(s.rotation||0)*Math.PI/180,scale=s.scale||1;
    const pad=Math.max(8,s.tool==='arrow'?s.width*3:s.width/2),hw=(b.w/2+pad)*scale,hh=(b.h/2+pad)*scale;
    const w=Math.abs(Math.cos(angle))*hw+Math.abs(Math.sin(angle))*hh,h=Math.abs(Math.sin(angle))*hw+Math.abs(Math.cos(angle))*hh;
    return {x:cx+(s.dx||0)-w,y:cy+(s.dy||0)-h,w:w*2,h:h*2};
  }
  function paint(){const c=$('#ev-canvas');if(!c||!drawing)return;skRender(c,drawing,{preview:true});if(skSelected>=0&&drawing.strokes[skSelected]){const b=skBounds(drawing.strokes[skSelected]),ctx=c.getContext('2d');ctx.save();ctx.strokeStyle='#8665bd';ctx.lineWidth=2;ctx.setLineDash([10,7]);ctx.strokeRect(b.x+(skOffset?.[0]||0),b.y+(skOffset?.[1]||0),b.w,b.h);ctx.restore();}}
  function skGallery(){
    skFinish?.();drawing=null;skSelected=-1;
    page('sketch',`<div class="sk-hero"><span>SKETCH STUDIO</span><h1>ひらめきを、自由に。</h1><p>描く、重ねる、残す。あなただけのアトリエ。</p><button class="primary-button" data-action="evSketchNew">新しいスケッチ</button></div>${A.search('sk-search','作品名を検索')}<div class="sk-gallery-tools">${skButton('evSketchFavorites','お気に入り','',`aria-pressed="${skFavorites}"`)}<select id="sk-sort" aria-label="作品の並べ替え"><option value="updated">更新順</option><option value="title">名前順</option><option value="oldest">古い順</option></select>${skButton('evSketchImport','JSON読込')}</div><div class="ev-sketch-grid" id="sk-gallery"></div><p class="ev-caption">自動保存はこのブラウザ内のみ。大切な作品はJSONでも保存してください。</p>`,btn('evSketchNew','スケッチを作成','plus'));
    const render=()=>{
      const list=skList().filter(d=>(!skFavorites||d.favorite)&&String(d.title).toLowerCase().includes(skQuery.toLowerCase())).sort((a,b)=>skSort==='title'?String(a.title).localeCompare(String(b.title),'ja'):skSort==='oldest'?a.updated-b.updated:b.updated-a.updated);
      $('#sk-gallery').innerHTML=list.map(d=>`<button class="ev-card ev-sketch-tile sk-tile" data-action="evSketchOpen" data-id="${esc(d.id)}"><canvas width="240" height="240" aria-hidden="true"></canvas><strong>${d.favorite?'★ ':''}${esc(d.title||'スケッチ')}</strong><small>${skDrafts.has(d.id)?'未保存 · ':''}${new Date(d.updated).toLocaleDateString('ja-JP')} · ${d.strokes?.length||0}要素</small></button>`).join('')||empty(skQuery||skFavorites?'該当する作品はありません':'新しいスケッチから描き始めましょう');
      A.$$('#sk-gallery canvas').forEach((c,i)=>{try{skRender(c,skNormalize(list[i]));}catch{c.parentElement.querySelector('small').textContent='読込できない作品';}});
    };
    $('#sk-search').value=skQuery;$('#sk-search').oninput=e=>{skQuery=e.target.value;render();};$('#sk-sort').value=skSort;$('#sk-sort').onchange=e=>{skSort=e.target.value;render();};render();
  }
  A.apps.sketch.render=skGallery;
  function skSelectionBar(){const el=$('#sk-selection');if(!el)return;const s=drawing.strokes[skSelected];el.innerHTML=s?`<span>${esc(skTools.find(t=>t[0]===s.tool)?.[1]||'描画')}を選択</span>${skButton('evSketchObjectStyle','変形・色')}${skButton('evSketchObjectOrder','手前へ','front')}${skButton('evSketchObjectOrder','奥へ','back')}${skButton('evSketchObjectCopy','複製')}${skButton('evSketchObjectDelete','削除')}${s.tool==='text'?skButton('evSketchTextEdit','文字編集'):''}`:'選択ツールで要素をタップして、ドラッグで移動';}
  function skLayerPanel(){const el=$('#sk-layers');if(!el)return;el.innerHTML=[...drawing.layers].reverse().map(l=>`<div class="sk-layer ${l.id===drawing.activeLayer?'active':''}">${skButton('evSketchLayerSelect',esc(l.name),l.id,`aria-pressed="${l.id===drawing.activeLayer}"`)}${skButton('evSketchLayerVisible',l.visible?'表示':'非表示',l.id,`aria-label="${esc(l.name)}の表示" aria-pressed="${l.visible}"`)}${skButton('evSketchLayerLock',l.locked?'固定':'自由',l.id,`aria-label="${esc(l.name)}のロック" aria-pressed="${l.locked}"`)}${btn('evSketchLayerEdit','レイヤー設定','settings',l.id)}</div>`).join('');}
  function sketchEditor(){
    A.cleanup();skFinish=null;if(!drawing)return;
    page('sketch',`<div class="sk-title-row"><input class="ev-sketch-title" id="ev-sketch-title" aria-label="スケッチ名" maxlength="80" value="${esc(drawing.title)}">${skButton('evSketchFavorite','★','',`aria-label="お気に入り" aria-pressed="${drawing.favorite}"`)}</div><div class="sk-meta"><span id="sk-document-info"></span><span>800 × 800</span></div><div class="sk-toolbar" role="toolbar" aria-label="描画ツール">${skTools.map(([id,label])=>skButton('evSketchTool',label,id,`aria-pressed="${skTool===id}"`)).join('')}</div><div class="ev-drawing-tools sk-palette">${skColors.map(c=>`<button style="--swatch:${c}" class="ev-swatch ${penColor===c?'selected':''}" data-action="evPenColor" data-id="${c}" aria-label="色 ${c}" aria-pressed="${penColor===c}"></button>`).join('')}<input type="color" id="ev-pen-custom" aria-label="色を選択" value="${penColor}"></div><div class="sk-settings"><label>太さ <output id="sk-width-value">${penWidth}</output><input id="ev-pen-width" aria-label="ペンの太さ" type="range" min="1" max="120" value="${penWidth}"></label><label>不透明度 <output id="sk-opacity-value">${Math.round(skOpacity*100)}%</output><input id="sk-opacity" aria-label="不透明度" type="range" min="1" max="100" value="${skOpacity*100}"></label></div><details class="sk-options"><summary>描画オプション</summary><div class="sk-checks">${[['fill','図形を塗りつぶす',skFill],['symmetry','左右対称',skSymmetry],['snap','20px方眼に吸着',skSnap],['pressure','筆圧（対応ペン）',skPressure],['smooth','手ぶれ補正',skSmooth]].map(([id,label,value])=>`<label><input id="sk-${id}" type="checkbox" ${value?'checked':''}>${label}</label>`).join('')}</div></details><div class="sk-command-bar">${btn('evSketchUndo','元に戻す','previous')}${btn('evSketchRedo','やり直す','next')}<label>表示 <select id="sk-zoom" aria-label="表示倍率">${[1,1.5,2,3].map(n=>`<option value="${n}" ${n===skZoom?'selected':''}>${n*100}%</option>`).join('')}</select></label>${skButton('evSketchPaper','用紙')}${skButton('evSketchHelp','使い方')}${skButton('evSketchFocus','集中表示','',`aria-pressed="${skFocus}"`)}</div><div class="sk-viewport" id="sk-viewport"><div id="sk-canvas-size" style="width:${skZoom*100}%"><canvas id="ev-canvas" width="800" height="800" aria-label="スケッチ用キャンバス" tabindex="0"></canvas></div></div><div class="sk-selection" id="sk-selection"></div><div class="ev-sketch-footer"><span id="ev-sketch-status" role="status"></span>${skButton('evSketchRetry','再試行')}${skButton('evSketchHome','一覧')}</div><details class="sk-options"><summary>レイヤー <span id="sk-layer-count">${drawing.layers.length} / 8</span></summary><p class="ev-caption">上の行が手前。消しゴムは選択レイヤーだけに適用。</p><div id="sk-layers"></div><div class="sk-layer-actions">${skButton('evSketchLayerAdd','＋ 追加')}${skButton('evSketchLayerCopy','複製')}${skButton('evSketchLayerUp','手前へ')}${skButton('evSketchLayerDown','奥へ')}${skButton('evSketchLayerClear','内容消去')}${skButton('evSketchLayerDelete','レイヤー削除')}</div></details>`,btn('evSketchMenu','スケッチのメニュー','share'));
    $('#ev-sketch-title').oninput=e=>{drawing.title=e.target.value;sketchSave();};
    $('#ev-pen-width').oninput=e=>{penWidth=Number(e.target.value);$('#sk-width-value').textContent=penWidth;};
    $('#sk-opacity').oninput=e=>{skOpacity=Number(e.target.value)/100;$('#sk-opacity-value').textContent=e.target.value+'%';};
    $('#ev-pen-custom').oninput=e=>skSetColor(e.target.value);
    $('#sk-fill').onchange=e=>skFill=e.target.checked;$('#sk-symmetry').onchange=e=>skSymmetry=e.target.checked;$('#sk-snap').onchange=e=>skSnap=e.target.checked;$('#sk-pressure').onchange=e=>skPressure=e.target.checked;$('#sk-smooth').onchange=e=>skSmooth=e.target.checked;
    $('#sk-zoom').onchange=e=>{skFinish?.();const viewport=$('#sk-viewport'),old=skZoom,cx=(viewport.scrollLeft+viewport.clientWidth/2)/old,cy=(viewport.scrollTop+viewport.clientHeight/2)/old;skZoom=Number(e.target.value);$('#sk-canvas-size').style.width=skZoom*100+'%';viewport.scrollLeft=cx*skZoom-viewport.clientWidth/2;viewport.scrollTop=cy*skZoom-viewport.clientHeight/2;};
    $('.ev-sketch').classList.toggle('sk-focused',skFocus);$('#ev-canvas').dataset.tool=skTool;
    skLayerPanel();skSelectionBar();skStatus();paint();skBindCanvas();
  }
  function skSetColor(color){penColor=skColor(color);const custom=$('#ev-pen-custom');if(custom)custom.value=penColor;A.$$('.ev-swatch').forEach(b=>{b.classList.toggle('selected',b.dataset.id===penColor);b.setAttribute('aria-pressed',String(b.dataset.id===penColor));});}
  function skBindCanvas(){
    const canvas=$('#ev-canvas');let pointer=null,frame=0,start=null,pan=null,limit=5000;
    const point=e=>{const r=canvas.getBoundingClientRect();let x=Math.max(0,Math.min(SK_SIZE,(e.clientX-r.left)*SK_SIZE/r.width)),y=Math.max(0,Math.min(SK_SIZE,(e.clientY-r.top)*SK_SIZE/r.height));if(skSnap){x=Math.round(x/20)*20;y=Math.round(y/20)*20;}return skPressure&&e.pointerType==='pen'?[x,y,e.pressure||.5]:[x,y];};
    const queue=()=>{if(!frame)frame=requestAnimationFrame(()=>{frame=0;if(canvas.isConnected)paint();});};
    const append=e=>{let next=point(e),last=stroke.points.at(-1);if(next[0]===last[0]&&next[1]===last[1])return;if(skShapes.includes(stroke.tool))stroke.points=[stroke.points[0],next];else if(stroke.points.length<limit){if(skSmooth&&!skSnap&&e.type!=='pointerup')next=[last[0]+(next[0]-last[0])*.55,last[1]+(next[1]-last[1])*.55,...next.slice(2)];stroke.points.push(next);}};
    const finish=e=>{
      if(e&&e.pointerId!==pointer)return;if(frame){cancelAnimationFrame(frame);frame=0;}
      if(stroke&&drawing){if(e?.type==='pointerup')append(e);skRemember();drawing.strokes.push(stroke);stroke=null;sketchSave();}
      if(e?.type==='pointerup'&&skTool==='select'&&start&&skSelected>=0){const p=point(e);skOffset=[p[0]-start[0],p[1]-start[1]];}
      if(skOffset&&drawing?.strokes[skSelected]&&(skOffset[0]||skOffset[1])){skRemember();const s=drawing.strokes[skSelected];s.dx=skNumber((s.dx||0)+skOffset[0],-1600,1600,0);s.dy=skNumber((s.dy||0)+skOffset[1],-1600,1600,0);sketchSave();}
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
        skSelected=-1;for(let i=drawing.strokes.length-1;i>=0;i--){const s=drawing.strokes[i];if(s.layer!==drawing.activeLayer)continue;const b=skBounds(s);if(p[0]>=b.x&&p[0]<=b.x+b.w&&p[1]>=b.y&&p[1]<=b.y+b.h){skSelected=i;break;}}start=p;paint();skSelectionBar();if(skSelected<0)return;
      }else{if(!skCapacity())return;limit=Math.min(5000,SK_MAX_POINTS-drawing.strokes.reduce((n,s)=>n+s.points.length,0));if(skShapes.includes(skTool)&&limit<2)return;skSelected=-1;stroke={tool:skTool,color:penColor,width:penWidth,opacity:skOpacity,fill:skFill,symmetry:skSymmetry,pressure:skPressure&&e.pointerType==='pen',layer:drawing.activeLayer,points:[p]};}
      pointer=e.pointerId;canvas.setPointerCapture(pointer);queue();
    };
    canvas.onpointermove=e=>{if(e.pointerId!==pointer)return;if(pan){const v=$('#sk-viewport');v.scrollLeft=pan.left+pan.x-e.clientX;v.scrollTop=pan.top+pan.y-e.clientY;return;}if(stroke){const events=e.getCoalescedEvents?.();for(const sample of events?.length?events:[e])append(sample);}else if(skSelected>=0){const p=point(e);skOffset=[p[0]-start[0],p[1]-start[1]];}queue();};
    canvas.onpointerup=finish;canvas.onpointercancel=finish;canvas.onlostpointercapture=finish;
    const flush=()=>{finish();};
    const hidden=()=>{if(document.hidden)finish();};window.addEventListener('pagehide',flush);document.addEventListener('visibilitychange',hidden);
    A.cleanups.push(()=>{window.removeEventListener('pagehide',flush);document.removeEventListener('visibilitychange',hidden);});
  }
  // Keep the unload warning active even after leaving the editor with a failed save.
  window.addEventListener('beforeunload',e=>{skFinish?.();if(skDrafts.size){e.preventDefault();e.returnValue='';}});
  function skTextForm(point,index=-1){
    const old=drawing.strokes[index];A.form(old?'文字を編集':'文字を配置',area('文字（200字まで）','text',old?.text||'')+field('文字サイズ','fontSize',old?.fontSize||48,'number','required min="12" max="160" step="1"'),v=>{
      if(!v.text.trim()||v.text.length>200){A.toast('文字は1〜200字で入力してください');return false;}if(!skEditable()||(!old&&!skCapacity()))return false;
      skChange(()=>{if(old){drawing.strokes[index]={...old,text:v.text,fontSize:Number(v.fontSize)};}else drawing.strokes.push({tool:'text',layer:drawing.activeLayer,color:penColor,width:penWidth,opacity:skOpacity,points:[point],text:v.text,fontSize:Number(v.fontSize)});});
    });$('#ev-text').maxLength=200;
  }
  A.actions.evSketchNew=()=>{A.cleanup();drawing=skNormalize({id:A.id(),title:'スケッチ',strokes:[],updated:Date.now()});skUndo=[];skRedo=[];skZoom=1;skSelected=-1;sketchSave();sketchEditor();};
  A.actions.evSketchOpen=el=>{A.cleanup();try{const raw=skList().find(d=>d.id===el.dataset.id);if(!raw)return;drawing=skNormalize(raw);skUndo=[];skRedo=[];skZoom=1;skSelected=-1;sketchEditor();}catch(e){A.toast(e.message);}};
  A.actions.evSketchHome=()=>{A.cleanup();skGallery();};
  A.actions.evSketchRetry=()=>sketchSave();
  A.actions.evSketchFavorites=()=>{skFavorites=!skFavorites;skGallery();};
  A.actions.evSketchFavorite=()=>skChange(()=>drawing.favorite=!drawing.favorite,true);
  A.actions.evPenColor=el=>skSetColor(el.dataset.id);
  A.actions.evSketchTool=el=>{if(!skTools.some(t=>t[0]===el.dataset.id))return;skFinish?.();skTool=el.dataset.id;skSelected=-1;$('#ev-canvas').dataset.tool=skTool;A.$$('[data-action=evSketchTool]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.id===skTool)));skSelectionBar();paint();};
  function skHistory(redo){skFinish?.();const from=redo?skRedo:skUndo,to=redo?skUndo:skRedo;if(!drawing||!from.length)return;to.push(JSON.stringify(drawing));drawing=JSON.parse(from.pop());skSelected=-1;sketchSave();sketchEditor();}
  A.actions.evSketchUndo=()=>skHistory(false);A.actions.evSketchRedo=()=>skHistory(true);
  A.actions.evSketchFocus=()=>{
    skFinish?.();skFocus=!skFocus;$('.ev-sketch').classList.toggle('sk-focused',skFocus);
    $('[data-action=evSketchFocus]').setAttribute('aria-pressed',String(skFocus));
    $('#sk-viewport').scrollIntoView({block:'nearest'});
  };
  A.actions.evSketchObjectStyle=()=>{
    const index=skSelected,s=drawing?.strokes[index];if(!s||!skEditable())return;
    A.form('要素の変形・色',field('色','color',s.color,'color')+field('太さ','width',s.width,'number','required min="1" max="120"')+field('不透明度（%）','opacity',Math.round((s.opacity??1)*100),'number','required min="1" max="100"')+field('拡大率（%）','scale',Math.round((s.scale||1)*100),'number','required min="10" max="400"')+field('回転（度）','rotation',s.rotation||0,'number','required min="-180" max="180"')+select('左右反転','flipX',[['no','なし'],['yes','反転']],s.flipX?'yes':'no')+select('上下反転','flipY',[['no','なし'],['yes','反転']],s.flipY?'yes':'no')+select('図形の塗りつぶし','fill',[['no','なし'],['yes','あり']],s.fill?'yes':'no'),v=>{
      if(!skEditable())return false;
      skChange(()=>{drawing.strokes[index]={...s,color:skColor(v.color),width:Number(v.width),opacity:Number(v.opacity)/100,scale:Number(v.scale)/100,rotation:Number(v.rotation),flipX:v.flipX==='yes',flipY:v.flipY==='yes',fill:v.fill==='yes'};});
      skSelected=index;skSelectionBar();paint();
    });
  };
  A.actions.evSketchObjectOrder=el=>{
    const index=skSelected,s=drawing?.strokes[index];if(!s||!skEditable())return;
    const siblings=drawing.strokes.map((x,i)=>x.layer===s.layer?i:-1).filter(i=>i>=0),target=el.dataset.id==='front'?siblings.at(-1):siblings[0];
    if(index===target)return;
    skChange(()=>{drawing.strokes.splice(index,1);drawing.strokes.splice(target,0,s);});skSelected=target;skSelectionBar();paint();
  };
  A.actions.evSketchObjectCopy=()=>{const s=drawing?.strokes[skSelected];if(s&&skEditable()&&skCapacity(1,s.points.length))skChange(()=>drawing.strokes.push({...skClone(s),dx:Math.min(1600,(s.dx||0)+20),dy:Math.min(1600,(s.dy||0)+20)}));};
  A.actions.evSketchObjectDelete=()=>{if(skSelected>=0&&skEditable())skChange(()=>drawing.strokes.splice(skSelected,1));};
  A.actions.evSketchTextEdit=()=>{if(skSelected>=0&&skEditable())skTextForm(null,skSelected);};
  A.actions.evSketchPaper=()=>A.form('用紙',select('模様','paper',[['plain','無地'],['grid','方眼'],['dots','ドット'],['ruled','罫線']],drawing.paper)+select('色','tone',[['cream','クリーム'],['white','白'],['dark','ダーク']],drawing.tone),v=>{skChange(()=>{drawing.paper=v.paper;drawing.tone=v.tone;});});
  A.actions.evSketchClear=()=>A.confirm('すべての描画をクリア？','ロック中のレイヤーも含みます。元に戻す操作で復元できます。',()=>skChange(()=>drawing.strokes=[]));
  A.actions.evSketchLayerSelect=el=>{skFinish?.();drawing.activeLayer=el.dataset.id;skSelected=-1;sketchSave();skLayerPanel();skSelectionBar();paint();};
  for(const [action,key] of [['evSketchLayerVisible','visible'],['evSketchLayerLock','locked']])A.actions[action]=el=>skChange(()=>{const l=drawing.layers.find(l=>l.id===el.dataset.id);if(l)l[key]=!l[key];skLayerPanel();});
  A.actions.evSketchLayerAdd=()=>{if(drawing.layers.length>=8)return A.toast('レイヤーは8枚までです');skChange(()=>{const id=A.id();drawing.layers.push({id,name:`レイヤー ${drawing.layers.length+1}`,visible:true,locked:false,opacity:1});drawing.activeLayer=id;skLayerPanel();});};
  A.actions.evSketchLayerCopy=()=>{if(drawing.layers.length>=8)return A.toast('レイヤーは8枚までです');const l=skLayer(),strokes=drawing.strokes.filter(s=>s.layer===l.id);if(!skCapacity(strokes.length,strokes.reduce((n,s)=>n+s.points.length,0)))return;skChange(()=>{const id=A.id();drawing.layers.splice(drawing.layers.indexOf(l)+1,0,{...l,id,name:(l.name+' コピー').slice(0,40),locked:false});drawing.strokes.push(...skClone(strokes).map(s=>({...s,layer:id})));drawing.activeLayer=id;skLayerPanel();});};
  function skMoveLayer(delta){const i=drawing.layers.findIndex(l=>l.id===drawing.activeLayer),j=i+delta;if(j<0||j>=drawing.layers.length)return;skChange(()=>{[drawing.layers[i],drawing.layers[j]]=[drawing.layers[j],drawing.layers[i]];skLayerPanel();});}
  A.actions.evSketchLayerUp=()=>skMoveLayer(1);A.actions.evSketchLayerDown=()=>skMoveLayer(-1);
  A.actions.evSketchLayerEdit=el=>{const l=drawing.layers.find(l=>l.id===el.dataset.id);if(l)A.form('レイヤー設定',field('名前','name',l.name,'text','required maxlength="40"')+field('不透明度（%）','opacity',Math.round(l.opacity*100),'number','required min="0" max="100" step="1"'),v=>{if(!v.name.trim())return false;skChange(()=>{l.name=v.name.trim();l.opacity=Number(v.opacity)/100;skLayerPanel();});});};
  A.actions.evSketchLayerClear=()=>{if(skEditable())A.confirm('レイヤーの内容を消去？','元に戻す操作で復元できます。',()=>skChange(()=>drawing.strokes=drawing.strokes.filter(s=>s.layer!==drawing.activeLayer)));};
  A.actions.evSketchLayerDelete=()=>{if(drawing.layers.length===1)return A.toast('最後のレイヤーは削除できません');if(skEditable())A.confirm('レイヤーを削除？','中の描画も削除します。元に戻す操作で復元できます。',()=>skChange(()=>{drawing.strokes=drawing.strokes.filter(s=>s.layer!==drawing.activeLayer);drawing.layers=drawing.layers.filter(l=>l.id!==drawing.activeLayer);drawing.activeLayer=drawing.layers.at(-1).id;skLayerPanel();}));};
  A.actions.evSketchMenu=()=>{skFinish?.();A.overlay(`${A.overlayTitle('作品メニュー')}<div class="ev-menu-sheet">${[['evSketchExport','画像を書き出す（PNG / JPEG）'],['evSketchJSON','編集用JSONを保存'],['evSketchImport','JSONから作品を読み込む'],['evSketchPhoto','写真に追加'],['evSketchDuplicate','作品を複製'],['evSketchClear','すべての描画をクリア'],['evSketchDelete','作品を削除']].map(([a,t])=>skButton(a,t,drawing.id)).join('')}</div>`,'sheet-overlay');};
  const skFilename=()=>((drawing?.title||'sketch').replace(/[\\/:*?"<>|\x00-\x1f]/g,'_').trim().slice(0,80)||'sketch');
  A.actions.evSketchJSON=()=>{skFinish?.();exportText(skFilename()+'.aura-sketch.json',JSON.stringify({format:'aura-sketch',version:2,document:drawing}), 'application/json');A.toast('編集用データを書き出しました');};
  A.actions.evSketchExport=()=>A.form('画像を書き出す',select('形式','format',[['png','PNG'],['jpeg','JPEG']],'png')+select('サイズ','size',[['800','800 × 800'],['1600','1600 × 1600'],['2400','2400 × 2400']],'1600')+select('背景（透過はPNGのみ）','background',[['paper','用紙あり'],['transparent','透過（模様なし）']],'paper'),v=>{skFinish?.();const c=document.createElement('canvas');c.width=c.height=Number(v.size);skRender(c,drawing,{transparent:v.format==='png'&&v.background==='transparent'});const name=skFilename()+'.'+(v.format==='jpeg'?'jpg':'png');c.toBlob(blob=>{if(blob)A.download(blob,name);else A.toast('画像を書き出せませんでした');},'image/'+v.format,.94);},'書き出す');
  A.actions.evSketchPhoto=()=>{skFinish?.();const c=document.createElement('canvas');c.width=c.height=800;skRender(c,drawing);if(A.storePhoto(c.toDataURL('image/jpeg',.92),drawing.title)){A.closeOverlay();A.toast('写真に追加済み');}};
  A.actions.evSketchDuplicate=()=>{skFinish?.();const copy={...skClone(drawing),id:A.id(),title:(drawing.title+' コピー').slice(0,80),updated:Date.now()};if(upsert('sketches',copy)){A.closeOverlay();drawing=copy;skUndo=[];skRedo=[];skSelected=-1;sketchEditor();}};
  A.actions.evSketchDelete=el=>{const id=el.dataset.id;A.confirm('スケッチを削除？','この操作は元に戻せません。JSONを書き出しておくと復元できます。',()=>{skFinish?.();if(saveList('sketches',read('sketches').filter(d=>d.id!==id))){skDrafts.delete(id);A.cleanup();drawing=null;skGallery();}});};
  A.actions.evSketchImport=()=>{
    A.overlay(`${A.overlayTitle('JSONを読み込む')}<div class="ev-menu-sheet"><p>このアプリで保存した編集用JSON（12MB以下）を、新しい作品として追加します。既存の作品は上書きしません。</p><input type="file" id="sk-import" accept=".json,application/json" aria-label="スケッチJSON"><p id="sk-import-status" role="status"></p></div>`,'sheet-overlay');
    const input=$('#sk-import'),status=$('#sk-import-status');input.onchange=async()=>{
      const file=input.files[0];if(!file)return;input.disabled=true;status.textContent='読み込み中…';
      try{if(file.size>12*1024*1024)throw Error('12MB以下のJSONを選択してください');const data=JSON.parse(await file.text());if(data.format!=='aura-sketch'||data.version!==2)throw Error('対応するスケッチJSONではありません');const doc=skNormalize(data.document);doc.id=A.id();doc.updated=Date.now();
        if(!input.isConnected||A.current!=='sketch')return;if(!upsert('sketches',doc))throw Error('容量不足などで保存できません。既存作品は変更していません');A.cleanup();drawing=doc;skUndo=[];skRedo=[];skSelected=-1;skZoom=1;A.closeOverlay();sketchEditor();
      }catch(e){if(input.isConnected){status.textContent=e instanceof SyntaxError?'JSONを読み取れませんでした':e.message;input.disabled=false;input.value='';}}
    };
  };
  A.actions.evSketchHelp=()=>A.overlay(`${A.overlayTitle('スケッチの使い方')}<div class="ev-menu-sheet sk-help"><h3>描画と編集</h3><p>図形はドラッグ、文字は配置場所をタップ。選択ツールは現在のレイヤーの要素を囲み枠で選択し、移動・複製・削除できます。「変形・色」で回転・拡大縮小・反転・色の変更、「手前へ／奥へ」でレイヤー内の重なりを調整できます。選択判定は外接矩形です。</p><h3>レイヤーと拡大</h3><p>最大8レイヤー。自由／固定でロックを切り替えます。拡大時は「手のひら」ツールでドラッグして移動。「集中表示」で設定を隠し、同じボタンで戻せます。消しゴムは現在のレイヤーだけを透明にします。旧作品の消しゴムは見た目を保つため用紙色のままです。</p><h3>ショートカット</h3><p>Ctrl / ⌘ + Z：元に戻す<br>Ctrl / ⌘ + Shift + Z、Ctrl + Y：やり直す<br>B：ペン、E：消しゴム、V：選択、I：スポイト、P：手のひら<br>Delete：選択要素を削除</p><h3>保存の範囲</h3><p>自動保存はこのブラウザのみ。履歴は編集中のみ最大30操作（容量により減少）。1作品1,000要素・合計100,000点、1ストローク5,000点。容量不足時の未保存作品はタブ内で保持しますが、再読み込み前にJSONで退避してください。</p></div>`,'sheet-overlay');
  document.addEventListener('keydown',e=>{
    if(A.current!=='sketch'||!$('#overlay').hidden||!$('#ev-canvas')||e.isComposing||e.target.closest('input,textarea,select,[contenteditable]'))return;
    const key=e.key.toLowerCase(),mod=e.ctrlKey||e.metaKey;
    if(mod&&['z','y'].includes(key)){e.preventDefault();(key==='y'||e.shiftKey?A.actions.evSketchRedo:A.actions.evSketchUndo)();}
    else if(!mod&&!e.altKey){const tool={b:'pen',e:'erase',v:'select',i:'picker',p:'pan'}[key];if(tool){e.preventDefault();A.actions.evSketchTool({dataset:{id:tool}});}else if(key==='delete'&&skSelected>=0){e.preventDefault();A.actions.evSketchObjectDelete();}}
  });

  // Extend Spotlight without duplicating or caching the existing app models.
  A.searchAdditional = query => {
    const sources=[['contacts','連絡先',x=>x.name,x=>x.phone+' '+x.email,'evContactOpen'],['journal','日記',x=>x.title||x.date,x=>x.body,'evJournalEdit'],['reading','読書',x=>x.title,x=>x.author+' '+x.note,'evBookEdit'],['shopping','買い物',x=>x.name,x=>String(x.quantity),'evShoppingEdit'],['habits','習慣',x=>x.name,()=>'', 'evHabitEdit']];
    return sources.map(([key,label,title,detail,action])=>{const items=read(key).filter(x=>(title(x)+' '+detail(x)).toLowerCase().includes(query)).slice(0,4);return items.length?`<p class="spotlight-label">${label}</p><div class="search-content-group">${items.map(x=>`<button data-action="evSearchOpen" data-app-id="${key}" data-target="${action}" data-id="${esc(x.id)}">${A.icon(key)}<span><strong>${esc(title(x))}</strong><small>${esc(detail(x).slice(0,65))}</small></span>${A.icon('arrow')}</button>`).join('')}</div>`:'';}).join('');
  };
  A.actions.evSearchOpen=el=>{const {appId,target,id}=el.dataset;A.open(appId);A.actions[target]?.({dataset:{id}});};
  A.renderHome();
})();
