from typing import Optional
from pydantic import BaseModel
import time


class StopIrrigation(BaseModel):
    """
    Data Transfer Object for Server → Pi communication when requesting to stop irrigation.
    Used by the server to tell the Pi to stop irrigating a specific plant.
    """
    event: str                                   # Identifies the type of event (stop_irrigation)
    plant_id: int                                # ID of the plant to stop
    plant_name: Optional[str] = None             # Name of the plant (for logging)
    timestamp: Optional[float] = None            # When the stop was requested
    
    def __init__(self, **data):
        # Auto-set timestamp if not provided
        if data.get('timestamp') is None:
            data['timestamp'] = time.time()
        super().__init__(**data)
    
    @classmethod
    def stop_request(cls, plant_id: int, plant_name: Optional[str] = None) -> "StopIrrigation":
        """Create a stop irrigation request for a specific plant."""
        return cls(
            event="stop_irrigation",
            plant_id=plant_id,
            plant_name=plant_name
        )
    
    def to_websocket_data(self) -> dict:
        """Convert to dictionary format for WebSocket transmission to server."""
        return {
            "type": "STOP_IRRIGATION",
            "data": {
                "event": self.event,
                "plant_id": self.plant_id,
                "plant_name": self.plant_name,
                "timestamp": self.timestamp
            }
        }
