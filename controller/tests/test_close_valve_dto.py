#!/usr/bin/env python3
"""
Test script for CLOSE_VALVE DTOs
"""

import sys
import os
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from controller.dto.close_valve_request import CloseValveRequest, CloseValveResponse


def test_close_valve_request():
    """Test CloseValveRequest DTO"""
    print("Testing CloseValveRequest...")
    
    # Test creation
    request = CloseValveRequest(plant_id=1)
    print(f"Created request: {request}")
    
    # Test to_websocket_data
    ws_data = request.to_websocket_data()
    print(f"WebSocket data: {ws_data}")
    
    expected = {
        "type": "CLOSE_VALVE",
        "data": {
            "plant_id": 1
        }
    }
    
    assert ws_data == expected, f"Expected {expected}, got {ws_data}"
    print("✅ CloseValveRequest.to_websocket_data() works correctly")
    
    # Test from_websocket_data
    reconstructed = CloseValveRequest.from_websocket_data(ws_data["data"])
    print(f"Reconstructed: {reconstructed}")
    
    assert reconstructed.plant_id == request.plant_id, "Plant ID mismatch"
    print("✅ CloseValveRequest.from_websocket_data() works correctly")
    
    print("✅ All CloseValveRequest tests passed!")


def test_close_valve_response():
    """Test CloseValveResponse DTO"""
    print("\nTesting CloseValveResponse...")
    
    # Test success response
    success_response = CloseValveResponse.success(plant_id=1, message="Valve closed successfully")
    print(f"Success response: {success_response}")
    
    success_ws_data = success_response.to_websocket_data()
    print(f"Success WebSocket data: {success_ws_data}")
    
    expected_success = {
        "type": "CLOSE_VALVE_RESPONSE",
        "data": {
            "plant_id": 1,
            "status": "success",
            "message": "Valve closed successfully",
            "error_message": None
        }
    }
    
    assert success_ws_data == expected_success, f"Expected {expected_success}, got {success_ws_data}"
    print("✅ CloseValveResponse.success() works correctly")
    
    # Test error response
    error_response = CloseValveResponse.error(plant_id=1, error_message="Plant not found")
    print(f"Error response: {error_response}")
    
    error_ws_data = error_response.to_websocket_data()
    print(f"Error WebSocket data: {error_ws_data}")
    
    expected_error = {
        "type": "CLOSE_VALVE_RESPONSE",
        "data": {
            "plant_id": 1,
            "status": "error",
            "message": None,
            "error_message": "Plant not found"
        }
    }
    
    assert error_ws_data == expected_error, f"Expected {expected_error}, got {error_ws_data}"
    print("✅ CloseValveResponse.error() works correctly")
    
    # Test from_websocket_data
    reconstructed_success = CloseValveResponse.from_websocket_data(success_ws_data["data"])
    print(f"Reconstructed success: {reconstructed_success}")
    
    assert reconstructed_success.plant_id == success_response.plant_id, "Plant ID mismatch"
    assert reconstructed_success.status == success_response.status, "Status mismatch"
    assert reconstructed_success.message == success_response.message, "Message mismatch"
    print("✅ CloseValveResponse.from_websocket_data() works correctly")
    
    print("✅ All CloseValveResponse tests passed!")


if __name__ == "__main__":
    print("🧪 Testing CLOSE_VALVE DTOs...")
    test_close_valve_request()
    test_close_valve_response()
    print("\n🎉 All CLOSE_VALVE DTO tests passed!") 