// ============================================================
// DRONE  —  animation loop, m/s speed conversion, speed graph
// ============================================================

function metersPerCell(){
  if(osmVisible && leafletMap){
    const b=leafletMap.getBounds();
    const latSpan=b.getNorth()-b.getSouth();
    // 1 degree latitude ≈ 111,320 m
    const totalMetersH=latSpan*111320;
    return totalMetersH/ROWS; // meters per grid row = meters per cell height
  }
  return 5; // default: 5 m per cell in grid-only mode
}

// ══════════════════════════════════════════════════════════════
// DRONE ANIMATION
// ══════════════════════════════════════════════════════════════
function animateDrone(){
  if(!path.length) return;
  missionRunning=true;droneStep=0;currentWpIndex=0;trailHistory=[];speedHistory=[];lastStepTime=0;
  document.getElementById('fly-btn').disabled=true;
  document.getElementById('hdr-status').textContent='FLYING';
  addLog('Drone airborne','ok');
  flashLines('FOG',[10,11,12,13,14,15,16,17]);
  const total=path.length;let energy=0;
  let wpIdx=0;

  function step(){
    if(droneStep>=path.length){
      missionRunning=false;dronePos={...destPos};
      document.getElementById('hdr-status').textContent='ARRIVED ✓';
      document.getElementById('fly-btn').disabled=false;
      addLog('✓ Destination reached!','ok');
      renderAll();return;
    }
    const p=path[droneStep];dronePos=p;
    // Track trail
    trailHistory.push({x:p.x,y:p.y});
    // Reveal fog
    revealFog(p.x,p.y);
    if(grid[p.y][p.x]===CELL.PATH) grid[p.y][p.x]=CELL.COVERED;
    // Geofence live check
    checkGeofenceStep(p.x,p.y,droneStep);
    // Waypoint arrival
    if(wpIdx<waypoints.length&&p.x===waypoints[wpIdx].x&&p.y===waypoints[wpIdx].y){
      addLog(`✓ Waypoint W${wpIdx+1} reached at (${p.x},${p.y})`,'ok');
      const el=document.getElementById('wpitem-'+wpIdx);if(el)el.classList.add('active-wp');
      wpIdx++;currentWpIndex=wpIdx;
      document.getElementById('wp-current').textContent=wpIdx<waypoints.length?'W'+(wpIdx+1):'→ DEST';
      document.getElementById('wp-remaining').textContent=Math.max(0,waypoints.length-wpIdx);
      if(wpIdx<waypoints.length) document.getElementById('wp-eta').textContent=(wpSegments[wpIdx]?.steps||'?')+' steps';
    }
    // Battery drain
    energy=Math.min(100,droneStep/total*(100-battery*.3)+droneStep*.08);
    const soc=Math.max(0,battery-energy);
    document.getElementById('bat-fill').style.width=Math.max(2,soc/100*battery)+'%';
    document.getElementById('bat-fill').style.background=soc<20?'linear-gradient(90deg,#ff3d5a,#ff7a3d)':soc<50?'linear-gradient(90deg,#ffb800,#ffd000)':'linear-gradient(90deg,var(--accent2),var(--accent))';
    document.getElementById('bat-pct-lbl').textContent=Math.round(soc)+'%';
    document.getElementById('hdr-bat').textContent=Math.round(soc)+'%';
    document.getElementById('m-energy').textContent=Math.round(energy)+'%';
    document.getElementById('hdr-steps').textContent=droneStep+'/'+total;
    // Python section cycling
    const sections=['THETA','FOG','WAYPOINTS','ENERGY','GEOFENCE'];
    if(droneStep%10===0) renderPyCode(sections[Math.floor(droneStep/total*sections.length)%sections.length]);
    if(droneStep%20===0&&droneStep>0) addLog(`Step ${droneStep} | SOC:${Math.round(soc)}% | Fog:${document.getElementById('fog-revealed').textContent}`,'info');
    if(soc<20&&droneStep%10===0) addLog('⚡ DBAR critical battery','warn');
    // Speed tracking
    const intervalMs=Math.round(1000/droneSpeed);
    const now=performance.now();
    const cellsPerSec=lastStepTime>0?1000/(now-lastStepTime):droneSpeed;
    const mps=Math.round(cellsPerSec*metersPerCell()*10)/10;
    lastStepTime=now;
    speedHistory.push(mps);
    updateSpeedDisplay(mps);
    drawSpeedGraph();
    droneStep++;renderAll();
    droneAnim=setTimeout(step,intervalMs);
  }
  step();
}

