'use strict';
(() => {
const A=window.Aura,$=A.$,esc=A.escape,icon=A.icon;
// Photo Atelier. Originals retain the existing localStorage schema; no cloud upload.
const samplePhotos=[['lake','静かな湖'],['coffee','午後のコーヒー'],['mountain','山の稜線'],['flower','季節の花'],['sea','波の音'],['forest','木漏れ日'],['city','夜の街'],['desert','砂のかたち'],['interior','穏やかな部屋']].map(([key,title])=>({id:'sample-'+key,url:A.images[key],title,date:0,sample:true}));
const photoArray=key=>{const v=A.load(key,[]);return Array.isArray(v)?v:[];};
let userPhotos=photoArray('photos'),favorites=photoArray('photoFavorites');
let photoFilter='all',currentPhoto=null,photoQuery='',photoSort='new',photoAlbum='',photoLayout='gallery';
let photoSelecting=false,photoSelected=new Set(),photoPlaying=false,photoZoom=1,photoEditor=null,photoImporting=false;
let photoDisposers=[],photoArtSerial=0,photoWorkbench=null,photoPlayDelay=4500;
const photoValid=p=>p&&typeof p.id==='string'&&typeof p.url==='string'&&/^data:image\/(jpeg|jpg|png|webp|gif|avif);base64,/i.test(p.url);
const refreshPhotos=()=>{userPhotos=photoArray('photos');favorites=photoArray('photoFavorites').filter(id=>typeof id==='string');};
const localPhotos=()=>userPhotos.filter(photoValid);
const allPhotos=()=>[...localPhotos().filter(p=>!p.deletedAt),...samplePhotos];
const findPhoto=id=>[...localPhotos(),...samplePhotos].find(p=>p.id===id);
const photoTitle=p=>String(p.title||'無題の写真');
const photoDate=p=>p.sample?'サンプル':new Date(Number(p.date)||0).toLocaleDateString('ja-JP',{year:'numeric',month:'short',day:'numeric'});
const photoAlbums=()=>[...new Set(localPhotos().filter(p=>!p.deletedAt&&p.album).map(p=>String(p.album)))].sort((a,b)=>a.localeCompare(b,'ja'));
const albumPhotos=()=>{
  const list=photoFilter==='trash'?localPhotos().filter(p=>p.deletedAt):allPhotos().filter(p=>photoFilter==='favorites'?favorites.includes(p.id):photoFilter==='mine'?!p.sample:true);
  const q=photoQuery.trim().toLocaleLowerCase();
  return list.filter(p=>(!photoAlbum||p.album===photoAlbum)&&(!q||[photoTitle(p),p.caption||'',p.album||'',p.sample?'サンプル':''].join(' ').toLocaleLowerCase().includes(q))).sort((a,b)=>photoSort==='name'?photoTitle(a).localeCompare(photoTitle(b),'ja'):photoSort==='old'?(a.date||0)-(b.date||0):(b.date||0)-(a.date||0));
};
const photoGlyph=(name)=>{
  const paths={folder:'M3 6h6l2 2h10v12H3ZM3 6V4h6l2 2h8v2',switch:'M12 3v18M9 5 3 19h6ZM15 5l6 14h-6Z',edit:'M4 7h16M4 17h16M8 4v6m8 4v6',refresh:'M20 8V3m0 5h-5M4 16v5m0-5h5M20 8a8 8 0 0 0-14-3M4 16a8 8 0 0 0 14 3'};
  return paths[name]?`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="${paths[name]}"/></svg>`:icon(name);
};
const photoButton=(action,label,glyph,extra='')=>`<button data-action="${action}" aria-label="${label}" title="${label}" ${extra}>${photoGlyph(glyph)}<span>${label}</span></button>`;
function photoArt(){
  const id='pa-'+(++photoArtSerial);
  return `<svg class="pa-art" viewBox="0 0 240 200" fill="none" aria-hidden="true" focusable="false"><defs><linearGradient id="${id}-paper" x2="1" y2="1"><stop stop-color="#fffdf5"/><stop offset="1" stop-color="#cbc4b6"/></linearGradient><linearGradient id="${id}-sky" x2="0" y2="1"><stop stop-color="#88aab1"/><stop offset="1" stop-color="#e2c5a1"/></linearGradient><linearGradient id="${id}-lake" x2="1" y2="1"><stop stop-color="#688e84"/><stop offset="1" stop-color="#183f43"/></linearGradient><radialGradient id="${id}-lens"><stop stop-color="#acc6c6"/><stop offset=".4" stop-color="#375265"/><stop offset=".65" stop-color="#192b36"/><stop offset=".85" stop-color="#697e81"/><stop offset="1" stop-color="#20343e"/></radialGradient></defs><ellipse cx="126" cy="178" rx="89" ry="12" fill="#173730" opacity=".15"/><g class="pa-art-back" transform="rotate(-15 119 98)"><rect x="51" y="28" width="136" height="146" rx="7" fill="#c8a98e" stroke="#fff4d9"/><rect x="59" y="36" width="120" height="104" rx="2" fill="#8eaaa1"/><path d="m59 110 39-53 35 53 21-26 25 31v25H59Z" fill="#526e66"/></g><g class="pa-art-front" transform="rotate(8 130 107)"><rect x="69" y="37" width="133" height="144" rx="6" fill="url(#${id}-paper)" stroke="#fffdf0"/><path d="M78 46h115v102H78Z" fill="url(#${id}-sky)"/><circle cx="165" cy="69" r="14" fill="#fce4b6"/><path d="m78 112 34-44 38 40 20-20 23 34v26H78Z" fill="#647e7d"/><path d="m112 68 15 37-16-9-14 10Z" fill="#d7ded4"/><path d="M78 121c40-26 63 20 115-8v35H78Z" fill="url(#${id}-lake)"/><path d="M91 131h33m19 7h32m-56 5h19" stroke="#e1e4c5" opacity=".6"/><path d="M81 160h42m7 0h12" stroke="#a49b89" stroke-width="2" stroke-linecap="round"/><circle cx="182" cy="163" r="5" stroke="#bdab85"/></g><g class="pa-art-lens"><circle cx="64" cy="141" r="30" fill="#b8c2b9" stroke="#e8e8d4" stroke-width="3"/><circle cx="64" cy="141" r="24" fill="url(#${id}-lens)"/><path d="m64 121 17 10v20l-17 10-17-10v-20Z" stroke="#b7d3cf" opacity=".6"/><path d="m64 121-6 19 23-9m0 20-20-6 3 16m-17-10 14-6-14-14" stroke="#b7d3cf" opacity=".4"/><circle cx="70" cy="132" r="5" fill="#fff" opacity=".32"/></g><g stroke="#c6ad78" stroke-linecap="round"><path d="M34 55v12m-6-6h12M210 114v10m-5-5h10"/><circle cx="204" cy="34" r="3"/></g></svg>`;
}
function photoDispose(){photoDisposers.splice(0).forEach(fn=>fn());}
function photoExit(){photoDispose();photoPlaying=false;photoEditor=null;photoWorkbench=null;photoSelected.clear();photoSelecting=false;}
function photoMount(html,mode){
  photoDispose();A.view(html);$('#app-screen').dataset.photoMode=mode;
  if(!A.cleanups.includes(photoExit))A.cleanups.push(photoExit);
  const key=e=>{
    if(A.current!=='photos'||!$('#overlay').hidden||e.isComposing||e.ctrlKey||e.metaKey||e.altKey||e.target.closest('input,select,textarea,[contenteditable]')||A.settings.keyboardShortcuts===false)return;
    if(mode==='viewer'&&['ArrowLeft','ArrowRight'].includes(e.key)){e.preventDefault();movePhoto(e.key==='ArrowLeft'?-1:1);}
  };
  document.addEventListener('keydown',key);photoDisposers.push(()=>document.removeEventListener('keydown',key));
  photoImageFallback($('#app-screen'));
  if(mode==='editor'||mode==='collage'){
    const warn=e=>{if(photoEditor?.undo.length||photoWorkbench?.dirty){e.preventDefault();e.returnValue='';}};
    window.addEventListener('beforeunload',warn);photoDisposers.push(()=>window.removeEventListener('beforeunload',warn));
  }
}
function photoImageFallback(root){
  root.querySelectorAll('img').forEach(img=>{img.addEventListener('error',()=>{img.hidden=true;img.parentElement.classList.add('pa-image-failed');img.parentElement.title='画像を読み込めません。通信状態を確認してください';});});
}
const photoTabs=()=>A.tabs([{id:'all',icon:'photos',name:'ライブラリ',action:'photoFilter',value:'all'},{id:'mine',icon:'camera',name:'自分の写真',action:'photoFilter',value:'mine'},{id:'favorites',icon:'heart',name:'お気に入り',action:'photoFilter',value:'favorites'},{id:'trash',icon:'trash',name:'ゴミ箱',action:'photoFilter',value:'trash'}],photoFilter);
function photos(){
  refreshPhotos();photoPlaying=false;photoEditor=null;photoWorkbench=null;currentPhoto=null;A.statusTheme(false);
  const albums=photoAlbums();if(photoAlbum&&!albums.includes(photoAlbum))photoAlbum='';
  const own=localPhotos().filter(p=>!p.deletedAt),hero=own[0]||samplePhotos[0];
  photoMount(A.nav('Photo Atelier',`<button data-action="photoImport" aria-label="写真を追加">${icon('plus')}</button>`)+`<div class="app-content pa-library"><header class="pa-heading"><div><span class="pa-eyebrow">AURA / PHOTO ATELIER</span><h1>光を、集める。</h1><p>何気ない一瞬を、あなたの一枚に。</p></div>${photoArt()}</header><div class="pa-collection"><button class="pa-cover" data-action="photoOpen" data-id="${esc(hero.id)}"><img src="${esc(hero.url)}" alt="${esc(photoTitle(hero))}"><span class="pa-cover-copy"><small>${hero.sample?'SAMPLE COLLECTION':'YOUR COLLECTION'}</small><strong>${hero.sample?'光と余白':esc(photoTitle(hero))}</strong><span>${hero.sample?'Unsplash のサンプル':'自分の写真 '+own.length+'枚'} ${icon('arrow')}</span></span><span class="pa-cover-stamp">a / 01</span></button></div><div class="pa-stats"><span><b>${own.length}</b> 自分の写真</span><span><b>${allPhotos().filter(p=>favorites.includes(p.id)).length}</b> お気に入り</span><span><b>${albums.length}</b> アルバム</span></div>${A.search('pa-search','写真名・メモ・アルバムで検索')}<div class="pa-controls"><label><span class="pa-sr">並べ替え</span><select id="pa-sort"><option value="new" ${photoSort==='new'?'selected':''}>新しい順</option><option value="old" ${photoSort==='old'?'selected':''}>古い順</option><option value="name" ${photoSort==='name'?'selected':''}>名前順</option></select></label><button data-action="photoLayout" aria-label="グリッド表示を切り替え" aria-pressed="${photoLayout==='compact'}">${icon('grid')}</button><button data-action="photoSelectMode" aria-pressed="${photoSelecting}">${photoSelecting?'完了':'選択'}</button><button data-action="photoSlideshow" aria-label="表示中の写真でスライドショー">${icon('play')}</button></div><label class="pa-album-filter">${photoGlyph('folder')}<select id="pa-album" aria-label="アルバムで絞り込む"><option value="">すべてのアルバム</option>${albums.map(name=>`<option value="${esc(name)}" ${photoAlbum===name?'selected':''}>${esc(name)}</option>`).join('')}</select></label><div class="pa-section-head"><h2>${{all:'ライブラリ',mine:'自分の写真',favorites:'お気に入り',trash:'ゴミ箱'}[photoFilter]}</h2><span id="pa-count" role="status"></span></div>${photoFilter==='trash'?'<p class="pa-note">自動消去はしません。完全削除するまで保存容量に含まれます。</p>':''}<div id="pa-selection"></div><div id="pa-grid" class="pa-grid"></div><p class="pa-note pa-footer">端末内に保存 · クラウド同期なし<br>サンプルは通信が必要です。撮影日・位置の推測はしません。</p><div id="pa-import-status" class="pa-note" role="status">${photoImporting?'写真を読み込み中…':''}</div></div>`+photoTabs(),'library');
  const input=$('#pa-search');input.value=photoQuery;input.oninput=()=>{photoQuery=input.value;photoSelected.clear();renderPhotoGrid();};
  $('#pa-sort').onchange=e=>{photoSort=e.target.value;renderPhotoGrid();};
  $('#pa-album').onchange=e=>{photoAlbum=e.target.value;photoSelected.clear();renderPhotoGrid();};
  $('.pa-stats').insertAdjacentHTML('afterend',`<nav class="pa-workspace-links" aria-label="写真の道具">${photoButton('photoAlbumsOpen','アルバムを整理','folder')}${photoButton('photoCreateStart','作品をつくる','grid')}${photoButton('photoPlaybackSettings','スライド設定','play')}</nav>`);renderPhotoGrid();
}
function renderPhotoGrid(){
  const grid=$('#pa-grid');if(!grid)return;const focused=document.activeElement,focusId=focused?.dataset?.id,focusAction=focused?.dataset?.action,restoreFocus=grid.contains(focused)||$('#pa-selection')?.contains(focused);const list=albumPhotos(),ids=new Set(list.map(p=>p.id));photoSelected=new Set([...photoSelected].filter(id=>ids.has(id)));
  grid.className='pa-grid '+(photoLayout==='compact'?'pa-compact':'');$('#pa-count').textContent=list.length+'枚';
  grid.innerHTML=list.length?list.map((p,i)=>`<button class="pa-tile ${photoSelected.has(p.id)?'is-selected':''}" data-action="${photoSelecting?'photoToggleSelect':'photoOpen'}" data-id="${esc(p.id)}" aria-label="${esc(photoTitle(p))}${photoSelecting?'を選択':''}" ${photoSelecting?`aria-pressed="${photoSelected.has(p.id)}"`:''} style="--pa-delay:${Math.min(i,10)*25}ms"><span class="pa-tile-image"><img src="${esc(p.url)}" alt="" loading="lazy" decoding="async">${p.sample?'<small class="pa-sample">SAMPLE</small>':''}${favorites.includes(p.id)?`<span class="pa-heart">${icon('heart')}</span>`:''}${photoSelecting?`<span class="pa-check">${photoSelected.has(p.id)?icon('check'):''}</span>`:''}</span><span class="pa-tile-copy"><strong>${esc(photoTitle(p))}</strong><small>${esc(p.album||photoDate(p))}</small></span></button>`).join(''):`<div class="pa-empty">${photoArt()}<h3>${photoQuery||photoAlbum?'見つかりませんでした':photoFilter==='trash'?'ゴミ箱は空です':'ここから、あなたのアルバム。'}</h3><p>${photoQuery||photoAlbum?'検索語やアルバムを変えてみてください。':'＋から写真を追加できます。'}</p>${photoButton('photoImport','写真を追加','plus')}</div>`;
  const selection=$('#pa-selection');selection.innerHTML=photoSelecting?`<div class="pa-selection"><strong>${photoSelected.size}枚選択</strong><button data-action="photoSelectAll">${photoSelected.size===list.length&&list.length?'選択解除':'すべて選択'}</button><div>${photoFilter==='trash'?photoButton('photoBatchRestore','復元','refresh')+photoButton('photoBatchPurge','完全削除','trash'):photoButton('photoBatchFavorite','お気に入りに追加','heart')+photoButton('photoBatchAlbum','アルバムに分類','folder')+photoButton('photoBatchTrash','ゴミ箱へ','trash')}</div></div>`:'';
  if(photoSelecting&&photoFilter!=='trash')selection.querySelector('.pa-selection').insertAdjacentHTML('beforeend',`<div class="pa-selection-create">${photoButton('photoCompareStart','2枚を比較','switch',photoSelected.size===2?'':'disabled')}${photoButton('photoCollageStart','コラージュ','grid',photoSelected.size>=2&&photoSelected.size<=6?'':'disabled')}${photoButton('photoBatchUnfavorite','お気に入り解除','heart',photoSelected.size?'':'disabled')}</div><p class="pa-note">比較は2枚、コラージュは2〜6枚。分類・ゴミ箱移動は自分の写真のみ。</p>`);
  photoImageFallback(grid);
  if(restoreFocus){const target=[...$('#app-screen').querySelectorAll('#pa-grid button,#pa-selection button')].find(b=>b.dataset.action===focusAction&&b.dataset.id===focusId);target?.focus({preventScroll:true});}
}
A.apps.photos.render=photos;
A.actions.photosHome=()=>{photoSelected.clear();photoSelecting=false;photos();};
A.actions.photoFilter=el=>{photoFilter=el.dataset.value;photoAlbum='';photoSelected.clear();photos();};
A.actions.photoLayout=()=>{photoLayout=photoLayout==='gallery'?'compact':'gallery';photos();};
A.actions.photoSelectMode=()=>{photoSelecting=!photoSelecting;photoSelected.clear();photos();};
A.actions.photoToggleSelect=el=>{const id=el.dataset.id;photoSelected.has(id)?photoSelected.delete(id):photoSelected.add(id);renderPhotoGrid();};
A.actions.photoSelectAll=()=>{const list=albumPhotos();photoSelected=photoSelected.size===list.length?new Set():new Set(list.map(p=>p.id));renderPhotoGrid();};
function savePhotoList(next){if(!A.save('photos',next))return false;userPhotos=next;return true;}
function selectedLocal(){const ids=[...photoSelected].filter(id=>localPhotos().some(p=>p.id===id));if(!ids.length)A.toast('自分の写真を選択してください。サンプルは対象外です');return ids;}
function changePhotoTrash(ids,operation){
  if(!ids.length)return;
  const text=operation==='purge'?['完全に削除',`${ids.length}枚を完全に削除します。この操作は取り消せません。`]:operation==='restore'?['写真を復元',`${ids.length}枚をライブラリに戻します。`]:['ゴミ箱へ移動',`${ids.length}枚をゴミ箱に移動します。あとで復元できます。`];
  A.confirm(...text,()=>{
    refreshPhotos();const set=new Set(ids);
    const next=operation==='purge'?userPhotos.filter(p=>!set.has(p?.id)):userPhotos.map(p=>set.has(p?.id)?{...p,deletedAt:operation==='restore'?null:Date.now()}:p);
    if(!savePhotoList(next))return;
    if(operation==='purge'){const fav=favorites.filter(id=>!set.has(id));if(A.save('photoFavorites',fav))favorites=fav;}
    photoSelected.clear();photos();A.toast(operation==='restore'?'写真を復元しました':operation==='purge'?'完全に削除しました':'ゴミ箱へ移動しました');
  });
}
A.actions.photoBatchTrash=()=>changePhotoTrash(selectedLocal(),'trash');
A.actions.photoBatchRestore=()=>changePhotoTrash(selectedLocal(),'restore');
A.actions.photoBatchPurge=()=>changePhotoTrash(selectedLocal(),'purge');
A.actions.photoBatchFavorite=()=>{refreshPhotos();if(!photoSelected.size)return A.toast('写真を選択してください');const next=[...new Set([...favorites,...photoSelected])];if(A.save('photoFavorites',next)){favorites=next;renderPhotoGrid();A.toast('お気に入りに追加しました');}};
A.actions.photoBatchAlbum=()=>{
  const ids=selectedLocal();if(!ids.length)return;
  A.form('アルバムに分類',`<label>アルバム名<input name="album" maxlength="60" placeholder="旅、日常、作品…" list="pa-album-names"></label>${photoAlbumOptions()}<p class="pa-note">空欄で分類を解除。写真は複製しません。</p>`,v=>{refreshPhotos();if(!savePhotoList(userPhotos.map(p=>ids.includes(p?.id)?{...p,album:v.album.trim(),albumCover:p.album===v.album.trim()?!!p.albumCover:false}:p)))return false;photos();});
};
function photoAlbumOptions(){return `<datalist id="pa-album-names">${photoAlbums().map(n=>`<option value="${esc(n)}"></option>`).join('')}</datalist>`;}
function viewPhoto(id){
  const p=findPhoto(id);if(!p)return photos();photoWorkbench=null;currentPhoto=id;photoZoom=1;A.statusTheme(true);
  const list=albumPhotos();if(!list.some(x=>x.id===id))list.unshift(p);const index=list.findIndex(x=>x.id===id),liked=favorites.includes(id);
  photoMount(A.nav(esc(photoTitle(p)),`<button data-action="photoInfo" aria-label="写真の情報">${icon('info')}</button>`,'photosHome','写真')+`<div class="pa-viewer-shell"><div class="pa-viewer-meta"><span>${p.sample?'UNSPLASH / SAMPLE':p.deletedAt?'ゴミ箱':'LOCAL / ORIGINAL'}</span><span>${index>=0?index+1:1} / ${Math.max(1,list.length)}</span></div><div class="photo-viewer pa-viewer" id="pa-viewport" tabindex="0" aria-label="写真。左右スワイプで移動、ダブルクリックで拡大"><div class="pa-image-stage"><img id="pa-main-image" src="${esc(p.url)}" alt="${esc(photoTitle(p))}" draggable="false"></div></div><div class="pa-view-tools">${photoButton('photoPrevious','前へ','previous')}${photoButton('photoZoom','拡大','search','id="pa-zoom"')}${photoButton('photoPlay',photoPlaying?'停止':'再生',photoPlaying?'pause':'play',`aria-pressed="${photoPlaying}"`)}${photoButton('photoNext','次へ','next')}</div><div class="pa-filmstrip" aria-label="写真一覧">${list.map(item=>`<button data-action="photoOpen" data-id="${esc(item.id)}" aria-label="${esc(photoTitle(item))}" aria-current="${item.id===id?'true':'false'}"><img src="${esc(item.url)}" alt="" loading="lazy"></button>`).join('')}</div><p class="pa-view-caption">${esc(p.caption||photoDate(p))}</p></div><div class="photo-toolbar pa-toolbar">${p.deletedAt?photoButton('photoRestore','復元','refresh')+photoButton('photoPurge','完全削除','trash'):photoButton('photoShare','共有','share')+photoButton('photoDownload','保存','download')+photoButton('photoFavorite','お気に入り','heart',`class="${liked?'liked':''}" aria-pressed="${liked}"`)+photoButton('photoEdit','編集','edit')+(!p.sample?photoButton('photoDelete','ゴミ箱','trash'):'')}</div>`,'viewer');
  const port=$('#pa-viewport'),strip=$('.pa-filmstrip'),thumb=strip.querySelector('[aria-current="true"]');if(thumb)strip.scrollLeft=thumb.offsetLeft-strip.offsetLeft-strip.clientWidth/2+thumb.clientWidth/2;
  let start=null,multiTouch=false;
  port.ondblclick=()=>A.actions.photoZoom();
  port.onpointerdown=e=>{if(e.pointerType==='mouse'&&e.button!==0)return;if(start){multiTouch=true;return;}multiTouch=false;start={id:e.pointerId,x:e.clientX,y:e.clientY,l:port.scrollLeft,t:port.scrollTop};if(photoZoom>1)port.setPointerCapture(e.pointerId);};
  port.onpointermove=e=>{if(start&&start.id===e.pointerId&&photoZoom>1&&!multiTouch){port.scrollLeft=start.l+start.x-e.clientX;port.scrollTop=start.t+start.y-e.clientY;}};
  port.onpointerup=e=>{if(!start||start.id!==e.pointerId)return;const dx=e.clientX-start.x,dy=e.clientY-start.y;if(!multiTouch&&photoZoom===1&&Math.abs(dx)>60&&Math.abs(dx)>Math.abs(dy)*1.5)movePhoto(dx<0?1:-1);start=null;};port.onpointercancel=()=>{start=null;};
  if(photoPlaying){const timer=setInterval(()=>{if(document.hidden||!$('#overlay').hidden||photoZoom!==1)return;movePhoto(1);},photoPlayDelay);photoDisposers.push(()=>clearInterval(timer));}
}
A.actions.photoOpen=el=>{photoPlaying=false;if(!albumPhotos().some(p=>p.id===el.dataset.id)){photoFilter='all';photoQuery='';photoAlbum='';}viewPhoto(el.dataset.id);};
const movePhoto=step=>{const list=albumPhotos();if(!list.length)return photos();const i=list.findIndex(p=>p.id===currentPhoto),next=i<0?(step>0?0:list.length-1):(i+step+list.length)%list.length;viewPhoto(list[next].id);};
A.actions.photoPrevious=()=>movePhoto(-1);A.actions.photoNext=()=>movePhoto(1);
A.actions.photoSlideshow=()=>{const list=albumPhotos();if(!list.length)return A.toast('表示する写真がありません');photoPlaying=true;viewPhoto(list[0].id);};
A.actions.photoPlay=()=>{photoPlaying=!photoPlaying;viewPhoto(currentPhoto);};
A.actions.photoZoom=()=>{
  photoZoom=photoZoom===1?2:photoZoom===2?3:1;const port=$('#pa-viewport'),stage=port?.querySelector('.pa-image-stage');if(!stage)return;
  stage.style.width=photoZoom*100+'%';stage.style.height=photoZoom*100+'%';port.classList.toggle('is-zoomed',photoZoom>1);port.scrollLeft=(port.scrollWidth-port.clientWidth)/2;port.scrollTop=(port.scrollHeight-port.clientHeight)/2;
  $('#pa-zoom span').textContent=photoZoom===1?'拡大':photoZoom+'×';$('#pa-zoom').setAttribute('aria-label',photoZoom+'倍表示。次の倍率へ');
};
A.actions.photoFavorite=()=>{refreshPhotos();const next=favorites.includes(currentPhoto)?favorites.filter(x=>x!==currentPhoto):[...favorites,currentPhoto];if(!A.save('photoFavorites',next))return;favorites=next;viewPhoto(currentPhoto);};
A.actions.photoDelete=()=>{const p=findPhoto(currentPhoto);if(p&&!p.sample)changePhotoTrash([p.id],'trash');};
A.actions.photoRestore=()=>changePhotoTrash([currentPhoto],'restore');A.actions.photoPurge=()=>changePhotoTrash([currentPhoto],'purge');
A.actions.photoInfo=()=>{
  const p=findPhoto(currentPhoto);if(!p)return;
  const img=$('#pa-main-image'),dimensions=img?.naturalWidth?`${img.naturalWidth} × ${img.naturalHeight} px`:'読み込み待ち';
  if(p.sample)return A.overlay(`<div class="modal-sheet pa-info">${A.overlayTitle('写真の情報')}<h3>${esc(photoTitle(p))}</h3><p>${dimensions}</p><p>Unsplash のサンプル写真。撮影日・撮影場所の情報はありません。編集結果は自分の写真としてコピー保存できます。</p></div>`,'sheet-overlay');
  A.form('写真の情報',`<p class="pa-note">${dimensions} · 追加日 ${esc(photoDate(p))}<br>撮影日時・位置情報（EXIF）は保持しません。</p><label>写真名<input name="title" maxlength="100" required value="${esc(photoTitle(p))}"></label><label>メモ<textarea name="caption" maxlength="1000" rows="3">${esc(p.caption||'')}</textarea></label><label>アルバム<input name="album" maxlength="60" value="${esc(p.album||'')}" list="pa-album-names"></label>${photoAlbumOptions()}`,v=>{
    if(!v.title.trim()){A.toast('写真名を入力してください');return false;}refreshPhotos();if(!savePhotoList(userPhotos.map(item=>item?.id===p.id?{...item,title:v.title.trim(),caption:v.caption.trim(),album:v.album.trim(),albumCover:item.album===v.album.trim()?!!item.albumCover:false}:item)))return false;viewPhoto(p.id);
  });
};
async function exportPhoto(share){
  const p=findPhoto(currentPhoto),root=$('.pa-viewer');if(!p||!root)return A.toast('先に写真を開いてください');A.toast('写真を準備中…');
  const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),15000);photoDisposers.push(()=>controller.abort());
  try{const response=await fetch(p.url,{signal:controller.signal,credentials:'omit'});if(!response.ok)throw Error();const blob=await response.blob();if(!root.isConnected||A.current!=='photos')return;
    const ext=({'image/png':'png','image/webp':'webp','image/gif':'gif','image/avif':'avif'})[blob.type]||'jpg',name='aura-'+p.id+'.'+ext;
    if(share)A.network.offerFile(blob,name);else{A.download(blob,name);A.toast('写真のダウンロードを開始しました');}
  }catch(e){if(e.name!=='AbortError'||root.isConnected)A.toast('画像を取得できません。通信を確認してください');}finally{clearTimeout(timer);}
}
A.actions.photoShare=()=>exportPhoto(true);A.actions.photoDownload=()=>exportPhoto(false);
A.storePhoto=(url,title,metadata={})=>{
  refreshPhotos();if(!photoValid({id:'new',url}))return false;
  const entry={id:A.id(),url,title:String(title||'無題の写真').slice(0,100),date:Date.now(),sample:false,album:String(metadata.album||'').slice(0,60),caption:String(metadata.caption||'').slice(0,1000)};
  return savePhotoList([entry,...userPhotos]);
};
function importPhotoFile(file){
  return new Promise(resolve=>{
    if(file.size>25*1024*1024||!file.type.startsWith('image/'))return resolve('skip');
    const url=URL.createObjectURL(file),img=new Image();let finished=false;
    const finish=result=>{if(finished)return;finished=true;clearTimeout(timer);URL.revokeObjectURL(url);img.onload=img.onerror=null;resolve(result);};
    const timer=setTimeout(()=>finish('skip'),20000);
    img.onload=()=>{try{
      if(!img.naturalWidth||!img.naturalHeight||img.naturalWidth*img.naturalHeight>60000000)return finish('skip');
      const c=document.createElement('canvas'),scale=Math.min(1,1200/Math.max(img.naturalWidth,img.naturalHeight));c.width=Math.max(1,Math.round(img.naturalWidth*scale));c.height=Math.max(1,Math.round(img.naturalHeight*scale));const ctx=c.getContext('2d');ctx.fillStyle='#fff';ctx.fillRect(0,0,c.width,c.height);ctx.drawImage(img,0,0,c.width,c.height);
      finish(A.storePhoto(c.toDataURL('image/jpeg',.85),file.name.replace(/\.[^.]+$/,''))?'ok':'full');
    }catch{finish('skip');}};img.onerror=()=>finish('skip');img.src=url;
  });
}
A.actions.photoImport=()=>{
  if(photoImporting)return A.toast('読み込みが終わるまでお待ちください');
  const input=document.createElement('input');input.type='file';input.accept='image/*';input.multiple=true;
  input.onchange=async()=>{
    const files=[...input.files];if(!files.length)return;if(files.length>30)return A.toast('1回に30枚まで選択してください');photoImporting=true;let added=0,skipped=0,full=false;
    try{for(let i=0;i<files.length;i++){const status=$('#pa-import-status');if(status)status.textContent=`読み込み中 ${i+1} / ${files.length}`;const result=await importPhotoFile(files[i]);if(result==='ok')added++;else if(result==='full'){full=true;break;}else skipped++;}}
    finally{photoImporting=false;if(A.current==='photos'&&$('#app-screen').dataset.photoMode==='library')photos();A.toast(`${added}枚追加${skipped?' / '+skipped+'枚は形式・サイズ等で読込不可':''}${full?' / 容量不足で中断':''}`);}
  };input.click();
};
// Photo workspaces share the library's storage and clean up every image request.
A.actions.photoCreateStart=()=>{photoFilter='all';photoAlbum='';photoQuery='';photoSelecting=true;photoSelected.clear();photos();$('#pa-selection')?.scrollIntoView({block:'start'});A.toast('2枚を比較、2〜6枚でコラージュを作成できます');};
A.actions.photoBatchUnfavorite=()=>{if(!photoSelected.size)return;refreshPhotos();const next=favorites.filter(id=>!photoSelected.has(id));if(A.save('photoFavorites',next)){favorites=next;renderPhotoGrid();A.toast('お気に入りを解除しました');}};
A.actions.photoPlaybackSettings=()=>A.form('スライドショー',`<label>切り替え間隔<select name="delay">${[[3000,'3秒'],[4500,'4.5秒'],[7000,'7秒'],[10000,'10秒']].map(([n,label])=>`<option value="${n}" ${photoPlayDelay===n?'selected':''}>${label}</option>`).join('')}</select></label><p class="pa-note">設定はこのタブ内のみ。非表示のタブ・拡大中・メニュー表示中は写真を進めません。</p>`,v=>{photoPlayDelay=[3000,4500,7000,10000].includes(Number(v.delay))?Number(v.delay):4500;});
A.actions.photoAlbumsOpen=showPhotoAlbums;
function showPhotoAlbums(){
  refreshPhotos();photoPlaying=false;photoWorkbench=null;A.statusTheme(false);
  const names=photoAlbums(),own=localPhotos().filter(p=>!p.deletedAt);
  photoMount(A.nav('アルバムの棚','','photosHome','写真')+`<div class="app-content pa-albums"><header class="pa-album-heading"><span class="pa-eyebrow">YOUR PERSONAL COLLECTIONS</span><h1>一枚から、物語へ。</h1><p>表紙を選び、名前をつけて。あなたの小さな写真集。</p></header><div class="pa-album-shelf">${names.map((name,i)=>{
    const items=own.filter(p=>String(p.album)===name),cover=items.find(p=>p.albumCover)||items[0];
    return `<article class="pa-album-book"><button class="pa-book-cover" data-action="photoAlbumOpen" data-name="${esc(name)}" aria-label="アルバム ${esc(name)}を開く"><span class="pa-book-spine"></span><img src="${esc(cover.url)}" alt=""><span class="pa-book-number">${String(i+1).padStart(2,'0')}</span><span class="pa-book-title"><strong>${esc(name)}</strong><small>${items.length} PHOTOGRAPHS</small></span></button><div class="pa-book-actions"><button data-action="photoAlbumEdit" data-name="${esc(name)}">表紙・名前</button><button data-action="photoAlbumDissolve" data-name="${esc(name)}" aria-label="${esc(name)}の分類を解除">分類を解除</button></div></article>`;
  }).join('')}</div>${names.length?'':`<div class="pa-empty">${photoArt()}<h3>写真を選んで、最初のアルバムを。</h3><p>「選択」→「アルバムに分類」から作れます。</p></div>`}<div class="pa-album-footer"><p>${own.filter(p=>!p.album).length}枚が未分類</p>${photoButton('photoAlbumOrganize','写真を選んで分類','folder')}</div><p class="pa-note">1枚につき1つのアルバム。分類を解除しても写真は残ります。空のアルバムは表示しません。</p></div>`,'albums');
}
A.actions.photoAlbumOpen=el=>{photoFilter='mine';photoAlbum=el.dataset.name;photoQuery='';photoSelecting=false;photos();$('#pa-grid')?.scrollIntoView({block:'start'});};
A.actions.photoAlbumOrganize=()=>{photoFilter='mine';photoQuery='';photoAlbum='';photoSelecting=true;photoSelected.clear();photos();$('#pa-selection')?.scrollIntoView({block:'start'});};
A.actions.photoAlbumEdit=el=>{
  const name=el.dataset.name,items=localPhotos().filter(p=>!p.deletedAt&&p.album===name),cover=items.find(p=>p.albumCover)||items[0];if(!cover)return;
  A.form('アルバムを整える',`<label>アルバム名<input name="name" required maxlength="60" value="${esc(name)}"></label><label>表紙の写真<select name="cover">${items.map(p=>`<option value="${esc(p.id)}" ${p.id===cover.id?'selected':''}>${esc(photoTitle(p))}</option>`).join('')}</select></label><p class="pa-note">同じ名前のアルバムには統合しません。</p>`,v=>{
    const nextName=v.name.trim().slice(0,60);if(!nextName){A.toast('アルバム名を入力してください');return false;}refreshPhotos();
    if(nextName!==name&&localPhotos().some(p=>p.album===nextName)){A.toast('その名前は使用されています');return false;}
    if(!savePhotoList(userPhotos.map(p=>p?.album===name?{...p,album:nextName,albumCover:p.id===v.cover}:p)))return false;
    if(photoAlbum===name)photoAlbum=nextName;showPhotoAlbums();
  });
};
A.actions.photoAlbumDissolve=el=>{const name=el.dataset.name;A.confirm('アルバムの分類を解除',`「${esc(name)}」の分類を解除します。写真は削除しません。ゴミ箱内の同じ分類も解除します。`,()=>{refreshPhotos();if(savePhotoList(userPhotos.map(p=>p?.album===name?{...p,album:'',albumCover:false}:p))){if(photoAlbum===name)photoAlbum='';showPhotoAlbums();}});};
function photoChosen(min,max){refreshPhotos();const items=[...photoSelected].map(findPhoto).filter(p=>p&&!p.deletedAt);if(items.length<min||items.length>max){A.toast(min===max?`${min}枚の写真を選択してください`:`${min}〜${max}枚の写真を選択してください`);return null;}return items;}
A.actions.photoCompareStart=()=>{const items=photoChosen(2,2);if(!items)return;photoWorkbench={kind:'compare',items,mode:'split',position:50};showPhotoCompare();};
function showPhotoCompare(){
  const ws=photoWorkbench;if(ws?.kind!=='compare')return;photoPlaying=false;A.statusTheme(true);
  photoMount(A.nav('2枚を比較','','photoWorkbenchClose','写真')+`<div class="app-content pa-compare"><header><span class="pa-eyebrow">TWO FRAMES / ONE MOMENT</span><p>違いが見える。好きが見つかる。</p></header><div class="pa-comparison-tabs"><button data-action="photoCompareMode" data-mode="split" aria-pressed="${ws.mode==='split'}">重ねて比較</button><button data-action="photoCompareMode" data-mode="side" aria-pressed="${ws.mode==='side'}">並べて比較</button>${photoButton('photoCompareSwap','左右を入れ替え','switch')}</div><div class="pa-compare-scene ${ws.mode==='side'?'is-side':''}" style="--pa-split:${ws.position}%">${ws.items.map((p,i)=>`<figure class="pa-compare-frame ${i?'pa-compare-b':'pa-compare-a'}"><img src="${esc(p.url)}" alt="${esc(photoTitle(p))}"><figcaption>${i?'B':'A'}</figcaption></figure>`).join('')}<div class="pa-compare-divider" aria-hidden="true"><span>‹ ›</span></div></div><label class="pa-compare-slider" ${ws.mode==='side'?'hidden':''}><span>A</span><input id="pa-compare-slider" type="range" min="0" max="100" value="${ws.position}" aria-label="比較の境界位置"><span>B</span></label><div class="pa-compare-details">${ws.items.map((p,i)=>`<div><span>${i?'B':'A'} / ${p.sample?'SAMPLE':'LOCAL'}</span><strong>${esc(photoTitle(p))}</strong><button data-action="photoCompareFavorite" data-id="${esc(p.id)}" aria-pressed="${favorites.includes(p.id)}">${icon('heart')}<span>${favorites.includes(p.id)?'お気に入り済み':'お気に入りに追加'}</span></button></div>`).join('')}</div><p class="pa-note">写真は縦横比を保ち、同じ枠内に表示します。撮影位置の自動補正・画素差分解析は行いません。</p></div>`,'compare');
  $('#pa-compare-slider').oninput=e=>{ws.position=Number(e.target.value);$('.pa-compare-scene').style.setProperty('--pa-split',ws.position+'%');};
}
A.actions.photoCompareMode=el=>{if(photoWorkbench?.kind!=='compare')return;photoWorkbench.mode=el.dataset.mode==='side'?'side':'split';showPhotoCompare();};
A.actions.photoCompareSwap=()=>{if(photoWorkbench?.kind!=='compare')return;photoWorkbench.items.reverse();showPhotoCompare();};
A.actions.photoCompareFavorite=el=>{refreshPhotos();const id=el.dataset.id,next=favorites.includes(id)?favorites.filter(v=>v!==id):[...favorites,id];if(A.save('photoFavorites',next)){favorites=next;el.setAttribute('aria-pressed',String(next.includes(id)));el.querySelector('span').textContent=next.includes(id)?'お気に入り済み':'お気に入りに追加';}};
A.actions.photoWorkbenchClose=()=>{if(photoWorkbench?.kind==='collage'&&photoWorkbench.dirty)A.confirm('制作画面を閉じる','未保存のレイアウト設定は失われます。元写真は変更しません。',photos);else photos();};
function photoLoadForCanvas(p,signal){
  return new Promise((resolve,reject)=>{
    const img=new Image();let settled=false,timer;
    const finish=err=>{if(settled)return;settled=true;clearTimeout(timer);signal.removeEventListener('abort',abort);img.onload=img.onerror=null;if(err){img.src='';reject(err);}else resolve(img);};
    const abort=()=>finish(new DOMException('Cancelled','AbortError'));
    if(signal.aborted)return abort();signal.addEventListener('abort',abort,{once:true});timer=setTimeout(()=>finish(Error('写真の読み込みがタイムアウトしました')),15000);
    img.onload=()=>{if(!img.naturalWidth||img.naturalWidth*img.naturalHeight>24000000)return finish(Error('写真のサイズが大きすぎます'));try{const c=document.createElement('canvas');c.width=c.height=1;c.getContext('2d').drawImage(img,0,0,1,1);c.getContext('2d').getImageData(0,0,1,1);finish();}catch{finish(Error('この写真は合成できません。保存してから写真に追加してください'));}};
    img.onerror=()=>finish(Error('写真を読み込めません。通信・画像形式を確認してください'));if(p.sample)img.crossOrigin='anonymous';img.src=p.url;
  });
}
const collageThemes={ivory:{paper:'#f4eee0',ink:'#3c4d43',line:'#c7bba4',label:'生成り'},sage:{paper:'#ceddcb',ink:'#2e4b3d',line:'#92ad95',label:'セージ'},night:{paper:'#1c2929',ink:'#e8dfc8',line:'#4d6660',label:'深緑'}};
const collageLayouts=[['grid','グリッド','M3 3h8v8H3ZM14 3h7v8h-7ZM3 14h8v7H3ZM14 14h7v7h-7Z'],['hero','主役の一枚','M3 3h18v11H3ZM3 17h5v4H3ZM11 17h5v4h-5ZM19 17h2v4h-2Z'],['strip','フィルム','M3 3h4v18H3ZM10 3h4v18h-4ZM17 3h4v18h-4Z']];
A.actions.photoCollageStart=()=>{const items=photoChosen(2,6);if(!items)return;photoWorkbench={kind:'collage',items,images:[],offsets:items.map(()=>({x:50,y:50})),active:0,layout:'grid',ratio:'square',theme:'ivory',gap:18,fit:'cover',title:'日々のかけら',labels:false,dirty:false,ready:false};showPhotoCollage();};
function showPhotoCollage(){
  const ws=photoWorkbench;if(ws?.kind!=='collage')return;photoPlaying=false;A.statusTheme(false);
  photoMount(A.nav('コラージュ工房',`<button id="pa-collage-save" data-action="photoCollageSave" disabled>コピー保存</button>`,'photoWorkbenchClose','写真')+`<div class="app-content pa-collage"><header><span class="pa-eyebrow">MAKE A LITTLE STORY</span><h1>好きな瞬間を、一枚に。</h1><p>2〜6枚の写真でつくる、小さな作品。</p></header><div class="pa-collage-table"><span class="pa-tape pa-tape-left" aria-hidden="true"></span><canvas id="pa-collage-canvas" aria-label="コラージュのプレビュー"></canvas><span class="pa-tape pa-tape-right" aria-hidden="true"></span><div id="pa-collage-status" role="status">写真を準備中…</div></div><div class="pa-layout-choices" aria-label="レイアウト">${collageLayouts.map(([id,label,path])=>`<button data-action="photoCollageLayout" data-value="${id}" aria-pressed="${ws.layout===id}"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" aria-hidden="true"><path d="${path}"/></svg>${label}</button>`).join('')}</div><div class="pa-collage-settings"><label>作品名<input id="pa-collage-title" maxlength="60" value="${esc(ws.title)}" placeholder="タイトルなしも選べます"></label><div class="pa-collage-row"><label>用紙<select id="pa-collage-ratio"><option value="square">正方形</option><option value="portrait">縦 4:5</option><option value="wide">横 3:2</option></select></label><label>写真の収め方<select id="pa-collage-fit"><option value="cover">枠いっぱい</option><option value="contain">写真全体</option></select></label></div><div class="pa-paper-choices" aria-label="用紙の色">${Object.entries(collageThemes).map(([key,t])=>`<button data-action="photoCollageTheme" data-value="${key}" aria-pressed="${ws.theme===key}"><i style="background:${t.paper}"></i>${t.label}</button>`).join('')}</div><label class="pa-slider"><span>余白</span><input id="pa-collage-gap" type="range" min="6" max="40" value="${ws.gap}" aria-label="写真の余白"><output id="pa-collage-gap-value">${ws.gap}</output></label><label class="pa-collage-check"><input type="checkbox" id="pa-collage-labels">写真名を添える</label></div><section class="pa-collage-framing"><h2>並び順と、切り抜き位置</h2><div id="pa-collage-order" class="pa-collage-order"></div><div class="pa-order-controls">${photoButton('photoCollageEarlier','前に移動','previous')}${photoButton('photoCollageLater','後ろに移動','next')}</div><div id="pa-collage-crop-controls">${['x','y'].map((key,i)=>`<label class="pa-slider"><span>${i?'上下':'左右'}位置</span><input id="pa-collage-${key}" type="range" min="0" max="100" value="50" aria-label="選択写真の切り抜き${i?'上下':'左右'}位置"><output id="pa-collage-${key}-value">50</output></label>`).join('')}</div><p class="pa-note">写真を選択して調整。余白がない方向の位置は変化しません。</p></section><button class="pa-collage-export" data-action="photoCollageExport" id="pa-collage-export" disabled>${icon('download')}1800pxのJPEGを書き出す</button><p class="pa-note">コピー保存は最大辺1200px、書き出しは1800px。元写真は変更しません。レイアウトはこの制作画面内のみ保持し、ホーム移動・ページ終了で失われます。</p></div>`,'collage');
  const controller=new AbortController();let frame=0;photoDisposers.push(()=>{controller.abort();cancelAnimationFrame(frame);});
  const change=(key,value)=>{ws[key]=value;ws.dirty=true;cancelAnimationFrame(frame);frame=requestAnimationFrame(()=>{if(photoWorkbench===ws)updatePhotoCollage();});};
  $('#pa-collage-title').oninput=e=>change('title',e.target.value.slice(0,60));$('#pa-collage-ratio').value=ws.ratio;$('#pa-collage-ratio').onchange=e=>change('ratio',e.target.value);$('#pa-collage-fit').value=ws.fit;$('#pa-collage-fit').onchange=e=>change('fit',e.target.value);$('#pa-collage-gap').oninput=e=>change('gap',Number(e.target.value));$('#pa-collage-labels').checked=ws.labels;$('#pa-collage-labels').onchange=e=>change('labels',e.target.checked);
  ['x','y'].forEach(key=>{$('#pa-collage-'+key).oninput=e=>{ws.offsets[ws.active][key]=Number(e.target.value);change('offsets',ws.offsets);};});updatePhotoCollage();
  if(ws.ready)return;
  (async()=>{try{for(let i=0;i<ws.items.length;i++){if(controller.signal.aborted)return;$('#pa-collage-status').textContent=`写真を準備中 ${i+1} / ${ws.items.length}`;ws.images[i]=await photoLoadForCanvas(ws.items[i],controller.signal);}if(controller.signal.aborted||photoWorkbench!==ws)return;ws.ready=true;updatePhotoCollage();}catch(e){if(controller.signal.aborted||photoWorkbench!==ws)return;$('#pa-collage-status').textContent=e.message;$('#pa-collage-status').insertAdjacentHTML('beforeend','<button data-action="photoCollageRetry">読み込みを再試行</button>');ws.ready=false;}})();
}
A.actions.photoCollageRetry=()=>{if(photoWorkbench?.kind==='collage'){photoWorkbench.images=[];photoWorkbench.ready=false;showPhotoCollage();}};
function photoCollageFrames(ws,x,y,w,h,gap){
  const n=ws.items.length;
  if(ws.layout==='strip')return ws.items.map((_,i)=>[x+i*(w+gap)/n,y,(w-gap*(n-1))/n,h]);
  if(ws.layout==='hero'){const top=(h-gap)*.6,bottom=h-top-gap,cell=(w-gap*(n-2))/(n-1);return [[x,y,w,top],...ws.items.slice(1).map((_,i)=>[x+i*(cell+gap),y+top+gap,cell,bottom])];}
  const columns=n>4?3:2,rows=Math.ceil(n/columns),height=(h-gap*(rows-1))/rows;
  return ws.items.map((_,i)=>{const row=Math.floor(i/columns),count=Math.min(columns,n-row*columns),width=(w-gap*(count-1))/count;return [x+(i%columns)*(width+gap),y+row*(height+gap),width,height];});
}
function photoFitText(ctx,text,width){const chars=Array.from(text);if(ctx.measureText(text).width<=width)return text;while(chars.length&&ctx.measureText(chars.join('')+'…').width>width)chars.pop();return chars.join('')+'…';}
function photoCollageRender(ws,maxEdge){
  const ratio=ws.ratio==='portrait'?.8:ws.ratio==='wide'?1.5:1,c=document.createElement('canvas');c.width=Math.round(maxEdge*(ratio<1?ratio:1));c.height=Math.round(maxEdge*(ratio>1?1/ratio:1));
  const ctx=c.getContext('2d'),t=collageThemes[ws.theme],u=c.width/1000,gap=ws.gap*u,margin=36*u,footer=ws.title.trim()?100*u:20*u;
  ctx.fillStyle=t.paper;ctx.fillRect(0,0,c.width,c.height);ctx.strokeStyle=t.line;ctx.lineWidth=u;ctx.strokeRect(14*u,14*u,c.width-28*u,c.height-28*u);
  photoCollageFrames(ws,margin,margin,c.width-margin*2,c.height-margin-footer,gap).forEach(([x,y,w,h],i)=>{
    const img=ws.images[i],label=ws.labels?Math.min(28*u,h*.2):0,ih=h-label,position=ws.offsets[i];ctx.save();ctx.fillStyle=t.line;ctx.fillRect(x,y,w,h);ctx.beginPath();ctx.rect(x,y,w,ih);ctx.clip();
    const scale=ws.fit==='contain'?Math.min(w/img.naturalWidth,ih/img.naturalHeight):Math.max(w/img.naturalWidth,ih/img.naturalHeight),dw=img.naturalWidth*scale,dh=img.naturalHeight*scale;
    ctx.drawImage(img,x+(w-dw)*(ws.fit==='contain'?.5:position.x/100),y+(ih-dh)*(ws.fit==='contain'?.5:position.y/100),dw,dh);ctx.restore();
    if(label){ctx.fillStyle=t.paper;ctx.fillRect(x,y+ih,w,label);ctx.fillStyle=t.ink;ctx.font=`${16*u}px sans-serif`;ctx.textAlign='left';ctx.textBaseline='middle';ctx.fillText(photoFitText(ctx,photoTitle(ws.items[i]),w-8*u),x+4*u,y+ih+label/2);}
  });
  if(ws.title.trim()){ctx.fillStyle=t.ink;ctx.textAlign='center';ctx.textBaseline='middle';ctx.font=`500 ${32*u}px sans-serif`;ctx.fillText(photoFitText(ctx,ws.title.trim(),c.width-2*margin),c.width/2,c.height-footer/2);ctx.fillStyle=t.line;ctx.fillRect(c.width/2-22*u,c.height-27*u,44*u,u);}
  return c;
}
function updatePhotoCollage(){
  const ws=photoWorkbench,canvas=$('#pa-collage-canvas');if(ws?.kind!=='collage'||!canvas)return;
  if(ws.ready){try{const result=photoCollageRender(ws,720);canvas.width=result.width;canvas.height=result.height;canvas.getContext('2d').drawImage(result,0,0);$('#pa-collage-status').hidden=true;$('#pa-collage-save').disabled=false;$('#pa-collage-export').disabled=false;}catch{ws.ready=false;$('#pa-collage-status').hidden=false;$('#pa-collage-status').textContent='画像を合成できませんでした。元写真は変更していません。';$('#pa-collage-save').disabled=true;$('#pa-collage-export').disabled=true;}}
  $('#pa-collage-gap-value').textContent=ws.gap;$('#pa-collage-crop-controls').hidden=ws.fit==='contain';
  ['x','y'].forEach(key=>{$('#pa-collage-'+key).value=ws.offsets[ws.active][key];$('#pa-collage-'+key+'-value').textContent=ws.offsets[ws.active][key];});
  document.querySelectorAll('[data-action="photoCollageLayout"]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.value===ws.layout)));document.querySelectorAll('[data-action="photoCollageTheme"]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.value===ws.theme)));
  const order=$('#pa-collage-order'),signature=JSON.stringify(ws.items.map(p=>p.id));
  if(order.dataset.order!==signature){order.dataset.order=signature;order.innerHTML=ws.items.map((p,i)=>`<button data-action="photoCollageSlot" data-index="${i}" aria-label="${i+1}枚目 ${esc(photoTitle(p))}を調整"><img src="${esc(p.url)}" alt=""><span>${i+1}</span></button>`).join('');photoImageFallback(order);}
  order.querySelectorAll('button').forEach((b,i)=>b.setAttribute('aria-pressed',String(i===ws.active)));$('[data-action="photoCollageEarlier"]').disabled=!ws.ready||!ws.active;$('[data-action="photoCollageLater"]').disabled=!ws.ready||ws.active===ws.items.length-1;
}
A.actions.photoCollageLayout=el=>{const ws=photoWorkbench;if(ws?.kind!=='collage'||!collageLayouts.some(([key])=>key===el.dataset.value))return;ws.layout=el.dataset.value;ws.dirty=true;updatePhotoCollage();};
A.actions.photoCollageTheme=el=>{const ws=photoWorkbench;if(ws?.kind!=='collage'||!Object.hasOwn(collageThemes,el.dataset.value))return;ws.theme=el.dataset.value;ws.dirty=true;updatePhotoCollage();};
A.actions.photoCollageSlot=el=>{const ws=photoWorkbench,index=Number(el.dataset.index);if(ws?.kind==='collage'&&Number.isInteger(index)&&ws.items[index]){ws.active=index;updatePhotoCollage();}};
function photoCollageMove(step){const ws=photoWorkbench;if(ws?.kind!=='collage'||!ws.ready)return;const i=ws.active,j=i+step;if(j<0||j>=ws.items.length)return;['items','images','offsets'].forEach(key=>{[ws[key][i],ws[key][j]]=[ws[key][j],ws[key][i]];});ws.active=j;ws.dirty=true;updatePhotoCollage();}
A.actions.photoCollageEarlier=()=>photoCollageMove(-1);A.actions.photoCollageLater=()=>photoCollageMove(1);
A.actions.photoCollageSave=()=>{const ws=photoWorkbench;if(ws?.kind!=='collage'||!ws.ready)return;try{const canvas=photoCollageRender(ws,1200);if(!A.storePhoto(canvas.toDataURL('image/jpeg',.91),ws.title.trim()||'コラージュ',{album:'コラージュ',caption:ws.items.length+'枚の写真から制作'})){A.toast('容量不足。JPEGを書き出して保存できます');return;}const id=userPhotos[0].id;ws.dirty=false;photoWorkbench=null;photoFilter='mine';photoAlbum='';photoQuery='';viewPhoto(id);A.toast('元写真を残してコラージュを保存しました');}catch{A.toast('コラージュを保存できませんでした');}};
A.actions.photoCollageExport=()=>{const ws=photoWorkbench;if(ws?.kind!=='collage'||!ws.ready)return;try{const canvas=photoCollageRender(ws,1800);canvas.toBlob(blob=>{if(!blob)return A.toast('画像を書き出せませんでした');A.download(blob,'aura-collage-'+Date.now()+'.jpg');A.toast('1800pxのコラージュを書き出しました');},'image/jpeg',.93);}catch{A.toast('コラージュを書き出せませんでした');}};

