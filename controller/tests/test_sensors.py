"""
Comprehensive Sensor Testing Script

This script helps you:
1. Identify and test multiple sensors connected to your Raspberry Pi
2. Test individual sensor readings
3. Verify sensor assignments to plants
4. Test sensor communication and data accuracy
5. Simulate sensor behavior for development

Run this test to verify your sensor setup and identify any issues.
"""

import asyncio
import time
from typing import Dict, List, Optional, Tuple
from controller.hardware.sensors.sensor import Sensor
from controller.hardware.sensors.sensor_manager import SensorManager
from controller.engine.smart_garden_engine import SmartGardenEngine

class SensorTester:
    """Comprehensive sensor testing utility"""
    
    def __init__(self, total_sensors: int = 2):
        self.total_sensors = total_sensors
        self.sensors: Dict[int, Sensor] = {}
        self.sensor_manager = SensorManager(total_sensors)
        
    def create_sensor(self, sensor_id: int, simulation_mode: bool = False) -> Sensor:
        """Create a sensor instance with specific configuration"""
        if simulation_mode:
            # Simulated sensor for testing
            sensor = Sensor(
                simulation_mode=True,
                initial_moisture=50.0,
                modbus_id=sensor_id
            )
            print(f"🔧 Created SIMULATED sensor {sensor_id}")
        else:
            # Physical sensor - adjust port if needed
            sensor = Sensor(
                simulation_mode=False,
                modbus_id=sensor_id,
                port="/dev/ttyUSB0",  # Adjust this based on your setup
                baudrate=4800
            )
            print(f"🔧 Created PHYSICAL sensor {sensor_id} on /dev/ttyUSB0")
        
        return sensor
    
    async def test_single_sensor(self, sensor_id: int, simulation_mode: bool = False) -> bool:
        """Test a single sensor and return success status"""
        print(f"\n🧪 Testing Sensor {sensor_id}...")
        
        try:
            # Create sensor
            sensor = self.create_sensor(sensor_id, simulation_mode)
            self.sensors[sensor_id] = sensor
            
            # Test multiple readings
            readings = []
            for i in range(3):
                print(f"   📊 Reading {i+1}/3...")
                reading = await sensor.read()
                
                if reading is not None:
                    if isinstance(reading, tuple):
                        moisture, temperature = reading
                        readings.append((moisture, temperature))
                        print(f"   ✅ Reading {i+1}: Moisture={moisture:.1f}%, Temp={temperature:.1f}°C")
                    else:
                        readings.append((reading, None))
                        print(f"   ✅ Reading {i+1}: Moisture={reading:.1f}%")
                else:
                    print(f"   ❌ Reading {i+1}: FAILED")
                    return False
                
                await asyncio.sleep(1)  # Wait between readings
            
            # Analyze readings
            if len(readings) == 3:
                print(f"   📈 Sensor {sensor_id} test PASSED - All readings successful")
                return True
            else:
                print(f"   ❌ Sensor {sensor_id} test FAILED - Only {len(readings)}/3 readings successful")
                return False
                
        except Exception as e:
            print(f"   ❌ Sensor {sensor_id} test FAILED - Exception: {e}")
            return False
    
    async def test_all_sensors(self, simulation_mode: bool = False) -> Dict[int, bool]:
        """Test all sensors and return results"""
        print(f"\n🚀 Testing All Sensors (Total: {self.total_sensors})")
        print(f"Mode: {'SIMULATION' if simulation_mode else 'PHYSICAL'}")
        
        results = {}
        for sensor_id in range(self.total_sensors):
            success = await self.test_single_sensor(sensor_id, simulation_mode)
            results[sensor_id] = success
        
        return results
    
    async def test_sensor_consistency(self, sensor_id: int, num_readings: int = 10) -> Dict:
        """Test sensor consistency over multiple readings"""
        print(f"\n📊 Testing Sensor {sensor_id} Consistency ({num_readings} readings)...")
        
        if sensor_id not in self.sensors:
            print(f"   ❌ Sensor {sensor_id} not found. Run test_all_sensors first.")
            return {}
        
        sensor = self.sensors[sensor_id]
        readings = []
        
        for i in range(num_readings):
            reading = await sensor.read()
            if reading is not None:
                if isinstance(reading, tuple):
                    moisture, temperature = reading
                    readings.append((moisture, temperature))
                else:
                    readings.append((reading, None))
            await asyncio.sleep(0.5)
        
        if readings:
            moisture_values = [r[0] for r in readings]
            temperature_values = [r[1] for r in readings if r[1] is not None]
            
            result = {
                'sensor_id': sensor_id,
                'total_readings': len(readings),
                'moisture': {
                    'min': min(moisture_values),
                    'max': max(moisture_values),
                    'avg': sum(moisture_values) / len(moisture_values),
                    'values': moisture_values
                }
            }
            
            if temperature_values:
                result['temperature'] = {
                    'min': min(temperature_values),
                    'max': max(temperature_values),
                    'avg': sum(temperature_values) / len(temperature_values),
                    'values': temperature_values
                }
            
            print(f"   ✅ Consistency test completed:")
            print(f"      💧 Moisture: {result['moisture']['min']:.1f}% - {result['moisture']['max']:.1f}% (avg: {result['moisture']['avg']:.1f}%)")
            if 'temperature' in result:
                print(f"      🌡️  Temperature: {result['temperature']['min']:.1f}°C - {result['temperature']['max']:.1f}°C (avg: {result['temperature']['avg']:.1f}°C)")
            
            return result
        else:
            print(f"   ❌ No successful readings for sensor {sensor_id}")
            return {}
    
    def test_sensor_assignment(self) -> None:
        """Test sensor assignment to plants"""
        print(f"\n🌱 Testing Sensor Assignment...")
        
        # Test assigning sensors to plants
        test_plants = ["plant_1", "plant_2", "plant_3"]
        
        for plant_id in test_plants:
            try:
                sensor_id = self.sensor_manager.assign_sensor(plant_id)
                print(f"   ✅ Assigned sensor {sensor_id} to {plant_id}")
            except ValueError as e:
                print(f"   ❌ Failed to assign sensor to {plant_id}: {e}")
        
        # Test getting sensor assignments
        for plant_id in test_plants:
            try:
                sensor_id = self.sensor_manager.get_sensor_id(plant_id)
                print(f"   📍 {plant_id} is using sensor {sensor_id}")
            except ValueError:
                print(f"   ❌ {plant_id} has no sensor assigned")
        
        # Show available sensors
        available = self.sensor_manager.get_available_sensors()
        print(f"   📋 Available sensors: {available}")
    
    async def test_smart_garden_integration(self) -> None:
        """Test sensors integrated with Smart Garden Engine"""
        print(f"\n🏡 Testing Smart Garden Engine Integration...")
        
        # Create engine with sensors
        engine = SmartGardenEngine(total_valves=4, total_sensors=self.total_sensors)
        
        # Add plants (this will automatically assign sensors)
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
            print("   ✅ Added plant 1 with sensor assignment")
            
            engine.add_plant(
                plant_id=2,
                desired_moisture=70.0,
                plant_lat=32.7940,
                plant_lon=34.9896,
                pipe_diameter=1.0,
                flow_rate=0.05,
                water_limit=1.0
            )
            print("   ✅ Added plant 2 with sensor assignment")
            
        except ValueError as e:
            print(f"   ❌ Failed to add plant: {e}")
            return
        
        # Test moisture readings for each plant
        for plant_id in [1, 2]:
            try:
                moisture = await engine.get_plant_moisture(plant_id)
                if moisture is not None:
                    print(f"   💧 Plant {plant_id} moisture: {moisture:.1f}%")
                else:
                    print(f"   ❌ Plant {plant_id} moisture reading failed")
            except Exception as e:
                print(f"   ❌ Plant {plant_id} moisture error: {e}")
        
        # Test all plants moisture
        try:
            all_moisture = await engine.get_all_plants_moisture()
            print(f"   📊 All plants moisture: {all_moisture}")
        except Exception as e:
            print(f"   ❌ All plants moisture error: {e}")
    
    def print_sensor_info(self) -> None:
        """Print detailed information about sensors"""
        print(f"\n📋 Sensor Information:")
        print(f"   Total sensors configured: {self.total_sensors}")
        print(f"   Sensors created: {list(self.sensors.keys())}")
        print(f"   Available sensors: {self.sensor_manager.get_available_sensors()}")
        
        for sensor_id, sensor in self.sensors.items():
            print(f"   Sensor {sensor_id}:")
            print(f"      Mode: {'Simulation' if sensor.simulation_mode else 'Physical'}")
            print(f"      Modbus ID: {sensor.modbus_id}")
            if not sensor.simulation_mode:
                print(f"      Port: {sensor.port}")
                print(f"      Baudrate: {sensor.baudrate}")