function updateSpeed(){
  droneSpeed=+document.getElementById('sl-speed').value;
  document.getElementById('speed-val').textContent=droneSpeed;
  const mpsPreview=Math.round(droneSpeed*metersPerCell()*10)/10;
  document.getElementById('m-speed').innerHTML=mpsPreview+' <span style="font-size:11px;font-family:Share Tech Mono">m/s</span>';
  if(!missionRunning){
    document.getElementById('spd-cur').textContent=mpsPreview+'m/s';
  }
}
function updateSpeedDisplay(spd){
  const s=spd.toFixed(1);
  document.getElementById('m-speed').innerHTML=s+' <span style="font-size:11px;font-family:Share Tech Mono">m/s</span>';
  document.getElementById('spd-cur').textContent=s+'m/s';
  if(speedHistory.length>1){
    const avg=(speedHistory.reduce((a,b)=>a+b,0)/speedHistory.length).toFixed(1);
    const mx=Math.max(...speedHistory).toFixed(1);
    const mn=Math.min(...speedHistory).toFixed(1);
    document.getElementById('spd-avg').textContent=avg+'m/s';
    document.getElementById('spd-max').textContent=mx+'m/s';
    document.getElementById('spd-min').textContent=mn+'m/s';
  }
}
function drawSpeedGraph(){
  const canvas=document.getElementById('speed-canvas');
  if(!canvas) return;
  const W=canvas.offsetWidth||200, H=48;
  canvas.width=W; canvas.height=H;
  const ctx=canvas.getContext('2d');
  ctx.clearRect(0,0,W,H);
  // Background
  ctx.fillStyle='#0a1520'; ctx.fillRect(0,0,W,H);
  // Grid lines
  ctx.strokeStyle='rgba(0,212,255,0.08)'; ctx.lineWidth=0.5;
  [H*0.25,H*0.5,H*0.75].forEach(y=>{ctx.beginPath();ctx.moveTo(0,y);ctx.lineTo(W,y);ctx.stroke();});
  if(speedHistory.length<2) return;
  const maxSpd=Math.max(...speedHistory,droneSpeed)*1.1||1;
  const pts=speedHistory.slice(-W); // last W samples max
  const step=W/Math.max(pts.length-1,1);
  // Fill area under curve
  const grad=ctx.createLinearGradient(0,0,0,H);
  grad.addColorStop(0,'rgba(0,212,255,0.35)');
  grad.addColorStop(1,'rgba(0,212,255,0.03)');
  ctx.beginPath();
  ctx.moveTo(0,H);
  pts.forEach((v,i)=>{ const x=i*step, y=H-(v/maxSpd)*(H-4)-2; if(i===0)ctx.lineTo(x,y); else ctx.lineTo(x,y); });
  ctx.lineTo((pts.length-1)*step,H);
  ctx.closePath();
  ctx.fillStyle=grad; ctx.fill();
  // Line
  ctx.beginPath();
  ctx.strokeStyle='rgba(0,212,255,0.9)'; ctx.lineWidth=1.5;
  pts.forEach((v,i)=>{ const x=i*step, y=H-(v/maxSpd)*(H-4)-2; if(i===0)ctx.moveTo(x,y); else ctx.lineTo(x,y); });
  ctx.stroke();
  // Current speed dot
  const lastX=(pts.length-1)*step;
  const lastY=H-(pts[pts.length-1]/maxSpd)*(H-4)-2;
  ctx.beginPath(); ctx.arc(lastX,lastY,3,0,Math.PI*2);
  ctx.fillStyle='#00d4ff'; ctx.fill();
  // Speed limit line (target speed)
  const targetY=H-(droneSpeed/maxSpd)*(H-4)-2;
  ctx.strokeStyle='rgba(255,184,0,0.5)'; ctx.lineWidth=1; ctx.setLineDash([3,4]);
  ctx.beginPath(); ctx.moveTo(0,targetY); ctx.lineTo(W,targetY); ctx.stroke();
  ctx.setLineDash([]);
  // Label
  ctx.fillStyle='rgba(255,184,0,0.7)'; ctx.font='8px Share Tech Mono';
  ctx.textAlign='left'; ctx.fillText('TARGET: '+(Math.round(droneSpeed*metersPerCell()*10)/10)+'m/s', 3, targetY-2);
}
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

// ══════════════════════════════════════════════════════════════
