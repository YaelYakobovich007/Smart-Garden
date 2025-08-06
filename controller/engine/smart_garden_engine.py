import asyncio
import threading
import time
from datetime import datetime
from typing import Dict, List, Optional, Tuple
from controller.models.plant import Plant
from controller.hardware.valves.valves_manager import ValvesManager
from controller.hardware.sensors.sensor_manager import SensorManager
from controller.irrigation.irrigation_algorithm import IrrigationAlgorithm

class SmartGardenEngine:
    """
    Main engine for the Smart Garden system.
    Manages plants, sensors, valves, and irrigation operations.
    """

    def __init__(self, total_valves: int = 2, total_sensors: int = 2):
        """
        Initialize the Smart Garden Engine.
        
        Args:
            total_valves (int): Number of valves available in the system
            total_sensors (int): Number of sensors available in the system
        """
        self.plants: Dict[int, Plant] = {}
        self.valves_manager = ValvesManager(total_valves)
        self.sensor_manager = SensorManager(total_sensors)
        self.irrigation_algorithm = IrrigationAlgorithm()
        
        # Valve state tracking for non-blocking operations
        self.valve_tasks: Dict[int, asyncio.Task] = {}  # Track running valve tasks
        self.valve_states: Dict[int, Dict] = {}  # Track valve states
        self._lock = asyncio.Lock()  # Thread-safe operations

    async def add_plant(
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
        """
        Add a new plant to the system.
        
        Args:
            plant_id (int): Unique identifier for the plant
            desired_moisture (float): Target moisture level for the plant
            schedule_data (Optional[List[Dict[str, str]]]): Irrigation schedule data
            plant_lat (float): Plant's latitude coordinate
            plant_lon (float): Plant's longitude coordinate
            pipe_diameter (float): Diameter of the irrigation pipe in cm
            flow_rate (float): Water flow rate in L/s
            water_limit (float): Maximum water limit in L
        """
        # Get available valve and sensor
        valve = self.valves_manager.get_available_valve()
        sensor = self.sensor_manager.get_available_sensor()
        
        if not valve or not sensor:
            raise RuntimeError("No available valves or sensors")
        
        # Remove the valve and sensor from available pools
        self.valves_manager.available_valves.popleft()  # Remove the valve we just got
        self.sensor_manager.available_sensors.pop(0)    # Remove the sensor we just got
        
        # Create plant with valve and sensor
        plant = Plant(
            plant_id=plant_id,
            desired_moisture=desired_moisture,
            valve=valve,
            sensor=sensor,
            lat=plant_lat,
            lon=plant_lon,
            pipe_diameter=pipe_diameter,
            flow_rate=flow_rate,
            water_limit=water_limit
        )
        
        self.plants[plant_id] = plant
        print(f"Plant {plant_id} added with valve {valve.valve_id} and sensor {sensor.port}")

    async def water_plant(self, plant_id: int) -> None:
        """
        Water a specific plant using the irrigation algorithm.
        
        Args:
            plant_id (int): ID of the plant to water
        """
        if plant_id not in self.plants:
            raise ValueError(f"Plant {plant_id} not found")
        
        plant = self.plants[plant_id]
        result = await self.irrigation_algorithm.irrigate(plant)
        print(f"Irrigation result for plant {plant_id}: {result}")

    def remove_plant(self, plant_id: int) -> None:
        """
        Remove a plant from the system.
        
        Args:
            plant_id (int): ID of the plant to remove
        """
        if plant_id in self.plants:
            plant = self.plants[plant_id]
            # Release valve and sensor back to managers
            self.valves_manager.release_valve_object(plant.valve)
            self.sensor_manager.release_sensor_object(plant.sensor)
            del self.plants[plant_id]
            print(f"Plant {plant_id} removed")

    async def update_all_moisture(self) -> None:
        """
        Update moisture levels for all plants.
        """
        for plant in self.plants.values():
            await plant.update_sensor_data()

    def disable_plant_watering(self, plant_id: int) -> None:
        """
        Disable watering for a specific plant.
        
        Args:
            plant_id (int): ID of the plant to disable watering for
        """
        if plant_id in self.plants:
            self.plants[plant_id].valve.block()
            print(f"Watering disabled for plant {plant_id}")

    def enable_plant_watering(self, plant_id: int) -> None:
        """
        Enable watering for a specific plant.
        
        Args:
            plant_id (int): ID of the plant to enable watering for
        """
        if plant_id in self.plants:
            self.plants[plant_id].valve.unblock()
            print(f"Watering enabled for plant {plant_id}")

    def get_available_sensors(self) -> List[int]:
        """
        Get list of available sensor ports.
        
        Returns:
            List[int]: List of available sensor port numbers
        """
        return self.sensor_manager.get_available_ports()

    def get_available_valves(self) -> List[int]:
        """
        Get list of available valve IDs.
        
        Returns:
            List[int]: List of available valve IDs
        """
        return self.valves_manager.get_available_valve_ids()

    async def get_plant_moisture(self, plant_id: int) -> Optional[float]:
        """
        Get the current moisture level for a specific plant.
        
        Args:
            plant_id (int): ID of the plant to get moisture for
            
        Returns:
            Optional[float]: Current moisture level, or None if plant not found
        """
        if plant_id not in self.plants:
            print(f"Plant {plant_id} not found")
            return None
        
        try:
            plant = self.plants[plant_id]
            moisture = await plant.get_moisture()
            print(f"Moisture for plant {plant_id}: {moisture}%")
            return moisture
        except Exception as e:
            print(f"Error getting moisture for plant {plant_id}: {e}")
            return None

    async def get_plant_sensor_data(self, plant_id: int) -> Optional[tuple]:
        """
        Get complete sensor data (moisture, temperature) for a specific plant.
        
        Args:
            plant_id (int): ID of the plant to get sensor data for
            
        Returns:
            Optional[tuple]: Tuple of (moisture, temperature), or None if plant not found
        """
        if plant_id not in self.plants:
            print(f"Plant {plant_id} not found")
            return None
        
        try:
            plant = self.plants[plant_id]
            sensor_data = await plant.get_sensor_data()
            print(f"Sensor data for plant {plant_id}: {sensor_data}")
            return sensor_data
        except Exception as e:
            print(f"Error getting sensor data for plant {plant_id}: {e}")
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
                moisture = await plant.get_moisture()
                moisture_data[plant_id] = moisture
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
        Opens the valve for a specific plant for a given duration using non-blocking approach.
        
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
        
        async with self._lock:
            # Check if valve is already in use
            if plant_id in self.valve_tasks and not self.valve_tasks[plant_id].done():
                print(f"❌ ERROR - Valve for plant {plant_id} is already in use")
                return False
            
            try:
                print(f"🔍 DEBUG - Opening valve for plant {plant_id} for {time_minutes} minutes")
                
                # Open the valve
                plant.valve.request_open()
                print(f"✅ DEBUG - Valve opened successfully for plant {plant_id}")
                
                # Initialize valve state
                self.valve_states[plant_id] = {
                    'is_open': True,
                    'start_time': time.time(),
                    'duration_minutes': time_minutes,
                    'plant_id': plant_id
                }
                
                # Create background task to close valve after duration
                close_task = asyncio.create_task(self._close_valve_after_duration(plant_id, time_minutes))
                self.valve_tasks[plant_id] = close_task
                
                print(f"✅ DEBUG - Background task created for plant {plant_id}")
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

    async def close_valve(self, plant_id: int) -> bool:
        """
        Immediately closes the valve for a specific plant.
        
        Args:
            plant_id (int): The ID of the plant whose valve should be closed
            
        Returns:
            bool: True if valve was successfully closed, False otherwise
        """
        print(f"🔍 DEBUG - SmartGardenEngine.close_valve() called:")
        print(f"   - plant_id: {plant_id}")
        
        if plant_id not in self.plants:
            print(f"❌ ERROR - Plant {plant_id} not found")
            return False
        
        plant = self.plants[plant_id]
        
        async with self._lock:
            try:
                # Cancel any running background task
                if plant_id in self.valve_tasks and not self.valve_tasks[plant_id].done():
                    print(f"🔍 DEBUG - Cancelling background task for plant {plant_id}")
                    self.valve_tasks[plant_id].cancel()
                    try:
                        await self.valve_tasks[plant_id]
                    except asyncio.CancelledError:
                        print(f"✅ DEBUG - Background task cancelled for plant {plant_id}")
                
                # Close the valve
                plant.valve.request_close()
                print(f"✅ DEBUG - Valve closed successfully for plant {plant_id}")
                
                # Update valve state
                if plant_id in self.valve_states:
                    self.valve_states[plant_id]['is_open'] = False
                
                return True
                
            except Exception as e:
                print(f"❌ ERROR - Error closing valve for plant {plant_id}: {e}")
                return False

    async def _close_valve_after_duration(self, plant_id: int, time_minutes: int) -> None:
        """
        Background task to close valve after specified duration.
        
        Args:
            plant_id (int): The ID of the plant
            time_minutes (int): Duration in minutes to wait before closing
        """
        try:
            print(f"🔍 DEBUG - Background task started for plant {plant_id}")
            print(f"   - Waiting {time_minutes} minutes before closing valve")
            
            # Wait for the specified duration
            await asyncio.sleep(time_minutes * 60)  # Convert minutes to seconds
            
            # Check if valve is still open (not manually closed)
            if plant_id in self.valve_states and self.valve_states[plant_id]['is_open']:
                print(f"🔍 DEBUG - Auto-closing valve for plant {plant_id} after {time_minutes} minutes")
                
                plant = self.plants[plant_id]
                plant.valve.request_close()
                print(f"✅ DEBUG - Valve auto-closed for plant {plant_id}")
                
                # Update valve state
                self.valve_states[plant_id]['is_open'] = False
            else:
                print(f"🔍 DEBUG - Valve for plant {plant_id} was already closed manually")
                
        except asyncio.CancelledError:
            print(f"🔍 DEBUG - Background task cancelled for plant {plant_id}")
            raise
        except Exception as e:
            print(f"❌ ERROR - Error in background task for plant {plant_id}: {e}")
        finally:
            # Clean up task reference
            if plant_id in self.valve_tasks:
                del self.valve_tasks[plant_id]

    def get_valve_state(self, plant_id: int) -> Optional[Dict]:
        """
        Get the current state of a valve for a specific plant.
        
        Args:
            plant_id (int): The ID of the plant
            
        Returns:
            Optional[Dict]: Valve state information, or None if not found
        """
        return self.valve_states.get(plant_id)

    def is_valve_open(self, plant_id: int) -> bool:
        """
        Check if a valve is currently open for a specific plant.
        
        Args:
            plant_id (int): The ID of the plant
            
        Returns:
            bool: True if valve is open, False otherwise
        """
        valve_state = self.valve_states.get(plant_id)
        return valve_state is not None and valve_state.get('is_open', False)
