from dataclasses import dataclass
from datetime import datetime
from typing import Optional

@dataclass
class IrrigationResult:
    status: str                                  # "done", "skipped", "error"
    reason: Optional[str] = None                 # Reason for skipping or error
    moisture: Optional[float] = None             # Moisture at the beginning of irrigation
    final_moisture: Optional[float] = None       # Moisture at the end (after watering)
    water_added_liters: Optional[float] = None   # How much water was actually given 
    irrigation_time: Optional[datetime] = None   # Time of irrigation


    # TODO: Add a field for the plant name
    