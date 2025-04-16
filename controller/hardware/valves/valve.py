from typing import Optional
from datetime import datetime

from controller.hardware.relay_controller import RelayController

class Valve:
    def __init__(self, valve_id: int, pipe_diameter: float, water_limit: float,
                 flow_rate: float, relay_controller: Optional[object], simulation_mode: bool = True) -> None:
        self.valve_id: int = valve_id
        self.pipe_diameter: float = pipe_diameter
        self.water_limit: float = water_limit
        self.flow_rate: float = flow_rate
        self.last_irrigation_time: Optional[datetime] = None
        self.is_blocked: bool = False
        self.relay_controller: Optional["RelayController"] = relay_controller
        self.simulation_mode: bool = simulation_mode

    def calculate_open_time(self, water_amount: float) -> float:
        return water_amount / self.flow_rate

    def request_open(self) -> None:
        if self.is_blocked:
            raise RuntimeError(f"Error: Valve {self.valve_id} is BLOCKED!")

        if self.simulation_mode:
            print(f"[SIMULATION] Valve {self.valve_id} ON")
        elif self.relay_controller:
            self.relay_controller.turn_on(self.valve_id)
        else:
            raise RuntimeError(f"Error: No RelayController connected to Valve {self.valve_id}!")

        self.last_irrigation_time = datetime.now()

    def request_close(self) -> None:
        if self.simulation_mode:
            print(f"[SIMULATION] Valve {self.valve_id} OFF")
        elif self.relay_controller:
            self.relay_controller.turn_off(self.valve_id)
        else:
            raise RuntimeError(f"Error: No RelayController connected to Valve {self.valve_id}!")

    def block(self) -> None:
        self.is_blocked = True
        print(f"Valve {self.valve_id} has been BLOCKED!")

    def unblock(self) -> None:
        self.is_blocked = False
        print(f"Valve {self.valve_id} has been UNBLOCKED!")

    def get_valve_id(self):
        return self.valve_id

