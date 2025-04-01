import random
import time

try:
    from pymodbus.client import ModbusSerialClient as ModbusClient
except ImportError:
    ModbusClient = None

SERIAL_PORT = "/dev/ttyUSB0"
BAUD_RATE = 9600
DEFAULT_MODBUS_ID = 1
MOISTURE_REGISTER = 0x0001  # You can change this if needed



class Sensor:
    def __init__(self,simulation_mode = True, initial_moisture = 30.0,modbus_id=DEFAULT_MODBUS_ID):
#        self.sensor_id = sensor_id
#        self.plant_id = plant_id
        self.simulation_mode = simulation_mode
        self.simulated_moisture = initial_moisture if simulation_mode else None
        self.modbus_id = modbus_id
        self.client = None

        if not self.simulation_mode:
            if ModbusClient is None:
                raise ImportError("Missing 'pymodbus'. Install with: pip install pymodbus")
            self.client = ModbusClient(method='rtu', port=SERIAL_PORT, baudrate=BAUD_RATE, timeout=1)
            if not self.client.connect():
                raise ConnectionError(" Could not connect to Modbus sensor.")

    def read_moisture(self):
        if self.simulated_moisture:
            return self.simulated_moisture
        else:
            return self.read_from_hardware()

    def read_from_hardware(self):
        try:
            response = self.client.read_holding_registers(MOISTURE_REGISTER, 1, unit=self.modbus_id)
            if response.isError():
                print(f"❌ Modbus error reading sensor {self.sensor_id}")
                return None
            raw_value = response.registers[0]
            # You can adjust this conversion depending on how your sensor scales the value
            moisture = raw_value / 10.0 if raw_value > 100 else raw_value
            print(f"🌱 Sensor {self.sensor_id} reports {moisture:.1f}% moisture")
            return moisture
        except Exception as e:
            print(f"Error reading sensor {self.sensor_id}: {e}")
            return None

    def simulated_data(self):
        return round(random.uniform(20.0, 80.0), 2)

    def update_moisture(self, amount):
        if self.simulation_mode:
            self.simulated_moisture = min(100.0, self.simulated_moisture + amount)  # לא מעבר ל-100%
            print(f"🌱 [SIMULATION] Sensor {self.sensor_id} moisture updated: {self.simulated_moisture}%")