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
let history2048=[],future2048=[],nodes2048=new Map(),animations2048=new Set();
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
 saveOK2048=A.saveBatch({'2048best':best,'2048state':snapshot2048(),'2048records':records2048});
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
 const animation=el.animate(frames,options);animations2048.add(animation);
 const done=()=>animations2048.delete(animation);animation.onfinish=done;animation.oncancel=done;
}
function stopMotion2048(){
 clearTimeout(moveTimer2048);moveTimer2048=null;finishMove2048=null;pending2048=null;busy2048=false;
 for(const animation of animations2048)animation.cancel();animations2048.clear();
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
 $('#result-2048').hidden=!(over||win);$('#result-title-2048').textContent=win?'2048、達成。':'ひと休み。また、その先へ。';
 $('#result-copy-2048').textContent=win?'おめでとうございます。4096、その先も目指せます。':`${number2048(score)}点・${number2048(turns2048)}手。${history2048.length?'「戻す」で別の道を探せます。':'新しい盤面でもう一度。'}`;
 $('#continue-2048').hidden=!win;
 $('#save-2048').textContent=saveOK2048?'端末に自動保存':'未保存・保存し直す';$('#save-2048').classList.toggle('save-failed',!saveOK2048);
 $('#status-2048').textContent=message||(win?'2048達成。「続ける」でプレイを再開できます。':over?'動かせる手がありません。':empty<=2?'空きマスが少なくなっています。合体でスペースを確保。':'同じ数字を重ねて、2048へ。');
 board.setAttribute('aria-label',`2048の盤面。スコア ${score}。`+Array.from({length:4},(_,r)=>`${r+1}行目 ${tiles.slice(r*4,r*4+4).map(v=>v||'空').join('、')}`).join('。'));
}
function slide2048(plan,spawned){
 const layer=$('#tiles-2048'),duration=reduced2048()?0:prefs2048.speed==='quick'?95:150;
 const step=(layer.clientWidth+parseFloat(getComputedStyle(layer).getPropertyValue('--g-gap')))/4;
 const survivors=new Map(),removed=[];
 busy2048=true;
 for(const path of plan.paths){
  const el=nodes2048.get(path.from);if(!el)continue;
  position2048(el,path.to);el.style.zIndex=path.consumed?'2':'3';
  if(path.from!==path.to)animate2048(el,[{transform:`translate3d(${(path.from%4-path.to%4)*step}px,${(Math.floor(path.from/4)-Math.floor(path.to/4))*step}px,0)`},{transform:'translate3d(0,0,0)'}],{duration,easing:'cubic-bezier(.2,.75,.25,1)'});
  if(path.consumed)removed.push(el);else survivors.set(path.to,el);
 }
 nodes2048=survivors;
 const finish=()=>{
  clearTimeout(moveTimer2048);moveTimer2048=null;finishMove2048=null;
  removed.forEach(el=>el.remove());
  for(const [index,el] of survivors){
   face2048(el,tiles[index]);el.style.zIndex='';
   if(plan.merged.includes(index))animate2048(el.firstElementChild,[{transform:'scale(.92)'},{transform:'scale(1.12)',offset:.45},{transform:'scale(1)'}],{duration:220,easing:'cubic-bezier(.2,.8,.3,1)'});
  }
  if(spawned>=0){const el=tile2048(spawned,tiles[spawned]);nodes2048.set(spawned,el);layer.append(el);animate2048(el.firstElementChild,[{transform:'scale(.5)',opacity:0},{transform:'scale(1)',opacity:1}],{duration:180,easing:'cubic-bezier(.16,1,.3,1)'});}
  busy2048=false;
  const message=waiting2048()||!movable()?'':plan.gain?`${plan.merged.length}組が合体、${number2048(plan.gain)}点獲得。${combo2048>1?combo2048+'手連続の合体。':''}`:'タイルを移動しました。';
  render2048(message);
  if(plan.gain){const gain=$('#gain-2048');gain.textContent='+'+number2048(plan.gain);animate2048(gain,[{opacity:1,transform:'translateY(5px)'},{opacity:0,transform:'translateY(-22px)'}],{duration:700,easing:'ease-out'});}
  if(waiting2048())animate2048($('#result-2048'),[{opacity:0,transform:'translateY(8px)'},{opacity:1,transform:'translateY(0)'}],{duration:320,easing:'ease-out'});
  const next=pending2048;pending2048=null;if(next)move2048(next);
 };
 finishMove2048=finish;
 $('#undo-2048').disabled=true;$('#redo-2048').disabled=true;$('#hint-2048').disabled=true;
 if(duration)moveTimer2048=setTimeout(finish,duration);else finish();
}
function move2048(direction){
 if(!directions2048.includes(direction)||!active2048()||!$('#overlay').hidden||waiting2048())return;
 if(busy2048){pending2048=direction;return;}
 clearHint2048();const plan=plan2048(tiles,direction);
 if(!plan.changed){render2048(movable()?'その方向には動かせません。別の方向へ。':'動かせる手がありません。戻すか、新しく始めましょう。');return;}
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
  <div class="board-2048" id="board-2048" tabindex="0" role="group" aria-label="2048の盤面" aria-describedby="instructions-2048"><div class="g2048-bed" aria-hidden="true">${'<span></span>'.repeat(16)}</div><div class="g2048-layer" id="tiles-2048" aria-hidden="true"></div></div>
  <div class="g2048-meta"><span><strong id="moves-2048">0</strong> 手</span><span>空き <strong id="empty-2048">14</strong></span><span>最大 <strong id="high-2048">2</strong></span></div>
  <div class="g2048-combo" id="combo-2048"></div>
  <section class="g2048-result" id="result-2048" aria-labelledby="result-title-2048" hidden><small>YOUR LITTLE MILESTONE</small><h3 id="result-title-2048"></h3><p id="result-copy-2048"></p><button id="continue-2048" data-action="continue2048">続ける</button><button data-action="restart2048">新しく始める</button></section>
  <div class="g2048-tools"><button id="undo-2048" data-action="undo2048" aria-label="一手戻す">${icon('back')}<span>戻す <small id="undo-count-2048">0</small></span></button><button id="redo-2048" data-action="redo2048">${icon('arrow')}<span>やり直す</span></button><button id="hint-2048" data-action="hint2048">${icon('sun')}<span>ヒント</span></button><button data-action="restart2048">${icon('refresh')}<span>新しく</span></button></div>
  <p class="g2048-status" id="status-2048" role="status" aria-live="polite" aria-atomic="true"></p>
  <div class="g2048-pad" role="group" aria-label="移動方向">${[['up','↑'],['left','←'],['down','↓'],['right','→']].map(([d,s])=>`<button data-action="move2048" data-value="${d}" aria-label="${labels2048[d]}へ動かす">${s}</button>`).join('')}</div>
  <p id="instructions-2048" class="g2048-caption">スワイプ / 矢印 / WASD<br>取り消し Z ・ やり直し Y</p>
  <details class="g2048-settings"><summary>見た目とプレイ記録</summary><fieldset><legend>タイルの素材</legend>${[['ceramic','陶器'],['aurora','オーロラ']].map(([v,label])=>`<button data-action="theme2048" data-value="${v}" aria-pressed="${prefs2048.theme===v}">${label}</button>`).join('')}</fieldset><fieldset><legend>モーションの速さ</legend>${[['smooth','なめらか'],['quick','きびきび']].map(([v,label])=>`<button data-action="speed2048" data-value="${v}" aria-pressed="${prefs2048.speed===v}">${label}</button>`).join('')}</fieldset><p>「動きを抑える」設定と端末の動き軽減を優先します。</p><dl><div><dt>自己最大タイル</dt><dd id="record-tile-2048">2</dd></div><div><dt>最多連続合体</dt><dd><span id="record-combo-2048">0</span> 手</dd></div></dl><p>連続合体は演出・記録のみ。追加の得点倍率はありません。取り消し履歴はこのページ内で直近32手まで。</p></details>
  <button class="g2048-save" id="save-2048" data-action="save2048" aria-label="進行状況を保存し直す">端末に自動保存</button>
 </div>`);
 paint2048();save2048();render2048(saved2048&&!restored2048?'保存された盤面を読み込めなかったため、新しい盤面で開始しました。':'');
 const board=$('#board-2048');let pointer=null;
 const on=(target,type,fn,options)=>{target.addEventListener(type,fn,options);gameCleanups.push(()=>target.removeEventListener(type,fn,options));};
 on(board,'pointerdown',e=>{if(!e.isPrimary||e.button!==0||pointer)return;pointer={id:e.pointerId,x:e.clientX,y:e.clientY};board.setPointerCapture(e.pointerId);board.focus({preventScroll:true});});
 on(board,'pointerup',e=>{if(!pointer||e.pointerId!==pointer.id)return;const dx=e.clientX-pointer.x,dy=e.clientY-pointer.y;pointer=null;if(board.hasPointerCapture(e.pointerId))board.releasePointerCapture(e.pointerId);if(Math.max(Math.abs(dx),Math.abs(dy))<18)return;move2048(Math.abs(dx)>Math.abs(dy)?dx>0?'right':'left':dy>0?'down':'up');});
 const cancelPointer=()=>{pointer=null;};on(board,'pointercancel',cancelPointer);on(board,'lostpointercapture',cancelPointer);
 listenKey(e=>{
  if(!active2048()||!$('#overlay').hidden||e.target.closest('input,textarea,select,[contenteditable="true"]')||e.altKey)return;
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
function preference2048(key,value){
 const allowed=key==='theme'?['ceramic','aurora']:['smooth','quick'];if(!active2048()||!allowed.includes(value))return;
 prefs2048[key]=value;A.save('2048preferences',prefs2048);
 if(key==='theme')$('.studio-2048').dataset.material=value;
 A.$$(`.studio-2048 [data-action="${key}2048"]`).forEach(el=>el.setAttribute('aria-pressed',String(el.dataset.value===value)));
}
A.actions.theme2048=el=>preference2048('theme',el.dataset.value);A.actions.speed2048=el=>preference2048('speed',el.dataset.value);
// Snake — grid simulation, deterministic steering, pausing on app leave.
let snake=[],snakeDirection={x:1,y:0},snakeNext={x:1,y:0},snakeFood={x:12,y:8},snakeScore=0,snakeBest=A.load('snakeBest',0),snakeRunning=false,snakeOver=false,snakeInterval=null;
const snakeSize=18;
function resetSnake(){snake=[{x:7,y:9},{x:6,y:9},{x:5,y:9},{x:4,y:9}];snakeDirection={x:1,y:0};snakeNext={x:1,y:0};snakeScore=0;snakeRunning=false;snakeOver=false;spawnFood();}
function spawnFood(){const empty=[];for(let y=0;y<snakeSize;y++)for(let x=0;x<snakeSize;x++)if(!snake.some(s=>s.x===x&&s.y===y))empty.push({x,y});if(!empty.length){snakeRunning=false;snakeOver=true;clearInterval(snakeInterval);return;}snakeFood=empty[Math.floor(Math.random()*empty.length)];}
function stopSnake(){clearInterval(snakeInterval);snakeInterval=null;snakeRunning=false;}
function gameSnake(){if(!snake.length)resetSnake();gameCleanups.push(stopSnake);A.view(A.nav('Little Snake',`<button data-action="gameHelp" aria-label="遊び方">?</button>`,'gamesLibrary','ゲーム')+`<div class="app-content"><div class="game-heading"><h2 style="font-size:29px;color:#7f9675">Little Snake<span style="font-size:15px">.</span></h2><div class="score-badge" style="background:#9caa90"><small>BEST</small><strong id="snake-best">${snakeBest}</strong></div></div><p class="game-instructions" style="color:#8b9a83">実を集める・衝突に注意</p><div class="memory-meta" style="margin:17px 0 12px;color:#839578"><span>SCORE <strong id="snake-score">${snakeScore}</strong></span><span>18 × 18 GARDEN</span></div><canvas class="snake-board" id="snake-board" width="648" height="648" aria-label="スネークゲームの盤面"></canvas><div class="game-toolbar"><button data-action="snakeToggle" id="snake-toggle" style="background:#94a889;min-width:95px">${snakeOver?'もう一度':'▶ スタート'}</button><button data-action="snakeRestart" style="background:#dce3d7;color:#809373">↻ リセット</button></div><div class="game-status" id="snake-status" style="color:#829276">${snakeOver?'ゲームオーバー。もう一度、どうぞ。':'矢印キー・スワイプ・下のボタンで操作'}</div><div class="direction-pad">${[['up','↑'],['left','←'],['down','↓'],['right','→']].map(([d,s])=>`<button data-action="snakeDirection" data-value="${d}" aria-label="${d}">${s}</button>`).join('')}</div></div>`);drawSnake();swipe($('#snake-board'),steerSnake);listenKey(e=>{const d={ArrowLeft:'left',ArrowRight:'right',ArrowUp:'up',ArrowDown:'down'}[e.key];if(!$('#overlay').hidden)return;if(d){e.preventDefault();steerSnake(d);}if(e.code==='Space'){e.preventDefault();toggleSnake();}});}
function steerSnake(d){const direction={up:{x:0,y:-1},down:{x:0,y:1},left:{x:-1,y:0},right:{x:1,y:0}}[d];if(!direction)return;if(direction.x===-snakeDirection.x&&direction.y===-snakeDirection.y)return;snakeNext=direction;if(!snakeRunning&&!snakeOver)toggleSnake();}
function toggleSnake(){if(snakeOver){resetSnake();}if(snakeRunning)stopSnake();else{snakeRunning=true;clearInterval(snakeInterval);snakeInterval=setInterval(tickSnake,145);}updateSnakeUi();}
function updateSnakeUi(){if(!$('#snake-toggle'))return;$('#snake-toggle').textContent=snakeOver?'もう一度':snakeRunning?'Ⅱ 一時停止':'▶ スタート';$('#snake-score').textContent=snakeScore;$('#snake-best').textContent=snakeBest;$('#snake-status').textContent=snakeOver?'ゲームオーバー。もう一度、どうぞ。':snakeRunning?'':'矢印キー・スワイプ・下のボタンで操作';drawSnake();}
function tickSnake(){if(!snakeRunning)return;if(!$('#overlay').hidden||document.hidden)return;snakeDirection={...snakeNext};const head={x:snake[0].x+snakeDirection.x,y:snake[0].y+snakeDirection.y};const eating=head.x===snakeFood.x&&head.y===snakeFood.y;const body=eating?snake:snake.slice(0,-1);if(head.x<0||head.y<0||head.x>=snakeSize||head.y>=snakeSize||body.some(s=>s.x===head.x&&s.y===head.y)){snakeOver=true;stopSnake();updateSnakeUi();return;}snake.unshift(head);if(eating){snakeScore+=10;snakeBest=Math.max(snakeBest,snakeScore);A.save('snakeBest',snakeBest);spawnFood();A.haptic();}else snake.pop();updateSnakeUi();}
function drawSnake(){
 const c=$('#snake-board');if(!c)return;const ctx=c.getContext('2d'),size=c.width,cell=size/snakeSize;
 const ground=ctx.createLinearGradient(0,0,size,size);ground.addColorStop(0,'#ecf1e0');ground.addColorStop(1,'#bdcfb0');ctx.fillStyle=ground;ctx.fillRect(0,0,size,size);
 for(let y=0;y<snakeSize;y++)for(let x=0;x<snakeSize;x++){ctx.fillStyle=(x+y)%2?'#d5e3c52b':'#ffffff18';ctx.fillRect(x*cell,y*cell,cell,cell);if((x*7+y*3)%17===0){ctx.strokeStyle='#809d6922';ctx.lineWidth=1.5;ctx.beginPath();ctx.moveTo(x*cell+12,y*cell+24);ctx.quadraticCurveTo(x*cell+10,y*cell+17,x*cell+8,y*cell+17);ctx.moveTo(x*cell+12,y*cell+24);ctx.quadraticCurveTo(x*cell+15,y*cell+16,x*cell+17,y*cell+19);ctx.stroke();}}
 const vignette=ctx.createRadialGradient(size/2,size/2,size*.15,size/2,size/2,size*.75);vignette.addColorStop(0,'#ffffff00');vignette.addColorStop(1,'#64865525');ctx.fillStyle=vignette;ctx.fillRect(0,0,size,size);
 const fx=(snakeFood.x+.5)*cell,fy=(snakeFood.y+.5)*cell;ctx.fillStyle='#d9b88a30';ctx.beginPath();ctx.arc(fx,fy,cell*.48,0,Math.PI*2);ctx.fill();ctx.shadowColor='#77634340';ctx.shadowBlur=5;ctx.shadowOffsetY=3;const fruit=ctx.createRadialGradient(fx-4,fy-5,2,fx,fy,cell*.31);fruit.addColorStop(0,'#e3b7a1');fruit.addColorStop(.45,'#cd917c');fruit.addColorStop(1,'#b47765');ctx.fillStyle=fruit;ctx.beginPath();ctx.arc(fx,fy,cell*.31,0,Math.PI*2);ctx.fill();ctx.shadowBlur=0;ctx.shadowOffsetY=0;ctx.strokeStyle='#78875b';ctx.lineWidth=2.5;ctx.beginPath();ctx.moveTo(fx,fy-cell*.23);ctx.quadraticCurveTo(fx-2,fy-cell*.46,fx+4,fy-cell*.46);ctx.stroke();ctx.fillStyle='#859e69';ctx.beginPath();ctx.ellipse(fx+6,fy-cell*.3,cell*.15,cell*.07,-.4,0,Math.PI*2);ctx.fill();ctx.fillStyle='#fff9';ctx.beginPath();ctx.ellipse(fx-4,fy-5,3,2,-.6,0,Math.PI*2);ctx.fill();
 ctx.shadowColor='#425f4240';ctx.shadowBlur=7;ctx.shadowOffsetY=4;ctx.strokeStyle='#769467';ctx.lineWidth=cell*.78;ctx.lineJoin='round';ctx.lineCap='round';ctx.beginPath();[...snake].reverse().forEach((p,i)=>i?ctx.lineTo((p.x+.5)*cell,(p.y+.5)*cell):ctx.moveTo((p.x+.5)*cell,(p.y+.5)*cell));ctx.stroke();ctx.shadowBlur=0;ctx.shadowOffsetY=0;
 [...snake].reverse().forEach((p,i)=>{const x=(p.x+.5)*cell,y=(p.y+.5)*cell,head=i===snake.length-1;const skin=ctx.createRadialGradient(x-cell*.13,y-cell*.18,1,x,y,cell*.45);skin.addColorStop(0,head?'#91b07a':'#abc193');skin.addColorStop(1,head?'#5d8052':'#769465');ctx.fillStyle=skin;ctx.beginPath();ctx.roundRect(p.x*cell+3,p.y*cell+3,cell-6,cell-6,head?13:10);ctx.fill();if(!head&&i%2===0){ctx.fillStyle='#dde9bf38';ctx.beginPath();ctx.arc(x-3,y-3,2.5,0,Math.PI*2);ctx.arc(x+3,y+3,2.5,0,Math.PI*2);ctx.fill();}});
 const h=snake[0],dx=snakeDirection.x,dy=snakeDirection.y;const eyes=dx?[{x:dx>0?.68:.32,y:.29},{x:dx>0?.68:.32,y:.71}]:[{x:.29,y:dy>0?.68:.32},{x:.71,y:dy>0?.68:.32}];for(const p of eyes){const x=(h.x+p.x)*cell,y=(h.y+p.y)*cell;ctx.fillStyle='#f9f7dd';ctx.beginPath();ctx.arc(x,y,cell*.13,0,Math.PI*2);ctx.fill();ctx.fillStyle='#3b5440';ctx.beginPath();ctx.arc(x+dx*1.8,y+dy*1.8,cell*.065,0,Math.PI*2);ctx.fill();ctx.fillStyle='#fff';ctx.beginPath();ctx.arc(x+dx*1.8-1,y+dy*1.8-1,1,0,Math.PI*2);ctx.fill();}
 if(!snakeRunning){ctx.fillStyle='#e6eddb99';ctx.fillRect(0,0,size,size);ctx.fillStyle='#faf9e7d9';ctx.shadowColor='#516e3320';ctx.shadowBlur=25;ctx.beginPath();ctx.roundRect(size*.18,size*.39,size*.64,size*.22,25);ctx.fill();ctx.shadowBlur=0;ctx.textAlign='center';ctx.fillStyle='#5a7755';ctx.font='600 29px sans-serif';ctx.fillText(snakeOver?'GAME OVER':'LITTLE SNAKE',size/2,size*.49);ctx.font='17px sans-serif';ctx.fillStyle='#8d9d78';ctx.fillText(snakeOver?'SCORE '+snakeScore:'スタートでプレイ',size/2,size*.55);}
}
A.actions.snakeToggle=toggleSnake;A.actions.snakeDirection=el=>steerSnake(el.dataset.value);A.actions.snakeRestart=()=>{stopSnake();resetSnake();updateSnakeUi();};
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
A.actions.gameHelp=()=>{const help=gamePage==='2048'?['2048 の遊び方','盤面を上下左右にスワイプすると、すべてのタイルが動きます。同じ数字がぶつかると合体し、数字が2倍になります。','合体した数字がスコアに加算されます。2048をつくった後も続けられます。動かせなくなったら終了です。','スワイプ・矢印キー・WASD・方向ボタンで操作。Zで戻す、YまたはShift+Zでやり直します。直近32手まで取り消せます。取り消し後に別の手を進めると、やり直し履歴は消えます。', 'ヒントは新タイルの出現と次の一手を評価した目安で、勝利を保証しません。連続合体に得点倍率はなく、合体した数字だけが得点になります。', '盤面・得点・手数・連続合体・達成後の続行状態を自動保存します。取り消し／やり直し履歴はページを再読み込みすると消えます。最高点と自己記録は取り消しても残ります。見た目と速さは「見た目とプレイ記録」から変更できます。']:gamePage==='snake'?['Little Snake の遊び方','スタートを押し、スワイプ・矢印キー・画面の方向ボタンでヘビを動かします。小さな実を食べると10点獲得します。','壁や自分の体にぶつかると終了です。来た方向へすぐに逆走することはできません。','アプリを離れると一時停止します。スペースキーでも一時停止できます。']:['Memory Garden の遊び方','カードを2枚めくり、同じ絵柄のペアを探しましょう。一致したカードは表向きのまま残ります。','8組のペアが揃えばクリア。2枚めくるたびに1手として数えます。少ない手数でのクリアに挑戦してください。','ハイスコアは最少手数です。アプリを開き直すと新しいお庭になります。'];A.overlay(`${A.overlayTitle(help[0])}<div class="about-copy">${help.slice(1).map(p=>`<p style="margin:22px 0">${p}</p>`).join('')}</div><button class="control-tile" data-action="closeOverlay" style="width:100%;margin-top:30px">遊んでみる</button>`);};
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
