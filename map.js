// ============================================================
// MAP  —  Leaflet OSM underlay, location search, opacity sync
// ============================================================

// REAL LEAFLET OSM MAP UNDERLAY
// ══════════════════════════════════════════════════════════════
let osmVisible=false;
let leafletMap=null;
let mapInitialized=false;

function initLeafletMap(){
  if(mapInitialized) return;
  mapInitialized=true;
  const wrap=document.getElementById('grid-wrap');
  const mapDiv=document.getElementById('leaflet-map');
  mapDiv.style.width=wrap.clientWidth+'px';
  mapDiv.style.height=wrap.clientHeight+'px';

  leafletMap=L.map('leaflet-map',{
    center:[28.6139,77.2090], // Default: New Delhi
    zoom:14,
    zoomControl:false,
    attributionControl:false,
    dragging:true,
    scrollWheelZoom:false, // managed by our wheel handler
  });

  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',{
    maxZoom:19,
    attribution:'© OpenStreetMap'
  }).addTo(leafletMap);

  // Sync map size to grid-wrap on resize
  window.addEventListener('resize',()=>{
    if(!leafletMap) return;
    mapDiv.style.width=wrap.clientWidth+'px';
    mapDiv.style.height=wrap.clientHeight+'px';
    leafletMap.invalidateSize();
  });

  // Update coord display with map center
  leafletMap.on('move',()=>{
    const c=leafletMap.getCenter();
    document.getElementById('map-info').textContent=
      `🗺 ${c.lat.toFixed(4)}°N  ${c.lng.toFixed(4)}°E  Z${leafletMap.getZoom()}`;
  });
  leafletMap.on('moveend',()=>{syncGridToMap();fetchRealObstacles();});

  addLog('Leaflet OSM map initialized','ok');
  document.getElementById('map-info').textContent='🗺 MAP ACTIVE — drag to pan, scroll to zoom';
  setTimeout(()=>syncGridToMap(), 500);
}

function syncGridToMap(){
  // Draws a semi-transparent grid overlay aligned to the map
  if(!osmVisible||!leafletMap) return;
  const wrap=document.getElementById('grid-wrap');
  const W=wrap.clientWidth, H=wrap.clientHeight;
  // Update map div size
  document.getElementById('leaflet-map').style.width=W+'px';
  document.getElementById('leaflet-map').style.height=H+'px';
  leafletMap.invalidateSize();
  renderAll();
}

function toggleOSM(){
  osmVisible=!osmVisible;
  const b=document.getElementById('btn-osm');
  b.classList.toggle('on',osmVisible);
  const mapDiv=document.getElementById('leaflet-map');
  if(osmVisible){
    mapDiv.style.display='block';
    initLeafletMap();
    addLog('🗺 Live OSM map ON — drag to pan','ok');
    // Auto-fetch real obstacles after map tiles load
    setTimeout(()=>fetchRealObstacles(), 2500);
  } else {
    mapDiv.style.display='none';
    document.getElementById('map-info').textContent='🗺 LIVE MAP OFF';
    addLog('OSM map OFF','info');
    realObstaclesLoaded=false;
    clearTimeout(_fetchTimer);
    _fetchInProgress=false;
    _lastFetchBbox=null;
    _clearRealObstacles();
  }
  renderAll();
}

// Make grid canvases semi-transparent over map
function updateCanvasOpacity(){
  if(osmVisible){
    canvasGrid.style.display='none';
    canvasFog.style.opacity='0.75';
    canvasOSM.style.display='none';
    // Let clicks pass through to overlay for destination/waypoint placement
    canvasOv.style.pointerEvents='all';
  } else {
    canvasGrid.style.display='block';
    canvasFog.style.opacity='1';
    canvasOv.style.pointerEvents='none';
  }
}

// Search location using Nominatim geocoder
function toggleMapSearch(){
  const el=document.getElementById('map-search');
  el.classList.toggle('visible');
  if(el.classList.contains('visible'))
    setTimeout(()=>document.getElementById('map-search-input').focus(),50);
}
async function searchLocation(){
  const q=document.getElementById('map-search-input').value.trim();
  if(!q) return;
  addLog(`Searching: ${q}...`,'info');
  try {
    const url=`https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(q)}&format=json&limit=1`;
    const res=await fetch(url,{headers:{'Accept-Language':'en'}});
    const data=await res.json();
    if(data.length){
      const{lat,lon,display_name}=data[0];
      if(!osmVisible) toggleOSM();
      leafletMap.setView([+lat,+lon],15);
      addLog(`📍 ${display_name.split(',').slice(0,2).join(',')}  (${(+lat).toFixed(4)}, ${(+lon).toFixed(4)})`,'ok');
      document.getElementById('map-search').classList.remove('visible');
      document.getElementById('map-search-input').value='';
    } else {
      addLog(`Location not found: ${q}`,'err');
    }
  } catch(e){
    addLog('Search failed — check internet connection','err');
  }
}
function drawOSM(){ /* legacy stub — real map via Leaflet */ }

// ══════════════════════════════════════════════════════════════
// OVERPASS API — fetch real buildings/water/parks as obstacles
// ══════════════════════════════════════════════════════════════
