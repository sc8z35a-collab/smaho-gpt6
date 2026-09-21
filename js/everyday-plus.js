'use strict';
// Everyday 4.4: five existing apps, six user-facing improvements each.
// Existing storage and action names remain shared with search and handoffs.
(() => {
  const A = window.Aura, $ = A.$, esc = A.escape;
  const rows = key => { const value = A.load(key, []); return Array.isArray(value) ? value : []; };
  const day = (date = new Date()) => `${String(date.getFullYear()).padStart(4,'0')}-${String(date.getMonth()+1).padStart(2,'0')}-${String(date.getDate()).padStart(2,'0')}`;
  const shiftDay = (value, offset) => { const date = new Date(value+'T12:00:00'); date.setDate(date.getDate()+offset); return day(date); };
  const validDay = value => /^\d{4}-\d{2}-\d{2}$/.test(value) && value>='0001-01-01' && day(new Date(value+'T12:00:00')) === value;
  const money = value => '¥'+Math.round(value).toLocaleString('ja-JP');
  const empty = text => `<p class="ev-empty">${esc(text)}</p>`;
  const button = (action, label, id = '', extra = '') => `<button type="button" class="ep-button" data-action="${action}" data-id="${esc(id)}" ${extra}>${esc(label)}</button>`;
  const iconButton = (action, label, icon, id = '') => `<button class="ev-icon-button" data-action="${action}" data-id="${esc(id)}" aria-label="${esc(label)}" title="${esc(label)}">${A.icon(icon)}</button>`;
  const field = (label, name, value = '', type = 'text', attrs = '') => `<label class="form-label" for="ep-${name}">${esc(label)}</label><input class="text-input" id="ep-${name}" name="${name}" type="${type}" value="${esc(value)}" ${attrs}>`;
  const area = (label, name, value = '', max = 4000) => `<label class="form-label" for="ep-${name}">${esc(label)}</label><textarea class="text-input" id="ep-${name}" name="${name}" rows="4" maxlength="${max}">${esc(value)}</textarea>`;
  const select = (label, name, options, value) => `<label class="form-label" for="ep-${name}">${esc(label)}</label><select class="text-input" id="ep-${name}" name="${name}">${options.map(([id,text])=>`<option value="${esc(id)}" ${String(id)===String(value)?'selected':''}>${esc(text)}</option>`).join('')}</select>`;
  const section = (title, content) => `<section class="ep-section"><h3>${esc(title)}</h3>${content}</section>`;
  const details = (title, content) => `<details class="ep-details"><summary>${esc(title)}</summary><div>${content}</div></details>`;
  const tabs = (options, current, action) => `<div class="ev-chips">${options.map(([id,label])=>button(action,label,id,`aria-pressed="${id===current}"`)).join('')}</div>`;
  const page = (id, html, right = '', back = '') => A.view(A.nav(A.apps[id].name,right,back,back?'一覧':'')+`<div class="app-content everyday everyday-plus ev-${id}">${html}</div>`);
  const download = (name, text, type = 'text/plain') => A.download(new Blob([text],{type:type+';charset=utf-8'}),name);
  const copy = async text => { try { await navigator.clipboard.writeText(text); A.toast('コピー済み'); } catch { A.form('コピーする内容',area('選択してコピー','copy',text,20000),()=>{},'閉じる'); $('#ep-copy').readOnly=true; $('#ep-copy').select(); } };
  const save = (key, list, render) => { if(!A.save(key,list))return false; render?.(); return true; };
  const put = (key, record, render) => { const list=rows(key),index=list.findIndex(x=>x.id===record.id); if(index<0)list.unshift(record);else list[index]=record;return save(key,list,render); };
  const integer = (value, min, max) => Number.isSafeInteger(Number(value)) && Number(value)>=min && Number(value)<=max;
  const normalize = value => String(value||'').normalize('NFKC').trim().toLocaleLowerCase('ja-JP');

  // 01–06: contact groups, favorites filter, sorting, duplicate hints,
  // copying one card, and exporting only the visible selection.
  let contactGroup='*',contactFilter='all',contactSort='favorite',contactQuery='';
  const phoneKey = value => normalize(value).replace(/[\s()\-]/g,'');
  function duplicateIds() {
    const keys=new Map(), duplicates=new Set();
    for(const contact of rows('contacts')) {
      for(const key of [contact.phone?'tel:'+phoneKey(contact.phone):'',contact.email?'mail:'+normalize(contact.email):''].filter(Boolean)) {
        if(keys.has(key)){duplicates.add(keys.get(key));duplicates.add(contact.id);}else keys.set(key,contact.id);
      }
    }
    return duplicates;
  }
  const contactGroups = () => [...new Set(rows('contacts').map(x=>x.group).filter(Boolean))].sort((a,b)=>a.localeCompare(b,'ja'));
  function visibleContacts() {
    const duplicates=duplicateIds();
    return rows('contacts').filter(x=>(contactGroup==='*'||(x.group||'')===contactGroup)
      && (contactFilter==='all'||(contactFilter==='favorites'?x.favorite:duplicates.has(x.id)))
      && normalize([x.name,x.phone,x.email,x.note,x.group].join(' ')).includes(normalize(contactQuery)))
      .sort((a,b)=>(contactSort==='favorite'?Number(!!b.favorite)-Number(!!a.favorite):0)||a.name.localeCompare(b.name,'ja'));
  }
  function renderContacts() {
    if(contactGroup!=='*' && contactGroup!=='' && !contactGroups().includes(contactGroup))contactGroup='*';
    page('contacts',`${A.search('ep-contact-query','名前・番号・メモを検索')}
      ${tabs([['all','すべて'],['favorites','お気に入り'],['duplicates','重複候補']],contactFilter,'epContactFilter')}
      <div class="ep-two">${select('グループ','contact-group',[['*','すべて'],['','未分類'],...contactGroups().map(x=>[x,x])],contactGroup)}${select('並び順','contact-sort',[['favorite','お気に入り順'],['name','名前順']],contactSort)}</div>
      <p class="ep-muted" id="ep-contact-count"></p><div class="ev-card" id="ep-contact-results"></div>
      ${details('書き出し',button('epContactExport','表示中の連絡先を書き出す')+button('evContactsExport','すべて書き出す'))}`,
      iconButton('evContactEdit','連絡先を追加','plus'));
    const render=()=>{
      const list=visibleContacts(),duplicates=duplicateIds();
      $('#ep-contact-count').textContent=`${list.length}件`+(contactFilter==='duplicates'?' · 同じ番号またはメール。自動統合しません。':'');
      $('#ep-contact-results').innerHTML=list.map(x=>`<button class="ev-row ev-wide" data-action="evContactOpen" data-id="${esc(x.id)}"><span class="ev-avatar">${esc(Array.from(x.name)[0])}</span><span class="ev-grow"><strong>${esc(x.name)}${x.favorite?' ★':''}</strong><small>${esc(x.group||'未分類')} · ${esc(x.phone||x.email||'連絡先未入力')}${duplicates.has(x.id)?' · 重複候補':''}</small></span>${A.icon('arrow')}</button>`).join('')||empty('該当する連絡先はありません');
    };
    $('#ep-contact-query').value=contactQuery;
    $('#ep-contact-query').oninput=e=>{contactQuery=e.target.value;render();};
    $('#ep-contact-group').onchange=e=>{contactGroup=e.target.value;render();};
    $('#ep-contact-sort').onchange=e=>{contactSort=e.target.value;render();};
    render();
  }
  A.apps.contacts.render=renderContacts; A.actions.evContactsHome=renderContacts;
  A.actions.epContactFilter=el=>{contactFilter=el.dataset.id;renderContacts();};
  A.actions.evContactEdit=(el={dataset:{}})=>{
    const x=rows('contacts').find(x=>x.id===el.dataset.id);
    A.form(x?'連絡先を編集':'連絡先を追加',field('名前','name',x?.name||'','text','required maxlength="80"')+
      field('電話番号','phone',x?.phone||'','tel','maxlength="24"')+field('メール','email',x?.email||'','email','maxlength="254"')+
      field('グループ','group',x?.group||'','text','maxlength="40" list="ep-contact-groups" placeholder="家族・友人・仕事など"')+
      `<datalist id="ep-contact-groups">${contactGroups().map(group=>`<option value="${esc(group)}"></option>`).join('')}</datalist>`+area('メモ','note',x?.note||'',12000),v=>{
        if(!v.name.trim())return false;
        if(v.phone&&!/^\+?[0-9]{3,15}$/.test(phoneKey(v.phone))){A.toast('電話番号を確認');return false;}
        if(v.group.trim()==='*'){A.toast('別のグループ名を入力');return false;}
        return put('contacts',{...x,...v,id:x?.id||A.id(),name:v.name.trim(),group:v.group.trim(),favorite:x?.favorite||false},renderContacts);
      });
  };
  A.actions.evContactOpen=el=>{
    const x=rows('contacts').find(x=>x.id===el.dataset.id);if(!x)return;
    const phone=phoneKey(x.phone),validPhone=/^\+?[0-9]{3,15}$/.test(phone);
    page('contacts',`<div class="ev-contact-hero"><span class="ev-avatar">${esc(Array.from(x.name)[0])}</span><h1>${esc(x.name)}</h1><p class="ep-muted">${esc(x.group||'未分類')}</p>${button('evContactFavorite',x.favorite?'★ お気に入り':'☆ お気に入り',x.id,`aria-pressed="${!!x.favorite}"`)}</div>
      <div class="ev-contact-actions">${validPhone?`<a href="tel:${esc(phone)}">${A.icon('phone')}電話</a><a href="sms:${esc(phone)}">${A.icon('messages')}SMS</a>`:''}${x.email?`<a href="mailto:${esc(encodeURIComponent(x.email))}">${A.icon('mail')}メール</a>`:''}</div>
      <div class="ev-card ev-contact-info"><p>${esc(x.phone)}</p><p>${esc(x.email)}</p><p>${esc(x.note)}</p></div>
      <p class="ev-caption">発信・送信は移動先で確認</p>${button('epContactCopy','連絡先をコピー',x.id)}
      ${details('管理',button('evContactDelete','連絡先を削除',x.id))}`,
      iconButton('evContactEdit','連絡先を編集','edit',x.id),'evContactsHome');
  };
  A.actions.evContactFavorite=el=>{const x=rows('contacts').find(x=>x.id===el.dataset.id);if(x)put('contacts',{...x,favorite:!x.favorite},()=>A.actions.evContactOpen(el));};
  A.actions.evContactDelete=el=>A.confirm('連絡先を削除？','この連絡先を削除します。',()=>save('contacts',rows('contacts').filter(x=>x.id!==el.dataset.id),renderContacts));
  A.actions.epContactCopy=el=>{const x=rows('contacts').find(x=>x.id===el.dataset.id);if(x)copy([x.name,x.phone,x.email,x.group,x.note].filter(Boolean).join('\n'));};
  const vcf = value => String(value||'').replace(/\\/g,'\\\\').replace(/\r\n|\r|\n/g,'\\n').replace(/[,;]/g,'\\$&');
  function exportContacts(list) {
    if(!list.length)return A.toast('書き出す連絡先がありません');
    download('aura-contacts.vcf',list.map(x=>['BEGIN:VCARD','VERSION:3.0','FN:'+vcf(x.name),'N:'+vcf(x.name)+';;;;','TEL:'+vcf(x.phone),'EMAIL:'+vcf(x.email),'CATEGORIES:'+vcf(x.group),'NOTE:'+vcf(x.note),'END:VCARD'].join('\r\n')).join('\r\n')+'\r\n','text/vcard');
  }
  A.actions.epContactExport=()=>exportContacts(visibleContacts());
  A.actions.evContactsExport=()=>exportContacts(rows('contacts'));

  // 07–12: time, energy, pressure, saved conversion presets,
  // reusable history and display precision. Conversion remains offline.
  const units=A.everydayUnits;
  Object.assign(units,{
    time:{name:'時間',units:{s:['秒',1],min:['分',60],h:['時間',3600],d:['日',86400],week:['週',604800]}},
    energy:{name:'エネルギー',units:{j:['J',1],kj:['kJ',1000],cal:['cal（熱化学）',4.184],kcal:['kcal',4184],wh:['Wh',3600],kwh:['kWh',3600000]}},
    pressure:{name:'圧力',units:{pa:['Pa',1],hpa:['hPa',100],kpa:['kPa',1000],bar:['bar',100000],atm:['atm',101325],psi:['psi',6894.757293168]}}
  });
  let conversion={category:'length',from:'m',to:'km',value:'1'},precision=Number(A.load('conversionPrecision',8));
  if(![4,8,12].includes(precision))precision=8;
  function conversionValue() {
    const {category,from,to,value}=conversion;
    if(!String(value).trim()||!Number.isFinite(Number(value)))return null;
    const number=Number(value);
    if(category==='temperature' && (from==='k'?number:from==='f'?(number-32)*5/9+273.15:number+273.15)<-1e-10)return null;
    const result=A.everydayMath.convert(number,category,from,to);
    return Number.isFinite(result)?result:null;
  }
  function conversionText() {
    const result=conversionValue();
    return result===null?'—':Number(result.toPrecision(precision)).toLocaleString('ja-JP',{maximumSignificantDigits:precision})+' '+units[conversion.category].units[conversion.to][0];
  }
  const conversionLabel = x => `${x.value} ${units[x.category].units[x.from][0]} → ${units[x.category].units[x.to][0]}`;
  const savedConversions = key => rows(key).filter(x=>units[x.category]?.units[x.from]&&units[x.category]?.units[x.to]&&Number.isFinite(Number(x.value)));
  function conversionSaved(key, action, removeAction) {
    return savedConversions(key).map(x=>`<div class="ep-saved-row">${button(action,conversionLabel(x),x.id)}${iconButton(removeAction,'削除','trash',x.id)}</div>`).join('')||empty('まだ保存していません');
  }
  function renderConverter() {
    const options=Object.entries(units[conversion.category].units).map(([id,[label]])=>[id,label]);
    page('converter',`${select('種類','unit-category',Object.entries(units).map(([id,x])=>[id,x.name]),conversion.category)}
      <div class="ev-converter">${field('数値','unit-value',conversion.value,'number','step="any"')}${select('変換元','unit-from',options,conversion.from)}
      ${button('evUnitSwap','↑↓ 単位を入れ替え')}${select('変換先','unit-to',options,conversion.to)}
      <output id="ev-unit-result" aria-live="polite"></output><p class="ep-muted" id="ep-unit-hint"></p>
      <div class="ep-actions">${button('evUnitCopy','結果をコピー')}${button('epConversionRecord','履歴に残す')}</div></div>
      ${details('よく使う換算',button('epConversionPreset','この換算を登録')+conversionSaved('conversionPresets','epConversionUsePreset','epConversionRemovePreset'))}
      ${details('保存した履歴（30件まで）',conversionSaved('conversionHistory','epConversionUseHistory','epConversionRemoveHistory'))}
      ${details('表示の設定',select('有効数字','unit-precision',[[4,'4桁'],[8,'8桁'],[12,'12桁']],precision))}`);
    $('#ep-unit-category').onchange=e=>A.actions.evUnitCategory({dataset:{id:e.target.value}});
    ['value','from','to'].forEach(key=>$('#ep-unit-'+key).oninput=e=>{conversion[key]=e.target.value;updateConversion();});
    $('#ep-unit-precision').onchange=e=>{const next=Number(e.target.value);if(A.save('conversionPrecision',next)){precision=next;updateConversion();}else e.target.value=precision;};
    updateConversion();
  }
  function updateConversion() {
    $('#ev-unit-result').textContent=conversionText();
    $('#ep-unit-hint').textContent=conversionValue()===null?'数値を確認してください。温度は絶対零度以上を入力。':'';
  }
  A.apps.converter.render=renderConverter;
  A.actions.evUnitCategory=el=>{const category=el.dataset.id;if(!units[category])return;const keys=Object.keys(units[category].units);conversion={category,from:keys[0],to:keys[1],value:conversion.value};renderConverter();};
  A.actions.evUnitSwap=()=>{[conversion.from,conversion.to]=[conversion.to,conversion.from];renderConverter();};
  A.actions.evUnitCopy=()=>{if(conversionValue()!==null)copy(conversionText());else A.toast('数値を確認');};
  function storeConversion(key, limit) {
    if(conversionValue()===null)return A.toast('数値を確認');
    const list=savedConversions(key),same=x=>x.category===conversion.category&&x.from===conversion.from&&x.to===conversion.to&&x.value===conversion.value;
    if(key==='conversionPresets'&&list.length>=limit&&!list.some(same))return A.toast('登録は20件までです');
    if(save(key,[{...conversion,id:A.id()},...list.filter(x=>!same(x))].slice(0,limit),renderConverter))A.toast('保存済み');
  }
  A.actions.epConversionRecord=()=>storeConversion('conversionHistory',30);
  A.actions.epConversionPreset=()=>storeConversion('conversionPresets',20);
  for(const [suffix,key] of [['Preset','conversionPresets'],['History','conversionHistory']]) {
    A.actions['epConversionUse'+suffix]=el=>{const x=savedConversions(key).find(x=>x.id===el.dataset.id);if(x){conversion={category:x.category,from:x.from,to:x.to,value:x.value};renderConverter();}};
    A.actions['epConversionRemove'+suffix]=el=>save(key,rows(key).filter(x=>x.id!==el.dataset.id),renderConverter);
  }

  // 13–18: task search, selectable sorting, notes, checklists,
  // duplication and one-day postponement; one canonical reminder model.
  let reminderFilter='all',reminderSort='priority',reminderQuery='';
  const reminders=()=>A.reminderModel.get();
  const replaceReminders=list=>{if(!A.reminderModel.replace(list))return false;renderReminders();return true;};
  function renderReminders() {
    const list=reminders(),done=list.filter(x=>x.done).length;
    page('reminders',`<div class="ev-hero sage"><span>完了したタスク</span><strong>${done}<small> / ${list.length}</small></strong></div>
      ${A.search('ep-reminder-query','タスク・メモ・手順を検索')}${tabs([['all','すべて'],['pending','未完了'],['today','今日まで'],['done','完了']],reminderFilter,'reminderFilter')}
      ${select('並び順','reminder-sort',[['priority','優先度順'],['due','期限順'],['name','名前順']],reminderSort)}
      <div class="ev-card" id="ep-reminder-results"></div>
      <form class="add-inline" id="reminder-form"><input class="text-input" name="text" required maxlength="100" placeholder="タスクを追加" aria-label="タスクを追加"><button type="submit" aria-label="追加">+</button></form>
      ${done?details('整理',button('reminderClearDone','完了済みを削除')):''}`,iconButton('reminderDetails','タスクを追加','plus'));
    const render=()=>{
      const visible=reminders().filter(x=>(reminderFilter==='all'||(reminderFilter==='done'?x.done:reminderFilter==='today'?!x.done&&x.due&&x.due<=day():!x.done))&&normalize([x.text,x.note,...(x.steps||[]).map(s=>s.text)].join(' ')).includes(normalize(reminderQuery)))
        .sort((a,b)=>Number(a.done)-Number(b.done)||(reminderSort==='name'?a.text.localeCompare(b.text,'ja'):reminderSort==='due'?(a.due||'9999').localeCompare(b.due||'9999'):Number(!!b.priority)-Number(!!a.priority))||(a.due||'9999').localeCompare(b.due||'9999'));
      $('#ep-reminder-results').innerHTML=visible.map(x=>`<div class="ev-row ${x.done?'ev-done':''}"><button class="check-circle ${x.done?'checked':''}" data-action="reminderToggle" data-id="${esc(x.id)}" aria-label="${esc(x.text)}を${x.done?'未完了に戻す':'完了する'}" aria-pressed="${!!x.done}">${x.done?'✓':''}</button><button class="ev-grow ev-plain" data-action="epReminderOpen" data-id="${esc(x.id)}"><strong>${esc(x.text)}</strong><small>${x.priority?'優先 · ':''}${esc(x.due||'期限なし')}${x.due<day()&&!x.done?' · 期限超過':''}${x.steps?.length?` · 手順 ${x.steps.filter(s=>s.done).length}/${x.steps.length}`:''}</small></button></div>`).join('')||empty('該当するタスクはありません');
    };
    $('#ep-reminder-query').value=reminderQuery;$('#ep-reminder-query').oninput=e=>{reminderQuery=e.target.value;render();};
    $('#ep-reminder-sort').onchange=e=>{reminderSort=e.target.value;render();};
    $('#reminder-form').onsubmit=e=>{e.preventDefault();const text=e.currentTarget.elements.text.value.trim();if(text)replaceReminders([...reminders(),{id:A.id(),text,done:false}]);};
    render();
  }
  A.apps.reminders.render=renderReminders;A.actions.epRemindersHome=renderReminders;
  A.actions.reminderFilter=el=>{reminderFilter=el.dataset.id||el.dataset.value;renderReminders();};
  A.actions.reminderToggle=el=>replaceReminders(reminders().map(x=>x.id===el.dataset.id?{...x,done:!x.done}:x));
  A.actions.reminderDelete=el=>A.confirm('タスクを削除？','メモと手順も削除します。',()=>replaceReminders(reminders().filter(x=>x.id!==el.dataset.id)));
  A.actions.reminderClearDone=()=>A.confirm('完了済みを削除？','未完了のタスクは残ります。',()=>replaceReminders(reminders().filter(x=>!x.done)));
  A.actions.reminderDetails=(el={dataset:{}})=>{
    const x=reminders().find(x=>x.id===el.dataset.id);
    A.form(x?'タスクを編集':'タスクを追加',field('タスク','text',x?.text||'','text','required maxlength="100"')+field('期限','due',x?.due||'','date')+
      select('優先度','priority',[['0','通常'],['1','優先']],x?.priority?'1':'0')+area('メモ','note',x?.note||'')+
      area('手順（1行ずつ・30件まで）','steps',(x?.steps||[]).map(s=>s.text).join('\n'),5000),
      v=>{
        if(!v.text.trim()||(v.due&&!validDay(v.due)))return false;
        const lines=v.steps.split(/\r?\n/).map(s=>s.trim()).filter(Boolean);
        if(lines.length>30||lines.some(s=>s.length>160)){A.toast('手順は30件まで、各160文字以内で入力してください');return false;}
        const unused=[...(x?.steps||[])],steps=lines.map(text=>{const index=unused.findIndex(s=>s.text===text);return index<0?{id:A.id(),text,done:false}:unused.splice(index,1)[0];});
        const next={...x,id:x?.id||A.id(),text:v.text.trim(),due:v.due,priority:v.priority==='1',note:v.note,steps,done:x?.done||false};
        return replaceReminders(x?reminders().map(r=>r.id===x.id?next:r):[...reminders(),next]);
      });
  };
  A.actions.epReminderOpen=el=>{
    const x=reminders().find(x=>x.id===el.dataset.id);if(!x)return;
    page('reminders',`<div class="ev-heading"><span>${esc(x.due||'期限なし')}${x.priority?' · 優先':''}</span><h1>${esc(x.text)}</h1></div>
      ${button('epReminderComplete',x.done?'未完了に戻す':'タスクを完了',x.id)}<p class="ep-note">${esc(x.note||'メモはありません')}</p>
      ${section('手順',`<div class="ev-card">${(x.steps||[]).map(s=>`<div class="ev-row"><button class="check-circle ${s.done?'checked':''}" data-action="epReminderStep" data-id="${esc(x.id)}" data-step="${esc(s.id)}" aria-label="${esc(s.text)}" aria-pressed="${!!s.done}">${s.done?'✓':''}</button><span>${esc(s.text)}</span></div>`).join('')||empty('編集から手順を追加できます')}</div><p class="ep-muted">手順のチェックとタスク全体の完了は別々に記録します。</p>`)}
      ${details('その他の操作',button('epReminderPostpone','期限を1日延ばす',x.id)+button('epReminderDuplicate','複製する',x.id)+button('reminderDelete','削除する',x.id))}`,
      iconButton('reminderDetails','タスクを編集','edit',x.id),'epRemindersHome');
  };
  A.actions.epReminderComplete=el=>{if(A.reminderModel.replace(reminders().map(x=>x.id===el.dataset.id?{...x,done:!x.done}:x)))A.actions.epReminderOpen(el);};
  A.actions.epReminderStep=el=>{if(A.reminderModel.replace(reminders().map(x=>x.id===el.dataset.id?{...x,steps:(x.steps||[]).map(s=>s.id===el.dataset.step?{...s,done:!s.done}:s)}:x)))A.actions.epReminderOpen(el);};
  A.actions.epReminderPostpone=el=>{const x=reminders().find(x=>x.id===el.dataset.id);if(!x)return;const due=shiftDay(x.due&&x.due>=day()?x.due:day(),1);if(!validDay(due))return A.toast('これ以上期限を延ばせません');if(A.reminderModel.replace(reminders().map(r=>r.id===x.id?{...r,due}:r))){A.actions.epReminderOpen(el);A.toast('期限を'+due+'に変更しました');}};
  A.actions.epReminderDuplicate=el=>{const x=reminders().find(x=>x.id===el.dataset.id);if(x&&replaceReminders([...reminders(),{...x,id:A.id(),text:(x.text+' コピー').slice(0,100),done:false,steps:(x.steps||[]).map(s=>({...s,id:A.id(),done:false}))}]))A.toast('未完了のタスクとして複製済み');};

  // 19–24: selected-day dashboard, seven-day outlook, shopping summary,
  // resume reading, daily intention and a shareable agenda text file.
  let dashboardDay=day();
  const dashboardTasks = () => reminders().filter(x=>!x.done&&(!x.due||x.due<=dashboardDay));
  function renderToday() {
    const events=A.todayEvents(dashboardDay).slice().sort((a,b)=>a.time.localeCompare(b.time)),tasks=dashboardTasks(),habits=rows('habits');
    const minutes=rows('focusHistory').filter(x=>x.date===dashboardDay).reduce((n,x)=>n+x.minutes,0),checked=habits.filter(x=>x.days.includes(dashboardDay)).length;
    const shopping=rows('shopping').filter(x=>!x.done),books=rows('reading').filter(x=>x.page>0&&x.page<x.total);
    page('today',`<div class="ev-date-switch">${button('epTodayMove','‹','-1','aria-label="前の日"')}<input type="date" id="ep-today-date" value="${dashboardDay}" aria-label="表示日">${button('epTodayMove','›','1','aria-label="次の日"')}</div>
      ${dashboardDay!==day()?button('epTodayReset','今日に戻る'):''}<div class="ev-heading"><span>${new Date(dashboardDay+'T12:00:00').toLocaleDateString('ja-JP',{month:'long',day:'numeric',weekday:'long'})}</span><h1>${dashboardDay===day()?'今日':'この日のまとめ'}</h1></div>
      <div class="ev-metrics"><button data-app="focus"><strong>${minutes}<small>分</small></strong><span>集中</span></button><button data-app="habits"><strong>${checked}<small>/${habits.length}</small></strong><span>習慣</span></button><button data-app="reminders"><strong>${tasks.length}</strong><span>未完了タスク</span></button></div>
      <p class="ep-muted">タスクは現在の未完了から、表示日までの期限と期限なしを表示。</p>
      <button class="ev-focus-link" data-app="focus">${A.icon('focus')}<span>集中する</span>${A.icon('arrow')}</button>
      <button class="ep-intention" data-action="epTodayIntention"><small>この日のひとこと</small><strong>${esc(rows('dailyIntentions').find(x=>x.date===dashboardDay)?.text||'大切にしたいことを一つ書く')}</strong></button>
      ${section('予定',iconButton('evTodayEvent','予定を追加','plus')+`<div class="ev-card">${events.map(x=>`<button class="ev-timeline" data-action="epTodayEvent" data-id="${esc(x.id)}"><time>${esc(x.time)}</time><span><strong>${esc(x.title)}</strong><small>${esc(x.place)}</small></span>${A.icon('arrow')}</button>`).join('')||empty('予定はありません')}</div>`)}
      ${section('タスク',iconButton('evTodayTask','タスクを追加','plus')+`<div class="ev-card">${tasks.slice(0,8).map(x=>`<div class="ev-row"><button class="check-circle" data-action="evTodayCheck" data-id="${esc(x.id)}" aria-label="${esc(x.text)}を完了"></button><button class="ev-grow ev-plain" data-action="epTodayTask" data-id="${esc(x.id)}"><strong>${esc(x.text)}</strong><small>${esc(x.due||'期限なし')}${x.due&&x.due<dashboardDay?' · 期限超過':''}</small></button></div>`).join('')||empty('すべて完了')}</div>${tasks.length>8?'<button class="ep-button" data-app="reminders">すべてのタスクを見る</button>':''}`)}
      ${details('この日から7日間の予定',Array.from({length:7},(_,i)=>{const date=shiftDay(dashboardDay,i),items=A.todayEvents(date);return `<button class="ep-outlook" data-action="epTodaySelect" data-id="${date}"><time>${esc(date.slice(5))}</time><span>${items.length?esc(items[0].title):'予定なし'}</span><strong>${items.length}件</strong></button>`;}).join(''))}
      ${section('買い物の残り（現在）',`<button class="ep-summary" data-app="shopping"><strong>${shopping.length}品</strong><span>予定額 ${money(shopping.reduce((n,x)=>n+x.quantity*x.price,0))}</span><small>すべてのリストの未購入品</small></button>`)}
      ${section('読書の続き（現在）',books.slice(0,3).map(x=>`<button class="ep-summary" data-action="epTodayBook" data-id="${esc(x.id)}"><strong>${esc(x.title)}</strong><span>${x.page} / ${x.total}ページ · 残り${x.total-x.page}ページ</span></button>`).join('')||'<button class="ep-button" data-app="reading">本棚を開く</button>')}
      ${section('よく使う',`<div class="ev-quick-grid">${['journal','shopping','expenses','reading'].map(id=>`<button data-app="${id}">${A.icon(id)}<span>${A.apps[id].name}</span></button>`).join('')}</div>`)}`,
      iconButton('epTodayExport','この日のまとめを書き出す','download'));
    $('#ep-today-date').onchange=e=>{if(validDay(e.target.value)){dashboardDay=e.target.value;renderToday();}};
  }
  A.apps.today.render=()=>{dashboardDay=day();renderToday();};
  A.actions.epTodayMove=el=>{const next=shiftDay(dashboardDay,Number(el.dataset.id));if(validDay(next)){dashboardDay=next;renderToday();}};
  A.actions.epTodaySelect=el=>{if(validDay(el.dataset.id)){dashboardDay=el.dataset.id;renderToday();}};
  A.actions.epTodayReset=()=>{dashboardDay=day();renderToday();};
  A.actions.evTodayCheck=el=>{if(A.reminderModel.replace(reminders().map(x=>x.id===el.dataset.id?{...x,done:true}:x)))renderToday();};
  A.actions.evTodayCalendar=()=>{A.open('calendar');A.actions.calendarSelect({dataset:{date:dashboardDay}});};
  A.actions.evTodayEvent=()=>{A.open('calendar');A.actions.pdCalendarDayAdd({dataset:{id:dashboardDay}});};
  A.actions.evTodayTask=()=>{A.open('reminders');A.actions.reminderDetails();$('#ep-due').value=dashboardDay;};
  A.actions.epTodayEvent=el=>{A.open('calendar');A.actions.calendarEdit(el);};
  A.actions.epTodayTask=el=>{A.open('reminders');A.actions.epReminderOpen(el);};
  A.actions.epTodayBook=el=>{A.open('reading');A.actions.evBookOpen(el);};
  A.actions.epTodayIntention=()=>A.form('この日のひとこと',field('大切にしたいこと','text',rows('dailyIntentions').find(x=>x.date===dashboardDay)?.text||'','text','maxlength="160"'),v=>{
    const list=rows('dailyIntentions').filter(x=>x.date!==dashboardDay);if(v.text.trim())list.unshift({date:dashboardDay,text:v.text.trim()});
    return save('dailyIntentions',list,renderToday);
  });
  A.actions.epTodayExport=()=>download('aura-'+dashboardDay+'.txt',[dashboardDay,rows('dailyIntentions').find(x=>x.date===dashboardDay)?.text||'','予定',...A.todayEvents(dashboardDay).slice().sort((a,b)=>a.time.localeCompare(b.time)).map(x=>`${x.time} ${x.title}${x.place?' / '+x.place:''}`),'','現在の未完了タスク（表示日までの期限・期限なし）',...dashboardTasks().map(x=>`☐ ${x.text}${x.due?' / '+x.due:''}`)].join('\n'));

  // 25–30: shopping search, sorting, list budgets, purchased subtotal,
  // reusable templates, and undo for item deletion / purchased cleanup.
  let shoppingList='default',shoppingFilter='all',shoppingQuery='',shoppingSort='status',shoppingUndo=null;
  const aisles=[['food','食品'],['daily','日用品'],['other','その他']];
  const shoppingLists=()=>[{id:'default',name:'買い物'},...rows('shoppingLists')];
  const listItems=()=>rows('shopping').filter(x=>(x.listId||'default')===shoppingList);
  const listName=()=>shoppingLists().find(x=>x.id===shoppingList)?.name||'買い物';
  const shoppingBudget=()=>rows('shoppingBudgets').find(x=>x.id===shoppingList)?.amount||0;
  function renderShopping() {
    if(!shoppingLists().some(x=>x.id===shoppingList))shoppingList='default';
    const list=listItems(),pending=list.filter(x=>!x.done),purchased=list.filter(x=>x.done),total=items=>items.reduce((n,x)=>n+x.price*x.quantity,0),budget=shoppingBudget(),combined=total(list);
    page('shopping',`<div class="ev-list-picker"><select id="ev-shopping-list" aria-label="買い物リスト">${shoppingLists().map(x=>`<option value="${esc(x.id)}" ${x.id===shoppingList?'selected':''}>${esc(x.name)}</option>`).join('')}</select>${iconButton('evShoppingListNew','リストを追加','plus')}${iconButton('evShoppingListEdit','リストを編集','edit')}</div>
      <div class="ev-hero sand"><span>買うもの</span><strong>${pending.length}<small>品</small></strong><span>未購入の予定額 ${money(total(pending))}</span><div class="ev-hero-foot"><span>購入済み ${money(total(purchased))}</span><span>全品合計 ${money(combined)}</span></div></div>
      <button class="ev-budget" data-action="epShoppingBudget"><span>このリストの予算</span><strong>${budget?money(budget):'設定する'}</strong></button>
      ${budget?`<p class="ep-budget-state ${combined>budget?'ep-over':''}">${combined>budget?'予算を '+money(combined-budget)+' 超過':'全品購入後の残り '+money(budget-combined)}</p>`:''}<p class="ep-muted">登録した単価×数量の合計です。価格未入力の品は0円で計算。</p>
      ${A.search('ep-shopping-query','このリストの品名を検索')}${tabs([['all','すべて'],['pending','未購入']],shoppingFilter,'evShoppingFilter')}
      ${details('並べ替え',select('各分類の並び順','shopping-sort',[['status','未購入を先に'],['name','名前順'],['price','合計金額が高い順']],shoppingSort))}
      <div id="ep-shopping-results"></div>${shoppingUndo?`<div class="ep-undo" role="status"><span>${shoppingUndo.length}品を削除しました</span>${button('epShoppingUndo','元に戻す')}</div>`:''}
      ${button('evShoppingBulk','まとめて追加')}${details('定番リスト',button('epShoppingTemplateSave','今の内容を定番として保存')+rows('shoppingTemplates').map(x=>`<div class="ep-saved-row">${button('epShoppingTemplateUse',x.name+' · '+x.items.length+'品',x.id)}${iconButton('epShoppingTemplateDelete','定番を削除','trash',x.id)}</div>`).join(''))}
      ${purchased.length?details('整理',button('evShoppingClear','このリストの購入済みを削除')):''}`,
      iconButton('evShoppingShare','リストを書き出す','share')+iconButton('evShoppingEdit','買うものを追加','plus'));
    const render=()=>{
      const visible=listItems().filter(x=>(shoppingFilter!=='pending'||!x.done)&&normalize(x.name).includes(normalize(shoppingQuery)));
      $('#ep-shopping-results').innerHTML=aisles.map(([category,label])=>{
        const items=visible.filter(x=>(x.category||'other')===category).sort((a,b)=>shoppingSort==='name'?a.name.localeCompare(b.name,'ja'):shoppingSort==='price'?b.price*b.quantity-a.price*a.quantity:Number(a.done)-Number(b.done));
        return items.length?section(label,`<div class="ev-card">${items.map(x=>`<div class="ev-row ${x.done?'ev-done':''}"><button class="check-circle ${x.done?'checked':''}" data-action="evShoppingToggle" data-id="${esc(x.id)}" aria-label="${esc(x.name)}" aria-pressed="${!!x.done}">${x.done?'✓':''}</button><button class="ev-grow ev-plain" data-action="evShoppingEdit" data-id="${esc(x.id)}"><strong>${esc(x.name)}</strong><small>${x.quantity}点 · ${money(x.price*x.quantity)}</small></button>${iconButton('evShoppingDelete','削除','trash',x.id)}</div>`).join('')}</div>`):'';
      }).join('')||empty(shoppingQuery?'該当する品はありません':'＋で買うものを追加');
    };
    $('#ev-shopping-list').onchange=e=>{shoppingList=e.target.value;shoppingQuery='';renderShopping();};
    $('#ep-shopping-query').value=shoppingQuery;$('#ep-shopping-query').oninput=e=>{shoppingQuery=e.target.value;render();};
    $('#ep-shopping-sort').onchange=e=>{shoppingSort=e.target.value;render();};render();
  }
  A.apps.shopping.render=renderShopping;
  A.actions.evShoppingFilter=el=>{shoppingFilter=el.dataset.id;renderShopping();};
  A.actions.evShoppingToggle=el=>save('shopping',rows('shopping').map(x=>x.id===el.dataset.id?{...x,done:!x.done}:x),renderShopping);
  A.actions.evShoppingEdit=(el={dataset:{}})=>{
    const x=rows('shopping').find(x=>x.id===el.dataset.id);
    A.form(x?'買うものを編集':'買うものを追加',field('品名','name',x?.name||'','text','required maxlength="80"')+select('分類','category',aisles,x?.category||'food')+
      field('数量','quantity',x?.quantity||1,'number','required min="1" max="999" step="1"')+field('単価（円）','price',x?.price||0,'number','required min="0" max="9999999" step="1"')+
      select('リスト','listId',shoppingLists().map(x=>[x.id,x.name]),x?.listId||shoppingList),v=>{
        if(!v.name.trim()||!integer(v.quantity,1,999)||!integer(v.price,0,9999999))return false;
        const ok=put('shopping',{...x,...v,id:x?.id||A.id(),name:v.name.trim(),quantity:Number(v.quantity),price:Number(v.price),done:x?.done||false});
        if(ok){shoppingList=v.listId;renderShopping();}return ok;
      });
  };
  A.actions.evShoppingListNew=()=>A.form('リストを作成',field('名前','name','','text','required maxlength="40"'),v=>{if(!v.name.trim())return false;const id=A.id();if(!put('shoppingLists',{id,name:v.name.trim()}))return false;shoppingList=id;renderShopping();});
  A.actions.evShoppingListEdit=()=>{
    if(shoppingList==='default')return A.toast('標準リストです。＋から新しいリストを作れます。');
    A.form('リストを編集',field('名前','name',listName(),'text','required maxlength="40"')+button('evShoppingListDelete','リストを削除'),v=>{if(!v.name.trim())return false;return put('shoppingLists',{id:shoppingList,name:v.name.trim()},renderShopping);});
  };
  A.actions.evShoppingListDelete=()=>A.confirm('リストを削除？','中の品は標準リストに移動します。',()=>{
    const list=rows('shopping'),id=shoppingList;
    if(!A.saveBatch({shopping:list.map(x=>x.listId===id?{...x,listId:'default'}:x),shoppingLists:rows('shoppingLists').filter(x=>x.id!==id),shoppingBudgets:rows('shoppingBudgets').filter(x=>x.id!==id)}))return;
    shoppingList='default';renderShopping();
  });
  A.actions.evShoppingBulk=()=>A.form('まとめて追加',area('1行に1品・100品まで','items','',8100),v=>{
    const names=v.items.split(/\r?\n/).map(x=>x.trim()).filter(Boolean);
    if(!names.length)return false;
    if(names.length>100||names.some(x=>x.length>80)){A.toast('100品まで、品名は80文字以内で入力してください');return false;}
    const list=rows('shopping');
    for(const name of names){const x=list.find(x=>!x.done&&(x.listId||'default')===shoppingList&&x.name===name);if(x){if(x.quantity>=999){A.toast('数量が999を超える品があります');return false;}x.quantity++;}else list.push({id:A.id(),name,quantity:1,price:0,category:'other',listId:shoppingList,done:false});}
    return save('shopping',list,renderShopping);
  },'追加');
  function deleteShopping(predicate) {
    const list=rows('shopping'),removed=list.filter(predicate);
    if(!removed.length)return;
    if(A.save('shopping',list.filter(x=>!predicate(x)))){shoppingUndo=removed;renderShopping();}
  }
  A.actions.evShoppingDelete=el=>deleteShopping(x=>x.id===el.dataset.id);
  A.actions.evShoppingClear=()=>A.confirm('購入済みを削除？','このリストの購入済みだけを削除します。',()=>deleteShopping(x=>(x.listId||'default')===shoppingList&&x.done));
  A.actions.epShoppingUndo=()=>{
    if(!shoppingUndo)return;const list=rows('shopping'),ids=new Set(list.map(x=>x.id)),lists=new Set(shoppingLists().map(x=>x.id));
    const restored=shoppingUndo.filter(x=>!ids.has(x.id)).map(x=>({...x,listId:lists.has(x.listId||'default')?(x.listId||'default'):'default'}));
    if(A.save('shopping',[...list,...restored])){if(restored.length)shoppingList=restored[0].listId;shoppingQuery='';shoppingFilter='all';shoppingUndo=null;renderShopping();A.toast('元に戻済み');}
  };
  A.actions.evShoppingShare=()=>download(listName().replace(/[\\/:*?"<>|]/g,'_')+'.txt',listItems().map(x=>`${x.done?'☑':'☐'} ${x.name} ×${x.quantity} ${money(x.price*x.quantity)}`).join('\n'));
  A.actions.epShoppingBudget=()=>A.form('このリストの予算',field('金額（円）・0で解除','amount',shoppingBudget(),'number','required min="0" max="999999999" step="1"'),v=>{
    if(!integer(v.amount,0,999999999))return false;return put('shoppingBudgets',{id:shoppingList,amount:Number(v.amount)},renderShopping);
  });
  A.actions.epShoppingTemplateSave=()=>{
    const items=listItems();if(!items.length)return A.toast('先に買うものを追加してください');
    if(items.length>100)return A.toast('定番リストは100品までです');
    if(rows('shoppingTemplates').length>=20)return A.toast('定番リストは20件までです');
    A.form('定番リストを保存',field('名前','name',listName(),'text','required maxlength="40"'),v=>{
      if(!v.name.trim())return false;return put('shoppingTemplates',{id:A.id(),name:v.name.trim(),items:items.map(({name,quantity,price,category})=>({name,quantity,price,category:category||'other'}))},renderShopping);
    });
  };
  A.actions.epShoppingTemplateUse=el=>{
    const template=rows('shoppingTemplates').find(x=>x.id===el.dataset.id);if(!template)return;
    const target=shoppingList;
    A.confirm('定番を追加？',esc(template.name)+'の'+template.items.length+'品を「'+esc(listName())+'」へ未購入で追加します。同名の未購入品は追加しません。',()=>{
      const list=rows('shopping');let count=0;
      for(const item of template.items){if(list.some(x=>!x.done&&(x.listId||'default')===target&&normalize(x.name)===normalize(item.name)))continue;list.push({...item,id:A.id(),listId:target,done:false});count++;}
      if(save('shopping',list,renderShopping))A.toast(count?count+'品を追加しました':'すべて未購入リストにあります');
    });
  };
  A.actions.epShoppingTemplateDelete=el=>A.confirm('定番リストを削除？','買い物リストの品は残ります。',()=>save('shoppingTemplates',rows('shoppingTemplates').filter(x=>x.id!==el.dataset.id),renderShopping));
})();
