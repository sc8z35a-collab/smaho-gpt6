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
      ${details('書き出し',button('epContactExport','表示中を書き出す')+button('evContactsExport','すべて書き出す'))}`,
      iconButton('evContactEdit','連絡先を追加','plus'));
    const render=()=>{
      const list=visibleContacts(),duplicates=duplicateIds();
      $('#ep-contact-count').textContent=`${list.length}件`+(contactFilter==='duplicates'?' · 同じ番号またはメール':'');
      $('#ep-contact-results').innerHTML=list.map(x=>`<button class="ev-row ev-wide" data-action="evContactOpen" data-id="${esc(x.id)}"><span class="ev-avatar">${esc(Array.from(x.name)[0])}</span><span class="ev-grow"><strong>${esc(x.name)}${x.favorite?' ★':''}</strong><small>${esc(x.group||'未分類')} · ${esc(x.phone||x.email||'連絡先未入力')}${duplicates.has(x.id)?' · 重複候補':''}</small></span>${A.icon('arrow')}</button>`).join('')||empty('連絡先なし');
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
      <p class="ev-caption">発信・送信は移動先で確認</p>${button('epContactCopy','コピー',x.id)}
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
    return savedConversions(key).map(x=>`<div class="ep-saved-row">${button(action,conversionLabel(x),x.id)}${iconButton(removeAction,'削除','trash',x.id)}</div>`).join('')||empty('保存なし');
  }
  function renderConverter() {
    const options=Object.entries(units[conversion.category].units).map(([id,[label]])=>[id,label]);
    page('converter',`${select('種類','unit-category',Object.entries(units).map(([id,x])=>[id,x.name]),conversion.category)}
      <div class="ev-converter">${field('数値','unit-value',conversion.value,'number','step="any"')}${select('変換元','unit-from',options,conversion.from)}
      ${iconButton('evUnitSwap','単位を入れ替え','converter')}${select('変換先','unit-to',options,conversion.to)}
      <output id="ev-unit-result" aria-live="polite"></output><p class="ep-muted" id="ep-unit-hint"></p>
      <div class="ep-actions">${button('evUnitCopy','コピー')}${button('epConversionRecord','保存')}</div></div>
      ${details('よく使う換算',button('epConversionPreset','この換算を登録')+conversionSaved('conversionPresets','epConversionUsePreset','epConversionRemovePreset'))}
      ${details('履歴',conversionSaved('conversionHistory','epConversionUseHistory','epConversionRemoveHistory'))}
      ${details('表示',select('有効数字','unit-precision',[[4,'4桁'],[8,'8桁'],[12,'12桁']],precision))}`);
    $('#ep-unit-category').onchange=e=>A.actions.evUnitCategory({dataset:{id:e.target.value}});
    ['value','from','to'].forEach(key=>$('#ep-unit-'+key).oninput=e=>{conversion[key]=e.target.value;updateConversion();});
    $('#ep-unit-precision').onchange=e=>{const next=Number(e.target.value);if(A.save('conversionPrecision',next)){precision=next;updateConversion();}else e.target.value=precision;};
    updateConversion();
  }
  function updateConversion() {
    $('#ev-unit-result').textContent=conversionText();
    $('#ep-unit-hint').textContent=conversionValue()===null?'数値を確認。温度は絶対零度以上。':'';
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

  // Reminder studio: keep one canonical model for Today, search and exports.
  let reminderFilter='pending',reminderSort='priority',reminderQuery='',reminderList='*';
  let reminderDraft='',reminderDraftDue='',reminderUndo=null;
  let reminderSelecting=false,reminderSelected=new Set(),reminderCompact=A.load('reminderCompact',true)===true;
  const reminders=()=>A.reminderModel.get();
  const reminderLists=()=>[...new Set(reminders().map(x=>x.list).filter(Boolean))].sort((a,b)=>a.localeCompare(b,'ja'));
  const repeatLabel=x=>x.repeat==='daily'?'毎日':x.repeat==='weekly'?'毎週':'';
  const dueLabel=value=>!value?'期限なし':value===day()?'今日':value===shiftDay(day(),1)?'明日':validDay(value)?new Date(value+'T12:00:00').toLocaleDateString('ja-JP',{month:'short',day:'numeric',weekday:'short'}):value;
  const reminderCheck=(action,x,extra='')=>`<button class="rm-check ${x.done?'is-done':''}" data-action="${action}" data-id="${esc(x.id)}" ${extra} aria-label="${esc(x.text)}を${x.done?'未完了に戻す':'完了する'}" aria-pressed="${!!x.done}"><span>${x.done?A.icon('check'):''}</span></button>`;
  function reminderArt(percent) {
    return `<div class="rm-orbit" role="img" aria-label="全タスクの完了率 ${percent}%"><svg viewBox="0 0 112 112" aria-hidden="true"><circle class="rm-orbit-track" cx="56" cy="56" r="48"/><circle class="rm-orbit-value" cx="56" cy="56" r="48" pathLength="100" stroke-dasharray="${percent} 100" transform="rotate(-90 56 56)"/></svg><div class="rm-paper" aria-hidden="true"><i></i><span><b>✓</b><em></em></span><span><b>✓</b><em></em></span><span><b></b><em></em></span></div><small>${percent}<span>%</span></small></div>`;
  }
  function reminderUndoBar() {
    return reminderUndo?`<div class="rm-undo" role="status"><span>${esc(reminderUndo.label)}</span>${button('rmUndo','取り消す')}</div>`:'';
  }
  // Snapshot guard prevents undo from overwriting edits made through another app.
  function changeReminders(list,label,render=renderReminders) {
    const before=JSON.stringify(reminders());
    if(!A.reminderModel.replace(list))return false;
    reminderUndo={before,after:JSON.stringify(list),label};
    reminderSelecting=false;reminderSelected.clear();
    const content=$('.ev-reminders'),scroll=content?.scrollTop||0,active=document.activeElement;
    const focus=active?.dataset?{action:active.dataset.action,id:active.dataset.id,step:active.dataset.step}:{};
    render();
    if($('.ev-reminders'))$('.ev-reminders').scrollTop=scroll;
    const target=[...document.querySelectorAll('.ev-reminders [data-action]')].find(el=>el.dataset.action===focus.action&&el.dataset.id===focus.id&&el.dataset.step===focus.step);
    if(target)target.focus({preventScroll:true});
    else if(focus.action)$('#rm-list-heading')?.focus({preventScroll:true});
    return true;
  }
  function matchesReminder(x,filter) {
    if(filter==='all')return true;
    if(filter==='done')return !!x.done;
    if(x.done)return false;
    if(filter==='today')return !!x.due&&x.due<=day();
    if(filter==='upcoming')return x.due>day()&&x.due<=shiftDay(day(),7);
    if(filter==='priority')return !!x.priority;
    return true;
  }
  function visibleReminders() {
    return reminders().filter(x=>matchesReminder(x,reminderFilter)&&(reminderList==='*'||(x.list||'')===reminderList)&&normalize([x.text,x.note,x.list,...(x.steps||[]).map(s=>s.text)].join(' ')).includes(normalize(reminderQuery)))
      .sort((a,b)=>Number(a.done)-Number(b.done)||(reminderSort==='name'?a.text.localeCompare(b.text,'ja'):reminderSort==='due'?(a.due||'9999').localeCompare(b.due||'9999'):Number(!!b.priority)-Number(!!a.priority))||(a.due||'9999').localeCompare(b.due||'9999')||a.text.localeCompare(b.text,'ja'));
  }
  function reminderRow(x) {
    const steps=x.steps||[],count=steps.filter(s=>s.done).length,overdue=x.due&&x.due<day()&&!x.done;
    const selected=reminderSelected.has(x.id);
    return `<article class="rm-task ${reminderSelecting&&selected?'is-selected':''} ${x.done?'is-done':''} ${overdue?'is-overdue':''}">${reminderSelecting?`<button class="rm-check rm-select ${selected?'is-done':''}" data-action="rmSelect" data-id="${esc(x.id)}" aria-label="${esc(x.text)}を選択" aria-pressed="${selected}"><span>${selected?A.icon('check'):''}</span></button>`:reminderCheck('reminderToggle',x)}<button class="rm-task-main" data-action="${reminderSelecting?'rmSelect':'epReminderOpen'}" data-id="${esc(x.id)}"><strong>${esc(x.text)}</strong><span class="rm-meta"><span class="${overdue?'rm-late':''}">${overdue?'期限超過 · ':''}${esc(dueLabel(x.due))}</span>${x.list?`<span class="rm-list-tag">${esc(x.list)}</span>`:''}${repeatLabel(x)?`<span>↻ ${repeatLabel(x)}</span>`:''}</span>${x.note?`<span class="rm-note-preview">${esc(x.note)}</span>`:''}${steps.length?`<span class="rm-step-meter"><i><b style="width:${count/steps.length*100}%"></b></i><span>手順 ${count}/${steps.length}</span></span>`:''}</button><button ${reminderSelecting?'hidden':''} class="rm-priority ${x.priority?'is-priority':''}" data-action="rmPriority" data-id="${esc(x.id)}" aria-label="${esc(x.text)}の優先${x.priority?'を解除':'に設定'}" aria-pressed="${!!x.priority}"><svg viewBox="0 0 24 24" fill="${x.priority?'currentColor':'none'}" stroke="currentColor" stroke-width="1.6" aria-hidden="true"><path d="m12 3 2.8 5.7 6.3.9-4.5 4.4 1 6.2-5.6-3-5.6 3 1-6.2L3 9.6l6.2-.9Z"/></svg></button></article>`;
  }
  function renderReminderResults() {
    const list=visibleReminders(),groups=[['overdue','期限を過ぎています'],['today','今日'],['later','これから'],['none','期限なし'],['done','完了済み']];
    const visibleIds=new Set(list.map(x=>x.id));
    reminderSelected=new Set([...reminderSelected].filter(id=>visibleIds.has(id)));
    renderReminderBatch();
    const group=x=>x.done?'done':!x.due?'none':x.due<day()?'overdue':x.due===day()?'today':'later';
    $('#rm-result-count').textContent=`${list.length}件`;
    $('#ep-reminder-results').innerHTML=list.length?groups.map(([key,label])=>{
      const items=list.filter(x=>group(x)===key);
      return items.length?`<section class="rm-group"><h3 class="${key==='overdue'?'rm-late':''}">${label}<span>${items.length}</span></h3><div class="rm-task-list">${items.map(reminderRow).join('')}</div></section>`:'';
    }).join(''):`<div class="rm-empty">${A.icon('check')}<h3>${reminderQuery?'見つかりませんでした':reminderList!=='*'?'このリストに該当するタスクはありません':reminderFilter==='today'?'今日までのタスクは完了':reminderFilter==='done'?'これから、ひとつずつ':'すっきり、何もありません'}</h3><p>${reminderQuery?'別の言葉で検索するか、条件をリセット。':'新しいタスクは上の入力欄から追加できます。'}</p>${button('rmResetFilters','すべてのタスクを見る')}</div>`;
  }
  function renderReminders() {
    const list=reminders(),done=list.filter(x=>x.done).length,percent=list.length?Math.round(done/list.length*100):0;
    const filters=[['pending','未完了'],['all','すべて'],['done','完了']];
    const smart=[['today','今日まで','calendar'],['upcoming','7日以内','clock'],['priority','優先','star']];
    const lists=reminderLists();if(reminderList!=='*'&&reminderList!==''&&!lists.includes(reminderList))reminderList='*';
    page('reminders',`<header class="rm-hero"><div><p class="rm-eyebrow">${esc(new Date().toLocaleDateString('ja-JP',{month:'long',day:'numeric',weekday:'long'}))}</p><span class="rm-progress-label">${done} / ${list.length} 完了</span></div>${reminderArt(percent)}</header>
      <div class="rm-smart" aria-label="スマートリスト">${smart.map(([id,label,icon])=>`<button data-action="reminderFilter" data-id="${id}" aria-pressed="${reminderFilter===id}"><span>${A.icon(icon)}${label}</span><strong>${list.filter(x=>matchesReminder(x,id)).length}</strong></button>`).join('')}</div>
      <form class="rm-compose" id="reminder-form"><div><input name="text" required maxlength="100" placeholder="タスクを追加" aria-label="タスクを追加" autocomplete="off" value="${esc(reminderDraft)}"><button type="submit" aria-label="タスクを追加">${A.icon('plus')}</button></div><div class="rm-date-chips" aria-label="新しいタスクの期限">${[['','期限なし'],[day(),'今日'],[shiftDay(day(),1),'明日']].map(([value,label])=>`<button type="button" data-action="rmQuickDue" data-id="${value}" aria-pressed="${reminderDraftDue===value}">${label}</button>`).join('')}<button type="button" class="rm-more" data-action="reminderDetails">詳細設定</button></div></form>
      ${A.search('ep-reminder-query','タスク・メモ・手順を検索')}
      <div class="rm-toolbar"><div class="rm-tabs" aria-label="表示するタスク">${filters.map(([id,label])=>`<button data-action="reminderFilter" data-id="${id}" aria-pressed="${reminderFilter===id}">${label}</button>`).join('')}</div><label class="rm-sort"><span class="rm-sr">グループ内の並び順</span><select id="ep-reminder-sort" aria-label="グループ内の並び順">${[['priority','優先度順'],['due','期限順'],['name','名前順']].map(([id,label])=>`<option value="${id}" ${reminderSort===id?'selected':''}>${label}</option>`).join('')}</select></label></div>
      <div class="rm-list-heading"><h2 id="rm-list-heading" tabindex="-1">${[...filters,...smart].find(x=>x[0]===reminderFilter)?.[1]||'タスク'} <span id="rm-result-count" aria-live="polite"></span></h2><label><span class="rm-sr">リストで絞り込み</span><select id="rm-list-filter" aria-label="リストで絞り込み">${[['*','全リスト'],['','未分類'],...lists.map(x=>[x,x])].map(([id,label])=>`<option value="${esc(id)}" ${reminderList===id?'selected':''}>${esc(label)}</option>`).join('')}</select></label></div>
      <div class="rm-selection-entry"><button type="button" data-action="rmSelectionMode" aria-pressed="${reminderSelecting}">${reminderSelecting?'選択を終了':'タスクを選択'}</button>${reminderSelecting?'<span>表示中のみ対象</span>':''}</div>
      <div id="rm-batch-tools"></div><div id="ep-reminder-results"></div>
      ${details('整理と共有',button('rmBulkAdd','まとめて追加')+button('rmCompact',reminderCompact?'ゆったり表示にする':'コンパクト表示にする')+button('shareReminders','全タスクを共有')+button('exportReminders','全タスクを書き出す')+(done?button('reminderClearDone','完了済みを削除'):''))}
      ${details('キーボード操作','<p class="rm-footnote">N：追加欄へ · /：検索へ<br>Ctrl / ⌘ + Enter：詳細を保存<br>Esc：選択を終了（選択中のみ）</p>')}
      <p class="rm-footnote">このブラウザに保存 · 通知はページが動作中のみ</p>${reminderUndoBar()}`,iconButton('reminderDetails','タスクを追加','plus'));
    $('#ep-reminder-query').value=reminderQuery;$('#ep-reminder-query').oninput=e=>{reminderQuery=e.target.value;renderReminderResults();};
    $('#ep-reminder-sort').onchange=e=>{reminderSort=e.target.value;renderReminderResults();};
    $('#rm-list-filter').onchange=e=>{reminderList=e.target.value;renderReminderResults();};
    $('.ev-reminders').classList.toggle('rm-compact',reminderCompact);
    bindReminderKeys();
    const form=$('#reminder-form');
    form.elements.text.addEventListener('paste',e=>{const text=e.clipboardData?.getData('text');if(text&&text.split(/\r?\n/).filter(x=>x.trim()).length>1){e.preventDefault();openReminderBulk(text);}});
    form.elements.text.oninput=e=>{reminderDraft=e.target.value;};
    form.onsubmit=e=>{
      e.preventDefault();const text=form.elements.text.value.trim();if(!text)return;
      const next=[...reminders(),{id:A.id(),text,due:reminderDraftDue,list:reminderList==='*'?'':reminderList,done:false}];
      if(changeReminders(next,'タスクを追加しました',()=>{reminderDraft='';reminderQuery='';reminderFilter='pending';renderReminders();}))$('#reminder-form input').focus({preventScroll:true});
    };
    renderReminderResults();
  }
  A.apps.reminders.render=renderReminders;A.actions.epRemindersHome=renderReminders;
  A.actions.reminderFilter=el=>{reminderFilter=el.dataset.id||el.dataset.value;renderReminders();[...document.querySelectorAll('[data-action="reminderFilter"]')].find(x=>x.dataset.id===reminderFilter)?.focus({preventScroll:true});};
  A.actions.rmResetFilters=()=>{reminderFilter='all';reminderQuery='';reminderList='*';reminderSelecting=false;reminderSelected.clear();renderReminders();};
  A.actions.rmQuickDue=el=>{reminderDraftDue=el.dataset.id;document.querySelectorAll('[data-action="rmQuickDue"]').forEach(x=>x.setAttribute('aria-pressed',x.dataset.id===reminderDraftDue));};
  A.actions.rmUndo=()=>{
    if(!reminderUndo)return;
    reminderSelecting=false;reminderSelected.clear();
    if(JSON.stringify(reminders())!==reminderUndo.after){reminderUndo=null;renderReminders();A.toast('別の変更があるため取り消せません');return;}
    if(A.reminderModel.replace(JSON.parse(reminderUndo.before))){reminderUndo=null;renderReminders();$('#rm-list-heading')?.focus({preventScroll:true});A.toast('取り消しました');}
  };
  // Build completion and recurrence together; callers commit once, including bulk edits.
  function reminderCompletion(list,id,done) {
    const x=list.find(x=>x.id===id);if(!x||!!x.done===done)return list;
    const next={...x,done,completedAt:done?new Date().toISOString():''},result=list.map(r=>r.id===id?next:r);
    if(done&&repeatLabel(x)&&!x.repeatNextId){
      const due=shiftDay(x.due&&x.due>=day()?x.due:day(),x.repeat==='daily'?1:7);
      if(!validDay(due))throw Error('次回の期限を作成できません。繰り返しを解除してください');
      const child={...x,id:A.id(),due,done:false,completedAt:'',repeatNextId:'',steps:(x.steps||[]).map(s=>({...s,id:A.id(),done:false}))};
      next.repeatNextId=child.id;result.push(child);
    }
    return result;
  }
  function toggleReminder(id,render=renderReminders) {
    const x=reminders().find(x=>x.id===id);if(!x)return false;
    try{
      const list=reminderCompletion(reminders(),id,!x.done),generated=list.length>reminders().length;
      const ok=changeReminders(list,generated?'完了して次回を追加しました':!x.done?'タスクを完了しました':'未完了に戻しました',render);
      if(ok)A.haptic();return ok;
    }catch(error){A.toast(error.message);return false;}
  }
  function renderReminderBatch() {
    const host=$('#rm-batch-tools');if(!host)return;
    const count=reminderSelected.size,disabled=count?'':'disabled';
    host.innerHTML=reminderSelecting?`<div class="rm-batch"><div><strong role="status">${count}件を選択</strong>${button('rmSelectAll','表示中をすべて')}${button('rmSelectNone','解除')}</div><div class="rm-batch-actions">${button('rmBatchComplete','完了','',disabled)}${button('rmBatchTomorrow','明日へ','',disabled)}${button('rmBatchMove','移動','',disabled)}${button('rmBatchDelete','削除','',disabled)}</div></div>`:'';
  }
  A.actions.rmSelectionMode=()=>{const scroll=$('.ev-reminders')?.scrollTop||0;reminderSelecting=!reminderSelecting;reminderSelected.clear();renderReminders();$('.ev-reminders').scrollTop=scroll;$('.rm-selection-entry button')?.focus({preventScroll:true});};
  A.actions.rmSelect=el=>{
    if(!reminderSelecting||!visibleReminders().some(x=>x.id===el.dataset.id))return;
    const id=el.dataset.id;if(reminderSelected.has(id))reminderSelected.delete(id);else reminderSelected.add(id);
    renderReminderResults();[...document.querySelectorAll('.rm-select')].find(x=>x.dataset.id===id)?.focus({preventScroll:true});
  };
  A.actions.rmSelectAll=()=>{reminderSelected=new Set(visibleReminders().map(x=>x.id));renderReminderResults();};
  A.actions.rmSelectNone=()=>{reminderSelected.clear();renderReminderResults();};
  function selectedReminderIds() {
    const visible=new Set(visibleReminders().map(x=>x.id));
    return new Set([...reminderSelected].filter(id=>visible.has(id)));
  }
  A.actions.rmBatchComplete=()=>{
    const ids=selectedReminderIds();if(!ids.size)return;
    try{let list=reminders();for(const id of ids)list=reminderCompletion(list,id,true);changeReminders(list,`${ids.size}件を完了しました`);}catch(error){A.toast(error.message);}
  };
  A.actions.rmBatchTomorrow=()=>{
    const ids=selectedReminderIds();if(!ids.size)return;
    changeReminders(reminders().map(x=>ids.has(x.id)?{...x,due:shiftDay(day(),1)}:x),`${ids.size}件の期限を明日にしました`);
  };
  A.actions.rmBatchMove=()=>{
    const ids=selectedReminderIds();if(!ids.size)return;
    A.form(`${ids.size}件をリストへ移動`,field('リスト名（空欄で未分類）','list','','text','maxlength="40" list="rm-batch-lists"')+`<datalist id="rm-batch-lists">${reminderLists().map(x=>`<option value="${esc(x)}"></option>`).join('')}</datalist>`,v=>{
      if(v.list.trim()==='*'){A.toast('別のリスト名を入力してください');return false;}
      return changeReminders(reminders().map(x=>ids.has(x.id)?{...x,list:v.list.trim()}:x),`${ids.size}件を移動しました`);
    },'移動');styleReminderEditor();
  };
  A.actions.rmBatchDelete=()=>{
    const ids=selectedReminderIds();if(!ids.size)return;
    A.confirm(`${ids.size}件を削除？`,'選択したタスクのメモと手順も削除します。',()=>changeReminders(reminders().filter(x=>!ids.has(x.id)),`${ids.size}件を削除しました`));
  };
  A.actions.rmCompact=()=>{const next=!reminderCompact;if(A.save('reminderCompact',next)){reminderCompact=next;renderReminders();}};
  function bindReminderKeys() {
    $('.ev-reminders')?.addEventListener('keydown',e=>{
      if(!$('#overlay').hidden||e.isComposing||e.ctrlKey||e.metaKey||e.altKey)return;
      if(e.key==='Escape'&&reminderSelecting){e.preventDefault();e.stopPropagation();A.actions.rmSelectionMode();return;}
      if(e.target.closest('input,textarea,select,[contenteditable]'))return;
      const target=e.key.toLowerCase()==='n'?$('#reminder-form input'):e.key==='/'?$('#ep-reminder-query'):null;
      if(target){e.preventDefault();target.focus();}
    });
  }
  function styleReminderEditor() {
    $('#overlay').classList.add('rm-editor');
    $('#modal-form').addEventListener('keydown',e=>{
      if(!e.isComposing&&e.key==='Enter'&&(e.ctrlKey||e.metaKey)){e.preventDefault();e.currentTarget.requestSubmit();}
    });
    $('#modal-form input, #modal-form textarea')?.focus();
  }
  function openReminderBulk(text='') {
    A.form('まとめて追加',area('1行に1タスク・50件まで','bulk',text,5100)+field('共通の期限','due',reminderDraftDue,'date','min="0001-01-01" max="9999-12-31"')+field('リスト','list',reminderList==='*'?'':reminderList,'text','maxlength="40"')+'<p class="rm-form-hint" id="rm-bulk-count" role="status"></p>',v=>{
      const lines=v.bulk.split(/\r?\n/).map(x=>x.trim()).filter(Boolean);
      if(!lines.length||lines.length>50||lines.some(x=>x.length>100)){A.toast('1〜50件、1行100文字以内で入力してください');return false;}
      if((v.due&&!validDay(v.due))||v.list.trim()==='*'){A.toast('期限とリスト名を確認してください');return false;}
      const added=lines.map(text=>({id:A.id(),text,done:false,due:v.due,list:v.list.trim()}));
      return changeReminders([...reminders(),...added],`${added.length}件を追加しました`,()=>{reminderFilter='pending';reminderQuery='';reminderList=v.list.trim()||'*';renderReminders();});
    },'まとめて追加');
    const counter=()=>{const lines=$('#ep-bulk').value.split(/\r?\n/).filter(x=>x.trim());$('#rm-bulk-count').textContent=`${lines.length} / 50 件 · 空行は除外 · 1行100文字まで`;};
    $('#ep-bulk').oninput=counter;counter();styleReminderEditor();$('#ep-bulk').focus();
  }
  A.actions.rmBulkAdd=()=>openReminderBulk();
  A.actions.reminderToggle=el=>toggleReminder(el.dataset.id);
  A.actions.rmPriority=el=>changeReminders(reminders().map(x=>x.id===el.dataset.id?{...x,priority:!x.priority}:x),'優先度を変更しました');
  A.actions.reminderDelete=el=>A.confirm('タスクを削除？','このタスクのメモと手順も削除します。',()=>changeReminders(reminders().filter(x=>x.id!==el.dataset.id),'タスクを削除しました'));
  A.actions.reminderClearDone=()=>A.confirm('完了済みを削除？','未完了のタスクは残ります。',()=>changeReminders(reminders().filter(x=>!x.done),'完了済みを削除しました'));
  A.actions.rmDatePreset=el=>{const input=$('#ep-due');input.value=el.dataset.id;input.dispatchEvent(new Event('input',{bubbles:true}));};
  A.actions.reminderDetails=(el={dataset:{}})=>{
    const x=reminders().find(x=>x.id===el.dataset.id);
    A.form(x?'タスクを編集':'新しいリマインダー',field('タスク','text',x?.text||reminderDraft,'text','required maxlength="100" placeholder="タスクを追加"')+
      field('期限','due',x?.due??reminderDraftDue,'date','min="0001-01-01" max="9999-12-31"')+
      `<div class="rm-date-presets">${[[day(),'今日'],[shiftDay(day(),1),'明日'],[shiftDay(day(),7),'1週間後'],['','期限なし']].map(([id,label])=>button('rmDatePreset',label,id)).join('')}</div>`+
      `<div class="rm-form-options">${select('優先度','priority',[['0','通常'],['1','優先']],x?.priority?'1':'0')}${select('繰り返し','repeat',[['','なし'],['daily','毎日'],['weekly','毎週']],x?.repeat||'')}</div>`+
      `<p class="rm-form-hint">繰り返しは完了時に次回を1件作成。期限と今日の遅い方から翌日／7日後になります。未完了に戻しても次回は残ります。</p>`+
      field('リスト','list',x?.list??(reminderList==='*'?'':reminderList),'text','maxlength="40" list="rm-list-names" placeholder="仕事、暮らし、やりたいこと…"')+
      `<datalist id="rm-list-names">${reminderLists().map(name=>`<option value="${esc(name)}"></option>`).join('')}</datalist>`+
      `<details class="rm-form-details" ${x?.note||x?.steps?.length?'open':''}><summary>メモ・手順を追加</summary>${area('メモ','note',x?.note||'')}${area('手順（1行ずつ・30件まで）','steps',(x?.steps||[]).map(s=>s.text).join('\n'),5000)}</details>`,v=>{
        if(!v.text.trim()||(v.due&&!validDay(v.due))){A.toast('タスク名と期限を確認してください');return false;}
        if(v.list.trim()==='*'){A.toast('別のリスト名を入力してください');return false;}
        const lines=v.steps.split(/\r?\n/).map(s=>s.trim()).filter(Boolean);
        if(lines.length>30||lines.some(s=>s.length>160)){A.toast('手順は30件まで、各160文字以内で入力してください');return false;}
        const unused=[...(x?.steps||[])],steps=lines.map(text=>{const index=unused.findIndex(s=>s.text===text);return index<0?{id:A.id(),text,done:false}:unused.splice(index,1)[0];});
        const next={...x,id:x?.id||A.id(),text:v.text.trim(),due:v.due,priority:v.priority==='1',repeat:['daily','weekly'].includes(v.repeat)?v.repeat:'',list:v.list.trim(),note:v.note,steps,done:x?.done||false};
        return changeReminders(x?reminders().map(r=>r.id===x.id?next:r):[...reminders(),next],x?'タスクを更新しました':'タスクを追加しました',()=>{
          if(x)A.actions.epReminderOpen({dataset:{id:x.id}});
          else{reminderDraft='';reminderQuery='';reminderList=next.list||'*';reminderFilter='pending';renderReminders();}
        });
      });
    styleReminderEditor();$('#ep-text').focus();
  };
  A.actions.epReminderOpen=el=>{
    const x=reminders().find(x=>x.id===el.dataset.id);if(!x)return;
    const steps=x.steps||[],count=steps.filter(s=>s.done).length;
    page('reminders',`<header class="rm-detail-hero"><span class="rm-detail-label">${esc(x.list||'未分類')} ${x.priority?'· 優先':''}</span><h1>${esc(x.text)}</h1><div class="rm-meta"><span class="${x.due&&x.due<day()&&!x.done?'rm-late':''}">${x.due&&x.due<day()&&!x.done?'期限超過 · ':''}${esc(dueLabel(x.due))}</span>${repeatLabel(x)?`<span>↻ ${repeatLabel(x)}</span>`:''}</div><button class="rm-complete ${x.done?'is-done':''}" data-action="epReminderComplete" data-id="${esc(x.id)}">${A.icon('check')}${x.done?'完了済み · 未完了に戻す':'タスクを完了'}</button></header>
      ${x.note?`<section class="rm-note-card"><h2>メモ</h2><p class="ep-note">${esc(x.note)}</p></section>`:''}
      <section class="rm-steps"><div class="rm-list-heading"><h2>小さなステップ</h2><span>${count} / ${steps.length}</span></div><div class="rm-detail-progress" role="progressbar" aria-label="手順の完了数" aria-valuemin="0" aria-valuemax="${steps.length||1}" aria-valuenow="${count}"><i style="width:${steps.length?count/steps.length*100:0}%"></i></div><div class="rm-task-list">${steps.map(s=>`<div class="rm-step ${s.done?'is-done':''}">${reminderCheck('epReminderStep',{...s,id:x.id},`data-step="${esc(s.id)}"`)}<span>${esc(s.text)}</span></div>`).join('')||`<p class="rm-form-hint">大きなタスクは、小さな手順に分けて。</p>`}</div>${steps.length<30?`<form id="rm-step-form" class="rm-step-add"><input name="step" maxlength="160" required aria-label="手順を追加" placeholder="次のステップを追加"><button type="submit" aria-label="手順を追加">${A.icon('plus')}</button></form>`:''}${button('reminderDetails','メモ・手順を編集',x.id)}<p class="rm-footnote">手順とタスクの完了は別々に記録</p></section>
      <div class="rm-detail-actions">${button('epReminderPostpone','期限を1日延ばす',x.id)}${button('epReminderDuplicate','複製する',x.id)}</div>
      ${details('管理',button('reminderDelete','タスクを削除',x.id))}${reminderUndoBar()}`,iconButton('reminderDetails','タスクを編集','edit',x.id),'epRemindersHome');
    const form=$('#rm-step-form');
    if(form)form.onsubmit=e=>{
      e.preventDefault();const text=form.elements.step.value.trim(),current=reminders().find(r=>r.id===x.id);
      if(!text||!current||(current.steps||[]).length>=30)return;
      if(changeReminders(reminders().map(r=>r.id===x.id?{...r,steps:[...(r.steps||[]),{id:A.id(),text,done:false}]}:r),'手順を追加しました',()=>A.actions.epReminderOpen(el)))$('#rm-step-form input')?.focus({preventScroll:true});
    };
  };
  A.actions.epReminderComplete=el=>toggleReminder(el.dataset.id,()=>A.actions.epReminderOpen(el));
  A.actions.epReminderStep=el=>changeReminders(reminders().map(x=>x.id===el.dataset.id?{...x,steps:(x.steps||[]).map(s=>s.id===el.dataset.step?{...s,done:!s.done}:s)}:x),'手順を更新しました',()=>A.actions.epReminderOpen(el));
  A.actions.epReminderPostpone=el=>{const x=reminders().find(x=>x.id===el.dataset.id);if(!x)return;const due=shiftDay(x.due&&x.due>=day()?x.due:day(),1);if(!validDay(due))return A.toast('これ以上期限を延ばせません');changeReminders(reminders().map(r=>r.id===x.id?{...r,due}:r),'期限を'+due+'に変更しました',()=>A.actions.epReminderOpen(el));};
  A.actions.epReminderDuplicate=el=>{const x=reminders().find(x=>x.id===el.dataset.id);if(x)changeReminders([...reminders(),{...x,id:A.id(),text:(x.text+' コピー').slice(0,100),done:false,completedAt:'',repeatNextId:'',steps:(x.steps||[]).map(s=>({...s,id:A.id(),done:false}))}],'タスクを複製しました');};

  // 19–24: selected-day dashboard, seven-day outlook, shopping summary,
  // resume reading, daily intention and a shareable agenda text file.
  let dashboardDay=day();
  const dashboardTasks = () => reminders().filter(x=>!x.done&&(!x.due||x.due<=dashboardDay));
  function renderToday() {
    const events=A.todayEvents(dashboardDay).slice().sort((a,b)=>a.time.localeCompare(b.time)),tasks=dashboardTasks(),habits=rows('habits');
    const minutes=rows('focusHistory').filter(x=>x.date===dashboardDay).reduce((n,x)=>n+x.minutes,0),checked=habits.filter(x=>x.days.includes(dashboardDay)).length;
    const shopping=rows('shopping').filter(x=>!x.done),books=rows('reading').filter(x=>x.page>0&&x.page<x.total);
    page('today',`<div class="ev-date-switch">${button('epTodayMove','‹','-1','aria-label="前の日"')}<input type="date" id="ep-today-date" value="${dashboardDay}" aria-label="表示日">${button('epTodayMove','›','1','aria-label="次の日"')}</div>
      ${dashboardDay!==day()?button('epTodayReset','今日に戻る'):''}<div class="ev-heading"><span>${new Date(dashboardDay+'T12:00:00').toLocaleDateString('ja-JP',{month:'long',day:'numeric',weekday:'long'})}</span></div>
      <div class="ev-metrics"><button data-app="focus"><strong>${minutes}<small>分</small></strong><span>集中</span></button><button data-app="habits"><strong>${checked}<small>/${habits.length}</small></strong><span>習慣</span></button><button data-app="reminders"><strong>${tasks.length}</strong><span>タスク</span></button></div>
      <p class="ep-muted">表示日まで＋期限なし</p>
      <button class="ev-focus-link" data-app="focus">${A.icon('focus')}<span>集中する</span>${A.icon('arrow')}</button>
      <button class="ep-intention" data-action="epTodayIntention"><small>この日のひとこと</small><strong>${esc(rows('dailyIntentions').find(x=>x.date===dashboardDay)?.text||'＋ ひとこと')}</strong></button>
      ${section('予定',iconButton('evTodayEvent','予定を追加','plus')+`<div class="ev-card">${events.map(x=>`<button class="ev-timeline" data-action="epTodayEvent" data-id="${esc(x.id)}"><time>${esc(x.time)}</time><span><strong>${esc(x.title)}</strong><small>${esc(x.place)}</small></span>${A.icon('arrow')}</button>`).join('')||empty('予定はありません')}</div>`)}
      ${section('タスク',iconButton('evTodayTask','タスクを追加','plus')+`<div class="ev-card">${tasks.slice(0,8).map(x=>`<div class="ev-row"><button class="check-circle" data-action="evTodayCheck" data-id="${esc(x.id)}" aria-label="${esc(x.text)}を完了"></button><button class="ev-grow ev-plain" data-action="epTodayTask" data-id="${esc(x.id)}"><strong>${esc(x.text)}</strong><small>${esc(x.due||'期限なし')}${x.due&&x.due<dashboardDay?' · 期限超過':''}</small></button></div>`).join('')||empty('すべて完了')}</div>${tasks.length>8?'<button class="ep-button" data-app="reminders">すべてのタスクを見る</button>':''}`)}
      ${details('7日間の予定',Array.from({length:7},(_,i)=>{const date=shiftDay(dashboardDay,i),items=A.todayEvents(date);return `<button class="ep-outlook" data-action="epTodaySelect" data-id="${date}"><time>${esc(date.slice(5))}</time><span>${items.length?esc(items[0].title):'予定なし'}</span><strong>${items.length}件</strong></button>`;}).join(''))}
      ${section('買い物の残り（現在）',`<button class="ep-summary" data-app="shopping"><strong>${shopping.length}品</strong><span>予定額 ${money(shopping.reduce((n,x)=>n+x.quantity*x.price,0))}</span><small>全リスト</small></button>`)}
      ${section('読書の続き（現在）',books.slice(0,3).map(x=>`<button class="ep-summary" data-action="epTodayBook" data-id="${esc(x.id)}"><strong>${esc(x.title)}</strong><span>${x.page} / ${x.total}ページ · 残り${x.total-x.page}ページ</span></button>`).join('')||'<button class="ep-button" data-app="reading">本棚を開く</button>')}
      ${section('よく使う',`<div class="ev-quick-grid">${['journal','shopping','expenses','reading'].map(id=>`<button data-app="${id}">${A.icon(id)}<span>${A.apps[id].name}</span></button>`).join('')}</div>`)}`,
      iconButton('epTodayExport','この日のまとめを書き出す','download'));
    $('#ep-today-date').onchange=e=>{if(validDay(e.target.value)){dashboardDay=e.target.value;renderToday();}};
  }
  A.apps.today.render=()=>{dashboardDay=day();renderToday();};
  A.actions.epTodayMove=el=>{const next=shiftDay(dashboardDay,Number(el.dataset.id));if(validDay(next)){dashboardDay=next;renderToday();}};
  A.actions.epTodaySelect=el=>{if(validDay(el.dataset.id)){dashboardDay=el.dataset.id;renderToday();}};
  A.actions.epTodayReset=()=>{dashboardDay=day();renderToday();};
  A.actions.evTodayCheck=el=>{if(reminders().some(x=>x.id===el.dataset.id&&!x.done))toggleReminder(el.dataset.id,renderToday);};
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
      <div class="ev-hero sand"><span>買うもの</span><strong>${pending.length}<small>品</small></strong><span>予定額 ${money(total(pending))}</span><div class="ev-hero-foot"><span>購入済み ${money(total(purchased))}</span><span>全品合計 ${money(combined)}</span></div></div>
      <button class="ev-budget" data-action="epShoppingBudget"><span>予算</span><strong>${budget?money(budget):'設定する'}</strong></button>
      ${budget?`<p class="ep-budget-state ${combined>budget?'ep-over':''}">${combined>budget?'予算を '+money(combined-budget)+' 超過':'全品購入後の残り '+money(budget-combined)}</p>`:''}<p class="ep-muted">未入力の価格は0円</p>
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
  A.actions.epShoppingBudget=()=>A.form('予算',field('金額（円）・0で解除','amount',shoppingBudget(),'number','required min="0" max="999999999" step="1"'),v=>{
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
