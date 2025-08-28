from typing import Optional, Dict, Any
from pydantic import BaseModel
import time


class RemovePlantRequest(BaseModel):
    """
    DTO for Server → Pi communication when requesting to remove a plant from the Pi engine.
    """
    event: str
    plant_id: int
    timestamp: Optional[float] = None

    def __init__(self, **data):
        if data.get('timestamp') is None:
            data['timestamp'] = time.time()
        super().__init__(**data)

    @classmethod
    def from_websocket_data(cls, data: Dict[str, Any]) -> "RemovePlantRequest":
        payload = data.get("data") if isinstance(data, dict) and "data" in data else data

        plant_id = None
        if isinstance(payload, dict):
            plant_id = payload.get("plant_id", payload.get("plantId"))

        if isinstance(plant_id, str) and plant_id.isdigit():
            plant_id = int(plant_id)

        if not isinstance(plant_id, int):
            raise ValueError("Invalid or missing plant_id in REMOVE_PLANT message")

        return cls(event="remove_plant", plant_id=plant_id, timestamp=(payload.get("timestamp") if isinstance(payload, dict) else None))

    def to_websocket_data(self) -> Dict[str, Any]:
        return {
            "type": "REMOVE_PLANT",
            "data": {
                "event": self.event,
                "plant_id": self.plant_id,
                "timestamp": self.timestamp
            }
        }


class RemovePlantResponse(BaseModel):
    """
    DTO for Pi → Server communication responding to a remove plant request.
    """
    plant_id: int
    status: str  # "success" | "error"
    error_message: Optional[str] = None
    timestamp: Optional[float] = None

    def __init__(self, **data):
        if data.get('timestamp') is None:
            data['timestamp'] = time.time()
        super().__init__(**data)

    @classmethod
    def success(cls, plant_id: int) -> "RemovePlantResponse":
        return cls(plant_id=plant_id, status="success")

    @classmethod
    def error(cls, plant_id: int, error_message: str) -> "RemovePlantResponse":
        return cls(plant_id=plant_id, status="error", error_message=error_message)

    def to_websocket_data(self) -> Dict[str, Any]:
        return {
            "type": "REMOVE_PLANT_RESPONSE",
            "data": {
                "plant_id": self.plant_id,
                "status": self.status,
                "error_message": self.error_message,
                "timestamp": self.timestamp
            }
        }


