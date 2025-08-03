"""
Test script for Enhanced MoistureUpdate DTO

This script tests the enhanced MoistureUpdate DTO that now has:
1. Auto-timestamp setting
2. Convenience methods like success(), error(), plant_moisture(), all_plants_moisture()
3. to_websocket_data() method
4. Status and error message fields
5. Better documentation and optional fields

Verifies that the DTO works like the AddPlantRequest DTO.
"""

import asyncio
from controller.dto.moisture_update import MoistureUpdate
import time

def test_basic_dto_creation():
    """Test basic DTO creation and auto-timestamp"""
    print("🧪 Testing Basic DTO Creation...")
    
    # Test auto-timestamp
    moisture_update = MoistureUpdate(
        event="test_event",
        plant_id=123,
        moisture=67.5
    )
    
    print(f"✅ Basic DTO created!")
    print(f"   📅 Event: {moisture_update.event}")
    print(f"   🆔 Plant ID: {moisture_update.plant_id}")
    print(f"   💧 Moisture: {moisture_update.moisture}%")
    print(f"   📊 Status: {moisture_update.status}")
    print(f"   ⏰ Auto Timestamp: {moisture_update.timestamp}")
    print(f"   ❌ Error Message: {moisture_update.error_message}")
    
    # Verify auto-timestamp is recent
    current_time = time.time()
    if abs(moisture_update.timestamp - current_time) < 5:  # Within 5 seconds
        print("✅ Auto-timestamp is working correctly!")
        return True
    else:
        print("❌ Auto-timestamp failed!")
        return False

def test_convenience_methods():
    """Test the convenience methods for creating DTOs"""
    print("\n🧪 Testing Convenience Methods...")
    
    # Test success method
    success_dto = MoistureUpdate.success(
        event="test_success",
        plant_id=456,
        moisture=72.3
    )
    
    print(f"✅ Success DTO created!")
    print(f"   📊 Status: {success_dto.status}")
    print(f"   💧 Moisture: {success_dto.moisture}%")
    print(f"   ❌ Error Message: {success_dto.error_message}")
    
    # Test error method
    error_dto = MoistureUpdate.error(
        event="test_error",
        plant_id=789,
        error_message="Sensor not responding"
    )
    
    print(f"✅ Error DTO created!")
    print(f"   📊 Status: {error_dto.status}")
    print(f"   💧 Moisture: {error_dto.moisture}")
    print(f"   ❌ Error Message: {error_dto.error_message}")
    
    # Test plant_moisture convenience method
    plant_dto = MoistureUpdate.plant_moisture(
        plant_id=111,
        moisture=55.7
    )
    
    print(f"✅ Plant Moisture DTO created!")
    print(f"   📅 Event: {plant_dto.event}")
    print(f"   💧 Moisture: {plant_dto.moisture}%")
    
    # Test all_plants_moisture convenience method
    all_plants_dto = MoistureUpdate.all_plants_moisture(
        plant_id=222,
        moisture=83.1
    )
    
    print(f"✅ All Plants Moisture DTO created!")
    print(f"   📅 Event: {all_plants_dto.event}")
    print(f"   💧 Moisture: {all_plants_dto.moisture}%")
    
    # Verify correct statuses
    if (success_dto.status == "success" and 
        error_dto.status == "error" and 
        plant_dto.status == "success" and 
        all_plants_dto.status == "success"):
        print("✅ All convenience methods working correctly!")
        return True
    else:
        print("❌ Convenience methods failed!")
        return False

def test_websocket_data_conversion():
    """Test the to_websocket_data() method"""
    print("\n🧪 Testing WebSocket Data Conversion...")
    
    # Create a DTO with all fields
    moisture_update = MoistureUpdate(
        event="conversion_test",
        plant_id=333,
        moisture=91.2,
        status="success",
        error_message=None
    )
    
    # Convert to WebSocket data
    websocket_data = moisture_update.to_websocket_data()
    
    print(f"✅ WebSocket data conversion completed!")
    print(f"   📊 Converted keys: {list(websocket_data.keys())}")
    print(f"   📅 Event: {websocket_data['event']}")
    print(f"   🆔 Plant ID: {websocket_data['plant_id']}")
    print(f"   💧 Moisture: {websocket_data['moisture']}")
    print(f"   📊 Status: {websocket_data['status']}")
    print(f"   ⏰ Timestamp: {websocket_data['timestamp']}")
    
    # Verify all fields are present
    expected_fields = {"event", "plant_id", "moisture", "status", "error_message", "timestamp"}
    actual_fields = set(websocket_data.keys())
    
    if expected_fields == actual_fields:
        print("✅ WebSocket conversion includes all fields!")
        return True
    else:
        missing = expected_fields - actual_fields
        extra = actual_fields - expected_fields
        print(f"❌ WebSocket conversion failed!")
        print(f"   Missing fields: {missing}")
        print(f"   Extra fields: {extra}")
        return False

