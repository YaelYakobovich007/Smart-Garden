from hardware.relay_controller import RelayController
import time

def test_connection(controller):
    print("\n--- Connection Test ---")
    if controller.device:
        print("✅ RelayController initialized successfully (real device).")
    else:
        print("❌ Failed to initialize RelayController.")

def test_valves(controller):
    print("\n--- Valve Test ---")

    if not controller.device:
        print("❌ Cannot test valves: device not connected.")
        return

    for i in range(1, 2):
        print(f"Turning ON valve {i}...")
        controller.turn_on(i)
        time.sleep(0.5)  # give time for relay click

    time.sleep(2)

    for i in range(1,2):
        print(f"Turning OFF valve {i}...")
        controller.turn_off(i)
        time.sleep(0.5)

if __name__ == "__main__":
    controller = RelayController(simulation_mode=False)
    test_connection(controller)
    test_valves(controller)
    controller.close()
