from typing import Dict, List, Optional

class SensorManager:
    """
    Manages the assignment of physical sensors to plants.
    
    This class manages two sensors identified by their ports:
    - Sensor 1: /dev/ttyUSB0 (Modbus ID: 1)
    - Sensor 2: /dev/ttyUSB1 (Modbus ID: 1)

    Attributes:
        available_sensors (List[str]): List of sensor ports that are currently unassigned.
        plant_sensor_map (Dict[str, str]): Mapping of plant_id to assigned sensor_port.
        sensor_configs (Dict[str, Dict]): Configuration for each sensor port.
    """
    def __init__(self) -> None:
        """
        Initializes the SensorManager with the two available sensors.
        """
        # Define the two sensor ports
        self.sensor_ports = ["/dev/ttyUSB0", "/dev/ttyUSB1"]
        
        # Initialize available sensors (both ports)
        self.available_sensors: List[str] = self.sensor_ports.copy()
        self.plant_sensor_map: Dict[str, str] = {}  # Mapping: plant_id → sensor_port

    def assign_sensor(self, plant_id: str) -> str:
        """
        Assigns the next available sensor to the given plant.

        Args:
            plant_id (str): Unique identifier for the plant.

        Returns:
            str: The sensor port that was assigned.

        Raises:
            ValueError: If the plant already has a sensor or no sensors are available.
        """
        if plant_id in self.plant_sensor_map:
            raise ValueError(f"Plant {plant_id} already has a sensor.")

        if not self.available_sensors:
            raise ValueError("No available sensors left")

        sensor_port = self.available_sensors.pop(0)  # Take the first available sensor
        self.plant_sensor_map[plant_id] = sensor_port
        return sensor_port

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

        sensor_port = self.plant_sensor_map.pop(plant_id)
        self.available_sensors.append(sensor_port)

    def get_sensor_port(self, plant_id: str) -> str:
        """
        Retrieves the sensor port currently assigned to the given plant.

        Args:
            plant_id (str): The plant ID to look up.

        Returns:
            str: The sensor port assigned to the plant.

        Raises:
            ValueError: If no sensor is assigned to the plant.
        """
        if plant_id not in self.plant_sensor_map:
            raise ValueError(f"Plant {plant_id} has no assigned sensor.")
        return self.plant_sensor_map[plant_id]

    def get_available_sensors(self) -> List[str]:
        """
        Returns a list of currently unassigned sensor ports.

        Returns:
            List[str]: A copy of the list of available sensor ports.
        """
        return self.available_sensors.copy()

    def get_sensor_config(self, sensor_port: str) -> Dict:
        """
        Gets the configuration for a specific sensor port.

        Args:
            sensor_port (str): The sensor port (e.g., "/dev/ttyUSB0").

        Returns:
            Dict: The sensor configuration with standard settings.

        Raises:
            ValueError: If the sensor port is not configured.
        """
        if sensor_port not in self.sensor_ports:
            raise ValueError(f"Unknown sensor port: {sensor_port}")
        
        # Both sensors have the same configuration
        return {
            "port": sensor_port,
            "baudrate": 4800
        }

    def get_all_sensor_configs(self) -> Dict[str, Dict]:
        """
        Gets all sensor configurations.

        Returns:
            Dict[str, Dict]: All sensor configurations.
        """
        configs = {}
        for port in self.sensor_ports:
            configs[port] = self.get_sensor_config(port)
        return configs

    def get_assigned_plants(self) -> Dict[str, str]:
        """
        Gets all plant-sensor assignments.

        Returns:
            Dict[str, str]: Mapping of plant_id to sensor_port.
        """
        return self.plant_sensor_map.copy()

    def is_sensor_available(self, sensor_port: str) -> bool:
        """
        Checks if a specific sensor port is available.

        Args:
            sensor_port (str): The sensor port to check.

        Returns:
            bool: True if the sensor is available, False otherwise.
        """
        return sensor_port in self.available_sensors

    def get_sensor_status(self) -> Dict[str, Dict]:
        """
        Gets the status of all sensors.

        Returns:
            Dict[str, Dict]: Status of each sensor including availability and assignment.
        """
        status = {}
        for port in self.sensor_ports:
            status[port] = {
                "available": port in self.available_sensors,
                "assigned_to": None
            }
            
            # Find which plant this sensor is assigned to
            for plant_id, assigned_port in self.plant_sensor_map.items():
                if assigned_port == port:
                    status[port]["assigned_to"] = plant_id
                    break
                    
        return status
