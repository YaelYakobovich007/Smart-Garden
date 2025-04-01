import threading
import schedule
from typing import List, Dict
from irrigation_algorithm import IrrigationAlgorithm

class IrrigationSchedule:
    def __init__(self, plant_id: int, schedule_data: List[Dict[str, str]], irrigation_algorithm: "IrrigationAlgorithm") -> None:
        self.plant_id: int = plant_id
        self.schedule_data: List[Dict[str, str]] = schedule_data
        self.irrigation_algorithm: IrrigationAlgorithm = irrigation_algorithm
        if  schedule_data:
            self.setup_schedules()

    def setup_schedules(self) -> None:
        for schedule_item in self.schedule_data:
            day = schedule_item["day"]
            time_str = schedule_item["time"]
            valve_number = schedule_item["valve_number"]
            if day == "Sunday":
                schedule.every().sunday.at(time_str).do(self.start_irrigation_thread, valve_number)
            elif day == "Monday":
                schedule.every().monday.at(time_str).do(self.start_irrigation_thread, valve_number)
            elif day == "Tuesday":
                schedule.every().tuesday.at(time_str).do(self.start_irrigation_thread, valve_number)
            elif day == "Wednesday":
                schedule.every().wednesday.at(time_str).do(self.start_irrigation_thread, valve_number)
            elif day == "Thursday":
                schedule.every().thursday.at(time_str).do(self.start_irrigation_thread, valve_number)
            elif day == "Friday":
                schedule.every().friday.at(time_str).do(self.start_irrigation_thread, valve_number)
            elif day == "Saturday":
                schedule.every().saturday.at(time_str).do(self.start_irrigation_thread, valve_number)

            print(f" Scheduled irrigation: {day} at {time_str} on valve {valve_number}.")

    def start_irrigation_thread(self, valve_number: int) -> None:
        threading.Thread(target=self.irrigation_algorithm.irrigate, args=(valve_number,), daemon=True).start()

