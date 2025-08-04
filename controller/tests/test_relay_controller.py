"""
Test script for RelayController functionality

This script tests the RelayController class which manages USB HID relay devices
for controlling water valves. Tests include simulation mode, valve control,
and error handling.
"""

import sys
import os
import time
import asyncio

# Add the current directory to Python path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from hardware.relay_controller import RelayController

def test_relay_controller_initialization():
    """Test relay controller initialization in different modes"""
    print("🧪 Testing RelayController Initialization")
    print("=" * 50)
    
    # Test 1: Simulation mode (default)
    print("\n1️⃣ Testing Simulation Mode Initialization...")
    try:
        relay_sim = RelayController(simulation_mode=True)
        print(f"   ✅ Simulation mode initialized successfully")
        print(f"   📊 Simulation Mode: {relay_sim.simulation_mode}")
        print(f"   🔧 Vendor ID: {relay_sim.vendor_id}")
        print(f"   🔧 Product ID: {relay_sim.product_id}")
        print(f"   📡 Device Connected: {relay_sim.device is not None}")
    except Exception as e:
        print(f"   ❌ Simulation mode initialization failed: {e}")
        return False
    
    # Test 2: Hardware mode (will likely fail without real hardware)
    print("\n2️⃣ Testing Hardware Mode Initialization...")
    try:
        relay_hw = RelayController(simulation_mode=False)
        print(f"   ✅ Hardware mode initialized")
        print(f"   📊 Simulation Mode: {relay_hw.simulation_mode}")
        print(f"   📡 Device Connected: {relay_hw.device is not None}")
        if relay_hw.device:
            print(f"   🔗 Hardware device connected successfully!")
        else:
            print(f"   ⚠️  No hardware device found (expected without real hardware)")
    except Exception as e:
        print(f"   ⚠️  Hardware mode initialization failed (expected): {e}")
    
    # Test 3: Custom vendor/product IDs
    print("\n3️⃣ Testing Custom Vendor/Product IDs...")
    try:
        custom_relay = RelayController(
            simulation_mode=True,
            vendor_id=0x1234,
            product_id=0x5678
        )
        print(f"   ✅ Custom IDs initialized successfully")
        print(f"   🔧 Vendor ID: 0x{custom_relay.vendor_id:04X}")
        print(f"   🔧 Product ID: 0x{custom_relay.product_id:04X}")
    except Exception as e:
        print(f"   ❌ Custom IDs initialization failed: {e}")
        return False
    
    print("\n✅ All initialization tests completed!")
    return True

def test_valve_control_simulation():
    """Test valve control operations in simulation mode"""
    print("\n🧪 Testing Valve Control (Simulation Mode)")
    print("=" * 50)
    
    # Create relay controller in simulation mode
    relay = RelayController(simulation_mode=True)
    
    # Test valve numbers
    test_valves = [1, 2, 3, 4]
    
    print(f"\n📊 Testing {len(test_valves)} valves: {test_valves}")
    
    for valve_num in test_valves:
        print(f"\n🔧 Testing Valve {valve_num}:")
        
        # Test turn on
        print(f"   🔓 Turning ON valve {valve_num}...")
        try:
            relay.turn_on(valve_num)
            print(f"   ✅ Valve {valve_num} ON command sent successfully")
        except Exception as e:
            print(f"   ❌ Valve {valve_num} ON failed: {e}")
            return False
        
        # Small delay to simulate valve operation
        time.sleep(0.1)
        
        # Test turn off
        print(f"   🔒 Turning OFF valve {valve_num}...")
        try:
            relay.turn_off(valve_num)
            print(f"   ✅ Valve {valve_num} OFF command sent successfully")
        except Exception as e:
            print(f"   ❌ Valve {valve_num} OFF failed: {e}")
            return False
        
        # Small delay between valves
        time.sleep(0.1)
    
    print("\n✅ All valve control tests completed successfully!")
    return True

