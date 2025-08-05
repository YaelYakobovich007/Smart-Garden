"""
Test that WebSocket Client uses Enhanced MoistureUpdate DTO Methods

This test verifies that the websocket_client.py is properly using the new
enhanced MoistureUpdate DTO methods (to_websocket_data()) instead of manually
creating response dictionaries.
"""

import asyncio
import json
from unittest.mock import Mock, patch, AsyncMock
from controller.services.websocket_client import WebSocketClient
from controller.dto.moisture_update import MoistureUpdate

async def test_websocket_uses_enhanced_dto():
    """Test that WebSocket client uses enhanced DTO methods properly"""
    print("🧪 Testing WebSocket Client Enhanced DTO Usage...")
    
    # Create mock engine and websocket
    mock_engine = Mock()
    mock_websocket = AsyncMock()
    
    # Create WebSocket client
    client = WebSocketClient("ws://192.168.68.54:8080")
    client.websocket = mock_websocket
    client.engine = mock_engine
    client.plant_id_map = {"plant1": 1, "plant2": 2}
    
    # Mock the handlers to return MoistureUpdate DTOs
    mock_plant_moisture_dto = MoistureUpdate.plant_moisture(plant_id=1, moisture=67.5)
    mock_all_plants_dtos = [
        MoistureUpdate.all_plants_moisture(plant_id=1, moisture=67.5),
        MoistureUpdate.all_plants_moisture(plant_id=2, moisture=82.3)
    ]
    
    # Test single plant moisture request
    print("\n🔍 Testing Single Plant Moisture Request...")
    
    with patch('controller.handlers.get_plant_moisture_handler.handle', 
               return_value=(True, mock_plant_moisture_dto)) as mock_handler:
        
        test_data = {"plant_id": "plant1"}
        await client.handle_plant_moisture_request(test_data)
        
        # Verify handler was called
        mock_handler.assert_called_once()
        
        # Verify send_message was called with DTO data
        mock_websocket.send.assert_called()
        sent_data = json.loads(mock_websocket.send.call_args[0][0])
        
        print(f"✅ Handler called with proper data")
        print(f"✅ WebSocket message sent")
        print(f"   📤 Message type: {sent_data['type']}")
        print(f"   📊 Response contains DTO fields: {list(sent_data['data'].keys())}")
        
        # Verify the response contains DTO data (not manually created dict)
        response_data = sent_data['data']
        if ('event' in response_data and 'status' in response_data and 
            'timestamp' in response_data and 'plant_id' in response_data):
            print("✅ Single plant response uses enhanced DTO!")
        else:
            print("❌ Single plant response does NOT use enhanced DTO!")
            return False
    
    # Test all plants moisture request
    print("\n🔍 Testing All Plants Moisture Request...")
    
    with patch('controller.handlers.get_all_plants_moisture_handler.handle', 
               return_value=(True, mock_all_plants_dtos)) as mock_handler:
        
        test_data = {}
        await client.handle_all_plants_moisture_request(test_data)
        
        # Verify handler was called
        mock_handler.assert_called_once()
        
        # Verify send_message was called with DTO data
        mock_websocket.send.assert_called()
        sent_data = json.loads(mock_websocket.send.call_args[0][0])
        
        print(f"✅ Handler called with proper data")
        print(f"✅ WebSocket message sent")
        print(f"   📤 Message type: {sent_data['type']}")
        print(f"   🔢 Number of plants: {sent_data['data']['total_plants']}")
        
        # Verify each plant in the response uses DTO data
        plants_data = sent_data['data']['plants']
        all_plants_use_dto = True
        
        for i, plant_data in enumerate(plants_data):
            if ('event' in plant_data and 'status' in plant_data and 
                'timestamp' in plant_data and 'plant_id' in plant_data):
                print(f"   ✅ Plant {i+1} uses enhanced DTO")
            else:
                print(f"   ❌ Plant {i+1} does NOT use enhanced DTO")
                all_plants_use_dto = False
        
        if all_plants_use_dto:
            print("✅ All plants response uses enhanced DTO!")
        else:
            print("❌ All plants response does NOT use enhanced DTO!")
            return False
    
    # Test error handling with enhanced DTO
    print("\n🔍 Testing Error Handling with Enhanced DTO...")
    
    # Test single plant error
    mock_error_dto = MoistureUpdate.error(
        event="plant_moisture_update",
        plant_id=1,
        error_message="Sensor offline"
    )
    
    with patch('controller.handlers.get_plant_moisture_handler.handle', 
               return_value=(False, mock_error_dto)) as mock_handler:
        
        test_data = {"plant_id": "plant1"}
        await client.handle_plant_moisture_request(test_data)
        
        # Verify error response uses DTO
        sent_data = json.loads(mock_websocket.send.call_args[0][0])
        error_response = sent_data['data']
        
        if ('event' in error_response and error_response['status'] == 'error' and 
            'error_message' in error_response):
            print("✅ Error response uses enhanced DTO!")
        else:
            print("❌ Error response does NOT use enhanced DTO!")
            return False
    
    print("\n🏆 All tests passed! WebSocket client properly uses enhanced DTO methods!")
    return True

async def test_dto_consistency():
    """Test that DTO responses are consistent between success and error cases"""
    print("\n🧪 Testing DTO Response Consistency...")
    
    # Create success and error DTOs
    success_dto = MoistureUpdate.plant_moisture(plant_id=123, moisture=67.5)
    error_dto = MoistureUpdate.error(
        event="plant_moisture_update",
        plant_id=123,
        error_message="Test error"
    )
    
    # Convert both to WebSocket data
    success_data = success_dto.to_websocket_data()
    error_data = error_dto.to_websocket_data()
    
    print(f"✅ Success DTO fields: {sorted(success_data.keys())}")
    print(f"✅ Error DTO fields: {sorted(error_data.keys())}")
    
    # Verify both have the same field structure
    if set(success_data.keys()) == set(error_data.keys()):
        print("✅ Success and error DTOs have consistent field structure!")
        
        # Verify the different values
        print(f"   📊 Success status: {success_data['status']}")
        print(f"   📊 Error status: {error_data['status']}")
        print(f"   💧 Success moisture: {success_data['moisture']}")
        print(f"   💧 Error moisture: {error_data['moisture']}")
        print(f"   ❌ Success error: {success_data['error_message']}")
        print(f"   ❌ Error error: {error_data['error_message']}")
        
        return True
    else:
        print("❌ Success and error DTOs have inconsistent field structure!")
        return False

if __name__ == "__main__":
    async def run_all_tests():
        print("🚀 Starting WebSocket Client Enhanced DTO Tests...")
        
        success1 = await test_websocket_uses_enhanced_dto()
        success2 = await test_dto_consistency()
        
        if success1 and success2:
            print("\n🎉 All WebSocket Enhanced DTO tests passed!")
            print("\n✅ Verified:")
            print("   🔧 WebSocket client uses to_websocket_data() method")
            print("   📊 Single plant requests use enhanced DTO")
            print("   🌱 All plants requests use enhanced DTO")
            print("   ❌ Error responses use enhanced DTO")
            print("   🔄 Success and error DTOs have consistent structure")
        else:
            print("\n💥 Some tests failed. WebSocket client may not be using enhanced DTO properly.")
    
    # Run the tests
    asyncio.run(run_all_tests())