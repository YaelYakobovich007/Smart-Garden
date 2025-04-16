class ValvesManager:
    def __init__(self, total_valves):
        self.plant_valve_map = {}  # {plant_id: valve_id}
        self.available_valves = list(range(total_valves))
        self.disabled_valves = set()

    def get_valve(self, plant_id):
        if plant_id not in self.plant_valve_map:
            raise ValueError(f"No valve assigned for plant {plant_id}!")
        return self.plant_valve_map[plant_id]

    def assign_valve(self, plant_id):
        if plant_id in self.plant_valve_map:
            raise ValueError(f"Plant {plant_id} already has an assigned valve!")

        available_active_valves = [v for v in self.available_valves if v not in self.disabled_valves]

        if not available_active_valves:
            raise ValueError("No available valves left!")

        valve_id = self.available_valves.pop(0)
        self.plant_valve_map[plant_id] = valve_id

        print(f"✅ Assigned valve {valve_id} to plant {plant_id}")
        print(f"🌐 Updated plant_valve_map: {self.plant_valve_map}")
        return valve_id

    def release_valve(self, plant_id):
        if plant_id not in self.plant_valve_map:
            raise ValueError(f"Plant {plant_id} has no assigned valve!")

        valve_id = self.plant_valve_map.pop(plant_id)
        self.available_valves.append(valve_id)
        print(f"Released valve {valve_id} from plant {plant_id}")

    def disable_valve(self, valve_id):
        if valve_id in self.disabled_valves:
            raise ValueError(f"Valve {valve_id} is already disabled!")

        self.disabled_valves.add(valve_id)
        print(f"Disabled valve {valve_id}")

    def enable_valve(self, valve_id):
        if valve_id not in self.disabled_valves:
            raise ValueError(f"Valve {valve_id} is not disabled!")

        self.disabled_valves.remove(valve_id)
        print(f"Enabled valve {valve_id}")
