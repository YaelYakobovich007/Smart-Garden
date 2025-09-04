from collections import deque
from typing import Dict, List, Optional
from controller.hardware.valves.valve import Valve
from controller.hardware.relay_controller import RelayController

class ValvesManager:
    """
    Manages the assignment and release of water valves to plants in the irrigation system.

    Attributes:
        total_valves (int): Total number of valves managed.
        available_valves (deque[int]): Queue of currently available (unassigned) valve IDs.
        plant_valve_map (Dict[int, int]): Mapping from plant_id to assigned valve_id.
        relay_controller (RelayController): Controller for hardware relays.
    """
    def __init__(self, total_valves, simulation_mode: bool = False):
        self.total_valves: int = total_valves
        # Relay channels are 1-4, so valves should be 1-4, not 0-3
        self.available_valves: deque[int] = deque(range(1, total_valves + 1))
        self.plant_valve_map: Dict[int, int] = {}  # plant_id -> valve_id
        self.relay_controller = RelayController(simulation_mode=bool(simulation_mode))

        # Safety: force all physical valves OFF at startup
        try:
            for channel in range(1, self.total_valves + 1):
                try:
                    self.relay_controller.turn_off(channel)
                except Exception:
                    pass
        except Exception:
            pass

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

    def assign_specific_valve(self, plant_id: int, valve_id: int) -> int:
        """
        Assign a specific valve ID to the given plant.

        If the valve ID is currently available, it will be removed from the
        available pool and assigned. If the plant already has a valve assigned,
        this will override it and return the previous one to the pool.

        Args:
            plant_id (int): Unique identifier of the plant.
            valve_id (int): Specific valve ID to assign.

        Returns:
            int: The valve ID that was assigned.
        """
        # Remove from available pool if present
        try:
            self.available_valves.remove(valve_id)
        except ValueError:
            # Not in available list; assume it can still be assigned (already in use)
            pass

        # If plant had a different valve, release it
        prev = self.plant_valve_map.get(plant_id)
        if prev is not None and prev != valve_id:
            # Return previous valve to pool
            if prev not in self.available_valves:
                self.available_valves.append(prev)

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

    def get_available_valve(self) -> Optional[Valve]:
        """
        Get an available valve object.
        
        Returns:
            Optional[Valve]: Available valve object, or None if no valves available
        """
        if not self.available_valves:
            return None
        
        valve_id = self.available_valves[0]  # Peek at the first available valve
        return Valve(
            valve_id=valve_id,
            pipe_diameter=1.0,
            water_limit=1.0,
            flow_rate=0.05,
            relay_controller=self.relay_controller,
            simulation_mode=self.relay_controller.simulation_mode
        )

    def get_available_valve_ids(self) -> List[int]:
        """
        Get list of available valve IDs.
        
        Returns:
            List[int]: List of available valve IDs
        """
        return list(self.available_valves)

    def release_valve_object(self, valve: Valve) -> None:
        """
        Release a valve object back to the available pool.
        
        Args:
            valve (Valve): The valve object to release
        """
        valve_id = valve.valve_id
        if valve_id not in self.available_valves:
            self.available_valves.append(valve_id)

 