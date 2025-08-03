"""
Test script for Moisture Handler Integration

This script demonstrates the complete moisture request flow:
1. Server requests moisture for single plant via WebSocket
2. Server requests moisture for all plants via WebSocket  
3. Pi processes requests using moisture handlers
4. Pi returns moisture data using MoistureUpdate DTO
5. Pi sends response back to server

Run this test to verify the moisture integration works correctly.
"""

import asyncio
import json
from controller.engine.smart_garden_engine import SmartGardenEngine
from controller.services.websocket_client import SmartGardenPiClient
from controller.handlers.get_plant_moisture_handler import handle as handle_single_plant_moisture
from controller.handlers.get_all_plants_moisture_handler import handle as handle_all_plants_moisture
from controller.dto.moisture_update import MoistureUpdate

class MockWebSocket:
    """Mock WebSocket for testing purposes"""
    def __init__(self):
        self.sent_messages = []
    
    async def send(self, message):
        self.sent_messages.append(json.loads(message))
        print(f"📤 Mock WebSocket sent: {message}")

async def test_single_plant_moisture_handler():
    """Test the single plant moisture handler directly"""
    print("🧪 Testing Single Plant Moisture Handler (Direct)...")
    
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
    plant_id_map = {"123": 1}  # Server ID 123 maps to internal ID 1
    
    # Step 3: Test moisture request for single plant
    print("2️⃣ Testing moisture request for single plant...")
    request_data = {
        "plant_id": 123
    }
    
    success, moisture_data = await handle_single_plant_moisture(
        data=request_data,
        smart_engine=engine,
        plant_id_map=plant_id_map
    )
    
    if success and moisture_data:
        print(f"✅ Single plant moisture test PASSED!")
        print(f"   🆔 Plant ID: {moisture_data.plant_id}")
        print(f"   💧 Moisture: {moisture_data.moisture:.1f}%")
        print(f"   📅 Event: {moisture_data.event}")
        print(f"   ⏰ Timestamp: {moisture_data.timestamp}")
    else:
        print("❌ Single plant moisture test FAILED!")
        return False
    
    return True

async def test_all_plants_moisture_handler():
    """Test the all plants moisture handler directly"""
    print("🧪 Testing All Plants Moisture Handler (Direct)...")
    
    # Step 1: Create Smart Garden Engine
    print("\n1️⃣ Creating Smart Garden Engine...")
    engine = SmartGardenEngine(total_valves=4, total_sensors=4)
    
    # Add multiple test plants
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
    
    # Step 2: Create plant ID mapping
    plant_id_map = {"123": 1, "456": 2}  # Multiple plants
    
    # Step 3: Test moisture request for all plants
    print("2️⃣ Testing moisture request for all plants...")
    request_data = {}  # No specific plant_id for all plants request
    
    success, response_dto = await handle_all_plants_moisture(
        data=request_data,
        smart_engine=engine,
        plant_id_map=plant_id_map
    )
    
    if success and response_dto:
        print(f"✅ All plants moisture test PASSED!")
        print(f"   📊 Total plants: {response_dto.total_plants}")
        print(f"   📊 Status: {response_dto.status}")
        for i, plant_data in enumerate(response_dto.plants):
            print(f"   Plant {i+1}: ID {plant_data['plant_id']}, Moisture {plant_data['moisture']:.1f}%")
    else:
        print("❌ All plants moisture test FAILED!")
        if response_dto:
            print(f"   Error: {response_dto.error_message}")
        return False
    
    return True

async def test_single_plant_moisture_integration():
    """Test the complete single plant moisture integration flow via WebSocket client"""
    print("\n🧪 Testing Single Plant Moisture Integration (WebSocket)...")
    
    # Step 1: Create Smart Garden Engine
    print("\n1️⃣ Creating Smart Garden Engine...")
    engine = SmartGardenEngine(total_valves=4, total_sensors=4)
    
    # Step 2: Create Pi Client
    print("2️⃣ Creating Pi Client...")
    client = SmartGardenPiClient(engine=engine)
    client.websocket = MockWebSocket()  # Use mock for testing
    client.plant_id_map = {"456": 1}  # Add some test mapping
    
    # Add a test plant to the engine
    engine.add_plant(
        plant_id=1,
        desired_moisture=70.0,
        plant_lat=32.7940,
        plant_lon=34.9896,
        pipe_diameter=1.0,
        flow_rate=0.05,
        water_limit=1.0
    )
    
    # Step 3: Simulate server requesting plant moisture
    print("3️⃣ Simulating server GET_PLANT_MOISTURE message...")
    moisture_request_message = {
        "type": "GET_PLANT_MOISTURE",
        "data": {
            "plant_id": 456
        }
    }
    
    # Step 4: Process the GET_PLANT_MOISTURE message
    print("4️⃣ Processing GET_PLANT_MOISTURE message...")
    await client.handle_plant_moisture_request(moisture_request_message["data"])
    
    # Step 5: Verify response was sent back to server
    print("5️⃣ Verifying response to server...")
    mock_ws = client.websocket
    if mock_ws.sent_messages:
        last_message = mock_ws.sent_messages[-1]
        if last_message.get("type") == "PLANT_MOISTURE_RESPONSE":
            data = last_message.get("data", {})
            print("✅ Plant moisture response sent to server!")
            print(f"   🆔 Plant ID: {data.get('plant_id')}")
            print(f"   💧 Moisture: {data.get('moisture'):.1f}%")
            print(f"   📊 Status: {data.get('status')}")
            print(f"   ⏰ Timestamp: {data.get('timestamp')}")
        else:
            print(f"❌ Unexpected message type: {last_message.get('type')}")
            return False
    else:
        print("❌ No response sent to server!")
        return False
    
    print("\n🎉 Single Plant Moisture Integration Test PASSED!")
    return True

