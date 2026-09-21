'use strict';
(() => {
 const A=window.Aura,$=A.$,esc=A.escape;
 const catalog=[
  ['2048','2048','合体','amber','2048best'],['snake','Little Snake','スネーク','sage','snakeBest'],['memory','Memory Garden','ペア','rose','memoryBest'],
  ['blocks','Block Atelier','ブロック','iris','blocksBest'],['mines','Crystal Field','探索','aqua','minesWins'],['reversi','Reversi','対戦','jade','reversiWins'],['breaker','Orbit Breaker','反射','night','breakerBest'],['sudoku','Sudoku','数独','paper','sudokuWins']
 ];
 const legacy=A.apps.games.render;
 let current='library',disposers=[],generation=0;
 function stop(){generation++;disposers.splice(0).forEach(fn=>fn());A.stopLegacyGames?.();}
 const on=(target,type,fn,options)=>{target.addEventListener(type,fn,options);disposers.push(()=>target.removeEventListener(type,fn,options));};
 const every=(fn,ms)=>{const id=setInterval(fn,ms);disposers.push(()=>clearInterval(id));return id;};
 const defer=(fn,ms)=>{const epoch=generation,id=setTimeout(()=>{if(epoch===generation)fn();},ms);disposers.push(()=>clearTimeout(id));};
 const iconButton=(action,label,icon)=>`<button class="arc-icon" data-action="${action}" aria-label="${label}">${A.icon(icon)}</button>`;
 const score=(label,value,id='')=>`<div><small>${label}</small><strong ${id?`id="${id}"`:''}>${value}</strong></div>`;
 function shell(title,tone,body,right=''){A.statusTheme(false);A.view(A.nav(title,right,'gamesLibrary','ゲーム')+`<div class="app-content arcade-play arc-${tone}">${body}</div>`);A.cleanups.push(stop);}
 function art(id){const tile=(x,y,n,c)=>`<rect x="${x}" y="${y}" width="44" height="44" rx="10" fill="${c}"/><text x="${x+22}" y="${y+28}" text-anchor="middle" fill="#67543e" font-family="sans-serif" font-size="19" font-weight="700">${n}</text>`;let shapes='';
  if(id==='2048')shapes=tile(33,20,'8','#f0d7a0')+tile(82,20,'16','#e7b176')+tile(33,69,'32','#d89874')+tile(82,69,'64','#f8e5c2');
  if(id==='snake')shapes='<path d="M37 95V50q0-18 18-18h36q18 0 18 18v29" fill="none" stroke="#64876c" stroke-width="25" stroke-linecap="round"/><circle cx="109" cy="86" r="17" fill="#476f56"/><circle cx="103" cy="86" r="3" fill="#fff"/><circle cx="116" cy="86" r="3" fill="#fff"/><circle cx="58" cy="90" r="10" fill="#c9827d"/><path d="m57 78 7-7" stroke="#64876c" stroke-width="4"/>';
  if(id==='memory')shapes='<g transform="rotate(-12 57 65)"><rect x="27" y="26" width="54" height="77" rx="10" fill="#b5a0c4"/><path d="m54 47 10 18-10 18-10-18Z" stroke="#fff8" fill="none"/></g><g transform="rotate(10 104 68)"><rect x="77" y="30" width="54" height="77" rx="10" fill="#faf2e7"/><g fill="#c78997"><ellipse cx="104" cy="58" rx="7" ry="11"/><ellipse cx="104" cy="78" rx="7" ry="11"/><ellipse cx="94" cy="68" rx="11" ry="7"/><ellipse cx="114" cy="68" rx="11" ry="7"/></g><circle cx="104" cy="68" r="5" fill="#e6c57b"/></g>';
  if(id==='blocks')shapes=[[40,67],[66,67],[92,67],[66,41],[14,93],[40,93],[66,93],[92,93]].map(([x,y],i)=>`<rect x="${x}" y="${y}" width="23" height="23" rx="5" fill="${i<4?'#a08bb9':'#dfbfa3'}" stroke="#fff6"/>`).join('');
  if(id==='mines')shapes='<path d="m78 20 36 25 7 42-43 30-42-30 7-42Z" fill="#82b8be"/><path d="m78 20-15 48 15 49 17-49Z" fill="#c7e5df"/><path d="m36 87 27-19-20-23m78 42L95 68l19-23" fill="#5c929f"/><circle cx="127" cy="25" r="4" fill="#fff9"/>';
  if(id==='reversi')shapes='<rect x="25" y="20" width="110" height="100" rx="14" fill="#5a8c76"/><path d="M25 70h110M80 20v100" stroke="#c5dfc533"/><circle cx="55" cy="45" r="18" fill="#f1e9dc"/><circle cx="106" cy="95" r="18" fill="#f1e9dc"/><circle cx="55" cy="95" r="18" fill="#384a48"/><circle cx="106" cy="45" r="18" fill="#384a48"/>';
  if(id==='breaker')shapes=Array.from({length:8},(_,i)=>`<rect x="${24+(i%4)*29}" y="${22+Math.floor(i/4)*17}" width="25" height="12" rx="4" fill="${['#c7adce','#9ab8c1','#cdb48f','#92b9a9'][i%4]}"/>`).join('')+'<path d="m50 104 28-27 16 9 19-27" stroke="#e4ccad77" stroke-width="2" stroke-dasharray="3 4" fill="none"/><circle cx="112" cy="58" r="6" fill="#f8ddac"/><rect x="42" y="111" width="54" height="8" rx="4" fill="#d9dbe9"/>';
  if(id==='sudoku')shapes='<rect x="28" y="17" width="102" height="108" rx="12" fill="#faf4e8"/><path d="M62 17v108M96 17v108M28 53h102M28 89h102" stroke="#baa98c55"/><g font-family="serif" font-size="26" text-anchor="middle" fill="#8d7d68"><text x="45" y="44">3</text><text x="112" y="44">7</text><text x="79" y="81">9</text><text x="45" y="116">1</text><text x="113" y="116">4</text></g>';
  return `<svg viewBox="0 0 160 140" aria-hidden="true">${shapes}</svg>`;
 }
 let category='all';
 function library(){stop();current='library';const favorites=A.load('arcadeFavorites',[]),recent=A.load('arcadeRecent',[]);const list=catalog.filter(x=>category==='all'||category==='favorites'&&favorites.includes(x[0])||category==='puzzle'&&['2048','memory','mines','sudoku','reversi'].includes(x[0])||category==='action'&&['snake','blocks','breaker'].includes(x[0]));shell('ゲーム','library',`<div class="arcade-header"><h1>Arcade<span>08</span></h1></div><button class="arcade-feature" data-action="gameOpen" data-game="${recent[0]||'breaker'}"><div><small>${recent.length?'最近のゲーム':'おすすめ'}</small><strong>${catalog.find(x=>x[0]===(recent[0]||'breaker'))?.[1]||'Orbit Breaker'}</strong><span>プレイ ${A.icon('play')}</span></div>${art(recent[0]||'breaker')}</button><div class="arcade-filters">${[['all','すべて'],['favorites','お気に入り'],['puzzle','パズル'],['action','アクション']].map(([id,label])=>`<button data-action="arcFilter" data-value="${id}" class="${category===id?'active':''}">${label}</button>`).join('')}</div><div class="arcade-grid">${list.map(([id,title,detail,tone,key])=>`<article class="arcade-card arc-${tone}"><button class="arc-favorite ${favorites.includes(id)?'active':''}" data-action="arcFavorite" data-game="${id}" aria-label="${title}をお気に入りに" aria-pressed="${favorites.includes(id)}">${A.icon('heart')}</button><button class="arcade-launch" data-action="gameOpen" data-game="${id}"><div class="arcade-art">${art(id)}</div><div class="arcade-card-copy"><h2>${title}</h2><p>${detail}</p><span>${['mines','reversi','sudoku'].includes(id)?'WIN':'BEST'} <strong>${A.load(key,0).toLocaleString()}</strong>${A.icon('arrow')}</span></div></button></article>`).join('')||'<div class="arcade-empty">♡でゲームを追加</div>'}</div>`);}
 function open(id){if(!catalog.some(x=>x[0]===id))return library();stop();current=id;A.save('arcadeRecent',[id,...A.load('arcadeRecent',[]).filter(x=>x!==id)].slice(0,8));if(['2048','snake','memory'].includes(id)){legacy(id);const content=$('.app-content');content.classList.add('arcade-play','arc-legacy','arc-'+id);$('.app-screen').classList.add('arcade-screen');A.cleanups.push(stop);return;}({blocks:blocksApp,mines:minesApp,reversi:reversiApp,breaker:breakerApp,sudoku:sudokuApp})[id]();}
 A.apps.games.render=arg=>arg?open(arg):library();A.actions.gamesLibrary=library;A.actions.gameOpen=el=>open(el.dataset.game);A.actions.arcFilter=el=>{category=el.dataset.value;library();};A.actions.arcFavorite=el=>{const favorites=A.load('arcadeFavorites',[]),id=el.dataset.game;A.save('arcadeFavorites',favorites.includes(id)?favorites.filter(x=>x!==id):[...favorites,id]);library();};
 const help=(title,text)=>A.overlay(`${A.overlayTitle(title)}<div class="arc-help">${text}</div>`);
 const keys=fn=>on(document,'keydown',e=>{if(!$('#overlay').hidden||e.target.closest('input,textarea,select'))return;fn(e);});
 const number=n=>Number(n).toLocaleString();

 // Block Atelier: seven-bag pieces, hold, ghost, rotation kicks and progressive gravity.
 const shapes=[[[1,1,1,1]],[[1,1],[1,1]],[[0,1,0],[1,1,1]],[[0,1,1],[1,1,0]],[[1,1,0],[0,1,1]],[[1,0,0],[1,1,1]],[[0,0,1],[1,1,1]]];
 const blockColors=['#84b5c3','#e0bd80','#ac91bc','#8fb6a0','#d89d9d','#879cc3','#d3ad87'];
 let blocks=null,blockBag=[];
 const freshBag=()=>{const bag=[0,1,2,3,4,5,6];for(let i=6;i>0;i--){const j=Math.floor(Math.random()*(i+1));[bag[i],bag[j]]=[bag[j],bag[i]];}return bag;};
 const nextBlock=()=>{if(!blockBag.length)blockBag=freshBag();return blockBag.pop();};
 const piece=id=>({id,m:shapes[id].map(r=>[...r]),x:Math.floor((10-shapes[id][0].length)/2),y:0});
 function resetBlocks(){blockBag=freshBag();blocks={board:Array.from({length:18},()=>Array(10).fill(0)),piece:piece(nextBlock()),next:nextBlock(),hold:null,held:false,score:0,lines:0,level:1,running:false,over:false,last:Date.now()};}
 function fits(p){return p.m.every((row,y)=>row.every((v,x)=>!v||(p.x+x>=0&&p.x+x<10&&p.y+y<18&&(p.y+y<0||!blocks.board[p.y+y][p.x+x]))));}
 function saveBlocks(){A.save('blocksState',{...blocks,running:false,bag:blockBag});A.save('blocksBest',Math.max(A.load('blocksBest',0),blocks.score));}
 function settle(){const b=blocks;b.piece.m.forEach((row,y)=>row.forEach((v,x)=>{if(v&&b.piece.y+y>=0)b.board[b.piece.y+y][b.piece.x+x]=b.piece.id+1;}));const left=b.board.filter(row=>!row.every(Boolean)),cleared=18-left.length;while(left.length<18)left.unshift(Array(10).fill(0));b.board=left;b.score+=[0,100,300,500,800][cleared]*b.level;b.lines+=cleared;b.level=1+Math.floor(b.lines/10);b.piece=piece(b.next);b.next=nextBlock();b.held=false;if(!fits(b.piece)){b.over=true;b.running=false;}b.last=Date.now();saveBlocks();renderBlocks();}
 function moveBlock(dx,dy){if(!blocks.running||blocks.over)return;const p={...blocks.piece,x:blocks.piece.x+dx,y:blocks.piece.y+dy};if(fits(p)){blocks.piece=p;if(dy)blocks.score++;renderBlocks();return true;}if(dy)settle();return false;}
 function rotateBlock(){if(!blocks.running)return;const p=blocks.piece,m=p.m[0].map((_,x)=>p.m.map(row=>row[x]).reverse());for(const kick of [0,-1,1,-2,2]){const rotated={...p,m,x:p.x+kick};if(fits(rotated)){blocks.piece=rotated;renderBlocks();break;}}}
 function cellDraw(ctx,x,y,size,color,alpha=1){ctx.globalAlpha=alpha;ctx.fillStyle=color;ctx.shadowColor='#16132635';ctx.shadowBlur=4;ctx.shadowOffsetY=2;ctx.beginPath();ctx.roundRect(x+1.5,y+1.5,size-3,size-3,5);ctx.fill();ctx.shadowBlur=0;ctx.shadowOffsetY=0;ctx.strokeStyle='#ffffff70';ctx.lineWidth=1;ctx.beginPath();ctx.moveTo(x+6,y+3);ctx.lineTo(x+size-6,y+3);ctx.stroke();ctx.globalAlpha=1;}
 function drawPreview(id,target){const c=$(target);if(!c)return;const ctx=c.getContext('2d');ctx.clearRect(0,0,c.width,c.height);if(id===null)return;const m=shapes[id],size=18,ox=(c.width-m[0].length*size)/2,oy=(c.height-m.length*size)/2;m.forEach((row,y)=>row.forEach((v,x)=>{if(v)cellDraw(ctx,ox+x*size,oy+y*size,size,blockColors[id]);}));}
 function renderBlocks(){const c=$('#blocks-canvas');if(!c)return;const ctx=c.getContext('2d'),b=blocks;ctx.fillStyle='#272835';ctx.fillRect(0,0,300,540);ctx.strokeStyle='#ffffff07';ctx.lineWidth=1;for(let x=0;x<10;x++)for(let y=0;y<18;y++){ctx.strokeRect(x*30,y*30,30,30);if(b.board[y][x])cellDraw(ctx,x*30,y*30,30,blockColors[b.board[y][x]-1]);}const ghost={...b.piece};while(fits({...ghost,y:ghost.y+1}))ghost.y++;for(const [p,opacity] of [[ghost,.16],[b.piece,1]])p.m.forEach((row,y)=>row.forEach((v,x)=>{if(v)cellDraw(ctx,(p.x+x)*30,(p.y+y)*30,30,blockColors[p.id],opacity);}));if(!b.running){ctx.fillStyle='#242331c9';ctx.fillRect(0,0,300,540);ctx.fillStyle='#eee7f4';ctx.font='600 23px sans-serif';ctx.textAlign='center';ctx.fillText(b.over?'GAME OVER':'BLOCK ATELIER',150,258);ctx.font='13px sans-serif';ctx.fillText(b.over?number(b.score):'開始でプレイ',150,288);}$('#blocks-score').textContent=number(b.score);$('#blocks-lines').textContent=b.lines;$('#blocks-level').textContent=b.level;$('#blocks-toggle').textContent=b.over?'もう一度':b.running?'一時停止':'開始';drawPreview(b.next,'#blocks-next');drawPreview(b.hold,'#blocks-hold');}
 function blocksApp(){if(!blocks){const saved=A.load('blocksState',null);if(saved?.board?.length===18&&saved.board.every(r=>Array.isArray(r)&&r.length===10)&&saved.piece?.m){blocks={...saved,running:false,last:Date.now()};blockBag=saved.bag||[];}else resetBlocks();}shell('Block Atelier','iris',`<div class="arc-scorebar">${score('SCORE',blocks.score,'blocks-score')}${score('LINES',blocks.lines,'blocks-lines')}${score('LEVEL',blocks.level,'blocks-level')}</div><div class="blocks-layout"><canvas id="blocks-canvas" width="300" height="540" aria-label="落ちものパズルの盤面"></canvas><aside><div><small>NEXT</small><canvas id="blocks-next" width="90" height="70"></canvas></div><button data-action="blocksHold" aria-label="ホールド"><small>HOLD</small><canvas id="blocks-hold" width="90" height="70"></canvas></button></aside></div><div class="arc-primary-controls"><button data-action="blocksToggle" id="blocks-toggle">開始</button><button data-action="blocksRestart">リセット</button></div><div class="blocks-controls"><button data-action="blocksMove" data-value="-1" aria-label="左">←</button><button data-action="blocksRotate" aria-label="回転">↻</button><button data-action="blocksMove" data-value="1" aria-label="右">→</button><button data-action="blocksSoft" aria-label="下">↓</button><button data-action="blocksDrop" aria-label="一気に落とす">⤓</button></div>`,iconButton('blocksHelp','遊び方','document'));renderBlocks();every(()=>{if(!blocks.running||document.hidden||!$('#overlay').hidden){blocks.last=Date.now();return;}if(Date.now()-blocks.last>=Math.max(95,780-(blocks.level-1)*60)){blocks.last=Date.now();const p={...blocks.piece,y:blocks.piece.y+1};if(fits(p)){blocks.piece=p;renderBlocks();}else settle();}},40);keys(e=>{const actions={ArrowLeft:()=>moveBlock(-1,0),ArrowRight:()=>moveBlock(1,0),ArrowDown:()=>moveBlock(0,1),ArrowUp:rotateBlock,' ':A.actions.blocksDrop,c:A.actions.blocksHold,p:A.actions.blocksToggle};if(actions[e.key]){e.preventDefault();actions[e.key]();}});disposers.push(()=>{blocks.running=false;saveBlocks();});}
 A.actions.blocksMove=el=>moveBlock(Number(el.dataset.value),0);A.actions.blocksRotate=rotateBlock;A.actions.blocksSoft=()=>moveBlock(0,1);A.actions.blocksDrop=()=>{if(!blocks.running)return;while(fits({...blocks.piece,y:blocks.piece.y+1})){blocks.piece.y++;blocks.score+=2;}settle();};A.actions.blocksHold=()=>{if(!blocks.running||blocks.held)return;const id=blocks.piece.id;blocks.piece=piece(blocks.hold===null?blocks.next:blocks.hold);if(blocks.hold===null)blocks.next=nextBlock();blocks.hold=id;blocks.held=true;if(!fits(blocks.piece)){blocks.over=true;blocks.running=false;}renderBlocks();};A.actions.blocksToggle=()=>{if(blocks.over)resetBlocks();blocks.running=!blocks.running;blocks.last=Date.now();renderBlocks();};A.actions.blocksRestart=()=>A.confirm('新しいゲーム？','現在の盤面をリセットします。',()=>{resetBlocks();saveBlocks();renderBlocks();});A.actions.blocksHelp=()=>help('Block Atelier','横一列をそろえて消します。↑で回転、←→で移動、↓で下降、Spaceで落下、Cでホールド。アプリを離れると保存・一時停止します。');

 // Crystal Field: persistent cells, batched flood reveal and active-play timing.
 let mines=null,mineMode='open',mineFocus=0,mineHint=-1,mineMessage='',mineClock=0;
 const mineDifficulties={easy:[8,10],normal:[10,18],hard:[12,28]};
 const mineLabels={easy:'初級',normal:'中級',hard:'上級'};
 const minePrefs=A.load('minesPreferences',{});
 let mineLite=minePrefs?.lite===true,mineZoom=minePrefs?.zoom===true;
 const mineGem='<svg viewBox="0 0 48 56" aria-hidden="true"><path d="M24 2 42 15 45 37 24 54 3 37 6 15Z" fill="#54b7c9"/><path d="m24 2-9 25 9 27 10-27Z" fill="#c9fff1"/><path d="M6 15 15 27 3 37Z" fill="#91e0e6"/><path d="m42 15-8 12 11 10Z" fill="#2588ab"/><path d="m3 37 12-10 9 27Z" fill="#53a2cb"/><path d="m45 37-11-10-10 27Z" fill="#67d7c5"/><path d="m6 15 18-13 18 13M15 27l9-25 10 25-10 27Z" fill="none" stroke="#edfff9" stroke-opacity=".65"/></svg>';
 const mineFlagArt='<svg viewBox="0 0 24 28" aria-hidden="true"><path d="M7 24V3l13 3-13 9" fill="#e6b879" stroke="#ffe7bb" stroke-width="1.5" stroke-linejoin="round"/><path d="M3 25h11" stroke="#ffe7bb" stroke-width="2" stroke-linecap="round"/></svg>';
 const neighbors=(index,size)=>{const out=[],x=index%size,y=Math.floor(index/size);for(let dy=-1;dy<=1;dy++)for(let dx=-1;dx<=1;dx++){if(!dx&&!dy)continue;const nx=x+dx,ny=y+dy;if(nx>=0&&ny>=0&&nx<size&&ny<size)out.push(ny*size+nx);}return out;};
 const nearBombs=i=>neighbors(i,mines.size).filter(n=>mines.bombs.includes(n)).length;
 const mineTime=value=>{const seconds=Math.floor(value);return `${String(Math.floor(seconds/60)).padStart(2,'0')}:${String(seconds%60).padStart(2,'0')}`;};
 const mineNumber=value=>Number.isFinite(value)&&value>=0?Math.floor(value):0;
 function resetMines(difficulty='easy'){
  if(!Object.hasOwn(mineDifficulties,difficulty))difficulty='easy';
  const [size,count]=mineDifficulties[difficulty];
  mines={version:2,difficulty,size,count,bombs:[],open:[],flags:[],started:false,over:false,won:false,elapsed:0,elapsedMs:0,paused:false,hintsUsed:0,moves:0};
  mineMode='open';mineFocus=0;mineHint=-1;mineMessage='最初のマスと、その周囲は必ず安全です。';mineClock=performance.now();
 }
 function restoreMines(saved){
  // Validate old and current saves without modifying unrelated application data.
  if(!saved||!Object.hasOwn(mineDifficulties,saved.difficulty))return false;
  const [size,count]=mineDifficulties[saved.difficulty],valid=list=>Array.isArray(list)&&list.length<=size*size&&new Set(list).size===list.length&&list.every(i=>Number.isInteger(i)&&i>=0&&i<size*size);
  if(saved.size!==size||saved.count!==count||!['bombs','open','flags'].every(k=>valid(saved[k])))return false;
  if(typeof saved.started!=='boolean'||typeof saved.over!=='boolean'||typeof saved.won!=='boolean')return false;
  if(saved.started?saved.bombs.length!==count:saved.bombs.length!==0||saved.open.length!==0||saved.over)return false;
  if(saved.open.some(i=>saved.bombs.includes(i)||saved.flags.includes(i)))return false;
  const complete=saved.open.length===size*size-count;
  if(saved.won!==complete||(saved.won&&!saved.over))return false;
  if(saved.over&&!saved.won&&(!Number.isInteger(saved.hit)||!saved.bombs.includes(saved.hit)))return false;
  const elapsed=mineNumber(saved.elapsed),elapsedMs=Number.isFinite(saved.elapsedMs)&&saved.elapsedMs>=0?saved.elapsedMs:elapsed*1000;
  mines={version:2,difficulty:saved.difficulty,size,count,bombs:[...saved.bombs],open:[...saved.open],flags:[...saved.flags],started:saved.started,over:saved.over,won:saved.won,hit:saved.hit,elapsed:Math.floor(elapsedMs/1000),elapsedMs,paused:saved.started&&!saved.over,hintsUsed:Math.min(3,mineNumber(saved.hintsUsed)),moves:mineNumber(saved.moves)};
  return true;
 }
 const saveMines=()=>A.save('minesState',mines);
 const mineCanPlay=()=>mines&&!mines.over&&!mines.paused&&!document.hidden&&$('#overlay').hidden;
 function tickMines(){
  const now=performance.now(),delta=now-mineClock;mineClock=now;
  if(!mines?.started||!mineCanPlay())return;
  // Do not charge suspended tabs or a sleeping device as active play.
  if(delta>2000){pauseMines();return;}
  mines.elapsedMs+=Math.max(0,delta);mines.elapsed=Math.floor(mines.elapsedMs/1000);
  const label=$('#mines-time');if(label)label.textContent=mineTime(mines.elapsed);
 }
 function pauseMines(){
  if(!mines?.started||mines.over||mines.paused)return;
  mines.paused=true;mineHint=-1;saveMines();renderMines();
 }
 function seedMines(first){
  const safe=new Set([first,...neighbors(first,mines.size)]),pool=Array.from({length:mines.size**2},(_,i)=>i).filter(i=>!safe.has(i));
  for(let i=pool.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[pool[i],pool[j]]=[pool[j],pool[i]];}
  mines.bombs=pool.slice(0,mines.count);mines.started=true;mineClock=performance.now();
 }
 function finishMines(){
  const m=mines;
  if(!m.over&&m.open.length===m.size**2-m.count){m.over=true;m.won=true;m.flags=[...m.bombs];}
  if(!m.over)return;
  if(m.won){
   A.save('minesWins',mineNumber(A.load('minesWins',0))+1);
   const key=(m.hintsUsed?'minesAssistedBest-':'minesBest-')+m.difficulty,best=mineNumber(A.load(key,0)),time=Math.max(1,Math.ceil(m.elapsedMs/1000));
   if(!best||time<best)A.save(key,time);
  }
  const stored=A.load('minesHistory',[]),history=Array.isArray(stored)?stored:[];
  A.save('minesHistory',[{difficulty:m.difficulty,won:m.won,seconds:Math.ceil(m.elapsedMs/1000),hints:m.hintsUsed,moves:m.moves,date:new Date().toISOString()},...history].slice(0,30));
 }
 function revealMine(index,fromHint=false){
  if(!mineCanPlay()||!Number.isInteger(index)||index<0||index>=mines.size**2||mines.flags.includes(index))return;
  tickMines();if(!mineCanPlay())return;
  const m=mines;mineHint=-1;
  if(!m.started)seedMines(index);
  let targets=[index];
  if(m.open.includes(index)){
   const adjacent=neighbors(index,m.size),n=nearBombs(index);
   if(!n||adjacent.filter(i=>m.flags.includes(i)).length!==n){mineMessage='数字と同じ数の旗を周囲に置くと、残りをまとめて開けます。';renderMines();return;}
   targets=adjacent.filter(i=>!m.open.includes(i)&&!m.flags.includes(i));
   if(!targets.length)return;
  }
  m.moves++;const changed=[],seen=new Set(m.open),bombs=new Set(m.bombs),flags=new Set(m.flags),queue=[...targets];
  // One move, one model update, one render, including chord opening.
  for(let head=0;head<queue.length;head++){
   const i=queue[head];if(seen.has(i)||flags.has(i))continue;
   if(bombs.has(i)){m.hit=i;m.over=true;break;}
   seen.add(i);m.open.push(i);changed.push(i);
   if(!nearBombs(i))for(const next of neighbors(i,m.size))if(!seen.has(next)&&!flags.has(next)&&!bombs.has(next))queue.push(next);
  }
  finishMines();
  mineMessage=m.over?(m.won?'すべての安全なマスを探索しました。':'鉱石に触れました。旗の位置と数字を見直してみましょう。'):fromHint?'スキャンで安全なマスを開きました。今回はアシスト記録になります。':changed.length>1?`${changed.length}マスを連続探索しました。`:'数字を手がかりに、安全なルートを探しましょう。';
  saveMines();renderMines(changed,index);
 }
 function flagMine(index){
  if(!mineCanPlay()||!Number.isInteger(index)||index<0||index>=mines.size**2||mines.open.includes(index))return;
  tickMines();if(!mineCanPlay())return;
  const removing=mines.flags.includes(index);
  if(!removing&&mines.flags.length>=mines.count){mineMessage='旗は鉱石の数まで置けます。不要な旗を外してください。';renderMines();return;}
  mines.flags=removing?mines.flags.filter(i=>i!==index):[...mines.flags,index];mines.moves++;mineHint=-1;
  mineMessage=removing?'旗を外しました。':'旗を立てました。旗の正しさはクリア時まで確定しません。';
  saveMines();renderMines();
 }
 function mineHighlight(index){
  const root=$('#mines-board');if(!root)return;
  const adjacent=mines.open.includes(index)&&!mines.paused&&!mines.over?neighbors(index,mines.size):[];
  for(const cell of root.children)cell.classList.toggle('neighbor',adjacent.includes(Number(cell.dataset.index)));
 }
 function renderMines(changed=[],origin=0){
  const root=$('#mines-board');if(!root)return;
  const m=mines,scene=$('#mines-scene'),fresh=new Set(changed),opened=new Set(m.open),flags=new Set(m.flags),bombs=new Set(m.bombs);
  root.style.setProperty('--mine-size',m.size);
  // Never rebuild existing buttons during a move: focus and compositor animations survive.
  if(root.children.length!==m.size**2){
   root.innerHTML=Array.from({length:m.size**2},(_,i)=>`<button class="mine-cell" data-action="mineCell" data-index="${i}" tabindex="${i===mineFocus?0:-1}"><span class="mine-face" aria-hidden="true"></span></button>`).join('');
  }
  for(let i=0;i<root.children.length;i++){
   const cell=root.children[i],isOpen=opened.has(i),flag=flags.has(i),bomb=m.over&&bombs.has(i),n=isOpen?nearBombs(i):0,wrong=m.over&&flag&&!bomb;
   const signature=`${isOpen}/${flag}/${bomb}/${n}/${wrong}`;
   if(cell.dataset.state!==signature){
    cell.querySelector('.mine-face').innerHTML=bomb?mineGem:wrong?'<span class="mine-wrong">×</span>':flag?mineFlagArt:isOpen&&n?String(n):'';
    cell.dataset.state=signature;
   }
   for(const [name,active] of Object.entries({open:isOpen,flag,bomb,hit:m.hit===i,wrong,hint:mineHint===i}))cell.classList.toggle(name,active);
   cell.dataset.near=n;cell.tabIndex=i===mineFocus?0:-1;
   cell.setAttribute('aria-label',`${Math.floor(i/m.size)+1}行${i%m.size+1}列 ${bomb?'鉱石':wrong?'誤った旗':isOpen?`開封済み・周囲の鉱石${n}個`:flag?'旗・未開封':'未開封'}${mineHint===i?'・スキャン対象':''}`);
   if(fresh.has(i)){
    const distance=Math.abs(i%m.size-origin%m.size)+Math.abs(Math.floor(i/m.size)-Math.floor(origin/m.size));
    cell.style.setProperty('--reveal-delay',`${Math.min(280,distance*24)}ms`);cell.classList.add('revealing');
   }
  }
  scene.dataset.paused=String(m.paused);scene.dataset.result=m.over?(m.won?'won':'lost'):'';
  scene.dataset.lite=String(mineLite);scene.dataset.zoom=String(mineZoom);
  root.inert=m.paused;root.setAttribute('aria-hidden',String(m.paused));
  $('#mines-pause-cover').hidden=!m.paused;
  $('#mines-left').textContent=m.count-m.flags.length;$('#mines-time').textContent=mineTime(m.elapsed);
  const best=mineNumber(A.load((m.hintsUsed?'minesAssistedBest-':'minesBest-')+m.difficulty,0));
  $('#mines-best').textContent=best?mineTime(best):'—';$('#mines-best-label').textContent=m.hintsUsed?'アシスト最短':'最短記録';
  const total=m.size**2-m.count,percent=Math.round(m.open.length/total*100);
  $('#mines-progress').value=m.open.length;$('#mines-progress').max=total;
  $('#mines-progress-label').textContent=`探索 ${m.open.length} / ${total} · ${percent}%`;
  $('#mines-status').textContent=m.paused?'一時停止中':m.over?(m.won?'FIELD COMPLETE · クリア':'EXPLORATION OVER · 探索終了'):mineMode==='flag'?'旗モード · タップで旗を切替':'探索モード · タップで開く';
  $('#mines-message').textContent=mineMessage||'数字は周囲8マスの鉱石の数を表します。';
  $('#mines-result').hidden=!m.over;
  $('#mines-result-copy').textContent=m.over?`${mineLabels[m.difficulty]} / ${mineTime(Math.ceil(m.elapsedMs/1000))} / ${m.moves}手 / ${m.hintsUsed?'アシスト '+m.hintsUsed+'回':'ノーヒント'}${m.won?' / 累計 '+mineNumber(A.load('minesWins',0))+'勝':''}`:'';
  $('#mine-flag').classList.toggle('active',mineMode==='flag');$('#mine-flag').setAttribute('aria-pressed',String(mineMode==='flag'));
  $('#mine-flag').disabled=m.paused||m.over;
  $('#mine-pause').textContent=m.paused?'再開':'一時停止';$('#mine-pause').disabled=!m.started||m.over;
  $('#mine-hint').textContent=mineHint>=0?'このマスを開く':`安全スキャン ${3-m.hintsUsed}/3`;$('#mine-hint').disabled=m.paused||m.over||m.hintsUsed>=3;
  $('#mine-zoom').setAttribute('aria-pressed',String(mineZoom));$('#mine-zoom').textContent=mineZoom?'全体表示':'盤面を拡大';
  $('#mine-quality').setAttribute('aria-pressed',String(mineLite));$('#mine-quality').textContent=mineLite?'軽量描画':'高精細描画';
  A.$$('[data-action="mineDifficulty"]').forEach(el=>{el.classList.toggle('active',el.dataset.value===m.difficulty);el.setAttribute('aria-pressed',String(el.dataset.value===m.difficulty));});
 }
 function minesApp(){
  if(!mines&&!restoreMines(A.load('minesState',null)))resetMines();
  mineHint=-1;mineClock=performance.now();
  shell('Crystal Field','aqua',`
   <section class="crystal-game" id="mines-scene" aria-label="クリスタルフィールド">
    <header class="crystal-hero"><div><small>CRYSTAL FIELD</small><h1>光の鉱脈を、探そう。</h1><p>数字を読み、結晶を避けて進む探索パズル</p></div><div class="crystal-emblem" aria-hidden="true">${mineGem}</div></header>
    <div class="arc-difficulty crystal-difficulty" aria-label="難易度">${Object.entries(mineDifficulties).map(([id,[size,count]])=>`<button data-action="mineDifficulty" data-value="${id}">${mineLabels[id]}<small>${size}×${size} · 鉱石${count}</small></button>`).join('')}</div>
    <div class="arc-scorebar crystal-scores">${score('残りの旗',0,'mines-left')}${score('探索時間','00:00','mines-time')}<div><small id="mines-best-label">最短記録</small><strong id="mines-best">—</strong></div></div>
    <div class="crystal-progress"><span id="mines-progress-label"></span><progress id="mines-progress" aria-label="安全マスの探索進捗" max="1" value="0"></progress></div>
    <div class="mines-shell"><div class="mines-scroll" id="mines-scroll"><div id="mines-board" class="mines-board" role="group" aria-label="探索盤面。矢印キーで移動、Enterで操作、Fで旗" aria-describedby="mines-controls-help"></div></div><div id="mines-pause-cover" class="crystal-pause" hidden><strong>ひと息、つこう。</strong><p>盤面とタイマーを一時停止しています</p><button data-action="minePause">探索を再開</button></div><div class="crystal-sparkles" aria-hidden="true"><i></i><i></i><i></i><i></i><i></i><i></i></div></div>
    <div id="mines-status" class="crystal-status" role="status" aria-live="polite"></div>
    <p id="mines-message" class="crystal-message" aria-live="polite"></p>
    <div id="mines-result" class="crystal-result" hidden><strong>探索レポート</strong><p id="mines-result-copy"></p><button data-action="mineRestart">新しい鉱脈へ</button></div>
    <div class="crystal-controls"><button data-action="mineFlag" id="mine-flag" aria-pressed="false">旗モード</button><button data-action="mineHint" id="mine-hint">安全スキャン 3/3</button><button data-action="minePause" id="mine-pause">一時停止</button></div>
    <div class="crystal-tools"><button data-action="mineZoom" id="mine-zoom" aria-pressed="false">盤面を拡大</button><button data-action="mineQuality" id="mine-quality" aria-pressed="false">高精細描画</button><button data-action="mineRecords">成績</button><button data-action="mineRestart">新しい盤面</button></div>
    <p class="crystal-help" id="mines-controls-help">タップで探索 · 長押し / 右クリックで旗<br>PC：矢印で移動 · Enter / Spaceで操作 · Fで旗 · Pで一時停止<br>旗を数字と同じ数だけ置き、数字をタップすると周囲を一括探索。</p>
   </section>`,iconButton('mineHelp','遊び方','document'));
  renderMines();
  const root=$('#mines-board');let hold=null,gesture=null,suppressIndex=-1,suppressUntil=0;
  const cancelHold=()=>{clearTimeout(hold);hold=null;gesture=null;};
  on(root,'pointerdown',e=>{
   cancelHold();suppressUntil=0;
   const cell=e.target.closest('[data-index]');if(!cell||e.button!==0||!e.isPrimary||!mineCanPlay())return;
   mineFocus=Number(cell.dataset.index);
   gesture={id:e.pointerId,x:e.clientX,y:e.clientY,index:mineFocus};
   if(e.pointerType==='mouse')return;
   hold=setTimeout(()=>{
    if(!gesture||!mineCanPlay())return;
    suppressIndex=gesture.index;suppressUntil=performance.now()+1000;flagMine(gesture.index);A.haptic();hold=null;
   },440);
  });
  on(root,'pointermove',e=>{if(gesture&&(Math.abs(e.clientX-gesture.x)>10||Math.abs(e.clientY-gesture.y)>10))cancelHold();});
  on(window,'pointerup',cancelHold);on(window,'pointercancel',cancelHold);on($('#mines-scroll'),'scroll',cancelHold,{passive:true});
  on(root,'click',e=>{const cell=e.target.closest('[data-index]');if(cell&&Number(cell.dataset.index)===suppressIndex&&performance.now()<suppressUntil){e.preventDefault();e.stopPropagation();suppressUntil=0;}},true);
  on(root,'contextmenu',e=>{
   const cell=e.target.closest('[data-index]');if(!cell)return;e.preventDefault();
   // Native touch menus can arrive before or after our long-press timer.
   if(e.pointerType==='touch'||(gesture&&hold!==null))return;
   if(Number(cell.dataset.index)===suppressIndex&&performance.now()<suppressUntil)return;
   flagMine(Number(cell.dataset.index));
  });
  on(root,'animationend',e=>{if(e.target.matches('.mine-cell'))e.target.classList.remove('revealing');});
  on(root,'focusin',e=>{const cell=e.target.closest('[data-index]');if(!cell)return;mineFocus=Number(cell.dataset.index);for(const button of root.children)button.tabIndex=button===cell?0:-1;mineHighlight(mineFocus);});
  on(root,'pointerover',e=>{const cell=e.target.closest('[data-index]');if(cell)mineHighlight(Number(cell.dataset.index));});
  on(root,'pointerleave',()=>mineHighlight(-1));
  keys(e=>{
   if(e.ctrlKey||e.metaKey||e.altKey||e.isComposing)return;
   if(e.key.toLowerCase()==='p'){e.preventDefault();if(!e.repeat)A.actions.minePause();return;}
   const cell=e.target.closest('#mines-board [data-index]');if(!cell||mines.paused)return;
   const index=Number(cell.dataset.index),size=mines.size;
   if(e.key.startsWith('Arrow')){
    const x=index%size,y=Math.floor(index/size);let next=index;
    if(e.key==='ArrowLeft')next=y*size+Math.max(0,x-1);
    if(e.key==='ArrowRight')next=y*size+Math.min(size-1,x+1);
    if(e.key==='ArrowUp')next=Math.max(0,y-1)*size+x;
    if(e.key==='ArrowDown')next=Math.min(size-1,y+1)*size+x;
    e.preventDefault();mineFocus=next;root.children[next].focus();
   }else if(e.key.toLowerCase()==='f'){e.preventDefault();if(!e.repeat)flagMine(index);}
  });
  every(tickMines,250);every(saveMines,5000);
  const suspend=()=>{cancelHold();tickMines();pauseMines();};
  on(document,'visibilitychange',()=>{if(document.hidden)suspend();else mineClock=performance.now();});
  on(window,'blur',suspend);on(window,'pagehide',suspend);
  const overlays=new MutationObserver(()=>{if(!$('#overlay').hidden)suspend();else mineClock=performance.now();});
  overlays.observe($('#overlay'),{attributes:true,attributeFilter:['hidden']});
  disposers.push(()=>{cancelHold();overlays.disconnect();tickMines();if(mines.started&&!mines.over)mines.paused=true;saveMines();});
 }
 A.actions.mineCell=el=>{mineFocus=Number(el.dataset.index);mineMode==='flag'?flagMine(mineFocus):revealMine(mineFocus);};
 A.actions.mineFlag=()=>{if(!mineCanPlay())return;mineMode=mineMode==='flag'?'open':'flag';mineHint=-1;renderMines();};
 A.actions.minePause=()=>{
  if(!mines.started||mines.over)return;
  if(!mines.paused){tickMines();pauseMines();$('#mines-pause-cover button')?.focus();}
  else{mines.paused=false;mineClock=performance.now();saveMines();renderMines();$('#mines-board').children[mineFocus]?.focus({preventScroll:true});}
 };
 A.actions.mineHint=()=>{
  if(!mineCanPlay()||mines.hintsUsed>=3)return;
  if(!mines.started){mineMessage='まず好きなマスを開いてください。初手と周囲は安全です。';renderMines();return;}
  if(mineHint>=0){const index=mineHint;tickMines();if(!mineCanPlay())return;mines.hintsUsed++;revealMine(index,true);return;}
  const candidates=Array.from({length:mines.size**2},(_,i)=>i).filter(i=>!mines.open.includes(i)&&!mines.flags.includes(i)&&!mines.bombs.includes(i));
  if(!candidates.length){mineMessage='安全な未開封マスに旗が残っています。旗を見直してください。';renderMines();return;}
  mineHint=candidates.find(i=>neighbors(i,mines.size).some(n=>mines.open.includes(n)))??candidates[0];
  mineMessage='光るマスを安全スキャンで開きます。もう一度ボタンを押すと1回消費し、アシスト記録に切り替わります。';renderMines();
  // The preview itself reveals information; count it immediately, even if cancelled.
  mines.hintsUsed++;saveMines();
  const index=mineHint;mineHint=-1;revealMine(index,true);
 };
 A.actions.mineZoom=()=>{mineZoom=!mineZoom;A.save('minesPreferences',{lite:mineLite,zoom:mineZoom});renderMines();};
 A.actions.mineQuality=()=>{mineLite=!mineLite;A.save('minesPreferences',{lite:mineLite,zoom:mineZoom});renderMines();};
 A.actions.mineRestart=()=>A.confirm('新しい鉱脈を探索？','現在の盤面は置き換わります。勝利数と最短記録は残ります。',()=>{const d=mines.difficulty;resetMines(d);saveMines();open('mines');});
 A.actions.mineDifficulty=el=>{const difficulty=el.dataset.value;if(!Object.hasOwn(mineDifficulties,difficulty)||difficulty===mines.difficulty)return;A.confirm('難易度を変更？','現在の盤面を置き換えて、新しい探索を始めます。',()=>{resetMines(difficulty);saveMines();open('mines');});};
 A.actions.mineRecords=()=>{
  const stored=A.load('minesHistory',[]),history=(Array.isArray(stored)?stored:[]).filter(r=>r&&Object.hasOwn(mineDifficulties,r.difficulty)&&typeof r.won==='boolean').slice(0,30);
  help('Crystal Field · 成績',`<p>累計 ${mineNumber(A.load('minesWins',0))}勝</p><h3>難易度別の最短記録</h3>${Object.keys(mineDifficulties).map(id=>{const best=mineNumber(A.load('minesBest-'+id,0)),assisted=mineNumber(A.load('minesAssistedBest-'+id,0));return `<p>${mineLabels[id]}：${best?mineTime(best):'未記録'}<br>アシスト：${assisted?mineTime(assisted):'未記録'}</p>`;}).join('')}<h3>最近の探索（最大30件）</h3><p>完了した探索のみ。途中で作り直した盤面は含みません。</p>${history.map(r=>`<p>${esc(typeof r.date==='string'?r.date.slice(0,10):'')} · ${mineLabels[r.difficulty]} · ${r.won?'クリア':'探索終了'}<br>${mineTime(mineNumber(r.seconds))} / ${mineNumber(r.moves)}手 / ${mineNumber(r.hints)?'アシスト':'ノーヒント'}</p>`).join('')||'<p>まだ記録はありません。</p>'}`);
 };
 A.actions.mineHelp=()=>help('Crystal Field · 遊び方','<p>鉱石を避け、すべての安全なマスを開けばクリア。数字は周囲8マスの鉱石の数です。初手とその周囲は必ず安全です。</p><p>タップで探索。旗モード、長押し（約0.44秒）、右クリック、Fキーで旗を切り替えます。数字の周囲に同じ数の旗があれば、数字をタップして一括探索。間違った旗があると鉱石を開く場合があります。</p><p>安全スキャンは1探索3回まで、安全なマスを1つ開きます。使用したクリアはアシスト最短に記録し、通常の最短記録を更新しません。推測が必要な盤面もあります。</p><p>矢印キーで移動、Enter / Spaceで現在のモードの操作、Pで一時停止。拡大表示では盤面をスクロールできます。時間はプレイ中のみ計測。別画面・タブ・ダイアログへ移ると一時停止し、戻ったら手動で再開します。</p><p>盤面・経過時間・旗・スキャン残数を端末内に自動保存。高精細描画ボタンで軽量描画に切替。OSとauraの「動きを減らす」に対応します。</p>');

 // Reversi: legal move generation, two-ply positional AI and local two-player mode.
 const directions=[[-1,-1],[0,-1],[1,-1],[-1,0],[1,0],[-1,1],[0,1],[1,1]];
 const weights=[120,-25,20,5,5,20,-25,120,-25,-45,-5,-5,-5,-5,-45,-25,20,-5,15,3,3,15,-5,20,5,-5,3,3,3,3,-5,5,5,-5,3,3,3,3,-5,5,20,-5,15,3,3,15,-5,20,-25,-45,-5,-5,-5,-5,-45,-25,120,-25,20,5,5,20,-25,120];
 let reversi=null,reversiHistory=[],aiBusy=false;
 function freshReversi(mode='cpu'){reversi={board:Array(64).fill(0),turn:1,mode,over:false,counted:false};reversi.board[27]=reversi.board[36]=2;reversi.board[28]=reversi.board[35]=1;reversiHistory=[];aiBusy=false;}
 function flips(board,index,color){if(board[index])return [];const x=index%8,y=Math.floor(index/8),out=[];for(const [dx,dy] of directions){let nx=x+dx,ny=y+dy,line=[];while(nx>=0&&ny>=0&&nx<8&&ny<8&&board[ny*8+nx]===3-color){line.push(ny*8+nx);nx+=dx;ny+=dy;}if(line.length&&nx>=0&&ny>=0&&nx<8&&ny<8&&board[ny*8+nx]===color)out.push(...line);}return out;}
 const moves=(board,color)=>Array.from({length:64},(_,i)=>i).filter(i=>flips(board,i,color).length);
 function placed(board,index,color){const next=[...board];for(const p of flips(board,index,color))next[p]=color;next[index]=color;return next;}
 function evaluateBoard(board,color){return board.reduce((sum,v,i)=>sum+(v===color?weights[i]:v===3-color?-weights[i]:0),0)+(moves(board,color).length-moves(board,3-color).length)*7;}
 function cpuMove(){let best=-Infinity,chosen=null;for(const index of moves(reversi.board,2)){const after=placed(reversi.board,index,2),replies=moves(after,1);const value=replies.length?Math.min(...replies.map(r=>evaluateBoard(placed(after,r,1),2))):evaluateBoard(after,2)+30;if(value>best){best=value;chosen=index;}}return chosen;}
 function finishTurn(){const r=reversi;r.turn=3-r.turn;r.pass=false;if(!moves(r.board,r.turn).length){r.turn=3-r.turn;r.pass=true;if(!moves(r.board,r.turn).length){r.over=true;const black=r.board.filter(x=>x===1).length,white=r.board.filter(x=>x===2).length;if(!r.counted&&black>white){A.save('reversiWins',A.load('reversiWins',0)+1);r.counted=true;}}}A.save('reversiState',r);renderReversi();scheduleAI();}
 function scheduleAI(){if(reversi.mode!=='cpu'||reversi.turn!==2||reversi.over||aiBusy)return;aiBusy=true;renderReversi();defer(()=>{const index=cpuMove();aiBusy=false;if(index!==null){reversi.board=placed(reversi.board,index,2);finishTurn();}},430);}
 function renderReversi(){const root=$('#reversi-board');if(!root)return;const r=reversi,legal=moves(r.board,r.turn);root.innerHTML=r.board.map((v,i)=>`<button class="reversi-cell" data-action="reversiMove" data-index="${i}" aria-label="${Math.floor(i/8)+1}行${i%8+1}列 ${v===1?'黒':v===2?'白':legal.includes(i)?'置けます':'空'}">${v?`<span class="reversi-disc ${v===1?'black':'white'}"></span>`:legal.includes(i)&&!r.over&&!aiBusy?'<i class="reversi-hint"></i>':''}</button>`).join('');const black=r.board.filter(x=>x===1).length,white=r.board.filter(x=>x===2).length;$('#reversi-black').textContent=black;$('#reversi-white').textContent=white;$('#reversi-status').textContent=r.over?(black===white?'DRAW':black>white?'黒の勝ち':'白の勝ち'):aiBusy?'白が思考中':(r.pass?'パス · ':'')+(r.turn===1?'黒の番':'白の番');}
 function reversiApp(){if(!reversi){const saved=A.load('reversiState',null);if(saved?.board?.length===64)reversi=saved;else freshReversi();}aiBusy=false;shell('Reversi','jade',`<div class="arc-difficulty"><button data-action="reversiMode" data-value="cpu" class="${reversi.mode==='cpu'?'active':''}">CPU対戦</button><button data-action="reversiMode" data-value="local" class="${reversi.mode==='local'?'active':''}">2人対戦</button></div><div class="reversi-score"><div><i class="reversi-disc black"></i><strong id="reversi-black">2</strong></div><span>VS</span><div><strong id="reversi-white">2</strong><i class="reversi-disc white"></i></div></div><div class="reversi-frame"><div class="reversi-board" id="reversi-board"></div></div><div class="arc-result" id="reversi-status" role="status"></div><div class="arc-primary-controls"><button data-action="reversiUndo">一手戻す</button><button data-action="reversiRestart">もう一度</button></div>`,iconButton('reversiHelp','遊び方','document'));renderReversi();scheduleAI();disposers.push(()=>{aiBusy=false;A.save('reversiState',reversi);});}
 A.actions.reversiMove=el=>{const i=Number(el.dataset.index);if(aiBusy||reversi.over||!flips(reversi.board,i,reversi.turn).length)return;reversiHistory.push(structuredClone(reversi));reversi.board=placed(reversi.board,i,reversi.turn);finishTurn();};A.actions.reversiUndo=()=>{if(aiBusy||reversi.over||!reversiHistory.length)return;reversi=reversiHistory.pop();A.save('reversiState',reversi);renderReversi();};A.actions.reversiRestart=()=>A.confirm('新しい対局？','現在の盤面をリセットします。',()=>{const mode=reversi.mode;stop();freshReversi(mode);open('reversi');});A.actions.reversiMode=el=>A.confirm('対戦モードを変更？','新しい対局を始めます。',()=>{stop();freshReversi(el.dataset.value);open('reversi');});A.actions.reversiHelp=()=>help('Reversi','自分の石ではさんだ相手の石が裏返ります。点のあるマスに置けます。置けない場合は自動でパス。両者が置けなくなると終了し、石の多い方が勝ちです。CPU対戦ではあなたが黒です。');

 // Orbit Breaker: fixed-step motion, paddle angles, multi-stage brick patterns and touch drag.
 let breaker=null,breakerKeys={left:false,right:false},breakerFrame=0;
 function stageBricks(stage){const rows=Math.min(7,3+stage),items=[];for(let r=0;r<rows;r++)for(let c=0;c<7;c++){if(stage%3===2&&(r+c)%4===0)continue;items.push({x:20+c*46,y:60+r*24,w:40,h:16,hp:r===0&&stage>1?2:1,color:['#c6a5c6','#8db1c2','#a6bca4','#d5b488','#cc9294'][r%5]});}return items;}
 function resetBreaker(){breaker={paddle:180,ball:{x:180,y:440,vx:140,vy:-220},bricks:stageBricks(1),score:0,lives:3,stage:1,running:false,launched:false,over:false,trail:[],combo:0};}
 function breakerBallReset(){breaker.ball={x:breaker.paddle,y:440,vx:140,vy:-220};breaker.launched=false;breaker.trail=[];breaker.combo=0;}
 function breakerUpdate(dt){const b=breaker;if(!b.running||b.over)return;if(breakerKeys.left)b.paddle-=340*dt;if(breakerKeys.right)b.paddle+=340*dt;b.paddle=Math.max(44,Math.min(316,b.paddle));if(!b.launched){b.ball.x=b.paddle;return;}const ball=b.ball,prevX=ball.x,prevY=ball.y;ball.x+=ball.vx*dt;ball.y+=ball.vy*dt;if(ball.x<8){ball.x=8;ball.vx=Math.abs(ball.vx);}if(ball.x>352){ball.x=352;ball.vx=-Math.abs(ball.vx);}if(ball.y<8){ball.y=8;ball.vy=Math.abs(ball.vy);}if(ball.vy>0&&prevY<=456&&ball.y>=448&&ball.x>b.paddle-48&&ball.x<b.paddle+48){const angle=(ball.x-b.paddle)/48*1.05,speed=Math.min(420,270+b.stage*15);ball.vx=Math.sin(angle)*speed;ball.vy=-Math.cos(angle)*speed;ball.y=447;b.combo=0;}for(const brick of b.bricks){if(brick.hp<=0||ball.x+7<brick.x||ball.x-7>brick.x+brick.w||ball.y+7<brick.y||ball.y-7>brick.y+brick.h)continue;if(prevX+7<=brick.x||prevX-7>=brick.x+brick.w)ball.vx=-ball.vx;else ball.vy=-ball.vy;brick.hp--;b.combo++;b.score+=10+Math.min(50,b.combo*2);break;}if(ball.y>500){b.lives--;if(b.lives===0){b.over=true;b.running=false;A.save('breakerBest',Math.max(A.load('breakerBest',0),b.score));}else breakerBallReset();}if(b.bricks.every(x=>x.hp<=0)){b.stage++;b.bricks=stageBricks(b.stage);b.score+=100;breakerBallReset();}b.trail.unshift({x:ball.x,y:ball.y});b.trail=b.trail.slice(0,12);}
 function drawBreaker(){const canvas=$('#breaker-canvas');if(!canvas)return;const ctx=canvas.getContext('2d'),b=breaker;const bg=ctx.createLinearGradient(0,0,360,500);bg.addColorStop(0,'#292b43');bg.addColorStop(1,'#48425a');ctx.fillStyle=bg;ctx.fillRect(0,0,360,500);for(let i=0;i<38;i++){ctx.fillStyle=i%3?'#ffffff30':'#e9d3aa66';ctx.beginPath();ctx.arc((i*97+31)%360,(i*67+43)%450,i%3?.7:1.2,0,Math.PI*2);ctx.fill();}ctx.strokeStyle='#b8a6c215';for(let i=0;i<3;i++){ctx.beginPath();ctx.ellipse(180,320,110+i*42,65+i*30,-.35,0,Math.PI*2);ctx.stroke();}for(const brick of b.bricks){if(brick.hp<=0)continue;ctx.shadowBlur=5;ctx.shadowColor='#0004';ctx.shadowOffsetY=3;ctx.fillStyle=brick.color;ctx.beginPath();ctx.roundRect(brick.x,brick.y,brick.w,brick.h,5);ctx.fill();ctx.shadowBlur=0;ctx.shadowOffsetY=0;ctx.strokeStyle='#ffffff50';ctx.beginPath();ctx.moveTo(brick.x+5,brick.y+2);ctx.lineTo(brick.x+brick.w-5,brick.y+2);ctx.stroke();if(brick.hp===2){ctx.fillStyle='#ffffff70';ctx.beginPath();ctx.arc(brick.x+brick.w/2,brick.y+8,2,0,Math.PI*2);ctx.fill();}}b.trail.forEach((p,i)=>{ctx.fillStyle=`rgba(244,215,171,${(1-i/12)*.2})`;ctx.beginPath();ctx.arc(p.x,p.y,6-i*.35,0,Math.PI*2);ctx.fill();});ctx.fillStyle='#f9dfb2';ctx.shadowBlur=14;ctx.shadowColor='#f1d3a966';ctx.beginPath();ctx.arc(b.ball.x,b.ball.y,6,0,Math.PI*2);ctx.fill();ctx.shadowBlur=0;const pg=ctx.createLinearGradient(b.paddle-42,450,b.paddle+42,461);pg.addColorStop(0,'#e8d9ea');pg.addColorStop(1,'#b9b5d5');ctx.fillStyle=pg;ctx.beginPath();ctx.roundRect(b.paddle-42,454,84,10,5);ctx.fill();if(!b.running||!b.launched){ctx.fillStyle='#272a3b70';ctx.fillRect(0,205,360,90);ctx.textAlign='center';ctx.fillStyle='#efe4e9';ctx.font='500 19px sans-serif';ctx.fillText(b.over?'GAME OVER':b.running?'タップして発射':'ORBIT BREAKER',180,248);ctx.font='12px sans-serif';ctx.fillStyle='#c4b7cd';ctx.fillText(b.over?number(b.score):'ドラッグでパドルを操作',180,273);}$('#breaker-score').textContent=number(b.score);$('#breaker-lives').textContent='●'.repeat(b.lives);$('#breaker-stage').textContent=String(b.stage).padStart(2,'0');$('#breaker-toggle').textContent=b.over?'もう一度':b.running?'一時停止':'開始';}
 function breakerApp(){if(!breaker)resetBreaker();shell('Orbit Breaker','night',`<div class="arc-scorebar">${score('SCORE',breaker.score,'breaker-score')}${score('LIVES','●●●','breaker-lives')}${score('STAGE',breaker.stage,'breaker-stage')}</div><canvas id="breaker-canvas" width="360" height="500" aria-label="ブロック崩しの盤面"></canvas><div class="arc-primary-controls"><button data-action="breakerToggle" id="breaker-toggle">開始</button><button data-action="breakerLaunch">発射</button><button data-action="breakerRestart">リセット</button></div>`,iconButton('breakerHelp','遊び方','document'));const canvas=$('#breaker-canvas');const aim=e=>{const r=canvas.getBoundingClientRect();breaker.paddle=Math.max(44,Math.min(316,(e.clientX-r.left)*360/r.width));};on(canvas,'pointerdown',e=>{aim(e);canvas.setPointerCapture(e.pointerId);if(breaker.running&&!breaker.launched)breaker.launched=true;});on(canvas,'pointermove',e=>{if(e.buttons||e.pointerType==='mouse')aim(e);});keys(e=>{if(e.key==='ArrowLeft'){e.preventDefault();breakerKeys.left=true;}if(e.key==='ArrowRight'){e.preventDefault();breakerKeys.right=true;}if(e.code==='Space'){e.preventDefault();breaker.running?A.actions.breakerLaunch():A.actions.breakerToggle();}});on(document,'keyup',e=>{if(e.key==='ArrowLeft')breakerKeys.left=false;if(e.key==='ArrowRight')breakerKeys.right=false;});on(window,'blur',()=>{breakerKeys={left:false,right:false};});let last=performance.now(),accumulator=0;function frame(now){const dt=Math.min(.035,(now-last)/1000);last=now;if(!document.hidden&&$('#overlay').hidden){accumulator+=dt;while(accumulator>=1/120){breakerUpdate(1/120);accumulator-=1/120;}}else accumulator=0;drawBreaker();breakerFrame=requestAnimationFrame(frame);}breakerFrame=requestAnimationFrame(frame);disposers.push(()=>{cancelAnimationFrame(breakerFrame);breaker.running=false;breakerKeys={left:false,right:false};A.save('breakerBest',Math.max(A.load('breakerBest',0),breaker.score));});}
 A.actions.breakerToggle=()=>{if(breaker.over)resetBreaker();breaker.running=!breaker.running;drawBreaker();};A.actions.breakerLaunch=()=>{if(breaker.running)breaker.launched=true;};A.actions.breakerRestart=()=>A.confirm('新しいゲーム？','現在のスコアをリセットします。',()=>{resetBreaker();drawBreaker();});A.actions.breakerHelp=()=>help('Orbit Breaker','開始して盤面をタップすると発射。ドラッグまたは←→でパドルを動かします。パドルに当たる位置で反射角が変わります。すべて壊すと次のステージ。落球3回で終了です。');

 // Sudoku: transformations preserve a known unique puzzle; notes, undo and daily seeds.
 const sudokuPuzzle='530070000600195000098000060800060003400803001700020006060000280000419005000080079';
 const sudokuSolution='534678912672195348198342567859761423426853791713924856961537284287419635345286179';
 let sudoku=null,sudokuSelected=-1,sudokuPencil=false,sudokuUndo=[];
 const localDay=()=>{const d=new Date();return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;};
 function rng(seed){let n=seed>>>0;return ()=>{n=(Math.imul(n,1664525)+1013904223)>>>0;return n/4294967296;};}
 function mix(list,random){for(let i=list.length-1;i>0;i--){const j=Math.floor(random()*(i+1));[list[i],list[j]]=[list[j],list[i]];}return list;}
 function resetSudoku(daily=false,difficulty='normal'){const seed=daily?Number(localDay().replace(/-/g,'')):Math.floor(Math.random()*2**32),random=rng(seed),digits=mix([1,2,3,4,5,6,7,8,9],random),bands=mix([0,1,2],random),stacks=mix([0,1,2],random),rows=bands.flatMap(b=>mix([0,1,2],random).map(x=>b*3+x)),cols=stacks.flatMap(b=>mix([0,1,2],random).map(x=>b*3+x));const transform=s=>rows.flatMap(r=>cols.map(c=>Number(s[r*9+c])?digits[Number(s[r*9+c])-1]:0)),solution=transform(sudokuSolution),givens=transform(sudokuPuzzle),extra=difficulty==='easy'?15:difficulty==='normal'?6:0;mix(givens.map((v,i)=>!v?i:-1).filter(i=>i>=0),random).slice(0,extra).forEach(i=>givens[i]=solution[i]);sudoku={givens,solution,values:[...givens],notes:{},seconds:0,hints:3,over:false,daily,difficulty,date:localDay(),counted:false};sudokuSelected=-1;sudokuUndo=[];saveSudoku();}
 const saveSudoku=()=>A.save('sudokuState',sudoku);
 function completedSudoku(){if(sudoku.values.every((v,i)=>v===sudoku.solution[i])){sudoku.over=true;if(!sudoku.counted){sudoku.counted=true;const days=A.load('sudokuDaily',[]);if(!sudoku.daily||!days.includes(sudoku.date)){A.save('sudokuWins',A.load('sudokuWins',0)+1);if(sudoku.daily)A.save('sudokuDaily',[sudoku.date,...days].slice(0,365));}}}}
 function sudokuEntry(value){const s=sudoku,i=sudokuSelected;if(i<0||i>=81||s.givens[i]||s.over||!Number.isInteger(value)||value<0||value>9)return;if(sudokuPencil&&value&&s.values[i])return;if((!sudokuPencil||!value)&&s.values[i]===value&&!(s.notes[i]?.length))return;sudokuUndo.push({values:[...s.values],notes:structuredClone(s.notes)});if(sudokuUndo.length>100)sudokuUndo.shift();if(sudokuPencil&&value){const notes=s.notes[i]||[];s.notes[i]=notes.includes(value)?notes.filter(x=>x!==value):[...notes,value].sort();}else{s.values[i]=value;delete s.notes[i];if(value)for(let n=0;n<81;n++){if(Math.floor(n/9)===Math.floor(i/9)||n%9===i%9||(Math.floor(n/27)===Math.floor(i/27)&&Math.floor(n%9/3)===Math.floor(i%9/3)))s.notes[n]=(s.notes[n]||[]).filter(x=>x!==value);}}completedSudoku();saveSudoku();renderSudoku();}
 function renderSudoku(showErrors=false){const board=$('#sudoku-board');if(!board)return;const s=sudoku,selected=s.values[sudokuSelected];board.innerHTML=s.values.map((v,i)=>{const r=Math.floor(i/9),c=i%9,related=sudokuSelected>=0&&(r===Math.floor(sudokuSelected/9)||c===sudokuSelected%9||Math.floor(r/3)===Math.floor(sudokuSelected/27)&&Math.floor(c/3)===Math.floor(sudokuSelected%9/3));return `<button class="sudoku-cell ${s.givens[i]?'given':''} ${i===sudokuSelected?'selected':related?'related':''} ${v&&v===selected?'same':''} ${showErrors&&v&&v!==s.solution[i]?'error':''}" data-action="sudokuSelect" data-index="${i}" style="${c===2||c===5?'border-right:2px solid var(--sudoku-line);':''}${r===2||r===5?'border-bottom:2px solid var(--sudoku-line);':''}" aria-label="${r+1}行${c+1}列 ${v||'空欄'}">${v||`<span class="sudoku-notes">${Array.from({length:9},(_,n)=>`<i>${s.notes[i]?.includes(n+1)?n+1:''}</i>`).join('')}</span>`}</button>`;}).join('');$('#sudoku-time').textContent=`${String(Math.floor(s.seconds/60)).padStart(2,'0')}:${String(s.seconds%60).padStart(2,'0')}`;$('#sudoku-remaining').textContent=s.values.filter(v=>!v).length;$('#sudoku-pencil').classList.toggle('active',sudokuPencil);$('#sudoku-pencil').setAttribute('aria-pressed',String(sudokuPencil));$('#sudoku-hints').textContent=s.hints;$('#sudoku-status').textContent=s.over?'CLEAR':s.daily?'DAILY · '+s.date:'';A.$$('.sudoku-number').forEach(b=>{const value=Number(b.dataset.value);b.classList.toggle('complete',s.values.filter(v=>v===value).length>=9);});}
 function sudokuApp(){if(!sudoku){const saved=A.load('sudokuState',null);if(saved?.values?.length===81&&saved.solution?.length===81)sudoku=saved;else resetSudoku();}shell('Sudoku','paper',`<div class="arc-scorebar">${score('TIME','00:00','sudoku-time')}${score('EMPTY',0,'sudoku-remaining')}${score('WINS',A.load('sudokuWins',0))}</div><div class="sudoku-board" id="sudoku-board"></div><div class="sudoku-tools"><button data-action="sudokuUndo" aria-label="元に戻す">↶</button><button data-action="sudokuErase" aria-label="消す">⌫</button><button data-action="sudokuPencil" id="sudoku-pencil" aria-pressed="false">✎ メモ</button><button data-action="sudokuHint">ヒント <span id="sudoku-hints">3</span></button></div><div class="sudoku-numbers">${Array.from({length:9},(_,i)=>`<button class="sudoku-number" data-action="sudokuNumber" data-value="${i+1}">${i+1}</button>`).join('')}</div><div class="arc-result" id="sudoku-status" role="status"></div><div class="arc-primary-controls"><button data-action="sudokuCheck">確認</button><button data-action="sudokuNew">新しい問題</button><button data-action="sudokuDaily">今日の問題</button></div>`,iconButton('sudokuHelp','遊び方','document'));renderSudoku();every(()=>{if(!sudoku.over&&!document.hidden&&$('#overlay').hidden){sudoku.seconds++;$('#sudoku-time').textContent=`${String(Math.floor(sudoku.seconds/60)).padStart(2,'0')}:${String(sudoku.seconds%60).padStart(2,'0')}`;}},1000);disposers.push(saveSudoku);keys(e=>{if(/^[1-9]$/.test(e.key)){e.preventDefault();sudokuEntry(Number(e.key));}else if(['Backspace','Delete','0'].includes(e.key)){e.preventDefault();sudokuEntry(0);}else if(e.key.toLowerCase()==='n')A.actions.sudokuPencil();else if(e.key.startsWith('Arrow')){e.preventDefault();const i=Math.max(0,sudokuSelected),delta={ArrowLeft:-1,ArrowRight:1,ArrowUp:-9,ArrowDown:9}[e.key];sudokuSelected=Math.max(0,Math.min(80,i+delta));renderSudoku();}});}
 A.actions.sudokuSelect=el=>{sudokuSelected=Number(el.dataset.index);renderSudoku();};A.actions.sudokuNumber=el=>sudokuEntry(Number(el.dataset.value));A.actions.sudokuErase=()=>sudokuEntry(0);A.actions.sudokuPencil=()=>{sudokuPencil=!sudokuPencil;renderSudoku();};A.actions.sudokuUndo=()=>{const previous=sudokuUndo.pop();if(!previous||sudoku.over)return;sudoku.values=previous.values;sudoku.notes=previous.notes;saveSudoku();renderSudoku();};A.actions.sudokuCheck=()=>{renderSudoku(true);const wrong=sudoku.values.filter((v,i)=>v&&v!==sudoku.solution[i]).length;A.toast(wrong?`${wrong}マスを見直しましょう`:'入力済みの数字は合っています');};A.actions.sudokuHint=()=>{if(sudoku.hints<=0||sudoku.over)return A.toast('ヒントは残っていません');if(sudokuSelected<0||sudoku.givens[sudokuSelected])return A.toast('空欄か入力したマスを選択');if(sudoku.values[sudokuSelected]===sudoku.solution[sudokuSelected])return A.toast('このマスは合っています');sudokuPencil=false;sudoku.hints--;sudokuEntry(sudoku.solution[sudokuSelected]);};A.actions.sudokuNew=()=>A.overlay(`${A.overlayTitle('新しい問題')}<div class="arc-new-options">${[['easy','やさしい'],['normal','ふつう'],['hard','むずかしい']].map(([id,label])=>`<button data-action="sudokuDifficulty" data-value="${id}">${label}</button>`).join('')}</div><p class="arc-help">現在の盤面を置き換えます。</p>`);A.actions.sudokuDifficulty=el=>{resetSudoku(false,el.dataset.value);A.closeOverlay();renderSudoku();};A.actions.sudokuDaily=()=>A.confirm('今日の問題を開く？','現在の盤面を置き換えます。',()=>{resetSudoku(true,'normal');renderSudoku();});A.actions.sudokuHelp=()=>help('Sudoku','縦・横・3×3の枠に1〜9を1回ずつ入れます。✎で候補をメモ。確認で間違いを表示し、ヒントは1問3回まで。入力・メモ・経過時間は保存されます。今日の問題は日付ごとに同じ盤面です。');

 const route=new URLSearchParams(location.hash.slice(1));
 if(A.current==='games')A.apps.games.render(route.get('view')||undefined);
})();
