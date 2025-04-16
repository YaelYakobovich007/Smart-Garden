
from typing import Dict, List


class SensorManager:
    def __init__(self, total_sensors : int = 2):
        self.available_sensors : List[int] = list(range(total_sensors))  
        self.plant_sensor_map : Dict[str,str] = {}  # { plant_id: sensor_id }

    def assign_sensor(self, plant_id : i):
        if not self.available_sensors:
            raise ValueError("🚫 No available sensors left!")

        sensor_id = self.available_sensors.pop(0)
        self.plant_sensor_map[plant_id] = sensor_id
        print(f"✅ Assigned Sensor {sensor_id} to Plant {plant_id}")
        return sensor_id

    def release_sensor(self, plant_id):
        if plant_id in self.plant_sensor_map:
            sensor_id = self.plant_sensor_map.pop(plant_id)
            self.available_sensors.append(sensor_id)
            print(f"🔁 Released Sensor {sensor_id} from Plant {plant_id}")

    def get_sensor(self, plant_id):
        return self.plant_sensor_map.get(plant_id)

    def get_available_sensors(self):
        return self.available_sensors.copy()
