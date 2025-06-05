from typing import Dict, List

class SensorManager:
    """
    Manages the assignment of physical sensors to plants.

    This class ensures that each plant is assigned a unique sensor
    and that no sensor is assigned to more than one plant at a time.

    Attributes:
        available_sensors (List[int]): List of sensor IDs that are currently unassigned.
        plant_sensor_map (Dict[int, int]): Mapping of plant_id to assigned sensor_id.
    """
    def __init__(self, total_sensors: int = 2) -> None:
        """
        Initializes the SensorManager with a fixed number of available sensors.

        Args:
            total_sensors (int): Total number of sensors in the system.
        """
        self.available_sensors: List[int] = list(range(total_sensors))  # e.g., [0, 1, 2, ...]
        self.plant_sensor_map: Dict[int, int] = {} # Mapping: plant_id → sensor_id

    def assign_sensor(self, plant_id: str) -> int:
        """
        Assigns the next available sensor to the given plant.

        Args:
            plant_id (str): Unique identifier for the plant.

        Returns:
            int: The sensor ID that was assigned.

        Raises:
            ValueError: If the plant already has a sensor or no sensors are available.
        """
        if plant_id in self.plant_sensor_map:
            raise ValueError(f"Plant {plant_id} already has a sensor.")

        if not self.available_sensors:
            raise ValueError("No available sensors left")

        sensor_id = self.available_sensors.pop(0) # Take the first available sensor
        self.plant_sensor_map[plant_id] = sensor_id
        return sensor_id

    def release_sensor(self, plant_id: str) -> None:
        """
        Releases the sensor assigned to the given plant, making it available for reassignment.

        Args:
            plant_id (str): The plant whose sensor is to be released.

        Raises:
            ValueError: If the plant does not have a sensor assigned.
        """
        if plant_id not in self.plant_sensor_map:
            raise ValueError(f"Plant {plant_id} has no assigned sensor.")

        sensor_id = self.plant_sensor_map.pop(plant_id)
        self.available_sensors.append(sensor_id)

    def get_sensor_id(self, plant_id: str) -> int:
        """
        Retrieves the sensor ID currently assigned to the given plant.

        Args:
            plant_id (str): The plant ID to look up.

        Returns:
            int: The sensor ID assigned to the plant.

        Raises:
            ValueError: If no sensor is assigned to the plant.
        """
        if plant_id not in self.plant_sensor_map:
            raise ValueError(f"Plant {plant_id} has no assigned sensor.")
        return self.plant_sensor_map[plant_id]

    def get_available_sensors(self) -> List[int]:
        """
        Returns a list of currently unassigned sensor IDs.

        Returns:
            List[int]: A copy of the list of available sensors.
        """
        return self.available_sensors.copy()
