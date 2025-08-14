#!/usr/bin/env python3
"""
Test script to verify plant assignment is working correctly.
This script tests the add_plant functionality to ensure valves and sensors are properly assigned.
"""

import asyncio
from controller.engine.smart_garden_engine import SmartGardenEngine

async def test_plant_assignment():
    """Test plant assignment functionality."""
    print("🧪 Testing Plant Assignment")
    print("=" * 50)
    
    # Initialize the engine
    engine = SmartGardenEngine(total_valves=2, total_sensors=2)
    
    print(f"✅ Engine initialized")
    print(f"   - Available valves: {engine.valves_manager.available_valves}")
    print(f"   - Available sensors: {engine.sensor_manager.available_sensors}")
    
    # Test 1: Add first plant
    print(f"\n🔓 Test 1: Adding first plant...")
    try:
        await engine.add_plant(
            plant_id=1,
            desired_moisture=60.0,
            plant_lat=32.7940,
            plant_lon=34.9896
        )
        
        plant1 = engine.plants[1]
        print(f"✅ Plant 1 added successfully")
        print(f"   - Plant ID: {plant1.plant_id}")
        print(f"   - Valve ID: {plant1.valve.valve_id}")
        print(f"   - Sensor Port: {plant1.sensor.port}")
        print(f"   - Available valves: {engine.valves_manager.available_valves}")
        print(f"   - Available sensors: {engine.sensor_manager.available_sensors}")
        
    except Exception as e:
        print(f"❌ Error adding plant 1: {e}")
        return
    
    # Test 2: Add second plant
    print(f"\n🔓 Test 2: Adding second plant...")
    try:
        await engine.add_plant(
            plant_id=2,
            desired_moisture=70.0,
            plant_lat=32.7940,
            plant_lon=34.9896
        )
        
        plant2 = engine.plants[2]
        print(f"✅ Plant 2 added successfully")
        print(f"   - Plant ID: {plant2.plant_id}")
        print(f"   - Valve ID: {plant2.valve.valve_id}")
        print(f"   - Sensor Port: {plant2.sensor.port}")
        print(f"   - Available valves: {engine.valves_manager.available_valves}")
        print(f"   - Available sensors: {engine.sensor_manager.available_sensors}")
        
    except Exception as e:
        print(f"❌ Error adding plant 2: {e}")
        return
    
    # Test 3: Try to add third plant (should fail - no available hardware)
    print(f"\n🔓 Test 3: Trying to add third plant (should fail)...")
    try:
        await engine.add_plant(
            plant_id=3,
            desired_moisture=80.0,
            plant_lat=32.7940,
            plant_lon=34.9896
        )
        print(f"❌ Unexpected success adding plant 3")
        
    except Exception as e:
        print(f"✅ Expected error adding plant 3: {e}")
    
    # Test 4: Remove plant 1 and add plant 3
    print(f"\n🔓 Test 4: Removing plant 1 and adding plant 3...")
    try:
        engine.remove_plant(1)
        print(f"✅ Plant 1 removed successfully")
        print(f"   - Available valves: {engine.valves_manager.available_valves}")
        print(f"   - Available sensors: {engine.sensor_manager.available_sensors}")
        
        await engine.add_plant(
            plant_id=3,
            desired_moisture=80.0,
            plant_lat=32.7940,
            plant_lon=34.9896
        )
        
        plant3 = engine.plants[3]
        print(f"✅ Plant 3 added successfully")
        print(f"   - Plant ID: {plant3.plant_id}")
        print(f"   - Valve ID: {plant3.valve.valve_id}")
        print(f"   - Sensor Port: {plant3.sensor.port}")
        
    except Exception as e:
        print(f"❌ Error in test 4: {e}")
        return
    
    print(f"\n✅ All tests completed successfully!")
    print(f"   - Total plants: {len(engine.plants)}")
    print(f"   - Available valves: {engine.valves_manager.available_valves}")
    print(f"   - Available sensors: {engine.sensor_manager.available_sensors}")

if __name__ == "__main__":
    asyncio.run(test_plant_assignment()) 