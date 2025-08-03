from controller.dto.add_plant_request import AddPlantRequest
from typing import Dict, Any, Tuple
import logging

logger = logging.getLogger(__name__)

def handle(data: Dict[Any, Any], smart_engine, plant_id_map: Dict[str, int], next_plant_id: int) -> Tuple[bool, AddPlantRequest, int]:
    """
    Handle add plant request from server and add plant to Smart Garden Engine.
    
    Args:
        data: Raw data from server WebSocket message
        smart_engine: SmartGardenEngine instance
        plant_id_map: Mapping from server plant IDs to internal engine IDs
        next_plant_id: Next available internal plant ID
        
    Returns:
        Tuple of (success: bool, response: AddPlantRequest, updated_next_plant_id: int)
    """
    
    # Extract data from server message
    plant_id = data.get("plant_id")
    plant_name = data.get("plant_name", f"plant_{plant_id}")
    desired_moisture = data.get("desired_moisture", 60.0)
    water_limit = data.get("water_limit", 1.0)
    irrigation_days = data.get("irrigation_days")
    irrigation_time = data.get("irrigation_time")
    plant_type = data.get("plant_type", "default")
    schedule_data = data.get("schedule_data")
    
    logger.info(f"Adding plant {plant_name} (ID: {plant_id}) with desired moisture {desired_moisture}%")
    
    try:
        # Convert server plant_id to internal engine plant_id if not already mapped
        plant_id_str = str(plant_id)
        if plant_id_str in plant_id_map:
            logger.warning(f"Plant {plant_id_str} already exists, updating configuration")
            internal_plant_id = plant_id_map[plant_id_str]
            # Remove existing plant first
            smart_engine.remove_plant(internal_plant_id)
        else:
            # Create new internal ID
            internal_plant_id = next_plant_id
            plant_id_map[plant_id_str] = internal_plant_id
            next_plant_id += 1
        
        # Convert schedule_data to the format expected by the engine
        engine_schedule_data = None
        if schedule_data and isinstance(schedule_data, list):
            engine_schedule_data = []
            for schedule_entry in schedule_data:
                if isinstance(schedule_entry, dict):
                    engine_schedule_data.append({
                        "day": schedule_entry.get("day"),
                        "time": schedule_entry.get("time"),
                        "valve_number": schedule_entry.get("valve_number", 1)
                    })
        
        # Add plant to engine with provided parameters
        smart_engine.add_plant(
            plant_id=internal_plant_id,
            desired_moisture=desired_moisture,
            schedule_data=engine_schedule_data,
            plant_lat=32.7940,  # Default coordinates (Israel)
            plant_lon=34.9896,
            pipe_diameter=1.0,   # Default values - could be made configurable
            flow_rate=0.05,
            water_limit=water_limit
        )
        
        logger.info(f" Successfully added plant {plant_name} to engine with internal ID {internal_plant_id}")
        
        # Get assigned hardware info
        assigned_valve = None
        assigned_sensor = None
        if internal_plant_id in smart_engine.plants:
            plant = smart_engine.plants[internal_plant_id]
            assigned_valve = plant.valve.valve_id
            assigned_sensor = plant.sensor.modbus_id
        
        # Create success response using DTO
        response = AddPlantRequest.success(
            plant_id=internal_plant_id,  # Use internal ID for Pi's reference
            desired_moisture=desired_moisture,
            assigned_valve=assigned_valve,
            assigned_sensor=assigned_sensor
        )
        
        return True, response, next_plant_id
        
    except Exception as e:
        logger.error(f"Failed to add plant {plant_name}: {e}")
        
        # Create error response using DTO
        response = AddPlantRequest.error(
            plant_id=plant_id,
            error_message=str(e)
        )
        
        return False, response, next_plant_id