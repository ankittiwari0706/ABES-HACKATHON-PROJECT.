// ============================================================
// INIT  —  boot: initGrid, resizeCanvases, random map, first render
// ============================================================

// INIT
// ══════════════════════════════════════════════════════════════
initGrid();
resizeCanvases();
window.addEventListener('resize',resizeCanvases);
renderPyCode('THETA');
onAlgoChange();
setTimeout(()=>{
  generateRandomMap();
  addLog('7 new features active — hover grid for energy map tooltip','info');
  addLog('Ctrl+P: toggle Python panel | 3D: isometric view','info');
  addLog('Add waypoints → Set destination → PLAN MISSION','info');
  // Pre-reveal starting area
  revealFog(startPos.x,startPos.y);
  renderAll();
},200);