async def test_all_plants_moisture_integration():
    """Test the complete all plants moisture integration flow via WebSocket client"""
    print("\n🧪 Testing All Plants Moisture Integration (WebSocket)...")
    
    # Step 1: Create Smart Garden Engine
    print("\n1️⃣ Creating Smart Garden Engine...")
    engine = SmartGardenEngine(total_valves=4, total_sensors=4)
    
    # Step 2: Create Pi Client
    print("2️⃣ Creating Pi Client...")
    client = SmartGardenPiClient(engine=engine)
    client.websocket = MockWebSocket()  # Use mock for testing
    client.plant_id_map = {"123": 1, "456": 2}  # Multiple test mappings
    
    # Add multiple test plants to the engine
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
        desired_moisture=75.0,
        plant_lat=32.7940,
        plant_lon=34.9896,
        pipe_diameter=1.0,
        flow_rate=0.05,
        water_limit=1.0
    )
    
    # Step 3: Simulate server requesting all plants moisture
    print("3️⃣ Simulating server GET_ALL_MOISTURE message...")
    all_moisture_request_message = {
        "type": "GET_ALL_MOISTURE",
        "data": {}
    }
    
    # Step 4: Process the GET_ALL_MOISTURE message
    print("4️⃣ Processing GET_ALL_MOISTURE message...")
    await client.handle_all_plants_moisture_request(all_moisture_request_message["data"])
    
    # Step 5: Verify response was sent back to server
    print("5️⃣ Verifying response to server...")
    mock_ws = client.websocket
    if mock_ws.sent_messages:
        last_message = mock_ws.sent_messages[-1]
        if last_message.get("type") == "ALL_MOISTURE_RESPONSE":
            data = last_message.get("data", {})
            print("✅ All plants moisture response sent to server!")
            print(f"   📊 Status: {data.get('status')}")
            print(f"   🌱 Total plants: {data.get('total_plants')}")
            
            plants = data.get('plants', [])
            for i, plant in enumerate(plants):
                print(f"   Plant {i+1}: ID {plant.get('plant_id')}, Moisture {plant.get('moisture'):.1f}%")
        else:
            print(f"❌ Unexpected message type: {last_message.get('type')}")
            return False
    else:
        print("❌ No response sent to server!")
        return False
    
    print("\n🎉 All Plants Moisture Integration Test PASSED!")
    return True

async def test_moisture_update_dto():
    """Test the enhanced MoistureUpdate DTO functionality"""
    print("\n🧪 Testing Enhanced MoistureUpdate DTO...")
    
    # Test creating DTO using convenience method
    moisture_data = MoistureUpdate.plant_moisture(
        plant_id=123,
        moisture=67.5
    )
    
    print(f"✅ DTO created successfully using convenience method!")
    print(f"   📅 Event: {moisture_data.event}")
    print(f"   🆔 Plant ID: {moisture_data.plant_id}")
    print(f"   💧 Moisture: {moisture_data.moisture}%")
    print(f"   📊 Status: {moisture_data.status}")
    print(f"   ⏰ Auto Timestamp: {moisture_data.timestamp}")
    
    # Test WebSocket conversion
    websocket_data = moisture_data.to_websocket_data()
    print(f"✅ WebSocket conversion successful!")
    print(f"   📤 Keys: {list(websocket_data.keys())}")
    
    # Test error DTO
    error_data = MoistureUpdate.error(
        event="test_error",
        plant_id=456,
        error_message="Test error message"
    )
    print(f"✅ Error DTO created!")
    print(f"   📊 Status: {error_data.status}")
    print(f"   ❌ Error: {error_data.error_message}")

if __name__ == "__main__":
    async def run_all_tests():
        print("🚀 Starting Moisture Handler Tests...")
        
        # Test DTO functionality
        await test_moisture_update_dto()
        
        # Test single plant moisture handler directly
        success1 = await test_single_plant_moisture_handler()
        
        # Test all plants moisture handler directly
        success2 = await test_all_plants_moisture_handler()
        
        # Test single plant moisture integration
        success3 = await test_single_plant_moisture_integration()
        
        # Test all plants moisture integration
        success4 = await test_all_plants_moisture_integration()
        
        if success1 and success2 and success3 and success4:
            print("\n🏆 All tests passed! Moisture integration is working correctly.")
            print("\n✅ Supported message types:")
            print("   📤 GET_PLANT_MOISTURE → PLANT_MOISTURE_RESPONSE")
            print("   📤 GET_ALL_MOISTURE → ALL_MOISTURE_RESPONSE")
            print("   📤 GET_SENSOR_DATA → PLANT_MOISTURE_RESPONSE (legacy support)")
        else:
            print("\n💥 Some tests failed. Please check the implementation.")
    
    # Run the tests
    asyncio.run(run_all_tests())