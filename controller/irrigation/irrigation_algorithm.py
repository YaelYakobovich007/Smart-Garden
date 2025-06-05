from datetime import datetime
import time
from controller.dto.irrigation_result import IrrigationResult
from controller.models.plant import Plant
from controller.services.weather_service import WeatherService  

class IrrigationAlgorithm:
    def __init__(self):
        self.water_per_pulse : int= 0.03     # Liter
        self.pause_between_pulses: int  = 10  #seconds
        self.weather_service = WeatherService()  
    
    def irrigate(self, plant: "Plant") -> IrrigationResult:
        current_moisture = plant.get_moisture()
        print(f"Initial moisture for plant {plant.plant_id}: {current_moisture}%")
        
        # Check for rain forecast
        if self.weather_service.will_rain_today(plant.lat, plant.lon):
            print(f"Skipping irrigation for {plant.plant_id} — rain expected today.")
            return IrrigationResult(
                status="skipped",
                reason="rain_expected",
                moisture=current_moisture
            )
        
        # Case 1: Overwatered — block and stop
        if self.is_overwatered(plant,current_moisture):
            plant.valve.block()
            return IrrigationResult(
                status="error",
                reason="overwatered",
                moisture=current_moisture
            )
        
        # Case 2: Already moist — no need to water
        if not self.should_irrigate(plant, current_moisture):
            return IrrigationResult(
                status="skipped",
                reason="already moist",
                moisture=current_moisture
            )
        
        # Case 3: Proceed with irrigation
        return self.perform_irrigation(plant, current_moisture)

    def is_overwatered(self, plant: "Plant", moisture: float) -> bool:
        if plant.last_irrigation_time:
            time_since = time.time() - plant.last_irrigation_time.timestamp()
            if time_since > 86400 and moisture > plant.desired_moisture + 10: #86400 = 60 * 60 * 24 = 1 day in seconds
                return True
        return False

    def should_irrigate(self, plant: "Plant", current_moisture: float) -> bool:
        return current_moisture < plant.desired_moisture

    def perform_irrigation(self, plant: "Plant", initial_moisture: float) -> IrrigationResult:
        total_water: float = 0.0
        pulse_time: float = plant.valve.calculate_open_time(self.water_per_pulse)
        water_limit: float = plant.valve.water_limit

        while total_water < water_limit:
            current_moisture: float = plant.get_moisture()
            if current_moisture >= plant.desired_moisture:
                break

            print(f"Watering {plant.plant_id}... ({total_water:.2f}L so far)")
            plant.valve.request_open()
            time.sleep(pulse_time)
            plant.valve.request_close()

            total_water += self.water_per_pulse

            if plant.sensor.simulation_mode:
                plant.sensor.update_moisture(5) # 5% increase after each pulse

            time.sleep(self.pause_between_pulses)

        final_moisture: float = plant.get_moisture()

        # Fault detection: watered full session but still dry
        if total_water >= water_limit and final_moisture < plant.desired_moisture:
            print(f"Sensor or irrigation error — watered {total_water:.2f}L but moisture is still low!")
            plant.valve.block()
            return IrrigationResult(
                status="error",
                reason="sensor mismatch or irrigation fault",
                moisture=initial_moisture,
                final_moisture=final_moisture,
                water_added_liters=total_water,
                irrigation_time=datetime.now()
            )

        plant.last_irrigation_time = datetime.now()

        return IrrigationResult(
            status="done",
            moisture=initial_moisture,
            final_moisture=final_moisture,
            water_added_liters=total_water,
            irrigation_time=plant.last_irrigation_time
        )
