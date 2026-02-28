
function addWaypoint(x,y){
  if(waypoints.some(w=>w.x===x&&w.y===y)) return;
  waypoints.push({x,y,order:waypoints.length+1});
  grid[y][x]=CELL.WAYPOINT;
  renderWaypointList();
  document.getElementById('hdr-wpts').textContent=waypoints.length;
  document.getElementById('m-wpts').textContent=waypoints.length;
  addLog(`Waypoint ${waypoints.length} set at (${x},${y})`,'info');
  flashLines('WAYPOINTS',[3,4,5,6,7]);
}
function clearWaypoints(){
  waypoints.forEach(w=>{if(grid[w.y][w.x]===CELL.WAYPOINT)grid[w.y][w.x]=CELL.SAFE;});
  waypoints=[];renderWaypointList();
  document.getElementById('hdr-wpts').textContent=0;
  document.getElementById('m-wpts').textContent=0;
  addLog('Waypoints cleared','info');renderAll();
}
function removeWaypoint(i){
  const w=waypoints[i];
  if(grid[w.y][w.x]===CELL.WAYPOINT)grid[w.y][w.x]=CELL.SAFE;
  waypoints.splice(i,1);
  waypoints.forEach((wp,j)=>wp.order=j+1);
  renderWaypointList();
  document.getElementById('hdr-wpts').textContent=waypoints.length;
  renderAll();
}
function renderWaypointList(){
  const el=document.getElementById('wp-list');
  el.innerHTML='';
  waypoints.forEach((w,i)=>{
    const div=document.createElement('div');div.className='wp-item';div.id='wpitem-'+i;
    div.innerHTML=`<span class="wp-num">W${i+1}</span><span class="wp-coords">(${w.x},${w.y})</span><button class="wp-del" onclick="removeWaypoint(${i})">✕</button>`;
    el.appendChild(div);
  });
  document.getElementById('wp-count').textContent=`(${waypoints.length})`;
}
function planWaypointPath(algo){
  if(!destPos) return[];
  const checkpoints=[startPos,...waypoints,destPos];
  let full=[];wpSegments=[];
  for(let i=0;i<checkpoints.length-1;i++){
    const s=checkpoints[i],d=checkpoints[i+1];
    const seg=planSegment(algo,s.x,s.y,d.x,d.y);
    if(!seg.length){addLog(`No path: WP${i}→WP${i+1}`,'err');return[];}
    const joined=full.length>0&&seg[0]&&full[full.length-1]&&seg[0].x===full[full.length-1].x&&seg[0].y===full[full.length-1].y?seg.slice(1):seg;
    wpSegments.push({from:s,to:d,steps:joined.length,startIdx:full.length});
    full=full.concat(joined);
  }
  return full;
}


function computeBezier(pts){
  if(pts.length<4) return[];
  const bp=[],step=Math.max(1,Math.floor(pts.length/14));
  for(let i=0;i<pts.length-step*3;i+=step*3){
    bp.push([pts[i].x,pts[i].y]);
    bp.push([pts[i+step].x+(Math.random()-.5)*1.2,pts[i+step].y+(Math.random()-.5)*1.2]);
    bp.push([pts[i+step*2].x+(Math.random()-.5)*1.2,pts[i+step*2].y+(Math.random()-.5)*1.2]);
    bp.push([pts[i+step*3].x,pts[i+step*3].y]);
  }
  return bp;
}


