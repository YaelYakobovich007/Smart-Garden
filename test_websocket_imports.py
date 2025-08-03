#!/usr/bin/env python3
"""
Test WebSocket Client Imports

This script tests if all the imports work correctly for the WebSocket client.
Use this to debug import issues on your Pi.
"""

import sys
import os

# Add the project root to Python path
project_root = os.path.dirname(os.path.abspath(__file__))
if project_root not in sys.path:
    sys.path.insert(0, project_root)

def test_imports():
    """Test all imports step by step"""
    print("🧪 Testing Smart Garden Pi Client Imports...")
    print(f"📂 Project root: {project_root}")
    print(f"🐍 Python version: {sys.version}")
    
    try:
        print("\n1️⃣ Testing basic imports...")
        import asyncio
        import json
        print("   ✅ Standard library imports OK")
        
        print("\n2️⃣ Testing external imports...")
        try:
            import websockets
            print("   ✅ websockets library OK")
        except ImportError as e:
            print(f"   ❌ websockets library missing: {e}")
            print("   💡 Install with: pip install websockets")
        
        try:
            import pydantic
            print("   ✅ pydantic library OK")
        except ImportError as e:
            print(f"   ❌ pydantic library missing: {e}")
            print("   💡 Install with: pip install pydantic")
        
        print("\n3️⃣ Testing controller package imports...")
        
        # Test basic package
        from controller import engine
        print("   ✅ controller.engine package OK")
        
        # Test engine import
        from controller.engine.smart_garden_engine import SmartGardenEngine
        print("   ✅ SmartGardenEngine import OK")
        
        # Test DTO imports
        from controller.dto.moisture_update import MoistureUpdate
        print("   ✅ MoistureUpdate DTO import OK")
        
        from controller.dto.add_plant_request import AddPlantRequest  
        print("   ✅ AddPlantRequest DTO import OK")
        
        # Test handler imports
        from controller.handlers.add_plant_handler import handle as handle_add_plant
        print("   ✅ add_plant_handler import OK")
        
        from controller.handlers.get_plant_moisture_handler import handle as handle_single
        print("   ✅ get_plant_moisture_handler import OK")
        
        from controller.handlers.get_all_plants_moisture_handler import handle as handle_all
        print("   ✅ get_all_plants_moisture_handler import OK")
        
        # Test websocket client import
        from controller.services.websocket_client import SmartGardenPiClient
        print("   ✅ SmartGardenPiClient import OK")
        
        print("\n4️⃣ Testing client creation...")
        # Create a mock engine for testing
        engine = SmartGardenEngine(total_valves=2, total_sensors=2)
        print("   ✅ SmartGardenEngine creation OK")
        
        # Create websocket client (don't connect yet)
        client = SmartGardenPiClient(engine=engine)
        print("   ✅ SmartGardenPiClient creation OK")
        
        print("\n🎉 All imports successful! Your Pi is ready to run the Smart Garden client.")
        return True
        
    except ImportError as e:
        print(f"\n❌ Import error: {e}")
        print(f"📂 Current working directory: {os.getcwd()}")
        print(f"🐍 Python path:")
        for i, path in enumerate(sys.path):
            print(f"   {i}: {path}")
        return False
    except Exception as e:
        print(f"\n💥 Unexpected error: {e}")
        return False

if __name__ == "__main__":
    success = test_imports()
    if success:
        print("\n✅ Ready to run: python3 start_pi_client.py")
    else:
        print("\n❌ Fix the import issues above first")
        sys.exit(1)