
function revealFog(cx,cy){
  let count=0,newObstacles=[];
  for(let dr=-fogRadius;dr<=fogRadius;dr++) for(let dc=-fogRadius;dc<=fogRadius;dc++){
    const r=cy+dr,c=cx+dc;
    if(r<0||r>=ROWS||c<0||c>=COLS) continue;
    if(dr*dr+dc*dc>fogRadius*fogRadius) continue;
    if(fogMap[r][c]){fogMap[r][c]=false;count++;}
  }
  return count;
}
function drawFog(){
  ctxF.clearRect(0,0,canvasFog.width,canvasFog.height);
  for(let r=0;r<ROWS;r++) for(let c=0;c<COLS;c++){
    if(fogMap[r][c]){
      ctxF.fillStyle='rgba(5,10,20,0.76)';
      ctxF.fillRect(c*cellW,r*cellH,cellW,cellH);
    }
  }
  // Soft edge around revealed area
  for(let r=0;r<ROWS;r++) for(let c=0;c<COLS;c++){
    if(!fogMap[r][c]){
      const neighbors=[[r-1,c],[r+1,c],[r,c-1],[r,c+1]];
      if(neighbors.some(([nr,nc])=>nr>=0&&nr<ROWS&&nc>=0&&nc<COLS&&fogMap[nr][nc])){
        const grad=ctxF.createRadialGradient(c*cellW+cellW/2,r*cellH+cellH/2,0,c*cellW+cellW/2,r*cellH+cellH/2,cellW*1.2);
        grad.addColorStop(0,'rgba(5,10,15,0)');grad.addColorStop(1,'rgba(5,10,15,0.6)');
        ctxF.fillStyle=grad;ctxF.fillRect(c*cellW,r*cellH,cellW*2,cellH*2);
      }
    }
  }
  const revealed=fogMap.flat().filter(v=>!v).length;
  const total=ROWS*COLS;
  const pct=Math.round(revealed/total*100);
  document.getElementById('fog-revealed').textContent=pct+'%';
  document.getElementById('fog-hidden').textContent=(100-pct)+'%';
}


