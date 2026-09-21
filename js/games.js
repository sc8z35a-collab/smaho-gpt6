'use strict';
(() => {
const A=window.Aura,$=A.$,icon=A.icon;
let gamePage='library',gameCleanups=[];
const stopGame=()=>{gameCleanups.splice(0).forEach(fn=>fn());};
A.stopLegacyGames=stopGame;
const listenKey=fn=>{document.addEventListener('keydown',fn);gameCleanups.push(()=>document.removeEventListener('keydown',fn));};
function swipe(el,callback){let start=null;el.addEventListener('pointerdown',e=>{start={x:e.clientX,y:e.clientY};el.setPointerCapture(e.pointerId);});el.addEventListener('pointerup',e=>{if(!start)return;const dx=e.clientX-start.x,dy=e.clientY-start.y;start=null;if(Math.max(Math.abs(dx),Math.abs(dy))<17)return;callback(Math.abs(dx)>Math.abs(dy)?dx>0?'right':'left':dy>0?'down':'up');});el.addEventListener('pointercancel',()=>start=null);}
function library(){stopGame();gamePage='library';A.statusTheme(false);A.view(A.nav('ゲーム')+`<div class="app-content"><h1 class="app-title">ゲーム</h1><p class="app-subtitle"></p><div class="games-hero"><small>SMALL GAMES. BIG LITTLE JOYS.</small><h2>遊び心を、<br>ポケットに。</h2><p>シンプルだから、奥が深い。</p><span class="hero-block">2048</span></div><p class="section-label">YOUR LITTLE ARCADE</p><button class="game-card" data-action="gameOpen" data-game="2048"><span class="game-cover g2048">2048</span><div><strong>2048</strong><p>重ねて、つなげて、その先へ。</p><small>PUZZLE · BEST ${A.load('2048best',0).toLocaleString()}</small></div><span>›</span></button><button class="game-card" data-action="gameOpen" data-game="snake"><span class="game-cover gsnake">⌁</span><div><strong>Little Snake</strong><p>懐かしくて、新しい。</p><small>ARCADE · BEST ${A.load('snakeBest',0)}</small></div><span>›</span></button><button class="game-card" data-action="gameOpen" data-game="memory"><span class="game-cover gmemory">✿</span><div><strong>Memory Garden</strong><p>同じかたちを、見つけよう。</p><small>MEMORY · ${A.load('memoryBest',0)?'BEST '+A.load('memoryBest',0)+' MOVES':'TAKE YOUR TIME'}</small></div><span>›</span></button><p class="notes-footer">最高記録は端末内に保存</p></div>`);}
A.apps.games.render=arg=>{A.cleanups.push(stopGame);if(['2048','snake','memory'].includes(arg))openGame(arg);else library();};
A.actions.gamesLibrary=library;A.actions.gameOpen=el=>openGame(el.dataset.game);
function openGame(id){stopGame();gamePage=id;A.statusTheme(false);if(id==='2048')game2048();if(id==='snake')gameSnake();if(id==='memory')gameMemory();}
// 2048 — canonical single-merge-per-move rules, local progress, undo.
const saved2048=A.load('2048state',null);
let tiles=saved2048?.tiles?.length===16?saved2048.tiles:Array(16).fill(0),score=saved2048?.score||0,best=A.load('2048best',0),undo=null,won=false;
function spawn(){const empty=tiles.map((v,i)=>v===0?i:-1).filter(i=>i>=0);if(empty.length)tiles[empty[Math.floor(Math.random()*empty.length)]]=Math.random()<.9?2:4;}
if(!tiles.some(Boolean)){spawn();spawn();}
function save2048(){best=Math.max(best,score);A.save('2048best',best);A.save('2048state',{tiles,score});}
function mergeLine(line){const nonzero=line.filter(Boolean),out=[];let gain=0;for(let i=0;i<nonzero.length;i++){if(nonzero[i]===nonzero[i+1]){const value=nonzero[i]*2;out.push(value);gain+=value;i++;}else out.push(nonzero[i]);}while(out.length<4)out.push(0);return {line:out,gain};}
function movable(){if(tiles.includes(0))return true;for(let r=0;r<4;r++)for(let c=0;c<4;c++){const i=r*4+c;if(c<3&&tiles[i]===tiles[i+1])return true;if(r<3&&tiles[i]===tiles[i+4])return true;}return false;}
function move2048(direction){if(gamePage!=='2048'||!$('#overlay').hidden)return;const before=[...tiles],beforeScore=score;let gain=0;for(let row=0;row<4;row++){const indices=Array.from({length:4},(_,col)=>direction==='left'?row*4+col:direction==='right'?row*4+(3-col):direction==='up'?col*4+row:(3-col)*4+row);const result=mergeLine(indices.map(i=>tiles[i]));indices.forEach((i,k)=>tiles[i]=result.line[k]);gain+=result.gain;}if(before.every((v,i)=>v===tiles[i]))return;undo={tiles:before,score:beforeScore};score+=gain;spawn();save2048();render2048();A.haptic();if(!won&&tiles.includes(2048)){won=true;A.toast('2048達成');}}
function game2048(){A.view(A.nav('2048',`<button data-action="gameHelp" aria-label="遊び方">?</button>`,'gamesLibrary','ゲーム')+`<div class="app-content"><div class="game-heading"><h2>2048<span style="font-size:13px;margin-left:5px;letter-spacing:0">.</span></h2><div class="game-scores"><div class="score-badge"><small>SCORE</small><strong id="score-2048">${score}</strong></div><div class="score-badge" style="background:#b7a58e"><small>BEST</small><strong id="best-2048">${best}</strong></div></div></div><p class="game-instructions">スワイプ / 矢印キー</p><div class="board-2048" id="board-2048" aria-label="2048の盤面" tabindex="0"></div><div class="game-toolbar"><button data-action="undo2048">↶ 一手戻す</button><button data-action="restart2048">↻ もう一度</button></div><div class="game-status" id="status-2048" role="status"></div><div class="direction-pad" style="margin-top:10px">${[['up','↑'],['left','←'],['down','↓'],['right','→']].map(([d,s])=>`<button data-action="move2048" data-value="${d}" aria-label="${d}" style="color:#9c8b75;background:#e9e2d8;border-color:#ded4c6">${s}</button>`).join('')}</div><p class="notes-footer"></p></div>`);render2048();swipe($('#board-2048'),move2048);listenKey(e=>{const d={ArrowLeft:'left',ArrowRight:'right',ArrowUp:'up',ArrowDown:'down'}[e.key];if(d&&$('#overlay').hidden){e.preventDefault();move2048(d);}});}
function render2048(){if(!$('#board-2048'))return;$('#board-2048').innerHTML=tiles.map(v=>`<span class="tile-2048" data-value="${v}" data-large="${v>=128}">${v||''}</span>`).join('');$('#score-2048').textContent=score;$('#best-2048').textContent=best;$('#status-2048').textContent=!movable()?'終了・一手戻せます':tiles.some(v=>v>=2048)?'2048達成':'';}
A.actions.move2048=el=>move2048(el.dataset.value);A.actions.undo2048=()=>{if(!undo)return A.toast('戻せる手がありません');tiles=[...undo.tiles];score=undo.score;undo=null;save2048();render2048();};A.actions.restart2048=()=>A.confirm('新しい2048をはじめる','盤面をリセット。最高記録は保持',()=>{tiles=Array(16).fill(0);score=0;undo=null;won=false;spawn();spawn();save2048();render2048();});
// Little Snake — fixed-step rules, interpolated rendering and bounded local records.
const snakeSize=18, snakeCanvasSize=648;
const snakeModes={
 classic:{label:'クラシック',hint:'壁と体を避けて、実を集めよう',step:150,min:95,wrap:false},
 garden:{label:'おさんぽ',hint:'壁を通り抜ける、ゆったりした庭',step:210,min:210,wrap:true},
 rush:{label:'ラッシュ',hint:'6秒以内に続けて食べると最大4倍',step:120,min:70,wrap:false}
};
const snakeDirections={up:{x:0,y:-1},down:{x:0,y:1},left:{x:-1,y:0},right:{x:1,y:0}};
const snakeNumber=(v,max=1e9)=>Number.isFinite(v)&&v>=0?Math.min(max,Math.floor(v)):0;
const snakePrefsRaw=A.load('snakePreferences',{})||{};
let snakePrefs={mode:Object.hasOwn(snakeModes,snakePrefsRaw.mode)?snakePrefsRaw.mode:'classic',theme:snakePrefsRaw.theme==='moon'?'moon':'meadow',quality:snakePrefsRaw.quality==='lite'?'lite':'rich',grid:snakePrefsRaw.grid!==false};
const snakeRecordsRaw=A.load('snakeRecords',{})||{};
const snakeRecords=Object.fromEntries(Object.keys(snakeModes).map(id=>[id,{best:snakeNumber(snakeRecordsRaw[id]?.best),plays:snakeNumber(snakeRecordsRaw[id]?.plays),fruit:snakeNumber(snakeRecordsRaw[id]?.fruit),length:snakeNumber(snakeRecordsRaw[id]?.length,324)}]));
let snakeBest=snakeNumber(A.load('snakeBest',0));
const snakeHistoryRaw=A.load('snakeHistory',[]);
let snakeHistory=(Array.isArray(snakeHistoryRaw)?snakeHistoryRaw:[]).filter(r=>r&&Object.hasOwn(snakeModes,r.mode)).slice(0,8).map(r=>({mode:r.mode,score:snakeNumber(r.score),fruit:snakeNumber(r.fruit,320),seconds:snakeNumber(r.seconds),won:r.won===true}));
let snake=null,snakeFrame=0,snakeLast=0,snakeCanvas=null,snakeGround=null,snakeGroundKey='',snakeParticles=[];
const snakeMotionQuery=matchMedia('(prefers-reduced-motion: reduce)');
const snakeReduced=()=>!!A.settings.reduceMotion||snakeMotionQuery.matches;
const sameSnakeCell=(a,b)=>!!a&&!!b&&a.x===b.x&&a.y===b.y;
const snakeLevel=()=>1+Math.floor(snake.fruit/5);
const snakeStep=()=>Math.max(snakeModes[snake.mode].min,snakeModes[snake.mode].step-(snakeLevel()-1)*6);
function resetSnake(){
 const body=[{x:7,y:9},{x:6,y:9},{x:5,y:9},{x:4,y:9}];
 snake={body,previous:body.map(p=>({...p})),direction:{x:1,y:0},oldDirection:{x:1,y:0},queue:[],mode:snakePrefs.mode,score:0,fruit:0,time:0,lastFruit:-Infinity,combo:0,bonus:null,food:null,step:snakeModes[snakePrefs.mode].step,accumulator:0,running:false,started:false,over:false,won:false,recorded:false,reason:''};
 snakeParticles=[];snake.food=freeSnakeCell();
}
function freeSnakeCell(exclude=null){
 const occupied=new Set(snake.body.map(p=>p.y*snakeSize+p.x));
 if(exclude)occupied.add(exclude.y*snakeSize+exclude.x);
 const free=[];for(let i=0;i<snakeSize*snakeSize;i++)if(!occupied.has(i))free.push(i);
 if(!free.length)return null;
 const cell=free[Math.floor(Math.random()*free.length)];return {x:cell%snakeSize,y:Math.floor(cell/snakeSize)};
}
function saveSnakeRecords(){
 snakeBest=Math.max(snakeBest,snake.score);snakeRecords[snake.mode].best=Math.max(snakeRecords[snake.mode].best,snake.score);
 A.saveBatch({snakeBest,snakeRecords});
}
function finishSnake(reason,won=false){
 snake.over=true;snake.won=won;snake.reason=reason;snake.running=false;snake.queue=[];
 snake.previous=snake.body.map(p=>({...p}));snake.accumulator=snake.step;
 if(!snake.recorded){
  snake.recorded=true;const r=snakeRecords[snake.mode];r.plays++;r.fruit+=snake.fruit;r.length=Math.max(r.length,snake.body.length);
  snakeHistory=[{mode:snake.mode,score:snake.score,fruit:snake.fruit,seconds:Math.floor(snake.time/1000),won},...snakeHistory].slice(0,8);
  saveSnakeRecords();A.save('snakeHistory',snakeHistory);
 }
 updateSnakeUi();
}
function stopSnake(reason='一時停止中。再開ボタンで続けられます'){
 cancelAnimationFrame(snakeFrame);snakeFrame=0;
 if(!snake)return;
 snake.running=false;snake.queue=[];if(!snake.over)snake.reason=reason;
 updateSnakeUi();drawSnake();
}
function burstSnake(cell,gold){
 if(snakeReduced()||snakePrefs.quality==='lite')return;
 for(let i=0;i<14;i++){
  const angle=Math.PI*2*i/14,speed=24+Math.random()*44;
  snakeParticles.push({x:(cell.x+.5)*36,y:(cell.y+.5)*36,vx:Math.cos(angle)*speed,vy:Math.sin(angle)*speed,born:snake.time,color:gold?'#ffe3a0':'#f8c2a1'});
 }
 snakeParticles=snakeParticles.slice(-56);
}
function tickSnake(){
 const next=snake.queue.shift();if(next)snake.direction=next;
 const raw={x:snake.body[0].x+snake.direction.x,y:snake.body[0].y+snake.direction.y};
 const head=snakeModes[snake.mode].wrap?{x:(raw.x+snakeSize)%snakeSize,y:(raw.y+snakeSize)%snakeSize}:raw;
 const normal=sameSnakeCell(head,snake.food),gold=sameSnakeCell(head,snake.bonus),eating=normal||gold;
 const body=eating?snake.body:snake.body.slice(0,-1);
 if(head.x<0||head.y<0||head.x>=snakeSize||head.y>=snakeSize){finishSnake('壁にぶつかりました');return;}
 if(body.some(p=>sameSnakeCell(p,head))){finishSnake('自分の体にぶつかりました');return;}
 snake.previous=snake.body.map(p=>({...p}));snake.body.unshift(head);if(!eating)snake.body.pop();
 if(eating){
  snake.combo=snake.mode==='rush'?(snake.time-snake.lastFruit<=6000?Math.min(4,snake.combo+1):1):1;
  snake.lastFruit=snake.time;snake.score+=(gold?30:10)*snake.combo;snake.fruit++;burstSnake(head,gold);A.haptic();
  if(gold)snake.bonus=null;
  if(snake.body.length===snakeSize*snakeSize){snake.food=null;snake.bonus=null;finishSnake('庭いっぱいに育ちました',true);return;}
  if(normal){
   snake.food=freeSnakeCell(snake.bonus);
   // If the bonus occupies the final free cell, turn it into the normal fruit.
   if(!snake.food){snake.bonus=null;snake.food=freeSnakeCell();}
  }
  if(snake.fruit%5===0&&!snake.bonus){const cell=freeSnakeCell(snake.food);if(cell)snake.bonus={...cell,until:snake.time+8000};}
  saveSnakeRecords();updateSnakeUi();
 }
}
function snakeLoop(now){
 snakeFrame=0;if(!snake?.running||!snakeCanvas?.isConnected)return;
 if(document.hidden||!$('#overlay').hidden){stopSnake('画面を離れたため一時停止しました');return;}
 const delta=now-snakeLast;snakeLast=now;
 if(delta>300){stopSnake('処理が遅れたため一時停止しました');return;}
 const dt=Math.max(0,Math.min(delta,100));snake.time+=dt;snake.accumulator+=dt;
 if(snake.bonus&&snake.time>=snake.bonus.until)snake.bonus=null;
 if(snake.mode==='rush'&&snake.time-snake.lastFruit>6000)snake.combo=0;
 // Logic advances on grid boundaries; rendering interpolates independently.
 while(snake.accumulator>=snake.step&&snake.running){
  snake.accumulator-=snake.step;snake.oldDirection={...snake.direction};tickSnake();snake.step=snakeStep();
 }
 snakeParticles=snakeParticles.filter(p=>snake.time-p.born<650);
 if(Math.floor((snake.time-dt)/100)!==Math.floor(snake.time/100))updateSnakeUi();
 drawSnake();if(snake.running)snakeFrame=requestAnimationFrame(snakeLoop);
}
function toggleSnake(){
 if(!snakeCanvas?.isConnected||!$('#overlay').hidden||document.hidden)return;
 if(snake.running){stopSnake();return;}
 if(snake.over)resetSnake();
 if(!snake.started){snake.started=true;snake.accumulator=snake.step;}
 snake.reason='';snake.running=true;snakeLast=performance.now();updateSnakeUi();
 cancelAnimationFrame(snakeFrame);snakeFrame=requestAnimationFrame(snakeLoop);
}
function steerSnake(id){
 if(!snake||snake.over||!snakeCanvas?.isConnected||!$('#overlay').hidden)return;
 const d=snakeDirections[id],last=snake.queue.at(-1)||snake.direction;if(!d||snake.queue.length>=2)return;
 if(d.x===-last.x&&d.y===-last.y||d.x===last.x&&d.y===last.y)return;
 snake.queue.push({...d});if(!snake.started)toggleSnake();
}
function snakeText(id,text){const el=$('#'+id);if(el&&el.textContent!==String(text))el.textContent=text;}
function updateSnakeUi(){
 if(!$('#snake-toggle')||!snake)return;
 const r=snakeRecords[snake.mode],seconds=Math.floor(snake.time/1000);
 snakeText('snake-score',snake.score.toLocaleString());snakeText('snake-best',r.best.toLocaleString());
 snakeText('snake-level',snakeLevel());snakeText('snake-length',snake.body.length);
 snakeText('snake-time',`${Math.floor(seconds/60)}:${String(seconds%60).padStart(2,'0')}`);
 snakeText('snake-toggle',snake.over?'もう一度':snake.running?'一時停止':snake.started?'再開':'スタート');
 $('#snake-toggle').setAttribute('aria-label',snake.running?'ゲームを一時停止':snake.over?'新しいゲームを開始':snake.started?'ゲームを再開':'ゲームを開始');
 snakeText('snake-status',snake.over?`${snake.won?'クリア！':'ゲーム終了。'} ${snake.reason} · ${snake.score}点`:snake.running?snakeModes[snake.mode].hint:snake.reason||'スタート、または方向入力で開始');
 snakeText('snake-combo',snake.mode==='rush'?`COMBO ×${Math.max(1,snake.combo)}`:`あと${5-snake.fruit%5}個でボーナス`);
 snakeText('snake-bonus',snake.bonus?`金の実 ${Math.max(0,Math.ceil((snake.bonus.until-snake.time)/1000))}秒`:'金の実は30点');
 const meter=$('#snake-combo-meter');if(meter)meter.style.width=(snake.mode==='rush'&&snake.combo?Math.max(0,1-(snake.time-snake.lastFruit)/6000)*100:0)+'%';
 const card=$('#snake-curtain');card.hidden=snake.running;
 snakeText('snake-curtain-title',snake.over?snake.won?'GARDEN COMPLETE':'NICE JOURNEY':snake.started?'ひとやすみ':'小さな庭、大きな冒険。');
 snakeText('snake-curtain-copy',snake.over?`${snake.score}点 · 実${snake.fruit}個 · ${seconds}秒`:snake.started?'再開を押すまで、庭の時間は止まります。':'実を食べて、少しずつ長く。');
 snakeText('snake-curtain-action',snake.over?'もう一度遊ぶ':snake.started?'続きから':'庭に入る');
 snakeText('snake-record-summary',`${snakeModes[snake.mode].label} · ${r.plays}回完走 · 累計${r.fruit}個 · 最長${r.length}マス`);
 const historyKey=snakeHistory.map(r=>`${r.mode}:${r.score}:${r.seconds}:${r.fruit}`).join('|');
 const history=$('#snake-history');if(history&&history.dataset.key!==historyKey){history.dataset.key=historyKey;history.innerHTML=snakeHistory.length?snakeHistory.map(r=>`<li><span>${snakeModes[r.mode].label}${r.won?' / CLEAR':''}<small>${r.fruit}個 · ${r.seconds}秒</small></span><strong>${r.score.toLocaleString()}<small>点</small></strong></li>`).join(''):'<li>最後まで遊ぶと、ここに記録されます。</li>';}
}
function fitSnakeCanvas(){
 if(!snakeCanvas?.isConnected)return;
 const side=snakeCanvas.getBoundingClientRect().width;if(!side)return;
 const dpr=snakePrefs.quality==='lite'?1:Math.min(window.devicePixelRatio||1,2);
 const pixels=Math.max(324,Math.min(1296,Math.round(side*dpr)));
 if(snakeCanvas.width!==pixels){snakeCanvas.width=pixels;snakeCanvas.height=pixels;snakeGround=null;}
 drawSnake();
}
function makeSnakeGround(){
 const moon=snakePrefs.theme==='moon',canvas=document.createElement('canvas');canvas.width=snakeCanvas.width;canvas.height=snakeCanvas.height;
 const c=canvas.getContext('2d');c.scale(canvas.width/648,canvas.height/648);
 const ground=c.createLinearGradient(0,0,648,648);ground.addColorStop(0,moon?'#193f49':'#254f43');ground.addColorStop(.55,moon?'#142d3e':'#173d35');ground.addColorStop(1,moon?'#0c1d30':'#102e2c');c.fillStyle=ground;c.fillRect(0,0,648,648);
 const glow=c.createRadialGradient(130,65,10,160,90,650);glow.addColorStop(0,moon?'#7dbbd333':'#d7ed9b24');glow.addColorStop(1,'#ffffff00');c.fillStyle=glow;c.fillRect(0,0,648,648);
 for(let y=0;y<18;y++)for(let x=0;x<18;x++){
  if(snakePrefs.grid){c.fillStyle=(x+y)%2?'#ffffff04':'#071e2315';c.fillRect(x*36,y*36,36,36);c.fillStyle='#a5d8bd25';c.fillRect(x*36,y*36,1,1);}
  if(snakePrefs.quality==='rich'&&(x*7+y*11)%9===0){
   c.strokeStyle=moon?'#9fd7cf18':'#b5dca526';c.lineWidth=1.3;c.beginPath();c.moveTo(x*36+14,y*36+24);c.quadraticCurveTo(x*36+14,y*36+16,x*36+9,y*36+13);c.moveTo(x*36+14,y*36+24);c.quadraticCurveTo(x*36+17,y*36+14,x*36+21,y*36+18);c.stroke();
   c.fillStyle='#c9e5cb16';c.beginPath();c.ellipse(x*36+25,y*36+29,3,1.7,-.4,0,Math.PI*2);c.fill();
  }
 }
 const vignette=c.createRadialGradient(324,300,140,324,324,460);vignette.addColorStop(0,'#00130f00');vignette.addColorStop(1,'#00130f85');c.fillStyle=vignette;c.fillRect(0,0,648,648);
 c.strokeStyle=snakeModes[snake.mode].wrap?'#93cfcd77':'#aadcb244';c.lineWidth=3;c.strokeRect(2,2,644,644);
 if(snakeModes[snake.mode].wrap){c.strokeStyle='#b5f4ee';c.lineWidth=4;for(let i=0;i<4;i++){c.save();c.translate(324,324);c.rotate(i*Math.PI/2);c.beginPath();c.moveTo(-26,-319);c.lineTo(26,-319);c.stroke();c.restore();}}
 return canvas;
}
function snakeCircle(ctx,x,y,r,fill){ctx.fillStyle=fill;ctx.beginPath();ctx.arc(x,y,r,0,Math.PI*2);ctx.fill();}
function drawSnakeFruit(ctx,cell,gold,decorative){
 if(!cell)return;const x=(cell.x+.5)*36,y=(cell.y+.5)*36,bob=decorative?Math.sin(snake.time/300)*2:0;
 ctx.save();ctx.translate(x,y);ctx.fillStyle='#00000035';ctx.beginPath();ctx.ellipse(0,10,12,5,0,0,Math.PI*2);ctx.fill();ctx.translate(0,bob);
 if(decorative){const halo=ctx.createRadialGradient(0,0,2,0,0,gold?34:27);halo.addColorStop(0,gold?'#ffd97655':'#ffaf7933');halo.addColorStop(1,'#ffffff00');snakeCircle(ctx,0,0,gold?34:27,halo);}
 if(gold){ctx.strokeStyle='#f8d889';ctx.lineWidth=2;ctx.beginPath();ctx.arc(0,0,18,-Math.PI/2,-Math.PI/2+Math.PI*2*Math.max(0,(cell.until-snake.time)/8000));ctx.stroke();}
 const fruit=ctx.createRadialGradient(-5,-6,1,0,0,13);fruit.addColorStop(0,gold?'#fff3bc':'#ffe1c1');fruit.addColorStop(.35,gold?'#eabe59':'#ed9678');fruit.addColorStop(1,gold?'#b2752d':'#a8454e');snakeCircle(ctx,0,0,12,fruit);
 ctx.strokeStyle='#cee0a1';ctx.lineWidth=2.5;ctx.beginPath();ctx.moveTo(0,-9);ctx.quadraticCurveTo(-2,-16,3,-18);ctx.stroke();ctx.fillStyle='#96c887';ctx.beginPath();ctx.ellipse(7,-12,6,3,-.5,0,Math.PI*2);ctx.fill();ctx.fillStyle='#fff9';ctx.beginPath();ctx.ellipse(-4,-5,4,2,-.6,0,Math.PI*2);ctx.fill();
 ctx.restore();
}
function snakeDelta(a,b){let d=b-a;if(snakeModes[snake.mode].wrap&&Math.abs(d)>9)d-=Math.sign(d)*18;return d;}
function drawSnake(){
 if(!snakeCanvas?.isConnected||!snake)return;
 const ctx=snakeCanvas.getContext('2d');if(!ctx)return;
 const scale=snakeCanvas.width/648;ctx.setTransform(scale,0,0,scale,0,0);
 const key=[snakeCanvas.width,snakePrefs.theme,snakePrefs.grid,snakePrefs.quality,snake.mode].join(':');
 if(!snakeGround||snakeGroundKey!==key){snakeGround=makeSnakeGround();snakeGroundKey=key;}
 ctx.drawImage(snakeGround,0,0,648,648);
 const reduced=snakeReduced(),rich=snakePrefs.quality==='rich',decorative=rich&&!reduced;
 if(decorative){
  for(let i=0;i<13;i++){const t=snake.time/1600+i*2.4,x=(i*137+50+Math.sin(t)*10)%648,y=(i*83+40+Math.cos(t*.6)*13)%648;ctx.globalAlpha=.18+(Math.sin(t)+1)*.12;snakeCircle(ctx,x,y,1.5,'#e4f6b4');}ctx.globalAlpha=1;
 }
 drawSnakeFruit(ctx,snake.food,false,decorative);drawSnakeFruit(ctx,snake.bonus,true,decorative);
 const alpha=reduced?1:Math.min(1,snake.accumulator/snake.step);
 const points=snake.body.map((p,i)=>{const from=snake.previous[Math.min(i,snake.previous.length-1)];return {x:(from.x+snakeDelta(from.x,p.x)*alpha+.5)*36,y:(from.y+snakeDelta(from.y,p.y)*alpha+.5)*36};});
 // Split strokes at wrapped edges; translated copies keep the seam continuous.
 const wraps=snakeModes[snake.mode].wrap?[-648,0,648]:[0];
 ctx.lineCap='round';ctx.lineJoin='round';
 const bodyPath=()=>{
  ctx.beginPath();
  for(let i=points.length-1;i>0;i--){const a=points[i],b=points[i-1];let dx=b.x-a.x,dy=b.y-a.y;if(Math.abs(dx)>324)dx-=Math.sign(dx)*648;if(Math.abs(dy)>324)dy-=Math.sign(dy)*648;ctx.moveTo(a.x,a.y);ctx.lineTo(a.x+dx,a.y+dy);}
 };
 for(const ox of wraps)for(const oy of wraps){
  ctx.save();ctx.translate(ox,oy);
  if(rich){ctx.save();ctx.translate(1,5);bodyPath();ctx.strokeStyle='#001f2280';ctx.lineWidth=29;ctx.stroke();ctx.restore();}
  bodyPath();ctx.strokeStyle=snakePrefs.theme==='moon'?'#4cabb2':'#549777';ctx.lineWidth=27;ctx.stroke();
  bodyPath();const skin=ctx.createLinearGradient(0,0,648,648);skin.addColorStop(0,snakePrefs.theme==='moon'?'#ccfff1':'#e0f4a9');skin.addColorStop(.5,snakePrefs.theme==='moon'?'#7eddd6':'#a5d28a');skin.addColorStop(1,snakePrefs.theme==='moon'?'#5eb3c2':'#72b58c');ctx.strokeStyle=skin;ctx.lineWidth=22;ctx.stroke();
  if(rich){ctx.save();ctx.translate(-1.5,-3);bodyPath();ctx.strokeStyle='#efffd733';ctx.lineWidth=5;ctx.stroke();ctx.restore();}
  for(let i=points.length-1;i>0;i--){const p=points[i];if(i%2===0&&rich){snakeCircle(ctx,p.x-2,p.y-2,2,'#f4ffe14d');snakeCircle(ctx,p.x+3,p.y+3,1.5,'#1f725329');}}
  const h=points[0],from=Math.atan2(snake.oldDirection.y,snake.oldDirection.x),to=Math.atan2(snake.direction.y,snake.direction.x),angle=from+Math.atan2(Math.sin(to-from),Math.cos(to-from))*alpha;
  ctx.save();ctx.translate(h.x,h.y);ctx.rotate(angle);
  const head=ctx.createRadialGradient(-4,-6,1,0,0,18);head.addColorStop(0,snakePrefs.theme==='moon'?'#e3fff1':'#e6f5b5');head.addColorStop(1,snakePrefs.theme==='moon'?'#72c6cc':'#92bd73');ctx.fillStyle=head;ctx.beginPath();ctx.ellipse(0,0,17,15,0,0,Math.PI*2);ctx.fill();
  const blink=decorative&&snake.time%4700>4500;
  for(const y of [-8,8]){ctx.fillStyle='#f8fff0';ctx.beginPath();ctx.ellipse(7,y,5,blink?1.6:5.8,0,0,Math.PI*2);ctx.fill();if(!blink){snakeCircle(ctx,9,y,2.7,'#183d39');snakeCircle(ctx,9,y-1,1,'#fff');}}
  ctx.strokeStyle='#507a55';ctx.lineWidth=1.5;ctx.beginPath();ctx.arc(11,0,3,-.8,.8);ctx.stroke();ctx.restore();ctx.restore();
 }
 if(decorative)for(const p of snakeParticles){const age=(snake.time-p.born)/1000;ctx.globalAlpha=Math.max(0,1-age/.65);snakeCircle(ctx,p.x+p.vx*age,p.y+p.vy*age+35*age*age,Math.max(.5,3-age*3),p.color);}ctx.globalAlpha=1;
}
function gameSnake(){
 if(!snake)resetSnake();
 A.view(A.nav('Little Snake',`<button data-action="snakeHelp" aria-label="リトルスネークの遊び方">?</button>`,'gamesLibrary','ゲーム')+`<div class="app-content snake-studio">
 <header class="snake-heading"><div><small>THE LITTLE GARDEN</small><h2>Little Snake<span>.</span></h2><p>実を集めて、自分だけの長い旅へ。</p></div><span class="snake-edition">18 × 18<br>GARDEN</span></header>
 <div class="snake-modes" role="group" aria-label="プレイモード">${Object.entries(snakeModes).map(([id,m])=>`<button data-action="snakeMode" data-value="${id}" aria-pressed="${id===snake.mode}">${m.label}</button>`).join('')}</div>
 <div class="snake-scorebar"><div><small>SCORE</small><strong id="snake-score">0</strong></div><div><small>MODE BEST</small><strong id="snake-best">0</strong></div><div><small>LEVEL</small><strong id="snake-level">1</strong></div><div><small>LENGTH</small><strong id="snake-length">4</strong></div></div>
 <div class="snake-stage"><canvas class="snake-board" id="snake-board" width="648" height="648" tabindex="0" aria-label="18行18列のスネーク盤面。矢印キーまたはWASDで操作" aria-describedby="snake-status snake-instructions">Canvasに対応したブラウザが必要です。</canvas>
 <div class="snake-curtain" id="snake-curtain"><div><small>LITTLE SNAKE</small><h3 id="snake-curtain-title"></h3><p id="snake-curtain-copy"></p><button data-action="snakeToggle" id="snake-curtain-action">庭に入る</button></div></div></div>
 <div class="snake-livebar"><span id="snake-combo"></span><span id="snake-bonus"></span><time id="snake-time">0:00</time></div><div class="snake-combo-track" aria-hidden="true"><i id="snake-combo-meter"></i></div>
 <div class="snake-actions"><button data-action="snakeToggle" id="snake-toggle">スタート</button><button data-action="snakeRestart">やり直す</button></div>
 <p class="snake-status" id="snake-status" role="status" aria-live="polite"></p>
 <div class="snake-pad" role="group" aria-label="方向操作">${[['up','↑','上'],['left','←','左'],['down','↓','下'],['right','→','右']].map(([id,symbol,label])=>`<button data-action="snakeDirection" data-value="${id}" aria-label="${label}へ進む">${symbol}</button>`).join('')}</div>
 <p class="snake-instructions" id="snake-instructions">スワイプ / 矢印 / WASD · Spaceで一時停止<br>一時停止後は「再開」で続けます</p>
 <details class="snake-settings"><summary>庭の見た目と記録</summary><div class="snake-options"><button data-action="snakeTheme" id="snake-theme"></button><button data-action="snakeQuality" id="snake-quality"></button><button data-action="snakeGrid" id="snake-grid"></button></div><p id="snake-record-summary"></p><h3>最近の8プレイ</h3><ol id="snake-history"></ol><p class="snake-save-note">記録と設定はこのブラウザに保存。途中の盤面は再読み込みでリセットされます。</p></details></div>`);
 snakeCanvas=$('#snake-board');const canvas=snakeCanvas;
 const on=(el,event,fn,options)=>{el.addEventListener(event,fn,options);gameCleanups.push(()=>el.removeEventListener(event,fn,options));};
 on(document,'visibilitychange',()=>{if(document.hidden)stopSnake('タブを離れたため一時停止しました');});
 on(window,'blur',()=>stopSnake('別の画面に移ったため一時停止しました'));
 const observer=new MutationObserver(()=>{if(!$('#overlay').hidden&&snake.running)stopSnake('メニューを開いたため一時停止しました');});observer.observe($('#overlay'),{attributes:true,attributeFilter:['hidden']});gameCleanups.push(()=>observer.disconnect());
 if(window.ResizeObserver){const resize=new ResizeObserver(fitSnakeCanvas);resize.observe(canvas);gameCleanups.push(()=>resize.disconnect());}else on(window,'resize',fitSnakeCanvas);
 on(snakeMotionQuery,'change',()=>drawSnake());
 let touch=null;
 on(canvas,'pointerdown',e=>{if(!e.isPrimary||e.button!==0)return;touch={id:e.pointerId,x:e.clientX,y:e.clientY};canvas.setPointerCapture(e.pointerId);canvas.focus({preventScroll:true});});
 on(canvas,'pointermove',e=>{
  if(!touch||touch.id!==e.pointerId)return;const dx=e.clientX-touch.x,dy=e.clientY-touch.y;
  if(Math.max(Math.abs(dx),Math.abs(dy))<Math.max(12,canvas.clientWidth/22))return;
  steerSnake(Math.abs(dx)>Math.abs(dy)?dx>0?'right':'left':dy>0?'down':'up');touch={id:e.pointerId,x:e.clientX,y:e.clientY};
 });
 for(const event of ['pointerup','pointercancel','lostpointercapture'])on(canvas,event,()=>touch=null);
 // Direction buttons react on press, rather than waiting for click release.
 for(const button of A.$$('.snake-pad button'))on(button,'pointerdown',e=>{if(e.isPrimary&&e.button===0){e.preventDefault();steerSnake(button.dataset.value);}});
 on(document,'keydown',e=>{
  if(!$('#overlay').hidden||e.isComposing||e.ctrlKey||e.altKey||e.metaKey||e.target.closest('input,textarea,select,[contenteditable]'))return;
  const d={ArrowUp:'up',ArrowDown:'down',ArrowLeft:'left',ArrowRight:'right',w:'up',a:'left',s:'down',d:'right'}[e.key.length===1?e.key.toLowerCase():e.key];
  if(d){e.preventDefault();if(!e.repeat)steerSnake(d);}
  if(e.code==='Space'&&!e.target.closest('button,summary')){e.preventDefault();if(!e.repeat)toggleSnake();}
 });
 gameCleanups.push(()=>{stopSnake('おかえりなさい。「再開」で続けられます');snakeCanvas=null;snakeGround=null;snakeParticles=[];});
 updateSnakeOptions();updateSnakeUi();fitSnakeCanvas();
}
function updateSnakeOptions(){
 snakeText('snake-theme',snakePrefs.theme==='moon'?'庭：月あかり':'庭：木もれび');
 snakeText('snake-quality',snakePrefs.quality==='rich'?'描画：高精細':'描画：軽量');
 snakeText('snake-grid',snakePrefs.grid?'マス目：オン':'マス目：オフ');$('#snake-grid')?.setAttribute('aria-pressed',String(snakePrefs.grid));
}
function changeSnakeLook(key,value){snakePrefs[key]=value;A.save('snakePreferences',snakePrefs);snakeGround=null;updateSnakeOptions();fitSnakeCanvas();}
function restartSnake(mode=snake.mode){
 const reset=()=>{snakePrefs.mode=mode;A.save('snakePreferences',snakePrefs);resetSnake();A.$$('.snake-modes button').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.value===mode)));updateSnakeUi();drawSnake();};
 stopSnake();if(snake.started&&!snake.over)A.confirm('新しい庭から始めますか？','今のスコアと盤面はリセットします。保存済みの記録は残ります。',reset);else reset();
}
A.actions.snakeToggle=toggleSnake;
A.actions.snakeDirection=(el,event)=>{if(!event||event.detail===0)steerSnake(el.dataset.value);};
A.actions.snakeRestart=()=>restartSnake();
A.actions.snakeMode=el=>{if(Object.hasOwn(snakeModes,el.dataset.value)&&el.dataset.value!==snake.mode)restartSnake(el.dataset.value);};
A.actions.snakeTheme=()=>changeSnakeLook('theme',snakePrefs.theme==='moon'?'meadow':'moon');
A.actions.snakeQuality=()=>changeSnakeLook('quality',snakePrefs.quality==='rich'?'lite':'rich');
A.actions.snakeGrid=()=>changeSnakeLook('grid',!snakePrefs.grid);
A.actions.snakeHelp=()=>{
 stopSnake('遊び方を確認中です。閉じてから再開できます');
 A.overlay(`${A.overlayTitle('Little Snake の遊び方')}<div class="about-copy"><p>矢印キー・WASD・盤面のスワイプ・方向ボタンで操作。曲がる方向は2回先まで予約でき、直接の逆走はできません。</p><p>クラシックは壁と自分の体に当たると終了。おさんぽは低速で、壁を抜けて反対側へ移動します。ラッシュは速い移動と6秒以内の連続獲得で最大4倍のコンボに挑戦できます。</p><p>実は10点。5個食べるごとに、空きマスがあれば金の実が8秒間登場します。金の実は30点。どちらも体が1マス伸び、ラッシュでは倍率がかかります。5個ごとにレベルが上がり、おさんぽ以外は少しずつ速くなります。324マスすべて埋めるとクリアです。</p><p>Space（ボタン選択中はそのボタンを操作）で一時停止。タブ切替・メニュー・アプリ移動でも停止し、自動では再開しません。途中の盤面はこのページを開いている間のみ保持します。</p><p>モード別最高点・終了した直近8プレイ・庭の見た目を端末内に保存。旧最高点はゲーム一覧の総合BESTに残します。「動きを減らす」では補間・粒子・背景演出を止め、軽量描画では演出と解像度を抑えます。</p></div>`);
};
// Memory Garden — shuffled pairs with a race-safe reveal timer.
const symbols=['✿','☀','☾','♧','♡','✦','☁','♫'];const colors=['#cd8d9a','#d2ae69','#a394c4','#91aa81','#d1a092','#a3b3c7','#8bb3c6','#b79ac1'];
let cards=[],flipped=[],matched=[],memoryMoves=0,memoryBusy=false,memoryTimeout=null,memoryBest=A.load('memoryBest',0),memoryStart=0,memorySeconds=0,memoryClock=null;
function shuffle(list){for(let i=list.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[list[i],list[j]]=[list[j],list[i]];}return list;}
function resetMemory(){clearTimeout(memoryTimeout);cards=shuffle([...symbols,...symbols]);flipped=[];matched=[];memoryMoves=0;memoryBusy=false;memoryStart=0;memorySeconds=0;}
function gameMemory(){resetMemory();gameCleanups.push(()=>{clearTimeout(memoryTimeout);clearInterval(memoryClock);memoryBusy=false;});A.view(A.nav('Memory Garden',`<button data-action="gameHelp" aria-label="遊び方">?</button>`,'gamesLibrary','ゲーム')+`<div class="app-content"><div class="game-heading"><h2 style="font-size:28px;color:#9a88ac">Memory Garden<span style="font-size:15px">.</span></h2></div><p class="game-instructions" style="color:#a293ac">同じペア</p><div class="memory-meta" style="margin-top:25px"><span>MOVES <strong id="memory-moves">0</strong></span><span id="memory-time">00:00</span><span><strong id="memory-pairs">0</strong> / 8 PAIRS</span></div><div class="memory-board" id="memory-board"></div><div class="game-status" id="memory-status" style="color:#a08baa"></div><div class="game-toolbar"><button data-action="memoryRestart" style="background:#ad9abd">↻ 新しいお庭</button><span style="font-size:10px;color:#ad9abd;align-self:center" id="memory-best">BEST ${memoryBest?memoryBest+' MOVES':'—'}</span></div><p class="notes-footer"></p></div>`);renderMemory();memoryClock=setInterval(()=>{if(memoryStart&&matched.length<16){memorySeconds=Math.floor((Date.now()-memoryStart)/1000);if($('#memory-time'))$('#memory-time').textContent=`${String(Math.floor(memorySeconds/60)).padStart(2,'0')}:${String(memorySeconds%60).padStart(2,'0')}`;}},1000);}

