// ============================================================
// GEOFENCE  —  zone overlay, live breach detection, alerts
// ============================================================

function drawGeofenceOverlay(ctx){
  geofenceZones.forEach(z=>{
    ctx.fillStyle='rgba(255,61,90,0.22)';
    ctx.fillRect(z.c0*cellW,z.r0*cellH,(z.c1-z.c0+1)*cellW,(z.r1-z.r0+1)*cellH);
    ctx.strokeStyle='rgba(255,61,90,0.95)';ctx.lineWidth=2;ctx.setLineDash([4,3]);
    ctx.strokeRect(z.c0*cellW,z.r0*cellH,(z.c1-z.c0+1)*cellW,(z.r1-z.r0+1)*cellH);
    ctx.setLineDash([]);
    ctx.fillStyle='rgba(255,61,90,0.9)';ctx.font=`bold ${Math.min(cellW,10)}px Orbitron`;
    ctx.textAlign='left';ctx.textBaseline='top';
    ctx.fillText('⊗ '+z.label,z.c0*cellW+3,z.r0*cellH+2);
  });
}
function checkGeofenceStep(x,y,step){
  for(const z of geofenceZones){
    if(x>=z.c0&&x<=z.c1&&y>=z.r0&&y<=z.r1){
      triggerAlert(`⊗ GEOFENCE BREACH: ${z.label} at (${x},${y}) step ${step}`);
      flashLines('GEOFENCE',[0,1,2,3,4,5,6,7]);
      return true;
    }
  }
  return false;
}
function triggerAlert(msg){
  const banner=document.getElementById('alert-banner');
  document.getElementById('alert-msg').textContent=msg;
  banner.classList.add('show');
  document.getElementById('gf-dot').className='gf-dot danger';
  document.getElementById('gf-text').textContent='⚠ BREACH DETECTED';
  addLog(msg,'err');
  // Pulse the banner
  if(alertActive) return;
  alertActive=true;
  setTimeout(()=>{if(!missionRunning)closeAlert();},5000);
}
function closeAlert(){
  document.getElementById('alert-banner').classList.remove('show');
  alertActive=false;
  if(!missionRunning){document.getElementById('gf-dot').className='gf-dot';document.getElementById('gf-text').textContent='GEOFENCE: CLEAR';}
}

// ══════════════════════════════════════════════════════════════
// THETA* ALGORITHM (any-angle)
// ══════════════════════════════════════════════════════════════
