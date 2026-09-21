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
  if(id==='mines')shapes='<ellipse cx="80" cy="121" rx="43" ry="7" fill="#234f6a20"/><path d="m78 14 37 29 8 44-45 34-43-34 8-44Z" fill="#54b7c9"/><path d="m78 14-17 53 17 54 20-54Z" fill="#c9fff1"/><path d="m43 43 18 24-26 20Z" fill="#91e0e6"/><path d="m115 43-17 24 25 20Z" fill="#2588ab"/><path d="m35 87 26-20 17 54Z" fill="#53a2cb"/><path d="m123 87-25-20-20 54Z" fill="#67d7c5"/><path d="m43 43 35-29 37 29M61 67l17-53 20 53-20 54Z" stroke="#f0fff7aa" fill="none"/><path d="M128 20v12m-6-6h12M27 72v8m-4-4h8" stroke="#fcfff5" stroke-width="2"/>';
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
 let mineLite=minePrefs?.lite===true,mineZoom=minePrefs?.zoom===true,mineSound=minePrefs?.sound===true;
 const mineThemes={aqua:'アクア',amethyst:'アメジスト',amber:'アンバー'};
 let mineTheme=Object.hasOwn(mineThemes,minePrefs?.theme)?minePrefs.theme:'aqua',mineAudio=null,mineToneAt=-Infinity;
 const saveMinePrefs=()=>A.save('minesPreferences',{lite:mineLite,zoom:mineZoom,sound:mineSound,theme:mineTheme});
 const mineDay=()=>{const d=new Date();return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;};
 const validMineDay=day=>typeof day==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(day)&&Number.isFinite(Date.parse(day+'T00:00:00Z'))&&new Date(day+'T00:00:00Z').toISOString().slice(0,10)===day;
 const mineStart=()=>Math.floor(mines.size/2)*mines.size+Math.floor(mines.size/2);
 function mineDailyRandom(day,difficulty){
  // Versioned seed and a fixed starting cell make retries reproducible.
  let seed=2166136261;for(const c of `crystal-v1/${day}/${difficulty}`)seed=Math.imul(seed^c.charCodeAt(0),16777619)>>>0;
  return ()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};
 }
 function mineDailyRecords(){
  const saved=A.load('minesDailyRecords',[]);
  return (Array.isArray(saved)?saved:[]).filter(r=>r&&validMineDay(r.day)&&Object.hasOwn(mineDifficulties,r.difficulty)).slice(0,90).map(r=>({day:r.day,difficulty:r.difficulty,best:mineNumber(r.best),assistedBest:mineNumber(r.assistedBest)}));
 }
 function mineBest(){
  if(mines.day){const record=mineDailyRecords().find(r=>r.day===mines.day&&r.difficulty===mines.difficulty);return mineNumber(record?.[mines.hintsUsed?'assistedBest':'best']);}
  return mineNumber(A.load((mines.hintsUsed?'minesAssistedBest-':'minesBest-')+mines.difficulty,0));
 }
 function closeMineAudio(){const audio=mineAudio;mineAudio=null;mineToneAt=-Infinity;if(audio)audio.close().catch(()=>{});}
 function mineTone(kind='open'){
  if(!mineSound||A.settings.sound===false||A.settings.volume===0||document.hidden||!$('#overlay').hidden)return;
  try{
   const Audio=window.AudioContext||window.webkitAudioContext;if(!Audio)return;
   if(!mineAudio)mineAudio=new Audio();
   if(mineAudio.state==='suspended'){mineAudio.resume().catch(()=>{});return;}
   if(mineAudio.state!=='running'||performance.now()-mineToneAt<65)return;
   mineToneAt=performance.now();
   const ctx=mineAudio,frequencies=kind==='win'?[523,659,784]:kind==='loss'?[220,165]:kind==='flag'?[440]:kind==='scan'?[659,880]:[587];
   const volume=Number.isFinite(A.settings.volume)?Math.max(0,Math.min(100,A.settings.volume))/100:.6;
   frequencies.forEach((hz,i)=>{const oscillator=ctx.createOscillator(),gain=ctx.createGain(),at=ctx.currentTime+i*.085;oscillator.type='sine';oscillator.frequency.value=hz;gain.gain.setValueAtTime(0,at);gain.gain.linearRampToValueAtTime(.075*volume,at+.012);gain.gain.exponentialRampToValueAtTime(.0001,at+.16);oscillator.connect(gain);gain.connect(ctx.destination);oscillator.onended=()=>{oscillator.disconnect();gain.disconnect();};oscillator.start(at);oscillator.stop(at+.18);});
  }catch{closeMineAudio();}
 }
 const mineGem='<svg viewBox="0 0 48 56" aria-hidden="true"><path d="M24 2 42 15 45 37 24 54 3 37 6 15Z" fill="#54b7c9"/><path d="m24 2-9 25 9 27 10-27Z" fill="#c9fff1"/><path d="M6 15 15 27 3 37Z" fill="#91e0e6"/><path d="m42 15-8 12 11 10Z" fill="#2588ab"/><path d="m3 37 12-10 9 27Z" fill="#53a2cb"/><path d="m45 37-11-10-10 27Z" fill="#67d7c5"/><path d="m6 15 18-13 18 13M15 27l9-25 10 25-10 27Z" fill="none" stroke="#edfff9" stroke-opacity=".65"/></svg>';
 const mineFlagArt='<svg viewBox="0 0 24 28" aria-hidden="true"><path d="M7 24V3l13 3-13 9" fill="#e6b879" stroke="#ffe7bb" stroke-width="1.5" stroke-linejoin="round"/><path d="M3 25h11" stroke="#ffe7bb" stroke-width="2" stroke-linecap="round"/></svg>';
 const neighbors=(index,size)=>{const out=[],x=index%size,y=Math.floor(index/size);for(let dy=-1;dy<=1;dy++)for(let dx=-1;dx<=1;dx++){if(!dx&&!dy)continue;const nx=x+dx,ny=y+dy;if(nx>=0&&ny>=0&&nx<size&&ny<size)out.push(ny*size+nx);}return out;};
 const nearBombs=i=>neighbors(i,mines.size).filter(n=>mines.bombs.includes(n)).length;
 const mineTime=value=>{const seconds=Math.floor(value);return `${String(Math.floor(seconds/60)).padStart(2,'0')}:${String(seconds%60).padStart(2,'0')}`;};
 const mineNumber=value=>Number.isFinite(value)&&value>=0?Math.floor(value):0;
 function resetMines(difficulty='easy',day=''){
  if(!Object.hasOwn(mineDifficulties,difficulty))difficulty='easy';
  const [size,count]=mineDifficulties[difficulty];
  mines={version:3,difficulty,size,count,day:validMineDay(day)?day:'',bombs:[],open:[],flags:[],started:false,over:false,won:false,elapsed:0,elapsedMs:0,paused:false,hintsUsed:0,moves:0};
  mineMode='open';mineFocus=mines.day?mineStart():0;mineHint=-1;mineMessage=mines.day?'中央の＋マスからスタート。同じ日・難易度なら同じ鉱脈に挑戦できます。':'最初のマスと、その周囲は必ず安全です。';mineClock=performance.now();
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
  if(saved.day&&!validMineDay(saved.day))return false;
  const elapsed=mineNumber(saved.elapsed),elapsedMs=Number.isFinite(saved.elapsedMs)&&saved.elapsedMs>=0?saved.elapsedMs:elapsed*1000;
  mines={version:3,difficulty:saved.difficulty,size,count,day:validMineDay(saved.day)?saved.day:'',bombs:[...saved.bombs],open:[...saved.open],flags:[...saved.flags],started:saved.started,over:saved.over,won:saved.won,hit:saved.over&&!saved.won?saved.hit:undefined,elapsed:saved.over?Math.max(1,Math.ceil(elapsedMs/1000)):Math.floor(elapsedMs/1000),elapsedMs,paused:saved.started&&!saved.over,hintsUsed:Math.min(3,mineNumber(saved.hintsUsed)),moves:mineNumber(saved.moves)};
  mineFocus=mines.day&&!mines.started?mineStart():0;
  mineMessage=mines.paused?'保存した探索を再開できます。':mines.day?'中央の＋マスから、日替わりの探索を始めましょう。':'保存した盤面を読み込みました。';
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
  mines.paused=true;mineHint=-1;closeMineAudio();saveMines();renderMines();
 }
 function seedMines(first){
  const safe=new Set([first,...neighbors(first,mines.size)]),pool=Array.from({length:mines.size**2},(_,i)=>i).filter(i=>!safe.has(i));
  const random=mines.day?mineDailyRandom(mines.day,mines.difficulty):Math.random;
  for(let i=pool.length-1;i>0;i--){const j=Math.floor(random()*(i+1));[pool[i],pool[j]]=[pool[j],pool[i]];}
  mines.bombs=pool.slice(0,mines.count);mines.started=true;mineClock=performance.now();
 }
 function finishMines(){
  const m=mines;
  if(!m.over&&m.open.length===m.size**2-m.count){m.over=true;m.won=true;m.flags=[...m.bombs];}
  if(!m.over)return;
  m.elapsed=Math.max(1,Math.ceil(m.elapsedMs/1000));
  if(m.won&&m.day){
   const records=mineDailyRecords(),previous=records.find(r=>r.day===m.day&&r.difficulty===m.difficulty),record=previous||{day:m.day,difficulty:m.difficulty,best:0,assistedBest:0};
   const key=m.hintsUsed?'assistedBest':'best';if(!record[key]||m.elapsed<record[key])record[key]=m.elapsed;
   // Daily retries never inflate free-play wins or free-play best times.
   A.save('minesDailyRecords',[record,...records.filter(r=>r!==previous)].slice(0,90));
  }else if(m.won){
   A.save('minesWins',mineNumber(A.load('minesWins',0))+1);
   const key=(m.hintsUsed?'minesAssistedBest-':'minesBest-')+m.difficulty,best=mineNumber(A.load(key,0));
   if(!best||m.elapsed<best)A.save(key,m.elapsed);
  }
  const stored=A.load('minesHistory',[]),history=Array.isArray(stored)?stored:[];
  A.save('minesHistory',[{day:m.day,difficulty:m.difficulty,won:m.won,seconds:m.elapsed,hints:m.hintsUsed,moves:m.moves,date:new Date().toISOString()},...history].slice(0,30));
 }
 function revealMine(index,fromHint=false){
  if(!mineCanPlay()||!Number.isInteger(index)||index<0||index>=mines.size**2||mines.flags.includes(index))return;
  tickMines();if(!mineCanPlay())return;
  const m=mines;mineHint=fromHint?index:-1;
  if(!m.started&&m.day&&index!==mineStart()){mineMessage='今日の鉱脈は中央の＋マスから開始します。';renderMines();return;}
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
  saveMines();renderMines(changed,index);mineTone(m.over?(m.won?'win':'loss'):fromHint?'scan':'open');
  if(fromHint)rootMineScan(index);
 }
 function rootMineScan(index){const cell=$('#mines-board')?.children[index];if(mineZoom)cell?.scrollIntoView({block:'nearest',inline:'nearest',behavior:'instant'});}
 function flagMine(index){
  if(!mineCanPlay()||!Number.isInteger(index)||index<0||index>=mines.size**2||mines.open.includes(index))return;
  tickMines();if(!mineCanPlay())return;
  if(mines.day&&!mines.started){mineMessage='日替わりは中央の＋を開いてから旗を置けます。';renderMines();return;}
  const removing=mines.flags.includes(index);
  if(!removing&&mines.flags.length>=mines.count){mineMessage='旗は鉱石の数まで置けます。不要な旗を外してください。';renderMines();return;}
  mines.flags=removing?mines.flags.filter(i=>i!==index):[...mines.flags,index];mines.moves++;mineHint=-1;
  mineMessage=removing?'旗を外しました。':'旗を立てました。旗の正しさはクリア時まで確定しません。';
  saveMines();renderMines();mineTone('flag');
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
   const start=!!m.day&&!m.started&&i===mineStart(),signature=`${isOpen}/${flag}/${bomb}/${n}/${wrong}/${start}`;
   if(cell.dataset.state!==signature){
    cell.querySelector('.mine-face').innerHTML=bomb?mineGem:wrong?'<span class="mine-wrong">×</span>':flag?mineFlagArt:isOpen&&n?String(n):start?'+':'';
    cell.dataset.state=signature;
   }
   for(const [name,active] of Object.entries({open:isOpen,flag,bomb,hit:m.hit===i,wrong,start,hint:mineHint===i}))cell.classList.toggle(name,active);
   cell.dataset.near=n;cell.tabIndex=i===mineFocus?0:-1;
   cell.setAttribute('aria-label',`${Math.floor(i/m.size)+1}行${i%m.size+1}列 ${bomb?'鉱石':wrong?'誤った旗':isOpen?`開封済み・周囲の鉱石${n}個`:flag?'旗・未開封':'未開封'}${mineHint===i?'・スキャン済み':''}${start?'・日替わりスタート地点':''}`);
   if(fresh.has(i)){
    const distance=Math.abs(i%m.size-origin%m.size)+Math.abs(Math.floor(i/m.size)-Math.floor(origin/m.size));
    cell.style.setProperty('--reveal-delay',`${Math.min(280,distance*24)}ms`);cell.classList.add('revealing');
   }
  }
  scene.dataset.paused=String(m.paused);scene.dataset.result=m.over?(m.won?'won':'lost'):'';
  scene.dataset.lite=String(mineLite);scene.dataset.zoom=String(mineZoom);scene.dataset.theme=mineTheme;
  root.inert=m.paused;root.setAttribute('aria-hidden',String(m.paused));
  $('#mines-pause-cover').hidden=!m.paused;
  $('#mines-left').textContent=m.count-m.flags.length;$('#mines-time').textContent=mineTime(m.elapsed);
  const best=mineBest();
  $('#mines-best').textContent=best?mineTime(best):'—';$('#mines-best-label').textContent=(m.day?'日替わり・':'')+(m.hintsUsed?'アシスト':'最短記録');
  const total=m.size**2-m.count,percent=Math.round(m.open.length/total*100);
  $('#mines-progress').value=m.open.length;$('#mines-progress').max=total;
  $('#mines-progress-label').textContent=`探索 ${m.open.length} / ${total} · ${percent}%`;
  $('#mines-status').textContent=m.paused?'一時停止中':m.over?(m.won?'FIELD COMPLETE · クリア':'EXPLORATION OVER · 探索終了'):mineMode==='flag'?'旗モード · タップで旗を切替':'探索モード · タップで開く';
  $('#mines-message').textContent=mineMessage||'数字は周囲8マスの鉱石の数を表します。';
  $('#mines-result').hidden=!m.over;
  $('#mines-result-copy').textContent=m.over?`${mineLabels[m.difficulty]} / ${mineTime(m.elapsed)} / ${m.moves}手 / ${m.hintsUsed?'アシスト '+m.hintsUsed+'回':'ノーヒント'}${m.day?' / 日替わり '+m.day:m.won?' / フリー累計 '+mineNumber(A.load('minesWins',0))+'勝':''}`:'';
  $('#mine-flag').classList.toggle('active',mineMode==='flag');$('#mine-flag').setAttribute('aria-pressed',String(mineMode==='flag'));
  $('#mine-flag').disabled=m.paused||m.over;
  $('#mine-pause').textContent=m.paused?'再開':'一時停止';$('#mine-pause').disabled=!m.started||m.over;
  $('#mine-hint').textContent=`安全スキャン ${3-m.hintsUsed}/3`;$('#mine-hint').disabled=m.paused||m.over||m.hintsUsed>=3;
  $('#mine-zoom').setAttribute('aria-pressed',String(mineZoom));$('#mine-zoom').textContent=mineZoom?'全体表示':'盤面を拡大';
  $('#mine-quality').setAttribute('aria-pressed',String(mineLite));$('#mine-quality').textContent=mineLite?'軽量描画':'高精細描画';
  $('#mine-sound').setAttribute('aria-pressed',String(mineSound));$('#mine-sound').textContent=mineSound?'効果音 ON':'効果音 OFF';
  $('#mine-theme').textContent='結晶色：'+mineThemes[mineTheme];
  $('#mine-theme').setAttribute('aria-label',`結晶色：${mineThemes[mineTheme]}。押すと次の色に切り替え`);
  $('#mine-quality').setAttribute('aria-label',`${mineLite?'軽量':'高精細'}描画。押すと${mineLite?'高精細':'軽量'}に切り替え`);
  $('#mine-daily').setAttribute('aria-pressed',String(!!m.day));$('#mine-free').setAttribute('aria-pressed',String(!m.day));
  $('#mines-mode-label').textContent=m.day?`DAILY · ${m.day} · 同じ鉱脈を何度でも`:'FREE EXPLORE · 毎回、新しい鉱脈';
  A.$$('[data-action="mineDifficulty"]').forEach(el=>{el.classList.toggle('active',el.dataset.value===m.difficulty);el.setAttribute('aria-pressed',String(el.dataset.value===m.difficulty));});
 }
 function minesApp(){
  if(!mines&&!restoreMines(A.load('minesState',null)))resetMines();
  mineHint=-1;mineClock=performance.now();
  shell('Crystal Field','aqua',`
   <section class="crystal-game" id="mines-scene" aria-label="クリスタルフィールド">
    <header class="crystal-hero"><div><small>CRYSTAL FIELD</small><h1>光の鉱脈を、探そう。</h1><p>数字を読み、結晶を避けて進む探索パズル</p></div><div class="crystal-emblem" aria-hidden="true">${mineGem}</div></header>
    <div class="crystal-modes"><button id="mine-free" data-action="mineFree" aria-pressed="true">フリー探索</button><button id="mine-daily" data-action="mineDaily" aria-pressed="false">今日の鉱脈</button></div><p class="crystal-mode-label" id="mines-mode-label"></p>
    <div class="arc-difficulty crystal-difficulty" aria-label="難易度">${Object.entries(mineDifficulties).map(([id,[size,count]])=>`<button data-action="mineDifficulty" data-value="${id}">${mineLabels[id]}<small>${size}×${size} · 鉱石${count}</small></button>`).join('')}</div>
    <div class="arc-scorebar crystal-scores">${score('残りの旗',0,'mines-left')}${score('探索時間','00:00','mines-time')}<div><small id="mines-best-label">最短記録</small><strong id="mines-best">—</strong></div></div>
    <div class="crystal-progress"><span id="mines-progress-label"></span><progress id="mines-progress" aria-label="安全マスの探索進捗" max="1" value="0"></progress></div>
    <div class="mines-shell"><div class="mines-scroll" id="mines-scroll"><div id="mines-board" class="mines-board" role="group" aria-label="探索盤面。矢印キーで移動、Enterで操作、Fで旗" aria-describedby="mines-controls-help"></div></div><div id="mines-pause-cover" class="crystal-pause" hidden><strong>ひと息、つこう。</strong><p>盤面とタイマーを一時停止しています</p><button data-action="minePause">探索を再開</button></div><div class="crystal-sparkles" aria-hidden="true"><i></i><i></i><i></i><i></i><i></i><i></i></div></div>
    <div id="mines-status" class="crystal-status" role="status" aria-live="polite"></div>
    <p id="mines-message" class="crystal-message" aria-live="polite"></p>
    <div id="mines-result" class="crystal-result" hidden><strong>探索レポート</strong><p id="mines-result-copy"></p><button data-action="mineRestart">新しい鉱脈へ</button></div>
    <div class="crystal-controls"><button data-action="mineFlag" id="mine-flag" aria-pressed="false">旗モード</button><button data-action="mineHint" id="mine-hint">安全スキャン 3/3</button><button data-action="minePause" id="mine-pause">一時停止</button></div>
    <div class="crystal-tools"><button data-action="mineZoom" id="mine-zoom" aria-pressed="false">盤面を拡大</button><button data-action="mineQuality" id="mine-quality" aria-pressed="false">高精細描画</button><button data-action="mineRecords">成績</button><button data-action="mineRestart">新しい盤面</button></div>
    <div class="crystal-preferences"><button data-action="mineTheme" id="mine-theme">結晶色：アクア</button><button data-action="mineSound" id="mine-sound" aria-pressed="false">効果音 OFF</button></div>
    <p class="crystal-help" id="mines-controls-help">タップで探索 · 長押し / 右クリックで旗<br>PC：矢印で移動 · Enter / Spaceで操作 · Fで旗 · Pで一時停止<br>旗を数字と同じ数だけ置き、数字をタップすると周囲を一括探索。</p>
   </section>`,iconButton('mineHelp','遊び方','document'));
  renderMines();
  const root=$('#mines-board');let hold=null,gesture=null,suppressIndex=-1,suppressUntil=0;
  const cancelHold=()=>{clearTimeout(hold);hold=null;gesture=null;if(suppressUntil===Infinity)suppressUntil=performance.now()+1000;};
  on(root,'pointerdown',e=>{
   cancelHold();suppressUntil=0;
   const cell=e.target.closest('[data-index]');if(!cell||e.button!==0||!e.isPrimary||!mineCanPlay())return;
   mineFocus=Number(cell.dataset.index);
   gesture={id:e.pointerId,x:e.clientX,y:e.clientY,index:mineFocus};
   if(e.pointerType==='mouse')return;
   hold=setTimeout(()=>{
    if(!gesture||!mineCanPlay())return;
    suppressIndex=gesture.index;suppressUntil=Infinity;flagMine(gesture.index);A.haptic();hold=null;
   },440);
  });
  on(root,'pointermove',e=>{if(gesture&&(Math.abs(e.clientX-gesture.x)>10||Math.abs(e.clientY-gesture.y)>10))cancelHold();});
  on(window,'pointerup',cancelHold);on(window,'pointercancel',cancelHold);on($('#mines-scroll'),'scroll',cancelHold,{passive:true});
  on(root,'click',e=>{const cell=e.target.closest('[data-index]');if(cell&&Number(cell.dataset.index)===suppressIndex&&performance.now()<suppressUntil){e.preventDefault();e.stopPropagation();}},true);
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
  disposers.push(()=>{cancelHold();overlays.disconnect();closeMineAudio();tickMines();if(mines.started&&!mines.over)mines.paused=true;saveMines();});
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
  if(!mines.started){mineMessage=mines.day?'まず中央の＋マスから開始してください。':'まず好きなマスを開いてください。初手と周囲は安全です。';renderMines();return;}
  tickMines();if(!mineCanPlay())return;
  const candidates=Array.from({length:mines.size**2},(_,i)=>i).filter(i=>!mines.open.includes(i)&&!mines.flags.includes(i)&&!mines.bombs.includes(i));
  if(!candidates.length){mineMessage='安全な未開封マスに旗が残っています。旗を見直してください。';renderMines();return;}
  const index=candidates.find(i=>neighbors(i,mines.size).some(n=>mines.open.includes(n)))??candidates[0];
  // Charge assistance before revealing any information; never preview a free safe cell.
  mines.hintsUsed++;revealMine(index,true);
 };
 A.actions.mineZoom=()=>{mineZoom=!mineZoom;saveMinePrefs();renderMines();};
 A.actions.mineQuality=()=>{mineLite=!mineLite;saveMinePrefs();renderMines();};
 A.actions.mineTheme=()=>{const themes=Object.keys(mineThemes);mineTheme=themes[(themes.indexOf(mineTheme)+1)%themes.length];saveMinePrefs();renderMines();};
 A.actions.mineSound=()=>{mineSound=!mineSound;if(!mineSound)closeMineAudio();saveMinePrefs();renderMines();if(mineSound)mineTone('scan');};
 A.actions.mineDaily=()=>A.confirm('今日の鉱脈に挑戦？','現在の盤面を置き換えます。端末の日付と難易度で決まる同じ盤面に、中央から挑戦。記録はフリー探索と別に保存します。',()=>{resetMines(mines.difficulty,mineDay());saveMines();open('mines');});
 A.actions.mineFree=()=>{if(!mines.day)return;A.confirm('フリー探索へ戻る？','日替わりの盤面を置き換え、ランダムな新しい鉱脈を探索します。',()=>{resetMines(mines.difficulty);saveMines();open('mines');});};
 A.actions.mineRestart=()=>A.confirm(mines.day?'この日の鉱脈に再挑戦？':'新しい鉱脈を探索？',mines.day?'同じ日・難易度の盤面を最初から探索します。保存済みの成績は残ります。':'現在の盤面は置き換わります。勝利数と最短記録は残ります。',()=>{const d=mines.difficulty,day=mines.day;resetMines(d,day);saveMines();open('mines');});
 A.actions.mineDifficulty=el=>{const difficulty=el.dataset.value;if(!Object.hasOwn(mineDifficulties,difficulty)||difficulty===mines.difficulty)return;A.confirm('難易度を変更？','現在の盤面を置き換えて、新しい探索を始めます。',()=>{resetMines(difficulty,mines.day);saveMines();open('mines');});};
 A.actions.mineRecords=()=>{
  const stored=A.load('minesHistory',[]),history=(Array.isArray(stored)?stored:[]).filter(r=>r&&Object.hasOwn(mineDifficulties,r.difficulty)&&typeof r.won==='boolean').slice(0,30);
  help('Crystal Field · 成績',`<p>フリー探索の累計 ${mineNumber(A.load('minesWins',0))}勝</p><h3>難易度別の最短記録</h3>${Object.keys(mineDifficulties).map(id=>{const best=mineNumber(A.load('minesBest-'+id,0)),assisted=mineNumber(A.load('minesAssistedBest-'+id,0));return `<p>${mineLabels[id]}：${best?mineTime(best):'未記録'}<br>アシスト：${assisted?mineTime(assisted):'未記録'}</p>`;}).join('')}<h3>日替わりクリア（最大90件）</h3><p>フリーとは別記録。同じ日・難易度の再クリアは1件にまとめます。</p>${mineDailyRecords().map(r=>`<p>${esc(r.day)} · ${mineLabels[r.difficulty]}<br>ノーヒント ${r.best?mineTime(r.best):'未記録'} / アシスト ${r.assistedBest?mineTime(r.assistedBest):'未記録'}</p>`).join('')||'<p>まだクリアはありません。</p>'}<h3>最近の探索（最大30件）</h3><p>完了した探索のみ。途中で作り直した盤面は含みません。</p>${history.map(r=>`<p>${esc(typeof r.date==='string'?r.date.slice(0,10):'')} · ${mineLabels[r.difficulty]} · ${r.day?'日替わり':'フリー'} · ${r.won?'クリア':'探索終了'}<br>${mineTime(mineNumber(r.seconds))} / ${mineNumber(r.moves)}手 / ${mineNumber(r.hints)?'アシスト':'ノーヒント'}</p>`).join('')||'<p>まだ記録はありません。</p>'}`);
 };
 A.actions.mineHelp=()=>help('Crystal Field · 遊び方','<p>鉱石を避け、すべての安全なマスを開けばクリア。数字は周囲8マスの鉱石の数です。初手とその周囲は必ず安全です。</p><p>タップで探索。旗モード、長押し（約0.44秒）、右クリック、Fキーで旗を切り替えます。数字の周囲に同じ数の旗があれば、数字をタップして一括探索。間違った旗があると鉱石を開く場合があります。</p><p>安全スキャンは1探索3回まで、安全なマスを1つ開きます。使用したクリアはアシスト最短に記録し、通常の最短記録を更新しません。推測が必要な盤面もあります。</p><p>矢印キーで移動、Enter / Spaceで現在のモードの操作、Pで一時停止。拡大表示では盤面をスクロールできます。時間はプレイ中のみ計測。別画面・タブ・ダイアログへ移ると一時停止し、戻ったら手動で再開します。</p><p>「今日の鉱脈」は端末の日付と難易度から生成。中央の＋マスから開始します。同じ日の再挑戦は同じ盤面で、フリーの勝利数・最短には加算しません。日付が変わっても途中の盤面は維持します。今日の鉱脈を押すと当日分へ切り替えられます。</p><p>結晶色はアクア・アメジスト・アンバーを切替。効果音は初期OFFで、auraのサウンド設定と音量に従います。</p><p>盤面・経過時間・旗・スキャン残数を端末内に自動保存。高精細描画ボタンで軽量描画に切替。OSとauraの「動きを減らす」に対応します。</p>');

 // Reversi Atelier. The same pure rules/search run in a Worker or cooperative fallback.
 function createReversiEngine(){
  const directions=[[-1,-1],[0,-1],[1,-1],[-1,0],[1,0],[-1,1],[0,1],[1,1]];
  const corners=[0,7,56,63];
  const weights=[100,-24,12,5,5,12,-24,100,-24,-38,-4,-3,-3,-4,-38,-24,12,-4,8,2,2,8,-4,12,5,-3,2,1,1,2,-3,5,5,-3,2,1,1,2,-3,5,12,-4,8,2,2,8,-4,12,-24,-38,-4,-3,-3,-4,-38,-24,100,-24,12,5,5,12,-24,100];
  const adjacent=Array.from({length:64},(_,i)=>directions.map(([dx,dy])=>[i%8+dx,(i/8|0)+dy]).filter(([x,y])=>x>=0&&x<8&&y>=0&&y<8).map(([x,y])=>y*8+x));
  function flips(board,index,color){
   if(!Number.isInteger(index)||index<0||index>63||board[index]||![1,2].includes(color))return [];
   const out=[],x=index%8,y=index/8|0;
   for(const [dx,dy] of directions){let nx=x+dx,ny=y+dy;const line=[];
    while(nx>=0&&nx<8&&ny>=0&&ny<8&&board[ny*8+nx]===3-color){line.push(ny*8+nx);nx+=dx;ny+=dy;}
    if(line.length&&nx>=0&&nx<8&&ny>=0&&ny<8&&board[ny*8+nx]===color)out.push(...line);
   }return out;
  }
  function moves(board,color){const out=[];for(let i=0;i<64;i++)if(!board[i]&&flips(board,i,color).length)out.push(i);return out;}
  function placed(board,index,color){const out=board.slice();out[index]=color;for(const i of flips(board,index,color))out[i]=color;return out;}
  function stableEdges(board,color){
   const stable=new Set();
   for(const c of corners){if(board[c]!==color)continue;stable.add(c);
    for(const step of [c%8===0?1:-1,c<8?8:-8])for(let n=1;n<8;n++){const i=c+step*n;if(board[i]!==color)break;stable.add(i);}
   }return stable.size;
  }
  function evaluate(board,color){
   let positional=0,discs=0,frontier=0,potential=0,empty=0,cornerScore=0;
   for(let i=0;i<64;i++){
    const v=board[i];if(!v){empty++;potential+=Number(adjacent[i].some(n=>board[n]===3-color))-Number(adjacent[i].some(n=>board[n]===color));continue;}
    const sign=v===color?1:-1;discs+=sign;let weight=weights[i];
    // C/X squares cease to be poison after their corner is secured.
    for(const c of corners)if(board[c]&&Math.abs(i%8-c%8)<=1&&Math.abs((i/8|0)-(c/8|0))<=1&&i!==c)weight=8;
    positional+=sign*weight;if(adjacent[i].some(n=>!board[n]))frontier+=sign;
   }
   for(const c of corners)cornerScore+=board[c]===color?1:board[c]===3-color?-1:0;
   const mobility=moves(board,color).length-moves(board,3-color).length;
   return positional+cornerScore*100+mobility*(empty>20?18:10)+potential*4-frontier*(empty>16?9:3)
    +(stableEdges(board,color)-stableEdges(board,3-color))*24+discs*(empty<14?12:empty<30?2:-1);
  }
  const levels={easy:{depth:2,ms:120},normal:{depth:4,ms:400},hard:{depth:7,ms:950},expert:{depth:12,ms:1800}};
  function* search(board,color,level='normal'){
   const config=levels[level]||levels.normal,deadline=performance.now()+config.ms,table=new Map(),timeout={};
   const history=new Int32Array(192),killers=new Map();
   const legal=moves(board,color),empty=board.filter(v=>!v).length;
   let nodes=0,best={index:legal[0]??null,score:0,depth:0,nodes:0,solved:false};
   if(!legal.length)return best;
   function order(b,list,pv,side=color,depth=0){
    return list.map(index=>{
     let weight=weights[index];
     for(const c of corners)if(b[c]&&index!==c&&Math.abs(index%8-c%8)<=1&&Math.abs((index/8|0)-(c/8|0))<=1)weight=8;
     const killer=killers.get(depth)||[];
     return {index,rank:(index===pv?10000:0)+(corners.includes(index)?2000:0)+weight*8+(killer.includes(index)?400:0)+Math.min(300,history[side*64+index])};
    }).sort((a,z)=>z.rank-a.rank).map(item=>item.index);
   }
   function variation(index,depth){
    const line=[];let b=board,side=color,left=depth,next=index;
    while(left>0&&line.length<16){
     const legal=moves(b,side);
     if(!legal.length){if(!moves(b,3-side).length)break;line.push({color:side,index:-1});side=3-side;next=table.get(b.join('')+side)?.index;continue;}
     if(!legal.includes(next))break;
     line.push({color:side,index:next});b=placed(b,next,side);left--;side=3-side;next=table.get(b.join('')+side)?.index;
    }return line;
   }
   function* negamax(b,side,depth,alpha,beta){
    nodes++;if((nodes&31)===0){yield null;if(performance.now()>=deadline)throw timeout;}
    const key=b.join('')+side,entry=table.get(key),a0=alpha,b0=beta;
    if(entry&&entry.depth>=depth){if(entry.flag===0)return entry.value;if(entry.flag===1)alpha=Math.max(alpha,entry.value);else beta=Math.min(beta,entry.value);if(alpha>=beta)return entry.value;}
    const available=moves(b,side);
    if(!available.length){
     if(!moves(b,3-side).length){const diff=b.reduce((n,v)=>n+(v===side?1:v===3-side?-1:0),0);return diff===0?0:Math.sign(diff)*100000+diff*100;}
     // A pass is not a placement and must not consume search depth.
     return -(yield* negamax(b,3-side,depth,-beta,-alpha));
    }
    if(depth===0)return evaluate(b,side);
    let value=-Infinity,chosen=available[0],first=true;
    for(const index of order(b,available,entry?.index,side,depth)){
     const child=placed(b,index,side);let score;
     // Principal variation search: scout later moves, then fully re-search improvements.
     if(first||depth<3)score=-(yield* negamax(child,3-side,depth-1,-beta,-alpha));
     else{score=-(yield* negamax(child,3-side,depth-1,-alpha-1,-alpha));if(score>alpha&&score<beta)score=-(yield* negamax(child,3-side,depth-1,-beta,-alpha));}
     first=false;if(score>value){value=score;chosen=index;}alpha=Math.max(alpha,score);
     if(alpha>=beta){history[side*64+index]=Math.min(4096,history[side*64+index]+depth*depth);killers.set(depth,[index,...(killers.get(depth)||[]).filter(i=>i!==index)].slice(0,2));break;}
    }
    if(table.size<30000)table.set(key,{depth,value,index:chosen,flag:value<=a0?2:value>=b0?1:0});
    return value;
   }
   best.index=order(board,legal)[0];
   const maxDepth=(level==='hard'||level==='expert')&&empty<=12?empty:Math.min(empty,config.depth);
   for(let depth=1;depth<=maxDepth;depth++){
    let value=-Infinity,chosen=best.index;
    try{
     for(const index of order(board,legal.slice(),best.index)){
      if(performance.now()>=deadline)throw timeout;
      const score=-(yield* negamax(placed(board,index,color),3-color,depth-1,-Infinity,-value));
      if(score>value){value=score;chosen=index;}
     }
     best={index:chosen,score:value,depth,nodes,solved:depth>=empty,line:variation(chosen,depth)};
     yield {...best};if(best.solved)break;
    }catch(error){if(error!==timeout)throw error;break;}
   }
   return {...best,nodes};
  }
  return {flips,moves,placed,evaluate,search};
 }
 const rvEngine=createReversiEngine();
 const rvLevels={easy:'入門',normal:'標準',hard:'上級',expert:'達人'};
 const rvColor=n=>n===1?'黒':'白';
 const rvCoordinate=i=>'ABCDEFGH'[i%8]+((i/8|0)+1);
 const rvBoardValid=b=>Array.isArray(b)&&b.length===64&&b.every(v=>v===0||v===1||v===2)&&b.filter(Boolean).length>=4;
 let reversi=null,rvBusy=false,rvAnimating=false,rvReview=-1,rvHint=-1,rvPreview=-1,rvFocus=19,rvSearchCancel=null,rvInfo='',rvCoach='',rvSaveOK=true,rvTimers=new Set();
 const rvReduced=()=>A.settings.reduceMotion||window.matchMedia('(prefers-reduced-motion: reduce)').matches;
 const rvLater=(fn,ms)=>{const timer=setTimeout(()=>{rvTimers.delete(timer);fn();},ms);rvTimers.add(timer);return timer;};
 function rvCancel(){rvSearchCancel?.();rvSearchCancel=null;for(const timer of rvTimers)clearTimeout(timer);rvTimers.clear();rvBusy=false;rvAnimating=false;rvHint=-1;rvPreview=-1;rvCoach='';}
 function rvSnapshot(r){return {board:r.board.slice(),turn:r.turn,over:r.over,pass:r.pass,last:r.last,mover:r.mover,flipped:r.flipped};}
 function rvSetTurn(r,turn){
  r.turn=turn;r.pass=0;r.over=false;
  if(!rvEngine.moves(r.board,turn).length){if(rvEngine.moves(r.board,3-turn).length){r.pass=turn;r.turn=3-turn;}else r.over=true;}
 }
 function freshReversi(options={}){
  const board=Array(64).fill(0);board[27]=board[36]=2;board[28]=board[35]=1;
  reversi={version:2,id:Date.now().toString(36)+'-'+Math.random().toString(36).slice(2,10),board,turn:1,mode:options.mode==='local'?'local':'cpu',level:Object.hasOwn(rvLevels,options.level)?options.level:'normal',human:options.human===2?2:1,showLegal:options.showLegal!==false,theme:options.theme==='midnight'?'midnight':'jade',paused:false,over:false,counted:false,assisted:false,pass:0,last:-1,mover:0,flipped:0};
  reversi.frames=[rvSnapshot(reversi)];rvReview=-1;rvInfo='';rvFocus=19;
 }
 function rvRestore(){
  const saved=A.load('reversiState',null);
  if(!saved||!rvBoardValid(saved.board)||![1,2].includes(saved.turn)){freshReversi();if(saved)A.toast('保存された盤面を読めないため、新しい対局を開始');return;}
  freshReversi(saved);const r=reversi;
  r.board=saved.board.slice();rvSetTurn(r,saved.turn);
  r.id=typeof saved.id==='string'&&/^[a-z0-9-]{1,60}$/.test(saved.id)?saved.id:r.id;
  r.counted=r.over&&(saved.counted===true||saved.version!==2);r.assisted=saved.assisted===true;r.paused=saved.paused===true;
  r.last=Number.isInteger(saved.last)&&saved.last>=0&&saved.last<64&&r.board[saved.last]?saved.last:-1;
  r.mover=[1,2].includes(saved.mover)?saved.mover:0;r.flipped=Number.isInteger(saved.flipped)?Math.max(0,Math.min(63,saved.flipped)):0;
  // Only accept a bounded, replayable timeline; malformed history never drives undo.
  const frames=[];
  if(Array.isArray(saved.frames)&&saved.frames.length<=61){
   for(const f of saved.frames){
    if(!f||!rvBoardValid(f.board)||![1,2].includes(f.turn))break;
    const clean={board:f.board.slice(),last:-1,mover:0,flipped:0};rvSetTurn(clean,f.turn);
    if(frames.length){const prev=frames.at(-1),i=f.last;
     if(prev.over||!rvEngine.flips(prev.board,i,prev.turn).length)break;
     const next=rvEngine.placed(prev.board,i,prev.turn);if(next.some((v,j)=>v!==f.board[j]))break;
     rvSetTurn(clean,3-prev.turn);if(clean.turn!==f.turn)break;
     clean.last=i;clean.mover=prev.turn;clean.flipped=rvEngine.flips(prev.board,i,prev.turn).length;
    }
    frames.push(clean);
   }
  }
  if(frames.length===saved.frames?.length&&frames.length&&frames.at(-1).board.every((v,i)=>v===r.board[i])&&frames.at(-1).turn===r.turn){r.frames=frames;Object.assign(r,rvSnapshot(frames.at(-1)));}
  else r.frames=[rvSnapshot(r)];
 }
 function rvSave(){
  rvSaveOK=A.save('reversiState',reversi);const el=$('#reversi-save');
  if(el){el.textContent=rvSaveOK?'この端末に保存済み':'保存できませんでした。棋譜を書き出して保管してください';el.classList.toggle('save-failed',!rvSaveOK);}
  return rvSaveOK;
 }
 function rvStats(){
  const s=A.load('reversiStats',{}),n=v=>Number.isSafeInteger(v)&&v>=0?v:0;
  return {wins:n(s?.wins),losses:n(s?.losses),draws:n(s?.draws),legacyWins:n(s?.legacyWins??A.load('reversiWins',0)),ids:Array.isArray(s?.ids)?s.ids.filter(id=>typeof id==='string').slice(-100):[]};
 }
 function rvRecord(){
  const r=reversi;if(!r.over||r.counted)return;
  if(r.mode==='local'){r.counted=true;return;}
  const stats=rvStats();
  if(!stats.ids.includes(r.id)){
   const diff=r.board.filter(v=>v===r.human).length-r.board.filter(v=>v===3-r.human).length;
   stats[diff>0?'wins':diff<0?'losses':'draws']++;if(diff>0)stats.legacyWins++;
   stats.ids=[...stats.ids,r.id].slice(-100);if(!A.save('reversiStats',stats))return;
  }
  A.save('reversiWins',stats.legacyWins);r.counted=true;
 }
 function rvUndoIndex(){
  if(!reversi||reversi.over)return -1;
  for(let i=reversi.frames.length-2;i>=0;i--)if(reversi.mode==='local'||reversi.frames[i].turn===reversi.human)return i;
  return -1;
 }
 function rvCanPlay(){return current==='reversi'&&$('#overlay').hidden&&!rvBusy&&!rvAnimating&&rvReview<0&&!reversi.over&&!reversi.paused&&!document.hidden&&(reversi.mode==='local'||reversi.turn===reversi.human);}
 function rvCanAnalyze(){
  const view=rvReview>=0?reversi.frames[rvReview]:reversi;
  return !rvBusy&&!rvAnimating&&!view.over&&!document.hidden&&$('#overlay').hidden&&(rvReview>=0||rvCanPlay());
 }
 function rvSearch(board,turn,level,done){
  rvSearchCancel?.();let worker=null,url=null,halted=false,fallingBack=false,watchdog=0;
  const disposeWorker=()=>{if(worker){worker.onmessage=null;worker.onerror=null;worker.terminate();worker=null;}if(url){URL.revokeObjectURL(url);url=null;}};
  const complete=result=>{if(halted)return;halted=true;disposeWorker();clearTimeout(watchdog);rvTimers.delete(watchdog);rvSearchCancel=null;done(result);};
  rvSearchCancel=()=>{halted=true;disposeWorker();clearTimeout(watchdog);rvTimers.delete(watchdog);};
  const progress=result=>{if(result?.depth){rvInfo=`${result.depth}手先まで探索 · ${number(result.nodes)}局面`;const el=$('#reversi-engine');if(el)el.textContent=rvInfo;}};
  const fallback=()=>{
   if(halted||fallingBack)return;fallingBack=true;disposeWorker();clearTimeout(watchdog);rvTimers.delete(watchdog);
   const iterator=rvEngine.search(board,turn,level);
   const slice=()=>{if(halted)return;try{const until=performance.now()+7;let next;do{next=iterator.next();if(next.done){complete(next.value);return;}progress(next.value);}while(performance.now()<until);rvLater(slice,0);}catch{complete({index:rvEngine.moves(board,turn)[0]??null,depth:0,nodes:0,solved:false,fallback:true});}};
   rvLater(slice,0);
  };
  try{
   const source=`'use strict';const engine=(${createReversiEngine.toString()})();onmessage=({data})=>{try{const it=engine.search(data.board,data.turn,data.level);let next;do{next=it.next();if(!next.done&&next.value)postMessage({progress:next.value});}while(!next.done);postMessage({result:next.value});}catch{postMessage({error:true});}};`;
   url=URL.createObjectURL(new Blob([source],{type:'text/javascript'}));worker=new Worker(url);
   worker.onmessage=({data})=>{if(halted||fallingBack)return;if(data.error)fallback();else if(data.result)complete(data.result);else progress(data.progress);};
   worker.onerror=e=>{e.preventDefault();fallback();};worker.postMessage({board,turn,level});watchdog=rvLater(fallback,5000);
  }catch{fallback();}
 }
 function rvWaitForBoard(fn){if(document.hidden||!$('#overlay').hidden){rvLater(()=>rvWaitForBoard(fn),160);return;}fn();}
 function scheduleAI(){
  const r=reversi;if(current!=='reversi'||document.hidden||rvReview>=0||rvAnimating||rvBusy||r.paused||r.over||r.mode!=='cpu'||r.turn===r.human)return;
  rvBusy=true;rvInfo='候補を比較しています';renderReversi();
  rvLater(()=>rvWaitForBoard(()=>{
   rvSearch(r.board.slice(),r.turn,r.level,result=>rvWaitForBoard(()=>{
    rvBusy=false;rvInfo=result.fallback?'簡易思考に切り替えました':`${result.solved?'終局まで読了':result.depth+'手先まで探索'} · ${number(result.nodes)}局面`;
    const legal=rvEngine.moves(r.board,r.turn),index=legal.includes(result.index)?result.index:legal[0];
    if(index!==undefined)rvMove(index);else{rvSetTurn(r,r.turn);rvRecord();rvSave();renderReversi();}
   }));
  }),120);
 }
 function rvMove(index){
  const r=reversi,captured=rvEngine.flips(r.board,index,r.turn);if(!captured.length||r.over)return;
  const before=r.board.slice(),mover=r.turn;r.board=rvEngine.placed(r.board,index,mover);r.last=index;r.mover=mover;r.flipped=captured.length;
  rvHint=-1;rvPreview=-1;rvCoach='';rvSetTurn(r,3-mover);r.frames.push(rvSnapshot(r));rvRecord();rvSave();
  rvAnimating=!rvReduced();renderReversi(before);A.haptic();
  if(rvAnimating)rvLater(()=>{rvAnimating=false;renderReversi();scheduleAI();},600);else scheduleAI();
 }
 function rvPreviewAt(index){
  rvPreview=rvCanPlay()&&reversi.showLegal?index:-1;
  const list=rvEngine.flips(reversi.board,rvPreview,reversi.turn),root=$('#reversi-board');if(!root)return;
  [...root.children].forEach((cell,i)=>cell.classList.toggle('rv-preview',list.includes(i)));
  $('#reversi-preview').textContent=list.length?`${rvCoordinate(index)} · ${list.length}枚を裏返せます`:'座標を選んで着手。矢印キーでも移動できます';
 }
 function renderReversi(before=null){
  const root=$('#reversi-board');if(!root)return;
  const r=reversi,view=rvReview>=0?r.frames[rvReview]:r,legal=rvEngine.moves(view.board,view.turn),canPlay=rvCanPlay(),animate=before&&!rvReduced();
  $('.rv-studio').dataset.theme=r.theme;
  root.classList.toggle('rv-instant',!animate);root.setAttribute('aria-busy',String(rvBusy));
  const preview=rvPreview>=0&&canPlay?rvEngine.flips(view.board,rvPreview,view.turn):[];
  $('#reversi-preview').textContent=preview.length?`${rvCoordinate(rvPreview)} · ${preview.length}枚を裏返せます`:'座標を選んで着手。矢印キーでも移動できます';
  [...root.children].forEach((cell,i)=>{
   const v=view.board[i],was=before?.[i],isLegal=canPlay&&legal.includes(i),disc=cell.querySelector('.reversi-disc');
   cell.dataset.value=v;cell.classList.toggle('rv-legal',isLegal&&r.showLegal);cell.classList.toggle('rv-last',view.last===i);cell.classList.toggle('rv-best',rvHint===i);cell.classList.toggle('rv-preview',preview.includes(i));
   cell.classList.toggle('rv-new',!!animate&&!was&&!!v);cell.classList.toggle('rv-turning',!!animate&&!!was&&was!==v);
   const distance=r.last<0?0:Math.max(Math.abs(i%8-r.last%8),Math.abs((i/8|0)-(r.last/8|0)));
   disc.style.transitionDelay=animate&&was&&was!==v?`${distance*24}ms`:'0ms';
   disc.style.transform=v===2?'rotateY(180deg)':'rotateY(0deg)';
   cell.querySelector('.rv-flip-count').textContent=(isLegal&&r.showLegal)||rvHint===i?rvEngine.flips(view.board,i,view.turn).length:'';
   cell.setAttribute('aria-disabled',String(!isLegal));cell.tabIndex=i===rvFocus?0:-1;
   cell.setAttribute('aria-label',`${rvCoordinate(i)} ${v?rvColor(v):isLegal?'着手可能、'+rvEngine.flips(view.board,i,view.turn).length+'枚返せます':'空'}${view.last===i?'、直前の着手':''}${rvHint===i?'、推奨手':''}`);
  });
  const black=view.board.filter(v=>v===1).length,white=view.board.filter(v=>v===2).length;
  $('#reversi-black').textContent=black;$('#reversi-white').textContent=white;
  $('#reversi-balance-black').style.width=`${black/(black+white)*100}%`;
  $('#reversi-balance').setAttribute('aria-label',`石数 黒${black}、白${white}。勝率ではありません`);
  for(const c of [1,2])$(`#reversi-player-${c}`).classList.toggle('active',!view.over&&view.turn===c);
  const phase=view.over?'終局':64-black-white>44?'序盤':64-black-white>16?'中盤':'終盤';
  $('#reversi-phase').textContent=`${phase} · 残り${64-black-white}マス`;
  $('#reversi-legal').textContent=view.over?'対局終了':`合法手 ${legal.length}`;
  $('#reversi-status').textContent=rvReview>=0?`棋譜 ${rvReview} / ${r.frames.length-1}${rvBusy?' · 分析中':''}`:r.paused&&!r.over?'一時停止中 · 再開で続きから':view.over?(black===white?'引き分け':`${black>white?'黒':'白'}の勝ち · ${Math.abs(black-white)}枚差`):`${view.pass?rvColor(view.pass)+'は置けずパス · ':''}${rvColor(view.turn)}${rvBusy?'が思考中':rvAnimating?'の番へ':'の番'}`;
  $('#reversi-status').classList.toggle('thinking',rvBusy);
  $('#reversi-engine').textContent=rvReview>=0?'振り返り中は着手・NPC思考を停止':rvInfo||'端末内で思考 · 対局は自動保存';
  $('#reversi-last').textContent=view.last>=0?`直前 ${rvColor(view.mover||view.board[view.last])} ${rvCoordinate(view.last)} · ${view.flipped}枚反転`:'黒から開始 · 四隅と置ける場所を大切に';
  $('#reversi-undo').disabled=rvReview>=0||rvUndoIndex()<0;
  $('#reversi-hint').disabled=!rvCanAnalyze();$('#reversi-hint').textContent=rvReview>=0?'局面分析':'ヒント';$('#reversi-review').disabled=r.frames.length<2;
  $('#reversi-guides').setAttribute('aria-pressed',String(r.showLegal));
  $('#reversi-guides').textContent=r.showLegal?'候補 ON':'候補 OFF';
  $('#reversi-review-tools').hidden=rvReview<0;$('#reversi-replay-back').disabled=rvReview<=0;$('#reversi-replay-next').disabled=rvReview>=r.frames.length-1;
  $('#reversi-result').hidden=!view.over||rvReview>=0;
  if(view.over){$('#reversi-result-title').textContent=black===white?'DRAW':r.mode==='cpu'?(view.board.filter(v=>v===r.human).length>view.board.filter(v=>v===3-r.human).length?'YOU WIN':'NPC WINS'):(black>white?'BLACK WINS':'WHITE WINS');$('#reversi-result-detail').textContent=`黒 ${black} : ${white} 白${r.assisted?' · ヒント／待った使用':''}。棋譜で対局を振り返れます。`;}
  const stats=rvStats();$('#reversi-record').textContent=`NPC戦績 ${stats.wins}勝 ${stats.losses}敗 ${stats.draws}分`;
  $('#reversi-coach').hidden=!rvCoach;$('#reversi-coach').textContent=rvCoach;
  $('#reversi-pause').textContent=r.paused?'対局を再開':'一時停止';$('#reversi-pause').disabled=r.over||rvReview>=0;$('#reversi-pause').setAttribute('aria-pressed',String(r.paused));
  $('#reversi-theme').textContent=r.theme==='midnight'?'盤色：深藍':'盤色：翡翠';
  $('#reversi-save').textContent=rvSaveOK?'この端末に保存済み':'保存できませんでした。棋譜を書き出して保管してください';$('#reversi-save').classList.toggle('save-failed',!rvSaveOK);
  const range=$('#reversi-timeline');range.max=r.frames.length-1;range.value=rvReview>=0?rvReview:r.frames.length-1;range.disabled=r.frames.length<2;range.setAttribute('aria-valuetext',`${range.value}手目 / ${r.frames.length-1}手`);
  const list=$('#reversi-moves'),signature=r.frames.map(f=>f.last).join(',');
  if(list.dataset.signature!==signature){list.dataset.signature=signature;list.innerHTML=r.frames.map((f,i)=>`<li><button data-action="reversiJump" data-frame="${i}" aria-label="${i===0?'開始局面':i+'手目 '+rvColor(f.mover)+' '+rvCoordinate(f.last)+(f.pass?'、'+rvColor(f.pass)+'パス':'')}">${i===0?'開始':`${i}. ${rvColor(f.mover)} ${rvCoordinate(f.last)}${f.pass?' / パス':''}`}</button></li>`).join('');}
  const selected=rvReview>=0?rvReview:r.frames.length-1;list.querySelectorAll('button').forEach((button,i)=>{if(i===selected)button.setAttribute('aria-current','step');else button.removeAttribute('aria-current');});
 }
 function reversiApp(){
  if(!reversi)rvRestore();rvCancel();rvReview=-1;rvRecord();rvSave();
  const r=reversi,player=c=>r.mode==='local'?rvColor(c):c===r.human?'あなた':'NPC';
  shell('Reversi','jade',`<section class="rv-studio" aria-label="リバーシ対局"><header class="rv-heading"><div><small>REVERSI ATELIER</small><h1>一手から、変わる。</h1></div><button data-action="reversiSettings" class="rv-settings">対局設定</button></header>
   <div class="rv-match"><span>${r.mode==='cpu'?'NPC · '+rvLevels[r.level]:'同じ端末で2人対戦'}</span><span>${r.mode==='cpu'?'あなたは'+rvColor(r.human):'黒が先手'}</span></div>
   <div class="reversi-score"><div id="reversi-player-1" class="rv-player"><i class="rv-score-disc black" aria-hidden="true"></i><div><small>${player(1)} · 黒</small><strong id="reversi-black">2</strong></div></div><span>VS</span><div id="reversi-player-2" class="rv-player"><div><small>${player(2)} · 白</small><strong id="reversi-white">2</strong></div><i class="rv-score-disc white" aria-hidden="true"></i></div></div>
   <div class="rv-balance" id="reversi-balance" role="img"><i id="reversi-balance-black"></i></div>
   <div class="rv-board-meta"><span id="reversi-phase"></span><span id="reversi-legal"></span></div>
   <div class="reversi-frame"><div class="rv-coordinates" aria-hidden="true">${[...'ABCDEFGH'].map(c=>`<span>${c}</span>`).join('')}</div><div class="rv-ranks" aria-hidden="true">${Array.from({length:8},(_,i)=>`<span>${i+1}</span>`).join('')}</div><div class="reversi-board" id="reversi-board" role="group" aria-label="8行8列のリバーシ盤。矢印キーで移動、EnterまたはSpaceで着手" aria-describedby="reversi-status">${Array.from({length:64},(_,i)=>`<button class="reversi-cell" data-action="reversiMove" data-index="${i}" tabindex="-1"><span class="rv-piece" aria-hidden="true"><span class="reversi-disc"><i class="rv-face black"></i><i class="rv-face white"></i></span></span><i class="reversi-hint" aria-hidden="true"></i><span class="rv-flip-count" aria-hidden="true"></span><i class="rv-last-mark" aria-hidden="true"></i></button>`).join('')}</div></div>
   <p class="rv-preview-copy" id="reversi-preview">座標を選んで着手。矢印キーでも移動できます</p>
   <div class="rv-status-panel"><strong id="reversi-status" role="status" aria-live="polite" aria-atomic="true"></strong><span id="reversi-last"></span><small id="reversi-engine"></small></div>
   <p class="rv-coach" id="reversi-coach" hidden role="status"></p>
   <div class="rv-tools"><button id="reversi-undo" data-action="reversiUndo">待った</button><button id="reversi-hint" data-action="reversiHint">ヒント</button><button id="reversi-guides" data-action="reversiGuides">候補 ON</button><button id="reversi-review" data-action="reversiReview">棋譜</button></div>
   <div class="rv-review-tools" id="reversi-review-tools" hidden><button data-action="reversiReplay" data-step="-1" id="reversi-replay-back" aria-label="棋譜を一手戻る">前の手</button><button data-action="reversiLive">対局へ戻る</button><button data-action="reversiReplay" data-step="1" id="reversi-replay-next" aria-label="棋譜を一手進める">次の手</button></div>
   <details class="rv-study"><summary>棋譜・研究・保存</summary><label class="rv-timeline">手順を移動<input id="reversi-timeline" type="range" min="0" max="0" value="0" step="1" aria-label="棋譜の手数" /></label><ol id="reversi-moves" class="rv-moves" aria-label="対局の手順"></ol><div class="rv-study-tools"><button id="reversi-pause" data-action="reversiPause">一時停止</button><button id="reversi-theme" data-action="reversiTheme">盤色：翡翠</button><button data-action="reversiExport" data-format="text">棋譜 TXT</button><button data-action="reversiExport" data-format="json">棋譜 JSON</button></div><p id="reversi-save" role="status"></p><button class="rv-save-retry" data-action="reversiSave">保存を再試行</button></details>
   <section class="rv-result" id="reversi-result" hidden><small>GAME COMPLETE</small><h2 id="reversi-result-title"></h2><p id="reversi-result-detail"></p></section>
   <div class="rv-footer"><span id="reversi-record"></span><button data-action="reversiRestart">新しい対局</button></div></section>`,iconButton('reversiHelp','遊び方','document'));
  renderReversi();scheduleAI();
  const board=$('#reversi-board');
  on(board,'pointerover',e=>{const cell=e.target.closest('.reversi-cell');if(cell&&e.pointerType!=='touch')rvPreviewAt(Number(cell.dataset.index));});
  on(board,'pointerleave',()=>rvPreviewAt(-1));
  on(board,'focusin',e=>{const cell=e.target.closest('.reversi-cell');if(!cell)return;rvFocus=Number(cell.dataset.index);[...board.children].forEach((b,i)=>b.tabIndex=i===rvFocus?0:-1);rvPreviewAt(rvFocus);});
  on(board,'focusout',e=>{if(!board.contains(e.relatedTarget))rvPreviewAt(-1);});
  on(board,'keydown',e=>{if(!$('#overlay').hidden||e.altKey||e.metaKey||e.ctrlKey)return;
   const delta={ArrowLeft:-1,ArrowRight:1,ArrowUp:-8,ArrowDown:8};
   if(Object.hasOwn(delta,e.key)){
    e.preventDefault();const x=rvFocus%8,y=rvFocus/8|0;
    if(e.key==='ArrowLeft'&&x>0||e.key==='ArrowRight'&&x<7||e.key==='ArrowUp'&&y>0||e.key==='ArrowDown'&&y<7)rvFocus+=delta[e.key];
    board.children[rvFocus].focus();
   }
   if(e.key==='Home'||e.key==='End'){e.preventDefault();rvFocus=e.key==='Home'?0:63;board.children[rvFocus].focus();}
  });
  on($('#reversi-timeline'),'input',e=>rvShowFrame(Number(e.target.value)));
  on(document,'visibilitychange',()=>{if(document.hidden){rvCancel();rvInfo='';rvSave();renderReversi();}else{renderReversi();scheduleAI();}});
  disposers.push(()=>{rvCancel();rvSave();});
 }
 A.actions.reversiMove=el=>{if(!rvCanPlay())return;rvMove(Number(el.dataset.index));};
 A.actions.reversiUndo=()=>{const index=rvUndoIndex();if(index<0||rvReview>=0)return;rvCancel();reversi.frames=reversi.frames.slice(0,index+1);Object.assign(reversi,rvSnapshot(reversi.frames[index]));reversi.assisted=true;rvInfo='あなたの着手前まで戻しました';rvSave();renderReversi();scheduleAI();};
 A.actions.reversiHint=()=>{
  if(!rvCanAnalyze())return;const view=rvReview>=0?reversi.frames[rvReview]:reversi;
  rvBusy=true;rvHint=-1;rvCoach='';if(rvReview<0){reversi.assisted=true;rvSave();}rvInfo='おすすめの一手を探索中';renderReversi();
  rvSearch(view.board.slice(),view.turn,reversi.level==='expert'?'expert':'hard',result=>rvWaitForBoard(()=>{
   rvBusy=false;const legal=rvEngine.moves(view.board,view.turn);rvHint=legal.includes(result.index)?result.index:-1;
   if(rvHint<0){rvInfo='置ける場所がありません';renderReversi();return;}
   const next=rvEngine.placed(view.board,rvHint,view.turn),reply=rvEngine.moves(next,3-view.turn),unsafeCorners=reply.filter(i=>[0,7,56,63].includes(i));
   const reason=[0,7,56,63].includes(rvHint)?'角を確保する手':!reply.length?'相手の着手をなくす手':unsafeCorners.length?'相手の角取りにも注意':'相手の選択肢と石の安定性を比較';
   const line=(result.line||[]).map(item=>`${rvColor(item.color)}${item.index<0?'パス':rvCoordinate(item.index)}`).join(' → ');
   rvInfo=`${rvCoordinate(rvHint)}を推奨 · ${result.fallback?'簡易候補':result.solved?'終局まで読了':result.depth+'手先'} · ${number(result.nodes)}局面`;
   rvCoach=`${reason}。${rvEngine.flips(view.board,rvHint,view.turn).length}枚反転 / 相手の合法手 ${reply.length}。${line?'参考手順：'+line+'。':''}探索範囲内の提案で、勝利の保証ではありません。`;
   renderReversi();
  }));
 };
 A.actions.reversiGuides=()=>{reversi.showLegal=!reversi.showLegal;rvPreview=-1;rvSave();renderReversi();rvPreviewAt(-1);};
 function rvShowFrame(index){
  if(!Number.isInteger(index)||index<0||index>=reversi.frames.length)return;
  rvCancel();rvReview=index;rvInfo='';renderReversi();
 }
 A.actions.reversiReview=()=>{if(reversi.frames.length>1)rvShowFrame(reversi.frames.length-1);};
 A.actions.reversiJump=el=>rvShowFrame(Number(el.dataset.frame));
 A.actions.reversiReplay=el=>{if(rvReview>=0)rvShowFrame(Math.max(0,Math.min(reversi.frames.length-1,rvReview+Number(el.dataset.step))));};
 A.actions.reversiLive=()=>{rvCancel();rvReview=-1;rvInfo='';renderReversi();scheduleAI();};
 A.actions.reversiPause=()=>{if(reversi.over||rvReview>=0)return;rvCancel();reversi.paused=!reversi.paused;rvInfo='';rvSave();renderReversi();scheduleAI();};
 A.actions.reversiTheme=()=>{reversi.theme=reversi.theme==='midnight'?'jade':'midnight';rvSave();$('.rv-studio').dataset.theme=reversi.theme;$('#reversi-theme').textContent=reversi.theme==='midnight'?'盤色：深藍':'盤色：翡翠';};
 A.actions.reversiSave=()=>{rvRecord();rvSave();renderReversi();};
 A.actions.reversiExport=el=>{
  const r=reversi,black=r.board.filter(v=>v===1).length,white=r.board.filter(v=>v===2).length;
  const record={format:'aura-reversi',version:1,exportedAt:new Date().toISOString(),mode:r.mode,level:r.level,human:r.human,assisted:r.assisted,complete:r.over,score:{black,white},initialBoard:r.frames[0].board,initialTurn:r.frames[0].turn,moves:r.frames.slice(1).map((f,i)=>({ply:i+1,color:f.mover,index:f.last,coordinate:rvCoordinate(f.last),flipped:f.flipped,passed:f.pass})),finalBoard:r.board,turn:r.turn};
  const json=el.dataset.format==='json',content=json?JSON.stringify(record,null,2):[
   'Reversi Atelier — 棋譜',`保存日時: ${record.exportedAt}`,`対戦: ${r.mode==='cpu'?'NPC '+rvLevels[r.level]+' / 自分 '+rvColor(r.human):'2人対戦'}`,`状態: ${r.over?'終局':'対局途中'} / 黒${black} 白${white}`,`ヒント・待った: ${r.assisted?'使用':'未使用'}`,'',
   '開始盤面（. 空 / B 黒 / W 白）',...Array.from({length:8},(_,y)=>record.initialBoard.slice(y*8,y*8+8).map(v=>['.','B','W'][v]).join(' ')),`開始手番: ${rvColor(record.initialTurn)}`,'',
   ...record.moves.map(m=>`${m.ply}. ${rvColor(m.color)} ${m.coordinate} / ${m.flipped}枚反転${m.passed?' / '+rvColor(m.passed)+'パス':''}`),'','移行局面からの記録の場合、移行前の手順は含みません。','このファイルのアプリ内再取り込みには対応していません。'
  ].join('\n');
  A.download(new Blob([content],{type:json?'application/json;charset=utf-8':'text/plain;charset=utf-8'}),`reversi_${new Date().toISOString().slice(0,10)}.${json?'json':'txt'}`);
 };
 function rvStart(options){rvCancel();freshReversi(options);rvSave();open('reversi');}
 A.actions.reversiRestart=()=>A.confirm('新しい対局を始めますか？','今の対局と棋譜を置き換えます。戦績は残ります。',()=>rvStart(reversi));
 A.actions.reversiSettings=()=>{
  const r=reversi;
  A.overlay(`${A.overlayTitle('対局設定')}<div class="rv-options"><label>対戦相手<select id="rv-option-mode"><option value="cpu" ${r.mode==='cpu'?'selected':''}>NPC対戦</option><option value="local" ${r.mode==='local'?'selected':''}>同じ端末で2人対戦</option></select></label><label>NPCの強さ<select id="rv-option-level">${Object.entries(rvLevels).map(([id,label])=>`<option value="${id}" ${r.level===id?'selected':''}>${label}</option>`).join('')}</select></label><label>あなたの石（NPC戦）<select id="rv-option-human"><option value="1" ${r.human===1?'selected':''}>黒 · 先手</option><option value="2" ${r.human===2?'selected':''}>白 · 後手</option></select></label><p>入門 / 標準 / 上級 / 達人。達人の探索予算は約1.8秒。端末により探索の深さは変わります。設定を反映すると新しい対局になります。</p><button class="primary-button" data-action="reversiApplySettings">この設定で新しい対局</button></div>`);
 };
 A.actions.reversiApplySettings=()=>{
  const options={mode:$('#rv-option-mode').value,level:$('#rv-option-level').value,human:Number($('#rv-option-human').value),showLegal:reversi.showLegal,theme:reversi.theme};
  A.confirm('設定を変更して開始？','現在の盤面と棋譜を置き換えます。',()=>rvStart(options));
 };
 // Retain the old action contract for existing callers.
 A.actions.reversiMode=el=>A.confirm('対戦モードを変更？','新しい対局を始めます。',()=>rvStart({...reversi,mode:el.dataset.value}));
 A.actions.reversiHelp=()=>help('Reversi · 遊び方','自分の石で一直線にはさむと相手の石が裏返ります。黒から開始し、置けない側は自動パス。両者とも置けなければ空きマスが残っていても終局です。石数バーは勝率ではありません。<br><br>候補の数字は返せる枚数。マウス／キーボードフォーカスで返る石を強調します。金の小さな印は直前の着手、金の候補はヒントです。候補OFFでも合法手には置けます。<br><br>「待った」はNPCの応手も含め自分の着手前へ（2人対戦は一手）。思考中も取り消せますが、終局後は戦績の重複を避けるため棋譜の閲覧のみです。ヒント・待った使用の対局もNPC戦績に含みます。<br><br>「棋譜」で保存された手順を往復。「対局へ戻る」で再開。古い保存データは移行後の手順から記録します。<br><br>「棋譜・研究・保存」のスライダーや手順ボタンで任意の局面へ。閲覧中の「局面分析」は過去局面に対する提案で、本対局の盤面は変更しません。一時停止・盤色切替・TXT/JSON書き出しも利用できます。書き出した棋譜の再取り込みは非対応。盤面・棋譜は端末内に自動保存。音声・通信・追加画像素材は使用しません。');

 // Orbit Breaker: 120 Hz simulation, swept collisions and interpolated HiDPI rendering.
 const orbitModes={
  relaxed:{label:'リラックス',speed:235,width:104,lives:5,multiplier:1},
  normal:{label:'スタンダード',speed:290,width:84,lives:3,multiplier:1.5},
  expert:{label:'エキスパート',speed:345,width:70,lives:3,multiplier:2}
 };
 const orbitColors=['#b999ff','#6bdfff','#7ce6bf','#ffcd80','#ff93b3'];
 const orbitPatterns=['CONSTELLATION','DIAMOND','GATEWAY','WAVE','CROSS','FORTRESS'];
 const orbitDrops={wide:{label:'W',name:'ワイド 14秒',color:'#7ce6bf'},slow:{label:'T',name:'スロー 9秒',color:'#b999ff'},shield:{label:'S',name:'シールド +1',color:'#6bdfff'}};
 const orbitClamp=(v,min,max)=>Math.max(min,Math.min(max,v));
 const orbitInteger=v=>Number.isSafeInteger(v)&&v>=0?v:0;
 const orbitStored=A.load('breakerPreferences',{});
 const orbitPrefs={mode:typeof orbitStored?.mode==='string'&&Object.hasOwn(orbitModes,orbitStored.mode)?orbitStored.mode:'normal',quality:orbitStored?.quality==='light'?'light':'high',sound:orbitStored?.sound===true,cockpit:orbitStored?.cockpit===true};
 const orbitSaved=A.load('breakerRecords',{});
 const orbitRecords=Object.fromEntries(Object.keys(orbitModes).map(mode=>[mode,{best:orbitInteger(orbitSaved?.[mode]?.best),stage:orbitInteger(orbitSaved?.[mode]?.stage),combo:orbitInteger(orbitSaved?.[mode]?.combo)}]));
 let breaker=null,breakerKeys={left:false,right:false},breakerFrame=0,breakerView=null,breakerAudio=null;
 const orbitMotionQuery=window.matchMedia('(prefers-reduced-motion: reduce)');
 const orbitReduced=()=>!!A.settings.reduceMotion||orbitMotionQuery.matches;
 let orbitSaveStatus='まだ保存していません';
 const orbitWidth=()=>orbitModes[breaker.mode].width+(breaker.wide>0?32:0);
 const orbitSpeed=()=>Math.min(475,orbitModes[breaker.mode].speed+(breaker.stage-1)*13);
 function stageBricks(stage){
  const rows=Math.min(7,4+Math.floor(stage/3)),pattern=(stage-1)%6,items=[];
  for(let r=0;r<rows;r++)for(let c=0;c<7;c++){
   if(pattern===1&&Math.abs(c-3)+Math.abs(r-(rows-1)/2)>4)continue;
   if(pattern===2&&c===3&&r>0)continue;
   if(pattern===3&&(r+c)%4===0)continue;
   if(pattern===4&&r!==Math.floor(rows/2)&&c!==3&&(r+c)%2===0)continue;
   if(pattern===5&&r>0&&r<rows-1&&c>1&&c<5&&r%2===1)continue;
   const hp=stage>2&&(r+c+stage)%4===0?Math.min(3,1+Math.floor(stage/3)):1;
   const type=stage>1&&(r*7+c+stage)%13===0?'nova':'normal';
   items.push({x:20+c*46,y:62+r*26,w:40,h:18,hp,maxHp:hp,type,color:orbitColors[(r+Math.floor((stage-1)/6))%5],flash:0});
  }
  return items;
 }
 function resetBreaker(mode=orbitPrefs.mode){
  breaker={mode,paddle:180,previousPaddle:180,target:180,angle:18,ball:{x:180,y:442,px:180,py:442,vx:0,vy:0},
   bricks:stageBricks(1),score:0,lives:orbitModes[mode].lives,stage:1,running:false,launched:false,over:false,
   trail:[],particles:[],rings:[],drops:[],combo:0,maxCombo:0,destroyed:0,elapsed:0,energy:0,focus:0,wide:0,slow:0,shield:0,
   message:'発射角を決めて、軌道へ。',messageTime:4,stageTime:0,trailClock:0,countdown:0,restored:false,
   stageHits:0,stagePeak:0,stageDrops:0,stageMisses:0,claimed:[],missions:0,perfects:0};
 }
 // Only gameplay data is serialized; rendering resources and effects never enter storage.
 const orbitStateFields=['mode','paddle','target','angle','score','lives','stage','launched','over','combo','maxCombo','destroyed','elapsed','energy','focus','wide','slow','shield','stageHits','stagePeak','stageDrops','stageMisses','claimed','missions','perfects'];
 function orbitCheckpoint(){
  if(!breaker)return null;
  const b=breaker,data={version:1,savedAt:Date.now()};
  for(const key of orbitStateFields)data[key]=b[key];
  data.ball={x:b.ball.x,y:b.ball.y,vx:b.ball.vx,vy:b.ball.vy};
  data.hp=b.bricks.map(brick=>brick.hp);
  data.drops=b.drops.map(({x,y,type})=>({x,y,type}));
  return data;
 }
 function orbitRestore(){
  const saved=A.load('breakerState',null);if(saved===null)return false;
  const finite=(v,min,max)=>typeof v==='number'&&Number.isFinite(v)&&v>=min&&v<=max;
  const integer=(v,min,max)=>Number.isSafeInteger(v)&&v>=min&&v<=max;
  const reject=()=>{orbitSaveStatus='保存データを復元できないため新規開始';return false;};
  if(!saved||saved.version!==1||typeof saved.mode!=='string'||!Object.hasOwn(orbitModes,saved.mode)||!integer(saved.stage,1,1000000)||
   !integer(saved.lives,0,7)||typeof saved.over!=='boolean'||typeof saved.launched!=='boolean'||
   saved.over!==(saved.lives===0)||!finite(saved.paddle,0,360)||!finite(saved.target,0,360)||
   !integer(saved.angle,-55,55)||!finite(saved.elapsed,0,1e9)||!integer(saved.energy,0,100)||
   !integer(saved.shield,0,2)||!finite(saved.wide,0,14)||!finite(saved.slow,0,9)||!finite(saved.focus,0,4)||
   !['score','combo','maxCombo','destroyed','stageHits','stagePeak','stageDrops','stageMisses','missions','perfects'].every(key=>integer(saved[key],0,Number.MAX_SAFE_INTEGER)))return reject();
  if(!saved.ball||!finite(saved.ball.x,5.9,354.1)||!finite(saved.ball.y,5.9,saved.over?520:514)||
   !finite(saved.ball.vx,-475,475)||!finite(saved.ball.vy,-475,475)||
   (saved.launched&&(!finite(Math.hypot(saved.ball.vx,saved.ball.vy),200,476)||Math.abs(saved.ball.vy)<10)))return reject();
  const bricks=stageBricks(saved.stage);
  if(!Array.isArray(saved.hp)||saved.hp.length!==bricks.length||!saved.hp.every((hp,i)=>integer(hp,0,bricks[i].maxHp))||
   !saved.hp.some(hp=>hp>0)||!Array.isArray(saved.drops)||saved.drops.length>6||
   !saved.drops.every(drop=>drop&&typeof drop.type==='string'&&Object.hasOwn(orbitDrops,drop.type)&&finite(drop.x,0,360)&&finite(drop.y,0,510))||
   !Array.isArray(saved.claimed)||saved.claimed.length>3||new Set(saved.claimed).size!==saved.claimed.length||
   !saved.claimed.every(id=>['hits','combo','collect'].includes(id)))return reject();
  resetBreaker(saved.mode);
  for(const key of orbitStateFields)breaker[key]=saved[key];
  breaker.claimed=[...saved.claimed];
  const half=(orbitModes[breaker.mode].width+(breaker.wide>0?32:0))/2;
  breaker.paddle=orbitClamp(breaker.paddle,half+4,356-half);breaker.previousPaddle=breaker.paddle;
  breaker.target=breaker.paddle;breaker.bricks=bricks.map((brick,i)=>({...brick,hp:saved.hp[i]}));
  breaker.ball={...saved.ball,px:saved.ball.x,py:saved.ball.y};
  if(!breaker.launched)breaker.ball={x:breaker.paddle,y:442,px:breaker.paddle,py:442,vx:0,vy:0};
  breaker.drops=saved.drops.map(drop=>({...drop,py:drop.y}));
  breaker.restored=true;breaker.running=false;
  orbitSaveStatus='保存フライトを復元しました';orbitMessage('保存済みのフライト · 再開で続ける');return true;
 }
 function orbitSave(){
  if(!breaker)return false;
  const b=breaker,latest=A.load('breakerRecords',{});
  // Preserve previously saved highs from other tabs; the single flight slot is last-writer-wins.
  const records=Object.fromEntries(Object.keys(orbitModes).map(mode=>[mode,Object.fromEntries(['best','stage','combo'].map(key=>[key,Math.max(orbitRecords[mode][key],orbitInteger(latest?.[mode]?.[key]))]))]));
  const r=records[b.mode],next={best:Math.max(r.best,b.score),stage:Math.max(r.stage,b.stage),combo:Math.max(r.combo,b.maxCombo)};
  records[b.mode]=next;
  const saved=A.saveBatch({breakerRecords:records,breakerBest:Math.max(orbitInteger(A.load('breakerBest',0)),b.score),breakerState:orbitCheckpoint()});
  if(saved){Object.assign(orbitRecords,records);orbitSaveStatus='この端末に保存しました';}
  else orbitSaveStatus='保存できませんでした · 空き容量を確認してください';
  return saved;
 }
 function orbitMissionList(){
  const b=breaker;
  return [{id:'hits',label:'ブロックに12回ヒット',value:b.stageHits,target:12,bonus:150},
   {id:'combo',label:'8回連続ヒット',value:b.stagePeak,target:8,bonus:250},
   {id:'collect',label:'アイテムを2個回収',value:b.stageDrops,target:2,bonus:200}];
 }
 function orbitCheckMissions(){
  const b=breaker;
  for(const mission of orbitMissionList())if(mission.value>=mission.target&&!b.claimed.includes(mission.id)){
   b.claimed.push(mission.id);b.missions++;const bonus=Math.round(mission.bonus*orbitModes[b.mode].multiplier);
   b.score+=bonus;b.energy=Math.min(100,b.energy+20);
   orbitMessage('MISSION CLEAR · +'+bonus+' pts / FOCUS +20');orbitBurst(180,300,'#9de8dd',24);
  }
 }
 function orbitMessage(text){breaker.message=text;breaker.messageTime=3;}
 function orbitTone(frequency=440){
  if(!orbitPrefs.sound||A.settings.sound===false||A.settings.volume===0)return;
  try{
   const Audio=window.AudioContext||window.webkitAudioContext;if(!Audio)return;
   if(!breakerAudio)breakerAudio=new Audio();
   if(breakerAudio.state==='suspended')breakerAudio.resume().catch(()=>{});
   if(breakerAudio.state!=='running')return;
   const ctx=breakerAudio,t=ctx.currentTime;
   if(t<(breakerView?.lastTone||0)+.035)return;
   if(breakerView)breakerView.lastTone=t;
   const oscillator=ctx.createOscillator(),gain=ctx.createGain();
   oscillator.type='sine';oscillator.frequency.setValueAtTime(frequency,t);
   oscillator.frequency.exponentialRampToValueAtTime(frequency*.65,t+.12);
   const volume=Number.isFinite(A.settings.volume)?orbitClamp(A.settings.volume/100,0,1):.6;
   gain.gain.setValueAtTime(.045*volume,t);gain.gain.exponentialRampToValueAtTime(.001,t+.13);
   oscillator.connect(gain);gain.connect(ctx.destination);oscillator.start(t);oscillator.stop(t+.14);
   oscillator.onended=()=>{oscillator.disconnect();gain.disconnect();};
  }catch{/* Optional sound must never interrupt a game. */}
 }
 function orbitBurst(x,y,color,count=12){
  if(orbitReduced())return;
  const b=breaker,limit=orbitPrefs.quality==='high'?150:36;
  count=orbitPrefs.quality==='high'?count:Math.ceil(count/3);
  for(let i=0;i<count&&b.particles.length<limit;i++){
   const angle=Math.random()*Math.PI*2,speed=24+Math.random()*95;
   b.particles.push({x,y,vx:Math.cos(angle)*speed,vy:Math.sin(angle)*speed,life:.35+Math.random()*.4,max:.75,color,size:1+Math.random()*2});
  }
  if(b.rings.length<8)b.rings.push({x,y,color,life:.4});
 }
 function breakerBallReset(){
  const b=breaker;
  b.ball={x:b.paddle,y:442,px:b.paddle,py:442,vx:0,vy:0};
  b.launched=false;b.trail=[];b.combo=0;b.focus=0;b.trailClock=0;
 }
 function orbitLaunch(){
  const b=breaker;if(!b||!b.running||b.over||b.launched)return;
  const angle=b.angle*Math.PI/180,speed=orbitSpeed();
  b.ball.vx=Math.sin(angle)*speed;b.ball.vy=-Math.cos(angle)*speed;b.launched=true;
  orbitMessage('連続ヒットで倍率アップ');orbitTone(540);orbitWake();
 }
 function orbitPause(message='一時停止 · 再開で続ける'){
  if(!breaker)return;
  const wasRunning=breaker.running;breaker.running=false;breakerKeys={left:false,right:false};
  breakerView?.clearInput();
  breaker.countdown=0;
  if(wasRunning){orbitMessage(message);orbitSave();}
  orbitWake();
 }
 // Ray versus radius-expanded AABB: time of impact prevents tunnelling at high speeds.
 function orbitSweep(ball,dx,dy,rect){
  const minX=rect.x-6,maxX=rect.x+rect.w+6,minY=rect.y-6,maxY=rect.y+rect.h+6;
  let nearX=-Infinity,farX=Infinity,nearY=-Infinity,farY=Infinity;
  if(Math.abs(dx)<1e-9){if(ball.x<minX||ball.x>maxX)return null;}
  else{nearX=(minX-ball.x)/dx;farX=(maxX-ball.x)/dx;if(nearX>farX)[nearX,farX]=[farX,nearX];}
  if(Math.abs(dy)<1e-9){if(ball.y<minY||ball.y>maxY)return null;}
  else{nearY=(minY-ball.y)/dy;farY=(maxY-ball.y)/dy;if(nearY>farY)[nearY,farY]=[farY,nearY];}
  const entry=Math.max(nearX,nearY),exit=Math.min(farX,farY);
  if(entry<0||entry>1||entry>exit||exit<0)return null;
  return {time:entry,nx:nearX>nearY?(dx>0?-1:1):0,ny:nearX>nearY?0:(dy>0?-1:1)};
 }
 function orbitDamage(brick,explosion=false){
  if(brick.hp<=0)return;
  const b=breaker;brick.hp--;brick.flash=.16;
  b.combo++;b.maxCombo=Math.max(b.maxCombo,b.combo);b.stageHits++;b.stagePeak=Math.max(b.stagePeak,b.combo);
  const multiplier=1+Math.min(4,Math.floor(b.combo/5));
  b.score+=Math.round((brick.hp?8:20)*multiplier*orbitModes[b.mode].multiplier);
  b.energy=Math.min(100,b.energy+(brick.hp?5:9));
  if(brick.hp===0){
   b.destroyed++;orbitBurst(brick.x+20,brick.y+9,brick.color,18);
   if(b.destroyed%7===0&&b.drops.length<6){
    const type=['wide','slow','shield'][(b.destroyed/7-1)%3];
    b.drops.push({x:brick.x+20,y:brick.y+9,py:brick.y+9,type});
   }
   // A nova damages immediate neighbours once, without unbounded chain recursion.
   if(brick.type==='nova'&&!explosion){
    orbitBurst(brick.x+20,brick.y+9,'#ffcd80',25);
    b.bricks.filter(other=>other!==brick&&other.hp>0&&Math.hypot(other.x-brick.x,other.y-brick.y)<57).forEach(other=>orbitDamage(other,true));
    orbitMessage('NOVA · 周囲のブロックにダメージ');
   }
  }else orbitBurst(brick.x+20,brick.y+9,brick.color,5);
  if(!explosion)orbitTone(430+Math.min(b.combo,15)*32);
 }
 function orbitMoveBall(dt){
  const b=breaker,ball=b.ball;
  let remaining=dt*((b.slow>0||b.focus>0)?0.64:1);
  for(let iteration=0;iteration<6&&remaining>1e-7;iteration++){
   const dx=ball.vx*remaining,dy=ball.vy*remaining;
   let hit=null;
   const consider=(candidate,type,brick=null)=>{
    if(candidate&&candidate.time>=0&&candidate.time<=1&&(!hit||candidate.time<hit.time))hit={...candidate,type,brick};
   };
   if(dx<0)consider({time:(6-ball.x)/dx,nx:1,ny:0},'wall');
   if(dx>0)consider({time:(354-ball.x)/dx,nx:-1,ny:0},'wall');
   if(dy<0)consider({time:(6-ball.y)/dy,nx:0,ny:1},'wall');
   if(dy>0&&ball.y<=448){
    const time=(448-ball.y)/dy,x=ball.x+dx*time;
    if(Math.abs(x-b.paddle)<=orbitWidth()/2+6)consider({time,nx:0,ny:-1},'paddle');
   }
   if(dy>0&&b.shield>0&&ball.y<=482)consider({time:(482-ball.y)/dy,nx:0,ny:-1},'shield');
   for(const brick of b.bricks)if(brick.hp>0)consider(orbitSweep(ball,dx,dy,brick),'brick',brick);
   if(!hit){ball.x+=dx;ball.y+=dy;break;}
   ball.x+=dx*hit.time;ball.y+=dy*hit.time;
   if(hit.type==='paddle'){
    const impact=orbitClamp((ball.x-b.paddle)/(orbitWidth()/2),-1,1);
    let angle=impact*1.05+orbitClamp((b.paddle-b.previousPaddle)*.025,-.12,.12);
    if(Math.abs(angle)<.10)angle=(ball.vx<0?-1:1)*.10;
    const speed=orbitSpeed();ball.vx=Math.sin(angle)*speed;ball.vy=-Math.cos(angle)*speed;b.combo=0;
    orbitBurst(ball.x,454,'#b4efff',6);orbitTone(260);
   }else{
    if(hit.nx)ball.vx=-ball.vx;if(hit.ny)ball.vy=-ball.vy;
    if(hit.type==='brick')orbitDamage(hit.brick);
    if(hit.type==='shield'){b.shield--;orbitBurst(ball.x,484,'#6bdfff',24);orbitMessage('シールドが落球を防いだ');orbitTone(220);}
   }
   ball.x+=hit.nx*.02;ball.y+=hit.ny*.02;
   remaining*=1-hit.time;
  }
 }
 function breakerUpdate(dt){
  const b=breaker;if(!b.running||b.over)return;
  b.previousPaddle=b.paddle;b.ball.px=b.ball.x;b.ball.py=b.ball.y;
  const direction=Number(breakerKeys.right)-Number(breakerKeys.left),half=orbitWidth()/2;
  if(direction)b.target=orbitClamp(b.target+direction*440*dt,half+4,356-half);
  b.target=orbitClamp(b.target,half+4,356-half);
  b.paddle=orbitClamp(b.paddle+(b.target-b.paddle)*(1-Math.exp(-32*dt)),half+4,356-half);
  b.messageTime=Math.max(0,b.messageTime-dt);b.stageTime=Math.max(0,b.stageTime-dt);
  for(const p of b.particles){p.x+=p.vx*dt;p.y+=p.vy*dt;p.vy+=70*dt;p.life-=dt;}
  b.particles=b.particles.filter(p=>p.life>0);
  for(const ring of b.rings)ring.life-=dt;b.rings=b.rings.filter(r=>r.life>0);
  for(const brick of b.bricks)brick.flash=Math.max(0,brick.flash-dt);
  if(!b.launched){b.ball.x=b.paddle;b.ball.y=442;return;}
  if(b.countdown>0){b.countdown=Math.max(0,b.countdown-dt);return;}
  b.elapsed+=dt;
  for(const key of ['wide','slow','focus'])b[key]=Math.max(0,b[key]-dt);
  orbitMoveBall(dt);
  for(const drop of b.drops){
   drop.py=drop.y;drop.y+=88*dt;
   if(drop.y>=443&&drop.py<=467&&Math.abs(drop.x-b.paddle)<=orbitWidth()/2+10){
    if(drop.type==='wide')b.wide=14;if(drop.type==='slow')b.slow=9;if(drop.type==='shield')b.shield=Math.min(2,b.shield+1);
    b.stageDrops++;drop.y=520;orbitMessage(orbitDrops[drop.type].name);orbitBurst(drop.x,454,orbitDrops[drop.type].color);orbitTone(740);
   }
  }
  b.drops=b.drops.filter(drop=>drop.y<510);orbitCheckMissions();
  if(b.ball.y>514){
   b.lives--;b.stageMisses++;b.drops=[];b.wide=0;b.slow=0;b.shield=0;orbitTone(140);
   if(b.lives<=0){b.over=true;b.running=false;orbitMessage('フライト終了');orbitSave();}
   else{breakerBallReset();orbitMessage('残り '+b.lives+' 機 · 発射で再挑戦');orbitSave();}
   return;
  }
  if(b.bricks.every(brick=>brick.hp<=0)){
   const perfect=b.stageMisses===0,bonus=Math.round((150+(perfect?200:0))*b.stage*orbitModes[b.mode].multiplier);
   b.score+=bonus;if(perfect)b.perfects++;b.stage++;b.bricks=stageBricks(b.stage);b.drops=[];
   const extraLife=b.stage%3===1;if(extraLife)b.lives=Math.min(7,b.lives+1);
   orbitMessage((perfect?'ノーミスクリア':'ステージクリア')+' · +'+bonus+' pts'+(extraLife?' / 残機 +1':''));
   b.stageHits=0;b.stagePeak=0;b.stageDrops=0;b.stageMisses=0;b.claimed=[];
   b.stageTime=2;breakerBallReset();orbitSave();orbitTone(880);return;
  }
  b.trailClock+=dt;
  if(b.trailClock>=1/60){b.trailClock%=1/60;b.trail.unshift({x:b.ball.x,y:b.ball.y});if(b.trail.length>18)b.trail.pop();}
 }
 function orbitHud(){
  if(!breakerView)return;
  const b=breaker,v=breakerView,remaining=b.bricks.filter(brick=>brick.hp>0).length;
  const content=v.canvas.closest('.arcade-play'),flying=String(b.launched);
  if(content.dataset.flying!==flying)content.dataset.flying=flying;
  const text=(id,value)=>{const node=v.nodes[id];value=String(value);if(node&&node.textContent!==value)node.textContent=value;};
  text('score',number(b.score));text('best',number(Math.max(orbitRecords[b.mode].best,b.score)));
  text('lives',b.lives+' 機');text('stage',String(b.stage).padStart(2,'0'));text('combo','×'+(1+Math.min(4,Math.floor(b.combo/5))));
  text('remaining',remaining+' / '+b.bricks.length);text('pattern',orbitPatterns[(b.stage-1)%6]);
  text('save-status',orbitSaveStatus);
  for(const mission of orbitMissionList()){
   text('mission-'+mission.id,`${b.claimed.includes(mission.id)?'達成':'進行中'} · ${mission.label} ${Math.min(mission.target,mission.value)}/${mission.target}`);
   text('reward-'+mission.id,`+${Math.round(mission.bonus*orbitModes[b.mode].multiplier)} pts / FOCUS +20`);
   v.nodes['mission-'+mission.id].parentElement.classList.toggle('complete',b.claimed.includes(mission.id));
  }
  text('mission-summary',`セクターミッション ${b.claimed.length} / 3`);
  text('record',`${orbitModes[b.mode].label} · 最高 ${number(Math.max(orbitRecords[b.mode].best,b.score))} pts / 到達 ${Math.max(orbitRecords[b.mode].stage,b.stage)} / 最大連続 ${Math.max(orbitRecords[b.mode].combo,b.maxCombo)} HIT`);
  text('effects',[b.wide>0?'W '+Math.ceil(b.wide)+'s':'',b.slow>0?'T '+Math.ceil(b.slow)+'s':'',b.shield?'S ×'+b.shield:'',b.focus>0?'FOCUS '+Math.ceil(b.focus)+'s':''].filter(Boolean).join(' · ')||'W ワイド / T スロー / S シールド');
  const status=b.messageTime>0?b.message:(!b.launched?'発射ボタン / Space / 盤面タップで発射':'ブロックを壊してFOCUSをチャージ');
  text('status',status);
  text('toggle',b.over?'もう一度':b.running?'一時停止':b.launched?'再開':'開始');
  text('focus',b.focus>0?'FOCUS 発動中':b.energy>=100?'FOCUS 発動':'FOCUS '+b.energy+'%');
  v.nodes.focus.disabled=!b.running||!b.launched||b.energy<100||b.focus>0||b.countdown>0;
  v.nodes.launch.disabled=!b.running||b.launched||b.over;
  v.nodes.energy.value=b.energy;v.nodes.energy.setAttribute('aria-valuetext',b.energy+'%');
  v.nodes.progress.value=b.bricks.length-remaining;v.nodes.progress.max=b.bricks.length;
  v.nodes.angle.disabled=b.launched||b.over;v.nodes.angle.value=b.angle;
  text('angle-value',(b.angle>0?'+':'')+b.angle+'°');
  const panel=v.nodes.panel;panel.hidden=b.running;
  const count=v.nodes.countdown;count.hidden=!b.running||b.countdown<=0;
  text('countdown',b.countdown>0?Math.ceil(b.countdown):'');
  text('panel-title',b.over?'FLIGHT COMPLETE':b.restored?'FLIGHT SAVED':b.launched?'PAUSED':'ORBIT BREAKER');
  text('panel-copy',b.over?`${number(b.score)} pts · STAGE ${b.stage} · ${Math.floor(b.elapsed/60)}分${Math.floor(b.elapsed%60)}秒`:'狙って、跳ね返して、星の先へ。');
  text('panel-detail',b.over?`最大連続 ${b.maxCombo} HIT / 破壊 ${b.destroyed} 個 / ミッション ${b.missions} / ノーミス ${b.perfects}`:orbitModes[b.mode].label+' · '+(b.launched?'再開を押すまで停止します':'ドラッグ / ← → で移動'));
  text('panel-button',b.over?'もう一度プレイ':b.launched?'フライトを再開':'フライトを開始');
 }
 function orbitBackground(ctx){
  const gradient=ctx.createLinearGradient(0,0,360,500);gradient.addColorStop(0,'#080e25');gradient.addColorStop(.6,'#192140');gradient.addColorStop(1,'#101a30');
  ctx.fillStyle=gradient;ctx.fillRect(0,0,360,500);
  for(const [x,y,r,color] of [[60,90,240,'#6640a947'],[320,275,240,'#248fac28']]){
   const glow=ctx.createRadialGradient(x,y,0,x,y,r);glow.addColorStop(0,color);glow.addColorStop(1,'#00000000');ctx.fillStyle=glow;ctx.fillRect(0,0,360,500);
  }
  ctx.save();ctx.translate(280,315);ctx.rotate(-.4);
  ctx.strokeStyle='#83caff22';ctx.lineWidth=1;
  for(let i=0;i<3;i++){ctx.beginPath();ctx.ellipse(0,0,84+i*17,27+i*7,0,0,Math.PI*2);ctx.stroke();}
  const planet=ctx.createRadialGradient(-20,-25,3,0,0,58);planet.addColorStop(0,'#46638a');planet.addColorStop(.6,'#233554');planet.addColorStop(1,'#121e39');
  ctx.fillStyle=planet;ctx.beginPath();ctx.arc(0,0,57,0,Math.PI*2);ctx.fill();ctx.strokeStyle='#8cbfdb33';ctx.stroke();ctx.restore();
  ctx.strokeStyle='#80baff08';ctx.lineWidth=.7;
  for(let y=360;y<500;y+=20){ctx.beginPath();ctx.moveTo(0,y);ctx.lineTo(360,y);ctx.stroke();}
  for(let x=-360;x<=720;x+=60){ctx.beginPath();ctx.moveTo(180+(x-180)*.15,345);ctx.lineTo(x,500);ctx.stroke();}
  ctx.strokeStyle='#a0dfff33';ctx.strokeRect(3,3,354,494);
 }
 function orbitResize(){
  const v=breakerView;if(!v)return;
  const size=v.canvas.getBoundingClientRect(),ratio=orbitPrefs.quality==='high'?Math.min(2,window.devicePixelRatio||1):1;
  const width=Math.max(1,Math.round((size.width||360)*ratio)),height=Math.round(width*500/360);
  if(v.canvas.width===width&&v.canvas.height===height&&v.background)return;
  v.canvas.width=width;v.canvas.height=height;v.scale=width/360;
  const background=document.createElement('canvas');background.width=width;background.height=height;
  const ctx=background.getContext('2d');ctx.scale(v.scale,v.scale);orbitBackground(ctx);v.background=background;v.sprites.clear();
 }
 function orbitBrickSprite(brick){
  const v=breakerView,key=brick.color+brick.hp+brick.type;
  if(v.sprites.has(key))return v.sprites.get(key);
  const sprite=document.createElement('canvas');sprite.width=Math.ceil(48*v.scale);sprite.height=Math.ceil(28*v.scale);
  const ctx=sprite.getContext('2d');ctx.scale(v.scale,v.scale);
  ctx.fillStyle='#00000055';ctx.beginPath();ctx.roundRect(4,7,40,18,5);ctx.fill();
  const material=ctx.createLinearGradient(4,3,4,22);material.addColorStop(0,'#f6f5ff');material.addColorStop(.12,brick.color);material.addColorStop(.65,brick.color);material.addColorStop(1,'#303550');
  ctx.fillStyle=material;ctx.beginPath();ctx.roundRect(4,3,40,18,4);ctx.fill();
  ctx.strokeStyle='#ffffff65';ctx.lineWidth=.7;ctx.stroke();
  ctx.fillStyle='#ffffff24';ctx.beginPath();ctx.roundRect(7,5,34,6,2);ctx.fill();
  ctx.strokeStyle='#0c163544';ctx.beginPath();ctx.moveTo(8,18);ctx.lineTo(39,18);ctx.stroke();
  ctx.fillStyle='#122443';ctx.textAlign='center';ctx.font='bold 10px sans-serif';
  if(brick.type==='nova')ctx.fillText('N'+(brick.hp>1?brick.hp:''),24,16);
  else if(brick.hp>1)for(let i=0;i<brick.hp;i++){ctx.beginPath();ctx.arc(24+(i-(brick.hp-1)/2)*6,13,1.4,0,Math.PI*2);ctx.fill();}
  v.sprites.set(key,sprite);return sprite;
 }
 function orbitAimGuide(ctx,x,y){
  const angle=breaker.angle*Math.PI/180,point={x,y};let dx=Math.sin(angle),dy=-Math.cos(angle),distance=580;
  ctx.save();ctx.strokeStyle='#b4eaff70';ctx.lineWidth=1.2;ctx.setLineDash([3,7]);ctx.beginPath();ctx.moveTo(x,y);
  for(let segment=0;segment<3&&distance>0;segment++){
   const mx=dx*distance,my=dy*distance;let hit=null;
   const consider=c=>{if(c&&c.time>=0&&c.time<=1&&(!hit||c.time<hit.time))hit=c;};
   if(mx<0)consider({time:(6-point.x)/mx,nx:1,ny:0});if(mx>0)consider({time:(354-point.x)/mx,nx:-1,ny:0});
   if(my<0)consider({time:(6-point.y)/my,nx:0,ny:1});
   for(const brick of breaker.bricks)if(brick.hp>0){const collision=orbitSweep(point,mx,my,brick);if(collision)consider({...collision,brick:true});}
   point.x+=mx*(hit?hit.time:1);point.y+=my*(hit?hit.time:1);ctx.lineTo(point.x,point.y);
   if(!hit||hit.brick)break;
   distance*=1-hit.time;if(hit.nx)dx=-dx;if(hit.ny)dy=-dy;point.x+=hit.nx*.02;point.y+=hit.ny*.02;
  }
  ctx.stroke();ctx.setLineDash([]);ctx.beginPath();ctx.arc(point.x,point.y,5,0,Math.PI*2);ctx.stroke();ctx.restore();
 }
 function drawBreaker(alpha=1){
  const v=breakerView;if(!v)return;
  const ctx=v.ctx,b=breaker,reduced=orbitReduced(),high=orbitPrefs.quality==='high';
  const lerp=(previous,current)=>previous+(current-previous)*alpha;
  ctx.setTransform(1,0,0,1,0,0);ctx.drawImage(v.background,0,0);ctx.setTransform(v.scale,0,0,v.scale,0,0);
  const time=reduced?0:b.elapsed;
  for(let i=0;i<(high?66:28);i++){
   const depth=(i%3+1)/3,x=((i*97+31)%360+(reduced?0:(b.paddle-180)*depth*.025)+360)%360,y=((i*67+43)%500+time*depth*2)%500;
   ctx.globalAlpha=.25+depth*.45+(reduced?0:Math.sin(time*.9+i)*.1);ctx.fillStyle=i%4?'#cceaff':'#f0ccff';
   ctx.beginPath();ctx.arc(x,y,.45+depth*.65,0,Math.PI*2);ctx.fill();
  }
  ctx.globalAlpha=1;
  for(const brick of b.bricks){
   if(brick.hp<=0)continue;ctx.drawImage(orbitBrickSprite(brick),brick.x-4,brick.y-3,48,28);
   if(brick.flash>0&&!reduced){ctx.globalAlpha=brick.flash*3;ctx.fillStyle='#fff';ctx.fillRect(brick.x+2,brick.y+2,36,14);ctx.globalAlpha=1;}
   if(brick.hp<brick.maxHp){ctx.strokeStyle='#23305088';ctx.beginPath();ctx.moveTo(brick.x+27,brick.y+2);ctx.lineTo(brick.x+22,brick.y+9);ctx.lineTo(brick.x+27,brick.y+15);ctx.stroke();}
  }
  if(!reduced){
   for(const ring of b.rings){ctx.globalAlpha=ring.life*1.5;ctx.strokeStyle=ring.color;ctx.lineWidth=1;ctx.beginPath();ctx.arc(ring.x,ring.y,(.4-ring.life)*85+6,0,Math.PI*2);ctx.stroke();}
   for(const p of b.particles){ctx.globalAlpha=Math.max(0,p.life/p.max);ctx.fillStyle=p.color;ctx.fillRect(p.x,p.y,p.size,p.size);}
   ctx.globalAlpha=1;
  }
  for(const drop of b.drops){
   const y=lerp(drop.py,drop.y),style=orbitDrops[drop.type];ctx.fillStyle='#10213bec';ctx.strokeStyle=style.color;ctx.lineWidth=1.4;
   ctx.beginPath();ctx.roundRect(drop.x-10,y-10,20,20,6);ctx.fill();ctx.stroke();ctx.fillStyle=style.color;ctx.font='bold 11px sans-serif';ctx.textAlign='center';ctx.fillText(style.label,drop.x,y+4);
  }
  if(b.shield){ctx.strokeStyle='#6bdfff';ctx.lineWidth=2;ctx.setLineDash([8,4]);ctx.beginPath();ctx.moveTo(8,484);ctx.lineTo(352,484);ctx.stroke();ctx.setLineDash([]);}
  if(b.focus>0){ctx.strokeStyle='#b999ff99';ctx.lineWidth=3;ctx.strokeRect(5,5,350,490);}
  const paddle=lerp(b.previousPaddle,b.paddle),width=orbitWidth(),x=lerp(b.ball.px,b.ball.x),y=lerp(b.ball.py,b.ball.y);
  if(!b.launched&&!b.over)orbitAimGuide(ctx,x,y);
  if(!reduced){
   ctx.lineCap='round';
   for(let i=b.trail.length-1;i>0;i--){const p=b.trail[i],next=b.trail[i-1];ctx.globalAlpha=(1-i/b.trail.length)*.35;ctx.strokeStyle=b.focus>0?'#c4a5ff':'#92deff';ctx.lineWidth=(1-i/b.trail.length)*9;ctx.beginPath();ctx.moveTo(p.x,p.y);ctx.lineTo(next.x,next.y);ctx.stroke();}
   ctx.globalAlpha=1;
  }
  ctx.shadowBlur=high&&!reduced?16:0;ctx.shadowColor='#82dfff';
  const glow=ctx.createRadialGradient(x-2,y-2,0,x,y,7);glow.addColorStop(0,'#ffffff');glow.addColorStop(.5,'#d8f8ff');glow.addColorStop(1,'#69beea');
  ctx.fillStyle=glow;ctx.beginPath();ctx.arc(x,y,6,0,Math.PI*2);ctx.fill();ctx.shadowBlur=0;
  const metal=ctx.createLinearGradient(0,454,0,466);metal.addColorStop(0,'#effaff');metal.addColorStop(.32,b.wide>0?'#9df1c7':'#a8dce9');metal.addColorStop(1,'#4b718f');
  ctx.fillStyle=metal;ctx.beginPath();ctx.roundRect(paddle-width/2,454,width,12,6);ctx.fill();
  ctx.strokeStyle='#efffffaa';ctx.lineWidth=1;ctx.stroke();ctx.fillStyle='#142a45';ctx.fillRect(paddle-9,458,18,2);
  if(!reduced&&b.running){ctx.fillStyle='#79dfff55';ctx.beginPath();ctx.ellipse(paddle,473,width*.25,3+Math.sin(time*6),0,0,Math.PI*2);ctx.fill();}
  if(b.running&&!b.launched){ctx.fillStyle='#d8ebff';ctx.font='500 12px sans-serif';ctx.textAlign='center';ctx.fillText('発射でスタート',180,285);}
  if(b.stageTime>0){ctx.fillStyle='#edddff';ctx.font='600 20px sans-serif';ctx.textAlign='center';ctx.fillText('SECTOR '+String(b.stage).padStart(2,'0'),180,254);}
 }
 function orbitWake(){if(breakerView)breakerView.wake();}
 function breakerApp(){
  if(!breaker&&!orbitRestore())resetBreaker();
  shell('Orbit Breaker','night',`
   <div class="orbit-heading"><div><small>ORBIT / DEEP SPACE ARCADE</small><h1>星の先へ。</h1></div><div class="orbit-best"><small>MODE BEST</small><strong id="breaker-best">0</strong></div></div>
   <div class="orbit-toolbar"><button data-action="breakerCockpit" id="breaker-cockpit" aria-pressed="${orbitPrefs.cockpit}">${orbitPrefs.cockpit?'通常表示':'盤面重視'}</button><button data-action="breakerSave">保存して停止</button><span id="breaker-save-status" role="status"></span></div>
   <div class="orbit-options"><label>難易度<select id="breaker-mode">${Object.entries(orbitModes).map(([key,mode])=>`<option value="${key}" ${breaker.mode===key?'selected':''}>${mode.label}</option>`).join('')}</select></label><label>描画<select id="breaker-quality"><option value="high" ${orbitPrefs.quality==='high'?'selected':''}>高画質</option><option value="light" ${orbitPrefs.quality==='light'?'selected':''}>軽量</option></select></label><button data-action="breakerSound" id="breaker-sound" aria-pressed="${orbitPrefs.sound}">音 ${orbitPrefs.sound?'ON':'OFF'}</button></div>
   <div class="arc-scorebar orbit-scorebar">${score('SCORE',0,'breaker-score')}${score('LIVES',0,'breaker-lives')}${score('SECTOR',1,'breaker-stage')}${score('COMBO','×1','breaker-combo')}</div>
   <div class="orbit-sector"><span id="breaker-pattern"></span><span>残り <strong id="breaker-remaining"></strong></span></div><progress id="breaker-progress" class="orbit-progress" value="0" max="1" aria-label="ステージの破壊進捗"></progress>
   <div class="orbit-arena"><canvas id="breaker-canvas" width="360" height="500" tabindex="0" aria-label="Orbit Breakerの盤面。左右キーで移動、Spaceで発射、Pで一時停止、Fでフォーカス。" aria-describedby="breaker-instructions"></canvas>
    <div class="orbit-countdown" id="breaker-countdown" role="status" aria-label="再開カウントダウン" hidden></div>
    <div class="orbit-panel" id="breaker-panel"><small>ORBIT FLIGHT CONTROL</small><h2 id="breaker-panel-title"></h2><p id="breaker-panel-copy"></p><p id="breaker-panel-detail"></p><button data-action="breakerToggle" id="breaker-panel-button">フライトを開始</button></div>
   </div>
   <div class="orbit-focus"><progress id="breaker-energy" value="0" max="100" aria-label="フォーカスのチャージ"></progress><button data-action="breakerFocus" id="breaker-focus">FOCUS 0%</button></div>
   <label class="orbit-aim" for="breaker-angle">発射角 <input id="breaker-angle" type="range" min="-55" max="55" step="1" value="18"><output id="breaker-angle-value" for="breaker-angle">+18°</output></label>
   <div class="arc-primary-controls"><button data-action="breakerToggle" id="breaker-toggle">開始</button><button data-action="breakerLaunch" id="breaker-launch">発射</button><button data-action="breakerRestart">リセット</button></div>
   <div class="orbit-steer"><button data-orbit-steer="left" aria-label="パドルを左へ移動">← 左へ</button><button data-orbit-steer="right" aria-label="パドルを右へ移動">右へ →</button></div>
   <div class="orbit-effects" id="breaker-effects"></div><p class="orbit-status" id="breaker-status" role="status" aria-live="polite"></p>
   <details class="orbit-missions"><summary id="breaker-mission-summary">セクターミッション</summary>${['hits','combo','collect'].map(id=>`<div><span id="breaker-mission-${id}"></span><small id="breaker-reward-${id}"></small></div>`).join('')}<p>達成ごとに加点とFOCUS +20。落球なしでクリアすると追加ボーナス。</p></details>
   <p class="orbit-instructions" id="breaker-instructions">ドラッグ / ← →：移動 · Space：開始 / 発射<br>P：一時停止 · F：フォーカス（4秒スロー）<br>発射角は発射前に調整。Nブロックは周囲にダメージ。</p>
   <details class="orbit-records"><summary>フライト記録と保存について</summary><p id="breaker-record"></p><p>難易度別の記録と設定は端末内に保存。進行は10秒ごと・停止時・区切りで保存し、再読み込み後は停止状態から続けられます。保存枠は1つです。ゲーム一覧のBESTは旧記録を含む全難易度の最高点です。</p></details>`,iconButton('breakerHelp','遊び方','document'));
  const canvas=$('#breaker-canvas'),ctx=canvas.getContext('2d');
  if(!ctx){A.toast('このブラウザではCanvasを利用できません');return;}
  const ids=['score','best','lives','stage','combo','remaining','pattern','effects','status','toggle','focus','launch','energy','progress','angle','angle-value','panel','panel-title','panel-copy','panel-detail','panel-button','record','save-status','countdown','mission-summary',...['hits','combo','collect'].flatMap(id=>['mission-'+id,'reward-'+id])];
  const view=breakerView={canvas,ctx,nodes:Object.fromEntries(ids.map(id=>[id,$('#breaker-'+id)])),sprites:new Map(),background:null,scale:1,lastTone:0,wake:null};
  const content=canvas.closest('.arcade-play');content.dataset.cockpit=String(orbitPrefs.cockpit);
  let disposed=false,last=0,accumulator=0,hudClock=0,activePointer=null,saveClock=0;
  const fitArena=()=>{
   const available=Math.max(260,content.clientHeight-320);
   content.style.setProperty('--orbit-arena-width',Math.min(380,Math.floor(available*.72))+'px');
  };
  fitArena();
  view.clearInput=()=>{
   if(activePointer!==null&&canvas.hasPointerCapture(activePointer))canvas.releasePointerCapture(activePointer);
   activePointer=null;breakerKeys={left:false,right:false};
  };
  function frame(now){
   breakerFrame=0;if(disposed)return;
   const elapsed=last?Math.max(0,(now-last)/1000):0,dt=Math.min(.075,elapsed);last=now;
   if(elapsed>.25&&breaker.running)orbitPause('処理の中断を検出 · 再開で続ける');
   if(document.hidden||!$('#overlay').hidden){if(breaker.running)orbitPause('自動停止 · 再開で続ける');accumulator=0;}
   if(breaker.running){
    accumulator+=dt;let steps=0;
    while(accumulator>=1/120&&steps<9){breakerUpdate(1/120);accumulator-=1/120;steps++;}
   }else accumulator=0;
   drawBreaker(breaker.running?accumulator*120:1);
   hudClock+=dt;if(hudClock>=.1||!breaker.running){orbitHud();hudClock=0;}
   if(breaker.running){saveClock+=dt;if(saveClock>=10){saveClock=0;orbitSave();}}
   if(breaker.running&&!breakerFrame)breakerFrame=requestAnimationFrame(frame);
  }
  view.wake=()=>{
   if(disposed)return;
   orbitHud();
   if(!breakerFrame){last=0;accumulator=0;breakerFrame=requestAnimationFrame(frame);}
  };
  const aim=e=>{if(!breaker.running)return;const r=canvas.getBoundingClientRect();if(r.width>0){breaker.target=orbitClamp((e.clientX-r.left)*360/r.width,4+orbitWidth()/2,356-orbitWidth()/2);}};
  on(canvas,'pointerdown',e=>{
   if(!breaker.running||activePointer!==null||e.button!==0)return;
   e.preventDefault();activePointer=e.pointerId;canvas.focus({preventScroll:true});canvas.setPointerCapture(e.pointerId);aim(e);
   if(!breaker.launched){breaker.paddle=breaker.target;breaker.previousPaddle=breaker.paddle;breaker.ball.x=breaker.ball.px=breaker.paddle;orbitLaunch();}
  });
  on(canvas,'pointermove',e=>{if(e.pointerId===activePointer||(activePointer===null&&e.pointerType==='mouse'))aim(e);});
  const release=e=>{if(e.pointerId===activePointer)activePointer=null;};
  on(canvas,'pointerup',release);on(canvas,'pointercancel',release);on(canvas,'lostpointercapture',release);
  for(const button of A.$$('[data-orbit-steer]')){
   const direction=button.dataset.orbitSteer;
   on(button,'pointerdown',e=>{if(!breaker.running)return;e.preventDefault();button.setPointerCapture(e.pointerId);breakerKeys[direction]=true;});
   for(const event of ['pointerup','pointercancel','lostpointercapture'])on(button,event,()=>{breakerKeys[direction]=false;});
   on(button,'click',e=>{if(e.detail===0&&breaker.running){breaker.target+=direction==='left'?-28:28;orbitWake();}});
  }
  keys(e=>{
   if(e.ctrlKey||e.metaKey||e.altKey||e.isComposing||e.target.closest('[contenteditable]'))return;
   if(e.code==='Space'&&e.target.closest('button'))return;
   if(e.key==='ArrowLeft'||e.key==='ArrowRight'){e.preventDefault();if(breaker.running)breakerKeys[e.key==='ArrowLeft'?'left':'right']=true;return;}
   if(['Space','KeyP','KeyF'].includes(e.code)){e.preventDefault();if(e.repeat)return;
    if(e.code==='Space')breaker.running?orbitLaunch():A.actions.breakerToggle();
    if(e.code==='KeyP')A.actions.breakerToggle();if(e.code==='KeyF')A.actions.breakerFocus();
   }
  });
  on(document,'keyup',e=>{if(e.key==='ArrowLeft')breakerKeys.left=false;if(e.key==='ArrowRight')breakerKeys.right=false;});
  on(window,'blur',()=>orbitPause('自動停止 · 再開で続ける'));
  on(document,'visibilitychange',()=>{if(document.hidden)orbitPause('自動停止 · 再開で続ける');});
  on(window,'pagehide',()=>{orbitPause();orbitSave();});
  const overlayObserver=new MutationObserver(()=>{if(!$('#overlay').hidden)orbitPause();});
  overlayObserver.observe($('#overlay'),{attributes:true,attributeFilter:['hidden']});
  const resize=()=>{if(disposed||breakerView!==view)return;fitArena();orbitResize();orbitWake();};
  view.resize=resize;
  let observer=null;
  if(window.ResizeObserver){observer=new ResizeObserver(resize);observer.observe(canvas);observer.observe(content);}
  on(window,'resize',resize);
  on(orbitMotionQuery,'change',()=>orbitWake());
  on($('#breaker-angle'),'input',e=>{if(!breaker.launched&&!breaker.over){breaker.angle=orbitClamp(Number(e.target.value),-55,55);orbitWake();}});
  on($('#breaker-mode'),'change',e=>{
   const mode=e.target.value;e.target.value=breaker.mode;if(!Object.hasOwn(orbitModes,mode)||mode===breaker.mode)return;
   orbitPause();A.confirm('難易度を変更？','現在のフライトを終了して新しく開始します。記録は難易度ごとに保存します。',()=>{
    orbitSave();orbitPrefs.mode=mode;A.save('breakerPreferences',orbitPrefs);resetBreaker(mode);orbitSave();$('#breaker-mode').value=mode;orbitWake();
   });
  });
  on($('#breaker-quality'),'change',e=>{orbitPrefs.quality=e.target.value==='light'?'light':'high';A.save('breakerPreferences',orbitPrefs);view.background=null;resize();});
  disposers.push(()=>{
   disposed=true;view.clearInput();cancelAnimationFrame(breakerFrame);breakerFrame=0;observer?.disconnect();overlayObserver.disconnect();
   breaker.running=false;breakerKeys={left:false,right:false};orbitSave();breakerView=null;
   if(breakerAudio){breakerAudio.close().catch(()=>{});breakerAudio=null;}
  });
  orbitResize();orbitHud();drawBreaker();
 }
 A.actions.breakerToggle=()=>{
  if(!breakerView)return;
  if(breaker.over){orbitSave();resetBreaker(breaker.mode);orbitSave();}
  if(breaker.running)orbitPause();else{breaker.restored=false;breaker.countdown=breaker.launched?3:0;breaker.running=true;orbitMessage(breaker.launched?'フライト再開':'発射ボタン / Space / 盤面タップで発射');orbitTone(360);orbitWake();}
 };
 A.actions.breakerLaunch=orbitLaunch;
 A.actions.breakerFocus=()=>{
  const b=breaker;if(!b||!b.running||!b.launched||b.energy<100||b.focus>0)return;
  if(b.countdown>0)return;
  b.energy=0;b.focus=4;orbitMessage('FOCUS · 4秒間のスローモーション');orbitTone(600);orbitWake();
 };
 A.actions.breakerRestart=()=>{if(!breakerView)return;orbitPause();A.confirm('新しいフライト？','現在の進行をリセットします。ベスト記録は残ります。',()=>{orbitSave();resetBreaker(breaker.mode);orbitSave();orbitWake();});};
 A.actions.breakerSave=()=>{if(!breakerView)return;orbitPause();orbitSave();orbitWake();};
 A.actions.breakerCockpit=()=>{
  if(!breakerView)return;orbitPause();orbitPrefs.cockpit=!orbitPrefs.cockpit;A.save('breakerPreferences',orbitPrefs);
  const content=breakerView.canvas.closest('.arcade-play');content.dataset.cockpit=String(orbitPrefs.cockpit);content.scrollTop=0;
  const button=$('#breaker-cockpit');button.textContent=orbitPrefs.cockpit?'通常表示':'盤面重視';button.setAttribute('aria-pressed',String(orbitPrefs.cockpit));breakerView.resize();
 };
 A.actions.breakerSound=()=>{orbitPrefs.sound=!orbitPrefs.sound;A.save('breakerPreferences',orbitPrefs);const button=$('#breaker-sound');if(button){button.textContent='音 '+(orbitPrefs.sound?'ON':'OFF');button.setAttribute('aria-pressed',String(orbitPrefs.sound));}if(orbitPrefs.sound)orbitTone(540);};
 A.actions.breakerHelp=()=>{orbitPause();help('Orbit Breaker',
  '<strong>操作</strong><br>開始 → 発射。ドラッグ・マウス・左右キー・左右ボタンで移動。発射前は角度を調整できます。Spaceで開始/発射、Pで一時停止、FでFOCUS。パドル端で斜め、中央で上向きに反射します。<br><br>'+ 
  '<strong>スコアとステージ</strong><br>パドルに戻るまでの連続ヒット5回ごとに倍率アップ（最大5倍）。耐久ブロックの点（N付きは数字）が残り耐久、Nは周囲にダメージを与えるノヴァ。6種類の配置が巡回し、速度・耐久が段階的に上がります。3ステージクリアごとに残機+1（最大7）。<br><br>'+ 
  '<strong>強化とFOCUS</strong><br>7個破壊ごとにW（ワイド14秒）、T（スロー9秒）、S（落球防止1回、最大2回）が順番に落下。パドルで取得します。ヒットでチャージが100%になったらFOCUSで4秒間スロー。Tとの減速は重複しません。強化の残り秒数はボール飛行中のみ進みます。<br><br>'+ 
  '<strong>難易度・保存</strong><br>リラックスは5機・広いパドル、標準は3機、エキスパートは高速・狭いパドル。加点係数は順に1 / 1.5 / 2倍。モード別最高点・到達ステージ・最大連続ヒット、設定を端末に保存。盤面・残機・強化・ミッションは10秒ごとと停止時に1枠へ保存。再読み込み後は停止状態で復元し、飛行中なら再開時に3秒カウントダウンします。不正な保存データは新規開始へ戻します。<br><br>'+ 
  '<strong>ミッションと操作</strong><br>各セクターで12ヒット、8連続ヒット、アイテム2個回収を目指します。達成ごとに加点とFOCUS +20。落球なしのクリアには追加得点。「盤面重視」で装飾を畳み、「通常表示」で設定・記録へ戻れます。発射ガイドは最初のブロックまでの軌道を壁反射込みで表示します。<br><br>'+
  '<strong>表示と中断</strong><br>高画質/軽量を選択可能。「動きを減らす」では背景移動・軌跡・破片を抑えます。別タブ・ヘルプ・画面移動時は停止し、自動では再開しません。音は初期OFFでauraのサウンド・音量にも従います。');};

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
