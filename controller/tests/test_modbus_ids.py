"""
Test Modbus IDs for Known Sensor Ports

This script tests different Modbus IDs on your known ports:
- /dev/ttyUSB0 (baudrate: 4800)
- /dev/ttyUSB1 (baudrate: 4800)

You already know these work, so we just need to find the Modbus IDs.
"""

import asyncio
import sys
import os

# Add the current directory to Python path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

# Now import the sensor directly
from hardware.sensors.sensor import Sensor

async def test_modbus_ids():
    """Test different Modbus IDs on known ports"""
    print("🔍 Testing Modbus IDs on Known Ports")
    print("=" * 50)
    
    # Known configuration
    print("✅ Known configuration:")
    print("   Ports: /dev/ttyUSB0, /dev/ttyUSB1")
    print("   Baudrate: 4800")
    print("   First sensor: Modbus ID 1 on /dev/ttyUSB0")
    print()
    
    # Test configurations - only different Modbus IDs
    test_configs = [
        # Test Modbus ID 0 on both ports
        {"name": "Modbus ID 0 on /dev/ttyUSB0", "modbus_id": 0, "port": "/dev/ttyUSB0"},
        {"name": "Modbus ID 0 on /dev/ttyUSB1", "modbus_id": 0, "port": "/dev/ttyUSB1"},
        
        # Test Modbus ID 1 on both ports (you know this works on USB0)
        {"name": "Modbus ID 1 on /dev/ttyUSB0", "modbus_id": 1, "port": "/dev/ttyUSB0"},
        {"name": "Modbus ID 1 on /dev/ttyUSB1", "modbus_id": 1, "port": "/dev/ttyUSB1"},
        
        # Test Modbus ID 2 on both ports
        {"name": "Modbus ID 2 on /dev/ttyUSB0", "modbus_id": 2, "port": "/dev/ttyUSB0"},
        {"name": "Modbus ID 2 on /dev/ttyUSB1", "modbus_id": 2, "port": "/dev/ttyUSB1"},
        
        # Test Modbus ID 3 on both ports
        {"name": "Modbus ID 3 on /dev/ttyUSB0", "modbus_id": 3, "port": "/dev/ttyUSB0"},
        {"name": "Modbus ID 3 on /dev/ttyUSB1", "modbus_id": 3, "port": "/dev/ttyUSB1"},
    ]
    
    working_sensors = []
    
    for config in test_configs:
        print(f"🔧 Testing {config['name']}...")
        
        try:
            # Create sensor
            sensor = Sensor(
                simulation_mode=False,
                modbus_id=config['modbus_id'],
                port=config['port'],
                baudrate=4800
            )
            
            # Try to read from sensor
            reading = await sensor.read()
            
            if reading is not None:
                if isinstance(reading, tuple):
                    moisture, temperature = reading
                    print(f"   ✅ SUCCESS! Moisture: {moisture:.1f}%, Temperature: {temperature:.1f}°C")
                    working_sensors.append({
                        'name': config['name'],
                        'config': config,
                        'reading': reading
                    })
                else:
                    print(f"   ✅ SUCCESS! Moisture: {reading:.1f}%")
                    working_sensors.append({
                        'name': config['name'],
                        'config': config,
                        'reading': (reading, None)
                    })
            else:
                print(f"   ❌ FAILED - No reading")
                
        except Exception as e:
            print(f"   ❌ ERROR: {e}")
        
        # Wait between tests
        await asyncio.sleep(0.5)
    
    # Summary
    print(f"\n📊 MODBUS ID TEST RESULTS")
    print("=" * 50)
    
    if working_sensors:
        print(f"✅ Found {len(working_sensors)} working sensor(s):")
        for i, sensor in enumerate(working_sensors, 1):
            config = sensor['config']
            moisture, temperature = sensor['reading']
            print(f"   {sensor['name']}:")
            print(f"      Modbus ID: {config['modbus_id']}")
            print(f"      Port: {config['port']}")
            print(f"      Moisture: {moisture:.1f}%")
            if temperature is not None:
                print(f"      Temperature: {temperature:.1f}°C")
            print()
        
        # Find the best configuration
        print("💡 Recommended sensor configuration:")
        
        # Group by port
        usb0_sensors = [s for s in working_sensors if s['config']['port'] == '/dev/ttyUSB0']
        usb1_sensors = [s for s in working_sensors if s['config']['port'] == '/dev/ttyUSB1']
        
        if usb0_sensors and usb1_sensors:
            print(f"   Sensor 1: Modbus ID {usb0_sensors[0]['config']['modbus_id']} on /dev/ttyUSB0")
            print(f"   Sensor 2: Modbus ID {usb1_sensors[0]['config']['modbus_id']} on /dev/ttyUSB1")
            print(f"   ✅ Perfect! Each sensor on its own port")
        elif len(working_sensors) >= 2:
            print(f"   Sensor 1: {working_sensors[0]['name']}")
            print(f"   Sensor 2: {working_sensors[1]['name']}")
            if working_sensors[0]['config']['port'] == working_sensors[1]['config']['port']:
                print(f"   ⚠️  Both sensors on same port - may cause conflicts")
        else:
            print(f"   Use: {working_sensors[0]['name']}")
    else:
        print("❌ No working sensors found!")
        print("\n🔧 Troubleshooting tips:")
        print("   1. Check if sensors are powered on")
        print("   2. Verify USB connections")
        print("   3. Check if sensors have different Modbus IDs")
        print("   4. Try: ls /dev/ttyUSB*")
    
    return working_sensors

