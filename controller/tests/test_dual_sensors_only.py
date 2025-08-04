"""
Test Dual Sensors Only - No Plants

This script only tests your two sensors that both use Modbus ID 1
but are on different ports:
- Sensor 1: Modbus ID 1 on /dev/ttyUSB0
- Sensor 2: Modbus ID 1 on /dev/ttyUSB1
"""

import asyncio
import sys
import os

# Add the current directory to Python path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

# Import the sensor
from hardware.sensors.sensor import Sensor

async def test_dual_sensors():
    """Test both sensors individually and together"""
    print("🔍 Testing Dual Sensors Only")
    print("=" * 50)
    
    # Sensor configurations
    sensor_1_config = {
        "name": "Sensor 1",
        "modbus_id": 1,
        "port": "/dev/ttyUSB0",
        "baudrate": 4800
    }
    
    sensor_2_config = {
        "name": "Sensor 2", 
        "modbus_id": 1,
        "port": "/dev/ttyUSB1",
        "baudrate": 4800
    }
    
    print("📋 Sensor Configuration:")
    print(f"   {sensor_1_config['name']}: Modbus ID {sensor_1_config['modbus_id']} on {sensor_1_config['port']}")
    print(f"   {sensor_2_config['name']}: Modbus ID {sensor_2_config['modbus_id']} on {sensor_2_config['port']}")
    print(f"   Baudrate: {sensor_1_config['baudrate']}")
    print()
    
    # Test individual sensors
    print("🧪 Testing Individual Sensors")
    print("-" * 30)
    
    sensors = [sensor_1_config, sensor_2_config]
    working_sensors = []
    
    for sensor_config in sensors:
        print(f"\n🔧 Testing {sensor_config['name']}...")
        
        try:
            # Create sensor
            sensor = Sensor(
                simulation_mode=False,
                modbus_id=sensor_config['modbus_id'],
                port=sensor_config['port'],
                baudrate=sensor_config['baudrate']
            )
            
            # Try to read from sensor
            reading = await sensor.read()
            
            if reading is not None:
                if isinstance(reading, tuple):
                    moisture, temperature = reading
                    print(f"   ✅ SUCCESS! Moisture: {moisture:.1f}%, Temperature: {temperature:.1f}°C")
                    working_sensors.append({
                        'config': sensor_config,
                        'reading': reading
                    })
                else:
                    print(f"   ✅ SUCCESS! Moisture: {reading:.1f}%")
                    working_sensors.append({
                        'config': sensor_config,
                        'reading': (reading, None)
                    })
            else:
                print(f"   ❌ FAILED - No reading")
                
        except Exception as e:
            print(f"   ❌ ERROR: {e}")
        
        # Wait between tests
        await asyncio.sleep(0.5)
    
    # Test both sensors together
    print(f"\n🧪 Testing Both Sensors Together")
    print("-" * 30)
    
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
        print(f"📊 Reading from both sensors simultaneously...")
        
        reading_1 = await sensor_1.read()
        reading_2 = await sensor_2.read()
        
        if reading_1 is not None:
            if isinstance(reading_1, tuple):
                moisture_1, temp_1 = reading_1
                print(f"   {sensor_1_config['name']}: Moisture={moisture_1:.1f}%, Temp={temp_1:.1f}°C")
            else:
                print(f"   {sensor_1_config['name']}: Moisture={reading_1:.1f}%")
        else:
            print(f"   ❌ {sensor_1_config['name']}: FAILED")
        
        if reading_2 is not None:
            if isinstance(reading_2, tuple):
                moisture_2, temp_2 = reading_2
                print(f"   {sensor_2_config['name']}: Moisture={moisture_2:.1f}%, Temp={temp_2:.1f}°C")
            else:
                print(f"   {sensor_2_config['name']}: Moisture={reading_2:.1f}%")
        else:
            print(f"   ❌ {sensor_2_config['name']}: FAILED")
        
        if reading_1 is not None and reading_2 is not None:
            print(f"\n✅ Both sensors working! Configuration:")
            print(f"   {sensor_1_config['name']}: Modbus ID {sensor_1_config['modbus_id']} on {sensor_1_config['port']}")
            print(f"   {sensor_2_config['name']}: Modbus ID {sensor_2_config['modbus_id']} on {sensor_2_config['port']}")
            print(f"   Baudrate: {sensor_1_config['baudrate']}")
            return True
        else:
            print(f"\n❌ One or both sensors failed")
            return False
            
    except Exception as e:
        print(f"❌ Error testing both sensors: {e}")
        return False

async def test_sensor_consistency():
    """Test sensor readings over multiple attempts"""
    print(f"\n📊 Testing Sensor Consistency")
    print("-" * 30)
    
    sensor_configs = [
        {"name": "Sensor 1", "modbus_id": 1, "port": "/dev/ttyUSB0", "baudrate": 4800},
        {"name": "Sensor 2", "modbus_id": 1, "port": "/dev/ttyUSB1", "baudrate": 4800}
    ]
    
    for sensor_config in sensor_configs:
        print(f"\n🔧 Testing {sensor_config['name']} consistency (5 readings)...")
        
        readings = []
        for i in range(5):
            try:
                sensor = Sensor(
                    simulation_mode=False,
                    modbus_id=sensor_config['modbus_id'],
                    port=sensor_config['port'],
                    baudrate=sensor_config['baudrate']
                )
                
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
                
            except Exception as e:
                print(f"   Reading {i+1}: ERROR - {e}")
            
            await asyncio.sleep(0.5)
        
        if readings:
            moisture_values = [r[0] for r in readings]
            temperature_values = [r[1] for r in readings if r[1] is not None]
            
            print(f"\n📈 {sensor_config['name']} Consistency Analysis:")
            print(f"   Moisture range: {min(moisture_values):.1f}% - {max(moisture_values):.1f}%")
            print(f"   Moisture average: {sum(moisture_values)/len(moisture_values):.1f}%")
            
            if temperature_values:
                print(f"   Temperature range: {min(temperature_values):.1f}°C - {max(temperature_values):.1f}°C")
                print(f"   Temperature average: {sum(temperature_values)/len(temperature_values):.1f}°C")
        else:
            print(f"\n❌ {sensor_config['name']}: No successful readings")

async def main():
    """Main function"""
    print("🚀 Dual Sensor Test - Sensors Only")
    print("=" * 60)
    
    # Test dual sensors
    both_working = await test_dual_sensors()
    
    # Test consistency
    await test_sensor_consistency()
    
    print(f"\n🎉 Sensor testing completed!")
    print(f"\n📝 Summary:")
    if both_working:
        print(f"   ✅ Both sensors work on Modbus ID 1")
        print(f"   ✅ Sensor 1: /dev/ttyUSB0")
        print(f"   ✅ Sensor 2: /dev/ttyUSB1")
        print(f"   ✅ Both sensors can work simultaneously")
    else:
        print(f"   ❌ One or both sensors have issues")
    
    print(f"\n🔧 Next steps:")
    print(f"   1. Use these sensor configurations in your Smart Garden system")
    print(f"   2. Test with your actual plants when ready")

if __name__ == "__main__":
    asyncio.run(main()) 