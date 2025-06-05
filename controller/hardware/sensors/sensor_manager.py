from typing import Dict, List

class SensorManager:
    def __init__(self, total_sensors: int = 2) -> None:
        self.available_sensors: List[int] = list(range(total_sensors)) 
        self.plant_sensor_map: Dict[int, int] = {} #[plant_id] = sensor_id

    def assign_sensor(self, plant_id: str) -> int:
        if plant_id in self.plant_sensor_map:
            raise ValueError(f"Plant {plant_id} already has a sensor.")

        if not self.available_sensors:
            raise ValueError("No available sensors left")

        sensor_id = self.available_sensors.pop(0)
        self.plant_sensor_map[plant_id] = sensor_id
        return sensor_id

    def release_sensor(self, plant_id: str) -> None:
        if plant_id not in self.plant_sensor_map:
            raise ValueError(f"Plant {plant_id} has no assigned sensor.")

        sensor_id = self.plant_sensor_map.pop(plant_id)
        self.available_sensors.append(sensor_id)

    def get_sensor_id(self, plant_id: str) -> int:
        if plant_id not in self.plant_sensor_map:
            raise ValueError(f"Plant {plant_id} has no assigned sensor.")
        return self.plant_sensor_map[plant_id]

    def get_available_sensors(self) -> List[int]:
        return self.available_sensors.copy()
