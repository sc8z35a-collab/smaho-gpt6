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
    if (!navigator.onLine) throw new Error('オフライン。通信を確認して再試行');
    const controller = new AbortController();
    const abort = () => controller.abort();
    if (signal?.aborted) controller.abort();
    signal?.addEventListener('abort', abort, {once: true});
    let timedOut = false;
    const timer = setTimeout(() => { timedOut = true; controller.abort(); }, timeout);
    try {
      const response = await fetch(url, {signal: controller.signal, credentials: 'omit', referrerPolicy: 'strict-origin-when-cross-origin'});
      if (!response.ok) throw new Error(response.status === 429 ? '混雑中。時間をおいて再試行' : `外部サービスが応答できませんでした（HTTP ${response.status}）。`);
      const data = await response.json();
      if (data.error) throw new Error('外部サービスからエラーが返されました。検索条件を確認してください。');
      return data;
    } catch (error) {
      if (timedOut) throw new Error('通信時間切れ。再試行');
      if (error.name === 'TypeError') throw new Error('接続失敗。通信・サービス・ブラウザ制限を確認');
      throw error;
    } finally {
      clearTimeout(timer);
      signal?.removeEventListener('abort', abort);
    }
  };
  N.location = () => new Promise((resolve, reject) => {
    if (!navigator.geolocation) return reject(new Error('位置情報非対応。場所を検索'));
    navigator.geolocation.getCurrentPosition(position => resolve({latitude: position.coords.latitude, longitude: position.coords.longitude, name: '現在地'}), error => reject(new Error(error.code === 1 ? '位置情報未許可。権限を確認、または場所を検索' : '現在地取得失敗。場所を検索')), {timeout: 10000, maximumAge: 60000, enableHighAccuracy: false});
  });
  N.share = async (title, text, url) => {
    const safe=N.safeURL(url),content=[title,text,safe].filter(Boolean).join('\n');
    if(navigator.share){
      try{await navigator.share({title,text,...(safe?{url:safe}:{})});return;}
      catch(error){if(error.name==='AbortError')return;}
    }
    if(navigator.clipboard){
      try{await navigator.clipboard.writeText(content);A.toast('共有非対応・コピー済み');return;}
      catch{/* Permission denial must not prevent the explicit export fallback. */}
    }
    try{A.download(new Blob([content],{type:'text/plain;charset=utf-8'}),'aura-share.txt');A.toast('共有非対応・テキストを保存');}
    catch{A.toast('共有できません。権限を確認。');}
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
  const weatherLabel = code => ({clear:'快晴',cloudy:'晴れ時々くもり',overcast:'くもり',fog:'霧',rain:[51,53,55,56,57].includes(code)?'霧雨':[80,81,82].includes(code)?'にわか雨':'雨',snow:[85,86].includes(code)?'にわか雪':'雪',thunder:'雷雨'}[A.weatherScene(code)] || '不明');
  A.weatherSnapshot = () => {
    const cache = currentWeather();
    if (!cache) return {name: weatherPlace.name, temp: '—', high: '—', low: '—', condition: '', desc: weatherBusy ? '取得中' : '天気を開いて取得', source: weatherError ? '取得できません' : '未取得'};
    const d = cache.data;
    return {name: weatherPlace.name, temp: number(d.current.temperature_2m), high: number(d.daily.temperature_2m_max[0]), low: number(d.daily.temperature_2m_min?.[0]), desc: weatherLabel(d.current.weather_code), condition: '', source: `${weatherError || Date.now() - cache.savedAt > 900000 ? '保存データ' : '予報データ'} ${stamp(cache.savedAt)}更新`};
  };
  // Explicit WMO codes only: no sunny illustration for missing/unknown forecasts.
  A.weatherScene = code => {
    if (code === 0) return 'clear';
    if (code === 1 || code === 2) return 'cloudy';
    if (code === 3) return 'overcast';
    if ([45,48].includes(code)) return 'fog';
    if ([51,53,55,56,57,61,63,65,66,67,80,81,82].includes(code)) return 'rain';
    if ([71,73,75,77,85,86].includes(code)) return 'snow';
    if ([95,96,99].includes(code)) return 'thunder';
    return '';
  };
  let weatherArtSerial = 0, weatherMetric = 'temperature', weatherHour = 0;
  let stopWeatherMotion = () => {}, weatherPreview = false;
  const savedWeatherVisuals = A.load('weatherVisuals', {});
  let weatherVisualMode = ['full','calm','still'].includes(savedWeatherVisuals?.motion) ? savedWeatherVisuals.motion : 'full';
  const wxClamp = (n, min, max) => Math.max(min, Math.min(max, n));
  const wxValid = n => typeof n === 'number' && Number.isFinite(n);
  const wxPercent = n => wxValid(n) && n >= 0 && n <= 100;
  const wxSVG = (body, cls = '', box = '0 0 100 70') => `<svg class="${cls}" viewBox="${box}" aria-hidden="true" focusable="false">${body}</svg>`;

  const wxMinutes = value => {
    if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/.test(value)) return NaN;
    const hour = Number(value.slice(11,13)), minute = Number(value.slice(14,16));
    return hour < 24 && minute < 60 ? hour*60+minute : NaN;
  };
  const wxTime = value => Number.isFinite(wxMinutes(value)) ? value.slice(11,16) : '—';
  const wxFixed = value => wxValid(value) ? Number(value.toFixed(1)) : '—';
  function weatherPhase(d, time, isDay) {
    const i = d.daily.time.indexOf(time.slice(0,10)), now = wxMinutes(time);
    const rise = wxMinutes(d.daily.sunrise?.[i]), set = wxMinutes(d.daily.sunset?.[i]);
    // Twilight is a visual window around the provider's sunrise/set, not calculated astronomy.
    if (Number.isFinite(now+rise+set) && set > rise) {
      if (Math.abs(now-rise) <= 40) return 'dawn';
      if (Math.abs(now-set) <= 40) return 'dusk';
      return now > rise && now < set ? 'day' : 'night';
    }
    return isDay === 0 ? 'night' : isDay === 1 ? 'day' : 'unknown';
  }
  const wxPhaseName = phase => ({day:'昼の空',night:'夜の空',dawn:'朝焼けの空',dusk:'夕暮れの空',unknown:'天候イラスト'}[phase]);

  // Compact symbols share a visual language, not IDs or external image assets.
  function weatherArt(code, night = false) {
    const kind = A.weatherScene(code);
    if (!kind) return wxSVG('<path d="M40 34h20" stroke="currentColor" stroke-width="3" stroke-linecap="round"/>', 'wx-symbol');
    const id = `wx-symbol-${++weatherArtSerial}`, sun = ['clear','cloudy'].includes(kind);
    return wxSVG(`<defs><linearGradient id="${id}" x2="0" y2="1"><stop stop-color="#fff"/><stop offset="1" stop-color="#9cbed8"/></linearGradient></defs>
      ${sun ? night ? '<path d="M63 9a22 22 0 1 0 20 31A23 23 0 0 1 63 9Z" fill="#e6edff"/><circle cx="31" cy="15" r="1.5" fill="#fff"/>' : '<g stroke="#ffdc88" stroke-width="2" stroke-linecap="round"><path d="M60 3v5m0 42v5M34 29h5m42 0h5M41 10l4 4m30 30 4 4m0-38-4 4M45 44l-4 4"/><circle cx="60" cy="29" r="17" fill="#ffd27b"/></g>' : ''}
      ${kind !== 'clear' ? `<path d="M24 49C8 48 9 27 24 26c2-19 29-24 39-7 15-5 28 6 26 19 14 4 10 17-2 17H28Z" fill="url(#${id})" stroke="#fff" stroke-opacity=".4"/><path d="M29 25c3-9 14-12 21-7" fill="none" stroke="#fff" stroke-width="2" opacity=".65"/>` : ''}
      ${['rain','thunder'].includes(kind) ? '<path d="m31 59-3 7m18-7-3 7m33-7-3 7" stroke="#83dcff" stroke-width="3" stroke-linecap="round"/>' : ''}
      ${kind === 'thunder' ? '<path d="m61 45-11 15h10l-4 10 20-20H64l5-5Z" fill="#ffdc85"/>' : ''}
      ${kind === 'snow' ? '<g stroke="#e6faff" stroke-width="1.5"><path d="M32 57v12m-5-9 10 6m0-6-10 6M65 57v12m-5-9 10 6m0-6-10 6"/></g>' : ''}
      ${kind === 'fog' ? '<path d="M20 57h65m-57 7h48" stroke="#e0eef4" stroke-width="2" stroke-linecap="round"/>' : ''}`, 'wx-symbol');
  }

  // A stylized landscape, not a map, radar, astronomical simulation or observation.
  function weatherLandscape(code, night, phase = night ? 'night' : 'day') {
    const kind = A.weatherScene(code);
    if (!kind) return '';
    const id = `wx-land-${++weatherArtSerial}`, paint = name => `url(#${id}-${name})`;
    const storm = ['rain','thunder','overcast'].includes(kind), snow = kind === 'snow';
    const twilight = phase === 'dawn' || phase === 'dusk';
    const sky = twilight ? (phase === 'dawn' ? ['#586887','#d6a7aa','#f6d1a0'] : ['#424b77','#bb8593','#f2bc90']) : night ? ['#102039','#35496d','#b095a3'] : storm ? ['#263e59','#667f96','#abbfc8'] : snow ? ['#577d9e','#a9c5d7','#e2ebeb'] : ['#286f9f','#79b7ca','#f3d6ac'];
    const clouds = `<ellipse cx="-3" cy="22" rx="65" ry="5" fill="#13273b" opacity=".09"/><path d="M-57 20c-26 0-28-31-7-38 0-28 39-35 51-12C5-43 29-32 31-12c27-5 37 33 9 34Z" fill="${paint('cloud')}" stroke="#f0f8ff" stroke-opacity=".32"/><path d="M-55-16c2-13 20-18 28-8" fill="none" stroke="#fff" stroke-opacity=".6" stroke-width="1.5" stroke-linecap="round"/>`;
    const particles = Array.from({length:snow?30:36}, (_, i) => {
      const x = 12 + (i * 47) % 342, y = 20 + (i * 31) % 144;
      return snow ? `<g transform="translate(${x} ${y})"><g class="wx-flake wx-motion" style="--wx-delay:-${i*.43}s;--wx-duration:${5+i%4}s"><path d="M0-3v6m-2.6-4.5 5.2 3m0-3-5.2 3" stroke="#f1fbff" stroke-width="${i%3 ? .8 : 1.4}"/></g></g>` : `<path class="wx-rain wx-motion" style="--wx-delay:-${i*.19}s;--wx-duration:${1.2+i%3*.3}s" d="m${x} ${y}-6 17" stroke="#bdeaff" stroke-width="${i%3 ? .8 : 1.5}" stroke-linecap="round"/>`;
    }).join('');
    return wxSVG(`<defs>
      <linearGradient id="${id}-sky" x2="0" y2="1">${sky.map((c,i)=>`<stop offset="${i/2}" stop-color="${c}"/>`).join('')}</linearGradient>
      <radialGradient id="${id}-glow"><stop stop-color="${night?'#c2d7ff':'#fff0c5'}" stop-opacity=".64"/><stop offset="1" stop-color="#ffe8bb" stop-opacity="0"/></radialGradient>
      <radialGradient id="${id}-sun" cx=".32" cy=".25"><stop stop-color="#fffbea"/><stop offset=".6" stop-color="#ffdc92"/><stop offset="1" stop-color="#f5ae5c"/></radialGradient>
      <linearGradient id="${id}-cloud" x2=".15" y2="1"><stop stop-color="${storm?'#c7d7e4':night?'#d3e0f3':'#fffef8'}"/><stop offset=".5" stop-color="${storm?'#91a9bf':'#dae8ef'}"/><stop offset="1" stop-color="${storm?'#496985':'#8da9c2'}"/></linearGradient>
      <linearGradient id="${id}-lake" x2="0" y2="1"><stop stop-color="${night?'#7f8fab':'#b4cdd2'}"/><stop offset="1" stop-color="${night?'#1c334e':'#3b7c98'}"/></linearGradient>
      <linearGradient id="${id}-land" x2="0" y2="1"><stop stop-color="${snow?'#d8e9eb':night?'#203d53':'#377787'}"/><stop offset="1" stop-color="${snow?'#83aabd':'#163e54'}"/></linearGradient>
      <linearGradient id="${id}-ray" x2="0" y2="1"><stop stop-color="#fff1ce" stop-opacity=".24"/><stop offset="1" stop-color="#fff1ce" stop-opacity="0"/></linearGradient>
      <linearGradient id="${id}-reflection" x2="0" y2="1"><stop stop-color="${twilight?'#ffdab0':'#e8f2e8'}" stop-opacity=".38"/><stop offset="1" stop-color="#e0edf0" stop-opacity="0"/></linearGradient>
      <clipPath id="${id}-clip"><rect width="360" height="240" rx="22"/></clipPath>
    </defs><g clip-path="${paint('clip')}">
      <rect width="360" height="240" fill="${paint('sky')}"/>
      ${night && ['clear','cloudy'].includes(kind) ? `<g fill="#eef6ff">${Array.from({length:24},(_,i)=>`<circle class="wx-star wx-motion" style="--wx-delay:-${i*.7}s" cx="${15+i*83%334}" cy="${9+i*19%106}" r="${i%3===0?1.1:.6}"/>`).join('')}</g>` : ''}
      ${!night && ['clear','cloudy'].includes(kind) && phase !== 'unknown' ? `<g class="wx-sunbeams wx-motion" fill="${paint('ray')}"><path d="m260 40-112 178h49Zm0 0 4 183h42Zm0 0 70 160h59Z"/></g>` : ''}
      ${['clear','cloudy'].includes(kind) && phase !== 'unknown' ? `<circle class="wx-halo wx-motion" cx="260" cy="65" r="86" fill="${paint('glow')}"/>
      ${night ? '<g class="wx-moon"><path d="M270 29a34 34 0 1 0 16 58 32 32 0 0 1-16-58Z" fill="#e5edfa"/><path d="M247 55a23 23 0 0 0 11 24" fill="none" stroke="#b8cce1" stroke-width="3" stroke-linecap="round"/></g>' : `<g class="wx-orbit wx-motion" stroke="#ffe8b0" stroke-opacity=".35">${Array.from({length:12},(_,i)=>`<path d="M260 16v7" transform="rotate(${i*30} 260 65)"/>`).join('')}</g><circle cx="260" cy="65" r="30" fill="${paint('sun')}"/><path d="M244 51a21 21 0 0 1 22-7" stroke="#fffbed" stroke-width="1.5" fill="none" stroke-linecap="round"/>`}` : ''}
      <g fill="none" stroke="#e9f4f6" stroke-opacity=".18"><path d="M-15 110Q90 80 184 105T390 93"/><path d="M-10 115Q90 85 182 110T390 98"/></g>
      <path d="M-20 167 45 109l27 30 43-57 63 73 46-40 50 38 37-39 69 70Z" fill="${night?'#536883':'#87adb9'}"/>
      <path d="m70 140 45-58 44 50-35-16-10-15-16 28Z" fill="${snow?'#f5fafb':'#dce6e6'}" opacity="${snow?'.92':'.5'}"/>
      <path d="M-20 183 59 133l55 41 69-53 76 47 67-38 58 49v62H0Z" fill="${night?'#314d65':'#57899a'}"/>
      <path d="m153 145 30-24 29 21-26-7-13 9Z" fill="#e8f3f2" opacity="${snow?'.9':'.28'}"/>
      <path d="M0 183q80-14 173-3t187-1v61H0Z" fill="${paint('lake')}"/>
      <path d="M244 181h24l47 59H195Z" fill="${paint('reflection')}"/>
      <g fill="none" stroke="${night?'#a3bac9':'#d0e5e6'}" stroke-width=".65" opacity=".28"><path d="m33 151 26-18 53 42m49-29 22-25 76 47m53-20 14-18 35 29"/><path d="M76 172q41 7 91 3t132 3"/></g>
      ${['rain','thunder'].includes(kind)?`<g fill="none" stroke="#ccecf5" stroke-width=".8">${Array.from({length:8},(_,i)=>`<g transform="translate(${70+i*29} ${187+i%3*10})"><ellipse class="wx-ripple wx-motion" style="--wx-delay:-${i*.6}s" rx="8" ry="1.7"/></g>`).join('')}</g>`:''}
      <g class="wx-water wx-motion" fill="none" stroke="${night?'#d0dbec':'#ffebcb'}" stroke-linecap="round" opacity=".4"><path d="M232 187h42m-54 6h67m-85 7h79m-68 8h94m-107 9h69"/><path d="M80 191h39m-72 12h28m49 8h46m-88 16h32" stroke-opacity=".55"/></g>
      ${kind!=='clear' ? `<g transform="translate(294 97) scale(.73)"><g class="wx-cloud-back wx-motion" opacity=".72">${clouds}</g></g><g transform="translate(134 81) scale(1.25)"><g class="wx-cloud-front wx-motion">${clouds}</g></g>` : `<g transform="translate(53 89) scale(.55)"><g class="wx-cloud-back wx-motion" opacity=".48">${clouds}</g></g>`}
      ${kind==='fog'?'<g class="wx-mist wx-motion" fill="none" stroke="#e6f2f5" stroke-linecap="round"><path d="M-20 130h275m-212 15h330M-30 161h276" stroke-width="12" opacity=".22"/><path d="M18 133h221m-173 16h264" stroke-width="1" opacity=".5"/></g>':''}
      ${['rain','snow','thunder'].includes(kind)?particles:''}
      ${kind==='thunder'?`<path class="wx-lightning wx-motion" d="m160 102-19 31h17l-9 25 35-40h-20l10-16Z" fill="${paint('sun')}" stroke="#fff3c0"/>`:''}
      <path d="M0 189q39-9 74 15t83 36H0Zm360-11q-37 6-66 29t-59 33h125Z" fill="${paint('land')}"/>
      <g fill="${night?'#122d43':snow?'#4e7c8e':'#245568'}">${[[19,185,1],[40,197,.7],[326,184,1.2],[307,203,.7],[343,204,.85]].map(([x,y,k])=>`<path transform="translate(${x} ${y}) scale(${k})" d="M0-40-9-21h5l-10 15h10L-17 7H-2v9h4V7h15L4-6h10L4-21h5Z"/>`).join('')}</g>
      <path d="M0 228q55-9 96 12H0Zm360-9-70 21h70Z" fill="${snow?'#c2dce3':'#15394c'}"/>
      <g class="wx-reeds wx-motion" fill="none" stroke="${snow?'#e2edf0':'#71a2a5'}" stroke-width=".75" stroke-linecap="round" opacity=".65"><path d="M63 239q-2-18-8-25m9 25q6-13 13-17m-10 17q0-22 5-31m228 28q-2-20-8-28m8 28q5-10 11-16m-7 15 2-18"/></g>
      ${snow?'<g fill="none" stroke="#edfaff" stroke-opacity=".5"><path d="M4 209q19-8 48 3m260-9 40-12M9 230l25-2m295 2 27-7"/><path d="M22 157h8m3 30h10m277-35h13" stroke-width="2" stroke-linecap="round"/></g>':''}
      <rect x=".5" y=".5" width="359" height="239" rx="22" fill="none" stroke="#e1f1f5" stroke-opacity=".18"/>
    </g>`, `weather-landscape scene-${kind} wx-motion-surface`, '0 0 360 240');
  }

  function weatherHours(d) {
    // Compare provider-local timestamps; never parse them in the device timezone.
    const start = d.hourly.time.findIndex(t => t >= d.current.time.slice(0, 13) + ':00');
    if (start < 0) return [];
    return d.hourly.time.slice(start, start + 24).map((time, i) => ({time,
      temperature:d.hourly.temperature_2m?.[start+i], rain:d.hourly.precipitation_probability?.[start+i], code:d.hourly.weather_code?.[start+i],
      wind:d.hourly.wind_speed_10m?.[start+i], cloud:d.hourly.cloud_cover?.[start+i],
      isDay:d.hourly.is_day?.[start+i], night:weatherPhase(d,time,d.hourly.is_day?.[start+i]) === 'night'
    }));
  }
  function weatherChart(hours) {
    const metric = weatherMetric, rain = metric === 'rain', wind = metric === 'wind';
    const values = hours.map(h => h[metric]), valid = v => rain ? wxPercent(v) : wxValid(v) && (!wind || v >= 0), finite = values.filter(valid);
    if (!finite.length) return '<p class="wx-chart-empty">この時間帯のデータはありません</p>';
    const lo = rain || wind ? 0 : Math.floor(Math.min(...finite)-2);
    const hi = rain ? 100 : wind ? Math.max(5,Math.ceil(Math.max(...finite)+1)) : Math.ceil(Math.max(...finite)+2);
    const width = hours.length*66, y = v => 104-(v-lo)/(hi-lo)*76, color = rain?'#98e1fc':wind?'#b8d9cf':'#ffdc93', unit = rain?'%':wind?'m/s':'°';
    const id = `wx-chart-${++weatherArtSerial}`, segments = [];
    let points = [];
    values.forEach((v,i) => {if (valid(v)) points.push([33+i*66,y(v)]);else if(points.length){segments.push(points);points=[];}});
    if (points.length) segments.push(points);
    // Horizontal endpoint tangents keep each curve between its real sample values.
    const curve = pts => pts.reduce((path,[x,y],i) => {
      if (!i) return `M${x} ${y}`;
      const [px,py] = pts[i-1], mid = (px+x)/2;
      return `${path}C${mid} ${py} ${mid} ${y} ${x} ${y}`;
    },'');
    return wxSVG(`<defs><linearGradient id="${id}" x2="0" y2="1"><stop stop-color="${color}" stop-opacity=".35"/><stop offset="1" stop-color="${color}" stop-opacity=".015"/></linearGradient></defs>
      ${hours.map((h,i)=>h.night?`<rect x="${i*66}" width="66" height="120" fill="#071629" opacity=".28"/>`:'').join('')}
      <rect x="${weatherHour*66+1}" y="4" width="64" height="112" rx="9" fill="${color}" opacity=".065"/>
      ${[lo,(lo+hi)/2,hi].map(v=>`<path d="M0 ${y(v)}h${width}" stroke="#e0f2ff" stroke-opacity=".12" stroke-dasharray="3 6"/>`).join('')}
      ${rain ? values.map((v,i)=>valid(v)?`<rect x="${21+i*66}" y="${y(v)}" width="24" height="${104-y(v)}" rx="5" fill="url(#${id})"/><path d="M${24+i*66} ${y(v)+.5}h18" stroke="${color}" stroke-opacity="${v?'.75':'0'}"/>`:'').join('') : segments.map(pts=>`<path d="${curve(pts)}L${pts[pts.length-1][0]} 104H${pts[0][0]}Z" fill="url(#${id})"/><path d="${curve(pts)}" fill="none" stroke="${color}" stroke-width="2.5" stroke-linejoin="round" stroke-linecap="round"/>`).join('')}
      ${values.map((v,i)=>valid(v)?`<g><circle cx="${33+i*66}" cy="${y(v)}" r="${i===weatherHour?5:2.5}" fill="${color}" stroke="#142c41" stroke-width="1.5"/><text x="${33+i*66}" y="${y(v)-12}" text-anchor="middle" fill="#f3f8ff" font-size="10">${wind?wxFixed(v):number(v)}${unit}</text></g>`:'').join('')}
      <path class="wx-chart-cursor" d="M${33+weatherHour*66} 8V115" stroke="#fff" stroke-opacity=".3" stroke-dasharray="2 4"/>`, 'wx-chart', `0 0 ${width} 120`);
  }
  function weatherHourDetail(hours) {
    const h = hours[weatherHour];
    return h ? `${esc(h.time.slice(5).replace('T',' '))} · ${esc(weatherLabel(h.code))} · ${number(h.temperature)}° · 降水 ${wxPercent(h.rain)?number(h.rain):'—'}% · 風 ${wxValid(h.wind)&&h.wind>=0?wxFixed(h.wind):'—'} m/s` : '時間別予報はありません';
  }
  function weatherForecast(d) {
    const hours = weatherHours(d), daily = d.daily;
    weatherHour = wxClamp(weatherHour, 0, Math.max(0,hours.length-1));
    const ranges = daily.time.slice(0,7).map((_,i) => [daily.temperature_2m_min?.[i],daily.temperature_2m_max?.[i]]);
    const validRange = r => r.every(wxValid) && r[0] <= r[1];
    const extrema = ranges.filter(validRange).flat(), min = extrema.length ? Math.min(...extrema) : 0, span = extrema.length ? Math.max(1,Math.max(...extrema)-min) : 1;
    return `<section class="weather-card wx-hour-card"><div class="wx-card-heading"><h3>時間別予報</h3><span>現地時間 · 最大24時間</span></div>
      <div class="wx-chart-tabs" role="group" aria-label="グラフの表示">${[['temperature','気温'],['rain','降水確率'],['wind','風速']].map(([key,label])=>`<button data-action="weatherChartMode" data-value="${key}" aria-pressed="${weatherMetric===key}">${label}</button>`).join('')}</div>
      <div class="wx-chart-legend"><span><i></i>選択した指標の予報</span><span><i></i>夜の時間帯</span></div>
      <p id="wx-hour-detail" class="wx-hour-detail" aria-live="polite">${weatherHourDetail(hours)}</p>
      <div class="wx-timeline" tabindex="0" role="region" aria-label="時間別予報。横にスクロールできます"><div class="wx-timeline-inner" style="width:${Math.max(1,hours.length)*66}px"><div id="wx-chart-plot">${weatherChart(hours)}</div>
      <div class="hourly-forecast">${hours.map((h,i)=>`<button data-action="weatherHour" data-value="${i}" aria-pressed="${i===weatherHour}" aria-label="${esc(h.time.replace('T',' '))} ${esc(weatherLabel(h.code))} ${number(h.temperature)}度 降水確率${wxPercent(h.rain)?number(h.rain):'不明'}パーセント 風速${wxValid(h.wind)&&h.wind>=0?wxFixed(h.wind):'不明'}メートル毎秒"><span>${esc(h.time.slice(11,16))}</span>${weatherArt(h.code,h.night)}<strong>${number(h.temperature)}°</strong><small>${wxPercent(h.rain)?number(h.rain):'—'}%</small></button>`).join('')}</div></div></div><div class="wx-time-scrubber"><label for="wx-hour-range">時刻を移動</label><input id="wx-hour-range" type="range" min="0" max="${Math.max(0,hours.length-1)}" step="1" value="${weatherHour}" aria-valuetext="${esc(hours[weatherHour]?.time.replace('T',' ')||'データなし')}" ${hours.length?'':'disabled'}><button data-action="weatherFirstHour">先頭</button></div><div class="wx-sky-controls"><button data-action="weatherShowHourSky" ${hours.length?'':'disabled'}>この時刻の空へ</button></div><p class="wx-scroll-hint">時刻を選択して確認 <span aria-hidden="true">← →</span></p></section>
      <section class="weather-card wx-week"><div class="wx-card-heading"><h3>7日間の予報</h3><span>最低 / 最高</span></div>${daily.time.slice(0,7).map((t,i)=>{
        const r = ranges[i], valid = validRange(r), date = new Date(t+'T12:00:00Z'), day = Number.isFinite(date.getTime()) ? ['日','月','火','水','木','金','土'][date.getUTCDay()] : '';
        return `<details class="wx-daily"><summary class="live-forecast-row"><span class="wx-day">${esc(t.slice(5).replace('-','/'))}<small>${day}曜日</small></span>${weatherArt(daily.weather_code?.[i])}<span class="wx-week-condition">${esc(weatherLabel(daily.weather_code?.[i]))}</span><div class="wx-day-range"><span>${number(r[0])}°</span><div class="wx-range-track" aria-hidden="true">${valid?`<i style="left:${(r[0]-min)/span*100}%;width:${(r[1]-r[0])/span*100}%"></i>`:''}</div><strong>${number(r[1])}°</strong></div><span class="wx-day-chevron" aria-hidden="true">⌄</span></summary>${weatherDayDetail(d,i)}</details>`;
      }).join('')}<p class="wx-range-note">バーは7日間共通の気温スケール</p></section>`;
  }
  function weatherDayDetail(d, i) {
    const daily = d.daily, nonnegative = v => wxValid(v) && v >= 0 ? wxFixed(v) : '—';
    const values = [
      ['最大降水確率',`${wxPercent(daily.precipitation_probability_max?.[i])?number(daily.precipitation_probability_max[i]):'—'}%`],
      ['降水量',`${nonnegative(daily.precipitation_sum?.[i])} mm`],
      ['最大風速',`${nonnegative(daily.wind_speed_10m_max?.[i])} m/s`],
      ['最大UV',nonnegative(daily.uv_index_max?.[i])],
      ['日の出',wxTime(daily.sunrise?.[i])],['日の入り',wxTime(daily.sunset?.[i])]
    ];
    return `<div class="wx-daily-details"><div>${values.map(([name,value])=>`<p><span>${name}</span><strong>${esc(value)}</strong></p>`).join('')}</div><small>日単位のモデル予報 · 時刻は現地時間</small></div>`;
  }
  function weatherOutlook(d) {
    const hours = weatherHours(d), temps = hours.filter(h=>wxValid(h.temperature)), wet = hours.filter(h=>wxPercent(h.rain));
    const warmest = temps.reduce((a,h)=>!a||h.temperature>a.temperature?h:a,null);
    const peak = wet.reduce((a,h)=>!a||h.rain>a.rain?h:a,null);
    const id = `wx-outlook-${++weatherArtSerial}`;
    return `<section class="weather-card wx-outlook"><div class="wx-card-heading"><h3>これからの空</h3><span>${hours.length}時間の予報から</span></div>
      <div class="wx-outlook-numbers"><div><small>気温のピーク</small><strong>${warmest?number(warmest.temperature):'—'}<em>°</em></strong><span>${warmest?esc(warmest.time.slice(5).replace('T',' ')):'データなし'}</span></div><div><small>降水確率の最大</small><strong>${peak?number(peak.rain):'—'}<em>%</em></strong><span>${peak?esc(peak.time.slice(5).replace('T',' ')):'データなし'}</span></div></div>
      ${wxSVG(`<defs><linearGradient id="${id}" x2="0" y2="1"><stop stop-color="#ace8ed"/><stop offset="1" stop-color="#5f9db7"/></linearGradient></defs>${hours.map((h,i)=>`<rect x="${i*12+1}" y="4" width="8" height="40" rx="3" fill="#ffffff0d"/>${wxPercent(h.rain)?`<rect x="${i*12+1}" y="${44-h.rain*.4}" width="8" height="${h.rain*.4}" rx="3" fill="url(#${id})"/>`:''}`).join('')}`, 'wx-rain-strip', `0 0 ${Math.max(1,hours.length)*12} 48`)}
      <p>降水確率の推移 · 棒の高さは0〜100%${wet.length<hours.length?' · 欠測あり':''}</p><small>雨量や降り始めの確定情報ではありません</small></section>`;
  }
  function weatherInstruments(d) {
    const c = d.current, bearing = c.wind_direction_10m, speed = c.wind_speed_10m;
    const bearingOK = wxValid(bearing) && bearing >= 0 && bearing <= 360 && wxValid(speed) && speed > 0;
    const direction = bearingOK ? ['北','北北東','北東','東北東','東','東南東','南東','南南東','南','南南西','南西','西南西','西','西北西','北西','北北西'][Math.round(bearing/22.5)%16] : speed === 0 ? '静穏' : '不明';
    const compass = wxSVG(`<circle cx="60" cy="60" r="46" fill="#091b2c" fill-opacity=".28" stroke="#b5d0db" stroke-opacity=".22"/><g stroke="#c6dce5">${Array.from({length:32},(_,i)=>`<path d="M60 17v${i%4===0?6:3}" transform="rotate(${i*11.25} 60 60)" opacity="${i%4===0?'.7':'.25'}"/>`).join('')}</g><g fill="#cbdde6" font-size="8" text-anchor="middle"><text x="60" y="12">N</text><text x="60" y="116">S</text><text x="7" y="63">W</text><text x="113" y="63">E</text></g>${bearingOK?`<g transform="rotate(${bearing} 60 60)"><path d="m60 29-8 31h16Z" fill="#f3d7a6"/><path d="m60 91-8-31h16Z" fill="#8fb7ca" fill-opacity=".45"/><path d="M60 29v62" stroke="#ecf3ec" stroke-opacity=".35"/></g>`:''}<circle cx="60" cy="60" r="4" fill="#d5e4e9"/>`, 'wx-compass', '0 0 120 120');
    const cloud = c.cloud_cover, apparent = c.apparent_temperature, pressure = c.pressure_msl;
    const cloudArt = wxSVG(`<g fill="#c5dfe9">${Array.from({length:40},(_,i)=>`<circle cx="${9+i%10*9}" cy="${10+Math.floor(i/10)*11}" r="2.4" opacity="${wxPercent(cloud)&&i<Math.round(cloud*.4)?'.85':'.12'}"/>`).join('')}</g>`, 'wx-cloud-matrix', '0 0 100 52');
    return `<section class="weather-card wx-instruments"><div class="wx-card-heading"><h3>空のディテール</h3><span>対象時刻の予報</span></div><div class="wx-instrument-grid"><div class="wx-compass-cell">${compass}<strong>${direction}${bearingOK?` <small>${number(bearing)}°</small>`:''}</strong><p>風が吹いてくる方角</p></div><div class="wx-air-values"><p><span>体感温度</span><strong>${number(apparent)}<small>°</small></strong></p><p><span>海面更正気圧</span><strong>${wxValid(pressure)&&pressure>0?number(pressure):'—'}<small>hPa</small></strong></p><p><span>雲量</span><strong>${wxPercent(cloud)?number(cloud):'—'}<small>%</small></strong></p>${cloudArt}</div></div><p class="wx-instrument-note">雲量の点は約2.5%刻み · 月は模式図で月齢を示しません</p></section>`;
  }
  function weatherMetrics(d) {
    const humidity = d.current.relative_humidity_2m, wind = d.current.wind_speed_10m, uv = d.daily.uv_index_max?.[0];
    const uvOK = wxValid(uv) && uv >= 0, uvLabel = !uvOK ? 'データなし' : uv < 3 ? '弱い' : uv < 6 ? '中程度' : uv < 8 ? '強い' : uv < 11 ? '非常に強い' : '極端に強い';
    const sunrise = d.daily.sunrise?.[0], sunset = d.daily.sunset?.[0];
    const minutes = wxMinutes;
    const rise = minutes(sunrise), set = minutes(sunset), now = minutes(d.current.time), solarOK = Number.isFinite(rise+set+now) && set > rise && sunrise.slice(0,10) === d.current.time.slice(0,10) && sunset.slice(0,10) === d.current.time.slice(0,10);
    const progress = solarOK ? wxClamp((now-rise)/(set-rise),0,1) : 0, angle = Math.PI*(1-progress);
    const ring = wxSVG(`<circle cx="50" cy="43" r="29" fill="none" stroke="#ffffff16" stroke-width="5"/>${wxPercent(humidity)?`<circle cx="50" cy="43" r="29" fill="none" stroke="#9fe4ee" stroke-width="5" pathLength="100" stroke-dasharray="${humidity} 100" transform="rotate(-90 50 43)"/>`:''}<path d="M50 24s-11 13-11 20a11 11 0 0 0 22 0c0-7-11-20-11-20Z" fill="#a7e9f5" fill-opacity=".3" stroke="#c7f5ff"/><path d="M44 44q0 6 6 6" stroke="#e9fdff" stroke-linecap="round" fill="none"/>`, 'wx-metric-art', '0 0 100 80');
    const windArt = wxSVG('<g fill="none" stroke="#c3e4f6" stroke-linecap="round"><path d="M14 27h44c16 0 16-20 5-20-6 0-9 4-9 7"/><path d="M8 39h71c17 0 17 23 3 23-6 0-9-5-8-9" stroke-width="2"/><path d="M22 51h26c12 0 12 15 3 15"/><path d="M16 64h14" opacity=".4"/></g>', 'wx-metric-art');
    const sunArt = wxSVG(`<path d="M12 68a48 48 0 0 1 96 0" fill="none" stroke="#ffffff28" stroke-width="2" stroke-dasharray="3 4"/><path d="M7 68h106" stroke="#ffffff40"/>${solarOK?`<path d="M12 68a48 48 0 0 1 96 0" fill="none" stroke="#ffd994" stroke-width="2" pathLength="100" stroke-dasharray="${progress*100} 100"/><circle cx="${60+48*Math.cos(angle)}" cy="${68-48*Math.sin(angle)}" r="6" fill="#ffe2a8" stroke="#fff5d9"/>`:''}`, 'wx-solar-art', '0 0 120 80');
    return `<div class="weather-stats"><section class="weather-card weather-stat"><h3>湿度</h3>${ring}<strong>${wxPercent(humidity)?number(humidity):'—'}<small>%</small></strong><p>相対湿度</p></section>
      <section class="weather-card weather-stat"><h3>風速</h3>${windArt}<strong>${wxValid(wind)&&wind>=0?esc(wind):'—'}<small>m/s</small></strong><p>地上10mの予報</p></section>
      <section class="weather-card weather-stat wx-uv"><h3>UV指数</h3><strong>${uvOK?esc(uv):'—'}</strong><p>${uvLabel} · 今日の最大</p><div class="wx-uv-scale" aria-hidden="true">${uvOK?`<i style="left:${wxClamp(uv/11*100,0,100)}%"></i>`:''}</div><div class="wx-scale-labels"><span>0</span><span>11+</span></div></section>
      <section class="weather-card weather-stat wx-solar"><h3>日の出・日の入り</h3>${sunArt}<div class="wx-sun-times"><span>出 <b>${Number.isFinite(rise)?esc(sunrise.slice(11,16)):'—'}</b></span><span>入 <b>${Number.isFinite(set)?esc(sunset.slice(11,16)):'—'}</b></span></div><p>${solarOK?'対象時刻の日中の進み具合':'日照の進行データなし'} · 現地</p></section></div>`;
  }

  function weatherSky(d) {
    const hours = weatherHours(d), selected = weatherPreview ? hours[weatherHour] : null;
    const time = selected?.time || d.current.time, code = selected ? selected.code : d.current.weather_code;
    const phase = weatherPhase(d,time,selected?selected.isDay:d.current.is_day);
    const heading = selected ? `予報の空 · ${time.slice(5).replace('T',' ')}` : `対象時刻の空 · ${wxTime(time)}`;
    return `<div class="wx-sky-frame" data-phase="${phase}"><div class="wx-sky-caption"><span>${esc(heading)}</span><b>${wxPhaseName(phase)}</b></div>${weatherLandscape(code,phase==='night',phase)||'<div class="wx-awaiting">この時刻の天候データはありません</div>'}<div class="wx-sky-footer"><span>${esc(weatherLabel(code))}${selected?` · ${number(selected.temperature)}°`:''}</span><span>ILLUSTRATED SKY</span></div></div>`;
  }
  function updateWeatherSky() {
    const d = currentWeather()?.data, frame = $('#wx-sky');
    if (!d || !frame) return;
    frame.innerHTML = weatherSky(d);
    watchWeatherMotion($('#live-weather'));
  }
  A.actions.weatherSkyPreview = el => {
    weatherPreview = !weatherPreview;
    el.setAttribute('aria-pressed',String(weatherPreview));
    el.textContent = weatherPreview ? '対象時刻の空に戻す' : '選んだ時刻の空を見る';
    updateWeatherSky();
  };
  A.actions.weatherShowHourSky = () => {
    weatherPreview=true;
    const toggle=$('[data-action="weatherSkyPreview"]');
    if(toggle){toggle.setAttribute('aria-pressed','true');toggle.textContent='対象時刻の空に戻す';}
    updateWeatherSky();
    const frame=$('#wx-sky');
    if(frame){frame.setAttribute('tabindex','-1');frame.focus({preventScroll:true});frame.scrollIntoView({block:'center',behavior:'instant'});}
  };
  A.actions.weatherVisualMode = el => {
    const mode = el.dataset.value;
    if (!['full','calm','still'].includes(mode)) return;
    if (!A.save('weatherVisuals',{motion:mode})) return;
    weatherVisualMode=mode;
    $('#live-weather').dataset.wxMotion=mode;
    document.querySelectorAll('[data-action="weatherVisualMode"]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.value===mode)));
  };
  A.actions.weatherFirstHour = () => {
    weatherHour=0;updateWeatherChart();
    const timeline=$('.wx-timeline');if(timeline)timeline.scrollLeft=0;
  };
  function bindWeatherTimeline() {
    const slider = $('#wx-hour-range');
    if (slider) slider.oninput = () => {
      A.actions.weatherHour({dataset:{value:slider.value}});
      const timeline=$('.wx-timeline');
      if (timeline) timeline.scrollLeft=Math.max(0,weatherHour*66-timeline.clientWidth/2+33);
    };
    const row = $('.hourly-forecast');
    if (row) row.onkeydown = e => {
      const button = e.target.closest('[data-action="weatherHour"]');
      if (!button || !['ArrowLeft','ArrowRight','Home','End'].includes(e.key)) return;
      const buttons = [...row.querySelectorAll('button')], index = buttons.indexOf(button);
      const next = e.key==='Home'?0:e.key==='End'?buttons.length-1:wxClamp(index+(e.key==='ArrowRight'?1:-1),0,buttons.length-1);
      e.preventDefault();buttons[next].focus();buttons[next].click();
    };
  }

  // CSS does the drawing. Observers only gate animation; no per-frame JS work.
  function watchWeatherMotion(root) {
    stopWeatherMotion();
    const surfaces = [...root.querySelectorAll('.wx-motion-surface')], visible = new Set();
    const sync = () => {
      const active = !document.hidden && A.current === 'weather' && !A.locked && $('#overlay').hidden;
      surfaces.forEach(el => {el.dataset.wxActive = String(active && visible.has(el));});
    };
    const observer = new IntersectionObserver(entries => {entries.forEach(e=>e.isIntersecting ? visible.add(e.target) : visible.delete(e.target));sync();}, {root:root.closest('.app-content'),threshold:0});
    surfaces.forEach(el => observer.observe(el));
    const cover = new MutationObserver(sync);
    cover.observe($('#overlay'),{attributes:true,attributeFilter:['hidden']});
    document.addEventListener('visibilitychange',sync);
    stopWeatherMotion = () => {observer.disconnect();cover.disconnect();document.removeEventListener('visibilitychange',sync);surfaces.forEach(el=>{el.dataset.wxActive='false';});stopWeatherMotion=()=>{};};
    sync();
  }
  function updateWeatherChart() {
    const cache = currentWeather();
    if (!cache || !$('#wx-chart-plot')) return;
    const hours = weatherHours(cache.data);
    $('#wx-chart-plot').innerHTML = weatherChart(hours);
    $('#wx-hour-detail').innerHTML = weatherHourDetail(hours);
    const slider = $('#wx-hour-range');
    if (slider) {slider.value=weatherHour;slider.setAttribute('aria-valuetext',hours[weatherHour]?.time.replace('T',' ')||'データなし');}
    if (weatherPreview) updateWeatherSky();
    document.querySelectorAll('[data-action="weatherChartMode"]').forEach(el=>el.setAttribute('aria-pressed',String(el.dataset.value===weatherMetric)));
    document.querySelectorAll('[data-action="weatherHour"]').forEach(el=>el.setAttribute('aria-pressed',String(Number(el.dataset.value)===weatherHour)));
  }
  A.actions.weatherChartMode = el => {if (!['temperature','rain','wind'].includes(el.dataset.value)) return;weatherMetric=el.dataset.value;updateWeatherChart();};
  A.actions.weatherHour = el => {
    const n = Number(el.dataset.value), hours = currentWeather() ? weatherHours(currentWeather().data) : [];
    if (!Number.isInteger(n) || n < 0 || n >= hours.length) return;
    weatherHour=n;updateWeatherChart();
  };
  function weatherPanel() {
    const root = $('#live-weather');
    if (!root) return;
    const cache = currentWeather(), snapshot = A.weatherSnapshot(), d = cache?.data;
    $('#app-screen').dataset.weatherScene = A.weatherScene(d?.current.weather_code);
    $('#app-screen').dataset.weatherNight = String(d?.current.is_day === 0);
    root.dataset.wxMotion=weatherVisualMode;
    if (d) weatherHour=wxClamp(weatherHour,0,Math.max(0,weatherHours(d).length-1));
    root.innerHTML = `<section class="weather-summary"><div class="wx-hero-heading"><span class="connection-badge">ATMOSPHERE / 天気</span><h2>${esc(weatherPlace.name)}</h2><span class="wx-source-pill">${cache ? (weatherError || Date.now()-cache.savedAt>900000 ? '保存データ' : '予報データ') : '未取得'}</span></div>
      <div class="wx-hero-reading"><div class="big-temperature">${snapshot.temp}<span>°</span></div><div><p>${esc(snapshot.desc)}</p><small>最高 ${snapshot.high}°<br>最低 ${snapshot.low}°</small></div></div>
      ${cache ? `<div id="wx-sky">${weatherSky(d)}</div>` : '<div class="wx-awaiting">空のデータを待っています</div>'}<p class="wx-scene-note">${cache&&A.weatherScene(d.current.weather_code)?'天候に合わせたイラスト · 実景・観測画像ではありません':'天候イラストのデータなし'}</p>
      ${cache?`<div class="wx-sky-controls"><button data-action="weatherSkyPreview" aria-pressed="${weatherPreview}">${weatherPreview?'対象時刻の空に戻す':'選んだ時刻の空を見る'}</button><div role="group" aria-label="空のモーション">${[['full','精細'],['calm','ゆったり'],['still','静止']].map(([value,label])=>`<button data-action="weatherVisualMode" data-value="${value}" aria-pressed="${weatherVisualMode===value}">${label}</button>`).join('')}</div></div><p class="wx-motion-note">端末・アプリの「動きを減らす」を優先</p>`:''}</section>
      ${weatherBusy ? stateBox('天気を取得しています…') : ''}${weatherError ? stateBox(weatherError+(cache?' 最後に取得したデータを表示しています。':''),'weatherRefresh') : ''}`;
    if (cache) root.innerHTML += `<p class="connected-caption wx-data-stamp">取得 ${stamp(cache.savedAt)} · 対象 ${esc(d.current.time.replace('T',' '))}<br>${esc(d.timezone)} · 予報（観測実況ではありません）</p>${weatherOutlook(d)}${weatherForecast(d)}${weatherMetrics(d)}${weatherInstruments(d)}`;
    root.innerHTML += `<p class="connected-caption wx-attribution">${N.link('https://open-meteo.com/','天気データ：Open-Meteo（CC BY 4.0）')}<br>位置情報は許可時のみ取得。予報の取得先に座標を送信。<br>防災情報は ${N.link('https://www.jma.go.jp/bosai/','気象庁')}</p>`;
    watchWeatherMotion(root);
    bindWeatherTimeline();
    A.updateWidgets();
  }
  async function refreshWeather(force = false) {
    weatherController?.abort();
    const cached = currentWeather();
    if (!force && cached && Date.now() - cached.savedAt < 900000) { weatherBusy = false; weatherError = ''; weatherPanel(); return; }
    const controller = weatherController = new AbortController(), place = {...weatherPlace};
    weatherBusy = true; weatherError = ''; weatherPanel();
    const params = new URLSearchParams({latitude: place.latitude, longitude: place.longitude, current: 'temperature_2m,relative_humidity_2m,weather_code,wind_speed_10m,wind_direction_10m,apparent_temperature,pressure_msl,cloud_cover,is_day', hourly: 'temperature_2m,weather_code,precipitation_probability,wind_speed_10m,cloud_cover,is_day', daily: 'weather_code,temperature_2m_max,temperature_2m_min,sunrise,sunset,uv_index_max,precipitation_probability_max,precipitation_sum,wind_speed_10m_max', timezone: 'auto', wind_speed_unit: 'ms', forecast_days: '7'});
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
    A.cleanups.push(() => { stopWeatherMotion(); weatherController?.abort(); cityController?.abort(); weatherBusy = false; });
  }
  function selectWeather(place) { if (!validPlace(place)) return; A.cleanup(); weatherHour = 0; weatherPreview = false; weatherPlace = place; A.save('weatherLocation', place); weatherError = ''; A.closeOverlay(); weather(); }
  A.apps.weather.render = weather;
  A.actions.weatherSaveCity = () => { const saved=A.load('weatherFavorites',[]); if(!saved.some(p=>placeKey(p)===placeKey(weatherPlace))) { if(!A.save('weatherFavorites',[{...weatherPlace},...saved].slice(0,20)))return; } A.actions.weatherCities(); A.toast('都市を保存済み'); };
  A.actions.weatherSavedCity = el => { const p=A.load('weatherFavorites',[]).find(p=>placeKey(p)===el.dataset.id);if(p)selectWeather(p); };
  A.actions.weatherRemoveCity = el => { if(A.save('weatherFavorites',A.load('weatherFavorites',[]).filter(p=>placeKey(p)!==el.dataset.id)))A.actions.weatherCities(); };
  A.actions.weatherRefresh = () => refreshWeather(true);
  A.actions.weatherSelect = el => selectWeather(presets[Number(el.dataset.value)]);
  A.actions.weatherLocate = async () => {
    const root = $('#live-weather'); A.toast('現在地の許可を確認中…');
    try { const place = await N.location(); if (A.current === 'weather' && root?.isConnected) selectWeather(place); } catch (e) { if (A.current === 'weather' && root?.isConnected) A.toast(N.errorText(e)); }
  };
  A.actions.weatherCities = () => {
    A.overlay(`${A.overlayTitle('都市を探す')}<div class="connected-overlay">${submitSearch('city-search', '都市名（東京・Parisなど）')}<p class="connected-caption">検索語をOpen-Meteoに送信</p><div id="city-results" aria-live="polite"></div><h3>よく使う都市</h3>${presets.map((p, i) => `<button class="list-row" data-action="weatherSelect" data-value="${i}">${esc(p.name)}</button>`).join('')}</div>`);
    $('.connected-overlay').insertAdjacentHTML('afterbegin',`<div class="pd-weather-favorites"><button class="connection-link" data-action="weatherSaveCity">＋ ${esc(weatherPlace.name)}を保存</button>${A.load('weatherFavorites',[]).filter(validPlace).map(p=>`<div class="pd-saved-place"><button data-action="weatherSavedCity" data-id="${placeKey(p)}">${esc(p.name)}</button><button data-action="weatherRemoveCity" data-id="${placeKey(p)}" aria-label="${esc(p.name)}を保存から削除">×</button></div>`).join('')}</div>`);
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
    let map, marker, userMarker, resize, selectedPlace=null;
    const controller = mapController = new AbortController();
    A.cleanups.push(() => { controller.abort(); resize?.disconnect(); if (map) { const center = map.getCenter(); mapPosition = [center.lat, center.lng]; mapLevel = map.getZoom(); map.remove(); } if (mapInstance === map) mapInstance = null; });
    const showPlace = p => {
      if (!map || !canvas.isConnected) return;
      const lat = Number(p.lat), lon = Number(p.lon); if (!Number.isFinite(lat) || !Number.isFinite(lon)) return;
      selectedPlace={lat,lon,display_name:p.display_name};
      marker?.remove(); marker = window.L.circleMarker([lat, lon], {radius: 10, color: '#fff', weight: 3, fillColor: '#477cc6', fillOpacity: 1, bubblingMouseEvents:false}).addTo(map);
      marker.bindPopup(document.createTextNode(p.display_name)).openPopup(); map.setView([lat, lon], 16);
      results.innerHTML = `<strong>${esc(p.display_name)}</strong><p>${lat.toFixed(5)}, ${lon.toFixed(5)}</p><div class="connection-toolbar">${N.link(`https://www.google.com/maps/dir/?api=1&destination=${lat},${lon}`, 'ここへの経路案内')}${N.link(`https://www.openstreetmap.org/?mlat=${lat}&mlon=${lon}#map=16/${lat}/${lon}`, '地図を開く')}<button class="connection-link" id="share-place">場所を共有</button></div><p class="connected-caption">経路案内：Google マップ</p>`;
      $('#share-place').onclick = () => N.share('場所を共有', p.display_name, `https://www.openstreetmap.org/?mlat=${lat}&mlon=${lon}#map=16/${lat}/${lon}`);
      $('#share-place').insertAdjacentHTML('afterend','<button class="connection-link" data-action="mapSavePlace">場所を保存</button>');
    };
    $('.connected-map-tools .connection-toolbar').insertAdjacentHTML('afterbegin','<button class="connection-link" data-action="mapSaved">保存した場所</button>');
    A.actions.mapSavePlace=()=>{if(!selectedPlace)return;const current=selectedPlace,saved=A.load('mapSavedPlaces',[]),existing=saved.find(p=>p.lat===current.lat&&p.lon===current.lon);A.form('場所を保存',`<label class="form-label">名前</label><input class="text-input" name="name" required maxlength="100" value="${esc(existing?.name||current.display_name.split(',')[0])}"><label class="form-label">分類</label><select class="text-input" name="category">${['お気に入り','行きたい','仕事'].map(c=>`<option ${existing?.category===c?'selected':''}>${c}</option>`).join('')}</select><label class="form-label">メモ</label><textarea class="text-input" name="note" rows="3" maxlength="400">${esc(existing?.note||'')}</textarea>`,v=>{if(!v.name.trim())return false;const item={...current,...v,name:v.name.trim(),id:existing?.id||A.id()},rows=existing?saved.map(p=>p.id===existing.id?item:p):[item,...saved];if(!A.save('mapSavedPlaces',rows))return false;A.toast('場所を保存済み');});};
    A.actions.mapSaved=()=>A.overlay(`${A.overlayTitle('保存した場所')}<div class="pd-menu">${A.load('mapSavedPlaces',[]).map(p=>`<div class="pd-saved-place"><button data-action="mapSavedOpen" data-id="${esc(p.id)}"><strong>${esc(p.name)}</strong><small>${esc(p.category||'')}${p.note?' · '+esc(p.note):''}</small></button><button data-action="mapSavedDelete" data-id="${esc(p.id)}" aria-label="${esc(p.name)}を削除">×</button></div>`).join('')||'<p>場所を選んで保存できます</p>'}</div>`);
    A.actions.mapSavedOpen=el=>{if(!map||!canvas.isConnected)return A.toast('地図の読み込みを待ってください');const p=A.load('mapSavedPlaces',[]).find(x=>x.id===el.dataset.id);if(p){A.closeOverlay();showPlace(p);}};
    A.actions.mapSavedDelete=el=>A.confirm('保存した場所を削除？','',()=>{if(A.save('mapSavedPlaces',A.load('mapSavedPlaces',[]).filter(p=>p.id!==el.dataset.id)))A.actions.mapSaved();});
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
      A.toast('現在地を取得中…');
      try {
        const p = await N.location(); if (A.current !== 'maps' || controller.signal.aborted || !canvas.isConnected || !map) return;
        userMarker?.remove(); userMarker = window.L.circleMarker([p.latitude, p.longitude], {radius: 8, color: '#fff', fillColor: '#337def', fillOpacity: 1}).addTo(map).bindPopup('現在地');
        map.setView([p.latitude, p.longitude], 16); results.innerHTML = stateBox('現在地を表示しました。位置には誤差があります。');
      } catch (error) { if (A.current === 'maps' && !controller.signal.aborted && results.isConnected) results.innerHTML = stateBox(N.errorText(error)); }
    };
    try {
      const L = await loadLeaflet(); if (!canvas.isConnected || controller.signal.aborted) return;
      map = mapInstance = L.map(canvas, {zoomControl: true}).setView(mapPosition, mapLevel);
      map.on('click',e=>showPlace({lat:e.latlng.lat,lon:e.latlng.lng,display_name:'ピン留めした場所'}));
      const tiles = L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {maxZoom: 19, attribution: '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener noreferrer">OpenStreetMap</a> contributors'}).addTo(map);
      let failed = false;
      tiles.on('tileerror', () => { if (!failed && results.isConnected) { failed = true; results.innerHTML = stateBox('地図タイルを取得できません。通信を確認して再読み込みしてください。', 'mapRetry') + N.link('https://www.openstreetmap.org/', 'OpenStreetMapを開く'); } });
      results.innerHTML = `<details class="ui-help"><summary>操作方法</summary><p>ドラッグ・ピンチで移動・拡大。地名や住所で検索。</p></details><p class="connected-caption">Nominatim / OpenStreetMap・現在地は許可時のみ</p>`;
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
    A.view(A.nav('ブラウザ', button('webSaved', '保存済み')) + `<div class="connected-browser-bar"><form id="web-form" class="connected-search"><input id="browser-url" class="text-input" aria-label="URLまたは検索語" placeholder="検索・URL" maxlength="2000" value="${esc(state.query || state.url || '')}"><button class="primary-button" type="submit">開く</button></form><div class="web-controls"><button data-action="webBack" ${browserIndex === 0 ? 'disabled' : ''} aria-label="戻る">‹</button><button data-action="webForward" ${browserIndex === browserHistory.length - 1 ? 'disabled' : ''} aria-label="進む">›</button><button data-action="webHome">ホーム</button><button data-action="webReload">再読込</button><select id="web-engine" aria-label="検索先"><option value="wiki">Wikipedia（アプリ内）</option><option value="google">Google（別タブ）</option><option value="bing">Bing（別タブ）</option><option value="duck">DuckDuckGo（別タブ）</option></select></div></div><div class="app-content connected-browser" id="web-content" aria-live="polite"></div>`);
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
      root.innerHTML = `<div class="connection-grid">${N.link('https://www.google.com/', 'Google')}${N.link('https://www.youtube.com/', 'YouTube')}${N.link('https://www3.nhk.or.jp/news/', 'NHK NEWS')}${N.link('https://ja.wikipedia.org/', 'Wikipedia')}</div><h3>履歴</h3>${browserHistory.filter(s => s.type !== 'home').slice(-10).reverse().map((s, i) => `<button class="list-row" data-history-item="${i}">${esc(s.title || s.query || s.url)}</button>`).join('') || '<p class="connected-caption">履歴なし</p>'}${button('webClearHistory', '履歴を消去')}<p class="connected-caption">検索語・URLを選択先へ送信。履歴は一時保存</p>`;
      const history = browserHistory.filter(s => s.type !== 'home').slice(-10).reverse(); root.querySelectorAll('[data-history-item]').forEach(el => el.onclick = () => browserNavigate(history[Number(el.dataset.historyItem)]));
    } else if (state.type === 'url') {
      root.innerHTML = `<h2>${esc(new URL(state.url).hostname)}</h2><p class="web-url">${esc(state.url)}</p><div class="connection-toolbar">${N.link(state.url, '外部で開く', 'primary-button')}${button('webBookmark', '保存')}${button('webShare', '共有')}</div><div class="connection-card">${button('webPreview', '制限付きプレビュー')}</div><div id="web-preview"></div>`;
    } else if (state.type === 'saved') {
      root.innerHTML = `<h1 class="app-title">保存したページ</h1>${webBookmarks.map((b, i) => `<div class="web-bookmark"><button class="list-row" data-bookmark-index="${i}"><span class="row-main"><strong>${esc(b.title)}</strong><small>${esc(b.url)}</small></span></button><button data-remove-bookmark="${i}" aria-label="保存を削除">×</button></div>`).join('') || stateBox('保存したページなし')}`;
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
        root.innerHTML = `<h2>「${esc(state.query)}」の検索結果</h2>${pages.map((p, i) => `<button class="web-result" data-wiki-result="${i}"><h3>${esc(p.title)}</h3><p>${esc(p.extract || 'タップして記事を読む')}</p></button>`).join('') || stateBox('記事が見つかりません。検索語を変えるか、Web検索を利用してください。')}${N.link('https://www.google.com/search?q=' + encodeURIComponent(state.query), 'Googleでも検索')}`;
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
    if (A.save('webBookmarks', next)) { webBookmarks = next; A.toast('ページを保存済み'); }
  };
  A.actions.webShare = () => { const s = browserHistory[browserIndex]; N.share(s.title || 'Webページ', '', s.url); };
  A.actions.webPreview = () => {
    const s = browserHistory[browserIndex]; if (!N.safeURL(s.url) || !$('#web-preview')) return;
    $('#web-preview').innerHTML = `<p class="connected-caption">表示不可・ログイン・決済は外部へ</p><iframe class="web-frame" title="外部サイトの制限付きプレビュー" sandbox="allow-scripts allow-forms allow-popups" referrerpolicy="no-referrer" src="${esc(s.url)}"></iframe>`;
  };
  A.updateWidgets();
})();
