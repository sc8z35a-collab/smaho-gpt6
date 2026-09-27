'use strict';
// Damaged-storage fuzzer: seeds one aura.* key with malformed JSON values, then opens
// the given apps / game views and reports uncaught errors. Usage:
//   node tests/fuzz-storage.cjs key1,key2 [app,app|games:2048,...]
const {chromium}=require('playwright');
const keys=(process.argv[2]||'').split(',').filter(Boolean);
const targets=(process.argv[3]||'games:2048,games:snake,games:memory,games:blocks,games:mines,games:reversi,games:breaker,games:sudoku,games').split(',');
const variants={obj:{a:1},nul:null,str:'x',num:-1,arr:[null,{},1],deep:{tiles:[1,2],score:'x',history:[{}],state:{},records:null,board:'x',cells:[null],grid:{}}};
(async()=>{
 const browser=await chromium.launch();const found=new Map();
 for(const key of keys)for(const [vn,v] of Object.entries(variants)){
  const ctx=await browser.newContext({viewport:{width:390,height:844}});
  await ctx.route(/^https?:\/\/(?!127\.0\.0\.1)/,r=>r.abort());
  const p=await ctx.newPage();const errs=[];p.on('pageerror',e=>errs.push(e.message));
  await p.addInitScript(([k,v])=>{if(!sessionStorage.getItem('seeded')){localStorage.setItem('aura.'+k,JSON.stringify(v));sessionStorage.setItem('seeded','1');}},[key,v]);
  await p.goto(process.env.AURA_TEST_URL||'http://127.0.0.1:8765/');await p.waitForTimeout(250);
  const boot=errs.length;for(const e of errs)found.set('boot | '+e.slice(0,140),key+'='+vn);
  for(const t of targets){const [app,view]=t.split(':');const before=errs.length;
   try{await p.evaluate(([a,v])=>Aura.open(a,v),[app,view]);await p.waitForTimeout(80);}catch(e){errs.push('EVAL '+e.message.split('\n')[0]);}
   for(const e of errs.slice(Math.max(before,boot))){const s=t+' | '+e.slice(0,140);if(!found.has(s))found.set(s,key+'='+vn);}}
  await ctx.close();
 }
 for(const [s,k] of found)console.log(k.padEnd(28),s);
 console.log(`DONE ${found.size}`);await browser.close();
})();
