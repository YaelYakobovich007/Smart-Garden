import sys
import os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from controller.dto.valve_status_response import ValveStatusResponse
from controller.engine.smart_garden_engine import SmartGardenEngine


class GetValveStatusHandler:
    """
    Handles the GET_VALVE_STATUS command received from the server.
    """
    
    def __init__(self, smart_engine: SmartGardenEngine):
        self.smart_engine = smart_engine
    
    async def handle(self, plant_id: int) -> ValveStatusResponse:
        """
        Handle the get valve status command.
        
        Args:
            plant_id (int): The ID of the plant whose valve status should be retrieved
            
        Returns:
            ValveStatusResponse: Current valve status information
        """
        try:
            print(f"[GET_VALVE_STATUS] Processing command for plant {plant_id}")
            
            # Validate parameters
            if not isinstance(plant_id, int) or plant_id <= 0:
                return ValveStatusResponse.error(plant_id, f"Invalid plant_id: {plant_id}")
            
            # Check if plant exists
            plant = self.smart_engine.get_plant_by_id(plant_id)
            if not plant:
                return ValveStatusResponse.error(plant_id, f"Plant {plant_id} not found")
            
            # Get detailed valve status
            status = self.smart_engine.get_detailed_valve_status(plant_id)
            
            if status:
                print(f"[GET_VALVE_STATUS] Retrieved status for plant {plant_id}")
                return ValveStatusResponse.success(plant_id, status)
            else:
                print(f"[GET_VALVE_STATUS] ERROR - Failed to get valve status for plant {plant_id}")
                return ValveStatusResponse.error(plant_id, f"Failed to get valve status for plant {plant_id}")
                
        except ValueError as e:
            print(f"[GET_VALVE_STATUS] ERROR - ValueError: {e}")
            return ValveStatusResponse.error(plant_id, str(e))
        except Exception as e:
            print(f"[GET_VALVE_STATUS] ERROR - Unexpected: {e}")
            return ValveStatusResponse.error(plant_id, f"Unexpected error: {str(e)}")
