

let thetaLOS=0,thetaDiag=0;
function lineOfSight(x0,y0,x1,y1){
  thetaLOS++;
  let dx=Math.abs(x1-x0),dy=Math.abs(y1-y0);
  let sx=x0<x1?1:-1,sy=y0<y1?1:-1,err=dx-dy;
  let cx=x0,cy=y0;
  while(true){
    if(cx<0||cx>=COLS||cy<0||cy>=ROWS) return false;
    if(grid[cy][cx]===CELL.OBSTACLE||grid[cy][cx]===CELL.NOFLY) return false;
    if(cx===x1&&cy===y1) return true;
    const e2=2*err;
    if(e2>-dy){err-=dy;cx+=sx;}
    if(e2<dx){err+=dx;cy+=sy;}
  }
}

function thetaStar(sx,sy,gx,gy){
  thetaLOS=0;thetaDiag=0;
  const key=(x,y)=>`${x},${y}`;
  const open=new Map();
  const g={},parent={},closed=new Set();
  const h=(x,y)=>Math.sqrt((x-gx)**2+(y-gy)**2);
  g[key(sx,sy)]=0;parent[key(sx,sy)]=key(sx,sy);
  open.set(key(sx,sy),{x:sx,y:sy,f:h(sx,sy)});
  const dirs8=[[0,-1],[0,1],[-1,0],[1,0],[-1,-1],[1,-1],[-1,1],[1,1]];
  let itr=0;
  while(open.size>0&&itr++<5000){
    let cur=null,ck=null,mf=Infinity;
    for(const[k,v] of open) if(v.f<mf){mf=v.f;cur=v;ck=k;}
    open.delete(ck);closed.add(ck);
    if(cur.x===gx&&cur.y===gy){
      const path=[];let k=key(gx,gy);
      while(k&&k!==parent[k]){const[px,py]=k.split(',').map(Number);path.unshift({x:px,y:py});k=parent[k];}
      path.unshift({x:sx,y:sy});return path;
    }
    for(const[dx,dy] of dirs8){
      const nx=cur.x+dx,ny=cur.y+dy;
      if(nx<0||nx>=COLS||ny<0||ny>=ROWS) continue;
      const nk=key(nx,ny);if(closed.has(nk)) continue;
      if(grid[ny][nx]===CELL.OBSTACLE||grid[ny][nx]===CELL.NOFLY){closed.add(nk);continue;}
      if(dx!==0&&dy!==0) thetaDiag++;
      // Theta*: try LOS from grandparent
      const pk=parent[ck]||ck;
      const[px,py]=pk.split(',').map(Number);
      let ng,newParent;
      if(lineOfSight(px,py,nx,ny)){
        const d=Math.sqrt((nx-px)**2+(ny-py)**2);
        ng=(g[pk]||0)+d*(1+windSpeed*0.05+envPenalty/100);
        newParent=pk;
      } else {
        const d=Math.sqrt(dx*dx+dy*dy);
        ng=(g[ck]||0)+d*(1+windSpeed*0.05+envPenalty/100);
        newParent=ck;
      }
      if(g[nk]===undefined||ng<g[nk]){
        g[nk]=ng;parent[nk]=newParent;
        open.set(nk,{x:nx,y:ny,f:ng+h(nx,ny)});
      }
    }
  }
  return[];
}


function stepCost(x,y){
  if(grid[y][x]===CELL.OBSTACLE||grid[y][x]===CELL.NOFLY) return Infinity;
  return 1+windSpeed*0.05+envPenalty/100+(temperature<0?0.3:temperature>35?0.2:0);
}
function nearestObsDist(x,y,rad=6){
  let m=99;
  for(let dr=-rad;dr<=rad;dr++) for(let dc=-rad;dc<=rad;dc++){
    const nr=y+dr,nc=x+dc;
    if(nr<0||nr>=ROWS||nc<0||nc>=COLS) continue;
    if(grid[nr][nc]===CELL.OBSTACLE||grid[nr][nc]===CELL.NOFLY)
      m=Math.min(m,Math.sqrt(dr*dr+dc*dc));
  }
  return Math.max(m,0.1);
}
function runAStar(sx,sy,gx,gy,algo){
  const key=(x,y)=>`${x},${y}`;
  const h=(x,y)=>{
    const dx=Math.abs(x-gx),dy=Math.abs(y-gy);
    if(algo==='dijkstra') return 0;
    if(algo==='gwa') return(dx+dy)*(1+windSpeed/20)*(1+1/nearestObsDist(x,y));
    return dx+dy;
  };
  const open=new Map(),closed=new Set(),g={},par={};
  g[key(sx,sy)]=0;open.set(key(sx,sy),{x:sx,y:sy,f:0});
  let itr=0;
  while(open.size>0&&itr++<4000){
    let cur=null,ck=null,mf=Infinity;
    for(const[k,v] of open) if(v.f<mf){mf=v.f;cur=v;ck=k;}
    open.delete(ck);closed.add(ck);
    if(cur.x===gx&&cur.y===gy){
      const path=[];let k=key(gx,gy);
      while(par[k]){const[px,py]=k.split(',').map(Number);path.unshift({x:px,y:py});k=par[k];}
      path.unshift({x:sx,y:sy});return path;
    }
    for(const[dx,dy] of [[0,-1],[0,1],[-1,0],[1,0]]){
      const nx=cur.x+dx,ny=cur.y+dy;
      if(nx<0||nx>=COLS||ny<0||ny>=ROWS) continue;
      const nk=key(nx,ny);if(closed.has(nk)) continue;
      const c=stepCost(nx,ny);if(c===Infinity){closed.add(nk);continue;}
      const obs=algo==='gwa'?1/nearestObsDist(nx,ny):0;
      const ng=(g[ck]||0)+c+obs;
      if(g[nk]===undefined||ng<g[nk]){
        g[nk]=ng;par[nk]=ck;
        open.set(nk,{x:nx,y:ny,f:ng+h(nx,ny)*(algo==='dstar'?1.1:1)});
      }
    }
  }
  return[];
}
function planSegment(algo,sx,sy,gx,gy){
  // All algos use A* family
  return runAStar(sx,sy,gx,gy,algo);
}

// ══════════════════════════════════════════════════════════════
