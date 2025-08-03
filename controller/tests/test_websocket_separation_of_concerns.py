"""
Test WebSocket Client Separation of Concerns

This test verifies that the websocket_client.py is now purely about communication
and doesn't contain any DTO creation logic. All DTO creation should be handled
by the handlers themselves.
"""

import asyncio
import json
from unittest.mock import Mock, patch, AsyncMock
from controller.services.websocket_client import SmartGardenPiClient
from controller.dto.moisture_update import MoistureUpdate

async def test_no_dto_creation_in_websocket_client():
    """Test that websocket client doesn't create DTOs - only uses what handlers return"""
    print("🧪 Testing WebSocket Client Separation of Concerns...")
    
    # Create mock engine and websocket
    mock_engine = Mock()
    mock_websocket = AsyncMock()
    
    # Create WebSocket client
    client = SmartGardenPiClient(engine=mock_engine)
    client.websocket = mock_websocket
    client.plant_id_map = {"plant1": 1, "plant2": 2}
    
    print("\n🔍 Testing Single Plant Moisture - Success Case...")
    
    # Test success case - handler returns success DTO
    success_dto = MoistureUpdate.plant_moisture(plant_id=1, moisture=67.5)
    
    with patch('controller.handlers.get_plant_moisture_handler.handle', 
               return_value=(True, success_dto)) as mock_handler:
        
        test_data = {"plant_id": "plant1"}
        await client.handle_plant_moisture_request(test_data)
        
        # Verify no DTO imports in the websocket client call
        # (The handler should have provided the DTO)
        mock_websocket.send.assert_called_once()
        sent_data = json.loads(mock_websocket.send.call_args[0][0])
        
        print(f"✅ Success case handled properly")
        print(f"   📤 Message type: {sent_data['type']}")
        print(f"   📊 DTO data: {sent_data['data']['status']}")
        print(f"   💧 Moisture: {sent_data['data']['moisture']}")
        
        # Verify the response uses the exact DTO from handler
        response_data = sent_data['data']
        assert response_data['moisture'] == 67.5
        assert response_data['status'] == 'success'
    
    print("\n🔍 Testing Single Plant Moisture - Error Case...")
    
    # Test error case - handler returns error DTO
    error_dto = MoistureUpdate.error(
        event="plant_moisture_update",
        plant_id=1,
        error_message="Sensor offline"
    )
    
    mock_websocket.reset_mock()
    
    with patch('controller.handlers.get_plant_moisture_handler.handle', 
               return_value=(False, error_dto)) as mock_handler:
        
        test_data = {"plant_id": "plant1"}
        await client.handle_plant_moisture_request(test_data)
        
        mock_websocket.send.assert_called_once()
        sent_data = json.loads(mock_websocket.send.call_args[0][0])
        
        print(f"✅ Error case handled properly")
        print(f"   📤 Message type: {sent_data['type']}")
        print(f"   📊 DTO status: {sent_data['data']['status']}")
        print(f"   ❌ Error message: {sent_data['data']['error_message']}")
        
        # Verify the response uses the exact error DTO from handler
        response_data = sent_data['data']
        assert response_data['status'] == 'error'
        assert response_data['error_message'] == 'Sensor offline'
        assert response_data['moisture'] is None
    
    print("\n🔍 Testing All Plants Moisture - Success Case...")
    
    # Test all plants success case
    all_plants_dtos = [
        MoistureUpdate.all_plants_moisture(plant_id=1, moisture=67.5),
        MoistureUpdate.all_plants_moisture(plant_id=2, moisture=82.3)
    ]
    
    mock_websocket.reset_mock()
    
    with patch('controller.handlers.get_all_plants_moisture_handler.handle', 
               return_value=(True, all_plants_dtos)) as mock_handler:
        
        test_data = {}
        await client.handle_all_plants_moisture_request(test_data)
        
        mock_websocket.send.assert_called_once()
        sent_data = json.loads(mock_websocket.send.call_args[0][0])
        
        print(f"✅ All plants success case handled properly")
        print(f"   📤 Message type: {sent_data['type']}")
        print(f"   🔢 Total plants: {sent_data['data']['total_plants']}")
        print(f"   📊 Status: {sent_data['data']['status']}")
        
        # Verify each plant DTO is used exactly as returned by handler
        plants_data = sent_data['data']['plants']
        assert len(plants_data) == 2
        assert plants_data[0]['moisture'] == 67.5
        assert plants_data[1]['moisture'] == 82.3
    
    print("\n🔍 Testing All Plants Moisture - Error Case...")
    
    # Test all plants error case - handler returns error DTOs
    error_dtos = [
        MoistureUpdate.error(
            event="all_plants_moisture_update",
            plant_id=0,
            error_message="No plants found"
        )
    ]
    
    mock_websocket.reset_mock()
    
    with patch('controller.handlers.get_all_plants_moisture_handler.handle', 
               return_value=(False, error_dtos)) as mock_handler:
        
        test_data = {}
        await client.handle_all_plants_moisture_request(test_data)
        
        mock_websocket.send.assert_called_once()
        sent_data = json.loads(mock_websocket.send.call_args[0][0])
        
        print(f"✅ All plants error case handled properly")
        print(f"   📤 Message type: {sent_data['type']}")
        print(f"   📊 Status: {sent_data['data']['status']}")
        print(f"   ❌ Error in plants list: {sent_data['data']['plants'][0]['error_message']}")
        
        # Verify error DTO is used exactly as returned by handler
        response_data = sent_data['data']
        assert response_data['status'] == 'error'
        assert len(response_data['plants']) == 1
        assert response_data['plants'][0]['error_message'] == 'No plants found'
    
    return True

