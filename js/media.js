'use strict';
(() => {
const A=window.Aura,$=A.$,esc=A.escape,icon=A.icon;
// Photos and camera: samples are remote; imported/captured photos stay local.
const samplePhotos=[['lake','静かな湖'],['coffee','午後のコーヒー'],['mountain','山の稜線'],['flower','季節の花'],['sea','波の音'],['forest','木漏れ日'],['city','夜の街'],['desert','砂のかたち'],['interior','穏やかな部屋']].map(([key,title],i)=>({id:'sample-'+key,url:A.images[key],title,date:Date.now()-i*86400000,sample:true}));
let userPhotos=A.load('photos',[]),favorites=A.load('photoFavorites',[]),photoFilter='all',currentPhoto=null;
// Imported or damaged storage must not break the whole Photos app.
if(!Array.isArray(userPhotos))userPhotos=[];userPhotos=userPhotos.filter(p=>p&&typeof p.id==='string'&&typeof p.url==='string').map(p=>({...p,title:String(p.title||'写真'),sample:false}));
if(!Array.isArray(favorites))favorites=[];favorites=favorites.filter(id=>typeof id==='string');
const allPhotos=()=>[...userPhotos,...samplePhotos];
const albumPhotos=()=>allPhotos().filter(p=>photoFilter==='favorites'?favorites.includes(p.id):photoFilter==='mine'?!p.sample:true);
const photoTabs=()=>A.tabs([{id:'all',icon:'photos',name:'ライブラリ',action:'photoFilter',value:'all'},{id:'favorites',icon:'heart',name:'お気に入り',action:'photoFilter',value:'favorites'},{id:'mine',icon:'camera',name:'自分の写真',action:'photoFilter',value:'mine'}],photoFilter);
function photos(){A.statusTheme(false);A.view(A.nav('写真',`<button data-action="photoImport" aria-label="写真を追加">${icon('plus')}</button>`)+`<div class="app-content"><h1 class="app-title">${photoFilter==='favorites'?'お気に入り':photoFilter==='mine'?'自分の写真':'写真'}</h1>${photoFilter==='all'?`<button class="photo-featured" data-action="photoOpen" data-id="sample-lake" aria-label="静かな湖を開く"><img src="${A.images.lake}" alt="山々に囲まれた湖"></button><p class="section-label">すべての写真 · ${allPhotos().length}枚</p>`:''}<div class="photo-grid">${albumPhotos().map(p=>`<button class="photo-tile" data-action="photoOpen" data-id="${p.id}" aria-label="${esc(p.title)}"><img src="${p.url}" alt="${esc(p.title)}" loading="lazy"></button>`).join('')}</div>${photoFilter==='mine'&&!userPhotos.length?A.empty('＋で写真を追加','camera'):photoFilter==='favorites'&&!albumPhotos().length?A.empty('お気に入りなし','heart'):''}<p class="notes-footer">${photoFilter==='mine'?'写真は端末内に保存':'サンプル：Unsplash'}</p></div>`+photoTabs());fitPhotoGrid();}
// Match the full-bleed grid to the computed padding (it changes between breakpoints).
const fitPhotoGrid=()=>{const grid=$('#app-screen .app-content>.photo-grid');if(!grid)return;const pad=parseFloat(getComputedStyle(grid.parentElement).paddingLeft)||0;grid.style.setProperty('--photo-gutter',pad+'px');};
window.addEventListener('resize',()=>{if(A.current==='photos')fitPhotoGrid();});
A.apps.photos.render=photos;A.actions.photosHome=photos;A.actions.photoFilter=el=>{photoFilter=el.dataset.value;photos();};
function viewPhoto(id){const p=allPhotos().find(p=>p.id===id);if(!p)return;currentPhoto=id;A.statusTheme(true);A.view(A.nav(esc(p.title),'','photosHome','写真')+`<div class="photo-viewer"><img src="${p.url}" alt="${esc(p.title)}"></div><div class="photo-toolbar"><button data-action="photoPrevious" aria-label="前の写真">${icon('previous')}</button><button data-action="photoShare" aria-label="写真を共有">${icon('share')}</button><button data-action="photoDownload" aria-label="写真をダウンロード">${icon('download')}</button><button class="${favorites.includes(id)?'liked':''}" data-action="photoFavorite" aria-label="お気に入り" aria-pressed="${favorites.includes(id)}">${icon('heart',favorites.includes(id)?'style="fill:currentColor"':'')}</button><button data-action="photoNext" aria-label="次の写真">${icon('next')}</button>${!p.sample?`<button data-action="photoDelete" aria-label="削除">${icon('trash')}</button>`:''}</div>`);}
A.actions.photoOpen=el=>viewPhoto(el.dataset.id);A.actions.photoFavorite=()=>{const next=favorites.includes(currentPhoto)?favorites.filter(x=>x!==currentPhoto):[...favorites,currentPhoto];if(!A.save('photoFavorites',next))return;favorites=next;viewPhoto(currentPhoto);};
const movePhoto=step=>{const list=albumPhotos();if(!list.length)return photos();const index=list.findIndex(p=>p.id===currentPhoto),next=index<0?(step>0?0:list.length-1):(index+step+list.length)%list.length;viewPhoto(list[next].id);};A.actions.photoPrevious=()=>movePhoto(-1);A.actions.photoNext=()=>movePhoto(1);
A.actions.photoDelete=()=>A.confirm('写真を削除','このブラウザに保存された写真を削除します。',()=>{const next=userPhotos.filter(p=>p.id!==currentPhoto),nextFavorites=favorites.filter(id=>id!==currentPhoto);if(!A.save('photoFavorites',nextFavorites))return;if(!A.save('photos',next)){A.save('photoFavorites',favorites);return;}userPhotos=next;favorites=nextFavorites;photos();});
A.actions.photoShare=async()=>{const root=$('.photo-viewer'),p=allPhotos().find(p=>p.id===currentPhoto);if(!root||!p)return A.toast('先に共有する写真を開いてください');A.toast('共有する写真を準備中…');try{const response=await fetch(p.url,{signal:AbortSignal.timeout(15000),credentials:'omit'});if(!response.ok)throw Error();const blob=await response.blob();if(A.current==='photos'&&root.isConnected)A.network.offerFile(blob,`aura-${p.id}.jpg`);}catch{A.toast('写真を取得できません。通信を確認。');}};
A.actions.photoDownload=async()=>{const p=allPhotos().find(p=>p.id===currentPhoto);if(!p||!$('.photo-viewer'))return A.toast('先に保存する写真を開いてください');try{const r=await fetch(p.url);if(!r.ok)throw Error();A.download(await r.blob(),`aura-${p.id}.jpg`);A.toast('写真のダウンロードを開始済み');}catch{A.toast('画像を取得できません。通信を確認。');}};
A.storePhoto=(url,title)=>{const entry={id:A.id(),url,title,date:Date.now(),sample:false};const next=[entry,...userPhotos];if(A.save('photos',next)){userPhotos=next;return true;}return false;};
A.actions.photoImport=()=>{const input=document.createElement('input');input.type='file';input.accept='image/*';input.onchange=()=>{const file=input.files[0];if(!file)return;if(file.size>25*1024*1024)return A.toast('25MB以下の写真を選択');const url=URL.createObjectURL(file),img=new Image();img.onload=()=>{const canvas=document.createElement('canvas'),scale=Math.min(1,1200/Math.max(img.width,img.height));canvas.width=Math.round(img.width*scale);canvas.height=Math.round(img.height*scale);canvas.getContext('2d').drawImage(img,0,0,canvas.width,canvas.height);const ok=A.storePhoto(canvas.toDataURL('image/jpeg',.82),file.name.replace(/\.[^.]+$/,''));URL.revokeObjectURL(url);if(ok){if(A.current==='photos')photos();A.toast('写真を追加済み');}};img.onerror=()=>{URL.revokeObjectURL(url);A.toast('この画像形式は読み込めませんでした');};img.src=url;};input.click();};
let cameraStream=null,cameraFacing='environment',cameraGrid=true,cameraSession=0;
function stopCamera(){cameraSession++;if(cameraStream){cameraStream.getTracks().forEach(t=>t.stop());cameraStream=null;}}
function camera(){A.statusTheme(true);A.view(A.nav('カメラ',`<button data-action="cameraGrid" aria-label="グリッド切り替え">${icon('grid')}</button>`)+`<div class="camera-preview" id="camera-preview"><video id="camera-video" playsinline autoplay muted></video><div class="camera-grid" id="camera-grid"></div><div class="camera-placeholder" id="camera-placeholder">${icon('camera')}<button class="primary-button" data-action="cameraStart">カメラを使う</button><button class="secondary-button" data-action="photoImport" style="background:#ffffff12;color:#c3c8d1;font-size:11px">端末の写真から追加</button><p style="font-size:9px;margin-top:24px">auraの写真に保存。HTTPS・カメラ許可が必要</p></div></div><div class="camera-bottom"><div class="camera-modes"><span class="active">写真</span><span>1×</span></div><div class="camera-actions"><button class="camera-small" data-app="photos" aria-label="写真を開く">${icon('photos')}</button><button class="shutter" data-action="cameraCapture" aria-label="写真を撮影"></button><button class="camera-small" data-action="cameraFlip" aria-label="カメラ切り替え">${icon('refresh')}</button></div></div>`);$('#camera-grid').hidden=!cameraGrid;A.cleanups.push(stopCamera);}
A.apps.camera.render=camera;
A.actions.cameraStart=async()=>{if(!navigator.mediaDevices?.getUserMedia)return A.toast('この環境ではカメラを利用できません。写真を追加できます。');const token=++cameraSession;try{const stream=await navigator.mediaDevices.getUserMedia({video:{facingMode:cameraFacing,width:{ideal:1280},height:{ideal:1920}},audio:false});if(token!==cameraSession||A.current!=='camera'){stream.getTracks().forEach(t=>t.stop());return;}if(cameraStream)cameraStream.getTracks().forEach(t=>t.stop());cameraStream=stream;$('#camera-video').srcObject=stream;$('#camera-video').style.transform=cameraFacing==='user'?'scaleX(-1)':'';$('#camera-placeholder').hidden=true;await $('#camera-video').play();}catch(e){if(token===cameraSession)A.toast(e.name==='NotAllowedError'?'カメラの許可を確認してください':'カメラを起動できませんでした');}};
A.actions.cameraFlip=()=>{cameraFacing=cameraFacing==='user'?'environment':'user';if(cameraStream)stopCamera();A.actions.cameraStart();};A.actions.cameraGrid=()=>{cameraGrid=!cameraGrid;$('#camera-grid').hidden=!cameraGrid;};
A.actions.cameraCapture=()=>{const v=$('#camera-video');if(!cameraStream||!v?.videoWidth)return A.toast('先にカメラを起動');const c=document.createElement('canvas');const scale=Math.min(1,1200/Math.max(v.videoWidth,v.videoHeight));c.width=v.videoWidth*scale;c.height=v.videoHeight*scale;const ctx=c.getContext('2d');if(cameraFacing==='user'){ctx.translate(c.width,0);ctx.scale(-1,1);}ctx.drawImage(v,0,0,c.width,c.height);if(A.storePhoto(c.toDataURL('image/jpeg',.84),new Date().toLocaleDateString('ja-JP')+' の一枚')){A.haptic();A.toast('写真に保存済み');const preview=$('#camera-preview');preview.animate([{filter:'brightness(3)'},{filter:'brightness(1)'}],{duration:350});}};
// Music: original procedural ambient, synthesized entirely on-device.
const tracks=[{id:'dusk',title:'Golden Hour',artist:'aura sounds',album:'SLOW\nAFTERNOONS',art:'art-dusk',length:192,base:146.83,notes:[0,4,7,11,12,7,4,2],tempo:76},{id:'tide',title:'A Quiet Tide',artist:'aura sounds',album:'QUIET\nTIDES',art:'art-tide',length:214,base:130.81,notes:[0,3,7,10,14,10,7,3],tempo:64},{id:'orbit',title:'Somewhere, Softly',artist:'aura sounds',album:'SOFT\nORBIT',art:'art-orbit',length:186,base:164.81,notes:[0,5,7,12,16,12,7,5],tempo:82}];
const M=A.music={track:tracks[0],playing:false,position:0,startedAt:0,context:null,gain:null,scheduler:null,beat:0,liked:(v=>Array.isArray(v)?v.filter(id=>tracks.some(t=>t.id===id)):[])(A.load('musicLikes',[]))};
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
A.musicLibraryPreview=()=>`<button class="music-originals-entry" data-action="musicOriginals"><span class="music-originals-heading"><strong>オリジナル音源</strong><small>3曲 · ブラウザ生成</small>${icon('chevronRight')}</span><span class="music-originals-covers">${tracks.map(t=>`<span>${A.musicArtwork(t.id)}<strong>${t.title}</strong><small>${fmt(t.length)}</small></span>`).join('')}</span></button>`;
const art=(t,extra='')=>`<div class="album-art ${t.art} ${extra}">${A.musicArtwork(t.id,extra==='player-art')}<span>${t.album.replace('\n','<br>')}</span></div>`;
M.elapsed=()=>M.playing?Math.min(M.track.length,M.position+(Date.now()-M.startedAt)/1000):M.position;
M.setVolume=()=>{if(M.gain&&M.context)M.gain.gain.setTargetAtTime(A.settings.volume/100*.35,M.context.currentTime,.15);};
function audioInit(){if(!M.context){const Audio=window.AudioContext||window.webkitAudioContext;if(!Audio)throw Error('unsupported');M.context=new Audio();M.gain=M.context.createGain();M.gain.gain.value=A.settings.volume/100*.35;const compressor=M.context.createDynamicsCompressor();compressor.threshold.value=-16;compressor.ratio.value=4;M.gain.connect(compressor);compressor.connect(M.context.destination);}M.context.resume();}
function note(freq,time,duration,volume){const c=M.context,osc=c.createOscillator(),gain=c.createGain();osc.type='sine';osc.frequency.value=freq;gain.gain.setValueAtTime(.0001,time);gain.gain.exponentialRampToValueAtTime(volume,time+.08);gain.gain.exponentialRampToValueAtTime(.0001,time+duration);osc.connect(gain);gain.connect(M.gain);osc.start(time);osc.stop(time+duration+.05);osc.onended=()=>{osc.disconnect();gain.disconnect();};}
function synth(){if(!M.playing||!M.context)return;const t=M.context.currentTime,b=M.beat++,track=M.track;const semitone=track.notes[b%track.notes.length];note(track.base*Math.pow(2,semitone/12)*2,t,1.5,.14);if(b%4===0){[0,7,12].forEach((n,i)=>note(track.base*Math.pow(2,n/12),t+i*.025,3.2,.07));note(track.base/2,t,2,.12);}if(b%2===0)note(track.base*4,t+.23,.8,.035);}
M.start=()=>{try{audioInit();M.context.resume();M.startedAt=Date.now();M.playing=true;M.gain.gain.setTargetAtTime(A.settings.volume/100*.35,M.context.currentTime,.1);synth();clearInterval(M.scheduler);M.scheduler=setInterval(synth,60000/M.track.tempo/2);$('#phone-screen').classList.add('playing');refreshMusic();}catch{M.playing=false;A.toast('このブラウザでは音楽再生を利用できません');}};
M.pause=()=>{M.position=M.elapsed();M.playing=false;clearInterval(M.scheduler);if(M.gain)M.gain.gain.setTargetAtTime(0,M.context.currentTime,.1);$('#phone-screen').classList.remove('playing');refreshMusic();};
M.toggle=()=>M.playing?M.pause():M.start();
M.select=(id,play=true)=>{const next=tracks.find(t=>t.id===id);if(!next)return;if(M.playing)M.pause();M.track=next;M.position=0;M.beat=0;if(play)M.start();};
M.next=step=>{M.select(tracks[(tracks.indexOf(M.track)+step+tracks.length)%tracks.length].id,true);if(A.current==='music'&&$('#app-screen').classList.contains('music-app'))music(musicPage);if(!$('#overlay').hidden&&$('#control-volume'))A.controls();};
M.tick=()=>{if(M.playing&&M.elapsed()>=M.track.length)M.next(1);const progress=$('#music-progress');if(progress&&document.activeElement!==progress)progress.value=M.elapsed();if($('#music-elapsed'))$('#music-elapsed').textContent=fmt(M.elapsed());if($('#music-remaining'))$('#music-remaining').textContent='−'+fmt(M.track.length-M.elapsed());};
let musicPage='home';
function music(arg){musicPage=arg==='player'?'player':'home';A.statusTheme(true);$('#app-screen').classList.add('music-app');if(musicPage==='player')return player();A.view(A.nav('ミュージック',`<button data-action="musicCatalogue">検索</button><button data-action="musicFavorites" aria-label="お気に入り">${icon('heart')}</button>`)+`<div class="app-content"><h1 class="app-title">音源</h1><div class="music-hero">${A.musicArtwork('dusk',true)}<div class="music-feature-title"><strong>Golden Hour</strong><span>aura sounds</span></div><button data-action="musicPlayTrack" data-id="dusk" aria-label="Golden Hourを再生">${icon('play')}</button></div><div class="album-grid">${tracks.slice(0,2).map(t=>`<button class="album-card" data-action="musicPlayTrack" data-id="${t.id}">${art(t)}<h3>${t.title}</h3><p>${t.artist}</p></button>`).join('')}</div>${tracks.map(t=>`<button class="track-row" data-action="musicPlayTrack" data-id="${t.id}">${art(t)}<div><strong>${t.title}</strong><small>${t.artist}</small></div><span>${fmt(t.length)}</span></button>`).join('')}<p class="setting-description" style="color:#777984;margin-top:20px">ブラウザ生成の環境音楽</p></div>${miniPlayer()}`);}
function miniPlayer(){return `<div class="music-mini"><div class="mini-art ${M.track.art}"></div><button data-action="musicPlayer">${M.track.title}<small>${M.track.artist}</small></button><button data-action="musicToggle" aria-label="再生・一時停止" id="mini-play">${icon(M.playing?'pause':'play')}</button><button data-action="musicNext" aria-label="次の曲">${icon('next')}</button></div><div style="height:24px;background:#252329;flex-shrink:0"></div>`;}
function player(){const t=M.track;A.view(A.nav('再生中',`<button data-action="musicInfo" aria-label="音源について">···</button>`,'musicHome','閉じる')+`<div class="player-content">${art(t,'player-art')}<div class="player-info"><div><h2>${t.title}</h2><p>${t.artist}</p></div><button data-action="musicLike" id="music-like" aria-label="お気に入り" aria-pressed="${M.liked.includes(t.id)}">${M.liked.includes(t.id)?'♥':'♡'}</button></div><input class="music-progress" type="range" min="0" max="${t.length}" step="1" value="${M.elapsed()}" id="music-progress" aria-label="再生位置"><div class="progress-labels"><span id="music-elapsed">${fmt(M.elapsed())}</span><span id="music-remaining">−${fmt(t.length-M.elapsed())}</span></div><div class="player-controls"><button data-action="musicPrevious" aria-label="前の曲">${icon('previous')}</button><button class="main-play" data-action="musicToggle" id="player-play" aria-label="再生・一時停止">${icon(M.playing?'pause':'play')}</button><button data-action="musicNext" aria-label="次の曲">${icon('next')}</button></div><label class="player-volume">${icon('volume')}<input type="range" id="music-volume" min="0" max="100" value="${A.settings.volume}" aria-label="音量">${icon('volume')}</label></div>`);$('#music-progress').oninput=e=>{M.position=+e.target.value;M.startedAt=Date.now();M.tick();};$('#music-volume').oninput=e=>{A.settings.volume=+e.target.value;M.setVolume();A.save('settings',A.settings);};}
function refreshMusic(){if($('#mini-play'))$('#mini-play').innerHTML=icon(M.playing?'pause':'play');if($('#player-play'))$('#player-play').innerHTML=icon(M.playing?'pause':'play');}
A.apps.music.render=music;A.actions.musicHome=()=>music('home');A.actions.musicPlayer=()=>music('player');A.actions.musicToggle=M.toggle;A.actions.musicNext=()=>M.next(1);A.actions.musicPrevious=()=>M.next(-1);A.actions.musicPlayTrack=el=>{M.select(el.dataset.id,true);music('player');};A.actions.musicLike=()=>{M.liked=M.liked.includes(M.track.id)?M.liked.filter(x=>x!==M.track.id):[...M.liked,M.track.id];A.save('musicLikes',M.liked);$('#music-like').textContent=M.liked.includes(M.track.id)?'♥':'♡';$('#music-like').setAttribute('aria-pressed',M.liked.includes(M.track.id));};A.actions.musicInfo=()=>A.toast('aura originals — このブラウザで生成したオリジナル音源です');
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
