from controller.dto.add_plant_request import AddPlantRequest
from typing import Dict, Any, Tuple
import logging

logger = logging.getLogger(__name__)

def handle(data: Dict[Any, Any], smart_engine) -> Tuple[bool, AddPlantRequest]:
    """
    Handle add plant request from server and add plant to Smart Garden Engine.
    
    Args:
        data: Raw data from server WebSocket message
        smart_engine: SmartGardenEngine instance
        
    Returns:
        Tuple of (success: bool, response: AddPlantRequest)
    """
    
    # Debug: Log the entire message to see what we're receiving
    logger.info(f"Received add plant message from server: {data}")
    logger.info(f"Message type: {type(data)}")
    logger.info(f"Available keys: {list(data.keys()) if isinstance(data, dict) else 'Not a dict'}")
    
    # Extract data from server message
    plant_id = data.get("plantId")
    
    # Validate plant_id
    if plant_id is None:
        logger.error("plant_id is missing from server message")
        response = AddPlantRequest.error(
            plant_id=0,  # Use 0 as fallback
            error_message="plant_id is required but was not provided by server"
        )
        return False, response
    
    desired_moisture = float(data.get("desiredMoisture", 60.0))
    water_limit = data.get("waterLimit", 1.0)
    schedule_data = data.get("scheduleData")
    
    try:
        # Use the plant_id directly from the server (no conversion needed)
        logger.info(f"Using plant_id {plant_id} directly from server")
        
        # Convert schedule_data to the format expected by the engine
        # Engine expects: List[Dict[str, str]] = [{"day": "monday", "time": "06:00"}, ...]
        engine_schedule_data = None
        if schedule_data:
            if isinstance(schedule_data, dict):
                # Handle backend format: {irrigation_days: [...], irrigation_time: "..."}
                irrigation_days = schedule_data.get("irrigation_days")
                irrigation_time = schedule_data.get("irrigation_time")
                
                if irrigation_days and isinstance(irrigation_days, list) and irrigation_time:
                    engine_schedule_data = []
                    for day in irrigation_days:
                        engine_schedule_data.append({
                            "day": day.lower(),
                            "time": irrigation_time
                        })
            elif isinstance(schedule_data, list):
                # Handle legacy format: [{"day": "...", "time": "..."}]
                engine_schedule_data = []
                for schedule_entry in schedule_data:
                    if isinstance(schedule_entry, dict):
                        engine_schedule_data.append({
                            "day": schedule_entry.get("day"),
                            "time": schedule_entry.get("time")
                        })
        
        # Add plant to engine with provided parameters
        smart_engine.add_plant(
            plant_id=plant_id,
            desired_moisture=desired_moisture,
            schedule_data=engine_schedule_data,
            plant_lat=32.7940,  # Default coordinates (Israel)
            plant_lon=34.9896,
            pipe_diameter=1.0,   # Default values - could be made configurable
            flow_rate=0.05,
            water_limit=water_limit
        )
        
        
        # Get assigned hardware info
        assigned_valve = None
        sensor_port = None
        if plant_id in smart_engine.plants:
            plant = smart_engine.plants[plant_id]
            assigned_valve = plant.valve.valve_id
            sensor_port = plant.sensor.port
        
        # Create success response using DTO
        response = AddPlantRequest.success(
            plant_id=plant_id,
            desired_moisture=desired_moisture,
            assigned_valve=assigned_valve,
            sensor_port=sensor_port
        )
        
        return True, response
        
    except Exception as e:
        
        # Create error response using DTO
        response = AddPlantRequest.error(
            plant_id=plant_id,
            error_message=str(e)
        )
        
        return False, response