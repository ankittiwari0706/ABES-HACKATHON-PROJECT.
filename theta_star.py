# Θ* — ANY-ANGLE PATH PLANNING
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
    return []
