from typing import Dict, List, Optional
from controller.hardware.sensors.sensor import Sensor

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
    def __init__(self, total_sensors: int = 2) -> None:
        """
        Initializes the SensorManager with the available sensors.
        
        Args:
            total_sensors (int): Number of sensors to manage
        """
        # Define the sensor ports based on total_sensors
        self.sensor_ports = [f"/dev/ttyUSB{i}" for i in range(total_sensors)]
        
        # Initialize available sensors
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

    def assign_specific_sensor(self, plant_id: str, sensor_port: str) -> str:
        """
        Assign a specific sensor port to the given plant.

        If the sensor port is currently available, it will be removed from the
        available pool and assigned. If the plant already has a sensor assigned,
        this will override it.

        Args:
            plant_id (str): Unique identifier for the plant.
            sensor_port (str): The specific sensor port to assign (e.g. "/dev/ttyUSB0").

        Returns:
            str: The sensor port that was assigned.
        """
        # Remove from available list if present
        if sensor_port in self.available_sensors:
            self.available_sensors.remove(sensor_port)

        # If plant had a different sensor, release it back to available
        if plant_id in self.plant_sensor_map:
            prev = self.plant_sensor_map[plant_id]
            if prev and prev != sensor_port and prev not in self.available_sensors:
                self.available_sensors.append(prev)

        # Assign mapping
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

    def get_available_sensor(self) -> Optional[Sensor]:
        """
        Get an available sensor object.
        
        Returns:
            Optional[Sensor]: Available sensor object, or None if no sensors available
        """
        if not self.available_sensors:
            return None
        
        sensor_port = self.available_sensors[0]  # Peek at the first available sensor
        return Sensor(simulation_mode=False, port=sensor_port)

    def get_available_ports(self) -> List[int]:
        """
        Get list of available sensor port numbers.
        
        Returns:
            List[int]: List of available sensor port numbers
        """
        return [i for i, port in enumerate(self.sensor_ports) if port in self.available_sensors]

    def release_sensor_object(self, sensor: Sensor) -> None:
        """
        Release a sensor object back to the available pool.
        
        Args:
            sensor (Sensor): The sensor object to release
        """
        sensor_port = sensor.port
        if sensor_port not in self.available_sensors:
            self.available_sensors.append(sensor_port)

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
