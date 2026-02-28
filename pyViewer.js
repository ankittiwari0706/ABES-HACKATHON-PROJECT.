/
const PY = {
'THETA': `# Θ* — ANY-ANGLE PATH PLANNING
# Unlike A*, Theta* uses Line-of-Sight to create
# diagonal shortcuts, producing smoother paths.
import heapq, math

def line_of_sight(grid, a, b):
    """Bresenham ray-cast — true if a→b is unobstructed."""
    x0,y0=a; x1,y1=b
    dx,dy=abs(x1-x0),abs(y1-y0)
    sx=1 if x0<x1 else -1
    sy=1 if y0<y1 else -1
    err=dx-dy
    while True:
        if grid[y0][x0] in (OBSTACLE,NOFLY): return False
        if x0==x1 and y0==y1: return True
        e2=2*err
        if e2>-dy: err-=dy; x0+=sx
        if e2< dx: err+=dx; y0+=sy

def theta_star(grid, start, goal, cfg):
    open_heap=[(0,start)]
    g={start:0}; parent={start:start}; closed=set()
    los_checks=0
    while open_heap:
        _,curr=heapq.heappop(open_heap)
        if curr in closed: continue
        closed.add(curr)
        if curr==goal:
            path=[]; c=goal
            while c!=parent[c]: path.append(c); c=parent[c]
            path.append(start); return path[::-1]
        for nb in neighbors8(curr, grid):  # 8-connected
            if nb in closed: continue
            los_checks+=1
            gpar=parent[curr]
            # KEY: if LOS from grandparent → skip intermediate
            if line_of_sight(grid, gpar, nb):
                ng=g[gpar]+dist(gpar,nb)
                if ng < g.get(nb,inf):
                    g[nb]=ng; parent[nb]=gpar
                    heapq.heappush(open_heap,(ng+h(nb,goal),nb))
            else:
                ng=g[curr]+dist(curr,nb)
                if ng < g.get(nb,inf):
                    g[nb]=ng; parent[nb]=curr
                    heapq.heappush(open_heap,(ng+h(nb,goal),nb))
    return []`,

'ENERGY': `# ENERGY CONTOUR MAP
# Shows reachable range from any point given current battery.
# Uses Dijkstra from drone position outward.
import heapq

def energy_contour(grid, source, battery_pct,
                   cfg, max_energy=None):
    """
    Compute energy cost from source to every reachable cell.
    Returns dist_map: dict[Cell, float] — energy to reach.
    Battery limits how far drone can go.
    """
    if max_energy is None:
        max_energy = (battery_pct/100) - cfg.safe_buffer
    dist={source:0}
    pq=[(0,source)]
    while pq:
        cost,curr=heapq.heappop(pq)
        if cost>dist.get(curr,inf): continue
        for nb in neighbors(curr, grid):
            step_cost=cell_cost(nb,grid,cfg)
            new_cost=cost+step_cost
            if new_cost<=max_energy and new_cost<dist.get(nb,inf):
                dist[nb]=new_cost
                heapq.heappush(pq,(new_cost,nb))
    return dist   # cells NOT in dict are unreachable

# Render: green=close, yellow=moderate, red=near limit
# Cells outside dist_map are rendered as unreachable (dark)`,

'FOG': `# PARTIAL MAP REVEAL (Fog of War)
# Drone only "sees" cells within sensor radius.
# D* handles unknown terrain by treating unseen
# cells as potentially blocked until revealed.

class FogOfWar:
    def __init__(self, rows, cols, reveal_radius=6):
        # fog_map: True = still hidden, False = revealed
        self.fog = [[True]*cols for _ in range(rows)]
        self.radius = reveal_radius
        self.revealed_count = 0
        self.total = rows * cols

    def reveal(self, pos, grid):
        """Reveal cells in LOS within radius of drone."""
        cx, cy = pos
        newly_found_obstacles = []
        for dr in range(-self.radius, self.radius+1):
            for dc in range(-self.radius, self.radius+1):
                nr,nc = cy+dr, cx+dc
                if nr<0 or nr>=len(self.fog): continue
                if nc<0 or nc>=len(self.fog[0]): continue
                if dr*dr+dc*dc > self.radius*self.radius: continue
                if self.fog[nr][nc]:
                    self.fog[nr][nc] = False
                    self.revealed_count += 1
                    # If obstacle found, trigger D* replan
                    if grid[nr][nc] in (OBSTACLE,NOFLY):
                        newly_found_obstacles.append((nc,nr))
        return newly_found_obstacles  # feed to D*.update_obstacle()

    def coverage_pct(self):
        return self.revealed_count / self.total * 100`,

'WAYPOINTS': `# MISSION WAYPOINTS
# Drone visits each waypoint in order before reaching goal.
# Path is chained: start→wp1→wp2→...→wpN→destination

def plan_waypoint_mission(grid, start, waypoints,
                           destination, cfg, algo='theta'):
    """
    Chain paths through all waypoints in sequence.
    Returns full path and per-segment breakdown.
    """
    full_path = []
    checkpoints = [start] + waypoints + [destination]
    segments = []

    for i in range(len(checkpoints)-1):
        src  = checkpoints[i]
        dst  = checkpoints[i+1]
        seg  = plan_path(algo, grid, src, dst, cfg)
        if not seg:
            raise ValueError(f"No path: {src} → {dst}")
        # Avoid duplicating junction points
        if full_path and seg[0]==full_path[-1]:
            seg = seg[1:]
        full_path.extend(seg)
        segments.append({'from':src,'to':dst,'steps':len(seg)})

    return full_path, segments

# Waypoint ETA calculation
def estimate_eta(path, current_step, waypoints):
    eta = {}
    wp_set = {tuple(w) for w in waypoints}
    for i,cell in enumerate(path[current_step:],current_step):
        if tuple(cell) in wp_set:
            eta[tuple(cell)] = i - current_step
    return eta`,

'GEOFENCE': `# NO-FLY ZONE ENFORCEMENT WITH ALERTS
# Geofences fire real-time alerts when path enters
# restricted airspace — not just a pre-flight check.

class GeofenceEnforcer:
    def __init__(self, zones, alert_callback):
        self.zones = zones
        self.alert = alert_callback
        self.violations = []
        self.alerted = set()  # avoid repeat alerts

    def check_step(self, cell, step_num):
        """Call on every drone step during flight."""
        for zone in self.zones:
            if zone.contains(cell):
                key = (zone.label, cell)
                if key not in self.alerted:
                    self.alerted.add(key)
                    self.violations.append({
                        'cell': cell,
                        'zone': zone.label,
                        'step': step_num
                    })
                    # Fire live alert
                    self.alert(
                        f"GEOFENCE BREACH: {zone.label} "
                        f"at {cell} (step {step_num})"
                    )
                return True
        return False

    def clear(self):
        self.violations.clear()
        self.alerted.clear()`,
};

