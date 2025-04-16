from datetime import time


class Valve:
    def __init__(self, valve_id, plant_id, pipe_diameter,water_limit, flow_rate , relay_controller,simulation_mode=True):
        self.valve_id = valve_id
        self.plant_id = plant_id
        self.pipe_diameter = pipe_diameter
        self.water_limit = water_limit
        self.flow_rate = flow_rate
        self.last_irrigation_time = None
        self.is_blocked = False
        self.relay_controller = relay_controller
        self.simulation_mode = simulation_mode



    def calculate_open_time(self, water_amount): #חלוקה באפס צריך לבדוק
        open_time = water_amount / self.flow_rate  #seconds
        return open_time

    def request_open(self):
        if self.is_blocked:
            raise RuntimeError(f" Error: Valve {self.valve_id} is BLOCKED and cannot be opened!")

        if self.simulation_mode:
            print(f" [SIMULATION] Valve {self.valve_id} ON (simulated)")
        elif self.relay_controller:
            self.relay_controller.open_valve(self.valve_id)
        else:
            raise RuntimeError(f" Error: No RelayController connected to Valve {self.valve_id}!")

        self.last_irrigation_time = time()

    def request_close(self):
        if self.simulation_mode:
            print(f" [SIMULATION] Valve {self.valve_id} OFF (simulated)")
        elif self.relay_controller:
            self.relay_controller.close_valve(self.valve_id)
        else:
            raise RuntimeError(f" Error: No RelayController connected to Valve {self.valve_id}!")


    def block(self):
        self.is_blocked = True
        print(f" Valve {self.valve_id} has been BLOCKED due to an error!")

    def unblock(self):
        self.is_blocked = False
        print(f" Valve {self.valve_id} has been UNBLOCKED and can now operate normally.")

    def get_valve_id(self):
        return self.valve_id