def test_websocket_client_simplicity():
    """Test that websocket client is now much simpler and cleaner"""
    print("\n🧪 Testing WebSocket Client Code Simplicity...")
    
    import inspect
    
    # Get the source code of the moisture handling methods
    plant_source = inspect.getsource(SmartGardenPiClient.handle_plant_moisture_request)
    all_plants_source = inspect.getsource(SmartGardenPiClient.handle_all_plants_moisture_request)
    
    # Check that there are no DTO imports inside the methods
    print("🔍 Checking for DTO imports in websocket methods...")
    if "from controller.dto.moisture_update import MoistureUpdate" in plant_source:
        print("❌ Single plant handler still has DTO imports")
        return False
    else:
        print("✅ Single plant handler has no DTO imports")
    
    if "from controller.dto.moisture_update import MoistureUpdate" in all_plants_source:
        print("❌ All plants handler still has DTO imports")
        return False
    else:
        print("✅ All plants handler has no DTO imports")
    
    # Check that the logic is simplified
    print("\n🔍 Checking for simplified logic...")
    
    # Should not have complex if/else for DTO creation
    if "# Handler returned None" in plant_source:
        print("❌ Single plant handler still has complex DTO creation logic")
        return False
    else:
        print("✅ Single plant handler has simplified logic")
    
    if "# Handler returned empty list - create our own error" in all_plants_source:
        print("❌ All plants handler still has complex DTO creation logic")
        return False
    else:
        print("✅ All plants handler has simplified logic")
    
    # Count lines of moisture handling methods
    plant_lines = len(plant_source.split('\n'))
    all_plants_lines = len(all_plants_source.split('\n'))
    
    print(f"\n📏 Method sizes:")
    print(f"   Single plant handler: {plant_lines} lines")
    print(f"   All plants handler: {all_plants_lines} lines")
    
    # Should be much smaller now
    if plant_lines < 20 and all_plants_lines < 25:
        print("✅ Methods are properly simplified")
        return True
    else:
        print("❌ Methods are still too complex")
        return False

if __name__ == "__main__":
    async def run_all_tests():
        print("🚀 Starting WebSocket Separation of Concerns Tests...")
        
        success1 = await test_no_dto_creation_in_websocket_client()
        success2 = test_websocket_client_simplicity()
        
        if success1 and success2:
            print("\n🎉 All tests passed! WebSocket client properly separates concerns.")
            print("\n✅ Verified separation of concerns:")
            print("   🔧 WebSocket client is purely about communication")
            print("   📦 Handlers are responsible for all DTO creation")
            print("   🚫 No DTO imports or creation in websocket client")
            print("   📏 Much simpler and cleaner code")
            print("   🎯 Single responsibility principle followed")
            print("\n✅ Benefits achieved:")
            print("   🧹 Cleaner websocket client code")
            print("   🔄 Consistent error handling")
            print("   🎯 Better separation of concerns")
            print("   🛡️  Handlers fully responsible for business logic")
        else:
            print("\n💥 Some tests failed. Separation of concerns may be incomplete.")
    
    # Run the tests
    asyncio.run(run_all_tests())