SIMULATION_MODE = True

if not SIMULATION_MODE:
    import hid

class RelayController:
    def __init__(self,simulation_mode=True, vendor_id=0x16C0, product_id=0x05DF):
        self.valves = {}
        self.simulation_mode = simulation_mode

        """
        Initializes a connection to the HID Relay device via USB.

        Parameters:
            vendor_id (hex): USB Vendor ID (manufacturer identifier)
            product_id (hex): USB Product ID (product/model identifier)
        """
        self.simulation_mode = simulation_mode
        self.device = None

        self.initialize_hardware(vendor_id, product_id)


    def initialize_hardware(self,vendor_id,product_id):
        if self.simulation_mode:
            print("[SIMULATION] RelayController running in simulation mode.")
        else:
            try:
                import hid
                self.device = hid.device()
                self.device.open(self.vendor_id, self.product_id)
                self.device.set_nonblocking(1)
                print("HID Relay connected successfully!")
            except Exception as e:
                print(f" Unable to connect to HID Relay: {e}")
                self.device = None

    def turn_on(self, valve_number: int):
        """
        Turns on (activates) the specified relay channel (valve).

        Parameters:
            valve_number (int): Relay channel number to turn on (e.g., 1-4)
        """
        if self.device:
            # HID report to activate relay (example report: [Report ID, Command (0xFF=ON), Valve Number])
            report = [0x00, 0xFF, valve_number]
            self.device.write(report)  # Send command to relay device
            print(f"Valve {valve_number} ON")
        else:
            print("HID device not connected!")

    def turn_off(self, valve_number: int):
        """
        Turns off (deactivates) the specified relay channel (valve).

        Parameters:
            valve_number (int): Relay channel number to turn off (e.g., 1-4)
        """
        if self.device:
            # HID report to deactivate relay (example report: [Report ID, Command (0x00=OFF), Valve Number])
            report = [0x00, 0x00, valve_number]
            self.device.write(report)  # Send command to relay device
            print(f"Valve {valve_number} OFF")
        else:
            print("HID device not connected!")

    def close(self):
        """
        Closes the connection to the HID relay device.
        """
        if self.device:
            self.device.close()  # Close USB HID connection
            print("Relay device closed.")
