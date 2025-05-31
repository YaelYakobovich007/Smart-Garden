import time
from typing import Dict, List, Optional
from controller.hardware.sensors.sensor_manager import SensorManager
from controller.hardware.valves.valve import Valve
from controller.hardware.valves.valves_manager import ValvesManager
from controller.irrigation.irrigation_algorithm import IrrigationAlgorithm
from controller.irrigation.irrigation_controller import IrrigationController
from controller.models.plant import Plant

class SmartGardenEngine:
    def __init__(self, total_valves: int = 2, total_sensors: int = 2):
        self.irrigation_controller = IrrigationController()
        self.valves_manager = ValvesManager(total_valves)
        self.sensor_manager = SensorManager(total_sensors)
        self.irrigation_algorithm = IrrigationAlgorithm()
        self.plants: Dict[str, Plant] = {}

    def add_plant(self, plant_id: str, desired_moisture: float,
                  schedule_data: Optional[List[Dict[str, str]]] = None,
                  pipe_diameter: float = 1.0, flow_rate: float = 0.05,
                  water_limit: float = 1.0) -> None:
        
        if plant_id in self.plants:
            raise ValueError(f"Plant ID {plant_id} already exists!")

        valve_id = self.valves_manager.assign_valve(plant_id)
        sensor_id = self.sensor_manager.assign_sensor(plant_id)

        valve = Valve(valve_id, pipe_diameter, water_limit, flow_rate, self.irrigation_controller)
        sensor = sensor(simulation_mode=True, initial_moisture=30.0, modbus_id=sensor_id)

        plant = Plant(plant_id, desired_moisture, sensor, valve, schedule_data)
        self.plants[plant_id] = plant

    def remove_plant(self, plant_id: str) -> None:
        self._get_plant_or_raise(plant_id)
        self.valves_manager.release_valve(plant_id)
        self.sensor_manager.release_sensor(plant_id)
        del self.plants[plant_id]
        print(f"Removed Plant {plant_id}")

    def water_plant(self, plant_id: str, duration: int) -> None:
        plant = self._get_plant_or_raise(plant_id)
        valve_id = self.valves_manager.get_valve(plant_id)
        if valve_id in self.valves_manager.disabled_valves:
            print(f"Valve {valve_id} is disabled!")
            return
        plant.water(duration)

    def _get_plant_or_raise(self, plant_id: str) -> Plant:
        if plant_id not in self.plants:
            raise ValueError(f"Plant {plant_id} not found")
        return self.plants[plant_id]

    def update_all_moisture(self) -> None:
        print("Updating moisture levels...")
        for plant in self.plants.values():
            plant.update_moisture()

    def disable_plant_watering(self, plant_id: str) -> None:
        valve_id = self.valves_manager.get_valve(plant_id)
        self.valves_manager.disable_valve(valve_id)

    def enable_plant_watering(self, plant_id: str) -> None:
        valve_id = self.valves_manager.get_valve(plant_id)
        self.valves_manager.enable_valve(valve_id)

    def get_available_sensors(self) -> List[int]:
        return self.sensor_manager.get_available_sensors()

    def get_available_valves(self) -> List[int]:
        return self.valves_manager.get_available_valves()