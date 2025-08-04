"""
Test Dual Sensors Only - No Plants

This script tests two sensors that both use Modbus ID 1
but are connected to different ports:
- Sensor 1: /dev/ttyUSB0
- Sensor 2: /dev/ttyUSB1
"""

import asyncio
import sys
import os

# Ensure parent directory is in path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from hardware.sensors.sensor import Sensor

async def test_single_sensor(config):
    try:
        sensor = Sensor(
            simulation_mode=False,
            modbus_id=config["modbus_id"],
            port=config["port"],
            baudrate=config["baudrate"]
        )
        reading = await sensor.read()
        if reading:
            if isinstance(reading, tuple):
                moisture, temperature = reading
                print(f"✅ {config['name']}: Moisture={moisture:.1f}%, Temp={temperature:.1f}°C")
            else:
                print(f"✅ {config['name']}: Moisture={reading:.1f}%")
            return reading
        else:
            print(f"❌ {config['name']}: No data")
            return None
    except Exception as e:
        print(f"❌ {config['name']}: ERROR - {e}")
        return None


async def main():
    sensor_configs = [
        {"name": "Sensor 1", "modbus_id": 1, "port": "/dev/ttyUSB0", "baudrate": 4800},
        {"name": "Sensor 2", "modbus_id": 1, "port": "/dev/ttyUSB1", "baudrate": 4800},
    ]

    print("\n🚀 Starting Dual Sensor Test")
    print("=" * 50)

    for config in sensor_configs:
        print(f"\n🔧 Reading from {config['name']} on {config['port']}:")
        await test_single_sensor(config)
        await asyncio.sleep(1)  # small delay between readings

    print("\n🎉 Done reading both sensors!")

if __name__ == "__main__":
    asyncio.run(main())
