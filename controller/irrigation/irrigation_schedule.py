import threading
from controller.irrigation.irrigation_algorithm import IrrigationAlgorithm
from controller.models.plant import Plant

try:
    import schedule
except ImportError:
    print("The 'schedule' module is not installed. Install it using 'pip install schedule'.")
    raise
from typing import List, Dict

class IrrigationSchedule:
    """
    Handles time-based irrigation scheduling for a specific plant using the `schedule` module.
    Schedules are provided as a list of (day, time) entries, and trigger irrigation using
    the given irrigation algorithm.

    Attributes:
        plant (Plant): The plant instance associated with this schedule.
        schedule_data (List[Dict[str, str]]): List of scheduling entries in the format:
            [{"day": "monday", "time": "06:00"}, ...]
        irrigation_algorithm (IrrigationAlgorithm): Algorithm to run when scheduled time is reached.
    """

    def __init__(self, plant: Plant, schedule_data: List[Dict[str, str]], irrigation_algorithm: "IrrigationAlgorithm") -> None:
        """
        Initializes the irrigation schedule.

        Args:
            plant (Plant): The plant instance this schedule controls.
            schedule_data (List[Dict[str, str]]): A list of schedule dicts with "day" and "time" keys.
            irrigation_algorithm (IrrigationAlgorithm): The irrigation logic to invoke on schedule.
        """
        self.plant: Plant = plant
        self.schedule_data: List[Dict[str, str]] = schedule_data
        self.irrigation_algorithm: IrrigationAlgorithm = irrigation_algorithm

        if schedule_data:
            self.setup_schedules()

    def setup_schedules(self) -> None:
        """
        Registers all the scheduled jobs using the `schedule` library.
        Converts each (day, time) pair into a scheduled task.
        """
        for schedule_item in self.schedule_data:
            day = schedule_item["day"]
            time_str = schedule_item["time"]

            job = getattr(schedule.every(), day.lower(), None)
            if job:
                job.at(time_str).do(self.start_irrigation_thread)

    def start_irrigation_thread(self) -> None:
        """
        Launches the irrigation algorithm for the assigned plant in a separate thread.
        """
        threading.Thread(target=self.irrigation_algorithm.irrigate, args=(self.plant,), daemon=True).start()

