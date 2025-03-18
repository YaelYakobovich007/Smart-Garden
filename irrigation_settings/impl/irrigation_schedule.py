import schedule
from datetime import datetime

class IrrigationSchedule:
    def __init__(self, plant, schedule_data, irrigation_controller):
        self.plant = plant
        self.schedule_data = schedule_data
        self.irrigation_controller = irrigation_controller
        self.setup_schedules()

    def setup_schedules(self):
        for schedule_item in self.schedule_data:
            day = schedule_item["day"]
            time_str = schedule_item["time"]
            duration = schedule_item["duration"]
            valve_number = schedule_item["valve_number"]
            if day == "Sunday":
                schedule.every().sunday.at(time_str).do(self.irrigate, valve_number, duration)
            elif day == "Monday":
                schedule.every().monday.at(time_str).do(self.irrigate, valve_number, duration)
            elif day == "Tuesday":
                schedule.every().tuesday.at(time_str).do(self.irrigate, valve_number, duration)
            elif day == "Wednesday":
                schedule.every().wednesday.at(time_str).do(self.irrigate, valve_number, duration)
            elif day == "Thursday":
                schedule.every().thursday.at(time_str).do(self.irrigate, valve_number, duration)
            elif day == "Friday":
                schedule.every().friday.at(time_str).do(self.irrigate, valve_number, duration)
            elif day == "Saturday":
                schedule.every().saturday.at(time_str).do(self.irrigate, valve_number, duration)

            print(f"Scheduled irrigation: {day} at {time_str} for {duration} seconds on valve {valve_number}.")

    def irrigate(self, valve_number, duration):
        print(f"Running irrigation for {duration} seconds on valve {valve_number}!")
        # If the irrigation is necessary, call the method activate_irrigation
        #self.irrigation_controller.activate_irrigation(valve_number, duration)
        # Change the plant's humidity according to watering
