class RelayController:
    def __init__(self,simulation_mode=True, vendor_id=0x16C0, product_id=0x05DF):
        self.simulation_mode : bool = simulation_mode
        self.vendor_id :int = vendor_id                # vendor_id : unique number assigned by the USB standards organization to the manufacturer of the device
        self.product_id :int  = product_id             # product_id : unique number assigned by the manufacturer to identify a specific product
        self.device  = None                            # type: hid.device
        self.initialize_hardware()

    def initialize_hardware(self):
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
        if self.device:
            report = [0x00, 0xFF, valve_number]
            self.device.write(report)
            print(f"Valve {valve_number} ON")
        else:
            print("HID device not connected")

    def turn_off(self, valve_number: int):
        if self.device:
            report = [0x00, 0xFD, valve_number]
            self.device.write(report) 
            print(f"Valve {valve_number} OFF")
        else:
            print("HID device not connected")

    def close(self):
        if self.device:
            self.device.close()  # Close USB HID connection
            print("Relay device closed.")
