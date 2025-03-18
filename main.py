# This is a sample Python script.
import threading
import time
import schedule

from engine.smart_garden_engine import SmartGardenEngine

def run():
    garden_engine  = SmartGardenEngine()
    print("🌱 Smart Garden system is running!\n")

    garden_engine.add_plant(1, sensor_id=101, desired_moisture=70, pot_size="Medium",
                            schedule_data=[{"day": "Tuesday", "time": "14:02", "duration": 10}])

    garden_engine.add_plant(2, sensor_id=102, desired_moisture=50, pot_size="Large",
                            schedule_data=[{"day": "Tuesday", "time": "14:02", "duration": 15}])

    moisture_thread = threading.Thread(target=garden_engine.start_moisture_monitoring, daemon=True)

    def run_schedule():
        while True:
            schedule.run_pending()
            time.sleep(1)

    schedule_thread = threading.Thread(target=run_schedule, daemon=True)

    moisture_thread.start()
    schedule_thread.start()

    try:
        while True:
            time.sleep(10)
    except KeyboardInterrupt:
        print("\n❌ Exiting Smart Garden system...")


# Press the green button in the gutter to run the script.
if __name__ == '__main__':
    run()

