# PARTIAL MAP REVEAL (Fog of War)
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
        return self.revealed_count / self.total * 100
