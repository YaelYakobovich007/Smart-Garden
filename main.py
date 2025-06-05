from controller.engine.smart_garden_engine import SmartGardenEngine

if __name__ == "__main__":
    engine = SmartGardenEngine(total_valves=2, total_sensors=2)
    engine.add_plant(
        plant_id=1,
        desired_moisture=80.0,
        pipe_diameter=10,
        flow_rate=0.4,
        water_limit=5.0
    )
     
    engine.add_plant(
        plant_id=2,
        desired_moisture=80.0,
        pipe_diameter=15,
        flow_rate=1.0,
        water_limit=5.0
    )

    engine.water_plant(1)
    engine.water_plant(2)