def test_error_handling():
    """Test error scenarios and None values"""
    print("\n🧪 Testing Error Handling...")
    
    # Test error DTO with None moisture
    error_dto = MoistureUpdate.error(
        event="sensor_failure",
        plant_id=999,
        error_message="Sensor completely offline"
    )
    
    print(f"✅ Error DTO with None moisture!")
    print(f"   💧 Moisture: {error_dto.moisture}")
    print(f"   📊 Status: {error_dto.status}")
    print(f"   ❌ Error: {error_dto.error_message}")
    
    # Test WebSocket conversion with error
    error_websocket = error_dto.to_websocket_data()
    
    if (error_dto.moisture is None and 
        error_dto.status == "error" and 
        error_websocket["moisture"] is None):
        print("✅ Error handling working correctly!")
        return True
    else:
        print("❌ Error handling failed!")
        return False

def test_comparison_with_addplant_dto():
    """Test that MoistureUpdate has similar features to AddPlantRequest"""
    print("\n🧪 Testing Similarity to AddPlantRequest DTO...")
    
    # Test that MoistureUpdate has the same method signatures
    dto = MoistureUpdate.plant_moisture(plant_id=123, moisture=55.0)
    
    # Check for all the features AddPlantRequest has
    features = []
    
    # Auto-timestamp
    if hasattr(dto, 'timestamp') and dto.timestamp is not None:
        features.append("✅ Auto-timestamp")
    else:
        features.append("❌ Auto-timestamp")
    
    # Convenience class methods
    if hasattr(MoistureUpdate, 'success') and hasattr(MoistureUpdate, 'error'):
        features.append("✅ Convenience methods (success/error)")
    else:
        features.append("❌ Convenience methods")
    
    # WebSocket conversion
    if hasattr(dto, 'to_websocket_data'):
        features.append("✅ WebSocket conversion method")
    else:
        features.append("❌ WebSocket conversion method")
    
    # Status and error fields
    if hasattr(dto, 'status') and hasattr(dto, 'error_message'):
        features.append("✅ Status and error fields")
    else:
        features.append("❌ Status and error fields")
    
    # Optional fields
    if dto.error_message is None and dto.status == "success":
        features.append("✅ Optional fields with defaults")
    else:
        features.append("❌ Optional fields with defaults")
    
    print(f"📊 Feature comparison with AddPlantRequest:")
    for feature in features:
        print(f"   {feature}")
    
    # All features should be present
    if all("✅" in feature for feature in features):
        print("✅ MoistureUpdate has all AddPlantRequest features!")
        return True
    else:
        print("❌ MoistureUpdate missing some features!")
        return False

if __name__ == "__main__":
    def run_all_tests():
        print("🚀 Starting Enhanced MoistureUpdate DTO Tests...")
        
        # Test all features
        success1 = test_basic_dto_creation()
        success2 = test_convenience_methods()
        success3 = test_websocket_data_conversion()
        success4 = test_error_handling()
        success5 = test_comparison_with_addplant_dto()
        
        if success1 and success2 and success3 and success4 and success5:
            print("\n🏆 All tests passed! Enhanced MoistureUpdate DTO is working correctly.")
            print("\n✅ Enhanced features added:")
            print("   🔧 Auto-timestamp setting in __init__")
            print("   🎯 Convenience methods: success(), error(), plant_moisture(), all_plants_moisture()")
            print("   📤 to_websocket_data() conversion method")
            print("   📊 Status and error_message fields")
            print("   📝 Better documentation and optional fields")
            print("   🔄 Same pattern as AddPlantRequest DTO")
        else:
            print("\n💥 Some tests failed. Please check the implementation.")
    
    # Run the tests
    run_all_tests()