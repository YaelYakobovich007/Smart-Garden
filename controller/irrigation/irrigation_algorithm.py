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
        current_moisture = await plant.get_moisture()
        print(f"Initial moisture for plant {plant.plant_id}: {current_moisture}%")

        # Case 1: Skip irrigation if rain is expected
        if self.weather_service.will_rain_today(plant.lat, plant.lon):
            print(f"Skipping irrigation for {plant.plant_id} — rain expected today.")
            return IrrigationResult.skipped(
                plant_id=plant.plant_id,
                moisture=current_moisture,
                reason="rain_expected"
            )

        # Case 2: Overwatered — block and stop
        if self.is_overwatered(plant, current_moisture):
            plant.valve.block()
            return IrrigationResult.error(
                plant_id=plant.plant_id,
                error_message="overwatered",
                moisture=current_moisture
            )

        # Case 3: If soil is already moist enough, skip irrigation
        if not self.should_irrigate(plant, current_moisture):
            return IrrigationResult.skipped(
                plant_id=plant.plant_id,
                moisture=current_moisture,
                reason="already moist"
            )

        # Case 4: Otherwise, perform irrigation cycle
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
        total_water: float = 0.0
        pulse_time: float = plant.valve.calculate_open_time(self.water_per_pulse)
        water_limit: float = plant.valve.water_limit

        while total_water < water_limit:
            current_moisture: float = await plant.get_moisture()
            if current_moisture >= plant.desired_moisture:
                break

            print(f"Watering {plant.plant_id}... ({total_water:.2f}L so far)")
            plant.valve.request_open()
            time.sleep(pulse_time)
            plant.valve.request_close()

            total_water += self.water_per_pulse

            if plant.sensor.simulation_mode:
                plant.sensor.update_simulated_value(5)  # 5% increase after each pulse

            time.sleep(
                self.pause_between_pulses)

        final_moisture: float = await plant.get_moisture()

        # Fault detection: watered but moisture didn't rise
        if total_water >= water_limit and final_moisture < plant.desired_moisture:
            print(f"Sensor or irrigation error — watered {total_water:.2f}L but moisture is still low!")
            plant.valve.block()
            return IrrigationResult.error(
                plant_id=plant.plant_id,
                error_message="sensor mismatch or irrigation fault",
                moisture=initial_moisture,
                final_moisture=final_moisture,
                water_added_liters=total_water
            )

        # Update last irrigation time
        plant.last_irrigation_time = datetime.now()

        return IrrigationResult.success(
            plant_id=plant.plant_id,
            moisture=initial_moisture,
            final_moisture=final_moisture,
            water_added_liters=total_water
        )
