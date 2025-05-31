from hardware.sensors.sensor import Sensor
from hardware.valves.valve import Valve
from irrigation.irrigation_algorithm import IrrigationAlgorithm

if __name__ == "__main__":
    from hardware.relay_controller import RelayController
    from models.plant import Plant

    # יצירת בקר ממסר
    relay_controller = RelayController(simulation_mode=False)

    # יצירת חיישני לחות
    sensor1 = Sensor(sensor_id=1, plant_id=101)
    sensor2 = Sensor(sensor_id=2, plant_id=102)

    # יצירת ברזים
    valve1 = Valve(valve_id=1, pipe_diameter=10, water_limit=5, flow_rate=0.4, relay_controller=relay_controller)
    valve2 = Valve(valve_id=2, pipe_diameter=15, water_limit=5, flow_rate=1.0, relay_controller=relay_controller)

    # יצירת צמחים עם חיישנים וברזים
    plant1 = Plant(plant_id=101, desired_moisture=80, sensor=sensor1, valve=valve1)
    plant2 = Plant(plant_id=102, desired_moisture=80, sensor=sensor2, valve=valve2)

    # יצירת אלגוריתם השקיה
    irrigation_algorithm = IrrigationAlgorithm()

    # הפעלת השקיה לצמחים
    irrigation_algorithm.irrigate(plant1)
    irrigation_algorithm.irrigate(plant2)
