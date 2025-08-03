"""
Test script for SmartGardenEngine Moisture Functions

This script tests the new moisture functions added to the SmartGardenEngine:
1. get_plant_moisture(plant_id) - Get moisture for specific plant
2. get_all_plants_moisture() - Get moisture for all plants

These functions use the Plant class's get_moisture() method internally.
"""

import asyncio
from controller.engine.smart_garden_engine import SmartGardenEngine

async def test_single_plant_moisture():
    """Test getting moisture for a single plant"""
    print("🧪 Testing Single Plant Moisture Function...")
    
    # Step 1: Create Smart Garden Engine
    print("\n1️⃣ Creating Smart Garden Engine...")
    engine = SmartGardenEngine(total_valves=4, total_sensors=4)
    
    # Step 2: Add test plants
    print("2️⃣ Adding test plants...")
    engine.add_plant(
        plant_id=1,
        desired_moisture=65.0,
        plant_lat=32.7940,
        plant_lon=34.9896,
        pipe_diameter=1.0,
        flow_rate=0.05,
        water_limit=1.0
    )
    
    engine.add_plant(
        plant_id=2,
        desired_moisture=70.0,
        plant_lat=32.7940,
        plant_lon=34.9896,
        pipe_diameter=1.0,
        flow_rate=0.05,
        water_limit=1.0
    )
    
    # Step 3: Test getting moisture for specific plant
    print("3️⃣ Testing get_plant_moisture() function...")
    
    try:
        # Test existing plant
        moisture_1 = await engine.get_plant_moisture(1)
        print(f"✅ Plant 1 moisture: {moisture_1:.1f}%" if moisture_1 is not None else "⚠️ Plant 1 moisture: None")
        
        moisture_2 = await engine.get_plant_moisture(2)
        print(f"✅ Plant 2 moisture: {moisture_2:.1f}%" if moisture_2 is not None else "⚠️ Plant 2 moisture: None")
        
        # Test non-existent plant
        try:
            moisture_999 = await engine.get_plant_moisture(999)
            print(f"❌ Should have raised ValueError for plant 999")
            return False
        except ValueError as e:
            print(f"✅ Correctly raised ValueError for non-existent plant: {e}")
        
        print("✅ Single plant moisture test PASSED!")
        return True
        
    except Exception as e:
        print(f"❌ Single plant moisture test FAILED: {e}")
        return False

async def test_all_plants_moisture():
    """Test getting moisture for all plants"""
    print("\n🧪 Testing All Plants Moisture Function...")
    
    # Step 1: Create Smart Garden Engine
    print("\n1️⃣ Creating Smart Garden Engine...")
    engine = SmartGardenEngine(total_valves=4, total_sensors=4)
    
    # Step 2: Add multiple test plants
    print("2️⃣ Adding multiple test plants...")
    for i in range(1, 4):  # Add plants 1, 2, 3
        engine.add_plant(
            plant_id=i,
            desired_moisture=60.0 + (i * 5),  # Different moisture targets
            plant_lat=32.7940,
            plant_lon=34.9896,
            pipe_diameter=1.0,
            flow_rate=0.05,
            water_limit=1.0
        )
    
    # Step 3: Test getting moisture for all plants
    print("3️⃣ Testing get_all_plants_moisture() function...")
    
    try:
        all_moisture = await engine.get_all_plants_moisture()
        
        print(f"📊 Retrieved moisture for {len(all_moisture)} plants:")
        for plant_id, moisture in all_moisture.items():
            if moisture is not None:
                print(f"   Plant {plant_id}: {moisture:.1f}%")
            else:
                print(f"   Plant {plant_id}: Failed to read")
        
        # Verify we got data for all 3 plants
        if len(all_moisture) == 3 and all(1 <= pid <= 3 for pid in all_moisture.keys()):
            print("✅ All plants moisture test PASSED!")
            return True
        else:
            print(f"❌ Expected 3 plants (1,2,3), got {list(all_moisture.keys())}")
            return False
        
    except Exception as e:
        print(f"❌ All plants moisture test FAILED: {e}")
        return False

async def test_empty_engine_moisture():
    """Test moisture functions with no plants"""
    print("\n🧪 Testing Moisture Functions with Empty Engine...")
    
    # Step 1: Create empty engine
    print("\n1️⃣ Creating empty Smart Garden Engine...")
    engine = SmartGardenEngine(total_valves=4, total_sensors=4)
    
    # Step 2: Test functions with no plants
    print("2️⃣ Testing functions with no plants...")
    
    try:
        # Test get_plant_moisture with non-existent plant
        try:
            await engine.get_plant_moisture(1)
            print("❌ Should have raised ValueError for empty engine")
            return False
        except ValueError:
            print("✅ Correctly raised ValueError for empty engine")
        
        # Test get_all_plants_moisture with empty engine
        all_moisture = await engine.get_all_plants_moisture()
        if len(all_moisture) == 0:
            print("✅ get_all_plants_moisture returns empty dict for empty engine")
            return True
        else:
            print(f"❌ Expected empty dict, got {all_moisture}")
            return False
        
    except Exception as e:
        print(f"❌ Empty engine test FAILED: {e}")
        return False

async def test_engine_moisture_integration():
    """Test that the engine functions integrate properly with Plant objects"""
    print("\n🧪 Testing Engine-Plant Integration...")
    
    # Step 1: Create engine and add plant
    print("\n1️⃣ Creating engine and adding plant...")
    engine = SmartGardenEngine(total_valves=4, total_sensors=4)
    
    engine.add_plant(
        plant_id=42,
        desired_moisture=75.0,
        plant_lat=32.7940,
        plant_lon=34.9896,
        pipe_diameter=1.0,
        flow_rate=0.05,
        water_limit=1.0
    )
    
    # Step 2: Test that engine function calls Plant.get_moisture()
    print("2️⃣ Testing engine function calls Plant.get_moisture()...")
    
    try:
        # Get moisture using engine function
        engine_moisture = await engine.get_plant_moisture(42)
        
        # Get moisture directly from plant for comparison
        plant = engine.plants[42]
        direct_moisture = await plant.get_moisture()
        
        print(f"   Engine function result: {engine_moisture}")
        print(f"   Direct plant call result: {direct_moisture}")
        
        # They should be the same (or both None)
        if engine_moisture == direct_moisture:
            print("✅ Engine function correctly delegates to Plant.get_moisture()")
            return True
        else:
            print("❌ Engine function result differs from direct plant call")
            return False
        
    except Exception as e:
        print(f"❌ Integration test FAILED: {e}")
        return False

if __name__ == "__main__":
    async def run_all_tests():
        print("🚀 Starting SmartGardenEngine Moisture Function Tests...")
        
        # Test individual functions
        success1 = await test_single_plant_moisture()
        success2 = await test_all_plants_moisture()
        success3 = await test_empty_engine_moisture()
        success4 = await test_engine_moisture_integration()
        
        if success1 and success2 and success3 and success4:
            print("\n🏆 All tests passed! Engine moisture functions are working correctly.")
            print("\n✅ Available engine functions:")
            print("   📤 get_plant_moisture(plant_id) → Optional[float]")
            print("   📤 get_all_plants_moisture() → Dict[int, Optional[float]]")
        else:
            print("\n💥 Some tests failed. Please check the implementation.")
    
    # Run the tests
    asyncio.run(run_all_tests())