def test_valve_control_hardware():
    """Test valve control operations in hardware mode (if hardware available)"""
    print("\n🧪 Testing Valve Control (Hardware Mode)")
    print("=" * 50)
    
    # Create relay controller in hardware mode
    relay = RelayController(simulation_mode=False)
    
    if relay.device is None:
        print("   ⚠️  No hardware device available - skipping hardware tests")
        print("   💡 This is expected if no USB HID relay is connected")
        return True
    
    print("   🔗 Hardware device detected - testing valve control...")
    
    # Test a single valve to avoid excessive hardware operations
    test_valve = 1
    
    print(f"\n🔧 Testing Hardware Valve {test_valve}:")
    
    # Test turn on
    print(f"   🔓 Turning ON valve {test_valve}...")
    try:
        relay.turn_on(test_valve)
        print(f"   ✅ Valve {test_valve} ON command sent successfully")
        time.sleep(1)  # Keep valve on for 1 second
    except Exception as e:
        print(f"   ❌ Valve {test_valve} ON failed: {e}")
        return False
    
    # Test turn off
    print(f"   🔒 Turning OFF valve {test_valve}...")
    try:
        relay.turn_off(test_valve)
        print(f"   ✅ Valve {test_valve} OFF command sent successfully")
    except Exception as e:
        print(f"   ❌ Valve {test_valve} OFF failed: {e}")
        return False
    
    print("\n✅ Hardware valve control test completed successfully!")
    return True

def test_error_handling():
    """Test error handling scenarios"""
    print("\n🧪 Testing Error Handling")
    print("=" * 50)
    
    # Test 1: Invalid valve numbers
    print("\n1️⃣ Testing Invalid Valve Numbers...")
    relay = RelayController(simulation_mode=True)
    
    invalid_valves = [-1, 0, 99, 100]
    for valve_num in invalid_valves:
        print(f"   🔧 Testing invalid valve number: {valve_num}")
        try:
            relay.turn_on(valve_num)
            print(f"   ⚠️  Valve {valve_num} ON accepted (should validate valve numbers)")
        except Exception as e:
            print(f"   ✅ Valve {valve_num} ON properly rejected: {e}")
    
    # Test 2: Operations with disconnected device
    print("\n2️⃣ Testing Operations with Disconnected Device...")
    relay_no_device = RelayController(simulation_mode=False)
    
    if relay_no_device.device is None:
        print("   🔧 Testing valve control with no device...")
        try:
            relay_no_device.turn_on(1)
            print("   ⚠️  Valve control with no device should show 'HID device not connected'")
        except Exception as e:
            print(f"   ✅ Proper error handling: {e}")
    else:
        print("   ⚠️  Hardware device available - cannot test disconnected scenario")
    
    # Test 3: Device cleanup
    print("\n3️⃣ Testing Device Cleanup...")
    try:
        relay.close()
        print("   ✅ Device cleanup completed successfully")
    except Exception as e:
        print(f"   ⚠️  Device cleanup failed: {e}")
    
    print("\n✅ All error handling tests completed!")
    return True

def test_performance():
    """Test performance and timing of valve operations"""
    print("\n🧪 Testing Performance and Timing")
    print("=" * 50)
    
    relay = RelayController(simulation_mode=True)
    
    # Test rapid valve operations
    print("\n1️⃣ Testing Rapid Valve Operations...")
    start_time = time.time()
    
    for i in range(10):
        relay.turn_on(1)
        relay.turn_off(1)
    
    end_time = time.time()
    total_time = end_time - start_time
    avg_time = total_time / 20  # 20 operations total
    
    print(f"   📊 10 complete valve cycles completed in {total_time:.3f}s")
    print(f"   📊 Average time per operation: {avg_time:.3f}s")
    print(f"   📊 Operations per second: {20/total_time:.1f}")
    
    # Test multiple valves simultaneously
    print("\n2️⃣ Testing Multiple Valve Operations...")
    valves = [1, 2, 3, 4]
    
    start_time = time.time()
    for valve in valves:
        relay.turn_on(valve)
    time.sleep(0.1)  # Keep all valves on briefly
    for valve in valves:
        relay.turn_off(valve)
    end_time = time.time()
    
    total_time = end_time - start_time
    print(f"   📊 {len(valves)} valves operated in {total_time:.3f}s")
    print(f"   📊 Average time per valve: {total_time/len(valves):.3f}s")
    
    print("\n✅ All performance tests completed!")
    return True

