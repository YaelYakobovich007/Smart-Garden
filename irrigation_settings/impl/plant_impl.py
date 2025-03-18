class PlantImpl:
    def __init__(self, desired_moisture, pot_size,sensor, schedule=None):
        self.desired_moisture = desired_moisture
        self.pot_size = pot_size
        self.schedule = schedule or {}
        self.sensor = sensor
        self.last_irrigation_time = None


    def get_moisture(self):
        return self.sensor.read_moisture()
