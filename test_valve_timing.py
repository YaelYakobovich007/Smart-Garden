#!/usr/bin/env python3
"""
Test script to debug valve timing issues in the Smart Garden system.
This script tests the manual irrigation timing to ensure valves stay open for the full duration.
"""

import asyncio
import sys
import os
import time
from datetime import datetime

# Add the controller directory to the path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), 'controller'))

from controller.engine.smart_garden_engine import SmartGardenEngine

async def test_valve_timing():
    """
    Test valve timing functionality to ensure valves stay open for the specified duration.
    """
    print("🧪 Testing Valve Timing Functionality")
    print("=" * 50)
    
    # Initialize the Smart Garden Engine
    print("🔧 Initializing Smart Garden Engine...")
    engine = SmartGardenEngine(total_valves=2, total_sensors=2)
    
    # Add a test plant
    print("🌱 Adding test plant...")
    await engine.add_plant(
        plant_id=1,
        desired_moisture=60.0,
        water_limit=2.0,
        flow_rate=0.05
    )
    
    print("✅ Test plant added successfully")
    print(f"   - Plant ID: 1")
    print(f"   - Available valves: {engine.valves_manager.available_valves}")
    print(f"   - Available sensors: {engine.sensor_manager.available_sensors}")
    
    # Test 1: Open valve for 30 seconds (0.5 minutes)
    print("\n🧪 Test 1: Opening valve for 30 seconds...")
    test_duration = 0.5  # 30 seconds
    
    start_time = time.time()
    success = await engine.open_valve(1, test_duration)
    
    if success:
        print(f"✅ Valve opened successfully")
        print(f"   - Start time: {datetime.fromtimestamp(start_time)}")
        print(f"   - Expected close time: {datetime.fromtimestamp(start_time + (test_duration * 60))}")
        
        # Get valve status
        status = engine.get_detailed_valve_status(1)
        print(f"   - Valve status: {status['valve_hardware']['is_open']}")
        print(f"   - Engine state: {status['engine_state']['is_open']}")
        print(f"   - Background task: {status['task_status']}")
        
        # Wait for valve to close
        print(f"⏳ Waiting for valve to close automatically...")
        await asyncio.sleep(test_duration * 60 + 2)  # Wait a bit extra
        
        # Check final status
        final_status = engine.get_detailed_valve_status(1)
        print(f"✅ Final valve status:")
        print(f"   - Valve hardware: {final_status['valve_hardware']['is_open']}")
        print(f"   - Engine state: {final_status['engine_state']['is_open']}")
        print(f"   - Background task: {final_status['task_status']}")
        
        if final_status['valve_hardware']['open_time'] and final_status['valve_hardware']['close_time']:
            open_time = datetime.fromisoformat(final_status['valve_hardware']['open_time'])
            close_time = datetime.fromisoformat(final_status['valve_hardware']['close_time'])
            actual_duration = (close_time - open_time).total_seconds()
            expected_duration = test_duration * 60
            
            print(f"📊 Timing Analysis:")
            print(f"   - Expected duration: {expected_duration} seconds")
            print(f"   - Actual duration: {actual_duration:.2f} seconds")
            print(f"   - Difference: {abs(actual_duration - expected_duration):.2f} seconds")
            
            if abs(actual_duration - expected_duration) <= 5:  # Allow 5 second tolerance
                print("✅ Timing test PASSED - Valve stayed open for the expected duration")
            else:
                print("❌ Timing test FAILED - Valve closed too early or too late")
        else:
            print("❌ Timing test FAILED - Could not determine valve timing")
    else:
        print("❌ Failed to open valve")
    
    # Test 2: Manual close test
    print("\n🧪 Test 2: Testing manual valve close...")
    await asyncio.sleep(2)  # Wait a bit
    
    # Open valve again
    success = await engine.open_valve(1, 2.0)  # 2 minutes
    
    if success:
        print("✅ Valve opened for manual close test")
        
        # Wait 10 seconds then manually close
        await asyncio.sleep(10)
        print("🔧 Manually closing valve...")
        
        close_success = await engine.close_valve(1)
        if close_success:
            print("✅ Valve closed manually")
            
            # Check status
            status = engine.get_detailed_valve_status(1)
            print(f"   - Valve hardware: {status['valve_hardware']['is_open']}")
            print(f"   - Engine state: {status['engine_state']['is_open']}")
            print(f"   - Background task: {status['task_status']}")
            
            if not status['valve_hardware']['is_open']:
                print("✅ Manual close test PASSED")
            else:
                print("❌ Manual close test FAILED - Valve still appears open")
        else:
            print("❌ Failed to close valve manually")
    
    # Test 3: Multiple valve test
    print("\n🧪 Test 3: Testing multiple valves...")
    
    # Add second plant
    await engine.add_plant(
        plant_id=2,
        desired_moisture=70.0,
        water_limit=1.5,
        flow_rate=0.03
    )
    
    # Open both valves
    success1 = await engine.open_valve(1, 0.5)  # 30 seconds
    success2 = await engine.open_valve(2, 1.0)  # 1 minute
    
    if success1 and success2:
        print("✅ Both valves opened successfully")
        
        # Wait for first valve to close
        await asyncio.sleep(35)  # Wait for first valve to close
        
        status1 = engine.get_detailed_valve_status(1)
        status2 = engine.get_detailed_valve_status(2)
        
        print(f"After 35 seconds:")
        print(f"   - Valve 1 (30s): {status1['valve_hardware']['is_open']}")
        print(f"   - Valve 2 (60s): {status2['valve_hardware']['is_open']}")
        
        # Wait for second valve to close
        await asyncio.sleep(30)  # Wait for second valve to close
        
        status1 = engine.get_detailed_valve_status(1)
        status2 = engine.get_detailed_valve_status(2)
        
        print(f"After 65 seconds:")
        print(f"   - Valve 1 (30s): {status1['valve_hardware']['is_open']}")
        print(f"   - Valve 2 (60s): {status2['valve_hardware']['is_open']}")
        
        if not status1['valve_hardware']['is_open'] and not status2['valve_hardware']['is_open']:
            print("✅ Multiple valve test PASSED")
        else:
            print("❌ Multiple valve test FAILED - Some valves still open")
    
    print("\n🎉 Valve timing tests completed!")

if __name__ == "__main__":
    asyncio.run(test_valve_timing())
