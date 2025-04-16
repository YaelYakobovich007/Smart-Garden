import time

from irrigation.irrigation_controller import IrrigationController
from hardware.impl.plant_impl import PlantImpl
from hardware.valves.valves_manager import ValvesManager


class SmartGardenEngine:
    def __init__(self):
        self.irrigation_controller = IrrigationController()
        self.valves_manager = ValvesManager(10)
        self.plants = {}

    def add_plant(self, plant_id, sensor_id, desired_moisture, pot_size, schedule_data):
        if plant_id in self.plants:
            raise ValueError(f"Plant ID {plant_id} already exists!")

        valve_id = self.valves_manager.assign_valve(plant_id)
        new_plant = PlantImpl(plant_id, sensor_id, desired_moisture, pot_size, self.irrigation_controller, schedule_data, valve_id)
        self.plants[plant_id] = new_plant
        print(f"Plant {plant_id} added with valve {valve_id}!\n")

    def remove_plant(self, plant_id):
        self._get_plant_or_raise(plant_id)
        self.valves_manager.release_valve(plant_id)
        del self.plants[plant_id]
        print(f"Removed plant {plant_id} from the system.\n")

    def water_plant(self, plant_id, duration):
        plant = self._get_plant_or_raise(plant_id)

        valve_id = self.valves_manager.get_valve(plant_id)
        if valve_id in self.valves_manager.disabled_valves:
            print(f"Valve {valve_id} for plant {plant_id} is disabled. Cannot water!\n")
            return

        plant.water(duration)

    def _get_plant_or_raise(self, plant_id):
        if plant_id not in self.plants:
            raise ValueError(f"Plant {plant_id} not found!\n")
        return self.plants[plant_id]


    def update_all_moisture(self):
        print("Updating moisture levels...")
        for plant in self.plants.values():
            plant.update_moisture()
        print("")

    def disable_plant_watering(self, plant_id):
        valve_id = self.valves_manager.get_valve(plant_id)
        print(f"valve_id: {valve_id} for plant {plant_id}\n")
        self.valves_manager.disable_valve(valve_id)
        print(f"Watering disabled for Plant {plant_id} (Valve {valve_id}).\n")

    def enable_plant_watering(self, plant_id):
        valve_id = self.valves_manager.get_valve(plant_id)
        self.valves_manager.enable_valve(valve_id)
        print(f"✅ Watering enabled for Plant {plant_id} (Valve {valve_id}).\n")

    def start_moisture_monitoring(self):
        while True:
            self.update_all_moisture()
            time.sleep(15)


    # import pdb; pdb.set_trace()