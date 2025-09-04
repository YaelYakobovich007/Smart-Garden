import asyncio
from controller.engine.smart_garden_engine import SmartGardenEngine
from controller.dto.close_valve_request import CloseValveResponse


class CloseValveHandler:
    """
    Handles the CLOSE_VALVE command received from the server.
    """
    
    def __init__(self, smart_engine: SmartGardenEngine):
        self.smart_engine = smart_engine
    
    async def handle(self, plant_id: int) -> CloseValveResponse:
        """
        Handle CLOSE_VALVE request using non-blocking approach.
        
        Args:
            plant_id (int): The ID of the plant whose valve should be closed
            
        Returns:
            CloseValveResponse: Response indicating success or failure
        """
        try:
            # Handle request
            
            # Get the plant to find its valve
            plant = self.smart_engine.get_plant_by_id(plant_id)
            if not plant:
                return CloseValveResponse.error(
                    plant_id=plant_id,
                    error_message=f"Plant {plant_id} not found"
                )
            
            # Close valve
            
            # Use the new non-blocking close_valve method
            success = await self.smart_engine.close_valve(plant_id)
            
            if success:
                return CloseValveResponse.success(
                    plant_id=plant_id,
                    message=f"Valve {plant.valve.valve_id} closed successfully"
                )
            else:
                return CloseValveResponse.error(
                    plant_id=plant_id,
                    error_message=f"Failed to close valve {plant.valve.valve_id}"
                )
            
        except Exception as e:
            print(f"[HANDLER][CLOSE_VALVE][ERROR] err={e}")
            return CloseValveResponse.error(
                plant_id=plant_id,
                error_message=f"Internal error: {str(e)}"
            )
    
    async def handle_close_valve_request(self, data: dict) -> CloseValveResponse:
        """
        Handle CLOSE_VALVE request using non-blocking approach.
        
        Args:
            data (dict): Request data containing plant_id
            
        Returns:
            CloseValveResponse: Response indicating success or failure
        """
        try:
            plant_id = data.get("plant_id")
            
            if plant_id is None:
                return CloseValveResponse.error(
                    plant_id=0,
                    error_message="Missing plant_id in request"
                )
            
            return await self.handle(plant_id)
            
        except Exception as e:
            print(f"[HANDLER][CLOSE_VALVE][ERROR] err={e}")
            return CloseValveResponse.error(
                plant_id=plant_id if 'plant_id' in locals() else 0,
                error_message=f"Internal error: {str(e)}"
            ) 