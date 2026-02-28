# MISSION WAYPOINTS
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
    return eta