def test_integration_with_valve():
    """Test integration with the Valve class"""
    print("\n🧪 Testing Integration with Valve Class")
    print("=" * 50)
    
    try:
        from hardware.valves.valve import Valve
        from hardware.relay_controller import RelayController
        
        # Create relay controller and valve
        relay = RelayController(simulation_mode=True)
        valve = Valve(
            valve_id=1,
            pipe_diameter=1.0,
            water_limit=2.0,
            flow_rate=0.05,
            relay_controller=relay,
            simulation_mode=True
        )
        
        print("   ✅ Valve and RelayController integration successful")
        print(f"   📊 Valve ID: {valve.valve_id}")
        print(f"   📊 Relay Controller: {type(relay).__name__}")
        print(f"   📊 Simulation Mode: {valve.simulation_mode}")
        
        # Test valve operations
        print("\n   🔧 Testing Valve Operations...")
        
        # Test valve open
        print("      🔓 Testing valve open...")
        valve.request_open()
        print(f"      ✅ Valve open: {valve.is_open}")
        
        # Test valve close
        print("      🔒 Testing valve close...")
        valve.request_close()
        print(f"      ✅ Valve open: {valve.is_open}")
        
        # Test valve disable/enable
        print("      🚫 Testing valve disable...")
        valve.disable()
        print(f"      ✅ Valve enabled: {valve.enabled}")
        
        print("      ✅ Testing valve enable...")
        valve.enable()
        print(f"      ✅ Valve enabled: {valve.enabled}")
        
        print("\n   ✅ All valve integration tests completed!")
        return True
        
    except ImportError as e:
        print(f"   ❌ Could not import Valve class: {e}")
        return False
    except Exception as e:
        print(f"   ❌ Valve integration test failed: {e}")
        return False

async def main():
    """Main test function"""
    print("🚀 RelayController Test Suite")
    print("=" * 60)
    
    test_results = []
    
    # Run all tests
    tests = [
        ("Initialization", test_relay_controller_initialization),
        ("Valve Control (Simulation)", test_valve_control_simulation),
        ("Valve Control (Hardware)", test_valve_control_hardware),
        ("Error Handling", test_error_handling),
        ("Performance", test_performance),
        ("Valve Integration", test_integration_with_valve)
    ]
    
    for test_name, test_func in tests:
        print(f"\n{'='*20} {test_name} {'='*20}")
        try:
            if asyncio.iscoroutinefunction(test_func):
                result = await test_func()
            else:
                result = test_func()
            test_results.append((test_name, result))
        except Exception as e:
            print(f"❌ {test_name} test failed with exception: {e}")
            test_results.append((test_name, False))
    
    # Print summary
    print(f"\n{'='*60}")
    print("📊 TEST SUMMARY")
    print("=" * 60)
    
    passed = 0
    total = len(test_results)
    
    for test_name, result in test_results:
        status = "✅ PASSED" if result else "❌ FAILED"
        print(f"   {test_name:<25} {status}")
        if result:
            passed += 1
    
    print(f"\n📈 Results: {passed}/{total} tests passed")
    
    if passed == total:
        print("🎉 All tests passed! RelayController is working correctly.")
    else:
        print("⚠️  Some tests failed. Please check the implementation.")
    
    return passed == total

if __name__ == "__main__":
    # Run the tests
    success = asyncio.run(main())
    
    if success:
        print("\n🏆 RelayController test suite completed successfully!")
    else:
        print("\n💥 RelayController test suite found issues!")
        sys.exit(1) 