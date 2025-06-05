import asyncio
from pymodbus.client import AsyncModbusSerialClient
from pymodbus.exceptions import ModbusException

async def read_sensor():
    client = AsyncModbusSerialClient(
        port="COM3",        # Update if needed
        baudrate=4800,
        parity='N',
        stopbits=1,
        bytesize=8,
        timeout=2,
    )

    async with client as modbus_client:
        if not modbus_client.connected:
            print("Failed to connect.")
            return

        print("Connected. Reading sensor data...")

        try:
            # Read 2 registers starting from address 0x0000
            result = await modbus_client.read_input_registers(address=0x0000, count=2, slave=1)

            if result.isError():
                print(f"Modbus error: {result}")
            else:
                # Assuming register[0] = humidity, register[1] = temperature
                humidity_raw = result.registers[0]
                temperature_raw = result.registers[1]

                temperature = temperature_raw / 10.0
                humidity = humidity_raw / 10.0

                print(f"Temperature: {temperature} °C")
                print(f"Humidity: {humidity} %")

        except ModbusException as e:
            print(f"Modbus exception: {e}")

if __name__ == "__main__":
    asyncio.run(read_sensor())

