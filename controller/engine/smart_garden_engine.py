from typing import Dict, List, Optional
from controller.hardware.relay_controller import RelayController
from controller.hardware.sensors.sensor import Sensor
from controller.hardware.sensors.sensor_manager import SensorManager
from controller.hardware.valves.valve import Valve
from controller.hardware.valves.valves_manager import ValvesManager
from controller.irrigation.irrigation_algorithm import IrrigationAlgorithm
from controller.irrigation.irrigation_schedule import IrrigationSchedule
from controller.models.plant import Plant


class SmartGardenEngine:
    """
    Central engine managing the smart garden logic, including plant registration,
    valve and sensor management, and execution of irrigation.
    """

    def __init__(self, total_valves: int = 4, total_sensors: int = 2):
        """
        Initializes the SmartGardenEngine with a given number of valves and sensors.
        """
        self.valves_manager: ValvesManager = ValvesManager(total_valves)
        self.sensor_manager = SensorManager()
        self.irrigation_algorithm = IrrigationAlgorithm()
        self.plants: Dict[int, Plant] = {}
        self.relay_controller: RelayController = RelayController(simulation_mode=False)

    def add_plant(
            self,
            plant_id: int,
            desired_moisture: float,
            schedule_data: Optional[List[Dict[str, str]]] = None,
            plant_lat: float = 32.7940,
            plant_lon: float = 34.9896,
            pipe_diameter: float = 1.0,
            flow_rate: float = 0.05,
            water_limit: float = 1.0
    ) -> None:
        if plant_id in self.plants:
            raise ValueError(f"Plant ID {plant_id} already exists")

        valve_id = self.valves_manager.assign_valve(plant_id)
        sensor_port = self.sensor_manager.assign_sensor(plant_id)

        valve = Valve(valve_id, pipe_diameter, water_limit, flow_rate, relay_controller=self.relay_controller,
                      simulation_mode=False)
        sensor = Sensor(simulation_mode=False, port=sensor_port)

        plant = Plant(plant_id, desired_moisture, sensor, valve, plant_lat, plant_lon)
        self.plants[plant_id] = plant

        if schedule_data:
            plant.schedule = IrrigationSchedule(plant, schedule_data, self.irrigation_algorithm)

    async def water_plant(self, plant_id: int) -> None:
        """
        Initiates watering for a specific plant by ID.
        """
        if plant_id not in self.plants:
            raise ValueError(f"Plant {plant_id} not found.")
        plant = self.plants[plant_id]
        await self.irrigation_algorithm.irrigate(plant)

    def remove_plant(self, plant_id: int) -> None:
        """
        Removes a plant and releases its associated resources.
        """
        if plant_id not in self.plants:
            raise ValueError(f"Plant {plant_id} not found")
        self.valves_manager.release_valve(plant_id)
        self.sensor_manager.release_sensor(plant_id)
        del self.plants[plant_id]

    async def update_all_moisture(self) -> None:
        """
        Updates moisture levels for all plants (used in simulation mode).
        """
        for plant in self.plants.values():
            await plant.update_moisture()

    def disable_plant_watering(self, plant_id: int) -> None:
        """
        Disables irrigation for a specific plant.
        """
        if plant_id not in self.plants:
            raise ValueError(f"Plant {plant_id} not found")
        self.plants[plant_id].valve.disable()

    def enable_plant_watering(self, plant_id: int) -> None:
        """
        Re-enables irrigation for a specific plant.
        """
        if plant_id not in self.plants:
            raise ValueError(f"Plant {plant_id} not found")
        self.plants[plant_id].valve.enable()

    def get_available_sensors(self) -> List[int]:
        """
        Returns a list of currently unassigned sensor IDs.
        """
        return self.sensor_manager.get_available_sensors()

    def get_available_valves(self) -> List[int]:
        """
        Returns a list of currently unassigned valve IDs.
        """
        return self.valves_manager.get_available_valves()

    async def get_plant_moisture(self, plant_id: int) -> Optional[float]:
        """
        Get moisture level for a specific plant.
        
        Args:
            plant_id (int): ID of the plant to get moisture for
            
        Returns:
            Optional[float]: Current moisture level percentage, or None if plant not found or sensor unavailable
        """
        if plant_id not in self.plants:
            raise ValueError(f"Plant {plant_id} not found")
        
        plant = self.plants[plant_id]
        try:
            moisture_level = await plant.get_moisture()
            return moisture_level
        except Exception as e:
            # Log error but don't crash - return None to indicate unavailable
            print(f"Error reading moisture for plant {plant_id}: {e}")
            return None

    async def get_plant_sensor_data(self, plant_id: int) -> Optional[tuple]:
        """
        Get complete sensor data (moisture, temperature) for a specific plant.
        
        Args:
            plant_id (int): ID of the plant to get sensor data for
            
        Returns:
            Optional[tuple]: (moisture, temperature) or None if plant not found or sensor unavailable
        """
        if plant_id not in self.plants:
            raise ValueError(f"Plant {plant_id} not found")
        
        plant = self.plants[plant_id]
        try:
            sensor_data = await plant.get_sensor_data()
            return sensor_data
        except Exception as e:
            # Log error but don't crash - return None to indicate unavailable
            print(f"Error reading sensor data for plant {plant_id}: {e}")
            return None

    async def get_all_plants_moisture(self) -> Dict[int, Optional[float]]:
        """
        Get moisture levels for all plants in the system.
        
        Returns:
            Dict[int, Optional[float]]: Dictionary mapping plant_id to moisture level.
                                       None values indicate sensor read failures.
        """
        moisture_data = {}
        
        for plant_id, plant in self.plants.items():
            try:
                moisture_level = await plant.get_moisture()
                moisture_data[plant_id] = moisture_level
            except Exception as e:
                # Log error but continue with other plants
                print(f"Error reading moisture for plant {plant_id}: {e}")
                moisture_data[plant_id] = None
        
        return moisture_data

    async def get_all_plants_sensor_data(self) -> Dict[int, Optional[tuple]]:
        """
        Get complete sensor data (moisture, temperature) for all plants in the system.
        
        Returns:
            Dict[int, Optional[tuple]]: Dictionary mapping plant_id to (moisture, temperature).
                                       None values indicate sensor read failures.
        """
        sensor_data = {}
        
        for plant_id, plant in self.plants.items():
            try:
                plant_sensor_data = await plant.get_sensor_data()
                sensor_data[plant_id] = plant_sensor_data
            except Exception as e:
                # Log error but continue with other plants
                print(f"Error reading sensor data for plant {plant_id}: {e}")
                sensor_data[plant_id] = None
        
        return sensor_data

    async def update_all_sensor_data(self) -> None:
        """
        Updates sensor data (moisture, temperature) for all plants.
        """
        for plant in self.plants.values():
            await plant.update_sensor_data()

    def get_plant_by_id(self, plant_id: int) -> Optional[Plant]:
        """
        Get a plant by its ID.
        
        Args:
            plant_id (int): The ID of the plant to retrieve
            
        Returns:
            Optional[Plant]: The plant object if found, None otherwise
        """
        return self.plants.get(plant_id)

    async def open_valve(self, plant_id: int, time_minutes: int) -> bool:
        """
        Opens the valve for a specific plant for a given duration.
        
        Args:
            plant_id (int): The ID of the plant whose valve should be opened
            time_minutes (int): Duration in minutes to keep the valve open
            
        Returns:
            bool: True if valve was successfully opened, False otherwise
            
        Raises:
            ValueError: If plant_id is not found
        """
        print(f"🔍 DEBUG - SmartGardenEngine.open_valve() called:")
        print(f"   - plant_id: {plant_id}")
        print(f"   - time_minutes: {time_minutes}")
        
        if plant_id not in self.plants:
            print(f"❌ ERROR - Plant {plant_id} not found")
            raise ValueError(f"Plant {plant_id} not found")
        
        plant = self.plants[plant_id]
        print(f"✅ DEBUG - Found plant: {plant_id}")
        print(f"   - plant.valve.valve_id: {plant.valve.valve_id}")
        print(f"   - plant.valve.simulation_mode: {plant.valve.simulation_mode}")
        print(f"   - plant.valve.relay_controller: {plant.valve.relay_controller}")
        
        try:
            print(f"🔍 DEBUG - Opening valve for plant {plant_id} for {time_minutes} minutes")
            
            # Open the valve using the correct method name
            plant.valve.request_open()
            print(f"✅ DEBUG - Valve opened successfully for plant {plant_id}")
            
            # Schedule valve closure after the specified time
            import asyncio
            print(f"🔍 DEBUG - Waiting {time_minutes} minutes before closing valve")
            await asyncio.sleep(time_minutes * 60)  # Convert minutes to seconds
            
            # Close the valve after the time has elapsed using the correct method name
            plant.valve.request_close()
            print(f"✅ DEBUG - Valve closed for plant {plant_id} after {time_minutes} minutes")
            
            return True
            
        except Exception as e:
            print(f"❌ ERROR - Error opening valve for plant {plant_id}: {e}")
            # Ensure valve is closed in case of error
            try:
                plant.valve.request_close()
                print(f"✅ DEBUG - Valve closed due to error")
            except Exception as close_error:
                print(f"❌ ERROR - Failed to close valve after error: {close_error}")
            return False
