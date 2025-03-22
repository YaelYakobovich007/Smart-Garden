import random
import time

try:
    import serial
except ImportError:
    serial = None


SERIAL_PORT = "/dev/ttyUSB0"
BAUD_RATE = 9600


class Sensor:
    def __init__(self, sensor_id, plant_id,simulation_mode = True, initial_moisture = 30.0):
        self.sensor_id = sensor_id
        self.plant_id = plant_id
        self.simulation_mode = simulation_mode
        self.simulated_moisture = initial_moisture if simulation_mode else None

        if not self.simulated_moisture:
            if serial is None:
                raise ImportError("Missing 'pyserial' module. Install it using: pip install pyserial")
            self.ser = serial.Serial(SERIAL_PORT, BAUD_RATE, timeout=1)
        else:
            self.ser = None

    def read_moisture(self):
        if self.simulated_moisture:
            return self.simulated_moisture
        else:
            return self.read_from_hardware()

    def read_from_hardware(self):
        try:
            self.ser.write(b"READ\n")
            raw_data = self.ser.readline().decode("utf-8").strip()
            return float(raw_data)
        except Exception as e:
            print(f"Error reading sensor {self.sensor_id}: {e}")
            return None

    def simulated_data(self):
        return round(random.uniform(20.0, 80.0), 2)

    def update_moisture(self, amount):
        if self.simulation_mode:
            self.simulated_moisture = min(100.0, self.simulated_moisture + amount)  # לא מעבר ל-100%
            print(f"🌱 [SIMULATION] Sensor {self.sensor_id} moisture updated: {self.simulated_moisture}%")