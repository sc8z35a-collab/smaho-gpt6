'use strict';
(() => {
const A=window.Aura,$=A.$,esc=A.escape,icon=A.icon;
// Photos and camera: samples are remote; imported/captured photos stay local.
const samplePhotos=[['lake','静かな湖'],['coffee','午後のコーヒー'],['mountain','山の稜線'],['flower','季節の花'],['sea','波の音'],['forest','木漏れ日'],['city','夜の街'],['desert','砂のかたち'],['interior','穏やかな部屋']].map(([key,title],i)=>({id:'sample-'+key,url:A.images[key],title,date:Date.now()-i*86400000,sample:true}));
let userPhotos=A.load('photos',[]),favorites=A.load('photoFavorites',[]),photoFilter='all',currentPhoto=null;
const allPhotos=()=>[...userPhotos,...samplePhotos];
const albumPhotos=()=>allPhotos().filter(p=>photoFilter==='favorites'?favorites.includes(p.id):photoFilter==='mine'?!p.sample:true);
const photoTabs=()=>A.tabs([{id:'all',icon:'photos',name:'ライブラリ',action:'photoFilter',value:'all'},{id:'favorites',icon:'heart',name:'お気に入り',action:'photoFilter',value:'favorites'},{id:'mine',icon:'camera',name:'自分の写真',action:'photoFilter',value:'mine'}],photoFilter);
function photos(){A.statusTheme(false);A.view(A.nav('写真',`<button data-action="photoImport" aria-label="写真を追加">${icon('plus')}</button>`)+`<div class="app-content"><h1 class="app-title">${photoFilter==='favorites'?'お気に入り':photoFilter==='mine'?'自分の写真':'写真'}</h1>${photoFilter==='all'?`<button class="photo-featured" data-action="photoOpen" data-id="sample-lake"><img src="${A.images.lake}" alt="山々に囲まれた湖"></button><p class="section-label">すべての写真 · ${allPhotos().length}枚</p>`:''}<div class="photo-grid">${albumPhotos().map(p=>`<button class="photo-tile" data-action="photoOpen" data-id="${p.id}" aria-label="${esc(p.title)}"><img src="${p.url}" alt="${esc(p.title)}" loading="lazy"></button>`).join('')}</div>${photoFilter==='mine'&&!userPhotos.length?A.empty('＋で写真を追加','camera'):photoFilter==='favorites'&&!favorites.length?A.empty('お気に入りなし','heart'):''}<p class="notes-footer">${photoFilter==='mine'?'写真は端末内に保存':'サンプル：Unsplash'}</p></div>`+photoTabs());}
A.apps.photos.render=photos;A.actions.photosHome=photos;A.actions.photoFilter=el=>{photoFilter=el.dataset.value;photos();};
function viewPhoto(id){const p=allPhotos().find(p=>p.id===id);if(!p)return;currentPhoto=id;A.statusTheme(true);A.view(A.nav(esc(p.title),'','photosHome','写真')+`<div class="photo-viewer"><img src="${p.url}" alt="${esc(p.title)}"></div><div class="photo-toolbar"><button data-action="photoPrevious" aria-label="前の写真">${icon('previous')}</button><button data-action="photoShare" aria-label="写真を共有">${icon('share')}</button><button data-action="photoDownload" aria-label="写真をダウンロード">${icon('download')}</button><button class="${favorites.includes(id)?'liked':''}" data-action="photoFavorite" aria-label="お気に入り" aria-pressed="${favorites.includes(id)}">${icon('heart',favorites.includes(id)?'style="fill:currentColor"':'')}</button><button data-action="photoNext" aria-label="次の写真">${icon('next')}</button>${!p.sample?`<button data-action="photoDelete" aria-label="削除">${icon('trash')}</button>`:''}</div>`);}
A.actions.photoOpen=el=>viewPhoto(el.dataset.id);A.actions.photoFavorite=()=>{const next=favorites.includes(currentPhoto)?favorites.filter(x=>x!==currentPhoto):[...favorites,currentPhoto];if(!A.save('photoFavorites',next))return;favorites=next;viewPhoto(currentPhoto);};
const movePhoto=step=>{const list=albumPhotos();if(!list.length)return photos();const index=list.findIndex(p=>p.id===currentPhoto),next=index<0?(step>0?0:list.length-1):(index+step+list.length)%list.length;viewPhoto(list[next].id);};A.actions.photoPrevious=()=>movePhoto(-1);A.actions.photoNext=()=>movePhoto(1);
A.actions.photoDelete=()=>A.confirm('写真を削除','このブラウザに保存された写真を削除します。',()=>{const next=userPhotos.filter(p=>p.id!==currentPhoto),nextFavorites=favorites.filter(id=>id!==currentPhoto);if(!A.save('photoFavorites',nextFavorites))return;if(!A.save('photos',next)){A.save('photoFavorites',favorites);return;}userPhotos=next;favorites=nextFavorites;photos();});
A.actions.photoShare=async()=>{const root=$('.photo-viewer'),p=allPhotos().find(p=>p.id===currentPhoto);if(!root||!p)return A.toast('先に共有する写真を開いてください');A.toast('共有する写真を準備中…');try{const response=await fetch(p.url,{signal:AbortSignal.timeout(15000),credentials:'omit'});if(!response.ok)throw Error();const blob=await response.blob();if(A.current==='photos'&&root.isConnected)A.network.offerFile(blob,`aura-${p.id}.jpg`);}catch{A.toast('写真を取得できません。通信を確認。');}};
A.actions.photoDownload=async()=>{const p=allPhotos().find(p=>p.id===currentPhoto);try{const r=await fetch(p.url);if(!r.ok)throw Error();A.download(await r.blob(),`aura-${p.id}.jpg`);A.toast('写真のダウンロードを開始済み');}catch{A.toast('画像を取得できません。通信を確認。');}};
A.storePhoto=(url,title)=>{const entry={id:A.id(),url,title,date:Date.now(),sample:false};const next=[entry,...userPhotos];if(A.save('photos',next)){userPhotos=next;return true;}return false;};
A.actions.photoImport=()=>{const input=document.createElement('input');input.type='file';input.accept='image/*';input.onchange=()=>{const file=input.files[0];if(!file)return;if(file.size>25*1024*1024)return A.toast('25MB以下の写真を選択');const url=URL.createObjectURL(file),img=new Image();img.onload=()=>{const canvas=document.createElement('canvas'),scale=Math.min(1,1200/Math.max(img.width,img.height));canvas.width=Math.round(img.width*scale);canvas.height=Math.round(img.height*scale);canvas.getContext('2d').drawImage(img,0,0,canvas.width,canvas.height);const ok=A.storePhoto(canvas.toDataURL('image/jpeg',.82),file.name.replace(/\.[^.]+$/,''));URL.revokeObjectURL(url);if(ok){if(A.current==='photos')photos();A.toast('写真を追加済み');}};img.onerror=()=>{URL.revokeObjectURL(url);A.toast('この画像形式は読み込めませんでした');};img.src=url;};input.click();};
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
    detail:'温かなエレピ、指弾き風ベース、ブラシとスウィング。9thの和音から静かなブリッジを経て、夕暮れの主題へ。',
    chords:[[38,54,57,61,64],[35,54,57,61,66],[43,54,57,59,62],[45,55,59,62,64],[42,52,57,61,64],[35,54,57,61,64],[40,55,59,62,66],[45,55,57,61,64]],
    bridge:[[43,54,57,59,64],[42,52,56,61,64],[35,54,57,61,66],[40,55,59,62,66],[43,54,57,62,66],[38,54,57,61,64],[40,55,59,62,66],[45,55,57,61,64]],
    sections:[[0,'Prelude',.35],[4,'Sunlit theme',.68],[12,'Pocket',.83],[20,'Open windows',1],[28,'Blue interlude',.4],[36,'Homeward',.78],[44,'Golden bloom',1],[52,'Afterglow',.55],[56,'Coda',.25]],
    melody:[[[0,0,1],[1.5,1,.5],[2.5,3,.5],[3,2,.8]],[[.5,1,.7],[2,0,1.6]],[[0,2,.8],[1.5,3,.4],[2,4,.7],[3,2,.8]],[[0,1,1.4],[2.5,0,1]],[[.5,0,.6],[1.5,2,.6],[2.5,3,1]],[[0,4,1],[1.5,3,.5],[2.5,1,1]],[[0,2,.8],[1,1,.6],[2.5,0,1]],[[.5,1,1],[2,0,1.7]]]},
  {id:'tide',title:'A Quiet Tide',artist:'aura sounds',album:'QUIET\nTIDES',art:'art-tide',length:214,tempo:64,bars:56,key:'C minor / E♭ major',style:'Tidal chamber ambient',seed:83,swing:.025,
    detail:'フェルト風ピアノとガラスの倍音、ゆっくり膨らむ弦の層。波音のうねりと長い余韻の間に旋律が浮かびます。',
    chords:[[36,55,58,62,63],[44,55,58,60,63],[39,55,58,62,65],[46,53,58,60,62],[41,56,60,63,67],[36,55,58,62,67],[44,55,58,60,63],[43,53,59,62,65]],
    bridge:[[44,55,58,60,63],[46,53,58,62,65],[39,55,58,62,65],[48,55,58,62,67],[41,56,60,63,67],[44,55,58,60,63],[38,53,56,60,65],[43,53,59,62,65]],
    sections:[[0,'Shoreline',.25],[4,'First tide',.52],[12,'Undertow',.7],[20,'Silver water',.9],[28,'Still water',.25],[36,'Returning tide',.68],[44,'Horizon',1],[52,'Dissolve',.2]],
    melody:[[[0,3,1.7],[2.5,2,1]],[[1,0,2.3]],[[.5,1,1],[2,3,1.5]],[[0,2,2.5]],[[0,4,1.4],[2,3,1.6]],[[.5,1,2.5]],[[0,2,1.2],[2,0,1.5]],[[1,1,2.2]]]},
  {id:'orbit',title:'Somewhere, Softly',artist:'aura sounds',album:'SOFT\nORBIT',art:'art-orbit',length:186,tempo:82,bars:62,key:'E major / C♯ minor',style:'Orbital downtempo',seed:149,swing:.055,
    detail:'左右にほどけるアルペジオ、柔らかなアナログ・プラックとサブベース。ハーフタイムの空白から、星屑のようなフィナーレへ。',
    chords:[[40,56,59,63,66],[37,56,59,63,68],[45,56,59,61,64],[47,54,59,61,66],[44,54,59,63,66],[37,56,59,63,68],[42,57,61,64,68],[47,57,59,63,66]],
    bridge:[[37,56,59,63,68],[45,56,59,61,64],[40,56,59,63,66],[47,54,59,61,66],[42,57,61,64,68],[44,54,59,63,66],[45,56,59,61,64],[47,57,59,63,66]],
    sections:[[0,'Ignition',.32],[4,'Soft orbit',.65],[12,'Satellites',.82],[20,'Constellation',1],[28,'Weightless',.3],[36,'Re-entry',.72],[44,'Wide awake',1],[52,'Last light',.72],[60,'Landing',.2]],
    melody:[[[.5,0,.6],[1.5,2,.5],[2.5,3,1]],[[0,4,.8],[1.5,2,.6],[3,1,.6]],[[0,2,.5],[1,3,.7],[2.5,4,1]],[[.5,2,1],[2,0,1.5]],[[0,1,.7],[1.5,3,.7],[3,2,.7]],[[.5,4,.7],[2,3,.5],[3,1,.5]],[[0,2,1],[1.5,1,.5],[2.5,0,.8]],[[0,1,1.5],[2.5,0,1]]]}
];
const musicSection=(track,seconds)=>track.sections.filter(s=>s[0]*240/track.tempo<=seconds).at(-1)||track.sections[0];
// Stateless humanisation: a seek always lands on the same performance.
const musicRandom=(seed,index)=>{const x=Math.sin(seed*127.1+index*311.7)*43758.5453;return x-Math.floor(x);};
const scoreCache=new Map();
function musicScore(track){
  if(scoreCache.has(track.id))return scoreCache.get(track.id);
  const events=[],beat=60/track.tempo,barTime=beat*4;
  const tail={pad:1.8,keys:1.1,piano:1.6,lead:.6,glass:2.1,arp:.45,bass:.12};
  function add(kind,bar,step,midi,duration,velocity,pan=0){
    const index=events.length,r=musicRandom(track.seed,index),swing=step%1===.5?track.swing:0;
    const time=Math.max(0,(bar*4+step+swing)*beat+(r-.5)*.018);
    if(time>=track.length-2)return;
    events.push({kind,time,midi,duration:Math.min(duration*beat+(tail[kind]||0),track.length-time),velocity:velocity*(.92+r*.16),pan:Math.max(-1,Math.min(1,pan)),seed:index+track.seed});
  }
  for(let bar=0;bar<track.bars;bar++){
    const section=musicSection(track,bar*barTime+.001),energy=section[2],intro=bar<4;
    const bridge=bar>=28&&bar<36,outro=bar>=track.sections.at(-1)[0];
    const harmony=bridge?track.bridge:track.chords;
    const ci=Math.floor((bridge?bar-28:bar)/2)%8;
    const chord=outro?track.chords[0]:harmony[ci],next=harmony[(ci+1)%8];
    const dusk=track.id==='dusk',tide=track.id==='tide';
    if(bar%2===0){
      chord.slice(1).forEach((n,i)=>add('pad',bar,i*.018,n,7.6,.055*energy,(i-1.5)*.38));
      if(tide||intro||bridge||outro)add('air',bar,0,0,7.9,tide?.035:.012,Math.sin(bar)*.4);
    }
    // Root / fifth / approach notes give the bass a phrase, not a static drone.
    if(tide){
      if(bar%2===0)add('bass',bar,0,chord[0]-12,6.6,.18*energy);
    }else{
      const pattern=intro||bridge||outro?[[0,0,2.8]]:dusk?[[0,0,1.2],[1.75,0,.5],[2.5,7,.65],[3.5,0,.35]]:[[0,0,1.3],[1.5,12,.45],[2.75,0,.65]];
      pattern.forEach(([s,n,d])=>add('bass',bar,s,chord[0]+n,d,.23*energy));
      if(bar%2===1&&!intro&&!outro&&!bridge)add('bass',bar,3.75,next[0]-(next[0]>chord[0]?1:-1),.18,.1*energy);
    }
    const keyKind=tide?'piano':dusk?'keys':'lead';
    const comp=tide?[0]:intro||bridge||outro?[.1]:dusk?[0,1.5,3.25]:[.5,2.5];
    if(!tide||bar%2===0)comp.forEach((step,j)=>chord.slice(1).forEach((n,i)=>{
      add(keyKind,bar,step+i*(tide?.07:.018),n,tide?3.2:j===0?1.1:.65,(tide?.075:dusk?.078:.045)*energy,((i-1.5)*.16)-.12);
    }));
    // Eight authored call/response motifs, reharmonised in the bridge. Leave breaths.
    if(!intro&&!outro&&(!bridge||bar%2===0)){
      const motif=track.melody[(bar-4+track.melody.length)%track.melody.length];
      const upper=[...chord.slice(1).map(n=>n+12),chord[1]+24];
      motif.forEach(([step,degree,duration],i)=>{
        const pitch=upper[(degree+(bridge?1:0))%5];
        add(tide?'piano':dusk?'keys':'lead',bar,step,pitch,duration,(tide?.19:dusk?.16:.13)*(bridge?.7:1),.12+Math.sin(bar+i)*.16);
      });
      if(energy>=.9&&bar%4===3){
        [0,1,2].forEach((n,i)=>add('glass',bar,2+i*.5,upper[3-n],.65,.055,-.55+i*.5));
      }
    }else if(bar%2===0){
      add(tide?'glass':'keys',bar,.15,chord[3]+12,3,.11,.25);
      if(bar%4===2)add(tide?'piano':'glass',bar,2.5,chord[2]+12,1,.065,-.3);
    }
    if(!dusk&&(!intro||bar>=2)&&!outro){
      const steps=tide?[.75,2.25,3.5]:bridge?[.5,2.5]:[0,.5,1,1.5,2,2.5,3,3.5];
      steps.forEach((s,i)=>{
        if(tide&&bar%2===1&&i===2)return;
        const order=[0,2,1,3,2,0,3,1],n=chord[1+order[(i+bar%4)%8]]+(tide?12:12+(bar%8===7&&i>5?12:0));
        add(tide?'glass':'arp',bar,s,n,tide?1.5:.35,(tide?.038:.06)*energy,Math.sin((bar*8+i)*1.7)*.65);
      });
    }
    // Three distinct rhythm sections, with ghost notes and end-of-phrase fills.
    if(!intro&&!outro&&!bridge){
      if(tide){
        if(bar%2===0)add('kick',bar,0,0,.32,.1*energy);
        if(bar%2===1)add('brush',bar,2.1,0,.8,.055*energy,-.35);
        [1.5,3.5].forEach(s=>add('shaker',bar,s,0,.12,.028*energy,.45));
      }else{
        (dusk?[0,1.75,2.5]:[0,1.5,2.75]).forEach((s,i)=>add('kick',bar,s,0,.38,(i===0?.5:.34)*energy));
        (dusk?[1,3]:[2]).forEach(s=>{add('snare',bar,s+.018,0,.22,.18*energy,.08);add('clap',bar,s+.045,0,.18,.07*energy,-.15);});
        if(bar%2===1)add('snare',bar,dusk?2.75:3.75,0,.13,.04*energy,-.2);
        for(let i=0;i<8;i++)add('hat',bar,i*.5,0,i===7&&bar%4===3?.3:.075,(i%2?.062:.037)*energy,i%2?.34:-.26);
        if(energy>=.8)for(let i=0;i<4;i++)add('shaker',bar,.25+i,0,.09,.033*energy,-.5);
      }
      if(bar%8===7){
        [3.25,3.5,3.75].forEach((s,i)=>add(tide?'glass':'tom',bar,s,tide?chord[4]+12:45-i*3,.22,tide?.04:.075+i*.015,(i-1)*.45));
      }
    }
    if(bar>0&&track.sections.some(s=>s[0]===bar)&&!outro){
      add('swell',bar-1,2,0,2,.055,-.3);
      add('chime',bar,0,chord[4]+12,2,.045,.5);
    }
  }
  events.sort((a,b)=>a.time-b.time);scoreCache.set(track.id,events);return events;
}

