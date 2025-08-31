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
from controller.irrigation.irrigation_schedule import IrrigationSchedule
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

        # Start schedule runner thread (run_pending)
        try:
            import schedule
            def _run_schedule_loop():
                import time as _time
                while True:
                    try:
                        schedule.run_pending()
                    except Exception:
                        pass
                    _time.sleep(1)

            t = threading.Thread(target=_run_schedule_loop, daemon=True)
            t.start()
        except Exception:
            # If schedule module missing or any failure, skip run loop
            pass

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
            dripper_type: str = "2L/h",
            sensor_port: Optional[str] = None,
            valve_id: Optional[int] = None
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
        
         # Assign valve and sensor; if specific IDs are provided (from server sync), use them
        if valve_id is not None:
            self.valves_manager.assign_specific_valve(plant_id, int(valve_id))
        else:
            valve_id = self.valves_manager.assign_valve(plant_id)

        if sensor_port is not None:
            self.sensor_manager.assign_specific_sensor(str(plant_id), sensor_port)
        else:
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
        
        # Pass the shared port lock from sensor manager
        try:
            port_lock = self.sensor_manager.get_port_lock(sensor_port)
        except Exception:
            port_lock = None

        sensor = Sensor(
            simulation_mode=False,
            port=sensor_port,
            port_lock=port_lock
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

        # Attach schedule if provided
        try:
            if schedule_data:
                # Ensure schedule entries include full day names and HH:MM times; IrrigationSchedule normalizes
                try:
                    loop = asyncio.get_event_loop()
                except RuntimeError:
                    loop = None
                plant.schedule = IrrigationSchedule(plant, schedule_data, self.irrigation_algorithm, loop=loop, engine=self)
                print(f"Attached schedule to plant {plant_id}: {len(schedule_data)} entries")
        except Exception as e:
            print(f"WARNING: Failed to attach schedule for plant {plant_id}: {e}")

    def start_irrigation(self, plant_id: int, session_id: str = None) -> Optional[asyncio.Task]:
        """Start irrigation as a background task.
        
        Returns:
            Optional[asyncio.Task]: The created task, or None if plant doesn't exist or is already irrigating
        """
        print(f"Starting irrigation for plant {plant_id}")
        
        plant = self.plants.get(plant_id)
        if not plant:
            print(f"Plant {plant_id} not found")
            return None
            
        # Check if already irrigating
        existing = self.irrigation_tasks.get(plant_id)
        if existing and not existing.done():
            print(f"Plant {plant_id} is already being irrigated")
            return None
            
        # Create the irrigation task
        task = asyncio.create_task(
            self.irrigation_algorithm.irrigate(plant, session_id=session_id),
            name=f"irrigation_plant_{plant_id}"
        )
        
        # Store in irrigation_tasks and set up automatic cleanup
        self.irrigation_tasks[plant_id] = task
        task.add_done_callback(lambda t: self.irrigation_tasks.pop(plant_id, None))
        
        print(f"Created irrigation task: {task.get_name()}")
        return task

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
        
        # Check if plant is already being irrigated under lock
        async with self._lock:
            if plant_id in self.irrigation_tasks and not self.irrigation_tasks[plant_id].done():
                print(f"WARNING - Plant {plant_id} is already being irrigated")
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
            
            # Store the task for potential cancellation under lock
            async with self._lock:
                self.irrigation_tasks[plant_id] = irrigation_task
                print(f"Started irrigation task for plant {plant_id}")
            
            # Wait for irrigation to complete
            result = await irrigation_task
            
            print(f"Irrigation task completed for plant {plant_id}: {result.status}")
            return result
            
        except asyncio.CancelledError:
            print(f"Irrigation task for plant {plant_id} was cancelled")
            # Return a cancelled result
            try:
                current_moisture = await plant.get_moisture() if plant.sensor else 0
            except Exception:
                current_moisture = 0
            current_moisture = current_moisture if current_moisture is not None else 0
            return IrrigationResult.cancelled(
                plant_id=plant_id,
                moisture=current_moisture,
                final_moisture=current_moisture,
                water_added_liters=0,
                reason="Smart irrigation cancelled by user"
            )
        except Exception as e:
            print(f"ERROR - Irrigation task failed for plant {plant_id}: {e}")
            return IrrigationResult.error(
                plant_id=plant_id,
                error_message=f"Irrigation failed: {str(e)}"
            )


    async def stop_irrigation(self, plant_id: int) -> bool:
        """
        Stop irrigation for a specific plant by cancelling its irrigation task.
        If no task exists, still attempts to close the valve for safety.
        
        Args:
            plant_id (int): ID of the plant to stop irrigation for
            
        Returns:
            bool: True if irrigation was stopped or valve was closed, False if plant not found
        """
        print("\n=== STOP IRRIGATION REQUESTED ===")
        print(f"Plant ID: {plant_id}")
        
        if plant_id not in self.plants:
            print(f"ERROR: No plant found with ID {plant_id}")
            return False
            
        plant = self.plants[plant_id]
        print(f"\nFound plant: {plant_id}")
        print(f"Valve ID: {plant.valve.valve_id}")
        print(f"Valve state: {'OPEN' if plant.valve.is_open else 'CLOSED'}")
        
        # Get task reference under short lock
        async with self._lock:
            print(f"Active tasks: {list(self.irrigation_tasks.keys())}")
            task = self.irrigation_tasks.get(plant_id)
            print(f"Found task: {task.get_name() if task else 'None'}")
        
        # Cancel task if it exists (outside lock)
        if task and not task.done():
            print(f"\nCancelling irrigation task...")
            task.cancel()
            try:
                print("Waiting for task to cancel (3s timeout)...")
                await asyncio.wait_for(task, timeout=3.0)
                print("Task cancelled successfully")
            except (asyncio.TimeoutError, asyncio.CancelledError):
                print("Task cancellation completed (timeout or cancelled)")
            except Exception as e:
                print(f"ERROR during task cancellation: {e}")
        
        # Always try to close the valve
        try:
            print("\n=== CLOSING VALVE ===")
            print(f"Plant: {plant_id}")
            print(f"Valve: {plant.valve.valve_id}")
            print(f"Current state: {'OPEN' if plant.valve.is_open else 'CLOSED'}")
            
            plant.valve.request_close()
            print("Valve close command sent")
            
            # Double check valve state
            print(f"Final valve state: {'OPEN' if plant.valve.is_open else 'CLOSED'}")
            return True
            
        except Exception as e:
            print(f"ERROR: Failed to close valve: {e}")
            return False

    async def stop_all_irrigations_and_close_valves(self) -> None:
        """Gracefully stop all irrigations and close all valves (used on shutdown)."""
        try:
            for plant_id, plant in list(self.plants.items()):
                try:
                    await self.stop_irrigation(plant_id)
                except Exception as e:
                    print(f"WARN - stop_irrigation failed for plant {plant_id}: {e}")
                try:
                    if getattr(plant, 'valve', None):
                        plant.valve.request_close()
                except Exception as e:
                    print(f"WARN - valve close on shutdown failed for plant {plant_id}: {e}")
        except Exception as e:
            print(f"ERROR - stop_all_irrigations_and_close_valves failed: {e}")

    def remove_plant(self, plant_id: int) -> bool:
        """
        Safely remove a plant from the system: cancel irrigation, close valve,
        release hardware, and remove all references.
        
        Args:
            plant_id (int): ID of the plant to remove

        Returns:
            bool: True if removal steps completed (best-effort), False if plant not found
        """
        if plant_id not in self.plants:
            print(f"remove_plant: Plant {plant_id} not found")
            return False

        plant = self.plants[plant_id]

        # 1) Cancel running irrigation task (best-effort; non-blocking in sync context)
        try:
            task = self.irrigation_tasks.get(plant_id)
            if task and not task.done():
                print(f"remove_plant: Cancelling irrigation task for plant {plant_id}...")
                task.cancel()
                # Best-effort cleanup when it finishes
                def _cleanup_task(_):
                    self.irrigation_tasks.pop(plant_id, None)
                    print(f"remove_plant: Irrigation task for plant {plant_id} cancelled and cleaned up")
                task.add_done_callback(_cleanup_task)
            else:
                # Ensure the task map doesn't retain stale entries
                self.irrigation_tasks.pop(plant_id, None)
        except Exception as e:
            print(f"remove_plant: Failed cancelling irrigation task for plant {plant_id}: {e}")

        # 2) Force-close valve (best-effort)
        try:
            if hasattr(plant, 'valve') and plant.valve:
                print(f"remove_plant: Forcing valve close for plant {plant_id}")
                plant.valve.request_close()
        except Exception as e:
            print(f"remove_plant: Error while forcing valve close for plant {plant_id}: {e}")

        # 3) Release hardware from managers
        try:
                self.valves_manager.release_valve(plant_id)
        except Exception as e:
            print(f"remove_plant: Warning releasing valve for plant {plant_id}: {e}")
        try:
                self.sensor_manager.release_sensor(str(plant_id))
        except Exception as e:
            print(f"remove_plant: Warning releasing sensor for plant {plant_id}: {e}")

        # 4) Null references on the plant object (defensive)
        try:
            if hasattr(plant, 'sensor'):
                plant.sensor = None
            if hasattr(plant, 'valve'):
                plant.valve = None
        except Exception as e:
            print(f"remove_plant: Warning nulling references for plant {plant_id}: {e}")

        # 5) Remove plant from registry
        try:
            self.plants.pop(plant_id, None)
            print(f"remove_plant: Plant {plant_id} removed from registry")
        except Exception as e:
            print(f"remove_plant: Error removing plant {plant_id} from registry: {e}")

        return True

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

    async def update_plant(
        self,
        plant_id: int,
        desired_moisture: Optional[float] = None,
        water_limit: Optional[float] = None,
        dripper_type: Optional[str] = None
    ) -> bool:
        """
        Update plant settings.
        
        Args:
            plant_id (int): ID of the plant to update
            desired_moisture (Optional[float]): New desired moisture level
            water_limit (Optional[float]): New water limit
            dripper_type (Optional[str]): New dripper type
            
        Returns:
            bool: True if update was successful, False otherwise
        """
        if plant_id not in self.plants:
            print(f"Plant {plant_id} not found")
            return False
        
        plant = self.plants[plant_id]
        
        try:
            # Update desired moisture if provided
            if desired_moisture is not None:
                plant.desired_moisture = desired_moisture
                print(f"Updated desired moisture for plant {plant_id} to {desired_moisture}%")
            
            # Update water limit if provided
            if water_limit is not None:
                plant.water_limit = water_limit
                print(f"Updated water limit for plant {plant_id} to {water_limit}L")
            
            # Update dripper type if provided
            if dripper_type is not None:
                # Convert string to DripperType enum
                if dripper_type == '2L/h':
                    plant.dripper_type = DripperType.TYPE_2LH
                elif dripper_type == '4L/h':
                    plant.dripper_type = DripperType.TYPE_4LH
                elif dripper_type == '8L/h':
                    plant.dripper_type = DripperType.TYPE_8LH
                else:
                    print(f"Invalid dripper type: {dripper_type}")
                    return False
                
                print(f"Updated dripper type for plant {plant_id} to {dripper_type}")
            
            print(f"Successfully updated plant {plant_id}")
            return True
            
        except Exception as e:
            print(f"Error updating plant {plant_id}: {e}")
            return False

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
                
                print(f" DEBUG - Background task created for plant {plant_id}")
                return True
                
            except Exception as e:
                print(f" ERROR - Error opening valve for plant {plant_id}: {e}")
                # Clean up state in case of error
                if plant_id in self.valve_states:
                    del self.valve_states[plant_id]
                # Ensure valve is closed in case of error
                try:
                    plant.valve.request_close()
                    print(f" DEBUG - Valve closed due to error")
                except Exception as close_error:
                    print(f" ERROR - Failed to close valve after error: {close_error}")
                return False

    async def close_valve(self, plant_id: int) -> bool:
        """
        Immediately closes the valve for a specific plant.
        
        Args:
            plant_id (int): The ID of the plant whose valve should be closed
            
        Returns:
            bool: True if valve was successfully closed, False otherwise
        """
        print(f" DEBUG - SmartGardenEngine.close_valve() called:")
        print(f"   - plant_id: {plant_id}")
        
        if plant_id not in self.plants:
            print(f" ERROR - Plant {plant_id} not found")
            return False
        
        plant = self.plants[plant_id]
        
        async with self._lock:
            try:
                # Cancel any running background task
                if plant_id in self.valve_tasks and not self.valve_tasks[plant_id].done():
                    print(f" DEBUG - Cancelling background task for plant {plant_id}")
                    self.valve_tasks[plant_id].cancel()
                    try:
                        await self.valve_tasks[plant_id]
                    except asyncio.CancelledError:
                        print(f" DEBUG - Background task cancelled for plant {plant_id}")
                
                # Close the valve
                plant.valve.request_close()
                print(f" DEBUG - Valve closed successfully for plant {plant_id}")
                
                # Update valve state
                if plant_id in self.valve_states:
                    self.valve_states[plant_id]['is_open'] = False
                    self.valve_states[plant_id]['manual_close_time'] = time.time()
                
                return True
                
            except Exception as e:
                print(f"ERROR - Error closing valve for plant {plant_id}: {e}")
                return False

    async def restart_valve(self, plant_id: int) -> bool:
        """Attempt a brief open/close reset on the valve. Unblocks on success, blocks on failure."""
        print(f"DEBUG - SmartGardenEngine.restart_valve() called: plant_id={plant_id}")
        if plant_id not in self.plants:
            print(f"ERROR - Plant {plant_id} not found")
            return False

        # Disallow restart if irrigation is active
        if plant_id in self.irrigation_tasks and not self.irrigation_tasks[plant_id].done():
            print(f"ERROR - Cannot restart valve while irrigation is active for plant {plant_id}")
            return False

        plant = self.plants[plant_id]
        async with self._lock:
            try:
                # Ensure closed
                print("Ensuring valve closed before restart...")
                plant.valve.request_close()

                # Pulse open briefly then close
                print("Brief open/close pulse...")
                plant.valve.request_open()
                await asyncio.sleep(0.6)
                plant.valve.request_close()

                # Unblock if previously blocked
                try:
                    plant.valve.unblock()
                except Exception:
                    # Fallback if valve object uses attribute
                    if hasattr(plant.valve, 'is_blocked'):
                        plant.valve.is_blocked = False
                print(" Valve restart succeeded")
                return True
            except Exception as e:
                print(f"Valve restart failed for plant {plant_id}: {e}")
                # Keep (or set) blocked state and ensure closed
                try:
                    plant.valve.request_close()
                except Exception:
                    pass
                try:
                    plant.valve.block()
                except Exception:
                    pass
                return False

    async def _close_valve_after_duration(self, plant_id: int, duration_seconds: int) -> None:
        """
        Background task to close valve after specified duration.
        
        Args:
            plant_id (int): The ID of the plant
            duration_seconds (int): Duration in seconds to wait before closing
        """
        try:
            print(f"DEBUG - Background task started for plant {plant_id}")
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
            
            print(f" DEBUG - Background task timer completed for plant {plant_id}")
            print(f"   - Current time: {datetime.now().strftime('%H:%M:%S')}")
            print(f"   - Expected duration: {duration_seconds} seconds")
            print(f"   - Actual duration: {actual_duration:.2f} seconds")
            print(f"   - Timing difference: {abs(actual_duration - duration_seconds):.2f} seconds")
            
            # Validate timing accuracy (allow 2 second tolerance for system load)
            if abs(actual_duration - duration_seconds) > 2.0:
                print(f"  WARNING - Timing discrepancy detected!")
                print(f"   - Expected: {duration_seconds} seconds")
                print(f"   - Actual: {actual_duration:.2f} seconds")
                print(f"   - Difference: {abs(actual_duration - duration_seconds):.2f} seconds")
                print(f"   - This might indicate system clock issues or high system load")
            
            # Check if valve is still open (not manually closed)
            if plant_id in self.valve_states and self.valve_states[plant_id]['is_open']:
                print(f" DEBUG - Auto-closing valve for plant {plant_id} after {duration_seconds} seconds")
                
                plant = self.plants[plant_id]
                plant.valve.request_close()
                print(f" DEBUG - Valve auto-closed for plant {plant_id}")
                
                # Update valve state with actual timing information
                self.valve_states[plant_id]['is_open'] = False
                self.valve_states[plant_id]['auto_close_time'] = time.time()
                self.valve_states[plant_id]['actual_duration'] = actual_duration
                self.valve_states[plant_id]['timing_accuracy'] = abs(actual_duration - duration_seconds)
            else:
                print(f" DEBUG - Valve for plant {plant_id} was already closed manually")
                
        except asyncio.CancelledError:
            print(f" DEBUG - Background task cancelled for plant {plant_id}")
            raise
        except Exception as e:
            print(f" ERROR - Error in background task for plant {plant_id}: {e}")
            # Try to close valve even if there's an error
            try:
                if plant_id in self.plants:
                    plant = self.plants[plant_id]
                    plant.valve.request_close()
                    print(f" DEBUG - Valve closed due to background task error")
            except Exception as close_error:
                print(f" ERROR - Failed to close valve after background task error: {close_error}")
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
