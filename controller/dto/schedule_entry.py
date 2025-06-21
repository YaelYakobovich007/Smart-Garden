from pydantic import BaseModel

class ScheduleEntry(BaseModel):
    day: str                                     # day of the week when irrigation should occur
    time: str                                    # time of day in HH:MM format
    valve_number: int