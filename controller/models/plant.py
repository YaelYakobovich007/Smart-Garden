from typing import Optional
from datetime import datetime

from controller.hardware.sensors.sensor import Sensor
from controller.hardware.valves.valve import Valve
from controller.irrigation.irrigation_schedule import IrrigationSchedule

class Plant:
    def __init__(
        self,
        plant_id: int,
        desired_moisture: float,
        sensor: Sensor,
        valve: Valve
    ) -> None:
        self.plant_id: int = plant_id
        self.desired_moisture: float = desired_moisture
        self.sensor: Sensor = sensor
        self.valve: Valve = valve
        self.moisture_level: Optional[float] = None
        self.last_irrigation_time: Optional[datetime] = None # chechk why it says optinal here 
        self.schedule: Optional[IrrigationSchedule] = None
            

    def get_moisture(self) -> Optional[float]:
        return self.sensor.read_moisture()

    def update_moisture(self) -> None:
        self.moisture_level = self.sensor.read_moisture()
