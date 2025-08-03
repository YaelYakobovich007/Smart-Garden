from controller.dto.moisture_update import MoistureUpdate
from controller.dto.all_plants_moisture_response import AllPlantsMoistureResponse
from typing import Dict, Any, Tuple, Optional, List
import logging
import time

logger = logging.getLogger(__name__)

async def handle(data: Dict[Any, Any], smart_engine) -> Tuple[bool, AllPlantsMoistureResponse]:
    """
    Handle request for moisture of all plants.
    
    Args:
        data: Raw data from server WebSocket message
        smart_engine: SmartGardenEngine instance
        
    Returns:
        Tuple of (success: bool, AllPlantsMoistureResponse object)
    """
    
    logger.info(f"Getting moisture data for all plants")
    
    try:
        # Use engine function to get all plants moisture
        all_moisture_data = await smart_engine.get_all_plants_moisture()
        
        moisture_data = []
        
        # Convert engine data to MoistureUpdate DTOs
        for internal_id, moisture_value in all_moisture_data.items():
            if moisture_value is not None:  # Only include plants with valid readings
                # Create MoistureUpdate DTO using convenience method
                moisture_update = MoistureUpdate.all_plants_moisture(
                    plant_id=internal_id,
                    moisture=moisture_value
                )
                
                moisture_data.append(moisture_update)
                logger.info(f"Plant (internal {internal_id}): {moisture_value:.1f}%")
            else:
                logger.warning(f"Failed to read moisture for plant (internal {internal_id})")
                # Create error DTO for failed readings
                error_update = MoistureUpdate.error(
                    event="all_plants_moisture_update",
                    plant_id=internal_id,
                    error_message="Failed to read sensor data"
                )
                moisture_data.append(error_update)
        
        if moisture_data:
            logger.info(f"Successfully retrieved moisture for {len(moisture_data)} plants")
            # Create success response using the new DTO
            response = AllPlantsMoistureResponse.success(moisture_data)
            return True, response
        else:
            logger.warning("No plants found or no moisture data available")
            # Create error response with empty data
            response = AllPlantsMoistureResponse.error(
                error_message="No plants found or no moisture data available"
            )
            return False, response
        
    except Exception as e:
        logger.error(f"Failed to get moisture for all plants: {e}")
        # Create error DTO for general failure
        error_update = MoistureUpdate.error(
            event="all_plants_moisture_update",
            plant_id=0,
            error_message=str(e)
        )
        # Create error response with the error DTO
        response = AllPlantsMoistureResponse.error(
            error_message=str(e),
            error_updates=[error_update]
        )
        return False, response