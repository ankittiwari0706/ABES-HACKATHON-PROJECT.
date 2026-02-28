// ============================================================
// STATE  —  grid constants, shared vars, canvas refs, zoom
// ============================================================

// GRID STATE
// ══════════════════════════════════════════════════════════════
const COLS=36,ROWS=28;
const CELL={SAFE:0,OBSTACLE:1,NOFLY:2,COVERED:3,PATH:4,START:5,DEST:6,WAYPOINT:7};
let grid=[],path=[],dronePos={x:1,y:1},startPos={x:1,y:1},destPos=null;
let waypoints=[]; // [{x,y,order}]
let drawMode='obstacle',isMouseDown=false,currentView='grid';
let battery=100,envPenalty=5,windSpeed=0,temperature=20,fogRadius=6;
let droneAnim=null,droneStep=0,bezierPts=[],missionRunning=false;
let fogMap=[],energyMap={};
let view3D=false,osmOn=false;
let trailHistory=[];
let droneSpeed=5; // cells/sec (1-20)
let speedHistory=[]; // [{step,speed}] for graph
let lastStepTime=0; // [{x,y}] ordered list of visited cells
let geofenceZones=[],alertActive=false;
let currentWpIndex=0,wpSegments=[];
const t0=Date.now();

function initGrid(){
  grid=[];fogMap=[];
  for(let r=0;r<ROWS;r++){grid.push(new Array(COLS).fill(CELL.SAFE));fogMap.push(new Array(COLS).fill(true));}
  grid[startPos.y][startPos.x]=CELL.START;
  if(destPos)grid[destPos.y][destPos.x]=CELL.DEST;
  waypoints.forEach(w=>grid[w.y][w.x]=CELL.WAYPOINT);
  // Geofence zones cleared — populated by real map data when map is active
  geofenceZones=[];
}

// ══════════════════════════════════════════════════════════════
// CANVAS SETUP (4 layered canvases)
// ══════════════════════════════════════════════════════════════
const canvasGrid=document.getElementById('grid-canvas');
const canvasOSM=document.getElementById('osm-canvas');
const canvasFog=document.getElementById('fog-canvas');
const canvasOv=document.getElementById('overlay-canvas');
const canvas3d=document.getElementById('canvas3d');
const ctxG=canvasGrid.getContext('2d');
const ctxO=canvasOSM.getContext('2d');
const ctxF=canvasFog.getContext('2d');
const ctxOv=canvasOv.getContext('2d');
const ctx3=canvas3d.getContext('2d');
let cellW=18,cellH=16;
let gridZoom=1.0; // multiplier for grid cell size (0.5 – 2.5)

// ══════════════════════════════════════════════════════════════
// GRID ZOOM
// ══════════════════════════════════════════════════════════════
function zoomGrid(delta){
  gridZoom=Math.min(2.5,Math.max(0.4,gridZoom+delta));
  resizeCanvases();
  const zpEl=document.getElementById('zoom-pct');if(zpEl)zpEl.textContent=Math.round(gridZoom*100)+'%';
  addLog(`Grid zoom: ${Math.round(gridZoom*100)}%`,'info');
}

function resizeCanvases(){
  const wrap=document.getElementById('grid-wrap');
  const W=wrap.clientWidth,H=wrap.clientHeight;
  const baseCW=Math.max(8,Math.floor(W/COLS));
  const baseCH=Math.max(6,Math.floor(H/ROWS));
  cellW=Math.max(4,Math.round(baseCW*gridZoom));
  cellH=Math.max(3,Math.round(baseCH*gridZoom));
  const cw=cellW*COLS,ch=cellH*ROWS;
  [canvasGrid,canvasOSM,canvasFog,canvasOv,canvas3d].forEach(c=>{
    c.width=cw;c.height=ch;c.style.width=cw+'px';c.style.height=ch+'px';
  });
  renderAll();
}

// ══════════════════════════════════════════════════════════════
// ══════════════════════════════════════════════════════════════
