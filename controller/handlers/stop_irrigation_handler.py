from typing import Tuple
from controller.dto.stop_irrigation_response import StopIrrigationResponse
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
        print("\n=== STOP IRRIGATION HANDLER ===")
        print(f"Plant ID: {plant_id}")
        
        try:
            # Check if plant exists
            print(f"\nChecking if plant {plant_id} exists...")
            if plant_id not in self.engine.plants:
                print(f"ERROR: Plant {plant_id} not found")
                return StopIrrigationResponse.error(
                    plant_id=plant_id,
                    error_message=f"Plant {plant_id} not found"
                )
            
            # Get the plant for sensor reading
            plant = self.engine.plants[plant_id]
            print(f"\nFound plant: {plant_id}")
            print(f"Valve ID: {plant.valve.valve_id}")
            print(f"Valve state: {'OPEN' if plant.valve.is_open else 'CLOSED'}")
            
            current_moisture = plant.sensor.current_reading if plant.sensor else 0
            print(f"Current moisture: {current_moisture}%")
            
            # Use the engine's stop_irrigation method to properly cancel the task
            print(f"\nCalling engine.stop_irrigation...")
            irrigation_stopped = await self.engine.stop_irrigation(plant_id)
            
            if irrigation_stopped:
                # Irrigation task was successfully cancelled
                print(f"\nIrrigation successfully stopped")
                print(f"Final moisture: {current_moisture}%")
                print(f"Valve state: {'OPEN' if plant.valve.is_open else 'CLOSED'}")
                
                return StopIrrigationResponse.success(
                    plant_id=plant_id,
                    moisture=current_moisture,
                    water_added_liters=0  # We don't track partial water in cancellation
                )
            else:
                # No irrigation was running
                print(f"\nNo active irrigation found")
                print(f"Current moisture: {current_moisture}%")
                print(f"Valve state: {'OPEN' if plant.valve.is_open else 'CLOSED'}")
                
                return StopIrrigationResponse.error(
                    plant_id=plant_id,
                    error_message="No active irrigation found for this plant. Irrigation may have already completed or was not started.",
                    moisture=current_moisture
                )
                
        except Exception as e:
            # Handle unexpected errors
            print(f"\nERROR during stop irrigation:")
            print(f"Error message: {str(e)}")
            return StopIrrigationResponse.error(
                plant_id=plant_id,
                error_message=f"Unexpected error during stop irrigation: {str(e)}"
            )