
function toggle3D(){
  view3D=!view3D;
  const wrap=document.getElementById('grid-wrap');
  const btn=document.getElementById('btn-3d');
  wrap.classList.toggle('view3d',view3D);
  btn.classList.toggle('on',view3D);
  addLog(view3D?'3D isometric view ON':'3D grid view OFF','info');
  renderAll();
}
function draw3D(){
  const W=canvas3d.width,H=canvas3d.height;
  ctx3.clearRect(0,0,W,H);
  ctx3.fillStyle='#0a1828';ctx3.fillRect(0,0,W,H);
  const isoW=cellW*0.7,isoH=cellH*0.4;
  const offX=W/2-COLS*isoW/2,offY=H*0.18;

  for(let r=0;r<ROWS;r++) for(let c=0;c<COLS;c++){
    const cell=grid[r][c];
    const tx=offX+(c-r)*isoW;
    const ty=offY+(c+r)*isoH;
    let baseH=2,topCol,sideCol,frontCol;
    switch(cell){
      case CELL.OBSTACLE: baseH=12;topCol='#cc2020';sideCol='#8a1414';frontCol='#5a0c0c';break;
      case CELL.NOFLY: baseH=4;topCol='#c0aa10';sideCol='#807210';frontCol='#504808';break;
      case CELL.PATH: baseH=1;topCol='#1a7ab0';sideCol='#0a5078';frontCol='#083550';break;
      case CELL.COVERED: baseH=1;topCol='#1a8050';sideCol='#0a5030';frontCol='#072818';break;
      case CELL.WAYPOINT: baseH=5;topCol='#9040d8';sideCol='#5a1a90';frontCol='#380d5a';break;
      default: baseH=1;topCol='#1e3a5c';sideCol='#162e48';frontCol='#0e2030';
    }
    if(fogMap[r]&&fogMap[r][c]) continue;
    const h=baseH;
    
    ctx3.beginPath();
    ctx3.moveTo(tx,ty-h);ctx3.lineTo(tx+isoW,ty+isoH-h);
    ctx3.lineTo(tx,ty+isoH*2-h);ctx3.lineTo(tx-isoW,ty+isoH-h);
    ctx3.closePath();ctx3.fillStyle=topCol;ctx3.fill();
    ctx3.strokeStyle='rgba(0,0,0,0.5)';ctx3.lineWidth=0.7;ctx3.stroke();
  
    ctx3.beginPath();
    ctx3.moveTo(tx+isoW,ty+isoH-h);ctx3.lineTo(tx+isoW,ty+isoH);
    ctx3.lineTo(tx,ty+isoH*2);ctx3.lineTo(tx,ty+isoH*2-h);
    ctx3.closePath();ctx3.fillStyle=sideCol;ctx3.fill();ctx3.stroke();
    
    ctx3.beginPath();
    ctx3.moveTo(tx-isoW,ty+isoH-h);ctx3.lineTo(tx-isoW,ty+isoH);
    ctx3.lineTo(tx,ty+isoH*2);ctx3.lineTo(tx,ty+isoH*2-h);
    ctx3.closePath();ctx3.fillStyle=frontCol;ctx3.fill();ctx3.stroke();
  }
  
  const{x,y}=dronePos;
  const dtx=offX+(x-y)*isoW,dty=offY+(x+y)*isoH;
  ctx3.fillStyle='#00ff9d';ctx3.shadowColor='#00ff9d';ctx3.shadowBlur=16;
  ctx3.beginPath();ctx3.arc(dtx,dty-8,5,0,Math.PI*2);ctx3.fill();
  ctx3.shadowBlur=0;
  // Path in 3D
  if(bezierPts.length>3){
    ctx3.strokeStyle='rgba(0,212,255,0.6)';ctx3.lineWidth=1.5;ctx3.setLineDash([3,3]);
    ctx3.beginPath();
    const bp=bezierPts;
    const bx0=offX+(bp[0][0]-bp[0][1])*isoW,by0=offY+(bp[0][0]+bp[0][1])*isoH;
    ctx3.moveTo(bx0,by0-4);
    for(let i=0;i<bp.length-3;i+=3){
      ctx3.bezierCurveTo(
        offX+(bp[i+1][0]-bp[i+1][1])*isoW,offY+(bp[i+1][0]+bp[i+1][1])*isoH-4,
        offX+(bp[i+2][0]-bp[i+2][1])*isoW,offY+(bp[i+2][0]+bp[i+2][1])*isoH-4,
        offX+(bp[i+3][0]-bp[i+3][1])*isoW,offY+(bp[i+3][0]+bp[i+3][1])*isoH-4
      );
    }
    ctx3.stroke();ctx3.setLineDash([]);
  }
  // Trail in 3D —
  if(trailHistory.length>1){
    const TAIL3D=Math.min(trailHistory.length,30);
    const start3D=Math.max(0,trailHistory.length-TAIL3D);
    ctx3.save();
    for(let i=start3D;i<trailHistory.length-1;i++){
      const t=(i-start3D)/(TAIL3D-1||1);
      const{x:ax,y:ay}=trailHistory[i];
      const{x:bx,y:by}=trailHistory[i+1];
      const tax=offX+(ax-ay)*isoW, tay=offY+(ax+ay)*isoH-6;
      const tbx=offX+(bx-by)*isoW, tby=offY+(bx+by)*isoH-6;
      ctx3.strokeStyle=`rgba(0,230,255,${0.2+t*0.7})`;
      ctx3.lineWidth=1+t*2;
      ctx3.beginPath();ctx3.moveTo(tax,tay);ctx3.lineTo(tbx,tby);ctx3.stroke();
    }
    ctx3.restore();
  }

  // Geofence zones in 3D
  geofenceZones.forEach(z=>{
    const corners=[[z.c0,z.r0],[z.c1,z.r0],[z.c1,z.r1],[z.c0,z.r1]];
    ctx3.strokeStyle='rgba(255,61,90,0.7)';ctx3.lineWidth=2;ctx3.setLineDash([4,3]);
    ctx3.beginPath();
    corners.forEach(([c,r],i)=>{
      const tx2=offX+(c-r)*isoW,ty2=offY+(c+r)*isoH;
      if(i===0)ctx3.moveTo(tx2,ty2-2);else ctx3.lineTo(tx2,ty2-2);
    });
    ctx3.closePath();ctx3.stroke();ctx3.setLineDash([]);
  });
}


