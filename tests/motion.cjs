// Run with Playwright + pngjs: node tests/motion.cjs [label]
// Real browser screenshots and deterministic animation samples; no external APIs.
const {chromium}=require('playwright');
const {PNG}=require('pngjs');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const {execFileSync}=require('node:child_process');
const label=process.argv[2]||'motion';
assert.match(label,/^[a-z0-9-]+$/);
const root=path.resolve(__dirname,'..'),out=path.join(root,'previews',label);
fs.mkdirSync(out,{recursive:true});
const url=process.env.AURA_TEST_URL||'http://127.0.0.1:8765/';
const origin=new URL(url).origin;
const baselineRef=process.env.AURA_BASELINE_REF||'6cfdcba';
const css=['style','icon-motion'].map(name=>fs.readFileSync(path.join(root,`css/${name}.css`),'utf8')).join('\n');
const diff=(a,b)=>{a=PNG.sync.read(a);b=PNG.sync.read(b);assert.equal(a.data.length,b.data.length);let pixels=0;for(let i=0;i<a.data.length;i+=4)if([0,1,2].some(c=>Math.abs(a.data[i+c]-b.data[i+c])>8))pixels++;return pixels/(a.width*a.height);};
const report={checks:[],screenshots:[],staticDifferences:{},motionDifferences:{}};
(async()=>{
 const browser=await chromium.launch();
 const errors=[];
 const page=await browser.newPage({viewport:{width:390,height:844},deviceScaleFactor:2});
 page.on('pageerror',e=>errors.push(e.message));
 const offline=async p=>p.route('**/*',r=>new URL(r.request().url()).origin===origin?r.continue():r.abort());
 const check=(name,condition)=>{assert.ok(condition,name);report.checks.push(name);console.log('PASS',name);};
 const shot=async(p,name)=>{await p.screenshot({path:path.join(out,name+'.png'),animations:'allow',scale:'css'});report.screenshots.push(name);};
 try {
  await offline(page);await page.goto(url);
  await page.waitForFunction(()=>Aura.iconMotionPanel);
  check('Existing users retain static mode',await page.evaluate(()=>Aura.settings.iconMotion==='static'));
  await page.locator('.home-motion-button').click();
  await page.locator('[data-action=chooseIconMotion][data-value=fhd]').click();
  check('Mode switch is accessible and persisted',await page.locator('[data-value=fhd]').getAttribute('aria-pressed')==='true'&&await page.evaluate(()=>Aura.load('settings',{}).iconMotion==='fhd'));
  await page.evaluate(()=>{Aura.save('notes',[{id:'motion-preserve',title:'Keep me',body:'Existing notes',updated:1}]);Aura.settings.iconStyle='glass';Aura.applySettings();});
  await page.reload();
  check('Mode reload preserves style and user data',await page.evaluate(()=>Aura.settings.iconMotion==='fhd'&&Aura.settings.iconStyle==='glass'&&Aura.load('notes',[])[0].id==='motion-preserve'));
  await page.evaluate(()=>{Aura.settings.iconStyle='standard';Aura.applySettings();});
  await page.waitForFunction(()=>document.querySelector('#home-screen .motion-cloud').getAnimations().some(a=>a.playState==='running'));
  const clockNode=await page.locator('#home-screen .app-clock-second').elementHandle();
  await page.waitForTimeout(1100);
  check('Live clock updates without replacing artwork',await clockNode.evaluate(el=>el.isConnected));
  check('Offscreen icons are paused',await page.locator('#app-grid [data-app-art=sketch] .icon-motion').evaluateAll(els=>els.every(el=>getComputedStyle(el).animationPlayState==='paused')));
  await page.locator('.home-motion-button').click();
  await page.waitForTimeout(100);
  check('Obscured home animation pauses',await page.locator('#home-screen .icon-motion').evaluateAll(els=>els.every(el=>getComputedStyle(el).animationPlayState==='paused')));
  await page.locator('[data-action=iconMotionGallery]').click();
  check('Gallery offers all 30 original identities',await page.locator('.motion-gallery>button').count()===30);
  await page.locator('[data-action=stepIconMotion][data-step="1"]').click();
  check('Next button selects weather and updates counter',await page.locator('#motion-detail [data-app-art=weather]').count()===1&&(await page.locator('#motion-index').innerText())==='04 / 30');
  await page.locator('[data-action=stepIconMotion][data-step="-1"]').click();
  check('Previous button restores camera detail',await page.locator('#motion-detail [data-app-art=camera]').count()===1);
  await page.locator('.motion-gallery [data-id=weather]').click();
  check('Thumbnail selection updates enlarged detail',await page.locator('#motion-detail [data-app-art=weather]').count()===1);
  await page.locator('[data-action=toggleGalleryMotion]').click();
  check('Static choice removes decorative animations',await page.locator('.icon-motion').evaluateAll(els=>els.every(el=>!el.getAnimations().length)));
  await page.locator('[data-action=toggleGalleryMotion]').click();
  await page.emulateMedia({reducedMotion:'reduce'});
  check('OS reduced motion overrides FHD',await page.locator('.icon-motion').evaluateAll(els=>els.every(el=>!el.getAnimations().length)));
  await page.emulateMedia({reducedMotion:'no-preference'});
  await page.evaluate(()=>{Aura.settings.reduceMotion=true;Aura.applySettings();});
  check('App reduced motion overrides FHD',await page.locator('.icon-motion').evaluateAll(els=>els.every(el=>!el.getAnimations().length)));
  check('Paused reason is explained',(await page.locator('.motion-status').innerText()).includes('停止中'));
  await page.evaluate(()=>{Aura.settings.reduceMotion=false;Aura.applySettings();});
  // Simulate a visibility event deterministically; OS background throttling varies in CI.
  await page.evaluate(()=>{Object.defineProperty(document,'hidden',{configurable:true,get:()=>true});document.dispatchEvent(new Event('visibilitychange'));});
  check('Background visibility pauses all motion',await page.locator('.icon-motion').evaluateAll(els=>els.every(el=>getComputedStyle(el).animationPlayState==='paused')));
  await page.evaluate(()=>{delete document.hidden;document.dispatchEvent(new Event('visibilitychange'));Aura.home();Aura.actions.editHome();});
  check('Home editing pauses motion without moving targets',await page.locator('#home-screen .icon-motion').evaluateAll(els=>els.every(el=>getComputedStyle(el).animationPlayState==='paused')));
  await page.evaluate(()=>{Aura.actions.finishEditing();Aura.lock();});
  check('Lock screen pauses the home',await page.locator('#home-screen .icon-motion').evaluateAll(els=>els.every(el=>getComputedStyle(el).animationPlayState==='paused')));
  await page.evaluate(()=>Aura.home());
  for(const v of [{width:320,height:568},{width:390,height:844},{width:844,height:390},{width:1920,height:1080}]){
   await page.setViewportSize(v);
   for(const screen of ['home','panel','gallery']){
    await page.evaluate(which=>{Aura.home();if(which==='panel')Aura.actions.iconMotion();if(which==='gallery')Aura.actions.iconMotionGallery();},screen);
    await page.waitForTimeout(150);
    await shot(page,`${screen}-${v.width}`);
    check(`${screen} at ${v.width}px has no horizontal overflow`,await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth&&(!document.querySelector('#overlay').hidden?document.querySelector('#overlay').scrollWidth<=innerWidth:true)));
   }
  }
  await page.setViewportSize({width:390,height:844});
  await page.evaluate(()=>{Aura.actions.iconMotionGallery();Aura.actions.inspectIconMotion({dataset:{id:'notes'}});});
  await page.locator('#motion-detail [data-app=notes]').click();
  check('Atelier opens the real selected app',await page.evaluate(()=>Aura.current==='notes'));
  await page.evaluate(()=>{Aura.home();Aura.spotlight();});
  check('Search icons use the same motion artwork',await page.locator('#spotlight-results .app-artwork .icon-motion').count()>30);
  await page.evaluate(()=>{Aura.closeOverlay();Aura.library();});
  check('Library icons retain high-definition artwork',await page.locator('#overlay .app-artwork').count()===30);
  const apps=await page.evaluate(()=>Object.values(Aura.apps).map(a=>({...a,svg:Aura.appIcon(a.id,new Date(2026,8,20,10,9,30))})));
  const baseline=await browser.newPage();await offline(baseline);
  await baseline.route('**/js/core.js?*',r=>r.fulfill({contentType:'text/javascript',body:execFileSync('git',['show',`${baselineRef}:js/core.js`],{cwd:root,encoding:'utf8'})}));
  await baseline.route('**/js/icon-motion.js?*',r=>r.fulfill({contentType:'text/javascript',body:''}));
  await baseline.goto(url);
  const oldApps=await baseline.evaluate(()=>Object.values(Aura.apps).map(a=>({...a,svg:Aura.appIcon(a.id,new Date(2026,8,20,10,9,30))})));
  await baseline.close();
  const proof=await browser.newPage({viewport:{width:1920,height:1080},deviceScaleFactor:1});
  const tile=a=>`<span class="app-icon" style="background:${a.color}">${a.svg}</span>`;
  const styles=`body{height:auto;overflow:auto;background:var(--bg,#edf0ed);color:var(--fg,#293d42);padding:36px 50px;font-family:Arial,sans-serif}header{display:flex;justify-content:space-between;align-items:end;border-bottom:1px solid #88999944;margin:0 0 28px;padding:0 0 18px}h1{font-size:32px;letter-spacing:2px;margin:0;line-height:1.3}header p{font-size:11px;letter-spacing:2px;margin:10px 0 0}header small{font-size:12px;color:#788c8a}main{display:grid;grid-template-columns:repeat(6,1fr);gap:21px 25px}.cell{display:flex;flex-direction:column;align-items:center;gap:9px;min-width:0}.cell .app-icon{width:128px;height:128px;border-radius:26%;box-shadow:0 9px 16px -10px #152c4277,inset 0 1px 1px #fff7}.cell p{font-size:11px;letter-spacing:1px;margin:0;color:inherit}.icon-motion{--motion-play:paused}footer{margin-top:22px;font-size:9px;letter-spacing:2px;color:#78908b}`;
  const doc=(content,extra='',mode='fhd',style='standard')=>`<!doctype html><html data-icon-motion="${mode}" data-icon-style="${style}"><head><meta charset="utf-8"><style>${css}\n${styles}\n${extra}</style></head><body><header><div><h1>FHD MOVE APP</h1><p>AURA / PRECISION VECTOR MOTION</p></div><small>30 ORIGINAL IDENTITIES · ${style.toUpperCase()}</small></header><main>${content}</main><footer>ACTUAL PRODUCTION SVG + CSS / BROWSER-RENDERED MOTION PROOF</footer></body></html>`;
  const pose=async(t)=>proof.evaluate(time=>{document.getAnimations().forEach(a=>{a.pause();a.currentTime=time;});},t);
  const cards=apps=>apps.map(a=>`<div class="cell">${tile(a)}<p>${a.id}</p></div>`).join('');
  // Exact static optical regression against main, one 400px image per app.
  await proof.setViewportSize({width:400,height:400});
  const isolated='body{padding:0;background:transparent}header,footer,.cell p{display:none}main{display:block}.cell .app-icon{width:400px;height:400px;box-shadow:none}';
  for(let i=0;i<apps.length;i++){
   await proof.setContent(doc(cards([oldApps[i]]),isolated,'static'));
   const old=await proof.screenshot();
   await proof.setContent(doc(cards([apps[i]]),isolated,'static'));
   const current=await proof.screenshot();
   report.staticDifferences[apps[i].id]=diff(old,current);
   assert.ok(report.staticDifferences[apps[i].id]<.002,`Static artwork changed: ${apps[i].id}`);
   await proof.setContent(doc(cards([apps[i]]),isolated));await pose(200);
   const first=await proof.screenshot();await pose(1900);const second=await proof.screenshot();
   report.motionDifferences[apps[i].id]=diff(first,second);
   if(apps[i].id!=='clock')assert.ok(report.motionDifferences[apps[i].id]>.0001,`No visible motion: ${apps[i].id}`);
  }
  check('All 30 static icons preserve original optical detail',true);
  check('All decorative icons visibly move between sampled frames',true);
  // Six theme/style combinations, three actual frames each, in full HD.
  await proof.setViewportSize({width:1920,height:1080});
  for(const theme of ['light','dark'])for(const style of ['standard','glass','tinted'])for(const t of [0,1700,3900]){
   const html=doc(cards(apps),theme==='dark'?'body{--bg:#16262e;--fg:#e0e9e6}':'','fhd',style);
   await proof.setContent(html);await pose(t);
   await shot(proof,`sheet-${theme}-${style}-${t}`);
   if(t===0)fs.writeFileSync(path.join(out,`sheet-${theme}-${style}.html`),html);
  }
  // 30 films strips x 6 sampled phases = 180 enlarged motion specimens.
  await proof.setViewportSize({width:1920,height:430});
  for(const a of apps){
   const variants=await page.evaluate(id=>Array.from({length:6},()=>Aura.appIcon(id,new Date(2026,8,20,10,9,30))),a.id);
   await proof.setContent(doc(variants.map((svg,i)=>`<div class="cell">${tile({...a,svg})}<p>${a.id} / ${(i*1.2).toFixed(1)} s</p></div>`).join(''),'.cell .app-icon{width:220px;height:220px}'));
   await proof.evaluate(()=>document.querySelectorAll('.cell').forEach((cell,i)=>cell.getAnimations({subtree:true}).forEach(a=>{a.pause();a.currentTime=i*1200;})));
   await shot(proof,`strip-${a.id}`);
  }
  check('No uncaught browser errors',errors.length===0);
  await proof.close();
 } finally {fs.writeFileSync(path.join(out,'report.json'),JSON.stringify(report,null,2));await browser.close();}
 console.log(`RESULT: ${report.checks.length} checks, ${report.screenshots.length} screenshots; ${out}`);
})().catch(e=>{console.error(e);process.exitCode=1;});