// Canvas-based adjustments also work in browsers without CanvasRenderingContext2D.filter.
const photoPresets=[{id:'original',name:'オリジナル',b:0,c:0,s:0,w:0},{id:'daylight',name:'光',b:8,c:5,s:8,w:3},{id:'film',name:'フィルム',b:3,c:-12,s:-20,w:16},{id:'forest',name:'森',b:-3,c:13,s:-12,w:-8},{id:'sunset',name:'夕映え',b:4,c:8,s:14,w:25},{id:'mono',name:'モノクロ',b:0,c:18,s:-100,w:0}];
const defaultPhotoEdit=()=>({preset:'original',b:0,c:0,s:0,w:0,sh:0,hi:0,v:0,rotation:0,flip:false,ratio:'free',cropX:50,cropY:50});
function renderEditedPhoto(img,state,maxEdge,original=false){
  const work=document.createElement('canvas'),iw=img.naturalWidth,ih=img.naturalHeight,scale=Math.min(1,maxEdge/Math.max(iw,ih));
  const w=Math.max(1,Math.round(iw*scale)),h=Math.max(1,Math.round(ih*scale)),rot=original?0:state.rotation,quarter=rot%180!==0;
  work.width=quarter?h:w;work.height=quarter?w:h;const ctx=work.getContext('2d',{willReadFrequently:true});ctx.fillStyle='#fff';ctx.fillRect(0,0,work.width,work.height);ctx.translate(work.width/2,work.height/2);ctx.rotate(rot*Math.PI/180);ctx.scale(!original&&state.flip?-1:1,1);ctx.drawImage(img,-w/2,-h/2,w,h);ctx.setTransform(1,0,0,1,0,0);
  if(original)return work;
  const ratio=({square:1,portrait:4/5,wide:16/9})[state.ratio];let cw=work.width,ch=work.height;
  if(ratio){if(cw/ch>ratio)cw=ch*ratio;else ch=cw/ratio;}
  const out=document.createElement('canvas');out.width=Math.max(1,Math.round(cw));out.height=Math.max(1,Math.round(ch));const outctx=out.getContext('2d',{willReadFrequently:true});outctx.drawImage(work,(work.width-cw)*state.cropX/100,(work.height-ch)*state.cropY/100,cw,ch,0,0,out.width,out.height);
  if(state.b||state.c||state.s||state.w||state.sh||state.hi||state.v){const data=outctx.getImageData(0,0,out.width,out.height),d=data.data,contrast=(100+state.c)/100,sat=(100+state.s)/100,bright=state.b*2.55,warm=state.w*.75;
    for(let i=0;i<d.length;i+=4){
      const luminance=(.2126*d[i]+.7152*d[i+1]+.0722*d[i+2])/255;
      const tone=(state.sh||0)*1.3*(1-luminance)**2+(state.hi||0)*1.3*luminance**2;
      const r=(d[i]-128)*contrast+128+bright+warm+tone,g=(d[i+1]-128)*contrast+128+bright+tone,b=(d[i+2]-128)*contrast+128+bright-warm+tone,l=.2126*r+.7152*g+.0722*b;
      const x=((i/4)%out.width+.5)/out.width*2-1,y=(Math.floor(i/4/out.width)+.5)/out.height*2-1,shade=1-(state.v||0)/100*Math.min(1,(x*x+y*y)*.5)*.85;
      d[i]=(l+(r-l)*sat)*shade;d[i+1]=(l+(g-l)*sat)*shade;d[i+2]=(l+(b-l)*sat)*shade;
    }outctx.putImageData(data,0,0);
  }return out;
}
A.actions.photoEdit=()=>{
  const p=findPhoto(currentPhoto);if(!p||p.deletedAt)return;photoPlaying=false;
  photoEditor={id:p.id,source:p,state:defaultPhotoEdit(),undo:[],redo:[],image:null,original:false};showPhotoEditor();
};
function showPhotoEditor(){
  const ed=photoEditor;if(!ed)return;A.statusTheme(true);
  photoMount(A.nav('編集スタジオ',`<button data-action="photoEditSave" id="pa-edit-save" disabled>コピー保存</button>`,'photoEditClose','編集を閉じる')+`<div class="app-content pa-editor"><div class="pa-editor-heading"><span class="pa-eyebrow">THE DIGITAL DARKROOM</span><p>光も、色も。自分らしい一枚へ。</p></div><div class="pa-edit-stage"><div class="pa-edit-picture"><canvas id="pa-edit-canvas" aria-label="編集結果のプレビュー"></canvas><div class="pa-crop-guides" hidden></div></div><span id="pa-edit-status" role="status">写真を読み込み中…</span></div><div class="pa-histogram"><svg id="pa-histogram" viewBox="0 0 256 40" role="img" aria-label="プレビューのRGB明るさ分布"></svg><span>RGB / プレビューの明るさ分布</span></div><div class="pa-edit-actions">${photoButton('photoEditUndo','戻す','previous','id="pa-undo" disabled')}${photoButton('photoEditRedo','やり直す','next','id="pa-redo" disabled')}${photoButton('photoEditCompare','元画像','photos','id="pa-compare" aria-pressed="false"')}${photoButton('photoEditReset','リセット','refresh')}</div><div class="pa-presets" aria-label="色のプリセット">${photoPresets.map(p=>`<button data-action="photoPreset" data-id="${p.id}" aria-pressed="${p.id==='original'}"><span class="pa-preset-swatch pa-preset-${p.id}"><i></i></span>${p.name}</button>`).join('')}</div><div class="pa-recipes" id="pa-recipes">${photoRecipePanel()}</div><section class="pa-edit-panel"><h3>光と色</h3>${[['b','明るさ',-60,60],['c','コントラスト',-60,60],['s','彩度',-100,100],['w','色温度',-50,50],['sh','シャドウ',-60,60],['hi','ハイライト',-60,60],['v','周辺減光',0,100]].map(([key,label,min,max])=>`<label class="pa-slider"><span>${label}</span><input type="range" data-photo-adjust="${key}" min="${min}" max="${max}" value="0" aria-label="${label}"><output data-photo-output="${key}">0</output></label>`).join('')}</section><section class="pa-edit-panel"><h3>構図</h3><div class="pa-transform">${photoButton('photoEditRotate','90°回転','refresh')}${photoButton('photoEditFlip','左右反転','switch','id="pa-flip" aria-pressed="false"')}<label><span class="pa-sr">トリミング比率</span><select id="pa-crop"><option value="free">元の比率</option><option value="square">正方形 1:1</option><option value="portrait">縦 4:5</option><option value="wide">横 16:9</option></select></label></div><div id="pa-crop-position" hidden>${[['cropX','左右位置'],['cropY','上下位置']].map(([key,label])=>`<label class="pa-slider"><span>${label}</span><input type="range" data-photo-adjust="${key}" min="0" max="100" value="50" aria-label="切り抜きの${label}"><output data-photo-output="${key}">50</output></label>`).join('')}</div></section>${photoButton('photoEditExport','編集したJPEGを書き出す','download','class="pa-edit-export" id="pa-edit-export" disabled')}<p class="pa-note">元写真は変更せず、最大辺1200pxのJPEGコピーを保存します。調整履歴は編集中のみ。余白のない方向の切り抜き位置は変化しません。ホーム移動・ページ終了で未保存の調整は失われます。</p></div>`,'editor');
  let frame=0;const queue=()=>{cancelAnimationFrame(frame);frame=requestAnimationFrame(()=>updatePhotoEditor());};photoDisposers.push(()=>cancelAnimationFrame(frame));
  document.querySelectorAll('[data-photo-adjust]').forEach(input=>{let start=null;input.oninput=()=>{if(!ed.image)return;if(!start)start={...ed.state};ed.state[input.dataset.photoAdjust]=Number(input.value);if(Object.hasOwn(photoToneLimits,input.dataset.photoAdjust))ed.state.preset='custom';ed.original=false;queue();};input.onchange=()=>{if(start){pushPhotoUndo(ed,start);start=null;updatePhotoEditor();}};});
  $('#pa-crop').onchange=e=>editPhotoState({ratio:e.target.value,cropX:50,cropY:50});
  const root=$('#pa-edit-canvas'),img=new Image();let cancelled=false;const timer=setTimeout(()=>{cancelled=true;img.onload=img.onerror=null;if(root.isConnected)$('#pa-edit-status').textContent='読み込みがタイムアウトしました。戻って再試行してください。';},15000);
  photoDisposers.push(()=>{cancelled=true;clearTimeout(timer);img.onload=img.onerror=null;});
  if(ed.source.sample)img.crossOrigin='anonymous';
  img.onload=()=>{clearTimeout(timer);if(cancelled||photoEditor!==ed||!root.isConnected)return;ed.image=img;try{updatePhotoEditor();$('#pa-edit-save').disabled=false;$('#pa-edit-export').disabled=false;$('#pa-edit-status').textContent='';photoPresetPreviews(ed.image);}catch{ed.image=null;$('#pa-edit-status').textContent='この写真は編集できません。端末に保存してから追加してください。';}};
  img.onerror=()=>{clearTimeout(timer);if(!cancelled&&root.isConnected)$('#pa-edit-status').textContent='写真を読み込めません。通信や画像形式を確認してください。';};img.src=ed.source.url;
}
// Only tonal values are persisted; a recipe never copies another photo's crop.
const photoToneLimits={b:[-60,60],c:[-60,60],s:[-100,100],w:[-50,50],sh:[-60,60],hi:[-60,60],v:[0,100]};
function photoToneValues(values){return Object.fromEntries(Object.entries(photoToneLimits).map(([key,[min,max]])=>[key,Math.min(max,Math.max(min,Number.isFinite(values?.[key])?values[key]:0))]));}
function photoRecipes(){return photoArray('photoRecipes').filter(p=>p&&typeof p.id==='string'&&typeof p.name==='string').slice(0,8).map(p=>({id:p.id.slice(0,100),name:p.name.slice(0,40),values:photoToneValues(p.values)}));}
function photoRecipePanel(){return `<div class="pa-recipe-heading"><span>自分の仕上げ</span><small>最大8件 · 色調整のみ</small></div><label class="pa-sr" for="pa-recipe-select">保存した仕上げ</label><select id="pa-recipe-select"><option value="">仕上げを選ぶ</option>${photoRecipes().map(p=>`<option value="${esc(p.id)}" ${photoEditor?.recipeId===p.id?'selected':''}>${esc(p.name)}</option>`).join('')}</select><div class="pa-recipe-tools">${photoButton('photoRecipeApply','適用','check')}${photoButton('photoRecipeSave','今の仕上げを保存','plus')}${photoButton('photoRecipeDelete','削除','trash')}</div>`;}
function photoRefreshRecipes(){const root=$('#pa-recipes');if(root)root.innerHTML=photoRecipePanel();}
A.actions.photoRecipeSave=()=>{
  const ed=photoEditor;if(!ed?.image)return A.toast('先に写真を読み込んでください');
  const values=photoToneValues(ed.state);
  A.form('仕上げを保存','<label>仕上げの名前<input name="name" required maxlength="40" placeholder="旅の光、やわらかな日常…"></label><p class="pa-note">7種類の色調整を保存します。写真・回転・反転・切り抜きは含みません。</p>',v=>{
    if(photoEditor!==ed)return;const name=v.name.trim().slice(0,40);if(!name){A.toast('名前を入力してください');return false;}
    const saved=photoRecipes();if(saved.some(p=>p.name===name)){A.toast('同じ名前があります。別の名前を入力してください');return false;}if(saved.length>=8){A.toast('保存は8件までです。不要な仕上げを削除してください');return false;}
    const recipe={id:A.id(),name,values};if(!A.save('photoRecipes',[...saved,recipe]))return false;ed.recipeId=recipe.id;photoRefreshRecipes();A.toast('仕上げを端末内に保存しました');
  });
};
A.actions.photoRecipeApply=()=>{const recipe=photoRecipes().find(p=>p.id===$('#pa-recipe-select')?.value);if(!recipe)return A.toast('仕上げを選択してください');if(!photoEditor?.image)return;photoEditor.recipeId=recipe.id;editPhotoState({preset:'custom',...recipe.values});A.toast('仕上げを適用しました。構図は変更していません');};
A.actions.photoRecipeDelete=()=>{const recipe=photoRecipes().find(p=>p.id===$('#pa-recipe-select')?.value);if(!recipe)return A.toast('仕上げを選択してください');A.confirm('仕上げを削除',`「${esc(recipe.name)}」を削除します。写真と現在の調整は変更しません。`,()=>{if(A.save('photoRecipes',photoRecipes().filter(p=>p.id!==recipe.id))){if(photoEditor)photoEditor.recipeId='';photoRefreshRecipes();}});};
function photoPresetPreviews(img){
  document.querySelectorAll('[data-action="photoPreset"]').forEach(btn=>{const preset=photoPresets.find(p=>p.id===btn.dataset.id);if(!preset)return;const rendered=renderEditedPhoto(img,{...defaultPhotoEdit(),...photoToneValues(preset)},100),swatch=btn.querySelector('.pa-preset-swatch');swatch.replaceChildren(rendered);swatch.classList.add('has-photo');rendered.setAttribute('aria-hidden','true');});
}
function photoHistogram(canvas){
  const bins=[new Uint32Array(64),new Uint32Array(64),new Uint32Array(64)],pixels=canvas.getContext('2d').getImageData(0,0,canvas.width,canvas.height).data;
  for(let i=0;i<pixels.length;i+=64)for(let channel=0;channel<3;channel++)bins[channel][pixels[i+channel]>>2]++;
  let peak=1;bins.forEach(values=>values.forEach(n=>{peak=Math.max(peak,n);}));
  $('#pa-histogram').innerHTML='<path d="M0 39h256M64 0v40M128 0v40M192 0v40" stroke="#ffffff15" fill="none"/>'+bins.map((values,channel)=>`<path d="${Array.from(values,(n,i)=>`${i?'L':'M'}${i*4+2} ${39-37*Math.sqrt(n/peak)}`).join(' ')}" stroke="${['#ef9e8d','#9ecea5','#92bdd6'][channel]}" stroke-width="1.3" fill="none"/>`).join('');
}
function pushPhotoUndo(ed,state){ed.undo.push({...state});if(ed.undo.length>25)ed.undo.shift();ed.redo=[];}
function editPhotoState(change){const ed=photoEditor;if(!ed?.image)return;pushPhotoUndo(ed,ed.state);ed.state={...ed.state,...change};ed.original=false;updatePhotoEditor();}
function updatePhotoEditor(){
  const ed=photoEditor,canvas=$('#pa-edit-canvas');if(!ed?.image||!canvas)return;
  const result=renderEditedPhoto(ed.image,ed.state,720,ed.original);canvas.width=result.width;canvas.height=result.height;canvas.getContext('2d').drawImage(result,0,0);
  photoHistogram(result);
  document.querySelectorAll('[data-photo-adjust]').forEach(input=>{input.value=ed.state[input.dataset.photoAdjust];});document.querySelectorAll('[data-photo-output]').forEach(o=>{o.textContent=ed.state[o.dataset.photoOutput];});
  document.querySelectorAll('[data-action="photoPreset"]').forEach(btn=>btn.setAttribute('aria-pressed',String(btn.dataset.id===ed.state.preset)));
  $('#pa-undo').disabled=!ed.undo.length;$('#pa-redo').disabled=!ed.redo.length;$('#pa-crop').value=ed.state.ratio;$('#pa-flip').setAttribute('aria-pressed',String(ed.state.flip));$('#pa-compare').setAttribute('aria-pressed',String(ed.original));$('#pa-compare span').textContent=ed.original?'編集中へ':'元画像';$('#pa-crop-position').hidden=ed.state.ratio==='free';$('.pa-crop-guides').hidden=ed.original||ed.state.ratio==='free';
}
A.actions.photoPreset=el=>{const p=photoPresets.find(p=>p.id===el.dataset.id);if(p)editPhotoState({preset:p.id,...photoToneValues(p)});};
A.actions.photoEditRotate=()=>{if(photoEditor)editPhotoState({rotation:(photoEditor.state.rotation+90)%360});};
A.actions.photoEditFlip=()=>{if(photoEditor)editPhotoState({flip:!photoEditor.state.flip});};
A.actions.photoEditReset=()=>editPhotoState(defaultPhotoEdit());
A.actions.photoEditUndo=()=>{const ed=photoEditor;if(!ed?.undo.length)return;ed.redo.push({...ed.state});ed.state=ed.undo.pop();ed.original=false;updatePhotoEditor();};
A.actions.photoEditRedo=()=>{const ed=photoEditor;if(!ed?.redo.length)return;ed.undo.push({...ed.state});ed.state=ed.redo.pop();ed.original=false;updatePhotoEditor();};
A.actions.photoEditCompare=()=>{if(photoEditor){photoEditor.original=!photoEditor.original;updatePhotoEditor();}};
A.actions.photoEditClose=()=>{const ed=photoEditor;if(!ed)return photos();const leave=()=>{photoEditor=null;viewPhoto(ed.id);};if(ed.undo.length||JSON.stringify(ed.state)!==JSON.stringify(defaultPhotoEdit()))A.confirm('編集を終了','未保存の調整を破棄して戻りますか？',leave);else leave();};
A.actions.photoEditSave=()=>{
  const ed=photoEditor;if(!ed?.image)return;
  try{const canvas=renderEditedPhoto(ed.image,ed.state,1200),url=canvas.toDataURL('image/jpeg',.9);if(!A.storePhoto(url,photoTitle(ed.source)+' · 編集',{album:ed.source.album,caption:ed.source.caption})){A.toast('容量不足。編集したJPEGを書き出して退避できます');return;}
    const saved=userPhotos[0];photoEditor=null;photoQuery='';photoAlbum='';photoFilter='mine';viewPhoto(saved.id);A.toast('元写真を残してコピーを保存しました');
  }catch{A.toast('編集結果を保存できませんでした。元写真は変更していません');}
};
A.actions.photoEditExport=()=>{
  const ed=photoEditor;if(!ed?.image)return;
  try{const canvas=renderEditedPhoto(ed.image,ed.state,1200);canvas.toBlob(blob=>{if(!blob)return A.toast('画像を生成できませんでした');A.download(blob,'aura-edit-'+ed.id+'.jpg');A.toast('編集した写真を書き出しました');},'image/jpeg',.9);}catch{A.toast('画像を書き出せませんでした。元写真は変更していません');}
};
let cameraStream=null,cameraFacing='environment',cameraGrid=true,cameraSession=0;
function stopCamera(){cameraSession++;if(cameraStream){cameraStream.getTracks().forEach(t=>t.stop());cameraStream=null;}}
function camera(){A.statusTheme(true);A.view(A.nav('カメラ',`<button data-action="cameraGrid" aria-label="グリッド切り替え">${icon('grid')}</button>`)+`<div class="camera-preview" id="camera-preview"><video id="camera-video" playsinline autoplay muted></video><div class="camera-grid" id="camera-grid"></div><div class="camera-placeholder" id="camera-placeholder">${icon('camera')}<button class="primary-button" data-action="cameraStart">カメラを使う</button><button class="secondary-button" data-action="photoImport" style="background:#ffffff12;color:#c3c8d1;font-size:11px">端末の写真から追加</button><p style="font-size:9px;margin-top:24px">auraの写真に保存。HTTPS・カメラ許可が必要</p></div></div><div class="camera-bottom"><div class="camera-modes"><span class="active">写真</span><span>1×</span></div><div class="camera-actions"><button class="camera-small" data-app="photos" aria-label="写真を開く">${icon('photos')}</button><button class="shutter" data-action="cameraCapture" aria-label="写真を撮影"></button><button class="camera-small" data-action="cameraFlip" aria-label="カメラ切り替え">${icon('refresh')}</button></div></div>`);$('#camera-grid').hidden=!cameraGrid;A.cleanups.push(stopCamera);}
A.apps.camera.render=camera;
A.actions.cameraStart=async()=>{if(!navigator.mediaDevices?.getUserMedia)return A.toast('この環境ではカメラを利用できません。写真を追加できます。');const token=++cameraSession;try{const stream=await navigator.mediaDevices.getUserMedia({video:{facingMode:cameraFacing,width:{ideal:1280},height:{ideal:1920}},audio:false});if(token!==cameraSession||A.current!=='camera'){stream.getTracks().forEach(t=>t.stop());return;}if(cameraStream)cameraStream.getTracks().forEach(t=>t.stop());cameraStream=stream;$('#camera-video').srcObject=stream;$('#camera-video').style.transform=cameraFacing==='user'?'scaleX(-1)':'';$('#camera-placeholder').hidden=true;await $('#camera-video').play();}catch(e){if(token===cameraSession)A.toast(e.name==='NotAllowedError'?'カメラの許可を確認してください':'カメラを起動できませんでした');}};
A.actions.cameraFlip=()=>{cameraFacing=cameraFacing==='user'?'environment':'user';if(cameraStream)stopCamera();A.actions.cameraStart();};A.actions.cameraGrid=()=>{cameraGrid=!cameraGrid;$('#camera-grid').hidden=!cameraGrid;};
A.actions.cameraCapture=()=>{const v=$('#camera-video');if(!cameraStream||!v?.videoWidth)return A.toast('先にカメラを起動');const c=document.createElement('canvas');const scale=Math.min(1,1200/Math.max(v.videoWidth,v.videoHeight));c.width=v.videoWidth*scale;c.height=v.videoHeight*scale;const ctx=c.getContext('2d');if(cameraFacing==='user'){ctx.translate(c.width,0);ctx.scale(-1,1);}ctx.drawImage(v,0,0,c.width,c.height);if(A.storePhoto(c.toDataURL('image/jpeg',.84),new Date().toLocaleDateString('ja-JP')+' の一枚')){A.haptic();A.toast('写真に保存済み');const preview=$('#camera-preview');preview.animate([{filter:'brightness(3)'},{filter:'brightness(1)'}],{duration:350});}};
// Original scores and synthesis stay on-device: no samples, network or paid API.
// MIDI voicings are deliberately voice-led, not parallel root-position triads.
const tracks=[
  {id:'dusk',title:'Golden Hour',artist:'aura sounds',album:'SLOW\nAFTERNOONS',art:'art-dusk',length:192,tempo:76,bars:60,key:'D major',style:'Warm broken beat',seed:17,swing:.14,
    detail:'温かなエレピとナイロン弦風ギターが応答する夕暮れのセッション。指弾きの倍音、ブラシ、リム、ヴィブラフォンを重ね、ブリッジでは引き算、終盤では旋律を変奏します。',
    response:[[[.75,2,.45],[2.25,1,.6],[3.5,0,.35]],[[1,3,.5],[2.75,1,.75]],[[.25,0,.5],[1.75,2,.5],[3.25,3,.5]],[[1.25,2,.8],[3,0,.7]]],
    chords:[[38,54,57,61,64],[35,54,57,61,66],[43,54,57,59,62],[45,55,59,62,64],[42,52,57,61,64],[35,54,57,61,64],[40,55,59,62,66],[45,55,57,61,64]],
    bridge:[[43,54,57,59,64],[42,52,56,61,64],[35,54,57,61,66],[40,55,59,62,66],[43,54,57,62,66],[38,54,57,61,64],[40,55,59,62,66],[45,55,57,61,64]],
    sections:[[0,'Prelude',.35],[4,'Sunlit theme',.68],[12,'Pocket',.83],[20,'Open windows',1],[28,'Blue interlude',.4],[36,'Homeward',.78],[44,'Golden bloom',1],[52,'Afterglow',.55],[56,'Coda',.25]],
    melody:[[[0,0,1],[1.5,1,.5],[2.5,3,.5],[3,2,.8]],[[.5,1,.7],[2,0,1.6]],[[0,2,.8],[1.5,3,.4],[2,4,.7],[3,2,.8]],[[0,1,1.4],[2.5,0,1]],[[.5,0,.6],[1.5,2,.6],[2.5,3,1]],[[0,4,1],[1.5,3,.5],[2.5,1,1]],[[0,2,.8],[1,1,.6],[2.5,0,1]],[[.5,1,1],[2,0,1.7]]]},
  {id:'tide',title:'A Quiet Tide',artist:'aura sounds',album:'QUIET\nTIDES',art:'art-tide',length:214,tempo:64,bars:56,key:'C minor / E♭ major',style:'Tidal chamber ambient',seed:83,swing:.025,
    detail:'フェルト風ピアノ、弓で擦るような弦、息を含むフルート、ガラスの倍音。呼吸の間と波の遠近を作り、水平線の場面だけ弦の対旋律が開きます。',
    response:[[[.5,0,2.7]],[[1.5,2,1.8]],[[0,1,1.8],[2.5,3,1.2]],[[.75,2,2.7]]],
    chords:[[36,55,58,62,63],[44,55,58,60,63],[39,55,58,62,65],[46,53,58,60,62],[41,56,60,63,67],[36,55,58,62,67],[44,55,58,60,63],[43,53,59,62,65]],
    bridge:[[44,55,58,60,63],[46,53,58,62,65],[39,55,58,62,65],[48,55,58,62,67],[41,56,60,63,67],[44,55,58,60,63],[38,53,56,60,65],[43,53,59,62,65]],
    sections:[[0,'Shoreline',.25],[4,'First tide',.52],[12,'Undertow',.7],[20,'Silver water',.9],[28,'Still water',.25],[36,'Returning tide',.68],[44,'Horizon',1],[52,'Dissolve',.2]],
    melody:[[[0,3,1.7],[2.5,2,1]],[[1,0,2.3]],[[.5,1,1],[2,3,1.5]],[[0,2,2.5]],[[0,4,1.4],[2,3,1.6]],[[.5,1,2.5]],[[0,2,1.2],[2,0,1.5]],[[1,1,2.2]]]},
  {id:'orbit',title:'Somewhere, Softly',artist:'aura sounds',album:'SOFT\nORBIT',art:'art-orbit',length:186,tempo:82,bars:62,key:'E major / C♯ minor',style:'Orbital downtempo',seed:149,swing:.055,
    detail:'左右にほどけるアルペジオと、母音のように変化するシンセ。5ステップのアクセント、逆再生風の吸い込み、オクターブの応答を経て、最後はビートを少しずつ解きます。',
    response:[[[.75,0,.65],[2.25,2,.85]],[[1.25,3,.65],[3.25,1,.55]],[[.25,1,.65],[1.75,2,.45],[3.25,3,.5]],[[.75,2,.8],[2.75,0,.9]]],
    chords:[[40,56,59,63,66],[37,56,59,63,68],[45,56,59,61,64],[47,54,59,61,66],[44,54,59,63,66],[37,56,59,63,68],[42,57,61,64,68],[47,57,59,63,66]],
    bridge:[[37,56,59,63,68],[45,56,59,61,64],[40,56,59,63,66],[47,54,59,61,66],[42,57,61,64,68],[44,54,59,63,66],[45,56,59,61,64],[47,57,59,63,66]],
    sections:[[0,'Ignition',.32],[4,'Soft orbit',.65],[12,'Satellites',.82],[20,'Constellation',1],[28,'Weightless',.3],[36,'Re-entry',.72],[44,'Wide awake',1],[52,'Last light',.72],[60,'Landing',.2]],
    melody:[[[.5,0,.6],[1.5,2,.5],[2.5,3,1]],[[0,4,.8],[1.5,2,.6],[3,1,.6]],[[0,2,.5],[1,3,.7],[2.5,4,1]],[[.5,2,1],[2,0,1.5]],[[0,1,.7],[1.5,3,.7],[3,2,.7]],[[.5,4,.7],[2,3,.5],[3,1,.5]],[[0,2,1],[1.5,1,.5],[2.5,0,.8]],[[0,1,1.5],[2.5,0,1]]]}
];
const musicSection=(track,seconds)=>track.sections.filter(s=>s[0]*240/track.tempo<=seconds).at(-1)||track.sections[0];
// Stateless humanisation: a seek always lands on the same performance.
const musicRandom=(seed,index)=>{const x=Math.sin(seed*127.1+index*311.7)*43758.5453;return x-Math.floor(x);};
const scoreCache=new Map();
const musicCarryKinds=new Set(['pad','bass','keys','piano','glass','lead','arp','air','guitar','bow','flute','velvet','vibes','reverse']);
function musicScore(track){
  if(scoreCache.has(track.id))return scoreCache.get(track.id);
  const events=[],beat=60/track.tempo,barTime=beat*4;
  const tail={pad:1.8,keys:1.1,piano:1.6,lead:.6,glass:2.1,arp:.45,bass:.12,guitar:.65,bow:1.3,flute:.45,velvet:.8,vibes:1.4};
  function add(kind,bar,step,midi,duration,velocity,pan=0,expression={}){
    const index=events.length,r=musicRandom(track.seed,index),fraction=((step%1)+1)%1;
    const swing=fraction>=.5?track.swing*(fraction<.75?1:.5):0;
    const laidBack=track.id==='dusk'&&['keys','snare','rim'].includes(kind)?.012:0;
    const breath=track.id==='tide'&&musicCarryKinds.has(kind)?Math.sin(bar*.8+step*.4)*.022:0;
    const time=Math.max(0,(bar*4+step+swing)*beat+(r-.5)*.018+laidBack+breath);
    if(time>=track.length-2)return;
    events.push({kind,time,midi,duration:Math.min(duration*beat+(tail[kind]||0),track.length-time),velocity:velocity*(.91+r*.18),pan:Math.max(-.85,Math.min(.85,pan)),seed:index+track.seed,...expression});
  }
  for(let bar=0;bar<track.bars;bar++){
    const section=musicSection(track,bar*barTime+.001),energy=section[2],intro=bar<4;
    const bridge=bar>=28&&bar<36,outro=bar>=track.sections.at(-1)[0];
    const harmony=bridge?track.bridge:track.chords;
    const ci=Math.floor((bridge?bar-28:bar)/2)%8;
    // End with IV / V / I, rather than looping the opening drone to a fade.
    const coda=bar-track.sections.at(-1)[0];
    const codaLength=track.bars-track.sections.at(-1)[0];
    const codaChord=codaLength<=2?(coda===0?7:0):coda===0?2:coda===1?7:0;
    const chord=outro?track.chords[codaChord]:harmony[ci],next=harmony[(ci+1)%8];
    const dusk=track.id==='dusk',tide=track.id==='tide',finale=bar>=44&&!outro;
    const phraseLift=[.9,.98,1.04,.88][bar%4],turnaround=bar%8===7;
    const departing=bar>=52&&!outro;
    const space=bridge||intro||outro;
    if(bar%2===0||outro){
      chord.slice(1).forEach((n,i)=>add('pad',bar,i*.018,n,outro?2.2:7.2,.05*energy,(i-1.5)*.38));
      if((tide||intro||bridge||outro)&&bar%2===0)add('air',bar,0,0,7.9,tide?.03:.01,Math.sin(bar)*.4);
    }
    // Root / fifth / approach notes give the bass a phrase, not a static drone.
    if(tide){
      if(bar%2===0||outro)add('bass',bar,0,chord[0],outro?2.6:6.6,.13*energy);
    }else{
      const pattern=intro||bridge||outro?[[0,0,2.8]]:dusk?[[0,0,1.2],[1.75,0,.5],[2.5,7,.65],[3.5,0,.35]]:[[0,0,1.3],[1.5,12,.45],[2.75,0,.65]];
      pattern.forEach(([s,n,d])=>add('bass',bar,s,chord[0]+n,d,.23*energy));
      if(bar%2===1&&!intro&&!outro&&!bridge)add('bass',bar,3.75,next[0]-(next[0]>chord[0]?1:-1),.18,.1*energy);
    }
    const keyKind=tide?'piano':dusk?'keys':'lead';
    const comp=tide?[0]:space?[.1]:dusk?(bar%4===3?[.25,2.25]:bar%2?[.5,1.75,3.25]:[0,1.5,3.25]):(bar%2?[.75,2.5]:[.5,2.5]);
    if(!tide||bar%2===0||outro)comp.forEach((step,j)=>chord.slice(1).forEach((n,i)=>{
      add(keyKind,bar,step+i*(tide?.07:.018),n,outro?1.6:tide?3.2:j===0?1.1:.65,(tide?.075:dusk?.078:.045)*energy,((i-1.5)*.16)-.12);
    }));
    // Eight authored call/response motifs, reharmonised in the bridge. Leave breaths.
    if(!intro&&!outro&&(!bridge||bar%2===0)){
      const motif=track.melody[(bar-4+(finale?2:0)+track.melody.length)%track.melody.length];
      const upper=[...chord.slice(1).map(n=>n+12),chord[1]+24];
      motif.forEach(([step,degree,duration],i)=>{
        // Development uses inversion, phrase-end rests and short grace pickups.
        if(departing&&bar%2===1&&i===motif.length-1)return;
        const index=(bridge?4-degree:degree)%5,pitch=upper[index];
        const strength=(tide?.18:dusk?.15:.12)*(bridge?.7:1)*phraseLift*(i===0?1.04:.94);
        const delayed=finale&&bar%4===2?.125:0;
        if(finale&&i===0&&bar%4===0&&!tide)add(dusk?'keys':'lead',bar,step+delayed-.125,upper[(index+4)%5],.09,strength*.38,.04,{brightness:.75});
        add(tide?'piano':dusk?'keys':'lead',bar,step+delayed,pitch,duration*(turnaround?.83:1),strength,.12+Math.sin(bar+i)*.16,{brightness:bridge?.72:finale?1.12:1,scoop:!dusk&&!tide&&i===0?-32:0});
      });
      if(energy>=.9&&bar%4===3){
        [0,1,2].forEach((n,i)=>add('glass',bar,2+i*.5,upper[3-n],.65,.055,-.55+i*.5));
      }
    }else if(bar%2===0){
      add(tide?'glass':'keys',bar,.15,chord[3]+12,3,.11,.25);
      if(bar%4===2)add(tide?'piano':'glass',bar,2.5,chord[2]+12,1,.065,-.3);
    }
    // Secondary players answer in the gaps; never stack all timbres throughout.
    if(!intro&&!outro){
      const response=track.response[Math.floor(bar/2)%track.response.length];
      if(dusk&&bar>=12&&(!bridge||bar%2===1)){
        response.forEach(([step,degree,duration],i)=>{
          if(bar%2===0&&i>0)return;
          add('guitar',bar,step,chord[degree+1]+12,duration,.07*energy*phraseLift,-.4,{brightness:bar%2?.95:.75});
        });
        if(finale&&bar%4===1)[1,3].forEach((step,i)=>add('vibes',bar,step,chord[3-i]+12,1.1,.047,.42));
        if(bridge&&bar%2===0)chord.slice(1,4).forEach((n,i)=>add('guitar',bar,1+i*.11,n+12,2,.048,-.3));
      }else if(tide){
        if(bar>=12&&bar%2===0){
          const degree=[0,2,1,3][Math.floor(bar/2)%4];
          add('bow',bar,.25,chord[degree+1],6.6,.065*energy,-.35,{scoop:-9,brightness:finale?1.1:.75});
          if(finale)add('bow',bar,1.2,chord[(degree+2)%4+1]+12,5.4,.034,.42);
        }
        if((bar>=36||bridge)&&bar%4===1)response.forEach(([step,degree,duration])=>add('flute',bar,step,chord[degree+1]+12,duration,.071*phraseLift,.27,{scoop:-14}));
      }else if(!dusk&&!tide&&bar>=12){
        if(bar%2===1||bridge)response.forEach(([step,degree,duration])=>add('velvet',bar,step,chord[degree+1]+12,duration*(bridge?1.5:1),.058*(bridge?.85:energy),-.38,{scoop:-24,brightness:bridge?.65:1}));
        if(finale&&bar%4===2)[.25,1.75,3.25].forEach((step,i)=>add('vibes',bar,step,chord[1+(3-i)]+24,.42,.023,(i-1)*.55));
      }
    }
    if(outro&&bar===track.bars-1){
      const tonic=track.chords[0];
      [3,2,1].forEach((degree,i)=>add(tide?'piano':dusk?'guitar':'velvet',bar,.5+i*.8,tonic[degree]+12,2.3-i*.35,.075-i*.012,(i-1)*.2));
    }
    if(!dusk&&(!intro||bar>=2)&&!outro){
      const steps=tide?[.75,2.25,3.5]:bridge?[.5,2.5]:[0,.5,1,1.5,2,2.5,3,3.5];
      steps.forEach((s,i)=>{
        if(tide&&bar%2===1&&i===2)return;
        if(departing&&i%2===1)return;
        const order=finale?[3,1,2,0,1,3,0,2]:[0,2,1,3,2,0,3,1],n=chord[1+order[(i+bar%4)%8]]+(tide?12:12+(bar%8===7&&i>5?12:0));
        const accent=!tide&&(bar*8+i)%5===0?1.18:.88;
        add(tide?'glass':'arp',bar,s,n,tide?1.5:.35,(tide?.034:.054)*energy*accent,Math.sin((bar*8+i)*1.7)*.65,{brightness:bridge?.65:1});
      });
    }
    // Three distinct rhythm sections, with ghost notes and end-of-phrase fills.
    if(!intro&&!outro&&!bridge){
      if(tide){
        if(bar%2===0)add('kick',bar,0,0,.32,.1*energy);
        if(bar%2===1)add('brush',bar,2.1,0,.8,.055*energy,-.35);
        [1.5,3.5].forEach(s=>add('shaker',bar,s,0,.12,.028*energy,.45));
      }else{
        const kicks=dusk?(bar%4===3?[0,2.5]:bar%2?[0,1.75,2.5,3.5]:[0,1.75,2.5]):(bar%4===3?[0,1.5,3.25]:[0,1.5,2.75]);
        kicks.filter((s,i)=>!departing||i<2).forEach((s,i)=>add('kick',bar,s,0,.38,(i===0?.46:.29)*energy));
        (dusk?[1,3]:[2]).forEach(s=>{add(dusk&&bar<20?'rim':'snare',bar,s+.018,0,.22,.16*energy,.08);if(bar>=20&&!departing)add('clap',bar,s+.045,0,.18,.058*energy,-.15);});
        if(bar%2===1)add('snare',bar,dusk?2.75:3.75,0,.13,.04*energy,-.2);
        for(let i=0;i<8;i++){
          if(departing&&i%2===1)continue;
          add(finale&&i===0?'ride':'hat',bar,i*.5,0,finale&&i===0?.7:i===7&&bar%4===3?.3:.075,(i%2?.054:.033)*energy,i%2?.34:-.26);
        }
        if(energy>=.8&&!departing)for(let i=0;i<4;i++)add('shaker',bar,.25+i,0,.09,.027*energy,-.5);
        if(dusk&&bar%4===2)add('brush',bar,2.2,0,.55,.039,.48);
        if(!dusk&&finale&&bar%4===3)[3.125,3.375,3.625].forEach((s,i)=>add('hat',bar,s,0,.055,.025+i*.005,-.5+i*.35));
      }
      if(bar%8===7){
        [3.25,3.5,3.75].forEach((s,i)=>add(tide?'glass':'tom',bar,s,tide?chord[4]+12:45-i*3,.22,tide?.04:.075+i*.015,(i-1)*.45));
      }
    }
    if(bar>0&&track.sections.some(s=>s[0]===bar)&&!outro){
      add('swell',bar-1,2,0,2,bridge?.025:.043,-.3);
      add('reverse',bar-1,2.5,chord[3]+12,1.45,.049,.35);
      if(!bridge)add('chime',bar,0,chord[4]+12,2,.035,.5);
    }
  }
  events.sort((a,b)=>a.time-b.time);scoreCache.set(track.id,events);return events;
}

