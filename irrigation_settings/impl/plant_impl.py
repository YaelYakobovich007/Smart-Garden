class PlantImpl:
    def __init__(self, desired_moisture, pot_size, schedule=None):
        self.desired_moisture = desired_moisture
        self.pot_size = pot_size
        self.schedule = schedule or {}
