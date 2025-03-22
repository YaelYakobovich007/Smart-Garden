from irrigation.irrigation_schedule import IrrigationSchedule
from services.sensor_reader import SensorReader
class Plant:
    def __init__(self, plant_id,desired_moisture, sensor,valve, schedule_data= None):
        self.plant_id = plant_id
        self.sensor = sensor
        self.desired_moisture = desired_moisture
        self.schedule_data = schedule_data
        self.valve = valve
        self.moisture_level = None
        self.last_irrigation_time = None

        #for schedule_item in self.schedule_data:
        #    schedule_item["valve_number"] = self.valve.get_valve_id() # או ישירות את הdatamember עצמו לבדוק איך נהוג בפייתון
        #if not schedule_data:
        #    self.schedule = IrrigationSchedule(self,schedule_data)

    def get_moisture(self):
        return self.sensor.read_moisture()

    def update_moisture(self):
        self.moisture_level = self.sensor.read_moisture()
        print(f"Updated moisture for Plant {self.plant_id}: {self.moisture_level}%")

    def water(self, duration):
        if self.moisture_level is None:
            print(f"Cannot water Plant {self.plant_id}: moisture level unknown!")
            return

        if self.moisture_level >= self.desired_moisture:
            print(f"Plant {self.plant_id} does not need water (Moisture: {self.moisture_level}%)")
            return

        print(f"Watering Plant {self.plant_id} through Valve {self.valve.get_valve_id()} for {duration} seconds\n")
        self.irrigation_controller.activate_valve(self.valve.get_valve_id(), duration)

    def get_valve_id(self):
        return self.valve_id