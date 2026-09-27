'use strict';
// Click-every-control fuzzer: opens each app and activates every visible control once,
// reporting uncaught page errors. External requests are blocked; destructive actions skipped.
// Run: python3 -m http.server 8765 & node tests/fuzz-click.cjs [app,app]
const {chromium}=require('playwright');
const apps=(process.argv[2]||'calendar,photos,camera,weather,mail,clock,maps,notes,reminders,files,calculator,settings,games,health,wallet,recorder,today,focus,habits,expenses,shopping,journal,contacts,converter,reading,sketch,phone,safari,messages,music').split(',');
(async()=>{
 const browser=await chromium.launch();const found=new Map();
 for(const app of apps){
  const ctx=await browser.newContext({viewport:{width:390,height:844}});
  await ctx.route(/^https?:\/\/(?!127\.0\.0\.1)/,r=>r.abort());
  const p=await ctx.newPage();let errs=[];p.on('pageerror',e=>errs.push(e.message));p.on('dialog',d=>d.dismiss());
  await p.goto(process.env.AURA_TEST_URL||'http://127.0.0.1:8765/');await p.waitForTimeout(200);
  await p.evaluate(()=>{Aura.download=()=>{};window.open=()=>null;const click=HTMLInputElement.prototype.click;HTMLInputElement.prototype.click=function(){if(this.type!=='file')return click.call(this);};});
  await p.evaluate(()=>{const d=new Date(),k=`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;Aura.save('contacts',[{id:'c1',name:'山田',phone:'090',email:'a@b.c'}]);Aura.save('journal',[{id:'j1',date:k,title:'t',body:'b',mood:'3'}]);Aura.save('reading',[{id:'b1',title:'本',author:'a',total:100,page:10}]);Aura.save('shopping',[{id:'s1',name:'牛乳',quantity:1,price:100,done:false}]);Aura.save('habits',[{id:'h1',name:'散歩',days:[k]}]);Aura.save('expenses',[{id:'e1',kind:'expense',amount:500,category:'food',date:k,note:'昼'}]);});
  await p.evaluate(a=>Aura.open(a),app);
  const visited=new Set();
  for(let round=0;round<80;round++){
   let sig=null;
   try{sig=await p.evaluate(visited=>{
    const els=[...document.querySelectorAll('#app-screen [data-action], #overlay [data-action], #app-screen button, #overlay button')].filter(el=>el.getClientRects().length&&!el.disabled);
    for(const el of els){const s=(el.dataset.action||el.textContent.trim().slice(0,20))+'|'+(el.dataset.id||el.dataset.value||'');if(visited.includes(s))continue;
     if(/Delete|Reset|reset|Clear|Erase|lock|^home$|fullscreen|forgetLocation|Import|Retry|Purge/.test(el.dataset.action||''))continue;
     el.click();return s;}
    return null;},[...visited]);}catch(e){errs.push('EVAL '+e.message.split('\n')[0]);}
   if(!sig)break;visited.add(sig);await p.waitForTimeout(50);
   for(const e of errs)found.set(app+' | '+e.slice(0,150),sig);errs=[];
   if(await p.evaluate(()=>Aura.current===null))await p.evaluate(a=>Aura.open(a),app);
  }
  await ctx.close();
 }
 for(const [k,v] of found)console.log(k,'  <-',v);
 console.log(`DONE ${found.size} distinct errors`);
 await browser.close();
})();
