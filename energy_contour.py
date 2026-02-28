# ENERGY CONTOUR MAP
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
# Cells outside dist_map are rendered as unreachable (dark)
