from hardware.relay_controller import RelayController

def test_connection(controller):
    print("\n--- Connection Test ---")
    if controller.device:
        print("✅ RelayController initialized successfully (real device).")
    else:
        print("❌ Failed to initialize RelayController.")

def test_valves():
    print("\n--- Valve Test ---")

    if not controller.device:
        print("❌ Cannot test valves: device not connected.")
        return

    for j in range(1,20):
        for i in range(1, 5):
            controller.turn_on(i)

        import time
        time.sleep(10)

        for i in range(1, 5):
            controller.turn_off(i)

    controller.close()

if __name__ == "__main__":
    controller = RelayController(simulation_mode=False)
    test_connection(controller)
    test_valves(controller)
