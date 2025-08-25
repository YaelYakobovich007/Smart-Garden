from typing import Optional, Dict, Any
from pydantic import BaseModel
import time


class IrrigationProgress(BaseModel):
    """
    Data Transfer Object for Pi → Server communication during irrigation process.
    Used to send structured progress updates instead of individual log messages.
    """
    plant_id: int                                    # ID of the plant being irrigated
    stage: str                                       # Current stage: "initial_check", "overwatering_check", "pulse", "final_summary", "fault_detected"
    pulse_number: Optional[int] = None               # Current pulse number (if in pulse stage)
    current_moisture: Optional[float] = None         # Current moisture reading
    target_moisture: Optional[float] = None          # Target moisture level
    moisture_gap: Optional[float] = None             # Difference between current and target
    total_water_used: Optional[float] = None         # Total water used so far
    water_limit: Optional[float] = None              # Maximum water allowed
    status: str                                      # "in_progress", "completed", "skipped", "error"
    message: Optional[str] = None                    # Human-readable status message
    details: Optional[Dict[str, Any]] = None         # Additional stage-specific details
    timestamp: Optional[float] = None                # When this progress update was created
    
    def __init__(self, **data):
        # Auto-set timestamp if not provided
        if data.get('timestamp') is None:
            data['timestamp'] = time.time()
        super().__init__(**data)
    
    @classmethod
    def initial_check(cls, plant_id: int, current_moisture: float, target_moisture: float) -> "IrrigationProgress":
        """Create initial moisture check progress update."""
        return cls(
            plant_id=plant_id,
            stage="initial_check",
            current_moisture=current_moisture,
            target_moisture=target_moisture,
            moisture_gap=target_moisture - current_moisture,
            status="in_progress",
            message=f"Initial moisture check: {current_moisture:.1f}% (target: {target_moisture:.1f}%)"
        )
    
    @classmethod
    def overwatering_check(cls, plant_id: int, current_moisture: float, target_moisture: float, 
                          is_overwatered: bool) -> "IrrigationProgress":
        """Create overwatering check progress update."""
        return cls(
            plant_id=plant_id,
            stage="overwatering_check",
            current_moisture=current_moisture,
            target_moisture=target_moisture,
            moisture_gap=target_moisture - current_moisture,
            status="overwatered" if is_overwatered else "in_progress",
            message=f"Overwatering check: {'OVERWATERED' if is_overwatered else 'OK'} - {current_moisture:.1f}% vs {target_moisture:.1f}%",
            details={"is_overwatered": is_overwatered}
        )
    
    @classmethod
    def pulse_update(cls, plant_id: int, pulse_number: int, current_moisture: float, 
                    target_moisture: float, total_water_used: float, water_limit: float) -> "IrrigationProgress":
        """Create pulse progress update."""
        moisture_gap = target_moisture - current_moisture
        return cls(
            plant_id=plant_id,
            stage="pulse",
            pulse_number=pulse_number,
            current_moisture=current_moisture,
            target_moisture=target_moisture,
            moisture_gap=moisture_gap,
            total_water_used=total_water_used,
            water_limit=water_limit,
            status="in_progress",
            message=f"Pulse {pulse_number}: {current_moisture:.1f}% → {target_moisture:.1f}% (gap: {moisture_gap:.1f}%, water: {total_water_used:.2f}L)"
        )
    
    @classmethod
    def final_summary(cls, plant_id: int, initial_moisture: float, final_moisture: float, 
                     target_moisture: float, total_water_used: float, pulse_count: int, 
                     target_reached: bool) -> "IrrigationProgress":
        """Create final summary progress update."""
        return cls(
            plant_id=plant_id,
            stage="final_summary",
            current_moisture=final_moisture,
            target_moisture=target_moisture,
            moisture_gap=target_moisture - final_moisture,
            total_water_used=total_water_used,
            status="completed" if target_reached else "partial",
            message=f"Irrigation completed: {initial_moisture:.1f}% → {final_moisture:.1f}% (target: {target_moisture:.1f}%) - {total_water_used:.2f}L water, {pulse_count} pulses",
            details={
                "initial_moisture": initial_moisture,
                "final_moisture": final_moisture,
                "pulse_count": pulse_count,
                "target_reached": target_reached,
                "moisture_increase": final_moisture - initial_moisture
            }
        )
    
    @classmethod
    def fault_detected(cls, plant_id: int, final_moisture: float, target_moisture: float, 
                      total_water_used: float, water_limit: float) -> "IrrigationProgress":
        """Create fault detection progress update."""
        return cls(
            plant_id=plant_id,
            stage="fault_detected",
            current_moisture=final_moisture,
            target_moisture=target_moisture,
            moisture_gap=target_moisture - final_moisture,
            total_water_used=total_water_used,
            water_limit=water_limit,
            status="error",
            message=f"FAULT DETECTED: Watered {total_water_used:.2f}L but moisture only {final_moisture:.1f}% (target: {target_moisture:.1f}%)",
            details={
                "fault_type": "sensor_mismatch_or_irrigation_fault",
                "possible_issues": ["Sensor fault", "Valve malfunction", "Soil drainage"]
            }
        )
    
    def to_websocket_data(self) -> dict:
        """Convert to dictionary format for WebSocket transmission to server."""
        return {
            "plant_id": self.plant_id,
            "stage": self.stage,
            "pulse_number": self.pulse_number,
            "current_moisture": self.current_moisture,
            "target_moisture": self.target_moisture,
            "moisture_gap": self.moisture_gap,
            "total_water_used": self.total_water_used,
            "water_limit": self.water_limit,
            "status": self.status,
            "message": self.message,
            "details": self.details,
            "timestamp": self.timestamp
        }
