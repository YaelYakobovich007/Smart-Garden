"""
Test script for Add Plant Integration between Server and Raspberry Pi

This script demonstrates the complete add plant flow:
1. Server receives add plant request from user
2. Server sends ADD_PLANT message to Pi via WebSocket
3. Pi processes the message and adds plant to Smart Garden Engine
4. Pi sends confirmation back to server

Run this test to verify the add plant integration works correctly.
"""

import asyncio
import json
from controller.engine.smart_garden_engine import SmartGardenEngine
from controller.services.websocket_client import SmartGardenPiClient
from controller.dto.add_plant_request import AddPlantRequest

class MockWebSocket:
    """Mock WebSocket for testing purposes"""
    def __init__(self):
        self.sent_messages = []
    
    async def send(self, message):
        self.sent_messages.append(json.loads(message))
        print(f"📤 Mock WebSocket sent: {message}")

async def test_add_plant_integration():
    """Test the complete add plant integration flow"""
    print("🧪 Starting Add Plant Integration Test...")
    
    # Step 1: Create Smart Garden Engine
    print("\n1️⃣ Creating Smart Garden Engine...")
    engine = SmartGardenEngine(total_valves=4, total_sensors=4)
    
    # Step 2: Create Pi Client (without actual WebSocket connection)
    print("2️⃣ Creating Pi Client...")
    client = SmartGardenPiClient(engine=engine)
    client.websocket = MockWebSocket()  # Use mock for testing
    
    # Step 3: Simulate server sending ADD_PLANT message
    print("3️⃣ Simulating server ADD_PLANT message...")
    add_plant_message = {
        "type": "ADD_PLANT",
        "data": {
            "plant_id": 123,
            "plant_name": "Test Tomato Plant",
            "desired_moisture": 65.0,
            "water_limit": 1.5,
            "irrigation_days": ["Monday", "Wednesday", "Friday"],
            "irrigation_time": "08:00",
            "plant_type": "vegetable",
            "schedule_data": [
                {
                    "day": "Monday",
                    "time": "08:00",
                    "valve_number": 1
                },
                {
                    "day": "Wednesday", 
                    "time": "08:00",
                    "valve_number": 1
                },
                {
                    "day": "Friday",
                    "time": "08:00", 
                    "valve_number": 1
                }
            ]
        }
    }
    
    # Step 4: Process the ADD_PLANT message
    print("4️⃣ Processing ADD_PLANT message...")
    await client.handle_add_plant_command(add_plant_message["data"])
    
    # Step 5: Verify plant was added to engine
    print("5️⃣ Verifying plant was added to engine...")
    if "123" in client.plant_id_map:
        internal_id = client.plant_id_map["123"]
        if internal_id in engine.plants:
            plant = engine.plants[internal_id]
            print(f"✅ Plant successfully added!")
            print(f"   📊 Internal ID: {internal_id}")
            print(f"   💧 Desired Moisture: {plant.desired_moisture}%")
            print(f"   🚰 Valve ID: {plant.valve.valve_id}")
            print(f"   📡 Sensor Port: {plant.sensor.port}")
            
            # Check if schedule was set
            if plant.schedule:
                print(f"   📅 Schedule: {len(plant.schedule.schedule_data)} entries")
            else:
                print(f"   📅 Schedule: Not set")
        else:
            print("❌ Plant not found in engine!")
            return False
    else:
        print("❌ Plant ID not found in mapping!")
        return False
    
    # Step 6: Verify response was sent back to server
    print("6️⃣ Verifying response to server...")
    mock_ws = client.websocket
    if mock_ws.sent_messages:
        last_message = mock_ws.sent_messages[-1]
        if last_message.get("type") == "ADD_PLANT_COMPLETE":
            data = last_message.get("data", {})
            if data.get("status") == "success":
                print("✅ Success confirmation sent to server!")
                print(f"   🆔 Plant ID: {data.get('plant_id')}")
                print(f"   📛 Plant Name: {data.get('plant_name')}")
                print(f"   🔢 Internal ID: {data.get('internal_plant_id')}")
                print(f"   🚰 Assigned Valve: {data.get('assigned_valve')}")
                print(f"   📡 Assigned Sensor: {data.get('assigned_sensor')}")
            else:
                print(f"❌ Error response: {data.get('error_message')}")
                return False
        else:
            print(f"❌ Unexpected message type: {last_message.get('type')}")
            return False
    else:
        print("❌ No response sent to server!")
        return False
    
    print("\n🎉 Add Plant Integration Test PASSED!")
    return True

async def test_add_plant_dto():
    """Test the AddPlantRequest DTO functionality"""
    print("\n🧪 Testing AddPlantRequest DTO...")
    
    # Test data from WebSocket message
    websocket_data = {
        "plant_id": 456,
        "plant_name": "Test Basil",
        "desired_moisture": 55.0,
        "water_limit": 0.8,
        "plant_type": "herb"
    }
    
    # Create DTO from WebSocket data
    add_plant_request = AddPlantRequest.from_websocket_data(websocket_data)
    
    print(f"✅ DTO created successfully!")
    print(f"   🆔 Plant ID: {add_plant_request.plant_id}")
    print(f"   📛 Plant Name: {add_plant_request.plant_name}")
    print(f"   💧 Desired Moisture: {add_plant_request.desired_moisture}%")
    print(f"   🚰 Water Limit: {add_plant_request.water_limit}L")
    print(f"   🌿 Plant Type: {add_plant_request.plant_type}")
    print(f"   🔧 Pipe Diameter: {add_plant_request.pipe_diameter}cm")
    print(f"   💨 Flow Rate: {add_plant_request.flow_rate}L/s")

if __name__ == "__main__":
    async def run_all_tests():
        print("🚀 Starting Add Plant Integration Tests...")
        
        # Test DTO functionality
        await test_add_plant_dto()
        
        # Test full integration
        success = await test_add_plant_integration()
        
        if success:
            print("\n🏆 All tests passed! Add Plant integration is working correctly.")
        else:
            print("\n💥 Some tests failed. Please check the implementation.")
    
    # Run the tests
    asyncio.run(run_all_tests())