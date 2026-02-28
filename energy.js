// ============================================================
// ENERGY  —  battery-range contour map (Dijkstra outward)
// ============================================================

// ENERGY CONTOUR MAP
// ══════════════════════════════════════════════════════════════
function computeEnergyMap(){
  const src={x:dronePos.x,y:dronePos.y};
  const maxE=(battery/100)-0.15;
  const dist={};const pq=[[0,src.x,src.y]];
  const stepCost=1+windSpeed*0.05+envPenalty/100+(temperature<0?0.3:temperature>35?0.2:0);
  dist[`${src.x},${src.y}`]=0;
  while(pq.length){
    pq.sort((a,b)=>a[0]-b[0]);
    const [cost,x,y]=pq.shift();
    const k=`${x},${y}`;
    if(cost>dist[k]) continue;
    const dirs=[[0,-1],[0,1],[-1,0],[1,0],[-1,-1],[-1,1],[1,-1],[1,1]];
    for(const[dx,dy] of dirs){
      const nx=x+dx,ny=y+dy;
      if(nx<0||nx>=COLS||ny<0||ny>=ROWS) continue;
      if(grid[ny][nx]===CELL.OBSTACLE||grid[ny][nx]===CELL.NOFLY) continue;
      const d=Math.sqrt(dx*dx+dy*dy);
      const nc=cost+stepCost*d;
      const nk=`${nx},${ny}`;
      if(nc<=maxE&&(dist[nk]===undefined||nc<dist[nk])){dist[nk]=nc;pq.push([nc,nx,ny]);}
    }
  }
  energyMap=dist;
}
function drawEnergyMap(){
  ctxG.clearRect(0,0,canvasGrid.width,canvasGrid.height);
  const maxE=(battery/100)-0.15;
  for(let r=0;r<ROWS;r++) for(let c=0;c<COLS;c++){
    const k=`${c},${r}`;
    const x=c*cellW,y=r*cellH;
    if(grid[r][c]===CELL.OBSTACLE){ctxG.fillStyle='#8a1818';ctxG.fillRect(x,y,cellW-1,cellH-1);continue;}
    if(grid[r][c]===CELL.NOFLY){ctxG.fillStyle='#8a7a10';ctxG.fillRect(x,y,cellW-1,cellH-1);continue;}
    if(energyMap[k]!==undefined){
      const t=1-energyMap[k]/maxE; // 1=close/cheap, 0=far/expensive
      const r1=Math.floor((1-t)*255);
      const g1=Math.floor(t*255);
      ctxG.fillStyle=`rgb(${r1},${g1},60)`;
    } else {
      ctxG.fillStyle='#0d1f35'; // unreachable
    }
    ctxG.fillRect(x,y,cellW-1,cellH-1);
  }
  // Contour lines
  ctxG.strokeStyle='rgba(255,255,255,0.18)';ctxG.lineWidth=0.8;
  for(let r=0;r<ROWS;r++) for(let c=0;c<COLS;c++){
    const k=`${c},${r}`;const kR=`${c+1},${r}`;const kD=`${c},${r+1}`;
    if(energyMap[k]!==undefined&&energyMap[kR]!==undefined){
      const d=Math.abs((energyMap[k]-energyMap[kR])/maxE);
      if(d>0.1){ctxG.beginPath();ctxG.moveTo((c+1)*cellW,(r)*cellH);ctxG.lineTo((c+1)*cellW,(r+1)*cellH);ctxG.stroke();}
    }
  }
  drawGeofenceOverlay(ctxG);drawMarkersOnCtx(ctxG);
}

// ══════════════════════════════════════════════════════════════
// GEOFENCE OVERLAY & ALERTS
// ══════════════════════════════════════════════════════════════
