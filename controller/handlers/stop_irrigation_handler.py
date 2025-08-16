from typing import Tuple
from controller.dto.stop_irrigation_request import StopIrrigationResponse
from controller.engine.smart_garden_engine import SmartGardenEngine


class StopIrrigationHandler:
    """
    Handler for stopping smart irrigation for a specific plant.
    """
    
    def __init__(self, engine: SmartGardenEngine):
        self.engine = engine
    
    async def handle(self, plant_id: int) -> StopIrrigationResponse:
        """
        Stop smart irrigation for the specified plant.
        
        Args:
            plant_id: ID of the plant to stop irrigation for
            
        Returns:
            StopIrrigationResponse: Response indicating success or failure
        """
        try:
            # Check if plant exists
            if plant_id not in self.engine.plants:
                return StopIrrigationResponse.error(
                    plant_id=plant_id,
                    error_message=f"Plant {plant_id} not found"
                )
            
            # Get the plant
            plant = self.engine.plants[plant_id]
            
            try:
                # Close the valve immediately (emergency stop)
                if plant.valve.is_open:
                    plant.valve.request_close()
                
                # Get current moisture reading
                current_moisture = plant.sensor.current_reading if plant.sensor else 0
                
                # Return success response
                return StopIrrigationResponse.success(
                    plant_id=plant_id,
                    message="Smart irrigation stopped successfully",
                    moisture=current_moisture,
                    final_moisture=current_moisture,
                    water_added_liters=0
                )
                
            except Exception as valve_error:
                # Handle valve operation errors
                current_moisture = plant.sensor.current_reading if plant.sensor else 0
                return StopIrrigationResponse.error(
                    plant_id=plant_id,
                    error_message=f"Failed to stop irrigation: {str(valve_error)}",
                    moisture=current_moisture
                )
                
        except Exception as e:
            # Handle unexpected errors
            return StopIrrigationResponse.error(
                plant_id=plant_id,
                error_message=f"Unexpected error during stop irrigation: {str(e)}"
            )
