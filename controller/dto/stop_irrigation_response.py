from typing import Optional
from pydantic import BaseModel
import time


class StopIrrigationResponse(BaseModel):
    """
    Data Transfer Object for Pi → Server communication when stop irrigation completes.
    Used by the Pi to notify the server about the result of stopping irrigation.
    """
    event: str                                   # Identifies the type of event (stop_irrigation_response)
    plant_id: int                                # ID of the plant that was stopped
    status: str                                  # "success", "error"
    moisture: Optional[float] = None             # Current moisture level when stopped
    final_moisture: Optional[float] = None       # Same as moisture for stopping
    water_added_liters: Optional[float] = None   # How much water was added before stopping
    error_message: Optional[str] = None          # Error details if status is "error"
    timestamp: Optional[float] = None            # When the stop was completed
    
    def __init__(self, **data):
        # Auto-set timestamp if not provided
        if data.get('timestamp') is None:
            data['timestamp'] = time.time()
        super().__init__(**data)
    
    @classmethod
    def success(cls, plant_id: int, moisture: float, water_added_liters: float = 0.0) -> "StopIrrigationResponse":
        """Create a success notification for when stop completes successfully."""
        return cls(
            event="stop_irrigation_response",
            plant_id=plant_id,
            status="success",
            moisture=moisture,
            final_moisture=moisture,  # Same as current moisture when stopping
            water_added_liters=water_added_liters
        )
    
    @classmethod
    def error(cls, plant_id: int, error_message: str, moisture: Optional[float] = None,
              water_added_liters: float = 0.0) -> "StopIrrigationResponse":
        """Create an error notification for when stop fails."""
        return cls(
            event="stop_irrigation_response",
            plant_id=plant_id,
            status="error",
            moisture=moisture,
            final_moisture=moisture,  # Same as current moisture when stopping
            water_added_liters=water_added_liters,
            error_message=error_message
        )
    
    def to_websocket_data(self) -> dict:
        """Convert to dictionary format for WebSocket transmission to server."""
        return {
            "type": "STOP_IRRIGATION_RESPONSE",
            "data": {
                "event": self.event,
                "plant_id": self.plant_id,
                "status": self.status,
                "moisture": self.moisture,
                "final_moisture": self.final_moisture,
                "water_added_liters": self.water_added_liters,
                "error_message": self.error_message,
                "timestamp": self.timestamp
            }
        }