// Each playback owns its complete graph, including effect tails. Disposing a
// session cannot leak an old track's reverb into a seek or the next track.
const musicAudioCache=new WeakMap();
class OriginalMusicEngine{
  constructor(context,track,destination){
    this.context=context;this.track=track;this.nodes=[];this.modulators=[];this.voices=new Set();this.disposed=false;
    const c=context,node=n=>(this.nodes.push(n),n);
    this.output=node(c.createGain());this.output.gain.value=.8;
    const highpass=node(c.createBiquadFilter());highpass.type='highpass';highpass.frequency.value=28;
    const glue=node(c.createDynamicsCompressor());glue.threshold.value=-19;glue.knee.value=15;glue.ratio.value=2.4;glue.attack.value=.025;glue.release.value=.22;
    const ceiling=node(c.createDynamicsCompressor());ceiling.threshold.value=-3;ceiling.knee.value=0;ceiling.ratio.value=20;ceiling.attack.value=.002;ceiling.release.value=.09;
    this.color=node(c.createBiquadFilter());this.color.type='lowpass';this.color.frequency.value=9200;this.color.Q.value=.45;
    this.output.connect(highpass);highpass.connect(this.color);this.color.connect(glue);glue.connect(ceiling);ceiling.connect(destination);
    const convolver=node(c.createConvolver()),verbTone=node(c.createBiquadFilter()),verb=node(c.createGain());
    const tide=track.id==='tide',seconds=tide?3.8:track.id==='orbit'?2.8:1.8;
    // Reuse immutable buffers across seeks; at most three entries per context.
    if(!musicAudioCache.has(c))musicAudioCache.set(c,new Map());
    const cache=musicAudioCache.get(c);
    if(!cache.has(track.id)){
      const impulse=c.createBuffer(2,Math.ceil(c.sampleRate*seconds),c.sampleRate);
      for(let ch=0;ch<2;ch++){
        const data=impulse.getChannelData(ch);let low=0;
        for(let i=0;i<data.length;i++){const white=musicRandom(track.seed+ch,i)*2-1;low=low*.6+white*.4;data[i]=low*Math.pow(1-i/data.length,tide?2.6:3.5)*(i<c.sampleRate*.018?0:1);}
      }
      const noise=c.createBuffer(1,c.sampleRate*2,c.sampleRate),data=noise.getChannelData(0);
      for(let i=0;i<data.length;i++)data[i]=musicRandom(track.seed,i)*2-1;
      cache.set(track.id,{impulse,noise});
    }
    convolver.buffer=cache.get(track.id).impulse;verbTone.type='lowpass';verbTone.frequency.value=tide?4200:5600;verb.gain.value=tide?.36:.22;
    convolver.connect(verbTone);verbTone.connect(verb);verb.connect(this.output);this.reverb=convolver;
    const delayL=node(c.createDelay(2)),delayR=node(c.createDelay(2)),feedback=node(c.createGain()),delayTone=node(c.createBiquadFilter());
    const panL=node(c.createStereoPanner()),panR=node(c.createStereoPanner()),echo=node(c.createGain());
    delayL.delayTime.value=60/track.tempo*.75;delayR.delayTime.value=60/track.tempo*.5;
    feedback.gain.value=tide?.2:.28;delayTone.type='lowpass';delayTone.frequency.value=3000;
    panL.pan.value=-.72;panR.pan.value=.72;echo.gain.value=track.id==='orbit'?.26:.13;
    delayL.connect(panL);panL.connect(echo);delayL.connect(delayR);delayR.connect(panR);panR.connect(echo);
    delayR.connect(delayTone);delayTone.connect(feedback);feedback.connect(delayL);echo.connect(this.output);this.delay=delayL;
    this.effects={verb,echo};this.buses={};
    for(const [name,level,send,echoSend] of [['keys',.9,.22,.13],['pad',.65,.38,0],['bass',.82,.015,0],['drums',.68,.07,0],['air',.44,.36,0],['lead',.8,.3,.3],['detail',.72,.32,.16]]){
      const bus=node(c.createGain()),wet=node(c.createGain()),echoGain=node(c.createGain());bus.gain.value=level;wet.gain.value=send;echoGain.gain.value=echoSend;
      const eq=node(c.createBiquadFilter());eq.type='highpass';eq.frequency.value={keys:120,pad:170,bass:28,drums:35,air:240,lead:160,detail:190}[name];eq.Q.value=.6;
      bus.connect(eq);eq.connect(this.output);eq.connect(wet);wet.connect(convolver);eq.connect(echoGain);echoGain.connect(delayL);this.buses[name]=bus;
    }
    // Slow, shallow stereo ensemble. These two LFOs are session-owned, not
    // spawned per chord, and both dry and wet paths retain mono compatibility.
    [-1,1].forEach((side,i)=>{
      const chorus=node(c.createDelay(.08)),lfo=node(c.createOscillator()),depth=node(c.createGain()),wet=node(c.createGain()),pan=node(c.createStereoPanner());
      chorus.delayTime.value=.018+i*.006;lfo.frequency.value=.16+i*.047;depth.gain.value=.0018;wet.gain.value=tide?.075:.095;pan.pan.value=side*.65;
      this.buses.pad.connect(chorus);chorus.connect(wet);wet.connect(pan);pan.connect(this.output);
      lfo.connect(depth);depth.connect(chorus.delayTime);lfo.start();this.modulators.push(lfo);
    });
    this.noise=cache.get(track.id).noise;
  }
  timeline(start,offset){
    const end=start+this.track.length-offset,fade=Math.max(start,end-4);
    const gain=this.output.gain;gain.cancelScheduledValues(start);gain.setValueAtTime(.0001,start);
    gain.linearRampToValueAtTime(.8*Math.min(1,(this.track.length-offset)/4),Math.min(start+.06,end));
    if(fade>start+.06)gain.setValueAtTime(.8,fade);
    gain.linearRampToValueAtTime(.0001,end);
    const ambience=(section,when,immediate=false)=>{
      const energy=section[2],tide=this.track.id==='tide';
      const values=[[this.effects.verb.gain,(tide?.33:.2)+(1-energy)*.12],[this.effects.echo.gain,(this.track.id==='orbit'?.21:.1)+(1-energy)*.055],[this.color.frequency,(tide?6600:7600)+energy*1700]];
      values.forEach(([param,value])=>{if(immediate)param.setValueAtTime(value,when);else param.setTargetAtTime(value,when,.7);});
    };
    ambience(musicSection(this.track,offset),start,true);
    this.track.sections.forEach(section=>{const seconds=section[0]*240/this.track.tempo;if(seconds>offset)ambience(section,start+seconds-offset);});
  }
  schedule(event,time,offset=0){
    if(this.disposed)return;
    const c=this.context,kind=event.kind,duration=event.duration-offset;
    if(duration<.025)return;
    const sources=[],nodes=[],keep=n=>(nodes.push(n),n),amp=keep(c.createGain()),pan=keep(c.createStereoPanner());
    const tone=keep(c.createBiquadFilter());tone.type='lowpass';tone.Q.value=.55;
    const detail=['guitar','bow','flute','velvet','vibes','reverse'].includes(kind);
    const pitched=detail||['keys','piano','lead','glass','arp','pad','bass','chime'].includes(kind);
    const bus=kind==='pad'?'pad':kind==='bass'?'bass':detail?'detail':['air','swell'].includes(kind)?'air':!pitched?'drums':['lead','arp','glass','chime'].includes(kind)?'lead':'keys';
    const articulation=keep(c.createGain());articulation.gain.value=1;
    pan.pan.value=event.pan;amp.connect(articulation);articulation.connect(tone);tone.connect(pan);pan.connect(this.buses[bus]);
    const f=440*Math.pow(2,((event.midi||48)-69)/12),v=event.velocity;
    let attack=.009,release=Math.min(.12,duration*.25),level=v,sustain=.32;
    const oscillator=(type,freq,weight=1,detune=0,decay=0)=>{
      const o=keep(c.createOscillator()),g=keep(c.createGain());o.type=type;o.frequency.setValueAtTime(freq,time);
      o.detune.setValueAtTime(detune+(offset?0:event.scoop||0),time);if(event.scoop&&!offset)o.detune.linearRampToValueAtTime(detune,time+Math.min(.095,duration*.2));
      g.gain.setValueAtTime(weight*(decay?Math.exp(-offset/decay):1),time);
      if(decay)g.gain.exponentialRampToValueAtTime(.00001,time+Math.min(duration,decay*4));
      o.connect(g);g.connect(amp);sources.push(o);return o;
    };
    const noise=(filterType,freq,q=.7,weight=1,transient=0)=>{
      const source=keep(c.createBufferSource()),filter=keep(c.createBiquadFilter()),gain=keep(c.createGain());source.buffer=this.noise;source.loop=true;filter.type=filterType;filter.frequency.value=freq;filter.Q.value=q;
      gain.gain.setValueAtTime(offset&&transient?.00001:weight,time);if(transient)gain.gain.exponentialRampToValueAtTime(.00001,time+Math.min(duration,transient));
      source.connect(filter);filter.connect(gain);gain.connect(amp);sources.push(source);return filter;
    };
    const vibrato=(osc,rate,cents,delay=.15)=>{
      const lfo=keep(c.createOscillator()),depth=keep(c.createGain());lfo.frequency.value=rate;
      depth.gain.setValueAtTime(offset?cents:0,time);depth.gain.linearRampToValueAtTime(cents,time+Math.min(delay,duration*.25));
      lfo.connect(depth);depth.connect(osc.detune);sources.push(lfo);
    };
    tone.frequency.setValueAtTime(9000,time);
    if(kind==='keys'||kind==='piano'){
      // A decaying FM tine / hammer plus independently damped string partials.
      const carrier=oscillator('sine',f,.72),mod=keep(c.createOscillator()),index=keep(c.createGain());
      mod.frequency.value=f*(kind==='keys'?2:3.002);index.gain.setValueAtTime(f*(kind==='keys'?1.15:.28)*v,time);index.gain.exponentialRampToValueAtTime(.01,time+Math.min(duration,.65));mod.connect(index);index.connect(carrier.frequency);sources.push(mod);
      oscillator('sine',f*2.001,.2,0,.65);oscillator('sine',f*3.003,.065,0,.3);oscillator('sine',f*.999,.12);
      if(kind==='piano')noise('bandpass',1350,.65,.028,.035);
      attack=kind==='piano'?.01:.014;release=Math.min(kind==='piano'?1.5:.85,duration*.55);sustain=.16;
      tone.frequency.setValueAtTime(((kind==='piano'?2800:3800)+v*6000)*(event.brightness||1),time);
      if(kind==='keys'){
        // Multiplicative tremolo cannot bypass the note's amplitude envelope.
        const tremolo=keep(c.createOscillator()),depth=keep(c.createGain());tremolo.frequency.value=4.2;depth.gain.value=.085;tremolo.connect(depth);depth.connect(articulation.gain);sources.push(tremolo);
      }
    }else if(kind==='pad'){
      oscillator('triangle',f,.42,-5);oscillator('triangle',f,.42,5);oscillator('sine',f/2,.12);
      const lfo=keep(c.createOscillator()),depth=keep(c.createGain());lfo.frequency.value=.11+musicRandom(event.seed,2)*.12;depth.gain.value=260;lfo.connect(depth);depth.connect(tone.frequency);sources.push(lfo);
      attack=Math.min(1.5,duration*.3);release=Math.min(1.8,duration*.4);sustain=.8;
      tone.frequency.setValueAtTime(1000,time);tone.frequency.linearRampToValueAtTime(1800,time+duration*.5);tone.frequency.linearRampToValueAtTime(850,time+duration);
    }else if(kind==='guitar'){
      // Plucked-string partials lose high harmonics much faster than the body.
      oscillator('triangle',f,.58,-1.5,1.2);oscillator('sine',f*2,.22,1,.55);oscillator('sine',f*3.002,.11,0,.28);oscillator('sine',f*4.007,.045,0,.16);
      noise('bandpass',1900,1.2,.075,.022);attack=.005;sustain=.24;release=Math.min(.65,duration*.45);
      tone.frequency.setValueAtTime((2900+v*7000)*(event.brightness||1),time);tone.frequency.exponentialRampToValueAtTime(1200,time+duration);
    }else if(kind==='bow'){
      const body=oscillator('sawtooth',f,.22,-3);oscillator('triangle',f,.48,3);oscillator('sine',f*2,.1);noise('bandpass',2400,.8,.022);
      vibrato(body,4.8,5,.45);attack=Math.min(.65,duration*.23);release=Math.min(1.25,duration*.32);sustain=.78;
      tone.frequency.setValueAtTime(1050*(event.brightness||1),time);tone.frequency.linearRampToValueAtTime(2100*(event.brightness||1),time+duration*.45);tone.frequency.linearRampToValueAtTime(850,time+duration);
    }else if(kind==='flute'){
      const body=oscillator('sine',f,.84);oscillator('sine',f*2,.13);oscillator('sine',f*3,.045);noise('bandpass',f*2,.65,.05);
      vibrato(body,5.1,7,.3);attack=.085;sustain=.72;release=Math.min(.42,duration*.3);tone.frequency.setValueAtTime(Math.min(6000,f*4),time);
    }else if(kind==='velvet'){
      oscillator('sawtooth',f,.3,-3);oscillator('triangle',f,.42,3);
      // Parallel formant bands morph from an "oo" to an "ah" without speech.
      const vowel=keep(c.createBiquadFilter());vowel.type='bandpass';vowel.Q.value=2.1;
      tone.type='bandpass';tone.Q.value=1.3;tone.frequency.setValueAtTime(450,time);tone.frequency.linearRampToValueAtTime(780*(event.brightness||1),time+duration*.6);
      vowel.frequency.setValueAtTime(1050,time);vowel.frequency.linearRampToValueAtTime(1750,time+duration*.65);
      const vowelGain=keep(c.createGain());vowelGain.gain.value=.32;articulation.connect(vowel);vowel.connect(vowelGain);vowelGain.connect(pan);
      attack=.075;sustain=.58;release=Math.min(.75,duration*.42);
    }else if(kind==='vibes'){
      oscillator('sine',f,.72,0,1.5);oscillator('sine',f*4,.12,0,.35);oscillator('sine',f*10,.035,0,.12);
      const lfo=keep(c.createOscillator()),depth=keep(c.createGain());lfo.frequency.value=5.6;depth.gain.value=.14;lfo.connect(depth);depth.connect(articulation.gain);sources.push(lfo);
      attack=.006;sustain=.22;release=Math.min(1.2,duration*.6);tone.frequency.setValueAtTime(5900,time);
    }else if(kind==='reverse'){
      oscillator('sine',f,.65);oscillator('triangle',f*2,.15);noise('bandpass',2200,.5,.035);
      attack=duration*.78;sustain=.85;release=duration*.12;tone.frequency.setValueAtTime(700,time);tone.frequency.linearRampToValueAtTime(4800,time+duration*.8);
    }else if(kind==='lead'||kind==='arp'){
      const body=oscillator('sawtooth',f,.36,-4);oscillator('triangle',f,.55,4);oscillator('sine',f/2,.08);
      if(kind==='lead')vibrato(body,4.3,3,.25);
      attack=.013;sustain=kind==='arp'?.13:.28;release=Math.min(.55,duration*.5);
      tone.frequency.setValueAtTime(Math.min(9000,f*9*(event.brightness||1)),time);tone.frequency.exponentialRampToValueAtTime(Math.max(500,f*1.5),time+duration);tone.Q.value=1.2;
    }else if(kind==='glass'||kind==='chime'){
      oscillator('sine',f,.65);oscillator('sine',f*2.756,.13);oscillator('sine',f*4.07,.055);
      attack=.004;sustain=.1;release=Math.min(2,duration*.65);tone.frequency.setValueAtTime(7000,time);
    }else if(kind==='bass'){
      const dusk=this.track.id==='dusk',tide=this.track.id==='tide';
      const body=oscillator('sine',f,.76);oscillator('triangle',f,dusk?.29:.17);oscillator('sine',f*2,dusk?.13:.07,0,dusk?.24:0);
      if(dusk){noise('bandpass',850,.65,.035,.02);oscillator('sine',f*3,.035,0,.12);}
      if(tide)vibrato(body,3.6,2,.6);
      tone.frequency.setValueAtTime(dusk?850:tide?480:620,time);attack=dusk?.01:tide?.06:.018;sustain=dusk?.44:.66;release=Math.min(tide?.35:.17,duration*.3);
    }else if(kind==='kick'){
      const o=oscillator('sine',125,.9);o.frequency.exponentialRampToValueAtTime(this.track.id==='tide'?42:48,time+.13);
      tone.frequency.setValueAtTime(1200,time);attack=.005;sustain=.07;release=duration*.65;
      const bass=this.buses.bass.gain;bass.setValueAtTime(.82,time);bass.linearRampToValueAtTime(this.track.id==='tide'?.74:.56,time+.012);bass.exponentialRampToValueAtTime(.82,time+.2);
    }else if(kind==='tom'){
      const o=oscillator('sine',f*1.7,.85);o.frequency.exponentialRampToValueAtTime(f,time+.1);tone.frequency.setValueAtTime(900,time);sustain=.06;release=duration*.65;
    }else if(kind==='rim'){
      oscillator('sine',830,.58,0,.02);oscillator('triangle',1670,.2,0,.012);noise('bandpass',2300,1.3,.13,.022);
      attack=.003;sustain=.015;release=duration*.75;tone.frequency.setValueAtTime(4800,time);
    }else if(kind==='ride'){
      [1,1.342,1.879,2.431].forEach((ratio,i)=>oscillator('square',2300*ratio,.045/(i+1),0,.25));noise('bandpass',8100,.55,.22);
      attack=.004;sustain=.1;release=duration*.7;tone.frequency.setValueAtTime(9300,time);
    }else if(kind==='snare'||kind==='clap'){
      noise('bandpass',kind==='clap'?1700:2400,.8);if(kind==='snare')oscillator('triangle',185,.35,0,.045);
      if(kind==='clap'&&!offset){
        [0,.011,.023].forEach((dt,i)=>{articulation.gain.setValueAtTime(i===0?.3:.18,time+dt);articulation.gain.linearRampToValueAtTime(.95-i*.15,time+dt+.004);});
        articulation.gain.exponentialRampToValueAtTime(.22,time+Math.min(.11,duration));
      }
      attack=.003;sustain=.12;release=duration*.7;tone.frequency.setValueAtTime(7000,time);
    }else if(kind==='hat'||kind==='shaker'||kind==='brush'){
      noise(kind==='brush'?'highpass':'bandpass',kind==='hat'?7400:kind==='brush'?2200:6200,.7);attack=kind==='brush'?.05:.003;sustain=.12;release=duration*.65;
      tone.frequency.setValueAtTime(kind==='brush'?6200:10000,time);
    }else{
      const filter=noise('bandpass',550,.6);attack=duration*(kind==='swell'?.65:.4);release=duration*(kind==='swell'?.15:.3);sustain=.85;
      filter.frequency.setValueAtTime(350,time);filter.frequency.exponentialRampToValueAtTime(kind==='swell'?4200:1100,time+duration*.6);filter.frequency.exponentialRampToValueAtTime(400,time+duration);
      if(kind==='air'&&this.track.id==='tide'){
        // A second, very quiet foam band follows a different swell envelope.
        const foam=noise('highpass',3200,.6,.11);foam.frequency.setValueAtTime(4600,time);foam.frequency.linearRampToValueAtTime(2800,time+duration*.65);foam.frequency.linearRampToValueAtTime(5000,time+duration);
      }
    }
    // A carried note starts softly at its decayed level instead of re-attacking.
    if(['pad','bow','air','velvet'].includes(kind)){
      const drift=keep(c.createOscillator()),depth=keep(c.createGain());drift.frequency.value=.08+musicRandom(event.seed,3)*.1;depth.gain.value=.075;drift.connect(depth);depth.connect(pan.pan);sources.push(drift);
    }
    if(offset>0){
      attack=.025;
      level*=kind==='reverse'?Math.max(.2,Math.min(1,offset/event.duration)):Math.exp(-offset/(['pad','bow','air'].includes(kind)?15:kind==='bass'?4:1.8));
    }
    const swelling=['reverse','swell','air'].includes(kind);
    attack=Math.min(attack,duration*(swelling?.8:.25));release=Math.min(release,duration*.65);
    const hold=Math.max(time+attack+.001,time+duration-release);
    amp.gain.setValueAtTime(.0001,time);amp.gain.linearRampToValueAtTime(Math.max(.0002,level),time+attack);
    amp.gain.exponentialRampToValueAtTime(Math.max(.00015,level*sustain),hold);amp.gain.exponentialRampToValueAtTime(.0001,time+duration);
    const voice={sources,nodes};this.voices.add(voice);let ended=0;
    sources.forEach(source=>{
      source.onended=()=>{if(++ended===sources.length){nodes.forEach(n=>n.disconnect());this.voices.delete(voice);}};
      if(source.buffer)source.start(time,musicRandom(event.seed,8));else source.start(time);
      source.stop(time+duration+.02);
    });
  }
  dispose(){
    if(this.disposed)return;this.disposed=true;
    const c=this.context,t=c.currentTime;
    this.output.gain.cancelScheduledValues(t);this.output.gain.setTargetAtTime(.0001,t,.008);
    for(const modulator of this.modulators){try{modulator.stop(t+.04);}catch{/* Already stopped. */}}this.modulators=[];
    for(const voice of this.voices)for(const source of voice.sources){try{source.stop(t+.04);}catch{/* Already ended. */}}
    // Disconnect feedback and reverb too; never let old effect tails accumulate.
    setTimeout(()=>{for(const voice of this.voices)voice.nodes.forEach(n=>n.disconnect());this.voices.clear();this.nodes.forEach(n=>n.disconnect());this.nodes=[];this.noise=null;},70);
  }
}
const M=A.music={track:tracks[0],playing:false,position:0,startedAt:0,context:null,gain:null,scheduler:null,beat:0,liked:A.load('musicLikes',[])};
const fmt=s=>`${Math.floor(s/60)}:${String(Math.floor(s%60)).padStart(2,'0')}`;
// Original local SVG covers: unique paint IDs, no downloads or generated-image dependencies.
let musicArtSerial=0;
A.musicArtwork=(track='dusk',record=false)=>{
  const id=`music-cover-${++musicArtSerial}`,t=tracks.find(t=>t.id===track)||tracks[0],tide=t.id==='tide',orbit=t.id==='orbit';
  const colors=tide?['#d8e5df','#7fa8b1','#244b67']:orbit?['#e0cbe6','#867fac','#353652']:['#f8d7a6','#d2957f','#555f67'];
  return `<svg class="music-cover-art ${record?'music-record-art':''}" viewBox="0 0 320 240" aria-hidden="true" focusable="false"><defs><linearGradient id="${id}-sky" x2=".6" y2="1"><stop stop-color="${colors[0]}"/><stop offset=".6" stop-color="${colors[1]}"/><stop offset="1" stop-color="${colors[2]}"/></linearGradient><radialGradient id="${id}-sun"><stop stop-color="#fff9df"/><stop offset="1" stop-color="${colors[0]}"/></radialGradient><linearGradient id="${id}-vinyl" x2="1" y2="1"><stop stop-color="#444951"/><stop offset=".3" stop-color="#191d23"/><stop offset=".55" stop-color="#454952"/><stop offset=".7" stop-color="#111821"/><stop offset="1" stop-color="#333b45"/></linearGradient><clipPath id="${id}-clip"><rect x="10" y="10" width="300" height="220" rx="14"/></clipPath></defs>
  <g clip-path="url(#${id}-clip)"><rect x="10" y="10" width="300" height="220" fill="url(#${id}-sky)"/><circle cx="${orbit?162:224}" cy="${orbit?100:81}" r="${orbit?56:36}" fill="url(#${id}-sun)"/>
  ${orbit?'<ellipse cx="162" cy="100" rx="115" ry="24" transform="rotate(-24 162 100)" fill="none" stroke="#eee3f0" stroke-opacity=".55" stroke-width="2"/><circle cx="77" cy="65" r="2" fill="#fff5ec"/><circle cx="257" cy="46" r="1.5" fill="#fff5ec"/>':`<path d="M0 154Q70 ${tide?109:57} 142 142T326 98v160H0Z" fill="${colors[2]}" opacity=".5"/><path d="M0 198Q79 140 170 168T325 139v120H0Z" fill="${colors[2]}" opacity=".8"/><path d="M-5 208q90-39 170-9t164-8" fill="none" stroke="${colors[0]}" stroke-opacity=".5" stroke-width="1.5"/>`}
  <g stroke="#fff" stroke-opacity=".08">${Array.from({length:18},(_,i)=>`<path d="M10 ${18+i*12}h300"/>`).join('')}</g></g><rect x="10.5" y="10.5" width="299" height="219" rx="14" fill="none" stroke="#fff" stroke-opacity=".4"/>
  ${record?`<g class="vinyl-disc"><circle cx="213" cy="135" r="91" fill="url(#${id}-vinyl)" stroke="#798087" stroke-width="1.5"/><g fill="none" stroke="#b7bec6" stroke-opacity=".17">${Array.from({length:12},(_,i)=>`<circle cx="213" cy="135" r="${39+i*4}"/>`).join('')}</g><path d="M154 80a80 80 0 0 1 113-5M159 194a80 80 0 0 0 111-4" fill="none" stroke="#d8e0e8" stroke-opacity=".2" stroke-width="7"/><circle cx="213" cy="135" r="32" fill="url(#${id}-sky)"/><circle cx="213" cy="135" r="26" fill="none" stroke="#ffffff55"/><path d="M200 123h26m-26 5h26m-21 21h16" stroke="#fff" stroke-opacity=".5"/><circle cx="213" cy="135" r="6" fill="#252b33" stroke="#a0a5a8"/><circle cx="212" cy="134" r="2" fill="#ecf0eb"/></g>`:''}</svg>`;
};
A.musicLibraryPreview=()=>`<button class="music-originals-entry" data-action="musicOriginals"><span class="music-originals-heading"><strong>オリジナル音源</strong><small>3曲 · Original arrangements</small>${icon('chevronRight')}</span><span class="music-originals-covers">${tracks.map(t=>`<span>${A.musicArtwork(t.id)}<strong>${t.title}</strong><small>${fmt(t.length)}</small></span>`).join('')}</span></button>`;
const art=(t,extra='')=>`<div class="album-art ${t.art} ${extra}">${A.musicArtwork(t.id,extra==='player-art')}<span>${t.album.replace('\n','<br>')}</span></div>`;
M.elapsed=()=>M.playing&&M.context?Math.min(M.track.length,M.position+Math.max(0,M.context.currentTime-M.audioStartedAt)):M.position;
M.setVolume=()=>{if(M.gain&&M.context)M.gain.gain.setTargetAtTime(Math.max(0,Math.min(100,Number(A.settings.volume)||0))/100,M.context.currentTime,.06);};
function audioInit(){
  if(!M.context||M.context.state==='closed'){
    const Audio=window.AudioContext||window.webkitAudioContext;if(!Audio)throw Error('unsupported');
    M.context=new Audio();M.gain=M.context.createGain();M.gain.gain.value=0;M.gain.connect(M.context.destination);
    M.context.onstatechange=()=>{if(M.playing&&M.context.state==='interrupted')M.pause();};
  }
}
let musicSession=0;
function scheduleMusic(){
  if(!M.playing||!M.engine)return;
  const now=M.context.currentTime,score=M.score;
  // A throttled tab skips stale attacks rather than firing a backlog at once.
  while(M.cursor<score.length){
    const event=score[M.cursor],when=M.audioStartedAt+event.time-M.position;
    if(when>now+.18)break;M.cursor++;
    if(when>=now-.03)M.engine.schedule(event,Math.max(now+.002,when));
  }
  if(M.elapsed()>=M.track.length)M.next(1);
}
M.start=()=>{
  if(M.playing)return;
  const session=++musicSession;
  try{
    audioInit();if(M.position>=M.track.length)M.position=0;
    M.position=Math.max(0,Math.min(M.track.length,Number(M.position)||0));
    M.engine?.dispose();M.engine=new OriginalMusicEngine(M.context,M.track,M.gain);
    M.score=musicScore(M.track);M.audioStartedAt=M.context.currentTime+.045;M.startedAt=Date.now();
    M.engine.timeline(M.audioStartedAt,M.position);M.cursor=0;
    while(M.cursor<M.score.length&&M.score[M.cursor].time<M.position){
      const e=M.score[M.cursor++];
      if(e.time+e.duration>M.position&&musicCarryKinds.has(e.kind))M.engine.schedule(e,M.audioStartedAt,M.position-e.time);
    }
    M.playing=true;M.setVolume();scheduleMusic();clearInterval(M.scheduler);M.scheduler=setInterval(scheduleMusic,25);
    $('#phone-screen').classList.add('playing');refreshMusic();
    Promise.resolve(M.context.resume()).catch(()=>{if(session===musicSession){M.pause();A.toast('音声を開始できません。もう一度再生してください');}});
  }catch{M.pause();A.toast('このブラウザでは音楽再生を利用できません');}
};
M.pause=()=>{
  musicSession++;M.position=M.elapsed();M.playing=false;clearInterval(M.scheduler);M.scheduler=null;
  M.engine?.dispose();M.engine=null;
  $('#phone-screen').classList.remove('playing');refreshMusic();
};
M.seek=seconds=>{
  const playing=M.playing;M.pause();M.position=Math.max(0,Math.min(M.track.length,Number(seconds)||0));
  if(playing)M.start();M.tick();
};
window.addEventListener('pagehide',()=>M.pause());
M.toggle=()=>M.playing?M.pause():M.start();
M.select=(id,play=true)=>{const next=tracks.find(t=>t.id===id);if(!next)return;if(M.playing)M.pause();M.track=next;M.position=0;M.beat=0;if(play)M.start();};
M.next=step=>{M.select(tracks[(tracks.indexOf(M.track)+step+tracks.length)%tracks.length].id,true);if(A.current==='music')music(musicPage);if(!$('#overlay').hidden&&$('#control-volume'))A.controls();};
M.tick=()=>{if(M.playing&&M.elapsed()>=M.track.length)M.next(1);const progress=$('#music-progress');if(progress&&document.activeElement!==progress)progress.value=M.elapsed();if($('#music-elapsed'))$('#music-elapsed').textContent=fmt(M.elapsed());if($('#music-remaining'))$('#music-remaining').textContent='−'+fmt(M.track.length-M.elapsed());if($('#music-section'))$('#music-section').textContent=musicSection(M.track,M.elapsed())[1];};
let musicPage='home';
function music(arg){musicPage=arg==='player'?'player':'home';A.statusTheme(true);$('#app-screen').classList.add('music-app');if(musicPage==='player')return player();A.view(A.nav('ミュージック',`<button data-action="musicCatalogue">検索</button><button data-action="musicFavorites" aria-label="お気に入り">${icon('heart')}</button>`)+`<div class="app-content"><h1 class="app-title">音源</h1><div class="music-hero">${A.musicArtwork('dusk',true)}<div class="music-feature-title"><strong>Golden Hour</strong><span>aura sounds</span></div><button data-action="musicPlayTrack" data-id="dusk" aria-label="Golden Hourを再生">${icon('play')}</button></div><div class="album-grid">${tracks.slice(0,2).map(t=>`<button class="album-card" data-action="musicPlayTrack" data-id="${t.id}">${art(t)}<h3>${t.title}</h3><p>${t.artist}</p></button>`).join('')}</div>${tracks.map(t=>`<button class="track-row" data-action="musicPlayTrack" data-id="${t.id}">${art(t)}<div><strong>${t.title}</strong><small>${t.style} · ${t.tempo} BPM</small></div><span>${fmt(t.length)}</span></button>`).join('')}<p class="setting-description" style="color:#777984;margin-top:20px">3つのオリジナル・アレンジ。全編ブラウザ内で演奏 · 外部音声のダウンロードなし</p></div>${miniPlayer()}`);}
function miniPlayer(){return `<div class="music-mini"><div class="mini-art ${M.track.art}"></div><button data-action="musicPlayer">${M.track.title}<small>${M.track.artist}</small></button><button data-action="musicToggle" aria-label="再生・一時停止" id="mini-play">${icon(M.playing?'pause':'play')}</button><button data-action="musicNext" aria-label="次の曲">${icon('next')}</button></div><div style="height:24px;background:#252329;flex-shrink:0"></div>`;}
function player(){const t=M.track;A.view(A.nav('再生中',`<button data-action="musicInfo" aria-label="音源について">···</button>`,'musicHome','閉じる')+`<div class="player-content">${art(t,'player-art')}<div class="player-info"><div><h2>${t.title}</h2><p>${t.artist}</p></div><button data-action="musicLike" id="music-like" aria-label="お気に入り" aria-pressed="${M.liked.includes(t.id)}">${M.liked.includes(t.id)?'♥':'♡'}</button></div><input class="music-progress" type="range" min="0" max="${t.length}" step="1" value="${M.elapsed()}" id="music-progress" aria-label="再生位置"><div class="progress-labels"><span id="music-elapsed">${fmt(M.elapsed())}</span><span id="music-remaining">−${fmt(t.length-M.elapsed())}</span></div><div class="player-controls"><button data-action="musicPrevious" aria-label="前の曲">${icon('previous')}</button><button class="main-play" data-action="musicToggle" id="player-play" aria-label="再生・一時停止">${icon(M.playing?'pause':'play')}</button><button data-action="musicNext" aria-label="次の曲">${icon('next')}</button></div><div style="text-align:center;font-size:11px;line-height:1.8;opacity:.75;margin:12px 0" aria-label="楽曲構成"><span id="music-section">${musicSection(t,M.elapsed())[1]}</span><br>${t.tempo} BPM · ${t.key}<br>${t.style}</div><label class="player-volume">${icon('volume')}<input type="range" id="music-volume" min="0" max="100" value="${A.settings.volume}" aria-label="音量">${icon('volume')}</label></div>`);$('#music-progress').oninput=e=>M.seek(+e.target.value);$('#music-volume').oninput=e=>{A.settings.volume=+e.target.value;M.setVolume();A.save('settings',A.settings);};}
function refreshMusic(){if($('#mini-play'))$('#mini-play').innerHTML=icon(M.playing?'pause':'play');if($('#player-play'))$('#player-play').innerHTML=icon(M.playing?'pause':'play');}
A.apps.music.render=music;A.actions.musicHome=()=>music('home');A.actions.musicPlayer=()=>music('player');A.actions.musicToggle=M.toggle;A.actions.musicNext=()=>M.next(1);A.actions.musicPrevious=()=>M.next(-1);A.actions.musicPlayTrack=el=>{M.select(el.dataset.id,true);music('player');};A.actions.musicLike=()=>{M.liked=M.liked.includes(M.track.id)?M.liked.filter(x=>x!==M.track.id):[...M.liked,M.track.id];A.save('musicLikes',M.liked);$('#music-like').textContent=M.liked.includes(M.track.id)?'♥':'♡';$('#music-like').setAttribute('aria-pressed',M.liked.includes(M.track.id));};A.actions.musicInfo=()=>A.toast(`${M.track.title} — ${M.track.detail}`,true);
A.actions.musicFavorites=()=>{A.view(A.nav('お気に入り','','musicHome','戻る')+`<div class="app-content">${tracks.filter(t=>M.liked.includes(t.id)).map(t=>`<button class="track-row" data-action="musicPlayTrack" data-id="${t.id}">${art(t)}<div><strong>${t.title}</strong><small>${t.artist}</small></div>${icon('play','style="width:18px"')}</button>`).join('')||A.empty('お気に入りなし','heart')}</div>${miniPlayer()}`);};
// Voice Studio: local-only audio, transactional IndexedDB, recoverable failed writes.
const VOICE_DB='aura-voice-studio',VOICE_LIMIT=50*1024*1024;
const voiceCategories=['未分類','アイデア','仕事','日常','学習'];
let voiceDB=null,voiceLoaded=false,voiceLoading=null,voiceLoadError=false;
let voiceItems=[],voiceSession=null,voiceRoot=null,voiceGeneration=0,voicePending=false;
let voiceFilter='all',voiceQuery='',voiceSort='new',voiceSelected=null,voiceAudio=null,voiceURL=null;
let voiceSpeed=1,voiceLoop=false,voiceImporting=false,voiceResetting=false,voiceCategory='all';
const voiceClock=s=>fmt(Math.max(0,Number(s)||0)).padStart(5,'0');
const voiceSize=n=>n<1048576?`${Math.ceil(n/1024)} KB`:`${(n/1048576).toFixed(1)} MB`;
const voiceItem=id=>voiceItems.find(r=>r.id===id);
const voiceVisible=()=>A.current==='recorder'&&voiceRoot?.isConnected;
function openVoiceDB(){
  if(voiceDB)return Promise.resolve(voiceDB);
  return new Promise((resolve,reject)=>{
    const request=indexedDB.open(VOICE_DB,1);
    request.onupgradeneeded=()=>request.result.createObjectStore('recordings',{keyPath:'id'});
    request.onerror=()=>reject(request.error);request.onblocked=()=>reject(Error('Storage blocked'));
    request.onsuccess=()=>{voiceDB=request.result;voiceDB.onversionchange=()=>{voiceDB.close();voiceDB=null;};resolve(voiceDB);};
  });
}
async function voiceStore(operation,value){
  const db=await openVoiceDB();
  return new Promise((resolve,reject)=>{
    const tx=db.transaction('recordings',operation==='getAll'?'readonly':'readwrite');
    const request=tx.objectStore('recordings')[operation](value);
    tx.oncomplete=()=>resolve(request.result);tx.onerror=tx.onabort=()=>reject(tx.error||Error('Storage failed'));
  });
}
async function loadVoices(){
  if(voiceLoaded)return;if(voiceLoading)return voiceLoading;
  voiceLoading=(async()=>{
    try{const stored=await voiceStore('getAll'),ids=new Set(voiceItems.map(r=>r.id));voiceItems.push(...stored.filter(r=>r.blob instanceof Blob&&!ids.has(r.id)));voiceLoaded=true;voiceLoadError=false;}
    catch{voiceLoadError=true;}
    finally{voiceLoading=null;renderRecordList();}
  })();return voiceLoading;
}
async function saveVoice(item){
  if(item.saving)return false;item.saving=true;renderRecordList();
  try{const {saving,unsaved,...stored}=item;await voiceStore('put',stored);item.unsaved=false;return true;}
  catch{item.unsaved=true;A.toast('保存できません。再試行するかダウンロードしてください。',true);return false;}
  finally{item.saving=false;renderRecordList();}
}
A.clearVoiceData=async()=>{
  if(voiceSession||voicePending||voiceImporting||voiceItems.some(r=>r.saving))throw Error('録音・保存・読込が完了してからリセットしてください');
  voiceResetting=true;
  try{if(window.indexedDB)await voiceStore('clear');closeVoicePlayer();voiceItems=[];voiceLoaded=true;}
  finally{voiceResetting=false;}
};
document.addEventListener('visibilitychange',()=>{if(document.hidden&&voiceSession){stopVoice();A.toast('画面が非表示になったため録音を停止して保存します');}});
// Guard only while audio could be lost, including after navigating away.
window.addEventListener('beforeunload',e=>{if(voiceSession||voiceItems.some(r=>r.unsaved||r.saving)||voiceImporting){e.preventDefault();e.returnValue='';}});
function voiceWave(peaks=[]){
  return `<svg class="vs-wave" viewBox="0 0 300 70" preserveAspectRatio="none" aria-hidden="true">${Array.from({length:60},(_,i)=>{const h=Math.max(2,Math.min(1,peaks[Math.floor(i*peaks.length/60)]||0)*62);return `<rect x="${i*5+1}" y="${35-h/2}" width="2.5" height="${h}" rx="1.25"/>`;}).join('')}</svg>`;
}
function recorder(){
  const generation=++voiceGeneration;A.statusTheme(false);
  A.view(A.nav('ボイスメモ',`<button data-action="recordInfo" aria-label="保存と録音のヘルプ">${icon('info')}</button>`)+`<div class="app-content vs-studio" id="recorder-content">
    <header class="vs-heading"><div><span class="vs-eyebrow">AURA / SOUND JOURNAL</span><h1>Voice Studio<span>.</span></h1></div><span class="vs-monogram" aria-hidden="true">${icon('mic')}</span></header>
    <section class="vs-console" aria-label="録音スタジオ"><div class="vs-console-top"><span class="vs-status" id="record-status" role="status">READY TO RECORD</span><span>MIC / 01</span></div>
      <div class="vs-scope"><div class="vs-scope-grid"></div><canvas id="record-scope" width="600" height="160" aria-label="マイクの入力波形"></canvas><span class="vs-scope-axis">INPUT SIGNAL <i>MONO VIEW</i> LIVE</span></div>
      <div class="vs-clock" id="record-time">00:00</div><div class="vs-meter"><span id="record-level"></span></div>
      <div class="vs-record-controls"><button data-action="recordPause" id="record-pause" disabled aria-label="録音を一時停止">${icon('pause')}</button><button class="vs-record-button" id="record-button" data-action="recordToggle" aria-label="録音を開始"><span></span></button><button data-action="recordMark" id="record-mark" disabled aria-label="録音にマーカーを追加">${icon('plus')}</button></div>
      <p id="record-hint">タップして、声を残す。</p><div class="vs-session-marks" id="record-marks"></div>
      <label class="vs-input-mode">録音モード<select id="record-mode"><option value="voice">会話 · ノイズ抑制を要求</option><option value="raw">環境音 · 音の処理なしを要求</option></select></label>
    </section>
    <div class="vs-library-head"><h2>ライブラリ <span id="voice-count">0</span></h2><button data-action="recordImport">${icon('plus')} 読み込む</button></div>
    <div class="vs-stats" id="voice-stats">ブラウザ内に保存 / 自動送信なし</div>${A.search('voice-search','名前・メモを検索')}
    <div class="vs-filters" role="group" aria-label="録音の絞り込み">${[['all','すべて'],['favorite','お気に入り'],['trash','ゴミ箱']].map(([value,label])=>`<button data-action="recordFilter" data-value="${value}" aria-pressed="${voiceFilter===value}">${label}</button>`).join('')}</div>
    <div class="vs-sort-row"><span id="voice-results" aria-live="polite"></span><select id="voice-category-filter" aria-label="カテゴリで絞り込み"><option value="all">全カテゴリ</option>${voiceCategories.map(c=>`<option value="${c}" ${voiceCategory===c?'selected':''}>${c}</option>`).join('')}</select><select id="voice-sort" aria-label="録音の並び順"><option value="new">新しい順</option><option value="old">古い順</option><option value="name">名前順</option><option value="long">長い順</option></select></div>
    <div id="voice-unsaved" role="status"></div><div id="voice-player"></div><div id="record-list"></div><footer class="vs-footer">LOCAL FIRST · YOUR VOICE, YOURS.<br><span>保存先はこのブラウザ。大切な音声は書き出してください。</span></footer>
  </div>`);
  voiceRoot=$('#recorder-content');$('#voice-search').value=voiceQuery;$('#voice-search').oninput=e=>{voiceQuery=e.target.value;renderRecordList();};
  $('#voice-sort').value=voiceSort;$('#voice-sort').onchange=e=>{voiceSort=e.target.value;renderRecordList();};
  $('#voice-category-filter').onchange=e=>{voiceCategory=e.target.value;renderRecordList();};
  renderRecordList();updateVoiceConsole();drawVoiceScope();loadVoices();
  const interval=setInterval(()=>{if(!voiceVisible())return;updateVoiceConsole();if(voiceSession&&voiceElapsed(voiceSession)>=1800)stopVoice();},200);
  let frame=0,lastFrame=0;const reduced=matchMedia('(prefers-reduced-motion: reduce)');
  const animate=now=>{if(generation!==voiceGeneration)return;if(!document.hidden&&now-lastFrame>(A.settings.reduceMotion||reduced.matches?180:33)){if(voiceSession)drawVoiceScope();lastFrame=now;}frame=requestAnimationFrame(animate);};frame=requestAnimationFrame(animate);
  A.cleanups.push(()=>{if(generation!==voiceGeneration)return;voiceGeneration++;voiceRoot=null;voicePending=false;clearInterval(interval);cancelAnimationFrame(frame);stopVoice();closeVoicePlayer();});
}
A.apps.recorder.render=recorder;
function voiceElapsed(s){return s.elapsed+(!s.stopping&&!s.paused?(performance.now()-s.started)/1000:0);}
function updateVoiceConsole(){
  if(!voiceVisible())return;
  const s=voiceSession,active=s&&!s.stopping,paused=active&&s.recorder.state==='paused';
  voiceRoot.classList.toggle('is-recording',!!active&&!paused);voiceRoot.classList.toggle('is-paused',!!paused);
  $('#record-time').textContent=voiceClock(s?voiceElapsed(s):0);
  const status=voicePending?'マイクに接続中':s?.stopping?'保存の準備中':paused?'PAUSED':active?'RECORDING':'READY TO RECORD';
  if($('#record-status').textContent!==status)$('#record-status').textContent=status;
  $('#record-button').disabled=voicePending||!!s?.stopping;$('#record-button').setAttribute('aria-label',active?'録音を停止して保存':'録音を開始');
  $('#record-pause').disabled=!active;$('#record-mark').disabled=!active;$('#record-mode').disabled=!!s||voicePending;
  const pauseLabel=paused?'録音を再開':'録音を一時停止';
  if($('#record-pause').getAttribute('aria-label')!==pauseLabel){$('#record-pause').innerHTML=icon(paused?'play':'pause');$('#record-pause').setAttribute('aria-label',pauseLabel);}
  $('#record-hint').textContent=active?(paused?'ひと休み。続きは再開ボタンから。':'停止すると自動保存 · ＋でマーカー'):'タップして、声を残す。';
  $('#record-marks').textContent=s?.markers.length?`${s.markers.length} マーカー · 最新 ${voiceClock(s.markers.at(-1).time)}`:'';
}
function drawVoiceScope(){
  const canvas=$('#record-scope');if(!canvas||document.hidden)return;
  const ctx=canvas.getContext('2d'),s=voiceSession;let level=0;
  ctx.clearRect(0,0,600,160);ctx.lineWidth=2;ctx.strokeStyle='#ef9b87';ctx.beginPath();
  if(s?.analyser&&s.recorder.state==='recording'){
    s.analyser.getByteTimeDomainData(s.samples);
    for(let i=0;i<s.samples.length;i++){const v=(s.samples[i]-128)/128;level+=v*v;const x=i/(s.samples.length-1)*600,y=80+v*72;i?ctx.lineTo(x,y):ctx.moveTo(x,y);}
    level=Math.sqrt(level/s.samples.length);
    const bin=Math.min(1799,Math.floor(voiceElapsed(s)));s.peaks[bin]=Math.max(s.peaks[bin]||0,Math.min(1,level*4));
  }else{ctx.moveTo(0,80);ctx.lineTo(600,80);}
  ctx.stroke();$('#record-level').style.width=`${Math.min(100,level*300)}%`;$('#record-level').classList.toggle('is-hot',level>.7);
}
function releaseVoice(s){s.stream.getTracks().forEach(t=>t.stop());if(s.context&&s.context.state!=='closed')s.context.close().catch(()=>{});}
function stopVoice(){
  const s=voiceSession;if(!s||s.stopping)return;s.elapsed=voiceElapsed(s);s.stopping=true;
  if(s.recorder.state!=='inactive')s.recorder.stop();releaseVoice(s);updateVoiceConsole();
}
A.actions.recordToggle=async()=>{
  if(voiceSession)return stopVoice();if(voicePending||voiceResetting)return;
  if(voiceImporting)return A.toast('音声の読込が終わってから録音してください');
  if(!navigator.mediaDevices?.getUserMedia||!window.MediaRecorder)return A.toast('HTTPSとマイク対応ブラウザが必要です。音声の読込は利用できます。');
  const requestedGeneration=voiceGeneration;await loadVoices();
  if(!voiceVisible()||voicePending||voiceSession||voiceResetting||voiceImporting||requestedGeneration!==voiceGeneration)return;
  if(voiceItems.length>=200)return A.toast('録音はゴミ箱を含め200件までです');
  if(voiceItems.reduce((n,r)=>n+r.blob.size,0)>200*1024*1024)return A.toast('200MBを超えています。不要な音声を完全削除してください。');
  const token=voiceGeneration,mode=$('#record-mode')?.value;voicePending=true;updateVoiceConsole();closeVoicePlayer();
  if(M.playing)M.pause();let stream;
  try{
    stream=await navigator.mediaDevices.getUserMedia({audio:{echoCancellation:mode!=='raw',noiseSuppression:mode!=='raw',autoGainControl:mode!=='raw'}});
    if(token!==voiceGeneration||!voiceVisible()){stream.getTracks().forEach(t=>t.stop());return;}
    const type=['audio/webm;codecs=opus','audio/mp4','audio/ogg;codecs=opus'].find(t=>MediaRecorder.isTypeSupported(t));
    const rec=new MediaRecorder(stream,type?{mimeType:type}:undefined);
    const s={recorder:rec,stream,chunks:[],elapsed:0,started:performance.now(),markers:[],peaks:[],bytes:0,paused:false,stopping:false};voiceSession=s;
    try{const C=window.AudioContext||window.webkitAudioContext;s.context=new C();s.analyser=s.context.createAnalyser();s.analyser.fftSize=512;s.samples=new Uint8Array(512);s.context.createMediaStreamSource(stream).connect(s.analyser);s.context.resume().catch(()=>{});}catch{/* Visualization is optional, never block recording. */}
    rec.ondataavailable=e=>{if(e.data.size){s.chunks.push(e.data);s.bytes+=e.data.size;if(s.bytes>=VOICE_LIMIT){stopVoice();A.toast('50MBに達したため録音を停止しました');}}};
    rec.onstop=async()=>{
      // A stop event can also come from a disconnected input device.
      if(!s.stopping){s.elapsed=voiceElapsed(s);s.stopping=true;}releaseVoice(s);if(voiceSession===s)voiceSession=null;
      const blob=new Blob(s.chunks,{type:rec.mimeType||s.chunks[0]?.type||'audio/webm'});updateVoiceConsole();if(voiceVisible())drawVoiceScope();
      if(!blob.size)return A.toast('音声データがありません。マイクを確認してください。');
      const bins=Array.from({length:Math.max(1,Math.ceil(s.elapsed))},(_,i)=>s.peaks[i]||0);
      const peaks=Array.from({length:120},(_,i)=>{const a=Math.floor(i*bins.length/120),b=Math.max(a+1,Math.floor((i+1)*bins.length/120));return Math.max(0,...bins.slice(a,b));});
      const item={id:A.id(),name:'録音 '+new Date().toLocaleString('ja-JP',{month:'numeric',day:'numeric',hour:'2-digit',minute:'2-digit'}),created:Date.now(),duration:s.elapsed,blob,category:'未分類',note:'',favorite:false,markers:s.markers,peaks,unsaved:true};
      voiceItems.unshift(item);if(await saveVoice(item))A.toast('録音をブラウザ内に保存しました');
    };
    rec.onerror=()=>{A.toast('録音が中断されました。取得できた音声を保存します。',true);stopVoice();};
    rec.start(1000);s.started=performance.now();A.haptic();
  }catch(e){stream?.getTracks().forEach(t=>t.stop());if(token===voiceGeneration){if(voiceSession){releaseVoice(voiceSession);voiceSession=null;}A.toast(e.name==='NotAllowedError'?'マイクの許可を確認してください':e.name==='NotFoundError'?'マイクが見つかりません':'録音を開始できませんでした',true);}}
  finally{if(token===voiceGeneration){voicePending=false;updateVoiceConsole();}}
};
A.actions.recordPause=()=>{const s=voiceSession;if(!s||s.stopping)return;if(s.recorder.state==='recording'){s.elapsed=voiceElapsed(s);s.paused=true;s.recorder.pause();}else if(s.recorder.state==='paused'){s.started=performance.now();s.paused=false;s.recorder.resume();}updateVoiceConsole();};
A.actions.recordMark=()=>{const s=voiceSession;if(!s||s.stopping)return;if(s.markers.length>=100)return A.toast('マーカーは100件まで');s.markers.push({id:A.id(),time:voiceElapsed(s),label:`マーカー ${s.markers.length+1}`});updateVoiceConsole();A.haptic();};
function renderRecordList(){
  if(!voiceVisible())return;
  const active=voiceItems.filter(r=>!r.deleted),q=voiceQuery.trim().toLocaleLowerCase();
  const list=voiceItems.filter(r=>(voiceFilter==='trash'?r.deleted:!r.deleted)&&(voiceFilter!=='favorite'||r.favorite)&&(voiceCategory==='all'||r.category===voiceCategory)&&(!q||`${r.name} ${r.note} ${r.category}`.toLocaleLowerCase().includes(q)));
  list.sort((a,b)=>voiceSort==='name'?a.name.localeCompare(b.name,'ja'):voiceSort==='long'?b.duration-a.duration:voiceSort==='old'?a.created-b.created:b.created-a.created);
  $('#voice-count').textContent=active.length;$('#voice-stats').textContent=`${voiceClock(active.reduce((n,r)=>n+r.duration,0))} 合計 · ${voiceSize(voiceItems.reduce((n,r)=>n+r.blob.size,0))} 使用中`;
  $('#voice-results').textContent=`${list.length} 件${voiceFilter==='trash'?' · 自動削除なし':''}`;
  const unsaved=voiceItems.filter(r=>r.unsaved&&!r.saving);
  $('#voice-unsaved').innerHTML=unsaved.length?`<div class="vs-warning">未保存 ${unsaved.length} 件 · タブを閉じる前に保存してください。${unsaved.map(r=>`<div>${esc(r.name)}<button data-action="recordRetry" data-id="${r.id}">再試行</button><button data-action="recordDownload" data-id="${r.id}">ダウンロード</button></div>`).join('')}</div>`:'';
  $('#record-list').innerHTML=(voiceLoadError?'<div class="vs-warning" role="alert">保存領域を開けません。未保存の音声はダウンロードしてください。<button data-action="recordReload">再読込</button></div>':'')+(!voiceLoaded&&!voiceLoadError?'<p class="vs-empty">ライブラリを読み込み中…</p>':'')+list.map((r,i)=>`<article class="vs-card ${r.id===voiceSelected?'is-selected':''}" style="--vs-order:${Math.min(i,8)}">
    <div class="vs-card-top"><span class="vs-category">${esc(r.category)}</span><time>${new Date(r.created).toLocaleDateString('ja-JP',{month:'short',day:'numeric'})}</time><button data-action="recordFavorite" data-id="${r.id}" aria-label="${esc(r.name)}のお気に入り" aria-pressed="${!!r.favorite}" ${r.saving?'disabled':''}>${icon('heart')}</button></div>
    <button class="vs-card-open" data-action="recordOpen" data-id="${r.id}" ${r.deleted?'disabled':''}><span class="vs-card-play">${icon(r.id===voiceSelected?'close':'play')}</span><span><strong>${esc(r.name)}</strong><small>${voiceClock(r.duration)} <b>·</b> ${voiceSize(r.blob.size)}${r.markers?.length?` <b>·</b> ${r.markers.length} マーカー`:''}</small></span></button>
    <div class="vs-card-wave">${voiceWave(r.peaks)}</div>${r.note?`<p class="vs-card-note">${esc(r.note)}</p>`:''}
    <div class="vs-card-actions">${r.deleted?`<button data-action="recordRestore" data-id="${r.id}">復元</button><button data-action="recordErase" data-id="${r.id}" ${r.saving?'disabled':''}>完全削除</button>`:`<button data-action="recordEdit" data-id="${r.id}" ${r.saving?'disabled':''}>編集</button><button data-action="recordShare" data-id="${r.id}" aria-label="${esc(r.name)}を共有">${icon('share')}</button><button data-action="recordDelete" data-id="${r.id}" ${r.saving?'disabled':''} aria-label="${esc(r.name)}をゴミ箱へ">${icon('trash')}</button>`}<button data-action="recordDownload" data-id="${r.id}" aria-label="${esc(r.name)}をダウンロード">${icon('download')}</button></div>
    ${r.saving?'<p class="vs-save-status" role="status">保存中…</p>':r.unsaved?`<div class="vs-warning" role="alert">未保存 · タブを閉じないでください<button data-action="recordRetry" data-id="${r.id}">再試行</button></div>`:''}
  </article>`).join('')+(!list.length&&voiceLoaded?`<div class="vs-empty"><span class="vs-empty-art">${icon(voiceFilter==='trash'?'trash':'mic')}</span><h3>${q?'見つかりませんでした':voiceFilter==='trash'?'ゴミ箱は空です':voiceFilter==='favorite'?'大切な声を、ここに。':'まだ、まっさらな音のノート。'}</h3><p>${q?'名前・メモ・カテゴリで検索できます。':voiceFilter==='favorite'?'ハートをタップして追加できます。':voiceFilter==='trash'?'削除した音声はここから復元できます。':'上のボタンで録音するか、音声を読み込めます。'}</p></div>`:'');
}
A.actions.recordFilter=el=>{voiceFilter=el.dataset.value;document.querySelectorAll('[data-action="recordFilter"]').forEach(b=>b.setAttribute('aria-pressed',b.dataset.value===voiceFilter));closeVoicePlayer();renderRecordList();};
A.actions.recordReload=()=>loadVoices();A.actions.recordRetry=el=>{const r=voiceItem(el.dataset.id);if(r)saveVoice(r);};
async function changeVoice(r,patch){if(!r||r.saving)return;Object.assign(r,patch);await saveVoice(r);}
A.actions.recordFavorite=el=>{const r=voiceItem(el.dataset.id);if(r)changeVoice(r,{favorite:!r.favorite});};
A.actions.recordDelete=el=>{const r=voiceItem(el.dataset.id);if(!r||r.saving)return;A.confirm('ゴミ箱に移動',`「${esc(r.name)}」はあとで復元できます。`,()=>{if(r.id===voiceSelected)closeVoicePlayer();changeVoice(r,{deleted:Date.now()});});};
A.actions.recordRestore=el=>changeVoice(voiceItem(el.dataset.id),{deleted:null});
A.actions.recordErase=el=>{const r=voiceItem(el.dataset.id);if(!r||r.saving)return;A.confirm('音声を完全に削除',`「${esc(r.name)}」を削除します。この操作は取り消せません。`,async()=>{if(r.saving)return;r.saving=true;renderRecordList();try{await voiceStore('delete',r.id);voiceItems=voiceItems.filter(v=>v.id!==r.id);}catch{A.toast('削除できませんでした。再試行してください。',true);}finally{r.saving=false;renderRecordList();}});};
A.actions.recordEdit=el=>{
  const r=voiceItem(el.dataset.id);if(!r||r.saving)return;
  A.form('録音を編集',`<label class="form-label" for="voice-name">名前</label><input class="text-input" id="voice-name" name="name" maxlength="100" required value="${esc(r.name)}"><label class="form-label" for="voice-category">カテゴリ</label><select class="text-input" id="voice-category" name="category">${voiceCategories.map(c=>`<option ${c===r.category?'selected':''}>${c}</option>`).join('')}</select><label class="form-label" for="voice-note">メモ</label><textarea class="text-input" id="voice-note" name="note" maxlength="4000" rows="5">${esc(r.note)}</textarea>`,v=>{if(!v.name.trim()){A.toast('名前を入力してください');return false;}changeVoice(r,{name:v.name.trim(),category:v.category,note:v.note});if(r.id===voiceSelected)$('#voice-player-title').textContent=v.name.trim();});
};
function closeVoicePlayer(){
  if(voiceAudio){const audio=voiceAudio;voiceAudio=null;audio.pause();audio.removeAttribute('src');audio.load();}
  if(voiceURL)URL.revokeObjectURL(voiceURL);voiceURL=null;voiceSelected=null;const el=$('#voice-player');if(el)el.innerHTML='';
}
A.actions.recordOpen=el=>{
  const r=voiceItem(el.dataset.id);if(!r||r.deleted)return;if(voiceSession||voicePending)return A.toast('録音を停止してから再生してください');
  if(voiceSelected===r.id){closeVoicePlayer();renderRecordList();return;}closeVoicePlayer();voiceSelected=r.id;voiceURL=URL.createObjectURL(r.blob);
  $('#voice-player').innerHTML=`<section class="vs-player"><div class="vs-player-head"><span>NOW LISTENING</span><button data-action="recordClose" aria-label="プレーヤーを閉じる">${icon('close')}</button></div><h3 id="voice-player-title">${esc(r.name)}</h3><div class="vs-player-wave">${voiceWave(r.peaks)}<span id="voice-playhead"></span></div><input id="voice-seek" type="range" min="0" max="${r.duration||1}" step="0.01" value="0" aria-label="再生位置"><div class="vs-play-times"><span id="voice-position">00:00</span><span>${voiceClock(r.duration)}</span></div><div class="vs-play-controls"><button data-action="recordSkip" data-value="-10" aria-label="10秒戻る">−10</button><button class="vs-main-play" data-action="recordPlay" id="voice-play-toggle" aria-label="再生">${icon('play')}</button><button data-action="recordSkip" data-value="10" aria-label="10秒進む">+10</button></div><div class="vs-play-options"><select id="voice-speed" aria-label="再生速度">${[.5,.75,1,1.25,1.5,2].map(n=>`<option value="${n}" ${n===voiceSpeed?'selected':''}>${n}× 速度</option>`).join('')}</select><button data-action="recordLoop" id="voice-loop" aria-pressed="${voiceLoop}">ループ</button><button data-action="recordPlayMark">＋ マーカー</button></div><div class="vs-player-markers" id="voice-marker-list"></div><button class="vs-export-notes" data-action="recordNotes" data-id="${r.id}">メモ・マーカーを書き出す</button><p id="voice-play-error" role="status"></p></section>`;
  const audio=voiceAudio=new Audio(voiceURL);audio.preload='metadata';audio.playbackRate=voiceSpeed;audio.loop=voiceLoop;
  audio.ontimeupdate=()=>{if(voiceAudio!==audio||!voiceVisible())return;$('#voice-position').textContent=voiceClock(audio.currentTime);$('#voice-seek').value=audio.currentTime;$('#voice-playhead').style.left=`${Math.min(100,audio.currentTime/(r.duration||1)*100)}%`;};
  const state=()=>{if(voiceAudio!==audio||!voiceVisible())return;$('#voice-play-toggle').innerHTML=icon(audio.paused?'play':'pause');$('#voice-play-toggle').setAttribute('aria-label',audio.paused?'再生':'一時停止');$('#voice-player .vs-player').classList.toggle('is-playing',!audio.paused);};
  audio.onplay=audio.onpause=audio.onended=state;audio.onerror=()=>{if(voiceAudio===audio&&voiceVisible())$('#voice-play-error').textContent='再生できません。ダウンロードして対応アプリで開いてください。';};
  $('#voice-seek').oninput=e=>{audio.currentTime=Number(e.target.value);};$('#voice-speed').onchange=e=>{voiceSpeed=+e.target.value;audio.playbackRate=voiceSpeed;};
  renderVoiceMarkers();renderRecordList();$('#voice-player').scrollIntoView({block:'nearest',behavior:'instant'});
};
A.actions.recordClose=()=>{closeVoicePlayer();renderRecordList();};
A.actions.recordPlay=async()=>{const audio=voiceAudio;if(!audio)return;if(!audio.paused)return audio.pause();try{if(M.playing)M.pause();await audio.play();}catch{if(voiceAudio===audio)A.toast('音声形式とブラウザを確認してください。',true);}};
A.actions.recordSkip=el=>{if(voiceAudio)voiceAudio.currentTime=Math.max(0,Math.min(voiceItem(voiceSelected)?.duration||0,voiceAudio.currentTime+Number(el.dataset.value)));};
A.actions.recordLoop=()=>{voiceLoop=!voiceLoop;if(voiceAudio)voiceAudio.loop=voiceLoop;$('#voice-loop')?.setAttribute('aria-pressed',voiceLoop);};
function renderVoiceMarkers(){const r=voiceItem(voiceSelected),list=$('#voice-marker-list');if(!r||!list)return;list.innerHTML=(r.markers||[]).map(m=>`<div><button data-action="recordSeekMark" data-id="${m.id}"><time>${voiceClock(m.time)}</time>${esc(m.label)}</button><button data-action="recordRemoveMark" data-id="${m.id}" aria-label="${esc(m.label)}を削除">${icon('close')}</button></div>`).join('');}
A.actions.recordPlayMark=()=>{const r=voiceItem(voiceSelected);if(!r||r.saving||!voiceAudio)return;if(r.markers.length>=100)return A.toast('マーカーは100件まで');const time=voiceAudio.currentTime;A.form('マーカーを追加',`<p>${voiceClock(time)}</p><label class="form-label" for="voice-marker-label">ラベル</label><input class="text-input" id="voice-marker-label" name="label" maxlength="80" required value="マーカー ${r.markers.length+1}">`,v=>{if(!v.label.trim())return false;changeVoice(r,{markers:[...r.markers,{id:A.id(),time,label:v.label.trim()}].sort((a,b)=>a.time-b.time)});renderVoiceMarkers();});};
A.actions.recordSeekMark=el=>{const m=voiceItem(voiceSelected)?.markers.find(m=>m.id===el.dataset.id);if(m&&voiceAudio)voiceAudio.currentTime=m.time;};
A.actions.recordRemoveMark=el=>{const r=voiceItem(voiceSelected);if(r&&!r.saving){changeVoice(r,{markers:r.markers.filter(m=>m.id!==el.dataset.id)});renderVoiceMarkers();}};
function voiceFilename(r){const type=r.blob.type;const ext=r.blob instanceof File?r.blob.name.split('.').pop().replace(/[^a-z0-9]/gi,'').slice(0,8):type.includes('mp4')?'m4a':type.includes('ogg')?'ogg':'webm';return `${r.name.replace(/[\\/:*?"<>|\x00-\x1f]/g,'_').slice(0,100)||'aura-recording'}.${ext||'audio'}`;}
A.actions.recordShare=el=>{const r=voiceItem(el.dataset.id);if(r)A.network.offerFile(r.blob,voiceFilename(r));};
A.actions.recordDownload=el=>{const r=voiceItem(el.dataset.id);if(r)A.download(r.blob,voiceFilename(r));};
A.actions.recordNotes=el=>{const r=voiceItem(el.dataset.id);if(r)A.download(new Blob([`${r.name}\n${new Date(r.created).toLocaleString('ja-JP')} · ${voiceClock(r.duration)} · ${r.category}\n\n${r.note}\n\n${r.markers.map(m=>`${voiceClock(m.time)} ${m.label}`).join('\n')}`],{type:'text/plain;charset=utf-8'}),'aura-voice-notes.txt');};
async function voiceFileInfo(file){
  const url=URL.createObjectURL(file),audio=new Audio();let timer;
  try{return await new Promise((resolve,reject)=>{
    timer=setTimeout(()=>reject(Error('音声の長さを取得できませんでした')),12000);
    const duration=()=>{if(Number.isFinite(audio.duration)&&audio.duration>0)resolve(audio.duration);};
    audio.ondurationchange=duration;audio.onloadedmetadata=()=>{duration();if(audio.duration===Infinity)audio.currentTime=1e10;};
    audio.onerror=()=>reject(Error('この音声形式を読み込めません'));audio.preload='auto';audio.src=url;
  });}
  finally{clearTimeout(timer);audio.onloadedmetadata=audio.ondurationchange=audio.onerror=null;audio.removeAttribute('src');audio.load();URL.revokeObjectURL(url);}
}
async function voiceFilePeaks(file,duration){
  // Bound decoding memory; large/long imports show a neutral baseline instead.
  if(file.size>12*1024*1024||duration>600)return [];let context;
  try{const C=window.AudioContext||window.webkitAudioContext;context=new C();const buffer=await context.decodeAudioData(await file.arrayBuffer()),data=buffer.getChannelData(0);return Array.from({length:120},(_,i)=>{const a=Math.floor(i*data.length/120),b=Math.floor((i+1)*data.length/120);let sum=0,n=0;for(let k=a;k<b;k+=8){sum+=data[k]*data[k];n++;}return Math.min(1,Math.sqrt(sum/Math.max(1,n))*4);});}
  catch{return [];}
  finally{if(context)context.close().catch(()=>{});}
}
A.actions.recordImport=()=>{
  if(voiceImporting)return A.toast('音声を読み込み中です');const input=document.createElement('input');input.type='file';input.accept='audio/*,.webm,.m4a,.mp3,.wav,.ogg,.flac';
  input.onchange=async()=>{
    const file=input.files[0];if(!file)return;
    if(voiceImporting||voiceResetting||voiceSession||voicePending)return A.toast('録音・保存・読込が終わってから追加してください');
    if(!file.size||file.size>VOICE_LIMIT)return A.toast('0バイトより大きい50MB以下の音声を選択してください');
    voiceImporting=true;A.toast('音声を読み込み中…');
    try{await loadVoices();if(voiceItems.length>=200)throw Error('録音はゴミ箱を含め200件までです');if(voiceItems.reduce((n,r)=>n+r.blob.size,0)+file.size>250*1024*1024)throw Error('上限は250MBです。不要な音声を完全削除してください');const duration=await voiceFileInfo(file);if(duration>1800)throw Error('30分以下の音声を選択してください');const peaks=await voiceFilePeaks(file,duration);const r={id:A.id(),name:file.name.replace(/\.[^.]+$/,'').slice(0,100)||'読み込んだ音声',created:Date.now(),duration,blob:file,category:'未分類',note:'',favorite:false,markers:[],peaks,unsaved:true};voiceItems.unshift(r);if(await saveVoice(r))A.toast('音声をライブラリに追加しました');}
    catch(e){A.toast(e.message||'音声を読み込めませんでした',true);}
    finally{voiceImporting=false;renderRecordList();}
  };input.click();
};
A.actions.recordInfo=()=>A.overlay(`${A.overlayTitle('Voice Studioについて')}<div class="vs-help"><h3>あなたの声は、このブラウザに。</h3><p>音声とメモはIndexedDBに保存します。外部送信・クラウド同期・自動文字起こしはありません。全データJSONには音声を含みません。音声は各カードのダウンロードから保存してください。</p><h3>録音と波形</h3><p>マイクにはHTTPSと許可が必要です。1件あたり最大30分・約50MB、合計約250MB・200件まで（録音開始には50MBの空き枠が必要）。アプリ切替・ロック・タブ非表示時は録音を停止して保存します。タブ終了・スリープ時の保存は保証されません。</p><p>波形は実入力の概形、レベルはデジタル振幅です。校正された騒音計ではありません。録音モードの音声処理は対応ブラウザでのみ適用されます。読み込んだ音声は12MB・10分以下で波形を解析し、それ以外は中央線を表示します。</p><h3>保存に失敗したら</h3><p>「未保存」の音声はタブ内に残します。再試行するか、タブを閉じる前にダウンロードしてください。ブラウザデータの削除で録音も消えます。ゴミ箱の音声も容量を使い、完全削除まで残ります。同じ録音の編集は複数タブで同時に行わないでください。</p></div>`);
// Live weather and maps are implemented in connected.js.
})();
