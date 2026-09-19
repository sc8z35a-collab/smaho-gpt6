'use strict';
// Live public services. No secret keys, proxy bypasses, or fabricated success states.
(() => {
  const A = window.Aura, $ = A.$, esc = A.escape;
  const N = A.network = {};
  N.safeURL = value => {
    try {
      const url = new URL(value);
      return ['http:', 'https:'].includes(url.protocol) && !url.username && !url.password ? url.href : null;
    } catch { return null; }
  };
  N.link = (url, label, cls = 'connection-link') => {
    const safe = N.safeURL(url);
    return safe ? `<a class="${cls}" href="${esc(safe)}" target="_blank" rel="noopener noreferrer">${esc(label)} ↗</a>` : '';
  };
  N.errorText = error => error.name === 'AbortError' ? '通信を中断しました。' : error.message || '接続できませんでした。';
  N.request = async (url, {signal, timeout = 15000} = {}) => {
    if (!navigator.onLine) throw new Error('オフラインです。ネットワーク接続を確認して再試行してください。');
    const controller = new AbortController();
    const abort = () => controller.abort();
    if (signal?.aborted) controller.abort();
    signal?.addEventListener('abort', abort, {once: true});
    let timedOut = false;
    const timer = setTimeout(() => { timedOut = true; controller.abort(); }, timeout);
    try {
      const response = await fetch(url, {signal: controller.signal, credentials: 'omit', referrerPolicy: 'strict-origin-when-cross-origin'});
      if (!response.ok) throw new Error(response.status === 429 ? 'アクセスが集中しています。少し待ってから再試行してください。' : `外部サービスが応答できませんでした（HTTP ${response.status}）。`);
      const data = await response.json();
      if (data.error) throw new Error('外部サービスからエラーが返されました。検索条件を確認してください。');
      return data;
    } catch (error) {
      if (timedOut) throw new Error('通信がタイムアウトしました。再試行してください。');
      if (error.name === 'TypeError') throw new Error('接続できませんでした。通信状態、サービスの稼働状況、ブラウザの接続制限を確認してください。');
      throw error;
    } finally {
      clearTimeout(timer);
      signal?.removeEventListener('abort', abort);
    }
  };
  N.location = () => new Promise((resolve, reject) => {
    if (!navigator.geolocation) return reject(new Error('このブラウザは位置情報に対応していません。場所を検索してください。'));
    navigator.geolocation.getCurrentPosition(position => resolve({latitude: position.coords.latitude, longitude: position.coords.longitude, name: '現在地'}), error => reject(new Error(error.code === 1 ? '位置情報が許可されていません。ブラウザの権限設定を確認するか、場所を検索してください。' : '現在地を取得できません。場所を検索してください。')), {timeout: 10000, maximumAge: 60000, enableHighAccuracy: false});
  });
  N.share = async (title, text, url) => {
    try {
      if (navigator.share) await navigator.share({title, text, ...(N.safeURL(url) ? {url} : {})});
      else if (navigator.clipboard) { await navigator.clipboard.writeText([title, text, url].filter(Boolean).join('\n')); A.toast('共有機能がないため、内容をコピーしました'); }
      else { A.download(new Blob([[title, text, url].filter(Boolean).join('\n')], {type: 'text/plain;charset=utf-8'}), 'aura-share.txt'); A.toast('共有機能がないため、テキストを保存します'); }
    } catch (error) { if (error.name !== 'AbortError') A.toast('共有できませんでした。権限を確認してください。'); }
  };
  const stateBox = (message, retry = '') => `<div class="connection-state" role="status"><p>${esc(message)}</p>${retry ? `<button class="secondary-button" data-action="${retry}">再試行</button>` : ''}</div>`;
  const button = (action, label) => `<button class="connection-link" data-action="${action}">${esc(label)}</button>`;
  const submitSearch = (id, placeholder, value = '') => `<form id="${id}" class="connected-search"><input class="text-input" type="search" required maxlength="200" aria-label="${esc(placeholder)}" placeholder="${esc(placeholder)}" value="${esc(value)}"><button class="primary-button" type="submit">検索</button></form>`;
  const stamp = time => new Date(time).toLocaleString('ja-JP', {month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit'});
  const number = value => typeof value === 'number' && Number.isFinite(value) ? Math.round(value) : '—';

  // Weather: Open-Meteo, selected location, timestamped 15-minute cache.
  const presets = [
    {name: '東京', latitude: 35.6762, longitude: 139.6503},
    {name: '京都', latitude: 35.0116, longitude: 135.7681},
    {name: '札幌', latitude: 43.0618, longitude: 141.3545},
    {name: '那覇', latitude: 26.2124, longitude: 127.6809}
  ];
  const validPlace = p => p && typeof p.name === 'string' && Number.isFinite(p.latitude) && Math.abs(p.latitude) <= 90 && Number.isFinite(p.longitude) && Math.abs(p.longitude) <= 180;
  let weatherPlace = A.load('weatherLocation', presets[A.load('weatherCity', 0)] || presets[0]);
  if (!validPlace(weatherPlace)) weatherPlace = presets[0];
  let weatherController, cityController, weatherError = '', weatherBusy = false;
  let weatherCache = A.load('weatherLive', null);
  const validWeather = d => d?.current && typeof d.current.time === 'string' && Number.isFinite(d.current.temperature_2m) && Array.isArray(d.daily?.time) && Array.isArray(d.daily?.temperature_2m_max) && Array.isArray(d.hourly?.time);
  if (!weatherCache || !validWeather(weatherCache.data) || !validPlace(weatherCache.place) || !Number.isFinite(weatherCache.savedAt)) weatherCache = null;
  const placeKey = p => `${p.latitude.toFixed(3)},${p.longitude.toFixed(3)}`;
  const currentWeather = () => weatherCache && placeKey(weatherCache.place) === placeKey(weatherPlace) ? weatherCache : null;
  const weatherLabel = code => !Number.isFinite(code) ? '不明' : code === 0 ? '快晴' : code <= 2 ? '晴れ時々くもり' : code === 3 ? 'くもり' : code <= 48 ? '霧' : code <= 57 ? '霧雨' : code <= 67 ? '雨' : code <= 77 ? '雪' : code <= 82 ? 'にわか雨' : code <= 86 ? 'にわか雪' : code >= 95 ? '雷雨' : '不明';
  A.weatherSnapshot = () => {
    const cache = currentWeather();
    if (!cache) return {name: weatherPlace.name, temp: '—', high: '—', low: '—', condition: '', desc: weatherBusy ? '取得中' : '天気を開いて取得', source: weatherError ? '取得できません' : '未取得'};
    const d = cache.data;
    return {name: weatherPlace.name, temp: number(d.current.temperature_2m), high: number(d.daily.temperature_2m_max[0]), low: number(d.daily.temperature_2m_min?.[0]), desc: weatherLabel(d.current.weather_code), condition: '', source: `${weatherError || Date.now() - cache.savedAt > 900000 ? '保存データ' : '予報データ'} ${stamp(cache.savedAt)}更新`};
  };
  function weatherPanel() {
    const root = $('#live-weather');
    if (!root) return;
    const cache = currentWeather(), snapshot = A.weatherSnapshot();
    root.innerHTML = `<section class="weather-summary"><span class="connection-badge">OPEN-METEO</span><h2>${esc(weatherPlace.name)}</h2><div class="big-temperature">${snapshot.temp}°</div><p>${esc(snapshot.desc)}</p><small>最高 ${snapshot.high}°　最低 ${snapshot.low}°</small></section>${weatherBusy ? stateBox('天気を取得しています…') : ''}${weatherError ? stateBox(weatherError + (cache ? ' 最後に取得したデータを表示しています。' : ''), 'weatherRefresh') : ''}`;
    if (cache) {
      const d = cache.data, h = d.hourly, daily = d.daily;
      // Both timestamps are in the provider's location timezone, not the device timezone.
      const start = Math.max(0, h.time.findIndex(t => t >= d.current.time.slice(0, 13) + ':00'));
      root.innerHTML += `<p class="connected-caption">取得 ${stamp(cache.savedAt)} · 対象時刻 ${esc(d.current.time.replace('T', ' '))}<br>${esc(d.timezone)} · モデルに基づく予報（観測実況ではありません）</p><div class="weather-card"><h3>時間別予報 · 現地時間</h3><div class="hourly-forecast">${h.time.slice(start, start + 24).map((t, i) => `<div><span>${esc(t.slice(11, 16))}</span><strong>${number(h.temperature_2m?.[start + i])}°</strong><small>${esc(weatherLabel(h.weather_code?.[start + i]))}</small><small>降水 ${number(h.precipitation_probability?.[start + i])}%</small></div>`).join('')}</div></div><div class="weather-card"><h3>7日間の天気予報</h3>${daily.time.map((t, i) => `<div class="live-forecast-row"><span>${esc(t.slice(5).replace('-', '/'))}</span><span>${esc(weatherLabel(daily.weather_code?.[i]))}</span><span>${number(daily.temperature_2m_min?.[i])}° / ${number(daily.temperature_2m_max?.[i])}°</span></div>`).join('')}</div><div class="weather-stats">${[['湿度', `${number(d.current.relative_humidity_2m)}%`], ['風速', `${d.current.wind_speed_10m ?? '—'} m/s`], ['UV指数（今日の最大）', daily.uv_index_max?.[0] ?? '—'], ['日の入り（現地）', daily.sunset?.[0]?.slice(11, 16) || '—']].map(([label, value]) => `<div class="weather-card weather-stat"><h3>${label}</h3><strong>${esc(value)}</strong></div>`).join('')}</div>`;
    }
    root.innerHTML += `<p class="connected-caption">${N.link('https://open-meteo.com/', '天気データ：Open-Meteo（CC BY 4.0）')}<br>位置情報はボタンを押した場合だけ取得し、予報の取得先に座標を送信します。防災情報は ${N.link('https://www.jma.go.jp/bosai/', '気象庁')} を確認してください。</p>`;
    A.updateWidgets();
  }
  async function refreshWeather(force = false) {
    weatherController?.abort();
    const cached = currentWeather();
    if (!force && cached && Date.now() - cached.savedAt < 900000) { weatherBusy = false; weatherError = ''; weatherPanel(); return; }
    const controller = weatherController = new AbortController(), place = {...weatherPlace};
    weatherBusy = true; weatherError = ''; weatherPanel();
    const params = new URLSearchParams({latitude: place.latitude, longitude: place.longitude, current: 'temperature_2m,relative_humidity_2m,weather_code,wind_speed_10m', hourly: 'temperature_2m,weather_code,precipitation_probability', daily: 'weather_code,temperature_2m_max,temperature_2m_min,sunrise,sunset,uv_index_max', timezone: 'auto', wind_speed_unit: 'ms', forecast_days: '7'});
    try {
      const data = await N.request(`https://api.open-meteo.com/v1/forecast?${params}`, {signal: controller.signal});
      if (controller !== weatherController || controller.signal.aborted) return;
      if (!validWeather(data)) throw new Error('予報データの形式を確認できませんでした。');
      weatherCache = {place, data, savedAt: Date.now()}; A.save('weatherLive', weatherCache);
    } catch (error) { if (controller === weatherController && !controller.signal.aborted) weatherError = N.errorText(error); }
    finally { if (controller === weatherController) { weatherBusy = false; weatherPanel(); A.updateWidgets(); } }
  }
  function weather() {
    A.statusTheme(true); $('#app-screen').classList.add('weather-app');
    A.view(A.nav('天気', button('weatherCities', '都市')) + `<div class="app-content"><div class="connection-toolbar">${button('weatherLocate', '現在地を使う')}${button('weatherRefresh', '更新')}</div><div id="live-weather" aria-live="polite"></div></div>`);
    weatherPanel(); refreshWeather();
    A.cleanups.push(() => { weatherController?.abort(); cityController?.abort(); weatherBusy = false; });
  }
  function selectWeather(place) { if (!validPlace(place)) return; weatherPlace = place; A.save('weatherLocation', place); weatherError = ''; A.closeOverlay(); weather(); }
  A.apps.weather.render = weather;
  A.actions.weatherRefresh = () => refreshWeather(true);
  A.actions.weatherSelect = el => selectWeather(presets[Number(el.dataset.value)]);
  A.actions.weatherLocate = async () => {
    const root = $('#live-weather'); A.toast('現在地の許可を確認しています…');
    try { const place = await N.location(); if (A.current === 'weather' && root?.isConnected) selectWeather(place); } catch (e) { if (A.current === 'weather' && root?.isConnected) A.toast(N.errorText(e)); }
  };
  A.actions.weatherCities = () => {
    A.overlay(`${A.overlayTitle('都市を探す')}<div class="connected-overlay">${submitSearch('city-search', '都市名（東京・Parisなど）')}<p class="connected-caption">検索語をOpen-Meteoの都市検索に送信します。</p><div id="city-results" aria-live="polite"></div><h3>よく使う都市</h3>${presets.map((p, i) => `<button class="list-row" data-action="weatherSelect" data-value="${i}">${esc(p.name)}</button>`).join('')}</div>`);
    $('#city-search').onsubmit = async e => {
      e.preventDefault(); const root = $('#city-results'), q = e.currentTarget.querySelector('input').value.trim(); if (!q) return;
      cityController?.abort(); const controller = cityController = new AbortController(); root.innerHTML = stateBox('都市を検索しています…');
      try {
        const data = await N.request(`https://geocoding-api.open-meteo.com/v1/search?${new URLSearchParams({name: q, count: '8', language: 'ja', format: 'json'})}`, {signal: controller.signal});
        if (!root.isConnected || controller.signal.aborted) return;
        const results = (data.results || []).filter(validPlace);
        root.innerHTML = results.length ? results.map((p, i) => `<button class="list-row" data-city-index="${i}"><span class="row-main"><strong>${esc(p.name)}</strong><small>${esc([p.admin1, p.country].filter(Boolean).join(' · '))}</small></span></button>`).join('') : stateBox('該当する都市がありません。別の名前で検索してください。');
        root.querySelectorAll('[data-city-index]').forEach(el => el.onclick = () => { const p = results[Number(el.dataset.cityIndex)]; selectWeather({name: p.name, latitude: p.latitude, longitude: p.longitude}); });
      } catch (e) { if (root.isConnected && !controller.signal.aborted) root.innerHTML = stateBox(N.errorText(e)); }
    };
  };

  // Real map tiles and submit-only geocoding; no autocomplete / bulk requests to Nominatim.
  let leafletPromise, mapInstance, mapController, mapSearchAt = 0;
  let mapPosition = [35.6812, 139.7671], mapLevel = 13;
  const geoCache = new Map();
  function loadLeaflet() {
    if (window.L) return Promise.resolve(window.L);
    if (leafletPromise) return leafletPromise;
    leafletPromise = new Promise((resolve, reject) => {
      if (!document.querySelector('#leaflet-style')) { const style = document.createElement('link'); style.id = 'leaflet-style'; style.rel = 'stylesheet'; style.href = 'css/leaflet.css'; document.head.append(style); }
      const script = document.createElement('script'); script.src = 'js/leaflet.js';
      const timer = setTimeout(() => { script.remove(); leafletPromise = null; reject(new Error('地図ライブラリを読み込めませんでした。再試行してください。')); }, 10000);
      script.onload = () => { clearTimeout(timer); resolve(window.L); };
      script.onerror = () => { clearTimeout(timer); script.remove(); leafletPromise = null; reject(new Error('地図ライブラリを読み込めませんでした。')); };
      document.head.append(script);
    });
    return leafletPromise;
  }
  async function maps() {
    A.statusTheme(false); $('#app-screen').classList.add('connected-maps');
    A.view(A.nav('マップ', button('mapLocate', '現在地')) + `<div class="connected-map-tools">${submitSearch('live-map-search', '地名・住所・施設名')}<div class="connection-toolbar">${button('mapRetry', '再読み込み')}${N.link('https://www.google.com/maps', 'Google マップ')}</div></div><div id="live-map" aria-label="OpenStreetMap 地図"></div><div id="map-results" class="connected-map-results" aria-live="polite">${stateBox('実地図を読み込んでいます…')}</div>`);
    const canvas = $('#live-map'), results = $('#map-results');
    let map, marker, userMarker, resize;
    const controller = mapController = new AbortController();
    A.cleanups.push(() => { controller.abort(); resize?.disconnect(); if (map) { const center = map.getCenter(); mapPosition = [center.lat, center.lng]; mapLevel = map.getZoom(); map.remove(); } if (mapInstance === map) mapInstance = null; });
    const showPlace = p => {
      if (!map || !canvas.isConnected) return;
      const lat = Number(p.lat), lon = Number(p.lon); if (!Number.isFinite(lat) || !Number.isFinite(lon)) return;
      marker?.remove(); marker = window.L.circleMarker([lat, lon], {radius: 10, color: '#fff', weight: 3, fillColor: '#477cc6', fillOpacity: 1}).addTo(map);
      marker.bindPopup(document.createTextNode(p.display_name)).openPopup(); map.setView([lat, lon], 16);
      results.innerHTML = `<strong>${esc(p.display_name)}</strong><p>${lat.toFixed(5)}, ${lon.toFixed(5)}</p><div class="connection-toolbar">${N.link(`https://www.google.com/maps/dir/?api=1&destination=${lat},${lon}`, 'ここへの経路案内')}${N.link(`https://www.openstreetmap.org/?mlat=${lat}&mlon=${lon}#map=16/${lat}/${lon}`, '地図を開く')}<button class="connection-link" id="share-place">場所を共有</button></div><p class="connected-caption">経路はGoogle マップで計算します。アプリ内に架空のルートは表示しません。</p>`;
      $('#share-place').onclick = () => N.share('場所を共有', p.display_name, `https://www.openstreetmap.org/?mlat=${lat}&mlon=${lon}#map=16/${lat}/${lon}`);
    };
    $('#live-map-search').onsubmit = async e => {
      e.preventDefault(); const q = e.currentTarget.querySelector('input').value.trim(); if (!q) return;
      if (!map) { results.innerHTML = stateBox('地図を読み込んでから検索してください。', 'mapRetry'); return; }
      if (!geoCache.has(q) && Date.now() - mapSearchAt < 1200) { A.toast('検索は少し間隔をあけて実行してください'); return; }
      if (e.currentTarget.dataset.busy === 'true') return;
      const form = e.currentTarget; form.dataset.busy = 'true'; form.querySelector('button').disabled = true;
      results.innerHTML = stateBox('場所を検索しています…');
      try {
        let data = geoCache.get(q);
        if (!data) {
          mapSearchAt = Date.now();
          data = await N.request(`https://nominatim.openstreetmap.org/search?${new URLSearchParams({q, format: 'jsonv2', limit: '6', 'accept-language': 'ja'})}`, {signal: controller.signal});
          if (!Array.isArray(data)) throw new Error('検索結果の形式を確認できませんでした。');
          data = data.filter(p => Number.isFinite(Number(p.lat)) && Number.isFinite(Number(p.lon)) && typeof p.display_name === 'string');
          if (geoCache.size >= 30) geoCache.delete(geoCache.keys().next().value); geoCache.set(q, data);
        }
        if (!results.isConnected || controller.signal.aborted) return;
        results.innerHTML = data.length ? `<small>検索結果 · Nominatim / OpenStreetMap</small>${data.map((p, i) => `<button class="list-row" data-map-result="${i}"><span class="row-main"><strong>${esc(p.name || p.display_name.split(',')[0])}</strong><small>${esc(p.display_name)}</small></span><span>›</span></button>`).join('')}` : stateBox('場所が見つかりません。都市名や住所を加えて検索してください。');
        results.querySelectorAll('[data-map-result]').forEach(el => el.onclick = () => showPlace(data[Number(el.dataset.mapResult)]));
      } catch (error) { if (results.isConnected && !controller.signal.aborted) results.innerHTML = stateBox(N.errorText(error)) + N.link(`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(q)}`, 'Google マップで検索'); }
      finally { form.dataset.busy = 'false'; form.querySelector('button').disabled = false; }
    };
    A.actions.mapLocate = async () => {
      A.toast('現在地を取得しています…');
      try {
        const p = await N.location(); if (A.current !== 'maps' || controller.signal.aborted || !canvas.isConnected || !map) return;
        userMarker?.remove(); userMarker = window.L.circleMarker([p.latitude, p.longitude], {radius: 8, color: '#fff', fillColor: '#337def', fillOpacity: 1}).addTo(map).bindPopup('現在地');
        map.setView([p.latitude, p.longitude], 16); results.innerHTML = stateBox('現在地を表示しました。位置には誤差があります。');
      } catch (error) { if (A.current === 'maps' && !controller.signal.aborted && results.isConnected) results.innerHTML = stateBox(N.errorText(error)); }
    };
    try {
      const L = await loadLeaflet(); if (!canvas.isConnected || controller.signal.aborted) return;
      map = mapInstance = L.map(canvas, {zoomControl: true}).setView(mapPosition, mapLevel);
      const tiles = L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {maxZoom: 19, attribution: '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener noreferrer">OpenStreetMap</a> contributors'}).addTo(map);
      let failed = false;
      tiles.on('tileerror', () => { if (!failed && results.isConnected) { failed = true; results.innerHTML = stateBox('地図タイルを取得できません。通信を確認して再読み込みしてください。', 'mapRetry') + N.link('https://www.openstreetmap.org/', 'OpenStreetMapを開く'); } });
      results.innerHTML = `<p>地図をドラッグ・ピンチして探索。地名や住所を入力すると実在する場所を検索できます。</p><p class="connected-caption">検索語はNominatimに、表示範囲はOpenStreetMapに送信されます。現在地は許可した場合のみ使用します。</p>`;
      resize = new ResizeObserver(() => map.invalidateSize()); resize.observe(canvas); map.invalidateSize();
    } catch (error) { if (results.isConnected) results.innerHTML = stateBox(N.errorText(error), 'mapRetry'); }
  }
  A.apps.maps.render = maps;
  A.actions.mapRetry = () => A.open('maps');
  A.actions.mapLocate = () => A.toast('地図の読み込みを待ってから操作してください');

  // In-app Wikipedia search/reader, real web-engine handoff and safe URL navigation.
  const wikiBase = 'https://ja.wikipedia.org/w/api.php?';
  let browserController, browserHistory = [{type: 'home'}], browserIndex = 0;
  let webBookmarks = A.load('webBookmarks', []);
  if (!Array.isArray(webBookmarks)) webBookmarks = [];
  webBookmarks = webBookmarks.filter(b => b && N.safeURL(b.url) && typeof b.title === 'string').slice(0, 100);
  function browserNavigate(state, push = true) {
    browserController?.abort();
    if (push) { browserHistory = browserHistory.slice(0, browserIndex + 1); browserHistory.push(state); if (browserHistory.length > 50) browserHistory.shift(); browserIndex = browserHistory.length - 1; }
    const controller = browserController = new AbortController();
    A.view(A.nav('ブラウザ', button('webSaved', '保存済み')) + `<div class="connected-browser-bar"><form id="web-form" class="connected-search"><input id="browser-url" class="text-input" aria-label="URLまたは検索語" placeholder="検索する、またはURLを入力" maxlength="2000" value="${esc(state.query || state.url || '')}"><button class="primary-button" type="submit">開く</button></form><div class="web-controls"><button data-action="webBack" ${browserIndex === 0 ? 'disabled' : ''} aria-label="戻る">‹</button><button data-action="webForward" ${browserIndex === browserHistory.length - 1 ? 'disabled' : ''} aria-label="進む">›</button><button data-action="webHome">ホーム</button><button data-action="webReload">再読込</button><select id="web-engine" aria-label="検索先"><option value="wiki">Wikipedia（アプリ内）</option><option value="google">Google（別タブ）</option><option value="bing">Bing（別タブ）</option><option value="duck">DuckDuckGo（別タブ）</option></select></div></div><div class="app-content connected-browser" id="web-content" aria-live="polite"></div>`);
    const engine = A.load('webEngine', 'wiki'); $('#web-engine').value = ['wiki', 'google', 'bing', 'duck'].includes(engine) ? engine : 'wiki';
    $('#web-engine').onchange = e => A.save('webEngine', e.target.value);
    $('#web-form').onsubmit = e => {
      e.preventDefault(); const input = $('#browser-url').value.trim(); if (!input) return;
      let url = input;
      if (/^[\w.-]+\.[a-z]{2,}(?:[/:?#].*)?$/i.test(input)) url = 'https://' + input;
      if (/^[a-z][\w+.-]*:/i.test(url)) { const safe = N.safeURL(url); if (!safe) return A.toast('http / httpsのURLのみ開けます。認証情報付きURLは使えません。'); browserNavigate({type: 'url', url: safe}); }
      else if ($('#web-engine').value === 'wiki') browserNavigate({type: 'search', query: input});
      else {
        const urls = {google: 'https://www.google.com/search?q=', bing: 'https://www.bing.com/search?q=', duck: 'https://duckduckgo.com/?q='};
        const target = urls[$('#web-engine').value] + encodeURIComponent(input);
        // The native anchor click occurs synchronously with the user's submit gesture.
        const link = document.createElement('a'); link.href = target; link.target = '_blank'; link.rel = 'noopener noreferrer'; link.click();
        browserNavigate({type: 'url', url: target, query: input});
      }
    };
    const root = $('#web-content');
    if (state.type === 'home') {
      root.innerHTML = `<span class="connection-badge">CONNECTED BROWSER</span><h1 class="app-title">世界と、つながる。</h1><p class="app-subtitle">調べる。読む。新しい場所へ。</p><div class="connection-card"><h3>検索先を選んで、検索。</h3><p>Wikipediaの検索結果・記事はこの画面で表示。一般のWeb検索はGoogle・Bing・DuckDuckGoを選ぶと実際の検索ページを別タブで開きます。</p></div><div class="connection-grid">${N.link('https://www.google.com/', 'Google')}${N.link('https://www.youtube.com/', 'YouTube')}${N.link('https://www3.nhk.or.jp/news/', 'NHK NEWS')}${N.link('https://ja.wikipedia.org/', 'Wikipedia')}</div><h3>このセッションの履歴</h3>${browserHistory.filter(s => s.type !== 'home').slice(-10).reverse().map((s, i) => `<button class="list-row" data-history-item="${i}">${esc(s.title || s.query || s.url)}</button>`).join('') || '<p class="connected-caption">まだ履歴はありません。</p>'}${button('webClearHistory', '履歴を消去')}<p class="connected-caption">検索語・URLは選択した外部サービスに送信されます。履歴はこのセッションのみ、保存済みページはこのブラウザ内に保持します。</p>`;
      const history = browserHistory.filter(s => s.type !== 'home').slice(-10).reverse(); root.querySelectorAll('[data-history-item]').forEach(el => el.onclick = () => browserNavigate(history[Number(el.dataset.historyItem)]));
    } else if (state.type === 'url') {
      root.innerHTML = `<span class="connection-badge">EXTERNAL WEBSITE</span><h2>${esc(new URL(state.url).hostname)}</h2><p class="web-url">${esc(state.url)}</p><div class="connection-toolbar">${N.link(state.url, '実際のサイトを開く', 'primary-button')}${button('webBookmark', '保存')}${button('webShare', '共有')}</div><div class="connection-card"><h3>安全に外部ブラウザで開く</h3><p>サイト側のCSP / X-Frame-Optionsにより、ログイン画面や検索サイトなどはアプリ内表示できません。上のリンクなら実際のサイトをそのまま使えます。</p>${button('webPreview', '制限付きプレビューを試す')}</div><div id="web-preview"></div>`;
    } else if (state.type === 'saved') {
      root.innerHTML = `<h1 class="app-title">保存したページ</h1>${webBookmarks.map((b, i) => `<div class="web-bookmark"><button class="list-row" data-bookmark-index="${i}"><span class="row-main"><strong>${esc(b.title)}</strong><small>${esc(b.url)}</small></span></button><button data-remove-bookmark="${i}" aria-label="保存を削除">×</button></div>`).join('') || stateBox('サイトや記事の「保存」から追加できます。')}`;
      root.querySelectorAll('[data-bookmark-index]').forEach(el => el.onclick = () => browserNavigate({type: 'url', ...webBookmarks[Number(el.dataset.bookmarkIndex)]}));
      root.querySelectorAll('[data-remove-bookmark]').forEach(el => el.onclick = () => { webBookmarks.splice(Number(el.dataset.removeBookmark), 1); A.save('webBookmarks', webBookmarks); browserNavigate({type: 'saved'}, false); });
    } else loadWiki(state, root, controller);
  }
  async function loadWiki(state, root, controller) {
    root.innerHTML = stateBox(state.type === 'article' ? '記事を取得しています…' : 'Wikipediaを検索しています…');
    const params = new URLSearchParams({action: 'query', format: 'json', origin: '*', prop: 'extracts|info', explaintext: '1', inprop: 'url', redirects: '1'});
    if (state.type === 'article') params.set('pageids', String(state.pageid));
    else { params.set('generator', 'search'); params.set('gsrsearch', state.query); params.set('gsrlimit', '10'); params.set('exintro', '1'); params.set('exsentences', '2'); }
    try {
      const data = await N.request(wikiBase + params, {signal: controller.signal});
      if (!root.isConnected || controller.signal.aborted) return;
      const pages = Object.values(data.query?.pages || {}).filter(p => !p.missing && p.pageid > 0).sort((a, b) => (a.index || 0) - (b.index || 0));
      if (state.type === 'article') {
        const page = pages[0]; if (!page) { root.innerHTML = stateBox('記事が見つかりません。検索し直してください。'); return; }
        state.url = N.safeURL(page.fullurl) || `https://ja.wikipedia.org/?curid=${page.pageid}`; state.title = page.title;
        root.innerHTML = `<div class="connection-toolbar">${button('webBookmark', '保存')}${button('webShare', '共有')}${N.link(state.url, '原文を開く')}</div><h1>${esc(page.title)}</h1><article class="live-reader">${esc(page.extract || '本文を取得できませんでした。原文を開いてください。')}</article><p class="connected-caption">出典：${N.link(state.url, 'Wikipedia')} · ${N.link('https://creativecommons.org/licenses/by-sa/4.0/', 'CC BY-SA 4.0')} · 取得 ${stamp(Date.now())}</p>`;
      } else {
        root.innerHTML = `<span class="connection-badge">WIKIPEDIA SEARCH</span><h2>「${esc(state.query)}」の検索結果</h2><p class="connected-caption">百科事典の検索です。Web全体の検索は上の検索先を変更してください。</p>${pages.map((p, i) => `<button class="web-result" data-wiki-result="${i}"><small>ja.wikipedia.org</small><h3>${esc(p.title)}</h3><p>${esc(p.extract || 'タップして記事を読む')}</p></button>`).join('') || stateBox('記事が見つかりません。検索語を変えるか、Web検索を利用してください。')}${N.link('https://www.google.com/search?q=' + encodeURIComponent(state.query), 'Googleでも検索')}`;
        root.querySelectorAll('[data-wiki-result]').forEach(el => el.onclick = () => { const page = pages[Number(el.dataset.wikiResult)]; browserNavigate({type: 'article', pageid: page.pageid, title: page.title, url: N.safeURL(page.fullurl) || `https://ja.wikipedia.org/?curid=${page.pageid}`}); });
      }
    } catch (error) { if (root.isConnected && !controller.signal.aborted) root.innerHTML = stateBox(N.errorText(error), 'webReload') + N.link('https://www.google.com/search?q=' + encodeURIComponent(state.query || state.title || ''), 'Googleで検索'); }
  }
  A.apps.safari.render = () => { browserNavigate(browserHistory[browserIndex], false); A.cleanups.push(() => browserController?.abort()); };
  A.actions.webHome = () => browserNavigate({type: 'home'});
  A.actions.webBack = () => { if (browserIndex > 0) browserNavigate(browserHistory[--browserIndex], false); };
  A.actions.webForward = () => { if (browserIndex < browserHistory.length - 1) browserNavigate(browserHistory[++browserIndex], false); };
  A.actions.webReload = () => browserNavigate(browserHistory[browserIndex], false);
  A.actions.webSaved = () => browserNavigate({type: 'saved'});
  A.actions.webClearHistory = () => { browserHistory = [{type: 'home'}]; browserIndex = 0; browserNavigate(browserHistory[0], false); };
  A.actions.webBookmark = () => {
    const state = browserHistory[browserIndex]; if (!N.safeURL(state.url)) return;
    if (webBookmarks.some(b => b.url === state.url)) return A.toast('すでに保存されています');
    const next = [{title: state.title || state.query || new URL(state.url).hostname, url: state.url}, ...webBookmarks].slice(0, 100);
    if (A.save('webBookmarks', next)) { webBookmarks = next; A.toast('ページを保存しました'); }
  };
  A.actions.webShare = () => { const s = browserHistory[browserIndex]; N.share(s.title || 'Webページ', '', s.url); };
  A.actions.webPreview = () => {
    const s = browserHistory[browserIndex]; if (!N.safeURL(s.url) || !$('#web-preview')) return;
    $('#web-preview').innerHTML = `<p class="connected-caption">空白・拒否画面の場合は「実際のサイトを開く」を使ってください。ログインや決済は外部ブラウザで行ってください。</p><iframe class="web-frame" title="外部サイトの制限付きプレビュー" sandbox="allow-scripts allow-forms allow-popups" referrerpolicy="no-referrer" src="${esc(s.url)}"></iframe>`;
  };
  A.updateWidgets();
})();
