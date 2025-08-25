import sys
import os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from typing import Optional, Dict, Any
from controller.dto.irrigation_result import IrrigationResult


class OpenValveRequest:
    """
    Data Transfer Object for Pi → Server communication when opening a valve.
    """
    
    def __init__(
        self,
        plant_id: int,
        time_minutes: int,
        status: str = "pending",
        message: Optional[str] = None,
        error_message: Optional[str] = None,
        timestamp: Optional[float] = None
    ):
        self.plant_id = plant_id
        self.time_minutes = time_minutes
        self.status = status
        self.message = message
        self.error_message = error_message
        self.timestamp = timestamp or __import__('time').time()
    
    @classmethod
    def from_websocket_data(cls, data: Dict[str, Any]) -> 'OpenValveRequest':
        """
        Create OpenValveRequest from WebSocket data.
        
        Args:
            data (Dict[str, Any]): WebSocket message data
            
        Returns:
            OpenValveRequest: Parsed request object
        """
        return cls(
            plant_id=data.get("plant_id", 0),
            time_minutes=data.get("time_minutes", 0),
            status=data.get("status", "pending"),
            message=data.get("message"),
            error_message=data.get("error_message"),
            timestamp=data.get("timestamp")
        )
    
    @classmethod
    def success(cls, plant_id: int, time_minutes: int, message: str) -> 'OpenValveRequest':
        """
        Create a successful open valve request.
        
        Args:
            plant_id (int): The plant ID
            time_minutes (int): Duration in minutes
            message (str): Success message
            
        Returns:
            OpenValveRequest: Success request object
        """
        return cls(
            plant_id=plant_id,
            time_minutes=time_minutes,
            status="success",
            message=message
        )
    
    @classmethod
    def error(cls, plant_id: int, error_message: str) -> 'OpenValveRequest':
        """
        Create an error open valve request.
        
        Args:
            plant_id (int): The plant ID
            error_message (str): Error message
            
        Returns:
            OpenValveRequest: Error request object
        """
        return cls(
            plant_id=plant_id,
            time_minutes=0,
            status="error",
            error_message=error_message
        )
    
    def to_websocket_data(self) -> Dict[str, Any]:
        """
        Convert to WebSocket message data.
        
        Returns:
            Dict[str, Any]: WebSocket message data
        """
        data = {
            "plant_id": self.plant_id,
            "time_minutes": self.time_minutes,
            "status": self.status,
            "timestamp": self.timestamp
        }
        
        if self.message:
            data["message"] = self.message
        
        if self.error_message:
            data["error_message"] = self.error_message
        
        return data
    
    def __str__(self) -> str:
        return f"OpenValveRequest(plant_id={self.plant_id}, time_minutes={self.time_minutes}, status='{self.status}')"
    
    def __repr__(self) -> str:
        return self.__str__()


class OpenValveResponse:
    """
    Data Transfer Object for Pi → Server communication when responding to open valve request.
    """
    
    def __init__(
        self,
        plant_id: int,
        time_minutes: int,
        status: str = "pending",
        message: Optional[str] = None,
        error_message: Optional[str] = None,
        reason: Optional[str] = None,
        timestamp: Optional[float] = None
    ):
        self.plant_id = plant_id
        self.time_minutes = time_minutes
        self.status = status
        self.message = message
        self.error_message = error_message
        self.reason = reason or message  # Use message as reason if reason not provided
        self.timestamp = timestamp or __import__('time').time()
    
    @classmethod
    def from_irrigation_result(cls, result: IrrigationResult, plant_id: int, time_minutes: int) -> 'OpenValveResponse':
        """
        Create OpenValveResponse from IrrigationResult.
        
        Args:
            result (IrrigationResult): The irrigation result
            plant_id (int): The plant ID
            time_minutes (int): The requested time
            
        Returns:
            OpenValveResponse: Response object
        """
        return cls(
            plant_id=plant_id,
            time_minutes=time_minutes,
            status=result.status,
            message=result.reason,  # Use reason instead of message
            error_message=result.error_message,
            timestamp=result.timestamp
        )
    
    @classmethod
    def success(cls, plant_id: int, time_minutes: int, message: str) -> 'OpenValveResponse':
        """
        Create a successful open valve response.
        
        Args:
            plant_id (int): The plant ID
            time_minutes (int): Duration in minutes
            message (str): Success message
            
        Returns:
            OpenValveResponse: Success response object
        """
        return cls(
            plant_id=plant_id,
            time_minutes=time_minutes,
            status="success",
            message=message
        )
    
    @classmethod
    def error(cls, plant_id: int, error_message: str) -> 'OpenValveResponse':
        """
        Create an error open valve response.
        
        Args:
            plant_id (int): The plant ID
            error_message (str): Error message
            
        Returns:
            OpenValveResponse: Error response object
        """
        return cls(
            plant_id=plant_id,
            time_minutes=0,
            status="error",
            error_message=error_message
        )
    
    def to_websocket_data(self) -> Dict[str, Any]:
        """
        Convert to WebSocket message data.
        
        Returns:
            Dict[str, Any]: WebSocket message data
        """
        data = {
            "plant_id": self.plant_id,
            "time_minutes": self.time_minutes,
            "status": self.status,
            "timestamp": self.timestamp
        }
        
        if self.message:
            data["message"] = self.message
        
        if self.reason:
            data["reason"] = self.reason
        
        if self.error_message:
            data["error_message"] = self.error_message
        
        return data
    
    def __str__(self) -> str:
        return f"OpenValveResponse(plant_id={self.plant_id}, time_minutes={self.time_minutes}, status='{self.status}')"
    
    def __repr__(self) -> str:
        return self.__str__() 