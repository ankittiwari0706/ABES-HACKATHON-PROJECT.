// ============================================================
// PLANNING  —  runPlanning, onAlgoChange, DBAR battery check
// ============================================================

// RUN PLANNING
// ══════════════════════════════════════════════════════════════
function onAlgoChange(){
  const a=document.getElementById('algo-select').value;
  document.getElementById('hdr-algo').textContent=a.toUpperCase();
  renderPyCode('THETA');
}
function runPlanning(){
  if(missionRunning) return;
  if(!destPos){addLog('⚠ Set destination first','warn');return;}
  const algo=document.getElementById('algo-select').value;
  document.getElementById('hdr-algo').textContent=algo.toUpperCase();
  addLog(`Planning with ${algo.toUpperCase()}...`,'info');
  flashLines('THETA',[0,1,2,3,4,5]);
  // Reset grid paths
  for(let r=0;r<ROWS;r++) for(let c=0;c<COLS;c++)
    if(grid[r][c]===CELL.COVERED||grid[r][c]===CELL.PATH) grid[r][c]=CELL.SAFE;
  grid[startPos.y][startPos.x]=CELL.START;
  grid[destPos.y][destPos.x]=CELL.DEST;
  waypoints.forEach(w=>grid[w.y][w.x]=CELL.WAYPOINT);
  dronePos={...startPos};currentWpIndex=0;

  setTimeout(()=>{
    path=planWaypointPath(algo);
    if(!path.length){addLog('✕ No path found!','err');document.getElementById('hdr-status').textContent='NO PATH';renderAll();return;}
    // Mark path
    for(let i=1;i<path.length-1;i++){
      const p=path[i];
      if(grid[p.y][p.x]===CELL.SAFE) grid[p.y][p.x]=CELL.PATH;
    }
    bezierPts=computeBezier(path);
    // Theta* stats
    document.getElementById('theta-los').textContent=thetaLOS;
    document.getElementById('theta-diag').textContent=thetaDiag;
    const angles=path.slice(1).map((p,i)=>Math.atan2(p.y-path[i].y,p.x-path[i].x)*180/Math.PI);
    const avgAngle=angles.length?Math.abs(angles.reduce((a,b)=>a+b,0)/angles.length).toFixed(1):0;
    document.getElementById('theta-angle').textContent=avgAngle+'°';
    // Waypoint ETA
    if(waypoints.length){
      document.getElementById('wp-current').textContent='W1';
      document.getElementById('wp-remaining').textContent=waypoints.length;
      const firstWpStep=wpSegments[0]?wpSegments[0].steps:0;
      document.getElementById('wp-eta').textContent=firstWpStep+' steps';
      flashLines('WAYPOINTS',[3,4,5,6,7,8,9,10,11]);
    }
    // Energy map
    if(currentView==='energy'){setTimeout(()=>{computeEnergyMap();flashLines('ENERGY',[0,1,2,3,4,5,6]);},300);}
    // DBAR
    const effBat=(battery-envPenalty)/100;
    const energyNeeded=path.length*0.003*(1+windSpeed/20);
    if(effBat<energyNeeded+0.15){addLog('⚡ DBAR: Battery critical!','warn');document.getElementById('gf-dot').className='gf-dot warn';}
    else{addLog('[DBAR] Battery OK ✓','ok');}
    // Geofence pre-check
    const violations=path.filter(p=>geofenceZones.some(z=>p.x>=z.c0&&p.x<=z.c1&&p.y>=z.r0&&p.y<=z.r1));
    if(violations.length){
      triggerAlert(`PATH enters ${violations.length} geofence cell(s) — review before flying`);
      flashLines('GEOFENCE',[5,6,7,8,9,10,11,12,13]);
    }
    document.getElementById('m-steps').textContent=path.length;
    document.getElementById('m-cost').textContent=Math.floor(path.length*(1+envPenalty/100));
    document.getElementById('hdr-status').textContent='READY';
    document.getElementById('hdr-steps').textContent=path.length;
    document.getElementById('fly-btn').disabled=false;
    
    addLog(`Path: ${path.length} steps | ${waypoints.length} waypoints | Θ* LOS: ${thetaLOS}`,'ok');
    renderAll();
  },200);
}



// ══════════════════════════════════════════════════════════════
