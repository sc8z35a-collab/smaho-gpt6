'use strict';
(() => {
  const A = window.Aura;
  const screen = A.$('#phone-screen');
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const modes = ['static', 'fhd'];
  const descriptions = {
    calendar:'紙の束が、ゆっくり傾く。', photos:'透明な花びらが、光を重ねる。',
    camera:'レンズの中で、絞りが開閉する。', weather:'太陽の前を、雲が流れる。',
    mail:'手紙が、そっと浮き上がる。', clock:'時針・分針・秒針が、現在時刻を刻む。',
    maps:'地図のピンが、静かに脈打つ。', notes:'紙の上を、鉛筆がなぞる。',
    reminders:'チェックリストが、軽やかに揺れる。', files:'書類を抱えたフォルダが、揺れる。',
    calculator:'液晶の数字が、淡く明滅する。', settings:'精密な歯車が、ゆっくり回る。',
    games:'コントローラーが、遊びに誘う。', health:'ハートと波形が、リズムを刻む。',
    wallet:'革のウォレットが、光を受ける。', recorder:'細い波形が、それぞれに動く。',
    today:'今日のチェックが、静かに輝く。', focus:'タイマーの針が、一周する。',
    habits:'小さな葉が、風に揺れる。', expenses:'帳簿とコインが、そっと揺れる。',
    shopping:'買い物袋が、軽くスイングする。', journal:'日記のしおりが、揺れる。',
    contacts:'アドレス帳が、ゆっくり傾く。', converter:'ふたつの矢印が、行き交う。',
    reading:'開いた本のしおりが、揺れる。', sketch:'鉛筆が、小さな線を描くように動く。',
    phone:'受話器の先で、電波が広がる。', safari:'コンパスの針が、方角を探す。',
    messages:'三つの点が、順番に弾む。', music:'音符と波形が、音楽のように揺れる。'
  };
  const isReduced = () => reduced.matches || A.settings.reduceMotion;
  const enabled = () => A.settings.iconMotion === 'fhd';
  const tile = id => `<span class="app-icon ${id}-icon" style="background:${A.apps[id].color}">${A.appIcon(id)}</span>`;
  const status = () => !enabled() ? '静止モード' : isReduced() ? '動きを抑える設定により停止中' : '高精細モーション ON';
  A.iconMotionPanel = () => `<section class="motion-panel" aria-label="アイコンの動き">
    <h3>アイコンの動き</h3>
    <div class="motion-samples" aria-hidden="true">${['weather','camera','settings','messages'].map(tile).join('')}</div>
    <div class="motion-mode-picker" role="group" aria-label="アイコンの動作モード">
      <button data-action="chooseIconMotion" data-value="static" aria-pressed="${!enabled()}">静止</button>
      <button data-action="chooseIconMotion" data-value="fhd" aria-pressed="${enabled()}">動かす</button>
    </div><p class="motion-status" role="status">${status()}</p>
    <button class="motion-gallery-link" data-action="iconMotionGallery">大きく見る <span aria-hidden="true">↗</span></button>
    <p class="motion-footnote">動きは装飾。通信・録音・健康状態の表示ではありません。</p>
  </section>`;
  A.actions.iconMotion = () => A.overlay(`${A.overlayTitle('アイコンの動き')}${A.iconMotionPanel()}<button class="reset-layout" data-action="appearance">光と奥行き</button>`, 'motion-overlay');
  let selected = 'camera';
  const renderDetail = () => {
    const detail = A.$('#motion-detail');
    if (!detail) return;
    detail.innerHTML = `<div class="motion-detail-art">${tile(selected)}</div><h3>${A.apps[selected].name}</h3><p>${descriptions[selected]}</p><button data-app="${selected}">アプリを開く <span aria-hidden="true">↗</span></button>`;
    A.$$('.motion-gallery [data-action="inspectIconMotion"]').forEach(button => button.setAttribute('aria-pressed', String(button.dataset.id === selected)));
    const counter = A.$('#motion-index');
    if (counter) counter.textContent = `${String(Object.keys(descriptions).indexOf(selected)+1).padStart(2,'0')} / 30`;
  };
  A.actions.iconMotionGallery = () => {
    A.overlay(`${A.overlayTitle('Motion atelier')}
      <div class="motion-gallery-toolbar"><p class="motion-status" role="status">${status()}</p><button data-action="toggleGalleryMotion">${enabled()?'静止にする':'動かす'}</button></div>
      <div class="motion-workbench"><div class="motion-detail-column"><nav class="motion-detail-nav" aria-label="拡大アイコンの切替"><button data-action="stepIconMotion" data-step="-1" aria-label="前のアイコン">←</button><span id="motion-index" aria-live="polite"></span><button data-action="stepIconMotion" data-step="1" aria-label="次のアイコン">→</button></nav>
      <section id="motion-detail" class="motion-detail" aria-label="選択したアイコンの拡大プレビュー"></section></div>
      <div class="motion-gallery" role="group" aria-label="プレビューするアイコン">${Object.values(A.apps).map(app => `<button data-action="inspectIconMotion" data-id="${app.id}" aria-label="${app.name}をプレビュー" aria-pressed="${selected===app.id}">${tile(app.id)}<span>${app.name}</span></button>`).join('')}</div></div>
      <button class="reset-layout" data-action="iconMotion">モード設定に戻る</button>`, 'motion-overlay motion-gallery-overlay');
    renderDetail();
  };
  A.actions.inspectIconMotion = el => {
    if (!Object.hasOwn(descriptions, el.dataset.id)) return;
    selected = el.dataset.id;
    renderDetail();
    A.$('#motion-detail').scrollIntoView({block:'nearest', behavior:'instant'});
  };
  A.actions.stepIconMotion = el => {
    const step = Number(el.dataset.step);
    if (step !== 1 && step !== -1) return;
    const ids = Object.keys(descriptions);
    selected = ids[(ids.indexOf(selected) + step + ids.length) % ids.length];
    renderDetail();
  };
  A.actions.chooseIconMotion = el => {
    if (!modes.includes(el.dataset.value)) return;
    A.settings.iconMotion = el.dataset.value;
    A.applySettings();
  };
  A.actions.toggleGalleryMotion = () => A.actions.chooseIconMotion({dataset:{value:enabled()?'static':'fhd'}});
  // Existing entry points remain intact, including the settings app's appearance page.
  const appearancePanel = A.appearancePanel;
  A.appearancePanel = () => A.iconMotionPanel() + appearancePanel();
  A.$('.springboard-tools').insertAdjacentHTML('beforeend', '<button class="home-motion-button" data-action="iconMotion" aria-label="FHD MOVE APPの設定"><span class="motion-indicator" aria-hidden="true"></span>FHD MOVE APP</button>');

  // Observe only real SVG instances. No frame-by-frame DOM replacement, canvas,
  // remote images, perpetual JS animation loop, or observers retained on dead nodes.
  const observed = new Set();
  const intersection = new IntersectionObserver(entries => {
    entries.forEach(({target,isIntersecting,intersectionRatio}) => {
      target.dataset.motionVisible = String(isIntersecting && intersectionRatio > 0);
    });
  }, {threshold:0});
  const sync = () => {
    const active = enabled() && !isReduced() && !document.hidden;
    screen.dataset.iconMotion = enabled() ? 'fhd' : 'static';
    screen.dataset.motionPaused = String(!active);
    A.$('#home-screen').dataset.motionCovered = String(!A.$('#overlay').hidden || A.current !== null || A.locked);
    const svgs = new Set(A.$$('.app-artwork', screen));
    observed.forEach(svg => { if (!svgs.has(svg)) { intersection.unobserve(svg); observed.delete(svg); } });
    svgs.forEach(svg => { if (!observed.has(svg)) { observed.add(svg); intersection.observe(svg); } });
    A.$$('.motion-status').forEach(el => { if (el.textContent !== status()) el.textContent = status(); });
    A.$$('[data-action="chooseIconMotion"]').forEach(el => el.setAttribute('aria-pressed', String(el.dataset.value===A.settings.iconMotion)));
    const toggle = A.$('[data-action="toggleGalleryMotion"]');
    if (toggle) { const label=enabled()?'静止にする':'動かす'; if(toggle.textContent!==label) toggle.textContent=label; }
    A.$$('.home-motion-button').forEach(el => { el.dataset.active=String(active); el.setAttribute('aria-label', `FHD MOVE APPの設定。${status()}`); });
  };
  let scheduled = false;
  const schedule = () => {
    if (scheduled) return;
    scheduled = true;
    queueMicrotask(() => { scheduled=false; sync(); });
  };
  // Exclude transforms, style, data-* and clock text updates from observation.
  new MutationObserver(records => {
    if (records.some(r => r.type==='attributes' || [...r.addedNodes,...r.removedNodes].some(n => n.nodeType===1))) schedule();
  }).observe(screen, {childList:true, subtree:true, attributes:true, attributeFilter:['hidden']});
  const applySettings = A.applySettings;
  A.applySettings = () => {
    if (!modes.includes(A.settings.iconMotion)) A.settings.iconMotion='static';
    applySettings();
    sync();
  };
  document.addEventListener('visibilitychange', sync);
  reduced.addEventListener('change', sync);
  A.applySettings();
})();
