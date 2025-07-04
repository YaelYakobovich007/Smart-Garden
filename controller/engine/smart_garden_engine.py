from typing import Dict, List, Optional
from controller.hardware.relay_controller import RelayController
from controller.hardware.sensors.sensor import Sensor
from controller.hardware.sensors.sensor_manager import SensorManager
from controller.hardware.valves.valve import Valve
from controller.hardware.valves.valves_manager import ValvesManager
from controller.irrigation.irrigation_algorithm import IrrigationAlgorithm
from controller.irrigation.irrigation_schedule import IrrigationSchedule
from controller.models.plant import Plant


class SmartGardenEngine:
    """
    Central engine managing the smart garden logic, including plant registration,
    valve and sensor management, and execution of irrigation.
    """

    def __init__(self, total_valves: int = 2, total_sensors: int = 2):
        """
        Initializes the SmartGardenEngine with a given number of valves and sensors.
        """
        self.valves_manager: ValvesManager = ValvesManager(total_valves)
        self.sensor_manager = SensorManager(total_sensors)
        self.irrigation_algorithm = IrrigationAlgorithm()
        self.plants: Dict[int, Plant] = {}
        self.relay_controller: RelayController = RelayController(simulation_mode=True)

    def add_plant(
            self,
            plant_id: int,
            desired_moisture: float,
            schedule_data: Optional[List[Dict[str, str]]] = None,
            plant_lat: float = 32.7940,
            plant_lon: float = 34.9896,
            pipe_diameter: float = 1.0,
            flow_rate: float = 0.05,
            water_limit: float = 1.0
    ) -> None:
        if plant_id in self.plants:
            raise ValueError(f"Plant ID {plant_id} already exists")

        valve_id = self.valves_manager.assign_valve(plant_id)
        sensor_id = self.sensor_manager.assign_sensor(plant_id)

        valve = Valve(valve_id, pipe_diameter, water_limit, flow_rate, relay_controller=self.relay_controller,
                      simulation_mode=True)
        sensor = Sensor(simulation_mode=True, modbus_id=sensor_id)

        plant = Plant(plant_id, desired_moisture, sensor, valve, plant_lat, plant_lon)
        self.plants[plant_id] = plant

        if schedule_data:
            plant.schedule = IrrigationSchedule(plant, schedule_data, self.irrigation_algorithm)

    async def water_plant(self, plant_id: int) -> None:
        """
        Initiates watering for a specific plant by ID.
        """
        if plant_id not in self.plants:
            raise ValueError(f"Plant {plant_id} not found.")
        plant = self.plants[plant_id]
        await self.irrigation_algorithm.irrigate(plant)

    def remove_plant(self, plant_id: int) -> None:
        """
        Removes a plant and releases its associated resources.
        """
        if plant_id not in self.plants:
            raise ValueError(f"Plant {plant_id} not found")
        self.valves_manager.release_valve(plant_id)
        self.sensor_manager.release_sensor(plant_id)
        del self.plants[plant_id]

    async def update_all_moisture(self) -> None:
        """
        Updates moisture levels for all plants (used in simulation mode).
        """
        for plant in self.plants.values():
            await plant.update_moisture()

    def disable_plant_watering(self, plant_id: int) -> None:
        """
        Disables irrigation for a specific plant.
        """
        if plant_id not in self.plants:
            raise ValueError(f"Plant {plant_id} not found")
        self.plants[plant_id].valve.disable()

    def enable_plant_watering(self, plant_id: int) -> None:
        """
        Re-enables irrigation for a specific plant.
        """
        if plant_id not in self.plants:
            raise ValueError(f"Plant {plant_id} not found")
        self.plants[plant_id].valve.enable()

    def get_available_sensors(self) -> List[int]:
        """
        Returns a list of currently unassigned sensor IDs.
        """
        return self.sensor_manager.get_available_sensors()

    def get_available_valves(self) -> List[int]:
        """
        Returns a list of currently unassigned valve IDs.
        """
        return self.valves_manager.get_available_valves()
