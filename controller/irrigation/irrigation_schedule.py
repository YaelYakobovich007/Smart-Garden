import threading

try:
    import schedule
except ImportError:
    print("The 'schedule' module is not installed. Install it using 'pip install schedule'.")
    raise
from typing import List, Dict

class IrrigationSchedule:
    def __init__(self, plant_id: int, schedule_data: List[Dict[str, str]], irrigation_algorithm: "IrrigationAlgorithm") -> None:
        from controller.irrigation.irrigation_algorithm import IrrigationAlgorithm
        self.plant_id: int = plant_id
        self.schedule_data: List[Dict[str, str]] = schedule_data
        self.irrigation_algorithm: IrrigationAlgorithm = irrigation_algorithm

        if  schedule_data:
            self.setup_schedules()

    def setup_schedules(self) -> None:
        for schedule_item in self.schedule_data:
            day = schedule_item["day"]
            time_str = schedule_item["time"]

            job = getattr(schedule.every(), day.lower(), None)
            if job:
                job.at(time_str).do(self.start_irrigation_thread)

    def start_irrigation_thread(self) -> None:
        threading.Thread(target=self.irrigation_algorithm.irrigate, args=(self.plant,), daemon=True).start()

