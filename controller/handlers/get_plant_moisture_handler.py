from controller.dto.moisture_update import MoistureUpdate
from typing import Dict, Any, Tuple, Optional
import logging
import time

logger = logging.getLogger(__name__)

async def handle(data: Dict[Any, Any], smart_engine) -> Tuple[bool, Optional[MoistureUpdate]]:
    """
    Handle request for moisture of a single plant.
    
    Args:
        data: Raw data from server WebSocket message containing plant_id
        smart_engine: SmartGardenEngine instance
        
    Returns:
        Tuple of (success: bool, moisture_data: MoistureUpdate or None)
    """
    
    plant_id = data.get("plant_id")
    
    logger.info(f"Getting moisture data for single plant: {plant_id}")
    
    try:
        # Use plant_id directly (no conversion needed)
        if plant_id is not None:
            logger.info(f"Using plant_id {plant_id} directly from server")
            
            # Use engine function to get complete sensor data
            sensor_data = await smart_engine.get_plant_sensor_data(plant_id)
            
            if sensor_data is not None:
                moisture, temperature = sensor_data
                
                # Create MoistureUpdate DTO using convenience method with temperature
                moisture_update = MoistureUpdate.plant_moisture(
                    plant_id=plant_id,
                    moisture=moisture,
                    temperature=temperature
                )
                
                logger.info(f"Successfully retrieved sensor data for plant {plant_id}: moisture={moisture:.1f}%, temperature={temperature}")
                return True, moisture_update
            else:
                logger.warning(f"Failed to read sensor data for plant {plant_id}")
                # Create error DTO
                error_update = MoistureUpdate.error(
                    event="plant_moisture_update",
                    plant_id=plant_id,
                    error_message="Failed to read sensor data"
                )
                return False, error_update
        
        # Plant not found
        logger.warning(f"Plant {plant_id} not found")
        error_update = MoistureUpdate.error(
            event="plant_moisture_update",
            plant_id=plant_id,
            error_message="Plant not found"
        )
        return False, error_update
        
    except Exception as e:
        logger.error(f"Error getting moisture for plant {plant_id}: {e}")
        error_update = MoistureUpdate.error(
            event="plant_moisture_update",
            plant_id=plant_id,
            error_message=f"Internal error: {str(e)}"
        )
        return False, error_update