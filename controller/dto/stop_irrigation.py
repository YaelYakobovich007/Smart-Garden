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

    @classmethod
    def from_websocket_data(cls, data: dict) -> "StopIrrigation":
        """Create a StopIrrigation DTO from incoming WebSocket data.

        Accepts both snake_case and camelCase keys and tolerates missing
        optional fields. If timestamp is not provided, it will be generated.
        """
        # Allow nested payloads if a higher-level handler passes the whole message
        payload = data.get("data") if isinstance(data, dict) and "data" in data else data

        # Support multiple key styles
        plant_id = (
            (payload.get("plant_id") if isinstance(payload, dict) else None)
            if payload is not None else None
        )
        if plant_id is None and isinstance(payload, dict):
            plant_id = payload.get("plantId")

        plant_name = None
        if isinstance(payload, dict):
            plant_name = payload.get("plant_name", payload.get("plantName"))

        timestamp_value = None
        if isinstance(payload, dict):
            timestamp_value = payload.get("timestamp")

        # Normalize plant_id to int when possible
        if isinstance(plant_id, str) and plant_id.isdigit():
            plant_id = int(plant_id)

        if not isinstance(plant_id, int):
            raise ValueError("Invalid or missing plant_id in STOP_IRRIGATION message")

        return cls(
            event="stop_irrigation",
            plant_id=plant_id,
            plant_name=plant_name,
            timestamp=timestamp_value
        )