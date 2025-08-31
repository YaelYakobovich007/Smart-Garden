from dataclasses import dataclass
from typing import Optional, Dict, Any
import time


@dataclass
class CheckPowerSupplyRequest:
    """DTO for Server → Pi request to check Pi power/throttle state."""
    plant_id: Optional[int] = None  # optional, for correlation in UI

    @classmethod
    def from_websocket_data(cls, data: Dict[str, Any]) -> "CheckPowerSupplyRequest":
        return cls(plant_id=data.get("plant_id"))


@dataclass
class CheckPowerSupplyResponse:
    """DTO for Pi → Server response reporting Pi power supply health."""
    status: str  # "success" | "error"
    ok: bool
    throttled_raw: Optional[int] = None
    under_voltage_now: Optional[bool] = None
    throttled_now: Optional[bool] = None
    freq_capped_now: Optional[bool] = None
    under_voltage_since_boot: Optional[bool] = None
    throttled_since_boot: Optional[bool] = None
    freq_capped_since_boot: Optional[bool] = None
    source: Optional[str] = None
    plant_id: Optional[int] = None
    message: Optional[str] = None
    error_message: Optional[str] = None
    timestamp: float = None

    def __post_init__(self) -> None:
        if self.timestamp is None:
            self.timestamp = time.time()

    @classmethod
    def success(
        cls,
        ok: bool,
        data: Dict[str, Any],
        plant_id: Optional[int] = None,
        message: Optional[str] = None
    ) -> "CheckPowerSupplyResponse":
        return cls(
            status="success",
            ok=ok,
            throttled_raw=data.get("raw"),
            under_voltage_now=data.get("under_voltage_now"),
            throttled_now=data.get("throttled_now"),
            freq_capped_now=data.get("freq_capped_now"),
            under_voltage_since_boot=data.get("under_voltage_since_boot"),
            throttled_since_boot=data.get("throttled_since_boot"),
            freq_capped_since_boot=data.get("freq_capped_since_boot"),
            source=data.get("source"),
            plant_id=plant_id,
            message=message,
        )

    @classmethod
    def error(
        cls,
        error_message: str,
        plant_id: Optional[int] = None,
        data: Optional[Dict[str, Any]] = None
    ) -> "CheckPowerSupplyResponse":
        data = data or {}
        return cls(
            status="error",
            ok=False,
            throttled_raw=data.get("raw"),
            under_voltage_now=data.get("under_voltage_now"),
            throttled_now=data.get("throttled_now"),
            freq_capped_now=data.get("freq_capped_now"),
            under_voltage_since_boot=data.get("under_voltage_since_boot"),
            throttled_since_boot=data.get("throttled_since_boot"),
            freq_capped_since_boot=data.get("freq_capped_since_boot"),
            source=data.get("source"),
            plant_id=plant_id,
            error_message=error_message,
        )

    def to_websocket_data(self) -> Dict[str, Any]:
        return {
            "status": self.status,
            "ok": self.ok,
            "throttled_raw": self.throttled_raw,
            "under_voltage_now": self.under_voltage_now,
            "throttled_now": self.throttled_now,
            "freq_capped_now": self.freq_capped_now,
            "under_voltage_since_boot": self.under_voltage_since_boot,
            "throttled_since_boot": self.throttled_since_boot,
            "freq_capped_since_boot": self.freq_capped_since_boot,
            "source": self.source,
            "plant_id": self.plant_id,
            "message": self.message,
            "error_message": self.error_message,
            "timestamp": self.timestamp,
        }


