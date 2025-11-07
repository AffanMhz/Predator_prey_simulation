// --- utility and UI wiring ---
const $ = id => document.getElementById(id);
['gridSize','pPrey','pPred','gGrow','starve','fps'].forEach(id=>{
  $(id).addEventListener('input',()=>{ $(id+'Val').textContent = $(id).value; if(id==='fps') draw(); });
});
$('gridSize').addEventListener('input',()=>{ GRID_SIZE = +$('gridSize').value; resetGrid(); });

// --- simplified grid model ---
let GRID_SIZE = +$('gridSize').value;
let EMPTY=0, GRASS=1, RABBIT=2, FOX=3;
let grid=[], foxEnergy=[];
let generation=0, running=false, last=Date.now();
let populationHistory = {rabbits:[],foxes:[],grass:[]};
const MAX_HISTORY = 2000;

function initGrid(){
  grid = Array.from({length:GRID_SIZE},()=>Array(GRID_SIZE).fill(EMPTY));
  foxEnergy = Array.from({length:GRID_SIZE},()=>Array(GRID_SIZE).fill(0));
  for(let i=0;i<GRID_SIZE;i++)for(let j=0;j<GRID_SIZE;j++) if(Math.random()<0.5) grid[i][j]=GRASS;
  for(let k=0;k<GRID_SIZE*2;k++){grid[Math.floor(Math.random()*GRID_SIZE)][Math.floor(Math.random()*GRID_SIZE)]=RABBIT}
  for(let k=0;k<GRID_SIZE/2;k++){let x=Math.floor(Math.random()*GRID_SIZE),y=Math.floor(Math.random()*GRID_SIZE);grid[x][y]=FOX;foxEnergy[x][y]=+$('starve').value}
  generation=0; populationHistory={rabbits:[],foxes:[],grass:[]};
}
initGrid();

// Canvas setup
const gC = $('gridCanvas'), gctx = gC.getContext('2d');
const tC = $('timeCanvas'), tctx = tC.getContext('2d');
const pC = $('phaseCanvas'), pctx = pC.getContext('2d');
function resize(){ [gC,tC,pC].forEach(c=>{c.width=c.offsetWidth; c.height=c.offsetHeight;}); draw(); }
window.addEventListener('resize',resize); resize();

function draw(){ drawGrid(); drawTime(); drawPhase(); }
function drawGrid(){ gctx.clearRect(0,0,gC.width,gC.height); const cell = Math.min(gC.width,gC.height)/GRID_SIZE; for(let i=0;i<GRID_SIZE;i++)for(let j=0;j<GRID_SIZE;j++){ switch(grid[i][j]){case GRASS: gctx.fillStyle='#8BC34A'; break; case RABBIT: gctx.fillStyle='#FFB74D'; break; case FOX: gctx.fillStyle='#E57373'; break; default: gctx.fillStyle='#f0f4f8'} gctx.fillRect(i*cell,j*cell,Math.ceil(cell),Math.ceil(cell)); }}

function drawTime(){ tctx.clearRect(0,0,tC.width,tC.height); tctx.fillStyle='#f8fafc'; tctx.fillRect(0,0,tC.width,tC.height); tctx.fillStyle='#475569'; tctx.fillText('Rabbits',8,14); if(populationHistory.rabbits.length>1){ let max=Math.max(...populationHistory.rabbits,1); let stepX=tC.width/populationHistory.rabbits.length; tctx.strokeStyle='#FFB74D'; tctx.lineWidth=2; tctx.beginPath(); for(let i=0;i<populationHistory.rabbits.length;i++){ let x=i*stepX, y=tC.height- (populationHistory.rabbits[i]/max)*tC.height; if(i===0) tctx.moveTo(x,y); else tctx.lineTo(x,y);} tctx.stroke(); } }

function drawPhase(){ pctx.clearRect(0,0,pC.width,pC.height); pctx.fillStyle='#f8fafc'; pctx.fillRect(0,0,pC.width,pC.height); if(populationHistory.rabbits.length<10) return; let maxR = Math.max(...populationHistory.rabbits), maxF=Math.max(...populationHistory.foxes); pctx.strokeStyle='#8b5cf6'; pctx.lineWidth=2; pctx.beginPath(); for(let i=0;i<populationHistory.rabbits.length;i++){ let x=(populationHistory.rabbits[i]/maxR)*pC.width, y=pC.height - (populationHistory.foxes[i]/maxF)*pC.height; if(i===0) pctx.moveTo(x,y); else pctx.lineTo(x,y);} pctx.stroke(); }

function neighbors(i,j){ const out=[]; for(let dx=-1;dx<=1;dx++)for(let dy=-1;dy<=1;dy++)if(!(dx===0&&dy===0)){let ni=(i+dx+GRID_SIZE)%GRID_SIZE,nj=(j+dy+GRID_SIZE)%GRID_SIZE;out.push([ni,nj]);} return out; }

