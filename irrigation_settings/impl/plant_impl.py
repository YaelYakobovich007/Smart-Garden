from irrigation_settings.impl.irrigation_schedule import IrrigationSchedule
from services.sensor_reader import SensorReader


class PlantImpl:
    def __init__(self, plant_id, sensor_id, desired_moisture, pot_size, irrigation_controller, schedule_data, valve_id):
        self.plant_id = plant_id
        self.sensor_id = sensor_id
        self.desired_moisture = desired_moisture
        self.schedule_data = schedule_data
        self.irrigation_controller = irrigation_controller
        self.valve_id = valve_id
        self.moisture_level = None
        self.sensor_reader = SensorReader()

        for schedule_item in self.schedule_data:
            schedule_item["valve_number"] = self.valve_id

        self.schedule = IrrigationSchedule(self, schedule_data, irrigation_controller)

    def update_moisture(self):
        self.moisture_level = self.sensor_reader.read_sensor_data()
        print(f"Updated moisture for Plant {self.plant_id}: {self.moisture_level}%")

    def water(self, duration):
        if self.moisture_level is None:
            print(f"Cannot water Plant {self.plant_id}: moisture level unknown!")
            return

        if self.moisture_level >= self.desired_moisture:
            print(f"Plant {self.plant_id} does not need water (Moisture: {self.moisture_level}%)")
            return

        print(f"Watering Plant {self.plant_id} through Valve {self.valve_id} for {duration} seconds\n")
        self.irrigation_controller.activate_valve(self.valve_id, duration)
