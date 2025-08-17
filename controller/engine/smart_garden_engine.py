import asyncio
import threading
import time
from datetime import datetime, timedelta
from typing import Dict, List, Optional, Tuple
from controller.models.plant import Plant
from controller.models.dripper_type import DripperType
from controller.hardware.valves.valves_manager import ValvesManager
from controller.hardware.sensors.sensor_manager import SensorManager
from controller.irrigation.irrigation_algorithm import IrrigationAlgorithm
from controller.dto.irrigation_result import IrrigationResult
from controller.hardware.valves.valve import Valve
from controller.hardware.sensors.sensor import Sensor

class SmartGardenEngine:
    """
    Main engine for the Smart Garden system.
    Manages plants, sensors, valves, and irrigation operations.
    """

    def __init__(self, total_valves: int = 2, total_sensors: int = 2, websocket_client=None):
        """
        Initialize the Smart Garden Engine.
        
        Args:
            total_valves (int): Number of valves available in the system
            total_sensors (int): Number of sensors available in the system
            websocket_client: WebSocket client for sending logs to server
        """
        self.plants: Dict[int, Plant] = {}
        self.valves_manager = ValvesManager(total_valves)
        self.sensor_manager = SensorManager(total_sensors)
        self.irrigation_algorithm = IrrigationAlgorithm(websocket_client)
        self.websocket_client = websocket_client
        
        # Valve state tracking for non-blocking operations
        self.valve_tasks: Dict[int, asyncio.Task] = {}  # Track running valve tasks
        self.valve_states: Dict[int, Dict] = {}  # Track valve states
        
        # Irrigation task tracking for proper cancellation
        self.irrigation_tasks: Dict[int, asyncio.Task] = {}  # Track running irrigation tasks
        
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
            water_limit: float = 1.0,
            dripper_type: str = "2L/h"
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
        # Check if we have available valves and sensors
        if not self.valves_manager.available_valves:
            raise RuntimeError("No available valves")
        
        if not self.sensor_manager.available_sensors:
            raise RuntimeError("No available sensors")
        
        # Assign valve and sensor using proper assignment methods
        valve_id = self.valves_manager.assign_valve(plant_id)
        sensor_port = self.sensor_manager.assign_sensor(str(plant_id))
        
        # Create valve and sensor objects
        valve = Valve(
            valve_id=valve_id,
            pipe_diameter=pipe_diameter,
            water_limit=water_limit,
            flow_rate=flow_rate,
            relay_controller=self.valves_manager.relay_controller,
            simulation_mode=False
        )
        
        sensor = Sensor(
            simulation_mode=False,
            port=sensor_port
        )
        
        # Parse dripper type from string
        try:
            dripper_type_enum = DripperType.from_string(dripper_type)
        except ValueError:
            print(f"Invalid dripper type '{dripper_type}', using default 2L/h")
            dripper_type_enum = DripperType.TYPE_2LH
        
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
            water_limit=water_limit,
            dripper_type=dripper_type_enum
        )
        
        self.plants[plant_id] = plant
        print(f"Plant {plant_id} added with valve {valve.valve_id} and sensor {sensor.port}")

    async def water_plant(self, plant_id: int) -> IrrigationResult:
        """
        Water a specific plant by delegating to irrigate_plant to ensure proper task management.
        This ensures that STOP can properly cancel the irrigation task.
        
        Args:
            plant_id (int): ID of the plant to water
            
        Returns:
            IrrigationResult: Result of the irrigation operation
        """
        # Always delegate to irrigate_plant which creates a cancellable task
        return await self.irrigate_plant(plant_id)

    async def irrigate_plant(self, plant_id: int) -> IrrigationResult:
        """
        Start irrigation for a specific plant using task-based approach for proper cancellation.
        
        Args:
            plant_id (int): ID of the plant to irrigate
            
        Returns:
            IrrigationResult: Result of the irrigation operation
        """
        if plant_id not in self.plants:
            raise ValueError(f"Plant {plant_id} not found")
        
        # Check if plant is already being irrigated
        if plant_id in self.irrigation_tasks and not self.irrigation_tasks[plant_id].done():
            print(f"⚠️ Plant {plant_id} is already being irrigated")
            return IrrigationResult.error(
                plant_id=plant_id,
                error_message="Plant is already being irrigated. Please wait for current irrigation to complete or stop it first."
            )
        
        plant = self.plants[plant_id]
        
        try:
            # Create irrigation task for proper cancellation support
            irrigation_task = asyncio.create_task(
                self.irrigation_algorithm.irrigate(plant),
                name=f"irrigation_plant_{plant_id}"
            )
            
            # Store the task for potential cancellation
            self.irrigation_tasks[plant_id] = irrigation_task
            print(f"🚀 Started irrigation task for plant {plant_id}")
            
            # Wait for irrigation to complete
            result = await irrigation_task
            
            print(f"✅ Irrigation task completed for plant {plant_id}: {result.status}")
            return result
            
        except asyncio.CancelledError:
            print(f"🛑 Irrigation task for plant {plant_id} was cancelled")
            # Return a stopped result
            current_moisture = plant.sensor.current_reading if plant.sensor else 0
            return IrrigationResult.success(
                plant_id=plant_id,
                reason="Irrigation stopped by user request",
                moisture=current_moisture,
                final_moisture=current_moisture,
                water_added_liters=0  # We don't track partial water in cancellation
            )
        except Exception as e:
            print(f"❌ Irrigation task failed for plant {plant_id}: {e}")
            return IrrigationResult.error(
                plant_id=plant_id,
                error_message=f"Irrigation failed: {str(e)}"
            )
        finally:
            # Clean up the task reference
            if plant_id in self.irrigation_tasks:
                del self.irrigation_tasks[plant_id]
                print(f"🧹 Cleaned up irrigation task for plant {plant_id}")

    async def stop_irrigation(self, plant_id: int) -> bool:
        """
        Stop irrigation for a specific plant by cancelling its irrigation task.
        If no task exists, still attempts to close the valve for safety.
        
        Args:
            plant_id (int): ID of the plant to stop irrigation for
            
        Returns:
            bool: True if irrigation was stopped or valve was closed, False if plant not found
        """
        # Check if plant exists
        if plant_id not in self.plants:
            print(f"No plant found with ID {plant_id}")
            return False
            
        plant = self.plants[plant_id]
        
        # Try to cancel irrigation task if it exists
        task = self.irrigation_tasks.get(plant_id)
        if task:
            if not task.done():
                print(f"Cancelling irrigation task for plant {plant_id}")
                task.cancel()
                try:
                    await asyncio.wait_for(task, timeout=1.0)
                    print(f"Successfully cancelled irrigation for plant {plant_id}")
                except (asyncio.TimeoutError, asyncio.CancelledError):
                    print(f"Irrigation task cancelled for plant {plant_id}")
            # Clean up task reference
            del self.irrigation_tasks[plant_id]
        else:
            print(f"No irrigation task found for plant {plant_id}")
            
        # Always try to close the valve for safety
        if plant.valve.is_open:
            try:
                plant.valve.request_close()
                print(f"Closed valve for plant {plant_id}")
                return True
            except Exception as e:
                print(f"Failed to close valve for plant {plant_id}: {e}")
                return False
                
        return True

    def remove_plant(self, plant_id: int) -> None:
        """
        Remove a plant from the system.
        
        Args:
            plant_id (int): ID of the plant to remove
        """
        if plant_id in self.plants:
            plant = self.plants[plant_id]
            # Release valve and sensor back to managers using proper methods
            try:
                self.valves_manager.release_valve(plant_id)
                self.sensor_manager.release_sensor(str(plant_id))
            except ValueError as e:
                print(f"Warning: {e}")
            
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
                
                # Calculate duration in seconds
                duration_seconds = time_minutes * 60
                
                # Initialize valve state BEFORE opening valve
                start_time = time.time()
                self.valve_states[plant_id] = {
                    'is_open': True,
                    'start_time': start_time,
                    'duration_minutes': time_minutes,
                    'duration_seconds': duration_seconds,
                    'plant_id': plant_id,
                    'auto_close_time': start_time + duration_seconds,  # Calculate exact close time
                    'task_start_time': start_time  # Track when background task started
                }
                
                # Open the valve
                plant.valve.request_open()
                print(f"✅ DEBUG - Valve opened successfully for plant {plant_id}")
                print(f"✅ DEBUG - Start time: {datetime.fromtimestamp(start_time).strftime('%H:%M:%S')}")
                print(f"✅ DEBUG - Duration: {time_minutes} minutes ({duration_seconds} seconds)")
                print(f"✅ DEBUG - Expected close time: {datetime.fromtimestamp(start_time + duration_seconds).strftime('%H:%M:%S')}")
                
                # Create background task to close valve after duration
                close_task = asyncio.create_task(self._close_valve_after_duration(plant_id, duration_seconds))
                self.valve_tasks[plant_id] = close_task
                
                print(f"✅ DEBUG - Background task created for plant {plant_id}")
                return True
                
            except Exception as e:
                print(f"❌ ERROR - Error opening valve for plant {plant_id}: {e}")
                # Clean up state in case of error
                if plant_id in self.valve_states:
                    del self.valve_states[plant_id]
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
                    self.valve_states[plant_id]['manual_close_time'] = time.time()
                
                return True
                
            except Exception as e:
                print(f"❌ ERROR - Error closing valve for plant {plant_id}: {e}")
                return False

    async def _close_valve_after_duration(self, plant_id: int, duration_seconds: int) -> None:
        """
        Background task to close valve after specified duration.
        
        Args:
            plant_id (int): The ID of the plant
            duration_seconds (int): Duration in seconds to wait before closing
        """
        try:
            print(f"🔍 DEBUG - Background task started for plant {plant_id}")
            print(f"   - Waiting {duration_seconds} seconds before closing valve")
            print(f"   - Start time: {datetime.now().strftime('%H:%M:%S')}")
            
            # Record the actual start time for validation
            task_start_time = time.time()
            expected_end_time = task_start_time + duration_seconds
            print(f"   - Expected end time: {datetime.fromtimestamp(expected_end_time).strftime('%H:%M:%S')}")
            
            # Wait for the specified duration using asyncio.sleep
            await asyncio.sleep(duration_seconds)
            
            # Record the actual end time for validation
            task_end_time = time.time()
            actual_duration = task_end_time - task_start_time
            
            print(f"🔍 DEBUG - Background task timer completed for plant {plant_id}")
            print(f"   - Current time: {datetime.now().strftime('%H:%M:%S')}")
            print(f"   - Expected duration: {duration_seconds} seconds")
            print(f"   - Actual duration: {actual_duration:.2f} seconds")
            print(f"   - Timing difference: {abs(actual_duration - duration_seconds):.2f} seconds")
            
            # Validate timing accuracy (allow 2 second tolerance for system load)
            if abs(actual_duration - duration_seconds) > 2.0:
                print(f"⚠️  WARNING - Timing discrepancy detected!")
                print(f"   - Expected: {duration_seconds} seconds")
                print(f"   - Actual: {actual_duration:.2f} seconds")
                print(f"   - Difference: {abs(actual_duration - duration_seconds):.2f} seconds")
                print(f"   - This might indicate system clock issues or high system load")
            
            # Check if valve is still open (not manually closed)
            if plant_id in self.valve_states and self.valve_states[plant_id]['is_open']:
                print(f"🔍 DEBUG - Auto-closing valve for plant {plant_id} after {duration_seconds} seconds")
                
                plant = self.plants[plant_id]
                plant.valve.request_close()
                print(f"✅ DEBUG - Valve auto-closed for plant {plant_id}")
                
                # Update valve state with actual timing information
                self.valve_states[plant_id]['is_open'] = False
                self.valve_states[plant_id]['auto_close_time'] = time.time()
                self.valve_states[plant_id]['actual_duration'] = actual_duration
                self.valve_states[plant_id]['timing_accuracy'] = abs(actual_duration - duration_seconds)
            else:
                print(f"🔍 DEBUG - Valve for plant {plant_id} was already closed manually")
                
        except asyncio.CancelledError:
            print(f"🔍 DEBUG - Background task cancelled for plant {plant_id}")
            raise
        except Exception as e:
            print(f"❌ ERROR - Error in background task for plant {plant_id}: {e}")
            # Try to close valve even if there's an error
            try:
                if plant_id in self.plants:
                    plant = self.plants[plant_id]
                    plant.valve.request_close()
                    print(f"✅ DEBUG - Valve closed due to background task error")
            except Exception as close_error:
                print(f"❌ ERROR - Failed to close valve after background task error: {close_error}")
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

    def get_detailed_valve_status(self, plant_id: int) -> Optional[Dict]:
        """
        Get detailed valve status for debugging purposes.
        
        Args:
            plant_id (int): The ID of the plant
            
        Returns:
            Optional[Dict]: Detailed valve status information, or None if not found
        """
        if plant_id not in self.plants:
            return None
            
        plant = self.plants[plant_id]
        valve_state = self.valve_states.get(plant_id, {})
        
        # Get valve hardware status
        valve_status = plant.valve.get_status()
        
        # Combine with engine state
        detailed_status = {
            'plant_id': plant_id,
            'plant_name': getattr(plant, 'name', 'Unknown'),
            'engine_state': valve_state,
            'valve_hardware': valve_status,
            'has_background_task': plant_id in self.valve_tasks,
            'task_status': 'running' if (plant_id in self.valve_tasks and not self.valve_tasks[plant_id].done()) else 'completed/cancelled'
        }
        
        return detailed_status

    def get_all_valve_statuses(self) -> Dict[int, Dict]:
        """
        Get detailed status for all valves in the system.
        
        Returns:
            Dict[int, Dict]: Dictionary mapping plant_id to detailed valve status
        """
        statuses = {}
        for plant_id in self.plants.keys():
            status = self.get_detailed_valve_status(plant_id)
            if status:
                statuses[plant_id] = status
        return statuses
