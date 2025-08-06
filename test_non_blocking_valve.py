#!/usr/bin/env python3
"""
Test script to demonstrate non-blocking valve operations.
This script shows how the system can respond to CLOSE_VALVE requests
even while a valve is open for a specified duration.
"""

import asyncio
import time
from controller.engine.smart_garden_engine import SmartGardenEngine

async def test_non_blocking_valve():
    """Test the non-blocking valve operations."""
    print("🧪 Testing Non-Blocking Valve Operations")
    print("=" * 50)
    
    # Initialize the engine
    engine = SmartGardenEngine(total_valves=2, total_sensors=2)
    
    # Add a test plant
    await engine.add_plant(
        plant_id=1,
        desired_moisture=60.0,
        plant_lat=32.7940,
        plant_lon=34.9896
    )
    
    print(f"✅ Plant 1 added successfully")
    print(f"   - Valve ID: {engine.plants[1].valve.valve_id}")
    print(f"   - Sensor Port: {engine.plants[1].sensor.port}")
    
    # Test 1: Open valve for 10 seconds (simulating 10 minutes)
    print(f"\n🔓 Test 1: Opening valve for 10 seconds...")
    start_time = time.time()
    
    # Open valve in background
    open_task = asyncio.create_task(engine.open_valve(1, 10))  # 10 seconds for testing
    
    # Wait a moment for the valve to open
    await asyncio.sleep(1)
    
    # Check valve state
    valve_state = engine.get_valve_state(1)
    print(f"   - Valve state: {valve_state}")
    print(f"   - Is valve open: {engine.is_valve_open(1)}")
    
    # Test 2: Try to close valve while it's open (should work immediately)
    print(f"\n🔒 Test 2: Closing valve while it's open...")
    close_start = time.time()
    
    # Close valve (should work immediately)
    success = await engine.close_valve(1)
    close_end = time.time()
    
    print(f"   - Close operation success: {success}")
    print(f"   - Close operation time: {close_end - close_start:.3f} seconds")
    print(f"   - Is valve open: {engine.is_valve_open(1)}")
    
    # Wait for the original open task to complete
    try:
        await open_task
    except asyncio.CancelledError:
        print(f"   - Original open task was cancelled (expected)")
    
    # Test 3: Open valve again and let it run to completion
    print(f"\n🔓 Test 3: Opening valve for 5 seconds and letting it complete...")
    
    # Open valve for 5 seconds
    await engine.open_valve(1, 5)  # 5 seconds for testing
    
    # Wait for it to complete
    await asyncio.sleep(6)
    
    print(f"   - Is valve open: {engine.is_valve_open(1)}")
    
    # Test 4: Check that we can still close valve even if not open
    print(f"\n🔒 Test 4: Closing valve when already closed...")
    success = await engine.close_valve(1)
    print(f"   - Close operation success: {success}")
    
    print(f"\n✅ All tests completed successfully!")
    print(f"   - Total test time: {time.time() - start_time:.2f} seconds")

if __name__ == "__main__":
    asyncio.run(test_non_blocking_valve()) 