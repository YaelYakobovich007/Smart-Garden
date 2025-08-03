from typing import Optional
from pydantic import BaseModel
import time

class MoistureUpdate(BaseModel):
    """
    Data Transfer Object for Pi → Server communication when moisture data is sent.
    Used by the Pi to notify the server about plant moisture readings from the Smart Garden Engine.
    """
    event: str                                 # Identifies the type of event (moisture_update)
    plant_id: int                              # ID of the plant being measured
    moisture: Optional[float] = None           # current moisture level in percentage (None if read failed)
    status: str = "success"                    # "success" or "error"
    error_message: Optional[str] = None        # error details if status is "error"
    timestamp: Optional[float] = None          # when the measurement was taken (Unix timestamp)
    
    def __init__(self, **data):
        # Auto-set timestamp if not provided
        if data.get('timestamp') is None:
            data['timestamp'] = time.time()
        super().__init__(**data)
    
    @classmethod
    def success(cls, event: str, plant_id: int, moisture: float) -> "MoistureUpdate":
        """Create a success notification for when moisture is read successfully."""
        return cls(
            event=event,
            plant_id=plant_id,
            moisture=moisture,
            status="success"
        )
    
    @classmethod  
    def error(cls, event: str, plant_id: int, error_message: str) -> "MoistureUpdate":
        """Create an error notification for when moisture reading fails."""
        return cls(
            event=event,
            plant_id=plant_id,
            moisture=None,
            status="error",
            error_message=error_message
        )
    
    @classmethod
    def plant_moisture(cls, plant_id: int, moisture: float) -> "MoistureUpdate":
        """Create a moisture update for a single plant."""
        return cls.success(
            event="plant_moisture_update",
            plant_id=plant_id,
            moisture=moisture
        )
    
    @classmethod
    def all_plants_moisture(cls, plant_id: int, moisture: float) -> "MoistureUpdate":
        """Create a moisture update for all plants (individual plant entry)."""
        return cls.success(
            event="all_plants_moisture_update",
            plant_id=plant_id,
            moisture=moisture
        )
    
    def to_websocket_data(self) -> dict:
        """Convert to dictionary format for WebSocket transmission to server."""
        return {
            "event": self.event,
            "plant_id": self.plant_id,
            "moisture": self.moisture,
            "status": self.status,
            "error_message": self.error_message,
            "timestamp": self.timestamp
        }
