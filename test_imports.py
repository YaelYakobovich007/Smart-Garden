#!/usr/bin/env python3
"""
Test script to verify that all handler imports work correctly.
"""

import sys
import os

# Add the project root to the path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

def test_imports():
    """Test all handler imports."""
    try:
        print("🧪 Testing handler imports...")
        
        # Test individual imports
        from controller.handlers.add_plant_handler import AddPlantHandler
        print("✅ AddPlantHandler import successful")
        
        from controller.handlers.get_plant_moisture_handler import GetPlantMoistureHandler
        print("✅ GetPlantMoistureHandler import successful")
        
        from controller.handlers.get_all_plants_moisture_handler import GetAllPlantsMoistureHandler
        print("✅ GetAllPlantsMoistureHandler import successful")
        
        from controller.handlers.open_valve_handler import OpenValveHandler
        print("✅ OpenValveHandler import successful")
        
        from controller.handlers.close_valve_handler import CloseValveHandler
        print("✅ CloseValveHandler import successful")
        
        from controller.handlers.get_valve_status_handler import GetValveStatusHandler
        print("✅ GetValveStatusHandler import successful")
        
        # Test bulk import from __init__.py
        from controller.handlers import (
            AddPlantHandler,
            GetPlantMoistureHandler,
            GetAllPlantsMoistureHandler,
            OpenValveHandler,
            CloseValveHandler,
            GetValveStatusHandler
        )
        print("✅ Bulk import from __init__.py successful")
        
        print("\n🎉 All imports successful! The handler import issue is fixed.")
        return True
        
    except ImportError as e:
        print(f"❌ Import error: {e}")
        return False
    except Exception as e:
        print(f"❌ Unexpected error: {e}")
        return False

if __name__ == "__main__":
    success = test_imports()
    if success:
        print("\n✅ All handler imports are working correctly!")
    else:
        print("\n❌ There are still import issues to fix.")
