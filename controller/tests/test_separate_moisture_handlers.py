"""
Test script for Separate Moisture Handlers

This script tests the new separate moisture handler files:
1. get_plant_moisture_handler.py - for single plant moisture
2. get_all_plants_moisture_handler.py - for all plants moisture

Verifies that the separation works correctly and handlers function independently.
"""

import asyncio
from controller.engine.smart_garden_engine import SmartGardenEngine
from controller.handlers.get_plant_moisture_handler import handle as handle_single_plant
from controller.handlers.get_all_plants_moisture_handler import handle as handle_all_plants

async def test_single_plant_handler():
    """Test the separate single plant moisture handler"""
    print("🧪 Testing Single Plant Moisture Handler...")
    
    # Step 1: Create Smart Garden Engine
    print("\n1️⃣ Creating Smart Garden Engine...")
    engine = SmartGardenEngine(total_valves=4, total_sensors=4)
    
    # Add a test plant
    engine.add_plant(
        plant_id=1,
        desired_moisture=65.0,
        plant_lat=32.7940,
        plant_lon=34.9896,
        pipe_diameter=1.0,
        flow_rate=0.05,
        water_limit=1.0
    )
    
    # Step 2: Create plant ID mapping
    plant_id_map = {"123": 1}
    
    # Step 3: Test single plant handler
    print("2️⃣ Testing single plant handler...")
    request_data = {"plant_id": 123}
    
    success, moisture_data = await handle_single_plant(
        data=request_data,
        smart_engine=engine,
        plant_id_map=plant_id_map
    )
    
    if success and moisture_data:
        print(f"✅ Single plant handler test PASSED!")
        print(f"   🆔 Plant ID: {moisture_data.plant_id}")
        print(f"   💧 Moisture: {moisture_data.moisture:.1f}%")
        print(f"   📅 Event: {moisture_data.event}")
        return True
    else:
        print("❌ Single plant handler test FAILED!")
        return False

async def test_all_plants_handler():
    """Test the separate all plants moisture handler"""
    print("\n🧪 Testing All Plants Moisture Handler...")
    
    # Step 1: Create Smart Garden Engine
    print("\n1️⃣ Creating Smart Garden Engine...")
    engine = SmartGardenEngine(total_valves=4, total_sensors=4)
    
    # Add multiple test plants
    for i in range(1, 4):
        engine.add_plant(
            plant_id=i,
            desired_moisture=60.0 + (i * 5),
            plant_lat=32.7940,
            plant_lon=34.9896,
            pipe_diameter=1.0,
            flow_rate=0.05,
            water_limit=1.0
        )
    
    # Step 2: Create plant ID mapping
    plant_id_map = {"123": 1, "456": 2, "789": 3}
    
    # Step 3: Test all plants handler
    print("2️⃣ Testing all plants handler...")
    request_data = {}
    
    success, response_dto = await handle_all_plants(
        data=request_data,
        smart_engine=engine,
        plant_id_map=plant_id_map
    )
    
    if success and response_dto:
        print(f"✅ All plants handler test PASSED!")
        print(f"   📊 Total plants: {response_dto.total_plants}")
        print(f"   📊 Status: {response_dto.status}")
        for i, plant_data in enumerate(response_dto.plants):
            print(f"   Plant {i+1}: ID {plant_data['plant_id']}, Moisture {plant_data['moisture']:.1f}%")
        return True
    else:
        print("❌ All plants handler test FAILED!")
        if response_dto:
            print(f"   Error: {response_dto.error_message}")
        return False

async def test_handlers_independence():
    """Test that the handlers work independently"""
    print("\n🧪 Testing Handler Independence...")
    
    # Step 1: Create two separate engines
    print("\n1️⃣ Creating separate engines...")
    engine1 = SmartGardenEngine(total_valves=2, total_sensors=2)
    engine2 = SmartGardenEngine(total_valves=2, total_sensors=2)
    
    # Add different plants to each engine
    engine1.add_plant(plant_id=1, desired_moisture=50.0, plant_lat=32.7940, plant_lon=34.9896)
    engine2.add_plant(plant_id=1, desired_moisture=70.0, plant_lat=32.7940, plant_lon=34.9896)
    engine2.add_plant(plant_id=2, desired_moisture=80.0, plant_lat=32.7940, plant_lon=34.9896)
    
    plant_id_map1 = {"100": 1}
    plant_id_map2 = {"200": 1, "300": 2}
    
    # Step 2: Test single plant handler with different engines
    print("2️⃣ Testing single plant handler with different engines...")
    success1, data1 = await handle_single_plant(
        data={"plant_id": 100}, smart_engine=engine1, plant_id_map=plant_id_map1
    )
    success2, data2 = await handle_single_plant(
        data={"plant_id": 200}, smart_engine=engine2, plant_id_map=plant_id_map2
    )
    
    # Step 3: Test all plants handler with different engines
    print("3️⃣ Testing all plants handler with different engines...")
    success3, response3 = await handle_all_plants(
        data={}, smart_engine=engine1, plant_id_map=plant_id_map1
    )
    success4, response4 = await handle_all_plants(
        data={}, smart_engine=engine2, plant_id_map=plant_id_map2
    )
    
    if success1 and success2 and success3 and success4:
        print(f"✅ Handler independence test PASSED!")
        print(f"   Engine 1 - Single plant: {data1.moisture:.1f}%")
        print(f"   Engine 2 - Single plant: {data2.moisture:.1f}%")
        print(f"   Engine 1 - All plants: {response3.total_plants} plants")
        print(f"   Engine 2 - All plants: {response4.total_plants} plants")
        return True
    else:
        print("❌ Handler independence test FAILED!")
        return False

if __name__ == "__main__":
    async def run_all_tests():
        print("🚀 Starting Separate Moisture Handlers Tests...")
        
        # Test individual handlers
        success1 = await test_single_plant_handler()
        success2 = await test_all_plants_handler()
        success3 = await test_handlers_independence()
        
        if success1 and success2 and success3:
            print("\n🏆 All tests passed! Separate moisture handlers are working correctly.")
            print("\n✅ Separate handler files:")
            print("   📁 get_plant_moisture_handler.py - Single plant moisture")
            print("   📁 get_all_plants_moisture_handler.py - All plants moisture")
            print("   🔗 Both handlers use the same `handle()` function name")
        else:
            print("\n💥 Some tests failed. Please check the implementation.")
    
    # Run the tests
    asyncio.run(run_all_tests())