async def test_both_sensors_together():
    """Test both sensors working simultaneously"""
    print(f"\n🧪 Testing Both Sensors Together")
    print("=" * 50)
    
    # Get working sensors
    working_sensors = await test_modbus_ids()
    
    if len(working_sensors) >= 2:
        # Use the first two working sensors
        sensor_1_config = working_sensors[0]['config']
        sensor_2_config = working_sensors[1]['config']
        
        print(f"🔧 Testing both sensors simultaneously...")
        print(f"   Sensor 1: Modbus ID {sensor_1_config['modbus_id']} on {sensor_1_config['port']}")
        print(f"   Sensor 2: Modbus ID {sensor_2_config['modbus_id']} on {sensor_2_config['port']}")
        
        try:
            # Create both sensors
            sensor_1 = Sensor(
                simulation_mode=False,
                modbus_id=sensor_1_config['modbus_id'],
                port=sensor_1_config['port'],
                baudrate=4800
            )
            
            sensor_2 = Sensor(
                simulation_mode=False,
                modbus_id=sensor_2_config['modbus_id'],
                port=sensor_2_config['port'],
                baudrate=4800
            )
            
            # Read from both sensors
            print(f"\n📊 Reading from both sensors...")
            
            reading_1 = await sensor_1.read()
            reading_2 = await sensor_2.read()
            
            if reading_1 is not None:
                if isinstance(reading_1, tuple):
                    moisture_1, temp_1 = reading_1
                    print(f"   Sensor 1: Moisture={moisture_1:.1f}%, Temp={temp_1:.1f}°C")
                else:
                    print(f"   Sensor 1: Moisture={reading_1:.1f}%")
            else:
                print(f"   ❌ Sensor 1: FAILED")
            
            if reading_2 is not None:
                if isinstance(reading_2, tuple):
                    moisture_2, temp_2 = reading_2
                    print(f"   Sensor 2: Moisture={moisture_2:.1f}%, Temp={temp_2:.1f}°C")
                else:
                    print(f"   Sensor 2: Moisture={reading_2:.1f}%")
            else:
                print(f"   ❌ Sensor 2: FAILED")
            
            if reading_1 is not None and reading_2 is not None:
                print(f"\n✅ Both sensors working! Final configuration:")
                print(f"   Sensor 1: Modbus ID {sensor_1_config['modbus_id']} on {sensor_1_config['port']}")
                print(f"   Sensor 2: Modbus ID {sensor_2_config['modbus_id']} on {sensor_2_config['port']}")
                print(f"   Baudrate: 4800")
            else:
                print(f"\n❌ One or both sensors failed")
                
        except Exception as e:
            print(f"❌ Error testing both sensors: {e}")
    else:
        print("❌ Need at least 2 working sensors to test together")

async def main():
    """Main function"""
    print("🚀 Modbus ID Test for Known Ports")
    print("=" * 60)
    
    # Test Modbus IDs
    await test_modbus_ids()
    
    # Test both sensors together
    await test_both_sensors_together()
    
    print(f"\n🎉 Modbus ID testing completed!")
    print(f"\n📝 Next steps:")
    print(f"   1. Note the working Modbus IDs above")
    print(f"   2. Use these configurations in your Smart Garden system")
    print(f"   3. Update your sensor creation code with the working IDs")

if __name__ == "__main__":
    asyncio.run(main()) 