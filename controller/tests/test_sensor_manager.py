"""
Test the updated SensorManager with port-based sensors
"""

import asyncio
import sys
import os

# Add the current directory to Python path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from hardware.sensors.sensor_manager import SensorManager
from hardware.sensors.sensor import Sensor

async def test_sensor_manager():
    """Test the sensor manager functionality"""
    print("🔍 Testing Updated Sensor Manager")
    print("=" * 50)
    
    # Create sensor manager
    manager = SensorManager()
    
    print("📋 Initial Sensor Status:")
    status = manager.get_sensor_status()
    for port, info in status.items():
        print(f"   {port}: {'✅ Available' if info['available'] else f'❌ Assigned to {info['assigned_to']}'}")
    
    print(f"\n📊 Available sensors: {manager.get_available_sensors()}")
    
    # Test sensor assignment
    print(f"\n🧪 Testing Sensor Assignment:")
    
    # Assign sensor to plant 1
    try:
        sensor_port = manager.assign_sensor("plant_1")
        print(f"   ✅ Assigned {sensor_port} to plant_1")
    except Exception as e:
        print(f"   ❌ Error assigning sensor: {e}")
    
    # Assign sensor to plant 2
    try:
        sensor_port = manager.assign_sensor("plant_2")
        print(f"   ✅ Assigned {sensor_port} to plant_2")
    except Exception as e:
        print(f"   ❌ Error assigning sensor: {e}")
    
    # Try to assign another sensor (should fail)
    try:
        sensor_port = manager.assign_sensor("plant_3")
        print(f"   ✅ Assigned {sensor_port} to plant_3")
    except Exception as e:
        print(f"   ❌ Expected error: {e}")
    
    print(f"\n📋 Updated Sensor Status:")
    status = manager.get_sensor_status()
    for port, info in status.items():
        print(f"   {port}: {'✅ Available' if info['available'] else f'❌ Assigned to {info['assigned_to']}'}")
    
    # Test getting sensor configurations
    print(f"\n🔧 Sensor Configurations:")
    configs = manager.get_all_sensor_configs()
    for port, config in configs.items():
        print(f"   {port}:")
        print(f"     Baudrate: {config['baudrate']}")
    
    # Test reading from assigned sensors
    print(f"\n📖 Testing Sensor Readings:")
    
    for plant_id in ["plant_1", "plant_2"]:
        try:
            sensor_port = manager.get_sensor_port(plant_id)
            config = manager.get_sensor_config(sensor_port)
            
            print(f"\n🔧 Reading from {sensor_port} for {plant_id}:")
            
            # Create sensor with the assigned configuration
            sensor = Sensor(
                simulation_mode=False,
                port=config['port'],
                baudrate=config['baudrate']
            )
            
            reading = await sensor.read()
            
            if reading is not None:
                if isinstance(reading, tuple):
                    moisture, temperature = reading
                    print(f"   ✅ {sensor_port}: Moisture={moisture:.1f}%, Temp={temperature:.1f}°C")
                else:
                    print(f"   ✅ {sensor_port}: Moisture={reading:.1f}%")
            else:
                print(f"   ❌ {sensor_port}: FAILED")
                
        except Exception as e:
            print(f"   ❌ Error reading from {plant_id}: {e}")
    
    # Test sensor release
    print(f"\n🔄 Testing Sensor Release:")
    try:
        manager.release_sensor("plant_1")
        print(f"   ✅ Released sensor from plant_1")
        
        print(f"\n📋 Final Sensor Status:")
        status = manager.get_sensor_status()
        for port, info in status.items():
            print(f"   {port}: {'✅ Available' if info['available'] else f'❌ Assigned to {info['assigned_to']}'}")
            
    except Exception as e:
        print(f"   ❌ Error releasing sensor: {e}")

async def main():
    """Main function"""
    print("🚀 Sensor Manager Test")
    print("=" * 60)
    
    await test_sensor_manager()
    
    print(f"\n🎉 Sensor manager test completed!")

if __name__ == "__main__":
    asyncio.run(main()) 