const ALGO_PY = {theta:'THETA',astar:'THETA',dstar:'THETA',gwa:'THETA',dijkstra:'THETA',apf:'THETA'};


let pyOpen=true, pyTab='active', curSection='THETA';

function highlight(code){
  const esc=s=>s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
  return code.split('\n').map((raw,i)=>{
    let line=esc(raw), cm='';
    const ci=raw.indexOf('#');
    if(ci>=0){cm=line.slice(line.indexOf('#'));line=line.slice(0,line.indexOf('#'));}
    line=line.replace(/("""[\s\S]*?"""|'''[\s\S]*?'''|"[^"]*"|'[^']*')/g,m=>`<span class="st">${m}</span>`);
    ['def ','class ','return ','import ','from ','if ','elif ','else:','while ','for ','in ','not ','and ','or ','True','False','None','self','pass','break','continue','raise '].forEach(k=>{
      line=line.replace(new RegExp(`\\b${k.trim()}\\b`,'g'),`<span class="kw">${k.trim()}</span>`);
    });
    line=line.replace(/(@\w+)/g,'<span style="color:var(--py-dec)">$1</span>');
    line=line.replace(/\b(def)\s+(\w+)/g,'<span class="kw">def</span> <span class="fn">$2</span>');
    ['print','len','range','list','dict','set','float','int','str','min','max','abs','round','heapq'].forEach(b=>{
      line=line.replace(new RegExp(`\\b${b}\\b`,'g'),`<span class="bi">${b}</span>`);
    });
    line=line.replace(/\b(\d+\.?\d*)\b/g,'<span class="nm">$1</span>');
    if(cm) line+=`<span class="cm">${cm}</span>`;
    return `<div class="py-line" id="pyl-${i}"><span class="py-ln">${i+1}</span><span class="py-src">${line}</span></div>`;
  }).join('');
}

function renderPyCode(section,hl=[]){
  curSection=section;
  const box=document.getElementById('py-code-box');
  const code=pyTab==='all'?Object.values(PY).join('\n\n'):(PY[section]||PY['THETA']);
  box.innerHTML=highlight(code);
  document.getElementById('active-fn-badge').textContent=section;
  if(hl.length){
    hl.forEach(n=>{const el=document.getElementById('pyl-'+n);if(el)el.classList.add('run-highlight');});
    const f=document.getElementById('pyl-'+hl[0]);if(f)f.scrollIntoView({block:'center',behavior:'smooth'});
  }
}
function setPyTab(t){pyTab=t;['active','all'].forEach(x=>document.getElementById('pytab-'+x).classList.toggle('active',x===t));renderPyCode(curSection);}
function flashLines(s,l){renderPyCode(s,l);}

function togglePyPanel(){
  pyOpen=!pyOpen;
  const p=document.getElementById('py-panel');
  const m=document.getElementById('main-layout');
  const b=document.getElementById('py-toggle-btn');
  if(pyOpen){p.classList.remove('collapsed');m.classList.remove('py-hidden');b.classList.add('on');b.textContent='◀ 🐍 CODE';setTimeout(()=>{renderPyCode(curSection);resizeCanvases();},380);}
  else{p.classList.add('collapsed');m.classList.add('py-hidden');b.classList.remove('on');b.textContent='▶ 🐍 CODE';setTimeout(()=>resizeCanvases(),380);}
}
document.addEventListener('keydown',e=>{
  if((e.ctrlKey||e.metaKey)&&e.key==='p'){e.preventDefault();togglePyPanel();return;}
  // Grid zoom keys: + / - (no modifier needed, ignore if typing in input)
  if(e.target.tagName==='INPUT') return;
  if(e.key==='+'||e.key==='='||e.key==='ArrowUp'&&e.ctrlKey){
    e.preventDefault();
    if(osmVisible&&leafletMap) leafletMap.zoomIn();
    else zoomGrid(0.15);
    return;
  }
  if(e.key==='-'||e.key==='ArrowDown'&&e.ctrlKey){
    e.preventDefault();
    if(osmVisible&&leafletMap) leafletMap.zoomOut();
    else zoomGrid(-0.15);
    return;
  }
  if(e.key==='0'&&(e.ctrlKey||e.metaKey)){
    e.preventDefault();
    gridZoom=1.0;resizeCanvases();
    const zpEl2=document.getElementById('zoom-pct');if(zpEl2)zpEl2.textContent='100%';
    addLog('Grid zoom reset to 100%','info');
    return;
  }
});

document.getElementById('grid-wrap').addEventListener('wheel', e=>{
  e.preventDefault();
  if(osmVisible && leafletMap){
 
    if(e.deltaY < 0) leafletMap.zoomIn(1);
    else leafletMap.zoomOut(1);
  } else {
    
    const delta = e.deltaY < 0 ? 0.1 : -0.1;
    zoomGrid(delta);
  }
}, {passive:false});




