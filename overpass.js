

let realObstaclesLoaded=false;


let _fetchTimer=null;
let _lastFetchBbox=null;    
let _lastFetchData=null;       
let _fetchInProgress=false;
const FETCH_DEBOUNCE=2000;     
const BBOX_THRESHOLD=0.003;   

const OVERPASS_MIRRORS=[
  'https://overpass.kumi.systems/api/interpreter',
  'https://overpass-api.de/api/interpreter',
  'https://maps.mail.ru/osm/tools/overpass/api/interpreter',
];

function fetchRealObstacles(){
  if(_fetchInProgress) return;     
  clearTimeout(_fetchTimer);
  _fetchTimer=setTimeout(_doFetchRealObstacles, FETCH_DEBOUNCE);
}

async function _doFetchRealObstacles(){
  if(!leafletMap||_fetchInProgress) return;
  const bounds=leafletMap.getBounds();
  const s=+bounds.getSouth().toFixed(4), w=+bounds.getWest().toFixed(4);
  const n=+bounds.getNorth().toFixed(4), e=+bounds.getEast().toFixed(4);
  const bboxKey=`${s},${w},${n},${e}`;

  
  if(_lastFetchBbox && _lastFetchData){
    const [ps,pw,pn,pe]=_lastFetchBbox.split(',').map(Number);
    if(Math.abs(s-ps)<BBOX_THRESHOLD && Math.abs(w-pw)<BBOX_THRESHOLD &&
       Math.abs(n-pn)<BBOX_THRESHOLD && Math.abs(e-pe)<BBOX_THRESHOLD){
      _applyObstaclesToGrid(_lastFetchData);
      return;
    }
  }

  _fetchInProgress=true;
  _clearRealObstacles();
  addLog('Fetching OSM obstacles...','info');
  document.getElementById('map-info').textContent='⏳ Loading real obstacles...';

  const bbox=`${s},${w},${n},${e}`;
  
  const query=
    `[out:json][timeout:25];`+
    `(`+
      `way["building"](${bbox});`+
      `way["natural"~"water|wood"](${bbox});`+
      `way["leisure"="park"](${bbox});`+
      `way["landuse"~"military|forest|reservoir"](${bbox});`+
      `way["aeroway"~"runway|taxiway|apron"](${bbox});`+
    `);out body;>;out skel qt;`;

  let data=null, lastErr='';

  for(let mi=0; mi<OVERPASS_MIRRORS.length; mi++){
    const mirror=OVERPASS_MIRRORS[mi];
   
    if(mi>0) await new Promise(r=>setTimeout(r, 1500*mi));
    try{
      const ctrl=new AbortController();
      const timeout=setTimeout(()=>ctrl.abort(),18000); 
      const res=await fetch(mirror,{
        method:'POST',
        headers:{'Content-Type':'application/x-www-form-urlencoded'},
        body:'data='+encodeURIComponent(query),
        signal:ctrl.signal
      });
      clearTimeout(timeout);
      const text=await res.text();
      if(res.status===429){
        const wait=parseInt(res.headers.get('Retry-After')||'10')*1000||10000;
        addLog(`Rate limited by ${mirror.split('/')[2]} — waiting ${wait/1000}s`,'warn');
        await new Promise(r=>setTimeout(r,wait));
       
        const res2=await fetch(mirror,{method:'POST',
          headers:{'Content-Type':'application/x-www-form-urlencoded'},
          body:'data='+encodeURIComponent(query)});
        const text2=await res2.text();
        if(res2.ok && !text2.trim().startsWith('<')){
          data=JSON.parse(text2); break;
        }
        lastErr=`429 retry failed on ${mirror.split('/')[2]}`;
        continue;
      }
      if(!res.ok||text.trim().startsWith('<')){
        lastErr=`HTTP ${res.status} from ${mirror.split('/')[2]}`;
        addLog(`⚠ ${mirror.split('/')[2]}: ${res.status}`,'warn');
        continue;
      }
      data=JSON.parse(text);
      addLog(`✓ OSM data: ${mirror.split('/')[2]}`,'info');
      break;
    } catch(err){
      if(err.name==='AbortError') lastErr='Timeout on '+mirror.split('/')[2];
      else lastErr=err.message;
      addLog(`⚠ ${mirror.split('/')[2]}: ${lastErr}`,'warn');
    }
  }

  _fetchInProgress=false;

  if(!data){
    addLog('All OSM mirrors failed. Try again later.','err');
    document.getElementById('map-info').textContent='⚠ OSM unavailable — try again later';
    return;
  }

  _lastFetchBbox=bboxKey;
  _lastFetchData=data;
  _applyObstaclesToGrid(data);
}

