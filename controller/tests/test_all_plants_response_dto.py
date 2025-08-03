"""
Test AllPlantsResponse DTO Integration

This test verifies that the AllPlantsMoistureResponse DTO works correctly
and that the websocket client properly uses it instead of creating the
response structure manually.
"""

import asyncio
import json
from unittest.mock import Mock, patch, AsyncMock
from controller.services.websocket_client import SmartGardenPiClient
from controller.dto.all_plants_moisture_response import AllPlantsMoistureResponse
from controller.dto.moisture_update import MoistureUpdate

async def test_all_plants_response_dto():
    """Test the AllPlantsMoistureResponse DTO functionality"""
    print("🧪 Testing AllPlantsMoistureResponse DTO...")
    
    # Create some mock MoistureUpdate DTOs
    moisture_updates = [
        MoistureUpdate.all_plants_moisture(plant_id=1, moisture=67.5),
        MoistureUpdate.all_plants_moisture(plant_id=2, moisture=82.3),
        MoistureUpdate.all_plants_moisture(plant_id=3, moisture=45.7)
    ]
    
    # Test success response
    print("\n🔍 Testing Success Response...")
    success_response = AllPlantsMoistureResponse.success(moisture_updates)
    
    print(f"✅ Success response created!")
    print(f"   📊 Status: {success_response.status}")
    print(f"   🔢 Total plants: {success_response.total_plants}")
    print(f"   ⏰ Auto timestamp: {success_response.timestamp}")
    print(f"   ❌ Error message: {success_response.error_message}")
    
    # Test WebSocket conversion
    websocket_data = success_response.to_websocket_data()
    print(f"✅ WebSocket conversion successful!")
    print(f"   📤 Keys: {sorted(websocket_data.keys())}")
    
    # Verify plants data structure
    if len(websocket_data['plants']) == 3:
        print(f"✅ All plants included in response")
        for i, plant in enumerate(websocket_data['plants']):
            print(f"   Plant {i+1}: ID {plant['plant_id']}, Moisture {plant['moisture']:.1f}%")
    else:
        print(f"❌ Incorrect number of plants: {len(websocket_data['plants'])}")
        return False
    
    # Test error response
    print("\n🔍 Testing Error Response...")
    error_updates = [
        MoistureUpdate.error(
            event="all_plants_moisture_update",
            plant_id=0,
            error_message="No plants found"
        )
    ]
    
    error_response = AllPlantsMoistureResponse.error(
        error_message="System error occurred",
        error_updates=error_updates
    )
    
    print(f"✅ Error response created!")
    print(f"   📊 Status: {error_response.status}")
    print(f"   ❌ Error message: {error_response.error_message}")
    print(f"   🔢 Total plants: {error_response.total_plants}")
    
    return True

