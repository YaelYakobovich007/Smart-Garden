"""
Test Direct Plant ID Usage

This test verifies that the system now uses plant_id directly from the server
without any internal mapping or conversion. The plant_id sent by the server
should be the same plant_id used throughout the system.
"""

import asyncio
from controller.engine.smart_garden_engine import SmartGardenEngine
from controller.handlers.add_plant_handler import handle as handle_add_plant
from controller.handlers.get_plant_moisture_handler import handle as handle_single_plant
from controller.handlers.get_all_plants_moisture_handler import handle as handle_all_plants

async def test_direct_plant_id_usage():
    """Test that plant_id is used directly without mapping"""
    print("🧪 Testing Direct Plant ID Usage...")
    
    # Step 1: Create Smart Garden Engine
    print("\n1️⃣ Creating Smart Garden Engine...")
    engine = SmartGardenEngine(total_valves=4, total_sensors=4)
    
    # Test plant_ids that are the same as what server would send
    server_plant_ids = [123, 456, 789]
    
    # Step 2: Add plants using server plant_ids directly
    print("2️⃣ Adding plants with server plant_ids...")
    
    for plant_id in server_plant_ids:
        add_data = {
            "plant_id": plant_id,
            "plant_name": f"test_plant_{plant_id}",
            "desired_moisture": 65.0,
            "water_limit": 1.0
        }
        
        # Use the simplified handler (no plant_id_map needed)
        success, response = handle_add_plant(
            data=add_data,
            smart_engine=engine
        )
        
        if success:
            print(f"   ✅ Added plant {plant_id}: {response.status}")
            print(f"      🆔 Plant ID in response: {response.plant_id}")
            
            # Verify the plant_id in response matches server plant_id
            if response.plant_id == plant_id:
                print(f"      ✅ Plant ID matches server ID (no conversion)")
            else:
                print(f"      ❌ Plant ID mismatch! Server: {plant_id}, Response: {response.plant_id}")
                return False
        else:
            print(f"   ❌ Failed to add plant {plant_id}: {response.error_message}")
            return False
    
    # Step 3: Test single plant moisture using direct plant_id
    print("\n3️⃣ Testing single plant moisture with direct plant_id...")
    
    test_plant_id = 456
    moisture_data = {"plant_id": test_plant_id}
    
    # Use the simplified handler (no plant_id_map needed)
    success, moisture_response = await handle_single_plant(
        data=moisture_data,
        smart_engine=engine
    )
    
    if success and moisture_response:
        print(f"   ✅ Got moisture for plant {test_plant_id}")
        print(f"      🆔 Plant ID in response: {moisture_response.plant_id}")
        print(f"      💧 Moisture: {moisture_response.moisture:.1f}%")
        
        # Verify the plant_id in response matches server plant_id
        if moisture_response.plant_id == test_plant_id:
            print(f"      ✅ Plant ID matches server ID (no conversion)")
        else:
            print(f"      ❌ Plant ID mismatch! Server: {test_plant_id}, Response: {moisture_response.plant_id}")
            return False
    else:
        print(f"   ❌ Failed to get moisture for plant {test_plant_id}")
        if moisture_response:
            print(f"      Error: {moisture_response.error_message}")
        return False
    
    # Step 4: Test all plants moisture using direct plant_ids
    print("\n4️⃣ Testing all plants moisture with direct plant_ids...")
    
    all_moisture_data = {}
    
    # Use the simplified handler (no plant_id_map needed)
    success, response_dto = await handle_all_plants(
        data=all_moisture_data,
        smart_engine=engine
    )
    
    if success and response_dto:
        print(f"   ✅ Got moisture for all plants")
        print(f"      📊 Total plants: {response_dto.total_plants}")
        print(f"      📊 Status: {response_dto.status}")
        
        # Verify each plant_id in response matches server plant_ids
        response_plant_ids = [plant['plant_id'] for plant in response_dto.plants]
        print(f"      🆔 Plant IDs in response: {sorted(response_plant_ids)}")
        print(f"      🆔 Expected server IDs: {sorted(server_plant_ids)}")
        
        if set(response_plant_ids) == set(server_plant_ids):
            print(f"      ✅ All plant IDs match server IDs (no conversion)")
        else:
            print(f"      ❌ Plant ID mismatch!")
            return False
    else:
        print(f"   ❌ Failed to get moisture for all plants")
        if response_dto:
            print(f"      Error: {response_dto.error_message}")
        return False
    
    return True

async def test_no_mapping_artifacts():
    """Test that no plant_id mapping artifacts remain in the code"""
    print("\n🧪 Testing No Mapping Artifacts...")
    
    import inspect
    from controller.services.websocket_client import SmartGardenPiClient
    
    # Check websocket client source
    client_source = inspect.getsource(SmartGardenPiClient)
    
    print("🔍 Checking for removed mapping artifacts...")
    
    # Should not have plant_id_map
    if "plant_id_map" in client_source:
        print("❌ plant_id_map still referenced in websocket client")
        return False
    else:
        print("✅ No plant_id_map references in websocket client")
    
    # Should not have next_plant_id
    if "next_plant_id" in client_source:
        print("❌ next_plant_id still referenced in websocket client")
        return False
    else:
        print("✅ No next_plant_id references in websocket client")
    
    # Should not have _get_or_create_plant_id
    if "_get_or_create_plant_id" in client_source:
        print("❌ _get_or_create_plant_id method still exists")
        return False
    else:
        print("✅ No _get_or_create_plant_id method")
    
    # Should not have internal_id conversion logic
    if "internal_id" in client_source:
        print("❌ internal_id still referenced in websocket client")
        return False
    else:
        print("✅ No internal_id references in websocket client")
    
    return True

if __name__ == "__main__":
    async def run_all_tests():
        print("🚀 Starting Direct Plant ID Usage Tests...")
        
        success1 = await test_direct_plant_id_usage()
        success2 = await test_no_mapping_artifacts()
        
        if success1 and success2:
            print("\n🎉 All tests passed! Plant ID usage is now direct and simplified.")
            print("\n✅ Verified:")
            print("   🆔 Server plant_id is used directly throughout system")
            print("   🚫 No internal plant_id mapping or conversion")
            print("   🧹 All mapping artifacts removed from websocket client")
            print("   📊 Handlers use server plant_id directly")
            print("   🔄 Engine uses server plant_id as-is")
            print("\n🎯 Benefits:")
            print("   ✨ Much simpler code")
            print("   🔍 Easier to debug (no ID conversion confusion)")
            print("   📈 Better performance (no mapping overhead)")
            print("   🎯 Direct correspondence between server and Pi")
        else:
            print("\n💥 Some tests failed. Plant ID usage may not be fully direct.")
    
    # Run the tests
    asyncio.run(run_all_tests())