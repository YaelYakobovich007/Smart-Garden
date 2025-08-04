"""
Quick Sensor Identification Script

This script helps you quickly identify and test your connected sensors.
Run this to see which sensors are working and their readings.
"""

import asyncio
import time
from controller.hardware.sensors.sensor import Sensor

async def identify_sensors():
    """Identify and test connected sensors"""
    print("🔍 Sensor Identification Tool")
    print("=" * 40)
    
    # Test different sensor configurations
    sensor_configs = [
        {"id": 0, "port": "/dev/ttyUSB0", "baudrate": 4800},
        {"id": 1, "port": "/dev/ttyUSB0", "baudrate": 4800},
        {"id": 0, "port": "/dev/ttyUSB1", "baudrate": 4800},
        {"id": 1, "port": "/dev/ttyUSB1", "baudrate": 4800},
        {"id": 0, "port": "/dev/ttyACM0", "baudrate": 9600},
        {"id": 1, "port": "/dev/ttyACM0", "baudrate": 9600},
    ]
    
    working_sensors = []
    
    for config in sensor_configs:
        print(f"\n🔧 Testing Sensor ID {config['id']} on {config['port']} at {config['baudrate']} baud...")
        
        try:
            # Create sensor
            sensor = Sensor(
                simulation_mode=False,
                modbus_id=config['id'],
                port=config['port'],
                baudrate=config['baudrate']
            )
            
            # Try to read from sensor
            reading = await sensor.read()
            
            if reading is not None:
                if isinstance(reading, tuple):
                    moisture, temperature = reading
                    print(f"   ✅ SUCCESS! Moisture: {moisture:.1f}%, Temperature: {temperature:.1f}°C")
                    working_sensors.append({
                        'config': config,
                        'reading': reading
                    })
                else:
                    print(f"   ✅ SUCCESS! Moisture: {reading:.1f}%")
                    working_sensors.append({
                        'config': config,
                        'reading': (reading, None)
                    })
            else:
                print(f"   ❌ FAILED - No reading")
                
        except Exception as e:
            print(f"   ❌ ERROR: {e}")
        
        # Wait between tests
        await asyncio.sleep(1)
    
    # Summary
    print(f"\n📊 IDENTIFICATION RESULTS")
    print("=" * 40)
    
    if working_sensors:
        print(f"✅ Found {len(working_sensors)} working sensor(s):")
        for i, sensor in enumerate(working_sensors, 1):
            config = sensor['config']
            moisture, temperature = sensor['reading']
            print(f"   Sensor {i}:")
            print(f"      ID: {config['id']}")
            print(f"      Port: {config['port']}")
            print(f"      Baudrate: {config['baudrate']}")
            print(f"      Moisture: {moisture:.1f}%")
            if temperature is not None:
                print(f"      Temperature: {temperature:.1f}°C")
            print()
    else:
        print("❌ No working sensors found!")
        print("\n🔧 Troubleshooting tips:")
        print("   1. Check physical connections")
        print("   2. Verify sensor power supply")
        print("   3. Check if sensors are on different ports")
        print("   4. Try different baud rates (4800, 9600, 19200)")
        print("   5. Check if sensors have different Modbus IDs")
    
    return working_sensors

async def test_sensor_consistency(sensor_config, num_readings=5):
    """Test a specific sensor for consistency"""
    print(f"\n📊 Testing Sensor Consistency")
    print(f"Config: ID {sensor_config['id']} on {sensor_config['port']}")
    print("=" * 40)
    
    try:
        sensor = Sensor(
            simulation_mode=False,
            modbus_id=sensor_config['id'],
            port=sensor_config['port'],
            baudrate=sensor_config['baudrate']
        )
        
        readings = []
        for i in range(num_readings):
            reading = await sensor.read()
            if reading is not None:
                if isinstance(reading, tuple):
                    moisture, temperature = reading
                    readings.append((moisture, temperature))
                    print(f"   Reading {i+1}: Moisture={moisture:.1f}%, Temp={temperature:.1f}°C")
                else:
                    readings.append((reading, None))
                    print(f"   Reading {i+1}: Moisture={reading:.1f}%")
            else:
                print(f"   Reading {i+1}: FAILED")
            
            await asyncio.sleep(0.5)
        
        if readings:
            moisture_values = [r[0] for r in readings]
            temperature_values = [r[1] for r in readings if r[1] is not None]
            
            print(f"\n📈 Consistency Analysis:")
            print(f"   Moisture range: {min(moisture_values):.1f}% - {max(moisture_values):.1f}%")
            print(f"   Moisture average: {sum(moisture_values)/len(moisture_values):.1f}%")
            
            if temperature_values:
                print(f"   Temperature range: {min(temperature_values):.1f}°C - {max(temperature_values):.1f}°C")
                print(f"   Temperature average: {sum(temperature_values)/len(temperature_values):.1f}°C")
            
            return True
        else:
            print("❌ No successful readings")
            return False
            
    except Exception as e:
        print(f"❌ Error testing consistency: {e}")
        return False

async def main():
    """Main function"""
    print("🚀 Starting Sensor Identification...")
    
    # Step 1: Identify sensors
    working_sensors = await identify_sensors()
    
    # Step 2: Test consistency for each working sensor
    if working_sensors:
        print(f"\n🧪 Testing consistency for {len(working_sensors)} sensor(s)...")
        
        for i, sensor_info in enumerate(working_sensors, 1):
            print(f"\n--- Testing Sensor {i} ---")
            await test_sensor_consistency(sensor_info['config'], num_readings=3)
    
    print(f"\n🎉 Sensor identification completed!")
    
    if working_sensors:
        print(f"\n📝 Recommended next steps:")
        print(f"   1. Use the working sensor configurations in your main code")
        print(f"   2. Update the sensor creation in SmartGardenEngine")
        print(f"   3. Test with the comprehensive sensor test: python controller/tests/test_sensors.py")
    else:
        print(f"\n🔧 Troubleshooting needed:")
        print(f"   1. Check hardware connections")
        print(f"   2. Verify sensor specifications")
        print(f"   3. Try different communication settings")

if __name__ == "__main__":
    asyncio.run(main()) 