function stepGrid(){ const newG = grid.map(r=>r.slice()), newE = foxEnergy.map(r=>r.slice()); const pR = +$('pPrey').value/100, pF = +$('pPred').value/100, g = +$('gGrow').value/100, starve = +$('starve').value;
 for(let i=0;i<GRID_SIZE;i++)for(let j=0;j<GRID_SIZE;j++) if(grid[i][j]===EMPTY && Math.random()<g) newG[i][j]=GRASS;
 for(let i=0;i<GRID_SIZE;i++)for(let j=0;j<GRID_SIZE;j++) if(grid[i][j]===RABBIT){ let n=neighbors(i,j); let eaten=false; for(let [ni,nj] of n){ if(grid[ni][nj]===FOX && Math.random()<0.2){ eaten=true; newG[i][j]=EMPTY; break; }} if(!eaten){ if(Math.random()<pR){ let empt=n.filter(([a,b])=> newG[a][b]===EMPTY||newG[a][b]===GRASS); if(empt.length){ let [a,b]=empt[Math.floor(Math.random()*empt.length)]; newG[a][b]=RABBIT; }} let empt2=n.filter(([a,b])=> newG[a][b]===EMPTY||newG[a][b]===GRASS); if(empt2.length && Math.random()<0.8){ let [a,b]=empt2[Math.floor(Math.random()*empt2.length)]; if(newG[a][b]!==RABBIT){ newG[a][b]=RABBIT; newG[i][j]=EMPTY; } } }} }
 for(let i=0;i<GRID_SIZE;i++)for(let j=0;j<GRID_SIZE;j++) if(grid[i][j]===FOX){ newE[i][j] = (newE[i][j]||foxEnergy[i][j]) - 1; if(newE[i][j]<=0){ newG[i][j]=EMPTY; newE[i][j]=0; } else { let n=neighbors(i,j); let rabbits=n.filter(([a,b])=> newG[a][b]===RABBIT); if(rabbits.length){ let [a,b]=rabbits[Math.floor(Math.random()*rabbits.length)]; newG[a][b]=FOX; newE[a][b]=starve; newG[i][j]=EMPTY; if(Math.random()<pF*0.5){ newG[i][j]=FOX; newE[i][j]=Math.floor(starve*0.7); } } else { let empt=n.filter(([a,b])=> newG[a][b]===EMPTY||newG[a][b]===GRASS); if(empt.length && Math.random()<0.6){ let [a,b]=empt[Math.floor(Math.random()*empt.length)]; newG[a][b]=FOX; newE[a][b]=newE[i][j]; newG[i][j]=EMPTY; newE[i][j]=0; } } } }
 grid=newG; foxEnergy=newE; generation++; updateStats();
}

function updateStats(){
  let rc=0,fc=0,gc=0;
  for(let i=0;i<GRID_SIZE;i++)for(let j=0;j<GRID_SIZE;j++){
    if(grid[i][j]===RABBIT) rc++; else if(grid[i][j]===FOX) fc++; else if(grid[i][j]===GRASS) gc++;
  }
  populationHistory.rabbits.push(rc);
  populationHistory.foxes.push(fc);
  populationHistory.grass.push(gc);
  if(populationHistory.rabbits.length>MAX_HISTORY){
    for(let k=0;k<3;k++) populationHistory[Object.keys(populationHistory)[k]].shift();
  }
  $('stats').innerText = `Gen ${generation} — R=${rc} F=${fc} G=${gc}`;
}

// animation
function loop(){
  if(!running) return;
  const now=Date.now();
  const dt = 1000 / (+$('fps').value);
  if(now-last>dt){ stepGrid(); draw(); last=now; }
  requestAnimationFrame(loop);
}

$('start').addEventListener('click',()=>{ running=!running; if(running) loop(); });
$('reset').addEventListener('click',()=>{ resetGrid(); });
$('export').addEventListener('click',()=>{ exportCSV(); });

function resetGrid(){ initGrid(); draw(); }

function exportCSV(){
  let csv='gen,rabbits,foxes,grass\n';
  for(let i=0;i<populationHistory.rabbits.length;i++) csv += `${i},${populationHistory.rabbits[i]},${populationHistory.foxes[i]},${populationHistory.grass[i]}\n`;
  const blob=new Blob([csv],{type:'text/csv'});
  const url=URL.createObjectURL(blob);
  const a=document.createElement('a');
  a.href=url;
  a.download='pop_history.csv';
  a.click();
  URL.revokeObjectURL(url);
}

// --- analytic calculations ---
function computeAnalytic(){
  const pR = +$('pPrey').value/100;
  const dt = 1 / (+$('fps').value);
  const alpha = Math.log(1+pR)/dt;
  const pF = +$('pPred').value/100;
  const gamma = 1 / (+$('starve').value * dt);
  const out = document.createElement('div');
  out.innerHTML = `<pre class='muted'>Estimated continuous rates (heuristic):\nα ≈ ${alpha.toFixed(4)}  (prey intrinsic growth rate)\nγ ≈ ${gamma.toFixed(4)}  (predator mortality rate)\n(β, δ estimated via data fitting)</pre>`;
  $('analyticOut').innerHTML='';
  $('analyticOut').appendChild(out);
  // equilibrium formulas:
  out.appendChild(document.createElement('div'));
  const eq = document.createElement('pre');
  eq.textContent = `LV equilibrium formulas:\nR* = γ / δ\nF* = α / β\nJacobian at (R*,F*) has trace = 0 and det = α γ - (β δ) R* F* (see analytic notes)`;
  $('analyticOut').appendChild(eq);
}
$('calcAnalytic').addEventListener('click',computeAnalytic);

