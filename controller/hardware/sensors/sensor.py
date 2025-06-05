import random
from typing import Optional

SERIAL_PORT = "/dev/ttyUSB0"
BAUD_RATE = 9600
DEFAULT_MODBUS_ID = 1
MOISTURE_REGISTER = 0x0001 

class Sensor:
    def __init__(self,simulation_mode = True, initial_moisture = 30.0,modbus_id = DEFAULT_MODBUS_ID):
        self.simulation_mode : bool = simulation_mode
        self.simulated_moisture : Optional[float] = initial_moisture if simulation_mode else None
        self.modbus_id :int  = modbus_id
        self.client : Optional[ModbusClient] = None

        if not self.simulation_mode:
                try:
                    from pymodbus.client import ModbusSerialClient as ModbusClient
                except ImportError:
                    raise ImportError("Missing 'pymodbus'. Install with: pip install pymodbus")

                self.client = ModbusClient(method='rtu', port=SERIAL_PORT, baudrate=BAUD_RATE, timeout=1)
                if not self.client.connect():
                    raise ConnectionError("Could not connect to Modbus sensor.")
                
    def read_moisture(self):
        if self.simulated_moisture:
            return self.simulated_moisture
        else:
            return self.read_from_hardware()

    def read_from_hardware(self):
        try:
            response = self.client.read_input_registers(MOISTURE_REGISTER, 2, slave=self.modbus_id)
            if response.isError():
                print(response)
                print(f"Modbus error reading sensor")
                return None
            raw_value = response.registers[0]
            moisture = raw_value / 10.0 if raw_value > 100 else raw_value
            print(f"Sensor  reports {moisture:.1f}% moisture")
            return moisture
        except Exception as e:
            print(f"Error reading sensor")
            return None



    def simulated_data(self):
        return round(random.uniform(20.0, 80.0), 2)

    def update_moisture(self, amount):
        if self.simulation_mode:
            self.simulated_moisture = min(100.0, self.simulated_moisture + amount)  # לא מעבר ל-100%
            print(f"[SIMULATION] Sensor  moisture updated: {self.simulated_moisture}%")


    def scan_registers(self,port="/dev/ttyUSB0", baudrate=9600, unit_id=1, start=0x0000, end=0x0010):
        client = ModbusClient(method='rtu', port=port, baudrate=baudrate, timeout=1)
        client.connect()

        print(f"Scanning registers 0x{start:04X} to 0x{end - 1:04X} for Modbus device ID {unit_id}...")

        for address in range(start, end):
            try:
                response = client.read_input_registers(address, 1, slave=unit_id)
                if not response.isError():
                    value = response.registers[0]
                    print(f"Register 0x{address:04X} = {value}")
                else:
                    print(f"Register 0x{address:04X} gave no response or error")
            except Exception as e:
                print(f"Exception at register 0x{address:04X}: {e}")

        client.close()


def find_any_register(port="/dev/ttyUSB0", baudrate=9600, id_start=1, id_end=20, reg_start=0x0000, reg_end=0x0010):
    client = ModbusClient(method='rtu', port=port, baudrate=baudrate, timeout=1)
    client.connect()

    for unit_id in range(id_start, id_end):
        print(f"\n Checking ID {unit_id}")
        for reg in range(reg_start, reg_end):
            try:
                response = client.read_input_registers(address=reg, count=1, unit=unit_id)
                if not response.isError():
                    print(f"ID {unit_id} Register 0x{reg:04X} = {response.registers[0]}")
                    client.close()
                    return unit_id, reg
            except Exception:
                continue

    client.close()
    return None, None
