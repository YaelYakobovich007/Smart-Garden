from datetime import time

class IrrigationAlgorithm:
    def __init__(self, irrigation_controller, engine):
        self.engine = engine
        self.irrigation_controller = irrigation_controller
        self.water_per_pulse = 0.03  # Liter
        self.pause_between_pulses = 10 #seconds

    def irrigate(self, plant):
        current_moisture = plant.get_current_moisture()
        if self.is_overwatered(plant,current_moisture):
            # ולשלוח הודעת שגיאה ללקוח צריך לעצור את הברז
            print("need to diactivate valve")
            return
        if self.should_irrigate(plant,current_moisture):
            self.perform_irrigation()

    def is_overwatered(self, plant, current_moisture):
        if plant.last_irrigation_time and (time.time() - plant.last_irrigation_time) > 86400:
            if current_moisture > plant.desired_moisture + 10:
                return True
        return False


    def should_irrigate(self, plant, current_moisture):
        return current_moisture < plant.desired_moisture

    def perform_irrigation(self, plant, irrigation_time):
        current_moisture = plant.sensor.read_moisture()
        print(f" Plant {plant.plant_id} Initial Moisture: {current_moisture}%")

        total_water_added = 0
        water_limit = plant.valve.water_limit
        pulse_time = plant.valve.calculate_open_time(self.water_per_pulse)

        while current_moisture < plant.desired_moisture and total_water_added < water_limit:
            plant.valve.open()
            time.sleep(pulse_time)
            plant.valve.close()

            total_water_added += self.water_per_pulse

            current_moisture = plant.sensor.read_moisture()
            print(f" Plant {plant.plant_id} - New Moisture: {current_moisture}%, Total Water Added: {total_water_added * 1000:.0f} mL")

            if current_moisture >= plant.desired_moisture:
                print(f" Target moisture reached for Plant {plant.plant_id}. Total water added: {total_water_added * 1000:.0f} mL")
                return

            if total_water_added >= water_limit:
                #צריך לעצור את הברז ולשלוח הודעת שגה ללקוח
                print(f" Water limit reached for Plant {plant.plant_id}. Final Moisture: {current_moisture}%")
                return

            time.sleep(self.pause_between_pulses)

