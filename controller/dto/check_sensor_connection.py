from dataclasses import dataclass
from typing import Optional, Dict, Any
import time


@dataclass
class CheckSensorConnectionRequest:
    """
    DTO for Server → Pi request to verify a plant's sensor connection.

    This request asks the Pi to attempt a live read from the sensor assigned to
    the given plant. A short timeout is recommended by the caller to avoid
    blocking the diagnostics UI for too long.
    """

    plant_id: int
    timeout_seconds: int = 5

    @classmethod
    def from_websocket_data(cls, data: Dict[str, Any]) -> "CheckSensorConnectionRequest":
        return cls(
            plant_id=int(data.get("plant_id", 0)),
            timeout_seconds=int(data.get("timeout_seconds", 5))
        )


@dataclass
class CheckSensorConnectionResponse:
    """
    DTO for Pi → Server response with sensor connectivity result.

    Fields are designed to be explicit and readable in logs and UI. Use
    `status` = "success"|"error" and provide `message`/`error_message` for context.
    """

    plant_id: int
    status: str  # "success" | "error"
    is_connected: bool
    moisture: Optional[float] = None
    temperature: Optional[float] = None
    sensor_port: Optional[str] = None
    message: Optional[str] = None
    error_message: Optional[str] = None
    timestamp: float = None

    def __post_init__(self) -> None:
        if self.timestamp is None:
            self.timestamp = time.time()

    @classmethod
    def success(
        cls,
        plant_id: int,
        moisture: Optional[float],
        temperature: Optional[float],
        sensor_port: Optional[str] = None,
        message: str = "Sensor responded successfully"
    ) -> "CheckSensorConnectionResponse":
        return cls(
            plant_id=plant_id,
            status="success",
            is_connected=True,
            moisture=moisture,
            temperature=temperature,
            sensor_port=sensor_port,
            message=message
        )

    @classmethod
    def error(
        cls,
        plant_id: int,
        error_message: str,
        sensor_port: Optional[str] = None
    ) -> "CheckSensorConnectionResponse":
        return cls(
            plant_id=plant_id,
            status="error",
            is_connected=False,
            moisture=None,
            temperature=None,
            sensor_port=sensor_port,
            error_message=error_message
        )

    def to_websocket_data(self) -> Dict[str, Any]:
        """
        Convert to the generic websocket payload dict used by the server.
        """
        return {
            "plant_id": self.plant_id,
            "status": self.status,
            "is_connected": self.is_connected,
            "moisture": self.moisture,
            "temperature": self.temperature,
            "sensor_port": self.sensor_port,
            "message": self.message,
            "error_message": self.error_message,
            "timestamp": self.timestamp
        }