function cellColor(cell){
  switch(cell){
    case CELL.SAFE:return'#1e3a5c'; case CELL.OBSTACLE:return'#7a1515';
    case CELL.NOFLY:return'#7a6a08'; case CELL.COVERED:return'#1a6a40';
    case CELL.PATH:return'#0a6a9a'; case CELL.START:return'#0a5a28';
    case CELL.DEST:return'#6a0a7a'; case CELL.WAYPOINT:return'#5a1a8a';
    default:return'#0d1e2e';
  }
}
function drawGridBase(){
  ctxG.clearRect(0,0,canvasGrid.width,canvasGrid.height);
  for(let r=0;r<ROWS;r++) for(let c=0;c<COLS;c++){
    ctxG.fillStyle=cellColor(grid[r][c]);
    ctxG.fillRect(c*cellW,r*cellH,cellW-1,cellH-1);
    ctxG.strokeStyle='rgba(80,140,200,0.45)';ctxG.lineWidth=0.5;
    ctxG.strokeRect(c*cellW,r*cellH,cellW-1,cellH-1);
  }
}
function drawMarkersOnCtx(ctx){
  const fs=Math.min(cellW,cellH);
  // Start
  ctx.fillStyle='#00d4ff';ctx.shadowColor='#00d4ff';ctx.shadowBlur=8;
  ctx.beginPath();ctx.arc(startPos.x*cellW+cellW/2,startPos.y*cellH+cellH/2,fs*.35,0,Math.PI*2);ctx.fill();
  ctx.shadowBlur=0;ctx.fillStyle='#050a0f';ctx.font=`bold ${fs*.38}px Orbitron`;
  ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText('S',startPos.x*cellW+cellW/2,startPos.y*cellH+cellH/2+1);
  // Destination
  if(destPos){
    ctx.fillStyle='#ff00ff';ctx.shadowColor='#ff00ff';ctx.shadowBlur=12;
    ctx.beginPath();ctx.arc(destPos.x*cellW+cellW/2,destPos.y*cellH+cellH/2,fs*.38,0,Math.PI*2);ctx.fill();
    ctx.shadowBlur=0;ctx.fillStyle='#050a0f';ctx.font=`bold ${fs*.38}px Orbitron`;
    ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText('D',destPos.x*cellW+cellW/2,destPos.y*cellH+cellH/2+1);
  }
  // Waypoints
  waypoints.forEach((w,i)=>{
    const active=i===currentWpIndex&&missionRunning;
    ctx.fillStyle=active?'#ffb800':'#bd93f9';
    ctx.shadowColor=active?'#ffb800':'#bd93f9';ctx.shadowBlur=active?14:7;
    ctx.beginPath();ctx.arc(w.x*cellW+cellW/2,w.y*cellH+cellH/2,fs*.34,0,Math.PI*2);ctx.fill();
    ctx.shadowBlur=0;ctx.fillStyle='#050a0f';ctx.font=`bold ${fs*.32}px Orbitron`;
    ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText(''+(i+1),w.x*cellW+cellW/2,w.y*cellH+cellH/2+1);
  });
  // Drone
  ctx.fillStyle='#00ff9d';ctx.shadowColor='#00ff9d';ctx.shadowBlur=14;
  ctx.beginPath();ctx.arc(dronePos.x*cellW+cellW/2,dronePos.y*cellH+cellH/2,fs*.38,0,Math.PI*2);ctx.fill();
  ctx.shadowBlur=0;ctx.fillStyle='#050a0f';ctx.font=`bold ${fs*.38}px Arial`;
  ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText('✦',dronePos.x*cellW+cellW/2,dronePos.y*cellH+cellH/2+1);
}
function drawAPF(){
  ctxG.clearRect(0,0,canvasGrid.width,canvasGrid.height);
  const gx=destPos?destPos.x:COLS-2,gy=destPos?destPos.y:ROWS-2;
  const Ka=1.0,Kr=1.0;
  for(let r=0;r<ROWS;r++) for(let c=0;c<COLS;c++){
    if(grid[r][c]===CELL.OBSTACLE){ctxG.fillStyle='#8a1818';ctxG.fillRect(c*cellW,r*cellH,cellW-1,cellH-1);continue;}
    if(grid[r][c]===CELL.NOFLY){ctxG.fillStyle='#8a7a10';ctxG.fillRect(c*cellW,r*cellH,cellW-1,cellH-1);continue;}
    const dG=Math.sqrt((c-gx)**2+(r-gy)**2)+.1;
    const dO=nearestObsDist(c,r);
    const Ua=.5*Ka*dG*dG;const Ur=dO<5?.5*Kr*(1/dO-1/5)**2:0;
    const U=Math.min(Ua+Ur,30)/30;
    ctxG.fillStyle=`rgb(${Math.floor(U*255)},${Math.floor(U*90)},${Math.floor((1-U)*240)})`;
    ctxG.fillRect(c*cellW,r*cellH,cellW-1,cellH-1);
  }
  drawGeofenceOverlay(ctxG);drawMarkersOnCtx(ctxG);
}
function drawHeatmap(){
  ctxG.clearRect(0,0,canvasGrid.width,canvasGrid.height);
  for(let r=0;r<ROWS;r++) for(let c=0;c<COLS;c++){
    const v=grid[r][c]===CELL.COVERED?0.9:grid[r][c]===CELL.PATH?0.5:0;
    const g=Math.floor(v*255);
    ctxG.fillStyle=grid[r][c]===CELL.OBSTACLE?'#8a1818':grid[r][c]===CELL.NOFLY?'#8a7a10':`rgb(0,${g},${Math.floor(g*.7)})`;
    ctxG.fillRect(c*cellW,r*cellH,cellW-1,cellH-1);
  }
  drawGeofenceOverlay(ctxG);drawMarkersOnCtx(ctxG);
}

