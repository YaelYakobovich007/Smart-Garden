import threading
import schedule

class IrrigationSchedule:
    def __init__(self, plant_id, schedule_data, irrigation_controller, irrigation_algorithm):
        self.plant_id = plant_id
        self.schedule_data = schedule_data
        self.irrigation_controller = irrigation_controller
        self.irrigation_algorithm = irrigation_algorithm
        self.setup_schedules()

    def setup_schedules(self):
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

            print(f"✅ Scheduled irrigation: {day} at {time_str} on valve {valve_number}.")

    def start_irrigation_thread(self, valve_number):
        threading.Thread(target=self.irrigation_algorithm.irrigate, args=(valve_number,), daemon=True).start()