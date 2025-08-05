import sys
import os
import asyncio
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from controller.engine.smart_garden_engine import SmartGardenEngine
from controller.handlers.open_valve_handler import OpenValveHandler


async def test_open_valve():
    """Test the open valve functionality."""
    print("🧪 Testing Open Valve Functionality")
    print("=" * 50)
    
    # Create engine instance
    engine = SmartGardenEngine(total_valves=2, total_sensors=2)
    
    # Add a test plant
    print("📝 Adding test plant...")
    engine.add_plant(
        plant_id=1,
        desired_moisture=65.0,
        plant_lat=32.7940,
        plant_lon=34.9896
    )
    print("✅ Test plant added successfully")
    
    # Create handler
    handler = OpenValveHandler(engine)
    
    # Test 1: Valid open valve request
    print("\n🔧 Test 1: Valid open valve request (5 minutes)")
    result = await handler.handle(plant_id=1, time_minutes=5)
    print(f"Result: {result.status}")
    print(f"Message: {result.message}")
    
    # Test 2: Invalid plant ID
    print("\n🔧 Test 2: Invalid plant ID")
    result = await handler.handle(plant_id=999, time_minutes=5)
    print(f"Result: {result.status}")
    print(f"Message: {result.message}")
    
    # Test 3: Invalid time
    print("\n🔧 Test 3: Invalid time (0 minutes)")
    result = await handler.handle(plant_id=1, time_minutes=0)
    print(f"Result: {result.status}")
    print(f"Message: {result.message}")
    
    # Test 4: Negative time
    print("\n🔧 Test 4: Negative time")
    result = await handler.handle(plant_id=1, time_minutes=-5)
    print(f"Result: {result.status}")
    print(f"Message: {result.message}")
    
    print("\n✅ Open valve tests completed!")


async def test_engine_open_valve():
    """Test the engine's open_valve method directly."""
    print("\n🧪 Testing Engine Open Valve Method")
    print("=" * 50)
    
    # Create engine instance
    engine = SmartGardenEngine(total_valves=2, total_sensors=2)
    
    # Add a test plant
    print("📝 Adding test plant...")
    engine.add_plant(
        plant_id=1,
        desired_moisture=65.0,
        plant_lat=32.7940,
        plant_lon=34.9896
    )
    print("✅ Test plant added successfully")
    
    # Test direct engine method
    print("\n🔧 Testing engine.open_valve method (3 seconds)")
    try:
        success = await engine.open_valve(plant_id=1, time_minutes=0.05)  # 3 seconds
        print(f"Success: {success}")
    except Exception as e:
        print(f"Error: {e}")
    
    print("\n✅ Engine open valve test completed!")


if __name__ == "__main__":
    print("🚀 Starting Open Valve Tests")
    print("=" * 50)
    
    # Run tests
    asyncio.run(test_open_valve())
    asyncio.run(test_engine_open_valve())
    
    print("\n🎉 All tests completed!") 