async def main():
    """Main test function"""
    print("🔬 Smart Garden Sensor Testing Suite")
    print("=" * 50)
    
    # Create tester
    tester = SensorTester(total_sensors=2)
    
    # Test 1: Simulated sensors (for development)
    print("\n" + "="*50)
    print("🧪 PHASE 1: Testing Simulated Sensors")
    print("="*50)
    
    sim_results = await tester.test_all_sensors(simulation_mode=True)
    print(f"\n📊 Simulation Results: {sim_results}")
    
    # Test 2: Physical sensors (for hardware testing)
    print("\n" + "="*50)
    print("🔧 PHASE 2: Testing Physical Sensors")
    print("="*50)
    print("⚠️  Make sure your sensors are connected to /dev/ttyUSB0")
    print("⚠️  If using different port, modify the sensor creation in the code")
    
    # Uncomment the following lines to test physical sensors:
    # phys_results = await tester.test_all_sensors(simulation_mode=False)
    # print(f"\n📊 Physical Results: {phys_results}")
    
    # Test 3: Sensor consistency
    print("\n" + "="*50)
    print("📊 PHASE 3: Testing Sensor Consistency")
    print("="*50)
    
    for sensor_id in range(tester.total_sensors):
        if sensor_id in sim_results and sim_results[sensor_id]:
            await tester.test_sensor_consistency(sensor_id, num_readings=5)
    
    # Test 4: Sensor assignment
    print("\n" + "="*50)
    print("🌱 PHASE 4: Testing Sensor Assignment")
    print("="*50)
    
    tester.test_sensor_assignment()
    
    # Test 5: Smart Garden Integration
    print("\n" + "="*50)
    print("🏡 PHASE 5: Testing Smart Garden Integration")
    print("="*50)
    
    await tester.test_smart_garden_integration()
    
    # Print final information
    print("\n" + "="*50)
    print("📋 FINAL SENSOR INFORMATION")
    print("="*50)
    
    tester.print_sensor_info()
    
    print("\n🎉 Sensor testing completed!")
    print("\n📝 Next steps:")
    print("   1. If physical sensors failed, check connections and port settings")
    print("   2. If sensors work in simulation but not physically, check hardware setup")
    print("   3. Use the sensor assignment test to verify plant-sensor mapping")
    print("   4. Run the Smart Garden integration test to verify full functionality")

if __name__ == "__main__":
    asyncio.run(main()) 