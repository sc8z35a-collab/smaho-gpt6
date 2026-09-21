'use strict';
(() => {
  const A = window.Aura = {};
  A.$ = (s, root = document) => root.querySelector(s);
  A.$$ = (s, root = document) => [...root.querySelectorAll(s)];
  A.escape = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  A.id = () => globalThis.crypto?.randomUUID?.() || Date.now().toString(36) + Math.random().toString(36).slice(2);
  A.load = (key, fallback) => { try { const value = localStorage.getItem('aura.' + key); return value === null ? fallback : JSON.parse(value); } catch { return fallback; } };
  A.save = (key, value) => { try { localStorage.setItem('aura.' + key, JSON.stringify(value)); return true; } catch { A.toast('容量不足。不要な写真を削除'); return false; } };
  // Related writes use snapshots so a failed write does not report success.
  // localStorage has no transactions: rollback is best effort if storage itself
  // becomes unavailable or another tab consumes its capacity.
  A.saveBatch = values => {
    let pending=[];const written=[];
    try {
      const keys=Object.keys(values);
      if(keys.length===1)return A.save(keys[0],values[keys[0]]);
      pending=Object.entries(values).map(([key,value])=>{
        const encoded=JSON.stringify(value);
        if(encoded===undefined)throw new Error('Invalid stored value');
        return {key:'aura.'+key,encoded};
      });
      pending.forEach(item=>item.previous=localStorage.getItem(item.key));
      for(const item of pending){localStorage.setItem(item.key,item.encoded);written.push(item);}
      return true;
    } catch {
      let restored=true;
      for(const item of written)try{localStorage.removeItem(item.key);}catch{restored=false;}
      for(const item of written)if(item.previous!==null)try{localStorage.setItem(item.key,item.previous);}catch{restored=false;}
      A.toast(restored?'保存失敗。変更は未反映':'保存・復元失敗。データを書き出して確認');
      return false;
    }
  };
  A.settings = A.load('settings', {wallpaper:'default', dark:false, wifi:true, bluetooth:true, cellular:true, airplane:false, focus:false, sound:true, brightness:100, volume:60});
  A.actions = {}; A.apps = {}; A.cleanups = []; A.current = null; A.locked = false;
  A.icons = {
    pin:'<path d="m8 3 8 0-1 6 4 4v2h-6v7l-2-2v-5H5v-2l4-4Z"/>',
    layers:'<path d="m12 3 10 5-10 5L2 8Zm-10 9 10 5 10-5M2 16l10 5 10-5"/>',
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
    close:'<path d="m6 6 12 12M18 6 6 18"/>',
    minus:'<path d="M4 12h16"/>',
    info:'<circle cx="12" cy="12" r="9"/><path d="M12 11v6M12 7v1"/>',
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
  // App artwork is separate from the small, monochrome UI action glyphs above.
  // Every instance owns its SVG definitions: home, search and overlays can coexist.
  const appArtwork = (() => {
    const rect = (x,y,w,h,r,fill,extra='') => `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${r}" fill="${fill}" ${extra}/>`;
    const circle = (x,y,r,fill,extra='') => `<circle cx="${x}" cy="${y}" r="${r}" fill="${fill}" ${extra}/>`;
    const path = (d,fill,extra='') => `<path d="${d}" fill="${fill}" ${extra}/>`;
    const line = (d,color='#fff',width=1,extra='') => path(d,'none',`stroke="${color}" stroke-width="${width}" ${extra}`);
    const text = (x,y,label,size,color,extra='') => `<text x="${x}" y="${y}" fill="${color}" font-size="${size}" font-family="Arial, sans-serif" text-anchor="middle" ${extra}>${label}</text>`;
    const paint = name => `url(#ai-${name})`;
    const paper = paint('paper'), white = paint('white'), metal = paint('metal'), ink = paint('ink'), gold = paint('gold'), blue = paint('blue'), green = paint('green'), rose = paint('rose'), violet = paint('violet');
    const shadow = content => `<g filter="url(#ai-shadow)">${content}</g>`;
    const ticks = (cx,cy,r,count,color,width=1) => Array.from({length:count},(_,i)=>line(`M${cx} ${cy-r}v${i%5===0?3.7:1.6}`,color,i%5===0?width*1.4:width,`transform="rotate(${i*360/count} ${cx} ${cy})"`)).join('');
    const rule = (x,y,length,color='#bcc6d1') => line(`M${x} ${y}h${length}`,color,1.2);
    const screw = (x,y) => circle(x,y,1.8,'#435268')+circle(x,y-.15,1.5,metal)+circle(x,y-.15,1.1,'none','stroke="#f9fcff" stroke-width=".18"')+line(`M${x-.7} ${y+.55}l1.4-1.4`,'#526073',.5);
    const fine = content => `<g class="app-fine-detail">${content}</g>`;
    const texture = (x,y,w,h,r,name) => fine(rect(x,y,w,h,r,paint(name)));
    const rim = (x,y,r) => circle(x,y,r,'none','stroke="url(#ai-rim)" stroke-width=".65"');
    const bookLines = (x,y,count,length,color='#aebac9') => Array.from({length:count},(_,i)=>rule(x,y+i*5,length-(i===count-1?6:0),color)).join('');
    // Animate authored SVG layers, never the launcher or its hit target.
    // Wrappers retain local geometry, gradients, texture and existing transforms.
    const motion = (name, content, origin='40px 40px', phase=0) => `<g class="icon-motion motion-${name}" style="transform-origin:${origin};--motion-phase:${phase}s">${content}</g>`;
    const art = {};

    art.calendar = now => shadow(rect(10,14,60,57,8,'#b7c0ce')+rect(10,11,60,57,8,paper)+rect(10,11,60,18,8,rose)+rect(10,21,60,8,0,rose))+
      line('M15 65h50M15 68h50','#fff',.8)+[24,56].map(x=>circle(x,16,3.4,'#b94c64')+rect(x-1.5,7,3,12,1.5,metal)).join('')+
      text(40,24,['日','月','火','水','木','金','土'][now.getDay()]+'曜日',8.4,'#fff','class="app-calendar-weekday" font-weight="700"')+
      text(40,57,now.getDate(),30,'#26344a','class="app-calendar-date" font-weight="600" letter-spacing="-1.5"')+
      [27,34,41,48,55].map((x,i)=>circle(x,62,1.1,i===2?'#ee7589':'#ccd3de')).join('');
    art.photos = () => shadow(Array.from({length:8},(_,i)=>{
      const colors=['#ffc84e','#ff9948','#f27282','#c477c1','#8b89e1','#67b5ef','#62c8b2','#b4d768'];
      return `<g transform="rotate(${i*45} 40 40)"><ellipse cx="40" cy="25" rx="11" ry="19" fill="${colors[i]}" fill-opacity=".82"/><ellipse cx="38" cy="22" rx="7" ry="13" fill="url(#ai-glow)"/>${line('M40 9c-6 6-8 15-4 22','#fff',.7,'opacity=".55"')}</g>`;
    }).join(''))+circle(40,40,6,'#fff','opacity=".65"')+circle(38,38,2,'#fff','opacity=".65"');
    art.camera = () => shadow(path('M12 24h12l5-8h22l5 8h12a6 6 0 0 1 6 6v30a6 6 0 0 1-6 6H12a6 6 0 0 1-6-6V30a6 6 0 0 1 6-6Z',metal)+rect(7,34,66,25,3,ink)+rect(10,19,11,5,2,ink)+rect(58,27,10,5,1.5,paper))+
      Array.from({length:7},(_,i)=>line(`M${11+i*2} 38v16`,'#75808e',.55)).join('')+
      circle(42,44,23,ink)+circle(42,44,20.5,metal)+ticks(42,44,19,48,'#4a5668',.5)+circle(42,44,16.5,ink)+circle(42,44,13.6,paint('lens'))+
      circle(42,44,11.8,'#0c2035')+motion('aperture',Array.from({length:7},(_,i)=>path('M42 32.3a11.7 11.7 0 0 1 9.15 4.4L46.6 43l-4.6-5.3Z',paint('blade'),`stroke="#93b8cc" stroke-width=".22" transform="rotate(${i*360/7} 42 44)"`)).join(''),'42px 44px',0)+
      circle(42,44,5.7,'#081623')+circle(42,44,13.6,paint('lens-coat'))+rim(42,44,13.6)+rim(42,44,16.4)+
      path('M31 38a12 12 0 0 1 14-6l-3 4a9 9 0 0 0-9 5Z','#d4ffff','opacity=".48"')+
      '<ellipse cx="46" cy="51" rx="4.8" ry="1.3" transform="rotate(-30 46 51)" fill="#aeaaff" opacity=".28"/>'+
      circle(38,39,1.5,'#e3ffff','opacity=".9"')+line('M28 36a17 17 0 0 1 21-6','#fff',.7,'opacity=".85"')+circle(17,29,2,'#8d263d')+circle(17,28.7,1.4,rose)+screw(11,61)+screw(68,61);
    art.weather = () => circle(51,26,22,'#fff','opacity=".06"')+motion('sun',Array.from({length:12},(_,i)=>line('M51 5v4','#ffdf87',1.5,`transform="rotate(${i*30} 51 26)"`)).join(''),'51px 26px',0)+
      shadow(circle(51,26,15,paint('sun')))+circle(47,22,9,paint('glow'))+
      motion('cloud',shadow(path('M19 62a12 12 0 0 1-1-24 16 16 0 0 1 30-2 13 13 0 1 1 10 26Z',paint('cloud')))+
      path('M18 39a16 16 0 0 1 29-2 13 13 0 0 1 13 2c-11-2-12 8-22 7-8-1-8-8-20-7Z','#fff','opacity=".4"')+
      line('M10 51a10 10 0 0 0 10 9h38a11 11 0 0 0 9-5','#a5c6e2',.75,'opacity=".6"')+
      line('M17 43a8 8 0 0 1 6-1 12 12 0 0 1 22-5','#fff',1),'40px 40px',0)+line('M23 66h27M28 70h14','#def3ff',1.1,'opacity=".45"');
    art.mail = () => shadow(rect(12,22,56,42,6,'#1868bb')+rect(19,14,42,40,4,paper))+
      rect(25,20,13,3,1,'#88bbdf')+bookLines(25,28,3,28,'#c3d3e2')+
      shadow(rect(10,29,60,36,5,white))+path('M11 31l29 23 29-23v30H11Z','#d2e6f9')+
      path('M11 63l22-20c4-3 10-3 14 0l22 20Z',paper)+line('M12 62l21-18m14 0 21 18','#9bbddd',.9)+
      path('M11 30l27 22a3 3 0 0 0 4 0l27-22',white,'stroke="#aacbea" stroke-width="1"')+line('M14 31l25 19h2l25-19','#fff',1.2);
    art.clock = now => shadow(circle(40,40,34,metal))+circle(40,40,31,ink)+circle(40,40,28.5,paper)+ticks(40,40,26,60,'#5f6a7a',.6)+
      [[40,22,'12'],[59,43,'3'],[40,63,'6'],[21,43,'9']].map(([x,y,n])=>text(x,y,n,7,'#354158','font-weight="600"')).join('')+
      line('M40 42V25','#27344b',3.4,`class="app-clock-hour" transform="rotate(${(now.getHours()%12)*30+now.getMinutes()/2} 40 40)"`)+
      line('M40 43V19','#27344b',2.1,`class="app-clock-minute" transform="rotate(${now.getMinutes()*6} 40 40)"`)+
      line('M40 46V16','#ed7966',.9,`class="app-clock-second" transform="rotate(${now.getSeconds()*6} 40 40)"`)+circle(40,40,2.8,'#e57c69')+circle(40,40,1,paper)+line('M15 22a31 31 0 0 1 35-11','#fff',.9,'opacity=".8"');
    art.maps = () => rect(0,0,80,80,0,'#d9e7d2')+path('M48-5c-19 27 9 33-2 53S31 69 39 85h13c-8-19 7-18 8-38S43 27 61-5Z','#86cce5')+
      [[5,8,16,13],[6,29,18,16],[59,8,16,19],[62,46,14,16],[7,62,17,13]].map(([x,y,w,h])=>rect(x,y,w,h,3,'#b9d5ac')).join('')+
      line('M-5 55 85 24M27-5 27 85','#bec8bd',9)+line('M-5 55 85 24M27-5 27 85','#fffdf4',6)+line('M0 58 80 69','#fffdf4',5)+
      line('M-5 55 85 24','#f0c16f',2.4)+line('M27 80V47l29-10','#fff',5)+line('M27 80V47l29-10','#478ae4',3)+
      shadow(path('M55 14c-10 0-17 7-17 16 0 12 17 27 17 27s17-15 17-27c0-9-7-16-17-16Z',rose))+circle(55,30,8,paper)+motion('location',circle(55,30,4,'#cc596d'),'55px 30px',0)+line('M43 27a12 12 0 0 1 11-8','#fff',1.1,'opacity=".65"');
    art.notes = () => shadow(rect(11,12,58,60,5,'#c9bfaa')+rect(10,8,58,60,5,paper))+rect(10,8,58,16,5,gold)+rect(10,19,58,6,0,gold)+
      Array.from({length:8},(_,i)=>circle(17+i*6,13,1.2,'#ad8747')+line(`M${17+i*6} 7v6`,'#fff3d3',1.8)).join('')+
      line('M21 28v34','#efb1ad',.8)+bookLines(16,32,6,44,'#cbd6dc')+
      path('M55 68V55h13Z','#bbae92','opacity=".35" transform="translate(.6 .6)"')+path('M54 68V55h14Z',paint('paper-fold'),'stroke="#d5c9b2" stroke-width=".45"')+line('M54.5 66.5V55.5h12','#fff',.5)+
      motion('pencil',`<g transform="rotate(32 57 44)">${shadow(rect(54,25,7,33,1,gold))}${rect(54,25,7,6,1,rose)}${rect(54,31,7,3,0,metal)}${line('M56 35v22','#fff3bb',1)}${path('M54 58l3.5 8 3.5-8Z','#dcc6a2')}${path('M56.2 63l1.3 3 1.3-3Z',ink)}</g>`,'57px 44px');
    art.reminders = () => shadow(rect(13,10,55,62,6,'#d1d7df')+rect(11,7,55,62,6,paper))+
      rect(28,5,22,9,3,metal)+rect(32,7,14,3,1,'#f5f7fa')+
      ['#60a0e6','#ecaa61','#b48ed1'].map((color,i)=>{
        const y=27+i*15;
        return circle(23,y,5.5,color)+circle(23,y,4.2,i===0?color:'#fff')+(i===0?line(`M20 ${y}l2 2 4-4`,'#fff',1.5):'')+rule(35,y-2,22,'#929ead')+rule(35,y+3,15,'#d5dce4');
      }).join('')+line('M15 66h47','#fff',1);
    art.files = () => shadow(path('M9 23a5 5 0 0 1 5-5h18l7 7h27a5 5 0 0 1 5 5v33H9Z',blue))+
      `<g transform="rotate(-8 38 35)">${rect(18,17,35,42,3,'#cedeea')}${rect(19,14,35,42,3,paper)}${rect(24,20,13,4,1,'#9fc4e4')}${bookLines(24,30,4,23)}</g>`+
      rect(32,24,30,33,3,white)+rect(38,29,9,9,2,'#9cc7ed')+bookLines(38,44,2,18)+
      shadow(path('M7 39a5 5 0 0 1 5-5h20l5 5h31a5 5 0 0 1 5 6l-4 20a5 5 0 0 1-5 4H15a5 5 0 0 1-5-4Z',blue))+
      line('M12 40h18l5 5h33','#bfecff',1.3)+line('M17 64h44','#276ea9',.9,'opacity=".5"')+rect(31,53,20,4,2,'#d4f1ff','opacity=".75"');
    art.calculator = () => shadow(rect(13,7,54,68,8,'#19222d')+rect(13,5,54,67,8,metal)+rect(16,8,48,61,6,ink))+
      rect(21,13,38,17,3,'#718f8b')+rect(23,15,34,13,2,'#c4dbca')+motion('display',text(53,25,'128',11,'#294d43','style="text-anchor:end;font-family:monospace" letter-spacing=".8"'),'40px 40px',0)+
      Array.from({length:16},(_,i)=>{const x=21+(i%4)*9.8,y=35+Math.floor(i/4)*8;return rect(x,y+1,8.5,6,1.6,'#121b27')+rect(x,y,8.5,6,1.6,i%4===3?gold:metal)+text(x+4.25,y+4.65,['7','8','9','÷','4','5','6','×','1','2','3','−','C','0','=','+'][i],4.8,i%4===3?'#62401e':'#243348','font-weight="700"');}).join('');
    art.settings = () => {
      const teeth=Array.from({length:12},(_,i)=>rect(35,6,10,17,2,metal,`transform="rotate(${i*30} 40 40)"`)).join('');
      return shadow(teeth+circle(40,40,28,metal))+circle(40,40,24,ink)+circle(40,40,21,metal)+ticks(40,40,19,48,'#5a6777',.65)+circle(40,40,15,ink)+circle(40,40,11.7,metal)+circle(40,40,7.4,'#748296')+circle(40,40,5,ink)+
        [0,120,240].map(a=>`<g transform="rotate(${a} 40 40)">${screw(40,15)}</g>`).join('')+line('M20 26a25 25 0 0 1 27-10M33 32a11 11 0 0 1 13 0','#fff',1.3,'opacity=".85"');
    };
    art.games = () => line('M40 22v-6c0-5 8-2 8-8','#e6cfff',2)+
      shadow(path('M24 22h32c9 0 14 14 17 32 3 14-6 17-14 6l-6-7H27l-6 7C13 71 4 68 7 54c3-18 8-32 17-32Z',white))+
      path('M12 50c-2 14 3 13 10 4l5-5h26l5 5c7 9 12 10 10-4l3 10c-1 10-8 8-15-2l-3-4H27l-6 7c-8 10-15 6-12-6Z','#b9b9dc')+
      circle(24,37,11,'#d0cde5')+path('M21 29h6v5h5v6h-5v5h-6v-5h-5v-6h5Z',ink)+line('M23 31h2v5h5','#657188',.7)+
      [[57,30,'#f29cad'],[64,37,'#91cfe3'],[57,44,'#e6c779'],[50,37,'#a9cfaa']].map(([x,y,c])=>circle(x,y,3.5,'#b0a6cc')+circle(x,y-1,3,c)+circle(x-1,y-2,1,'#fff','opacity=".5"')).join('')+
      circle(33,49,5.5,ink)+circle(47,49,5.5,ink)+circle(33,48,3.5,'#70758e')+circle(47,48,3.5,'#70758e')+rect(36,32,8,2,1,'#b8afd6')+circle(40,39,1.3,'#ad96d3');
    art.health = () => circle(40,40,29,'#fdeaf0')+circle(40,40,25,'none','stroke="#f4c3cd" stroke-width=".7"')+
      shadow(path('M40 65C32 59 12 45 12 29c0-15 20-20 28-5 8-15 28-10 28 5 0 16-20 30-28 36Z',rose))+
      motion('trace',line('M18 36h11l5-10 9 25 6-15h13','#fff',2.3),'40px 40px',0)+line('M19 26c2-7 9-8 13-5','#fff',2,'opacity=".65"')+circle(59,58,9,paper)+line('M59 53v10m-5-5h10','#e77e96',2.2)+circle(18,36,1.5,'#fff')+circle(62,36,1.5,'#fff')+line('M17 52a28 28 0 0 0 15 13','#ecaaba',1.1);
    art.wallet = () => shadow(rect(11,14,57,53,7,'#121c2b'))+
      `<g transform="rotate(-8 40 30)">${rect(15,13,47,29,4,gold)}${rect(19,18,8,6,1,'#fff0b6')}${rule(33,21,20,'#b99157')}</g>`+
      rect(16,24,48,29,4,green)+rect(16,30,48,3,0,'#376f68')+rect(19,36,9,6,1,'#d9eeb9')+
      shadow(rect(11,39,58,29,5,paint('leather-ink')))+texture(11,39,58,29,5,'leather-grain')+rect(15,43,49,21,3,'none','stroke="#a7a7b5" stroke-width=".7" stroke-dasharray="1.5 2"')+
      rect(52,45,20,15,4,'#566178')+rect(54,47,16,11,3,'#65738b')+circle(61,52.5,3,gold)+circle(61,52.5,1.6,'#c49154')+line('M17 40h45','#8290a2',.8);
    art.recorder = () => rect(9,12,62,56,8,ink)+
      Array.from({length:5},(_,i)=>line(`M14 ${23+i*8}h52`,'#60728a',.5,'opacity=".4"')).join('')+
      Array.from({length:9},(_,i)=>line(`M${16+i*6} 19v39`,'#60728a',.5,'opacity=".25"')).join('')+
      line('M11 40h58','#9aabbc',.6)+[8,17,11,29,43,24,12,32,19,8,14].map((h,i)=>motion('wave',rect(13+i*5,40-h/2,2.6,h,1.3,rose),'40px 40px',-i*.19)).join('')+
      line('M40 16v43','#ffd1cf',.7,'opacity=".7"')+circle(24,64,2.2,'#f47486')+text(46,66,'REC',5,'#e9c7ce','letter-spacing="2"');
    art.today = () => shadow(rect(12,12,56,59,7,paper))+rect(12,12,56,17,7,'#dcebe7')+rect(12,22,56,7,0,'#dcebe7')+
      circle(29,24,8,gold)+line('M17 25h24','#fff',2)+line('M29 12v3m-10 2 2 2m16-2-2 2','#d9aa57',1.2)+
      rect(45,19,15,3,1.5,'#6f9698')+rect(45,24,10,2,1,'#aac2bf')+
      [38,49,60].map((y,i)=>circle(23,y,3.5,i===0?'#6ba99c':'#dde9e8')+(i===0?line(`M21 ${y}l1.5 1.5 3-3`,'#fff',1):'')+rule(32,y-1,24,'#98acad')+rule(32,y+3,16,'#d1dedd')).join('')+
      shadow(circle(62,60,11,green))+motion('check',line('M57 60l3.5 3.5 6-7','#fff',2),'40px 40px',0);
    art.focus = () => rect(32,7,16,7,3,metal)+rect(37,12,6,6,1,'#c2badb')+
      `<g transform="rotate(40 40 42)">${rect(35,12,10,6,2,metal)}</g>`+
      shadow(circle(40,43,29,metal))+circle(40,43,26,ink)+circle(40,43,23,violet)+
      path('M40 43V20a23 23 0 0 1 20 35Z','#e2d8ff','opacity=".6"')+ticks(40,43,21,30,'#ece8ff',.65)+
      motion('focus-hand',line('M40 43V28','#fff',2)+line('M40 43l10 6','#fff',1.6),'40px 43px',0)+circle(40,43,2.6,gold)+text(40,59,'FOCUS',4.7,'#f4ecff','letter-spacing="1.3"')+line('M19 27a28 28 0 0 1 25-12','#fff',1,'opacity=".7"');
    art.habits = () => circle(40,37,28,'#deedc5','opacity=".16"')+line('M40 58V27','#e6f5c3',2.5)+
      shadow(path('M39 43C19 44 13 30 15 18c18-1 29 9 24 25Z',paint('leaf'))+path('M40 34c-1-18 11-24 25-23 1 15-8 27-25 23Z',paint('leaf')))+
      line('M39 42 21 24m19 9 19-16','#d9efad',1.3)+line('m28 31 1-7m4 14-9-1m25-13 8 1m-4-6v-4','#b8d79c',.7)+
      shadow(path('M25 52h30l-4 16H29Z',paint('ceramic')))+rect(23,49,34,7,3,paint('ceramic'))+line('M26 51h28','#fff',.8)+line('M29 57l2 9','#fff',1,'opacity=".65"')+
      circle(62,59,9,'#e6f1d8')+line('m58 59 3 3 5-6','#629070',1.8);
    art.expenses = () => shadow(rect(12,11,47,60,5,ink)+rect(15,9,44,58,4,paper))+
      rect(15,9,7,58,2,green)+bookLines(28,20,2,24)+
      [12,20,28].map((h,i)=>rect(29+i*9,53-h,6,h,1,i===2?green:'#b6d5cb')).join('')+line('M27 55h28','#a4b6b2',.8)+
      shadow(circle(59,57,14,gold))+circle(59,57,11,'none','stroke="#fff1ba" stroke-width="1"')+text(59,63,'¥',17,'#9b713d','font-weight="700"')+
      line('M25 13h29','#fff',1)+line('M18 18v40','#c2e1d4',.7);
    art.shopping = () => `<g transform="rotate(18 51 27)">${shadow(rect(47,8,11,34,5,gold))}${[15,22,29].map(y=>line(`M49 ${y}l6-2`,'#b98a4d',1.2)).join('')}</g>`+
      path('M25 31C10 20 17 9 26 22c-1-19 16-13 9 1 13-8 18 6 2 14Z',green)+circle(30,30,10,rose)+line('M30 24v-5','#785944',1.7)+
      shadow(path('M14 31h52l-4 37H18Z',gold))+path('M57 32h9l-4 36-7-5Z','#bc8957')+
      path('M20 33h36l-2 29H22Z','#f4d8af','opacity=".4"')+line('M28 34v-8a12 12 0 0 1 24 0v8','#8c6647',3)+line('M28 33v-7a12 12 0 0 1 24 0v7','#ffedcb',1.5)+
      circle(28,35,2,'#b88d5d')+circle(52,35,2,'#b88d5d')+rect(28,44,23,14,3,paper)+path('M35 51c0-5 9-5 9 0 0 4-4 6-4 6s-5-2-5-6Z',green)+line('M22 64h31','#ffe5bd',1);
    art.journal = () => shadow(rect(13,10,53,62,6,'#694b6c')+rect(16,13,48,57,4,paper)+rect(12,7,51,61,5,paint('leather-rose')))+texture(12,7,51,61,5,'leather-grain')+
      rect(12,7,9,61,4,'#9c667f')+line('M23 12v51','#ffe2e5',.65,'opacity=".55"')+
      rect(28,22,26,25,3,'none','stroke="#ffe1d7" stroke-width=".8"')+text(41,31,'DIARY',5.2,'#fff3dc','letter-spacing=".9" font-weight="600"')+
      path('M41 35l1.5 3 3.5.5-2.5 2.5.5 3.5-3-1.5-3 1.5.5-3.5-2.5-2.5 3.5-.5Z',gold)+
      rect(53,8,3,59,1,'#734f72')+line('M56 9v56','#edb5c5',.7)+motion('ribbon',path('M38 67v8l4-3 4 3v-8Z',gold),'42px 67px',0)+line('M18 70h18m11 0h14','#d0bca8',.8);
    art.contacts = () => shadow(rect(13,8,52,63,6,ink))+[18,31,44].map((y,i)=>rect(62,y,7,12,2,[gold,rose,green][i])).join('')+
      rect(13,7,50,62,6,blue)+texture(13,7,50,62,6,'bookcloth')+rect(17,11,42,54,3,'none','stroke="#c4e6ff" stroke-width=".6" stroke-dasharray="1.5 2"')+
      shadow(circle(38,32,10,paper)+path('M22 55c0-20 32-20 32 0v2H22Z',paper))+
      line('M25 54c0-7 4-11 7-12','#fff',1.1)+rect(28,60,20,2,1,'#c3e1f5')+
      [19,32,45,58].map(y=>rect(9,y,9,3,1.5,metal)).join('');
    art.converter = () => shadow(rect(10,14,52,24,5,paper))+rect(15,18,42,15,2,'#dce9ee')+
      text(35,29,'cm',11,'#486d87','font-weight="700"')+line('M17 33v-3m6 3v-2m6 2v-3m6 3v-2m6 2v-3m6 3v-2m6 2v-3','#83a4b6',.8)+
      shadow(rect(19,47,51,24,5,ink))+text(45,63,'in',11,'#e5f2f6','font-weight="700"')+
      motion('exchange',line('M17 45v-4h38l-5-5m5 5-5 5', '#eaf7fa',2),'40px 40px',0)+motion('exchange',line('M63 37v7H25l5 5m-5-5 5-5','#ffddb1',2),'40px 40px',-2.5)+
      line('M24 66v-3m7 3v-2m7 2v-3m7 3v-2m7 2v-3m7 3v-2m6 2v-3','#a9c3d3',.8)+rect(18,22,4,5,1,blue)+rect(25,55,4,5,1,gold);
    art.reading = () => shadow(path('M7 19c11-5 22-4 33 2 11-6 22-7 33-2v47c-13-4-23-3-33 3-10-6-20-7-33-3Z','#755f49'))+
      path('M10 15c10-3 21-2 30 4 9-6 20-7 30-4v47c-11-3-21-1-30 4-9-5-19-7-30-4Z',paper)+
      path('M40 19c9-6 20-7 30-4v47c-11-3-21-1-30 4Z','#eee5d4')+line('M40 21v42','#bcae98',1.4)+
      [27,33,39,45,51].map(y=>line(`M15 ${y}q10-1 19 4m12-4q9-4 18-4`,'#b3a48d',.9)).join('')+
      motion('ribbon',path('M54 14v24l4-3 4 1V13Z',rose),'58px 14px',0)+line('M12 64q15-3 26 4m4 0q13-7 26-4','#e2d8c3',.8)+line('M13 18q13-3 24 4','#fff',1);
    art.sketch = () => `<g transform="rotate(-8 38 40)">${shadow(rect(12,12,50,58,5,'#d1c0c1')+rect(12,9,50,58,5,paper))}${rect(17,14,40,46,1,'none','stroke="#d7dce2" stroke-width=".7"')}${line('M21 51c3-14 13-27 24-26-12 2-23 14-20 20s11-9 23-6-1 13-16 13','#ddb4c5',5)}${line('M21 51c6-9 12-15 24-19','#8eb7c2',1.4)}${[0,1,2,3].map(i=>circle(23+i*9,59,2.3,['#e8b365','#e1a0b1','#95babd','#a799cb'][i])).join('')}</g>`+
      motion('pencil',`<g transform="rotate(36 57 39)">${shadow(rect(52,10,9,47,2,gold))}${rect(52,10,9,8,2,rose)}${rect(52,18,9,5,0,metal)}${rect(54,24,2,31,0,'#ffebb5')}${path('M52 57l4.5 12L61 57Z','#e3c6a2')}${path('m55 65 1.5 4 1.5-4Z',ink)}</g>`,'57px 39px');
    art.phone = () => circle(40,40,29,'#e0ffd8','opacity=".12"')+circle(40,40,23,'none','stroke="#ddffd4" stroke-width=".6" opacity=".3"')+
      shadow(path('M24 14c-5-2-13 5-12 12 3 19 22 38 41 42 7 1 15-8 12-13l-10-9c-2-2-4-1-6 1l-5 6c-9-4-14-9-18-18l6-5c2-2 2-4 0-6Z',white))+
      line('M17 21c-4 6 2 18 7 24M50 61c5 3 10-1 11-4','#fff',1.6)+line('M24 18l7 10M52 49l9 8','#badfc6',1.1)+
      motion('signal',line('M46 16a19 19 0 0 1 17 17M46 23a12 12 0 0 1 10 10','#e9ffdf',1.8,'opacity=".8"'),'40px 40px',0)+
      [[20,21],[23,24],[26,27],[53,54],[56,57],[59,60]].map(([x,y])=>circle(x,y,.85,'#8cbea5','opacity=".75"')).join('');
    art.safari = () => shadow(circle(40,40,34,metal))+circle(40,40,31,blue)+circle(40,40,28,'none','stroke="#c9efff" stroke-width=".65"')+ticks(40,40,26,60,'#e5f9ff',.7)+
      [[40,21,'N'],[60,42,'E'],[40,63,'S'],[20,42,'W']].map(([x,y,n])=>text(x,y,n,5,'#ecf8ff','font-weight="700"')).join('')+
      motion('compass',`<g transform="rotate(35 40 40)">${shadow(path('M40 13l8 27-8 27-8-27Z',paper))}${path('M40 13v27h8Z','#ef8c83')}${path('M40 13l-8 27h8Z','#d95c64')}${path('M40 40v27l-8-27Z','#b9d7e6')}${circle(40,40,2.5,metal)}</g>`,'40px 40px',0)+
      line('M15 23a30 30 0 0 1 33-12','#fff',1,'opacity=".8"');
    art.messages = () => shadow(path('M55 28c13 0 21 8 21 18 0 6-3 11-8 14l3 9-12-5c-15 2-28-5-28-17 0-11 11-19 24-19Z','#b7e8c3'))+
      shadow(path('M38 12C20 12 7 23 7 37c0 8 4 15 11 20l-4 12 17-8c24 3 40-8 40-24 0-14-14-25-33-25Z',white))+
      line('M15 29c4-7 11-11 20-11','#fff',1.6)+[26,39,52].map((x,i)=>motion('dot',circle(x,38,3.5,'#7ac496')+circle(x-1,37,1,'#b8e4c7'),'40px 40px',-i*.22)).join('')+line('M32 55c10 2 20-1 26-6','#d5e9dc',1);
    art.music = () => [21,27,33].map(r=>circle(40,40,r,'none','stroke="#fff" stroke-width=".6" opacity=".13"')).join('')+
      shadow(path('M32 52V23l29-7v32c0 6-6 10-12 9-7-1-8-7-2-11 3-2 6-2 9-2V29l-19 5v24c0 6-6 10-12 9-7-1-8-7-2-11 3-2 6-2 9-2Z',white))+
      path('M37 27v7l19-5v-7Z','#fff')+line('M34 25l24-6M24 60c2-2 5-3 8-2M48 50c2-2 5-3 8-2','#fff',1.3)+line('M38 35v21','#f1bac6',.9)+[7,13,10,5].map((h,i)=>motion('wave',rect(16+i*4,38-h/2,1.6,h,.8,'#fff','opacity=".35"'),'40px 38px',-i*.21)).join('');
    // Bounded vector finishing, rather than raster noise or a global blur.
    // Keep micro-detail separate so compact UI instances can omit it optically.
    const finish = {
      calendar: () => texture(12,30,56,30,2,'paper-grain')+
        fine([65,67.4,69.5].map((y,i)=>line(`M16 ${y}h47`,i%2?'#fff':'#9caabc',.3)).join(''))+
        [24,56].map(x=>circle(x,16.7,3.1,'none','stroke="#752944" stroke-width=".45"')+line(`M${x-.65} 8.5v7.5`,'#fff',.6)).join('')+
        line('M12 28.8h56','#a94361',.6)+line('M15 12.3h50','#ffe7ed',.6),
      photos: () => fine(Array.from({length:8},(_,i)=>`<g transform="rotate(${i*45} 40 40)">${line('M41 9c9 5 12 15 5 29','#fff',.45,'opacity=".5"')}${line('M42 15c4 7 4 13 0 20','#69495c',.35,'opacity=".12"')}</g>`).join(''))+
        circle(40,40,6,paint('pearl'))+circle(38.4,38.3,1.3,'#fff','opacity=".8"'),
      camera: () => texture(8,36,10,20,1,'grip')+texture(66,36,5,20,1,'grip')+
        fine(line('M12 25.7h14m31 0h11','#fff',.45)+text(40,20.8,'A U R A',2.6,'#344458','font-weight="700"')+line('M9 58.5h8m49 0h5','#8a9caf',.4)+
        [60,62,64,66].map(x=>line(`M${x} 28v2.7`,'#fff',.5)).join('')+line('M33 16.8h14','#fff',.55))+
        rim(42,44,22.6)+circle(42,44,20.9,'none','stroke="#182c43" stroke-width=".45"'),
      weather: () => line('M42 17a13 13 0 0 1 12-3','#fff7d4',.75)+fine(line('M16 68h2m35 0h2M20 72h2m24 0h2','#e5f6ff',.5,'opacity=".5"')),
      mail: () => texture(21,16,38,12,2,'paper-grain')+texture(16,54,48,8,1,'paper-grain')+
        line('M12 63.7h55','#afc6db',.6)+line('M14 32l24 19a3 3 0 0 0 4 0l24-19','#fff',.55)+
        fine(path('M54 19h5v6h-5Z','none','stroke="#96b9d5" stroke-width=".5" stroke-dasharray=".6 .65"')+line('M52 22c-3-2-6 2-9 0m0 2c3 2 6-2 9 0','#9bb9ce',.4)),
      clock: () => rim(40,40,33.5)+rim(40,40,30.8)+circle(40,40,28,'none','stroke="#c6cfda" stroke-width=".35"')+
        fine(text(40,32,'AURA',3,'#8590a1','letter-spacing="1.1"')+text(40,52,'PRECISION',2.2,'#9aa3af','letter-spacing=".7"'))+
        path('M18 23a29 29 0 0 1 41-5c-13-4-24-3-35 10Z',paint('crystal')),
      maps: () => fine([[8,11],[16,11],[9,33],[16,37],[65,11],[65,59],[11,66],[18,69]].map(([x,y])=>rect(x,y,4,3,.5,'#edf3df','stroke="#97b99e" stroke-width=".3"')).join('')+
        line('M48 4c-2 4-3 6-3 8M46 60c-4 7-6 12-5 17','#c1eff8',.55)+line('M28 51v24','#d5edff',.6))+
        circle(55,30,7.9,'none','stroke="#a24262" stroke-width=".65"')+motion('location',circle(55,29,3.4,paint('ruby')),'55px 30px',0),
      notes: () => fine(line('M14 69h37M15 71h37','#faf8ed',.35)+line('M11 24.8h55','#bb9247',.4))+
        fine(motion('pencil',`<g transform="rotate(32 57 44)">${line('M57 63.5l.5 1.1','#a0a8b1',.35)}${line('M59.5 35v21','#a77f3e',.35)}</g>`,'57px 44px')),
      reminders: () => texture(13,15,51,48,2,'paper-grain')+fine(line('M14 70h48M16 72h43','#fff',.4)+line('M30 5.8h17','#fff',.5)+screw(30,9)+screw(47,9))+
        [42,57].map((y,i)=>circle(23,y,3.8,'none',`stroke="${i?'#e5c7f7':'#f7d4a4'}" stroke-width=".55"`)).join(''),
      files: () => fine(line('M20 18v12M33 25h25','#fff',.65)+line('M13 65q0 3 4 3h46','#214e80',.45)+line('M14 66.5h47','#94ceef',.4))+
        rect(30,52.5,22,5,2.3,'none','stroke="#266f9f" stroke-width=".45"')+line('M33 54h16','#fff',.55,'opacity=".8"'),
      calculator: () => fine(Array.from({length:16},(_,i)=>{const x=21+i%4*9.8,y=35+Math.floor(i/4)*8;return line(`M${x+1.8} ${y+.7}h4.9`,'#fff',.45,'opacity=".6"')+line(`M${x+1.4} ${y+5.4}h5.7`,'#101e30',.4,'opacity=".5"');}).join('')+
        text(40,11,'A U R A',2.2,'#c6d3e2')+line('M23 15.3h33','#456859',.45)+line('M24 27.5h32','#eaffdd',.4))+
        path('M23 15h24l-7 13H23Z','#fff','opacity=".1"'),
      settings: () => fine(Array.from({length:12},(_,i)=>`<g transform="rotate(${i*30} 40 40)">${line('M37 7h6l1 1v7','#fff',.5,'opacity=".85"')}${line('M44 9v8','#65748a',.6)}${texture(37,8,6,7,1,'brushed')}</g>`).join(''))+
        rim(40,40,27.6)+rim(40,40,21)+rim(40,40,11.5)+circle(40,40,7.1,'none','stroke="#d8e4f3" stroke-width=".35"'),
      games: () => fine(line('M12 49c2-12 7-24 13-25h29c5 0 9 8 11 14','#fff',.65)+
        [33,47].map(x=>circle(x,48,2.8,'none','stroke="#aeb9d0" stroke-width=".4"')+texture(x-2,46,4,4,2,'grip')).join('')+
        [37,40,43].map(x=>circle(x,44,.55,'#777789')).join('')+screw(16,56)+screw(64,56))+rect(37,33,6,1,.5,'#f1c6ff'),
      health: () => path('M16 29c0-10 13-16 22-4-10-5-18 2-19 10Z',paint('crystal'))+
        fine(line('M43 60c8-7 16-15 20-23','#be446c',.6,'opacity=".4"'))+rim(59,58,8.7)+circle(59,58,6.8,'none','stroke="#ead2d9" stroke-width=".35"'),
      wallet: () => fine(line('M17 41h46','#b5c0d0',.55)+line('M14 66h48','#0d192b',.6)+
        line('M21 19v4m-2-2h8m-4-3v6','#a4773f',.4)+line('M32 27h23','#c9e7c1',.5)+
        [22,27,32,37].map(x=>rect(x,47,3,1,.5,'#b9c5d3','opacity=".7"')).join('')+line('M57 49h9M56 57h9','#adc0d0',.45,'stroke-dasharray="1 1.2"'))+
        rim(61,52.5,2.9)+circle(60.5,51.7,.8,'#fff1ba','opacity=".7"'),
      recorder: () => rect(9,12,62,56,8,'none','stroke="url(#ai-rim)" stroke-width=".6"')+
        fine([8,17,11,29,43,24,12,32,19,8,14].map((h,i)=>motion('wave',line(`M${13.6+i*5} ${41-h/2}v${h-2}`,'#ffc2d1',.4,'opacity=".75"'),'40px 40px',-i*.19)).join('')+
        text(22,18,'-12',2.3,'#92a4ba')+text(60,18,'0 dB',2.3,'#92a4ba')+line('M14 61h51','#8a9cb2',.35)),
      today: () => texture(14,30,42,37,3,'paper-grain')+fine(line('M15 14h49','#fff',.55)+line('M16 69h41','#a4b8b6',.45)+line('M14 29h50','#bdcfcc',.5))+
        rim(62,60,10.5)+line('M55 55a9 9 0 0 1 10-3','#e7ffd9',.7),
      focus: () => rim(40,43,28.5)+rim(40,43,25.9)+fine([35,38,41,44].map(x=>line(`M${x} 8v4`,'#718197',.4)).join('')+text(40,50,'25',4,'#f0eaff','letter-spacing=".6"'))+
        path('M20 29a25 25 0 0 1 31-8c-11-1-20 4-25 12Z',paint('crystal')),
      habits: () => fine(line('M19 22c2 8 7 13 16 17M44 30c8-2 14-8 18-15','#edffd1',.55,'opacity=".75"')+line('m25 29-4 1m12 6 1-6m14-3 1-6m5 2 5-1','#b2d4a0',.45))+
        path('M25 50q15-3 30 0q-14 2-30 0Z','#5a6e52')+line('M26 49.8q14-2 28 0','#cfe2c2',.55)+line('M40 51v-5','#698f62',2)+line('M31 67h16','#adbcaa',.5),
      expenses: () => fine(line('M16 65h35M17 67h29','#c4d6d1',.35)+line('M30 42v9m8-17v17m9-25v16','#fff',.6,'opacity=".7"')+ticks(59,57,12.8,48,'#a67537',.3))+
        rim(59,57,13.7)+line('M49 50a12 12 0 0 1 15-3','#fff1c0',.8),
      shopping: () => texture(20,39,34,23,2,'kraft')+fine(line('M19 35l2 30h32','#ffeac8',.6)+line('M58 38l-2 23 5 5','#a67b4f',.5))+
        line('M29 44.5h21','#fff',.45)+line('M29 58.5h21','#bf925c',.45),
      journal: () => fine(rect(25,11,35,53,2,'none','stroke="#f6c1c6" stroke-width=".45" stroke-dasharray="1.1 1.2"')+line('M14 11v51','#c997aa',.6)+line('M18 16v44','#80516c',.4)+line('M18 69h17m13 0h12','#fff8ed',.4))+
        rect(28,22,26,25,3,'none','stroke="url(#ai-gold)" stroke-width=".65"')+fine(line('M30 24h22M30 45h22','#fff3d4',.4)+motion('ribbon',line('M40 69v3','#fff3c0',.5),'42px 67px',0)),
      contacts: () => fine([19,32,45,58].map(y=>line(`M10 ${y+.6}h6`,'#fff',.5)+line(`M10 ${y+2.7}h5`,'#657287',.4)).join('')+
        [21,34,47].map((y,i)=>text(66,y+4,['A','M','Z'][i],3,'#605752','font-weight="700"')).join(''))+line('M25 55h26','#c0d2e3',.6)+line('M32 25a7 7 0 0 1 8-2','#fff',.7),
      converter: () => fine(line('M13 15h46M22 48h45','#fff',.5)+line('M13 36h46M23 69h43','#7790a2',.5)+
        [20,32,44].map((x,i)=>text(x,19.5,i+1,2.5,'#829aa9')).join('')+texture(22,49,46,3,1,'brushed'))+line('M19 42h28','#fff',.5),
      reading: () => fine([0,.9,1.8].map(d=>line(`M10 ${64+d}q17-3 29 4m2 0q15-7 29-4`,d===.9?'#faf6e9':'#b9a78d',.35)).join('')+line('M12 18v42m56-43v43','#fffdf2',.5))+
        path('M36 20q3 1 4 1v43l-4-2Z',paint('binding'))+path('M40 21l4-2v43l-4 2Z','#8a755a','opacity=".12"')+motion('ribbon',fine(line('M56 16v16','#ffd3d9',.6)),'58px 14px',0),
      sketch: () => fine(motion('pencil',`<g transform="rotate(36 57 39)">${line('M60 25v29','#a47b39',.6)}${line('M53 19h7m-7 1.5h7m-7 1.5h7','#fff',.4)}${line('M55 59l1.5 5 1.5-5','#9f794e',.4)}</g>`,'57px 39px'))+
        fine(`<g transform="rotate(-8 38 40)">${line('M15 68h43','#fff',.4)}${line('M18 17h12m-12 0v12','#fff',.5)}</g>`),
      phone: () => fine(line('M17 25c1 11 9 23 20 30','#effff1',.65)+line('M49 65c5 2 11-2 13-5','#9dceb5',.6))+
        motion('signal',line('M46 17a18 18 0 0 1 15 13','#fff',.55,'opacity=".65"'),'40px 40px',0),
      safari: () => rim(40,40,33.4)+rim(40,40,30.8)+circle(40,40,23,'none','stroke="#c9f0ff" stroke-width=".25" opacity=".55"')+
        fine([0,90,180,270].map(a=>path('M40 26l1.5 6-1.5-1.5-1.5 1.5Z','#d4f6ff',`opacity=".45" transform="rotate(${a} 40 40)"`)).join(''))+
        path('M17 24a29 29 0 0 1 39-8c-13-2-23 2-30 11Z',paint('crystal'))+circle(40,40,1.2,'#fff','opacity=".8"'),
      messages: () => fine(line('M17 56l-1 8 14-6','#a4cfb8',.55)+line('M34 61c13 0 23-4 29-12','#aacbbb',.5))+
        [26,39,52].map((x,i)=>motion('dot',circle(x,38,3.5,'none','stroke="#639f83" stroke-width=".4"')+line(`M${x-1.2} 36h1.4`,'#d9f6e2',.6),'40px 40px',-i*.22)).join(''),
      music: () => fine(line('M35 25v28c0 4-5 8-10 8M59 19v28c0 4-4 7-8 7','#fff',.5)+line('M24 65c5 2 11-1 12-5m11-5c5 2 12-2 13-5','#bc526e',.55,'opacity=".5"'))+
        path('M39 26l14-3v2l-14 3Z',paint('crystal'))
    };
    // Second material pass: authored details stay attached to their moving parts.
    // Fine engraving is optically omitted below 40px by the existing container rule.
    // No random noise, extra blur filters, external assets, or live status indicators.
    const engraving = (cx,cy,r,label,start,step,color='#d8e5f1') => fine([...label].map((c,i) =>
      `<g transform="rotate(${start+i*step} ${cx} ${cy})">${text(cx,cy-r,c,2.3,color)}</g>`).join(''));
    const seam = (d,color='#fff',width=.5) => line(d,color,width,'opacity=".65"');
    const deboss = (x,y,label,size,color) => fine(text(x,y+.35,label,size,'#ffffff70','letter-spacing=".5"')+text(x,y,label,size,color,'letter-spacing=".5"'));
    const stud = (x,y) => circle(x,y,1.6,metal)+rim(x,y,1.5)+circle(x-.4,y-.5,.45,'#fff');
    const detail = {
      calendar: () => rect(13,31,4,29,1,paint('binding'),'opacity=".13"')+
        fine(line('M17 32h7m-7 2h4M58 58h5m-3-2v4','#a7b3c2',.5)+
          Array.from({length:16},(_,i)=>line(`M${16+i*3.1} 27.5v.7`,'#a54061',.35)).join(''))+
        [24,56].map(x=>line(`M${x+1} 9v5.8`,'#65798e',.55)+circle(x,8.5,1,paint('pearl'))).join('')+
        seam('M11 34v26q0 6 5 6','#fff',.8),
      photos: () => fine(Array.from({length:8},(_,i)=>`<g transform="rotate(${i*45} 40 40)">${path('M40 7c-7 3-11 12-8 23-1-12 3-18 8-23Z','#fff','opacity=".23"')}${line('M43 11c5 7 6 13 3 19','#fff',.5,'opacity=".5"')}${line('M34 27q1 6 6 11','#705276',.4,'opacity=".19"')}</g>`).join(''))+
        circle(40,40,4.6,'none','stroke="#fff" stroke-opacity=".65" stroke-width=".45"')+circle(40,40,2.5,paint('pearl')),
      camera: () => engraving(42,44,21.7,'AURA OPTICS',-48,9)+engraving(42,44,18,'35mm  1:1.8',128,9,'#d5e9f2')+
        fine(line('M12 20h8m-7 1.5h6','#a9bacd',.4)+rect(58.8,27.8,8.4,3.4,.5,'none','stroke="#a2aeb7" stroke-width=".35"')+
          circle(63,62,1.1,'#193346')+circle(63,61.7,.6,'#80cfca')+text(20,61.5,'HD',2.8,'#43546b','font-weight="700"'))+
        circle(42,44,9.7,'none','stroke="#80bbce" stroke-opacity=".22" stroke-width=".35"')+
        path('M48 36a10 10 0 0 1 3 13l-2-3a9 9 0 0 0-1-10Z','#73c9e5','opacity=".18"'),
      weather: () => circle(51,26,14.2,'none','stroke="#fff3be" stroke-opacity=".65" stroke-width=".55"')+
        motion('cloud',path('M8 50c2 7 8 9 17 8h31c5 0 8-2 11-5-2 7-6 9-12 9H20c-7 0-11-4-12-12Z','#82accf','opacity=".16"')+
          seam('M26 39c4-7 13-7 18-2m6 3c5-3 10-1 12 2','#fff',1.1),'40px 40px')+
        fine(line('M7 24h5m-2.5-2.5v5M24 11h3m-1.5-1.5v3','#e3f3ff',.55,'opacity=".55"')),
      mail: () => fine(rect(23,17,8,1,.5,'#98b5ca')+line('M22 25h12m-12 1.8h8','#b6c8d6',.45)+
          line('M17 58l9-8m28 0 9 8','#fff',.65)+line('M17 60h9m28 0h8','#b4c9d8',.4))+
        path('M33 46l5 4a3 3 0 0 0 4 0l5-4-5 6a3 3 0 0 1-4 0Z','#749abd','opacity=".18"')+
        seam('M11 36v22q0 5 4 5','#fff',.9),
      clock: now => circle(40,40,32.1,'none','stroke="#22384e" stroke-width=".45"')+
        fine([30,60,120,150,210,240,300,330].map(a=>rect(39.5,18.8,1,2.5,.35,metal,`transform="rotate(${a} 40 40)"`)).join(''))+
        line('M40 40V26','#bdcddc',.65,`class="app-clock-hour" transform="rotate(${(now.getHours()%12)*30+now.getMinutes()/2} 40 40)" data-detail-hand="hour"`)+
        path('M13 42a28 28 0 0 0 43 22c-18 6-33-3-43-22Z','#7188a5','opacity=".07"'),
      maps: () => fine([[13,21],[19,25],[8,42],[68,70],[73,65]].map(([x,y])=>circle(x,y+1,2,'#9ab999')+circle(x,y,1.9,'#b4d19c')+circle(x-.5,y-.6,.65,'#dce9b7')).join('')+
          line('M4 53l16-5M33 43l3-1M73 28l5-2','#fff5db',.65)+line('M24 56h6m-6 2h6m-6 2h6','#c6ccbf',.65)+
          line('M37 7v7m-2-5 2-2 2 2','#7a9f9d',.65)+text(37,5,'N',2.5,'#729091'))+
        seam('M60 39c-1 5-3 8-5 10','#a73358',.6),
      notes: () => fine(line('M17 40c4-4 6 3 10-1s5 1 8-1M17 44h16','#7f96a7',.65,'opacity=".6"')+
          line('M13 26h50','#fff',.8)+line('M12 28v31','#d4c6b2',.4))+
        motion('pencil',fine(`<g transform="rotate(32 57 44)">${line('M54.6 31.8h5.8m-5.8 1.1h5.8','#fff',.35)}${deboss(58,47,'HB',2,'#9a7039')}${line('M54.5 58l3 5','#fff0d2',.55)}</g>`),'57px 44px'),
      reminders: () => fine(line('M17 18h15m-15 2h9','#b2bac6',.55)+line('M62 19v43','#d6dce2',.5)+
          [27,42,57].map((y,i)=>text(58,y+3,`0${i+1}`,2.7,'#8b98a8')).join(''))+
        [27,42,57].map((y,i)=>circle(23,y,5.8,'none',`stroke="${['#376faa','#b88444','#84609e'][i]}" stroke-width=".4"`)+seam(`M20 ${y-3}a4 4 0 0 1 5-.5`,'#fff',.55)).join(''),
      files: () => rect(14,46,4,15,1,'#d9f4ff','opacity=".16"')+
        fine(deboss(56,62,'DOC',3,'#326f9f')+line('M22 22h11m-11 2h7','#6e91b2',.45)+
          rect(37,28,11,11,2,'none','stroke="#629fce" stroke-width=".4"')+path('m39 36 2-3 2 2 2-3 1 4Z','#e8f7ff')+
          line('M34 56h14','#3a86b9',.4))+
        seam('M11 44l3 18q.5 3 3 3','#c4edff',.8),
      calculator: () => fine([0,1,2,3,4].map(i=>rect(24+i*6.5,16,4.6,1.2,.3,'#496c60','opacity=".16"')).join('')+
          [21,59].map(x=>screw(x,65)).join('')+line('M28 63h24','#8192a4',.35)+text(31,18,'M',2.5,'#496c60')+text(49,18,'DEG',2.1,'#496c60'))+
        seam('M17 15v43','#aab8c8',.6)+seam('M63 16v44','#14283c',.65),
      settings: () => fine([45,165,285].map(a=>`<g transform="rotate(${a} 40 40)">${circle(40,22.5,1.4,ink)}${rim(40,22.5,1.5)}${circle(40,22.2,.6,'#bac9d9')}</g>`).join('')+
          ticks(40,40,10.3,36,'#65768c',.24))+
        engraving(40,40,25.3,'AURA',52,9,'#b7c7d8')+engraving(40,40,25.3,'PRECISION',192,7,'#b7c7d8')+
        circle(40,40,5.4,'none','stroke="#121e30" stroke-width=".65"')+seam('M37 36a5 5 0 0 1 6 0','#d3e5f7',.65),
      games: () => fine([0,1,2,3].map(i=>line(`M${13+i*1.5} ${51+i*.8}l-1.2 4`,'#8588a7',.4)+line(`M${62+i*1.5} ${54-i*.8}l1.2 3`,'#8588a7',.4)).join('')+
          text(40,28,'AURA',2.4,'#8386a2','letter-spacing=".65"')+line('m22 33 2-2 2 2m-6 3-2 2 2 2','#9aa6b9',.45)+
          [33,47].map(x=>circle(x,48,1.8,'none','stroke="#39445c" stroke-width=".35"')).join(''))+
        seam('M27 52h26','#a3abc4',.6),
      health: () => fine(ticks(40,40,28,40,'#e7b2c1',.3))+
        path('M48 22c6-4 13-1 14 5-4-4-9-4-14-5Z','#ffdbe1','opacity=".4"')+
        line('M20 44c3 5 8 10 13 14','#ffbfcb',.7,'opacity=".6"')+
        circle(59,58,9.3,'none','stroke="#d8a3b3" stroke-width=".4"')+fine(deboss(40,72,'CARE',2.3,'#be8295')),
      wallet: () => fine(line('M17 17h40M18 26h42','#fff1ca',.55)+
          [0,1,2].map(i=>line(`M${50+i*2} 18q3 3 0 6`,'#b38649',.5)).join('')+
          line('M13 42v20q0 4 4 4h43','#8d9aab',.4,'stroke-dasharray="1 1.4"')+
          deboss(32,59,'AURA',3.2,'#18283b'))+
        rect(53,46,18,13,3,'none','stroke="#adbdce" stroke-opacity=".5" stroke-width=".4"')+seam('M57 51a4 4 0 0 1 6-2','#fce6af',.5),
      recorder: () => fine([0,1,2,3,4,5].map(i=>line(`M${16+i*9} 57v1.5`,'#acb9cc',.4)).join('')+
          text(16,64.5,'L',2.7,'#c5d0df')+text(64,64.5,'R',2.7,'#c5d0df')+line('M12 20v34m56-34v34','#12243a',.65))+
        rect(11,14,58,44,5,'none','stroke="#a2bed7" stroke-opacity=".2" stroke-width=".5"')+
        path('M12 16h28L16 55h-4Z','#b7ddff','opacity=".045"'),
      today: () => fine(text(53,15.5,'TODAY',2.3,'#709a98','letter-spacing=".6"')+line('M17 65h9','#a7c0bb',.6)+
          [38,49,60].map(y=>line(`M21 ${y+4.5}h4`,'#b4c9c3',.4)).join(''))+
        path('M14 30h3v31q0 4 3 5h-3q-3 0-3-3Z','#9bb6b0','opacity=".12"')+
        circle(62,60,8.7,'none','stroke="#dff4d1" stroke-width=".4" stroke-opacity=".6"'),
      focus: () => fine(engraving(40,43,27.2,'CHRONO',-27,9,'#5e6681')+
          [0,1,2].map(i=>line(`M${34.5+i*4} 8h1.5`,'#eef4ff',.5)).join('')+
          [0,90,180,270].map(a=>circle(40,23,1,metal,`transform="rotate(${a} 40 43)"`)).join(''))+
        circle(40,43,18,'none','stroke="#e4d8ff" stroke-opacity=".3" stroke-width=".4"')+
        circle(40,43,1.3,metal)+seam('M21 51a21 21 0 0 0 10 11','#cdbcea',.7),
      habits: () => fine(line('m22 26 1-5m3 8-6-1m12 7 1-5m14-4 1-5m4 1 7 1m-5-7 5-1','#d6edb6',.45))+
        path('M18 20c9 0 14 4 17 10-6-4-12-5-17-10Z','#e5f7b7','opacity=".24"')+
        path('M44 27c3-8 9-12 17-13-7 4-10 10-17 13Z','#ddf3bb','opacity=".3"')+
        fine([[29,51],[34,50.5],[46,50.7],[50,51]].map(([x,y])=>circle(x,y,.65,'#a4aa7c')).join('')+
          line('M28 55h23M31 64h18','#bdcebe',.45))+seam('M33 58v5','#fff',1.4),
      expenses: () => fine(line('M27 30h25m-25 8h25m-25 8h25','#acc7bf',.3,'opacity=".5"')+
          text(46,16,'LEDGER',2.5,'#839d96','letter-spacing=".4"')+line('M18 14v47','#336d63',.35))+
        circle(59,57,9.5,'none','stroke="#ae793b" stroke-width=".35"')+
        fine([30,150,270].map(a=>circle(59,47, .65,'#a97b41',`transform="rotate(${a} 59 57)"`)).join(''))+
        path('M48 62a12 12 0 0 0 19-1c-5 3-12 4-19 1Z','#b17c3d','opacity=".22"'),
      shopping: () => fine(line('M22 60l3-20m-1 22 2-12M60 40l-2 13','#b98a5c',.3,'opacity=".5"')+
          line('M31 46h17m-16 10h3m9 0h3','#bbac8b',.45)+text(40,62.5,'MARKET',2.5,'#9c7047','letter-spacing=".4"'))+
        [28,52].map(x=>circle(x,35,2.5,'none','stroke="#ffedc9" stroke-width=".5"')).join('')+
        seam('M28 31v-5a12 12 0 0 1 10-12','#fff7dc',.65),
      journal: () => fine([16,59].map(y=>line(`M28 ${y}h22`,'#f4c5bb',.4)).join('')+
          [28,54].map(x=>path(`M${x} 50l1.2 1.2-1.2 1.2-1.2-1.2Z`,gold)).join('')+
          text(41,57,'VOL. 01',2.6,'#f7d7c8','letter-spacing=".65"'))+
        line('M15 13v49','#ecc5cd',.8,'opacity=".4"')+seam('M61 12v49','#65425e',.65)+
        motion('ribbon',fine(line('M44 68v4','#b0824f',.45)),'42px 67px'),
      contacts: () => fine(line('M21 14v46','#3a77a3',.45)+line('M59 16v43','#e5f5ff',.45)+
          [18,31,44].map(y=>line(`M64 ${y+1.5}h3`,'#fff',.45)).join('')+
          deboss(38,17,'CONTACTS',2.7,'#34759e'))+
        circle(38,32,8.2,'none','stroke="#cadce8" stroke-width=".4"')+
        seam('M24 56h28','#e9f8ff',.8),
      converter: () => fine([16,56].map(x=>stud(x,26)).join('')+stud(65,58)+
          line('M24 51h26m-26 1.5h19','#718ba1',.35)+text(41,68,'1 : 2.54',2,'#9fb8c9','letter-spacing=".5"'))+
        rect(14,17,44,17,2,'none','stroke="#819da9" stroke-width=".4"')+
        path('M17 19h13l-5 10h-8Z','#fff','opacity=".22"'),
      reading: () => fine(line('M14 22q8-1 17 3m-17 0q8-1 13 2M47 55q8-3 16-2','#aa9678',.45)+
          text(23,59,'12',2.8,'#99876b')+text(57,59,'13',2.8,'#99876b'))+
        path('M11 16c2 12 2 29 0 45l3-.5c2-16 2-30 0-45Z','#fff','opacity=".45"')+
        seam('M69 18c-2 13-2 25 0 41','#b6a589',.55)+
        motion('ribbon',fine(line('M60 16v17','#a95171',.45)),'58px 14px'),
      sketch: () => fine(`<g transform="rotate(-8 38 40)">${line('M20 20h3m-1.5-1.5v3M50 53h3m-1.5-1.5v3','#bac4ce',.4)}${line('M21 49c5-9 11-15 21-18m-17 17c4-4 9-7 17-7','#faf2e9',.65,'opacity=".65"')}${line('M19 63h13','#aaa8b1',.5)}</g>`)+
        motion('pencil',fine(`<g transform="rotate(36 57 39)">${deboss(58,41,'2B',2.7,'#9e7136')}${line('M53.5 12v3','#ffd8df',.75)}${line('M58.5 25v28','#b68b45',.4)}</g>`),'57px 39px'),
      phone: () => fine([[20,21],[23,24],[26,27],[53,54],[56,57],[59,60]].map(([x,y])=>circle(x,y,1.15,'none','stroke="#d6e9de" stroke-width=".35"')+circle(x,y+.25,.45,'#648d78')).join(''))+
        line('M16 32c5 15 18 28 31 31','#bfdccc',.65)+
        path('M16 21c1-3 4-5 7-5l6 7c-5-3-7-3-13-2Z','#fff','opacity=".55"')+
        seam('M51 48l10 8','#fff',.85),
      safari: () => fine(ticks(40,40,32.3,120,'#657c93',.23))+
        engraving(40,40,21,'EXPLORE',-29,9,'#d9f4ff')+
        circle(40,40,17.5,'none','stroke="#d8f5ff" stroke-opacity=".25" stroke-width=".35"')+
        motion('compass',fine(`<g transform="rotate(35 40 40)">${line('M40 17v18','#ffe3df',.5)}${line('M40 46v15','#fff',.5)}${circle(40,40,1.5,metal)}</g>`),'40px 40px'),
      messages: () => path('M9 38c1 9 7 15 14 19l-5 8 13-6c16 2 29-3 36-13-5 12-17 17-36 15l-17 8 4-12C11 52 7 45 9 38Z','#aac8b8','opacity=".16"')+
        fine(seam('M62 63l5 3-2-6','#f0fff2',.7)+line('M71 43q2 6-2 11','#d9f6df',.65))+
        [26,39,52].map((x,i)=>motion('dot',path(`M${x-2} 39q2 2 4 0`,'none','stroke="#4f9273" stroke-width=".45" opacity=".55"'),'40px 40px',-i*.22)).join(''),
      music: () => fine([24,30].map(r=>circle(40,40,r,'none','stroke="#fff" stroke-width=".25" stroke-opacity=".15"')).join('')+
          line('M39 25l14-3M22 63c3 1 6 0 8-2m17-7c3 1 6 0 8-2','#fff',.55))+
        line('M33 35v17m24-21v13','#fff',.85,'opacity=".65"')+
        path('M38 29l15-4v1l-15 4Z','#ffd6df','opacity=".5"')+
        fine(text(40,73,'STEREO',2.4,'#ffe2e7','letter-spacing="1.2"'))
    };
    Object.keys(art).forEach((id,index) => {
      const base = art[id];
      art[id] = now => {
        // The inset hand shares the live clock selector and starts at real time.
        const refinement = detail[id](now);
        return `<g class="icon-motion motion-scene scene-${id}" style="--motion-phase:${-(index%7)*.47}s">${base(now)}${finish[id]()}<g class="app-material-detail">${refinement}</g></g>`;
      };
    });
    return art;
  })();
  // Lit bevel, body tone, reflected light, and contact edge; no raster assets.
  const appIconGradients = {
    white:['#ffffff','#f9fcff','#edf4fc','#c5d5e7'], paper:['#fffefa','#fffdf6','#f6f3ea','#dce2e9'],
    metal:['#f7fbff','#d3deeb','#a6b7ca','#e8eff7','#8195ad'], ink:['#66778d','#3b4d64','#26384d','#152236'],
    gold:['#fff0bd','#f5d58d','#deb16b','#ffe3a2','#bf8a48'], blue:['#c5ecff','#8accf1','#55a1dc','#2b72b2'],
    green:['#d2ebae','#a2cd94','#68a98e','#367d70'], rose:['#ffc3cc','#f592a9','#df6c8e','#b63f6e'], violet:['#dcd2f7','#b7a2df','#927cc3','#675091'],
    blade:['#4e718e','#1d354e','#0b1a2f'], ceramic:['#d2ded7','#ffffff','#f5faf1','#c8d6cb','#95ab9e'],
    'leather-rose':['#d79eaf','#be839a','#a66a87','#815371'], 'leather-ink':['#526279','#344358','#263549','#1b293c'],
    'paper-fold':['#b7ad99','#eee6ce','#fffbee'], binding:['#e1d6c0','#baa98d','#8c785e'],
    rim:['#ffffff','#d9e8f7','#74899f','#ebf6ff','#8193a7'], crystal:['#ffffff99','#ffffff35','#ffffff00']
  };
  let appIconInstance=0;
  A.appIcon = (id, now=new Date()) => {
    if(!Object.prototype.hasOwnProperty.call(appArtwork,id))return A.icon(id);
    const artwork=appArtwork[id](now);
    const gradients=Object.entries(appIconGradients).filter(([name])=>artwork.includes(`ai-${name})`)).map(([name,colors])=>`<linearGradient id="ai-${name}" x1="0" y1="0" x2="${['ceramic','binding'].includes(name)?1:.85}" y2="${['ceramic','binding'].includes(name)?0:1}">${colors.map((color,i)=>`<stop offset="${i/(colors.length-1)}" stop-color="${color}"/>`).join('')}</linearGradient>`).join('');
    const radial = (name,cx,cy,r,stops) => `<radialGradient id="ai-${name}" cx="${cx}" cy="${cy}" r="${r}">${stops.map(([offset,color,opacity=1])=>`<stop offset="${offset}" stop-color="${color}" stop-opacity="${opacity}"/>`).join('')}</radialGradient>`;
    const materials = {
      glow:radial('glow',.3,.15,.8,[[0,'#fff',.7],[1,'#fff',0]]),
      lens:radial('lens',.35,.25,.8,[[0,'#acecfa'],[.25,'#408eab'],[.55,'#344f7c'],[.82,'#152b48'],[1,'#071422']]),
      'lens-coat':radial('lens-coat',.3,.2,.85,[[0,'#b4f5ee',.45],[.35,'#4aa9d4',.07],[.65,'#685ae5',.15],[.88,'#8a96f1',.32],[1,'#060e1d',.4]]),
      cloud:radial('cloud',.3,.1,1,[[0,'#fff'],[.38,'#fff'],[.7,'#e0edf9'],[.88,'#bdd4eb'],[1,'#8caed0']]),
      sun:radial('sun',.32,.22,.82,[[0,'#fffbe1'],[.4,'#ffe393'],[.78,'#f6bf51'],[1,'#e49a28']]),
      leaf:radial('leaf',.25,.18,1,[[0,'#d7edab'],[.35,'#96c779'],[.65,'#5c9c72'],[1,'#2a6f5e']]),
      pearl:radial('pearl',.3,.2,.85,[[0,'#fff'],[.45,'#fff',.8],[1,'#eff2ff',.45]]),
      ruby:radial('ruby',.3,.2,.8,[[0,'#ffdee0'],[.25,'#fa8c99'],[.65,'#d34767'],[1,'#8b2549']]),
      'paper-grain':'<pattern id="ai-paper-grain" width="3" height="3" patternUnits="userSpaceOnUse"><path d="M.3.7h1.1m.3 1.5h.8" stroke="#9d907e" stroke-width=".13" opacity=".08"/><path d="M.4 1.1h.8" stroke="#fff" stroke-width=".2" opacity=".7"/></pattern>',
      'leather-grain':'<pattern id="ai-leather-grain" width="2.4" height="2.4" patternUnits="userSpaceOnUse"><path d="m.2.6.5-.2.5.4m.3 1.1.6-.3.2.3" fill="none" stroke="#172337" stroke-width=".16" opacity=".2"/><path d="m.3.9.4-.2m1 1.5.5-.2" stroke="#ffe3eb" stroke-width=".13" opacity=".23"/></pattern>',
      bookcloth:'<pattern id="ai-bookcloth" width="1.2" height="1.2" patternUnits="userSpaceOnUse"><path d="M0 .3h1.2M.3 0v1.2" stroke="#20446a" stroke-width=".15" opacity=".13"/><path d="M0 .7h1.2" stroke="#e6f6ff" stroke-width=".12" opacity=".25"/></pattern>',
      grip:'<pattern id="ai-grip" width="1.4" height="1.4" patternUnits="userSpaceOnUse"><circle cx=".7" cy=".75" r=".27" fill="#060f1c" opacity=".45"/><path d="M.5.5h.4" stroke="#d7e6f8" stroke-width=".15" opacity=".35"/></pattern>',
      brushed:'<pattern id="ai-brushed" width="3" height="1" patternUnits="userSpaceOnUse"><path d="M0 .2h3" stroke="#25384e" stroke-width=".1" opacity=".16"/><path d="M0 .5h2" stroke="#fff" stroke-width=".13" opacity=".4"/></pattern>',
      kraft:'<pattern id="ai-kraft" width="2.8" height="2.8" patternUnits="userSpaceOnUse"><path d="M.4.3v.7m1.5.7v.6" stroke="#986537" stroke-width=".14" opacity=".24"/><path d="M.7 1.2h1" stroke="#fff2d0" stroke-width=".14" opacity=".4"/></pattern>',
      shadow:'<filter id="ai-shadow" x="-35%" y="-35%" width="170%" height="180%" color-interpolation-filters="sRGB"><feDropShadow dx="0" dy="2" stdDeviation="1.45" flood-color="#15243c" flood-opacity=".24"/><feDropShadow dx="0" dy=".45" stdDeviation=".35" flood-color="#102039" flood-opacity=".22"/></filter>'
    };
    const defs=gradients+Object.entries(materials).filter(([name])=>artwork.includes(`ai-${name})`)).map(([,definition])=>definition).join('');
    const prefix=`aura-art-${++appIconInstance}-`;
    return `<svg xmlns="http://www.w3.org/2000/svg" class="app-artwork" data-app-art="${id}" viewBox="0 0 80 80" fill="none" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false"><defs>${defs}</defs>${artwork}</svg>`.replace(/ai-/g,prefix);
  };
  A.photosIcon = () => A.appIcon('photos');
  A.updateAppClock = now => {
    // Preserve the SVG and launcher nodes while updating all visible clock instances.
    [['hour',(now.getHours()%12)*30+now.getMinutes()/2],['minute',now.getMinutes()*6],['second',now.getSeconds()*6]].forEach(([hand,angle])=>{
      A.$$('.app-clock-'+hand).forEach(el=>el.setAttribute('transform',`rotate(${angle} 40 40)`));
    });
  };
  const appData = [
    ['calendar','カレンダー','#fff'],['photos','写真','#fff'],['camera','カメラ','linear-gradient(145deg,#e1e5e8,#a9b1b9)'],['weather','天気','linear-gradient(145deg,#2975c6,#61b4e7)'],
    ['mail','メール','linear-gradient(145deg,#287bef,#55adf8)'],['clock','時計','#15171b'],['maps','マップ','#ecf1e1'],['notes','メモ','linear-gradient(#f3d470 29%,#fff 29%)'],
    ['reminders','リマインダー','#fff'],['files','ファイル','#fff'],['calculator','計算機','linear-gradient(145deg,#59636d,#35404d)'],['settings','設定','linear-gradient(145deg,#d6dbe0,#a3aab4)'],
    ['games','ゲーム','linear-gradient(140deg,#ad91e2,#8067ce)'],['health','ヘルスケア','#fff'],['wallet','ウォレット','linear-gradient(145deg,#363d46,#222832)'],['recorder','ボイスメモ','#181b20'],
    ['today','今日','linear-gradient(145deg,#92b8bb,#4c7b89)'],['focus','集中','linear-gradient(145deg,#a79bd0,#716299)'],
    ['habits','習慣','linear-gradient(145deg,#a3c39b,#628b71)'],['expenses','家計簿','linear-gradient(145deg,#7cbcb3,#467f7e)'],
    ['shopping','買い物','linear-gradient(145deg,#e2b48b,#b98465)'],['journal','日記','linear-gradient(145deg,#d2a8bd,#a47899)'],
    ['contacts','連絡先','linear-gradient(145deg,#8eb1d1,#5c7ca0)'],['converter','単位換算','linear-gradient(145deg,#a5b8c4,#6b8596)'],
    ['reading','読書','linear-gradient(145deg,#cab392,#958064)'],['sketch','スケッチ','linear-gradient(145deg,#d1adb2,#a07183)'],
    ['phone','電話','linear-gradient(145deg,#70db87,#32bd5b)'],['safari','ブラウザ','#fff'],['messages','メッセージ','linear-gradient(145deg,#76e58c,#36c967)'],['music','ミュージック','linear-gradient(145deg,#f7768e,#ec476b)']
  ];
  appData.forEach(([id,name,color]) => A.apps[id] = {id,name,color});
  A.launcher = (app, dock=false) => { return `<button class="app-launcher" data-app="${app.id}" aria-label="${app.name}を開く"><span class="app-icon ${app.id}-icon" style="background:${app.color}">${A.appIcon(app.id)}</span><span class="app-name">${app.name}</span>${app.id==='mail'&&(A.mailUnread?.()??3)>0?`<span class="app-badge">${Math.min(99,A.mailUnread?.()??3)}</span>`:app.id==='messages'&&(A.messageUnread?.()??2)>0?`<span class="app-badge">${Math.min(99,A.messageUnread?.()??2)}</span>`:''}</button>`; };
  A.renderHome = () => { A.$('#app-grid').innerHTML=appData.slice(0,-4).map(([id])=>A.launcher(A.apps[id])).join('');A.$('#home-dock').innerHTML=appData.slice(-4).map(([id])=>A.launcher(A.apps[id],true)).join(''); };
  A.haptic = () => { if(A.settings.sound && navigator.vibrate && navigator.userActivation?.hasBeenActive) navigator.vibrate(7); };
  let toastTimer;
  A.toast = (message,options={}) => {
    const el=A.$('#toast');clearTimeout(toastTimer);
    const error=/不足|失敗|できません|未対応|エラー/.test(String(message));
    el.innerHTML=`<span class="toast-symbol">${A.icon(error?'info':'check')}</span><span>${A.escape(message)}</span>`;
    if(options.onAction){const button=document.createElement('button');button.textContent=options.label||'戻す';button.onclick=()=>{clearTimeout(toastTimer);el.classList.remove('visible');options.onAction();};el.appendChild(button);}
    el.classList.toggle('toast-error',error);el.classList.add('visible');
    const hide=()=>{toastTimer=setTimeout(()=>{el.classList.remove('visible');if(el.contains(document.activeElement))A.$('#status-time').focus({preventScroll:true});},options.onAction?10000:Math.max(3200,Math.min(10000,String(message).length*130)));};
    el.onpointerenter=el.onfocusin=()=>clearTimeout(toastTimer);el.onpointerleave=hide;el.onfocusout=()=>{if(!el.contains(document.activeElement))hide();};hide();
  };
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
  A.home = () => { A.finishHomeEditing?.();A.cleanup();A.closeOverlay();A.current=null;A.locked=false;A.$('#app-screen').hidden=true;A.$('#lock-screen').hidden=true;A.$('#home-screen').hidden=false;A.$('#phone-screen').classList.remove('in-app','app-dark','locked');A.$('#status-bar').classList.remove('dark');A.renderHome();A.updateWidgets(); };
  A.lock = () => { A.home();A.locked=true;A.$('#home-screen').hidden=true;A.$('#lock-screen').hidden=false;A.$('#phone-screen').classList.add('locked');A.$('#notification-banner')?.remove();A.renderLockNotices?.();A.updateClock(); };
  A.nav = (title, right='', backApp='', backText='') => `<nav class="app-nav"><button class="nav-action" ${backApp?`data-action="${backApp}"`:'data-action="home"'} aria-label="${backText||'ホームに戻る'}"><span class="back-chevron">‹</span>${backText}</button><h2>${title}</h2><div class="nav-action">${right}</div></nav>`;
  A.tabs = (tabs,selected) => `<nav class="app-tabs">${tabs.map(t=>`<button class="tab-button ${t.id===selected?'active':''}" data-action="${t.action}" ${t.value?`data-value="${t.value}"`:''}>${A.icon(t.icon)}<span>${t.name}</span></button>`).join('')}</nav>`;
  A.search = (id,placeholder='検索') => `<label class="search-field">${A.icon('search')}<input id="${id}" placeholder="${placeholder}" autocomplete="off" aria-label="${placeholder}"></label>`;
  A.row = (icon,title,detail='',action='',value='',color='') => `<button class="list-row" ${action?`data-action="${action}"`:''}>${icon?`<span class="row-icon" ${color?`style="background:${color};color:white"`:''}>${A.icon(icon)}</span>`:''}<span class="row-main"><strong>${title}</strong>${detail?`<small>${detail}</small>`:''}</span>${value?`<span class="row-value">${value}</span>`:''}${action?'<span class="chevron">›</span>':''}</button>`;
  A.empty = (message,icon='document') => `<div class="empty-state">${A.icon(icon)}${message}</div>`;
  // Original, offline vector scenes. Each instance owns its paint IDs so that
  // multiple cards and forecast symbols can safely coexist in the same document.
  let sceneSerial = 0;
  A.scene = kind => {
    const id = `aura-scene-${++sceneSerial}`;
    const paint = name => `url(#${id}-${name})`;
    const gold = paint('gold'), mint = paint('mint'), plum = paint('plum'), paper = paint('paper');
    const sun = `<circle cx="164" cy="56" r="42" fill="#ffe5a6" opacity=".14"/><circle cx="164" cy="56" r="31" fill="${gold}"/><path d="M146 44a23 23 0 0 1 24-10" fill="none" stroke="#fff9dc" stroke-width="3" stroke-linecap="round"/>`;
    const cloud = `<path d="M61 111c-30 0-32-41-5-46 1-36 55-48 73-12 29-8 49 10 45 32 30 3 28 33 3 33H66Z" fill="${paper}" stroke="#ffffff8a" stroke-width="1.5"/><path d="M61 110h111" stroke="#a5b5c2" stroke-opacity=".2" stroke-width="3" stroke-linecap="round"/>`;
    const leaf = `<path d="M118 120C78 116 64 86 72 52c36 2 58 25 46 68Z" fill="${mint}"/><path d="M120 112c-5-41 11-67 44-78 13 39-3 70-44 78Z" fill="${mint}"/><path d="M119 127c28 0 49-18 52-46-31-6-48 14-52 46Z" fill="#8cc2a4"/><path d="M121 145V92m-1 23L86 72m36 38 27-54m-27 69 34-29" fill="none" stroke="#356759" stroke-width="2.5" stroke-linecap="round" opacity=".6"/>`;
    const book = `<path d="M53 64 115 52l74 24v66l-74-17-62 10Z" fill="${plum}"/><path d="m60 67 55-9 66 21v55l-66-16-55 9Z" fill="${paper}"/><path d="M115 60v59M67 78l36-6m-36 17 36-6m-36 17 36-6m22-15 44 13m-44-2 44 13m-44-2 32 10" fill="none" stroke="#ad9b91" stroke-width="2" opacity=".5"/><path d="m142 67 10 3v32l-5-6-5 3Z" fill="#d39479"/>`;
    const scenes = {
      today: `${sun}<path d="M18 139 83 63l51 76Z" fill="#b7c9c5"/><path d="m83 63 51 76H96L70 80Z" fill="#729c97"/><path d="m142 88 74 60H75Z" fill="${mint}"/><path d="M11 151c53-37 104 17 216-14v32H11Z" fill="#deceb8"/><path d="M42 163c52-33 93 8 157-7" fill="none" stroke="#fff5df" stroke-width="3"/><path d="m21 80 9-3 9 3m9-17 7-3 7 3" fill="none" stroke="#627e7c" stroke-width="2" stroke-linecap="round"/>`,
      habits: `<circle cx="121" cy="90" r="70" fill="#a3cfaa" opacity=".13"/>${leaf}<ellipse cx="122" cy="159" rx="48" ry="8" fill="#345447" opacity=".14"/><path d="m92 123 8 33c3 12 41 12 44 0l8-33" fill="${paper}"/><ellipse cx="122" cy="123" rx="30" ry="8" fill="#c4d2c0"/><path d="M120 124v-17" stroke="#406e53" stroke-width="3"/><path d="m101 135 5 19" stroke="white" stroke-width="3" stroke-linecap="round"/><circle cx="52" cy="101" r="4" fill="#dcc184"/><path d="M181 54v12m-6-6h12" stroke="#c2a773" stroke-width="2"/>`,
      expenses: `<circle cx="129" cy="91" r="64" fill="#6eae9b" opacity=".13"/><ellipse cx="125" cy="157" rx="82" ry="10" fill="#193c37" opacity=".13"/><g transform="rotate(-13 140 83)"><rect x="76" y="38" width="120" height="78" rx="13" fill="${mint}" stroke="#c6e5cd"/><rect x="90" y="55" width="23" height="18" rx="4" fill="${gold}"/><path d="M91 93h35m11 0h14" stroke="#e2f4e8" stroke-width="4" stroke-linecap="round"/><circle cx="171" cy="63" r="10" fill="#fff" opacity=".2"/></g><g fill="${gold}" stroke="#e3b963"><path d="M50 123v18c0 16 64 16 64 0v-18Z"/><ellipse cx="82" cy="122" rx="32" ry="12"/><path d="M130 139v12c0 13 49 13 49 0v-12Z"/><ellipse cx="154.5" cy="139" rx="24.5" ry="9"/></g><path d="M57 133c14 9 36 9 50 0m31 16c10 5 23 5 34 0" stroke="#9f7a3c" stroke-opacity=".4" fill="none"/><path d="m75 119 7 6 7-6m-7 6v8m-6-5h12" fill="none" stroke="#a17a39" stroke-width="2"/>`,
      reading: `<circle cx="126" cy="85" r="66" fill="#d6bfa0" opacity=".17"/><ellipse cx="122" cy="161" rx="82" ry="10" fill="#695441" opacity=".14"/><path d="m52 143 119-16 31 14-114 23Z" fill="#91aca0"/><path d="m53 137 117-15 29 13-112 22Z" fill="${paper}"/><path d="m47 121 117-14 35 17-116 22Z" fill="#b78672"/>${book}<path d="M198 46v16m-8-8h16M46 36v10m-5-5h10" stroke="#bb9b62" stroke-width="2" stroke-linecap="round"/>`,
      journal: `<circle cx="124" cy="88" r="68" fill="#dbafc4" opacity=".16"/><ellipse cx="118" cy="159" rx="67" ry="8" fill="#614557" opacity=".13"/><g transform="rotate(-12 117 97)"><rect x="65" y="35" width="104" height="119" rx="9" fill="${plum}"/><path d="M78 36v117" stroke="#edcee1" stroke-width="2" opacity=".6"/><rect x="94" y="59" width="54" height="39" rx="3" fill="${paper}"/><path d="M105 73h31m-26 10h21" stroke="#ba98aa" stroke-width="2" stroke-linecap="round"/><path d="M147 36v24l-5-4-5 4V36" fill="${gold}"/></g><g transform="rotate(28 177 109)"><rect x="172" y="61" width="10" height="88" rx="4" fill="${gold}"/><path d="m172 142 5 15 5-15" fill="#efe5d6"/><path d="m175 151 2 6 2-6" fill="#665568"/><path d="M174 71v65" stroke="#fff3ce" stroke-width="2"/></g>`,
      shopping: `<circle cx="125" cy="88" r="67" fill="#e5ba8f" opacity=".16"/><ellipse cx="120" cy="160" rx="66" ry="8" fill="#755438" opacity=".14"/><path d="m74 67-6 83c0 16 106 16 106 0l-6-83Z" fill="${gold}" stroke="#f9d8a1"/><path d="m74 67 20 16h56l18-16" fill="#c99a5d"/><path d="M99 80V55a22 22 0 0 1 44 0v25" fill="none" stroke="#f9eed6" stroke-width="7" stroke-linecap="round"/><path d="M121 143c-38-17-31-49-5-42 28-14 44 21 5 42Z" fill="${mint}"/><path d="M121 103c-1-16 8-22 17-21-1 13-8 20-17 21Z" fill="#537966"/><path d="m82 91-5 52" stroke="#fff5d7" stroke-opacity=".55" stroke-width="3" stroke-linecap="round"/>`,
      music: `<ellipse cx="125" cy="160" rx="92" ry="10" fill="#241c37" opacity=".22"/><g transform="rotate(-12 100 92)"><rect x="32" y="28" width="132" height="130" rx="10" fill="${plum}"/><circle cx="98" cy="91" r="43" fill="#d7bba8" opacity=".35"/><path d="M33 132c54-74 69-56 130-91v116H33Z" fill="#6e8f88"/><path d="M33 149c48-33 68-4 130-64v72H33Z" fill="#d7b7a4"/><circle cx="91" cy="72" r="22" fill="${gold}"/></g><circle cx="153" cy="101" r="63" fill="#272b3d"/><g fill="none" stroke="#a5acbe" stroke-opacity=".15"><circle cx="153" cy="101" r="54"/><circle cx="153" cy="101" r="47"/><circle cx="153" cy="101" r="40"/><path d="M126 54a54 54 0 0 1 53 0M126 148a54 54 0 0 0 53 0" stroke="#fff" stroke-opacity=".25" stroke-width="4"/></g><circle cx="153" cy="101" r="22" fill="${gold}"/><circle cx="153" cy="101" r="5" fill="#252b3a"/>`,
      clear: sun,
      cloudy: `${sun}${cloud}`,
      overcast: cloud,
      rain: `${cloud}<path d="m76 132-8 14m43-14-8 14m43-14-8 14m43-14-8 14" fill="none" stroke="#8ad4fa" stroke-width="5" stroke-linecap="round"/>`,
      snow: `${cloud}<g fill="#eaf8ff"><circle cx="77" cy="140" r="4"/><circle cx="108" cy="154" r="4"/><circle cx="140" cy="136" r="4"/><circle cx="174" cy="151" r="4"/></g>`,
      thunder: `${cloud}<path d="m121 115-18 25h17l-7 22 32-33h-21l11-14Z" fill="${gold}"/>`,
      fog: `${cloud}<path d="M57 130h120m-104 13h88m-103 13h118" stroke="#dce8ef" stroke-width="4" stroke-linecap="round"/>`
    };
    if (!Object.hasOwn(scenes, kind)) return '';
    return `<svg class="scene-art scene-${kind}" viewBox="0 0 240 180" fill="none" aria-hidden="true" focusable="false"><defs><linearGradient id="${id}-gold" x1="0" y1="0" x2="1" y2="1"><stop stop-color="#ffedbd"/><stop offset=".48" stop-color="#e8bf7e"/><stop offset="1" stop-color="#c68c4c"/></linearGradient><linearGradient id="${id}-mint" x1="0" y1="0" x2="1" y2="1"><stop stop-color="#c2e6b9"/><stop offset=".5" stop-color="#78ac94"/><stop offset="1" stop-color="#3c7166"/></linearGradient><linearGradient id="${id}-plum" x1="0" y1="0" x2="1" y2="1"><stop stop-color="#d6bfd9"/><stop offset=".5" stop-color="#a286b2"/><stop offset="1" stop-color="#6a537f"/></linearGradient><linearGradient id="${id}-paper" x1="0" y1="0" x2=".5" y2="1"><stop stop-color="#fffef8"/><stop offset=".6" stop-color="#f1ece5"/><stop offset="1" stop-color="#cdd6db"/></linearGradient></defs>${scenes[kind]}</svg>`;
  };
  A.view = html => {
    const screen = A.$('#app-screen');
    screen.dataset.visualApp = A.current || '';
    screen.innerHTML = html;
    const navTitle=screen.querySelector('.app-nav h2')?.textContent;
    screen.querySelectorAll('.app-title').forEach(title=>{if(!title.id&&title.textContent===navTitle)title.classList.add('redundant-title');});
    // Enhance existing content, never replace controls, data, or event targets.
    if (A.current === 'journal' && screen.querySelector('#ev-journal-list')) {
      screen.querySelector('.everyday').insertAdjacentHTML('afterbegin', '<div class="ev-heading"><span></span><h1>日々の記録</h1></div>');
    }
    const hero = screen.querySelector('.ev-hero, .ev-heading');
    if (hero && ['today','habits','expenses','reading','journal','shopping'].includes(A.current)) {
      hero.classList.add('illustrated-hero');
      hero.insertAdjacentHTML('beforeend', A.scene(A.current));
    }
    if (A.current === 'music' && screen.querySelector('#music-search')) {
      screen.querySelector('.app-title').insertAdjacentHTML('beforebegin', `<div class="music-discovery-art">${A.scene('music')}</div>`);
    }
  };
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
    A.overlay(`${A.overlayTitle('コントロールセンター')}<div class="control-grid"><div class="control-connectivity">${[['airplane','airplane','機内モード','orange'],['cellular','signal','モバイル通信','green'],['wifi','wifi','Wi-Fi',''],['bluetooth','bluetooth','Bluetooth','']].map(([key,ic,label,color])=>`<button class="control-round ${color} ${s[key]?'on':''}" data-action="controlToggle" data-key="${key}" aria-label="${label}" aria-pressed="${s[key]}">${A.icon(ic)}</button>`).join('')}</div><div class="control-music"><strong>${A.music?.track?.title||'ひと息、つこう。'}</strong><small>${A.music?.playing?'aura originals':'音楽'}</small><div><button data-action="musicPrevious" aria-label="前の曲">${A.icon('previous')}</button><button data-action="controlPlay" aria-label="再生・一時停止">${A.icon(A.music?.playing?'pause':'play')}</button><button data-action="musicNext" aria-label="次の曲">${A.icon('next')}</button></div></div><button class="control-tile ${s.focus?'on':''}" data-action="controlToggle" data-key="focus">${A.icon('moon')}集中モード</button><button class="control-tile ${s.dark?'on':''}" data-action="controlToggle" data-key="dark">${A.icon('sun')}ダークモード</button><label class="control-slider">${A.icon('sun')}<input aria-label="画面の明るさ" id="control-brightness" type="range" min="10" max="100" value="${s.brightness}"></label><label class="control-slider">${A.icon('volume')}<input aria-label="音量" id="control-volume" type="range" min="0" max="100" value="${s.volume}"></label><button class="control-single" data-action="flashlight" aria-label="画面ライト">${A.icon('flashlight')}</button><button class="control-single" data-app="clock" aria-label="時計">${A.icon('timer')}</button><button class="control-single" data-app="calculator" aria-label="計算機">${A.icon('calculator')}</button><button class="control-single" data-app="camera" aria-label="カメラ">${A.icon('camera')}</button><button class="control-tile" data-action="lock">${A.icon('lock')}画面をロック</button><button class="control-tile" data-action="about">${A.icon('globe')}auraについて</button></div><p class="control-footer">通信はデモ。明るさ・音量はaura内のみ</p>`);
    A.$('#control-brightness').oninput=e=>{s.brightness=+e.target.value;A.applySettings();};
    A.$('#control-volume').oninput=e=>{s.volume=+e.target.value;A.music?.setVolume();A.save('settings',s);};
  };
  A.actions.controlToggle=el=>{const key=el.dataset.key;A.settings[key]=!A.settings[key];if(key==='airplane' && A.settings.airplane)A.settings.cellular=false;A.applySettings();A.controls();};
  A.actions.lock=A.lock;
  A.actions.controlPlay=()=>{A.music?.toggle();A.controls();};
  A.actions.flashlight=()=>{const el=document.createElement('div');el.className='flashlight-screen';el.innerHTML='<button>消灯</button>';el.onclick=()=>el.remove();A.$('#phone-screen').appendChild(el);};
  A.actions.about=()=>A.overlay(`${A.overlayTitle('About this little world')}<div class="about-hero">aura.</div><p class="about-copy">手のひらに、もうひとつの世界。<br>いつもの日常に、少しの好奇心を。</p><div class="about-stats"><div><strong>30</strong><span>APPS</span></div><div><strong>08</strong><span>GAMES</span></div><div><strong>∞</strong><span>CURIOSITY</span></div></div><p class="about-note">auraは、ブラウザの中で動く架空のスマートフォンです。実際のOS、通信サービス、銀行・医療サービスではありません。<br><br>天気はOpen-Meteo、地図はOpenStreetMap、記事検索はWikipediaと接続します。電話・SMS・メールは端末の対応アプリで最終操作を行います。デモと実連携は区別されます。ヘルスケアの自動計測と実決済は未接続です。<br><br>メモ、設定、写真などはこのブラウザに保存されます。録音はアプリを閉じるまで保持されます。データは他の端末へ同期されません。カメラ・マイクの利用には許可が必要です。</p><p class="control-footer">auraOS 4.5 / NOTIFICATIONS</p>`);
  A.spotlight = () => { A.overlay(`${A.overlayTitle('見つけよう。')}<label class="spotlight-input">${A.icon('search')}<input id="spotlight-query" placeholder="アプリを検索" aria-label="アプリを検索" autocomplete="off"></label><p class="spotlight-label">あなたの小さな世界</p><div class="spotlight-results" id="spotlight-results"></div>`);const render=q=>{const matches=Object.values(A.apps).filter(a=>(a.name+a.id).toLowerCase().includes(q.toLowerCase()));A.$('#spotlight-results').innerHTML=matches.map(a=>A.launcher(a)).join('')||'<p style="grid-column:span 4;font-size:12px;opacity:.65">該当するアプリはありません。</p>';};render('');A.$('#spotlight-query').oninput=e=>render(e.target.value);setTimeout(()=>A.$('#spotlight-query')?.focus(),120); };
  A.updateClock = () => {const d=new Date();const time=d.toLocaleTimeString('ja-JP',{hour:'numeric',minute:'2-digit',hour12:false});A.$('#status-time').textContent=time;A.$('#lock-time').textContent=time;const date=d.toLocaleDateString('ja-JP',{month:'long',day:'numeric',weekday:'long'});A.$('#home-date').textContent=date;A.$('#lock-date').textContent=date;A.$('#widget-day').textContent=d.getDate();A.$('#widget-weekday').textContent=['日','月','火','水','木','金','土'][d.getDay()]+'曜日';A.clockTick?.();A.music?.tick();A.updateWidgets?.();};
  document.addEventListener('click',e=>{const button=e.target.closest('[data-app], [data-action]');if(!button || button.disabled)return;if(button.dataset.app)A.open(button.dataset.app);else{const fn=A.actions[button.dataset.action];if(fn)fn(button,e);}});
  A.$('#status-controls').onclick=A.controls;A.$('#status-time').onclick=A.notifications;A.$('#dynamic-island').onclick=()=>A.open('music','player');A.$('#home-search').onclick=A.spotlight;A.$('#desktop-lock').onclick=A.lock;A.$('#desktop-reset').onclick=A.home;A.$('#power-button').onclick=()=>A.locked?A.home():A.lock();A.$('#unlock-button').onclick=A.home;A.$('#lock-flashlight').onclick=A.actions.flashlight;A.$('#about-button').onclick=A.actions.about;
  let touchStartY=0;A.$('#lock-screen').addEventListener('touchstart',e=>touchStartY=e.touches[0].clientY,{passive:true});A.$('#lock-screen').addEventListener('touchend',e=>{if(touchStartY-e.changedTouches[0].clientY>50)A.home();},{passive:true});
  document.addEventListener('keydown',e=>{if(e.key==='Escape'){if(!A.$('#overlay').hidden)A.closeOverlay();else A.home();}if(e.key==='h'&&!e.ctrlKey&&!e.metaKey&&!e.altKey&&!e.isComposing&&A.$('#overlay').hidden&&!e.target.closest('input,textarea,select,[contenteditable]'))A.home();});
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
      return `<article class="recent-card"><button class="recent-open" data-action="recentOpen" data-id="${id}" aria-label="${app.name}に切り替える"><span class="app-icon ${id}-icon" style="background:${app.color}">${A.appIcon(id)}</span><strong>${app.name}</strong><small>${A.current===id?'使用中':'アプリを開く'}</small></button><button class="recent-remove" data-action="recentRemove" data-id="${id}" aria-label="${app.name}を履歴から除く">×</button></article>`;
    }).join('');
    A.overlay(`${A.overlayTitle('最近使ったアプリ')}<p class="switcher-copy">別アプリは開始画面へ。録音は切替で終了</p>${cards?`<div class="recent-list">${cards}</div><button class="switcher-clear" data-action="recentClear">履歴をクリア</button>`:`<div class="switcher-empty">${A.icon('grid')}履歴なし</div>`}`,'app-switcher');
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
    if(c){set('.widget-top>span:first-child',c.name+' ↗');set('.weather-sun',c.condition);set('.weather-widget>strong',c.temp+'°');set('.weather-widget>span',c.desc+' · '+c.source);set('.weather-widget>small',`最高 ${c.high}° 最低 ${c.low}°`);set('.lock-weather',`${c.name} ${c.temp}° · ${c.source}`);}
    const name=A.load('profileName','');
    set('.greeting-note',name?`${name}さん、おかえりなさい。`:'Make room for a little wonder.');
    A.$$('.app-calendar-date').forEach(el=>{if(el.textContent!==String(now.getDate()))el.textContent=now.getDate();});
    const weekday=['日','月','火','水','木','金','土'][now.getDay()]+'曜日';
    A.$$('.app-calendar-weekday').forEach(el=>{if(el.textContent!==weekday)el.textContent=weekday;});
    A.updateAppClock(now);
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
  // Springboard preferences are local, version-independent, and restricted to known apps.
  const defaultOrder=appData.map(([id])=>id);
  let homeOrder=A.load('homeOrder',defaultOrder);
  if(!Array.isArray(homeOrder))homeOrder=defaultOrder;
  homeOrder=[...new Set(homeOrder.filter(id=>defaultOrder.includes(id)))];
  const missingApps=defaultOrder.filter(id=>!homeOrder.includes(id));
  homeOrder.splice(Math.max(0,homeOrder.length-4),0,...missingApps);
  let editing=false,selectedIcon=null;
  const smallIcon=id=>`<span class="mini-app" style="background:${A.apps[id].color}">${A.appIcon(id)}</span>`;
  A.finishHomeEditing=()=>{editing=false;selectedIcon=null;};
  A.renderHome=()=>{
    A.$('#app-grid').innerHTML=homeOrder.slice(0,-4).map(id=>A.launcher(A.apps[id])).join('');
    A.$('#home-dock').innerHTML=homeOrder.slice(-4).map(id=>A.launcher(A.apps[id],true)).join('');
    A.$('#home-screen').classList.toggle('home-editing',editing);
    A.$$('#home-screen .app-launcher').forEach(el=>{
      el.draggable=editing;
      el.classList.toggle('icon-selected',el.dataset.app===selectedIcon);
      if(editing)el.setAttribute('aria-label',`${A.apps[el.dataset.app].name}を選択して移動`);
    });
    A.$('#home-edit-toolbar').hidden=!editing;
    A.updateSystem?.();
  };
  A.$('.home-greeting').insertAdjacentHTML('beforebegin','<div class="home-edit-toolbar" id="home-edit-toolbar" hidden><span>アイコンを2つ選ぶと入れ替え</span><button data-action="finishEditing">完了</button></div>');
  A.$('.home-tools').insertAdjacentHTML('beforebegin',`<nav class="home-pages" aria-label="ホームページ"><button class="page-dot active" aria-label="ホーム画面" aria-current="page" data-action="home"></button><button class="page-dot" aria-label="アプリライブラリ" data-action="library"></button></nav>`);
  A.$('.home-tools').insertAdjacentHTML('afterend',`<nav class="springboard-tools" aria-label="ホームカスタマイズ"><button data-action="editHome">${A.icon('edit')}編集</button><button data-action="personalize">${A.icon('photos')}カスタマイズ</button><button data-action="library">${A.icon('grid')}ライブラリ</button></nav>`);
  A.actions.editHome=()=>{A.closeOverlay();editing=true;selectedIcon=null;A.renderHome();A.haptic();};
  A.actions.finishEditing=()=>{editing=false;selectedIcon=null;A.renderHome();};
  const swapIcons=(first,second)=>{
    const x=homeOrder.indexOf(first),y=homeOrder.indexOf(second);
    if(x<0||y<0)return;
    [homeOrder[x],homeOrder[y]]=[homeOrder[y],homeOrder[x]];
    A.save('homeOrder',homeOrder);selectedIcon=null;A.renderHome();A.haptic();
  };
  let suppressLauncher=false;
  // The release of a long press can be retargeted to the newly opened menu.
  document.addEventListener('pointerdown',()=>{suppressLauncher=false;},true);
  document.addEventListener('click',e=>{
    if(suppressLauncher&&e.detail!==0){suppressLauncher=false;e.preventDefault();e.stopImmediatePropagation();return;}
    const launcher=e.target.closest('#home-screen .app-launcher');
    if(!launcher)return;
    if(editing){e.preventDefault();e.stopImmediatePropagation();const id=launcher.dataset.app;if(selectedIcon&&selectedIcon!==id)swapIcons(selectedIcon,id);else{selectedIcon=selectedIcon===id?null:id;A.renderHome();}}
  },true);
  const homeScreen=A.$('#home-screen');
  let draggedApp=null;
  homeScreen.addEventListener('dragstart',e=>{const el=e.target.closest('.app-launcher');if(!editing||!el)return;draggedApp=el.dataset.app;e.dataTransfer.setData('text/plain',draggedApp);e.dataTransfer.effectAllowed='move';});
  homeScreen.addEventListener('dragover',e=>{if(editing&&e.target.closest('.app-launcher'))e.preventDefault();});
  homeScreen.addEventListener('drop',e=>{const el=e.target.closest('.app-launcher');if(!editing||!el)return;e.preventDefault();swapIcons(draggedApp,el.dataset.app);draggedApp=null;});
  const shortcuts={notes:['新しいメモ','noteNew'],calendar:['予定を追加','calendarAdd'],mail:['メールを書く','mailCompose'],messages:['会話をはじめる','messageCompose'],clock:['時計を開く',null],camera:['カメラを開く',null]};
  A.actions.appContext=el=>{
    const id=el.dataset.app||el.dataset.id,app=A.apps[id];if(!app)return;
    A.overlay(`<div class="context-card"><div class="context-app">${smallIcon(id)}<div><strong>${app.name}</strong><small>aura アプリ</small></div></div><button data-app="${id}">${A.icon('arrow')}アプリを開く</button>${shortcuts[id]?.[1]?`<button data-action="quickLaunch" data-id="${id}">${A.icon('plus')}${shortcuts[id][0]}</button>`:''}<button data-action="editHome">${A.icon('grid')}ホーム画面を編集</button><button data-action="personalize">${A.icon('photos')}壁紙とスタイル</button><button data-action="closeOverlay">キャンセル</button></div>`,'sheet-overlay context-overlay');
  };
  A.actions.quickLaunch=el=>{A.open(el.dataset.id);const action=shortcuts[el.dataset.id]?.[1];if(action)A.actions[action]();};
  homeScreen.addEventListener('contextmenu',e=>{const el=e.target.closest('.app-launcher');if(el&&!editing){e.preventDefault();A.actions.appContext(el);}});
  let pressTimer,pressPoint;
  homeScreen.addEventListener('pointerdown',e=>{
    if(e.button!==0||editing)return;const el=e.target.closest('.app-launcher');if(!el)return;
    pressPoint={x:e.clientX,y:e.clientY};
    pressTimer=setTimeout(()=>{suppressLauncher=true;A.haptic();A.actions.appContext(el);},550);
  });
  homeScreen.addEventListener('pointermove',e=>{if(pressPoint&&Math.hypot(e.clientX-pressPoint.x,e.clientY-pressPoint.y)>9)clearTimeout(pressTimer);});
  ['pointerup','pointercancel','pointerleave'].forEach(type=>homeScreen.addEventListener(type,()=>clearTimeout(pressTimer)));
  A.library=()=>{
    const groups=[['よく使う',A.recentApps.length?A.recentApps.slice(0,4):['today','focus','habits','journal']],['つながる',['phone','messages','mail','safari','contacts']],['毎日のこと',['calendar','notes','reminders','files','today']],['クリエイティブ',['photos','camera','music','recorder','sketch']],['暮らしと発見',['weather','maps','health','wallet','expenses','shopping']],['自分の時間',['focus','habits','journal','reading']],['ユーティリティ',['clock','calculator','settings','games','converter']]];
    A.overlay(`${A.overlayTitle('アプリライブラリ')}<label class="spotlight-input">${A.icon('search')}<input id="library-query" aria-label="ライブラリを検索" placeholder="アプリを検索" autocomplete="off"></label><div class="library-groups" id="library-groups">${groups.map(([name,ids])=>`<section class="library-category"><div>${ids.map(id=>A.launcher(A.apps[id])).join('')}</div><h3>${name}</h3></section>`).join('')}</div><div class="spotlight-results" id="library-results" hidden></div><p class="control-footer"></p>`,'library-overlay');
    A.$('#library-query').oninput=e=>{const q=e.target.value.trim().toLowerCase();A.$('#library-groups').hidden=!!q;const results=A.$('#library-results');results.hidden=!q;results.innerHTML=Object.values(A.apps).filter(app=>(app.name+app.id).toLowerCase().includes(q)).map(app=>A.launcher(app)).join('')||'<p class="search-empty">アプリが見つかりません。</p>';};
  };
  A.actions.library=A.library;
  const wallpapers=[['default','Dusk','夕暮れの余韻'],['ocean','Ocean','静かな青'],['forest','Forest','深呼吸する緑'],['mono','Stone','モノクローム'],['aurora','Aurora','光のカーテン'],['sunrise','Sunrise','新しい朝']];
  A.actions.personalize=()=>{
    A.overlay(`${A.overlayTitle('ホームの外観')}<p class="customize-subtitle"></p><div class="wallpaper-gallery">${wallpapers.map(([id,name,desc])=>`<button class="wallpaper-pick ${id} ${A.settings.wallpaper===id?'selected':''}" data-action="chooseWallpaper" data-value="${id}" aria-label="壁紙 ${name}" aria-pressed="${A.settings.wallpaper===id}"><span class="wallpaper-mini-clock">9:41</span><span class="wallpaper-pick-label"><strong>${name}</strong><small>${desc}</small></span>${A.settings.wallpaper===id?`<i>${A.icon('check')}</i>`:''}</button>`).join('')}</div><h3 class="customize-label">アイコンのスタイル</h3><div class="style-picker">${[['standard','オリジナル'],['glass','ガラス'],['tinted','単色']].map(([value,label])=>`<button class="${(A.settings.iconStyle||'standard')===value?'selected':''}" data-action="chooseIconStyle" data-value="${value}" aria-pressed="${(A.settings.iconStyle||'standard')===value}">${label}</button>`).join('')}</div><button class="appearance-link" data-action="appearance">${A.icon('layers')}<span><strong>光と奥行き</strong><small>影・アニメーション</small></span><span class="chevron">›</span></button><h3 class="customize-label">時計スタイル</h3><div class="style-picker clock-style-picker">${[['classic','クラシック'],['light','ライト'],['rounded','ラウンド']].map(([value,label])=>`<button class="${(A.settings.clockStyle||'classic')===value?'selected':''}" data-action="chooseClockStyle" data-value="${value}" aria-pressed="${(A.settings.clockStyle||'classic')===value}"><span>9:41</span>${label}</button>`).join('')}</div><button class="preview-setting" data-action="toggleLockPreview" aria-pressed="${A.settings.lockPreview!==false}"><span>通知の本文を表示<small>表示設定のみ・端末保護なし</small></span><span class="preview-switch ${A.settings.lockPreview!==false?'on':''}"></span></button><button class="reset-layout" data-action="previewLock">ロック画面を見る</button><button class="reset-layout" data-action="resetLayout">配置をリセット</button><p class="control-footer">端末内に自動保存</p>`,'customize-overlay');
  };
  const depths=[['soft','やわらか','控えめな影'],['balanced','バランス','自然な立体感'],['deep','くっきり','深い落ち影']];
  const depthDescriptions={soft:'そっと浮かぶ、やわらかな影。',balanced:'縁の光と、自然に重なる影。',deep:'光を受けて、奥行きが際立つ。'};
  A.appearancePanel=()=>`<div class="depth-preview" aria-label="現在の影の深さのプレビュー"><div class="depth-preview-scene" aria-hidden="true"><span class="depth-preview-icon">${A.icon('layers')}</span><span class="depth-preview-card"><strong>A little depth.</strong><i></i><i></i></span></div><p id="depth-description" role="status">${depthDescriptions[A.settings.depth]||depthDescriptions.balanced}</p></div><h3 class="customize-label">影の深さ</h3><div class="appearance-options" role="group" aria-label="影の深さ">${depths.map(([value,label,detail])=>`<button data-action="chooseDepth" data-value="${value}" aria-pressed="${(A.settings.depth||'balanced')===value}"><strong>${label}</strong><small>${detail}</small></button>`).join('')}</div><button class="appearance-toggle" data-action="toggleMotion" aria-pressed="${!!A.settings.reduceMotion}"><span><strong>動きを抑える</strong><small>アニメーションを停止</small></span><span class="preview-switch ${A.settings.reduceMotion?'on':''}" aria-hidden="true"></span></button><p class="appearance-help">端末の「動きを減らす」を優先</p>`;
  A.actions.appearance=()=>A.overlay(`${A.overlayTitle('光と奥行き')}<p class="customize-subtitle"></p>${A.appearancePanel()}<button class="reset-layout" data-action="personalize">壁紙・ホーム</button><p class="control-footer">端末内に自動保存</p>`,'customize-overlay');
  A.actions.chooseDepth=el=>{
    const value=el.dataset.value;if(!depths.some(([id])=>id===value))return;
    A.settings.depth=value;A.applySettings();
    A.$$('[data-action="chooseDepth"]').forEach(button=>button.setAttribute('aria-pressed',String(button.dataset.value===value)));
    const description=A.$('#depth-description');if(description)description.textContent=depthDescriptions[value];
  };
  A.actions.toggleMotion=()=>{
    A.settings.reduceMotion=!A.settings.reduceMotion;A.applySettings();
    A.$$('[data-action="toggleMotion"]').forEach(button=>{button.setAttribute('aria-pressed',String(A.settings.reduceMotion));button.querySelector('.preview-switch').classList.toggle('on',A.settings.reduceMotion);});
  };
  A.actions.chooseClockStyle=el=>{if(!['classic','light','rounded'].includes(el.dataset.value))return;A.settings.clockStyle=el.dataset.value;A.applySettings();A.actions.personalize();};
  A.actions.toggleLockPreview=()=>{A.settings.lockPreview=A.settings.lockPreview===false;A.applySettings();A.renderLockNotices();A.actions.personalize();};
  A.actions.previewLock=()=>A.lock();
  A.actions.gestureGuide=()=>A.overlay(`${A.overlayTitle('操作ガイド')}<p class="customize-subtitle"></p><div class="gesture-guide">${[['grid','ホームを左へスワイプ','全アプリを表示'],['search','ホームを下へスワイプ','アプリ・記録を検索'],['edit','アイコンを長押し','新規作成 / 配置の入替'],['signal','画面右上をタップ・下へスワイプ','明るさ・集中モード'],['messages','画面左上の時刻をタップ','通知・未読・再通知'],['arrow','下端のホームバー','タップ：ホーム / 上：切替']].map(([icon,title,body])=>`<article>${A.icon(icon)}<div><strong>${title}</strong><p>${body}</p></div></article>`).join('')}</div><p class="control-footer">PC：Escで閉じる / Hでホーム / Alt+Tabでアプリ切替<br>データはこのブラウザ内に保存されます。</p>`,'guide-overlay');
  A.actions.chooseWallpaper=el=>{A.settings.wallpaper=el.dataset.value;A.applySettings();A.actions.personalize();};
  A.actions.chooseIconStyle=el=>{A.settings.iconStyle=el.dataset.value;A.applySettings();A.actions.personalize();};
  A.actions.resetLayout=()=>A.confirm('ホームの配置をリセット','配置のみ初期化。データは保持',()=>{homeOrder=[...defaultOrder];A.save('homeOrder',homeOrder);A.actions.finishEditing();A.toast('配置をリセット');});
  const baseApply=A.applySettings;
  A.applySettings=()=>{
    if(!depths.some(([id])=>id===A.settings.depth))A.settings.depth='balanced';
    A.settings.reduceMotion=A.settings.reduceMotion===true;
    const screen=A.$('#phone-screen');
    screen.dataset.depth=A.settings.depth;screen.dataset.reduceMotion=String(A.settings.reduceMotion);
    screen.dataset.iconStyle=A.settings.iconStyle||'standard';screen.dataset.clockStyle=A.settings.clockStyle||'classic';
    baseApply();A.updateSystem?.();
  };
  const baseOpen=A.open;
  A.open=(id,arg)=>{if(!A.apps[id]?.render)return;editing=false;selectedIcon=null;baseOpen(id,arg);};
  // Search uses local data only, and never injects user text as markup.
  A.spotlight=()=>{
    A.overlay(`${A.overlayTitle('検索')}<label class="spotlight-input">${A.icon('search')}<input id="spotlight-query" placeholder="アプリ・記録を検索" aria-label="アプリと記録を検索" autocomplete="off"></label><p class="spotlight-label" id="spotlight-heading">アプリ</p><div class="spotlight-results" id="spotlight-results"></div><div id="spotlight-content"></div><p class="control-footer">端末内を検索</p>`,'spotlight-overlay');
    const render=value=>{
      const q=value.trim().toLowerCase();
      const apps=Object.values(A.apps).filter(app=>(app.name+app.id).toLowerCase().includes(q));
      A.$('#spotlight-results').innerHTML=apps.map(app=>A.launcher(app)).join('');
      const notes=q?(A.searchableNotes?.()||A.load('notes',[])).filter(n=>(n.title+n.body).toLowerCase().includes(q)).slice(0,5):[];
      const reminders=q?(A.searchableReminders?.()||A.load('reminders',[])).filter(r=>r.text.toLowerCase().includes(q)).slice(0,5):[];
      const extra=q?(A.searchAdditional?.(q)||''):'';
      A.$('#spotlight-content').innerHTML=(notes.length?`<p class="spotlight-label">メモ</p><div class="search-content-group">${notes.map(n=>`<button data-action="searchNote" data-id="${A.escape(n.id)}">${smallIcon('notes')}<span><strong>${A.escape(n.title||'新しいメモ')}</strong><small>${A.escape(n.body.slice(0,65))}</small></span>${A.icon('arrow')}</button>`).join('')}</div>`:'')+(reminders.length?`<p class="spotlight-label">リマインダー</p><div class="search-content-group">${reminders.map(r=>`<button data-app="reminders">${smallIcon('reminders')}<span><strong>${A.escape(r.text)}</strong><small>${r.done?'完了済み':'未完了'}</small></span></button>`).join('')}</div>`:'')+extra+(!apps.length&&!notes.length&&!reminders.length&&!extra?'<div class="search-empty">該当なし</div>':'');
    };
    render('');A.$('#spotlight-query').oninput=e=>render(e.target.value);setTimeout(()=>A.$('#spotlight-query')?.focus(),120);
  };
  A.actions.searchNote=el=>{A.open('notes');A.actions.noteOpen(el);};
  // Notification center: local history, explicit read state, snooze and per-app delivery.
  const noticeLimit=100, noticeEsc=A.escape;
  const normalizeNotices=value=>(Array.isArray(value)?value:[]).filter(n=>n&&A.apps[n.app]&&typeof n.title==='string'&&typeof n.body==='string').slice(0,noticeLimit).map(n=>({...n,id:String(n.id||A.id()),time:Number.isFinite(Number(n.time))&&Math.abs(Number(n.time))<8640000000000000?Number(n.time):Date.now(),read:!!n.read,pinned:!!n.pinned,snoozedUntil:Number(n.snoozedUntil)||0,demo:n.demo===true||['welcome','studio'].includes(n.id)||n.app==='messages'}));
  let noticeList=normalizeNotices(A.load('notifications',[]));
  const savedNoticePrefs=A.load('notificationPrefs',{})||{};
  let noticePrefs={banners:savedNoticePrefs.banners!==false,compact:savedNoticePrefs.compact!==false,scheduled:!!savedNoticePrefs.scheduled,muted:Array.isArray(savedNoticePrefs.muted)?savedNoticePrefs.muted:[]};
  let noticeFilter='all',noticeApp='all',noticeQuery='',noticeExpanded=new Set(),bannerQueue=[],bannerTimer,noticeSeenMinute=-1;
  const noticeActive=n=>!n.snoozedUntil;
  const noticeVisible=()=>!A.$('#overlay').hidden&&A.$('#overlay').classList.contains('notifications-overlay');
  const relativeTime=t=>{const m=Math.max(0,Math.floor((Date.now()-t)/60000));return m<1?'今':m<60?`${m}分`:m<1440?`${Math.floor(m/60)}時間`:`${Math.floor(m/1440)}日`;};
  const noticeButton=(action,icon,label,id='',extra='')=>`<button data-action="${action}" data-id="${noticeEsc(id)}" aria-label="${label}" title="${label}" ${extra}>${A.icon(icon)}</button>`;
  const noticeBell=()=>`<svg viewBox="0 0 80 80" fill="none" aria-hidden="true"><circle cx="40" cy="40" r="36" stroke="currentColor" opacity=".12"/><circle cx="40" cy="40" r="29" stroke="currentColor" opacity=".18"/><path d="M23 49c5-6 4-11 4-17a13 13 0 0 1 26 0c0 6-1 11 4 17l2 4H21l2-4Z" fill="currentColor" fill-opacity=".14" stroke="currentColor" stroke-width="2"/><path d="M34 59a6 6 0 0 0 12 0M40 14v5" stroke="currentColor" stroke-width="3" stroke-linecap="round"/><circle cx="57" cy="23" r="5" fill="currentColor"/></svg>`;
  const noticeCard=(n,mini=false)=>{
    const hidden=A.locked&&A.settings.lockPreview===false,expanded=noticeExpanded.has(n.id),waiting=!!n.snoozedUntil;
    return `<article class="system-notification notice-card ${n.read?'is-read':'is-unread'} ${n.pinned?'is-pinned':''} ${mini?'is-mini':''} ${expanded?'is-expanded':''}" data-notice-id="${noticeEsc(n.id)}" style="--notice-accent:${n.app==='clock'?'#b07130':n.app==='focus'?'#8265c5':n.app==='messages'?'#318764':'#487faf'}">
      <button class="notification-open" data-action="openNotice" data-id="${noticeEsc(n.id)}">${smallIcon(n.app)}<span><span class="notification-meta"><span>${noticeEsc(A.apps[n.app].name)}${n.demo?' · デモ':''}</span><time data-notice-time="${n.time}" datetime="${new Date(n.time).toISOString()}">${relativeTime(n.time)}</time></span><strong>${hidden?'新しい通知':noticeEsc(n.title)}</strong>${!hidden&&n.body?`<span class="notification-body">${noticeEsc(n.body)}</span>`:''}</span>${!n.read?'<i class="notice-unread-dot" aria-label="未読"></i>':''}</button>
      ${mini?noticeButton('dismissNotice','close','削除',n.id,'class="notification-dismiss"'):`<div class="notice-actions">${noticeButton('noticeRead',n.read?'refresh':'check',n.read?'未読にする':'既読にする',n.id)}${noticeButton('noticePin','pin',n.pinned?'ピン解除':'ピン留め',n.id,`aria-pressed="${n.pinned}"`)}<button data-action="noticeSnooze" data-id="${noticeEsc(n.id)}" aria-label="${waiting?'再通知を取り消す':'10分後に再通知'}">${A.icon(waiting?'refresh':'clock')}${waiting?new Date(n.snoozedUntil).toLocaleTimeString('ja-JP',{hour:'2-digit',minute:'2-digit'}):'10分'}</button>${noticeButton('noticeExpand',expanded?'minus':'plus',expanded?'折りたたむ':'全文を表示',n.id,`aria-expanded="${expanded}"`)}${noticeButton('dismissNotice','trash','削除',n.id)}</div>`}</article>`;
  };
  const refreshNotices=()=>{A.renderLockNotices();if(noticeVisible())renderNoticeFeed();};
  const commitNotices=next=>{const bounded=next.slice(0,noticeLimit);if(!A.save('notifications',bounded))return false;noticeList=bounded;refreshNotices();return true;};
  const removeBanner=()=>{clearTimeout(bannerTimer);A.$('#notification-banner')?.remove();};
  const dropBanner=id=>{bannerQueue=bannerQueue.filter(x=>x!==id);if(A.$('#notification-banner')?.dataset.id===id)removeBanner();};
  A.noticeMuted=app=>noticePrefs.muted.includes(app);
  function presentBanner(){
    if(A.$('#notification-banner')||A.locked||A.settings.focus||!noticePrefs.banners||document.hidden||noticeVisible())return;
    let notice;
    while(bannerQueue.length&&!notice){const id=bannerQueue.shift();notice=noticeList.find(n=>n.id===id&&noticeActive(n)&&!n.read&&!A.noticeMuted(n.app));}
    if(!notice)return;
    const banner=document.createElement('div');banner.id='notification-banner';banner.dataset.id=notice.id;banner.setAttribute('role','status');banner.innerHTML=noticeCard(notice,true)+'<span class="notice-lifetime" aria-hidden="true"></span>';A.$('#phone-screen').appendChild(banner);
    const expire=()=>{clearTimeout(bannerTimer);bannerTimer=setTimeout(()=>{banner.classList.add('notice-exit');setTimeout(()=>{banner.remove();presentBanner();},240);},6500);};
    const pause=()=>{clearTimeout(bannerTimer);banner.classList.add('is-paused');};
    const resume=()=>{if(!banner.isConnected||banner.matches(':hover')||banner.contains(document.activeElement))return;banner.classList.remove('is-paused');const line=banner.querySelector('.notice-lifetime');line.style.animation='none';void line.offsetWidth;line.style.animation='';expire();};
    banner.addEventListener('pointerenter',pause);banner.addEventListener('pointerleave',resume);banner.addEventListener('focusin',pause);banner.addEventListener('focusout',()=>setTimeout(resume,0));expire();
  }
  A.notify=({app,title,body='',arg,demo=false,key=''})=>{
    if(!A.apps[app]||A.noticeMuted(app))return false;
    if(key&&noticeList.some(n=>n.key===key))return true;
    const n={id:A.id(),app,title:String(title||A.apps[app].name),body:String(body),arg,demo:demo||app==='messages',key,time:Date.now(),read:false,pinned:false,snoozedUntil:0};
    if(!commitNotices([n,...noticeList]))return false;
    // Focus mode keeps history without queuing a burst for later.
    if(!A.settings.focus&&noticePrefs.banners&&!A.locked&&!noticeVisible()){bannerQueue.push(n.id);bannerQueue=bannerQueue.slice(-8);presentBanner();}
    return true;
  };
  A.renderLockNotices=()=>{
    const active=noticeList.filter(noticeActive),unread=active.filter(n=>!n.read).length;
    A.$('.lock-notifications').innerHTML=active.filter(n=>!n.read).slice(0,2).map(n=>noticeCard(n,true)).join('')||'<p class="lock-clear">通知なし</p>';
    const status=A.$('#status-time');status.dataset.unread=String(Math.min(99,unread));status.classList.toggle('has-notices',unread>0);status.setAttribute('aria-label',`通知を開く・未読${unread}件`);
  };
  function renderNoticeFeed(){
    const root=A.$('#notice-feed');if(!root)return;
    const focus=document.activeElement,identity=focus?.dataset,position=A.$('#overlay').scrollTop;
    const active=noticeList.filter(noticeActive),unread=active.filter(n=>!n.read).length;
    A.$('#notice-count').textContent=unread;A.$('#notice-summary').textContent=unread?'未読':'すべて確認済み';
    A.$('#notice-focus').setAttribute('aria-pressed',String(!!A.settings.focus));
    A.$('#notice-focus').innerHTML=A.icon('moon')+(A.settings.focus?'集中中':'集中');
    A.$('#notice-tabs').innerHTML=[['all','すべて',active.length],['unread','未読',unread],['pinned','ピン',active.filter(n=>n.pinned).length],['later','あとで',noticeList.filter(n=>!noticeActive(n)).length]].map(([id,label,count])=>`<button data-action="noticeFilter" data-id="${id}" aria-pressed="${noticeFilter===id}">${label}<span>${count}</span></button>`).join('');
    const apps=[...new Set(noticeList.map(n=>n.app))];if(noticeApp!=='all'&&!apps.includes(noticeApp))noticeApp='all';
    A.$('#notice-app-filter').innerHTML=`<option value="all">全アプリ</option>`+apps.map(id=>`<option value="${id}" ${noticeApp===id?'selected':''}>${noticeEsc(A.apps[id].name)}</option>`).join('');
    const q=noticeQuery.normalize('NFKC').toLowerCase();
    const list=noticeList.filter(n=>(noticeFilter==='later'?!noticeActive(n):noticeActive(n)&&(noticeFilter==='all'||noticeFilter==='unread'&&!n.read||noticeFilter==='pinned'&&n.pinned))&&(noticeApp==='all'||n.app===noticeApp)&&(!q||(n.title+' '+n.body+' '+A.apps[n.app].name).normalize('NFKC').toLowerCase().includes(q))).sort((a,b)=>Number(b.pinned)-Number(a.pinned)||b.time-a.time);
    const groups=new Map();for(const n of list){const label=n.pinned&&noticeActive(n)?'ピン留め':new Date(n.time).toLocaleDateString('ja-JP')===new Date().toLocaleDateString('ja-JP')?'今日':'以前';if(!groups.has(label))groups.set(label,[]);groups.get(label).push(n);}
    root.classList.toggle('notice-compact',noticePrefs.compact);
    root.innerHTML=list.length?[...groups].map(([label,items])=>`<section class="notice-group"><h3>${label}<span>${items.length}</span></h3><div class="notification-stack">${items.map(n=>noticeCard(n)).join('')}</div></section>`).join(''):`<div class="notification-empty"><div class="notice-empty-art">${noticeBell()}</div><h3>${q?'一致なし':noticeFilter==='later'?'あとで通知なし':noticeFilter==='pinned'?'ピン留めなし':'すっきり'}</h3><p>${q?'検索語を変更':noticeFilter==='all'?'新着はここに':'通知なし'}</p></div>`;
    A.$('#notice-read-all').disabled=!active.some(n=>!n.read);A.$('#notice-clear-read').disabled=!noticeList.some(n=>n.read&&!n.pinned&&!n.snoozedUntil);
    if(identity?.action){const target=Array.from(A.$('#overlay').querySelectorAll('[data-action]')).find(el=>el.dataset.action===identity.action&&el.dataset.id===identity.id);if(target)target.focus({preventScroll:true});else if(!focus?.isConnected)A.$('#notice-app-filter').focus({preventScroll:true});}
    A.$('#overlay').scrollTop=position;
  }
  A.notifications=()=>{
    removeBanner();bannerQueue=[];
    A.overlay(`${A.overlayTitle('通知')}<div class="notice-hero"><div class="notice-orb">${noticeBell()}</div><div><strong id="notice-count">0</strong><span id="notice-summary">未読</span></div><button id="notice-focus" data-action="noticeFocus"></button></div><div class="notice-tabs" id="notice-tabs" aria-label="通知の絞り込み"></div><div class="notice-tools"><label>${A.icon('search')}<input id="notice-query" type="search" placeholder="検索" aria-label="通知を検索" maxlength="200" value="${noticeEsc(noticeQuery)}"></label><select id="notice-app-filter" aria-label="アプリで絞り込み"></select>${noticeButton('noticeSettings','settings','通知設定')}</div><div id="notice-feed"></div><div class="notice-bulk"><button id="notice-read-all" data-action="noticeReadAll">${A.icon('check')}すべて既読</button><button id="notice-clear-read" data-action="noticeClearRead">${A.icon('trash')}既読を削除</button></div><p class="notice-footnote">端末内 · 最大100件</p>`,'notifications-overlay');
    renderNoticeFeed();A.$('#notice-query').oninput=e=>{noticeQuery=e.target.value;renderNoticeFeed();};A.$('#notice-app-filter').onchange=e=>{noticeApp=e.target.value;renderNoticeFeed();};
  };
  const changeNotice=(id,fn)=>commitNotices(noticeList.map(n=>n.id===id?fn(n):n));
  A.actions.openNotice=el=>{const n=noticeList.find(n=>n.id===el.dataset.id);if(!n)return;if(!changeNotice(n.id,n=>({...n,read:true})))return;dropBanner(n.id);A.open(n.app,n.arg);if(n.app==='calendar')A.actions.calendarToday?.();};
  A.actions.noticeRead=el=>{if(changeNotice(el.dataset.id,n=>({...n,read:!n.read})))dropBanner(el.dataset.id);};
  A.actions.noticePin=el=>changeNotice(el.dataset.id,n=>({...n,pinned:!n.pinned}));
  A.actions.noticeExpand=el=>{const id=el.dataset.id;noticeExpanded.has(id)?noticeExpanded.delete(id):noticeExpanded.add(id);renderNoticeFeed();};
  A.actions.noticeSnooze=el=>{const n=noticeList.find(n=>n.id===el.dataset.id);if(!n)return;if(changeNotice(n.id,n=>({...n,snoozedUntil:n.snoozedUntil?0:Date.now()+600000,read:false}))){dropBanner(n.id);A.toast(n.snoozedUntil?'再通知を解除':'10分後に通知');}};
  function deleteNotices(predicate){
    const removed=noticeList.filter(predicate);if(!removed.length)return;
    if(!commitNotices(noticeList.filter(n=>!predicate(n))))return;removed.forEach(n=>dropBanner(n.id));
    A.toast(`${removed.length}件削除`,{label:'戻す',onAction:()=>{const ids=new Set(noticeList.map(n=>n.id));if(commitNotices([...removed.filter(n=>!ids.has(n.id)),...noticeList].sort((a,b)=>b.time-a.time)))A.toast('復元済み');}});
  }
  A.actions.dismissNotice=el=>deleteNotices(n=>n.id===el.dataset.id);
  A.actions.noticeReadAll=()=>{if(commitNotices(noticeList.map(n=>noticeActive(n)?{...n,read:true}:n))){removeBanner();bannerQueue=[];}};
  A.actions.noticeClearRead=()=>deleteNotices(n=>n.read&&!n.pinned&&!n.snoozedUntil);
  A.actions.clearNotifications=()=>A.confirm('通知を全削除？','ピン・再通知も削除',()=>{deleteNotices(()=>true);A.notifications();});
  A.actions.noticeFilter=el=>{noticeFilter=el.dataset.id;renderNoticeFeed();};
  A.actions.noticeFocus=()=>{A.settings.focus=!A.settings.focus;A.applySettings();if(A.settings.focus){removeBanner();bannerQueue=[];}renderNoticeFeed();};
  const saveNoticePrefs=next=>{if(!A.save('notificationPrefs',next))return false;noticePrefs=next;return true;};
  A.actions.noticeSettings=()=>{
    const toggle=(key,label,detail)=>`<button class="notice-setting" data-action="noticePreference" data-id="${key}" aria-pressed="${noticePrefs[key]}"><span><strong>${label}</strong><small>${detail}</small></span><i class="preview-switch ${noticePrefs[key]?'on':''}"></i></button>`;
    A.overlay(`${A.overlayTitle('通知設定')}<button class="notice-back" data-action="showNotifications">‹ 通知</button><div class="notice-settings-card">${toggle('banners','バナー','画面上部に表示')}${toggle('compact','コンパクト','本文は1行。＋で全文')}${toggle('scheduled','予定・期限','予定の10分前 / 当日期限')}</div><p class="notice-footnote">ページ終了・スリープ中は通知保証なし</p><h3 class="notice-settings-label">アプリ別</h3><div class="notice-settings-card">${['clock','focus','calendar','reminders','messages'].map(app=>`<button class="notice-setting" data-action="noticeMute" data-id="${app}" aria-pressed="${!A.noticeMuted(app)}">${smallIcon(app)}<span><strong>${noticeEsc(A.apps[app].name)}${app==='messages'?' · デモ':''}</strong></span><i class="preview-switch ${!A.noticeMuted(app)?'on':''}"></i></button>`).join('')}</div><button class="notice-setting" data-action="noticePrivacy" aria-pressed="${A.settings.lockPreview!==false}"><span><strong>ロック画面の本文</strong><small>表示設定のみ・端末保護なし</small></span><i class="preview-switch ${A.settings.lockPreview!==false?'on':''}"></i></button><button class="notice-danger" data-action="clearNotifications">全削除</button>`,'notice-settings-overlay');
  };
  A.actions.showNotifications=()=>A.notifications();
  A.actions.noticePreference=el=>{const key=el.dataset.id;if(!['banners','compact','scheduled'].includes(key))return;if(saveNoticePrefs({...noticePrefs,[key]:!noticePrefs[key]})){if(!noticePrefs.banners){removeBanner();bannerQueue=[];}noticeSeenMinute=-1;A.actions.noticeSettings();}};
  A.actions.noticeMute=el=>{const app=el.dataset.id;if(!A.apps[app])return;if(saveNoticePrefs({...noticePrefs,muted:A.noticeMuted(app)?noticePrefs.muted.filter(x=>x!==app):[...noticePrefs.muted,app]})){if(A.noticeMuted(app)){noticeList.filter(n=>n.app===app).forEach(n=>dropBanner(n.id));}A.actions.noticeSettings();}};
  A.actions.noticePrivacy=()=>{A.settings.lockPreview=A.settings.lockPreview===false;A.applySettings();A.renderLockNotices();A.actions.noticeSettings();};
  // Horizontal dismissal never captures vertical scrolling; buttons remain a full alternative.
  let noticeSwipe=null,noticeSwallowUntil=0;
  document.addEventListener('pointerdown',e=>{const card=e.target.closest('.notice-card');if(!card||e.button!==0)return;noticeSwipe={card,x:e.clientX,y:e.clientY};},{passive:true});
  document.addEventListener('pointerup',e=>{if(!noticeSwipe)return;const {card,x,y}=noticeSwipe;noticeSwipe=null;const dx=e.clientX-x,dy=e.clientY-y;if(dx<-75&&Math.abs(dx)>Math.abs(dy)*1.8&&card.isConnected){noticeSwallowUntil=Date.now()+350;card.classList.add('notice-exit');setTimeout(()=>{A.actions.dismissNotice({dataset:{id:card.dataset.noticeId}});if(card.isConnected)card.classList.remove('notice-exit');},220);}},{passive:true});
  document.addEventListener('pointercancel',()=>noticeSwipe=null);
  document.addEventListener('click',e=>{if(Date.now()<noticeSwallowUntil&&e.target.closest('.notice-card')){e.preventDefault();e.stopImmediatePropagation();}},true);
  // Snoozes survive reload; one wake-up batch, no OS/background execution claims.
  const scheduledHistory=A.load('noticeScheduleHistory',[]);
  let scheduleHistory=Array.isArray(scheduledHistory)?scheduledHistory.slice(-200):[];
  function noticeTick(){
    const now=Date.now(),due=noticeList.filter(n=>n.snoozedUntil&&n.snoozedUntil<=now);
    if(due.length&&commitNotices(noticeList.map(n=>due.some(d=>d.id===n.id)?{...n,snoozedUntil:0,time:now,read:false}:n))){if(!A.settings.focus)bannerQueue.push(...due.filter(n=>!A.noticeMuted(n.app)).map(n=>n.id));bannerQueue=bannerQueue.slice(-8);}
    if(A.settings.focus||!noticePrefs.banners){removeBanner();bannerQueue=[];}else presentBanner();
    const minute=Math.floor(now/60000);if(minute===noticeSeenMinute)return;noticeSeenMinute=minute;
    A.$$('[data-notice-time]').forEach(el=>el.textContent=relativeTime(+el.dataset.noticeTime));
    if(!noticePrefs.scheduled)return;
    const date=new Date(),day=`${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,'0')}-${String(date.getDate()).padStart(2,'0')}`;
    const deliver=(key,data)=>{if(scheduleHistory.includes(key))return;if(A.notify({...data,key})){scheduleHistory=[...scheduleHistory,key].slice(-200);A.save('noticeScheduleHistory',scheduleHistory);}};
    (A.allEvents?.()||[]).filter(e=>e.date===day).forEach(e=>{const delta=new Date(e.date+'T'+e.time).getTime()-now;if(delta>=0&&delta<=600000)deliver(`event:${e.id}:${e.date}:${e.time}`,{app:'calendar',title:e.title,body:`${e.time}${e.place?' · '+e.place:''}`});});
    const tasks=(A.searchableReminders?.()||[]).filter(r=>!r.done&&r.due===day);if(tasks.length)deliver('tasks:'+day,{app:'reminders',title:`今日の期限 ${tasks.length}件`,body:tasks.slice(0,3).map(r=>r.text).join(' · ')});
  }
  setInterval(noticeTick,1000);
  window.addEventListener('storage',e=>{if(e.key==='aura.notifications'){noticeList=normalizeNotices(A.load('notifications',[]));removeBanner();bannerQueue=[];refreshNotices();}if(e.key==='aura.notificationPrefs'){const p=A.load('notificationPrefs',{})||{};noticePrefs={...noticePrefs,...p,muted:Array.isArray(p.muted)?p.muted:[]};refreshNotices();}});
  A.$('.lock-top .lock-icon').innerHTML=A.icon('lock');
  A.$('#lock-flashlight').innerHTML=A.icon('flashlight');
  A.$('.lock-shortcuts [data-app="camera"]').innerHTML=A.icon('camera');
  A.$('.lock-notifications').insertAdjacentHTML('beforebegin',`<div class="lock-glance"><button data-app="weather">${A.icon('sun')}<span id="lock-glance-weather">26°</span></button><button data-app="calendar">${A.icon('calendar')}今日の予定</button><button data-app="clock">${A.icon('alarm')}時計</button></div><section class="lock-player" id="lock-player" hidden><div class="lock-track"><span class="lock-album">${A.icon('music')}</span><div><strong id="lock-track-title"></strong><small>aura originals</small></div><span class="audio-bars"><i></i><i></i><i></i></span></div><div class="lock-player-controls"><button data-action="musicPrevious" aria-label="前の曲">${A.icon('previous')}</button><button id="lock-play" data-action="lockPlay" aria-label="再生・一時停止">${A.icon('play')}</button><button data-action="musicNext" aria-label="次の曲">${A.icon('next')}</button></div></section>`);
  A.actions.lockPlay=()=>{A.music?.toggle();A.updateSystem();};
  A.$('#status-controls').insertAdjacentHTML('afterbegin','<span id="status-focus" hidden></span><span id="status-airplane" hidden></span>');
  A.$('#status-focus').innerHTML=A.icon('moon');A.$('#status-airplane').innerHTML=A.icon('airplane');
  A.updateSystem=()=>{
    const s=A.settings,status=A.$('#status-controls');
    status.querySelectorAll(':scope > svg').forEach((svg,i)=>{svg.style.opacity=(i===0?s.cellular&&!s.airplane:s.wifi)?'1':'.25';});
    A.$('#status-focus').hidden=!s.focus;A.$('#status-airplane').hidden=!s.airplane;
    if(s.focus)A.$('#notification-banner')?.remove();
    status.setAttribute('aria-label',`コントロールセンターを開く。シミュレーション：Wi-Fi ${s.wifi?'オン':'オフ'}${s.airplane?'、機内モード':''}`);
    A.$('.battery').setAttribute('title','シミュレーターのバッテリー表示');
    A.updateAppClock(new Date());
    A.$('#lock-glance-weather').textContent=(A.weatherSnapshot?.()?.temp??26)+'°';
    const music=A.music,player=A.$('#lock-player');player.hidden=!music?.track||(!music.playing&&!A.recentApps.includes('music'));
    if(music?.track){A.$('#lock-track-title').textContent=music.track.title;const play=A.$('#lock-play');if(play.dataset.playing!==String(music.playing)){play.innerHTML=A.icon(music.playing?'pause':'play');play.dataset.playing=String(music.playing);}player.classList.toggle('is-playing',!!music.playing);}
  };
  const updateClock=A.updateClock;
  A.updateClock=()=>{updateClock();A.updateSystem();};
  // Directional gestures begin outside inputs and do not steal normal vertical scrolling.
  let swipe=null;
  const screen=A.$('#phone-screen');
  screen.addEventListener('touchstart',e=>{if(e.touches.length!==1)return;const t=e.touches[0];swipe={x:t.clientX,y:t.clientY,target:e.target,scroll:A.$('.home-main').scrollTop};},{passive:true});
  screen.addEventListener('touchend',e=>{
    if(!swipe)return;const start=swipe;swipe=null;const t=e.changedTouches[0],dx=t.clientX-start.x,dy=t.clientY-start.y;
    if(start.target.closest('input,textarea,select,.home-indicator')||editing)return;
    if(start.target.closest('.status-bar')&&dy>55){start.x>screen.getBoundingClientRect().left+screen.clientWidth/2?A.controls():A.notifications();return;}
    if(!A.$('#overlay').hidden&&A.$('#overlay').classList.contains('library-overlay')&&dx>70&&Math.abs(dx)>Math.abs(dy)*1.5){A.closeOverlay();return;}
    if(A.locked||A.current||!A.$('#overlay').hidden)return;
    if(dx<-70&&Math.abs(dx)>Math.abs(dy)*1.5){clearTimeout(pressTimer);A.library();}
    else if(dy>75&&Math.abs(dy)>Math.abs(dx)*1.5&&start.scroll===0&&!start.target.closest('.home-dock'))A.spotlight();
  },{passive:true});
  // Keep modal keyboard navigation within the active overlay and restore focus on close.
  let overlayReturnFocus=null;
  const baseOverlay=A.overlay,baseCloseOverlay=A.closeOverlay;
  A.overlay=(html,extra='')=>{if(A.$('#overlay').hidden)overlayReturnFocus=document.activeElement;baseOverlay(html,extra);const overlay=A.$('#overlay');overlay.setAttribute('role','dialog');overlay.setAttribute('aria-modal','true');overlay.setAttribute('aria-label',overlay.querySelector('h2,h3')?.textContent||'メニュー');(overlay.querySelector('input:not([type=range]),.close-button,button'))?.focus({preventScroll:true});};
  A.closeOverlay=()=>{const wasOpen=!A.$('#overlay').hidden;baseCloseOverlay();if(wasOpen&&overlayReturnFocus?.isConnected)overlayReturnFocus.focus({preventScroll:true});};
  A.actions.closeOverlay=A.closeOverlay;
  document.addEventListener('keydown',e=>{if(e.key!=='Tab'||A.$('#overlay').hidden||!e.target.closest('#overlay,#toast'))return;const items=[...A.$$('button:not(:disabled),input,textarea,select,a[href]',A.$('#overlay')),...A.$$('#toast.visible button')].filter(el=>el.getClientRects().length);const first=items[0],last=items.at(-1);if(!first)return;if(e.shiftKey&&document.activeElement===first){e.preventDefault();last.focus();}else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first.focus();}});
  A.$('#home-search').onclick=A.spotlight;A.$('#status-time').onclick=A.notifications;
  A.renderLockNotices();
  A.renderHome();A.applySettings();A.updateClock();setInterval(()=>A.updateClock(),1000);
})();
