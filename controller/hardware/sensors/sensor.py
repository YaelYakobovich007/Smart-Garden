import asyncio
import random
from pymodbus.client import AsyncModbusSerialClient
from pymodbus.exceptions import ModbusException

# Constants for Modbus communication
DEFAULT_MODBUS_ID = 1
DEFAULT_PORT = "/dev/ttyUSB0"
DEFAULT_BAUDRATE = 9600
REGISTER_START_ADDRESS = 0x0000  # Start register address for humidity

class Sensor:
    def __init__(
        self,
        simulation_mode=True,
        initial_moisture=30.0,
        modbus_id=DEFAULT_MODBUS_ID,
        port=DEFAULT_PORT,
        baudrate=DEFAULT_BAUDRATE
    ):
        self.simulation_mode = simulation_mode
        self.simulated_value  = initial_moisture
        self.modbus_id = modbus_id
        self.port = port
        self.baudrate = baudrate

    async def read(self):
        if self.simulation_mode:
            return self.simulated_value
        
        return await self._read_modbus_data()
        
   
    async def _read_modbus_data(self):
        client = AsyncModbusSerialClient(
            port=self.port,
            baudrate=self.baudrate,
            parity='N',
            stopbits=1,
            bytesize=8,
            timeout=2,
        )

        # Connect to the Modbus client
        async with client as modbus_client:
            if not modbus_client.connected:
                print("Could not connect to Modbus sensor.")
                return None
            
            try:
                # Read two registers starting from address 0x0000
                result = await modbus_client.read_input_registers(
                    address=REGISTER_START_ADDRESS,
                    count=2,
                    slave=self.modbus_id
                )

                if result.isError():
                    print(f"Modbus error: {result}")
                    return None

                humidity = result.registers[0] / 10.0
                temperature = result.registers[1] / 10.0
                print(f"🌱 Sensor {self.modbus_id} - Humidity: {humidity}%, Temperature: {temperature}°C")
                return humidity, temperature
            
            except ModbusException as e:
                print(f"Modbus exception: {e}")
                return None
            

    def update_simulated_value(self, amount):
        if self.simulation_mode:
            self.simulated_value = min(100.0, self.simulated_value + amount)  
            print(f"🌱 [SIMULATION] Sensor moisture updated: {self.simulated_value}%")

    def generate_random_simulated_value(self):
        return round(random.uniform(20.0, 80.0), 2)
 


