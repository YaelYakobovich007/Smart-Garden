#!/usr/bin/env python3
"""
Simple Test - Exact copy of your working code for Linux
"""

import asyncio
from pymodbus.client import AsyncModbusSerialClient
from pymodbus.exceptions import ModbusException

async def read_sensor():
    """Exact copy of your working code, just changed COM3 to /dev/ttyUSB0"""
    print("🧪 Testing sensor on /dev/ttyUSB0...")
    
    client = AsyncModbusSerialClient(
        port="/dev/ttyUSB0",  # Changed from COM3 to /dev/ttyUSB0
        baudrate=4800,
        parity='N',
        stopbits=1,
        bytesize=8,
        timeout=2,
    )

    async with client as modbus_client:
        if not modbus_client.connected:
            print("❌ Failed to connect.")
            return

        print("✅ Connected. Reading sensor data...")

        try:
            # Read 2 registers starting from address 0x0001 (register 1, like mbpoll -r 1)
            result = await modbus_client.read_input_registers(address=0x0001, count=2, slave=1)

            if result.isError():
                print(f"⚠️ Modbus error: {result}")
            else:
                # Assuming register[0] = humidity, register[1] = temperature
                humidity_raw = result.registers[0]
                temperature_raw = result.registers[1]

                temperature = temperature_raw / 10.0
                humidity = humidity_raw / 10.0

                print(f"🌡 Temperature: {temperature} °C")
                print(f"💧 Humidity: {humidity} %")
                print("✅ SUCCESS!")

        except ModbusException as e:
            print(f"⚠️ Modbus exception: {e}")

if __name__ == "__main__":
    asyncio.run(read_sensor())