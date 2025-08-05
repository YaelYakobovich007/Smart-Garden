import asyncio
from controller.engine.smart_garden_engine import SmartGardenEngine
from controller.dto.close_valve_request import CloseValveResponse


class CloseValveHandler:
    """
    Handles the CLOSE_VALVE command received from the server.
    """
    
    def __init__(self, smart_engine: SmartGardenEngine):
        self.smart_engine = smart_engine
    
    async def handle_close_valve_request(self, data: dict) -> CloseValveResponse:
        """
        Handle CLOSE_VALVE request.
        
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
            
            print(f"Processing CLOSE_VALVE command for plant {plant_id}")
            
            # Get the plant to find its valve
            plant = self.smart_engine.get_plant_by_id(plant_id)
            if not plant:
                return CloseValveResponse.error(
                    plant_id=plant_id,
                    error_message=f"Plant {plant_id} not found"
                )
            
            print(f"Found plant {plant_id}, closing valve {plant.valve.valve_id}")
            
            # Close the valve
            plant.valve.request_close()
            
            print(f"Valve {plant.valve.valve_id} closed successfully for plant {plant_id}")
            
            return CloseValveResponse.success(
                plant_id=plant_id,
                message=f"Valve {plant.valve.valve_id} closed successfully"
            )
            
        except ValueError as e:
            print(f"ValueError in CLOSE_VALVE handler: {e}")
            return CloseValveResponse.error(
                plant_id=plant_id if 'plant_id' in locals() else 0,
                error_message=str(e)
            )
        except Exception as e:
            print(f"Unexpected error in CLOSE_VALVE handler: {e}")
            return CloseValveResponse.error(
                plant_id=plant_id if 'plant_id' in locals() else 0,
                error_message=f"Unexpected error: {str(e)}"
            ) 