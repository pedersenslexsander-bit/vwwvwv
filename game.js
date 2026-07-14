const STONES = [
  {name:'Gråstein', value:10, file:'gray-rock.svg'},
  {name:'Granitt', value:28, file:'granite.svg'},
  {name:'Jernmalm', value:75, file:'iron-ore.svg'},
  {name:'Kobbermalm', value:190, file:'copper-ore.svg'},
  {name:'Gullklump', value:480, file:'gold-nugget.svg'},
  {name:'Smaragd', value:1250, file:'emerald.svg'},
  {name:'Safir', value:3300, file:'sapphire.svg'},
  {name:'Rubin', value:8500, file:'ruby.svg'},
  {name:'Ametyst', value:22000, file:'amethyst.svg'},
  {name:'Diamant', value:60000, file:'diamond.svg'},
  {name:'Meteoritt', value:175000, file:'meteorite.svg'},
  {name:'Kosmisk kjerne', value:600000, file:'cosmic-core.svg'}
];
const CRATES = [
  {name:'Vanlig', file:'crate-common.svg', bonus:0},
  {name:'Sjelden', file:'crate-rare.svg', bonus:1},
  {name:'Episk', file:'crate-epic.svg', bonus:2},
  {name:'Legendarisk', file:'crate-legendary.svg', bonus:3}
];
const SAVE_KEY='stoneMergeDeluxeSaveV1';
const els={
  board:document.getElementById('board'),coins:document.getElementById('coins'),bestStone:document.getElementById('bestStone'),prestige:document.getElementById('prestige'),presses:document.getElementById('presses'),pressMeter:document.getElementById('pressMeter'),spawnButton:document.getElementById('spawnButton'),sellSelected:document.getElementById('sellSelected'),clearSelection:document.getElementById('clearSelection'),autoMerge:document.getElementById('autoMerge'),missions:document.getElementById('missions'),missionReward:document.getElementById('missionReward'),collection:document.getElementById('collection'),discoveredCount:document.getElementById('discoveredCount'),toast:document.getElementById('toast'),prestigeButton:document.getElementById('prestigeButton'),resetButton:document.getElementById('resetButton'),luckCost:document.getElementById('luckCost'),valueCost:document.getElementById('valueCost'),crateCost:document.getElementById('crateCost')
};
let state={
  cells:Array(16).fill(null), coins:0, presses:0, selected:null, best:0, prestige:0,
  upgrades:{luck:0,value:0,crate:0}, discovered:[0], stats:{merges:0,sells:0,crates:0},
  missions:[
    {type:'merge',label:'Slå sammen 6 steiner',goal:6,progress:0,reward:250},
    {type:'sell',label:'Selg 5 steiner',goal:5,progress:0,reward:300},
    {type:'crate',label:'Åpne 8 kasser',goal:8,progress:0,reward:350}
  ]
};
let dragged=null;
function asset(path){return `assets/${path}`}
function save(){localStorage.setItem(SAVE_KEY,JSON.stringify(state))}
function load(){
  const raw=localStorage.getItem(SAVE_KEY); if(!raw)return;
  try{const parsed=JSON.parse(raw);state={...state,...parsed};if(!Array.isArray(state.cells)||state.cells.length!==16)state.cells=Array(16).fill(null)}catch{}
}
function toast(text){els.toast.textContent=text;els.toast.classList.add('show');clearTimeout(toast.timer);toast.timer=setTimeout(()=>els.toast.classList.remove('show'),1600)}
function money(n){return new Intl.NumberFormat('no-NO').format(Math.floor(n))}
function saleValue(level){return Math.floor(STONES[level].value*(1+state.upgrades.value*.18)*(1+state.prestige*.1))}
function firstEmpty(){return state.cells.findIndex(v=>v===null)}
function randomRarity(){
  const luck=state.upgrades.luck*.025+state.prestige*.01, r=Math.random();
  if(r<.02+luck*.25)return 3;if(r<.10+luck*.55)return 2;if(r<.31+luck)return 1;return 0
}
function addMissionProgress(type,amount=1){
  state.missions.forEach(m=>{if(m.type===type&&m.progress<m.goal){m.progress=Math.min(m.goal,m.progress+amount);if(m.progress>=m.goal){state.coins+=m.reward;toast(`Oppdrag fullført: +${money(m.reward)} mynter`);m.progress=0;m.goal=Math.ceil(m.goal*1.45);m.reward=Math.ceil(m.reward*1.35);m.label=missionLabel(m.type,m.goal)}}})
}
function missionLabel(type,goal){return type==='merge'?`Slå sammen ${goal} steiner`:type==='sell'?`Selg ${goal} steiner`:`Åpne ${goal} kasser`}
function makeCrate(){
  const empty=firstEmpty();if(empty<0)return toast('Brettet er fullt');
  const rarity=randomRarity();state.cells[empty]={kind:'crate',rarity};state.presses=0;render();toast(`${CRATES[rarity].name} kasse landet på brettet!`)
}
function openCrate(index){
  const item=state.cells[index];if(!item||item.kind!=='crate')return;
  const maxStart=Math.min(4,state.upgrades.crate+CRATES[item.rarity].bonus);
  let level=0;
  const roll=Math.random();
  if(roll<.06+state.upgrades.luck*.02)level=Math.min(maxStart+1,STONES.length-1);
  else if(roll<.34)level=Math.min(maxStart,STONES.length-1);
  else level=Math.max(0,maxStart-1);
  state.cells[index]={kind:'stone',level};
  state.best=Math.max(state.best,level);if(!state.discovered.includes(level))state.discovered.push(level);
  state.stats.crates++;addMissionProgress('crate');render();toast(`Kassen inneholdt ${STONES[level].name}`)
}
function selectStone(index){
  const item=state.cells[index];if(!item||item.kind!=='stone')return;
  state.selected=state.selected===index?null:index;render()
}
function sellStone(index){
  const item=state.cells[index];if(!item||item.kind!=='stone')return;
  const value=saleValue(item.level);state.coins+=value;state.cells[index]=null;state.selected=null;state.stats.sells++;addMissionProgress('sell');render();toast(`Solgt for ${money(value)} mynter`)
}
function moveOrMerge(from,to){
  if(from===null||from===to)return;const a=state.cells[from],b=state.cells[to];if(!a)return;
  if(!b){state.cells[to]=a;state.cells[from]=null;state.selected=to;render();return}
  if(a.kind==='stone'&&b.kind==='stone'&&a.level===b.level){
    if(a.level>=STONES.length-1)return toast('Dette er allerede den beste steinen');
    const next=a.level+1;state.cells[to]={kind:'stone',level:next};state.cells[from]=null;state.selected=to;state.best=Math.max(state.best,next);state.stats.merges++;if(!state.discovered.includes(next))state.discovered.push(next);addMissionProgress('merge');render();toast(`Ny stein: ${STONES[next].name}`)
  }else toast('Bare to like steiner kan slås sammen')
}
function renderBoard(){
  els.board.innerHTML='';state.cells.forEach((item,index)=>{
    const cell=document.createElement('div');cell.className='cell';cell.dataset.index=index;
    cell.addEventListener('dragover',e=>{e.preventDefault();cell.classList.add('drop-target')});cell.addEventListener('dragleave',()=>cell.classList.remove('drop-target'));cell.addEventListener('drop',e=>{e.preventDefault();cell.classList.remove('drop-target');moveOrMerge(dragged,index)});
    if(item){
      const piece=document.createElement('div');piece.className='piece';piece.draggable=true;piece.addEventListener('dragstart',()=>dragged=index);piece.addEventListener('dragend',()=>dragged=null);
      if(item.kind==='crate'){
        piece.classList.add('crate-piece');piece.innerHTML=`<img src="${asset('ui/'+CRATES[item.rarity].file)}" alt="${CRATES[item.rarity].name} kasse"><span class="piece-label">Trykk for å åpne</span><span class="rarity">${CRATES[item.rarity].name}</span>`;piece.addEventListener('click',()=>openCrate(index));
      }else{
        if(state.selected===index)piece.classList.add('selected');piece.innerHTML=`<img src="${asset('stones/'+STONES[item.level].file)}" alt="${STONES[item.level].name}"><span class="piece-label">${STONES[item.level].name}</span>`;piece.addEventListener('click',()=>selectStone(index));piece.addEventListener('dblclick',()=>sellStone(index));
      }
      cell.appendChild(piece)
    }
    els.board.appendChild(cell)
  })
}
function renderMissions(){
  els.missions.innerHTML=state.missions.map(m=>`<div class="mission"><div class="mission-top"><span>${m.label}</span><b>${m.progress}/${m.goal}</b></div><div class="mission-bar"><span style="width:${Math.min(100,m.progress/m.goal*100)}%"></span></div></div>`).join('');
  els.missionReward.textContent=`+${money(state.missions[0].reward)}`
}
function renderCollection(){
  els.collection.innerHTML=STONES.map((s,i)=>`<div class="collection-item ${state.discovered.includes(i)?'':'locked'}" title="${s.name}"><img src="${asset('stones/'+s.file)}" alt="${s.name}"><span>${i+1}</span></div>`).join('');els.discoveredCount.textContent=`${state.discovered.length}/${STONES.length}`
}
function render(){
  renderBoard();renderMissions();renderCollection();els.coins.textContent=money(state.coins);els.bestStone.textContent=STONES[state.best].name;els.prestige.textContent=state.prestige;els.presses.textContent=state.presses;els.pressMeter.style.width=`${state.presses/5*100}%`;els.sellSelected.disabled=state.selected===null;els.luckCost.textContent=money(300*Math.pow(2,state.upgrades.luck));els.valueCost.textContent=money(450*Math.pow(2,state.upgrades.value));els.crateCost.textContent=money(900*Math.pow(2,state.upgrades.crate));save()
}
els.spawnButton.addEventListener('click',()=>{state.presses++;if(state.presses>=5)makeCrate();else render()});
els.sellSelected.addEventListener('click',()=>{if(state.selected!==null)sellStone(state.selected)});els.clearSelection.addEventListener('click',()=>{state.selected=null;render()});
els.autoMerge.addEventListener('click',()=>{
  document.querySelectorAll('.cell').forEach(c=>c.classList.remove('hint'));
  for(let i=0;i<state.cells.length;i++){const a=state.cells[i];if(!a||a.kind!=='stone')continue;for(let j=i+1;j<state.cells.length;j++){const b=state.cells[j];if(b&&b.kind==='stone'&&a.level===b.level){document.querySelector(`[data-index="${i}"]`).classList.add('hint');document.querySelector(`[data-index="${j}"]`).classList.add('hint');return toast('Disse to kan slås sammen')}}}toast('Ingen mulige merges akkurat nå')
});
document.querySelectorAll('[data-shop]').forEach(btn=>btn.addEventListener('click',()=>{
  const type=btn.dataset.shop,base={luck:300,value:450,crate:900}[type],cost=Math.floor(base*Math.pow(2,state.upgrades[type]));if(state.coins<cost)return toast('Ikke nok mynter');state.coins-=cost;state.upgrades[type]++;render();toast('Oppgradering kjøpt')
}));
els.prestigeButton.addEventListener('click',()=>{
  if(state.best<9)return toast('Du må lage minst en diamant først');
  if(!confirm('Prestisje nullstiller brettet og mynter, men gir permanent bonus. Fortsette?'))return;
  state.prestige++;state.cells=Array(16).fill(null);state.coins=0;state.presses=0;state.selected=null;state.best=0;state.upgrades={luck:0,value:0,crate:0};render();toast('Prestisje aktivert!')
});
els.resetButton.addEventListener('click',()=>{if(confirm('Nullstille hele spillet?')){localStorage.removeItem(SAVE_KEY);location.reload()}});
load();render();
