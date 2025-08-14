from dataclasses import dataclass
from typing import Optional, Dict, Any


@dataclass
class CloseValveRequest:
    """
    DTO for CLOSE_VALVE requests from server to Pi.
    """
    plant_id: int
    
    def to_websocket_data(self) -> Dict[str, Any]:
        """
        Convert to WebSocket message format.
        """
        return {
            "type": "CLOSE_VALVE",
            "data": {
                "plant_id": self.plant_id
            }
        }
    
    @classmethod
    def from_websocket_data(cls, data: Dict[str, Any]) -> 'CloseValveRequest':
        """
        Create from WebSocket message data.
        """
        return cls(
            plant_id=data.get("plant_id")
        )


@dataclass
class CloseValveResponse:
    """
    DTO for CLOSE_VALVE responses from Pi to server.
    """
    plant_id: int
    status: str  # "success" or "error"
    message: Optional[str] = None
    error_message: Optional[str] = None
    
    def to_websocket_data(self) -> Dict[str, Any]:
        """
        Convert to WebSocket message format.
        """
        return {
            "type": "CLOSE_VALVE_RESPONSE",
            "data": {
                "plant_id": self.plant_id,
                "status": self.status,
                "message": self.message,
                "error_message": self.error_message
            }
        }
    
    @classmethod
    def from_websocket_data(cls, data: Dict[str, Any]) -> 'CloseValveResponse':
        """
        Create from WebSocket message data.
        """
        return cls(
            plant_id=data.get("plant_id"),
            status=data.get("status"),
            message=data.get("message"),
            error_message=data.get("error_message")
        )
    
    @classmethod
    def success(cls, plant_id: int, message: str = "Valve closed successfully") -> 'CloseValveResponse':
        """
        Create a success response.
        """
        return cls(
            plant_id=plant_id,
            status="success",
            message=message
        )
    
    @classmethod
    def error(cls, plant_id: int, error_message: str) -> 'CloseValveResponse':
        """
        Create an error response.
        """
        return cls(
            plant_id=plant_id,
            status="error",
            error_message=error_message
        ) 