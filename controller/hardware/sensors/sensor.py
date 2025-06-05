import random
import time
import asyncio
from pymodbus.client import AsyncModbusSerialClient
from pymodbus.exceptions import ModbusException

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
            self.client = AsyncModbusSerialClient(
            port="COM3",        # Update if needed
            baudrate=4800,
            parity='N',
            stopbits=1,
            bytesize=8,
            timeout=2,
        )
            if not self.client.connect():
                raise ConnectionError(" Could not connect to Modbus sensor.")

    def read_moisture(self):
        if self.simulated_moisture:
            return self.simulated_moisture
        else:
            self.scan_registers()
            return self.read_from_hardware()

     
    



    def simulated_data(self):
        return round(random.uniform(20.0, 80.0), 2)

    def update_moisture(self, amount):
        if self.simulation_mode:
            self.simulated_moisture = min(100.0, self.simulated_moisture + amount)  # לא מעבר ל-100%
            print(f"🌱 [SIMULATION] Sensor  moisture updated: {self.simulated_moisture}%")


 


