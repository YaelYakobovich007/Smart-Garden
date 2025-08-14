from typing import Optional, Tuple
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
        temperature_level (Optional[float]): Latest measured temperature level (None if not yet measured).
        last_irrigation_time (Optional[datetime]): Timestamp of the last irrigation (None if never irrigated).
        schedule (Optional[IrrigationSchedule]): Custom irrigation schedule for this plant (optional).
        lat (float): Latitude coordinate of the plant's location.
        lon (float): Longitude coordinate of the plant's location.
        pipe_diameter (float): Diameter of the irrigation pipe in cm.
        flow_rate (float): Water flow rate in L/s.
        water_limit (float): Maximum water limit in L.
    """
    def __init__(
        self,
        plant_id: int,
        desired_moisture: float,
        valve: Valve,
        sensor: Sensor,
        lat: float,
        lon: float,
        pipe_diameter: float = 1.0,
        flow_rate: float = 0.05,
        water_limit: float = 1.0
    ) -> None:
        self.plant_id: int = plant_id
        self.desired_moisture: float = desired_moisture
        self.sensor: Sensor = sensor
        self.valve: Valve = valve
        self.moisture_level: Optional[float] = None
        self.temperature_level: Optional[float] = None
        self.last_irrigation_time: Optional[datetime] = None
        self.schedule: Optional[IrrigationSchedule] = None
        self.lat: float = lat
        self.lon: float = lon
        self.pipe_diameter: float = pipe_diameter
        self.flow_rate: float = flow_rate
        self.water_limit: float = water_limit
            

    async def get_moisture(self) -> Optional[float]:
        """
        Reads and returns the current soil moisture level from the sensor.

        Returns:
            Optional[float]: Current soil moisture value, or None if unavailable.
        """
        sensor_data = await self.sensor.read()
        
        if sensor_data is None:
            return None
        
        # Handle both simulation mode (returns float) and real mode (returns tuple)
        if isinstance(sensor_data, tuple) and len(sensor_data) >= 2:
            # Real sensor returns (moisture, temperature)
            moisture, temperature = sensor_data
            # Ensure moisture is float (in case sensor returns string)
            return float(moisture) if moisture is not None else None
        else:
            # Simulation mode returns just moisture value
            # Ensure it's float (in case sensor returns string)
            return float(sensor_data) if sensor_data is not None else None

    async def get_sensor_data(self) -> Optional[Tuple[float, float]]:
        """
        Reads and returns the current sensor data (moisture, temperature).

        Returns:
            Optional[Tuple[float, float]]: (moisture, temperature) or None if unavailable.
        """
        sensor_data = await self.sensor.read()
        
        if sensor_data is None:
            return None
        
        # Handle both simulation mode (returns float) and real mode (returns tuple)
        if isinstance(sensor_data, tuple) and len(sensor_data) >= 2:
            # Real sensor returns (moisture, temperature)
            moisture, temperature = sensor_data
            # Ensure values are float (in case sensor returns string)
            moisture = float(moisture) if moisture is not None else None
            temperature = float(temperature) if temperature is not None else None
            return moisture, temperature
        else:
            # Simulation mode returns just moisture value
            moisture = float(sensor_data) if sensor_data is not None else None
            # In simulation mode, we don't have temperature
            return moisture, None

    async def update_moisture(self) -> None:
        """
        Updates the plant's internal moisture_level attribute
        with a new reading from the sensor.
        """
        self.moisture_level = await self.get_moisture()

    async def update_sensor_data(self) -> None:
        """
        Updates the plant's internal sensor data attributes
        with new readings from the sensor.
        """
        sensor_data = await self.get_sensor_data()
        if sensor_data is not None:
            self.moisture_level, self.temperature_level = sensor_data
