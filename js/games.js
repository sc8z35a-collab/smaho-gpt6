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
// 2048 Studio — pure move planning, persistent progress, retained tile layers.
const directions2048=['up','left','down','right'];
const labels2048={up:'上',left:'左',down:'下',right:'右'};
const number2048=n=>n.toLocaleString('ja-JP');
const count2048=n=>Number.isSafeInteger(n)&&n>=0?n:0;
const validTiles2048=list=>Array.isArray(list)&&list.length===16&&list.every(v=>v===0||(Number.isSafeInteger(v)&&v>=2&&v<=2**48&&Number.isInteger(Math.log2(v))));
const saved2048=A.load('2048state',null);
const restored2048=validTiles2048(saved2048?.tiles)&&saved2048.tiles.some(Boolean)&&Number.isSafeInteger(saved2048.score)&&saved2048.score>=0;
let recoveryNotice2048=!!saved2048&&!restored2048;
let tiles=restored2048?[...saved2048.tiles]:Array(16).fill(0);
let score=restored2048?saved2048.score:0,best=Math.max(count2048(A.load('2048best',0)),score);
let turns2048=restored2048?count2048(saved2048.moves):0;
let combo2048=restored2048?count2048(saved2048.combo):0;
let peakCombo2048=restored2048?Math.max(combo2048,count2048(saved2048.peakCombo)):0;
let continued2048=restored2048&&(saved2048.continued===true||(saved2048.version!==2&&Math.max(...tiles)>=2048));
let seed2048=restored2048&&Number.isInteger(saved2048.seed)&&saved2048.seed>=0&&saved2048.seed<=0xffffffff?saved2048.seed:Math.floor(Math.random()*2**32);
const storedRecords2048=A.load('2048records',{})||{};
let records2048={maxTile:Math.max(...tiles,count2048(storedRecords2048.maxTile)),bestCombo:Math.max(peakCombo2048,count2048(storedRecords2048.bestCombo))};
const storedPrefs2048=A.load('2048preferences',{})||{};
const prefs2048={theme:storedPrefs2048.theme==='aurora'?'aurora':'ceramic',speed:storedPrefs2048.speed==='quick'?'quick':'smooth'};
// Whitelist snapshots: history must never recursively embed saved histories.
function readSnapshot2048(value){
 if(!validTiles2048(value?.tiles)||!value.tiles.some(Boolean)||!['score','moves','combo','peakCombo','seed'].every(key=>Number.isSafeInteger(value[key])&&value[key]>=0)||value.seed>0xffffffff||typeof value.continued!=='boolean')return null;
 return {version:2,tiles:[...value.tiles],score:value.score,moves:value.moves,combo:value.combo,peakCombo:Math.max(value.combo,value.peakCombo),continued:value.continued,seed:value.seed};
}
function readHistory2048(value,limit=32){
 if(!limit||!Array.isArray(value))return [];
 const bounded=value.slice(-limit).map(readSnapshot2048);return bounded.every(Boolean)?bounded:[];
}
let history2048=restored2048?readHistory2048(saved2048.history):[];
let future2048=restored2048?readHistory2048(saved2048.future,32-history2048.length):[];
const storedCheckpoint2048=A.load('2048checkpoint',null),checkpointState2048=readSnapshot2048(storedCheckpoint2048?.state);
let checkpoint2048=checkpointState2048&&Number.isSafeInteger(storedCheckpoint2048.savedAt)&&storedCheckpoint2048.savedAt>0&&storedCheckpoint2048.savedAt<=8640000000000000?{state:checkpointState2048,savedAt:storedCheckpoint2048.savedAt}:null;
let nodes2048=new Map(),animations2048=new Set();
let busy2048=false,pending2048=null,moveTimer2048=null,finishMove2048=null,saveOK2048=true,hint2048=null;
const reduced2048=()=>A.settings.reduceMotion||window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const active2048=()=>A.current==='games'&&gamePage==='2048'&&!!$('#board-2048')&&!document.hidden;
const waiting2048=()=>!continued2048&&Math.max(...tiles)>=2048;
function random2048(){seed2048=(Math.imul(seed2048,1664525)+1013904223)>>>0;return seed2048/2**32;}
function spawn(){const empty=tiles.map((v,i)=>v===0?i:-1).filter(i=>i>=0);if(!empty.length)return -1;const i=empty[Math.floor(random2048()*empty.length)];tiles[i]=random2048()<.9?2:4;return i;}
if(!tiles.some(Boolean)){spawn();spawn();}
function snapshot2048(){return {version:2,tiles:[...tiles],score,moves:turns2048,combo:combo2048,peakCombo:peakCombo2048,continued:continued2048,seed:seed2048};}
function restore2048(s){tiles=[...s.tiles];score=s.score;turns2048=s.moves;combo2048=s.combo;peakCombo2048=s.peakCombo;continued2048=s.continued;seed2048=s.seed;}
function save2048(){
 best=Math.max(best,score);records2048.maxTile=Math.max(records2048.maxTile,...tiles);records2048.bestCombo=Math.max(records2048.bestCombo,peakCombo2048);
 saveOK2048=A.saveBatch({'2048best':best,'2048state':{...snapshot2048(),history:history2048,future:future2048},'2048records':records2048});
}
// Retain the existing public mergeLine contract for other consumers.
function mergeLine(line){const nonzero=line.filter(Boolean),out=[];let gain=0;for(let i=0;i<nonzero.length;i++){if(nonzero[i]===nonzero[i+1]){const value=nonzero[i]*2;out.push(value);gain+=value;i++;}else out.push(nonzero[i]);}while(out.length<4)out.push(0);return {line:out,gain};}
function plan2048(board,direction){
 const next=Array(16).fill(0),paths=[],merged=[];let gain=0;
 for(let lane=0;lane<4;lane++){
  const indices=Array.from({length:4},(_,n)=>direction==='left'?lane*4+n:direction==='right'?lane*4+3-n:direction==='up'?n*4+lane:(3-n)*4+lane);
  const source=indices.filter(i=>board[i]);let slot=0;
  for(let n=0;n<source.length;n++){
   const from=source[n],to=indices[slot++],pair=n+1<source.length&&board[from]===board[source[n+1]];
   next[to]=board[from]*(pair?2:1);paths.push({from,to,consumed:false});
   if(pair){paths.push({from:source[++n],to,consumed:true});merged.push(to);gain+=next[to];}
  }
 }
 return {tiles:next,paths,merged,gain,changed:next.some((v,i)=>v!==board[i])};
}
function movable(board=tiles){return directions2048.some(d=>plan2048(board,d).changed);}
function animate2048(el,frames,options){
 if(!el||reduced2048()||!el.animate)return;
 for(const running of animations2048)if(running.effect?.target===el){running.cancel();animations2048.delete(running);}
 const animation=el.animate(frames,options);animations2048.add(animation);
 const done=()=>animations2048.delete(animation);animation.onfinish=done;animation.oncancel=done;
 return animation;
}
function clearEffects2048(){
 const layer=$('#effects-2048');
 for(const animation of animations2048)if(layer?.contains(animation.effect?.target)){animation.cancel();animations2048.delete(animation);}
 layer?.replaceChildren();
}
function burst2048(indices){
 clearEffects2048();const layer=$('#effects-2048');if(!layer||reduced2048()||!layer.animate)return;
 // At most eight merge destinations, each with one halo and four light flecks.
 for(const index of indices.slice(0,8)){
  const flare=document.createElement('span');flare.className='g2048-piece g2048-flare';position2048(flare,index);layer.append(flare);
  const ring=document.createElement('i');ring.className='g2048-ring';flare.append(ring);
  const glow=animate2048(ring,[{transform:'scale(.85)',opacity:.8},{transform:'scale(1.45)',opacity:0}],{duration:420,easing:'ease-out'});
  if(glow){const remove=()=>{animations2048.delete(glow);flare.remove();};glow.onfinish=remove;glow.oncancel=remove;}
  for(let n=0;n<4;n++){
   const speck=document.createElement('i');speck.className='g2048-speck';flare.append(speck);
   const angle=n*Math.PI/2+Math.PI/4,distance=22+Math.min(12,Math.log2(tiles[index]));
   animate2048(speck,[{transform:'translate(-50%,-50%) scale(1)',opacity:.85},{transform:`translate(calc(-50% + ${Math.cos(angle)*distance}px),calc(-50% + ${Math.sin(angle)*distance}px)) scale(.15)`,opacity:0}],{duration:360,easing:'cubic-bezier(.1,.7,.3,1)'});
  }
 }
}
function stopMotion2048(){
 clearTimeout(moveTimer2048);moveTimer2048=null;finishMove2048=null;pending2048=null;busy2048=false;
 for(const animation of animations2048)animation.cancel();animations2048.clear();clearEffects2048();
}
function position2048(el,index){el.style.left=`calc((100% + var(--g-gap)) * ${index%4} / 4)`;el.style.top=`calc((100% + var(--g-gap)) * ${Math.floor(index/4)} / 4)`;}
function face2048(el,value){
 const face=el.firstElementChild;face.textContent=value;face.dataset.level=Math.min(12,Math.log2(value));face.dataset.digits=String(value).length;
}
function tile2048(index,value){
 const el=document.createElement('span');el.className='g2048-piece';el.setAttribute('aria-hidden','true');
 const face=document.createElement('span');face.className='g2048-face';el.append(face);face2048(el,value);position2048(el,index);return el;
}
function paint2048(){
 const layer=$('#tiles-2048');if(!layer)return;layer.replaceChildren();nodes2048=new Map();
 tiles.forEach((v,i)=>{if(v){const el=tile2048(i,v);nodes2048.set(i,el);layer.append(el);}});
}
function clearHint2048(){hint2048=null;A.$$('.studio-2048 [data-action="move2048"]').forEach(el=>el.classList.remove('is-hint'));}
function render2048(message=''){
 const board=$('#board-2048');if(!board)return;
 const high=Math.max(...tiles),empty=tiles.filter(v=>!v).length,over=!movable(),win=waiting2048();
 let goal=2048;while(goal<=high)goal*=2;
 $('#score-2048').textContent=number2048(score);$('#best-2048').textContent=number2048(best);
 $('#moves-2048').textContent=number2048(turns2048);$('#empty-2048').textContent=empty;
 $('#high-2048').textContent=number2048(high);$('#combo-2048').textContent=combo2048>1?`${combo2048} 連続合体`:'次の一手を、じっくり。';
 $('#goal-2048').textContent=number2048(goal);$('#goal-current-2048').textContent=number2048(high);
 const progress=$('#progress-2048');progress.max=goal;progress.value=high;progress.setAttribute('aria-label',`最大タイル ${high}、次の目標 ${goal}`);
 $('#record-tile-2048').textContent=number2048(records2048.maxTile);$('#record-combo-2048').textContent=number2048(records2048.bestCombo);
 $('#undo-2048').disabled=busy2048||!history2048.length;$('#redo-2048').disabled=busy2048||!future2048.length;
 $('#hint-2048').disabled=busy2048||win||over;
 A.$$('.studio-2048 [data-action="move2048"]').forEach(el=>{el.disabled=win||over;el.classList.toggle('is-hint',hint2048===el.dataset.value);});
 $('#undo-count-2048').textContent=history2048.length;
 renderPractice2048();
 $('#result-2048').hidden=!(over||win);$('#result-title-2048').textContent=win?'2048、達成。':'ひと休み。また、その先へ。';
 $('#result-copy-2048').textContent=win?'おめでとうございます。4096、その先も目指せます。':`${number2048(score)}点・${number2048(turns2048)}手。${history2048.length?'「戻す」で別の道を探せます。':'新しい盤面でもう一度。'}`;
 $('#continue-2048').hidden=!win;
 $('#save-2048').textContent=saveOK2048?'端末に自動保存':'未保存・保存し直す';$('#save-2048').classList.toggle('save-failed',!saveOK2048);
 $('#status-2048').textContent=message||(win?'2048達成。「続ける」でプレイを再開できます。':over?'動かせる手がありません。':empty<=2?'空きマスが少なくなっています。合体でスペースを確保。':'同じ数字を重ねて、2048へ。');
 board.setAttribute('aria-label',`2048の盤面。スコア ${score}。`+Array.from({length:4},(_,r)=>`${r+1}行目 ${tiles.slice(r*4,r*4+4).map(v=>v||'空').join('、')}`).join('。'));
}
function renderPractice2048(){
 for(const direction of directions2048){
  const row=$('#forecast-2048-'+direction),plan=plan2048(tiles,direction);
  row.querySelector('[data-forecast="gain"]').textContent=plan.changed?'+'+number2048(plan.gain):'—';
  row.querySelector('[data-forecast="pairs"]').textContent=plan.changed?plan.merged.length+'組':'移動不可';
  row.querySelector('[data-forecast="space"]').textContent=plan.changed?Math.max(0,plan.tiles.filter(v=>!v).length-1)+'マス':'—';
  row.classList.toggle('is-hint',hint2048===direction);row.classList.toggle('is-blocked',!plan.changed);
 }
 $('#checkpoint-save-2048').disabled=busy2048;$('#checkpoint-load-2048').disabled=busy2048||!checkpoint2048;$('#checkpoint-delete-2048').disabled=busy2048||!checkpoint2048;
 const state=checkpoint2048?.state;
 $('#checkpoint-copy-2048').textContent=state?`${number2048(state.score)}点 / ${number2048(state.moves)}手 / ${new Date(checkpoint2048.savedAt).toLocaleString('ja-JP')}`:'残したい局面を1つ保存できます。新しいゲームを始めても残ります。';
 const preview=$('#checkpoint-board-2048');preview.hidden=!state;
 preview.setAttribute('aria-label',state?'保存した局面。'+state.tiles.map((v,i)=>`${Math.floor(i/4)+1}行${i%4+1}列 ${v||'空'}`).join('。'):'保存した局面なし');
 [...preview.children].forEach((el,i)=>{const value=state?.tiles[i]||0;el.textContent=value||'';el.dataset.filled=String(!!value);});
}
function slide2048(plan,spawned){
 const layer=$('#tiles-2048'),duration=reduced2048()||!layer.animate?0:prefs2048.speed==='quick'?95:150;
 const step=(layer.clientWidth+parseFloat(getComputedStyle(layer).getPropertyValue('--g-gap')))/4;
 const survivors=new Map(),removed=[],slides=[];
 busy2048=true;
 for(const path of plan.paths){
  const el=nodes2048.get(path.from);if(!el)continue;
  position2048(el,path.to);el.style.zIndex=path.consumed?'2':'3';
  if(path.from!==path.to)slides.push(animate2048(el,[{transform:`translate3d(${(path.from%4-path.to%4)*step}px,${(Math.floor(path.from/4)-Math.floor(path.to/4))*step}px,0)`},{transform:'translate3d(0,0,0)'}],{duration,easing:'cubic-bezier(.2,.75,.25,1)'}));
  if(path.consumed)removed.push(el);else survivors.set(path.to,el);
 }
 nodes2048=survivors;
 const finish=()=>{
  clearTimeout(moveTimer2048);moveTimer2048=null;finishMove2048=null;
  // Timers may fire between compositor frames: settle old transforms first.
  slides.forEach(animation=>{animation?.cancel();animations2048.delete(animation);});
  removed.forEach(el=>el.remove());
  for(const [index,el] of survivors){
   face2048(el,tiles[index]);el.style.zIndex='';
   if(plan.merged.includes(index))animate2048(el.firstElementChild,[{transform:'scale(.92)'},{transform:'scale(1.12)',offset:.45},{transform:'scale(1)'}],{duration:220,easing:'cubic-bezier(.2,.8,.3,1)'});
  }
  if(spawned>=0){const el=tile2048(spawned,tiles[spawned]);nodes2048.set(spawned,el);layer.append(el);animate2048(el.firstElementChild,[{transform:'scale(.5)',opacity:0},{transform:'scale(1)',opacity:1}],{duration:180,easing:'cubic-bezier(.16,1,.3,1)'});}
  busy2048=false;burst2048(plan.merged);
  const message=waiting2048()||!movable()?'':plan.gain?`${plan.merged.length}組が合体、${number2048(plan.gain)}点獲得。${combo2048>1?combo2048+'手連続の合体。':''}`:'タイルを移動しました。';
  render2048(message);
  if(plan.gain){const gain=$('#gain-2048');gain.textContent='+'+number2048(plan.gain);animate2048(gain,[{opacity:1,transform:'translateY(5px)'},{opacity:0,transform:'translateY(-22px)'}],{duration:700,easing:'ease-out'});}
  if(waiting2048())animate2048($('#result-2048'),[{opacity:0,transform:'translateY(8px)'},{opacity:1,transform:'translateY(0)'}],{duration:320,easing:'ease-out'});
  const next=pending2048;pending2048=null;if(next)move2048(next);
 };
 finishMove2048=finish;
 $('#undo-2048').disabled=true;$('#redo-2048').disabled=true;$('#hint-2048').disabled=true;
 $('#checkpoint-save-2048').disabled=true;$('#checkpoint-load-2048').disabled=true;$('#checkpoint-delete-2048').disabled=true;
 if(duration)moveTimer2048=setTimeout(finish,duration);else finish();
}
function move2048(direction){
 if(!directions2048.includes(direction)||!active2048()||!$('#overlay').hidden||waiting2048())return;
 if(busy2048){pending2048=direction;return;}
 clearHint2048();const plan=plan2048(tiles,direction);
 if(!plan.changed){render2048(movable()?'その方向には動かせません。別の方向へ。':'動かせる手がありません。戻すか、新しく始めましょう。');return;}
 clearEffects2048();
 // Commit logical state before any animation: leaving mid-slide cannot lose a move.
 history2048.push(snapshot2048());if(history2048.length>32)history2048.shift();future2048=[];
 tiles=plan.tiles;score+=plan.gain;turns2048++;combo2048=plan.gain?combo2048+1:0;peakCombo2048=Math.max(peakCombo2048,combo2048);
 const spawned=spawn();save2048();slide2048(plan,spawned);A.haptic();
}
function historyStep2048(redo=false){
 if(!active2048()||!$('#overlay').hidden||busy2048)return;
 const from=redo?future2048:history2048,to=redo?history2048:future2048;if(!from.length)return;
 stopMotion2048();to.push(snapshot2048());restore2048(from.pop());clearHint2048();save2048();paint2048();render2048(redo?'一手やり直しました。':'一手戻しました。');
}
// Two-ply expectimax: all 2/4 spawn positions, then the best next legal move.
// Hints never consume the gameplay RNG or modify score/history.
function grade2048(board){
 const log=board.map(v=>v?Math.log2(v):0),high=Math.max(...log);let smooth=0,monotone=0;
 for(let r=0;r<4;r++){
  for(const line of [log.slice(r*4,r*4+4),[log[r],log[r+4],log[r+8],log[r+12]]]){
   let up=0,down=0;for(let i=0;i<3;i++){const d=line[i]-line[i+1];up+=Math.max(0,d);down+=Math.max(0,-d);if(line[i]&&line[i+1])smooth+=Math.abs(d);}monotone+=Math.min(up,down);
  }
 }
 return board.filter(v=>!v).length*280-monotone*30-smooth*8+([0,3,12,15].some(i=>log[i]===high)?high*40:0);
}
function hintMove2048(){
 if(!active2048()||busy2048||waiting2048()||!$('#overlay').hidden)return;
 let choice=null,value=-Infinity;
 for(const direction of directions2048){
  const plan=plan2048(tiles,direction);if(!plan.changed)continue;
  const empty=plan.tiles.map((v,i)=>v===0?i:-1).filter(i=>i>=0);let expected=0;
  for(const index of empty)for(const [tile,probability] of [[2,.9],[4,.1]]){
   const sample=[...plan.tiles];sample[index]=tile;let response=-100000;
   for(const next of directions2048){const p=plan2048(sample,next);if(p.changed)response=Math.max(response,grade2048(p.tiles)+Math.log2(1+p.gain)*8);}
   expected+=response*probability/empty.length;
  }
  const rank=expected+Math.log2(1+plan.gain)*8;
  if(rank>value){value=rank;choice=direction;}
 }
 hint2048=choice;
 render2048(choice?`ヒント：${labels2048[choice]}へ。空きマス・数字の並び・次の合体を評価した目安です。成功を保証するものではありません。`:'動かせる手がありません。');
}
function game2048(){
 stopMotion2048();
 A.view(A.nav('2048',`<button data-action="gameHelp" aria-label="遊び方">?</button>`,'gamesLibrary','ゲーム')+`
 <div class="app-content arcade-play arc-legacy arc-2048 studio-2048" data-material="${prefs2048.theme}">
  <header class="g2048-heading"><div><span class="g2048-eyebrow">THE NUMBER ATELIER</span><h2>2048<span>.</span></h2><p>重なるたび、心地いい。</p></div><span class="g2048-seal" aria-hidden="true">2<sup>11</sup></span></header>
  <div class="g2048-scores"><div><small>スコア</small><strong id="score-2048">0</strong><span id="gain-2048" aria-hidden="true"></span></div><div><small>ベスト</small><strong id="best-2048">0</strong></div></div>
  <div class="g2048-goal"><div><span>次の目標 <strong id="goal-2048">2048</strong></span><span>最大 <b id="goal-current-2048">2</b></span></div><progress id="progress-2048" value="2" max="2048"></progress></div>
  <div class="board-2048" id="board-2048" tabindex="0" role="group" aria-label="2048の盤面" aria-describedby="instructions-2048"><div class="g2048-bed" aria-hidden="true">${'<span></span>'.repeat(16)}</div><div class="g2048-layer" id="tiles-2048" aria-hidden="true"></div><div class="g2048-effects" id="effects-2048" aria-hidden="true"></div></div>
  <div class="g2048-meta"><span><strong id="moves-2048">0</strong> 手</span><span>空き <strong id="empty-2048">14</strong></span><span>最大 <strong id="high-2048">2</strong></span></div>
  <div class="g2048-combo" id="combo-2048"></div>
  <section class="g2048-result" id="result-2048" aria-labelledby="result-title-2048" hidden><small>YOUR LITTLE MILESTONE</small><h3 id="result-title-2048"></h3><p id="result-copy-2048"></p><button id="continue-2048" data-action="continue2048">続ける</button><button data-action="restart2048">新しく始める</button></section>
  <div class="g2048-tools"><button id="undo-2048" data-action="undo2048" aria-label="一手戻す">${icon('arrow','style="transform:rotate(180deg)"')}<span>戻す <small id="undo-count-2048">0</small></span></button><button id="redo-2048" data-action="redo2048">${icon('arrow')}<span>やり直す</span></button><button id="hint-2048" data-action="hint2048">${icon('sun')}<span>ヒント</span></button><button data-action="restart2048">${icon('refresh')}<span>新しく</span></button></div>
  <p class="g2048-status" id="status-2048" role="status" aria-live="polite" aria-atomic="true"></p>
  <div class="g2048-pad" role="group" aria-label="移動方向">${[['up','↑'],['left','←'],['down','↓'],['right','→']].map(([d,s])=>`<button data-action="move2048" data-value="${d}" aria-label="${labels2048[d]}へ動かす">${s}</button>`).join('')}</div>
  <p id="instructions-2048" class="g2048-caption">スワイプ / 矢印 / WASD<br>取り消し Z ・ やり直し Y</p>
  <details class="g2048-settings g2048-practice"><summary>一手の予測と局面の保存</summary>
   <p>操作前に4方向を比較。新タイル1枚の出現後に残る空きマスも表示します。</p>
   <table class="g2048-forecast"><caption>次の一手の確定値（勝利確率ではありません）</caption><thead><tr><th scope="col">方向</th><th scope="col">加点</th><th scope="col">合体</th><th scope="col">空き</th></tr></thead><tbody>${directions2048.map(d=>`<tr id="forecast-2048-${d}"><th scope="row">${labels2048[d]}</th><td data-forecast="gain"></td><td data-forecast="pairs"></td><td data-forecast="space"></td></tr>`).join('')}</tbody></table>
   <div class="g2048-checkpoint"><h3>この局面を、残しておく。</h3><p id="checkpoint-copy-2048"></p><div id="checkpoint-board-2048" class="g2048-mini-board" role="img" hidden>${'<span aria-hidden="true"></span>'.repeat(16)}</div><div class="g2048-checkpoint-tools"><button id="checkpoint-save-2048" data-action="checkpointSave2048">局面を保存</button><button id="checkpoint-load-2048" data-action="checkpointLoad2048">局面に戻る</button><button id="checkpoint-delete-2048" data-action="checkpointDelete2048">保存を削除</button></div><p>保存は1枠。復帰しても最高点は残ります。復帰自体も「戻す」で取り消せます。</p></div>
  </details>
  <details class="g2048-settings"><summary>見た目とプレイ記録</summary><fieldset><legend>タイルの素材</legend>${[['ceramic','陶器'],['aurora','オーロラ']].map(([v,label])=>`<button data-action="theme2048" data-value="${v}" aria-pressed="${prefs2048.theme===v}">${label}</button>`).join('')}</fieldset><fieldset><legend>モーションの速さ</legend>${[['smooth','なめらか'],['quick','きびきび']].map(([v,label])=>`<button data-action="speed2048" data-value="${v}" aria-pressed="${prefs2048.speed===v}">${label}</button>`).join('')}</fieldset><p>「動きを抑える」設定と端末の動き軽減を優先します。</p><dl><div><dt>自己最大タイル</dt><dd id="record-tile-2048">2</dd></div><div><dt>最多連続合体</dt><dd><span id="record-combo-2048">0</span> 手</dd></div></dl><p>連続合体は演出・記録のみ。追加の得点倍率はありません。取り消し・やり直しは合計32手分を自動保存。再読み込み後も続けられます。</p></details>
  <button class="g2048-save" id="save-2048" data-action="save2048" aria-label="進行状況を保存し直す">端末に自動保存</button>
 </div>`);
 paint2048();save2048();render2048(recoveryNotice2048?'保存された盤面を読み込めなかったため、新しい盤面で開始しました。':'');recoveryNotice2048=false;
 const board=$('#board-2048');let pointer=null;
 const on=(target,type,fn,options)=>{target.addEventListener(type,fn,options);gameCleanups.push(()=>target.removeEventListener(type,fn,options));};
 on(board,'pointerdown',e=>{if(!e.isPrimary||e.button!==0||pointer)return;pointer={id:e.pointerId,x:e.clientX,y:e.clientY};board.setPointerCapture(e.pointerId);board.focus({preventScroll:true});});
 on(board,'pointerup',e=>{if(!pointer||e.pointerId!==pointer.id)return;const dx=e.clientX-pointer.x,dy=e.clientY-pointer.y;pointer=null;if(board.hasPointerCapture(e.pointerId))board.releasePointerCapture(e.pointerId);if(Math.max(Math.abs(dx),Math.abs(dy))<18)return;move2048(Math.abs(dx)>Math.abs(dy)?dx>0?'right':'left':dy>0?'down':'up');});
 const cancelPointer=()=>{pointer=null;};on(board,'pointercancel',cancelPointer);on(board,'lostpointercapture',cancelPointer);
 listenKey(e=>{
  if(!active2048()||!$('#overlay').hidden||e.isComposing||e.target.closest('input,textarea,select,[contenteditable]')||e.altKey)return;
  const key=e.key.toLowerCase(),modifier=e.ctrlKey||e.metaKey;
  if(key==='z'||key==='y'){e.preventDefault();if(!e.repeat)historyStep2048(key==='y'||e.shiftKey);return;}
  if(modifier)return;
  const d={arrowleft:'left',arrowright:'right',arrowup:'up',arrowdown:'down',a:'left',d:'right',w:'up',s:'down'}[key];
  if(d){e.preventDefault();if(e.repeat&&busy2048)return;move2048(d);}
 });
 const settle=()=>{pending2048=null;pointer=null;if(finishMove2048)finishMove2048();for(const animation of animations2048)animation.cancel();animations2048.clear();};
 on(document,'visibilitychange',()=>{if(document.hidden)settle();});on(window,'blur',settle);
 const media=window.matchMedia('(prefers-reduced-motion: reduce)');on(media,'change',()=>{if(reduced2048())settle();});
 const observer=new MutationObserver(()=>{if(!$('#overlay').hidden){pending2048=null;pointer=null;}if(reduced2048())settle();});
 observer.observe($('#overlay'),{attributes:true,attributeFilter:['hidden']});observer.observe($('#phone-screen'),{attributes:true,attributeFilter:['data-reduce-motion']});
 gameCleanups.push(()=>{observer.disconnect();stopMotion2048();nodes2048.clear();});
}
A.actions.move2048=el=>move2048(el.dataset.value);
A.actions.undo2048=()=>historyStep2048();A.actions.redo2048=()=>historyStep2048(true);A.actions.hint2048=hintMove2048;
A.actions.continue2048=()=>{if(!active2048()||busy2048)return;continued2048=true;save2048();render2048('4096、その先へ。続けてプレイできます。');$('#board-2048').focus({preventScroll:true});};
A.actions.save2048=()=>{if(!active2048())return;save2048();render2048(saveOK2048?'進行状況を保存しました。':'保存できませんでした。このページを閉じずに保存容量を確認してください。');};
A.actions.restart2048=()=>{if(!active2048())return;pending2048=null;A.confirm('新しい2048をはじめる','現在の盤面と取り消し履歴をリセットします。最高点・自己記録・見た目の設定は残ります。',()=>{
 if(!active2048())return;stopMotion2048();tiles=Array(16).fill(0);score=0;turns2048=0;combo2048=0;peakCombo2048=0;continued2048=false;history2048=[];future2048=[];seed2048=Math.floor(Math.random()*2**32);clearHint2048();spawn();spawn();save2048();paint2048();render2048('新しい盤面です。2048を目指しましょう。');
});};
function checkpointReady2048(){return active2048()&&!busy2048&&$('#overlay').hidden;}
A.actions.checkpointSave2048=()=>{
 if(!checkpointReady2048())return;pending2048=null;
 const store=()=>{
  if(!checkpointReady2048())return;const next={state:snapshot2048(),savedAt:Date.now()};
  if(A.save('2048checkpoint',next)){checkpoint2048=next;render2048('局面を保存しました。あとで同じ状態から再開できます。');}
  else render2048('局面の保存に失敗しました。以前に保存した局面は変更していません。');
 };
 if(checkpoint2048)A.confirm('保存した局面を置き換える？','保存は1枠です。以前の保存局面は、この局面に置き換わります。',store);else store();
};
A.actions.checkpointLoad2048=()=>{
 if(!checkpointReady2048()||!checkpoint2048)return;pending2048=null;
 A.confirm('保存した局面に戻る？','盤面・得点・手数を保存時点に戻します。最高点は残ります。復帰後の「戻す」で現在の局面へ戻れます。',()=>{
  if(!checkpointReady2048()||!checkpoint2048)return;
  stopMotion2048();history2048.push(snapshot2048());if(history2048.length>32)history2048.shift();future2048=[];
  restore2048(checkpoint2048.state);clearHint2048();save2048();paint2048();render2048('保存した局面に戻りました。「戻す」で復帰前に戻れます。');
 });
};
A.actions.checkpointDelete2048=()=>{
 if(!checkpointReady2048()||!checkpoint2048)return;
 A.confirm('保存した局面を削除する？','現在プレイしている盤面・得点・取り消し履歴は変更しません。',()=>{
  if(!checkpointReady2048())return;
  if(A.save('2048checkpoint',null)){checkpoint2048=null;render2048('保存した局面を削除しました。');}
  else render2048('保存した局面を削除できませんでした。');
 });
};
function preference2048(key,value){
 const allowed=key==='theme'?['ceramic','aurora']:['smooth','quick'];if(!active2048()||!allowed.includes(value))return;
 prefs2048[key]=value;const saved=A.save('2048preferences',prefs2048);
 if(!saved)render2048('見た目の設定を保存できませんでした。このページ内だけに適用します。');
 if(key==='theme')$('.studio-2048').dataset.material=value;
 A.$$(`.studio-2048 [data-action="${key}2048"]`).forEach(el=>el.setAttribute('aria-pressed',String(el.dataset.value===value)));
}
A.actions.theme2048=el=>preference2048('theme',el.dataset.value);A.actions.speed2048=el=>preference2048('speed',el.dataset.value);
// Little Snake — fixed-step rules, interpolated rendering and bounded local records.
const snakeSize=18;
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
const snakeBadges=[
 {id:'first',title:'はじめの一粒',detail:'実を1個食べる',earned:s=>s.fruit>=1},
 {id:'gold',title:'金色の寄り道',detail:'金の実を食べる',earned:s=>s.gold>=1},
 {id:'long',title:'庭の探検家',detail:'長さ24マスに育つ',earned:s=>s.body.length>=24},
 {id:'combo',title:'リズムマスター',detail:'ラッシュで4倍コンボ',earned:s=>s.mode==='rush'&&s.peakCombo===4},
 {id:'score',title:'豊かな収穫',detail:'1プレイで500点',earned:s=>s.score>=500},
 {id:'full',title:'庭の守り手',detail:'324マスを埋める',earned:s=>s.won}
];
const snakeBadgeRaw=A.load('snakeAchievements',[]);
const snakeAchievements=new Set((Array.isArray(snakeBadgeRaw)?snakeBadgeRaw:[]).filter(id=>snakeBadges.some(b=>b.id===id)));
let snake=null,snakeFrame=0,snakeLast=0,snakeCanvas=null,snakeGround=null,snakeGroundKey='',snakeParticles=[],snakeFloats=[];
let snakeSaveOK=true,snakeScoreAnimation=null;
const snakeMotionQuery=matchMedia('(prefers-reduced-motion: reduce)');
const snakeReduced=()=>!!A.settings.reduceMotion||snakeMotionQuery.matches;
const sameSnakeCell=(a,b)=>!!a&&!!b&&a.x===b.x&&a.y===b.y;
const snakeLevel=()=>1+Math.floor(snake.fruit/5);
const snakeStep=()=>Math.max(snakeModes[snake.mode].min,snakeModes[snake.mode].step-(snakeLevel()-1)*6);
function resetSnake(){
 const body=[{x:7,y:9},{x:6,y:9},{x:5,y:9},{x:4,y:9}];
 snake={body,previous:body.map(p=>({...p})),direction:{x:1,y:0},oldDirection:{x:1,y:0},queue:[],mode:snakePrefs.mode,score:0,fruit:0,gold:0,peakCombo:0,bestAtStart:snakeRecords[snakePrefs.mode].best,time:0,lastFruit:-Infinity,combo:0,bonus:null,food:null,step:snakeModes[snakePrefs.mode].step,accumulator:0,running:false,started:false,over:false,won:false,recorded:false,reason:''};
 snakeParticles=[];snakeFloats=[];snake.food=freeSnakeCell();snakeText('snake-achievement-notice','');
}
// Saved runs are untrusted input: validate geometry before restoring a paused run.
function restoreSnake(){
 const saved=A.load('snakeSession',null);
 if(!saved||saved.version!==1||typeof saved.mode!=='string'||!Object.hasOwn(snakeModes,saved.mode))return false;
 const cell=p=>p&&Number.isInteger(p.x)&&Number.isInteger(p.y)&&p.x>=0&&p.y>=0&&p.x<18&&p.y<18;
 const integer=(n,max)=>Number.isSafeInteger(n)&&n>=0&&n<=max;
 const b=saved.body;
 if(!Array.isArray(b)||b.length<4||b.length>323||!b.every(cell)||new Set(b.map(p=>p.y*18+p.x)).size!==b.length)return false;
 if(!Object.values(snakeDirections).some(d=>sameSnakeCell(d,saved.direction)))return false;
 const distance=(a,b)=>{const x=Math.abs(a.x-b.x),y=Math.abs(a.y-b.y);return snakeModes[saved.mode].wrap?Math.min(x,18-x)+Math.min(y,18-y):x+y;};
 if(b.some((p,i)=>i>0&&distance(p,b[i-1])!==1))return false;
 const neck={x:b[1].x+saved.direction.x,y:b[1].y+saved.direction.y};
 if(snakeModes[saved.mode].wrap){neck.x=(neck.x+18)%18;neck.y=(neck.y+18)%18;}
 if(!sameSnakeCell(neck,b[0])||!cell(saved.food)||b.some(p=>sameSnakeCell(p,saved.food)))return false;
 if(!integer(saved.score,38400)||!integer(saved.fruit,319)||saved.fruit!==b.length-4||!integer(saved.gold,saved.fruit)||!integer(saved.peakCombo,4)||!integer(saved.bestAtStart,1e9))return false;
 if(!Number.isFinite(saved.time)||saved.time<0||saved.time>1e12||!integer(saved.combo,4)||saved.combo>saved.peakCombo)return false;
 if(saved.lastFruit!==null&&(!Number.isFinite(saved.lastFruit)||saved.lastFruit<0||saved.lastFruit>saved.time))return false;
 if(saved.bonus&&(!cell(saved.bonus)||sameSnakeCell(saved.bonus,saved.food)||b.some(p=>sameSnakeCell(p,saved.bonus))||!Number.isFinite(saved.bonus.until)||saved.bonus.until<=saved.time||saved.bonus.until>saved.time+8000))return false;
 snakePrefs.mode=saved.mode;resetSnake();
 snake.body=b.map(p=>({x:p.x,y:p.y}));snake.previous=snake.body.map(p=>({...p}));
 snake.direction={x:saved.direction.x,y:saved.direction.y};snake.oldDirection={...snake.direction};
 for(const key of ['score','fruit','gold','peakCombo','bestAtStart','time','combo'])snake[key]=saved[key];
 snake.lastFruit=saved.lastFruit===null?-Infinity:saved.lastFruit;
 snake.food={x:saved.food.x,y:saved.food.y};snake.bonus=saved.bonus?{x:saved.bonus.x,y:saved.bonus.y,until:saved.bonus.until}:null;
 snake.started=true;snake.step=snakeStep();snake.reason='保存した庭を復元しました。「再開」で続けられます';
 return true;
}
function snakeSnapshot(){
 if(!snake?.started||snake.over)return null;
 return {version:1,mode:snake.mode,body:snake.body,direction:snake.direction,food:snake.food,bonus:snake.bonus,score:snake.score,fruit:snake.fruit,gold:snake.gold,peakCombo:snake.peakCombo,bestAtStart:snake.bestAtStart,time:snake.time,lastFruit:Number.isFinite(snake.lastFruit)?snake.lastFruit:null,combo:snake.combo};
}
function earnSnakeBadges(){
 const earned=snakeBadges.filter(b=>!snakeAchievements.has(b.id)&&b.earned(snake));
 if(!earned.length)return;
 earned.forEach(b=>snakeAchievements.add(b.id));
 snakeText('snake-achievement-notice','実績達成：'+earned.map(b=>b.title).join('・'));
}
function freeSnakeCell(exclude=null){
 const occupied=new Set(snake.body.map(p=>p.y*snakeSize+p.x));
 if(exclude)occupied.add(exclude.y*snakeSize+exclude.x);
 const free=[];for(let i=0;i<snakeSize*snakeSize;i++)if(!occupied.has(i))free.push(i);
 if(!free.length)return null;
 const cell=free[Math.floor(Math.random()*free.length)];return {x:cell%snakeSize,y:Math.floor(cell/snakeSize)};
}
function saveSnakeRecords(force=true){
 if(!snake)return false;
 snakeBest=Math.max(snakeBest,snake.score);snakeRecords[snake.mode].best=Math.max(snakeRecords[snake.mode].best,snake.score);
 if(!force&&!snakeSaveOK)return false;
 // Snapshot, records and completion history succeed or roll back together.
 snakeSaveOK=A.saveBatch({snakeBest,snakeRecords,snakeHistory,snakeSession:snakeSnapshot(),snakeAchievements:[...snakeAchievements]});
 snakeText('snake-save-status',snakeSaveOK?'端末内に保存済み':'未保存：容量やブラウザ設定を確認し、保存を再試行してください');
 $('#snake-save-status')?.classList.toggle('save-error',!snakeSaveOK);
 return snakeSaveOK;
}
function finishSnake(reason,won=false){
 snake.over=true;snake.won=won;snake.reason=reason;snake.running=false;snake.queue=[];
 snake.previous=snake.body.map(p=>({...p}));snake.accumulator=snake.step;
 if(!snake.recorded){
  snake.recorded=true;const r=snakeRecords[snake.mode];r.plays++;r.fruit+=snake.fruit;r.length=Math.max(r.length,snake.body.length);
  snakeHistory=[{mode:snake.mode,score:snake.score,fruit:snake.fruit,seconds:Math.floor(snake.time/1000),won},...snakeHistory].slice(0,8);
  earnSnakeBadges();saveSnakeRecords();
 }
 updateSnakeUi();
}
function stopSnake(reason='一時停止中。再開ボタンで続けられます'){
 cancelAnimationFrame(snakeFrame);snakeFrame=0;
 if(!snake)return;
 snake.running=false;snake.queue=[];if(!snake.over)snake.reason=reason;
 if(snake.started)saveSnakeRecords();
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
  snake.lastFruit=snake.time;const gain=(gold?30:10)*snake.combo;snake.score+=gain;snake.fruit++;
  if(gold)snake.gold++;snake.peakCombo=Math.max(snake.peakCombo,snake.combo);
  if(!snakeReduced())snakeFloats=[...snakeFloats,{x:(head.x+.5)*36,y:(head.y+.5)*36,gain,born:snake.time,gold}].slice(-8);
  burstSnake(head,gold);earnSnakeBadges();A.haptic();
  if(gold)snake.bonus=null;
  if(snake.body.length===snakeSize*snakeSize){snake.food=null;snake.bonus=null;finishSnake('庭いっぱいに育ちました',true);return;}
  if(normal){
   snake.food=freeSnakeCell(snake.bonus);
   // If the bonus occupies the final free cell, turn it into the normal fruit.
   if(!snake.food){snake.bonus=null;snake.food=freeSnakeCell();}
  }
  if(snake.fruit%5===0&&!snake.bonus){const cell=freeSnakeCell(snake.food);if(cell)snake.bonus={...cell,until:snake.time+8000};}
  saveSnakeRecords(false);updateSnakeUi();
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
 snakeFloats=snakeFloats.filter(p=>snake.time-p.born<950);
 if(snake.running&&Math.floor((snake.time-dt)/2000)!==Math.floor(snake.time/2000))saveSnakeRecords(false);
 if(Math.floor((snake.time-dt)/100)!==Math.floor(snake.time/100))updateSnakeUi();
 drawSnake();if(snake.running)snakeFrame=requestAnimationFrame(snakeLoop);
}
function toggleSnake(){
 if(!snakeCanvas?.isConnected||!$('#overlay').hidden||document.hidden)return;
 if(snake.running){stopSnake();return;}
 if(snake.over)resetSnake();
 if(!snake.started){snake.started=true;snake.accumulator=snake.step;}
 snake.reason='';snake.running=true;snakeLast=performance.now();
 $('.snake-settings').open=false;saveSnakeRecords();updateSnakeUi();snakeCanvas.focus({preventScroll:true});
 cancelAnimationFrame(snakeFrame);snakeFrame=requestAnimationFrame(snakeLoop);
}
function steerSnake(id){
 if(!snake||snake.over||!snakeCanvas?.isConnected||!$('#overlay').hidden)return;
 const d=snakeDirections[id],last=snake.queue.at(-1)||snake.direction;if(!d||snake.queue.length>=2)return;
 if(d.x===-last.x&&d.y===-last.y)return;
 if(d.x===last.x&&d.y===last.y){if(!snake.started)toggleSnake();return;}
 snake.queue.push({...d});if(!snake.started)toggleSnake();
}
function snakeText(id,text){const el=$('#'+id);if(el&&el.textContent!==String(text))el.textContent=text;}
function updateSnakeUi(){
 if(!$('#snake-toggle')||!snake)return;
 const r=snakeRecords[snake.mode],seconds=Math.floor(snake.time/1000);
 const scoreEl=$('#snake-score'),changed=scoreEl.textContent!==snake.score.toLocaleString();
 snakeText('snake-score',snake.score.toLocaleString());snakeText('snake-best',r.best.toLocaleString());
 if(changed&&snake.started&&!snakeReduced()&&scoreEl.animate){snakeScoreAnimation?.cancel();snakeScoreAnimation=scoreEl.animate([{transform:'scale(1)'},{transform:'scale(1.13)'},{transform:'scale(1)'}],{duration:260,easing:'ease-out'});}
 const target=[5,15,30,60,120,320].find(n=>snake.fruit<n)||320;
 snakeText('snake-goal',snake.won?'庭の成長目標をすべて達成':`成長目標：実を${target}個 · ${snake.fruit} / ${target}`);
 const progress=$('#snake-goal-progress');progress.max=target;progress.value=snake.fruit;
 snakeText('snake-best-note',snake.score>snake.bestAtStart?'このモードの自己ベスト更新中':`自己ベストまで ${Math.max(0,snake.bestAtStart-snake.score+10)}点`);
 const badges=$('#snake-badges'),badgeKey=[...snakeAchievements].sort().join(',');
 if(badges.dataset.key!==badgeKey){badges.dataset.key=badgeKey;badges.innerHTML=snakeBadges.map(b=>`<li class="${snakeAchievements.has(b.id)?'earned':''}"><span aria-hidden="true">${snakeAchievements.has(b.id)?'◆':'◇'}</span><div><strong>${b.title}</strong><small>${b.detail} · ${snakeAchievements.has(b.id)?'達成済み':'未達成'}</small></div></li>`).join('');}
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
 snakeText('snake-curtain-copy',snake.over?`${snake.score>snake.bestAtStart?'自己ベスト更新 · ':''}${snake.score}点 · 実${snake.fruit}個 · ${seconds}秒`:snake.started?'再開を押すまで、庭の時間は止まります。':'実を食べて、少しずつ長く。');
 snakeText('snake-curtain-action',snake.over?'もう一度遊ぶ':snake.started?'続きから':'庭に入る');
 snakeText('snake-record-summary',`${snakeModes[snake.mode].label} · ${r.plays}回終了 · 累計${r.fruit}個 · 最長${r.length}マス`);
 const historyKey=snakeHistory.map(r=>`${r.mode}:${r.score}:${r.seconds}:${r.fruit}:${r.won}`).join('|');
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
 const xCopies=[0],yCopies=[0];
 if(snakeModes[snake.mode].wrap){
  if(points.some(p=>p.x<36))xCopies.push(648);if(points.some(p=>p.x>612))xCopies.push(-648);
  if(points.some(p=>p.y<36))yCopies.push(648);if(points.some(p=>p.y>612))yCopies.push(-648);
 }
 ctx.lineCap='round';ctx.lineJoin='round';
 // Construct the tube once per frame, reuse it for its material layers.
 const bodyPath=new Path2D();
 for(let i=points.length-1;i>0;i--){const a=points[i],b=points[i-1];let dx=b.x-a.x,dy=b.y-a.y;if(Math.abs(dx)>324)dx-=Math.sign(dx)*648;if(Math.abs(dy)>324)dy-=Math.sign(dy)*648;bodyPath.moveTo(a.x,a.y);bodyPath.lineTo(a.x+dx,a.y+dy);}
 for(const ox of xCopies)for(const oy of yCopies){
  ctx.save();ctx.translate(ox,oy);
  if(rich){ctx.save();ctx.translate(1,5);ctx.strokeStyle='#001f2280';ctx.lineWidth=29;ctx.stroke(bodyPath);ctx.restore();}
  ctx.strokeStyle=snakePrefs.theme==='moon'?'#4cabb2':'#549777';ctx.lineWidth=27;ctx.stroke(bodyPath);
  const skin=ctx.createLinearGradient(0,0,648,648);skin.addColorStop(0,snakePrefs.theme==='moon'?'#ccfff1':'#e0f4a9');skin.addColorStop(.5,snakePrefs.theme==='moon'?'#7eddd6':'#a5d28a');skin.addColorStop(1,snakePrefs.theme==='moon'?'#5eb3c2':'#72b58c');ctx.strokeStyle=skin;ctx.lineWidth=22;ctx.stroke(bodyPath);
  if(rich){ctx.save();ctx.translate(-1.5,-3);ctx.strokeStyle='#efffd733';ctx.lineWidth=5;ctx.stroke(bodyPath);ctx.restore();}
  for(let i=points.length-1;i>0;i--){const p=points[i];if(i%2===0&&rich){snakeCircle(ctx,p.x-2,p.y-2,2,'#f4ffe14d');snakeCircle(ctx,p.x+3,p.y+3,1.5,'#1f725329');}}
  const h=points[0],from=Math.atan2(snake.oldDirection.y,snake.oldDirection.x),to=Math.atan2(snake.direction.y,snake.direction.x),angle=from+Math.atan2(Math.sin(to-from),Math.cos(to-from))*alpha;
  ctx.save();ctx.translate(h.x,h.y);ctx.rotate(angle);
  const head=ctx.createRadialGradient(-4,-6,1,0,0,18);head.addColorStop(0,snakePrefs.theme==='moon'?'#e3fff1':'#e6f5b5');head.addColorStop(1,snakePrefs.theme==='moon'?'#72c6cc':'#92bd73');ctx.fillStyle=head;ctx.beginPath();ctx.ellipse(0,0,17,15,0,0,Math.PI*2);ctx.fill();
  const blink=decorative&&snake.time%4700>4500;
  for(const y of [-8,8]){ctx.fillStyle='#f8fff0';ctx.beginPath();ctx.ellipse(7,y,5,blink?1.6:5.8,0,0,Math.PI*2);ctx.fill();if(!blink){snakeCircle(ctx,9,y,2.7,'#183d39');snakeCircle(ctx,9,y-1,1,'#fff');}}
  ctx.strokeStyle='#507a55';ctx.lineWidth=1.5;ctx.beginPath();ctx.arc(11,0,3,-.8,.8);ctx.stroke();ctx.restore();ctx.restore();
 }
 if(decorative)for(const p of snakeParticles){const age=(snake.time-p.born)/1000;ctx.globalAlpha=Math.max(0,1-age/.65);snakeCircle(ctx,p.x+p.vx*age,p.y+p.vy*age+35*age*age,Math.max(.5,3-age*3),p.color);}ctx.globalAlpha=1;
 if(!reduced){ctx.save();ctx.textAlign='center';ctx.font='600 23px sans-serif';ctx.lineWidth=4;ctx.strokeStyle='#173b35';for(const p of snakeFloats){const age=(snake.time-p.born)/950,text='+'+p.gain,x=Math.max(38,Math.min(610,p.x)),y=Math.max(30,p.y-12-age*30);ctx.globalAlpha=Math.max(0,1-age);ctx.strokeText(text,x,y);ctx.fillStyle=p.gold?'#ffe09b':'#f4ffda';ctx.fillText(text,x,y);}ctx.restore();}

}
function gameSnake(){
 if(!snake&&!restoreSnake())resetSnake();
 A.view(A.nav('Little Snake',`<button data-action="snakeHelp" aria-label="リトルスネークの遊び方">?</button>`,'gamesLibrary','ゲーム')+`<div class="app-content snake-studio">
 <header class="snake-heading"><div><small>THE LITTLE GARDEN</small><h2>Little Snake<span>.</span></h2><p>実を集めて、自分だけの長い旅へ。</p></div><span class="snake-edition">18 × 18<br>GARDEN</span></header>
 <div class="snake-modes" role="group" aria-label="プレイモード">${Object.entries(snakeModes).map(([id,m])=>`<button data-action="snakeMode" data-value="${id}" aria-pressed="${id===snake.mode}">${m.label}</button>`).join('')}</div>
 <div class="snake-scorebar"><div><small>SCORE</small><strong id="snake-score">0</strong></div><div><small>MODE BEST</small><strong id="snake-best">0</strong></div><div><small>LEVEL</small><strong id="snake-level">1</strong></div><div><small>LENGTH</small><strong id="snake-length">4</strong></div></div>
 <div class="snake-stage"><canvas class="snake-board" id="snake-board" width="648" height="648" tabindex="0" aria-label="18行18列のスネーク盤面。矢印キーまたはWASDで操作" aria-describedby="snake-status snake-instructions">Canvasに対応したブラウザが必要です。</canvas>
 <div class="snake-curtain" id="snake-curtain"><div><small>LITTLE SNAKE</small><h3 id="snake-curtain-title"></h3><p id="snake-curtain-copy"></p><button data-action="snakeToggle" id="snake-curtain-action">庭に入る</button></div></div></div>
 <div class="snake-livebar"><span id="snake-combo"></span><span id="snake-bonus"></span><time id="snake-time">0:00</time></div><div class="snake-combo-track" aria-hidden="true"><i id="snake-combo-meter"></i></div>
 <div class="snake-actions"><button data-action="snakeToggle" id="snake-toggle">スタート</button><button data-action="snakeRestart">やり直す</button></div>
 <p class="snake-status" id="snake-status" role="status" aria-live="polite"></p>
 <div class="snake-goal"><div><span id="snake-goal"></span><small id="snake-best-note"></small></div><progress id="snake-goal-progress" max="5" value="0" aria-label="今回の成長目標の達成度"></progress></div>
 <div class="snake-pad" role="group" aria-label="方向操作">${[['up','↑','上'],['left','←','左'],['down','↓','下'],['right','→','右']].map(([id,symbol,label])=>`<button data-action="snakeDirection" data-value="${id}" aria-label="${label}へ進む">${symbol}</button>`).join('')}</div>
 <p class="snake-instructions" id="snake-instructions">スワイプ / 矢印 / WASD · Spaceで一時停止<br>一時停止後は「再開」で続けます</p>
 <p class="snake-achievement-notice" id="snake-achievement-notice" role="status" aria-live="polite"></p>
 <details class="snake-settings"><summary>庭の見た目と記録</summary><div class="snake-options"><button data-action="snakeTheme" id="snake-theme"></button><button data-action="snakeQuality" id="snake-quality"></button><button data-action="snakeGrid" id="snake-grid"></button></div><p id="snake-record-summary"></p><h3>6つの実績</h3><ul id="snake-badges" class="snake-badges"></ul><h3>最近の8プレイ</h3><ol id="snake-history"></ol><div class="snake-save-row"><p id="snake-save-status" role="status"></p><button data-action="snakeSave">今すぐ保存</button></div><p class="snake-save-note">盤面も端末内に自動保存。再読み込み後は一時停止から再開できます。保存は1プレイ分です。</p></details></div>`);
 snakeCanvas=$('#snake-board');const canvas=snakeCanvas;
 const on=(el,event,fn,options)=>{el.addEventListener(event,fn,options);gameCleanups.push(()=>el.removeEventListener(event,fn,options));};
 on(document,'visibilitychange',()=>{if(document.hidden)stopSnake('タブを離れたため一時停止しました');});
 on(window,'blur',()=>stopSnake('別の画面に移ったため一時停止しました'));
 on(window,'pagehide',()=>stopSnake('ページを閉じたため保存しました'));
 on($('.snake-settings'),'toggle',e=>{if(e.target.open&&snake.running)stopSnake('見た目と記録を確認中です');});
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
 gameCleanups.push(()=>{stopSnake('おかえりなさい。「再開」で続けられます');snakeCanvas=null;snakeGround=null;snakeParticles=[];snakeFloats=[];snakeScoreAnimation?.cancel();});
 updateSnakeOptions();updateSnakeUi();fitSnakeCanvas();
 snakeText('snake-save-status',snakeSaveOK?'自動保存：2秒ごと・実の獲得時・一時停止時':'未保存：保存を再試行してください');
}
function updateSnakeOptions(){
 snakeText('snake-theme',snakePrefs.theme==='moon'?'庭：月あかり':'庭：木もれび');
 snakeText('snake-quality',snakePrefs.quality==='rich'?'描画：高精細':'描画：軽量');
 snakeText('snake-grid',snakePrefs.grid?'マス目：オン':'マス目：オフ');$('#snake-grid')?.setAttribute('aria-pressed',String(snakePrefs.grid));
}
function changeSnakeLook(key,value){snakePrefs[key]=value;A.save('snakePreferences',snakePrefs);snakeGround=null;updateSnakeOptions();fitSnakeCanvas();}
function restartSnake(mode=snake.mode){
 const reset=()=>{snakePrefs.mode=mode;A.save('snakePreferences',snakePrefs);resetSnake();saveSnakeRecords();snakeText('snake-achievement-notice','');A.$$('.snake-modes button').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.value===mode)));updateSnakeUi();drawSnake();};
 stopSnake();if(snake.started&&!snake.over)A.confirm('新しい庭から始めますか？','今のスコアと盤面はリセットします。保存済みの記録は残ります。',reset);else reset();
}
A.actions.snakeSave=()=>{if(snake.running)stopSnake();else{saveSnakeRecords();updateSnakeUi();}};
A.actions.snakeToggle=toggleSnake;
A.actions.snakeDirection=(el,event)=>{if(!event||event.detail===0)steerSnake(el.dataset.value);};
A.actions.snakeRestart=()=>restartSnake();
A.actions.snakeMode=el=>{if(Object.hasOwn(snakeModes,el.dataset.value)&&el.dataset.value!==snake.mode)restartSnake(el.dataset.value);};
A.actions.snakeTheme=()=>changeSnakeLook('theme',snakePrefs.theme==='moon'?'meadow':'moon');
A.actions.snakeQuality=()=>changeSnakeLook('quality',snakePrefs.quality==='rich'?'lite':'rich');
A.actions.snakeGrid=()=>changeSnakeLook('grid',!snakePrefs.grid);
A.actions.snakeHelp=()=>{
 stopSnake('遊び方を確認中です。閉じてから再開できます');
 A.overlay(`${A.overlayTitle('Little Snake の遊び方')}<div class="about-copy"><p>矢印キー・WASD・盤面のスワイプ・方向ボタンで操作。曲がる方向は2回先まで予約でき、直接の逆走はできません。</p><p>クラシックは壁と自分の体に当たると終了。おさんぽは低速で、壁を抜けて反対側へ移動します。ラッシュは速い移動と6秒以内の連続獲得で最大4倍のコンボに挑戦できます。</p><p>実は10点。5個食べるごとに、空きマスがあれば金の実が8秒間登場します。金の実は30点。どちらも体が1マス伸び、ラッシュでは倍率がかかります。5個ごとにレベルが上がり、おさんぽ以外は少しずつ速くなります。324マスすべて埋めるとクリアです。</p><p>Space（ボタン選択中はそのボタンを操作）で一時停止。タブ切替・メニュー・アプリ移動でも停止し、自動では再開しません。盤面は2秒ごと・実の獲得・一時停止時に保存します。再読み込み後も必ず一時停止から再開し、閉じていた時間は加算しません。保存に失敗した場合は「今すぐ保存」で再試行できます。</p><p>成長目標と6つの実績に挑戦できます。実績はゲームをやり直しても残ります。モード別最高点・終了した直近8プレイ・庭の見た目を端末内に保存。旧最高点はゲーム一覧の総合BESTに残します。「動きを減らす」では補間・粒子・背景演出を止め、軽量描画では演出と解像度を抑えます。</p></div>`);
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
A.actions.gameHelp=()=>{if(gamePage==='snake')return A.actions.snakeHelp();const help=gamePage==='2048'?['2048 の遊び方','盤面を上下左右にスワイプすると、すべてのタイルが動きます。同じ数字がぶつかると合体し、数字が2倍になります。','合体した数字がスコアに加算されます。2048をつくった後も続けられます。動かせなくなったら終了です。','スワイプ・矢印キー・WASD・方向ボタンで操作。Zで戻す、YまたはShift+Zでやり直します。直近32手まで取り消せます。取り消し後に別の手を進めると、やり直し履歴は消えます。', 'ヒントは新タイルの出現と次の一手を評価した目安で、勝利を保証しません。連続合体に得点倍率はなく、合体した数字だけが得点になります。', '盤面・得点・手数・連続合体・達成後の続行状態を自動保存します。取り消し／やり直し履歴は合計32手分を自動保存し、再読み込み後も復元します。「一手の予測と局面の保存」では4方向の比較と、好きな局面1つの保存・復帰ができます。最高点と自己記録は取り消しても残ります。見た目と速さは「見た目とプレイ記録」から変更できます。']:gamePage==='snake'?['Little Snake の遊び方','スタートを押し、スワイプ・矢印キー・画面の方向ボタンでヘビを動かします。小さな実を食べると10点獲得します。','壁や自分の体にぶつかると終了です。来た方向へすぐに逆走することはできません。','アプリを離れると一時停止します。スペースキーでも一時停止できます。']:['Memory Garden の遊び方','カードを2枚めくり、同じ絵柄のペアを探しましょう。一致したカードは表向きのまま残ります。','8組のペアが揃えばクリア。2枚めくるたびに1手として数えます。少ない手数でのクリアに挑戦してください。','ハイスコアは最少手数です。アプリを開き直すと新しいお庭になります。'];A.overlay(`${A.overlayTitle(help[0])}<div class="about-copy">${help.slice(1).map(p=>`<p style="margin:22px 0">${p}</p>`).join('')}</div><button class="control-tile" data-action="closeOverlay" style="width:100%;margin-top:30px">遊んでみる</button>`);};
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