function drawTrailHighlight(ctx){
  if(!trailHistory.length) return;
  const len=trailHistory.length;
  const TAIL=Math.min(len, 28);
  for(let i=Math.max(0,len-TAIL);i<len;i++){
    const{x,y}=trailHistory[i];
    const t=(i-(len-TAIL))/(TAIL-1||1);
    const alpha=0.18 + t*0.62;
    ctx.fillStyle=`rgba(0,230,255,${alpha})`;
    ctx.fillRect(x*cellW+1, y*cellH+1, cellW-2, cellH-2);
  }
  // Bright border on current cell only
  if(len>0){
    const{x,y}=trailHistory[len-1];
    ctx.strokeStyle='rgba(0,255,240,0.9)';
    ctx.lineWidth=1.5;
    ctx.strokeRect(x*cellW+0.75, y*cellH+0.75, cellW-2.5, cellH-2.5);
  }
}

function drawOverlay(){
  ctxOv.clearRect(0,0,canvasOv.width,canvasOv.height);
  // Bezier path
  if(bezierPts.length>3){
    ctxOv.strokeStyle='rgba(255,210,0,.85)';ctxOv.lineWidth=2;ctxOv.setLineDash([4,4]);
    ctxOv.beginPath();
    const bp=bezierPts;
    ctxOv.moveTo(bp[0][0]*cellW+cellW/2,bp[0][1]*cellH+cellH/2);
    for(let i=0;i<bp.length-3;i+=3)
      ctxOv.bezierCurveTo(bp[i+1][0]*cellW+cellW/2,bp[i+1][1]*cellH+cellH/2,
        bp[i+2][0]*cellW+cellW/2,bp[i+2][1]*cellH+cellH/2,
        bp[i+3][0]*cellW+cellW/2,bp[i+3][1]*cellH+cellH/2);
    ctxOv.stroke();ctxOv.setLineDash([]);
  }
  // Waypoint connector lines
  if(waypoints.length>0){
    const pts=[startPos,...waypoints,...(destPos?[destPos]:[])];
    ctxOv.strokeStyle='rgba(189,147,249,0.7)';ctxOv.lineWidth=1.5;ctxOv.setLineDash([2,4]);
    ctxOv.beginPath();
    pts.forEach((p,i)=>{
      const x=p.x*cellW+cellW/2,y=p.y*cellH+cellH/2;
      if(i===0)ctxOv.moveTo(x,y);else ctxOv.lineTo(x,y);
    });
    ctxOv.stroke();ctxOv.setLineDash([]);
  }
}
// Draw path
function drawPathOnOverlay(){
 
  for(let r=0;r<ROWS;r++) for(let c=0;c<COLS;c++){
    const cell=grid[r][c];
    let fill=null;
    if(cell===CELL.OBSTACLE)      fill='rgba(122,21,21,0.72)';
    else if(cell===CELL.NOFLY)    fill='rgba(122,106,8,0.65)';
    else if(cell===CELL.COVERED)  fill='rgba(26,106,64,0.55)';
    else if(cell===CELL.PATH)     fill='rgba(10,106,154,0.55)';
    else if(cell===CELL.WAYPOINT) fill='rgba(90,26,138,0.65)';
    if(fill){
      ctxOv.fillStyle=fill;
      ctxOv.fillRect(c*cellW,r*cellH,cellW-1,cellH-1);
    }
  }
 
  ctxOv.strokeStyle='rgba(0,180,255,0.12)';
  ctxOv.lineWidth=0.4;
  for(let r=0;r<=ROWS;r++){ctxOv.beginPath();ctxOv.moveTo(0,r*cellH);ctxOv.lineTo(COLS*cellW,r*cellH);ctxOv.stroke();}
  for(let c=0;c<=COLS;c++){ctxOv.beginPath();ctxOv.moveTo(c*cellW,0);ctxOv.lineTo(c*cellW,ROWS*cellH);ctxOv.stroke();}
 
  if(bezierPts.length>3){
    ctxOv.strokeStyle='rgba(255,210,0,.85)';ctxOv.lineWidth=2;ctxOv.setLineDash([4,4]);
    ctxOv.beginPath();
    const bp=bezierPts;
    ctxOv.moveTo(bp[0][0]*cellW+cellW/2,bp[0][1]*cellH+cellH/2);
    for(let i=0;i<bp.length-3;i+=3)
      ctxOv.bezierCurveTo(bp[i+1][0]*cellW+cellW/2,bp[i+1][1]*cellH+cellH/2,
        bp[i+2][0]*cellW+cellW/2,bp[i+2][1]*cellH+cellH/2,
        bp[i+3][0]*cellW+cellW/2,bp[i+3][1]*cellH+cellH/2);
    ctxOv.stroke();ctxOv.setLineDash([]);
  }

  if(waypoints.length>0){
    const pts=[startPos,...waypoints,...(destPos?[destPos]:[])];
    ctxOv.strokeStyle='rgba(189,147,249,0.7)';ctxOv.lineWidth=1.5;ctxOv.setLineDash([2,4]);
    ctxOv.beginPath();
    pts.forEach((p,i)=>{const x=p.x*cellW+cellW/2,y=p.y*cellH+cellH/2;if(i===0)ctxOv.moveTo(x,y);else ctxOv.lineTo(x,y);});
    ctxOv.stroke();ctxOv.setLineDash([]);
  }
}

function renderAll(){
  updateCanvasOpacity();
  if(view3D){draw3D();return;}
  if(osmVisible){
    
    ctxOv.clearRect(0,0,canvasOv.width,canvasOv.height);
    drawGeofenceOverlay(ctxOv);
    drawTrailHighlight(ctxOv);
    drawMarkersOnCtx(ctxOv);
    drawPathOnOverlay();
    drawFog();
    return;
  }
  if(currentView==='energy'){computeEnergyMap();drawEnergyMap();drawFog();drawOverlay();return;}
  if(currentView==='heat'){drawHeatmap();drawFog();drawOverlay();return;}
  drawGridBase();
  drawGeofenceOverlay(ctxG);
  drawTrailHighlight(ctxG);
  drawMarkersOnCtx(ctxG);
  drawFog();
  drawOverlay();
}


