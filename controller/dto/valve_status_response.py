from dataclasses import dataclass
from typing import Optional, Dict, Any


@dataclass
class ValveStatusResponse:
    """
    Response DTO for valve status requests.
    """
    plant_id: int
    success: bool
    status_data: Optional[Dict[str, Any]] = None
    error_message: Optional[str] = None
    
    @classmethod
    def success(cls, plant_id: int, status_data: Dict[str, Any]) -> "ValveStatusResponse":
        """
        Create a successful valve status response.
        
        Args:
            plant_id (int): The plant ID
            status_data (Dict[str, Any]): The valve status data
            
        Returns:
            ValveStatusResponse: Success response
        """
        return cls(
            plant_id=plant_id,
            success=True,
            status_data=status_data
        )
    
    @classmethod
    def error(cls, plant_id: int, error_message: str) -> "ValveStatusResponse":
        """
        Create an error valve status response.
        
        Args:
            plant_id (int): The plant ID
            error_message (str): The error message
            
        Returns:
            ValveStatusResponse: Error response
        """
        return cls(
            plant_id=plant_id,
            success=False,
            error_message=error_message
        )
    
    def to_dict(self) -> Dict[str, Any]:
        """
        Convert the response to a dictionary.
        
        Returns:
            Dict[str, Any]: Dictionary representation of the response
        """
        return {
            "plant_id": self.plant_id,
            "success": self.success,
            "status_data": self.status_data,
            "error_message": self.error_message
        }
    
    def to_websocket_data(self) -> Dict[str, Any]:
        """
        Convert the response to WebSocket data format.
        
        Returns:
            Dict[str, Any]: WebSocket data format
        """
        return {
            "plant_id": self.plant_id,
            "success": self.success,
            "status_data": self.status_data,
            "error_message": self.error_message
        }
