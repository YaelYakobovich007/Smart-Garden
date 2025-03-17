import random
import time

try:
   import serial
except ImportError:
   serial = None

SIMULATION_MODE = True

SERIAL_PORT = "/dev/ttyUSB0"
BAUD_RATE = 9600


class SensorReader:
   def __init__(self):
       if not SIMULATION_MODE:
           if serial is None:
               raise ImportError("Missing 'pyserial' module. Install it using: pip install pyserial")
           self.ser = serial.Serial(SERIAL_PORT, BAUD_RATE, timeout=1)
       else:
           self.ser = None


   def read_sensor_data(self):
       if SIMULATION_MODE:
           return self.simulated_data()
       else:
           return self.read_from_hardware()


   def read_from_hardware(self):
       try:
           self.ser.write(b"READ\n")
           raw_data = self.ser.readline().decode("utf-8").strip()
           return float(raw_data)
       except Exception as e:
           print(e)
           return None


   def simulated_data(self):
       return round(random.uniform(20.0, 80.0), 2)


if __name__ == "__main__":
   sensor = SensorReader()
   while True:
       data = sensor.read_sensor_data()
       print(str(data) + "%")
       time.sleep(2)

