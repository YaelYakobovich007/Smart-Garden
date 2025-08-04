from datetime import datetime
import time
from controller.dto.irrigation_result import IrrigationResult
from controller.models.plant import Plant
from controller.services.weather_service import WeatherService


class IrrigationAlgorithm:
    """
    This class encapsulates the core irrigation algorithm for a plant.
    """

    def __init__(self):
        self.water_per_pulse: float = 0.03
        self.pause_between_pulses: int = 10
        self.weather_service = WeatherService()

    async def irrigate(self, plant: "Plant") -> IrrigationResult:
        """
        Main function that decides whether to irrigate a plant and performs the process.
        """
        print(f"\n🌱 === IRRIGATION ALGORITHM START ===")
        print(f"📊 Plant ID: {plant.plant_id}")
        print(f"📍 Location: ({plant.lat}, {plant.lon})")
        print(f"💧 Desired Moisture: {plant.desired_moisture}%")
        print(f"🚰 Valve ID: {plant.valve.valve_id}")
        print(f"📡 Sensor Port: {plant.sensor.port}")
        print(f"⏰ Last Irrigation: {plant.last_irrigation_time}")
        
        # Get current moisture
        current_moisture = await plant.get_moisture()
        print(f"💧 Current Moisture: {current_moisture}%")
        print(f"📈 Moisture Gap: {plant.desired_moisture - current_moisture:.1f}%")
        
        # Case 1: Skip irrigation if rain is expected
        print(f"\n🌤️  Checking weather conditions...")
        will_rain = self.weather_service.will_rain_today(plant.lat, plant.lon)
        print(f"   Weather Check: {'🌧️  Rain expected' if will_rain else '☀️  No rain expected'}")
        
        if will_rain:
            print(f"❌ SKIPPING IRRIGATION — Rain expected today!")
            print(f"   Reason: Weather forecast indicates rain")
            return IrrigationResult(
                status="skipped",
                reason="rain_expected",
                moisture=current_moisture
            )

        # Case 2: Overwatered — block and stop
        print(f"\n🚨 Checking for overwatering...")
        is_overwatered = self.is_overwatered(plant, current_moisture)
        print(f"   Overwatered Check: {'❌ OVERWATERED' if is_overwatered else '✅ Not overwatered'}")
        
        if is_overwatered:
            print(f"🚫 BLOCKING VALVE — Plant is overwatered!")
            print(f"   Current Moisture: {current_moisture}%")
            print(f"   Desired Moisture: {plant.desired_moisture}%")
            print(f"   Excess: {current_moisture - plant.desired_moisture:.1f}%")
            plant.valve.block()
            return IrrigationResult(
                status="error",
                reason="overwatered",
                moisture=current_moisture
            )

        # Case 3: If soil is already moist enough, skip irrigation
        print(f"\n✅ Checking if irrigation is needed...")
        should_irrigate = self.should_irrigate(plant, current_moisture)
        print(f"   Irrigation Needed: {'✅ YES' if should_irrigate else '❌ NO'}")
        print(f"   Current: {current_moisture}% vs Desired: {plant.desired_moisture}%")
        
        if not should_irrigate:
            print(f"⏭️  SKIPPING IRRIGATION — Already moist enough!")
            print(f"   Current moisture ({current_moisture}%) >= Desired moisture ({plant.desired_moisture}%)")
            return IrrigationResult(
                status="skipped",
                reason="already moist",
                moisture=current_moisture
            )

        # Case 4: Otherwise, perform irrigation cycle
        print(f"\n🚰 STARTING IRRIGATION CYCLE")
        print(f"   Target Moisture: {plant.desired_moisture}%")
        print(f"   Current Moisture: {current_moisture}%")
        print(f"   Water Needed: {plant.desired_moisture - current_moisture:.1f}%")
        return await self.perform_irrigation(plant, current_moisture)

    def is_overwatered(self, plant: "Plant", moisture: float) -> bool:
        """
        Determines if the plant is overwatered.
        """
        if plant.last_irrigation_time:
            time_since = time.time() - plant.last_irrigation_time.timestamp()
            if time_since > 86400 and moisture > plant.desired_moisture + 10:  # 86400 = 1 day
                return True
        return False

    def should_irrigate(self, plant: "Plant", current_moisture: float) -> bool:
        """
        Checks if irrigation is necessary based on desired moisture level.
        """
        return current_moisture < plant.desired_moisture

    async def perform_irrigation(self, plant: "Plant", initial_moisture: float) -> IrrigationResult:
        """
        Executes the irrigation cycle using water pulses.
        """
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
        print(f"   Initial Moisture: {initial_moisture}%")
        print(f"   Target Moisture: {plant.desired_moisture}%")
        print(f"   Moisture Gap: {plant.desired_moisture - initial_moisture:.1f}%")
        print(f"   Max Water: {plant.valve.water_limit}L")
        
        total_water: float = 0.0
        water_limit: float = plant.valve.water_limit
        pulse_count = 0

        print(f"\n🔄 Starting Water Pulses...")
        print(f"   {'Pulse':<6} {'Water':<8} {'Current':<10} {'Target':<8} {'Gap':<8} {'Status':<15}")
        print(f"   {'-----':<6} {'-----':<8} {'-------':<10} {'------':<8} {'---':<8} {'------':<15}")
        
        while total_water < water_limit:
            current_moisture: float = await plant.get_moisture()
            moisture_gap = plant.desired_moisture - current_moisture
            
            print(f"   {pulse_count+1:<6} {total_water:<8.2f}L {current_moisture:<10.1f}% {plant.desired_moisture:<8.1f}% {moisture_gap:<8.1f}% ", end="")
            
            if current_moisture >= plant.desired_moisture:
                print("✅ TARGET REACHED")
                break
            elif total_water >= water_limit:
                print("🚫 WATER LIMIT REACHED")
                break
            else:
                print("💧 WATERING...")
            
            # Perform water pulse
            print(f"      🔓 Opening valve for {pulse_time:.2f}s...")
            plant.valve.request_open()
            time.sleep(pulse_time)
            plant.valve.request_close()
            print(f"      🔒 Valve closed")
            
            total_water += self.water_per_pulse
            pulse_count += 1
            
            # Update simulation if needed
            if plant.sensor.simulation_mode:
                old_moisture = current_moisture
                plant.sensor.update_simulated_value(5)  # 5% increase after each pulse
                print(f"      📈 Simulation: {old_moisture:.1f}% → {plant.sensor.simulated_value:.1f}% (+5%)")
            
            # Pause between pulses
            if total_water < water_limit and current_moisture < plant.desired_moisture:
                print(f"      ⏸️  Pausing {self.pause_between_pulses}s before next pulse...")
                time.sleep(self.pause_between_pulses)

        final_moisture: float = await plant.get_moisture()
        
        print(f"\n📊 IRRIGATION SUMMARY:")
        print(f"   Pulses Completed: {pulse_count}")
        print(f"   Total Water Used: {total_water:.2f}L")
        print(f"   Initial Moisture: {initial_moisture:.1f}%")
        print(f"   Final Moisture: {final_moisture:.1f}%")
        print(f"   Moisture Increase: {final_moisture - initial_moisture:.1f}%")
        print(f"   Target Moisture: {plant.desired_moisture:.1f}%")
        print(f"   Target Reached: {'✅ YES' if final_moisture >= plant.desired_moisture else '❌ NO'}")

        # Fault detection: watered but moisture didn’t rise
        if total_water >= water_limit and final_moisture < plant.desired_moisture:
            print(f"\n🚨 FAULT DETECTED!")
            print(f"   ❌ Watered {total_water:.2f}L but moisture is still low!")
            print(f"   📊 Final moisture ({final_moisture:.1f}%) < Target ({plant.desired_moisture:.1f}%)")
            print(f"   🔧 Possible issues: Sensor fault, valve malfunction, or soil drainage")
            plant.valve.block()
            return IrrigationResult(
                status="error",
                reason="sensor mismatch or irrigation fault",
                moisture=initial_moisture,
                final_moisture=final_moisture,
                water_added_liters=total_water,
                irrigation_time=datetime.now()
            )

        # Update last irrigation time
        plant.last_irrigation_time = datetime.now()
        print(f"\n✅ IRRIGATION COMPLETED SUCCESSFULLY!")
        print(f"   ⏰ Irrigation Time: {plant.last_irrigation_time}")
        print(f"   🎯 Target Reached: {'✅ YES' if final_moisture >= plant.desired_moisture else '⚠️  PARTIAL'}")

        return IrrigationResult(
            status="done",
            moisture=initial_moisture,
            final_moisture=final_moisture,
            water_added_liters=total_water,
            irrigation_time=plant.last_irrigation_time
        )
