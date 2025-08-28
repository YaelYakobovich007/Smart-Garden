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

        # Calibrated sensor range constants (fixed)
        # D (Dry point) = 90, F (Field capacity) = 10
        self.dry_point_reading: float = 90.0
        self.field_capacity_reading: float = 10.0

    def _normalize_alpha(self, desired_value: float) -> float:
        """Normalize desired moisture to alpha in [0,1]. Accepts 0..1 or 0..100."""
        try:
            value = float(desired_value)
        except (TypeError, ValueError):
            return 0.0
        if value > 1.0:
            return max(0.0, min(1.0, value / 100.0))
        return max(0.0, min(1.0, value))

    def _get_calibrated_target(self, plant: "Plant") -> float:
        """Compute target sensor reading using calibration: D + α(F - D)."""
        alpha = self._normalize_alpha(plant.desired_moisture)
        D = self.dry_point_reading
        F = self.field_capacity_reading
        return D + alpha * (F - D)

    def _get_effective_target(self, plant: "Plant", hysteresis: float = 1.5) -> float:
        """Get calibrated target plus hysteresis (sensor units)."""
        return self._get_calibrated_target(plant) + hysteresis

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
                        stage="update",
                        status="in_progress",
                        current_moisture=current_moisture,
                        target_moisture=self._get_calibrated_target(plant)
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
                
                # Send initial check progress using calibrated target
                calibrated_target = self._get_calibrated_target(plant)
                progress = IrrigationProgress.initial_check(
                    plant.plant_id, current_moisture, calibrated_target
                )
                await self.send_progress_update(progress)
                
                # Check for rain
                print("Checking weather forecast...")
                # Call potentially blocking HTTP in a thread to avoid blocking event loop
                will_rain = await asyncio.to_thread(self.weather_service.will_rain_today, plant.lat, plant.lon)
                if will_rain:
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
                
                # Send decision that irrigation will start (using calibrated target)
                from controller.dto.irrigation_decision import IrrigationDecision
                decision = IrrigationDecision.will_start(
                    plant_id=plant.plant_id,
                    current_moisture=current_moisture,
                    target_moisture=calibrated_target
                )
                
                if self.websocket_client:
                    await self.websocket_client.send_message("IRRIGATION_DECISION", {
                        "plant_id": plant.plant_id,
                        "current_moisture": current_moisture,
                        "target_moisture": calibrated_target,
                        "moisture_gap": calibrated_target - current_moisture if current_moisture is not None else 0,
                        "will_irrigate": True,
                        "reason": "moisture_below_target"
                    })
                
            except Exception as e:
                print(f"Error during initial moisture check: {e}")
                return IrrigationResult.error(
                    plant_id=plant.plant_id,
                    error_message=f"Failed to get initial moisture: {str(e)}"
                )
                
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
                        
                        if current_moisture >= self._get_effective_target(plant, 1.5):
                            print(f"Target moisture reached: {current_moisture:.1f}% (target: {self._get_effective_target(plant, 1.5):.1f}%)")
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
                
            # Treat user cancellation as a successful stop without adding an unsupported 'reason' argument
            return IrrigationResult.success(
                plant_id=plant.plant_id,
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

    async def _get_averaged_moisture(self, plant: "Plant", num_measurements: int = 5) -> float:
        """Take multiple moisture measurements and return the average"""
        print(f"Taking {num_measurements} moisture measurements for averaging...")
        measurements = []
        
        for i in range(num_measurements):
            moisture = await plant.get_moisture()
            if moisture is not None:
                measurements.append(moisture)
                print(f"Measurement {i+1}/{num_measurements}: {moisture:.1f}%")
            else:
                print(f"Measurement {i+1}/{num_measurements}: None (skipping)")
            
            # Small delay between measurements (except for the last one)
            if i < num_measurements - 1:
                await asyncio.sleep(1.0)
        
        average = sum(measurements) / len(measurements)
        print(f"Average moisture: {average:.1f}% (from {measurements})")
        return average

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
        print(f"   CALIBRATION D (dry): {self.dry_point_reading}")
        print(f"   CALIBRATION F (field capacity): {self.field_capacity_reading}")
        print(f"   ALPHA (desired): {self._normalize_alpha(plant.desired_moisture):.3f}")
        print(f"   TARGET (calibrated): {self._get_calibrated_target(plant):.1f}%")
        print(f"   EFFECTIVE TARGET (with hysteresis): {self._get_effective_target(plant, 1.5):.1f}%")
        print(f"   MOISTURE GAP: {self._get_calibrated_target(plant) - initial_moisture:.1f}%")
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
        target_reached = final_moisture >= self._get_calibrated_target(plant)
        progress = IrrigationProgress.final_summary(
            plant.plant_id, initial_moisture, final_moisture,
            self._get_calibrated_target(plant), total_water, cycle_count, target_reached
        )
        await self.send_progress_update(progress)
        
        # Log results
        print(f"\nCycles Completed: {cycle_count}")
        print(f"Total Water Used: {total_water:.6f}L")
        print(f"Initial Moisture: {initial_moisture:.1f}%")
        print(f"Final Moisture: {final_moisture:.1f}%")
        print(f"Moisture Increase: {final_moisture - initial_moisture:.1f}%")
        print(f"Target Moisture (calibrated): {self._get_calibrated_target(plant):.1f}%")
        print(f"Target Reached: {'YES' if final_moisture >= self._get_calibrated_target(plant) else 'NO'}")
        
        efficiency = (final_moisture - initial_moisture) / (total_water * 1000) if total_water > 0 else 0
        print(f"Water Efficiency: {efficiency:.2f} %/mL" if total_water > 0 else "Water Efficiency: N/A")

        # Check for faults
        if total_water >= plant.valve.water_limit and final_moisture < self._get_calibrated_target(plant):
            progress = IrrigationProgress.fault_detected(
                plant.plant_id, final_moisture, self._get_calibrated_target(plant), 
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