function gardenArt(symbol){const content={
'✿':'<g fill="currentColor" opacity=".85"><ellipse cx="40" cy="25" rx="10" ry="16"/><ellipse cx="40" cy="55" rx="10" ry="16"/><ellipse cx="25" cy="40" rx="16" ry="10"/><ellipse cx="55" cy="40" rx="16" ry="10"/></g><circle cx="40" cy="40" r="8" fill="#e4c67e"/><circle cx="38" cy="37" r="2" fill="#fff5"/>',
'☀':'<g stroke="currentColor" stroke-width="3" stroke-linecap="round"><path d="M40 8v8m0 48v8M8 40h8m48 0h8M17 17l6 6m34 34 6 6M17 63l6-6m34-34 6-6"/></g><circle cx="40" cy="40" r="17" fill="currentColor"/><circle cx="35" cy="34" r="9" fill="#fff2"/>',
'☾':'<path d="M49 13a28 28 0 1 0 18 44A29 29 0 0 1 49 13Z" fill="currentColor"/><path d="m59 17 2 5 5 2-5 2-2 5-2-5-5-2 5-2Z" fill="#dfc48f"/>',
'♧':'<path d="M40 68V40" stroke="#83976a" stroke-width="3"/><path d="M40 48C12 50 10 20 18 15c23-1 26 17 22 33Z" fill="currentColor"/><path d="M40 44c-2-22 14-31 28-26 3 24-10 33-28 26Z" fill="currentColor" opacity=".7"/><path d="m20 24 20 25 20-23" stroke="#ffffff50" stroke-width="1.5" fill="none"/>',
'♡':'<path d="M40 66C29 57 12 44 12 30 12 12 34 12 40 27c6-15 28-15 28 3 0 14-17 27-28 36Z" fill="currentColor"/><path d="M22 32c-1-6 4-11 9-7" stroke="#fff6" stroke-width="3" fill="none" stroke-linecap="round"/>',
'✦':'<path d="m40 8 8 23 23 9-23 9-8 23-9-23-23-9 23-9Z" fill="currentColor"/><path d="m40 8 0 32 31 0-23-9Z" fill="#fff4"/><path d="m40 40 0 32-9-23-23-9Z" fill="#0000000e"/>',
'☁':'<path d="M20 59a14 14 0 1 1 1-28 20 20 0 0 1 39-2 15 15 0 0 1 1 30Z" fill="currentColor"/><path d="M20 34c3-5 7-6 11-5M33 26c7-9 17-5 19 0" stroke="#fff5" stroke-width="3" stroke-linecap="round" fill="none"/>',
'♫':'<path d="M29 55V25l28-7v31M29 34l28-7" stroke="currentColor" stroke-width="5" stroke-linejoin="round" fill="none"/><ellipse cx="20" cy="56" rx="12" ry="8" transform="rotate(-20 20 56)" fill="currentColor"/><ellipse cx="48" cy="50" rx="12" ry="8" transform="rotate(-20 48 50)" fill="currentColor"/>'
};return '<svg viewBox="0 0 80 80" aria-hidden="true">'+(content[symbol]||'<path d="m40 17 7 16 16 7-16 7-7 16-7-16-16-7 16-7Z" fill="none" stroke="#faf0ff99" stroke-width="1.5"/><circle cx="40" cy="40" r="4" fill="#f5e4ff66"/>')+'</svg>';}

