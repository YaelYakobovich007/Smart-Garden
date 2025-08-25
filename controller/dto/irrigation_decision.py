from typing import Optional
from pydantic import BaseModel
import time


class IrrigationDecision(BaseModel):
    """
    Data Transfer Object for Pi → Server communication when irrigation decision is made.
    Used to notify that irrigation will start before actual watering begins.
    """
    plant_id: int                                # ID of the plant being checked
    current_moisture: float                      # Current moisture reading
    target_moisture: float                       # Target moisture level
    moisture_gap: float                          # Difference between target and current
    will_irrigate: bool                         # Whether irrigation will proceed
    reason: Optional[str] = None                # Reason for the decision
    timestamp: Optional[float] = None           # When the decision was made
    
    def __init__(self, **data):
        # Auto-set timestamp if not provided
        if data.get('timestamp') is None:
            data['timestamp'] = time.time()
        super().__init__(**data)
    
    @classmethod
    def will_start(cls, plant_id: int, current_moisture: float, target_moisture: float) -> "IrrigationDecision":
        """Create a decision notification for when irrigation will start."""
        moisture_gap = target_moisture - current_moisture
        return cls(
            plant_id=plant_id,
            current_moisture=current_moisture,
            target_moisture=target_moisture,
            moisture_gap=moisture_gap,
            will_irrigate=True,
            reason="moisture_below_target"
        )
    
    @classmethod
    def will_skip(cls, plant_id: int, current_moisture: float, target_moisture: float, reason: str) -> "IrrigationDecision":
        """Create a decision notification for when irrigation will be skipped."""
        moisture_gap = target_moisture - current_moisture
        return cls(
            plant_id=plant_id,
            current_moisture=current_moisture,
            target_moisture=target_moisture,
            moisture_gap=moisture_gap,
            will_irrigate=False,
            reason=reason
        )
    
    def to_websocket_data(self) -> dict:
        """Convert to dictionary format for WebSocket transmission."""
        return {
            "type": "IRRIGATION_DECISION",
            "data": {
                "plant_id": self.plant_id,
                "current_moisture": self.current_moisture,
                "target_moisture": self.target_moisture,
                "moisture_gap": self.moisture_gap,
                "will_irrigate": self.will_irrigate,
                "reason": self.reason,
                "timestamp": self.timestamp
            }
        }