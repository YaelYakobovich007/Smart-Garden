from hardware.sensors.sensor import Sensor

def test_valves():
    print("\n--- sensor Test ---")
    sensor = Sensor(simulation_mode=False)
    sensor.read_moisture()

if __name__ == "__main__":
    test_valves()
