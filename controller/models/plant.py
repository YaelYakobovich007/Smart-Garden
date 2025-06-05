from typing import Optional
from datetime import datetime

from controller.hardware.sensors.sensor import Sensor
from controller.hardware.valves.valve import Valve
from controller.irrigation.irrigation_schedule import IrrigationSchedule

class Plant:
    """
    Represents a single plant managed by the smart irrigation system.

    Attributes:
        plant_id (int): Unique identifier for the plant.
        desired_moisture (float): Target soil moisture level for optimal plant health.
        sensor (Sensor): Sensor object that measures soil moisture for this plant.
        valve (Valve): Valve object that controls irrigation for this plant.
        moisture_level (Optional[float]): Latest measured moisture level (None if not yet measured).
        last_irrigation_time (Optional[datetime]): Timestamp of the last irrigation (None if never irrigated).
        schedule (Optional[IrrigationSchedule]): Custom irrigation schedule for this plant (optional).
        lat (float): Latitude coordinate of the plant’s location.
        lon (float): Longitude coordinate of the plant’s location.
    """
    def __init__(
        self,
        plant_id: int,
        desired_moisture: float,
        sensor: Sensor,
        valve: Valve,
        plant_lat : float,
        plant_lon : float
    ) -> None:
        self.plant_id: int = plant_id
        self.desired_moisture: float = desired_moisture
        self.sensor: Sensor = sensor
        self.valve: Valve = valve
        self.moisture_level: Optional[float] = None
        self.last_irrigation_time: Optional[datetime] = None # chechk why it says optinal here 
        self.schedule: Optional[IrrigationSchedule] = None
        self.lat : float = plant_lat
        self.lon : float = plant_lon  
            

    def get_moisture(self) -> Optional[float]:
        """
        Reads and returns the current soil moisture level from the sensor.

        Returns:
            Optional[float]: Current soil moisture value, or None if unavailable.
        """
        return self.sensor.read()

    def update_moisture(self) -> None:
        """
        Updates the plant's internal moisture_level attribute
        with a new reading from the sensor.
        """
        self.moisture_level = self.sensor.read()
