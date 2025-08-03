from typing import List, Optional
from pydantic import BaseModel
import time
from .moisture_update import MoistureUpdate

class AllPlantsMoistureResponse(BaseModel):
    """
    Data Transfer Object for Pi → Server communication when sending all plants moisture data.
    Contains a list of individual plant moisture readings with metadata.
    """
    plants: List[dict]                         # List of plant moisture data (converted from MoistureUpdate DTOs)
    total_plants: int                          # Total number of plants in the response
    status: str = "success"                    # "success" or "error"
    error_message: Optional[str] = None        # error details if status is "error"
    timestamp: Optional[float] = None          # when the response was created
    
    def __init__(self, **data):
        # Auto-set timestamp if not provided
        if data.get('timestamp') is None:
            data['timestamp'] = time.time()
        super().__init__(**data)
    
    @classmethod
    def success(cls, moisture_updates: List[MoistureUpdate]) -> "AllPlantsMoistureResponse":
        """Create a success response from a list of MoistureUpdate DTOs."""
        plants_data = []
        for moisture_update in moisture_updates:
            plants_data.append(moisture_update.to_websocket_data())
        
        return cls(
            plants=plants_data,
            total_plants=len(plants_data),
            status="success"
        )
    
    @classmethod  
    def error(cls, error_message: str, error_updates: List[MoistureUpdate] = None) -> "AllPlantsMoistureResponse":
        """Create an error response with optional error DTOs."""
        plants_data = []
        if error_updates:
            for error_update in error_updates:
                plants_data.append(error_update.to_websocket_data())
        
        return cls(
            plants=plants_data,
            total_plants=len(plants_data),
            status="error",
            error_message=error_message
        )
    
    def to_websocket_data(self) -> dict:
        """Convert to dictionary format for WebSocket transmission to server."""
        return {
            "plants": self.plants,
            "total_plants": self.total_plants,
            "status": self.status,
            "error_message": self.error_message,
            "timestamp": self.timestamp
        }