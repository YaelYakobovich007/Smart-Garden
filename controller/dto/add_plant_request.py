from typing import Optional
from pydantic import BaseModel
import time

class AddPlantRequest(BaseModel):
    """
    Data Transfer Object for Pi → Server communication when a plant is added.
    Used by the Pi to notify the server that a plant has been added to the Smart Garden Engine.
    """
    plant_id: Optional[int] = None          # internal plant ID used by the Pi engine
    status: str                             # "success" or "error" 
    desired_moisture: float                 # target moisture level that was set
    assigned_valve: Optional[int] = None    # valve ID assigned to this plant
    assigned_sensor: Optional[int] = None   # sensor ID assigned to this plant
    error_message: Optional[str] = None     # error details if status is "error"
    timestamp: Optional[float] = None       # when the plant was added
    
    def __init__(self, **data):
        # Auto-set timestamp if not provided
        if data.get('timestamp') is None:
            data['timestamp'] = time.time()
        super().__init__(**data)
    
    @classmethod
    def success(cls, plant_id: int, desired_moisture: float,
                assigned_valve: int = None, assigned_sensor: int = None) -> "AddPlantRequest":
        """Create a success notification for when plant is added successfully."""
        return cls(
            plant_id=plant_id,
            status="success",
            desired_moisture=desired_moisture,
            assigned_valve=assigned_valve,
            assigned_sensor=assigned_sensor
        )
    
    @classmethod  
    def error(cls, plant_id: int, error_message: str, desired_moisture: float = 0.0) -> "AddPlantRequest":
        """Create an error notification for when plant addition fails."""
        return cls(
            plant_id=plant_id,
            status="error",
            desired_moisture=desired_moisture,
            error_message=error_message
        )
    
    def to_websocket_data(self) -> dict:
        """Convert to dictionary format for WebSocket transmission to server."""
        return {
            "plant_id": self.plant_id,
            "status": self.status,
            "desired_moisture": self.desired_moisture,
            "assigned_valve": self.assigned_valve,
            "assigned_sensor": self.assigned_sensor,
            "error_message": self.error_message,
            "timestamp": self.timestamp
        }
