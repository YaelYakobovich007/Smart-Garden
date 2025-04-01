from typing import Optional

try:
    import serial
except ImportError:
    serial = None

SERIAL_PORT: str = "/dev/ttyUSB0"
BAUD_RATE: int = 9600

class Sensor:
    def __init__(self, sensor_id: int, plant_id: int, simulation_mode: bool = True, initial_moisture: float = 30.0) -> None:
        self.sensor_id: int = sensor_id
        self.plant_id: int = plant_id
        self.simulation_mode: bool = simulation_mode
        self.simulated_moisture: Optional[float] = initial_moisture if simulation_mode else None
        self.ser:Optional[serial.Serial] = None

        if not self.simulation_mode:
            if serial is None:
                raise ImportError("Missing 'pyserial' module. Install it using: pip install pyserial")
            self.ser = serial.Serial(SERIAL_PORT, BAUD_RATE, timeout=1)

    def read_moisture(self) -> Optional[float]:
        if self.simulation_mode:
            return self.simulated_moisture
        return self.read_from_hardware()

    def read_from_hardware(self) -> Optional[float]:
        try:
            self.ser.write(b"READ\n")
            raw_data = self.ser.readline().decode("utf-8").strip()
            return float(raw_data)
        except Exception as e:
            print(f"Error reading sensor {self.sensor_id}: {e}")
            return None

    def update_moisture(self, amount: float) -> None:
        if self.simulation_mode and self.simulated_moisture is not None:
            self.simulated_moisture = min(100.0, self.simulated_moisture + amount)
            print(f" [SIMULATION] Sensor {self.sensor_id} moisture updated: {self.simulated_moisture}%")
