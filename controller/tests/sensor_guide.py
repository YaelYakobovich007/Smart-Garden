"""
Sensor Identification and Testing Guide

This guide helps you understand how to identify and test multiple sensors
connected to your Raspberry Pi.

Key Concepts:
1. Sensor Identification: Each sensor has a unique Modbus ID
2. Port Assignment: Sensors can be on different USB ports
3. Baud Rate: Communication speed (4800, 9600, 19200)
4. Sensor Assignment: How sensors are assigned to plants
"""

import asyncio
from controller.hardware.sensors.sensor import Sensor
from controller.hardware.sensors.sensor_manager import SensorManager
from controller.engine.smart_garden_engine import SmartGardenEngine

def print_sensor_guide():
    """Print comprehensive sensor guide"""
    print("🔬 Smart Garden Sensor Guide")
    print("=" * 50)
    
    print("\n📋 SENSOR IDENTIFICATION")
    print("-" * 30)
    print("1. Physical Connection:")
    print("   • Each sensor connects via USB-to-Serial adapter")
    print("   • Common ports: /dev/ttyUSB0, /dev/ttyUSB1, /dev/ttyACM0")
    print("   • Check connections with: ls /dev/tty*")
    
    print("\n2. Modbus ID:")
    print("   • Each sensor has a unique Modbus slave address")
    print("   • Common IDs: 0, 1, 2, 3...")
    print("   • You can configure this on most sensors")
    
    print("\n3. Communication Settings:")
    print("   • Baud Rate: 4800, 9600, 19200 (most common)")
    print("   • Parity: None (N)")
    print("   • Stop Bits: 1")
    print("   • Data Bits: 8")
    
    print("\n🔧 TESTING YOUR SENSORS")
    print("-" * 30)
    print("1. Quick Identification:")
    print("   python controller/tests/identify_sensors.py")
    print("   • Tests different port/ID combinations")
    print("   • Shows which sensors are working")
    
    print("\n2. Comprehensive Testing:")
    print("   python controller/tests/test_sensors.py")
    print("   • Full sensor functionality test")
    print("   • Tests simulation and physical modes")
    print("   • Tests sensor assignment to plants")
    
    print("\n🌱 SENSOR ASSIGNMENT TO PLANTS")
    print("-" * 30)
    print("1. Automatic Assignment:")
    print("   • When you add a plant, a sensor is automatically assigned")
    print("   • First plant gets sensor 0, second gets sensor 1, etc.")
    print("   • You can manually control this if needed")
    
    print("\n2. Manual Assignment:")
    print("   • Use SensorManager to control assignments")
    print("   • Check available sensors with get_available_sensors()")
    print("   • Release sensors with release_sensor(plant_id)")
    
    print("\n📊 UNDERSTANDING SENSOR READINGS")
    print("-" * 30)
    print("1. Moisture Readings:")
    print("   • Range: 0-100% (0% = dry, 100% = saturated)")
    print("   • Typical range: 20-80% for healthy plants")
    print("   • Readings may vary slightly due to sensor precision")
    
    print("\n2. Temperature Readings (if supported):")
    print("   • Range: -40°C to +80°C")
    print("   • Important for plant health monitoring")
    print("   • Some sensors only provide moisture")
    
    print("\n🔍 TROUBLESHOOTING")
    print("-" * 30)
    print("1. No sensor detected:")
    print("   • Check USB connections")
    print("   • Verify power supply to sensors")
    print("   • Try different ports (/dev/ttyUSB0, /dev/ttyUSB1)")
    
    print("\n2. Communication errors:")
    print("   • Check baud rate settings")
    print("   • Verify Modbus ID configuration")
    print("   • Test with different communication parameters")
    
    print("\n3. Inconsistent readings:")
    print("   • Check sensor placement in soil")
    print("   • Ensure good contact with soil")
    print("   • Allow time for readings to stabilize")
    
    print("\n💡 BEST PRACTICES")
    print("-" * 30)
    print("1. Sensor Placement:")
    print("   • Insert sensors at root level")
    print("   • Avoid air pockets around sensor")
    print("   • Keep sensors away from direct water flow")
    
    print("\n2. Calibration:")
    print("   • Test sensors in known conditions")
    print("   • Compare readings with manual soil testing")
    print("   • Adjust thresholds based on your soil type")
    
    print("\n3. Maintenance:")
    print("   • Clean sensors regularly")
    print("   • Check for corrosion on metal parts")
    print("   • Replace sensors if readings become unreliable")

async def demonstrate_sensor_usage():
    """Demonstrate how to work with sensors"""
    print("\n" + "="*50)
    print("🧪 SENSOR USAGE DEMONSTRATION")
    print("="*50)
    
    # 1. Create sensor manager
    print("\n1️⃣ Creating Sensor Manager (2 sensors)...")
    sensor_manager = SensorManager(total_sensors=2)
    print(f"   Available sensors: {sensor_manager.get_available_sensors()}")
    
    # 2. Assign sensors to plants
    print("\n2️⃣ Assigning sensors to plants...")
    try:
        sensor_1 = sensor_manager.assign_sensor("plant_1")
        print(f"   Plant 1 assigned to sensor {sensor_1}")
        
        sensor_2 = sensor_manager.assign_sensor("plant_2")
        print(f"   Plant 2 assigned to sensor {sensor_2}")
        
        print(f"   Remaining sensors: {sensor_manager.get_available_sensors()}")
    except ValueError as e:
        print(f"   ❌ Assignment error: {e}")
    
    # 3. Create Smart Garden Engine
    print("\n3️⃣ Creating Smart Garden Engine...")
    engine = SmartGardenEngine(total_valves=4, total_sensors=2)
    
    # 4. Add plants (automatic sensor assignment)
    print("\n4️⃣ Adding plants with automatic sensor assignment...")
    try:
        engine.add_plant(
            plant_id=1,
            desired_moisture=65.0,
            plant_lat=32.7940,
            plant_lon=34.9896,
            pipe_diameter=1.0,
            flow_rate=0.05,
            water_limit=1.0
        )
        print("   ✅ Plant 1 added with sensor assignment")
        
        engine.add_plant(
            plant_id=2,
            desired_moisture=70.0,
            plant_lat=32.7940,
            plant_lon=34.9896,
            pipe_diameter=1.0,
            flow_rate=0.05,
            water_limit=1.0
        )
        print("   ✅ Plant 2 added with sensor assignment")
        
    except ValueError as e:
        print(f"   ❌ Plant addition error: {e}")
    
    # 5. Test sensor readings
    print("\n5️⃣ Testing sensor readings (simulation mode)...")
    try:
        moisture_1 = await engine.get_plant_moisture(1)
        moisture_2 = await engine.get_plant_moisture(2)
        
        print(f"   Plant 1 moisture: {moisture_1:.1f}%")
        print(f"   Plant 2 moisture: {moisture_2:.1f}%")
        
        all_moisture = await engine.get_all_plants_moisture()
        print(f"   All plants moisture: {all_moisture}")
        
    except Exception as e:
        print(f"   ❌ Reading error: {e}")
    
    print("\n✅ Sensor demonstration completed!")

async def main():
    """Main function"""
    # Print the guide
    print_sensor_guide()
    
    # Demonstrate usage
    await demonstrate_sensor_usage()
    
    print("\n🎉 Guide completed!")
    print("\n📝 Next steps:")
    print("   1. Run: python controller/tests/identify_sensors.py")
    print("   2. Run: python controller/tests/test_sensors.py")
    print("   3. Configure your sensors based on the results")
    print("   4. Test with your actual hardware setup")

if __name__ == "__main__":
    asyncio.run(main()) 