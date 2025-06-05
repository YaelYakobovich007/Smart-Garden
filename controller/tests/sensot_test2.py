from pymodbus.client import ModbusSerialClient
import time


BAUD_RATES = [9600, 19200, 115200, 4800]

def test_connection(port, baudrate=9600, slave_id=1):
    print(f"\nTesting connection with port={port}, baudrate={baudrate}, slave_id={slave_id}")
    client = ModbusSerialClient(method='rtu', port=port, baudrate=baudrate, timeout=1)

    if not client.connect():
        print(f" Could not connect to port {port}")
        client.close()
        return False

    print(f" Connected to port {port}")

    for register in range(0, 10):
        try:
            # Try reading holding registers
            response = client.read_holding_registers(register, 1, slave=slave_id)
            if not response.isError():
                print(f" successfully read holding register {register}: {response.registers[0]}")
                client.close()
                return True
        except Exception:
            pass

        try:
            # Try reading input registers
            response = client.read_input_registers(register, 1, slave=slave_id)
            if not response.isError():
                print(f" Successfully read input register {register}: {response.registers[0]}")
                client.close()
                return True
        except Exception:
            pass

    print(f" Connected but couldn't read any registers with slave ID {slave_id}")
    client.close()
    return False

def scan_for_device():
    # Try various combinations of ports, baud rates, and slave IDs
    port = "/dev/ttyUSB0"
    for baudrate in BAUD_RATES:
        for slave_id in range(1, 16):  # Most Modbus devices use IDs 1-15
            if test_connection(port, baudrate, slave_id):
                print(f"PORT: {port}")
                print(f"BAUD RATE: {baudrate}")
                print(f"SLAVE ID: {slave_id}")

                # Now find which registers contain data
                print("\nScanning for valid registers...")
                client = ModbusSerialClient(method='rtu', port=port, baudrate=baudrate, timeout=1)
                client.connect()

                # Check both holding and input registers
                for reg_type in ["holding", "input"]:
                    print(f"\nChecking {reg_type} registers:")
                    for reg in range(0, 100):
                        try:
                            if reg_type == "holding":
                                response = client.read_holding_registers(reg, 1, slave=slave_id)
                            else:
                                response = client.read_input_registers(reg, 1, slave=slave_id)

                            if not response.isError():
                                print(f"Register {reg} = {response.registers[0]}")
                        except Exception:
                            pass

                    client.close()
                    return port, baudrate, slave_id

    print("\nNo device found. Please check your connections and try again.")
    return None, None, None

if __name__ == "__main__":
    port, baudrate, slave_id = scan_for_device()

    if port:
        print("\n Configuration for your Sensor class:")
        print(f"""
SERIAL_PORT = "{port}"
BAUD_RATE = {baudrate}
DEFAULT_MODBUS_ID = {slave_id}
MOISTURE_REGISTER = 0  # Update this with the register that showed moisture values
        """)