# This is a sample Python script.
from datetime import time


# Press Shift+F10 to execute it or replace it with your code.
# Press Double Shift to search everywhere for classes, files, tool windows, actions, and settings.


def print_hi(name):
    # Use a breakpoint in the code line below to debug your script.
    print(f'Hi, {name}')  # Press Ctrl+F8 to toggle the breakpoint.

 def start_schedule_thread(self):
        def run():
            while True:
                self.scheduler.run_pending()
                time.sleep(1)



# Press the green button in the gutter to run the script.
if __name__ == '__main__':
    print_hi('PyCharm')

//זה היה של הקריאת סנסור
if __name__ == "__main__":
    sensor = Sensor(sensor_id=1, plant_id=1)
    while True:
        data = sensor.read_moisture()
        print(f" Plant {sensor.plant_id} Moisture Level: {data}%")
        time.sleep(2)

if __name__ == "__main__":
    sensor = Sensor(sensor_id=1, plant_id=1)
    while True:
        data = sensor.read_moisture()
        print(f" Plant {sensor.plant_id} Moisture Level: {data}%")
        time.sleep(2)