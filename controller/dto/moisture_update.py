from pydantic import BaseModel

class MoistureUpdate(BaseModel):
    event: str                                 # Identifies the type of event (moisture_update)
    plant_id: int                              # ID of the plant being measured
    moisture: float                            # current moisture level in percentage
    timestamp: str                             # timestamp of when the measurement was taken
