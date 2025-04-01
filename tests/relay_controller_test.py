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

    for i in range(2, 3):
        print(f"Turning ON valve {i}...")
        controller.turn_on(i)
        time.sleep(0.5)  # give time for relay click

    time.sleep(2)

    for i in range(2,3):
        print(f"Turning OFF valve {i}...")
        controller.turn_off(i)
        time.sleep(0.5)

if __name__ == "__main__":
    controller = RelayController(simulation_mode=False)
    for i in range(0x00, 0xFF):
        print(i)
        controller.device.write([0x00, i, 1])  # Send command to relay device
        time.sleep(5)

    controller.close()
