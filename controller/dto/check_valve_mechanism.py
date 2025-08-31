from dataclasses import dataclass
from typing import Optional, Dict, Any
import time


@dataclass
class CheckValveMechanismRequest:
    """
    DTO for Server → Pi request to test the valve mechanism safely.

    The Pi should perform a short open/close pulse (or reuse restart_valve)
    and then report the final state using its internal valve status.
    """

    plant_id: int
    pulse_seconds: float = 0.6

    @classmethod
    def from_websocket_data(cls, data: Dict[str, Any]) -> "CheckValveMechanismRequest":
        return cls(
            plant_id=int(data.get("plant_id", 0)),
            pulse_seconds=float(data.get("pulse_seconds", 0.6))
        )


@dataclass
class CheckValveMechanismResponse:
    """
    DTO for Pi → Server response with valve actuation test result.
    """

    plant_id: int
    status: str  # "success" | "error"
    valve_id: Optional[int] = None
    is_open: Optional[bool] = None
    is_blocked: Optional[bool] = None
    status_data: Optional[Dict[str, Any]] = None
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
        valve_id: Optional[int],
        is_open: bool,
        is_blocked: bool,
        status_data: Optional[Dict[str, Any]] = None,
        message: str = "Valve pulse completed successfully"
    ) -> "CheckValveMechanismResponse":
        return cls(
            plant_id=plant_id,
            status="success",
            valve_id=valve_id,
            is_open=is_open,
            is_blocked=is_blocked,
            status_data=status_data,
            message=message
        )

    @classmethod
    def error(
        cls,
        plant_id: int,
        error_message: str,
        status_data: Optional[Dict[str, Any]] = None
    ) -> "CheckValveMechanismResponse":
        return cls(
            plant_id=plant_id,
            status="error",
            error_message=error_message,
            status_data=status_data
        )

    def to_websocket_data(self) -> Dict[str, Any]:
        return {
            "plant_id": self.plant_id,
            "status": self.status,
            "valve_id": self.valve_id,
            "is_open": self.is_open,
            "is_blocked": self.is_blocked,
            "status_data": self.status_data,
            "message": self.message,
            "error_message": self.error_message,
            "timestamp": self.timestamp
        }


