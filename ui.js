// ============================================================
// UI  —  draw modes, view switch, sliders, clear, random map, log
// ============================================================

// UI HELPERS
// ══════════════════════════════════════════════════════════════
function setDrawMode(m){
  drawMode=m;
  ['obstacle','nofly','waypoint','destination','erase'].forEach(x=>{
    const b=document.getElementById('btn-'+x);if(b)b.classList.toggle('active',x===m);
  });
}
function setView(v){
  currentView=v;
  ['grid','energy','heat'].forEach(x=>document.getElementById('vbtn-'+x)?.classList.toggle('active',x===v));
  if(v==='energy'){computeEnergyMap();flashLines('ENERGY',[0,1,2,3,4,5]);}
  renderAll();
}
// ══════════════════════════════════════════════════════════════
// SPEED CONVERSION: cells/sec → m/s
// Uses Haversine to get real meters per grid cell when map is on,
// falls back to a fixed 5 m/cell for grid-only mode
// ══════════════════════════════════════════════════════════════

// ─── Environment sliders, clear, random map, log ───────────


function updateBat(){battery=+document.getElementById('sl-bat').value;document.getElementById('bat-val').textContent=battery+'%';document.getElementById('hdr-bat').textContent=battery+'%';document.getElementById('bat-fill').style.width=battery+'%';document.getElementById('bat-pct-lbl').textContent=battery+'%';}


function updateWind(){windSpeed=+document.getElementById('sl-wind').value;document.getElementById('wind-val').textContent=windSpeed+' m/s';}


function updateTemp(){temperature=+document.getElementById('sl-temp').value;document.getElementById('temp-val').textContent=temperature+'°C';}


function updateSVR(){envPenalty=+document.getElementById('sl-svr').value;document.getElementById('svr-val').textContent=envPenalty+'%';}


function updateFog(){fogRadius=+document.getElementById('sl-fog').value;document.getElementById('fog-val').textContent=fogRadius;renderAll();}


function clearGrid(){
  if(droneAnim)clearTimeout(droneAnim);
  missionRunning=false;dronePos={...startPos};destPos=null;path=[];bezierPts=[];
  waypoints=[];renderWaypointList();
  energyMap={};
  initGrid();closeAlert();trailHistory=[];
  document.getElementById('fly-btn').disabled=true;
  document.getElementById('dest-coords').textContent='NOT SET';
  
  document.getElementById('hdr-wpts').textContent=0;
  document.getElementById('m-wpts').textContent=0;
  document.getElementById('hdr-status').textContent='IDLE';
  document.getElementById('gf-dot').className='gf-dot';
  document.getElementById('gf-text').textContent='GEOFENCE: CLEAR';
  document.getElementById('theta-los').textContent='—';
  document.getElementById('theta-diag').textContent='—';
  document.getElementById('theta-angle').textContent='—';
  document.getElementById('wp-current').textContent='—';
  document.getElementById('wp-remaining').textContent='—';
  document.getElementById('wp-eta').textContent='—';
  addLog('Grid cleared','info');renderAll();
}


function generateRandomMap(){
  if(droneAnim)clearTimeout(droneAnim);
  missionRunning=false;dronePos={...startPos};path=[];bezierPts=[];energyMap={};
  const savedDest=destPos,savedWp=[...waypoints];
  initGrid();
  
  const n=5+Math.floor(Math.random()*5);
  for(let i=0;i<n;i++){
    const cx=3+Math.floor(Math.random()*(COLS-6)),cy=3+Math.floor(Math.random()*(ROWS-6));
    const sz=1+Math.floor(Math.random()*3),t=Math.random()>.6?CELL.NOFLY:CELL.OBSTACLE;
    for(let dr=-sz;dr<=sz;dr++) for(let dc=-sz;dc<=sz;dc++){
      const r=cy+dr,c=cx+dc;
      if(r>0&&r<ROWS-1&&c>0&&c<COLS-1){
        if(r===startPos.y&&c===startPos.x) continue;
        if(savedDest&&r===savedDest.y&&c===savedDest.x) continue;
        if(savedWp.some(w=>w.x===c&&w.y===r)) continue;
        grid[r][c]=t;
      }
    }
  }
  if(savedDest){destPos=savedDest;grid[destPos.y][destPos.x]=CELL.DEST;}
  savedWp.forEach(w=>grid[w.y][w.x]=CELL.WAYPOINT);
  addLog(`Random map: ${n} clusters`,'info');
  renderAll();
}


function addLog(msg,type='info'){
  const el=Math.floor((Date.now()-t0)/1000);
  const mm=String(Math.floor(el/60)).padStart(2,'0'),ss=String(el%60).padStart(2,'0');
  const box=document.getElementById('log-box');
  const div=document.createElement('div');div.className='le';
  div.innerHTML=`<span class="lt">${mm}:${ss}</span><span class="l${type}">${msg}</span>`;
  box.appendChild(div);box.scrollTop=box.scrollHeight;
  if(box.children.length>100)box.removeChild(box.children[0]);
}
