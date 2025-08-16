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
        Stop smart irrigation for the specified plant by cancelling its irrigation task.
        
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
            
            # Get the plant for sensor reading
            plant = self.engine.plants[plant_id]
            current_moisture = plant.sensor.current_reading if plant.sensor else 0
            
            # Use the engine's stop_irrigation method to properly cancel the task
            irrigation_stopped = await self.engine.stop_irrigation(plant_id)
            
            if irrigation_stopped:
                # Irrigation task was successfully cancelled
                return StopIrrigationResponse.success(
                    plant_id=plant_id,
                    message="Smart irrigation stopped successfully",
                    moisture=current_moisture,
                    final_moisture=current_moisture,
                    water_added_liters=0  # We don't track partial water in cancellation
                )
            else:
                # No irrigation was running (task already completed or not started)
                return StopIrrigationResponse.error(
                    plant_id=plant_id,
                    error_message="No active irrigation found for this plant. Irrigation may have already completed or was not started.",
                    moisture=current_moisture
                )
                
        except Exception as e:
            # Handle unexpected errors
            return StopIrrigationResponse.error(
                plant_id=plant_id,
                error_message=f"Unexpected error during stop irrigation: {str(e)}"
            )
