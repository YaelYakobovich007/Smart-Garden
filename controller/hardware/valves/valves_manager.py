from collections import deque
from typing import Dict

class ValvesManager:
    """
    Manages the assignment and release of water valves to plants in the irrigation system.

    Attributes:
        total_valves (int): Total number of valves managed.
        available_valves (deque[int]): Queue of currently available (unassigned) valve IDs.
        plant_valve_map (Dict[int, int]): Mapping from plant_id to assigned valve_id.
    """
    def __init__(self, total_valves):
        self.total_valves: int = total_valves
        self.available_valves: deque[int] = deque(range(total_valves))
        self.plant_valve_map: Dict[int, int] = {}  # plant_id -> valve_id

    def get_valve_id(self, plant_id):
        """
        Retrieves the valve ID assigned to a specific plant.

        Args:
            plant_id (int): Unique identifier of the plant.

        Returns:
            int: The valve ID assigned to the plant.
        """
        if plant_id not in self.plant_valve_map:
            raise ValueError(f"No valve assigned for plant {plant_id}!")
        return self.plant_valve_map[plant_id]

    def assign_valve(self, plant_id: int) -> int:
        """
        Assigns an available valve to a plant.

        Args:
            plant_id (int): Unique identifier of the plant.

        Returns:
            int: The valve ID that was assigned.
        """
        if not self.available_valves:
            raise RuntimeError("No available valves.")

        valve_id = self.available_valves.popleft()
        self.plant_valve_map[plant_id] = valve_id
        return valve_id

    def release_valve(self, plant_id: int) -> None:
        """
        Releases the valve assigned to a specific plant, making it available for reassignment.

        Args:
            plant_id (int): Unique identifier of the plant.
        """
        if plant_id in self.plant_valve_map:
            valve_id = self.plant_valve_map.pop(plant_id)
            self.available_valves.append(valve_id)
        else:
            raise ValueError(f"Plant {plant_id} has no assigned valve")

 