import sys
import os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from controller.dto.moisture_update import MoistureUpdate
from controller.engine.smart_garden_engine import SmartGardenEngine
from typing import Dict, Any, Tuple, Optional

import time

class GetPlantMoistureHandler:
    """
    Handles the GET_PLANT_MOISTURE command received from the server.
    """
    
    def __init__(self, smart_engine: SmartGardenEngine):
        self.smart_engine = smart_engine
    
    async def handle(self, data: Dict[Any, Any]) -> Tuple[bool, Optional[MoistureUpdate]]:
        """
        Handle request for moisture of a single plant.
        
        Args:
            data: Raw data from server WebSocket message containing plant_id
            
        Returns:
            Tuple of (success: bool, moisture_data: MoistureUpdate or None)
        """
        
        plant_id = data.get("plant_id")
        
        print(f"[GET_MOISTURE] Getting moisture data for single plant: {plant_id}")
        
        try:
            # Use plant_id directly (no conversion needed)
            if plant_id is not None:
                print(f"[GET_MOISTURE] Using plant_id {plant_id} directly from server")
                
                # Use engine function to get complete sensor data
                sensor_data = await self.smart_engine.get_plant_sensor_data(plant_id)
                
                if sensor_data is not None:
                    moisture, temperature = sensor_data
                    
                    # Create MoistureUpdate DTO using convenience method with temperature
                    moisture_update = MoistureUpdate.plant_moisture(
                        plant_id=plant_id,
                        moisture=moisture,
                        temperature=temperature
                    )
                    
                    print(f"[GET_MOISTURE] Successfully retrieved sensor data for plant {plant_id}: moisture={moisture:.1f}%, temperature={temperature}")
                    return True, moisture_update
                else:
                    print(f"[GET_MOISTURE] WARN - Failed to read sensor data for plant {plant_id}")
                    # Create error DTO
                    error_update = MoistureUpdate.error(
                        event="plant_moisture_update",
                        plant_id=plant_id,
                        error_message="Failed to read sensor data"
                    )
                    return False, error_update
            
            # Plant not found
            print(f"[GET_MOISTURE] WARN - Plant {plant_id} not found")
            error_update = MoistureUpdate.error(
                event="plant_moisture_update",
                plant_id=plant_id,
                error_message="Plant not found"
            )
            return False, error_update
            
        except Exception as e:
            print(f"[GET_MOISTURE] ERROR - Error getting moisture for plant {plant_id}: {e}")
            error_update = MoistureUpdate.error(
                event="plant_moisture_update",
                plant_id=plant_id,
                error_message=f"Internal error: {str(e)}"
            )
            return False, error_update