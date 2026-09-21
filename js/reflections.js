'use strict';
// 20 additional features for finding, reviewing and continuing existing records.
(() => {
  const A=window.Aura,$=A.$,esc=A.escape;
  const rows=key=>{const value=A.load(key,[]);return Array.isArray(value)?value:[];};
  const day=(d=new Date())=>`${String(d.getFullYear()).padStart(4,'0')}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
  const today=()=>day();
  const month=()=>today().slice(0,7);
  const validDate=value=>/^\d{4}-\d{2}-\d{2}$/.test(value)&&value>='0001-01-01'&&day(new Date(value+'T12:00:00'))===value;
  const validMonth=value=>/^\d{4}-(0[1-9]|1[0-2])$/.test(value)&&value>='0001-01';
  const normalize=value=>String(value||'').normalize('NFKC').toLowerCase().trim();
  const sum=(list,fn)=>list.reduce((n,x)=>n+fn(x),0);
  const button=(action,label,id='',extra='')=>`<button type="button" class="ep-button" data-action="${action}" data-id="${esc(id)}" ${extra}>${esc(label)}</button>`;
  const field=(label,name,value='',type='text',extra='')=>`<label class="form-label" for="fr-${name}">${esc(label)}</label><input class="text-input" id="fr-${name}" name="${name}" type="${type}" value="${esc(value)}" ${extra}>`;
  const select=(label,name,options,value)=>`<label class="form-label" for="fr-${name}">${esc(label)}</label><select class="text-input" id="fr-${name}" name="${name}">${options.map(([id,label])=>`<option value="${esc(id)}" ${id===value?'selected':''}>${esc(label)}</option>`).join('')}</select>`;
  const empty=text=>`<p class="ev-empty">${esc(text)}</p>`;
  const details=(label,html,open=false)=>`<details class="ep-details" ${open?'open':''}><summary>${esc(label)}</summary><div>${html}</div></details>`;
  const section=(label,html)=>`<section class="ep-section"><h3>${esc(label)}</h3>${html}</section>`;
  const metric=(label,value)=>`<div class="fr-metric"><strong>${esc(value)}</strong><span>${esc(label)}</span></div>`;
  const page=(app,title,html)=>A.view(A.nav(esc(title),'','frReturn','戻る')+`<div class="app-content everyday everyday-plus reflections" data-reflection-app="${app}">${html}</div>`);
  const save=(key,list,render)=>{if(!A.save(key,list))return false;render?.();return true;};
  const csv=(name,data)=>{const cell=value=>'"'+String(value??'').replace(/^[=+@\-\t\r]/,"'$&").replace(/"/g,'""')+'"';A.download(new Blob(['\ufeff'+data.map(row=>row.map(cell).join(',')).join('\r\n')],{type:'text/csv;charset=utf-8'}),name);};
  A.actions.frReturn=()=>A.open($('.reflections')?.dataset.reflectionApp||A.current);
  const entries={journal:['#ev-journal-list','frJournal','振り返り'],reading:['.ev-book-list','frReading','計画・検索'],habits:['.ev-hero','frHabits','月のまとめ'],focus:['.ev-focus-ring','frFocus','履歴・分析']};
  A.decorateEveryday=id=>{const entry=entries[id];if(entry&&$(entry[0]))$('.everyday').insertAdjacentHTML('afterbegin',`<button class="fr-entry" data-action="${entry[1]}"><span>${esc(entry[2])}</span><span aria-hidden="true">›</span></button>`);};

  // 31–35: month filter, exact tag filter, random past entry, anniversaries,
  // and a monthly mood / writing summary. Original editor remains canonical.
  let journalMonth=month(),journalTag='';
  const journalTags=x=>[...new Set(String(x.tags||'').split(/[,、\s]+/).map(x=>x.replace(/^#/,'')).filter(Boolean))];
  const journalCards=list=>list.map(x=>`<button class="ev-card ev-journal-entry" data-action="evJournalEdit" data-id="${esc(x.id)}"><header><time>${esc(x.date)}</time><span>${esc({5:'晴れ',4:'穏やか',3:'ふつう',2:'曇り',1:'雨'}[x.mood]||'')}</span></header><h3>${esc(x.title||'日記')}</h3><p>${esc(x.body.slice(0,180))}${x.body.length>180?'…':''}</p><small>${esc(journalTags(x).map(t=>'#'+t).join(' '))}</small></button>`).join('')||empty('該当する日記はありません');
  function renderJournal() {
    const list=rows('journal').sort((a,b)=>b.date.localeCompare(a.date)),tags=[...new Set(list.flatMap(journalTags))].sort((a,b)=>a.localeCompare(b,'ja'));
    if(journalTag&&!tags.includes(journalTag))journalTag='';
    const summaryMonth=journalMonth||month(),monthly=list.filter(x=>x.date.startsWith(summaryMonth)),anniversaries=list.filter(x=>x.date<today()&&x.date.slice(5)===today().slice(5));
    page('journal','日記を探す',`<div class="fr-filters">${field('月（空欄ですべて）','journal-month',journalMonth,'month')}${select('タグ','journal-tag',[['','すべてのタグ'],...tags.map(x=>[x,x])],journalTag)}</div>
      <div class="ep-actions">${button('frJournalAll','すべての月')}${button('frJournalRandom','過去の日記を1件開く')}</div>
      ${details(summaryMonth+' のまとめ',`<div class="fr-metrics">${metric('書いた日',new Set(monthly.map(x=>x.date)).size+'日')}${metric('本文の文字数',sum(monthly,x=>Array.from(x.body).length)+'字')}</div><div class="fr-bars">${[['5','晴れ'],['4','穏やか'],['3','ふつう'],['2','曇り'],['1','雨']].map(([mood,label])=>{const count=monthly.filter(x=>String(x.mood)===mood).length;return `<div><span>${label}</span><meter min="0" max="${Math.max(1,monthly.length)}" value="${count}">${count}</meter><strong>${count}日</strong></div>`;}).join('')}</div><p class="ep-muted">記録した気分の内訳です。</p>`)}
      ${details('過去の今日',journalCards(anniversaries))}<p class="ep-muted" id="fr-journal-count" role="status"></p><div id="fr-journal-results"></div>`);
    const render=()=>{const visible=list.filter(x=>(!journalMonth||x.date.startsWith(journalMonth))&&(!journalTag||journalTags(x).includes(journalTag)));$('#fr-journal-count').textContent=visible.length+'件';$('#fr-journal-results').innerHTML=journalCards(visible);};
    $('#fr-journal-month').onchange=e=>{if(!e.target.value||validMonth(e.target.value)){journalMonth=e.target.value;renderJournal();}};
    $('#fr-journal-tag').onchange=e=>{journalTag=e.target.value;render();};render();
  }
  A.actions.frJournal=renderJournal;
  A.actions.frJournalAll=()=>{journalMonth='';renderJournal();};
  A.actions.frJournalRandom=()=>{const list=rows('journal').filter(x=>x.date<today());if(!list.length)return A.toast('過去の日記がありません');A.actions.evJournalEdit({dataset:{id:list[Math.floor(Math.random()*list.length)].id}});};

  // 36–40: whole-shelf search, sorting, deadlines with daily page plans,
  // monthly reading statistics, and searching quotations across books.
  let bookQuery='',bookSort='title',readingMonth=month(),quoteQuery='';
  function deadlineText(x) {
    if(!x.deadline)return '読了目標を設定';
    const remaining=Math.max(0,x.total-x.page);
    if(!remaining)return '読了済み · 目標 '+x.deadline;
    const days=Math.floor((Date.parse(x.deadline+'T00:00:00Z')-Date.parse(today()+'T00:00:00Z'))/86400000)+1;
    return days>0?`${x.deadline}まで · 1日${Math.ceil(remaining/days)}ページ`:`${x.deadline} 期限超過 · 残り${remaining}ページ`;
  }
  function readingSummary() {
    const sessions=rows('readingSessions').filter(x=>x.date.startsWith(readingMonth));
    return `<div class="fr-metrics">${metric('読んだページ',sum(sessions,x=>Math.max(0,x.to-x.from))+'ページ')}${metric('読書時間',sum(sessions,x=>x.minutes)+'分')}${metric('記録した日',new Set(sessions.map(x=>x.date)).size+'日')}${metric('読んだ本',new Set(sessions.map(x=>x.bookId)).size+'冊')}</div><p class="ep-muted">「読書を記録」の履歴を集計。進捗だけの更新は含みません。</p>`;
  }
  function renderReading() {
    page('reading','本を探す・計画する',`${A.search('fr-book-query','書名・著者・読書メモを検索')}${select('並び順','book-sort',[['title','書名順'],['author','著者順'],['progress','進捗が高い順']],bookSort)}
      ${details('月の読書記録',field('集計月','reading-month',readingMonth,'month')+'<div id="fr-reading-summary">'+readingSummary()+'</div>')}
      ${details('すべての本から引用を探す',A.search('fr-quote-query','引用・書名・著者を検索')+'<div id="fr-quote-results"></div>')}
      <div id="fr-book-results"></div>`);
    const render=()=>{
      const list=rows('reading').filter(x=>normalize([x.title,x.author,x.note].join(' ')).includes(normalize(bookQuery))).sort((a,b)=>bookSort==='progress'?b.page/b.total-a.page/a.total:bookSort==='author'?(a.author||'').localeCompare(b.author||'','ja')||a.title.localeCompare(b.title,'ja'):a.title.localeCompare(b.title,'ja'));
      $('#fr-book-results').innerHTML=list.map(x=>`<article class="ev-card fr-book"><button class="ep-summary" data-action="evBookOpen" data-id="${esc(x.id)}"><strong>${esc(x.title)}</strong><span>${esc(x.author)} · ${x.page}/${x.total}ページ</span></button>${button('frBookDeadline',deadlineText(x),x.id)}</article>`).join('')||empty('該当する本はありません');
    };
    const quotes=()=>{
      const books=new Map(rows('reading').map(x=>[x.id,x]));
      const matches=rows('readingQuotes').filter(x=>books.has(x.bookId)&&normalize(x.text+' '+books.get(x.bookId).title+' '+books.get(x.bookId).author).includes(normalize(quoteQuery)));
      $('#fr-quote-results').innerHTML=matches.map(x=>`<button class="ep-summary" data-action="evBookOpen" data-id="${esc(x.bookId)}"><strong class="ep-note">${esc(x.text)}</strong><small>${esc(books.get(x.bookId).title)}${x.page?' · p.'+x.page:''}</small></button>`).join('')||empty('引用はありません');
    };
    $('#fr-book-query').value=bookQuery;$('#fr-book-query').oninput=e=>{bookQuery=e.target.value;render();};$('#fr-book-sort').onchange=e=>{bookSort=e.target.value;render();};
    $('#fr-reading-month').onchange=e=>{if(validMonth(e.target.value)){readingMonth=e.target.value;$('#fr-reading-summary').innerHTML=readingSummary();}};
    $('#fr-quote-query').value=quoteQuery;$('#fr-quote-query').oninput=e=>{quoteQuery=e.target.value;quotes();};render();quotes();
  }
  A.actions.frReading=renderReading;
  A.actions.frBookDeadline=el=>{const x=rows('reading').find(x=>x.id===el.dataset.id);if(!x)return;A.form('読了目標',field('読み終えたい日（空欄で解除）','deadline',x.deadline||'','date',`min="${today()}"`),v=>{
    if(v.deadline&&(!validDate(v.deadline)||v.deadline<today()))return false;
    return save('reading',rows('reading').map(b=>b.id===x.id?{...b,deadline:v.deadline}:b),renderReading);
  });};

  // 41–45: archive/restore, duplicate with empty history, reorder,
  // CSV history export and a monthly cross-habit summary.
  let habitMonth=month();
  function habitSummary() {
    const habits=rows('habits'),counts=habits.map(x=>({name:x.name,count:new Set(x.days.filter(d=>d.startsWith(habitMonth)&&d<=today())).size}));
    return `<div class="fr-metrics">${metric('達成の合計',sum(counts,x=>x.count)+'回')}${metric('取り組んだ日',new Set(habits.flatMap(x=>x.days).filter(d=>d.startsWith(habitMonth)&&d<=today())).size+'日')}</div>${counts.map(x=>`<div class="fr-count-row"><span>${esc(x.name)}</span><strong>${x.count}日</strong></div>`).join('')||empty('習慣を追加すると表示します')}<p class="ep-muted">現在取り組んでいる習慣の記録を集計します。</p>`;
  }
  function renderHabits() {
    const list=rows('habits'),archive=rows('habitArchive');
    page('habits','習慣を整理する',`${details('月のまとめ',field('集計月','habit-month',habitMonth,'month')+'<div id="fr-habit-summary">'+habitSummary()+'</div>',true)}
      ${section('取り組んでいる習慣',list.map((x,i)=>`<article class="ev-card fr-habit"><strong>${esc(x.name)}</strong><div class="ep-actions">${button('frHabitMove','↑',x.id,`data-offset="-1" aria-label="上へ移動" ${i===0?'disabled':''}`)}${button('frHabitMove','↓',x.id,`data-offset="1" aria-label="下へ移動" ${i===list.length-1?'disabled':''}`)}${button('frHabitDuplicate','複製',x.id)}${button('frHabitArchive','休止',x.id)}</div></article>`).join('')||empty('取り組んでいる習慣はありません'))}
      ${details('休止中の習慣（'+archive.length+'件）',archive.map(x=>`<div class="fr-count-row"><span>${esc(x.name)}<small>${new Set(x.days).size}日分の記録を保持</small></span>${button('frHabitRestore','再開',x.id)}</div>`).join('')||empty('休止中の習慣はありません'))}
      ${button('frHabitExport','すべての達成履歴をCSVで保存')}<p class="ep-muted">休止すると日々の一覧から隠れ、記録は保持されます。再開すると元の記録で戻ります。</p>`);
    $('#fr-habit-month').onchange=e=>{if(validMonth(e.target.value)){habitMonth=e.target.value;$('#fr-habit-summary').innerHTML=habitSummary();}};
  }
  A.actions.frHabits=renderHabits;
  A.actions.frHabitMove=el=>{const list=rows('habits'),index=list.findIndex(x=>x.id===el.dataset.id),next=index+Number(el.dataset.offset);if(index<0||next<0||next>=list.length)return;[list[index],list[next]]=[list[next],list[index]];save('habits',list,renderHabits);};
  A.actions.frHabitDuplicate=el=>{const x=rows('habits').find(x=>x.id===el.dataset.id);if(!x)return;A.form('習慣を複製',field('新しい名前','name',(x.name+' コピー').slice(0,60),'text','required maxlength="60"'),v=>{if(!v.name.trim())return false;return save('habits',[...rows('habits'),{...x,id:A.id(),name:v.name.trim(),days:[]}],renderHabits);});};
  A.actions.frHabitArchive=el=>{const x=rows('habits').find(x=>x.id===el.dataset.id);if(!x)return;A.confirm('この習慣を休止？','記録を残して日々の一覧から隠します。',()=>{if(A.saveBatch({habits:rows('habits').filter(h=>h.id!==x.id),habitArchive:[{...x,archivedAt:Date.now()},...rows('habitArchive').filter(h=>h.id!==x.id)]}))renderHabits();});};
  A.actions.frHabitRestore=el=>{const x=rows('habitArchive').find(x=>x.id===el.dataset.id);if(!x)return;if(rows('habits').some(h=>h.id===x.id))return A.toast('この習慣はすでに取り組み中です');const {archivedAt,...habit}=x;if(A.saveBatch({habits:[...rows('habits'),habit],habitArchive:rows('habitArchive').filter(h=>h.id!==x.id)}))renderHabits();};
  A.actions.frHabitExport=()=>csv('aura-habits.csv',[['習慣','状態','達成した日'],...[...rows('habits').map(x=>({...x,status:'取り組み中'})),...rows('habitArchive').map(x=>({...x,status:'休止中'}))].flatMap(x=>x.days.length?[...new Set(x.days)].sort().map(date=>[x.name,x.status,date]):[[x.name,x.status,'記録なし']])]);

  // 46–50: searchable full history, range CSV, manual entries,
  // history correction/deletion and week/month comparisons.
  let focusQuery='',focusFrom='',focusTo='';
  const focusRangeValid=()=> (!focusFrom||validDate(focusFrom))&&(!focusTo||validDate(focusTo))&&(!focusFrom||!focusTo||focusFrom<=focusTo);
  const focusRows=()=>!focusRangeValid()?[]:rows('focusHistory').filter(x=>(!focusFrom||x.date>=focusFrom)&&(!focusTo||x.date<=focusTo)&&normalize(x.label).includes(normalize(focusQuery))).sort((a,b)=>b.date.localeCompare(a.date));
  function focusComparisons() {
    const history=rows('focusHistory'),now=today(),date=new Date(now+'T12:00:00');
    const shifted=offset=>{const d=new Date(date);d.setDate(d.getDate()+offset);return day(d);};
    const thisStart=shifted(-6),lastStart=shifted(-13),lastEnd=shifted(-7),currentMonth=month();
    const previous=new Date(date);previous.setDate(1);previous.setMonth(previous.getMonth()-1);const previousMonth=day(previous).slice(0,7);
    const mins=filter=>sum(history.filter(filter),x=>x.minutes),week=mins(x=>x.date>=thisStart&&x.date<=now),previousWeek=mins(x=>x.date>=lastStart&&x.date<=lastEnd);
    const monthly=mins(x=>x.date.startsWith(currentMonth)&&x.date<=now),previousMonthly=mins(x=>x.date.startsWith(previousMonth));
    return `<div class="fr-metrics">${metric('直近7日',week+'分')}${metric('その前の7日',previousWeek+'分')}${metric('今月（今日まで）',monthly+'分')}${metric('前月（全日）',previousMonthly+'分')}</div><p class="ep-muted">直近7日間の差：${week-previousWeek>=0?'+':''}${week-previousWeek}分。手入力・修正後の記録も含みます。</p>`;
  }
  function renderFocus() {
    page('focus','集中の履歴',`${details('週・月の振り返り',focusComparisons(),true)}${A.search('fr-focus-query','集中した内容を検索')}
      <div class="fr-date-range">${field('開始日','focus-from',focusFrom,'date')}${field('終了日','focus-to',focusTo,'date')}</div>
      <div class="ep-actions">${button('frFocusAdd','手入力で記録')}${button('frFocusExport','表示中をCSV保存')}${button('frFocusAll','全期間に戻す')}</div><p class="ep-muted" id="fr-focus-count" role="status"></p><div class="ev-card" id="fr-focus-results"></div>`);
    const render=()=>{
      const list=focusRows();$('#fr-focus-count').textContent=focusRangeValid()?`${list.length}件 · 合計 ${sum(list,x=>x.minutes)}分`:'開始日と終了日の順序を確認してください';
      $('#fr-focus-results').innerHTML=list.map(x=>`<button class="ev-row ev-wide" data-action="frFocusEdit" data-id="${esc(x.id)}"><span class="ev-grow"><strong>${esc(x.label||'集中')}</strong><small>${esc(x.date)} · ${x.source==='manual'?'手入力':'タイマー'}${x.edited?' · 修正済み':''}</small></span><strong>${x.minutes}分</strong></button>`).join('')||empty('該当する記録はありません');
    };
    $('#fr-focus-query').value=focusQuery;$('#fr-focus-query').oninput=e=>{focusQuery=e.target.value;render();};
    $('#fr-focus-from').onchange=e=>{focusFrom=e.target.value;render();};$('#fr-focus-to').onchange=e=>{focusTo=e.target.value;render();};render();
  }
  const focusEditable=id=>{if(A.load('focusSession',null)?.id===id){A.toast('このタイマーの終了処理後に編集してください');return false;}return true;};
  function focusEditor(id) {
    const x=id?rows('focusHistory').find(x=>x.id===id):null;if(id&&(!x||!focusEditable(id)))return;
    if(!x&&rows('focusHistory').length>=3650)return A.toast('記録は3650件までです。CSV保存後に不要な記録を削除してください');
    A.form(x?'集中記録を修正':'集中を手入力',field('日付','date',x?.date||today(),'date',`required max="${today()}"`)+field('集中時間（分）','minutes',x?.minutes||25,'number','required min="1" max="1440" step="1"')+field('内容','label',x?.label||'','text','maxlength="100"')+(x?button('frFocusDelete','この記録を削除',x.id):''),v=>{
      const minutes=Number(v.minutes);if(!validDate(v.date)||v.date>today()||!Number.isSafeInteger(minutes)||minutes<1||minutes>1440)return false;
      const next={...x,id:x?.id||A.id(),date:v.date,minutes,label:v.label.trim(),source:x?.source||(x?'timer':'manual'),edited:!!x};
      const list=rows('focusHistory');if(!x&&list.length>=3650)return false;
      return save('focusHistory',x?list.map(h=>h.id===id?next:h):[next,...list],renderFocus);
    });
  }
  A.actions.frFocus=renderFocus;A.actions.frFocusAdd=()=>focusEditor();A.actions.frFocusEdit=el=>focusEditor(el.dataset.id);
  A.actions.frFocusAll=()=>{focusFrom='';focusTo='';focusQuery='';renderFocus();};
  A.actions.frFocusDelete=el=>{if(!focusEditable(el.dataset.id))return;A.confirm('集中記録を削除？','集中時間の集計からも除かれます。',()=>save('focusHistory',rows('focusHistory').filter(x=>x.id!==el.dataset.id),renderFocus));};
  A.actions.frFocusExport=()=>{if(!focusRangeValid())return A.toast('日付の範囲を確認');csv('aura-focus-history.csv',[['日付','分','内容','記録方法','修正'],...focusRows().map(x=>[x.date,x.minutes,x.label||'',x.source==='manual'?'手入力':'タイマー',x.edited?'修正済み':''])]);};
})();