async def test_websocket_client_uses_response_dto():
    """Test that websocket client properly uses the AllPlantsMoistureResponse DTO"""
    print("\n🧪 Testing WebSocket Client Uses AllPlantsMoistureResponse DTO...")
    
    # Create mock engine and websocket
    mock_engine = Mock()
    mock_websocket = AsyncMock()
    
    # Create WebSocket client
    client = SmartGardenPiClient(engine=mock_engine)
    client.websocket = mock_websocket
    client.plant_id_map = {"plant1": 1, "plant2": 2}
    
    # Create mock response DTO
    moisture_updates = [
        MoistureUpdate.all_plants_moisture(plant_id=1, moisture=67.5),
        MoistureUpdate.all_plants_moisture(plant_id=2, moisture=82.3)
    ]
    mock_response_dto = AllPlantsMoistureResponse.success(moisture_updates)
    
    print("\n🔍 Testing Success Case...")
    
    with patch('controller.handlers.get_all_plants_moisture_handler.handle', 
               return_value=(True, mock_response_dto)) as mock_handler:
        
        test_data = {}
        await client.handle_all_plants_moisture_request(test_data)
        
        # Verify handler was called
        mock_handler.assert_called_once()
        
        # Verify send_message was called with DTO data
        mock_websocket.send.assert_called()
        sent_data = json.loads(mock_websocket.send.call_args[0][0])
        
        print(f"✅ WebSocket message sent")
        print(f"   📤 Message type: {sent_data['type']}")
        print(f"   📊 Status: {sent_data['data']['status']}")
        print(f"   🔢 Total plants: {sent_data['data']['total_plants']}")
        
        # Verify the response structure
        response_data = sent_data['data']
        expected_keys = {'plants', 'total_plants', 'status', 'error_message', 'timestamp'}
        actual_keys = set(response_data.keys())
        
        if expected_keys == actual_keys:
            print("✅ Response has correct structure!")
        else:
            print(f"❌ Response structure mismatch!")
            print(f"   Expected: {expected_keys}")
            print(f"   Actual: {actual_keys}")
            return False
        
        # Verify plants data
        if len(response_data['plants']) == 2:
            print("✅ Correct number of plants in response!")
        else:
            print(f"❌ Wrong number of plants: {len(response_data['plants'])}")
            return False
    
    print("\n🔍 Testing Error Case...")
    
    # Test error case
    error_response_dto = AllPlantsMoistureResponse.error(
        error_message="Test error message"
    )
    
    mock_websocket.reset_mock()
    
    with patch('controller.handlers.get_all_plants_moisture_handler.handle', 
               return_value=(False, error_response_dto)) as mock_handler:
        
        test_data = {}
        await client.handle_all_plants_moisture_request(test_data)
        
        mock_websocket.send.assert_called_once()
        sent_data = json.loads(mock_websocket.send.call_args[0][0])
        
        print(f"✅ Error WebSocket message sent")
        print(f"   📊 Status: {sent_data['data']['status']}")
        print(f"   ❌ Error: {sent_data['data']['error_message']}")
        
        # Verify error response structure
        response_data = sent_data['data']
        if (response_data['status'] == 'error' and 
            response_data['error_message'] == 'Test error message'):
            print("✅ Error response structure correct!")
        else:
            print("❌ Error response structure incorrect!")
            return False
    
    return True

async def test_websocket_client_simplicity():
    """Test that websocket client logic is now much simpler"""
    print("\n🧪 Testing WebSocket Client Simplicity...")
    
    import inspect
    
    # Get the source code of the all plants moisture handling method
    all_plants_source = inspect.getsource(SmartGardenPiClient.handle_all_plants_moisture_request)
    
    print(f"🔍 Analyzing websocket client code...")
    
    # Check that there's no manual response structure creation
    if "plants_moisture = []" in all_plants_source:
        print("❌ WebSocket client still has manual response creation")
        return False
    else:
        print("✅ No manual response structure creation")
    
    if "for moisture_data in" in all_plants_source:
        print("❌ WebSocket client still has DTO iteration logic")
        return False
    else:
        print("✅ No DTO iteration logic in websocket client")
    
    # Check that it uses the DTO directly
    if "response_dto.to_websocket_data()" in all_plants_source:
        print("✅ Uses DTO's to_websocket_data() method")
    else:
        print("❌ Doesn't use DTO's conversion method")
        return False
    
    # Count lines - should be much shorter now
    lines = len(all_plants_source.split('\n'))
    print(f"📏 Method size: {lines} lines")
    
    if lines < 25:  # Should be much smaller
        print("✅ Method is appropriately simplified")
        return True
    else:
        print("❌ Method is still too complex")
        return False

if __name__ == "__main__":
    async def run_all_tests():
        print("🚀 Starting AllPlantsResponse DTO Integration Tests...")
        
        success1 = await test_all_plants_response_dto()
        success2 = await test_websocket_client_uses_response_dto()
        success3 = await test_websocket_client_simplicity()
        
        if success1 and success2 and success3:
            print("\n🎉 All tests passed! AllPlantsResponse DTO integration successful.")
            print("\n✅ Verified:")
            print("   📦 AllPlantsMoistureResponse DTO works correctly")
            print("   🔧 WebSocket client uses the DTO properly")
            print("   🧹 WebSocket client logic is much simpler")
            print("   📊 Response structure is handled by handler, not client")
            print("   🎯 Perfect separation of concerns achieved")
        else:
            print("\n💥 Some tests failed. Integration may be incomplete.")
    
    # Run the tests
    asyncio.run(run_all_tests())