function _clearRealObstacles(){
  for(let r=0;r<ROWS;r++) for(let c=0;c<COLS;c++){
    if(grid[r][c]===CELL.OBSTACLE||grid[r][c]===CELL.NOFLY) grid[r][c]=CELL.SAFE;
  }
  grid[startPos.y][startPos.x]=CELL.START;
  if(destPos) grid[destPos.y][destPos.x]=CELL.DEST;
  waypoints.forEach(wp=>grid[wp.y][wp.x]=CELL.WAYPOINT);
  renderAll();
}

function _applyObstaclesToGrid(data){
  const mapBounds=leafletMap.getBounds();
  const totalLat=mapBounds.getNorth()-mapBounds.getSouth();
  const totalLng=mapBounds.getEast()-mapBounds.getWest();


  const nodes={};
  data.elements.forEach(el=>{ if(el.type==='node') nodes[el.id]={lat:el.lat,lon:el.lon}; });

  let obstacleCount=0, noflyCount=0;

  data.elements.forEach(el=>{
    if(el.type!=='way') return;
    const tags=el.tags||{};

    
    let cellType=null;
    if(tags.building) cellType=CELL.OBSTACLE;
    else if(tags.natural==='water'||tags.waterway==='riverbank'||
            tags.leisure==='park'||tags.landuse==='forest'||
            tags.aeroway||tags.landuse==='military') cellType=CELL.NOFLY;
    else if(tags.highway==='motorway') cellType=CELL.NOFLY;
    if(!cellType) return;

  
    if(!el.nodes||el.nodes.length<2) return;
    const coords=el.nodes.map(id=>nodes[id]).filter(Boolean);
    if(coords.length<2) return;

    
    const lats=coords.map(p=>p.lat);
    const lngs=coords.map(p=>p.lon);
    const minLat=Math.min(...lats), maxLat=Math.max(...lats);
    const minLng=Math.min(...lngs), maxLng=Math.max(...lngs);

    // Convert to grid cells
    const c0=Math.max(0,Math.floor((minLng-mapBounds.getWest())/totalLng*COLS));
    const c1=Math.min(COLS-1,Math.ceil((maxLng-mapBounds.getWest())/totalLng*COLS));
    const r0=Math.max(0,Math.floor((mapBounds.getNorth()-maxLat)/totalLat*ROWS));
    const r1=Math.min(ROWS-1,Math.ceil((mapBounds.getNorth()-minLat)/totalLat*ROWS));

    for(let r=r0;r<=r1;r++){
      for(let c=c0;c<=c1;c++){
        if(grid[r][c]===CELL.SAFE){
          grid[r][c]=cellType;
          if(cellType===CELL.NOFLY) noflyCount++; else obstacleCount++;
        }
      }
    }
  });

 
  grid[startPos.y][startPos.x]=CELL.START;
  if(destPos) grid[destPos.y][destPos.x]=CELL.DEST;
  waypoints.forEach(wp=>grid[wp.y][wp.x]=CELL.WAYPOINT);

  realObstaclesLoaded=true;
  addLog(`✓ ${obstacleCount} buildings, ${noflyCount} no-fly zones loaded`,'ok');
  document.getElementById('map-info').textContent=`✓ ${obstacleCount} obstacles | ${noflyCount} no-fly`;
  renderAll();
}

// ══════════════════════════════════════════════════════════════
