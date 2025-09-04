import sys
import os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from controller.dto.moisture_update import MoistureUpdate
from controller.dto.all_plants_moisture_response import AllPlantsMoistureResponse
from controller.engine.smart_garden_engine import SmartGardenEngine
from typing import Dict, Any, Tuple, Optional, List
import logging
import time

logger = logging.getLogger(__name__)

class GetAllPlantsMoistureHandler:
    """
    Handles the GET_ALL_MOISTURE command received from the server.
    """
    
    def __init__(self, smart_engine: SmartGardenEngine):
        self.smart_engine = smart_engine
    
    async def handle(self, data: Dict[Any, Any]) -> Tuple[bool, AllPlantsMoistureResponse]:
        """
        Handle request for moisture of all plants.
        
        Args:
            data: Raw data from server WebSocket message
            
        Returns:
            Tuple of (success: bool, AllPlantsMoistureResponse object)
        """
        
        logger.info(f"[HANDLER][ALL_MOISTURE][RECV]")
        
        try:
            # Use engine function to get all plants sensor data
            all_sensor_data = await self.smart_engine.get_all_plants_sensor_data()
            
            moisture_data = []
            
            # Convert engine data to MoistureUpdate DTOs
            for internal_id, sensor_data in all_sensor_data.items():
                if sensor_data is not None:  # Only include plants with valid readings
                    moisture, temperature = sensor_data
                    
                    # Create MoistureUpdate DTO using convenience method with temperature
                    moisture_update = MoistureUpdate.all_plants_moisture(
                        plant_id=internal_id,
                        moisture=moisture,
                        temperature=temperature
                    )
                    
                    moisture_data.append(moisture_update)
                    logger.info(f"[HANDLER][ALL_MOISTURE][PLANT] id={internal_id} moisture={moisture:.1f}% temperature={temperature}")
                else:
                    logger.warning(f"[HANDLER][ALL_MOISTURE][ERROR] read_failed id={internal_id}")
                    # Create error DTO for failed readings
                    error_update = MoistureUpdate.error(
                        event="all_plants_moisture_update",
                        plant_id=internal_id,
                        error_message="Failed to read sensor data"
                    )
                    moisture_data.append(error_update)
            
            if moisture_data:
                logger.info(f"[HANDLER][ALL_MOISTURE][SUCCESS] total={len(moisture_data)}")
                return True, AllPlantsMoistureResponse.success(
                    total_plants=len(moisture_data),
                    plants=moisture_data
                )
            else:
                logger.warning("[HANDLER][ALL_MOISTURE][ERROR] none_or_failed=true")
                return False, AllPlantsMoistureResponse.error(
                    error_message="No plants found or all sensor readings failed"
                )
                
        except Exception as e:
            logger.error(f"[HANDLER][ALL_MOISTURE][ERROR] err={e}")
            return False, AllPlantsMoistureResponse.error(
                error_message=f"Internal error: {str(e)}"
            )