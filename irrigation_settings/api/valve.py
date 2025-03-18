class Valve:
    def __init__(self, valve_id, plant_id, pipe_diameter,water_limit, flow_rate):
        self.valve_id = valve_id
        self.plant_id = plant_id
        self.pipe_diameter = pipe_diameter
        self.water_limit = water_limit
        self.flow_rate = flow_rate


    def calculate_open_time(self, water_amount):
        open_time = water_amount / self.flow_rate  # שניות
        return open_time