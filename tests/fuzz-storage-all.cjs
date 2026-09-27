'use strict';
// Seeds EVERY aura.* key with the same malformed variant at once, then opens every app.
// Usage: node tests/fuzz-storage-all.cjs [variant,...]
const {chromium}=require('playwright');const fs=require('fs');
const keys=[...new Set(fs.readdirSync('js').filter(f=>f.endsWith('.js')).flatMap(f=>[...fs.readFileSync('js/'+f,'utf8').matchAll(/load\('([A-Za-z0-9]+)'/g)].map(m=>m[1])))];
const variants={obj:{a:1},nul:null,str:'x',num:-1,neg:-1e308,arr:[null,{},1,'x'],arrobj:[{id:1,title:5,name:null,date:'x',time:'x',days:'x',items:{},strokes:'x'}],deep:{tiles:[1,2],score:'x',history:[{}],state:{},records:null,board:'x',cells:[null],grid:{},list:5,items:'x'},bool:true};
const pick=(process.argv[2]||Object.keys(variants).join(',')).split(',');
(async()=>{
 const browser=await chromium.launch();const found=new Map();
 for(const vn of pick){const v=variants[vn];
  const ctx=await browser.newContext({viewport:{width:390,height:844}});
  await ctx.route(/^https?:\/\/(?!127\.0\.0\.1)/,r=>r.abort());
  const p=await ctx.newPage();const errs=[];p.on('pageerror',e=>errs.push(e.message));
  await p.addInitScript(([ks,v])=>{if(!sessionStorage.getItem('seeded')){for(const k of ks)localStorage.setItem('aura.'+k,JSON.stringify(v));sessionStorage.setItem('seeded','1');}},[keys,v]);
  await p.goto(process.env.AURA_TEST_URL||'http://127.0.0.1:8765/');await p.waitForTimeout(400);
  for(const e of errs)found.set('boot | '+e.slice(0,160),vn);
  const apps=await p.evaluate(()=>Object.keys(Aura.apps));
  for(const a of apps){const before=errs.length;
   try{await p.evaluate(a=>{Aura.open(a)},a);await p.waitForTimeout(120);
     // click first few non-destructive buttons inside the app
     const n=await p.evaluate(()=>document.querySelectorAll('.app-screen [data-action], #app [data-action]').length);
     for(let i=0;i<Math.min(n,12);i++){await p.evaluate(i=>{const b=[...document.querySelectorAll('.app-screen [data-action], #app [data-action]')][i];const act=b?.dataset.action||'';if(b&&!/Delete|Clear|Reset|Purge|close|back|home|Remove|Download|Export|Share|Copy/i.test(act))b.click();},i);await p.waitForTimeout(20);}
   }catch(e){errs.push('EVAL '+e.message.split('\n')[0]);}
   for(const e of errs.slice(before)){const s=a+' | '+e.slice(0,160);if(!found.has(s))found.set(s,vn);}
   await p.evaluate(()=>{try{Aura.closeOverlay?.();Aura.goHome?.();}catch{}});}
  await ctx.close();
 }
 for(const [s,k] of found)console.log(k.padEnd(8),s);
 console.log(`DONE ${found.size} (keys ${keys.length})`);await browser.close();
})();