// Each playback owns its complete graph, including effect tails. Disposing a
// session cannot leak an old track's reverb into a seek or the next track.
const musicAudioCache=new WeakMap();
class OriginalMusicEngine{
  constructor(context,track,destination){
    this.context=context;this.track=track;this.nodes=[];this.voices=new Set();this.disposed=false;
    const c=context,node=n=>(this.nodes.push(n),n);
    this.output=node(c.createGain());this.output.gain.value=.8;
    const highpass=node(c.createBiquadFilter());highpass.type='highpass';highpass.frequency.value=28;
    const glue=node(c.createDynamicsCompressor());glue.threshold.value=-19;glue.knee.value=15;glue.ratio.value=2.4;glue.attack.value=.025;glue.release.value=.22;
    const ceiling=node(c.createDynamicsCompressor());ceiling.threshold.value=-3;ceiling.knee.value=0;ceiling.ratio.value=20;ceiling.attack.value=.002;ceiling.release.value=.09;
    this.output.connect(highpass);highpass.connect(glue);glue.connect(ceiling);ceiling.connect(destination);
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
    this.buses={};
    for(const [name,level,send,echoSend] of [['keys',.95,.22,.13],['pad',.72,.38,0],['bass',.82,.015,0],['drums',.7,.07,0],['air',.48,.36,0],['lead',.85,.3,.3]]){
      const bus=node(c.createGain()),wet=node(c.createGain()),echoGain=node(c.createGain());bus.gain.value=level;wet.gain.value=send;echoGain.gain.value=echoSend;
      const eq=node(c.createBiquadFilter());eq.type='highpass';eq.frequency.value={keys:120,pad:170,bass:28,drums:35,air:240,lead:160}[name];eq.Q.value=.6;
      bus.connect(eq);eq.connect(this.output);eq.connect(wet);wet.connect(convolver);eq.connect(echoGain);echoGain.connect(delayL);this.buses[name]=bus;
    }
    this.noise=cache.get(track.id).noise;
  }
  timeline(start,offset){
    const end=start+this.track.length-offset,fade=Math.max(start,end-4);
    const gain=this.output.gain;gain.cancelScheduledValues(start);gain.setValueAtTime(.0001,start);
    gain.linearRampToValueAtTime(.8*Math.min(1,(this.track.length-offset)/4),Math.min(start+.06,end));
    if(fade>start+.06)gain.setValueAtTime(.8,fade);
    gain.linearRampToValueAtTime(.0001,end);
  }
  schedule(event,time,offset=0){
    if(this.disposed)return;
    const c=this.context,kind=event.kind,duration=event.duration-offset;
    if(duration<.025)return;
    const sources=[],nodes=[],keep=n=>(nodes.push(n),n),amp=keep(c.createGain()),pan=keep(c.createStereoPanner());
    const tone=keep(c.createBiquadFilter());tone.type='lowpass';tone.Q.value=.55;
    const pitched=['keys','piano','lead','glass','arp','pad','bass','chime'].includes(kind);
    const bus=kind==='pad'?'pad':kind==='bass'?'bass':['air','swell'].includes(kind)?'air':!pitched?'drums':['lead','arp','glass','chime'].includes(kind)?'lead':'keys';
    pan.pan.value=event.pan;amp.connect(tone);tone.connect(pan);pan.connect(this.buses[bus]);
    const f=440*Math.pow(2,((event.midi||48)-69)/12),v=event.velocity;
    let attack=.009,release=Math.min(.12,duration*.25),level=v,sustain=.32;
    const oscillator=(type,freq,weight=1,detune=0)=>{
      const o=keep(c.createOscillator()),g=keep(c.createGain());o.type=type;o.frequency.setValueAtTime(freq,time);o.detune.value=detune;g.gain.value=weight;o.connect(g);g.connect(amp);sources.push(o);return o;
    };
    const noise=(filterType,freq,q=.7)=>{
      const source=keep(c.createBufferSource()),filter=keep(c.createBiquadFilter());source.buffer=this.noise;source.loop=true;filter.type=filterType;filter.frequency.value=freq;filter.Q.value=q;source.connect(filter);filter.connect(amp);sources.push(source);return filter;
    };
    tone.frequency.setValueAtTime(9000,time);
    if(kind==='keys'||kind==='piano'){
      // A decaying FM tine / hammer plus independently damped string partials.
      const carrier=oscillator('sine',f,.72),mod=keep(c.createOscillator()),index=keep(c.createGain());
      mod.frequency.value=f*(kind==='keys'?2:3.002);index.gain.setValueAtTime(f*(kind==='keys'?1.15:.28)*v,time);index.gain.exponentialRampToValueAtTime(.01,time+Math.min(duration,.65));mod.connect(index);index.connect(carrier.frequency);sources.push(mod);
      oscillator('sine',f*2.001,.2);oscillator('sine',f*3.003,.065);oscillator('sine',f*.999,.12);
      attack=kind==='piano'?.01:.014;release=Math.min(kind==='piano'?1.5:.85,duration*.55);sustain=.16;
      tone.frequency.setValueAtTime((kind==='piano'?2800:3800)+v*6000,time);
      if(kind==='keys'){
        const tremolo=keep(c.createOscillator()),depth=keep(c.createGain());tremolo.frequency.value=4.2;depth.gain.value=v*.035;tremolo.connect(depth);depth.connect(amp.gain);sources.push(tremolo);
        // Taper modulation as well as the carrier, avoiding a buzz at note-off.
        depth.gain.setValueAtTime(v*.035,time);depth.gain.exponentialRampToValueAtTime(.000001,time+duration);
      }
    }else if(kind==='pad'){
      oscillator('triangle',f,.42,-5);oscillator('triangle',f,.42,5);oscillator('sine',f/2,.12);
      const lfo=keep(c.createOscillator()),depth=keep(c.createGain());lfo.frequency.value=.11+musicRandom(event.seed,2)*.12;depth.gain.value=260;lfo.connect(depth);depth.connect(tone.frequency);sources.push(lfo);
      attack=Math.min(1.5,duration*.3);release=Math.min(1.8,duration*.4);sustain=.8;
      tone.frequency.setValueAtTime(1000,time);tone.frequency.linearRampToValueAtTime(1800,time+duration*.5);tone.frequency.linearRampToValueAtTime(850,time+duration);
    }else if(kind==='lead'||kind==='arp'){
      oscillator('sawtooth',f,.4,-4);oscillator('triangle',f,.55,4);oscillator('sine',f/2,.08);
      attack=.013;sustain=kind==='arp'?.13:.28;release=Math.min(.55,duration*.5);
      tone.frequency.setValueAtTime(Math.min(9000,f*9),time);tone.frequency.exponentialRampToValueAtTime(Math.max(500,f*1.5),time+duration);tone.Q.value=1.2;
    }else if(kind==='glass'||kind==='chime'){
      oscillator('sine',f,.65);oscillator('sine',f*2.756,.13);oscillator('sine',f*4.07,.055);
      attack=.004;sustain=.1;release=Math.min(2,duration*.65);tone.frequency.setValueAtTime(7000,time);
    }else if(kind==='bass'){
      oscillator('sine',f,.82);oscillator('triangle',f,.23);oscillator('sine',f*2,.08);
      tone.frequency.setValueAtTime(650,time);attack=.018;sustain=.65;release=Math.min(.17,duration*.3);
    }else if(kind==='kick'){
      const o=oscillator('sine',125,.9);o.frequency.exponentialRampToValueAtTime(this.track.id==='tide'?42:48,time+.13);
      tone.frequency.setValueAtTime(1200,time);attack=.005;sustain=.07;release=duration*.65;
      const bass=this.buses.bass.gain;bass.setValueAtTime(.82,time);bass.linearRampToValueAtTime(this.track.id==='tide'?.74:.56,time+.012);bass.exponentialRampToValueAtTime(.82,time+.2);
    }else if(kind==='tom'){
      const o=oscillator('sine',f*1.7,.85);o.frequency.exponentialRampToValueAtTime(f,time+.1);tone.frequency.setValueAtTime(900,time);sustain=.06;release=duration*.65;
    }else if(kind==='snare'||kind==='clap'){
      noise('bandpass',kind==='clap'?1700:2400,.8);if(kind==='snare')oscillator('triangle',185,.35);
      attack=.002;sustain=.12;release=duration*.7;tone.frequency.setValueAtTime(7000,time);
    }else if(kind==='hat'||kind==='shaker'||kind==='brush'){
      noise(kind==='brush'?'highpass':'bandpass',kind==='hat'?7400:kind==='brush'?2200:6200,.7);attack=kind==='brush'?.05:.003;sustain=.12;release=duration*.65;
      tone.frequency.setValueAtTime(kind==='brush'?6200:10000,time);
    }else{
      const filter=noise('bandpass',550,.6);attack=duration*(kind==='swell'?.65:.4);release=duration*.3;sustain=.85;
      filter.frequency.setValueAtTime(350,time);filter.frequency.exponentialRampToValueAtTime(kind==='swell'?4200:1100,time+duration*.6);filter.frequency.exponentialRampToValueAtTime(400,time+duration);
    }
    // A carried note starts softly at its decayed level instead of re-attacking.
    if(offset>0){attack=.025;level*=Math.exp(-offset/(kind==='pad'?15:kind==='bass'?4:1.8));}
    attack=Math.min(attack,duration*.25);release=Math.min(release,duration*.65);
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
      if(e.time+e.duration>M.position&&['pad','bass','keys','piano','glass','lead','arp','air'].includes(e.kind))M.engine.schedule(e,M.audioStartedAt,M.position-e.time);
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
