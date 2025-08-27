import logging
from typing import Dict, Any, Tuple, Optional
from controller.engine.smart_garden_engine import SmartGardenEngine
from controller.dto.update_plant import UpdatePlant

logger = logging.getLogger(__name__)

class UpdatePlantHandler:
    """
    Handler for updating plant details in the smart garden system.
    """
    
    def __init__(self, smart_engine: SmartGardenEngine):
        self.smart_engine = smart_engine
    
    async def handle(self, data: Dict[Any, Any]) -> Tuple[bool, Optional[str]]:
        """
        Handle plant update request.
        
        Args:
            data: Dictionary containing plant update data
            
        Returns:
            Tuple of (success: bool, message: Optional[str])
        """
        try:
            # Parse the update plant data
            update_plant = UpdatePlant.from_websocket_data(data)
            
            logger.info(f"Updating plant {update_plant.plant_id} with new settings")
            
            # Update the plant in the engine
            success = await self.smart_engine.update_plant(
                plant_id=update_plant.plant_id,
                desired_moisture=update_plant.desired_moisture,
                water_limit=update_plant.water_limit,
                dripper_type=update_plant.dripper_type
            )
            
            if success:
                logger.info(f"Successfully updated plant {update_plant.plant_id}")
                return True, f"Plant {update_plant.plant_id} updated successfully"
            else:
                logger.warning(f"Failed to update plant {update_plant.plant_id}")
                return False, f"Failed to update plant {update_plant.plant_id}"
                
        except Exception as e:
            logger.error(f"Error updating plant: {e}")
            return False, f"Error updating plant: {str(e)}"
