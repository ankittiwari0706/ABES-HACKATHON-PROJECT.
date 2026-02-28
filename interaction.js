// ============================================================
// INTERACTION  —  mouse events, draw modes, canvas hit-testing
// ============================================================

// MOUSE INTERACTION
// ══════════════════════════════════════════════════════════════
canvasGrid.addEventListener('mousedown',e=>{isMouseDown=true;handleDraw(e);});
canvasOv.addEventListener('mousedown',e=>{if(osmVisible){isMouseDown=true;handleDraw(e,true);}});
canvasOv.addEventListener('mousemove',e=>{
  if(!osmVisible) return;
  const{c,r}=getPosFromCanvas(e,canvasOv);
  document.getElementById('coord-display').textContent=`(${c},${r}) | map mode`;
  if(isMouseDown&&drawMode!=='destination'&&drawMode!=='waypoint') handleDraw(e,true);
});
canvasOv.addEventListener('mouseup',()=>isMouseDown=false);
canvasOv.addEventListener('mouseleave',()=>isMouseDown=false);
canvasGrid.addEventListener('mousemove',e=>{
  const{c,r}=getPos(e);
  document.getElementById('coord-display').textContent=`(${c},${r}) | cell:${grid[r]?grid[r][c]??'—':'—'}`;
  if(currentView==='energy'&&energyMap[`${c},${r}`]!==undefined){
    const tt=document.getElementById('energy-tooltip');
    const v=energyMap[`${c},${r}`];
    tt.textContent=`Energy to reach: ${(v*100).toFixed(1)}% battery`;
    tt.style.display='block';
    tt.style.left=(e.offsetX+12)+'px';tt.style.top=(e.offsetY-10)+'px';
  } else {document.getElementById('energy-tooltip').style.display='none';}
  if(isMouseDown&&drawMode!=='destination'&&drawMode!=='waypoint') handleDraw(e);
});
canvasGrid.addEventListener('mouseup',()=>isMouseDown=false);
canvasGrid.addEventListener('mouseleave',()=>{isMouseDown=false;document.getElementById('energy-tooltip').style.display='none';});
function getPosFromCanvas(e,cvs){
  const rect=cvs.getBoundingClientRect();
  return{c:Math.max(0,Math.min(COLS-1,Math.floor((e.clientX-rect.left)/cellW))),r:Math.max(0,Math.min(ROWS-1,Math.floor((e.clientY-rect.top)/cellH)))};
}
function getPos(e){return getPosFromCanvas(e,canvasGrid);}
function handleDraw(e,fromOverlay=false){
  if(missionRunning) return;
  const{c,r}=fromOverlay?getPosFromCanvas(e,canvasOv):getPos(e);
  const isStart=c===startPos.x&&r===startPos.y;
  const isDest=destPos&&c===destPos.x&&r===destPos.y;
  if(drawMode==='destination'){
    if(isStart) return;
    if(destPos)grid[destPos.y][destPos.x]=CELL.SAFE;
    destPos={x:c,y:r};grid[r][c]=CELL.DEST;
    document.getElementById('dest-coords').textContent=`COL ${c}  ROW ${r}`;
    addLog(`Destination → (${c},${r})`,'info');
    flashLines('WAYPOINTS',[0,1,2]);renderAll();return;
  }
  if(drawMode==='waypoint'){
    if(isStart||isDest) return;
    addWaypoint(c,r);renderAll();return;
  }
  if(isStart||isDest) return;
  if(grid[r][c]===CELL.WAYPOINT&&drawMode!=='erase') return;
  if(drawMode==='obstacle') grid[r][c]=CELL.OBSTACLE;
  else if(drawMode==='nofly'){grid[r][c]=CELL.NOFLY;flashLines('GEOFENCE',[0,1,2,3]);}
  else if(drawMode==='erase'){
    if(grid[r][c]===CELL.WAYPOINT) removeWaypoint(waypoints.findIndex(w=>w.x===c&&w.y===r));
    else grid[r][c]=CELL.SAFE;
  }
  renderAll();
}

// ══════════════════════════════════════════════════════════════
