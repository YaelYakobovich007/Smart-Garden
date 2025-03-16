# controllers/irrigation_controller.py
from hardware.relay_controller import RelayController
import threading
import time


class IrrigationController:
    def __init__(self, relay_controller: RelayController):
        self.relay = relay_controller

    def activate_valve(self, valve_number: int, duration_seconds: int):
        print(f"Starting irrigation: Valve {valve_number} for {duration_seconds} seconds")
        self.relay.turn_on(valve_number)
        time.sleep(duration_seconds)
        self.relay.turn_off(valve_number)
        print(f"Irrigation complete: Valve {valve_number} closed")

    def stop_irrigation(self, valve_number: int):
        print(f"Stopping irrigation: Valve {valve_number}")
        self.relay.turn_off(valve_number)
