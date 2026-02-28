# NO-FLY ZONE ENFORCEMENT WITH ALERTS
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
        self.alerted.clear()
