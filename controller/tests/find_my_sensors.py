#!/usr/bin/env python3
"""
Find My Sensors - Simple Detection Script

This will help you find exactly where your sensors are connected
"""

import asyncio
import os
from pymodbus.client import AsyncModbusSerialClient
from pymodbus.exceptions import ModbusException

async def test_sensor_on_port(port, modbus_id):
    """Test a specific port and Modbus ID combination"""
    print(f"🔍 Testing {port} with Modbus ID {modbus_id}...")
    
    if not os.path.exists(port):
        print(f"   ❌ Port {port} does not exist")
        return False
    
    client = AsyncModbusSerialClient(
        port=port,
        baudrate=4800,
        parity='N',
        stopbits=1,
        bytesize=8,
        timeout=2,
    )

    try:
        async with client as modbus_client:
            if not modbus_client.connected:
                print(f"   ❌ Cannot connect to {port}")
                return False

            # Read using your working pattern
            result = await modbus_client.read_input_registers(address=0x0000, count=2, slave=modbus_id)

            if result.isError():
                print(f"   ❌ Modbus error: {result}")
                return False
            
            # Calculate values like your working code
            humidity_raw = result.registers[0]
            temperature_raw = result.registers[1]
            temperature = temperature_raw / 10.0
            humidity = humidity_raw / 10.0

            print(f"   ✅ SUCCESS! 💧{humidity:.1f}% 🌡️{temperature:.1f}°C")
            return True

    except Exception as e:
        print(f"   ❌ Error: {e}")
        return False

async def find_all_sensors():
    """Find all working sensor combinations"""
    print("🔍 Searching for all sensors...")
    print("=" * 50)
    
    # Check what ports exist
    possible_ports = ["/dev/ttyUSB0", "/dev/ttyUSB1", "/dev/ttyUSB2", "/dev/ttyACM0", "/dev/ttyACM1"]
    existing_ports = [port for port in possible_ports if os.path.exists(port)]
    
    print(f"📍 Existing ports: {existing_ports}")
    
    if not existing_ports:
        print("❌ No USB serial ports found!")
        return []
    
    # Test different Modbus IDs on each port
    working_sensors = []
    modbus_ids = [0, 1, 2, 3]
    
    for port in existing_ports:
        print(f"\n📡 Testing port: {port}")
        for modbus_id in modbus_ids:
            success = await test_sensor_on_port(port, modbus_id)
            if success:
                working_sensors.append({
                    "port": port,
                    "modbus_id": modbus_id
                })
    
    return working_sensors

async def test_working_sensors(sensors):
    """Test all found sensors simultaneously"""
    if len(sensors) < 2:
        print(f"\n⚠️ Found only {len(sensors)} sensor(s), need at least 2")
        return
    
    print(f"\n🔄 Testing {len(sensors)} sensors simultaneously...")
    
    tasks = []
    for i, sensor in enumerate(sensors):
        port = sensor["port"]
        modbus_id = sensor["modbus_id"]
        task = asyncio.create_task(test_sensor_on_port(port, modbus_id))
        tasks.append((f"Sensor {i+1} ({port}, ID:{modbus_id})", task))
    
    results = await asyncio.gather(*[task for _, task in tasks])
    
    print(f"\n📊 Simultaneous test results:")
    for (name, _), success in zip(tasks, results):
        print(f"   {'✅' if success else '❌'} {name}")

async def main():
    """Main function"""
    print("🚀 Finding Your Sensors")
    print("=" * 50)
    
    # Step 1: Find all working sensors
    working_sensors = await find_all_sensors()
    
    # Step 2: Show results
    print(f"\n📋 RESULTS:")
    print("=" * 30)
    
    if working_sensors:
        print(f"✅ Found {len(working_sensors)} working sensor(s):")
        for i, sensor in enumerate(working_sensors, 1):
            print(f"   {i}. Port: {sensor['port']}, Modbus ID: {sensor['modbus_id']}")
        
        # Step 3: Test them together
        if len(working_sensors) >= 2:
            await test_working_sensors(working_sensors)
        
        # Step 4: Show configuration
        print(f"\n💡 Configuration for your code:")
        for i, sensor in enumerate(working_sensors, 1):
            print(f"   Sensor {i}: port='{sensor['port']}', modbus_id={sensor['modbus_id']}, baudrate=4800")
    
    else:
        print("❌ No working sensors found!")
        print("\n🔧 Troubleshooting:")
        print("   • Check physical connections")
        print("   • Run: sudo chmod 666 /dev/ttyUSB*")
        print("   • Verify sensor power")
        print("   • Check with: ls /dev/ttyUSB*")

if __name__ == "__main__":
    try:
        asyncio.run(main())
    except KeyboardInterrupt:
        print(f"\n⏹️ Search interrupted")
    except Exception as e:
        print(f"\n❌ Error: {e}")