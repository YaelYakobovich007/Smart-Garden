from typing import Optional, List, Dict
from datetime import datetime

from controller.hardware.sensors.sensor import Sensor
from controller.hardware.valves.valve import Valve


class Plant:
    def __init__(self, plant_id: int, desired_moisture: float, sensor: "Sensor", valve: "Valve",
                 schedule_data: Optional[List[Dict[str, str]]] = None) -> None:

        self.plant_id: int = plant_id
        self.desired_moisture: float = desired_moisture
        self.sensor: Sensor = sensor
        self.valve: Valve = valve
        self.schedule_data: Optional[List[Dict[str, str]]] = schedule_data
        self.moisture_level: Optional[float] = None
        self.last_irrigation_time: Optional[datetime] = None

        #for schedule_item in self.schedule_data:
        #    schedule_item["valve_number"] = self.valve.get_valve_id() # או ישירות את הdatamember עצמו לבדוק איך נהוג בפייתון

        if  schedule_data:
            self.schedule = IrrigationSchedule(self,schedule_data)

    def get_moisture(self) -> Optional[float]:
        return self.sensor.read_moisture()

    def update_moisture(self) -> None:
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

    def get_valve_id(self) -> int:
        return self.valve_id