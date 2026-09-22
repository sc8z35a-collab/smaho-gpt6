'use strict';
// Interoperable device handoffs; opening another app never counts as delivery.
(() => {
  const A = window.Aura, N = A.network, $ = A.$, esc = A.escape;
  const button = (action, text) => `<button type="button" class="connection-link" data-action="${action}">${esc(text)}</button>`;
  const status = text => `<div class="connection-state" role="status">${esc(text)}</div>`;
  N.offerFile = (blob, name) => {
    const file = new File([blob], name, {type: blob.type || 'application/octet-stream'});
    const shareable = navigator.canShare?.({files: [file]});
    A.overlay(`${A.overlayTitle('ファイルを共有')}<div class="connected-overlay"><p>${esc(name)}</p><div class="connection-toolbar">${shareable ? '<button class="primary-button" id="share-ready">共有先を選ぶ</button>' : '<p>共有非対応。端末に保存</p>'}<button class="connection-link" id="save-ready">端末に保存</button></div><p class="connected-caption">共有先を選択後に共有。自動アップロードなし</p><p id="file-share-status" role="status"></p></div>`);
    if ($('#share-ready')) $('#share-ready').onclick = async () => { try { await navigator.share({files: [file], title: name}); } catch (error) { if (error.name !== 'AbortError' && $('#file-share-status')) $('#file-share-status').textContent = '共有失敗。端末に保存'; } };
    $('#save-ready').onclick = () => A.download(blob, name);
  };
  const phoneNumber = raw => String(raw).replace(/[\s()-]/g, '');
  const validPhone = value => /^\+?[0-9]{3,15}$/.test(value);
  const handoffNote = '<details class="ui-help"><summary>連携の詳細</summary><p class="connected-caption">対応アプリが必要。発信・送信は移動先で確認。送受信・通話状況は取得しません。</p></details>';
  const originals = Object.fromEntries(['phone','messages','mail','music'].map(id => [id, A.apps[id].render]));
  // Native inboxes cannot be read here; never badge them with seeded demo counts.
  A.mailUnread = () => 0; A.messageUnread = () => 0;
  A.actions.phoneDemo = () => originals.phone();
  A.actions.messagesDemo = () => originals.messages();
  A.actions.mailDemo = () => { mailFlush(); mailEditing=null; A.closeOverlay(); originals.mail(); };
  A.actions.musicOriginals = () => { stopMusicCatalogue(); originals.music(); };
  A.actions.musicCatalogue = () => A.open('music');

  // Mail Studio keeps real drafts separate from the seeded mail demo.
  const mailKey = 'mailStudio', mailPending = new Map(), mailBases = new Map();
  const mailThemes = {sage:'セージ',rose:'ローズ',blue:'ミスト'};
  const mailLimits = {to:1000,cc:1000,bcc:1000,subject:200,body:12000};
  let mailFolder = 'drafts', mailQuery = '', mailSort = 'new', mailEditing = null, mailTimer, mailBase=null;
  const mailText = (v, max) => typeof v === 'string' ? v.slice(0, max) : '';
  const mailDraft = v => ({id:mailText(v.id,100) || A.id(), to:mailText(v.to,1000), cc:mailText(v.cc,1000), bcc:mailText(v.bcc,1000), subject:mailText(v.subject,200), body:mailText(v.body,12000), starred:!!v.starred, trash:!!v.trash, theme:Object.hasOwn(mailThemes,v.theme)?v.theme:'sage', updated:Number.isFinite(v.updated) ? v.updated : Date.now()});
  function mailValidStore(v) {
    if(!v || v.version!==1 || !Array.isArray(v.drafts) || v.drafts.length>100 || typeof v.signature!=='string' || v.signature.length>1000)return false;
    const ids=new Set();
    return v.drafts.every(d=>{
      if(!d || typeof d.id!=='string' || !d.id || d.id.length>100 || ids.has(d.id) || !Number.isFinite(d.updated) || Math.abs(d.updated)>8640000000000000)return false;
      ids.add(d.id);
      return Object.entries(mailLimits).every(([k,max])=>typeof d[k]==='string' && d[k].length<=max) && typeof d.starred==='boolean' && typeof d.trash==='boolean' && (d.theme===undefined || Object.hasOwn(mailThemes,d.theme));
    });
  }
  function mailStore() {
    // Unknown/corrupt storage is read-only, never silently replaced by an empty library.
    try {
      const raw=localStorage.getItem('aura.'+mailKey);
      if(raw!==null){const stored=JSON.parse(raw);if(!mailValidStore(stored))throw new Error('Invalid mail data');return {...stored,drafts:stored.drafts.map(mailDraft)};}
      const old=A.load('externalMailDraft',{}) || {};
      return {version:1,signature:'',drafts:[old.to,old.subject,old.body].some(v=>typeof v==='string' && v)?[mailDraft({...old,id:'legacy-mail',updated:Number.isFinite(old.updated)?old.updated:0})]:[]};
    }catch{return {version:1,signature:'',drafts:[],invalid:true};}
  }
  function mailCommit(next) {
    if(mailStore().invalid || !mailValidStore(next)){A.toast('保存データを確認できません。上書きせずバックアップを書き出してください');return false;}
    return A.save(mailKey,next);
  }
  const mailAll = () => { const map = new Map(mailStore().drafts.map(d=>[d.id,d])); mailPending.forEach((d,id)=>map.set(id,d)); return [...map.values()]; };
  const mailFind = id => mailAll().find(d=>d.id===id);
  const mailGlyph = name => {
    const paths = {write:'M16 3l5 5-12 12-6 1 1-6ZM14 5l5 5', envelope:'M3 6h18v13H3ZM3 6l9 7 9-7', star:'m12 3 2.8 5.7 6.2.9-4.5 4.4 1.1 6.2-5.6-3-5.6 3 1.1-6.2L3 9.6l6.2-.9Z', trash:'M4 7h16M9 7V4h6v3M6 7l1 14h10l1-14M10 10v7m4-7v7', search:'M16 16l5 5M18 10a8 8 0 1 1-16 0 8 8 0 0 1 16 0', arrow:'M4 12h16m-6-6 6 6-6 6', restore:'M4 10a8 8 0 1 1 0 6M4 4v6h6', copy:'M8 8h13v13H8ZM16 8V3H3v13h5', check:'m5 12 4 4L19 6', book:'M3 4h15v17H3ZM7 4v17M18 8h3m-3 5h3m-3 5h3', globe:'M3 12h18M12 3c-6 5-6 13 0 18 6-5 6-13 0-18M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0', seal:'M12 3 15 5l4 1 1 4 1 3-3 3-1 4-5-1-4 1-1-4-3-3 1-4 1-3 4-1ZM8 12l3 3 5-6'};
    return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${`<path d="${paths[name] || paths.envelope}"/>`}</svg>`;
  };
  const mailBtn = (action,label,icon,id='',extra='') => `<button type="button" class="ms-tool" data-action="${action}" data-id="${esc(id)}" aria-label="${esc(label)}" title="${esc(label)}" ${extra}>${mailGlyph(icon)}</button>`;
  function mailArt() {
    const p = 'ms-' + A.id();
    return `<svg class="ms-art" viewBox="0 0 320 230" fill="none" aria-hidden="true"><defs><linearGradient id="${p}-back" x1="50" y1="60" x2="235" y2="200" gradientUnits="userSpaceOnUse"><stop stop-color="#8eaaa2"/><stop offset="1" stop-color="#365e55"/></linearGradient><linearGradient id="${p}-paper" x1="120" y1="20" x2="200" y2="170" gradientUnits="userSpaceOnUse"><stop stop-color="#fffef4"/><stop offset="1" stop-color="#e6deca"/></linearGradient><linearGradient id="${p}-front" x1="80" y1="130" x2="220" y2="215" gradientUnits="userSpaceOnUse"><stop stop-color="#c3d3bb"/><stop offset=".5" stop-color="#9eb7a2"/><stop offset="1" stop-color="#769989"/></linearGradient><radialGradient id="${p}-wax" cx=".32" cy=".22" r=".85"><stop stop-color="#f7c3a4"/><stop offset=".48" stop-color="#cb8264"/><stop offset="1" stop-color="#92523f"/></radialGradient><filter id="${p}-shadow" x="-40%" y="-40%" width="190%" height="200%"><feDropShadow dx="0" dy="9" stdDeviation="7" flood-color="#193c36" flood-opacity=".24"/></filter></defs><ellipse class="ms-art-shadow" cx="168" cy="212" rx="94" ry="11" fill="#204e43" opacity=".13"/><g class="ms-envelope"><g transform="rotate(-10 160 130)" filter="url(#${p}-shadow)"><path d="M64 104 155 30Q163 24 171 31l95 75-5 96H64Z" fill="url(#${p}-back)" stroke="#608477"/><path d="m68 105 94-72 99 73" stroke="#d3e1c5" stroke-opacity=".65"/><g class="ms-letter"><rect x="85" y="47" width="153" height="143" rx="7" fill="url(#${p}-paper)" stroke="#fff9"/><rect x="94" y="56" width="135" height="123" rx="3" stroke="#ab9a7429"/><path d="M105 82h43m-43 19h111m-111 12h111m-111 12h81" stroke="#94a593" stroke-width="3" stroke-linecap="round"/><path d="m113 151 9-8 8 4 15-10" stroke="#be896e" stroke-width="2" stroke-linecap="round"/><rect x="190" y="62" width="27" height="28" rx="2" stroke="#a58e66" stroke-dasharray="2 2"/><path d="M194 81q9-23 19 0-9-9-19 0Z" fill="#b6c5a5"/></g><path d="M64 105 163 159 266 105v92q0 8-8 8H72q-8 0-8-8Z" fill="url(#${p}-front)" stroke="#89a694"/><path d="m65 106 99 55 100-55M65 201l73-57m124 57-75-57" stroke="#ecf1d8" stroke-opacity=".5"/><path d="M68 201 157 138q6-4 12 0l93 63" fill="url(#${p}-front)"/><path d="m70 201 88-62q5-4 10 0l91 62" stroke="#f5f6df" stroke-opacity=".65"/><g class="ms-wax"><path d="m181 162 1 8-5 6-2 8-8 2-6 4-7-3-8-1-3-8-4-6 3-8 2-7 8-2 7-3 7 4 8 2Z" fill="url(#${p}-wax)" stroke="#edb797"/><circle cx="160" cy="171" r="13" stroke="#e9b497"/><path d="m152 175 8-12 8 12m-13-4h10" stroke="#8f523c" stroke-width="1.7"/><path d="m153 174 7-10 7 10" stroke="#ffd4b2" stroke-opacity=".65"/></g></g></g><g class="ms-spark" stroke="#bb9572" stroke-linecap="round"><path d="M48 54v12m-6-6h12M283 150v8m-4-4h8"/><circle cx="269" cy="53" r="3"/></g><path d="M246 30q30 8 26 37" stroke="#789583" stroke-dasharray="2 5" opacity=".6"/></svg>`;
  }
  function mailPersist(d) {
    const store=mailStore(), current=store.drafts.find(x=>x.id===d.id), exists=!!current;
    const baseline=mailBases.has(d.id)?mailBases.get(d.id):mailEditing?.id===d.id?mailBase:undefined;
    if(baseline!==undefined && JSON.stringify(current || null)!==baseline){A.toast('別タブで変更されました。別の下書きとして保存かTXT書出を');return false;}
    if (!exists && store.drafts.length >= 100) { A.toast('下書きはゴミ箱を含め100件まで。不要な下書きを完全削除してください'); return false; }
    const next = {...store,drafts:exists ? store.drafts.map(x=>x.id===d.id ? {...d} : x) : [...store.drafts,{...d}]};
    if (!mailCommit(next)) return false;
    if(mailEditing?.id===d.id)mailBase=JSON.stringify(d);
    mailPending.delete(d.id);mailBases.delete(d.id);return true;
  }
  function mailSaveStatus(ok) {
    const el = $('#ms-save-state'); if (!el) return;
    el.textContent = ok ? '端末に保存済み · 未送信' : '未保存 · 再試行かTXT書出を';
    el.classList.toggle('ms-error',!ok); $('#ms-retry').hidden = ok;
  }
  function mailFlush() {
    clearTimeout(mailTimer);
    if (!mailEditing || !mailPending.has(mailEditing.id)) return true;
    const ok = mailPersist(mailEditing); mailSaveStatus(ok); return ok;
  }
  function mailChange() {
    const form = $('#external-mail'); if (!form || !mailEditing) return;
    Object.assign(mailEditing,Object.fromEntries(new FormData(form)),{updated:Date.now()});
    if(!mailPending.has(mailEditing.id))mailBases.set(mailEditing.id,mailBase);
    mailPending.set(mailEditing.id,{...mailEditing});
    $('#mail-handoff').textContent = ''; $('#ms-save-state').textContent = '保存待ち…';
    $('#ms-body-count').textContent = `${mailEditing.body.length.toLocaleString()} / 12,000`;
    mailChecklist();
    clearTimeout(mailTimer); mailTimer = setTimeout(mailFlush,450);
  }
  function mailChecklist() {
    const el=$('#ms-checklist');if(!el || !mailEditing)return;
    el.innerHTML=[['宛先',mailEditing.to],['件名',mailEditing.subject],['本文',mailEditing.body]].map(([label,value])=>`<span class="${value.trim()?'is-ready':''}">${mailGlyph(value.trim()?'check':'envelope')}<span>${label}</span><span class="ms-sr">${value.trim()?'入力済み':'未入力'}</span></span>`).join('');
  }
  const mailDate = d => new Date(d.updated).toLocaleDateString('ja-JP',{month:'short',day:'numeric'});
  function mailRenderList() {
    const all = mailAll(), q = mailQuery.toLocaleLowerCase();
    const drafts = all.filter(d=>(mailFolder==='trash' ? d.trash : !d.trash && (mailFolder!=='starred' || d.starred)) && [d.to,d.cc,d.bcc,d.subject,d.body].join(' ').toLocaleLowerCase().includes(q));
    drafts.sort((a,b)=>mailSort==='title' ? a.subject.localeCompare(b.subject,'ja') : mailSort==='old' ? a.updated-b.updated : b.updated-a.updated);
    $('#ms-result-count').textContent = `${drafts.length}件`;
    $('#ms-draft-list').innerHTML = drafts.length ? drafts.map((d,i)=>`<article class="ms-card" data-ms-theme="${d.theme}" style="--ms-order:${Math.min(i,8)}"><div class="ms-card-top"><span class="ms-draft-label">${mailPending.has(d.id)?'未保存':d.trash?'ゴミ箱':'DRAFT'}</span><time>${esc(mailDate(d))}</time>${!d.trash?mailBtn('msStar',d.starred?'お気に入りを解除':'お気に入り','star',d.id,`aria-pressed="${d.starred}"`):''}</div><button class="ms-card-open" data-action="msEdit" data-id="${esc(d.id)}"><span class="ms-avatar">${mailGlyph('envelope')}</span><span><strong>${esc(d.subject || '件名なし')}</strong><small>${esc(d.to || '宛先未入力')}</small></span>${mailGlyph('arrow')}</button><p>${esc(d.body.replace(/\s+/g,' ').slice(0,100) || '本文を追加しましょう')}</p><div class="ms-card-actions">${d.trash ? `<button data-action="msRestore" data-id="${esc(d.id)}">${mailGlyph('restore')}復元</button><button data-action="msDelete" data-id="${esc(d.id)}">完全削除</button>` : `<button data-action="msDuplicate" data-id="${esc(d.id)}">${mailGlyph('copy')}複製</button>${mailBtn('msTrash','ゴミ箱へ移動','trash',d.id)}`}</div></article>`).join('') : `<div class="ms-empty"><span>${mailGlyph(mailFolder==='trash'?'trash':mailFolder==='starred'?'star':'write')}</span><h3>${q?'見つかりませんでした':mailFolder==='trash'?'ゴミ箱は空です':mailFolder==='starred'?'大切な一通を、ここに':'最初の一通を、ここから'}</h3><p>${q?'件名・宛先・本文で検索できます。':mailFolder==='trash'?'移動した下書きはいつでも復元できます。':mailFolder==='starred'?'星を付けた下書きが並びます。':'下書きはこのブラウザに保存されます。'}</p>${!q && mailFolder==='drafts'?'<button class="ms-text-button" data-action="msNew">メールを作成 →</button>':''}</div>`;
  }
  function mailLibrary() {
    mailFlush(); mailEditing = null; A.statusTheme(false);
    const all = mailAll(), active = all.filter(d=>!d.trash);
    A.view(A.nav('メール',mailBtn('msServices','受信サービス・設定','globe'))+`<div class="app-content ms-studio"><header class="ms-heading"><div><span class="ms-eyebrow">YOUR PRIVATE POST OFFICE</span><h1>Mail <em>Studio.</em></h1></div><span class="ms-local">LOCAL</span></header><section class="ms-hero"><div class="ms-hero-copy"><span>ひと息ついて、</span><h2>一通を、<br>丁寧に。</h2><p>あなたの言葉を、<br>あなたのペースで。</p></div><button class="ms-art-button" data-action="msNew" aria-label="封筒を開いてメールを作成">${mailArt()}</button><span class="ms-hero-note">A LITTLE LETTER, A LITTLE CLOSER</span></section><button class="ms-compose" data-action="msNew">${mailGlyph('write')}<span>メールを作成<small>NEW LETTER</small></span>${mailGlyph('arrow')}</button><div class="ms-library-heading"><h2>マイ下書き <span>${active.length}</span></h2><button data-action="msServices">${mailGlyph('globe')}受信サービス</button></div>${mailStore().invalid?'<p class="ms-warning" role="alert">保存データを読み込めません。上書きは停止しています。<button class="ms-text-button" data-action="msBackup">元データを書き出す</button></p>':''}${mailPending.size?'<p class="ms-warning" role="status">未保存の下書きがあります。開いて再保存かTXT書出を。再読み込みで失われます。</p>':''}<div class="ms-filters" aria-label="下書きの絞り込み">${[['drafts','下書き'],['starred','お気に入り'],['trash','ゴミ箱']].map(([id,label])=>`<button data-action="msFolder" data-id="${id}" aria-pressed="${mailFolder===id}">${label}${id==='trash'?` <span>${all.filter(d=>d.trash).length}</span>`:''}</button>`).join('')}</div><label class="ms-search">${mailGlyph('search')}<input id="ms-search" type="search" placeholder="宛先・件名・本文を検索" aria-label="下書きを検索" value="${esc(mailQuery)}"></label><div class="ms-sort"><span id="ms-result-count" role="status"></span><select id="ms-sort" aria-label="下書きの並び順"><option value="new">更新が新しい順</option><option value="old">更新が古い順</option><option value="title">件名順</option></select></div><div id="ms-draft-list"></div><footer class="ms-footer">${mailGlyph('seal')}このブラウザだけに保存 · 受信同期なし</footer></div>`);
    $('#ms-search').oninput = e => { mailQuery=e.target.value; mailRenderList(); };
    $('#ms-sort').value=mailSort; $('#ms-sort').onchange=e=>{mailSort=e.target.value;mailRenderList();}; mailRenderList();
  }
  function mailEditor(d) {
    mailFlush(); mailEditing={...d};mailBase=mailBases.get(d.id) ?? JSON.stringify(mailStore().drafts.find(x=>x.id===d.id) || null); A.statusTheme(false);
    const field=(name,label,max,placeholder='')=>`<label class="ms-field"><span>${label}</span><input name="${name}" type="${['to','cc','bcc'].includes(name)?'email':'text'}" ${['to','cc','bcc'].includes(name)?'multiple':''} ${name==='to'?'required':''} maxlength="${max}" value="${esc(d[name])}" placeholder="${placeholder}" autocomplete="off"></label>`;
    A.view(A.nav('下書き',mailBtn('msTools','定型文・署名','book'),'msLibrary','下書き一覧へ')+`<div class="app-content ms-studio ms-editor" data-ms-theme="${d.theme}"><div class="ms-editor-heading"><span class="ms-eyebrow">A LETTER FROM YOU</span><span class="ms-editor-seal">${mailGlyph('seal')}</span></div><div class="ms-save-line"><span id="ms-save-state" role="status">${mailPending.has(d.id)?'未保存 · 再試行かTXT書出を':mailStore().drafts.some(x=>x.id===d.id)?'端末に保存済み · 未送信':'新しい下書き'}</span><button id="ms-retry" data-action="saveExternalDraft" ${mailPending.has(d.id)?'':'hidden'}>再試行</button></div><div class="ms-editor-options"><div class="ms-swatches" aria-label="便箋の色">${Object.entries(mailThemes).map(([id,label])=>`<button type="button" data-action="msTheme" data-id="${id}" aria-label="${label}の便箋" title="${label}" aria-pressed="${d.theme===id}"><i data-ms-theme="${id}"></i></button>`).join('')}</div><button type="button" data-action="msFocus" aria-pressed="false">集中して書く</button></div><form id="external-mail"><div class="ms-paper"><div class="ms-address-row">${field('to','宛先',1000,'name@example.com')}${mailBtn('msContacts','連絡先から宛先を追加','book')}</div><details class="ms-recipients" ${d.cc || d.bcc?'open':''}><summary>CC / BCC を追加</summary>${field('cc','CC',1000)}${field('bcc','BCC',1000)}</details>${field('subject','件名',200,'どんな一通にしますか？')}<label class="ms-body-label" for="ms-body">本文</label><textarea id="ms-body" name="body" maxlength="12000" placeholder="ここから、言葉をつづる。" spellcheck="true">${esc(d.body)}</textarea><div class="ms-paper-foot"><span>PLAIN TEXT</span><span id="ms-body-count">${d.body.length.toLocaleString()} / 12,000</span></div></div><div class="ms-writing-tools"><button type="button" data-action="msTools">${mailGlyph('book')}定型文・署名</button><button type="button" data-action="msExport">${mailGlyph('copy')}TXT書出</button><button type="button" data-action="saveExternalDraft">${mailGlyph('check')}保存</button></div><div id="ms-checklist" class="ms-checklist" aria-label="入力状況"></div><button class="ms-compose" type="submit">${mailGlyph('envelope')}<span>確認して、作成先へ<small>REVIEW YOUR LETTER</small></span>${mailGlyph('arrow')}</button></form><div id="mail-handoff" aria-live="polite"></div><p class="ms-caption">入力後に自動保存。送信は移動先で行います。</p><button class="ms-text-button ms-save-copy" data-action="msSaveCopy">別の下書きとして保存</button><p class="ms-caption">宛先はカンマ区切り・各欄10件まで。添付は移動先で追加。</p></div>`);
    const form=$('#external-mail'); form.oninput=mailChange;mailChecklist();form.noValidate=true;
    form.onsubmit=e=>{e.preventDefault();$('.ms-editor').classList.remove('is-focused');$('[data-action=msFocus]').setAttribute('aria-pressed','false');$('[data-action=msFocus]').textContent='集中して書く';if(form.querySelector(':invalid')?.closest('.ms-recipients'))$('.ms-recipients').open=true;if(!form.reportValidity())return;mailChange();mailFlush();mailReview();};
    form.onkeydown=e=>{if((e.ctrlKey||e.metaKey)&&e.key.toLowerCase()==='s'){e.preventDefault();A.actions.saveExternalDraft();}};
  }
  function mailReview() {
    if (!mailEditing) return;
    const d={...mailEditing}, fields=['to','cc','bcc'];
    for (const name of fields) {
      const list=d[name].split(',').map(v=>v.trim()).filter(Boolean);
      if (list.length>10 || (name==='to' && !list.length) || list.some(v=>!/^[^\s@,;<>]+@[^\s@,;<>]+\.[^\s@,;<>]+$/.test(v))) return A.toast('宛先・CC・BCCは有効なメールアドレスを各10件以内で入力してください');
      d[name]=list.join(',');
    }
    const query=new URLSearchParams({subject:d.subject,body:d.body,...(d.cc?{cc:d.cc}:{}),...(d.bcc?{bcc:d.bcc}:{})});
    // Percent-encode addresses individually; preserve comma separators for mail clients.
    const uri=`mailto:${d.to.split(',').map(encodeURIComponent).join(',')}?${query.toString().replace(/\+/g,'%20')}`;
    const gmail='https://mail.google.com/mail/?'+new URLSearchParams({view:'cm',fs:'1',to:d.to,cc:d.cc,bcc:d.bcc,su:d.subject,body:d.body});
    const outlook='https://outlook.live.com/mail/0/deeplink/compose?'+new URLSearchParams({to:d.to,cc:d.cc,bcc:d.bcc,subject:d.subject,body:d.body});
    $('#mail-handoff').innerHTML=`<section class="ms-review"><div class="ms-review-top">${mailGlyph('envelope')}<span>送信前プレビュー</span><b>未送信</b></div><h3>${esc(d.subject || '件名なし')}</h3><dl>${fields.filter(f=>d[f]).map(f=>`<dt>${f==='to'?'宛先':f.toUpperCase()}</dt><dd>${esc(d[f])}</dd>`).join('')}</dl><pre>${esc(d.body || '（本文なし）')}</pre>${!d.subject?'<p class="ms-warning">件名が未入力です。</p>':''}${mailPending.has(d.id)?'<p class="ms-warning">端末には未保存です。TXT書出で退避できます。</p>':''}${uri.length>1800?'<p class="ms-warning">長い本文は作成先で省略される場合があります。本文をコピーするかTXTを書き出してください。</p>':''}<a class="ms-compose" href="${esc(uri)}">メールアプリで作成 ${mailGlyph('arrow')}</a><div class="ms-providers">${N.link(gmail,'Gmailで作成')}${N.link(outlook,'Outlookで作成')}</div><button class="ms-text-button" id="share-mail">本文を共有・コピー</button><p class="ms-caption">選んだサービスに宛先・CC・BCC・本文を渡します。<br>送信完了は確認できません。下書きは残ります。</p></section>`;
    $('#share-mail').onclick=()=>N.share(d.subject,d.body);
    $('.ms-review').tabIndex=-1;$('.ms-review').focus({preventScroll:true});
    $('#mail-handoff').scrollIntoView({block:'start'});
  }
  A.apps.mail.render=()=>{
    mailLibrary();
    const flush=()=>mailFlush();
    document.addEventListener('visibilitychange',flush);window.addEventListener('pagehide',flush);
    A.cleanups.push(()=>{mailFlush();document.removeEventListener('visibilitychange',flush);window.removeEventListener('pagehide',flush);});
  };
  window.addEventListener('beforeunload',e=>{if(mailPending.size){e.preventDefault();e.returnValue='';}});
  A.actions.msTheme=el=>{if(!mailEditing || !Object.hasOwn(mailThemes,el.dataset.id))return;mailEditing.theme=el.dataset.id;$('.ms-editor').dataset.msTheme=el.dataset.id;A.$$('[data-action=msTheme]').forEach(b=>b.setAttribute('aria-pressed',b.dataset.id===el.dataset.id));mailChange();};
  A.actions.msFocus=()=>{const editor=$('.ms-editor');if(!editor)return;const focused=editor.classList.toggle('is-focused'),b=$('[data-action=msFocus]');b.setAttribute('aria-pressed',focused);b.textContent=focused?'全体に戻る':'集中して書く';if(focused)$('#ms-body').focus();};
  A.actions.msSaveCopy=()=>{if(!mailEditing)return;clearTimeout(mailTimer);const oldId=mailEditing.id,copy={...mailEditing,id:A.id(),updated:Date.now(),trash:false};if(mailPersist(copy)){mailPending.delete(oldId);mailBases.delete(oldId);mailEditing=null;mailEditor(copy);A.toast('別の下書きとして保存しました');}};
  A.actions.msLibrary=mailLibrary;
  A.actions.msNew=()=>{ if(mailAll().length>=100)return A.toast('下書きは100件まで。ゴミ箱の不要な下書きを完全削除してください'); mailEditor(mailDraft({})); };
  A.actions.msEdit=el=>{const d=mailFind(el.dataset.id);if(d?.trash)return A.toast('ゴミ箱から復元して編集してください');if(d)mailEditor(d);};
  A.actions.msFolder=el=>{mailFolder=el.dataset.id;mailLibrary();};
  A.actions.saveExternalDraft=()=>{if(!$('#external-mail'))return;mailChange();if(mailFlush())A.toast('下書き保存・未送信');};
  A.actions.msStar=el=>{const d=mailFind(el.dataset.id);if(d && mailPersist({...d,starred:!d.starred}))mailRenderList();};
  A.actions.msDuplicate=el=>{const d=mailFind(el.dataset.id);if(!d)return;const copy={...d,id:A.id(),subject:((d.subject||'件名なし')+' のコピー').slice(0,200),updated:Date.now()};if(mailPersist(copy)){mailLibrary();A.toast('下書きを複製');}};
  A.actions.msTrash=el=>{const d=mailFind(el.dataset.id);if(d && mailPersist({...d,trash:true})){mailLibrary();A.toast('ゴミ箱へ移動',{label:'取り消す',onAction:()=>{if(mailPersist(d) && A.current==='mail')mailLibrary();}});}};
  A.actions.msRestore=el=>{const d=mailFind(el.dataset.id);if(d && mailPersist({...d,trash:false})){mailLibrary();A.toast('下書きを復元');}};
  A.actions.msDelete=el=>A.confirm('下書きを完全削除','この操作は取り消せません。',()=>{const store=mailStore();if(mailCommit({...store,drafts:store.drafts.filter(d=>d.id!==el.dataset.id)})){mailPending.delete(el.dataset.id);mailBases.delete(el.dataset.id);mailLibrary();}});
  A.actions.msExport=()=>{if(!mailEditing)return;const d=mailEditing;A.download(new Blob([`宛先: ${d.to}\nCC: ${d.cc}\nBCC: ${d.bcc}\n件名: ${d.subject}\n\n${d.body}`],{type:'text/plain;charset=utf-8'}),'aura-mail-draft.txt');};
  function mailAppend(text) {
    const input=$('#ms-body'); if(!input)return;
    const addition=(input.value?'\n\n':'')+text;
    if(input.value.length+addition.length>12000)return A.toast('本文は12,000文字までです');
    input.value+=addition;mailChange();A.closeOverlay();input.focus();
  }
  A.actions.msTools=()=>{
    const signature=mailStore().signature;
    A.overlay(`${A.overlayTitle('定型文と署名')}<div class="connected-overlay ms-sheet"><p>本文の末尾に追加します。現在の内容は消しません。</p><div class="ms-template-list">${[['thanks','お礼','温かい感謝を伝える'],['meeting','日程の相談','打ち合わせのお願い'],['followup','確認のお願い','やさしくリマインド']].map(([id,title,desc])=>`<button data-action="msTemplate" data-id="${id}">${mailGlyph('envelope')}<span><strong>${title}</strong><small>${desc}</small></span>${mailGlyph('arrow')}</button>`).join('')}</div><label class="form-label" for="ms-signature">自分の署名（このブラウザに保存）</label><textarea id="ms-signature" class="text-input" maxlength="1000" rows="4" placeholder="名前・所属・連絡先など">${esc(signature)}</textarea><div class="connection-toolbar"><button class="primary-button" id="ms-signature-save">署名を保存</button><button class="connection-link" id="ms-signature-insert">本文に追加</button></div><p id="ms-signature-status" role="status"></p></div>`);
    $('#ms-signature-save').onclick=()=>{if(mailCommit({...mailStore(),signature:$('#ms-signature').value}))$('#ms-signature-status').textContent='署名を保存しました';else $('#ms-signature-status').textContent='保存失敗。内容をコピーして退避してください';};
    $('#ms-signature-insert').onclick=()=>{const text=$('#ms-signature').value;if(!text.trim())return A.toast('署名を入力してください');mailAppend(text);};
  };
  A.actions.msTemplate=el=>{
    const templates={thanks:'お世話になっております。\n\nこのたびはありがとうございました。\n\n今後とも、どうぞよろしくお願いいたします。',meeting:'お世話になっております。\n\nお打ち合わせの日程について、ご相談です。\nご都合のよい日時をお知らせいただけますと幸いです。\n\nどうぞよろしくお願いいたします。',followup:'お世話になっております。\n\n先日お送りした件について、ご確認いただけましたでしょうか。\nお手すきの際にお返事いただけますと幸いです。\n\nどうぞよろしくお願いいたします。'};
    if(templates[el.dataset.id])mailAppend(templates[el.dataset.id]);
  };
  A.actions.msContacts=()=>{
    const source=A.load('contacts',[]), contacts=Array.isArray(source)?source.filter(c=>c && typeof c.email==='string' && /^[^\s@,;<>]+@[^\s@,;<>]+\.[^\s@,;<>]+$/.test(c.email)):[];
    A.overlay(`${A.overlayTitle('宛先を連絡先から追加')}<div class="connected-overlay ms-sheet"><input id="ms-contact-query" class="text-input" type="search" placeholder="名前・メールアドレス" aria-label="連絡先を検索"><div id="ms-contact-list"></div><p>追加先は宛先（To）です。CC/BCCは直接入力できます。</p></div>`);
    const render=()=>{const q=$('#ms-contact-query').value.toLocaleLowerCase();$('#ms-contact-list').innerHTML=contacts.map((c,i)=>({...c,index:i})).filter(c=>`${c.name} ${c.email}`.toLocaleLowerCase().includes(q)).map(c=>`<button class="list-row" data-ms-contact="${c.index}"><span class="row-main"><strong>${esc(c.name||c.email)}</strong><small>${esc(c.email)}</small></span></button>`).join('')||'<p class="ms-caption">メールアドレスのある連絡先がありません。</p>';};
    $('#ms-contact-query').oninput=render;render();$('#ms-contact-list').onclick=e=>{const b=e.target.closest('[data-ms-contact]');if(!b)return;const email=contacts[Number(b.dataset.msContact)].email, input=$('#external-mail [name=to]');if(!input)return;const list=input.value.split(',').map(v=>v.trim()).filter(Boolean);if(!list.some(v=>v.toLowerCase()===email.toLowerCase()))list.push(email);if(list.length>10||list.join(', ').length>1000)return A.toast('宛先は10件・1,000文字までです');input.value=list.join(', ');mailChange();A.closeOverlay();input.focus();};
  };
  A.actions.msServices=()=>A.overlay(`${A.overlayTitle('メールサービス')}<div class="connected-overlay ms-sheet"><div class="ms-service-icon">${mailGlyph('globe')}</div><h3>受信トレイは、いつもの場所で。</h3><p>選んだサービスの受信画面を開きます。ログインは移動先で行ってください。</p><div class="ms-providers">${N.link('https://mail.google.com/','Gmail を開く')}${N.link('https://outlook.live.com/mail/','Outlook を開く')}</div><h3>このメールアプリについて</h3><p>下書き・署名はこのブラウザに保存。受信同期・送信完了の確認・クラウド同期はありません。下書きはゴミ箱を含め100件まで。大切な内容はTXTで書き出してください。同じ下書きを複数タブで同時編集しないでください。</p><p>未保存表示がある場合は、ページを閉じる前に再試行かTXT書出を行ってください。</p><h3>バックアップ</h3><p>JSONには宛先・BCC・本文・署名を含みます。安全な場所に保管してください。便箋の色はaura内の表示のみです。</p><div class="connection-toolbar">${button('msBackup','JSONを書き出す')}${button('msImport','JSONから読み込む')}</div>${button('mailDemo','旧メールのデモを開く')}</div>`);
  A.actions.msBackup=()=>{
    const store=mailStore();let text;
    if(store.invalid){try{text=localStorage.getItem('aura.'+mailKey);}catch{return A.toast('保存データにアクセスできません');}if(text===null)return A.toast('書き出すデータがありません');}
    else text=JSON.stringify({format:'aura-mail',version:1,signature:store.signature,drafts:mailAll()},null,2);
    A.download(new Blob([text],{type:'application/json'}),store.invalid?'aura-mail-recovery.json':'aura-mail-backup.json');
  };
  A.actions.msImport=()=>{
    A.overlay(`${A.overlayTitle('下書きを復元')}<div class="connected-overlay ms-sheet"><p>Mail StudioのJSON（8MB以下）を選択。現在の下書きは消さず、別の下書きとして追加します。署名は変更しません。</p><label class="form-label" for="ms-import-file">バックアップファイル</label><input id="ms-import-file" type="file" accept=".json,application/json"><p id="ms-import-status" role="status"></p><button id="ms-import-confirm" class="primary-button" disabled>内容を確認して追加</button></div>`);
    const input=$('#ms-import-file'),output=$('#ms-import-status'),confirm=$('#ms-import-confirm');let ready=null,sequence=0;
    input.onchange=async()=>{const seq=++sequence;ready=null;confirm.disabled=true;const file=input.files[0];if(!file)return;if(file.size>8*1024*1024){output.textContent='8MB以下のJSONを選んでください';return;}output.textContent='読み込み中…';try{const data=JSON.parse(await file.text());if(seq!==sequence || !output.isConnected)return;if(data.format!=='aura-mail' || !mailValidStore(data) || !data.drafts.length)throw new Error('形式または内容が不正です。Mail Studioのバックアップを選んでください');ready=data.drafts.map(mailDraft);output.textContent=`${ready.length}件の下書き（ゴミ箱${ready.filter(d=>d.trash).length}件を含む）を追加します。`;confirm.disabled=false;}catch(e){if(seq===sequence && output.isConnected)output.textContent=e instanceof SyntaxError?'JSONを読み取れませんでした':e.message;}};
    confirm.onclick=()=>{if(!ready)return;const store=mailStore();if(mailAll().length+ready.length>100){output.textContent='100件の上限を超えます。不要な下書きを完全削除してください';return;}const imported=ready.map(d=>({...d,id:A.id()}));if(!mailCommit({...store,drafts:[...store.drafts,...imported]})){output.textContent='保存失敗。現在の下書きは変更していません。再試行できます。';return;}A.closeOverlay();mailFolder='drafts';mailQuery='';mailLibrary();A.toast(`${imported.length}件の下書きを追加しました`);};
  };
  A.apps.messages.render = arg => {
    if (['misaki','haru','aura'].includes(arg)) return originals.messages(arg);
    A.view(A.nav('メッセージ', button('messagesDemo', 'デモ')) + `<div class="app-content"><form id="external-message"><label class="form-label">電話番号</label><input class="text-input" type="tel" name="number" required maxlength="25" placeholder="09012345678 / +819012345678"><label class="form-label">メッセージ</label><textarea class="text-input" name="body" rows="7" required maxlength="2000" placeholder="本文"></textarea><button class="primary-button" type="submit" style="margin-top:15px">作成先へ</button></form><div id="message-handoff" aria-live="polite"></div>${handoffNote}<p class="connected-caption">SMSは有料の場合あり。WhatsAppは国番号が必要</p></div>`);
    $('#external-message').onsubmit = e => {
      e.preventDefault(); const v = Object.fromEntries(new FormData(e.currentTarget)), phone = phoneNumber(v.number);
      if (!validPhone(phone)) return A.toast('電話番号を3〜15桁の数字で入力してください');
      const delimiter = /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1) ? '&' : '?';
      $('#message-handoff').innerHTML = `<div class="connection-card"><h3>作成先・未送信</h3><p>宛先：${esc(phone)}</p><a class="primary-button" href="sms:${esc(phone)}${delimiter}body=${encodeURIComponent(v.body)}">SMSアプリで作成</a>${phone.startsWith('+') ? `<div class="connection-toolbar">${N.link(`https://wa.me/${phone.slice(1)}?text=${encodeURIComponent(v.body)}`, 'WhatsAppで作成')}</div>` : '<p class="connected-caption">WhatsApp：国番号（+81等）が必要</p>'}<button class="connection-link" id="share-message">他のアプリで共有</button></div>`;
      $('#share-message').onclick = () => N.share('メッセージ', v.body);
    };
    $('#external-message').oninput = () => { $('#message-handoff').textContent = ''; };
  };
  A.apps.phone.render = () => {
    A.view(A.nav('電話', button('phoneDemo', 'デモ')) + `<div class="app-content"><form id="external-phone"><label class="form-label">電話番号</label><input id="live-phone-number" class="text-input" type="tel" name="number" required maxlength="25" placeholder="電話番号を入力" autocomplete="tel"><div class="dial-keypad" style="margin-top:20px">${['1','2','3','4','5','6','7','8','9','+','0','⌫'].map(n => `<button type="button" class="dial-key" data-live-key="${n}" aria-label="${n === '⌫' ? '一文字削除' : n}">${n}</button>`).join('')}</div><button class="primary-button" type="submit" style="margin-top:18px">番号を確認</button></form><div id="phone-handoff" aria-live="polite"></div>${handoffNote}<p class="connected-caption">通話料は契約に準拠。緊急通報は標準電話アプリへ</p></div>`);
    const input = $('#live-phone-number');
    A.$$('[data-live-key]').forEach(el => el.onclick = () => { const key = el.dataset.liveKey; input.value = key === '⌫' ? input.value.slice(0,-1) : (input.value + key).slice(0,25); $('#phone-handoff').textContent = ''; });
    $('#external-phone').oninput = () => { $('#phone-handoff').textContent = ''; };
    $('#external-phone').onsubmit = e => { e.preventDefault(); const number = phoneNumber(input.value); if (!validPhone(number)) return A.toast('電話番号を3〜15桁の数字で入力してください'); $('#phone-handoff').innerHTML = `<div class="connection-card"><h3>${esc(number)}</h3><a class="primary-button" href="tel:${esc(number)}">電話アプリへ</a><p>未発信。電話アプリで番号を確認</p></div>`; };
  };

  let musicController, musicLastSearch = 0;
  function stopMusicCatalogue() {
    musicController?.abort();
    $('#music-results')?.querySelectorAll('audio').forEach(audio => { audio.pause(); audio.removeAttribute('src'); audio.load(); });
  }
  A.apps.music.render = arg => {
    if (arg === 'player') return originals.music(arg);
    A.statusTheme(false); $('#app-screen').classList.remove('music-app');
    A.view(A.nav('ミュージック', button('musicOriginals', '音源')) + `<div class="app-content"><form id="music-search" class="connected-search"><input class="text-input" type="search" required maxlength="100" aria-label="曲名やアーティスト" placeholder="曲名やアーティスト"><button class="primary-button" type="submit">検索</button></form><div id="music-results" aria-live="polite"><p class="connected-caption">iTunes試聴・地域制限あり</p></div><div class="connection-toolbar">${N.link('https://music.apple.com/jp/', 'Apple Music')}${N.link('https://open.spotify.com/', 'Spotify')}</div><p class="connected-caption">試聴のみ・画面移動で停止</p></div>`);
    const root = $('#music-results');
    A.cleanups.push(() => { musicController?.abort(); root.querySelectorAll('audio').forEach(a => { a.pause(); a.removeAttribute('src'); a.load(); }); });
    $('#music-search').onsubmit = async e => {
      e.preventDefault(); const query = e.currentTarget.querySelector('input').value.trim(); if (!query) return;
      if (Date.now() - musicLastSearch < 3000) return A.toast('検索は3秒ほど間隔をあけてください');
      musicLastSearch = Date.now(); musicController?.abort(); const controller = musicController = new AbortController();
      root.querySelectorAll('audio').forEach(a => a.pause()); root.innerHTML = status('楽曲を検索しています…');
      try {
        const data = await N.request(`https://itunes.apple.com/search?${new URLSearchParams({term:query, entity:'song', media:'music', country:'JP', limit:'12'})}`, {signal:controller.signal});
        if (!root.isConnected || controller.signal.aborted) return;
        if (!Array.isArray(data.results)) throw new Error('楽曲データの形式を確認できませんでした。');
        root.innerHTML = data.results.length ? data.results.map(t => `<article class="connected-track"><div><strong>${esc(t.trackName)}</strong><small>${esc(t.artistName)} · ${esc(t.collectionName || '')}</small>${N.safeURL(t.previewUrl) ? `<audio controls preload="none" playsinline src="${esc(N.safeURL(t.previewUrl))}" aria-label="${esc(t.trackName)}の公式試聴"></audio>` : '<p>試聴はありません。</p>'}<p class="connected-caption">公式プレビュー · ${N.link(t.trackViewUrl, 'Appleで開く')}</p><p class="audio-feedback connected-caption" role="status"></p></div></article>`).join('') : status('楽曲が見つかりません。別のキーワードで検索してください。');
        root.querySelectorAll('audio').forEach(audio => { audio.onplay = () => { A.music.pause(); root.querySelectorAll('audio').forEach(other => { if (other !== audio) other.pause(); }); }; audio.onerror = () => { audio.closest('article').querySelector('.audio-feedback').textContent = '試聴を読み込めません。Appleの公式ページを開いてください。'; }; });
      } catch (error) { if (root.isConnected && !controller.signal.aborted) root.innerHTML = status(N.errorText(error)) + N.link(`https://music.apple.com/jp/search?term=${encodeURIComponent(query)}`, 'Apple Musicで検索'); }
    };
  };

  const capabilities = {
    today:['今日のまとめ','予定・タスク・習慣・集中記録を集計'],
    focus:['集中タイマー','ページ終了中は通知なし'],
    habits:['習慣の記録','達成日・連続日数'],
    expenses:['家計簿・CSV出力','手入力。銀行・決済接続なし'],
    shopping:['買い物リスト','数量・予定額・購入状態'],
    journal:['日記・気分の記録','端末内保存。クラウド同期なし'],
    contacts:['連絡先・vCard出力','電話・SMS・メールを対応アプリへ'],
    converter:['単位換算','端末内で換算'],
    reading:['読書記録','本・進捗・読書メモ'],
    sketch:['スケッチ・PNG出力','自動保存。自動アップロードなし'],
    safari:['アプリ内検索・Webへ移動','Wikipediaは画面内。Web検索は別タブ'],
    maps:['実地図・場所検索','OpenStreetMap / Nominatim。経路はGoogle マップへ'],
    weather:['実予報・保存キャッシュ','Open-Meteo。取得失敗時は保存データ'],
    mail:['メール作成・受信サービスへ移動','受信同期・送信確認なし'],
    messages:['SMS・WhatsApp・共有','対応アプリへ。返信の自動取得なし'],
    phone:['端末の電話アプリへ引き渡し','実通話は端末で。架空の連絡先は使用しません'],
    music:['外部楽曲検索・試聴','Apple iTunes。フル再生は公式サービスへ'],
    calendar:['予定書き出し・Google カレンダー','ICS書き出し。双方向同期なし'],
    notes:['メモの共有','OS共有・コピー・テキスト保存'],
    reminders:['リスト共有・タスク書き出し','OS共有・VTODO（対応は利用先による）'],
    files:['URLからテキスト読込・共有','HTTPS・CORS対応のみ。自動アップロードなし'],
    photos:['実写真・OS共有','OS共有・端末保存。クラウド同期なし'],
    camera:['実カメラ・写真への保存','許可後に撮影。自動アップロードなし'],
    recorder:['実録音・ブラウザ内保存・音声共有','IndexedDBに保存。外部送信・クラウド同期なし。全データJSONには音声を含みません'],
    calculator:['実為替レート換算','Frankfurter日次基準値。取引レートではありません'],
    clock:['実時刻・端末通知','許可後に通知。ページ終了・スリープ時は保証なし'],
    health:['実記録・許可後のセンサー取得','対応端末の推定歩数・Bluetooth心拍計。画面表示中のみ。健康アカウント同期なし'],
    wallet:['デモのみ・実決済未接続','架空残高・実決済未接続'],
    games:['端末内で実動作','外部接続を必要としない8ゲーム。スコアは端末内保存。'],
    settings:['接続状況・権限・プライバシー','通信設定はシミュレーション']
  };
  const nav = A.nav;
  const localApps = new Set(['today','focus','habits','expenses','shopping','journal','contacts','converter','reading','sketch']);
  A.nav = (title, right = '', ...args) => nav(title, right + (A.current && !localApps.has(A.current) ? `<button type="button" class="connection-link connection-info" data-action="appConnections" aria-label="連携と対応状況" title="連携と対応状況">${A.icon('info')}</button>` : ''), ...args);
  A.actions.appConnections = () => {
    const id = A.current, [title, detail] = capabilities[id] || capabilities.settings;
    const tools = {recorder:button('recordInfo','録音・保存の詳しい説明'),calendar:button('calendarExchange','予定を書き出す'), notes:button('shareNotes','メモを共有'), reminders:button('shareReminders','リストを共有') + button('exportReminders','タスクを書き出す'), files:button('fileURLImport','URLから読む') + button('shareFile','ファイルを共有'), photos:button('photoShare','写真を共有'), camera:'<button class="connection-link" data-app="photos">写真を開く</button>', calculator:button('currencyOpen','為替換算'), clock:button('clockNotifyPermission','端末通知を有効に'), health:button('healthExport','記録をJSONで書き出す')+button('healthImport','JSONを一括取込')};
    A.overlay(`${A.overlayTitle('外部との連携')}<div class="connected-overlay"><h3>${esc(title)}</h3><p class="connected-caption">${esc(detail)}</p><div class="connection-toolbar">${tools[id] || ''}</div><p class="connected-caption">共有は選択データのみ。検索語・座標の送信先は各画面に表示</p>${button('connectionCenter','すべての接続状況')}</div>`);
  };
  A.actions.connectionCenter = () => A.overlay(`${A.overlayTitle('接続とプライバシー')}<div class="connected-overlay"><div id="network-status" class="connected-status ${navigator.onLine ? '' : 'offline'}">${navigator.onLine ? 'オンライン・外部接続未確認' : 'オフライン'}</div><p class="connected-caption">公開APIは利用制限あり。データ同期・認証情報の保存なし</p>${Object.entries(capabilities).map(([id,[title,detail]]) => `<button class="list-row" data-app="${id}"><span class="row-main"><strong>${esc(A.apps[id].name)}</strong><small>${esc(detail)}</small></span></button>`).join('')}${button('forgetLocation','保存した位置情報と天気を消去')}</div>`);
  A.actions.forgetLocation = () => A.confirm('位置情報と天気を消去','保存した都市・天気のお気に入り・地図の保存場所・現在地の座標・天気キャッシュを削除し、ページを再読み込みします。',() => { try { ['weatherLocation','weatherLive','weatherCity','weatherFavorites','mapSavedPlaces'].forEach(k => localStorage.removeItem('aura.' + k)); location.reload(); } catch { A.toast('削除できません'); } });
  const updateNetwork = () => { const el = $('#network-status'); if (el) { el.textContent = navigator.onLine ? 'オンライン・外部接続未確認' : 'オフライン'; el.classList.toggle('offline',!navigator.onLine); } };
  window.addEventListener('online',updateNetwork); window.addEventListener('offline',updateNetwork);
  A.actions.shareNotes = () => { const title = $('#note-title'), body = $('#note-body'); if (title && body) N.share(title.value || 'メモ',body.value); else N.share('auraのメモ',A.searchableNotes().map(n => `${n.title}\n${n.body}`).join('\n\n---\n\n')); };
  A.actions.shareReminders = () => N.share('リマインダー',A.searchableReminders().map(r => `[${r.done ? 'x' : ' '}] ${r.text}`).join('\n'));

  const icsEscape = value => String(value ?? '').replace(/\\/g,'\\\\').replace(/\r\n|\r|\n/g,'\\n').replace(/;/g,'\\;').replace(/,/g,'\\,');
  // RFC 5545 folding counts UTF-8 bytes to preserve Japanese exports.
  function icsFold(line) { let out = '', bytes = 0; for (const c of line) { const n = new TextEncoder().encode(c).length; if (bytes + n > 75) { out += '\r\n '; bytes = 1; } out += c; bytes += n; } return out; }
  const dateICS = d => d.toISOString().replace(/[-:]/g,'').replace(/\.\d{3}Z$/,'Z');
  const icsDownload = (lines,name) => A.download(new Blob([['BEGIN:VCALENDAR','VERSION:2.0','PRODID:-//aura//Connected 3//JA',...lines,'END:VCALENDAR'].map(icsFold).join('\r\n') + '\r\n'],{type:'text/calendar;charset=utf-8'}),name);
  const calendarDateOnly = d => `${String(d.getFullYear()).padStart(4,'0')}${String(d.getMonth()+1).padStart(2,'0')}${String(d.getDate()).padStart(2,'0')}`;
  N.calendarEvent = event => {
    const start = new Date(`${event.date}T${event.allDay?'00:00':event.time || '00:00'}:00`);
    if (!Number.isFinite(start.getTime())) return null;
    let end;
    if(event.allDay){end=new Date(start);end.setDate(end.getDate()+1);}
    else{end=event.endTime?new Date(`${event.date}T${event.endTime}:00`):new Date(start.getTime()+3600000);if(end<=start)end.setDate(end.getDate()+1);}
    if(!Number.isFinite(end.getTime()))return null;
    const dates=event.allDay?`${calendarDateOnly(start)}/${calendarDateOnly(end)}`:`${dateICS(start)}/${dateICS(end)}`;
    return {start,end,google:'https://calendar.google.com/calendar/render?' + new URLSearchParams({action:'TEMPLATE',text:event.title || '予定',dates,location:event.place || '',details:[event.notes,'auraから作成。保存前に日時を確認してください。'].filter(Boolean).join('\n\n')})};
  };
  A.actions.calendarExchange = () => A.overlay(`${A.overlayTitle('予定を外部で使う')}<div class="connected-overlay"><p class="connected-caption">端末のタイムゾーン（${esc(Intl.DateTimeFormat().resolvedOptions().timeZone)}）を使用。終了未指定は1時間後。終日は日付のみで書き出します。繰り返しは個別予定として出力。変更の同期はありません。</p>${button('calendarICS','全予定をICSで書き出す')}${(A.allEvents?.() || []).map(event => { const info = N.calendarEvent(event); return info ? `<div class="connection-divider">${esc(event.date)} ${event.allDay?'終日':esc(event.time)}${!event.allDay&&event.endTime?'–'+esc(event.endTime):''} · ${esc(event.title)}</div>${N.link(info.google,'Google カレンダーで作成')}` : ''; }).join('') || '<p>予定がありません。</p>'}</div>`);
  N.exportCalendar = (events,name='aura-calendar.ics') => {
    const lines=events.flatMap(e=>{const info=N.calendarEvent(e);return info?['BEGIN:VEVENT',`UID:${icsEscape(e.id)}@aura.local`,`DTSTAMP:${dateICS(new Date())}`,
      ...(e.allDay?[`DTSTART;VALUE=DATE:${calendarDateOnly(info.start)}`,`DTEND;VALUE=DATE:${calendarDateOnly(info.end)}`]:[`DTSTART:${dateICS(info.start)}`,`DTEND:${dateICS(info.end)}`]),
      `SUMMARY:${icsEscape(e.title)}`,`LOCATION:${icsEscape(e.place)}`,`DESCRIPTION:${icsEscape(e.notes||'')}`,'END:VEVENT']:[];});
    if(!lines.length)return A.toast('書き出せる予定がありません');icsDownload(lines,name);
  };
  A.actions.calendarICS = () => N.exportCalendar(A.allEvents?.() || []);
  A.actions.exportReminders = () => icsDownload(A.searchableReminders().flatMap(r => ['BEGIN:VTODO',`UID:${icsEscape(r.id)}@aura.local`,`DTSTAMP:${dateICS(new Date())}`,`SUMMARY:${icsEscape(r.text)}`,`STATUS:${r.done ? 'COMPLETED' : 'NEEDS-ACTION'}`,`PRIORITY:${r.priority ? '1' : '0'}`,...(/^\d{4}-\d{2}-\d{2}$/.test(r.due || '') ? [`DUE;VALUE=DATE:${r.due.replace(/-/g,'')}`] : []),'END:VTODO']),'aura-reminders.ics');
  A.actions.shareFile = () => { const file = A.currentTextFile?.(); if (!file) return A.toast('先に共有するファイルを開いてください'); N.share(file.name,file.content); };
  A.actions.fileURLImport = () => {
    A.closeOverlay(); A.view(A.nav('URLからテキストを読む','','filesHome','戻る') + `<div class="app-content"><p class="app-subtitle">HTTPS / CORS対応の公開テキストのみ</p><form id="remote-file"><label class="form-label">URL</label><input name="url" class="text-input" type="url" required placeholder="https://example.com/data.txt" maxlength="2000"><label class="form-label">保存する名前</label><input name="name" class="text-input" required value="download.txt" maxlength="80"><button class="primary-button" type="submit" style="margin-top:16px">読み込んで保存</button></form><div id="remote-file-status" aria-live="polite"></div><p class="connected-caption">上限100KB。TXT / MD / JSON / CSV。認証付きURL・HTML非対応。ブラウザ内保存。</p></div>`);
    const lifecycle = new AbortController(); A.cleanups.push(() => lifecycle.abort());
    $('#remote-file').onsubmit = async e => {
      e.preventDefault(); const form = e.currentTarget, v = Object.fromEntries(new FormData(form)), root = $('#remote-file-status');
      const url = N.safeURL(v.url); if (!url?.startsWith('https://') || !/\.(txt|md|json|csv)$/i.test(v.name)) return A.toast('HTTPS URLと対応する拡張子の名前を入力');
      form.querySelector('button').disabled = true; root.innerHTML = status('読み込んでいます…');
      const controller = new AbortController(), cancel = () => controller.abort(); lifecycle.signal.addEventListener('abort',cancel,{once:true}); const timer = setTimeout(cancel,15000);
      try {
        const response = await fetch(url,{signal:controller.signal,credentials:'omit',referrerPolicy:'no-referrer'});
        if (!response.ok) throw new Error(`取得失敗（HTTP ${response.status}）`);
        const type = (response.headers.get('content-type') || '').split(';')[0];
        if (!['text/plain','text/markdown','text/csv','application/json','application/csv'].includes(type)) throw new Error('対応するテキスト形式ではありません。');
        if (Number(response.headers.get('content-length')) > 102400) throw new Error('100KBを超えています。');
        const reader = response.body.getReader(), chunks = []; let size = 0;
        while (true) { const {done,value} = await reader.read(); if (done) break; size += value.byteLength; if (size > 102400) { await reader.cancel(); throw new Error('100KBを超えています。'); } chunks.push(value); }
        const content = await new Blob(chunks).text(); if (!root.isConnected || lifecycle.signal.aborted) return;
        if (!A.importTextFile(v.name,content)) throw new Error('保存容量が不足しています。'); root.innerHTML = status('ファイルアプリに保存しました。');
      } catch (error) { if (root.isConnected && !lifecycle.signal.aborted) root.innerHTML = status(error.name === 'AbortError' ? 'タイムアウトしました。再試行してください。' : error.name === 'TypeError' ? '接続できません。CORS対応URLと通信状態を確認してください。' : error.message); }
      finally { clearTimeout(timer); lifecycle.signal.removeEventListener('abort',cancel); form.querySelector('button').disabled = false; }
    };
  };
  A.actions.healthExport = () => A.download(new Blob([JSON.stringify(A.healthExportData(),null,2)],{type:'application/json'}),'aura-health.json');
  A.actions.clockNotifyPermission = async () => { if (!('Notification' in window)) return A.toast('この環境ではブラウザ通知は利用できません'); try { const permission = await Notification.requestPermission(); A.toast(permission === 'granted' ? '通知を許可・ページ稼働中のみ' : '端末通知は未許可・画面内のみ'); } catch { A.toast('この環境では通知権限を利用できません'); } };
  N.clockNotice = title => { if ('Notification' in window && Notification.permission === 'granted') { try { const notice = new Notification('aura 時計',{body:title,tag:'aura-clock'}); setTimeout(() => notice.close(),15000); } catch { /* In-app notification remains available on mobile. */ } } };

  let currencyController;
  A.actions.currencyOpen = () => {
    A.closeOverlay(); A.statusTheme(false); $('#app-screen').classList.remove('calc-app');
    const options = selected => ['JPY','USD','EUR','GBP','AUD','CAD','CHF','CNY','KRW'].map(c => `<option ${c === selected ? 'selected' : ''}>${c}</option>`).join('');
    A.view(A.nav('為替換算','','calculatorHome','戻る') + `<div class="app-content"><form id="currency-form"><label class="form-label">金額</label><input class="text-input" name="amount" type="number" min="0" max="1000000000000" step="any" required value="1"><label class="form-label">元の通貨</label><select class="text-input" name="base">${options('USD')}</select><label class="form-label">換算先</label><select class="text-input" name="quote">${options('JPY')}</select><button class="primary-button" type="submit" style="margin-top:20px">換算</button></form><div id="currency-result" aria-live="polite"></div><p class="connected-caption">出典：${N.link('https://frankfurter.dev/','Frankfurter')}。日次参考値・手数料なし。休日は直近値。取引レートではありません</p></div>`);
    const root = $('#currency-result'); A.cleanups.push(() => currencyController?.abort());
    $('#currency-form').onsubmit = async e => {
      e.preventDefault(); const v = Object.fromEntries(new FormData(e.currentTarget)), amount = Number(v.amount); if (!Number.isFinite(amount) || amount < 0 || amount > 1e12) return;
      currencyController?.abort(); const controller = currencyController = new AbortController();
      if (v.base === v.quote) { root.innerHTML = status(`${amount.toLocaleString('ja-JP')} ${v.quote}（同じ通貨）`); return; }
      root.innerHTML = status('公表レートを取得しています…');
      try {
        const rates = await N.request(`https://api.frankfurter.dev/v2/rates?${new URLSearchParams({base:v.base,quotes:v.quote})}`,{signal:controller.signal});
        if (!root.isConnected || controller.signal.aborted) return;
        const rate = Array.isArray(rates) && rates.find(r => r.base === v.base && r.quote === v.quote);
        if (!rate || !Number.isFinite(rate.rate) || rate.rate <= 0) throw new Error('対象通貨のレートを取得できませんでした。');
        root.innerHTML = `<div class="connection-card"><h2>${esc((amount * rate.rate).toLocaleString('ja-JP',{maximumFractionDigits:4}))} ${esc(v.quote)}</h2><p>1 ${esc(v.base)} = ${esc(rate.rate)} ${esc(v.quote)}<br>公表日：${esc(rate.date)}</p></div>`;
      } catch (error) { if (root.isConnected && !controller.signal.aborted) root.innerHTML = status(N.errorText(error)); }
    };
  };
  A.actions.calculatorHome = () => A.open('calculator');
})();
