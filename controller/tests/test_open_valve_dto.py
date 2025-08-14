import sys
import os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from controller.dto.open_valve_request import OpenValveRequest, OpenValveResponse


def test_open_valve_request():
    """Test the OpenValveRequest DTO."""
    print("🧪 Testing OpenValveRequest DTO")
    print("=" * 50)
    
    # Test 1: Create from parameters
    print("\n📝 Test 1: Create from parameters")
    request = OpenValveRequest(
        plant_id=1,
        time_minutes=10,
        status="pending"
    )
    print(f"Request: {request}")
    print(f"Plant ID: {request.plant_id}")
    print(f"Time Minutes: {request.time_minutes}")
    print(f"Status: {request.status}")
    
    # Test 2: Create success request
    print("\n📝 Test 2: Create success request")
    success_request = OpenValveRequest.success(1, 15, "Valve opened successfully")
    print(f"Success Request: {success_request}")
    print(f"Status: {success_request.status}")
    print(f"Message: {success_request.message}")
    
    # Test 3: Create error request
    print("\n📝 Test 3: Create error request")
    error_request = OpenValveRequest.error(1, "Plant not found")
    print(f"Error Request: {error_request}")
    print(f"Status: {error_request.status}")
    print(f"Error Message: {error_request.error_message}")
    
    # Test 4: Convert to WebSocket data
    print("\n📝 Test 4: Convert to WebSocket data")
    ws_data = request.to_websocket_data()
    print(f"WebSocket Data: {ws_data}")
    
    # Test 5: Create from WebSocket data
    print("\n📝 Test 5: Create from WebSocket data")
    parsed_request = OpenValveRequest.from_websocket_data(ws_data)
    print(f"Parsed Request: {parsed_request}")
    
    print("\n✅ OpenValveRequest tests completed!")


def test_open_valve_response():
    """Test the OpenValveResponse DTO."""
    print("\n🧪 Testing OpenValveResponse DTO")
    print("=" * 50)
    
    # Test 1: Create from parameters
    print("\n📝 Test 1: Create from parameters")
    response = OpenValveResponse(
        plant_id=1,
        time_minutes=10,
        status="success"
    )
    print(f"Response: {response}")
    print(f"Plant ID: {response.plant_id}")
    print(f"Time Minutes: {response.time_minutes}")
    print(f"Status: {response.status}")
    
    # Test 2: Create success response
    print("\n📝 Test 2: Create success response")
    success_response = OpenValveResponse.success(1, 15, "Valve opened successfully")
    print(f"Success Response: {success_response}")
    print(f"Status: {success_response.status}")
    print(f"Message: {success_response.message}")
    
    # Test 3: Create error response
    print("\n📝 Test 3: Create error response")
    error_response = OpenValveResponse.error(1, "Plant not found")
    print(f"Error Response: {error_response}")
    print(f"Status: {error_response.status}")
    print(f"Error Message: {error_response.error_message}")
    
    # Test 4: Convert to WebSocket data
    print("\n📝 Test 4: Convert to WebSocket data")
    ws_data = response.to_websocket_data()
    print(f"WebSocket Data: {ws_data}")
    
    print("\n✅ OpenValveResponse tests completed!")


def test_dto_integration():
    """Test DTO integration with handler."""
    print("\n🧪 Testing DTO Integration")
    print("=" * 50)
    
    # Test 1: Simulate handler response
    print("\n📝 Test 1: Simulate handler response")
    from controller.dto.open_valve_request import OpenValveResponse
    
    # Success case
    success_response = OpenValveResponse.success(1, 10, "Valve opened for 10 minutes")
    print(f"Success Response: {success_response}")
    print(f"WebSocket Data: {success_response.to_websocket_data()}")
    
    # Error case
    error_response = OpenValveResponse.error(1, "Invalid plant ID")
    print(f"Error Response: {error_response}")
    print(f"WebSocket Data: {error_response.to_websocket_data()}")
    
    print("\n✅ DTO Integration tests completed!")


if __name__ == "__main__":
    print("🚀 Starting Open Valve DTO Tests")
    print("=" * 50)
    
    # Run tests
    test_open_valve_request()
    test_open_valve_response()
    test_dto_integration()
    
    print("\n🎉 All DTO tests completed!") 