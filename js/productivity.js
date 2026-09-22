'use strict';
(() => {
 const A=window.Aura,$=A.$,esc=A.escape;
 const day=(d=new Date())=>`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
 const list=key=>{const v=A.load(key,[]);return Array.isArray(v)?v:[];};
 const button=(action,label,icon,id='')=>`<button class="pd-icon" data-action="${action}" data-id="${esc(id)}" aria-label="${esc(label)}" title="${esc(label)}">${A.icon(icon)}</button>`;
 const field=(label,name,value='',type='text',attrs='')=>`<label class="form-label" for="pd-${name}">${label}</label><input class="text-input" id="pd-${name}" name="${name}" value="${esc(value)}" type="${type}" ${attrs}>`;
 const select=(label,name,options,value)=>`<label class="form-label" for="pd-${name}">${label}</label><select class="text-input" name="${name}" id="pd-${name}">${options.map(([id,text])=>`<option value="${esc(id)}" ${id===value?'selected':''}>${esc(text)}</option>`).join('')}</select>`;
 const tabs=(options,value,action)=>`<div class="pd-tabs">${options.map(([id,label])=>`<button data-action="${action}" data-id="${id}" class="${id===value?'selected':''}" aria-pressed="${id===value}">${label}</button>`).join('')}</div>`;
 const empty=text=>`<div class="pd-empty">${text}</div>`;
 const download=(filename,text,type='text/plain')=>A.download(new Blob([text],{type:type+';charset=utf-8'}),filename);
 const page=(title,content,right='',back='home')=>A.view(A.nav(title,right,back,back==='home'?'':'戻る')+`<div class="app-content productivity">${content}</div>`);

 // Notes: folders, templates, checklists, previews and recoverable deletion.
 let noteFolder='all',noteQuery='',noteCurrent=null,notePreview=false;
 const folderNames=()=>[...new Set([...list('noteFolders'),...A.noteModel.get().map(n=>n.folder).filter(Boolean)])];
 // Optional visual fields never migrate or rewrite existing notes on read.
 const noteColors={auto:'自動',sand:'サンド',sage:'セージ',rose:'ローズ',lavender:'ラベンダー'};
 const notePapers={ruled:'罫線',dots:'ドット',plain:'無地'},noteFonts={sans:'ゴシック',serif:'明朝'};
 const noteTone=n=>Object.hasOwn(noteColors,n.tone)&&n.tone!=='auto'?n.tone:['sand','sage','rose','lavender'][Array.from(String(n.id)).reduce((h,c)=>(h*31+c.codePointAt(0))>>>0,0)%4];
 const notePaper=n=>Object.hasOwn(notePapers,n.paper)?n.paper:'ruled';
 const noteFont=n=>Object.hasOwn(noteFonts,n.font)?n.font:'sans';
 const noteListIcon=()=>'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" aria-hidden="true"><path d="M8 6h13M8 12h13M8 18h13M3 6h1M3 12h1M3 18h1"/></svg>';
 let noteFocus=false;
 // Failed text writes survive in this tab, including navigation and editor redraws.
 // Nothing is reported as saved until the existing atomic model write succeeds.
 const noteDrafts=new Map();
 const warnNoteUnload=e=>{if(noteDrafts.size){e.preventDefault();e.returnValue='';}};
 const syncNoteWarning=()=>{window.removeEventListener('beforeunload',warnNoteUnload);if(noteDrafts.size)window.addEventListener('beforeunload',warnNoteUnload);};
 const noteWithDraft=n=>({...n,...noteDrafts.get(n.id)});
 function saveNoteDraft(id){
  const draft=noteDrafts.get(id);if(!draft)return true;
  if(!A.noteModel.get().some(n=>n.id===id))return false;
  const updated=Date.now(),ok=A.noteModel.replace(A.noteModel.get().map(n=>n.id===id?{...n,...draft,updated}:n));
  if(ok)noteDrafts.delete(id);syncNoteWarning();
  if(id===noteCurrent&&$('#note-save-status')){
   $('#note-save-status').textContent=ok?'保存済み':'未保存・再試行できます';$('#note-save-status').dataset.state=ok?'saved':'error';
   $('#memo-save-retry').hidden=ok;$('#memo-save-warning').hidden=ok;
   if(ok)$('#memo-updated').textContent=noteDate(updated);
  }
  return ok;
 }
 const noteStyleControls=n=>`<details class="memo-style-panel"><summary>${A.icon('layers')}紙と色</summary><div class="memo-style-options"><div role="group" aria-label="メモの色"><span class="memo-option-label">COLOR</span><div class="memo-swatches">${Object.entries(noteColors).map(([value,label])=>`<button class="memo-swatch" data-action="pdNoteStyle" data-key="tone" data-id="${value}" data-tone="${value==='auto'?noteTone(n):value}" aria-label="${label}" aria-pressed="${(Object.hasOwn(noteColors,n.tone)?n.tone:'auto')===value}"><i aria-hidden="true">${value==='auto'?'A':'✓'}</i><span>${label}</span></button>`).join('')}</div></div>${[['paper','PAPER',notePapers,notePaper(n)],['font','TYPE',noteFonts,noteFont(n)]].map(([key,label,values,current])=>`<div role="group" aria-label="${key==='paper'?'紙の模様':'本文の書体'}"><span class="memo-option-label">${label}</span><div class="memo-style-segments">${Object.entries(values).map(([value,name])=>`<button data-action="pdNoteStyle" data-key="${key}" data-id="${value}" aria-pressed="${current===value}">${key==='paper'?`<i class="memo-paper-sample" data-paper="${value}" aria-hidden="true"></i>`:''}${name}</button>`).join('')}</div></div>`).join('')}</div></details>`;
 const noteDate=value=>{const d=new Date(value);return Number.isNaN(d.getTime())?'日付なし':d.toLocaleDateString('ja-JP',{month:'short',day:'numeric'});};
 let noteLayout=A.load('noteLayout','grid')==='list'?'list':'grid';
 const notePage=(content,right='',back='home',editor=false)=>A.view(A.nav('メモ',right,back,back==='home'?'':'一覧')+`<div class="app-content productivity memo-studio ${editor?'memo-editor':'memo-library'}">${content}</div>`);
 const notebookArt=()=>'<div class="memo-art" aria-hidden="true"><i class="memo-art-orbit"></i><div class="memo-book"><span>aura<span>NOTES</span></span><i></i></div><div class="memo-pencil"></div></div>';
 function notes(){
  noteCurrent=null;noteFocus=false;
  const all=A.noteModel.get();
  notePage(`<header class="memo-hero quiet-hero"><div class="memo-hero-copy"><button class="memo-compose" data-action="noteNew">${A.icon('edit')}メモを書く</button></div>${notebookArt()}</header>
   <div class="memo-quickstart"><button data-action="pdNoteTemplate" data-id="checklist">${A.icon('check')}チェックリスト</button><button data-action="pdNoteTemplates">${A.icon('layers')}テンプレート</button></div>
   ${A.search('notes-search','メモ・タグを検索')}
   <div class="memo-collection-bar"><div class="memo-filters" role="group" aria-label="メモの絞り込み"><button data-action="pdNoteFilter" data-id="all">すべて <span>${all.length}</span></button><button data-action="pdNoteFilter" data-id="pinned">${A.icon('pin')}ピン留め <span>${all.filter(n=>n.pinned).length}</span></button></div>${button('pdNoteFolders','フォルダを管理','files')}${button('pdNoteTrash','ごみ箱','trash')}</div>
   <div class="pd-folder-bar memo-folder-bar"><select id="pd-note-folder" aria-label="メモのフォルダ"><option value="all">すべてのフォルダ</option><option value="pinned">ピン留め</option><option value="">未分類</option>${folderNames().map(name=>`<option value="${esc(name)}">${esc(name)}</option>`).join('')}</select></div>
   <div class="notes-toolbar"><span id="notes-count" role="status"></span><select id="notes-sort" aria-label="メモの並べ替え"><option value="updated">更新順</option><option value="title">タイトル順</option></select><div class="memo-layout" role="group" aria-label="メモの表示方法">${[['grid','カード表示','grid'],['list','リスト表示','list']].map(([id,label,icon])=>`<button data-action="pdNoteLayout" data-id="${id}" aria-label="${label}" aria-pressed="${noteLayout===id}">${icon==='list'?noteListIcon():A.icon(icon)}</button>`).join('')}</div></div>
   <div class="notes-grid" id="notes-grid"></div>`,button('pdNoteTemplates','テンプレート','layers')+button('noteNew','新規メモ','edit'));
  $('#notes-sort').value=A.load('noteSort','updated')==='title'?'title':'updated';
  $('#notes-search').value=noteQuery;
  renderNotes();
  $('#notes-search').oninput=e=>{noteQuery=e.target.value;renderNotes();};
  $('#notes-sort').onchange=e=>{if(!A.save('noteSort',e.target.value))e.target.value=A.load('noteSort','updated');renderNotes();};
  $('#pd-note-folder').onchange=e=>{noteFolder=e.target.value;renderNotes();};
 }
 function renderNotes(){
  const query=noteQuery.trim().toLowerCase(),sort=A.load('noteSort','updated');
  const rows=A.noteModel.get().map(noteWithDraft).filter(n=>(noteFolder==='all'||noteFolder==='pinned'&&n.pinned||noteFolder===(n.folder||''))&&(n.title+' '+n.body+' '+(n.tags||'')).toLowerCase().includes(query)).sort((a,b)=>Number(!!b.pinned)-Number(!!a.pinned)||(sort==='title'?a.title.localeCompare(b.title,'ja'):b.updated-a.updated));
  $('#notes-count').textContent=rows.length+'件';
  $('#pd-note-folder').value=noteFolder;
  A.$$('.memo-filters button').forEach(el=>el.setAttribute('aria-pressed',String(el.dataset.id===noteFolder)));
  const grid=$('#notes-grid');grid.dataset.layout=noteLayout;
  grid.innerHTML=rows.map(n=>{
   const checks=n.body.split('\n').filter(x=>/^\s*[☐☑]/.test(x)),done=checks.filter(x=>/^\s*☑/.test(x)).length;
   return `<button class="note-card memo-card ${n.pinned?'is-pinned':''}" data-tone="${noteTone(n)}" data-paper="${notePaper(n)}" data-font="${noteFont(n)}" data-action="noteOpen" data-id="${esc(n.id)}">
    <span class="memo-card-top"><span class="memo-card-kind">${A.icon(checks.length?'check':'document')}</span>${n.pinned?`<span class="note-pin-label">${A.icon('pin')}<span>ピン留め</span></span>`:''}</span>
    <h3>${esc(n.title||'新しいメモ')}</h3><p class="memo-excerpt">${esc(n.body.slice(0,80))||'白紙'}${n.body.length>80?'…':''}</p>
    ${checks.length?`<span class="memo-progress"><span>${done} / ${checks.length} 完了</span><span class="memo-progress-track" aria-hidden="true"><i style="width:${done/checks.length*100}%"></i></span></span>`:''}
    ${n.tags?`<span class="pd-tags">${n.tags.trim().split(/[\s,、]+/).filter(Boolean).slice(0,3).map(t=>`<span>${esc(t.startsWith('#')?t:'#'+t)}</span>`).join('')}</span>`:''}
    <span class="memo-card-bottom"><time>${noteDrafts.has(n.id)?'未保存':noteDate(n.updated)}</time><span>${n.folder?esc(n.folder):'未分類'}</span>${A.icon('arrow')}</span></button>`;
  }).join('')||`<div class="memo-empty">${notebookArt()}<h2>${query?'見つかりませんでした':'メモなし'}</h2><p>${query?'別の言葉やタグで探してみてください。':noteFolder==='pinned'?'大切なメモを、編集画面でピン留め。':'＋で追加'}</p><button class="memo-compose" data-action="${query||noteFolder==='pinned'?'pdNoteReset':'noteNew'}">${A.icon(query?'search':'edit')}${query||noteFolder==='pinned'?'すべてのメモを見る':'メモを書く'}</button></div>`;
 }
 A.actions.pdNoteFilter=el=>{noteFolder=el.dataset.id;renderNotes();};
 A.actions.pdNoteReset=()=>{noteFolder='all';noteQuery='';notes();};
 A.actions.pdNoteLayout=el=>{
  const value=el.dataset.id;if(!['grid','list'].includes(value)||!A.save('noteLayout',value))return;
  noteLayout=value;renderNotes();A.$$('.memo-layout button').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.id===value)));
 };
 function noteEditor(id){
  const stored=A.noteModel.get().find(x=>x.id===id);if(!stored)return;const n=noteWithDraft(stored);noteCurrent=id;
  notePage(`<div class="pd-editor-top"><span id="note-save-status" role="status" data-state="${noteDrafts.has(id)?'error':'saved'}">${noteDrafts.has(id)?'未保存・再試行できます':'保存済み'}</span><button id="memo-save-retry" data-action="pdNoteRetry" ${noteDrafts.has(id)?'':'hidden'}>再試行</button><span id="note-length">${Array.from(n.body).length}字</span></div>
   <p class="memo-save-warning" id="memo-save-warning" ${noteDrafts.has(id)?'':'hidden'}>このタブ内に下書きを保持しています。タブを閉じる前に再試行、または「メモの操作」からテキスト保存してください。</p>
   <div class="note-editor-tools"><button class="note-pin-button" data-action="notePin" aria-pressed="${!!n.pinned}">${A.icon('pin')}<span>ピン留め</span></button><button class="pd-text-button memo-organize" data-action="pdNoteOrganize">${A.icon('files')}<span>${esc(n.folder||'未分類')}</span>${A.icon('arrow')}</button></div>
   <div class="memo-workspace-bar"><button data-action="pdNoteFocus" aria-pressed="${noteFocus}">${A.icon('eye')}<span>${noteFocus?'集中表示を終了':'集中表示'}</span></button></div>${noteStyleControls(n)}
   <section class="memo-paper" data-tone="${noteTone(n)}" data-paper="${notePaper(n)}" data-font="${noteFont(n)}" aria-label="メモの編集"><div class="memo-paper-heading"><span id="memo-updated">${noteDate(n.updated)}</span></div>
   <input class="note-title-input" id="note-title" aria-label="メモのタイトル" placeholder="タイトル" maxlength="120" value="${esc(n.title)}">
   <div class="pd-format-bar" role="group" aria-label="メモの書式"><button data-action="pdNoteInsert" data-id="☐ " aria-label="チェック項目">${A.icon('check')}</button><button data-action="pdNoteInsert" data-id="• " aria-label="箇条書き">${noteListIcon()}</button><button data-action="pdNoteInsert" data-id="# " aria-label="見出し">H</button><button data-action="pdNoteInsert" data-id="date" aria-label="日付を挿入">${A.icon('calendar')}</button><button data-action="pdNotePreview" class="${notePreview?'selected':''}" aria-pressed="${notePreview}">${A.icon(notePreview?'edit':'eye')}${notePreview?'編集':'表示'}</button></div>
   <textarea class="note-body-input pd-note-body" id="note-body" aria-label="メモ本文" maxlength="50000" placeholder="本文" ${notePreview?'hidden':''}>${esc(n.body)}</textarea><div id="pd-note-preview" class="pd-markdown" ${notePreview?'':'hidden'}></div>
   <div class="memo-paper-foot">${A.icon('lock')}このブラウザに自動保存</div></section>`,button('pdNoteMenu','メモの操作','layers'),'noteList',true);
  $('.memo-editor').dataset.focus=String(noteFocus);
  const save=e=>{
   if(e?.isComposing)return;
   const draft={title:$('#note-title').value,body:$('#note-body').value};
   noteDrafts.set(id,draft);$('#note-length').textContent=Array.from(draft.body).length+'字';saveNoteDraft(id);
  };
  for(const el of [$('#note-title'),$('#note-body')]){el.oninput=save;el.addEventListener('compositionend',save);}
  if(notePreview)renderNotePreview(n);

 }
 A.actions.pdNoteRetry=()=>saveNoteDraft(noteCurrent);
 A.actions.pdNoteStyle=el=>{
  const key=el.dataset.key,value=el.dataset.id,choices={tone:noteColors,paper:notePapers,font:noteFonts};
  if(!Object.hasOwn(choices,key)||!Object.hasOwn(choices[key],value)||!saveNoteDraft(noteCurrent))return;
  const n=A.noteModel.get().find(x=>x.id===noteCurrent);if(!n)return;
  const next={...n,[key]:value};if(!A.noteModel.replace(A.noteModel.get().map(x=>x.id===n.id?next:x)))return;
  const paper=$('.memo-paper');paper.dataset.tone=noteTone(next);paper.dataset.paper=notePaper(next);paper.dataset.font=noteFont(next);
  A.$$(`.memo-style-panel [data-key="${key}"]`).forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.id===value)));
  $('.memo-swatch[data-id="auto"]').dataset.tone=noteTone({...next,tone:'auto'});
 };
 A.actions.pdNoteFocus=el=>{
  noteFocus=!noteFocus;$('.memo-editor').dataset.focus=String(noteFocus);
  el.setAttribute('aria-pressed',String(noteFocus));el.querySelector('span').textContent=noteFocus?'集中表示を終了':'集中表示';
 };
 function renderNotePreview(n){$('#pd-note-preview').innerHTML=n.body.split('\n').map((line,i)=>/^\s*[☐☑]/.test(line)?`<button class="pd-checkline ${/^\s*☑/.test(line)?'done':''}" data-action="pdNoteCheck" data-id="${i}" aria-pressed="${/^\s*☑/.test(line)}"><span>${/^\s*☑/.test(line)?'✓':''}</span>${esc(line.replace(/^\s*[☐☑]\s*/,''))}</button>`:/^#{1,3}\s/.test(line)?`<h3>${esc(line.replace(/^#{1,3}\s/,''))}</h3>`:/^[-•]\s/.test(line)?`<div class="pd-bullet">${esc(line.replace(/^[-•]\s/,''))}</div>`:`<p>${esc(line)||'<br>'}</p>`).join('');}
 function newNote(template={title:'',body:''}){const n={id:A.id(),...template,folder:['all','pinned'].includes(noteFolder)?'':noteFolder,updated:Date.now(),pinned:false,tags:''};if(!A.noteModel.replace([n,...A.noteModel.get()]))return;A.closeOverlay();notePreview=false;noteEditor(n.id);$('#note-title').focus();}
 A.apps.notes.render=notes;A.actions.noteList=notes;A.actions.noteOpen=el=>{notePreview=false;noteEditor(el.dataset.id);};A.actions.noteNew=()=>newNote();
 A.actions.notePin=()=>{const n=A.noteModel.get().find(x=>x.id===noteCurrent);if(n&&A.noteModel.replace(A.noteModel.get().map(x=>x.id===n.id?{...x,pinned:!x.pinned}:x)))noteEditor(n.id);};
 A.actions.pdNoteInsert=el=>{if(notePreview){notePreview=false;noteEditor(noteCurrent);}const input=$('#note-body'),text=el.dataset.id==='date'?day():el.dataset.id;const insertion=(input.selectionStart&&input.value[input.selectionStart-1]!=='\n'?'\n':'')+text;if(input.value.length-(input.selectionEnd-input.selectionStart)+insertion.length>input.maxLength)return A.toast('本文の上限に達しています');input.setRangeText(insertion,input.selectionStart,input.selectionEnd,'end');input.dispatchEvent(new Event('input'));input.focus();};
 A.actions.pdNotePreview=()=>{notePreview=!notePreview;noteEditor(noteCurrent);};
 A.actions.pdNoteCheck=el=>{const n=A.noteModel.get().find(x=>x.id===noteCurrent);if(!n)return;const lines=n.body.split('\n'),i=Number(el.dataset.id);lines[i]=lines[i].replace(/[☐☑]/,c=>c==='☐'?'☑':'☐');if(A.noteModel.replace(A.noteModel.get().map(x=>x.id===n.id?{...x,body:lines.join('\n'),updated:Date.now()}:x)))noteEditor(n.id);};
 A.actions.pdNoteOrganize=()=>{const n=A.noteModel.get().find(x=>x.id===noteCurrent);if(!n)return;A.form('整理',select('フォルダ','folder',[['','未分類'],...folderNames().map(x=>[x,x])],n.folder||'')+field('タグ','tags',n.tags||'','text','maxlength="120"'),v=>{if(!A.noteModel.replace(A.noteModel.get().map(x=>x.id===n.id?{...x,...v,updated:Date.now()}:x)))return false;noteEditor(n.id);});};
 A.actions.pdNoteFolders=()=>A.overlay(`${A.overlayTitle('フォルダ')}<div class="pd-menu">${folderNames().map(name=>`<div class="pd-folder-row"><span>${esc(name)}</span>${button('pdNoteFolderDelete','フォルダを削除','trash',name)}</div>`).join('')}<button data-action="pdNoteFolderNew">＋ フォルダを作成</button></div>`);
 A.actions.pdNoteFolderNew=()=>A.form('フォルダを作成',field('名前','name','','text','required maxlength="40"'),v=>{const name=v.name.trim();if(!name||['all','pinned'].includes(name)){A.toast('別の名前を入力');return false;}if(!A.save('noteFolders',[...new Set([...folderNames(),name])]))return false;noteFolder=name;notes();});
 A.actions.pdNoteFolderDelete=el=>A.confirm('フォルダを削除？','メモは未分類に移動します。',()=>{const name=el.dataset.id;if(!A.noteModel.replace(A.noteModel.get().map(n=>n.folder===name?{...n,folder:''}:n),{noteFolders:folderNames().filter(x=>x!==name)}))return;noteFolder='all';notes();});
 const templates={checklist:{title:'チェックリスト',body:'☐ \n☐ \n☐ '},meeting:{title:'打ち合わせ',body:'# '+day()+'\n\n# 議題\n• \n\n# 決まったこと\n• \n\n# 次のアクション\n☐ '},trip:{title:'旅の計画',body:'# 行き先\n\n# 予定\n\n# 持ちもの\n☐ \n☐ '},idea:{title:'アイデア',body:'# やりたいこと\n\n# きっかけ\n\n# 次の一歩\n☐ '}};
 A.actions.pdNoteTemplates=()=>A.overlay(`${A.overlayTitle('テンプレート')}<div class="pd-template-grid">${Object.entries(templates).map(([id,t])=>`<button data-action="pdNoteTemplate" data-id="${id}">${A.icon(id==='checklist'?'check':id==='trip'?'maps':id==='meeting'?'calendar':'notes')}<strong>${t.title}</strong></button>`).join('')}</div>`);A.actions.pdNoteTemplate=el=>newNote(templates[el.dataset.id]);
 A.actions.pdNoteMenu=()=>A.overlay(`${A.overlayTitle('メモ')}<div class="pd-menu"><button data-action="pdNoteOrganize">${A.icon('files')}フォルダ・タグ</button><button data-action="pdNoteDuplicate">${A.icon('layers')}複製</button><button data-action="pdNoteExport">${A.icon('download')}テキスト保存</button><button data-action="noteDelete" class="pd-danger">${A.icon('trash')}ごみ箱へ</button></div>`);
 A.actions.pdNoteDuplicate=()=>{const n=A.noteModel.get().find(x=>x.id===noteCurrent);if(!n)return;const copy={...n,id:A.id(),title:(n.title+' コピー').slice(0,120),updated:Date.now()};if(A.noteModel.replace([copy,...A.noteModel.get()])){A.closeOverlay();noteEditor(copy.id);}};
 A.actions.pdNoteExport=()=>{const n=A.noteModel.get().find(x=>x.id===noteCurrent);if(n){const draft=noteWithDraft(n);download((draft.title||'メモ').replace(/[\\/:*?"<>|]/g,'_')+'.txt',draft.title+'\n\n'+draft.body);}};
 A.actions.noteDelete=()=>{const n=A.noteModel.get().find(x=>x.id===noteCurrent);if(!n)return;const trash=[{...n,deletedAt:Date.now()},...list('noteTrash').filter(x=>x.id!==n.id)];if(!A.noteModel.replace(A.noteModel.get().filter(x=>x.id!==n.id),{noteTrash:trash}))return;A.closeOverlay();notes();A.toast('ごみ箱に移動済み');};
 A.actions.pdNoteTrash=()=>page('ごみ箱',`${list('noteTrash').map(n=>`<div class="pd-trash-row"><div><strong>${esc(n.title||'メモ')}</strong><small>${new Date(n.deletedAt).toLocaleDateString('ja-JP')}</small></div>${button('pdNoteRestore','復元','refresh',n.id)}${button('pdNotePurge','完全に削除','trash',n.id)}</div>`).join('')||empty('ごみ箱は空です')}`,'','noteList');
 A.actions.pdNoteRestore=el=>{const n=list('noteTrash').find(x=>x.id===el.dataset.id);if(!n)return;const {deletedAt,...rest}=n;const notes=A.noteModel.get(),next=notes.some(x=>x.id===n.id)?notes:[{...rest,updated:Date.now()},...notes];if(A.noteModel.replace(next,{noteTrash:list('noteTrash').filter(x=>x.id!==n.id)}))A.actions.pdNoteTrash();};
 A.actions.pdNotePurge=el=>A.confirm('完全に削除？','この操作は元に戻せません。',()=>{if(A.save('noteTrash',list('noteTrash').filter(x=>x.id!==el.dataset.id)))A.actions.pdNoteTrash();});

 for(const action of ['notePin','pdNotePreview','pdNoteOrganize','pdNoteDuplicate','noteDelete','pdNoteCheck']){
  const run=A.actions[action];A.actions[action]=el=>{if(saveNoteDraft(noteCurrent))return run(el);};
 }

 // Calendar Atelier: the existing event model remains the single source of truth.
 const eventColors={rose:'#bf6f70',sage:'#678c76',blue:'#638cae',gold:'#b68a45',violet:'#9680b1'};
 const calColors=[['rose','ローズ'],['sage','セージ'],['blue','ブルー'],['gold','ゴールド'],['violet','ラベンダー']];
 const calViews=[['month','月'],['week','週'],['day','日'],['agenda','予定']];
 let calendarView=A.load('calendarView','month'),calendarDay=day(),calendarMonth=new Date(new Date().getFullYear(),new Date().getMonth(),1),eventQuery='';
 if(!calViews.some(([id])=>id===calendarView))calendarView='month';
 let calWeekStart=A.load('calendarWeekStart',0)===1?1:0,calFilter='all',calMotion='',calUndo=[],calResultLimit=80,calArtId=0;
 const calKey=d=>`${String(d.getFullYear()).padStart(4,'0')}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
 const calValid=value=>/^\d{4}-\d{2}-\d{2}$/.test(value||'')&&value>='0100-01-01'&&value<='9998-12-31'&&calKey(new Date(value+'T12:00:00'))===value;
 const calShift=(value,n)=>{const d=new Date(value+'T12:00:00');d.setDate(d.getDate()+n);return calKey(d);};
 const calDateLabel=value=>new Date(value+'T12:00:00').toLocaleDateString('ja-JP',{month:'long',day:'numeric',weekday:'short'});
 const calColor=e=>Object.hasOwn(eventColors,e.color)?e.color:'rose';
 const calNormalize=text=>String(text||'').normalize('NFKC').trim().toLocaleLowerCase('ja-JP');
 const calTime=n=>`${String(Math.floor(n/60)).padStart(2,'0')}:${String(n%60).padStart(2,'0')}`;
 const calButton=(action,label,id='',extra='')=>`<button type="button" data-action="${action}" data-id="${esc(id)}" ${extra}>${label}</button>`;
 const sortedEvents=()=>[...A.eventModel.get()].sort((a,b)=>String(a.date).localeCompare(String(b.date))||Number(!!b.allDay)-Number(!!a.allDay)||String(a.time||'').localeCompare(String(b.time||''))||String(a.title).localeCompare(String(b.title),'ja'));
 // End dates remain implicit for legacy overnight events. Use local date arithmetic,
 // not 24-hour millisecond offsets, for midnight boundaries (including DST days).
 function calRange(e){
  if(!calValid(e.date))return null;
  const start=new Date(`${e.date}T${e.allDay?'00:00':e.time||'00:00'}:00`);
  let end=e.allDay?new Date(calShift(e.date,1)+'T00:00:00'):e.endTime?new Date(`${e.date}T${e.endTime}:00`):new Date(+start+3600000);
  if(e.endTime&&!e.allDay&&end<=start)end.setDate(end.getDate()+1);
  return Number.isFinite(+start)&&Number.isFinite(+end)?{start,end}:null;
 }
 const calOn=(events,key)=>{const from=new Date(key+'T00:00:00'),to=new Date(calShift(key,1)+'T00:00:00');return events.filter(e=>{const r=calRange(e);return r&&r.start<to&&r.end>from;});};
 function calWeek(){const d=new Date(calendarDay+'T12:00:00');return calShift(calendarDay,-((d.getDay()-calWeekStart+7)%7));}
 function calChoose(key){if(!calValid(key))return false;calendarDay=key;calendarMonth=new Date(key+'T12:00:00');calendarMonth.setDate(1);return true;}
 function calArt(key){
  const id='cal-art-'+(++calArtId),d=new Date(key+'T12:00:00');
  return `<svg class="cal-art" viewBox="0 0 180 160" fill="none" aria-hidden="true" focusable="false"><defs>
   <linearGradient id="${id}-paper" x1="25" y1="25" x2="140" y2="145" gradientUnits="userSpaceOnUse"><stop stop-color="#fffef6"/><stop offset=".65" stop-color="#f9f0e3"/><stop offset="1" stop-color="#dbc9b3"/></linearGradient>
   <linearGradient id="${id}-red" x2="1" y2="1"><stop stop-color="#e4a08c"/><stop offset=".5" stop-color="#c87870"/><stop offset="1" stop-color="#94514f"/></linearGradient>
   <linearGradient id="${id}-metal" x2="1" y2="0"><stop stop-color="#806c50"/><stop offset=".35" stop-color="#ffedc4"/><stop offset=".55" stop-color="#c3ab80"/><stop offset=".8" stop-color="#fff1d2"/><stop offset="1" stop-color="#8b775b"/></linearGradient>
   </defs><ellipse cx="89" cy="143" rx="57" ry="8" fill="#634d3d" opacity=".12"/><circle cx="143" cy="33" r="22" fill="#eacb8b" opacity=".35"/><circle class="cal-sun" cx="143" cy="33" r="13" fill="#dbb369"/><path d="M17 80C-5 29 65 8 131 18s61 86-1 119" stroke="#c4ad8f" stroke-dasharray="2 5" opacity=".55"/>
   <g class="cal-paper-art"><path d="M31 47l111-5 9 85-108 15z" fill="#c8b49e"/><path d="M27 42l112-3 9 87-110 13z" fill="#f0e5d5" stroke="#cbb9a2"/><path d="M28 40l111 3 3 84-109 8z" fill="#eee0cc" stroke="#fff6e7"/><g transform="rotate(-8 83 81)"><rect x="27" y="28" width="111" height="105" rx="9" fill="url(#${id}-paper)" stroke="#fff9ef"/><path d="M36 28h93a9 9 0 0 1 9 9v22H27V37a9 9 0 0 1 9-9" fill="url(#${id}-red)"/><path d="M30 61h105" stroke="#c7afa0" stroke-dasharray="2 3"/><path d="M34 121h84" stroke="#d6c7b5"/><path d="M118 133v-15h20" fill="#ead9c3"/><path d="M118 133l20-15" stroke="#cbb79c"/>
   ${[50,113].map(x=>`<ellipse cx="${x}" cy="39" rx="6" ry="4" fill="#824f4b"/><rect x="${x-4}" y="17" width="8" height="24" rx="4" fill="url(#${id}-metal)" stroke="#8b7356" stroke-width=".6"/>`).join('')}
   <text x="82" y="52" text-anchor="middle" fill="#fff6e7" font-size="8" letter-spacing="3">${['SUN','MON','TUE','WED','THU','FRI','SAT'][d.getDay()]}</text><text x="82" y="111" text-anchor="middle" fill="#694f49" font-family="Georgia,serif" font-size="51">${d.getDate()}</text></g></g>
   <g stroke="#789080" stroke-width="2" stroke-linecap="round"><path d="M148 137q-4-24 11-49"/><path d="M149 126q-17-3-16-15 12 0 16 15M151 114q17-3 17-16-13 2-17 16" fill="#9aaf94" stroke-width="1"/></g><path d="M19 37v10m-5-5h10" stroke="#bd9960" stroke-width="1.5"/></svg>`;
 }
 function calEmpty(key,filtered=false){return `<div class="cal-empty"><svg viewBox="0 0 80 60" aria-hidden="true"><path d="M12 42Q40 24 68 42" fill="none" stroke="currentColor" stroke-width="1.5"/><path d="M19 42v8m42-8v8" stroke="currentColor"/><circle cx="40" cy="19" r="10" fill="currentColor" opacity=".18"/><path d="M40 4v-3M25 9l-3-3m33 3 3-3" stroke="currentColor"/></svg><strong>${filtered?'この色の予定はありません':'余白のある一日。'}</strong><span>${filtered?'「すべて」で他の色も表示':'小さな楽しみを、ひとつ。'}</span>${calButton('pdCalendarDayAdd','＋ 予定を追加',key)}</div>`;}
 function agendaRows(rows,key=calendarDay){
  if(!rows.length)return calEmpty(key,calFilter!=='all');
  return rows.map((e,i)=>{const r=calRange(e),overnight=r&&calKey(r.end)!==e.date,clash=!e.allDay&&A.eventModel.get().some(other=>{if(other.id===e.id||other.allDay)return false;const t=calRange(other);return r&&t&&r.start<t.end&&t.start<r.end;});
   return `<button class="cal-event" data-action="calendarEdit" data-id="${esc(e.id)}" style="--event-color:${eventColors[calColor(e)]};--cal-i:${Math.min(i,6)}"><span class="cal-event-time">${e.allDay?'終日':esc(e.time||'00:00')}<small>${e.allDay?'ALL DAY':(overnight?'翌 ':'')+esc(e.endTime||(r?r.end.toLocaleTimeString('ja-JP',{hour:'2-digit',minute:'2-digit',hour12:false}):''))}</small></span><span class="cal-event-body"><strong>${esc(e.title)}</strong>${e.place?`<small>${A.icon('pin')}${esc(e.place)}</small>`:''}${e.notes?`<span class="cal-note-preview">${esc(e.notes)}</span>`:''}<span class="cal-event-tags">${e.date<key?'<em>前日から</em>':''}${e.series?'<em>繰り返し</em>':''}${clash?'<em class="cal-clash">時間が重複</em>':''}</span></span><span class="cal-event-arrow" aria-hidden="true">›</span></button>`;
  }).join('');
 }
 function calDaySection(key,events){return `<section class="cal-daily"><header class="cal-section-heading"><h3>${calDateLabel(key)}</h3>${calButton('pdCalendarDayAdd',A.icon('plus'),key,`aria-label="${key}に予定を追加"`)}</header><div class="cal-event-list">${agendaRows(calOn(events,key),key)}</div></section>`;}
 function calMonthGrid(events){
  const first=new Date(calendarMonth),offset=(first.getDay()-calWeekStart+7)%7,start=calShift(calKey(first),-offset),today=day();
  return `<div class="cal-month-paper"><div class="cal-binding" aria-hidden="true"><i></i><i></i></div><div class="cal-grid" role="group" aria-label="日付を選択・矢印キーで移動">${Array.from({length:7},(_,i)=>`<span class="cal-weekday" data-weekday="${(i+calWeekStart)%7}">${['日','月','火','水','木','金','土'][(i+calWeekStart)%7]}</span>`).join('')}${Array.from({length:42},(_,i)=>{const key=calShift(start,i),d=new Date(key+'T12:00:00'),items=calOn(events,key);return `<button class="cal-date ${d.getMonth()!==calendarMonth.getMonth()?'is-outside':''} ${key===today?'is-today':''}" data-action="calendarSelect" data-date="${key}" data-weekday="${d.getDay()}" aria-pressed="${key===calendarDay}" ${key===today?'aria-current="date"':''} aria-label="${calDateLabel(key)}、${items.length}件${key===today?'、今日':''}" tabindex="${key===calendarDay?'0':'-1'}"><strong>${d.getDate()}</strong><span class="cal-dots" aria-hidden="true">${items.slice(0,3).map(e=>`<i style="background:${eventColors[calColor(e)]}"></i>`).join('')}${items.length>3?'<b>+</b>':''}</span></button>`;}).join('')}</div><div class="cal-paper-footer"><span>${calFilter==='all'?'すべての予定':'色で絞り込み中'}</span><span>● 今日　<span class="cal-selected-key">選択日</span></span></div></div>`;
 }
 function calWeekChart(events){
  const start=calWeek(),counts=Array.from({length:7},(_,i)=>calOn(events,calShift(start,i)).length),max=Math.max(3,...counts);
  return `<div class="cal-week-chart"><header><span>WEEKLY RHYTHM</span><small>${calDateLabel(start)} から7日間</small></header><div>${counts.map((n,i)=>{const key=calShift(start,i);return calButton('calOpenDay',`<span class="cal-chart-count">${n}</span><svg viewBox="0 0 24 48" aria-hidden="true"><rect x="6" y="0" width="12" height="48" rx="6" fill="currentColor" opacity=".08"/><rect class="cal-chart-bar" x="6" y="${48-Math.max(3,n/max*48)}" width="12" height="${Math.max(3,n/max*48)}" rx="6" fill="currentColor"/></svg><span>${['日','月','火','水','木','金','土'][(i+calWeekStart)%7]}</span>`,key,`aria-label="${calDateLabel(key)}、${n}件、日表示を開く" aria-pressed="${key===calendarDay}"`);}).join('')}</div></div>`;
 }
 function calDayPlan(events){
  const all=calOn(A.eventModel.get(),calendarDay),visible=calOn(events,calendarDay),busy=all.filter(e=>!e.allDay).map(e=>{const r=calRange(e),start=r.start<new Date(calendarDay+'T00:00:00')?0:r.start.getHours()*60+r.start.getMinutes(),end=calKey(r.end)>calendarDay?1440:r.end.getHours()*60+r.end.getMinutes();return {start,end};}).sort((a,b)=>a.start-b.start);
  let cursor=540;const gaps=[];
  for(const r of busy){if(r.end<=540||r.start>=1080)continue;if(r.start>cursor)gaps.push([cursor,Math.min(r.start,1080)]);cursor=Math.max(cursor,Math.min(r.end,1080));}
  if(cursor<1080)gaps.push([cursor,1080]);
  const free=all.some(e=>e.allDay)?[]:gaps.filter(([a,b])=>b-a>=30);
  return `<div class="cal-day-strip" aria-label="一日の予定位置（24時間）"><div class="cal-hours"><span>0:00</span><span>6:00</span><span>12:00</span><span>18:00</span><span>24:00</span></div><div class="cal-day-track">${visible.filter(e=>!e.allDay).map(e=>{const r=calRange(e),start=calKey(r.start)<calendarDay?0:r.start.getHours()*60+r.start.getMinutes(),end=calKey(r.end)>calendarDay?1440:r.end.getHours()*60+r.end.getMinutes();return `<i style="left:${start/14.4}%;width:${Math.max(.4,(end-start)/14.4)}%;background:${eventColors[calColor(e)]}"></i>`;}).join('')}</div><p>帯は時間指定のみ・重複する予定は下のカードで確認</p></div>${calDaySection(calendarDay,events)}<section class="cal-free"><header class="cal-section-heading"><h3>${A.icon('sun')}空き時間から追加</h3><span>9:00–18:00</span></header><div>${free.length?free.map(([a,b])=>calButton('calFreeAdd',`${calTime(a)}–${calTime(b)} <span>＋</span>`,`${a}:${b}`)).join(''):`<p>${all.some(e=>e.allDay)?'終日予定があるため候補を表示しません':'30分以上の空き時間はありません'}</p>`}</div><small>全色の予定を参照。移動・休憩時間は含みません。</small></section>`;
 }
 function calendar(focus=''){
  const old=$('.calendar-atelier'),scroll=old?.scrollTop||0,events=sortedEvents(),visible=events.filter(e=>calFilter==='all'||calColor(e)===calFilter),monthKey=calKey(calendarMonth).slice(0,7),monthEvents=visible.filter(e=>e.date.startsWith(monthKey));
  let content='';
  if(calendarView==='month')content=calMonthGrid(visible)+calDaySection(calendarDay,visible);
  else if(calendarView==='week'){const start=calWeek();content=calWeekChart(visible)+Array.from({length:7},(_,i)=>calDaySection(calShift(start,i),visible)).join('');}
  else if(calendarView==='day')content=calDayPlan(visible);
  else content=`<div class="cal-search">${A.search('pd-event-search','タイトル・場所・メモ・日付を検索')}</div><p class="cal-result-caption" id="cal-result-caption" role="status"></p><div id="pd-event-results"></div>`;
  const title=calendarView==='week'?`${calDateLabel(calWeek())}〜`:calendarView==='day'?calDateLabel(calendarDay):`${calendarMonth.getFullYear()}年 ${calendarMonth.getMonth()+1}月`;
  A.view(A.nav('カレンダー',button('calOptions','カレンダーの設定と書き出し','settings')+button('calendarAdd','予定を追加','plus'))+`<div class="app-content productivity calendar-atelier"><header class="cal-hero"><div><span class="cal-eyebrow">CALENDAR ATELIER</span><h2>${calendarMonth.getMonth()+1}<small>月</small><span>${calendarMonth.toLocaleDateString('en-US',{month:'long'})} ${calendarMonth.getFullYear()}</span></h2><p>${monthEvents.length}件の予定 <i></i> ${new Set(monthEvents.map(e=>e.date)).size}日${calFilter!=='all'?' · 絞込中':''}</p></div>${calArt(calendarDay)}</header>
   <div class="cal-view-tabs" role="group" aria-label="カレンダーの表示">${calViews.map(([id,label])=>calButton('pdCalendarView',label,id,`aria-pressed="${id===calendarView}"`)).join('')}</div>
   <nav class="cal-navigation" aria-label="表示期間"><button data-action="calendarMove" data-value="-1" aria-label="前の${calendarView==='week'?'週':calendarView==='day'?'日':'月'}">‹</button><button class="cal-date-jump" data-action="calJump" aria-label="日付へ移動">${title}<span aria-hidden="true">⌄</span></button><button class="cal-today" data-action="calendarToday">今日</button><button data-action="calendarMove" data-value="1" aria-label="次の${calendarView==='week'?'週':calendarView==='day'?'日':'月'}">›</button></nav>
   <div class="cal-color-filters" role="group" aria-label="予定の色で絞り込み">${calButton('calFilter','すべて','all',`aria-pressed="${calFilter==='all'}"`)}${calColors.map(([id,label])=>calButton('calFilter',`<i style="background:${eventColors[id]}"></i><span>${label}</span>`,id,`aria-pressed="${calFilter===id}"`)).join('')}</div>
   ${calUndo.length?`<div class="cal-undo" role="status"><span>${calUndo.length}件を削除しました</span>${calButton('calUndo','元に戻す')}<button data-action="calDismissUndo" aria-label="取り消しを閉じる">×</button></div>`:''}
   <div class="cal-page ${calMotion}">${content}</div><button class="cal-add-button" data-action="calendarAdd">${A.icon('plus')}予定をつくる<span aria-hidden="true">↗</span></button><p class="cal-local-note">${A.icon('lock')}このブラウザに保存・自動同期なし</p></div>`);
  calMotion='';$('.calendar-atelier').scrollTop=scroll;
  if(calendarView==='agenda'){
   $('#pd-event-search').value=eventQuery;
   $('#pd-event-search').oninput=e=>{eventQuery=e.target.value;calResultLimit=80;calRenderSearch();};calRenderSearch();
  }
  const grid=$('.cal-grid');if(grid)grid.onkeydown=e=>{
   if(!e.target.matches('.cal-date')||e.altKey||e.ctrlKey||e.metaKey)return;
   const offsets={ArrowLeft:-1,ArrowRight:1,ArrowUp:-7,ArrowDown:7};let offset=offsets[e.key];
   if(e.key==='Home')offset=-((new Date(calendarDay+'T12:00:00').getDay()-calWeekStart+7)%7);
   if(e.key==='End')offset=6-((new Date(calendarDay+'T12:00:00').getDay()-calWeekStart+7)%7);
   if(offset===undefined)return;e.preventDefault();if(calChoose(calShift(calendarDay,offset)))calendar(`[data-date="${calendarDay}"]`);
  };
  if(typeof focus==='string'&&focus)$(focus,$('.calendar-atelier'))?.focus({preventScroll:true});
 }
 function calRenderSearch(){
  const query=calNormalize(eventQuery),rows=sortedEvents().filter(e=>(calFilter==='all'||calColor(e)===calFilter)&&(query?calNormalize([e.title,e.place,e.notes,e.date].join(' ')).includes(query):e.date>=calendarDay));
  let previous='';$('#cal-result-caption').textContent=`${rows.length}件${query?' · 全期間を検索':` · ${calendarDay} 以降`}（最大${calResultLimit}件表示）`;
  $('#pd-event-results').innerHTML=rows.slice(0,calResultLimit).map(e=>{const heading=e.date!==previous?`<header class="cal-section-heading"><h3>${esc(e.date)} · ${calDateLabel(e.date)}</h3></header>`:'';previous=e.date;return heading+agendaRows([e],e.date);}).join('')||(query?`<div class="cal-empty"><strong>見つかりませんでした</strong><span>検索語や色の条件を変えてみてください。</span>${calButton('calSearchReset','検索と絞り込みを解除')}</div>`:calEmpty(calendarDay,calFilter!=='all'));
  if(rows.length>calResultLimit)$('#pd-event-results').insertAdjacentHTML('beforeend',calButton('calMore','さらに80件表示','','class="cal-more"'));
 }
 A.apps.calendar.render=calendar;
 A.actions.pdCalendarView=el=>{if(!calViews.some(([id])=>id===el.dataset.id)||!A.save('calendarView',el.dataset.id))return;calendarView=el.dataset.id;calendar(`[data-action="pdCalendarView"][data-id="${calendarView}"]`);};
 A.actions.calendarToday=()=>{calChoose(day());calendar('[data-action="calendarToday"]');};
 A.actions.calendarMove=el=>{const n=Number(el.dataset.value);if(![-1,1].includes(n))return;let key;if(calendarView==='week'||calendarView==='day')key=calShift(calendarDay,n*(calendarView==='week'?7:1));else{const d=new Date(calendarMonth);d.setMonth(d.getMonth()+n);key=calKey(d);}if(!calChoose(key))return;calMotion=n>0?'cal-next':'cal-prev';calendar(`[data-action="calendarMove"][data-value="${n}"]`);};
 A.actions.calendarSelect=el=>{if(calChoose(el.dataset.date))calendar(`[data-date="${calendarDay}"]`);};
 A.actions.calOpenDay=el=>{if(!calValid(el.dataset.id)||!A.save('calendarView','day'))return;calChoose(el.dataset.id);calendarView='day';calendar('[data-action="pdCalendarView"][data-id="day"]');};
 A.actions.calFilter=el=>{if(el.dataset.id!=='all'&&!Object.hasOwn(eventColors,el.dataset.id))return;calFilter=el.dataset.id;calendar(`[data-action="calFilter"][data-id="${calFilter}"]`);};
 A.actions.calMore=()=>{calResultLimit+=80;calRenderSearch();};
 A.actions.calSearchReset=()=>{eventQuery='';calFilter='all';calResultLimit=80;calendar('#pd-event-search');};
 A.actions.calJump=()=>A.form('日付へ移動',field('日付','date',calendarDay,'date','required min="0100-01-01" max="9998-12-31"'),v=>{if(!calChoose(v.date))return false;calendar();},'移動');
 A.actions.calOptions=()=>{
  A.form('カレンダーの設定',select('週の始まり','weekStart',[['0','日曜日'],['1','月曜日']],String(calWeekStart))+`<div class="cal-options"><h4>予定の書き出し</h4>${calButton('calendarExchange',A.icon('share')+'Google カレンダー・ICS')}${calButton('calDayICS',A.icon('download')+'選択日の予定をICS保存')}<p>選択日の書き出しは全色・前日から続く予定も含みます。外部への自動同期はありません。</p><h4>操作のヒント</h4><p>日付は矢印キーでも選択できます。日表示の空き時間から、新しい予定を作成できます。削除の取り消しは直前の1操作・このタブ内のみです。</p></div>`,v=>{const value=Number(v.weekStart);if(![0,1].includes(value)||!A.save('calendarWeekStart',value))return false;calWeekStart=value;calendar();});
 };
 A.actions.calDayICS=()=>A.network.exportCalendar?.(calOn(A.eventModel.get(),calendarDay),`aura-calendar-${calendarDay}.ics`);
 const calTemplates={meeting:{title:'打ち合わせ',time:'10:00',endTime:'11:00',color:'blue'},focus:{title:'集中する時間',time:'09:00',endTime:'10:00',color:'sage'},rest:{title:'ひと息つく時間',time:'15:00',endTime:'15:30',color:'gold'}};
 function eventEditor(event,defaults={}){
  const e=event||{date:calendarDay,time:'15:00',endTime:'16:00',color:calFilter==='all'?'rose':calFilter,...defaults};
  A.form(event?'予定を編集':'予定をつくる',`<div class="cal-editor-lead">${A.icon('calendar')}<span>一日を、あなたらしく。</span></div>${event?'':`<div class="cal-templates" role="group" aria-label="予定テンプレート">${[['meeting','打ち合わせ'],['focus','集中'],['rest','ひと息']].map(([id,label])=>calButton('calTemplate',label,id)).join('')}</div>`}`+
   field('タイトル','title',e.title||'','text','required maxlength="80" placeholder="何をする？"')+field('日付','date',e.date,'date','required min="0100-01-01" max="9998-12-31"')+
   `<label class="cal-all-day"><input type="checkbox" name="allDay" ${e.allDay?'checked':''}><span>終日</span><small>時間を指定しない予定</small></label><div id="cal-time-fields"><div class="cal-time-fields">${field('開始','time',e.time||'15:00','time','required')}${field('終了','endTime',e.endTime||'','time')}</div><div class="cal-durations" role="group" aria-label="予定の長さ">${[15,30,60,90,120].map(n=>calButton('calDuration',`${n}分`,String(n))).join('')}</div></div><p class="cal-editor-hint" id="cal-time-hint"></p>`+
   field('場所','place',e.place||'','text','maxlength="120" placeholder="場所・オンラインなど"')+select('色','color',calColors,calColor(e))+
   `<label class="form-label" for="cal-event-notes">メモ</label><textarea class="text-input" id="cal-event-notes" name="notes" rows="3" maxlength="2000" placeholder="持ちもの、確認したいこと…">${esc(e.notes||'')}</textarea>`+
   (event?(e.series?'<p class="cal-editor-hint">繰り返しのうち、この予定だけを編集します。</p>':''):`<details class="cal-repeat"><summary>繰り返し</summary>${select('頻度','repeat',[['none','なし'],['daily','毎日'],['weekdays','平日（月〜金）'],['weekly','毎週'],['monthly','毎月']],'none')}${field('作成する回数','count',4,'number','min="1" max="52" step="1" required')}<p>最大52件を実際の予定として作成。月末日は各月の末日に調整します。平日は祝日を除外しません。</p></details>`)+
   `<p class="cal-editor-warning" id="cal-conflicts" role="status"></p><p class="cal-editor-warning" id="cal-save-error" role="alert" hidden></p>`+
   (event?`<div class="cal-editor-actions">${calButton('pdCalendarDuplicate',A.icon('layers')+'複製',event.id)}${calButton('calendarDelete',A.icon('trash')+'削除',event.id)}${event.series?calButton('pdCalendarDeleteSeries','繰り返しをまとめて削除',event.series):''}</div>`:''),v=>{
    const fail=message=>{const el=$('#cal-save-error');el.hidden=false;el.textContent=message;return false;};
    if(!v.title.trim()||!calValid(v.date))return fail('タイトルと有効な日付を入力してください。');
    const allDay=v.allDay==='on',timePattern=/^(?:[01]\d|2[0-3]):[0-5]\d$/;
    if(!allDay&&(!timePattern.test(v.time)||v.endTime&&!timePattern.test(v.endTime)))return fail('開始・終了時刻を確認してください。');
    const base={...event,id:event?.id||A.id(),title:v.title.trim(),date:v.date,time:allDay?'':v.time,endTime:allDay?'':v.endTime,allDay,place:v.place.trim(),notes:v.notes.trim(),color:Object.hasOwn(eventColors,v.color)?v.color:'rose'};
    let rows=A.eventModel.get();
    if(event){if(!rows.some(x=>x.id===event.id))return fail('この予定は削除されています。閉じて一覧をご確認ください。');rows=rows.map(x=>x.id===event.id?base:x);}
    else{
     const repeat=v.repeat,count=repeat==='none'?1:Number(v.count);
     if(!['none','daily','weekdays','weekly','monthly'].includes(repeat)||!Number.isInteger(count)||count<1||count>52)return fail('繰り返し回数は1〜52で指定してください。');
     const added=[],series=count>1?A.id():null,start=new Date(v.date+'T12:00:00');let weekdayKey=v.date;
     for(let i=0;i<count;i++){
      const d=new Date(start);let key;
      if(repeat==='monthly'){d.setDate(1);d.setMonth(start.getMonth()+i);d.setDate(Math.min(start.getDate(),new Date(d.getFullYear(),d.getMonth()+1,0).getDate()));key=calKey(d);}
      else if(repeat==='weekdays'){while([0,6].includes(new Date(weekdayKey+'T12:00:00').getDay()))weekdayKey=calShift(weekdayKey,1);key=weekdayKey;weekdayKey=calShift(key,1);}
      else key=calShift(v.date,i*(repeat==='weekly'?7:1));
      if(!calValid(key))return fail('作成する日付が対応範囲を超えています。');
      added.push({...base,id:i?A.id():base.id,date:key,series});
     }
     rows=[...rows,...added];base.date=added[0].date;
    }
    if(!A.eventModel.replace(rows))return fail('未保存です。入力はこの画面に残っています。容量を確保して再度保存してください。');
    calChoose(base.date);calFilter='all';calendar();A.toast(event?'予定を更新しました':'予定を保存しました');
   });
  $('#modal-form').classList.add('cal-editor');
  const form=$('#modal-form');
  const update=()=>{
   const allDay=form.elements.allDay.checked;$('#cal-time-fields').hidden=allDay;
   form.elements.time.disabled=allDay;form.elements.endTime.disabled=allDay;
   const candidate={date:form.elements.date.value,time:form.elements.time.value,endTime:form.elements.endTime.value,allDay},r=calRange(candidate);
   $('#cal-time-hint').textContent=allDay?'日付のみで保存・時刻通知なし':candidate.endTime?(r&&calKey(r.end)>candidate.date?'終了は翌日です。':'端末のタイムゾーンで保存'):'終了未指定は開始の1時間後として扱います。';
   const conflicts=!allDay&&r?A.eventModel.get().filter(x=>{if(x.id===event?.id||x.allDay)return false;const t=calRange(x);return t&&r.start<t.end&&t.start<r.end;}):[];
   const repeated=form.elements.repeat&&form.elements.repeat.value!=='none';
   $('#cal-conflicts').textContent=(conflicts.length?`${conflicts.length}件と時間が重複しています。重複したまま保存できます。`:'')+(repeated?' 重複判定は入力した日のみです。':'');
  };
  form.addEventListener('input',update);form.addEventListener('change',update);update();
  form.elements.title.focus({preventScroll:true});
 }
 A.actions.calendarAdd=()=>eventEditor();
 A.actions.pdCalendarDayAdd=el=>{if(calChoose(el.dataset.id)){calendar();eventEditor();}};
 A.actions.calendarEdit=el=>{const e=A.eventModel.get().find(x=>x.id===el.dataset.id);if(e)eventEditor(e);};
 A.actions.calFreeAdd=el=>{const [start,end]=el.dataset.id.split(':').map(Number);if(!Number.isInteger(start)||!Number.isInteger(end)||start<540||end>1080||end-start<30)return;eventEditor(null,{time:calTime(start),endTime:calTime(Math.min(start+60,end))});};
 A.actions.calTemplate=el=>{const t=calTemplates[el.dataset.id],f=$('#modal-form');if(!t||!f)return;for(const [key,value]of Object.entries(t))f.elements[key].value=value;f.elements.allDay.checked=false;f.dispatchEvent(new Event('input'));};
 A.actions.calDuration=el=>{const f=$('#modal-form'),n=Number(el.dataset.id);if(!f||![15,30,60,90,120].includes(n))return;const parts=f.elements.time.value.split(':').map(Number);if(parts.length!==2)return;f.elements.endTime.value=calTime((parts[0]*60+parts[1]+n)%1440);f.dispatchEvent(new Event('input'));};
 A.actions.pdCalendarDuplicate=el=>{const e=A.eventModel.get().find(x=>x.id===el.dataset.id);if(e)eventEditor(null,{...e,title:(e.title+' コピー').slice(0,80)});};
 function calDelete(predicate,title){
  A.confirm(title,'削除後、一覧の「元に戻す」で直前の削除を取り消せます。',()=>{const current=A.eventModel.get(),removed=current.filter(predicate);if(!removed.length)return;if(!A.eventModel.replace(current.filter(e=>!predicate(e)))){A.toast('削除できませんでした。予定は残っています。');return;}calUndo=removed;calendar();});
 }
 A.actions.calendarDelete=el=>calDelete(e=>e.id===el.dataset.id,'この予定を削除？');
 A.actions.pdCalendarDeleteSeries=el=>{if(el.dataset.id)calDelete(e=>e.series===el.dataset.id,'繰り返しをまとめて削除？');};
 A.actions.calUndo=()=>{const current=A.eventModel.get(),restored=calUndo.filter(e=>!current.some(x=>x.id===e.id));if(!A.eventModel.replace([...current,...restored]))return;calUndo=[];calendar();A.toast('予定を復元しました');};
 A.actions.calDismissUndo=()=>{calUndo=[];calendar();};

 // Files: local folders, safe previews, version history and bulk text import.
 let fileCurrent=null,fileFolder='all',fileQuery='',fileKind='all',fileSort='date';
 const fileFolders=()=>[...new Set([...list('fileFolders'),...A.fileModel.get().map(x=>x.folder).filter(Boolean)])];
 const duplicateFileName=name=>{const extension=name.match(/\.[^.]+$/)?.[0]||'',suffix=' コピー'+extension;return name.slice(0,extension?name.length-extension.length:name.length).slice(0,80-suffix.length)+suffix;};
 function files(){
  // Calculate UTF-8 sizes and searchable text once for this list view, not in
  // every sort comparison and every keystroke. Reopening rebuilds from the model.
  const entries=A.fileModel.get().map(file=>({file,bytes:new Blob([file.content]).size,search:(file.name+' '+file.content).normalize('NFKC').toLowerCase(),extension:file.name.split('.').at(-1).toLowerCase()}));
  page('ファイル',`<div class="pd-folder-bar"><select id="pd-file-folder" aria-label="フォルダ"><option value="all">すべて</option><option value="" ${fileFolder===''?'selected':''}>未分類</option>${fileFolders().map(x=>`<option value="${esc(x)}" ${fileFolder===x?'selected':''}>${esc(x)}</option>`).join('')}</select>${button('pdFileFolders','フォルダを管理','files')}</div>${A.search('file-search','名前・内容を検索')}${tabs([['all','すべて'],['txt','TXT'],['md','MD'],['json','JSON'],['csv','CSV']],fileKind,'pdFileKind')}<div class="pd-file-toolbar"><span>${entries.length}件 · ${(entries.reduce((n,x)=>n+x.bytes,0)/1024).toFixed(1)}KB</span><select id="pd-file-sort" aria-label="並べ替え"><option value="date">更新順</option><option value="name">名前順</option><option value="size">サイズ順</option></select></div><div class="files-grid" id="files-grid"></div><button class="secondary-button pd-wide" data-action="fileImport">テキスト読込</button><p class="pd-caption">TXT・MD・JSON・CSV · 100KB/件・20件まで</p>`,button('fileNew','ファイルを作成','plus'));
  const render=()=>{
   const query=fileQuery.normalize('NFKC').toLowerCase();
   $('#files-grid').innerHTML=entries.filter(({file,search,extension})=>(fileFolder==='all'||(file.folder||'')===fileFolder)&&(fileKind==='all'||extension===fileKind)&&search.includes(query))
    .sort((a,b)=>fileSort==='name'?a.file.name.localeCompare(b.file.name,'ja'):fileSort==='size'?b.bytes-a.bytes:b.file.date-a.file.date)
    .map(({file:f,bytes,extension})=>`<button class="file-tile pd-file-tile" data-action="fileOpen" data-id="${esc(f.id)}"><span class="pd-file-extension">${esc(extension.slice(0,5).toUpperCase())}</span>${A.icon('document')}<h3>${esc(f.name)}</h3><small>${(bytes/1024).toFixed(1)}KB${f.folder?' · '+esc(f.folder):''}</small></button>`).join('')||empty('ファイルはありません');
  };
  $('#file-search').value=fileQuery;$('#file-search').oninput=e=>{fileQuery=e.target.value;render();};
  $('#pd-file-folder').onchange=e=>{fileFolder=e.target.value;render();};
  $('#pd-file-sort').value=fileSort;$('#pd-file-sort').onchange=e=>{fileSort=e.target.value;render();};render();
 }
 function openFile(id){const f=A.fileModel.get().find(x=>x.id===id);if(!f)return;fileCurrent=id;page('ファイル',`<div class="pd-file-heading"><span>${esc(f.name.split('.').at(-1).toUpperCase())}</span><h1>${esc(f.name)}</h1><small>${new Date(f.date).toLocaleString('ja-JP')} · ${new Blob([f.content]).size.toLocaleString()} bytes</small></div><pre class="file-preview">${esc(f.content)}</pre><div class="pd-file-actions"><button data-action="fileEdit">${A.icon('edit')}編集</button><button data-action="fileDownload">${A.icon('download')}保存</button><button data-action="pdFileDuplicate">${A.icon('layers')}複製</button></div>${f.name.toLowerCase().endsWith('.json')?'<button class="pd-text-button pd-wide" data-action="pdFileFormat">JSONを整形</button>':''}<button class="pd-text-button pd-wide" data-action="pdFileVersions">変更履歴</button>`,button('fileDelete','ファイルを削除','trash'),'filesHome');}
 // Keep the bounded history unchanged if the corresponding file write fails.
 function replaceFileWithHistory(rows,previous){
  if(!previous)return A.fileModel.replace(rows);
  const history=list('fileVersions');
  return A.fileModel.replace(rows,{fileVersions:[{id:A.id(),fileId:previous.id,name:previous.name,content:previous.content,date:previous.date},...history].slice(0,30)});
 }
 function fileEditor(id){const f=A.fileModel.get().find(x=>x.id===id);A.form(f?'ファイルを編集':'ファイルを作成',field('ファイル名','name',f?.name||'新しいファイル.txt','text','required maxlength="80"')+select('フォルダ','folder',[['','未分類'],...fileFolders().map(x=>[x,x])],f?.folder||(fileFolder==='all'?'':fileFolder))+`<label class="form-label" for="pd-file-content">内容</label><textarea class="text-input pd-file-editor" id="pd-file-content" name="content" rows="12" maxlength="100000">${esc(f?.content||'')}</textarea>`,v=>{if(!v.name.trim()||!/\.(txt|md|json|csv)$/i.test(v.name.trim())){A.toast('TXT・MD・JSON・CSVの名前にしてください');return false;}if(new Blob([v.content]).size>100*1024){A.toast('100KB以下にしてください');return false;}const next={...f,...v,name:v.name.trim(),id:f?.id||A.id(),date:Date.now()},rows=f?A.fileModel.get().map(x=>x.id===f.id?next:x):[next,...A.fileModel.get()];if(!replaceFileWithHistory(rows,f&&(f.content!==next.content||f.name!==next.name)?f:null))return false;openFile(next.id);});}
 A.apps.files.render=files;A.actions.filesHome=files;A.actions.fileOpen=el=>openFile(el.dataset.id);A.actions.fileNew=()=>fileEditor();A.actions.fileEdit=()=>fileEditor(fileCurrent);A.currentTextFile=()=>$('.file-preview')?A.fileModel.get().find(x=>x.id===fileCurrent):null;
 A.actions.fileDownload=()=>{const f=A.fileModel.get().find(x=>x.id===fileCurrent);if(f)download(f.name,f.content);};A.actions.fileDelete=()=>A.confirm('ファイルを削除？','このファイルと変更履歴を削除します。',()=>{if(A.fileModel.replace(A.fileModel.get().filter(x=>x.id!==fileCurrent),{fileVersions:list('fileVersions').filter(x=>x.fileId!==fileCurrent)}))files();});
 A.actions.pdFileKind=el=>{fileKind=el.dataset.id;files();};A.actions.pdFileDuplicate=()=>{const f=A.fileModel.get().find(x=>x.id===fileCurrent);if(f){const copy={...f,id:A.id(),name:duplicateFileName(f.name),date:Date.now()};if(A.fileModel.replace([copy,...A.fileModel.get()]))openFile(copy.id);}};
 A.actions.pdFileFormat=()=>{const f=A.fileModel.get().find(x=>x.id===fileCurrent);if(!f)return;try{const content=JSON.stringify(JSON.parse(f.content),null,2);fileEditor(f.id);$('#pd-file-content').value=content;}catch{A.toast('JSONの形式を確認');}};
 A.actions.pdFileFolders=()=>A.overlay(`${A.overlayTitle('フォルダ')}<div class="pd-menu">${fileFolders().map(x=>`<div class="pd-folder-row"><span>${esc(x)}</span>${button('pdFileFolderDelete','フォルダを削除','trash',x)}</div>`).join('')}<button data-action="pdFileFolderNew">＋ フォルダを作成</button></div>`);A.actions.pdFileFolderNew=()=>A.form('フォルダを作成',field('名前','name','','text','required maxlength="40"'),v=>{const name=v.name.trim();if(!name||name==='all')return false;if(!A.save('fileFolders',[...new Set([...fileFolders(),name])]))return false;fileFolder=name;files();});A.actions.pdFileFolderDelete=el=>A.confirm('フォルダを削除？','ファイルは未分類に移動します。',()=>{const name=el.dataset.id;if(!A.fileModel.replace(A.fileModel.get().map(x=>x.folder===name?{...x,folder:''}:x),{fileFolders:fileFolders().filter(x=>x!==name)}))return;fileFolder='all';files();});
 A.actions.pdFileVersions=()=>A.overlay(`${A.overlayTitle('変更履歴')}<div class="pd-menu">${list('fileVersions').filter(x=>x.fileId===fileCurrent).map(v=>`<button data-action="pdFileRestore" data-id="${v.id}"><span>${new Date(v.date).toLocaleString('ja-JP')}<small>${esc(v.name)}</small></span>${A.icon('refresh')}</button>`).join('')||'<p>履歴はありません</p>'}</div>`);
 A.actions.pdFileRestore=el=>{const v=list('fileVersions').find(x=>x.id===el.dataset.id),f=A.fileModel.get().find(x=>x.id===fileCurrent);if(!v||!f||v.fileId!==f.id)return;A.confirm('この内容に戻す？','名前と内容を復元します。現在の状態も履歴に残します。',()=>{if(replaceFileWithHistory(A.fileModel.get().map(x=>x.id===f.id?{...x,name:v.name,content:v.content,date:Date.now()}:x),f))openFile(f.id);});};
 A.actions.fileImport=()=>{
  const input=document.createElement('input');input.type='file';input.multiple=true;input.accept='.txt,.md,.json,.csv';const folder=fileFolder==='all'?'':fileFolder;
  input.onchange=async()=>{
   const all=[...input.files],selected=all.slice(0,20),added=[];let rejected=0;
   for(const f of selected){
    if(f.size>100*1024||f.name.length>80||!/\.(txt|md|json|csv)$/i.test(f.name)){rejected++;continue;}
    try{const content=await f.text();if(new Blob([content]).size>100*1024){rejected++;continue;}added.push({id:A.id(),name:f.name,content,folder,date:Date.now()});}catch{rejected++;}
   }
   if(added.length&&!A.fileModel.replace([...added,...A.fileModel.get()]))return;
   if(A.current==='files')files();
   const skipped=all.length-selected.length;
   A.toast(added.length+'件を読み込みました'+(rejected?' · '+rejected+'件は形式・容量・名前を確認':'')+(skipped?' · 上限20件のため'+skipped+'件は未読込':''));
  };input.click();
 };

 // An explicit local export complements per-app downloads without external uploads.
 const settings=A.apps.settings.render;
 const enhancedSettings=()=>{if(A.renderSettingsHub)return A.renderSettingsHub();settings();$('.profile-card')?.insertAdjacentHTML('afterend',`<div class="group-card">${A.row('download','データを書き出す','','pdDataExport','','#809cae')}${A.row('files','保存容量','','pdStorage','','#a38eae')}</div>`);};
 A.apps.settings.render=enhancedSettings;A.actions.settingsHome=enhancedSettings;
 A.actions.pdDataExport=()=>{const data={};for(const key of Object.keys(localStorage).filter(k=>k.startsWith('aura.')))try{data[key.slice(5)]=JSON.parse(localStorage.getItem(key));}catch{data[key.slice(5)]=localStorage.getItem(key);}download('aura-data-'+day()+'.json',JSON.stringify({app:'aura',version:document.documentElement.dataset.auraVersion,exportedAt:new Date().toISOString(),excluded:['Voice Studio audio and metadata (IndexedDB); export recordings individually'],data},null,2),'application/json');A.toast('JSONを書き出しました。録音は含まれません。ボイスメモから個別に保存してください。');};
 A.actions.pdStorage=()=>{const groups={};for(const key of Object.keys(localStorage).filter(k=>k.startsWith('aura.'))){const name=key.slice(5),label=/photo/i.test(name)?'写真':/note/i.test(name)?'メモ':/file/i.test(name)?'ファイル':/sketch/i.test(name)?'スケッチ':/journal/i.test(name)?'日記':/expense/i.test(name)?'家計簿':/reading/i.test(name)?'読書':/focus/i.test(name)?'集中':/event|calendar/i.test(name)?'カレンダー':/shopping/i.test(name)?'買い物':/weather/i.test(name)?'天気':/map/i.test(name)?'地図':/habit/i.test(name)?'習慣':/contact/i.test(name)?'連絡先':/reminder/i.test(name)?'リマインダー':/conversion/i.test(name)?'単位換算':/dailyIntention/i.test(name)?'今日':/2048|snake|memory|blocks|mines|reversi|breaker|sudoku|arcade/i.test(name)?'ゲーム':'その他';groups[label]=(groups[label]||0)+new Blob([localStorage.getItem(key)]).size;}const sizes=Object.entries(groups).map(([label,bytes])=>({label,bytes})).sort((a,b)=>b.bytes-a.bytes),sum=sizes.reduce((n,x)=>n+x.bytes,0);page('保存容量',`<div class="pd-storage-total"><strong>${(sum/1024).toFixed(1)}<small>KB</small></strong><span>localStorageのauraデータ（録音を除く）</span></div><div class="pd-storage-list">${sizes.map(x=>`<div><span>${esc(x.label)}</span><strong>${(x.bytes/1024).toFixed(1)}KB</strong><i style="width:${Math.max(1,x.bytes/(sum||1)*100)}%"></i></div>`).join('')}</div><button class="secondary-button pd-wide" data-action="pdDataExport">データを書き出す</button><p class="pd-caption">録音は別の保存領域（IndexedDB）を使用し、この容量・JSONには含まれません。</p><button class="secondary-button pd-wide" data-app="recorder">録音の容量・書き出しを確認</button>`,'','settingsHome');};
 const settingToggle=A.actions.settingToggle;A.actions.settingToggle=el=>{settingToggle(el);if(!$('#settings-brightness'))enhancedSettings();};
 const priorSearch=A.searchAdditional;
 A.searchAdditional=q=>(priorSearch?.(q)||'')+[['files','ファイル',A.fileModel.get().filter(x=>(x.name+' '+x.content).toLowerCase().includes(q)).slice(0,4),'pdSearchFile'],['calendar','予定',A.eventModel.get().filter(x=>(x.title+' '+x.place).toLowerCase().includes(q)).slice(0,4),'pdSearchEvent']].map(([app,title,rows,action])=>rows.length?`<p class="spotlight-label">${title}</p><div class="search-content-group">${rows.map(x=>`<button data-action="${action}" data-id="${esc(x.id)}">${A.icon(app)}<span><strong>${esc(x.name||x.title)}</strong><small>${esc(x.date?String(x.date):'')}</small></span>${A.icon('arrow')}</button>`).join('')}</div>`:'').join('');
 A.actions.pdSearchFile=el=>{A.open('files');openFile(el.dataset.id);};A.actions.pdSearchEvent=el=>{A.open('calendar');A.actions.calendarEdit(el);};
})();

// Settings extensions stay local. Developer tools are diagnostics, not OS privileges.
(() => {
  const A = window.Aura, $ = A.$, esc = A.escape;
  const defaults = {textSize:'standard', boldText:false, highContrast:false, reduceTransparency:false,
    hideLabels:false, hideWidgets:false, clock12:false, clockSeconds:false,
    lineSpacing:'standard', letterSpacing:'standard', underlineLinks:false, largeControls:false,
    homeColumns:'4', hideBadges:false, hideSearch:false, dateStyle:'long',
    hapticDuration:'short', keyboardShortcuts:true,
    developerMode:false, devFps:false, devBounds:false, devTouches:false, devLog:false};
  const choices = {
    textSize:[['standard','標準'],['large','大きい'],['largest','さらに大きい']],
    lineSpacing:[['standard','標準'],['relaxed','ゆったり'],['wide','広い']],
    letterSpacing:[['standard','標準'],['wide','広い']],
    homeColumns:[['4','4列'],['3','3列']],
    dateStyle:[['long','月日・曜日'],['short','短い月日'],['year','年・月日・曜日']],
    hapticDuration:[['short','短い · 7ms'],['medium','標準 · 14ms'],['long','長い · 25ms']]
  };
  const devKeys = ['devFps','devBounds','devTouches','devLog'];
  let section = 'home', query = '', apiOffline = false, logs = [], logEpoch = 0;
  let raf = 0, frames = 0, frameStart = 0;
  const enabled = () => A.settings.developerMode === true;
  const group = (title, html) => `<h2 class="st-heading">${title}</h2><div class="group-card">${html}</div>`;
  const link = (action, title, detail, icon='settings') => A.row(icon,title,detail,action,'','#8f819f');
  const toggle = (key, title, detail='') => `<button class="st-toggle" data-action="stToggle" data-key="${key}" aria-pressed="${!!A.settings[key]}"><span><strong>${title}</strong>${detail?`<small>${detail}</small>`:''}</span><i class="preview-switch ${A.settings[key]?'on':''}" aria-hidden="true"></i></button>`;
  const select = (key, title, options, value) => `<label class="st-select"><span>${title}</span><select data-st-select="${key}">${options.map(([v,t])=>`<option value="${v}" ${String(value)===v?'selected':''}>${t}</option>`).join('')}</select></label>`;
  const preference = (key,title) => select(key,title,choices[key],A.settings[key]);
  // Local vector materials are decorative; existing controls own all interactions.
  let artSerial = 0;
  function materialArt(kind='dial') {
    const id='st-material-'+(++artSerial), paint=name=>`url(#${id}-${name})`;
    const ticks=Array.from({length:48},(_,i)=>`<path d="M0 -65v${i%4===0?7:3}" transform="rotate(${i*7.5})"/>`).join('');
    const screws=[[28,26],[212,26],[28,174],[212,174]].map(([x,y])=>`<g transform="translate(${x} ${y})"><circle r="3" fill="${paint('metal')}" stroke="#7c898e" stroke-width=".6"/><path d="M-1.5 1.5l3 -3" stroke="#5c6b73" stroke-width=".7"/></g>`).join('');
    const layers=`<g transform="translate(120 95) rotate(-16) skewX(12) scale(1 .72)"><rect x="-64" y="-38" width="128" height="110" rx="19" fill="${paint('edge')}"/><rect x="-64" y="-52" width="128" height="110" rx="19" fill="${paint('glass')}" stroke="#e9f9f8"/><rect x="-56" y="-64" width="112" height="98" rx="16" fill="${paint('glass')}" stroke="#e9f9f8"/><rect x="-48" y="-77" width="96" height="84" rx="13" fill="${paint('metal')}" stroke="#fff"/><path d="M-31 -54h43M-31 -43h60M-31 -32h31" stroke="#6c8684" stroke-width="3" stroke-linecap="round"/><rect x="-30" y="-18" width="28" height="12" rx="6" fill="#537d71"/><circle cx="-8" cy="-12" r="4" fill="#eff9f1"/></g>`;
    const chip=`<g transform="translate(120 99) rotate(-14)"><path d="M-90 -48h32M-90 -22h32M-90 4h32M-90 30h32M58 -48h30M58 -22h30M58 4h30M58 30h30M-34 -86v28M0 -86v28M34 -86v28M-34 58v28M0 58v28M34 58v28" stroke="#c0a878" stroke-width="4"/><rect x="-65" y="-65" width="130" height="130" rx="20" fill="${paint('edge')}"/><rect x="-60" y="-70" width="120" height="120" rx="17" fill="${paint('metal')}" stroke="#f5faf6"/><rect x="-43" y="-53" width="86" height="86" rx="12" fill="${paint('glass')}" stroke="#f0fdf5"/><path d="M-18 -23l-12 13 12 13M18 -23l12 13 -12 13M6 -30L-6 10" stroke="#eafff5" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" fill="none"/><circle cx="34" cy="40" r="3" fill="#addab8"/></g>`;
    const dial=`<g transform="translate(120 97) scale(1 .86)"><ellipse cy="16" rx="76" ry="76" fill="${paint('edge')}"/><circle r="77" fill="${paint('metal')}" stroke="#e9eeeb"/><g stroke="#5b7073" stroke-width="1.1">${ticks}</g><circle cy="3" r="55" fill="#42585b"/><circle r="55" fill="${paint('metal')}" stroke="#fbfff9"/><circle r="48" fill="none" stroke="#738987" stroke-width=".7"/><circle r="44" fill="none" stroke="#f9fff8" stroke-width=".7"/><circle r="39" fill="${paint('face')}"/><path d="M0 -39v13" stroke="#3b7668" stroke-width="3" stroke-linecap="round"/><circle r="8" fill="none" stroke="#6b8680"/><circle r="2" fill="#759c8b"/></g><path d="M78 168h54" stroke="#8b9f98" stroke-width="2" stroke-linecap="round"/><path d="M78 168h32" stroke="#e2f4e7" stroke-width="2" stroke-linecap="round"/><circle cx="159" cy="168" r="3" fill="#b7e0be"/>`;
    return `<svg class="st-material-art" viewBox="0 0 240 210" aria-hidden="true" focusable="false"><defs><linearGradient id="${id}-metal" x1="0" y1="0" x2="1" y2="1"><stop stop-color="#fffdf0"/><stop offset=".25" stop-color="#c0ccc5"/><stop offset=".48" stop-color="#f7faf0"/><stop offset=".72" stop-color="#98ada8"/><stop offset="1" stop-color="#d4ded3"/></linearGradient><linearGradient id="${id}-edge" x1="0" y1="0" x2="0" y2="1"><stop stop-color="#81958b"/><stop offset="1" stop-color="#344b48"/></linearGradient><linearGradient id="${id}-glass" x1="0" y1="0" x2="1" y2="1"><stop stop-color="#c9e7dc" stop-opacity=".9"/><stop offset="1" stop-color="#527f74" stop-opacity=".9"/></linearGradient><radialGradient id="${id}-face" cx=".3" cy=".2" r=".9"><stop stop-color="#fafcef"/><stop offset=".65" stop-color="#c9d6ca"/><stop offset="1" stop-color="#a6b9ae"/></radialGradient></defs><ellipse cx="124" cy="183" rx="91" ry="14" fill="#16392f" opacity=".12"/><g class="st-art-platform"><rect x="15" y="19" width="210" height="174" rx="27" fill="${paint('edge')}"/><rect x="15" y="12" width="210" height="174" rx="27" fill="${paint('glass')}" stroke="#e4f7eb" stroke-width="1.2"/><path d="M32 22h170M24 46v100" stroke="#e6f8ec" opacity=".45"/>${screws}</g>${kind==='layers'?layers:kind==='chip'?chip:dial}</svg>`;
  }
  const sectionArt = {
    '文字と見やすさ':['READABILITY','文字を、心地よく。','layers'],
    'ホームと時計':['HOME & CLOCK','いつもの景色を。','layers'],
    'サウンドと集中':['SOUND & FOCUS','自分のペースで。','dial'],
    '通信と検索':['CONNECTION','つながりを選ぶ。','chip'],
    '開発者設定':['DEVELOPER','細部を、確かめる。','chip'],
    '画面表示と明るさ':['DISPLAY','光を、自分好みに。','dial'],
    '光と奥行き':['LIGHT & DEPTH','重なりに、表情を。','layers']
  };
  const sectionBanner = title => {
    const art=sectionArt[title];
    return art?`<div class="st-section-banner"><div><span class="st-kicker">${esc(art[0])}</span><p>${art[1]}</p></div>${materialArt(art[2])}</div>`:'';
  };
  const page = (title, html) => {
    A.statusTheme(false);
    A.view((title==='設定'?A.nav(title):A.nav(title,'','settingsHome','設定'))+`<div class="app-content st-settings" data-st-section="${section}">${sectionBanner(title)}${html}</div>`);
  };
  // Preserve the legacy brightness and appearance handlers, including their bindings.
  for(const action of ['settingsDisplay','settingsAppearance']) {
    const original=A.actions[action];
    A.actions[action]=(...args)=>{
      original(...args);
      const content=$('#app-screen .app-content');
      if(!content)return;
      content.classList.add('st-settings');
      content.dataset.stSection=action==='settingsDisplay'?'display':'appearance';
      content.insertAdjacentHTML('afterbegin',sectionBanner(action==='settingsDisplay'?'画面表示と明るさ':'光と奥行き'));
    };
  }
  function save(patch) {
    const next = {...A.settings,...patch};
    if (!A.save('settings',next)) return false;
    A.settings = next;
    A.applySettings();
    A.updateClock();
    return true;
  }
  const catalog = [
    ['表示と操作',[
      ['settingsDisplay','画面表示と明るさ','明るさ・ダークモード','sun'],
      ['stAccessibility','文字と見やすさ','文字サイズ・太字・コントラスト・透明度・行間・文字間隔・リンクの下線・タップ領域・キーボード','eye'],
      ['stHome','ホームと時計','アプリ名・ウィジェット・12時間表示・秒表示・列数・バッジ・検索ボタン・日付','clock'],
      ['personalize','壁紙とアイコン','壁紙・アイコンスタイル・時計スタイル・配置','photos'],
      ['settingsAppearance','光と動き','影の深さ・動きを抑える・FHD MOVE APP','layers']]],
    ['通知とサウンド',[
      ['noticeSettings','通知設定','バナー・予定通知・アプリ別・ロック画面の本文','messages'],
      ['stSound','サウンドと集中','音量・触覚フィードバック・振動の長さ・集中モード','volume'],
      ['showNotifications','通知センター','通知の履歴・既読・再通知','messages']]],
    ['接続とデータ',[
      ['stConnection','通信と検索','Wi-Fi・Bluetooth・機内モードのデモ / 検索エンジン','globe'],
      ['connectionCenter','接続とプライバシー','実連携の対応状況・保存した位置情報の消去','lock'],
      ['pdStorage','保存容量','アプリ別のローカル保存量','files'],
      ['pdDataExport','データを書き出す','auraデータのJSON保存（個人データを含む）','download']]],
    ['システム',[
      ['stDeveloper','開発者設定','FPS・タップ位置・レイアウト枠・API通信診断','settings'],
      ['fullscreen','全画面で使う','対応ブラウザのみ','grid'],
      ['gestureGuide','操作ガイド','ジェスチャーとキーボード','info'],
      ['settingsAbout','このデバイスについて','バージョンとアプリ情報','user'],
      ['stReset','追加設定をリセット','このバージョンで追加した表示設定・開発者設定のみ','settings'],
      ['settingsReset','すべてのデータを削除','メモ・写真なども削除 / 復元不可','trash']]]
  ];
  A.renderSettingsHub = () => {
    section = 'home';
    const depth={soft:'やわらか',balanced:'バランス',deep:'くっきり'}[A.settings.depth]||'バランス';
    const shortcut=(action,icon,title,value)=>`<button data-action="${action}" class="st-quick"><span class="st-quick-icon" aria-hidden="true">${A.icon(icon)}</span><span>${title}<strong>${esc(value)}</strong></span><span class="st-quick-arrow" aria-hidden="true">↗</span></button>`;
    page('設定', `<section class="st-studio-hero quiet-settings-hero" aria-label="設定の概要"><div class="st-hero-copy"><h1>aura</h1></div>${materialArt()}<div class="st-hero-bottom"><span><i aria-hidden="true"></i>ブラウザ内の設定</span><span>auraOS ${esc(document.documentElement.dataset.auraVersion)}</span></div></section><div class="st-quick-grid" aria-label="現在の設定とショートカット">${shortcut('settingsDisplay','sun','画面',A.settings.dark?'ダーク':'ライト')}${shortcut('stSound','volume','音源の音量',String(A.settings.volume)+'%')}${shortcut('settingsAppearance','layers','影の深さ',depth)}</div><button class="profile-card st-profile" data-action="settingsProfile"><span class="avatar" aria-hidden="true">a.</span><span><strong>${esc(A.load('profileName','あなたのaura'))}</strong></span><span class="chevron" aria-hidden="true">›</span></button>${A.search('st-search','設定を検索')}<div id="st-results"></div><p class="st-footnote st-local-note">ブラウザ内のみ・実端末は変更なし</p>`);
    $('#st-search').value = query;
    $('#st-search').oninput = e => {query=e.target.value.slice(0,100);renderResults();};
    renderResults();
  };
  function renderResults() {
    const q = query.normalize('NFKC').trim().toLowerCase();
    const results = catalog.map(([name,items])=>[name,items.filter(item=>(name+' '+item.join(' ')).normalize('NFKC').toLowerCase().includes(q))]).filter(([,items])=>items.length);
    // Keep all search keywords; only essential warnings need visible secondary copy.
    const warnings = {pdDataExport:'JSON（個人データを含む）',settingsReset:'復元不可'};
    $('#st-results').innerHTML = results.map(([name,items])=>{
      const index=catalog.findIndex(([title])=>title===name);
      return `<details class="st-category" data-st-category="${index}" ${q?'open':''}><summary>${esc(name)}</summary><div class="group-card">${items.map(([action,title,,icon])=>link(action,title,warnings[action]||'',icon)).join('')}</div></details>`;
    }).join('') || '<p class="st-empty" role="status">一致する設定はありません</p>';
  }
  A.actions.stAccessibility = () => {
    section = 'accessibility';
    page('文字と見やすさ',
      group('読みやすさ',preference('textSize','本文の文字サイズ')+toggle('boldText','本文を太字に')+toggle('highContrast','文字のコントラスト')+toggle('reduceTransparency','透明度を下げる'))+
      group('文字の間隔',preference('lineSpacing','本文の行間')+preference('letterSpacing','本文の文字間隔')+toggle('underlineLinks','リンクに下線'))+
      '<div class="st-preview"><strong>読みやすさのプレビュー</strong><p>文字の間隔を変えて、<br>自分に合う読み心地に。</p><small>共通の本文・入力欄・リストが対象。ゲーム盤・アイコン・アプリ独自の表示は対象外。</small></div>'+
      group('操作',toggle('largeControls','タップ領域を広げる','共通の入力欄・ナビ・ホーム操作を48px以上に')+toggle('keyboardShortcuts','ホームのキーボード操作','Hでホーム / Alt+Tabでアプリ切替。Escape・アプリ内操作は対象外。'))+
      link('settingsAppearance','動きを抑える','','layers'));
  };
  A.actions.stHome = () => {
    section = 'homeOptions';
    page('ホームと時計',
      group('ホーム画面',preference('homeColumns','アプリの列数')+toggle('hideLabels','アプリ名を隠す')+toggle('hideWidgets','ウィジェットを隠す')+toggle('hideBadges','アイコンのバッジを隠す','未読データは削除しません')+toggle('hideSearch','検索ボタンを隠す','ホーム下部のみ'))+
      group('時計表示',toggle('clock12','12時間表示','上部の時計とロック画面')+toggle('clockSeconds','秒を表示','上部の時計')+preference('dateStyle','日付の表示'))+
      '<p class="st-footnote">列数を変えても並び順・ドックは維持。日付表示はホームとロック画面に反映。日時・タイムゾーンは端末の設定です。</p>');
  };
  A.actions.stSound = () => {
    section = 'sound';
    page('サウンドと集中',group('音量',`<label class="st-range">オリジナル音源 <output id="st-volume-value">${A.settings.volume}%</output><input id="st-volume" type="range" min="0" max="100" value="${A.settings.volume}" aria-label="オリジナル音源の音量"></label>`)+group('操作と通知',toggle('sound','触覚フィードバック','振動対応端末のみ')+preference('hapticDuration','振動の長さ')+toggle('focus','集中モード','バナーを抑制。履歴には保存'))+'<p class="st-footnote">端末全体や外部試聴の音量は変更しません。</p>');
    $('#st-volume').oninput = e => {
      if(save({volume:Number(e.target.value)})){A.music?.setVolume();$('#st-volume-value').textContent=e.target.value+'%';}
      else e.target.value=A.settings.volume;
    };
  };
  A.actions.stConnection = () => {
    section = 'connection';
    page('通信と検索','<p class="st-footnote">実際のネット接続は変わりません。</p>'+group('通信のデモ',toggle('airplane','機内モード')+toggle('wifi','Wi-Fi')+toggle('bluetooth','Bluetooth')+toggle('cellular','モバイル通信'))+group('ブラウザ',select('webEngine','検索エンジン',[['wiki','Wikipedia'],['google','Google'],['bing','Bing'],['duck','DuckDuckGo']],A.load('webEngine','wiki')))+'<p class="st-footnote">Wikipedia以外の検索は別タブで開きます。</p>');
  };
  const renders = {home:A.renderSettingsHub,accessibility:A.actions.stAccessibility,homeOptions:A.actions.stHome,sound:A.actions.stSound,connection:A.actions.stConnection,developer:()=>A.actions.stDeveloper()};
  A.actions.stToggle = el => {
    const key=el.dataset.key;
    if(!Object.hasOwn(defaults,key)&&!['sound','focus','airplane','wifi','bluetooth','cellular'].includes(key))return;
    if(Object.hasOwn(choices,key)||key==='developerMode'||(devKeys.includes(key)&&!enabled()))return;
    const patch = {[key]:!A.settings[key]};
    if(key==='airplane'&&patch.airplane)patch.cellular=false;
    if(key==='cellular'&&patch.cellular)patch.airplane=false;
    const scroll=$('.st-settings')?.scrollTop||0;
    if(save(patch)){
      renders[section]?.();
      $(`[data-action="stToggle"][data-key="${key}"]`)?.focus({preventScroll:true});
      if($('.st-settings'))$('.st-settings').scrollTop=scroll;
    }
  };
  document.addEventListener('change', e => {
    const key=e.target.dataset.stSelect, value=e.target.value;
    if(Object.hasOwn(choices,key)){
      if(!choices[key].some(([id])=>id===value)||!save({[key]:value}))e.target.value=A.settings[key];
    }
    if(key==='webEngine'&&['wiki','google','bing','duck'].includes(value)){
      if(!A.save('webEngine',value))e.target.value=A.load('webEngine','wiki');
    }
  });
  A.actions.stReset = () => A.confirm('追加設定をリセット？','文字・ホーム・時計・振動の長さ・キーボード・開発者設定を初期化します。メモ・写真・壁紙・通知設定は残ります。',()=>{
    if(save(defaults)){query='';A.actions.settingsHome();A.toast('追加設定をリセットしました');}
  });

  function storageSummary() {
    try {
      const keys=Object.keys(localStorage).filter(k=>k.startsWith('aura.'));
      return {available:true,keys:keys.length,bytes:keys.reduce((n,k)=>n+new Blob([localStorage.getItem(k)||'']).size,0)};
    } catch {return {available:false,keys:0,bytes:0};}
  }
  const capabilities = () => ({secureContext:window.isSecureContext,online:navigator.onLine,
    camera:!!navigator.mediaDevices?.getUserMedia,geolocation:!!navigator.geolocation,
    notifications:'Notification' in window?Notification.permission:'unsupported',
    share:!!navigator.share,clipboard:!!navigator.clipboard,fullscreen:!!document.fullscreenEnabled});
  const report = () => ({app:'aura',version:document.documentElement.dataset.auraVersion,
    generatedAt:new Date().toISOString(),viewport:{width:innerWidth,height:innerHeight,pixelRatio:devicePixelRatio},
    capabilities:capabilities(),storage:storageSummary(),apiOffline,requests:logs.map(row=>({...row}))});
  A.actions.stDeveloper = () => {
    section='developer';
    const c=capabilities(), storage=storageSummary();
    page('開発者設定',`<p class="st-footnote">aura内だけの診断。端末の開発者権限・USBデバッグとは無関係です。</p><div class="group-card"><button class="st-toggle" data-action="stDeveloperToggle" aria-pressed="${enabled()}"><span><strong>開発者モード</strong></span><i class="preview-switch ${enabled()?'on':''}" aria-hidden="true"></i></button></div>`+(enabled()?
      group('画面の診断',toggle('devFps','FPSを表示','概算値')+toggle('devBounds','レイアウト枠を表示')+toggle('devTouches','タップ位置を表示'))+
      group('API通信の診断',toggle('devLog','通信ログを記録','共通JSON APIのみ / 最大30件 / このタブ内')+`<button class="st-toggle" data-action="stOffline" aria-pressed="${apiOffline}"><span><strong>APIオフラインを再現</strong><small>新規JSON APIのみ遮断。画像・地図・外部リンク・進行中通信は対象外。再読み込みで解除。</small></span><i class="preview-switch ${apiOffline?'on':''}" aria-hidden="true"></i></button>`)+
      `<div class="st-api-log"><div class="st-log-head"><h2 class="st-heading">直近の通信</h2><button data-action="stDeveloper">更新</button><button data-action="stClearLogs">消去</button></div><p class="st-footnote">サービス名・結果・所要時間だけ記録。</p>${logs.length?`<ol>${logs.slice().reverse().map(row=>`<li><strong>${esc(row.service)}</strong><span>${esc(row.result)} · ${row.ms} ms</span></li>`).join('')}</ol>`:'<p class="st-empty">記録はありません。</p>'}</div>`+
      group('環境情報',`<dl class="st-diagnostics"><dt>バージョン</dt><dd>${esc(document.documentElement.dataset.auraVersion)}</dd><dt>画面 / DPR</dt><dd>${innerWidth} × ${innerHeight} / ${devicePixelRatio}</dd><dt>HTTPS等の安全な接続</dt><dd>${c.secureContext?'はい':'いいえ'}</dd><dt>ブラウザの接続状態</dt><dd>${c.online?'オンライン':'オフライン'}</dd><dt>カメラ / 位置情報API</dt><dd>${c.camera?'対応':'非対応'} / ${c.geolocation?'対応':'非対応'}</dd><dt>OS通知の権限</dt><dd>${esc(c.notifications)}</dd><dt>共有 / クリップボードAPI</dt><dd>${c.share?'対応':'非対応'} / ${c.clipboard?'対応':'非対応'}</dd><dt>aura保存データ</dt><dd>${storage.available?storage.keys+'項目 / '+(storage.bytes/1024).toFixed(1)+' KB':'読み取り不可'}</dd></dl>`)+
      '<p class="st-footnote">API対応は動作を保証しません。容量は保存値のUTF-8換算、端末の空き容量ではありません。</p>'+group('確認と書き出し',link('stTestNotice','テスト通知','画面内のみ','messages')+link('stExportDiagnostics','診断情報を書き出す','環境・保存量・通信ログのみ','download')):
      '<p class="st-footnote">個人データの自動送信は行いません。</p>'));
  };
  A.actions.stDeveloperToggle = () => {
    const apply = () => {
      if(save({developerMode:!enabled(),...Object.fromEntries(devKeys.map(k=>[k,false]))}))A.actions.stDeveloper();
    };
    if(enabled())apply();else A.confirm('開発者モードを有効にしますか？','画面・通信の診断項目を追加します。各ツールは個別にオンにしてください。診断データの自動送信はありません。',apply);
  };
  A.actions.stOffline = () => {if(enabled()){apiOffline=!apiOffline;syncTools();A.actions.stDeveloper();}};
  A.actions.stClearLogs = () => {if(enabled()){logs=[];logEpoch++;A.actions.stDeveloper();}};
  A.actions.stTestNotice = () => {
    if(!enabled())return;
    const ok=A.notify({app:'settings',title:'開発者テスト通知',body:'通知表示の確認用です。外部送信はありません。',demo:true});
    A.toast(ok?'テスト通知を履歴に追加しました':'通知を追加できませんでした');
  };
  A.actions.stExportDiagnostics = () => {
    if(!enabled())return;
    A.download(new Blob([JSON.stringify(report(),null,2)],{type:'application/json'}),'aura-diagnostics.json');
  };
  const request=A.network.request;
  const services={'api.open-meteo.com':'Open-Meteo','geocoding-api.open-meteo.com':'Open-Meteo Geocoding','ja.wikipedia.org':'Wikipedia','nominatim.openstreetmap.org':'Nominatim','itunes.apple.com':'iTunes','api.frankfurter.dev':'Frankfurter'};
  A.network.request=async function(url,options){
    const started=performance.now(), record=enabled()&&A.settings.devLog, epoch=logEpoch;
    let result='成功';
    try {
      if(enabled()&&apiOffline){result='テスト遮断';throw new Error('開発者設定：APIオフラインの再現中');}
      return await request.call(this,url,options);
    } catch(error){if(result!=='テスト遮断')result=error.name==='AbortError'?'中断':'失敗';throw error;}
    finally {
      if(record&&enabled()&&A.settings.devLog&&epoch===logEpoch){
        let service='その他のAPI';
        try{service=services[new URL(url,location.href).hostname]||service;}catch{/* Never log raw URLs. */}
        logs.push({service,result,ms:Math.max(0,Math.round(performance.now()-started))});logs=logs.slice(-30);
      }
    }
  };
  function stopFps(){cancelAnimationFrame(raf);raf=0;$('#st-fps')?.remove();}
  function tick(now){
    frames++;
    if(now-frameStart>=1000){$('#st-fps').textContent=Math.round(frames*1000/(now-frameStart))+' FPS';frameStart=now;frames=0;}
    raf=requestAnimationFrame(tick);
  }
  function syncTools(){
    const screen=$('#phone-screen'), on=enabled();
    screen.classList.toggle('st-dev-bounds',on&&A.settings.devBounds);
    if(!on){apiOffline=false;$('.st-touch')?.remove();}
    if(!on||!A.settings.devLog){logs=[];logEpoch++;}
    if(on&&A.settings.devFps&&!document.hidden){
      if(!raf){screen.insertAdjacentHTML('beforeend','<output id="st-fps" class="st-fps" aria-label="概算フレームレート">計測中</output>');frames=0;frameStart=performance.now();raf=requestAnimationFrame(tick);}
    }else stopFps();
    let warning=$('#st-offline-warning');
    if(on&&apiOffline){
      if(!warning){screen.insertAdjacentHTML('beforeend','<button id="st-offline-warning" data-action="stStopOffline">APIテスト遮断中 · 解除</button>');}
    }else warning?.remove();
  }
  A.actions.stStopOffline=()=>{apiOffline=false;syncTools();if(section==='developer'&&A.current==='settings'&&$('[data-action="stOffline"]'))A.actions.stDeveloper();};
  document.addEventListener('visibilitychange',syncTools);
  $('#phone-screen').addEventListener('pointerdown',e=>{
    if(!enabled()||!A.settings.devTouches)return;
    $('.st-touch')?.remove();
    const rect=$('#phone-screen').getBoundingClientRect(), dot=document.createElement('i');
    dot.className='st-touch';dot.setAttribute('aria-hidden','true');
    dot.style.left=((e.clientX-rect.left)*$('#phone-screen').clientWidth/rect.width)+'px';
    dot.style.top=((e.clientY-rect.top)*$('#phone-screen').clientHeight/rect.height)+'px';
    $('#phone-screen').append(dot);setTimeout(()=>dot.remove(),550);
  },{passive:true});
  const applySettings=A.applySettings;
  A.applySettings=()=>{
    for(const [key,value] of Object.entries(defaults)){
      if(typeof value==='boolean'&&typeof A.settings[key]!=='boolean')A.settings[key]=value;
    }
    for(const [key,options] of Object.entries(choices)){
      if(!options.some(([id])=>id===A.settings[key]))A.settings[key]=defaults[key];
    }
    applySettings();
    const screen=$('#phone-screen');
    screen.dataset.textSize=A.settings.textSize;
    for(const key of ['boldText','highContrast','reduceTransparency','hideLabels','hideWidgets','clockSeconds','clock12','lineSpacing','letterSpacing','underlineLinks','largeControls','homeColumns','hideBadges','hideSearch'])screen.dataset[key]=String(A.settings[key]);
    syncTools();
  };
  const updateClock=A.updateClock;
  A.updateClock=()=>{
    updateClock();
    const date=new Date(),options={hour:'numeric',minute:'2-digit',hour12:A.settings.clock12};
    $('#status-time').textContent=date.toLocaleTimeString('ja-JP',{...options,...(A.settings.clockSeconds?{second:'2-digit'}:{})});
    $('#lock-time').textContent=date.toLocaleTimeString('ja-JP',options);
    const format=A.settings.dateStyle==='short'?{month:'numeric',day:'numeric'}:
      {month:'long',day:'numeric',weekday:'long',...(A.settings.dateStyle==='year'?{year:'numeric'}:{})};
    for(const id of ['home-date','lock-date'])$('#'+id).textContent=date.toLocaleDateString('ja-JP',format);
  };
  A.applySettings();A.updateClock();
})();
