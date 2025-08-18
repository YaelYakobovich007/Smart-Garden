from datetime import datetime
import asyncio
from controller.dto.irrigation_result import IrrigationResult
from controller.dto.irrigation_progress import IrrigationProgress
from controller.models.plant import Plant
from controller.services.weather_service import WeatherService


class IrrigationAlgorithm:
    """
    This class encapsulates the core irrigation algorithm for a plant.
    Uses a single session-level updater task and proper cancellation handling.
    """

    def __init__(self, websocket_client=None):
        # Dripper-based irrigation parameters
        self.watering_duration_seconds: int = 40  # 40 seconds watering
        self.break_duration_seconds: int = 40     # 40 seconds break
        
        self.weather_service = WeatherService()
        self.websocket_client = websocket_client  # For sending logs to server

    async def log_to_server(self, message: str):
        """
        Send log message to server via WebSocket if available.
        Also prints locally for immediate feedback.
        """
        print(message)  # Local print for immediate feedback
        if self.websocket_client and hasattr(self.websocket_client, 'send_message'):
            try:
                await self.websocket_client.send_message("PI_LOG", {
                    "message": message,
                    "timestamp": datetime.now().isoformat()
                })
            except Exception as e:
                print(f"Failed to send log to server: {e}")
    
    async def send_progress_update(self, progress: IrrigationProgress):
        """
        Send structured irrigation progress update to server via WebSocket.
        """
        print(f"🚰 IRRIGATION PROGRESS: {progress.message}")
        if self.websocket_client and hasattr(self.websocket_client, 'send_message'):
            try:
                await self.websocket_client.send_message("IRRIGATION_PROGRESS", progress.to_websocket_data())
            except Exception as e:
                print(f"Failed to send progress update to server: {e}")

    async def _session_updater(self, plant: "Plant"):
        """Single task to handle progress updates for entire session"""
        print(f"\n=== Starting session updater for plant {plant.plant_id} ===")
        try:
            while True:
                # Use single reading for updates to reduce sensor load
                try:
                    current_moisture = await plant.get_moisture()  # Single read
                    print(f"Updater: Got moisture reading: {current_moisture:.1f}%")
                except Exception as e:
                    print(f"Updater: Error getting moisture: {e}")
                    current_moisture = None
                    
                if current_moisture is not None:
                    progress = IrrigationProgress(
                        plant_id=plant.plant_id,
                        current_moisture=current_moisture,
                        target_moisture=plant.desired_moisture
                    )
                    print(f"Updater: Sending progress update - moisture: {current_moisture:.1f}%")
                    await self.send_progress_update(progress)
                    
                await asyncio.sleep(10)  # Update every 10 seconds
                
        except asyncio.CancelledError:
            print(f"\n=== Session updater cancelled for plant {plant.plant_id} ===")
            raise
            
    async def irrigate(self, plant: "Plant") -> IrrigationResult:
        """
        Main entry point for smart irrigation with proper cancellation handling.
        Performs initial checks and then runs irrigation with a session-level updater task.
        
        Args:
            plant (Plant): The plant to irrigate
            
        Returns:
            IrrigationResult: The result of the irrigation operation
        """
        # Initialize values before any await to avoid UnboundLocalError on cancel
        initial_moisture = None
        current_moisture = None
        total_water = 0.0
        cycle_count = 0
        update_task = None  # For cleanup in case of early cancellation
        
        print(f"\n=== Starting irrigation process for plant {plant.plant_id} ===")
        print(f"Target moisture: {plant.desired_moisture}%")
        print(f"Water limit: {plant.valve.water_limit}L")
        
        try:
            # PHASE 1: Initial Checks
            print("\n=== PHASE 1: Initial Checks ===")
            
            try:
                print("Getting current moisture...")
                current_moisture = await plant.get_moisture()
                initial_moisture = current_moisture
                print(f"Current moisture: {current_moisture:.1f}%")
                
                # Send initial check progress
                progress = IrrigationProgress.initial_check(
                    plant.plant_id, current_moisture, plant.desired_moisture
                )
                await self.send_progress_update(progress)
                
                # Check for rain
                print("Checking weather forecast...")
                if self.weather_service.will_rain_today(plant.lat, plant.lon):
                    print("Rain is expected today - skipping irrigation")
                    return IrrigationResult.skipped(
                        plant_id=plant.plant_id,
                        moisture=current_moisture,
                        reason="rain_expected"
                    )
                
                # Check for overwatering
                print("Checking for overwatering...")
                is_overwatered = await self.is_overwatered(plant, current_moisture)
                if is_overwatered:
                    print("Plant is overwatered - blocking valve")
                    plant.valve.block()
                    return IrrigationResult.error(
                        plant_id=plant.plant_id,
                        error_message="Plant is overwatered. Irrigation blocked to prevent damage.",
                        moisture=current_moisture
                    )
                
                # Check if already moist enough
                print("Checking if irrigation is needed...")
                if not await self.should_irrigate(plant, current_moisture):
                    print("Soil moisture is adequate - skipping irrigation")
                    return IrrigationResult.skipped(
                        plant_id=plant.plant_id,
                        moisture=current_moisture,
                        reason="already_moist"
                    )
                
                # Check if valve is blocked
                print("Checking valve status...")
                if plant.valve.is_blocked:
                    print("Valve is blocked - cannot irrigate")
                    return IrrigationResult.error(
                        plant_id=plant.plant_id,
                        error_message="Valve is blocked. Please check and unblock manually.",
                        moisture=current_moisture
                    )
                
                # All checks passed - notify that irrigation will start
                print("\nAll checks passed - proceeding with irrigation")
                
                # Send decision that irrigation will start
                from controller.dto.irrigation_decision import IrrigationDecision
                decision = IrrigationDecision.will_start(
                    plant_id=plant.plant_id,
                    current_moisture=current_moisture,
                    target_moisture=plant.desired_moisture
                )
                
                if self.websocket_client:
                    await self.websocket_client.send_message("IRRIGATION_DECISION", {
                        "plant_id": plant.plant_id,
                        "current_moisture": current_moisture,
                        "target_moisture": plant.desired_moisture,
                        "moisture_gap": plant.desired_moisture - current_moisture if current_moisture is not None else 0,
                        "will_irrigate": True,
                        "reason": "moisture_below_target"
                    })
                
                # PHASE 2: Irrigation Cycle
                print("\n=== PHASE 2: Irrigation Cycle ===")
                
                # Create single session-level updater task
                print("Starting session updater...")
                update_task = asyncio.create_task(
                    self._session_updater(plant),
                    name=f"updater_plant_{plant.plant_id}"
                )
                
                try:
                    while True:
                        # Check moisture and target
                        print("\nChecking current moisture...")
                        current_moisture = await self._get_averaged_moisture(plant, 5)
                        print(f"Current moisture: {current_moisture:.1f}%")
                        
                        if plant.is_target_reached(current_moisture):
                            print(f"Target moisture reached: {current_moisture:.1f}%")
                            break
                        
                        # Pre-check water limit before starting cycle
                        expected_water = plant.dripper_type.calculate_water_amount(
                            self.watering_duration_seconds
                        )
                        if total_water + expected_water > plant.valve.water_limit:
                            print(f"Water limit would be exceeded - stopping")
                            print(f"Current: {total_water:.2f}L, Next cycle: {expected_water:.2f}L, Limit: {plant.valve.water_limit:.2f}L")
                            break
                            
                        # Simple watering cycle
                        cycle_count += 1
                        print(f"\n=== Starting cycle {cycle_count} ===")
                        
                        # Open valve and wait
                        print("Opening valve...")
                        plant.valve.request_open()
                        try:
                            print(f"Watering for {self.watering_duration_seconds}s...")
                            await asyncio.sleep(self.watering_duration_seconds)
                            # Add water only if full cycle completes
                            total_water += expected_water
                            print(f"Cycle complete. Total water used: {total_water:.2f}L")
                        except asyncio.CancelledError:
                            print("Watering cycle cancelled!")
                            raise
                        finally:
                            # Always close valve
                            print("Closing valve...")
                            plant.valve.request_close()
                            print("Valve closed.")
                        
                        # Break between cycles
                        try:
                            print(f"\nWaiting {self.break_duration_seconds}s before next cycle...")
                            await asyncio.sleep(self.break_duration_seconds)
                        except asyncio.CancelledError:
                            print("Break cycle cancelled!")
                            raise
                            
                finally:
                    # Clean up updater task
                    if update_task:
                        print("\nCleaning up session updater...")
                        update_task.cancel()
                        try:
                            await update_task
                        except asyncio.CancelledError:
                            pass
                        print("Session updater cleaned up.")
                        
                # Get final moisture reading after loop ends
                print("\nGetting final moisture reading...")
                try:
                    final_moisture = await self._get_averaged_moisture(plant, 5)
                    print(f"Final moisture: {final_moisture:.1f}%")
                except asyncio.CancelledError:
                    # If cancelled during final reading, use last known moisture
                    print("Cancelled during final reading - using last known moisture")
                    final_moisture = current_moisture
                    raise
                
                print("\n=== Irrigation completed successfully ===")
                print(f"Total cycles: {cycle_count}")
                print(f"Total water used: {total_water:.2f}L")
                print(f"Moisture change: {initial_moisture:.1f}% → {final_moisture:.1f}%")
                
                return IrrigationResult.success(
                    plant_id=plant.plant_id,
                    moisture=initial_moisture,
                    final_moisture=final_moisture,
                    water_added_liters=total_water
                )
                
            except asyncio.CancelledError:
                print(f"\n=== Initial checks cancelled for plant {plant.plant_id} ===")
                raise
                
        except asyncio.CancelledError:
            print(f"\n=== Irrigation cancelled for plant {plant.plant_id} ===")
            
            # Belt-and-suspenders: ensure valve is closed on any cancellation
            print("Double-checking valve is closed...")
            plant.valve.request_close()
            
            # Clean up updater task if it exists
            if update_task:
                print("Cleaning up session updater...")
                update_task.cancel()
                try:
                    await update_task
                except asyncio.CancelledError:
                    pass
                print("Session updater cleaned up.")
            
            # Use last known moisture if we can't get a new reading
            print("Getting final moisture after cancellation...")
            try:
                final_moisture = await self._get_averaged_moisture(plant, 3)
                print(f"Final moisture after cancel: {final_moisture:.1f}%")
            except asyncio.CancelledError:
                print("Cancelled during final reading - using last known moisture")
                final_moisture = current_moisture
                
            print(f"\n=== Final state after cancellation ===")
            print(f"Cycles completed: {cycle_count}")
            print(f"Water used before cancel: {total_water:.2f}L")
            print(f"Initial moisture: {initial_moisture or 0:.1f}%")
            print(f"Final moisture: {final_moisture or 0:.1f}%")
                
            return IrrigationResult.success(
                plant_id=plant.plant_id,
                reason="Cancelled by user",
                moisture=initial_moisture or 0,  # Handle early cancellation
                final_moisture=final_moisture or 0,  # Handle early cancellation
                water_added_liters=total_water
            )

    async def is_overwatered(self, plant: "Plant", moisture: float) -> bool:
        """
        Determines if the plant is overwatered.
        """
        # Debug logging for overwatering analysis
        print(f"   📊 CURRENT MOISTURE: {moisture}% (type: {type(moisture)})")
        print(f"   🎯 DESIRED MOISTURE: {plant.desired_moisture}% (type: {type(plant.desired_moisture)})")
        
        # Ensure both values are float
        try:
            moisture_float = float(moisture) if moisture is not None else 0.0
            desired_moisture_float = float(plant.desired_moisture) if plant.desired_moisture is not None else 0.0
            
            print(f"   Converted moisture: {moisture_float} (type: {type(moisture_float)})")
            print(f"   Converted desired_moisture: {desired_moisture_float} (type: {type(desired_moisture_float)})")
            
            if plant.last_irrigation_time:
                time_since = asyncio.get_event_loop().time() - plant.last_irrigation_time.timestamp()
                threshold = desired_moisture_float + 10
                result = time_since > 86400 and moisture_float > threshold  # 86400 = 1 day
                print(f"   Comparison: {moisture_float} > {threshold} = {moisture_float > threshold}")
                print(f"   Final result: {result}")
                return result
            return False
        except (ValueError, TypeError) as e:
            print(f"❌ ERROR - Failed to convert moisture values to float in is_overwatered: {e}")
            print(f"   moisture: {moisture} (type: {type(moisture)})")
            print(f"   plant.desired_moisture: {plant.desired_moisture} (type: {type(plant.desired_moisture)})")
            # Return False as a safe default
            return False

    async def should_irrigate(self, plant: "Plant", current_moisture: float) -> bool:
        """
        Checks if irrigation is necessary based on desired moisture level.
        Uses the plant's base target (without hysteresis) to determine if irrigation should start.
        """
        # Debug logging for irrigation need analysis
        print(f"   📊 CURRENT MOISTURE: {current_moisture}% (type: {type(current_moisture)})")
        print(f"   🎯 DESIRED MOISTURE: {plant.desired_moisture}% (type: {type(plant.desired_moisture)})")
        
        # Ensure both values are float
        try:
            current_moisture_float = float(current_moisture) if current_moisture is not None else 0.0
            desired_moisture_float = float(plant.desired_moisture) if plant.desired_moisture is not None else 0.0
            
            print(f"   Converted current_moisture: {current_moisture_float} (type: {type(current_moisture_float)})")
            print(f"   Converted desired_moisture: {desired_moisture_float} (type: {type(desired_moisture_float)})")
            
            # Use base target for starting irrigation (no hysteresis)
            result = current_moisture_float < desired_moisture_float
            print(f"   Should irrigate: {current_moisture_float} < {desired_moisture_float} = {result}")
            
            return result
        except (ValueError, TypeError) as e:
            print(f"❌ ERROR - Failed to convert moisture values to float: {e}")
            print(f"   current_moisture: {current_moisture} (type: {type(current_moisture)})")
            print(f"   plant.desired_moisture: {plant.desired_moisture} (type: {type(plant.desired_moisture)})")
            # Return False as a safe default
            return False

    async def _ensure_valve_closed(self, plant: "Plant") -> None:
        """Ensure valve is safely closed regardless of is_open state"""
        try:
            print(f"🔒 Forcing valve close for plant {plant.plant_id} (safety measure)")
            plant.valve.request_close()
            print(f"✅ Valve close command sent")
        except Exception as e:
            print(f"❌ Failed to close valve: {e}")

    async def _server_update_monitor(self, plant: "Plant", start_time: datetime, 
                                    max_duration: int, stop_event: asyncio.Event) -> None:
        """Monitor and send server updates every 10 seconds (for humidity/temperature display)"""
        try:
            while not stop_event.is_set():
                current_moisture = await plant.get_moisture()
                elapsed_time = (datetime.now() - start_time).total_seconds()
                
                # Send update to server for display (humidity/temperature monitoring)
                # This is separate from irrigation decision making
                print(f"Server update {elapsed_time:.1f}s: moisture = {current_moisture:.1f}%")
                
                # Check if time limit reached
                if elapsed_time >= max_duration:
                    stop_event.set()
                    return
                
                # Wait 10 seconds or until interrupted
                try:
                    await asyncio.wait_for(asyncio.Event().wait(), timeout=10.0)
                except asyncio.TimeoutError:
                    pass  # Normal timeout, continue monitoring
                    
        except asyncio.CancelledError:
            print(f"Server update monitoring cancelled")
            raise

    async def _get_averaged_moisture(self, plant: "Plant", num_measurements: int = 5) -> float:
        """Take multiple moisture measurements and return the average"""
        print(f"Taking {num_measurements} moisture measurements for averaging...")
        measurements = []
        
        for i in range(num_measurements):
            moisture = await plant.get_moisture()
            measurements.append(moisture)
            print(f"Measurement {i+1}/{num_measurements}: {moisture:.1f}%")
            
            # Small delay between measurements (except for the last one)
            if i < num_measurements - 1:
                await asyncio.sleep(1.0)
        
        average = sum(measurements) / len(measurements)
        print(f"Average moisture: {average:.1f}% (from {measurements})")
        return average

    async def _time_limit_monitor(self, max_duration: int, time_limit_event: asyncio.Event) -> None:
        """Monitor maximum time limits"""
        try:
            await asyncio.sleep(max_duration)
            time_limit_event.set()
        except asyncio.CancelledError:
            pass  # Task was cancelled, which is fine

    async def _perform_watering_cycle(self, plant: "Plant", cycle_count: int) -> float:
        """Perform a single watering cycle (fixed duration, no moisture monitoring during watering)"""
        print(f"CYCLE {cycle_count}: Watering for exactly {self.watering_duration_seconds}s...")
        
        try:
            # Open valve and start timing
            plant.valve.request_open()
            start_time = datetime.now()
            
            # Create monitoring tasks - only time monitoring and server updates
            stop_event = asyncio.Event()
            server_update_task = asyncio.create_task(
                self._server_update_monitor(plant, start_time, self.watering_duration_seconds, stop_event)
            )
            time_task = asyncio.create_task(
                self._time_limit_monitor(self.watering_duration_seconds, stop_event)
            )
            
            # Wait for time limit (no moisture checking during watering)
            done, pending = await asyncio.wait(
                [server_update_task, time_task],
                return_when=asyncio.FIRST_COMPLETED
            )
            
            # Cancel remaining tasks
            for task in pending:
                task.cancel()
                try:
                    await task
                except asyncio.CancelledError:
                    pass
            
            # Close valve and calculate water used (always the full duration)
            actual_watering_time = (datetime.now() - start_time).total_seconds()
            plant.valve.request_close()
            
            # Water calculation based on fixed duration (40s)
            water_used = plant.dripper_type.calculate_water_amount(self.watering_duration_seconds)
            print(f"Valve closed after {actual_watering_time:.1f}s")
            print(f"Water used this cycle: {water_used:.6f}L (calculated from {self.watering_duration_seconds}s)")
            
            return water_used
            
        except asyncio.CancelledError:
            print(f"\n=== WATERING CYCLE CANCELLED ===")
            print(f"Plant ID: {plant.plant_id}")
            
            # Cancel child tasks first
            for t in (server_update_task, time_task):
                if t and not t.done():
                    print(f"Cancelling child task: {t.get_name()}")
                    t.cancel()
                    try:
                        await t
                    except asyncio.CancelledError:
                        pass
            
            print(f"Closing valve after cancellation...")
            await self._ensure_valve_closed(plant)
            
            # Get current moisture for response
            current_moisture = await plant.get_moisture()
            print(f"Current moisture: {current_moisture}%")
            
            # Create stop response
            from controller.dto.stop_irrigation_response import StopIrrigationResponse
            response = StopIrrigationResponse.success(
                plant_id=plant.plant_id,
                moisture=current_moisture,
                water_added_liters=0  # We don't track partial water in cancellation
            )
            
            # Send response to server
            if self.websocket_client:
                await self.websocket_client.send_message("STOP_IRRIGATION_RESPONSE", response.to_websocket_data())
            
            raise  # Re-raise to propagate cancellation
        except RuntimeError as e:
            print(f"VALVE ERROR: {e}")
            await self._ensure_valve_closed(plant)
            return 0.0

    async def _perform_break_cycle(self, plant: "Plant") -> None:
        """Perform break between watering cycles (fixed duration, measure only at end)"""
        print(f"Breaking for exactly {self.break_duration_seconds}s...")
        
        try:
            start_time = datetime.now()
            
            # Create monitoring tasks - only time monitoring and server updates
            stop_event = asyncio.Event()
            server_update_task = asyncio.create_task(
                self._server_update_monitor(plant, start_time, self.break_duration_seconds, stop_event)
            )
            time_task = asyncio.create_task(
                self._time_limit_monitor(self.break_duration_seconds, stop_event)
            )
            
            # Wait for full break duration (no moisture decision-making during break)
            done, pending = await asyncio.wait(
                [server_update_task, time_task],
                return_when=asyncio.FIRST_COMPLETED
            )
            
            # Cancel remaining tasks
            for task in pending:
                task.cancel()
                try:
                    await task
                except asyncio.CancelledError:
                    pass
            
            actual_break_time = (datetime.now() - start_time).total_seconds()
            print(f"Break completed after {actual_break_time:.1f}s")
            
            # At the END of break, take averaged moisture measurement for decision making
            print(f"Break finished - taking averaged moisture measurement...")
            averaged_moisture = await self._get_averaged_moisture(plant, 5)
            print(f"End-of-break averaged moisture: {averaged_moisture:.1f}%")
            
        except asyncio.CancelledError:
            print(f"Break cancelled")
            await self._ensure_valve_closed(plant)  # Safety check
            raise

    def _log_irrigation_setup(self, plant: "Plant", initial_moisture: float) -> None:
        """Log irrigation setup information"""
        print(f"\n=== DRIPPER-BASED IRRIGATION CYCLE ===")
        print(f"Valve Configuration:")
        print(f"   Valve ID: {plant.valve.valve_id}")
        print(f"   Water Limit: {plant.valve.water_limit}L")
        print(f"   Pipe Diameter: {plant.valve.pipe_diameter}cm")
        
        print(f"\nDripper Configuration:")
        print(f"   Dripper Type: {plant.dripper_type.display_name}")
        print(f"   Flow Rate: {plant.dripper_type.flow_rate_lh:.1f} L/h ({plant.dripper_type.flow_rate_ls:.4f} L/s)")
        print(f"   Watering Duration: {self.watering_duration_seconds}s")
        print(f"   Break Duration: {self.break_duration_seconds}s")
        
        expected_water_per_cycle = plant.dripper_type.calculate_water_amount(self.watering_duration_seconds)
        print(f"   Expected Water Per Cycle: {expected_water_per_cycle:.4f}L")
        
        print(f"\nIrrigation Parameters:")
        print(f"   INITIAL MOISTURE: {initial_moisture}%")
        print(f"   TARGET MOISTURE: {plant.desired_moisture}%")
        print(f"   EFFECTIVE TARGET (with hysteresis): {plant.get_effective_target(1.5):.1f}%")
        print(f"   MOISTURE GAP: {plant.desired_moisture - initial_moisture:.1f}%")
        print(f"   MAX WATER: {plant.valve.water_limit}L")
        
        print(f"\nMoisture Measurement Strategy:")
        print(f"   - Server updates: Every 10 seconds during watering/breaks")
        print(f"   - Decision making: 5 averaged measurements at cycle boundaries")
        print(f"   - Watering cycles: Fixed {self.watering_duration_seconds}s duration (no moisture stops)")
        print(f"   - Break cycles: Fixed {self.break_duration_seconds}s duration (measure only at end)")

    async def _generate_irrigation_result(self, plant: "Plant", initial_moisture: float, 
                                         total_water: float, cycle_count: int) -> IrrigationResult:
        """Generate final irrigation result"""
        print(f"Taking final moisture measurements...")
        final_moisture = await self._get_averaged_moisture(plant, 5)
        
        # Send final summary progress update
        target_reached = final_moisture >= plant.desired_moisture
        progress = IrrigationProgress.final_summary(
            plant.plant_id, initial_moisture, final_moisture,
            plant.desired_moisture, total_water, cycle_count, target_reached
        )
        await self.send_progress_update(progress)
        
        # Log results
        print(f"\nCycles Completed: {cycle_count}")
        print(f"Total Water Used: {total_water:.6f}L")
        print(f"Initial Moisture: {initial_moisture:.1f}%")
        print(f"Final Moisture: {final_moisture:.1f}%")
        print(f"Moisture Increase: {final_moisture - initial_moisture:.1f}%")
        print(f"Target Moisture: {plant.desired_moisture:.1f}%")
        print(f"Target Reached: {'YES' if final_moisture >= plant.desired_moisture else 'NO'}")
        
        efficiency = (final_moisture - initial_moisture) / (total_water * 1000) if total_water > 0 else 0
        print(f"Water Efficiency: {efficiency:.2f} %/mL" if total_water > 0 else "Water Efficiency: N/A")

        # Check for faults
        if total_water >= plant.valve.water_limit and final_moisture < plant.desired_moisture:
            progress = IrrigationProgress.fault_detected(
                plant.plant_id, final_moisture, plant.desired_moisture, 
                total_water, plant.valve.water_limit
            )
            await self.send_progress_update(progress)
            plant.valve.block()
            return IrrigationResult.error(
                plant_id=plant.plant_id,
                error_message="Water limit reached but desired moisture not achieved.",
                moisture=initial_moisture,
                final_moisture=final_moisture,
                water_added_liters=total_water
            )

        # Success
        plant.last_irrigation_time = datetime.now()
        print(f"\nDRIPPER IRRIGATION COMPLETED SUCCESSFULLY!")
        print(f"Irrigation Time: {plant.last_irrigation_time}")
        print(f"Target Reached: {'YES' if final_moisture >= plant.desired_moisture else 'PARTIAL'}")
        print(f"Dripper Type: {plant.dripper_type.display_name}")
        print(f"Total Cycles: {cycle_count}")

        return IrrigationResult.success(
            plant_id=plant.plant_id,
            moisture=initial_moisture,
            final_moisture=final_moisture,
            water_added_liters=total_water
        )

    async def perform_irrigation(self, plant: "Plant", initial_moisture: float) -> IrrigationResult:
        """Clean irrigation cycle using dripper-based watering with event-driven control"""
        try:
            # Log irrigation setup
            self._log_irrigation_setup(plant, initial_moisture)
            
            total_water = 0.0
            cycle_count = 0
            water_limit = plant.valve.water_limit
            
            print(f"\nStarting irrigation cycles...")
            
            # Main irrigation loop
            while total_water < water_limit:
                # Check cancellation
                await asyncio.sleep(0)
                
                # Check current moisture with averaging for decision making
                current_moisture = await self._get_averaged_moisture(plant, 5)
                
                # Send progress update
                progress = IrrigationProgress.pulse_update(
                    plant.plant_id, cycle_count + 1, current_moisture, 
                    plant.desired_moisture, total_water, water_limit
                )
                await self.send_progress_update(progress)
                
                # Check if target already reached
                if plant.is_target_reached(current_moisture, hysteresis=1.5):
                    effective_target = plant.get_effective_target(hysteresis=1.5)
                    print(f"TARGET REACHED: {current_moisture:.1f}% >= {effective_target:.1f}%")
                    break
                
                # Check water limit
                expected_water = plant.dripper_type.calculate_water_amount(self.watering_duration_seconds)
                if total_water + expected_water > water_limit:
                    print(f"WATER LIMIT WOULD BE EXCEEDED - stopping irrigation")
                    break
                
                # Perform watering cycle (fixed duration)
                cycle_count += 1
                cycle_water = await self._perform_watering_cycle(plant, cycle_count)
                total_water += cycle_water
                
                print(f"Cycle {cycle_count} completed: {cycle_water:.6f}L added (Total: {total_water:.6f}L)")
                
                # Update simulation
                if plant.sensor.simulation_mode:
                    moisture_increase = min(5.0, cycle_water * 100)
                    plant.sensor.update_simulated_value(moisture_increase)
                    print(f"Simulation: moisture increased by {moisture_increase:.1f}%")
                
                # Check if target reached after watering (with averaging)
                print(f"Checking moisture after watering cycle {cycle_count}...")
                final_cycle_moisture = await self._get_averaged_moisture(plant, 5)
                if plant.is_target_reached(final_cycle_moisture, hysteresis=1.5):
                    effective_target = plant.get_effective_target(hysteresis=1.5)
                    print(f"TARGET REACHED after cycle {cycle_count}: {final_cycle_moisture:.1f}% >= {effective_target:.1f}%")
                    break
                
                # Break between cycles (if not finished) - measurements happen at the end of break
                if total_water < water_limit and not plant.is_target_reached(final_cycle_moisture, hysteresis=1.5):
                    await self._perform_break_cycle(plant)

            # Generate final results
            return await self._generate_irrigation_result(
                plant, initial_moisture, total_water, cycle_count
            )
            
        except asyncio.CancelledError:
            print(f"\n=== IRRIGATION CANCELLED ===")
            print(f"Plant ID: {plant.plant_id}")
            
            # Ensure valve is closed
            print("Closing valve...")
            await self._ensure_valve_closed(plant)
            
            # Get current moisture for response
            current_moisture = await plant.get_moisture()
            print(f"Current moisture: {current_moisture}%")
            
            # Create stop response
            from controller.dto.stop_irrigation_response import StopIrrigationResponse
            response = StopIrrigationResponse.success(
                plant_id=plant.plant_id,
                moisture=current_moisture,
                water_added_liters=total_water  # Include any water used before cancellation
            )
            
            # Send response to server
            if self.websocket_client:
                await self.websocket_client.send_message("STOP_IRRIGATION_RESPONSE", response.to_websocket_data())
            
            raise  # Re-raise to propagate cancellation

