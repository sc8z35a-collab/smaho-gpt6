'use strict';
(() => {
  const A = window.Aura = {};
  A.$ = (s, root = document) => root.querySelector(s);
  A.$$ = (s, root = document) => [...root.querySelectorAll(s)];
  A.escape = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  A.id = () => globalThis.crypto?.randomUUID?.() || Date.now().toString(36) + Math.random().toString(36).slice(2);
  A.load = (key, fallback) => { try { const value = localStorage.getItem('aura.' + key); return value === null ? fallback : JSON.parse(value); } catch { return fallback; } };
  A.save = (key, value) => { try { localStorage.setItem('aura.' + key, JSON.stringify(value)); return true; } catch { A.toast('保存容量が不足しています。不要な写真を削除してください。'); return false; } };
  A.settings = A.load('settings', {wallpaper:'default', dark:false, wifi:true, bluetooth:true, cellular:true, airplane:false, focus:false, sound:true, brightness:100, volume:60});
  A.actions = {}; A.apps = {}; A.cleanups = []; A.current = null; A.locked = false;
  A.icons = {
    phone:'<path d="M7 3l4 5-3 3c1.6 3.6 3.5 5.5 7 7l3-3 5 4c-1 4-3.6 5-7 3C9 18.8 5.2 15 2 8.5 1 5.8 3 3 7 3Z" fill="currentColor" stroke="none"/>',
    messages:'<path d="M23 11.5C23 17.3 18.1 21 12 21c-1.4 0-2.7-.2-4-.6L3 22l1.5-4C2.9 16.3 2 14.1 2 11.5 2 6.2 6.5 2 12.5 2S23 6.2 23 11.5Z" fill="currentColor" stroke="none"/>',
    safari:'<circle cx="12" cy="12" r="10" fill="#eaf8ff" stroke="none"/><circle cx="12" cy="12" r="8.4" stroke="#60b9ee" stroke-width=".65" stroke-dasharray=".8 1.3"/><path d="m16.8 5.2-2.5 8.4-4.6-3.2Z" fill="#f25b59" stroke="none"/><path d="m7.2 18.8 2.5-8.4 4.6 3.2Z" fill="#4c99dc" stroke="none"/>',
    music:'<path d="M9 18V6l12-3v12M9 9l12-3" stroke="currentColor" stroke-width="2.5"/><ellipse cx="5.9" cy="18.5" rx="3.8" ry="2.6" transform="rotate(-20 5.9 18.5)" fill="currentColor" stroke="none"/><ellipse cx="17.9" cy="15.5" rx="3.8" ry="2.6" transform="rotate(-20 17.9 15.5)" fill="currentColor" stroke="none"/>',
    camera:'<path d="M2 7h4l2-3h8l2 3h4v14H2Z" fill="currentColor" stroke="none"/><circle cx="12" cy="13" r="4.5" fill="#a5acb3" stroke="#d7dce0" stroke-width="1"/><circle cx="12" cy="13" r="3.4" fill="#343b43" stroke="none"/><circle cx="19" cy="9.5" r="1" fill="#e2e5e8" stroke="none"/>',
    weather:'<circle cx="15.5" cy="8" r="5" fill="#ffda67" stroke="none"/><path d="M6 21a5 5 0 0 1-1-10 6.5 6.5 0 0 1 12-1 5.5 5.5 0 0 1 1.5 11Z" fill="#fff" stroke="none"/>',
    mail:'<rect x="1.5" y="4" width="21" height="16" rx="2" fill="currentColor" stroke="none"/><path d="m2.5 5 9.5 8 9.5-8M2.5 19l6.5-6m12.5 6L15 13" stroke="#398bee" stroke-width="1.3"/>',
    clock:'<circle cx="12" cy="12" r="11" fill="#fff" stroke="none"/>' + Array.from({length:12},(_,i)=>{let a=i*Math.PI/6;return `<path d="M${12+9*Math.sin(a)} ${12-9*Math.cos(a)}l${-.9*Math.sin(a)} ${.9*Math.cos(a)}" stroke="#282c32" stroke-width=".6"/>`;}).join('') + '<path d="M12 5v7l4 2" stroke="#292c34" stroke-width="1.3"/><path d="M12 13V3" stroke="#f07552" stroke-width=".5"/><circle cx="12" cy="12" r="1" fill="#f07552" stroke="none"/>',
    maps:'<rect width="24" height="24" rx="4" fill="#e6ecd8" stroke="none"/><path d="m0 8 24 8M7 0l6 24" stroke="#fff" stroke-width="5"/><path d="M-1 20 25 6" stroke="#fff" stroke-width="7"/><path d="M-1 20 25 6" stroke="#eecc86" stroke-width="4"/><path d="m7 21 8-13 4 15-6-4Z" fill="#4d91e8" stroke="#fff" stroke-width="1"/>',
    notes:'<rect x="2" y="1" width="20" height="22" rx="3" fill="#fff" stroke="none"/><path d="M2 6h20" stroke="#f4cd59" stroke-width="7"/><path d="M5 12h14M5 16h14M5 20h10" stroke="#d7d9df" stroke-width=".8"/>',
    reminders:'<circle cx="5" cy="6" r="1.5" stroke="#5894ec" stroke-width="1.2"/><circle cx="5" cy="12" r="1.5" stroke="#ee9566" stroke-width="1.2"/><circle cx="5" cy="18" r="1.5" stroke="#d58bcc" stroke-width="1.2"/><path d="M10 6h11M10 12h11M10 18h11" stroke="#c7cbd4" stroke-width="1"/>',
    files:'<path d="M2 5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2v12H2Z" fill="#5aa6ed" stroke="none"/><path d="M2 9h20v11a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2Z" fill="#9bd2ff" stroke="none"/>',
    calculator:'<rect x="3" y="1" width="18" height="22" rx="3" fill="#38414b" stroke="none"/><rect x="6" y="4" width="12" height="5" rx="1" fill="#abc2c2" stroke="none"/><path d="M6 13h3m-1.5-1.5v3M14 13h4M6 19h3m5-1h4m-4 2h4" stroke="#f2c280" stroke-width="1.3"/>',
    settings:'<path d="m9 2 6 0 .6 2.5 2 .9 2.3-.8 3 5.1-1.8 1.8v2l1.8 1.8-3 5.1-2.3-.8-2 .9L15 23H9l-.6-2.5-2-.9-2.3.8-3-5.1 1.8-1.8v-2L1.1 9.7l3-5.1 2.3.8 2-.9Z" fill="#777f8b" stroke="#d3d9df" stroke-width=".6"/><circle cx="12" cy="12.5" r="6.5" fill="#b9c0c8" stroke="#eef0f3" stroke-width=".6"/><circle cx="12" cy="12.5" r="4.5" fill="#6b7581" stroke="#e0e5e9" stroke-width=".8"/><circle cx="12" cy="12.5" r="2.2" fill="#aeb8c3" stroke="none"/>',
    games:'<path d="M7 6h10c4 0 7 12 4 13-2 1-4-3-6-3H9c-2 0-4 4-6 3C0 18 3 6 7 6Z" fill="currentColor" stroke="none"/><path d="M6 11h5M8.5 8.5v5" stroke="#8e73d5" stroke-width="1.7"/><circle cx="17" cy="10" r="1.1" fill="#a388df" stroke="none"/><circle cx="19" cy="12" r="1.1" fill="#a388df" stroke="none"/>',
    health:'<path d="M12 21C8 18 1 13 1 7.5 1 1 9 0 12 6c3-6 11-5 11 1.5C23 13 16 18 12 21Z" fill="#f2657e" stroke="none"/>',
    wallet:'<rect x="1" y="4" width="22" height="16" rx="3" fill="#313942" stroke="none"/><path d="M4 4h16v3H4Z" fill="#dfa561" stroke="none"/><path d="M4 7h16v3H4Z" fill="#82b9ae" stroke="none"/><path d="M4 10h16v3H4Z" fill="#8caad5" stroke="none"/><path d="M1 13h7l2 3h4l2-3h7v6H1Z" fill="#525a65" stroke="none"/>',
    recorder:'<path d="M2 10v4M5 7v10M8 10v4M11 3v18M14 6v12M17 9v6M20 5v14M23 10v4" stroke="#f75864" stroke-width="1.4"/>',
    search:'<circle cx="10.5" cy="10.5" r="7"/><path d="m16 16 5 5"/>',
    plus:'<path d="M12 4v16M4 12h16"/>',
    edit:'<path d="M14 5 19 10M4 20l5-1L21 7a2 2 0 0 0-5-5L4 14Zm8 0h9"/>',
    trash:'<path d="M3 6h18M9 6V3h6v3M5 6l1 15h12l1-15M10 10v7M14 10v7"/>',
    heart:'<path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0l-1 1-1-1a5.5 5.5 0 0 0-7.8 7.8L12 21l8.8-8.6a5.5 5.5 0 0 0 0-7.8Z"/>',
    share:'<path d="M12 15V2m-4 4 4-4 4 4M5 10H3v11h18V10h-2"/>',
    play:'<path d="m7 3 15 9L7 21Z" fill="currentColor" stroke="none"/>',
    pause:'<path d="M6 4h4v16H6zM15 4h4v16h-4z" fill="currentColor" stroke="none"/>',
    next:'<path d="m3 5 11 7L3 19ZM14 5h4v14h-4Z" fill="currentColor" stroke="none"/>',
    previous:'<path d="m21 5-11 7 11 7ZM6 5h4v14H6Z" fill="currentColor" stroke="none"/>',
    volume:'<path d="M3 9h4l5-4v14l-5-4H3ZM16 8a7 7 0 0 1 0 8M19 4a12 12 0 0 1 0 16"/>',
    sun:'<circle cx="12" cy="12" r="4"/><path d="M12 1v3m0 16v3M1 12h3m16 0h3M4 4l2 2m12 12 2 2M4 20l2-2M18 6l2-2"/>',
    moon:'<path d="M21 14A9 9 0 0 1 10 3 9 9 0 1 0 21 14Z"/>',
    wifi:'<path d="M2 8a16 16 0 0 1 20 0M5 12a11 11 0 0 1 14 0M8 16a6 6 0 0 1 8 0"/><circle cx="12" cy="20" r="1" fill="currentColor" stroke="none"/>',
    bluetooth:'<path d="m7 6 12 12-7 5V1l7 5L7 18"/>',
    airplane:'<path d="m2 9 8 2 7-9 3 1-4 10 6 5-1 2-8-3-6 5-2-1 4-6-7-4Z" fill="currentColor" stroke="none"/>',
    signal:'<path d="M4 17v4M9 12v9M14 7v14M19 2v19" stroke-width="3"/>',
    lock:'<rect x="5" y="10" width="14" height="12" rx="3"/><path d="M8 10V6a4 4 0 0 1 8 0v4"/><circle cx="12" cy="15" r="1"/><path d="M12 16v2"/>',
    flashlight:'<path d="M5 2h14v5l-4 5v9H9v-9L5 7ZM5 7h14M11 15h2"/>',
    refresh:'<path d="M20 7V2m0 5h-5M4 17v5m0-5h5M20 7a9 9 0 0 0-15-2M4 17a9 9 0 0 0 15 2"/>',
    mic:'<rect x="9" y="2" width="6" height="13" rx="3"/><path d="M5 10v2a7 7 0 0 0 14 0v-2M12 19v4m-4 0h8"/>',
    grid:'<rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/>',
    user:'<circle cx="12" cy="8" r="4"/><path d="M4 22v-3a8 8 0 0 1 16 0v3"/>',
    star:'<path d="m12 2 3 6.5 7 1-5 5 1.2 7L12 18l-6.2 3.5 1.2-7-5-5 7-1Z"/>',
    globe:'<circle cx="12" cy="12" r="10"/><ellipse cx="12" cy="12" rx="4" ry="10"/><path d="M2 12h20M4 6h16M4 18h16"/>',
    arrow:'<path d="M5 12h14m-6-6 6 6-6 6"/>',
    backspace:'<path d="m8 5-7 7 7 7h14V5ZM12 9l6 6m0-6-6 6"/>',
    download:'<path d="M12 2v14m-5-5 5 5 5-5M3 16v6h18v-6"/>',
    check:'<path d="m4 12 5 5L20 6"/>',
    timer:'<circle cx="12" cy="14" r="8"/><path d="M9 1h6M12 1v5m6 1 2-2M12 9v5l3 2"/>',
    alarm:'<circle cx="12" cy="13" r="8"/><path d="M12 8v5l3 2M3 5l3-3m12 0 3 3M5 20l-1 2m15-2 1 2"/>',
    headphones:'<path d="M3 15V11a9 9 0 0 1 18 0v4M3 12h3v9H3a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2ZM21 12h-3v9h3a2 2 0 0 0 2-2v-5a2 2 0 0 0-2-2Z"/>',
    document:'<path d="M5 2h9l5 5v15H5Zm9 0v6h5M8 12h8M8 16h8"/>',
    calendar:'<rect x="3" y="5" width="18" height="17" rx="2"/><path d="M7 2v6m10-6v6M3 11h18M7 15h3m4 0h3m-10 4h3"/>',
    photos:'<rect x="3" y="3" width="18" height="18" rx="3"/><circle cx="8" cy="8" r="2"/><path d="m3 17 6-6 4 4 3-3 5 5"/>',
    coffee:'<path d="M3 7h14v8a6 6 0 0 1-12 0V7ZM17 8h2a3 3 0 0 1 0 6h-2M3 22h16M7 1v3m6-3v3"/>'
  };
  A.icon = (name, extra='') => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" ${extra}>${A.icons[name] || A.icons.grid}</svg>`;
  A.photosIcon = () => `<svg viewBox="0 0 60 60" aria-hidden="true">${['#f7bf50','#f4a24b','#f17777','#cc7eb6','#8694d2','#73c2e4','#72c7a9','#bbd567'].map((c,i)=>`<ellipse cx="30" cy="18" rx="8.2" ry="14.5" fill="${c}" fill-opacity=".83" transform="rotate(${i*45} 30 30)"/>`).join('')}</svg>`;
  const appData = [
    ['calendar','カレンダー','#fff'],['photos','写真','#fff'],['camera','カメラ','linear-gradient(145deg,#e1e5e8,#a9b1b9)'],['weather','天気','linear-gradient(145deg,#2975c6,#61b4e7)'],
    ['mail','メール','linear-gradient(145deg,#287bef,#55adf8)'],['clock','時計','#15171b'],['maps','マップ','#ecf1e1'],['notes','メモ','linear-gradient(#f3d470 29%,#fff 29%)'],
    ['reminders','リマインダー','#fff'],['files','ファイル','#fff'],['calculator','計算機','linear-gradient(145deg,#59636d,#35404d)'],['settings','設定','linear-gradient(145deg,#d6dbe0,#a3aab4)'],
    ['games','ゲーム','linear-gradient(140deg,#ad91e2,#8067ce)'],['health','ヘルスケア','#fff'],['wallet','ウォレット','linear-gradient(145deg,#363d46,#222832)'],['recorder','ボイスメモ','#181b20'],
    ['phone','電話','linear-gradient(145deg,#70db87,#32bd5b)'],['safari','ブラウザ','#fff'],['messages','メッセージ','linear-gradient(145deg,#76e58c,#36c967)'],['music','ミュージック','linear-gradient(145deg,#f7768e,#ec476b)']
  ];
  appData.forEach(([id,name,color]) => A.apps[id] = {id,name,color});
  A.launcher = (app, dock=false) => { const now = new Date(); return `<button class="app-launcher" data-app="${app.id}" aria-label="${app.name}を開く"><span class="app-icon ${app.id}-icon" style="background:${app.color}">${app.id==='calendar'?`<small>${['日','月','火','水','木','金','土'][now.getDay()]}曜日</small><b>${now.getDate()}</b>`:app.id==='photos'?A.photosIcon():A.icon(app.id)}</span><span class="app-name">${app.name}</span>${app.id==='mail'&&(A.mailUnread?.()??3)>0?`<span class="app-badge">${Math.min(99,A.mailUnread?.()??3)}</span>`:app.id==='messages'&&dock&&(A.messageUnread?.()??2)>0?`<span class="app-badge">${Math.min(99,A.messageUnread?.()??2)}</span>`:''}</button>`; };
  A.renderHome = () => { A.$('#app-grid').innerHTML=appData.slice(0,16).map(([id])=>A.launcher(A.apps[id])).join('');A.$('#home-dock').innerHTML=appData.slice(16).map(([id])=>A.launcher(A.apps[id],true)).join(''); };
  A.haptic = () => { if(A.settings.sound && navigator.vibrate && navigator.userActivation?.hasBeenActive) navigator.vibrate(7); };
  let toastTimer;
  A.toast = message => { const el=A.$('#toast');el.textContent=message;el.classList.add('visible');clearTimeout(toastTimer);toastTimer=setTimeout(()=>el.classList.remove('visible'),3200); };
  A.cleanup = () => { A.cleanups.splice(0).forEach(fn=>{try{fn();}catch(e){console.warn('App cleanup',e);}}); };
  A.statusTheme = dark => { A.$('#status-bar').classList.toggle('dark', !dark && !A.settings.dark);A.$('#phone-screen').classList.toggle('app-dark',dark); };
  A.open = (id, arg) => {
    if(!A.apps[id]?.render) return;
    A.haptic(); A.cleanup(); A.closeOverlay();A.locked=false; A.current=id;
    A.recentApps=[id,...A.recentApps.filter(item=>item!==id)].slice(0,8);
    A.$('#lock-screen').hidden=true;A.$('#home-screen').hidden=true;A.$('#phone-screen').classList.remove('locked');A.$('#phone-screen').classList.add('in-app');
    const screen=A.$('#app-screen');screen.hidden=false;screen.className='app-screen';screen.style.animation='none';void screen.offsetWidth;screen.style.animation='';
    A.statusTheme(['music','camera','weather'].includes(id));
    A.apps[id].render(arg);
  };
  A.home = () => { A.cleanup();A.closeOverlay();A.current=null;A.locked=false;A.$('#app-screen').hidden=true;A.$('#lock-screen').hidden=true;A.$('#home-screen').hidden=false;A.$('#phone-screen').classList.remove('in-app','app-dark','locked');A.$('#status-bar').classList.remove('dark');A.renderHome();A.updateWidgets(); };
  A.lock = () => { A.home();A.locked=true;A.$('#home-screen').hidden=true;A.$('#lock-screen').hidden=false;A.$('#phone-screen').classList.add('locked');A.updateClock(); };
  A.nav = (title, right='', backApp='', backText='') => `<nav class="app-nav"><button class="nav-action" ${backApp?`data-action="${backApp}"`:'data-action="home"'} aria-label="${backText||'ホームに戻る'}"><span class="back-chevron">‹</span>${backText}</button><h2>${title}</h2><div class="nav-action">${right}</div></nav>`;
  A.tabs = (tabs,selected) => `<nav class="app-tabs">${tabs.map(t=>`<button class="tab-button ${t.id===selected?'active':''}" data-action="${t.action}" ${t.value?`data-value="${t.value}"`:''}>${A.icon(t.icon)}<span>${t.name}</span></button>`).join('')}</nav>`;
  A.search = (id,placeholder='検索') => `<label class="search-field">${A.icon('search')}<input id="${id}" placeholder="${placeholder}" autocomplete="off" aria-label="${placeholder}"></label>`;
  A.row = (icon,title,detail='',action='',value='',color='') => `<button class="list-row" ${action?`data-action="${action}"`:''}>${icon?`<span class="row-icon" ${color?`style="background:${color};color:white"`:''}>${A.icon(icon)}</span>`:''}<span class="row-main"><strong>${title}</strong>${detail?`<small>${detail}</small>`:''}</span>${value?`<span class="row-value">${value}</span>`:''}${action?'<span class="chevron">›</span>':''}</button>`;
  A.empty = (message,icon='document') => `<div class="empty-state">${A.icon(icon)}${message}</div>`;
  A.view = html => { A.$('#app-screen').innerHTML=html; };
  A.overlay = (html, extra='') => { const el=A.$('#overlay');el.className='overlay '+extra;el.innerHTML=html;el.hidden=false;A.$('#phone-screen').classList.add('overlay-open'); };
  A.closeOverlay = () => { A.$('#overlay').hidden=true;A.$('#overlay').innerHTML='';A.$('#phone-screen').classList.remove('overlay-open'); };
  A.overlayTitle = title => `<header class="overlay-heading"><h2>${title}</h2><button class="close-button" data-action="closeOverlay" aria-label="閉じる">×</button></header>`;
  A.confirm = (title,desc,callback) => { A.overlay(`<div class="modal-sheet"><h3>${title}</h3><p>${desc}</p><div class="modal-actions"><button class="secondary-button" data-action="closeOverlay">キャンセル</button><button class="primary-button" id="confirm-yes">確定</button></div></div>`,'sheet-overlay');A.$('#confirm-yes').onclick=()=>{A.closeOverlay();callback();}; };
  A.form = (title,html,onSubmit,button='保存') => { A.overlay(`<div class="modal-sheet" style="margin-top:20px"><h3>${title}</h3><form id="modal-form">${html}<div class="modal-actions"><button type="button" class="secondary-button" data-action="closeOverlay">キャンセル</button><button class="primary-button" type="submit">${button}</button></div></form></div>`,'sheet-overlay'); A.$('#modal-form').onsubmit=e=>{e.preventDefault(); const values=Object.fromEntries(new FormData(e.currentTarget)); if(onSubmit(values)!==false)A.closeOverlay();}; };
  A.download = (blob, name) => { const url=URL.createObjectURL(blob);const a=document.createElement('a');a.href=url;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(url),30000); };
  A.actions.home=A.home;A.actions.closeOverlay=A.closeOverlay;
  A.applySettings = () => { const s=A.settings; A.$('#wallpaper').className='wallpaper '+(s.wallpaper==='default'?'':s.wallpaper);A.$('#phone-screen').classList.toggle('screen-dark-mode',s.dark);A.$('#phone-screen').style.setProperty('--brightness',.4 + s.brightness*.006);A.save('settings',s); };
  A.controls = () => {
    const s=A.settings;
    A.overlay(`${A.overlayTitle('コントロールセンター')}<div class="control-grid"><div class="control-connectivity">${[['airplane','airplane','機内モード','orange'],['cellular','signal','モバイル通信','green'],['wifi','wifi','Wi-Fi',''],['bluetooth','bluetooth','Bluetooth','']].map(([key,ic,label,color])=>`<button class="control-round ${color} ${s[key]?'on':''}" data-action="controlToggle" data-key="${key}" aria-label="${label}" aria-pressed="${s[key]}">${A.icon(ic)}</button>`).join('')}</div><div class="control-music"><strong>${A.music?.track?.title||'ひと息、つこう。'}</strong><small>${A.music?.playing?'aura originals':'音楽で、気分を変えて。'}</small><div><button data-action="musicPrevious" aria-label="前の曲">${A.icon('previous')}</button><button data-action="controlPlay" aria-label="再生・一時停止">${A.icon(A.music?.playing?'pause':'play')}</button><button data-action="musicNext" aria-label="次の曲">${A.icon('next')}</button></div></div><button class="control-tile ${s.focus?'on':''}" data-action="controlToggle" data-key="focus">${A.icon('moon')}集中モード</button><button class="control-tile ${s.dark?'on':''}" data-action="controlToggle" data-key="dark">${A.icon('sun')}ダークモード</button><label class="control-slider">${A.icon('sun')}<input aria-label="画面の明るさ" id="control-brightness" type="range" min="10" max="100" value="${s.brightness}"></label><label class="control-slider">${A.icon('volume')}<input aria-label="音量" id="control-volume" type="range" min="0" max="100" value="${s.volume}"></label><button class="control-single" data-action="flashlight" aria-label="画面ライト">${A.icon('flashlight')}</button><button class="control-single" data-app="clock" aria-label="時計">${A.icon('timer')}</button><button class="control-single" data-app="calculator" aria-label="計算機">${A.icon('calculator')}</button><button class="control-single" data-app="camera" aria-label="カメラ">${A.icon('camera')}</button><button class="control-tile" data-action="lock">${A.icon('lock')}画面をロック</button><button class="control-tile" data-action="about">${A.icon('globe')}auraについて</button></div><p class="control-footer">aura Network — 接続設定はシミュレーションです。<br>明るさ・音量は、この体験内で変更されます。</p>`);
    A.$('#control-brightness').oninput=e=>{s.brightness=+e.target.value;A.applySettings();};
    A.$('#control-volume').oninput=e=>{s.volume=+e.target.value;A.music?.setVolume();A.save('settings',s);};
  };
  A.actions.controlToggle=el=>{const key=el.dataset.key;A.settings[key]=!A.settings[key];if(key==='airplane' && A.settings.airplane)A.settings.cellular=false;A.applySettings();A.controls();};
  A.actions.lock=A.lock;
  A.actions.controlPlay=()=>{A.music?.toggle();A.controls();};
  A.actions.flashlight=()=>{const el=document.createElement('div');el.className='flashlight-screen';el.innerHTML='<button>タップしてライトを消す</button>';el.onclick=()=>el.remove();A.$('#phone-screen').appendChild(el);};
  A.actions.about=()=>A.overlay(`${A.overlayTitle('About this little world')}<div class="about-hero">aura.</div><p class="about-copy">手のひらに、もうひとつの世界。<br>いつもの日常に、少しの好奇心を。</p><div class="about-stats"><div><strong>20</strong><span>APPS</span></div><div><strong>03</strong><span>GAMES</span></div><div><strong>∞</strong><span>CURIOSITY</span></div></div><p class="about-note">auraは、ブラウザの中で動く架空のスマートフォンです。実際のOS、通信サービス、銀行・医療サービスではありません。<br><br>通話・メッセージ・メールはローカルデモです。天気・地図・ヘルスケアはサンプルデータです。音楽はブラウザで生成したオリジナルのアンビエント音源です。<br><br>メモ、設定、写真などはこのブラウザに保存されます。録音はアプリを閉じるまで保持されます。データは他の端末へ同期されません。カメラ・マイクの利用には許可が必要です。</p><p class="control-footer">auraOS 1.0 / DESIGNED TO BE EXPLORED</p>`);
  A.spotlight = () => { A.overlay(`${A.overlayTitle('見つけよう。')}<label class="spotlight-input">${A.icon('search')}<input id="spotlight-query" placeholder="アプリを検索" aria-label="アプリを検索" autocomplete="off"></label><p class="spotlight-label">あなたの小さな世界</p><div class="spotlight-results" id="spotlight-results"></div>`);const render=q=>{const matches=Object.values(A.apps).filter(a=>(a.name+a.id).toLowerCase().includes(q.toLowerCase()));A.$('#spotlight-results').innerHTML=matches.map(a=>A.launcher(a)).join('')||'<p style="grid-column:span 4;font-size:12px;opacity:.65">該当するアプリはありません。</p>';};render('');A.$('#spotlight-query').oninput=e=>render(e.target.value);setTimeout(()=>A.$('#spotlight-query')?.focus(),120); };
  let notificationsCleared=false;
  A.notifications = () => { if(notificationsCleared){A.actions.clearNotifications();return;} A.overlay(`${A.overlayTitle('通知センター')}<p style="font-size:12px;opacity:.6;margin-bottom:30px">${new Date().toLocaleDateString('ja-JP',{month:'long',day:'numeric',weekday:'long'})}</p><div class="group-card" style="background:#ffffff15">${A.row('messages','美咲','週末は、どこか出かけよう ☀','notificationChat','','#60b47b')}${A.row('mail','aura studio','あなたの小さな世界へ、ようこそ。','notificationMail','','#478cdb')}</div><p class="control-footer">デモ通知です。ここからアプリを開けます。</p><button class="primary-button" data-action="clearNotifications" style="background:#ffffff15;margin-top:25px">通知をクリア</button>`); };
  A.actions.notificationChat=()=>A.open('messages','misaki');A.actions.notificationMail=()=>A.open('mail');
  A.actions.clearNotifications=()=>{notificationsCleared=true;A.overlay(`${A.overlayTitle('通知センター')}<div class="empty-state" style="color:#fffa">新しい通知はありません。</div>`);};
  A.updateClock = () => {const d=new Date();const time=d.toLocaleTimeString('ja-JP',{hour:'numeric',minute:'2-digit',hour12:false});A.$('#status-time').textContent=time;A.$('#lock-time').textContent=time;const date=d.toLocaleDateString('ja-JP',{month:'long',day:'numeric',weekday:'long'});A.$('#home-date').textContent=date;A.$('#lock-date').textContent=date;A.$('#widget-day').textContent=d.getDate();A.$('#widget-weekday').textContent=['日','月','火','水','木','金','土'][d.getDay()]+'曜日';A.clockTick?.();A.music?.tick();A.updateWidgets?.();};
  document.addEventListener('click',e=>{const button=e.target.closest('[data-app], [data-action]');if(!button || button.disabled)return;if(button.dataset.app)A.open(button.dataset.app);else{const fn=A.actions[button.dataset.action];if(fn)fn(button,e);}});
  A.$('#status-controls').onclick=A.controls;A.$('#status-time').onclick=A.notifications;A.$('#dynamic-island').onclick=()=>A.open('music','player');A.$('#home-search').onclick=A.spotlight;A.$('#desktop-lock').onclick=A.lock;A.$('#desktop-reset').onclick=A.home;A.$('#power-button').onclick=()=>A.locked?A.home():A.lock();A.$('#unlock-button').onclick=A.home;A.$('#lock-flashlight').onclick=A.actions.flashlight;A.$('#about-button').onclick=A.actions.about;
  let touchStartY=0;A.$('#lock-screen').addEventListener('touchstart',e=>touchStartY=e.touches[0].clientY,{passive:true});A.$('#lock-screen').addEventListener('touchend',e=>{if(touchStartY-e.changedTouches[0].clientY>50)A.home();},{passive:true});
  document.addEventListener('keydown',e=>{if(e.key==='Escape'){if(!A.$('#overlay').hidden)A.closeOverlay();else A.home();}if(e.key==='h' && !['INPUT','TEXTAREA'].includes(e.target.tagName))A.home();});
  // Some mobile browsers force a 980px layout in "desktop site" mode.
  // Compensate only when a touch device's layout is much wider than its screen;
  // ordinary desktop windows and user pinch-zoom remain unchanged.
  const fitViewport=()=>{
    const width=window.innerWidth,physicalWidth=window.screen.width;
    const desktopOnPhone=matchMedia('(pointer: coarse)').matches && physicalWidth>0 && physicalWidth<=600 && width<window.innerHeight && width>physicalWidth*1.4;
    const zoom=desktopOnPhone?Math.min(4,width/physicalWidth):1;
    document.documentElement.style.setProperty('--os-zoom',zoom);
  };
  fitViewport();window.addEventListener('resize',fitViewport);
  // Recent apps are launch shortcuts, not suspended OS processes. No private previews are stored.
  A.recentApps=[];
  A.recents=()=>{
    if(A.locked)return;
    const cards=A.recentApps.map(id=>{
      const app=A.apps[id];
      return `<article class="recent-card"><button class="recent-open" data-action="recentOpen" data-id="${id}" aria-label="${app.name}に切り替える"><span class="app-icon ${id}-icon" style="background:${app.color}">${id==='photos'?A.photosIcon():A.icon(id)}</span><strong>${app.name}</strong><small>${A.current===id?'使用中のアプリに戻る':'アプリを開く'}</small></button><button class="recent-remove" data-action="recentRemove" data-id="${id}" aria-label="${app.name}を履歴から除く">×</button></article>`;
    }).join('');
    A.overlay(`${A.overlayTitle('最近使ったアプリ')}<p class="switcher-copy">いつもの場所へ、すぐに。<br>別のアプリは開始画面から開きます。録音は切替時に終了します。</p>${cards?`<div class="recent-list">${cards}</div><button class="switcher-clear" data-action="recentClear">履歴をクリア</button>`:`<div class="switcher-empty">${A.icon('grid')}まだ履歴がありません。<br>ホームからアプリを開いてみましょう。</div>`}`,'app-switcher');
  };
  A.actions.recents=A.recents;
  A.actions.homeCalendar=()=>{A.open('calendar');A.actions.calendarToday();};
  A.actions.recentOpen=el=>{if(el.dataset.id===A.current)A.closeOverlay();else A.open(el.dataset.id);};
  A.actions.recentRemove=el=>{A.recentApps=A.recentApps.filter(id=>id!==el.dataset.id);A.recents();};
  A.actions.recentClear=()=>{A.recentApps=[];A.recents();};
  A.actions.fullscreen=async()=>{
    try{
      if(document.fullscreenElement){await document.exitFullscreen();return;}
      if(document.fullscreenEnabled && document.documentElement.requestFullscreen){await document.documentElement.requestFullscreen();return;}
    }catch{/* Embedded previews and some mobile browsers deny fullscreen. */}
    A.overlay(`${A.overlayTitle('画面いっぱいで使う')}<div class="fullscreen-help"><p>スマホ画面は、すでにページの表示領域いっぱいに広がっています。</p><p>このブラウザでは全画面切替を利用できません。アドレスバーはWebサイトから強制的に消せません。</p><ol><li>iPhone / iPad：Safariの共有メニューから「ホーム画面に追加」を選びます。</li><li>Android：Chromeのメニューから「ホーム画面に追加」を選びます。表示方法はブラウザによって異なります。</li><li>埋め込みプレビューの場合は、このページを直接ブラウザで開いてください。</li></ol></div>`);
  };
  document.addEventListener('fullscreenchange',()=>{
    const button=A.$('.home-tool[data-action=fullscreen]'),active=!!document.fullscreenElement;
    button.setAttribute('aria-label',active?'全画面を終了':'全画面表示');button.querySelector('span').textContent=active?'全画面終了':'全画面';
  });
  // Update text nodes only: never replace the home grid while a finger is pressing an icon.
  A.updateWidgets=()=>{
    const now=new Date(),date=`${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}-${String(now.getDate()).padStart(2,'0')}`;
    const events=(A.todayEvents?.(date)||[]).slice().sort((a,b)=>a.time.localeCompare(b.time));
    const time=now.toTimeString().slice(0,5),event=events.find(e=>e.time>=time);
    const set=(selector,text)=>{const el=A.$(selector);if(el&&el.textContent!==String(text))el.textContent=text;};
    set('.widget-event>span',event?.title||(events.length?'今日の予定は終了':'今日は自由な一日'));
    set('.widget-event>small',event?`${event.time} · ${event.place||'予定'}`:'タップして予定を追加');
    const c=A.weatherSnapshot?.();
    if(c){set('.widget-top>span:first-child',c.name+' ↗');set('.weather-sun',c.condition);set('.weather-widget>strong',c.temp+'°');set('.weather-widget>span',c.desc+' · サンプル');set('.weather-widget>small',`最高 ${c.high}° 最低 ${c.low}°`);set('.lock-weather',`${c.name} ${c.temp}° · サンプル天気`);}
    const name=A.load('profileName','');
    set('.greeting-note',name?`${name}さん、おかえりなさい。`:'Make room for a little wonder.');
    A.$$('.calendar-icon').forEach(el=>{const day=el.querySelector('b'),weekday=el.querySelector('small');if(day)day.textContent=now.getDate();if(weekday)weekday.textContent=['日','月','火','水','木','金','土'][now.getDay()]+'曜日';});
  };
  const bar=A.$('#home-indicator');
  let gesture=null,holdTimer,suppressClick=false;
  bar.addEventListener('pointerdown',e=>{
    if(e.button!==0)return;
    suppressClick=false;gesture={x:e.clientX,y:e.clientY};bar.setPointerCapture(e.pointerId);
    holdTimer=setTimeout(()=>{gesture=null;suppressClick=true;A.recents();},500);
  });
  bar.addEventListener('pointermove',e=>{
    if(!gesture)return;
    if(Math.abs(e.clientX-gesture.x)>12||Math.abs(e.clientY-gesture.y)>12)clearTimeout(holdTimer);
  });
  bar.addEventListener('pointerup',e=>{
    clearTimeout(holdTimer);
    if(gesture&&gesture.y-e.clientY>25){suppressClick=true;A.locked?A.home():A.recents();}
    gesture=null;
  });
  bar.addEventListener('pointercancel',()=>{clearTimeout(holdTimer);gesture=null;});
  bar.onclick=e=>{if(suppressClick&&e.detail!==0){suppressClick=false;return;}A.home();};
  document.addEventListener('keydown',e=>{if(e.key==='Tab'&&e.altKey){e.preventDefault();A.recents();}});
  A.renderHome();A.applySettings();A.updateClock();setInterval(A.updateClock,1000);
})();
