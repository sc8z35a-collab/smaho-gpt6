'use strict';
// Interoperable device handoffs; opening another app never counts as delivery.
(() => {
  const A = window.Aura, N = A.network, $ = A.$, esc = A.escape;
  const button = (action, text) => `<button type="button" class="connection-link" data-action="${action}">${esc(text)}</button>`;
  const status = text => `<div class="connection-state" role="status">${esc(text)}</div>`;
  N.offerFile = (blob, name) => {
    const file = new File([blob], name, {type: blob.type || 'application/octet-stream'});
    const shareable = navigator.canShare?.({files: [file]});
    A.overlay(`${A.overlayTitle('ファイルを共有')}<div class="connected-overlay"><p>${esc(name)}</p><p class="connected-caption">共有先を選ぶまでアップロードしません。</p><div class="connection-toolbar">${shareable ? '<button class="primary-button" id="share-ready">共有先を選ぶ</button>' : '<p>この環境ではファイル共有に未対応です。保存してお使いください。</p>'}<button class="connection-link" id="save-ready">端末に保存</button></div><p id="file-share-status" role="status"></p></div>`);
    if ($('#share-ready')) $('#share-ready').onclick = async () => { try { await navigator.share({files: [file], title: name}); } catch (error) { if (error.name !== 'AbortError' && $('#file-share-status')) $('#file-share-status').textContent = '共有できませんでした。端末への保存をお試しください。'; } };
    $('#save-ready').onclick = () => A.download(blob, name);
  };
  const phoneNumber = raw => String(raw).replace(/[\s()-]/g, '');
  const validPhone = value => /^\+?[0-9]{3,15}$/.test(value);
  const handoffNote = '<p class="connected-caption">対応アプリのインストール・設定が必要です。最終的な発信・送信は移動先で確認してください。auraでは送信成否・受信・通話時間を取得しません。</p>';
  const originals = Object.fromEntries(['phone','messages','mail','music'].map(id => [id, A.apps[id].render]));
  // Native inboxes cannot be read here; never badge them with seeded demo counts.
  A.mailUnread = () => 0; A.messageUnread = () => 0;
  A.actions.phoneDemo = () => originals.phone();
  A.actions.messagesDemo = () => originals.messages();
  A.actions.mailDemo = () => originals.mail();
  A.actions.musicOriginals = () => originals.music();

  A.apps.mail.render = () => {
    A.statusTheme(false); const draft = A.load('externalMailDraft', {}) || {};
    A.view(A.nav('メール', button('mailDemo', 'デモ')) + `<div class="app-content"><span class="connection-badge">MAIL HANDOFF</span><h1 class="app-title">本当の相手へ。</h1><p class="app-subtitle">本文を準備して、お使いのメールアプリへ。</p><form id="external-mail"><label class="form-label">宛先</label><input class="text-input" type="email" name="to" required maxlength="254" placeholder="name@example.com" value="${esc(draft.to || '')}"><label class="form-label">件名</label><input class="text-input" name="subject" maxlength="200" value="${esc(draft.subject || '')}"><label class="form-label">本文</label><textarea class="text-input" name="body" rows="7" maxlength="6000">${esc(draft.body || '')}</textarea><div class="connection-toolbar"><button class="primary-button" type="submit">送信用リンクを準備</button>${button('saveExternalDraft', '下書きを保存')}</div></form><div id="mail-handoff" aria-live="polite"></div>${handoffNote}<div class="connection-card"><h3>受信トレイを開く</h3><div class="connection-toolbar">${N.link('https://mail.google.com/', 'Gmail')}${N.link('https://outlook.live.com/mail/', 'Outlook')}</div><p>認証・受信は各サービスで行います。auraがメールを読み取ることはありません。</p></div></div>`);
    $('#external-mail').onsubmit = e => {
      e.preventDefault(); if (!e.currentTarget.reportValidity()) return;
      const v = Object.fromEntries(new FormData(e.currentTarget));
      const uri = `mailto:${encodeURIComponent(v.to)}?subject=${encodeURIComponent(v.subject)}&body=${encodeURIComponent(v.body)}`;
      const gmail = 'https://mail.google.com/mail/?' + new URLSearchParams({view:'cm', fs:'1', to:v.to, su:v.subject, body:v.body});
      $('#mail-handoff').innerHTML = `<div class="connection-card"><h3>準備できました（未送信）</h3><p>宛先：${esc(v.to)}</p><a class="primary-button" href="${esc(uri)}">メールアプリで作成</a><div class="connection-toolbar">${N.link(gmail, 'Gmailで作成')}<button class="connection-link" id="share-mail">本文を共有・コピー</button></div><p>リンクを押したときに移動先へ内容を渡します。長い本文は共有・コピーをご利用ください。</p></div>`;
      $('#share-mail').onclick = () => N.share(v.subject, v.body);
    };
    $('#external-mail').oninput = () => { $('#mail-handoff').textContent = ''; };
  };
  A.actions.saveExternalDraft = () => { const f = $('#external-mail'); if (f && A.save('externalMailDraft', Object.fromEntries(new FormData(f)))) A.toast('このブラウザに下書きを保存しました（未送信）'); };
  A.apps.messages.render = arg => {
    if (['misaki','haru','aura'].includes(arg)) return originals.messages(arg);
    A.view(A.nav('メッセージ', button('messagesDemo', 'デモ')) + `<div class="app-content"><span class="connection-badge">SMS / MESSAGING</span><h1 class="app-title">言葉を、届ける。</h1><form id="external-message"><label class="form-label">電話番号</label><input class="text-input" type="tel" name="number" required maxlength="25" placeholder="09012345678 / +819012345678"><label class="form-label">メッセージ</label><textarea class="text-input" name="body" rows="7" required maxlength="2000" placeholder="伝えたいことを書く"></textarea><button class="primary-button" type="submit" style="margin-top:15px">送信用リンクを準備</button></form><div id="message-handoff" aria-live="polite"></div>${handoffNote}<p class="connected-caption">SMSには料金がかかる場合があります。WhatsAppは国番号付きの番号が必要です。架空の連絡先や自動返信はデモにのみ残しています。</p></div>`);
    $('#external-message').onsubmit = e => {
      e.preventDefault(); const v = Object.fromEntries(new FormData(e.currentTarget)), phone = phoneNumber(v.number);
      if (!validPhone(phone)) return A.toast('電話番号を3〜15桁の数字で入力してください');
      const delimiter = /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1) ? '&' : '?';
      $('#message-handoff').innerHTML = `<div class="connection-card"><h3>作成先を選ぶ（未送信）</h3><p>宛先：${esc(phone)}</p><a class="primary-button" href="sms:${esc(phone)}${delimiter}body=${encodeURIComponent(v.body)}">SMSアプリで作成</a>${phone.startsWith('+') ? `<div class="connection-toolbar">${N.link(`https://wa.me/${phone.slice(1)}?text=${encodeURIComponent(v.body)}`, 'WhatsAppで作成')}</div>` : '<p class="connected-caption">WhatsAppには +81 などの国番号を付けてください。</p>'}<button class="connection-link" id="share-message">他のアプリで共有</button></div>`;
      $('#share-message').onclick = () => N.share('メッセージ', v.body);
    };
    $('#external-message').oninput = () => { $('#message-handoff').textContent = ''; };
  };
  A.apps.phone.render = () => {
    A.view(A.nav('電話', button('phoneDemo', 'デモ')) + `<div class="app-content"><span class="connection-badge">DEVICE CALLING</span><h1 class="app-title">声で、つながる。</h1><form id="external-phone"><label class="form-label">発信先の電話番号</label><input id="live-phone-number" class="text-input" type="tel" name="number" required maxlength="25" placeholder="電話番号を入力" autocomplete="tel"><div class="dial-keypad" style="margin-top:20px">${['1','2','3','4','5','6','7','8','9','+','0','⌫'].map(n => `<button type="button" class="dial-key" data-live-key="${n}" aria-label="${n === '⌫' ? '一文字削除' : n}">${n}</button>`).join('')}</div><button class="primary-button" type="submit" style="margin-top:18px">番号を確認</button></form><div id="phone-handoff" aria-live="polite"></div>${handoffNote}<p class="connected-caption">通話料金はご契約に従います。aura自体に電話回線・緊急通報機能はありません。緊急時は端末の標準電話アプリを直接使ってください。</p></div>`);
    const input = $('#live-phone-number');
    A.$$('[data-live-key]').forEach(el => el.onclick = () => { const key = el.dataset.liveKey; input.value = key === '⌫' ? input.value.slice(0,-1) : (input.value + key).slice(0,25); $('#phone-handoff').textContent = ''; });
    $('#external-phone').oninput = () => { $('#phone-handoff').textContent = ''; };
    $('#external-phone').onsubmit = e => { e.preventDefault(); const number = phoneNumber(input.value); if (!validPhone(number)) return A.toast('電話番号を3〜15桁の数字で入力してください'); $('#phone-handoff').innerHTML = `<div class="connection-card"><h3>${esc(number)}</h3><a class="primary-button" href="tel:${esc(number)}">端末の電話アプリを開く</a><p>まだ発信していません。電話アプリで番号を確認してください。</p></div>`; };
  };

  let musicController, musicLastSearch = 0;
  A.apps.music.render = arg => {
    if (arg === 'player') return originals.music(arg);
    A.statusTheme(false); $('#app-screen').classList.remove('music-app');
    A.view(A.nav('ミュージック', button('musicOriginals', '音源')) + `<div class="app-content"><span class="connection-badge">MUSIC DISCOVERY</span><h1 class="app-title">世界の音楽を。</h1><p class="app-subtitle">曲名・アーティストを検索して、公式プレビューを試聴。</p><form id="music-search" class="connected-search"><input class="text-input" type="search" required maxlength="100" aria-label="曲名やアーティスト" placeholder="曲名やアーティスト"><button class="primary-button" type="submit">検索</button></form><div id="music-results" aria-live="polite"><p class="connected-caption">検索語をApple iTunes Search APIに送信します。曲の提供状況・試聴時間は地域や権利者によって異なります。</p></div><div class="connection-toolbar">${N.link('https://music.apple.com/jp/', 'Apple Music')}${N.link('https://open.spotify.com/', 'Spotify')}</div><p class="connected-caption">フル再生・認証は各公式サービスで行います。試聴は画面を離れると停止。「音源」からオリジナルの環境音楽も利用できます。</p></div>`);
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
    today:['今日のまとめ','予定・タスク・習慣・集中記録を端末内で集計。'],
    focus:['集中タイマー','記録は端末内保存。ページ終了中は通知されません。'],
    habits:['習慣の記録','達成日・連続日数を端末内で管理。'],
    expenses:['家計簿・CSV出力','手入力の収支と予算。銀行や決済サービスへの接続はありません。'],
    shopping:['買い物リスト','数量・予定額・購入状態を保存。テキスト出力に対応。'],
    journal:['日記・気分の記録','端末内保存とテキスト出力。クラウド同期はありません。'],
    contacts:['連絡先・vCard出力','自分で登録した相手の電話・SMS・メールを対応アプリへ引き渡します。'],
    converter:['単位換算','長さ・重さ・温度・体積・面積・速度・データ容量を端末内で換算。'],
    reading:['読書記録','本・進捗・読書メモを端末内で保存。'],
    sketch:['スケッチ・PNG出力','描画を自動保存。画像の自動アップロードはありません。'],
    safari:['アプリ内検索・Webへ移動','Wikipediaは画面内、GoogleなどのWeb検索は別タブで利用。'],
    maps:['実地図・場所検索','OpenStreetMap / Nominatim。経路案内はGoogle マップへ引き渡します。'],
    weather:['実予報・保存キャッシュ','Open-Meteo。取得日時を表示し、取得失敗時は保存データと明示。'],
    mail:['メール作成・受信サービスへ移動','mailto / Gmail / Outlook。aura内の受信同期・送信確認は未接続。'],
    messages:['SMS・WhatsApp・共有','端末の対応アプリへ引き渡し。返信を自動取得するものではありません。'],
    phone:['端末の電話アプリへ引き渡し','telリンク。実通話は端末で行い、架空の連絡先は使用しません。'],
    music:['外部楽曲検索・試聴','Apple iTunes Search API。フル再生は公式サービスで行います。'],
    calendar:['予定書き出し・Google カレンダー','ICSをApple / Google / Outlook等へ取り込めます。双方向同期ではありません。'],
    notes:['メモの共有','編集中のメモまたは一覧をOS共有・コピー・テキスト保存で持ち出せます。'],
    reminders:['リスト共有・タスク書き出し','OS共有とiCalendar VTODO形式。取り込み対応は利用先によります。'],
    files:['URLからテキスト読込・共有','HTTPSかつCORS対応のテキストのみ。自動アップロードはありません。'],
    photos:['実写真・OS共有','写真を開いて共有できます。端末への保存にも対応。クラウド自動同期はありません。'],
    camera:['実カメラ・写真への保存','許可後に撮影。共有は写真アプリから。自動アップロードはありません。'],
    recorder:['実録音・音声共有','音声の共有ボタンを利用。録音はアプリ終了時に破棄されます。'],
    calculator:['実為替レート換算','Frankfurterの日次基準レート。リアルタイム取引レートではありません。'],
    clock:['実時刻・端末通知','許可した場合にブラウザ通知。ページ終了・OSスリープ時の発火保証はありません。'],
    health:['手入力データ書き出し','健康アカウント・センサーは未接続。表示にはサンプルが含まれます。'],
    wallet:['デモのみ・実決済未接続','決済基盤・契約がないため、架空残高を実際のお金として扱いません。'],
    games:['端末内で実動作','外部接続を必要としない8ゲーム。スコアは端末内保存。'],
    settings:['接続状況・権限・プライバシー','Wi-FiなどのOS設定はシミュレーション。実通信状態とは別です。']
  };
  const nav = A.nav;
  const localApps = new Set(['today','focus','habits','expenses','shopping','journal','contacts','converter','reading','sketch']);
  A.nav = (title, right = '', ...args) => nav(title, right + (A.current && !localApps.has(A.current) ? button('appConnections','連携') : ''), ...args);
  A.actions.appConnections = () => {
    const id = A.current, [title, detail] = capabilities[id] || capabilities.settings;
    const tools = {calendar:button('calendarExchange','予定を外部で使う'), notes:button('shareNotes','メモを共有'), reminders:button('shareReminders','リストを共有') + button('exportReminders','タスクを書き出す'), files:button('fileURLImport','URLから読む') + button('shareFile','開いているファイルを共有'), photos:button('photoShare','開いている写真を共有'), camera:'<button class="connection-link" data-app="photos">写真を開く</button>', calculator:button('currencyOpen','為替換算を開く'), clock:button('clockNotifyPermission','端末通知を有効にする'), health:button('healthExport','記録をJSONで書き出す')};
    A.overlay(`${A.overlayTitle('外部との連携')}<div class="connected-overlay"><h3>${esc(title)}</h3><p class="connected-caption">${esc(detail)}</p><div class="connection-toolbar">${tools[id] || ''}</div><p class="connected-caption">共有で選んだデータ以外はアップロードしません。公開APIに渡す検索語・座標の送信先は各画面に記載しています。</p>${button('connectionCenter','すべての接続状況')}</div>`);
  };
  A.actions.connectionCenter = () => A.overlay(`${A.overlayTitle('接続とプライバシー')}<div class="connected-overlay"><div id="network-status" class="connected-status ${navigator.onLine ? '' : 'offline'}">${navigator.onLine ? '端末はオンライン（各サービスの疎通は未確認）' : '端末はオフラインです'}</div><p class="connected-caption">無料の公開APIを使用します。サービスの利用制限・CORSなどで接続できない場合があります。個人データのサーバー同期や外部アカウントの認証情報の保存は行いません。</p>${Object.entries(capabilities).map(([id,[title,detail]]) => `<button class="list-row" data-app="${id}"><span class="row-main"><strong>${esc(A.apps[id].name)} · ${esc(title)}</strong><small>${esc(detail)}</small></span></button>`).join('')}${button('forgetLocation','保存した位置情報と天気を消去')}</div>`);
  A.actions.forgetLocation = () => A.confirm('位置情報と天気を消去','保存した都市・天気のお気に入り・地図の保存場所・現在地の座標・天気キャッシュを削除し、ページを再読み込みします。',() => { try { ['weatherLocation','weatherLive','weatherCity','weatherFavorites','mapSavedPlaces'].forEach(k => localStorage.removeItem('aura.' + k)); location.reload(); } catch { A.toast('削除できませんでした'); } });
  const updateNetwork = () => { const el = $('#network-status'); if (el) { el.textContent = navigator.onLine ? '端末はオンライン（各サービスの疎通は未確認）' : '端末はオフラインです'; el.classList.toggle('offline',!navigator.onLine); } };
  window.addEventListener('online',updateNetwork); window.addEventListener('offline',updateNetwork);
  A.actions.shareNotes = () => { const title = $('#note-title'), body = $('#note-body'); if (title && body) N.share(title.value || 'メモ',body.value); else N.share('auraのメモ',A.searchableNotes().map(n => `${n.title}\n${n.body}`).join('\n\n---\n\n')); };
  A.actions.shareReminders = () => N.share('リマインダー',A.searchableReminders().map(r => `[${r.done ? 'x' : ' '}] ${r.text}`).join('\n'));

  const icsEscape = value => String(value ?? '').replace(/\\/g,'\\\\').replace(/\r?\n/g,'\\n').replace(/;/g,'\\;').replace(/,/g,'\\,');
  // RFC 5545 folding counts UTF-8 bytes to preserve Japanese exports.
  function icsFold(line) { let out = '', bytes = 0; for (const c of line) { const n = new TextEncoder().encode(c).length; if (bytes + n > 75) { out += '\r\n '; bytes = 1; } out += c; bytes += n; } return out; }
  const dateICS = d => d.toISOString().replace(/[-:]/g,'').replace(/\.\d{3}Z$/,'Z');
  const icsDownload = (lines,name) => A.download(new Blob([['BEGIN:VCALENDAR','VERSION:2.0','PRODID:-//aura//Connected 3//JA',...lines,'END:VCALENDAR'].map(icsFold).join('\r\n') + '\r\n'],{type:'text/calendar;charset=utf-8'}),name);
  N.calendarEvent = event => { const start = new Date(`${event.date}T${event.time || '00:00'}:00`); if (!Number.isFinite(start.getTime())) return null; const end = event.endTime ? new Date(`${event.date}T${event.endTime}:00`) : new Date(start.getTime()+3600000); if(!Number.isFinite(end.getTime()))return null; if(end<=start)end.setDate(end.getDate()+1);return {start,end,google:'https://calendar.google.com/calendar/render?' + new URLSearchParams({action:'TEMPLATE',text:event.title || '予定',dates:`${dateICS(start)}/${dateICS(end)}`,location:event.place || '',details:'auraから作成。保存前に日時を確認してください。'})}; };
  A.actions.calendarExchange = () => A.overlay(`${A.overlayTitle('予定を外部で使う')}<div class="connected-overlay"><p class="connected-caption">端末のタイムゾーン（${esc(Intl.DateTimeFormat().resolvedOptions().timeZone)}）を使用。終了未指定は1時間後。変更の同期はありません。</p>${button('calendarICS','全予定をICSで書き出す')}${(A.allEvents?.() || []).map(event => { const info = N.calendarEvent(event); return info ? `<div class="connection-divider">${esc(event.date)} ${esc(event.time)}${event.endTime?'–'+esc(event.endTime):''} · ${esc(event.title)}</div>${N.link(info.google,'Google カレンダーで作成')}` : ''; }).join('') || '<p>予定がありません。</p>'}</div>`);
  A.actions.calendarICS = () => { const lines = (A.allEvents?.() || []).flatMap(e => { const info = N.calendarEvent(e); return info ? ['BEGIN:VEVENT',`UID:${icsEscape(e.id)}@aura.local`,`DTSTAMP:${dateICS(new Date())}`,`DTSTART:${dateICS(info.start)}`,`DTEND:${dateICS(info.end)}`,`SUMMARY:${icsEscape(e.title)}`,`LOCATION:${icsEscape(e.place)}`,'END:VEVENT'] : []; }); if (!lines.length) return A.toast('書き出せる予定がありません'); icsDownload(lines,'aura-calendar.ics'); };
  A.actions.exportReminders = () => icsDownload(A.searchableReminders().flatMap(r => ['BEGIN:VTODO',`UID:${icsEscape(r.id)}@aura.local`,`DTSTAMP:${dateICS(new Date())}`,`SUMMARY:${icsEscape(r.text)}`,`STATUS:${r.done ? 'COMPLETED' : 'NEEDS-ACTION'}`,`PRIORITY:${r.priority ? '1' : '0'}`,...(/^\d{4}-\d{2}-\d{2}$/.test(r.due || '') ? [`DUE;VALUE=DATE:${r.due.replace(/-/g,'')}`] : []),'END:VTODO']),'aura-reminders.ics');
  A.actions.shareFile = () => { const file = A.currentTextFile?.(); if (!file) return A.toast('先に共有するファイルを開いてください'); N.share(file.name,file.content); };
  A.actions.fileURLImport = () => {
    A.closeOverlay(); A.view(A.nav('URLからテキストを読む','','filesHome','戻る') + `<div class="app-content"><p class="app-subtitle">HTTPS / CORS対応の公開テキストを取り込みます。</p><form id="remote-file"><label class="form-label">URL</label><input name="url" class="text-input" type="url" required placeholder="https://example.com/data.txt" maxlength="2000"><label class="form-label">保存する名前</label><input name="name" class="text-input" required value="download.txt" maxlength="80"><button class="primary-button" type="submit" style="margin-top:16px">読み込んで保存</button></form><div id="remote-file-status" aria-live="polite"></div><p class="connected-caption">上限100KB。TXT / MD / JSON / CSV。認証付きURLやHTMLは非対応。取得したテキストはこのブラウザにのみ保存します。</p></div>`);
    const lifecycle = new AbortController(); A.cleanups.push(() => lifecycle.abort());
    $('#remote-file').onsubmit = async e => {
      e.preventDefault(); const form = e.currentTarget, v = Object.fromEntries(new FormData(form)), root = $('#remote-file-status');
      const url = N.safeURL(v.url); if (!url?.startsWith('https://') || !/\.(txt|md|json|csv)$/i.test(v.name)) return A.toast('HTTPS URLと対応する拡張子の名前を入力してください');
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
  A.actions.healthExport = () => A.download(new Blob([JSON.stringify({source:'aura manual/sample data; not sensor measurements',exportedAt:new Date().toISOString(),values:A.healthData?.() || {}},null,2)],{type:'application/json'}),'aura-health.json');
  A.actions.clockNotifyPermission = async () => { if (!('Notification' in window)) return A.toast('この環境ではブラウザ通知は利用できません'); try { const permission = await Notification.requestPermission(); A.toast(permission === 'granted' ? '通知を許可しました。稼働中のページで使用します。' : '通知は未許可です。画面内でお知らせします。'); } catch { A.toast('この環境では通知権限を利用できません'); } };
  N.clockNotice = title => { if ('Notification' in window && Notification.permission === 'granted') { try { const notice = new Notification('aura 時計',{body:title,tag:'aura-clock'}); setTimeout(() => notice.close(),15000); } catch { /* In-app notification remains available on mobile. */ } } };

  let currencyController;
  A.actions.currencyOpen = () => {
    A.closeOverlay(); A.statusTheme(false); $('#app-screen').classList.remove('calc-app');
    const options = selected => ['JPY','USD','EUR','GBP','AUD','CAD','CHF','CNY','KRW'].map(c => `<option ${c === selected ? 'selected' : ''}>${c}</option>`).join('');
    A.view(A.nav('為替換算','','calculatorHome','戻る') + `<div class="app-content"><span class="connection-badge">DAILY EXCHANGE RATES</span><h1 class="app-title">通貨を、換算。</h1><form id="currency-form"><label class="form-label">金額</label><input class="text-input" name="amount" type="number" min="0" max="1000000000000" step="any" required value="1"><label class="form-label">元の通貨</label><select class="text-input" name="base">${options('USD')}</select><label class="form-label">換算先</label><select class="text-input" name="quote">${options('JPY')}</select><button class="primary-button" type="submit" style="margin-top:20px">最新の公表レートで換算</button></form><div id="currency-result" aria-live="polite"></div><p class="connected-caption">出典：${N.link('https://frankfurter.dev/','Frankfurter')}。日次の基準レート。休日は直近公表日。手数料を含まず、リアルタイム取引レートではありません。</p></div>`);
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