function renderMemory(){if(!$('#memory-board'))return;$('#memory-board').innerHTML=cards.map((s,i)=>{const visible=flipped.includes(i)||matched.includes(i);return `<button class="memory-card ${visible?'flipped':''} ${matched.includes(i)?'matched':''}" data-action="memoryFlip" data-index="${i}" aria-label="${matched.includes(i)?'一致したカード':visible?s:'裏向きのカード '+(i+1)}" ${matched.includes(i)?'disabled':''}><span style="${visible?'color:'+colors[symbols.indexOf(s)]:''}">${gardenArt(visible?s:'back')}</span></button>`;}).join('');$('#memory-moves').textContent=memoryMoves;$('#memory-pairs').textContent=matched.length/2;}
function flipCard(index){if(memoryBusy||flipped.includes(index)||matched.includes(index))return;if(!memoryStart)memoryStart=Date.now();flipped.push(index);A.haptic();renderMemory();if(flipped.length===2){memoryMoves++;const [a,b]=flipped;if(cards[a]===cards[b]){matched.push(a,b);flipped=[];renderMemory();if(matched.length===16){const elapsed=Math.floor((Date.now()-memoryStart)/1000);memoryBest=memoryBest?Math.min(memoryBest,memoryMoves):memoryMoves;A.save('memoryBest',memoryBest);$('#memory-status').textContent=`お庭が完成！ ${memoryMoves}手・${elapsed}秒でクリア。`;$('#memory-best').textContent=`BEST ${memoryBest} MOVES`;A.toast('すべてのペアが見つかりました ✿');}else $('#memory-status').textContent='';}else{memoryBusy=true;renderMemory();$('#memory-status').textContent='';memoryTimeout=setTimeout(()=>{flipped=[];memoryBusy=false;if(gamePage==='memory')renderMemory();},800);}}}
A.actions.memoryFlip=el=>flipCard(+el.dataset.index);A.actions.memoryRestart=()=>{resetMemory();renderMemory();$('#memory-time').textContent='00:00';$('#memory-status').textContent='あせらず、ひとつずつ。';};
A.actions.gameHelp=()=>{const help=gamePage==='2048'?['2048 の遊び方','盤面を上下左右にスワイプすると、すべてのタイルが動きます。同じ数字がぶつかると合体し、数字が2倍になります。','合体した数字がスコアに加算されます。2048をつくった後も続けられます。動かせなくなったら終了です。','一手戻すは直前の1回だけ使用できます。進行状況とハイスコアは自動保存されます。']:gamePage==='snake'?['Little Snake の遊び方','スタートを押し、スワイプ・矢印キー・画面の方向ボタンでヘビを動かします。小さな実を食べると10点獲得します。','壁や自分の体にぶつかると終了です。来た方向へすぐに逆走することはできません。','アプリを離れると一時停止します。スペースキーでも一時停止できます。']:['Memory Garden の遊び方','カードを2枚めくり、同じ絵柄のペアを探しましょう。一致したカードは表向きのまま残ります。','8組のペアが揃えばクリア。2枚めくるたびに1手として数えます。少ない手数でのクリアに挑戦してください。','ハイスコアは最少手数です。アプリを開き直すと新しいお庭になります。'];A.overlay(`${A.overlayTitle(help[0])}<div class="about-copy">${help.slice(1).map(p=>`<p style="margin:22px 0">${p}</p>`).join('')}</div><button class="control-tile" data-action="closeOverlay" style="width:100%;margin-top:30px">遊んでみる</button>`);};
// Pure mechanics are exposed for regression tests; no production data hooks.
A.gameMath={mergeLine};
// Refresh badge counts now that every application has registered.
A.renderHome();
// Optional, documented deep links. All routes remain frontend-only.
const route=new URLSearchParams(location.hash.replace(/^#/,''));
if(route.get('app')&&A.apps[route.get('app')])A.open(route.get('app'),route.get('view')||undefined);
if(route.get('screen')==='lock')A.lock();
window.addEventListener('hashchange',()=>{const p=new URLSearchParams(location.hash.slice(1));if(p.get('app')&&A.apps[p.get('app')])A.open(p.get('app'),p.get('view')||undefined);else if(p.get('screen')==='lock')A.lock();else A.home();});
})();
