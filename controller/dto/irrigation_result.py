from typing import Optional
from pydantic import BaseModel
import time

class IrrigationResult(BaseModel):
    """
    Data Transfer Object for Pi → Server communication when irrigation is completed.
    Used by the Pi to notify the server about irrigation results from the Smart Garden Engine.
    """
    plant_id: int                                # ID of the plant that was irrigated
    status: str                                  # "success", "skipped", "cancelled", or "error"
    reason: Optional[str] = None                 # Reason for skipping or error
    moisture: Optional[float] = None             # Moisture at the beginning of irrigation
    final_moisture: Optional[float] = None       # Moisture at the end (after watering)
    water_added_liters: Optional[float] = None   # How much water was actually given 
    error_message: Optional[str] = None          # Error details if status is "error"
    timestamp: Optional[float] = None            # When the irrigation was completed
    session_id: Optional[str] = None             # Correlation id for this irrigation run
    
    def __init__(self, **data):
        # Auto-set timestamp if not provided
        if data.get('timestamp') is None:
            data['timestamp'] = time.time()
        super().__init__(**data)
    
    @classmethod
    def success(cls, plant_id: int, moisture: float, final_moisture: float, 
                water_added_liters: float, reason: Optional[str] = None,
                session_id: Optional[str] = None) -> "IrrigationResult":
        """Create a success notification for when irrigation completes successfully."""
        return cls(
            plant_id=plant_id,
            status="success",
            moisture=moisture,
            final_moisture=final_moisture,
            water_added_liters=water_added_liters,
            reason=reason,
            session_id=session_id
        )
    
    @classmethod  
    def skipped(cls, plant_id: int, moisture: float, reason: str, session_id: Optional[str] = None) -> "IrrigationResult":
        """Create a skipped notification for when irrigation is skipped."""
        return cls(
            plant_id=plant_id,
            status="skipped",
            moisture=moisture,
            final_moisture=moisture,  # Same as initial for skipped
            water_added_liters=0.0,
            reason=reason,
            session_id=session_id
        )
    
    @classmethod  
    def error(cls, plant_id: int, error_message: str, moisture: Optional[float] = None,
              final_moisture: Optional[float] = None, water_added_liters: float = 0.0,
              session_id: Optional[str] = None) -> "IrrigationResult":
        """Create an error notification for when irrigation fails."""
        return cls(
            plant_id=plant_id,
            status="error",
            moisture=moisture,
            final_moisture=final_moisture,
            water_added_liters=water_added_liters,
            error_message=error_message,
            reason=error_message,
            session_id=session_id
        )
    
    @classmethod
    def cancelled(cls, plant_id: int, moisture: Optional[float] = None,
                  final_moisture: Optional[float] = None, water_added_liters: float = 0.0,
                  reason: str = "Smart irrigation cancelled by user",
                  session_id: Optional[str] = None) -> "IrrigationResult":
        """Create a cancelled notification for when irrigation is stopped by user."""
        return cls(
            plant_id=plant_id,
            status="cancelled",
            moisture=moisture,
            final_moisture=final_moisture if final_moisture is not None else moisture,
            water_added_liters=water_added_liters,
            reason=reason,
            session_id=session_id
        )
    
    def to_websocket_data(self) -> dict:
        """Convert to dictionary format for WebSocket transmission to server."""
        return {
            "plant_id": self.plant_id,
            "status": self.status,
            "reason": self.reason,
            "moisture": self.moisture,
            "final_moisture": self.final_moisture,
            "water_added_liters": self.water_added_liters,
            "error_message": self.error_message,
            "timestamp": self.timestamp,
            "session_id": self.session_id
        }
    