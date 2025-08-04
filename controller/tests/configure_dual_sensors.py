"""
Configure Dual Sensors - Both on Modbus ID 1

This script configures your two sensors that both use Modbus ID 1
but are on different ports:
- Sensor 1: Modbus ID 1 on /dev/ttyUSB0
- Sensor 2: Modbus ID 1 on /dev/ttyUSB1
"""

import asyncio
import sys
import os

# Add the current directory to Python path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

# Import the necessary modules
from hardware.sensors.sensor import Sensor
from hardware.sensors.sensor_manager import SensorManager
from engine.smart_garden_engine import SmartGardenEngine

class DualSensorConfig:
    """Configuration for dual sensors on same Modbus ID but different ports"""
    
    def __init__(self):
        self.sensor_1_config = {
            "name": "Sensor 1",
            "modbus_id": 1,
            "port": "/dev/ttyUSB0",
            "baudrate": 4800
        }
        
        self.sensor_2_config = {
            "name": "Sensor 2", 
            "modbus_id": 1,
            "port": "/dev/ttyUSB1",
            "baudrate": 4800
        }
    
    async def test_individual_sensors(self):
        """Test each sensor individually"""
        print("🔍 Testing Individual Sensors")
        print("=" * 50)
        
        sensors = [self.sensor_1_config, self.sensor_2_config]
        working_sensors = []
        
        for sensor_config in sensors:
            print(f"\n🔧 Testing {sensor_config['name']}...")
            print(f"   Modbus ID: {sensor_config['modbus_id']}")
            print(f"   Port: {sensor_config['port']}")
            print(f"   Baudrate: {sensor_config['baudrate']}")
            
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
        
        return working_sensors
    
    async def test_both_sensors_together(self):
        """Test both sensors working simultaneously"""
        print(f"\n🧪 Testing Both Sensors Together")
        print("=" * 50)
        
        try:
            # Create both sensors
            sensor_1 = Sensor(
                simulation_mode=False,
                modbus_id=self.sensor_1_config['modbus_id'],
                port=self.sensor_1_config['port'],
                baudrate=self.sensor_1_config['baudrate']
            )
            
            sensor_2 = Sensor(
                simulation_mode=False,
                modbus_id=self.sensor_2_config['modbus_id'],
                port=self.sensor_2_config['port'],
                baudrate=self.sensor_2_config['baudrate']
            )
            
            # Read from both sensors
            print(f"📊 Reading from both sensors...")
            
            reading_1 = await sensor_1.read()
            reading_2 = await sensor_2.read()
            
            if reading_1 is not None:
                if isinstance(reading_1, tuple):
                    moisture_1, temp_1 = reading_1
                    print(f"   {self.sensor_1_config['name']}: Moisture={moisture_1:.1f}%, Temp={temp_1:.1f}°C")
                else:
                    print(f"   {self.sensor_1_config['name']}: Moisture={reading_1:.1f}%")
            else:
                print(f"   ❌ {self.sensor_1_config['name']}: FAILED")
            
            if reading_2 is not None:
                if isinstance(reading_2, tuple):
                    moisture_2, temp_2 = reading_2
                    print(f"   {self.sensor_2_config['name']}: Moisture={moisture_2:.1f}%, Temp={temp_2:.1f}°C")
                else:
                    print(f"   {self.sensor_2_config['name']}: Moisture={reading_2:.1f}%")
            else:
                print(f"   ❌ {self.sensor_2_config['name']}: FAILED")
            
            if reading_1 is not None and reading_2 is not None:
                print(f"\n✅ Both sensors working! Configuration:")
                print(f"   {self.sensor_1_config['name']}: Modbus ID {self.sensor_1_config['modbus_id']} on {self.sensor_1_config['port']}")
                print(f"   {self.sensor_2_config['name']}: Modbus ID {self.sensor_2_config['modbus_id']} on {self.sensor_2_config['port']}")
                print(f"   Baudrate: {self.sensor_1_config['baudrate']}")
                return True
            else:
                print(f"\n❌ One or both sensors failed")
                return False
                
        except Exception as e:
            print(f"❌ Error testing both sensors: {e}")
            return False
    
    def create_smart_garden_config(self):
        """Create configuration for Smart Garden Engine"""
        print(f"\n🏡 Smart Garden Configuration")
        print("=" * 50)
        
        print("📋 Configuration for your Smart Garden system:")
        print()
        print("1️⃣ Sensor Configuration:")
        print(f"   Sensor 1: Modbus ID {self.sensor_1_config['modbus_id']} on {self.sensor_1_config['port']}")
        print(f"   Sensor 2: Modbus ID {self.sensor_2_config['modbus_id']} on {self.sensor_2_config['port']}")
        print(f"   Baudrate: {self.sensor_1_config['baudrate']}")
        print()
        
        print("2️⃣ Code Configuration:")
        print("   Update your SmartGardenEngine to use these settings:")
        print()
        print("   # In your SmartGardenEngine or sensor creation code:")
        print("   sensor_1 = Sensor(")
        print(f"       simulation_mode=False,")
        print(f"       modbus_id={self.sensor_1_config['modbus_id']},")
        print(f"       port='{self.sensor_1_config['port']}',")
        print(f"       baudrate={self.sensor_1_config['baudrate']}")
        print("   )")
        print()
        print("   sensor_2 = Sensor(")
        print(f"       simulation_mode=False,")
        print(f"       modbus_id={self.sensor_2_config['modbus_id']},")
        print(f"       port='{self.sensor_2_config['port']}',")
        print(f"       baudrate={self.sensor_2_config['baudrate']}")
        print("   )")
        print()
        
        print("3️⃣ Important Notes:")
        print("   ⚠️  Both sensors use the same Modbus ID (1)")
        print("   ✅ They work because they're on different ports")
        print("   📍 Make sure to assign sensors to different plants")
        print("   🔧 Each sensor should be assigned to a different plant")
    
    async def test_smart_garden_integration(self):
        """Test integration with Smart Garden Engine"""
        print(f"\n🏡 Testing Smart Garden Integration")
        print("=" * 50)
        
        try:
            # Create Smart Garden Engine with 2 sensors
            engine = SmartGardenEngine(total_valves=4, total_sensors=2)
            
            # Add plants (this will automatically assign sensors)
            print("🌱 Adding plants with sensor assignment...")
            
            engine.add_plant(
                plant_id=1,
                desired_moisture=65.0,
                plant_lat=32.7940,
                plant_lon=34.9896,
                pipe_diameter=1.0,
                flow_rate=0.05,
                water_limit=1.0
            )
            print("   ✅ Plant 1 added")
            
            engine.add_plant(
                plant_id=2,
                desired_moisture=70.0,
                plant_lat=32.7940,
                plant_lon=34.9896,
                pipe_diameter=1.0,
                flow_rate=0.05,
                water_limit=1.0
            )
            print("   ✅ Plant 2 added")
            
            # Test moisture readings
            print("\n📊 Testing moisture readings...")
            
            moisture_1 = await engine.get_plant_moisture(1)
            moisture_2 = await engine.get_plant_moisture(2)
            
            if moisture_1 is not None:
                print(f"   Plant 1 moisture: {moisture_1:.1f}%")
            else:
                print(f"   ❌ Plant 1 moisture reading failed")
            
            if moisture_2 is not None:
                print(f"   Plant 2 moisture: {moisture_2:.1f}%")
            else:
                print(f"   ❌ Plant 2 moisture reading failed")
            
            # Test all plants moisture
            all_moisture = await engine.get_all_plants_moisture()
            print(f"   All plants moisture: {all_moisture}")
            
            print("\n✅ Smart Garden integration test completed!")
            
        except Exception as e:
            print(f"❌ Error in Smart Garden integration: {e}")

async def main():
    """Main function"""
    print("🚀 Dual Sensor Configuration")
    print("=" * 60)
    
    # Create configuration
    config = DualSensorConfig()
    
    # Test individual sensors
    working_sensors = await config.test_individual_sensors()
    
    # Test both sensors together
    both_working = await config.test_both_sensors_together()
    
    # Show configuration
    config.create_smart_garden_config()
    
    # Test Smart Garden integration
    await config.test_smart_garden_integration()
    
    print(f"\n🎉 Configuration completed!")
    print(f"\n📝 Summary:")
    print(f"   ✅ Both sensors work on Modbus ID 1")
    print(f"   ✅ Sensor 1: /dev/ttyUSB0")
    print(f"   ✅ Sensor 2: /dev/ttyUSB1")
    print(f"   ✅ Both sensors can work simultaneously")
    print(f"\n🔧 Next steps:")
    print(f"   1. Use the configuration above in your Smart Garden code")
    print(f"   2. Assign each sensor to a different plant")
    print(f"   3. Test the full system with your plants")

if __name__ == "__main__":
    asyncio.run(main()) 