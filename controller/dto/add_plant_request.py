from typing import List, Optional
from controller.dto.schedule_entry import ScheduleEntry
from pydantic import BaseModel

class AddPlantRequest(BaseModel):
    action: str                                                    # identifies the type of request ('add_plant')
    plant_id: int                                                  # unique identifier for the plant
    desired_moisture: float                                        # target moisture level for the plant
    pipe_diameter: float                                           # diameter of the irrigation pipe in cm
    flow_rate: float                                               # flow rate of the water in liters per second
    water_limit: float                                             # maximum water amount allowed per irrigation in liters
    schedule: Optional[List[ScheduleEntry]] = None                 # schedule: Optional weekly irrigation schedule for the plant
