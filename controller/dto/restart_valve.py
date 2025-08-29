from typing import Optional, Dict, Any
import time

class RestartValveRequest:
    """DTO for Server → Pi RESTART_VALVE command."""
    def __init__(self, plant_id: int):
        self.plant_id = plant_id

    @classmethod
    def from_websocket_data(cls, data: Dict[str, Any]) -> 'RestartValveRequest':
        return cls(plant_id=int(data.get('plant_id', 0)))

    def to_websocket_data(self) -> Dict[str, Any]:
        return { 'plant_id': self.plant_id }


class RestartValveResponse:
    """DTO for Pi → Server RESTART_VALVE_RESPONSE."""
    def __init__(self, plant_id: int, status: str, error_message: Optional[str] = None, ts: Optional[float] = None):
        self.plant_id = int(plant_id)
        self.status = status  # 'success' | 'error'
        self.error_message = error_message
        self.timestamp = ts or time.time()

    @classmethod
    def success(cls, plant_id: int) -> 'RestartValveResponse':
        return cls(plant_id=plant_id, status='success')

    @classmethod
    def error(cls, plant_id: int, error_message: str) -> 'RestartValveResponse':
        return cls(plant_id=plant_id, status='error', error_message=error_message)

    @classmethod
    def from_websocket_data(cls, data: Dict[str, Any]) -> 'RestartValveResponse':
        return cls(
            plant_id=data.get('plant_id', 0),
            status=data.get('status', 'error'),
            error_message=data.get('error_message')
        )

    def to_websocket_data(self) -> Dict[str, Any]:
        body: Dict[str, Any] = {
            'plant_id': self.plant_id,
            'status': self.status,
            'timestamp': self.timestamp,
        }
        if self.error_message:
            body['error_message'] = self.error_message
        return body
