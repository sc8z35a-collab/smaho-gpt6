// NODE_PATH=<playwright modules> node tests/icon-visual.cjs [before|after]
// Reproducible, offline visual proofs rendered from the production SVG and CSS.
const {chromium} = require('playwright');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const label = process.argv[2] || 'after';
assert.match(label, /^[a-z0-9-]+$/);
const out = path.resolve(__dirname, '../previews', label);
fs.mkdirSync(out, {recursive:true});
const css = fs.readFileSync(path.resolve(__dirname, '../css/style.css'), 'utf8');
const url = process.env.AURA_TEST_URL || 'http://127.0.0.1:8765/';
(async () => {
  const browser = await chromium.launch({headless:true});
  try {
    const page = await browser.newPage({viewport:{width:390,height:844},deviceScaleFactor:2});
    const errors = [];
    page.on('pageerror', e => errors.push(e.message));
    await page.route('**/*', route => new URL(route.request().url()).origin === new URL(url).origin ? route.continue() : route.abort());
    await page.goto(url);
    await page.waitForFunction(() => window.Aura?.appIcon && document.querySelectorAll('#home-screen .app-artwork').length === 30);
    const apps = await page.evaluate(() => Object.values(Aura.apps).map(app => ({id:app.id,name:app.name,color:app.color,svg:Aura.appIcon(app.id,new Date(2026,8,19,10,9,30))})));
    assert.equal(apps.length,30);
    for (const viewport of [{width:390,height:844},{width:320,height:568},{width:844,height:390}]) {
      await page.setViewportSize(viewport);
      await page.screenshot({path:path.join(out,`home-${viewport.width}.png`)});
      assert.equal(await page.locator('#home-screen .app-artwork').count(),30);
    }
    assert.deepEqual(errors,[]);
    await page.close();
    const proof = await browser.newPage({viewport:{width:1536,height:1200},deviceScaleFactor:1});
    const tile = app => `<span class="app-icon ${app.id}-icon" style="background:${app.color}">${app.svg}</span>`;
    const card = app => `<article><div class="app-launcher">${tile(app)}</div><h2>${app.name}</h2><p>${app.id}</p></article>`;
    const styles = `body{height:auto;overflow:auto;min-height:100vh;background:var(--proof-bg,#f2f0ec);color:var(--proof-ink,#263244);padding:56px;font-family:Arial,sans-serif}*{animation:none!important;transition:none!important}header{margin:0 0 42px;border-bottom:1px solid #8893a433;padding-bottom:28px}header p{font-size:12px;letter-spacing:3px;color:#7b8795}h1{font-size:38px;letter-spacing:-1px;line-height:1.2;margin:12px 0}header small{font-size:14px;color:#8b94a0}main{display:grid;grid-template-columns:repeat(6,1fr);gap:38px 24px}article{text-align:center;min-width:0}article .app-launcher{display:flex;align-items:center;pointer-events:none}article .app-icon{width:var(--tile,176px);height:var(--tile,176px);border-radius:26%;box-shadow:0 12px 24px -12px #14243c55,inset 0 1px 1px #ffffff70}article h2{font-size:14px;font-weight:500;margin:16px 0 6px}article p{font-size:10px;color:#8a94a0;letter-spacing:1px;margin:0}footer{margin-top:45px;font-size:11px;color:#8893a0;letter-spacing:2px}`;
    const doc = (title, content, extra='', style='classic') => `<!doctype html><html lang="ja" data-icon-style="${style}"><head><meta charset="utf-8"><title>${title}</title><style>${css}\n${styles}\n${extra}</style></head><body><header><p>AURA / ICON ATELIER</p><h1>${title}</h1><small>30 vector identities · fixed time 10:09:30 · ${label} proof</small></header><main>${content}</main><footer>PRODUCTION SVG / BROWSER-RENDERED IMAGE PROOF</footer></body></html>`;
    const render = async (name, html) => {
      fs.writeFileSync(path.join(out,name+'.html'),html);
      await proof.setContent(html);
      // Every local paint reference must resolve in this SVG, not another instance.
      assert.equal(await proof.locator('svg.app-artwork').evaluateAll(svgs => svgs.flatMap(svg => [...svg.querySelectorAll('*')].flatMap(el => [...el.attributes].flatMap(a => [...a.value.matchAll(/url\(#([^)]+)\)/g)].filter(m => !svg.querySelector(`[id="${m[1]}"]`))))).length),0);
      const ids = await proof.locator('[id]').evaluateAll(els => els.map(el => el.id));
      assert.equal(new Set(ids).size,ids.length,'SVG IDs must be unique across instances');
      await proof.screenshot({path:path.join(out,name+'.png'),fullPage:true});
    };
    for (const [theme,bg,ink] of [['light','#f2f0ec','#263244'],['dark','#151b28','#eef2f8']]) {
      for (const style of ['classic','glass','tinted']) {
        await render(`${theme}-${style}`,doc(`${theme} / ${style}`,apps.map(card).join(''),`body{--proof-bg:${bg};--proof-ink:${ink}}`,style));
      }
    }
    for (let i=0;i<5;i++) {
      await render(`detail-${i+1}`,doc(`Detail study / 0${i+1}`,apps.slice(i*6,i*6+6).map(card).join(''),'main{grid-template-columns:repeat(3,1fr);gap:38px}body{--tile:400px}'));
    }
    // Re-render each instance for the size matrix to preserve unique paint IDs.
    const source = await browser.newPage();
    await source.route('**/*',route => new URL(route.request().url()).origin === new URL(url).origin ? route.continue() : route.abort());
    await source.goto(url);
    const matrix = await source.evaluate(() => Object.values(Aura.apps).map(a => ({...a,variants:[24,32,48,60,80,128].map(size=>({size,svg:Aura.appIcon(a.id,new Date(2026,8,19,10,9,30))}))})));
    await source.close();
    await render('size-matrix',doc('Optical size / 24–128 px',matrix.map(a=>`<article class="size-row"><h2>${a.name}</h2>${a.variants.map(v=>`<div class="app-launcher"><span class="app-icon" style="background:${a.color};width:${v.size}px;height:${v.size}px">${v.svg}</span><p>${v.size}px</p></div>`).join('')}</article>`).join(''),'main{display:block}.size-row{display:grid;grid-template-columns:180px repeat(6,1fr);align-items:center;min-height:160px;border-bottom:1px solid #8893a422}.size-row .app-launcher{gap:10px}'));
    if (label !== 'before') {
      await proof.setViewportSize({width:1024,height:1024});
      for (const app of apps) {
        await proof.setContent(doc(app.name,card(app),'body{padding:0;background:transparent}header,footer,article h2,article p{display:none}main{display:block}article .app-icon{width:1024px;height:1024px;border-radius:26%;box-shadow:none}'));
        await proof.screenshot({path:path.join(out,app.id+'-1024.png'),omitBackground:true});
        fs.writeFileSync(path.join(out,app.id+'.svg'),app.svg);
      }
    }
    console.log(`PASS: 30 identities, 6 theme proofs, 5 detail sheets, 180 size samples, 3 home viewports; exports: ${out}`);
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode=1; });
