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

  // People Atelier shares the original storage and action names with home search.
  let contactGroup='*',contactFilter='all',contactSort='favorite',contactQuery='';
  let ctSelecting=false,ctSelected=new Set(),ctLimit=60,ctUndo=null,ctDetail='';
  const ctTones=[['blue','青磁'],['sage','若葉'],['rose','薄紅'],['amber','琥珀'],['violet','藤'],['slate','墨']];
  const ctFields={name:80,kana:100,phone:24,email:254,group:40,company:120,role:80,address:300,birthday:10,lastContact:10,note:12000};
  const ctLabels={name:'名前',kana:'よみがな',phone:'電話番号',email:'メール',group:'グループ',company:'会社・組織',role:'役職',address:'住所',birthday:'誕生日',lastContact:'最後の連絡日',note:'メモ'};
  let ctLayout=A.load('contactLayout','list')==='cards'?'cards':'list';
  const ctIcon=kind=>`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" aria-hidden="true">${kind==='copy'?'<rect x="8" y="8" width="12" height="13" rx="3"/><path d="M15 8V5a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h3"/>':'<path d="M9 6h11M9 12h11M9 18h11M4 6h1M4 12h1M4 18h1"/>'}</svg>`;
  const phoneKey=value=>normalize(value).replace(/[\s()\-]/g,'');
  const ctText=value=>normalize(value).replace(/[ァ-ヶ]/g,c=>String.fromCharCode(c.charCodeAt(0)-0x60));
  const ctFind=id=>rows('contacts').find(x=>x.id===id);
  const ctTone=x=>ctTones.some(([id])=>id===x.tone)?x.tone:ctTones[Array.from(String(x.name||'')).reduce((n,c)=>n+c.codePointAt(0),0)%6][0];
  function ctAvatar(x,large=false) {
    return `<span class="ct-avatar ct-tone-${ctTone(x)} ${large?'ct-avatar-large':''}" aria-hidden="true"><svg viewBox="0 0 80 80" fill="none" focusable="false"><circle cx="40" cy="40" r="36" stroke="currentColor" stroke-opacity=".28"/><path d="M9 46C22 20 55 67 72 32M13 54C29 30 54 75 69 44" stroke="currentColor" stroke-opacity=".12"/><path d="M17 23A28 28 0 0 1 49 12" stroke="white" stroke-opacity=".7" stroke-linecap="round" stroke-width="2"/><circle cx="63" cy="19" r="3" fill="white" fill-opacity=".5"/></svg><b>${esc(Array.from(String(x.name||'?').trim())[0]||'?')}</b></span>`;
  }
  function ctArt() {
    return `<svg class="ct-book-art" viewBox="0 0 240 220" fill="none" aria-hidden="true" focusable="false"><defs><linearGradient id="ct-cover" x1="45" y1="25" x2="194" y2="188" gradientUnits="userSpaceOnUse"><stop stop-color="#b6d7dd"/><stop offset=".45" stop-color="#6b98ac"/><stop offset="1" stop-color="#315c79"/></linearGradient><linearGradient id="ct-leaf" x2="1" y2="1"><stop stop-color="#fffdf6"/><stop offset="1" stop-color="#d6e0da"/></linearGradient><linearGradient id="ct-metal" x2="1" y2="1"><stop stop-color="#fff1cd"/><stop offset=".48" stop-color="#b99761"/><stop offset=".65" stop-color="#f8e7be"/><stop offset="1" stop-color="#a88552"/></linearGradient></defs><ellipse cx="126" cy="192" rx="83" ry="12" fill="#203f58" opacity=".13"/><g class="ct-book-float"><g transform="rotate(11 124 112)"><rect x="68" y="39" width="123" height="146" rx="13" fill="#3a5d70"/><rect x="64" y="34" width="124" height="146" rx="12" fill="url(#ct-leaf)"/><path d="M72 170h108M72 173h108M72 176h104" stroke="#a5b3b2"/></g><g transform="rotate(-12 112 104)"><path d="M169 46h16q5 0 5 5v18q0 5-5 5h-16" fill="#d6ba88"/><path d="M169 82h19q5 0 5 5v18q0 5-5 5h-19" fill="#b4cbb7"/><path d="M169 118h16q5 0 5 5v18q0 5-5 5h-16" fill="#c7b4d3"/><rect x="46" y="27" width="129" height="153" rx="14" fill="#2a4c63"/><rect x="43" y="21" width="129" height="153" rx="14" fill="url(#ct-cover)" stroke="#d8ebea" stroke-width="1.5"/><path d="M61 23v148" stroke="#23445d" stroke-opacity=".5"/><path d="M64 24v147" stroke="#e5f3ec" stroke-opacity=".45"/><rect x="70" y="33" width="90" height="124" rx="7" stroke="#e2eee4" stroke-opacity=".42" stroke-dasharray="2 3"/><circle cx="115" cy="80" r="28" fill="#204c66" fill-opacity=".2" stroke="#d6e6dc" stroke-opacity=".7"/><circle cx="115" cy="73" r="10" fill="url(#ct-metal)"/><path d="M96 96c0-19 38-19 38 0" fill="url(#ct-metal)"/><path d="M91 122h48M102 130h26" stroke="#e8e9d8" stroke-linecap="round" stroke-width="2"/>${[49,77,105,133].map(y=>`<path d="M50 ${y}c-23-13-24 15-2 7" stroke="#284358" stroke-width="6"/><path d="M50 ${y-1}c-23-13-24 15-2 7" stroke="url(#ct-metal)" stroke-width="4" stroke-linecap="round"/>`).join('')}<path d="M73 24h82q13 0 13 13" stroke="white" stroke-opacity=".65"/></g></g><g class="ct-orbit-card"><g transform="rotate(9 190 162)"><rect x="161" y="144" width="56" height="43" rx="9" fill="url(#ct-leaf)" stroke="white"/><circle cx="176" cy="160" r="6" fill="#9bb9b0"/><path d="M168 174q8-13 16 0" fill="#9bb9b0"/><path d="M190 159h17M190 165h13M190 171h9" stroke="#7d96a1" stroke-width="2" stroke-linecap="round"/></g></g><path d="M205 65v10M200 70h10M27 134v8M23 138h8" stroke="#e5c695" stroke-linecap="round"/><circle cx="203" cy="114" r="3" fill="#a7c3ba"/></svg>`;
  }
  function duplicateIds(list=rows('contacts')) {
    const keys=new Map(),duplicates=new Set();
    for(const x of list)for(const key of [x.phone?'tel:'+phoneKey(x.phone):'',x.email?'mail:'+normalize(x.email):''].filter(Boolean)) {
      if(keys.has(key)){duplicates.add(keys.get(key));duplicates.add(x.id);}else keys.set(key,x.id);
    }
    return duplicates;
  }
  const contactGroups=()=>[...new Set(rows('contacts').map(x=>x.group).filter(Boolean))].sort((a,b)=>a.localeCompare(b,'ja'));
  function ctBirthday(value) {
    if(!validDay(value))return Infinity;
    const now=new Date(),today=new Date(now.getFullYear(),now.getMonth(),now.getDate()),month=Number(value.slice(5,7))-1,date=Number(value.slice(8));
    // Observe Feb 29 on Feb 28 in non-leap years; never mutate the stored birthday.
    const nextFor=year=>new Date(year,month,Math.min(date,new Date(year,month+1,0).getDate()));
    let next=nextFor(now.getFullYear());if(next<today)next=nextFor(now.getFullYear()+1);
    return Math.round((next-today)/86400000);
  }
  function visibleContacts() {
    const list=rows('contacts'),duplicates=duplicateIds(list),query=ctText(contactQuery),numberQuery=phoneKey(contactQuery);
    return list.filter(x=>(contactGroup==='*'||(x.group||'')===contactGroup)
      && (contactFilter==='all'||(contactFilter==='favorites'?x.favorite:contactFilter==='birthdays'?ctBirthday(x.birthday)<=30:duplicates.has(x.id)))
      && (ctText(Object.keys(ctFields).map(k=>x[k]||'').join(' ')).includes(query)||(numberQuery&&phoneKey(x.phone).includes(numberQuery))))
      .sort((a,b)=>(contactSort==='favorite'?Number(!!b.favorite)-Number(!!a.favorite):contactSort==='updated'?(Number(b.updatedAt)||0)-(Number(a.updatedAt)||0):contactSort==='recent'?(b.lastContact||'').localeCompare(a.lastContact||''):contactSort==='birthday'?ctBirthday(a.birthday)-ctBirthday(b.birthday):0)||ctText(a.kana||a.name).localeCompare(ctText(b.kana||b.name),'ja'));
  }
  function ctWrite(list,label,render=renderContacts) {
    const before=rows('contacts');
    if(!A.save('contacts',list)){A.toast('連絡先を保存できません。再試行してください');return false;}
    ctUndo={before,after:JSON.stringify(list),label};render?.();return true;
  }
  function ctUpdate(record,label,render=renderContacts) {
    const list=rows('contacts'),index=list.findIndex(x=>x.id===record.id);
    if(index<0)list.unshift(record);else list[index]=record;return ctWrite(list,label,render);
  }
  const ctUndoBar=()=>ctUndo?`<div class="ct-undo" role="status"><span>${esc(ctUndo.label)}</span>${button('ctUndo','取り消す')}</div>`:'';
  function ctRow(x,i,duplicates) {
    return `<article class="ct-row" style="--ct-delay:${Math.min(i,9)*24}ms">${ctSelecting?`<input class="ct-check" type="checkbox" data-contact-select="${esc(x.id)}" aria-label="${esc(x.name)}を選択" ${ctSelected.has(x.id)?'checked':''}>`:''}<button class="ct-person" data-action="evContactOpen" data-id="${esc(x.id)}">${ctAvatar(x)}<span class="ct-person-text"><strong>${esc(x.name)}</strong><small>${esc([x.company,x.group].filter(Boolean).join(' · ')||x.phone||x.email||'連絡先未入力')}</small>${contactFilter==='birthdays'?`<em>${ctBirthday(x.birthday)===0?'今日がお誕生日':ctBirthday(x.birthday)+'日後のお誕生日'}</em>`:''}${duplicates.has(x.id)?'<em>同じ番号・メールの候補あり</em>':''}</span></button>${ctSelecting?'':`<button class="ct-star" data-action="ctQuickFavorite" data-id="${esc(x.id)}" aria-label="${esc(x.name)}のお気に入りを${x.favorite?'解除':'登録'}" aria-pressed="${!!x.favorite}">${A.icon('star')}</button>`}</article>`;
  }
  function ctResults() {
    const host=$('#ep-contact-results');if(!host)return;host.className='ct-results ct-layout-'+ctLayout;
    const list=visibleContacts(),duplicates=duplicateIds(),shown=list.slice(0,ctLimit),liveIds=new Set(rows('contacts').map(x=>x.id));ctSelected=new Set([...ctSelected].filter(id=>liveIds.has(id)));
    $('#ep-contact-count').textContent=`${list.length}件`+(contactFilter==='duplicates'?' · 自動統合なし':'');
    host.innerHTML=shown.map((x,i)=>ctRow(x,i,duplicates)).join('')||`<div class="ct-empty">${A.icon('contacts')}<h3>${rows('contacts').length?'見つかりませんでした':'大切な人を、ここに。'}</h3><p>${rows('contacts').length?'検索や絞り込みを変えてみてください。':'最初の連絡先から、あなたのアドレス帳が始まります。'}</p>${button(rows('contacts').length?'ctReset':'evContactEdit',rows('contacts').length?'絞り込みを解除':'連絡先を追加')}</div>`;
    $('#ct-more').innerHTML=list.length>shown.length?button('ctMore',`続きを表示（残り${list.length-shown.length}件）`):'';
    $('#ct-selection').innerHTML=ctSelecting?`<div class="ct-selection"><strong>${ctSelected.size}件を選択</strong>${button('ctSelectAll','条件内の全件')}${button('ctSelectNone','選択解除')}<div>${button('ctBulkGroup','分類')}${button('ctBulkFavorite','お気に入り')}${button('ctExportSelected','書き出す')}${button('ctBulkDelete','削除')}${button('ctMerge','2件を統合')}${button('ctSelectedJSON','JSON保存')}</div><small>絞り込みで隠れた選択も操作対象です。</small></div>`:'';
    host.querySelectorAll('[data-contact-select]').forEach(input=>input.onchange=()=>{if(input.checked)ctSelected.add(input.dataset.contactSelect);else ctSelected.delete(input.dataset.contactSelect);$('#ct-selection strong').textContent=`${ctSelected.size}件を選択`;});
  }
  function renderContacts() {
    ctDetail='';if(contactGroup!=='*'&&contactGroup!==''&&!contactGroups().includes(contactGroup))contactGroup='*';
    const all=rows('contacts'),favorites=all.filter(x=>x.favorite),birthdays=all.filter(x=>ctBirthday(x.birthday)<=30).length;
    page('contacts',`<section class="ct-hero"><div class="ct-hero-copy"><span class="ct-eyebrow">PEOPLE ATELIER</span><h1>つながりを、<br>大切に。</h1><p><strong>${all.length}</strong> 人のアドレス帳</p></div>${ctArt()}<div class="ct-hero-foot">${A.icon('lock')}このブラウザに保存・自動送信なし</div></section>
      ${favorites.length?`<section class="ct-favorites" aria-label="お気に入り"><div class="ct-section-head"><h3>すぐに会いたい人</h3><span>${favorites.length}人</span></div><div class="ct-favorite-rail">${favorites.slice(0,12).map(x=>`<button data-action="evContactOpen" data-id="${esc(x.id)}">${ctAvatar(x)}<strong>${esc(x.name)}</strong><small>${esc(x.group||'お気に入り')}</small></button>`).join('')}${favorites.length>12?button('epContactFilter','すべて見る','favorites'):''}</div></section>`:''}
      ${ctBirthdayCard()}${ctGroupsPanel()}<div class="ct-search">${A.search('ep-contact-query','名前・よみ・会社・番号で検索')}</div>
      ${tabs([['all','すべて'],['favorites','お気に入り'],['birthdays',`誕生日${birthdays?' '+birthdays:''}`],['duplicates','重複候補']],contactFilter,'epContactFilter')}
      <div class="ct-filter-grid"><div>${select('グループ','contact-group',[['*','すべて'],['','未分類'],...contactGroups().map(x=>[x,x])],contactGroup)}</div><div>${select('並び順','contact-sort',[['favorite','お気に入り順'],['name','よみ・名前順'],['updated','更新が新しい順'],['recent','連絡日が新しい順'],['birthday','誕生日が近い順']],contactSort)}</div></div>
      ${contactFilter==='birthdays'?'<p class="ep-muted">今日から30日以内。2月29日は平年のみ2月28日として表示。</p>':''}
      <div class="ct-section-head"><h3 id="ep-contact-count" role="status"></h3><button class="ct-layout-button" data-action="ctLayout" aria-label="${ctLayout==='list'?'カード表示へ':'リスト表示へ'}" aria-pressed="${ctLayout==='cards'}">${ctLayout==='list'?A.icon('grid'):ctIcon('list')}</button>${button('ctSelectMode',ctSelecting?'選択を終了':'複数選択','',`aria-pressed="${ctSelecting}"`)}</div><div id="ct-selection"></div><div class="ct-results" id="ep-contact-results"></div><div id="ct-more" class="ct-more"></div>
      ${details('読み込み・書き出し',`<p class="ep-muted">vCardは端末の連絡先へ。JSONは追加項目も含むバックアップです。個人情報を含むため共有先にご注意ください。</p><div class="ct-tools">${button('epContactExport','表示中のvCard')}${button('evContactsExport','全件のvCard')}${button('ctJSONExport','全件のJSON')}${button('ctImport','JSONを読み込む')}</div><p class="ep-muted">クラウド同期・端末の連絡先の自動取得はありません。複数タブからの同時編集は避けてください。</p>`)}${ctUndoBar()}`,iconButton('evContactEdit','連絡先を追加','plus'));
    $('#ep-contact-query').value=contactQuery;$('#ep-contact-query').oninput=e=>{contactQuery=e.target.value;ctLimit=60;ctResults();};
    $('#ep-contact-group').onchange=e=>{contactGroup=e.target.value;ctLimit=60;ctResults();};$('#ep-contact-sort').onchange=e=>{contactSort=e.target.value;ctResults();};ctResults();
  }
  function ctRenderAtPosition(action){const scroll=$('.ev-contacts')?.scrollTop||0;renderContacts();$('.ev-contacts').scrollTop=scroll;$('.ev-contacts [data-action="'+action+'"]')?.focus({preventScroll:true});}
  A.actions.ctLayout=()=>{const next=ctLayout==='list'?'cards':'list';if(!A.save('contactLayout',next))return;ctLayout=next;ctRenderAtPosition('ctLayout');};
  A.apps.contacts.render=renderContacts;A.actions.evContactsHome=renderContacts;
  A.actions.epContactFilter=el=>{contactFilter=el.dataset.id;ctLimit=60;renderContacts();};
  A.actions.ctReset=()=>{contactGroup='*';contactFilter='all';contactQuery='';ctLimit=60;renderContacts();};
  A.actions.ctMore=()=>{ctLimit+=60;ctResults();};
  A.actions.ctSelectMode=()=>{ctSelecting=!ctSelecting;ctSelected.clear();ctRenderAtPosition('ctSelectMode');};
  A.actions.ctSelectAll=()=>{visibleContacts().forEach(x=>ctSelected.add(x.id));ctResults();};A.actions.ctSelectNone=()=>{ctSelected.clear();ctResults();};
  function ctValid(v) {
    if(!v.name?.trim()){A.toast('名前を入力してください');return false;}
    if(v.phone&&!/^\+?[0-9]{3,15}$/.test(phoneKey(v.phone))){A.toast('電話番号を確認してください');return false;}
    if(v.email&&!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.email)){A.toast('メールアドレスを確認してください');return false;}
    if(v.group?.trim()==='*'){A.toast('別のグループ名を入力してください');return false;}
    if((v.birthday&&!validDay(v.birthday))||(v.lastContact&&(!validDay(v.lastContact)||v.lastContact>day()))){A.toast('日付を確認してください。連絡日は今日以前を指定します');return false;}return true;
  }
  A.actions.evContactEdit=(el={dataset:{}})=>{
    const x=ctFind(el.dataset.id),back=!!x&&ctDetail===x.id;
    A.form(x?'プロフィールを編集':'新しいつながり',`<div class="ct-editor-preview" id="ct-editor-preview">${ctAvatar(x||{name:'A'},true)}<span>PERSONAL CONTACT<br><small>あなただけのアドレス帳</small></span></div>`+
      field('名前','name',x?.name||'','text','required maxlength="80" autocomplete="name"')+field('よみがな','kana',x?.kana||'','text','maxlength="100"')+field('電話番号','phone',x?.phone||'','tel','maxlength="24" autocomplete="tel"')+field('メール','email',x?.email||'','email','maxlength="254" autocomplete="email"')+
      field('グループ','group',x?.group||'','text','maxlength="40" list="ep-contact-groups" placeholder="家族・友人・仕事など"')+`<datalist id="ep-contact-groups">${contactGroups().map(g=>`<option value="${esc(g)}"></option>`).join('')}</datalist>`+select('アバターの色','tone',ctTones,ctTone(x||{name:'A'}))+
      details('会社・住所・記念日',field('会社・組織','company',x?.company||'','text','maxlength="120"')+field('役職','role',x?.role||'','text','maxlength="80"')+field('住所','address',x?.address||'','text','maxlength="300"')+field('誕生日','birthday',x?.birthday||'','date')+field('最後に連絡した日（手動）','lastContact',x?.lastContact||'','date',`max="${day()}"`))+area('メモ','note',x?.note||'',12000),v=>{
        for(const key of Object.keys(ctFields))v[key]=String(v[key]||'').trim();if(!ctValid(v))return false;
        if(x&&JSON.stringify(ctFind(x.id))!==JSON.stringify(x)){A.toast('別の操作で変更されています。開き直してください');return false;}
        if(!x&&rows('contacts').length>=5000){A.toast('連絡先の上限は5,000件です');return false;}
        const record={...x,...v,id:x?.id||A.id(),favorite:x?.favorite||false,updatedAt:Date.now()};
        return ctUpdate(record,x?'プロフィールを更新しました':'連絡先を追加しました',()=>{if(!x){contactGroup='*';contactFilter='all';contactQuery='';}if(back||!x)A.actions.evContactOpen({dataset:{id:record.id}});else renderContacts();});
      });
    $('#modal-form').classList.add('ct-editor');
    const preview=()=>{$('#ct-editor-preview').innerHTML=ctAvatar({name:$('#ep-name').value||'A',tone:$('#ep-tone').value},true)+'<span>PERSONAL CONTACT<br><small>あなただけのアドレス帳</small></span>';};$('#ep-name').oninput=preview;$('#ep-tone').onchange=preview;
  };
  const ctSummary=x=>[['名前',x.name],['よみ',x.kana],['電話',x.phone],['メール',x.email],['グループ',x.group],['会社',x.company],['役職',x.role],['住所',x.address],['誕生日',x.birthday],['連絡日（手動）',x.lastContact],['メモ',x.note]].filter(([,v])=>v).map(([k,v])=>`${k}: ${v}`).join('\n');
  A.actions.evContactOpen=el=>{
    const x=ctFind(el.dataset.id);if(!x){A.toast('連絡先が見つかりません');return renderContacts();}ctDetail=x.id;
    const phone=phoneKey(x.phone),validPhone=/^\+?[0-9]{3,15}$/.test(phone);
    const info=(key,label)=>x[key]?`<div class="ct-info-row"><dt>${label}</dt><dd><span>${esc(x[key])}</span><button class="ct-copy" data-action="ctCopyField" data-id="${esc(x.id)}" data-field="${key}" aria-label="${label}をコピー">${ctIcon('copy')}</button></dd></div>`:'';
    page('contacts',`<section class="ct-profile ct-tone-${ctTone(x)}"><div class="ct-profile-lines" aria-hidden="true"><svg viewBox="0 0 320 240" fill="none"><path d="M-20 145C100 10 150 290 350 40M-20 157C100 22 150 302 350 52M-20 169C100 34 150 314 350 64M-20 181C100 46 150 326 350 76" stroke="currentColor"/><circle cx="268" cy="39" r="66" stroke="currentColor"/><circle cx="268" cy="39" r="80" stroke="currentColor"/></svg></div><span class="ct-eyebrow">PERSONAL CONTACT</span>${ctAvatar(x,true)}${x.kana?`<p class="ct-kana">${esc(x.kana)}</p>`:''}<h1>${esc(x.name)}</h1><p class="ct-company">${esc([x.company,x.role].filter(Boolean).join(' / ')||'あなたの大切なつながり')}</p><div class="ct-profile-tags"><span>${esc(x.group||'未分類')}</span><button data-action="evContactFavorite" data-id="${esc(x.id)}" aria-pressed="${!!x.favorite}">${A.icon('star')}${x.favorite?'お気に入り':'登録する'}</button></div></section>
      <div class="ct-contact-actions">${validPhone?`<a href="tel:${esc(phone)}">${A.icon('phone')}電話</a><a href="sms:${esc(phone)}">${A.icon('messages')}SMS</a>`:''}${x.email?`<a href="mailto:${esc(encodeURIComponent(x.email))}">${A.icon('mail')}メール</a>`:''}${!validPhone&&!x.email?button('evContactEdit','電話・メールを登録',x.id):''}</div><p class="ct-handoff-note">発信・送信は移動先のアプリで確認します</p>
      <dl class="ct-info">${info('phone','電話番号')}${info('email','メール')}${info('company','会社・組織')}${info('role','役職')}${info('address','住所')}${info('birthday','誕生日')}</dl><section class="ct-touch"><div>${A.icon('calendar')}<span>最後に連絡した日<small>${esc(x.lastContact||'まだ記録がありません')} · 手動記録</small></span></div>${button('ctTouch','今日を記録',x.id)}<p>通話・送信の結果は自動取得しません。</p></section>
      ${x.note?`<section class="ct-note"><span class="ct-eyebrow">PERSONAL NOTES</span><p>${esc(x.note)}</p></section>`:''}<div class="ct-tools">${button('epContactCopy','コピー',x.id)}${button('ctShare','共有',x.id)}${button('ctExportOne','vCard保存',x.id)}</div>
      ${details('連絡先の管理',button('evContactEdit','編集する',x.id)+button('evContactDelete','削除する',x.id)+'<p class="ep-muted">削除後は「取り消す」で復元できます。このタブで直前の1操作のみ。</p>')}${ctUndoBar()}`,iconButton('evContactEdit','連絡先を編集','edit',x.id),'evContactsHome');
  };
  A.actions.evContactFavorite=el=>{const x=ctFind(el.dataset.id);if(x)ctUpdate({...x,favorite:!x.favorite,updatedAt:Date.now()},'お気に入りを変更しました',()=>A.actions.evContactOpen(el));};
  A.actions.ctQuickFavorite=el=>{const x=ctFind(el.dataset.id);if(!x)return;const scroll=$('.ev-contacts')?.scrollTop||0;ctUpdate({...x,favorite:!x.favorite,updatedAt:Date.now()},'お気に入りを変更しました',()=>{renderContacts();$('.ev-contacts').scrollTop=scroll;[...document.querySelectorAll('.ct-star')].find(b=>b.dataset.id===x.id)?.focus({preventScroll:true});});};
  A.actions.evContactDelete=el=>{const id=el.dataset.id;A.confirm('連絡先を削除しますか？','このブラウザから削除します。直後は取り消せます。',()=>ctWrite(rows('contacts').filter(x=>x.id!==id),'連絡先を削除しました'));};
  A.actions.epContactCopy=el=>{const x=ctFind(el.dataset.id);if(x)copy(ctSummary(x));};
  A.actions.ctCopyField=el=>{const x=ctFind(el.dataset.id);if(x&&Object.hasOwn(ctFields,el.dataset.field))copy(String(x[el.dataset.field]||''));};
  A.actions.ctShare=el=>{
    const x=ctFind(el.dataset.id);if(!x)return;
    A.form('共有する項目',`<p class="ct-import-help">選んだ項目だけを共有します。住所・誕生日・メモは初期状態では含みません。</p><div class="ct-share-fields">${Object.keys(ctFields).filter(k=>x[k]).map(k=>`<label><input type="checkbox" name="${k}" value="yes" ${['name','phone','email','company','role'].includes(k)?'checked':''}><span>${ctLabels[k]}</span></label>`).join('')}</div><details class="ep-details"><summary>共有内容のプレビュー</summary><pre id="ct-share-preview"></pre></details>`,v=>{
      const keys=Object.keys(ctFields).filter(k=>v[k]==='yes'&&x[k]);if(!keys.length){A.toast('共有する項目を選んでください');return false;}
      const text=keys.map(k=>ctLabels[k]+': '+x[k]).join('\n');
      if(navigator.share)navigator.share({title:'連絡先',text}).catch(error=>{if(error.name!=='AbortError')A.toast('共有できません。コピーをお使いください');});else copy(text);
    },navigator.share?'選択項目を共有':'選択項目をコピー');
    const form=$('#modal-form'),preview=$('#ct-share-preview');
    const refresh=()=>{const values=Object.fromEntries(new FormData(form));preview.textContent=Object.keys(ctFields).filter(k=>values[k]==='yes'&&x[k]).map(k=>ctLabels[k]+': '+x[k]).join('\n')||'項目を選択してください';};
    form.onchange=refresh;refresh();
  };
  A.actions.ctTouch=el=>{const x=ctFind(el.dataset.id);if(x)ctUpdate({...x,lastContact:day(),updatedAt:Date.now()},'今日の連絡を記録しました',()=>A.actions.evContactOpen(el));};
  A.actions.ctUndo=()=>{if(!ctUndo)return;if(JSON.stringify(rows('contacts'))!==ctUndo.after){A.toast('他の操作で変更されたため取り消せません');return;}if(!A.save('contacts',ctUndo.before)){A.toast('復元できません。再試行してください');return;}ctUndo=null;ctSelected.clear();renderContacts();A.toast('元に戻しました');};
  function ctSelection(){const list=rows('contacts').filter(x=>ctSelected.has(x.id));if(!list.length)A.toast('連絡先を選択してください');return list;}
  function ctBulk(update,label){if(!ctSelection().length)return false;return ctWrite(rows('contacts').map(x=>ctSelected.has(x.id)?{...x,...update,updatedAt:Date.now()}:x),label);}
  A.actions.ctBulkGroup=()=>{if(!ctSelection().length)return;A.form('選択した連絡先を分類',field('グループ（空欄で未分類）','group','','text','maxlength="40"'),v=>{if(v.group.trim()==='*'){A.toast('別のグループ名を入力してください');return false;}return ctBulk({group:v.group.trim()},'選択した連絡先を分類しました');});};
  A.actions.ctBulkFavorite=()=>{if(!ctSelection().length)return;A.form('お気に入りをまとめて変更',select('操作','favorite',[['yes','登録する'],['no','解除する']],'yes'),v=>ctBulk({favorite:v.favorite==='yes'},'お気に入りをまとめて変更しました'));};
  A.actions.ctBulkDelete=()=>{const selected=ctSelection();if(!selected.length)return;const ids=new Set(selected.map(x=>x.id));A.confirm(`${ids.size}件を削除しますか？`,'絞り込みで隠れている選択も含みます。直後は取り消せます。',()=>ctWrite(rows('contacts').filter(x=>!ids.has(x.id)),`${ids.size}件を削除しました`));};
  // All dates and birthday art reflect saved records, never generated demo people.
  function ctBirthdayCard() {
    const next=rows('contacts').map(x=>({x,days:ctBirthday(x.birthday)})).filter(item=>item.days<=30).sort((a,b)=>a.days-b.days)[0];
    if(!next)return '';
    return `<button class="ct-birthday-card" data-action="evContactOpen" data-id="${esc(next.x.id)}"><svg viewBox="0 0 90 80" fill="none" aria-hidden="true"><ellipse cx="45" cy="70" rx="32" ry="6" fill="#956740" opacity=".12"/><path d="M16 43h58v22c0 10-58 10-58 0z" fill="#c39483"/><ellipse cx="45" cy="44" rx="29" ry="9" fill="#f7e7d5"/><path d="M16 44v10q4 10 9 0q5-8 10 1q5 10 10 0q5-10 10-1q5 10 10 0q5-8 9-3v-7" fill="#edd6c2"/><path d="M28 66h34" stroke="#eedcc9" stroke-linecap="round"/><path d="M45 27v17" stroke="#77948b" stroke-width="5"/><path d="M45 10c-14 13 6 24 6 10c0-4-4-5-6-10" fill="#d4a157"/><path d="M16 19l3 6M73 19l-4 5M25 7l-2 5" stroke="#c4a779" stroke-width="2" stroke-linecap="round"/></svg><span><small>UPCOMING BIRTHDAY</small><strong>${esc(next.x.name)}</strong><em>${next.days===0?'今日がお誕生日です':`${next.days}日後 · ${esc(next.x.birthday.slice(5).replace('-',' / '))}`}</em></span>${A.icon('arrow')}</button>`;
  }
  function ctGroupsPanel() {
    const counts=new Map();for(const x of rows('contacts')){const key=x.group||'';counts.set(key,(counts.get(key)||0)+1);}
    if(!counts.size)return '';
    return details('グループの一覧',`<div class="ct-group-list">${[...counts].sort((a,b)=>b[1]-a[1]).map(([name,count])=>`<div class="ct-group-item"><button data-action="ctGroupUse" data-id="${esc(name)}"><span class="ct-group-orb ct-tone-${ctTone({name})}">${A.icon('contacts')}</span><span><strong>${esc(name||'未分類')}</strong><small>${count}人</small></span></button>${name?`<button class="ct-group-edit" data-action="ctGroupEdit" data-id="${esc(name)}" aria-label="${esc(name)}グループを編集">${A.icon('edit')}</button>`:''}</div>`).join('')}</div><p class="ep-muted">分類を解除しても連絡先は削除されません。</p>`);
  }
  A.actions.ctGroupUse=el=>{contactGroup=el.dataset.id;contactFilter='all';contactQuery='';ctLimit=60;renderContacts();};
  A.actions.ctGroupEdit=el=>{
    const name=el.dataset.id,records=rows('contacts').filter(x=>x.group===name),snapshot=JSON.stringify(records);if(!records.length)return;
    A.form('グループを編集',`<p class="ct-import-help">「${esc(name)}」の${records.length}人が対象。同名のグループがあればまとめます。</p>`+select('操作','operation',[['rename','名前を変更'],['clear','分類を解除して未分類へ']],'rename')+field('新しいグループ名','group',name,'text','maxlength="40"'),v=>{
      const list=rows('contacts');if(JSON.stringify(list.filter(x=>x.group===name))!==snapshot){A.toast('対象が変更されています。開き直してください');return false;}
      const next=v.operation==='clear'?'':v.group.trim();if(next==='*'||(v.operation==='rename'&&!next)){A.toast('グループ名を入力してください');return false;}
      if(!ctWrite(list.map(x=>x.group===name?{...x,group:next,updatedAt:Date.now()}:x),'グループを更新しました',null))return false;contactGroup=next;renderContacts();return true;
    });
  };
  A.actions.ctMerge=()=>{
    const selected=ctSelection();if(selected.length!==2){A.toast('統合する連絡先を2件だけ選んでください');return;}
    const [a,b]=selected,merged={...b,...a},choices=new Map();
    for(const key of Object.keys(ctFields)){const values=[...new Set([a[key],b[key]].map(v=>String(v||'').trim()).filter(Boolean))];merged[key]=values[0]||'';if(values.length>1)choices.set(key,values);}
    A.form('2件の連絡先を統合',`<div class="ct-merge-people"><div>${ctAvatar(a)}<strong>${esc(a.name)}</strong></div><span aria-hidden="true">→</span><div>${ctAvatar(b)}<strong>${esc(b.name)}</strong></div></div><p class="ct-import-help">2件を1件にまとめます。異なる内容は残す方を選択してください。選ばなかった値は削除されます。直後は取り消せます。</p>${[...choices].map(([key,values])=>`<fieldset class="ct-merge-field"><legend>${ctLabels[key]}</legend>${values.map((value,index)=>`<label><input type="radio" name="merge-${key}" value="${index}" ${index===0?'checked':''}><span>${esc(value)}</span></label>`).join('')}</fieldset>`).join('')||'<p class="ct-import-help">異なる項目はありません。空欄はもう一方の値で補います。</p>'}<label class="ct-merge-confirm"><input type="checkbox" required>残す内容を確認しました</label>`,v=>{
      const list=rows('contacts');if(JSON.stringify(list.find(x=>x.id===a.id))!==JSON.stringify(a)||JSON.stringify(list.find(x=>x.id===b.id))!==JSON.stringify(b)){A.toast('対象が変更されています。開き直してください');return false;}
      for(const [key,values] of choices){const index=Number(v['merge-'+key]);if(!Number.isInteger(index)||!values[index])return false;merged[key]=values[index];}
      merged.id=a.id;merged.favorite=!!(a.favorite||b.favorite);merged.tone=ctTone(a);merged.updatedAt=Date.now();if(!ctValid(merged))return false;
      if(!ctWrite(list.filter(x=>x.id!==b.id).map(x=>x.id===a.id?merged:x),'2件を統合しました',null))return false;ctSelected.clear();ctSelecting=false;A.actions.evContactOpen({dataset:{id:a.id}});return true;
    },'選択した内容で統合');
  };
  A.actions.ctSelectedJSON=()=>{const list=ctSelection();if(list.length)download('aura-contacts-selected-'+day()+'.json',JSON.stringify({app:'aura-contacts',version:1,contacts:list},null,2),'application/json');};
  const vcf=value=>String(value||'').replace(/\\/g,'\\\\').replace(/\r\n|\r|\n/g,'\\n').replace(/[,;]/g,'\\$&');
  function ctFold(line){const encoder=new TextEncoder();let output='',bytes=0;for(const char of line){const size=encoder.encode(char).length;if(bytes+size>75){output+='\r\n ';bytes=1;}output+=char;bytes+=size;}return output;}
  function exportContacts(list) {
    if(!list.length)return A.toast('書き出す連絡先がありません');
    download('aura-contacts.vcf',list.map(x=>['BEGIN:VCARD','VERSION:3.0','FN:'+vcf(x.name),'N:'+vcf(x.name)+';;;;',x.phone?'TEL:'+vcf(x.phone):'',x.email?'EMAIL:'+vcf(x.email):'',x.group?'CATEGORIES:'+vcf(x.group):'',x.company?'ORG:'+vcf(x.company):'',x.role?'TITLE:'+vcf(x.role):'',x.address?'ADR:;;'+vcf(x.address)+';;;;':'',validDay(x.birthday)?'BDAY:'+x.birthday:'',x.kana?'SORT-STRING:'+vcf(x.kana):'',x.note?'NOTE:'+vcf(x.note):'','END:VCARD'].filter(Boolean).map(ctFold).join('\r\n')).join('\r\n')+'\r\n','text/vcard');
  }
  A.actions.epContactExport=()=>exportContacts(visibleContacts());A.actions.evContactsExport=()=>exportContacts(rows('contacts'));
  A.actions.ctExportOne=el=>{const x=ctFind(el.dataset.id);if(x)exportContacts([x]);};A.actions.ctExportSelected=()=>{const list=ctSelection();if(list.length)exportContacts(list);};
  A.actions.ctJSONExport=()=>download('aura-contacts-'+day()+'.json',JSON.stringify({app:'aura-contacts',version:1,contacts:rows('contacts')},null,2),'application/json');
  function ctImportRecord(raw) {
    if(!raw||typeof raw!=='object'||Array.isArray(raw))throw new Error('連絡先の形式が正しくありません');const x={};
    for(const [key,max] of Object.entries(ctFields)){if(raw[key]!=null&&typeof raw[key]!=='string')throw new Error('文字列以外の項目があります');const value=(raw[key]||'').trim();if(value.length>max)throw new Error('長すぎる項目があります');x[key]=value;}
    if(!ctValid(x))throw new Error('名前・電話・メール・日付・グループを確認してください');return {...x,id:A.id(),favorite:raw.favorite===true,tone:ctTone(raw),updatedAt:Number.isSafeInteger(raw.updatedAt)&&raw.updatedAt>=0&&raw.updatedAt<=Date.now()?raw.updatedAt:Date.now()};
  }
  const ctFingerprint=x=>JSON.stringify(Object.keys(ctFields).map(k=>String(x[k]||'').trim()));
  function ctImportUnique(incoming,existing){const keys=new Set(existing.map(ctFingerprint)),added=[];for(const x of incoming){const key=ctFingerprint(x);if(!keys.has(key)){keys.add(key);added.push(x);}}return added;}
  A.actions.ctImport=()=>{
    let incoming=null,sequence=0;
    A.form('JSONを読み込む','<p class="ct-import-help">このアプリのJSONバックアップのみ。20MB・5,000件まで。上書きせず追加し、同じプロフィール内容はスキップします。スキップ時は既存の色・お気に入りを優先します。</p><label class="form-label" for="ct-import-file">バックアップファイル</label><input class="text-input" id="ct-import-file" type="file" accept=".json,application/json"><p id="ct-import-status" class="ct-import-help" role="status">ファイルを選択してください。</p><div id="ct-import-preview"></div>',()=>{
      if(!incoming)return false;const existing=rows('contacts'),added=ctImportUnique(incoming,existing);if(!added.length){A.toast('追加する連絡先はありません');return false;}if(existing.length+added.length>5000){A.toast('合計5,000件を超えます');return false;}
      if(!ctWrite([...existing,...added],`${added.length}件を読み込みました`,null))return false;contactGroup='*';contactFilter='all';contactQuery='';renderContacts();return true;
    },'確認して追加');
    const form=$('#modal-form'),input=$('#ct-import-file'),status=$('#ct-import-status'),preview=$('#ct-import-preview'),submit=form.querySelector('[type=submit]');submit.disabled=true;
    input.onchange=async()=>{
      const ticket=++sequence;incoming=null;submit.disabled=true;preview.innerHTML='';const file=input.files[0];if(!file){status.textContent='ファイルを選択してください。';return;}if(file.size>20*1024*1024){status.textContent='20MB以下のJSONを選択してください。';return;}status.textContent='読み込み中…';
      try{const data=JSON.parse(await file.text());if(ticket!==sequence||!form.isConnected)return;if(data?.app!=='aura-contacts'||data.version!==1||!Array.isArray(data.contacts)||data.contacts.length>5000)throw new Error('対応形式ではないか、5,000件を超えています');
        incoming=data.contacts.map(ctImportRecord);const added=ctImportUnique(incoming,rows('contacts'));status.textContent=`${added.length}件を追加・${incoming.length-added.length}件は内容一致でスキップ。番号・メールのみの一致は重複候補として残します。`;
        preview.innerHTML=added.slice(0,5).map(x=>`<div class="ct-import-person">${ctAvatar(x)}<span>${esc(x.name)}<small>${esc(x.group||'未分類')}</small></span></div>`).join('')+(added.length>5?`<p class="ct-import-help">ほか${added.length-5}件</p>`:'');submit.disabled=!added.length;
      }catch(error){if(ticket!==sequence||!form.isConnected)return;incoming=null;status.textContent=error instanceof SyntaxError?'JSONを読み取れません。ファイルを確認してください。':error.message;}
    };
  };

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
