import sys
import os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from controller.dto.open_valve_request import OpenValveResponse
from controller.engine.smart_garden_engine import SmartGardenEngine


class OpenValveHandler:
    """
    Handles the OPEN_VALVE command received from the server.
    """
    
    def __init__(self, smart_engine: SmartGardenEngine):
        self.smart_engine = smart_engine
    
    async def handle(self, plant_id: int, time_minutes: int) -> OpenValveResponse:
        """
        Handle the open valve command.
        
        Args:
            plant_id (int): The ID of the plant whose valve should be opened
            time_minutes (int): Duration in minutes to keep the valve open
            
        Returns:
            OpenValveResponse: Result of the valve operation
        """
        try:
            # Handle request
            
            # Validate parameters
            if not isinstance(plant_id, int) or plant_id <= 0:
                return OpenValveResponse.error(plant_id, f"Invalid plant_id: {plant_id}")
            
            if not isinstance(time_minutes, int) or time_minutes <= 0:
                return OpenValveResponse.error(plant_id, f"Invalid time_minutes: {time_minutes}")
            
            # Check if plant exists
            plant = self.smart_engine.get_plant_by_id(plant_id)
            if not plant:
                return OpenValveResponse.error(plant_id, f"Plant {plant_id} not found")
            
            # Open the valve for the specified duration
            success = await self.smart_engine.open_valve(plant_id, time_minutes)
            
            if success:
                return OpenValveResponse.success(
                    plant_id, time_minutes,
                    f"Valve opened for plant {plant_id} for {time_minutes} minutes"
                )
            else:
                return OpenValveResponse.error(plant_id, f"Failed to open valve for plant {plant_id}")
                
        except ValueError as e:
            print(f"ValueError in OPEN_VALVE handler: {e}")
            return OpenValveResponse.error(plant_id, str(e))
        except Exception as e:
            print(f"Unexpected error in OPEN_VALVE handler: {e}")
            return OpenValveResponse.error(plant_id, f"Unexpected error: {str(e)}") 