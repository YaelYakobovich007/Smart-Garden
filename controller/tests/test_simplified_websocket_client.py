"""
Test Simplified WebSocket Client

This test verifies that the simplified websocket_client.py contains only
the essential functionality requested by the user:
1. Initial connection (HELLO_PI, WELCOME)
2. Add plant (ADD_PLANT)
3. Single plant moisture (GET_PLANT_MOISTURE)
4. All plants moisture (GET_ALL_MOISTURE)

And that all the extra functionality has been removed.
"""

import asyncio
import inspect
from controller.services.websocket_client import SmartGardenPiClient

def test_simplified_functionality():
    """Test that only essential methods are present in the simplified client"""
    print("🧪 Testing Simplified WebSocket Client Functionality...")
    
    # Get all methods from the client class
    client_methods = [method for method in dir(SmartGardenPiClient) 
                     if not method.startswith('_') and callable(getattr(SmartGardenPiClient, method))]
    
    print(f"📋 Found {len(client_methods)} public methods:")
    for method in sorted(client_methods):
        print(f"   ✅ {method}")
    
    # Expected essential methods
    essential_methods = {
        'connect',              # Connection
        'disconnect',           # Connection
        'send_message',         # Communication
        'send_hello',           # Initial connection
        'handle_add_plant_command',           # Add plant
        'handle_plant_moisture_request',      # Single plant moisture
        'handle_all_plants_moisture_request', # All plants moisture
        'handle_message',       # Message routing
        'listen_for_messages',  # Message listening
        'run'                   # Main loop
    }
    
    # Methods that should NOT be present (removed)
    removed_methods = {
        'send_sensor_assignment',
        'send_valve_assignment', 
        'send_sensor_data',
        'send_irrigation_complete',
        'handle_irrigation_command',
        'handle_sensor_request'
    }
    
    print(f"\n🔍 Checking for essential methods...")
    missing_essential = essential_methods - set(client_methods)
    if missing_essential:
        print(f"❌ Missing essential methods: {missing_essential}")
        return False
    else:
        print(f"✅ All essential methods present!")
    
    print(f"\n🔍 Checking that removed methods are gone...")
    found_removed = set(client_methods) & removed_methods
    if found_removed:
        print(f"❌ Found methods that should be removed: {found_removed}")
        return False
    else:
        print(f"✅ All unnecessary methods successfully removed!")
    
    return True

def test_message_handling():
    """Test that only essential message types are handled"""
    print("\n🧪 Testing Message Handling...")
    
    # Get the handle_message method source code
    import inspect
    handle_message_source = inspect.getsource(SmartGardenPiClient.handle_message)
    
    # Expected message types that should be handled
    essential_messages = [
        'WELCOME',
        'ADD_PLANT',
        'GET_PLANT_MOISTURE', 
        'GET_ALL_MOISTURE'
    ]
    
    # Messages that should NOT be handled (removed)
    removed_messages = [
        'IRRIGATE_PLANT',
        'GET_SENSOR_DATA'
    ]
    
    print(f"🔍 Checking for essential message handling...")
    for msg_type in essential_messages:
        if msg_type in handle_message_source:
            print(f"   ✅ {msg_type} message handling present")
        else:
            print(f"   ❌ {msg_type} message handling missing")
            return False
    
    print(f"\n🔍 Checking that removed message handling is gone...")
    for msg_type in removed_messages:
        if msg_type in handle_message_source:
            print(f"   ❌ {msg_type} message handling still present (should be removed)")
            return False
        else:
            print(f"   ✅ {msg_type} message handling successfully removed")
    
    return True

def test_class_documentation():
    """Test that class documentation reflects the simplified functionality"""
    print("\n🧪 Testing Class Documentation...")
    
    docstring = SmartGardenPiClient.__doc__
    print(f"📝 Class docstring: {docstring}")
    
    # Check if docstring mentions simplification
    if "Simplified" in docstring or "essential" in docstring:
        print("✅ Documentation reflects simplified functionality")
        return True
    else:
        print("❌ Documentation should mention that this is simplified")
        return False

def test_supported_commands_log():
    """Test that the run method logs only the supported commands"""
    print("\n🧪 Testing Supported Commands Log...")
    
    # Get the run method source code
    run_source = inspect.getsource(SmartGardenPiClient.run)
    
    # Expected commands that should be mentioned in logs
    expected_commands = [
        'WELCOME',
        'ADD_PLANT', 
        'GET_PLANT_MOISTURE',
        'GET_ALL_MOISTURE'
    ]
    
    commands_found = 0
    for cmd in expected_commands:
        if cmd in run_source:
            print(f"   ✅ {cmd} mentioned in supported commands")
            commands_found += 1
        else:
            print(f"   ⚠️  {cmd} not mentioned in logs")
    
    if commands_found >= 3:  # Most commands should be mentioned
        print(f"✅ Supported commands properly documented ({commands_found}/{len(expected_commands)})")
        return True
    else:
        print(f"❌ Not enough commands documented in logs")
        return False

if __name__ == "__main__":
    def run_all_tests():
        print("🚀 Starting Simplified WebSocket Client Tests...")
        
        success1 = test_simplified_functionality()
        success2 = test_message_handling()
        success3 = test_class_documentation()
        success4 = test_supported_commands_log()
        
        if success1 and success2 and success3 and success4:
            print("\n🎉 All tests passed! WebSocket client successfully simplified.")
            print("\n✅ Verified simplifications:")
            print("   🔧 Only essential methods remain")
            print("   📩 Only essential message types handled")
            print("   📝 Documentation updated to reflect simplification")
            print("   💬 Run method logs supported commands")
            print("\n✅ Essential functionality kept:")
            print("   🔌 Initial connection (HELLO_PI, WELCOME)")
            print("   🌱 Add plant (ADD_PLANT)")
            print("   💧 Single plant moisture (GET_PLANT_MOISTURE)")
            print("   🌿 All plants moisture (GET_ALL_MOISTURE)")
            print("\n❌ Removed functionality:")
            print("   🚿 Irrigation commands")
            print("   📊 Legacy sensor requests")
            print("   🔧 Sensor/valve assignments")
            print("   📡 Direct sensor data sending")
        else:
            print("\n💥 Some tests failed. Simplification may be incomplete.")
    
    # Run the tests
    run_all_tests()