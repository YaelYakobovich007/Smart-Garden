from datetime import datetime
import asyncio
from controller.dto.irrigation_result import IrrigationResult
from controller.dto.irrigation_progress import IrrigationProgress
from controller.models.plant import Plant
from controller.services.weather_service import WeatherService


class IrrigationAlgorithm:
    """
    This class encapsulates the core irrigation algorithm for a plant.
    """

    def __init__(self, websocket_client=None):
        self.water_per_pulse: float = 0.03
        self.pause_between_pulses: int = 10
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

    async def irrigate(self, plant: "Plant") -> IrrigationResult:
        """
        Main function that decides whether to irrigate a plant and performs the process.
        """
        # Log irrigation start locally (not sent to server)
        print(f"\n🌱 === IRRIGATION ALGORITHM START ===")
        print(f"📊 Plant ID: {plant.plant_id}")
        print(f"📍 Location: ({plant.lat}, {plant.lon})")
        print(f"💧 Desired Moisture: {plant.desired_moisture}%")
        print(f"🚰 Valve ID: {plant.valve.valve_id}")
        print(f"📡 Sensor Port: {plant.sensor.port}")
        print(f"⏰ Last Irrigation: {plant.last_irrigation_time}")
        
        # Get current moisture
        current_moisture = await plant.get_moisture()
        
        # Ensure current_moisture is float (safety check)
        if current_moisture is not None:
            current_moisture = float(current_moisture)
        
        # Send initial moisture check progress update
        progress = IrrigationProgress.initial_check(plant.plant_id, current_moisture, plant.desired_moisture)
        await self.send_progress_update(progress)

        # Case 1: Skip irrigation if rain is expected
        if self.weather_service.will_rain_today(plant.lat, plant.lon):
            print(f"Skipping irrigation for {plant.plant_id} — rain expected today.")
            return IrrigationResult.skipped(
                plant_id=plant.plant_id,
                moisture=current_moisture,
                reason="rain_expected"
            )

        # Case 2: Overwatered — block and stop
        is_overwatered = await self.is_overwatered(plant, current_moisture)
        
        # Send overwatering check progress update
        progress = IrrigationProgress.overwatering_check(plant.plant_id, current_moisture, plant.desired_moisture, is_overwatered)
        await self.send_progress_update(progress)
        
        if is_overwatered:
            plant.valve.block()
            return IrrigationResult.error(
                plant_id=plant.plant_id,
                error_message="Plant is overwatered. The soil moisture is too high and irrigation has been blocked to prevent further damage. Please allow the soil to dry out before attempting irrigation again.",
                moisture=current_moisture
            )

        # Case 3: If soil is already moist enough, skip irrigation
        if not await self.should_irrigate(plant, current_moisture):
            return IrrigationResult.skipped(
                plant_id=plant.plant_id,
                moisture=current_moisture,
                reason="already moist"
            )

        # Case 4: Check if valve is blocked before starting irrigation
        if plant.valve.is_blocked:
            print(f"❌ VALVE BLOCKED: Cannot irrigate plant {plant.plant_id} - valve is blocked")
            # Send blocked valve progress update
            progress = IrrigationProgress.fault_detected(
                plant.plant_id,
                current_moisture,
                plant.desired_moisture,
                0.0,  # No water used
                plant.valve.water_limit
            )
            await self.send_progress_update(progress)
            return IrrigationResult.error(
                plant_id=plant.plant_id,
                error_message="Valve is blocked and cannot be opened. Please check the valve manually and unblock it if needed.",
                moisture=current_moisture,
                final_moisture=current_moisture,
                water_added_liters=0.0
            )

        # Case 5: Otherwise, perform irrigation cycle
        print(f"\n🚰 Starting irrigation cycle for plant {plant.plant_id}")
        print(f"   Target: {plant.desired_moisture}%, Current: {current_moisture}%, Water needed: {plant.desired_moisture - current_moisture:.1f}%")
        return await self.perform_irrigation(plant, current_moisture)

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
            
            result = current_moisture_float < desired_moisture_float
            print(f"   Comparison result: {current_moisture_float} < {desired_moisture_float} = {result}")
            
            return result
        except (ValueError, TypeError) as e:
            print(f"❌ ERROR - Failed to convert moisture values to float: {e}")
            print(f"   current_moisture: {current_moisture} (type: {type(current_moisture)})")
            print(f"   plant.desired_moisture: {plant.desired_moisture} (type: {type(plant.desired_moisture)})")
            # Return False as a safe default
            return False

    async def perform_irrigation(self, plant: "Plant", initial_moisture: float) -> IrrigationResult:
        """
        Executes the irrigation cycle using water pulses with non-blocking operations.
        """
        # Log irrigation details locally
        print(f"\n💧 === IRRIGATION CYCLE DETAILS ===")
        print(f"🚰 Valve Configuration:")
        print(f"   Valve ID: {plant.valve.valve_id}")
        print(f"   Water Limit: {plant.valve.water_limit}L")
        print(f"   Flow Rate: {plant.valve.flow_rate}L/s")
        print(f"   Pipe Diameter: {plant.valve.pipe_diameter}cm")
        
        print(f"\n⚙️  Pulse Configuration:")
        print(f"   Water Per Pulse: {self.water_per_pulse}L")
        print(f"   Pause Between Pulses: {self.pause_between_pulses}s")
        pulse_time: float = plant.valve.calculate_open_time(self.water_per_pulse)
        print(f"   Pulse Duration: {pulse_time:.2f}s")
        
        print(f"\n📊 Irrigation Parameters:")
        print(f"🌡️ INITIAL MOISTURE: {initial_moisture}%")
        print(f"🎯 TARGET MOISTURE: {plant.desired_moisture}%")
        print(f"💧 MOISTURE GAP: {plant.desired_moisture - initial_moisture:.1f}%")
        print(f"🚰 MAX WATER: {plant.valve.water_limit}L")
        
        total_water: float = 0.0
        water_limit: float = plant.valve.water_limit
        pulse_count = 0

        print(f"\n🔄 Starting Water Pulses...")
        print(f"   {'Pulse':<6} {'Water':<8} {'Current':<10} {'Target':<8} {'Gap':<8} {'Status':<15}")
        print(f"   {'-----':<6} {'-----':<8} {'-------':<10} {'------':<8} {'---':<8} {'------':<15}")
        
        while total_water < water_limit:
            current_moisture: float = await plant.get_moisture()
            moisture_gap = plant.desired_moisture - current_moisture
            
            # Send pulse progress update
            progress = IrrigationProgress.pulse_update(
                plant.plant_id, 
                pulse_count + 1, 
                current_moisture, 
                plant.desired_moisture, 
                total_water, 
                water_limit
            )
            await self.send_progress_update(progress)
            
            if current_moisture >= plant.desired_moisture:
                print("✅ TARGET REACHED")
                break
            elif total_water >= water_limit:
                print("🚫 WATER LIMIT REACHED")
                break
            else:
                print("💧 WATERING...")
            
            # Perform water pulse using non-blocking async sleep
            print(f"      🔓 Opening valve for {pulse_time:.2f}s...")
            try:
                plant.valve.request_open()
                await asyncio.sleep(pulse_time)  # Use asyncio.sleep instead of time.sleep
                plant.valve.request_close()
                print(f"      🔒 Valve closed")
            except RuntimeError as valve_error:
                # Handle valve blocking or hardware errors
                error_message = str(valve_error)
                if "blocked" in error_message.lower():
                    print(f"❌ VALVE BLOCKED: {error_message}")
                    # Send blocked valve progress update
                    progress = IrrigationProgress.fault_detected(
                        plant.plant_id,
                        current_moisture,
                        plant.desired_moisture,
                        total_water,
                        water_limit
                    )
                    await self.send_progress_update(progress)
                    return IrrigationResult.error(
                        plant_id=plant.plant_id,
                        error_message=f"Valve is blocked and cannot be opened. Please check the valve manually and unblock it if needed.",
                        moisture=initial_moisture,
                        final_moisture=current_moisture,
                        water_added_liters=total_water
                    )
                else:
                    print(f"❌ VALVE ERROR: {error_message}")
                    # Send valve error progress update
                    progress = IrrigationProgress.fault_detected(
                        plant.plant_id,
                        current_moisture,
                        plant.desired_moisture,
                        total_water,
                        water_limit
                    )
                    await self.send_progress_update(progress)
                    return IrrigationResult.error(
                        plant_id=plant.plant_id,
                        error_message=f"Valve hardware error: {error_message}. Please check the valve connection and hardware.",
                        moisture=initial_moisture,
                        final_moisture=current_moisture,
                        water_added_liters=total_water
                    )
            
            total_water += self.water_per_pulse
            pulse_count += 1
            
            # Update simulation if needed
            if plant.sensor.simulation_mode:
                old_moisture = current_moisture
                plant.sensor.update_simulated_value(5)  # 5% increase after each pulse
                print(f"      📈 Simulation: {old_moisture:.1f}% → {plant.sensor.simulated_value:.1f}% (+5%)")
            
            # Pause between pulses using non-blocking async sleep
            if total_water < water_limit and current_moisture < plant.desired_moisture:
                print(f"      ⏸️  Pausing {self.pause_between_pulses}s before next pulse...")
                await asyncio.sleep(self.pause_between_pulses)  # Use asyncio.sleep instead of time.sleep

        final_moisture: float = await plant.get_moisture()
        
        # Send final summary progress update
        target_reached = final_moisture >= plant.desired_moisture
        progress = IrrigationProgress.final_summary(
            plant.plant_id,
            initial_moisture,
            final_moisture,
            plant.desired_moisture,
            total_water,
            pulse_count,
            target_reached
        )
        await self.send_progress_update(progress)
        print(f"   Pulses Completed: {pulse_count}")
        print(f"   Total Water Used: {total_water:.2f}L")
        print(f"   Initial Moisture: {initial_moisture:.1f}%")
        print(f"   Final Moisture: {final_moisture:.1f}%")
        print(f"   Moisture Increase: {final_moisture - initial_moisture:.1f}%")
        print(f"   Target Moisture: {plant.desired_moisture:.1f}%")
        print(f"   Target Reached: {'✅ YES' if final_moisture >= plant.desired_moisture else '❌ NO'}")

        # Fault detection: watered but moisture didn't rise
        if total_water >= water_limit and final_moisture < plant.desired_moisture:
            # Send fault detection progress update
            progress = IrrigationProgress.fault_detected(
                plant.plant_id,
                final_moisture,
                plant.desired_moisture,
                total_water,
                water_limit
            )
            await self.send_progress_update(progress)
            plant.valve.block()
            return IrrigationResult.error(
                plant_id=plant.plant_id,
                error_message="Water limit reached but desired moisture not achieved. The plant received the maximum allowed water but the soil moisture did not reach the target level. This may indicate a sensor issue, soil drainage problem, or the water limit may be too low for this plant's needs.",
                moisture=initial_moisture,
                final_moisture=final_moisture,
                water_added_liters=total_water
            )

        # Update last irrigation time
        plant.last_irrigation_time = datetime.now()
        print(f"\n✅ IRRIGATION COMPLETED SUCCESSFULLY!")
        print(f"   ⏰ Irrigation Time: {plant.last_irrigation_time}")
        print(f"   🎯 Target Reached: {'✅ YES' if final_moisture >= plant.desired_moisture else '⚠️  PARTIAL'}")

        return IrrigationResult.success(
            plant_id=plant.plant_id,
            moisture=initial_moisture,
            final_moisture=final_moisture,
            water_added_liters=total_water
        )
