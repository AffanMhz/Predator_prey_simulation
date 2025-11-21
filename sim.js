// Main script — defer initialization until DOM is ready
const $ = id => document.getElementById(id);

window.addEventListener('load', ()=>{
  // --- utility and UI wiring ---
  ['gridSize','pPrey','pPred','gGrow','starve','fps'].forEach(id=>{
    const el = $(id);
    if(!el) return;
    el.addEventListener('input',()=>{ const val = el.value; const lab = $(id+'Val'); if(lab) lab.textContent = val; if(id==='fps') safeDraw(); });
  });
  const gridSizeEl = $('gridSize');

  // --- simplified grid model ---
  let GRID_SIZE = gridSizeEl ? +gridSizeEl.value : 80;
  const EMPTY=0, GRASS=1, RABBIT=2, FOX=3;
  let grid=[], foxEnergy=[];
  let generation=0, running=false, last=Date.now();
  let populationHistory = {rabbits:[],foxes:[],grass:[]};
  const MAX_HISTORY = 2000;

  function initGrid(){
    GRID_SIZE = gridSizeEl ? +gridSizeEl.value : GRID_SIZE;
    grid = Array.from({length:GRID_SIZE},()=>Array(GRID_SIZE).fill(EMPTY));
    foxEnergy = Array.from({length:GRID_SIZE},()=>Array(GRID_SIZE).fill(0));
    for(let i=0;i<GRID_SIZE;i++) for(let j=0;j<GRID_SIZE;j++) if(Math.random()<0.45) grid[i][j]=GRASS;
    for(let k=0;k<Math.floor(GRID_SIZE*1.5);k++){ grid[Math.floor(Math.random()*GRID_SIZE)][Math.floor(Math.random()*GRID_SIZE)]=RABBIT }
    for(let k=0;k<Math.max(2,Math.floor(GRID_SIZE/4));k++){ let x=Math.floor(Math.random()*GRID_SIZE),y=Math.floor(Math.random()*GRID_SIZE); grid[x][y]=FOX; foxEnergy[x][y]=Number($('starve')?.value || 15) }
    generation=0; populationHistory={rabbits:[],foxes:[],grass:[]};
  }
  initGrid();

  // Canvas setup (with devicePixelRatio handling)
  const gC = $('gridCanvas'), tC = $('timeCanvas'), pC = $('phaseCanvas');
  if(!gC || !tC || !pC){ console.warn('Canvas elements missing'); return; }
  const gctx = gC.getContext('2d'), tctx = tC.getContext('2d'), pctx = pC.getContext('2d');

  function resize(){
    const dpr = window.devicePixelRatio || 1;
    [ [gC,gctx], [tC,tctx], [pC,pctx] ].forEach(([c,ctx])=>{
      const w = Math.max(1, Math.floor(c.clientWidth));
      const h = Math.max(1, Math.floor(c.clientHeight));
      c.width = Math.floor(w * dpr);
      c.height = Math.floor(h * dpr);
      ctx.setTransform(dpr,0,0,dpr,0,0);
    });
    safeDraw();
  }
  window.addEventListener('resize',resize);
  resize();

  function safeDraw(){ try{ draw(); }catch(e){ console.error('Draw error',e); }}

  function draw(){ drawGrid(); drawTime(); drawPhase(); }

  // Simple, readable color scheme and clearer drawing
  function drawGrid(){
    gctx.clearRect(0,0,gC.width,gC.height);
    const cell = Math.min(gC.clientWidth,gC.clientHeight)/GRID_SIZE;
    for(let i=0;i<GRID_SIZE;i++) for(let j=0;j<GRID_SIZE;j++){
      switch(grid[i][j]){
        case GRASS: gctx.fillStyle='#6DBA45'; break;
        case RABBIT: gctx.fillStyle='#F4A261'; break;
        case FOX: gctx.fillStyle='#E76F51'; break;
        default: gctx.fillStyle='#06202a';
      }
      gctx.fillRect(i*cell, j*cell, Math.ceil(cell), Math.ceil(cell));
    }
  }

  function drawTime(){
    tctx.clearRect(0,0,tC.width,tC.height);
    const w = tC.clientWidth, h = tC.clientHeight;
    const pad = 30;
    
    // Grid lines
    tctx.strokeStyle='#e8e8e8'; tctx.lineWidth=1;
    for(let i=0;i<=4;i++){
      const y = pad + (h-2*pad)*i/4;
      tctx.beginPath(); tctx.moveTo(pad,y); tctx.lineTo(w-10,y); tctx.stroke();
    }
    
    // Axes
    tctx.strokeStyle='#999'; tctx.lineWidth=1.5;
    tctx.beginPath();
    tctx.moveTo(pad, pad); tctx.lineTo(pad, h-pad);
    tctx.lineTo(w-10, h-pad);
    tctx.stroke();
    
    if(populationHistory.rabbits.length>1){
      const maxR = Math.max(...populationHistory.rabbits,1);
      const maxF = Math.max(...populationHistory.foxes,1);
      const maxPop = Math.max(maxR, maxF);
      const stepX = (w-pad-10) / populationHistory.rabbits.length;
      
      // Draw rabbits
      tctx.strokeStyle='#F4A261'; tctx.lineWidth=2; tctx.beginPath();
      for(let i=0;i<populationHistory.rabbits.length;i++){
        const x = pad + i*stepX;
        const y = h - pad - (populationHistory.rabbits[i]/maxPop)*(h-2*pad);
        if(i===0) tctx.moveTo(x,y); else tctx.lineTo(x,y);
      }
      tctx.stroke();
      
      // Draw foxes
      tctx.strokeStyle='#E76F51'; tctx.lineWidth=2; tctx.beginPath();
      for(let i=0;i<populationHistory.foxes.length;i++){
        const x = pad + i*stepX;
        const y = h - pad - (populationHistory.foxes[i]/maxPop)*(h-2*pad);
        if(i===0) tctx.moveTo(x,y); else tctx.lineTo(x,y);
      }
      tctx.stroke();
      
      // Y-axis label
      tctx.fillStyle='#666'; tctx.font='10px sans-serif'; tctx.textAlign='right';
      tctx.fillText(Math.round(maxPop), pad-5, pad+5);
      tctx.fillText('0', pad-5, h-pad+5);
    }
  }

  function drawPhase(){
    pctx.clearRect(0,0,pC.width,pC.height);
    if(populationHistory.rabbits.length<3) return;
    
    const w = pC.clientWidth, h = pC.clientHeight;
    const pad = 30;
    const maxR = Math.max(...populationHistory.rabbits,1), maxF = Math.max(...populationHistory.foxes,1);
    
    // Grid
    pctx.strokeStyle='#e8e8e8'; pctx.lineWidth=1;
    for(let i=0;i<=4;i++){
      const x = pad + (w-2*pad)*i/4, y = pad + (h-2*pad)*i/4;
      pctx.beginPath(); pctx.moveTo(pad,y); pctx.lineTo(w-pad,y); pctx.stroke();
      pctx.beginPath(); pctx.moveTo(x,pad); pctx.lineTo(x,h-pad); pctx.stroke();
    }
    
    // Axes
    pctx.strokeStyle='#999'; pctx.lineWidth=1.5;
    pctx.beginPath();
    pctx.moveTo(pad, pad); pctx.lineTo(pad, h-pad);
    pctx.lineTo(w-pad, h-pad);
    pctx.stroke();
    
    // Trajectory with gradient (older = lighter)
    const len = populationHistory.rabbits.length;
    for(let i=1;i<len;i++){
      const alpha = 0.3 + 0.7*(i/len);
      pctx.strokeStyle=`rgba(79, 111, 81, ${alpha})`;
      pctx.lineWidth = 1.5;
      pctx.beginPath();
      const x1 = pad + (populationHistory.rabbits[i-1]/maxR)*(w-2*pad);
      const y1 = h - pad - (populationHistory.foxes[i-1]/maxF)*(h-2*pad);
      const x2 = pad + (populationHistory.rabbits[i]/maxR)*(w-2*pad);
      const y2 = h - pad - (populationHistory.foxes[i]/maxF)*(h-2*pad);
      pctx.moveTo(x1,y1); pctx.lineTo(x2,y2); pctx.stroke();
    }
    
    // Current position marker
    if(len>0){
      const x = pad + (populationHistory.rabbits[len-1]/maxR)*(w-2*pad);
      const y = h - pad - (populationHistory.foxes[len-1]/maxF)*(h-2*pad);
      pctx.fillStyle='#E76F51';
      pctx.beginPath(); pctx.arc(x,y,4,0,2*Math.PI); pctx.fill();
    }
    
    // Axis labels
    pctx.fillStyle='#666'; pctx.font='10px sans-serif';
    pctx.textAlign='right';
    pctx.fillText(Math.round(maxF), pad-5, pad+5);
    pctx.fillText('0', pad-5, h-pad+5);
    pctx.textAlign='center';
    pctx.fillText(Math.round(maxR), w-pad, h-pad+15);
  }

  function neighbors(i,j){ const out=[]; for(let dx=-1;dx<=1;dx++) for(let dy=-1;dy<=1;dy++) if(!(dx===0&&dy===0)){ let ni=(i+dx+GRID_SIZE)%GRID_SIZE,nj=(j+dy+GRID_SIZE)%GRID_SIZE; out.push([ni,nj]); } return out; }

  function stepGrid(){
    const newG = grid.map(r=>r.slice()), newE = foxEnergy.map(r=>r.slice());
    const pR = Number($('pPrey')?.value||8)/100, pF = Number($('pPred')?.value||5)/100, g = Number($('gGrow')?.value||15)/100, starve = Number($('starve')?.value||15);
    for(let i=0;i<GRID_SIZE;i++) for(let j=0;j<GRID_SIZE;j++) if(grid[i][j]===EMPTY && Math.random()<g) newG[i][j]=GRASS;
    for(let i=0;i<GRID_SIZE;i++) for(let j=0;j<GRID_SIZE;j++) if(grid[i][j]===RABBIT){
      const n=neighbors(i,j); let eaten=false;
      for(const [ni,nj] of n) if(grid[ni][nj]===FOX && Math.random()<0.18){ eaten=true; newG[i][j]=EMPTY; break; }
      if(!eaten){ if(Math.random()<pR){ const empt=n.filter(([a,b])=> newG[a][b]===EMPTY||newG[a][b]===GRASS); if(empt.length){ const [a,b]=empt[Math.floor(Math.random()*empt.length)]; newG[a][b]=RABBIT; }} const empt2=n.filter(([a,b])=> newG[a][b]===EMPTY||newG[a][b]===GRASS); if(empt2.length && Math.random()<0.8){ const [a,b]=empt2[Math.floor(Math.random()*empt2.length)]; if(newG[a][b]!==RABBIT){ newG[a][b]=RABBIT; newG[i][j]=EMPTY; } } }
    }
    for(let i=0;i<GRID_SIZE;i++) for(let j=0;j<GRID_SIZE;j++) if(grid[i][j]===FOX){
      newE[i][j] = (newE[i][j]||foxEnergy[i][j]) - 1;
      if(newE[i][j]<=0){ newG[i][j]=EMPTY; newE[i][j]=0; }
      else {
        const n=neighbors(i,j);
        const rabbits=n.filter(([a,b])=> newG[a][b]===RABBIT);
        if(rabbits.length){ const [a,b]=rabbits[Math.floor(Math.random()*rabbits.length)]; newG[a][b]=FOX; newE[a][b]=starve; newG[i][j]=EMPTY; if(Math.random()<pF*0.5){ newG[i][j]=FOX; newE[i][j]=Math.floor(starve*0.7); } }
        else { const empt=n.filter(([a,b])=> newG[a][b]===EMPTY||newG[a][b]===GRASS); if(empt.length && Math.random()<0.6){ const [a,b]=empt[Math.floor(Math.random()*empt.length)]; newG[a][b]=FOX; newE[a][b]=newE[i][j]; newG[i][j]=EMPTY; newE[i][j]=0; } }
      }
    }
    grid=newG; foxEnergy=newE; generation++; updateStats();
  }

  function updateStats(){
    let rc=0,fc=0,gc=0;
    for(let i=0;i<GRID_SIZE;i++) for(let j=0;j<GRID_SIZE;j++){
      if(grid[i][j]===RABBIT) rc++; else if(grid[i][j]===FOX) fc++; else if(grid[i][j]===GRASS) gc++;
    }
    populationHistory.rabbits.push(rc); populationHistory.foxes.push(fc); populationHistory.grass.push(gc);
    if(populationHistory.rabbits.length>MAX_HISTORY){ populationHistory.rabbits.shift(); populationHistory.foxes.shift(); populationHistory.grass.shift(); }
    $('stats').innerText = `Gen ${generation} — R=${rc} F=${fc} G=${gc}`;
  }

  // animation
  function loop(){ if(!running) return; const now=Date.now(); const dt = 1000 / (Number($('fps')?.value||10)); if(now-last>dt){ stepGrid(); safeDraw(); last=now; } requestAnimationFrame(loop); }

  $('start')?.addEventListener('click',()=>{ running=!running; if(running) loop(); });
  $('reset')?.addEventListener('click',()=>{ resetGrid(); });
  $('export')?.addEventListener('click',()=>{ exportCSV(); });

  function resetGrid(){ initGrid(); safeDraw(); }

  function exportCSV(){ let csv='gen,rabbits,foxes,grass\n'; for(let i=0;i<populationHistory.rabbits.length;i++) csv += `${i},${populationHistory.rabbits[i]},${populationHistory.foxes[i]},${populationHistory.grass[i]}\n`; const blob=new Blob([csv],{type:'text/csv'}); const url=URL.createObjectURL(blob); const a=document.createElement('a'); a.href=url; a.download='pop_history.csv'; a.click(); URL.revokeObjectURL(url); }

  // --- analytic calculations ---
  function computeAnalytic(){
    const pR = Number($('pPrey')?.value||8)/100;
    const dt = 1 / (Number($('fps')?.value||10));
    const alpha = Math.log(1+pR)/dt;
    const gamma = 1 / (Number($('starve')?.value||15) * dt);
    const out = document.createElement('div');
    out.innerHTML = `<pre class='muted'>Estimated continuous rates (heuristic):\nα ≈ ${alpha.toFixed(4)}  (prey growth)\nγ ≈ ${gamma.toFixed(4)}  (predator mortality)\n\nRecommended 'sweet-spot' parameters for stable oscillations:\n - gridSize: 60-120\n - pPrey: 4-12%\n - pPred: 3-10%\n - gGrow: 8-25%\n - starve: 8-25 steps\n - fps: 6-20 (for visible dynamics)</pre>`;
    $('analyticOut').innerHTML=''; $('analyticOut').appendChild(out);
  }
  $('calcAnalytic')?.addEventListener('click',computeAnalytic);

  // estimators + coarse search (kept but guarded)
  $('estimateParams')?.addEventListener('click',()=>{
    if(populationHistory.rabbits.length<20){ alert('Run simulation for a bit (≥20 steps) to estimate.'); return; }
    const res = estimateParams(); displayEstimates(res);
  });

  function estimateParams(){
    const R = populationHistory.rabbits.slice(-200), F = populationHistory.foxes.slice(-200);
    const t = R.map((_,i)=>i*(1/Number($('fps')?.value||10)));
    const Fth = percentile(F,0.3);
    let idxs = F.map((v,i)=> v<=Fth ? i : -1).filter(i=>i>=0);
    if(idxs.length<3) idxs = [...Array(Math.min(R.length,10)).keys()];
    const lr = linearRegression(idxs.map(i=>t[i]), idxs.map(i=>Math.log(Math.max(R[i],1))));
    const alphaEst = lr.slope;
    const Rth = percentile(R,0.3);
    let idxsf = R.map((v,i)=> v<=Rth ? i : -1).filter(i=>i>=0);
    if(idxsf.length<3) idxsf = [...Array(Math.min(F.length,10)).keys()];
    const lg = linearRegression(idxsf.map(i=>t[i]), idxsf.map(i=>Math.log(Math.max(F[i],1))));
    const gammaEst = -lg.slope;
    const betaCandidates = linspace(0.0001,0.01,20);
    const deltaCandidates = linspace(0.0001,0.01,20);
    let best={err:1e99,beta:0,delta:0};
    for(let b of betaCandidates) for(let d of deltaCandidates){ const sim = simulateLV(alphaEst,b,d,gammaEst,R[0],F[0],t.length*(1/Number($('fps')?.value||10)),t.length); const err = mse(sim.R.slice(0,t.length), R) + mse(sim.F.slice(0,t.length), F); if(err<best.err){ best={err,beta:b,delta:d}; }}
    return {alpha:alphaEst,gamma:gammaEst,beta:best.beta,delta:best.delta};
  }

  function displayEstimates(res){ const out = `Estimates:\nα = ${res.alpha.toFixed(5)}  γ = ${res.gamma.toFixed(5)}\nβ ≈ ${res.beta.toExponential(2)}  δ ≈ ${res.delta.toExponential(2)}`; $('analyticOut').innerText = out; }

  function percentile(arr,p){ if(!arr || arr.length===0) return 0; const s=[...arr].sort((a,b)=>a-b); const idx=Math.floor(p*(s.length-1)); return s[Math.max(0,idx)]; }
  function linspace(a,b,n){ const out=[]; for(let i=0;i<n;i++) out.push(a + (b-a)*i/(n-1)); return out }
  function linearRegression(x,y){ if(!x.length||!y.length) return {slope:0,intercept:0}; const n=x.length; const mx=x.reduce((a,b)=>a+b,0)/n; const my=y.reduce((a,b)=>a+b,0)/n; let num=0,den=0; for(let i=0;i<n;i++){ num += (x[i]-mx)*(y[i]-my); den += (x[i]-mx)*(x[i]-mx);} const slope = den? num/den : 0; const intercept = my - slope*mx; return {slope,intercept}; }
  function mse(a,b){ if(!a.length||!b.length) return 1e9; let s=0; for(let i=0;i<a.length;i++) s += (a[i]-b[i])**2; return s/a.length; }

  function simulateLV(alpha,beta,delta,gamma,R0,F0,Tsteps,N){ const dt = Math.max(1e-6, Tsteps/N); let R=R0, F=F0; const Rarr=[], Farr=[]; for(let i=0;i<N;i++){ Rarr.push(R); Farr.push(F); const k1R = alpha*R - beta*R*F; const k1F = delta*R*F - gamma*F; const k2R = alpha*(R+0.5*dt*k1R) - beta*(R+0.5*dt*k1R)*(F+0.5*dt*k1F); const k2F = delta*(R+0.5*dt*k1R)*(F+0.5*dt*k1F) - gamma*(F+0.5*dt*k1F); const k3R = alpha*(R+0.5*dt*k2R) - beta*(R+0.5*dt*k2R)*(F+0.5*dt*k2F); const k3F = delta*(R+0.5*dt*k2R)*(F+0.5*dt*k2F) - gamma*(F+0.5*dt*k2F); const k4R = alpha*(R+dt*k3R) - beta*(R+dt*k3R)*(F+dt*k3F); const k4F = delta*(R+dt*k3R)*(F+dt*k3F) - gamma*(F+dt*k3F); R += dt*(k1R + 2*k2R + 2*k3R + k4R)/6; F += dt*(k1F + 2*k2F + 2*k3F + k4F)/6; if(R<0) R=0; if(F<0) F=0; } return {R:Rarr,F:Farr}; }

  // initial draw
  safeDraw();

});