from collections import deque
from typing import Dict

class ValvesManager:
    def __init__(self, total_valves):
        self.total_valves: int = total_valves
        self.available_valves: deque[int] = deque(range(total_valves))
        self.plant_valve_map: Dict[int, int] = {}  # plant_id -> valve_id

    def get_valve_id(self, plant_id):
        if plant_id not in self.plant_valve_map:
            raise ValueError(f"No valve assigned for plant {plant_id}!")
        return self.plant_valve_map[plant_id]

    def assign_valve(self, plant_id: int) -> int:
        if not self.available_valves:
            raise RuntimeError("No available valves.")

        valve_id = self.available_valves.popleft()
        self.plant_valve_map[plant_id] = valve_id
        return valve_id

    def release_valve(self, plant_id: int) -> None:
        if plant_id in self.plant_valve_map:
            valve_id = self.plant_valve_map.pop(plant_id)
            self.available_valves.append(valve_id)
        else:
            raise ValueError(f"Plant {plant_id} has no assigned valve")

 