"""
Test Sensor with Fixed Configuration

This script matches the exact mbpoll configuration that works:
- Modbus ID: 1
- Register: 1 (not 0x0000)
- Count: 2 registers
- Baudrate: 4800
- Parity: None
- Port: /dev/ttyUSB0
"""

import asyncio
import sys
import os

# Add the current directory to Python path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from hardware.sensors.sensor import Sensor

async def test_sensor():
    """Test sensor with exact mbpoll configuration"""
    print("🔍 Testing Sensor with Fixed Configuration")
    print("=" * 50)
    
    print("📋 Configuration (matching working mbpoll):")
    print("   Modbus ID: 1")
    print("   Register: 1")
    print("   Count: 2 registers")
    print("   Baudrate: 4800")
    print("   Parity: None")
    print("   Port: /dev/ttyUSB0")
    print()
    
    try:
        # Create sensor with exact configuration
        sensor = Sensor(
            simulation_mode=False,
            port="/dev/ttyUSB0",
            baudrate=4800
        )
        
        print("🔧 Testing sensor...")
        
        # Read from sensor
        reading = await sensor.read()
        
        if reading is not None:
            if isinstance(reading, tuple):
                moisture, temperature = reading
                print(f"✅ SUCCESS!")
                print(f"   Moisture: {moisture:.1f}%")
                print(f"   Temperature: {temperature:.1f}°C")
                return True
            else:
                print(f"✅ SUCCESS! Moisture: {reading:.1f}%")
                return True
        else:
            print(f"❌ FAILED - No reading")
            return False
            
    except Exception as e:
        print(f"❌ ERROR: {e}")
        return False

async def test_sensor_1():
    """Test Sensor 1 on /dev/ttyUSB0"""
    print("\n🧪 Testing Sensor 1 (/dev/ttyUSB0)")
    print("=" * 40)
    
    try:
        sensor = Sensor(
            simulation_mode=False,
            port="/dev/ttyUSB0",
            baudrate=4800
        )
        
        print("🔧 Reading from Sensor 1...")
        reading = await sensor.read()
        
        if reading is not None:
            if isinstance(reading, tuple):
                moisture, temperature = reading
                print(f"✅ Sensor 1 SUCCESS!")
                print(f"   Moisture: {moisture:.1f}%")
                print(f"   Temperature: {temperature:.1f}°C")
                return True
            else:
                print(f"✅ Sensor 1 SUCCESS! Moisture: {reading:.1f}%")
                return True
        else:
            print(f"❌ Sensor 1 FAILED - No reading")
            return False
            
    except Exception as e:
        print(f"❌ Sensor 1 ERROR: {e}")
        return False

async def test_sensor_2():
    """Test Sensor 2 on /dev/ttyUSB1"""
    print("\n🧪 Testing Sensor 2 (/dev/ttyUSB1)")
    print("=" * 40)
    
    try:
        sensor = Sensor(
            simulation_mode=False,
            port="/dev/ttyUSB1",
            baudrate=4800
        )
        
        print("🔧 Reading from Sensor 2...")
        reading = await sensor.read()
        
        if reading is not None:
            if isinstance(reading, tuple):
                moisture, temperature = reading
                print(f"✅ Sensor 2 SUCCESS!")
                print(f"   Moisture: {moisture:.1f}%")
                print(f"   Temperature: {temperature:.1f}°C")
                return True
            else:
                print(f"✅ Sensor 2 SUCCESS! Moisture: {reading:.1f}%")
                return True
        else:
            print(f"❌ Sensor 2 FAILED - No reading")
            return False
            
    except Exception as e:
        print(f"❌ Sensor 2 ERROR: {e}")
        return False

async def test_both_sensors_together():
    """Test both sensors simultaneously"""
    print("\n🧪 Testing Both Sensors Together")
    print("=" * 40)
    
    try:
        # Create both sensors
        sensor_1 = Sensor(
            simulation_mode=False,
            port="/dev/ttyUSB0",
            baudrate=4800
        )
        
        sensor_2 = Sensor(
            simulation_mode=False,
            port="/dev/ttyUSB1",
            baudrate=4800
        )
        
        print("🔧 Reading from both sensors simultaneously...")
        
        # Read from both sensors
        reading_1 = await sensor_1.read()
        reading_2 = await sensor_2.read()
        
        print("\n📊 Results:")
        if reading_1 is not None:
            if isinstance(reading_1, tuple):
                moisture_1, temp_1 = reading_1
                print(f"   ✅ Sensor 1: Moisture={moisture_1:.1f}%, Temp={temp_1:.1f}°C")
            else:
                print(f"   ✅ Sensor 1: Moisture={reading_1:.1f}%")
        else:
            print(f"   ❌ Sensor 1: FAILED")
        
        if reading_2 is not None:
            if isinstance(reading_2, tuple):
                moisture_2, temp_2 = reading_2
                print(f"   ✅ Sensor 2: Moisture={moisture_2:.1f}%, Temp={temp_2:.1f}°C")
            else:
                print(f"   ✅ Sensor 2: Moisture={reading_2:.1f}%")
        else:
            print(f"   ❌ Sensor 2: FAILED")
        
        if reading_1 is not None and reading_2 is not None:
            print(f"\n🎉 Both sensors working simultaneously!")
            return True
        else:
            print(f"\n❌ One or both sensors failed")
            return False
            
    except Exception as e:
        print(f"❌ Error testing both sensors: {e}")
        return False

async def main():
    """Main function"""
    print("🚀 Sensor Test - Both Sensors")
    print("=" * 60)
    
    print("📋 Testing Configuration:")
    print("   Modbus ID: 1")
    print("   Register: 1")
    print("   Baudrate: 4800")
    print("   Parity: None")
    print("   Ports: /dev/ttyUSB0, /dev/ttyUSB1")
    print()
    
    # Test Sensor 1
    print("🔧 Testing Sensor 1...")
    sensor_1_working = await test_sensor_1()
    
    # Wait a moment between tests
    await asyncio.sleep(1)
    
    # Test Sensor 2
    print("\n🔧 Testing Sensor 2...")
    sensor_2_working = await test_sensor_2()
    
    print(f"\n🎉 Sensor Test Summary:")
    print("=" * 30)
    print(f"   Sensor 1 (/dev/ttyUSB0): {'✅ WORKING' if sensor_1_working else '❌ FAILED'}")
    print(f"   Sensor 2 (/dev/ttyUSB1): {'✅ WORKING' if sensor_2_working else '❌ FAILED'}")
    
    if sensor_1_working and sensor_2_working:
        print(f"\n🎉 Both sensors test passed!")
    elif sensor_1_working:
        print(f"\n⚠️  Only Sensor 1 working")
    elif sensor_2_working:
        print(f"\n⚠️  Only Sensor 2 working")
    else:
        print(f"\n❌ Both sensors failed!")

if __name__ == "__main__":
    asyncio.run(main()) 