// estimators + coarse search
$('estimateParams').addEventListener('click',()=>{
  if(populationHistory.rabbits.length<20){
    alert('Run simulation for a bit (≥20 steps) to estimate.');
    return;
  }
  const res = estimateParams(); displayEstimates(res);
});

function estimateParams(){
  const R = populationHistory.rabbits.slice(-200),
        F = populationHistory.foxes.slice(-200);
  const t = R.map((_,i)=>i*(1/+$('fps').value));
  // estimate alpha from segments where F is small
  const Fth = percentile(F,0.3);
  let idxs = F.map((v,i)=> v<=Fth ? i : -1).filter(i=>i>=0);
  if(idxs.length<3) idxs = [...Array(Math.min(R.length,10)).keys()];
  const lr = linearRegression(idxs.map(i=>t[i]), idxs.map(i=>Math.log(Math.max(R[i],1))));
  const alphaEst = lr.slope;
  // estimate gamma from times when R is small
  const Rth = percentile(R,0.3);
  let idxsf = R.map((v,i)=> v<=Rth ? i : -1).filter(i=>i>=0);
  if(idxsf.length<3) idxsf = [...Array(Math.min(F.length,10)).keys()];
  const lg = linearRegression(idxsf.map(i=>t[i]), idxsf.map(i=>Math.log(Math.max(F[i],1))));
  const gammaEst = -lg.slope;

  const betaCandidates = linspace(0.0001,0.01,25);
  const deltaCandidates = linspace(0.0001,0.01,25);
  let best={err:1e99,beta:0,delta:0};
  for(let b of betaCandidates) for(let d of deltaCandidates){
    const sim = simulateLV(alphaEst,b,d,gammaEst,R[0],F[0],t.length*(1/+$('fps').value),t.length);
    const err = mse(sim.R.slice(0,t.length), R) + mse(sim.F.slice(0,t.length), F);
    if(err<best.err){ best={err,beta:b,delta:d}; }
  }
  return {alpha:alphaEst,gamma:gammaEst,beta:best.beta,delta:best.delta};
}

function displayEstimates(res){
  const out = `Estimates:\nα = ${res.alpha.toFixed(5)}  γ = ${res.gamma.toFixed(5)}\nβ ≈ ${res.beta.toExponential(2)}  δ ≈ ${res.delta.toExponential(2)}\n(Use these in LV ODE to compare with grid.)`;
  $('analyticOut').innerText = out;
}

function percentile(arr,p){
  const s=[...arr].sort((a,b)=>a-b);
  const idx=Math.floor(p*(s.length-1));
  return s[Math.max(0,idx)];
}
function linspace(a,b,n){ const out=[]; for(let i=0;i<n;i++) out.push(a + (b-a)*i/(n-1)); return out }
function linearRegression(x,y){
  const n=x.length; const mx=x.reduce((a,b)=>a+b,0)/n; const my=y.reduce((a,b)=>a+b,0)/n;
  let num=0,den=0; for(let i=0;i<n;i++){ num += (x[i]-mx)*(y[i]-my); den += (x[i]-mx)*(x[i]-mx);}
  const slope = num/den; const intercept = my - slope*mx; return {slope,intercept};
}
function mse(a,b){ let s=0; for(let i=0;i<a.length;i++) s += (a[i]-b[i])**2; return s/a.length; }

function simulateLV(alpha,beta,delta,gamma,R0,F0,Tsteps,N){
  const dt = Tsteps/N; let R=R0, F=F0; const Rarr=[], Farr=[];
  for(let i=0;i<N;i++){
    Rarr.push(R); Farr.push(F);
    const k1R = alpha*R - beta*R*F;
    const k1F = delta*R*F - gamma*F;
    const k2R = alpha*(R+0.5*dt*k1R) - beta*(R+0.5*dt*k1R)*(F+0.5*dt*k1F);
    const k2F = delta*(R+0.5*dt*k1R)*(F+0.5*dt*k1F) - gamma*(F+0.5*dt*k1F);
    const k3R = alpha*(R+0.5*dt*k2R) - beta*(R+0.5*dt*k2R)*(F+0.5*dt*k2F);
    const k3F = delta*(R+0.5*dt*k2R)*(F+0.5*dt*k2F) - gamma*(F+0.5*dt*k2F);
    const k4R = alpha*(R+dt*k3R) - beta*(R+dt*k3R)*(F+dt*k3F);
    const k4F = delta*(R+dt*k3R)*(F+dt*k3F) - gamma*(F+dt*k3F);
    R += dt*(k1R + 2*k2R + 2*k3R + k4R)/6;
    F += dt*(k1F + 2*k2F + 2*k3F + k4F)/6;
    if(R<0) R=0; if(F<0) F=0;
  }
  return {R:Rarr,F:Farr};
}

// --- initialization ---
draw();