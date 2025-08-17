from dataclasses import dataclass
from typing import Optional, Dict, Any


@dataclass
class StopIrrigationRequest:
    """
    DTO for STOP_IRRIGATION requests from server to Pi.
    """
    plant_id: int
    
    def to_websocket_data(self) -> Dict[str, Any]:
        """
        Convert to WebSocket message format.
        """
        return {
            "type": "STOP_IRRIGATION",
            "data": {
                "plant_id": self.plant_id
            }
        }
    
    @classmethod
    def from_websocket_data(cls, data: Dict[str, Any]) -> 'StopIrrigationRequest':
        """
        Create from WebSocket message data.
        """
        # Handle both old and new formats
        plant_id = data.get("plant_id")
        if plant_id is None and "plant_name" in data:
            # Log the issue for debugging
            print(f"⚠️ Warning: Received plant_name instead of plant_id in STOP_IRRIGATION request")
            print(f"Data: {data}")
            
        return cls(
            plant_id=plant_id
        )


@dataclass
class StopIrrigationResponse:
    """
    DTO for STOP_IRRIGATION responses from Pi to server.
    """
    plant_id: int
    status: str  # "success" or "error"
    message: Optional[str] = None
    error_message: Optional[str] = None
    reason: Optional[str] = None
    moisture: Optional[float] = None
    final_moisture: Optional[float] = None
    water_added_liters: Optional[float] = None
    
    def to_websocket_data(self) -> Dict[str, Any]:
        """
        Convert to WebSocket message format.
        """
        data = {
            "type": "STOP_IRRIGATION_RESPONSE",
            "data": {
                "plant_id": self.plant_id,
                "status": self.status,
                "message": self.message,
                "error_message": self.error_message
            }
        }
        
        if self.reason:
            data["data"]["reason"] = self.reason
        if self.moisture is not None:
            data["data"]["moisture"] = self.moisture
        if self.final_moisture is not None:
            data["data"]["final_moisture"] = self.final_moisture
        if self.water_added_liters is not None:
            data["data"]["water_added_liters"] = self.water_added_liters
            
        return data
    
    @classmethod
    def from_websocket_data(cls, data: Dict[str, Any]) -> 'StopIrrigationResponse':
        """
        Create from WebSocket message data.
        """
        return cls(
            plant_id=data.get("plant_id"),
            status=data.get("status"),
            message=data.get("message"),
            error_message=data.get("error_message"),
            reason=data.get("reason"),
            moisture=data.get("moisture"),
            final_moisture=data.get("final_moisture"),
            water_added_liters=data.get("water_added_liters")
        )
    
    @classmethod
    def success(cls, plant_id: int, message: str = "Smart irrigation stopped successfully", 
                moisture: Optional[float] = None, final_moisture: Optional[float] = None,
                water_added_liters: Optional[float] = None) -> 'StopIrrigationResponse':
        """
        Create a success response.
        """
        return cls(
            plant_id=plant_id,
            status="success",
            message=message,
            reason="Smart irrigation stopped by user",
            moisture=moisture,
            final_moisture=final_moisture,
            water_added_liters=water_added_liters
        )
    
    @classmethod
    def error(cls, plant_id: int, error_message: str, moisture: Optional[float] = None) -> 'StopIrrigationResponse':
        """
        Create an error response.
        """
        return cls(
            plant_id=plant_id,
            status="error",
            error_message=error_message,
            moisture=moisture
        )
