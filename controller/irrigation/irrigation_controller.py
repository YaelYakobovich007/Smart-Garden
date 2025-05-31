import time

from controller.hardware.relay_controller import RelayController

SIMULATION_MODE = True

if not SIMULATION_MODE:
    import hid

class IrrigationController:
    def __init__(self):
        if not SIMULATION_MODE:
            self.relay = RelayController()
        else:
            self.relay = None

    def activate_valve(self, valve_number: int, duration: int):
        if SIMULATION_MODE:
            print(f"SIMULATION: Valve {valve_number} activated for {duration} seconds.")
        else:
            print(f"Starting irrigation: Valve {valve_number} for {duration} seconds")
            self.relay.turn_on(valve_number)
            time.sleep(duration)
            self.relay.turn_off(valve_number)
            print(f"Irrigation complete: Valve {valve_number} closed")

    def stop_irrigation(self, valve_number: int):
        print(f"Stopping irrigation: Valve {valve_number}")
        self.relay.turn_off(valve_number)
