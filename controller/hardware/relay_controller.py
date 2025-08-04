class RelayController:
    """
    Controls an external USB HID relay device to open/close water valves.
    Supports simulation mode when hardware is not available.

    Attributes:
        simulation_mode (bool): If True, the controller runs without accessing real hardware.
        vendor_id (int): USB vendor ID of the HID relay device.
        product_id (int): USB product ID of the HID relay device.
        device (hid.device | None): The HID device object (or None in simulation/failure).
    """
     
    def __init__(self,simulation_mode=True, vendor_id=0x16C0, product_id=0x05DF):
        """
        Initializes the relay controller.

        Args:
            simulation_mode (bool): Whether to enable simulation mode (default: True).
            vendor_id (int): USB vendor ID for the relay device (default: 0x16C0).
            product_id (int): USB product ID for the relay device (default: 0x05DF).
        """
        self.simulation_mode : bool = simulation_mode
        self.vendor_id :int = vendor_id                
        self.product_id :int  = product_id             
        self.device  = None                            # HID device object, None if not connected                   
        self.initialize_hardware()

    def initialize_hardware(self):
        """
        Attempts to connect to the USB HID relay device.
        If in simulation mode, prints a message instead.
        """
        if self.simulation_mode:
            print("[SIMULATION] RelayController running in simulation mode.")
        else:
            try:
                import hid
                self.device = hid.Device()
                self.device.open(self.vendor_id, self.product_id)
                self.device.set_nonblocking(1)
                print("HID Relay connected successfully!")
            except Exception as e:
                print(f" Unable to connect to HID Relay: {e}")
                self.device = None

    def turn_on(self, valve_number: int):
        """
        Sends a command to turn on a specific valve via the relay device.

        Args:
            valve_number (int): The number of the valve to activate.
        """
        if self.device:
            report = [0x00, 0xFF, valve_number]
            self.device.write(report)
            print(f"Valve {valve_number} ON")
        else:
            print("HID device not connected")

    def turn_off(self, valve_number: int):
        """
        Sends a command to turn off a specific valve via the relay device.

        Args:
            valve_number (int): The number of the valve to deactivate.
        """
        if self.device:
            report = [0x00, 0xFD, valve_number]
            self.device.write(report) 
            print(f"Valve {valve_number} OFF")
        else:
            print("HID device not connected")

    def close(self):
        """
        Closes the HID connection to the relay device (if connected).
        """
        if self.device:
            self.device.close()  
            print("Relay device closed.")
