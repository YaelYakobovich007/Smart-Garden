"""
Find Second Sensor Port

This script helps you identify where your second sensor is connected,
based on your known first sensor configuration.
"""

import asyncio
from controller.hardware.sensors.sensor import Sensor

async def find_second_sensor():
    """Find the port of the second sensor"""
    print("🔍 Finding Second Sensor Port")
    print("=" * 40)
    
    # Your known first sensor configuration
    first_sensor_config = {
        "modbus_id": 1,
        "port": "/dev/ttyUSB0", 
        "baudrate": 4800
    }
    
    print(f"✅ Known first sensor:")
    print(f"   Modbus ID: {first_sensor_config['modbus_id']}")
    print(f"   Port: {first_sensor_config['port']}")
    print(f"   Baudrate: {first_sensor_config['baudrate']}")
    
    # Test different configurations for second sensor
    print(f"\n🔧 Testing second sensor configurations...")
    
    # Common second sensor configurations
    test_configs = [
        # Same port, different Modbus ID
        {"modbus_id": 2, "port": "/dev/ttyUSB0", "baudrate": 4800},
        {"modbus_id": 0, "port": "/dev/ttyUSB0", "baudrate": 4800},
        
        # Different ports, same Modbus ID as first
        {"modbus_id": 1, "port": "/dev/ttyUSB1", "baudrate": 4800},
        {"modbus_id": 1, "port": "/dev/ttyACM0", "baudrate": 9600},
        {"modbus_id": 1, "port": "/dev/ttyACM1", "baudrate": 9600},
        
        # Different ports, different Modbus IDs
        {"modbus_id": 2, "port": "/dev/ttyUSB1", "baudrate": 4800},
        {"modbus_id": 0, "port": "/dev/ttyUSB1", "baudrate": 4800},
        {"modbus_id": 2, "port": "/dev/ttyACM0", "baudrate": 9600},
        {"modbus_id": 0, "port": "/dev/ttyACM0", "baudrate": 9600},
    ]
    
    working_configs = []
    
    for i, config in enumerate(test_configs, 1):
        print(f"\n{i}. Testing: ID {config['modbus_id']} on {config['port']} at {config['baudrate']} baud...")
        
        try:
            # Create sensor
            sensor = Sensor(
                simulation_mode=False,
                modbus_id=config['modbus_id'],
                port=config['port'],
                baudrate=config['baudrate']
            )
            
            # Try to read from sensor
            reading = await sensor.read()
            
            if reading is not None:
                if isinstance(reading, tuple):
                    moisture, temperature = reading
                    print(f"   ✅ SUCCESS! Moisture: {moisture:.1f}%, Temperature: {temperature:.1f}°C")
                    working_configs.append({
                        'config': config,
                        'reading': reading
                    })
                else:
                    print(f"   ✅ SUCCESS! Moisture: {reading:.1f}%")
                    working_configs.append({
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
    print(f"\n📊 SECOND SENSOR RESULTS")
    print("=" * 40)
    
    if working_configs:
        print(f"✅ Found {len(working_configs)} potential second sensor(s):")
        for i, sensor in enumerate(working_configs, 1):
            config = sensor['config']
            moisture, temperature = sensor['reading']
            print(f"   Sensor {i}:")
            print(f"      Modbus ID: {config['modbus_id']}")
            print(f"      Port: {config['port']}")
            print(f"      Baudrate: {config['baudrate']}")
            print(f"      Moisture: {moisture:.1f}%")
            if temperature is not None:
                print(f"      Temperature: {temperature:.1f}°C")
            print()
        
        # Recommend the best configuration
        if len(working_configs) > 1:
            print("💡 Multiple sensors found. Recommended configuration:")
            # Prefer different port over different Modbus ID
            for config in working_configs:
                if config['config']['port'] != first_sensor_config['port']:
                    print(f"   Use: Modbus ID {config['config']['modbus_id']} on {config['config']['port']}")
                    break
            else:
                # If same port, prefer different Modbus ID
                for config in working_configs:
                    if config['config']['modbus_id'] != first_sensor_config['modbus_id']:
                        print(f"   Use: Modbus ID {config['config']['modbus_id']} on {config['config']['port']}")
                        break
    else:
        print("❌ No second sensor found!")
        print("\n🔧 Troubleshooting tips:")
        print("   1. Check if second sensor is properly connected")
        print("   2. Verify power supply to second sensor")
        print("   3. Check if sensors have different Modbus IDs")
        print("   4. Try manually checking available ports: ls /dev/tty*")
    
    return working_configs

async def test_both_sensors():
    """Test both sensors working together"""
    print(f"\n🧪 Testing Both Sensors Together")
    print("=" * 40)
    
    # Your known configurations
    sensor_1_config = {"modbus_id": 1, "port": "/dev/ttyUSB0", "baudrate": 4800}
    
    # Find second sensor
    second_sensors = await find_second_sensor()
    
    if second_sensors:
        # Use the first working second sensor configuration
        sensor_2_config = second_sensors[0]['config']
        
        print(f"\n🔧 Testing both sensors simultaneously...")
        
        try:
            # Create both sensors
            sensor_1 = Sensor(
                simulation_mode=False,
                modbus_id=sensor_1_config['modbus_id'],
                port=sensor_1_config['port'],
                baudrate=sensor_1_config['baudrate']
            )
            
            sensor_2 = Sensor(
                simulation_mode=False,
                modbus_id=sensor_2_config['modbus_id'],
                port=sensor_2_config['port'],
                baudrate=sensor_2_config['baudrate']
            )
            
            # Read from both sensors
            print(f"📊 Reading from both sensors...")
            
            reading_1 = await sensor_1.read()
            reading_2 = await sensor_2.read()
            
            if reading_1 is not None:
                if isinstance(reading_1, tuple):
                    moisture_1, temp_1 = reading_1
                    print(f"   Sensor 1 (ID {sensor_1_config['modbus_id']}): Moisture={moisture_1:.1f}%, Temp={temp_1:.1f}°C")
                else:
                    print(f"   Sensor 1 (ID {sensor_1_config['modbus_id']}): Moisture={reading_1:.1f}%")
            else:
                print(f"   ❌ Sensor 1: FAILED")
            
            if reading_2 is not None:
                if isinstance(reading_2, tuple):
                    moisture_2, temp_2 = reading_2
                    print(f"   Sensor 2 (ID {sensor_2_config['modbus_id']}): Moisture={moisture_2:.1f}%, Temp={temp_2:.1f}°C")
                else:
                    print(f"   Sensor 2 (ID {sensor_2_config['modbus_id']}): Moisture={reading_2:.1f}%")
            else:
                print(f"   ❌ Sensor 2: FAILED")
            
            if reading_1 is not None and reading_2 is not None:
                print(f"\n✅ Both sensors working! Configuration:")
                print(f"   Sensor 1: Modbus ID {sensor_1_config['modbus_id']} on {sensor_1_config['port']}")
                print(f"   Sensor 2: Modbus ID {sensor_2_config['modbus_id']} on {sensor_2_config['port']}")
            else:
                print(f"\n❌ One or both sensors failed")
                
        except Exception as e:
            print(f"❌ Error testing both sensors: {e}")
    else:
        print("❌ Cannot test both sensors - second sensor not found")

async def main():
    """Main function"""
    print("🚀 Finding Second Sensor Configuration")
    print("=" * 50)
    
    # Find second sensor
    await find_second_sensor()
    
    # Test both sensors together
    await test_both_sensors()
    
    print(f"\n🎉 Second sensor identification completed!")
    print(f"\n📝 Next steps:")
    print(f"   1. Note the working second sensor configuration")
    print(f"   2. Update your SmartGardenEngine to use both configurations")
    print(f"   3. Test with the comprehensive sensor test")

if __name__ == "__main__":
    asyncio.run(main()) 