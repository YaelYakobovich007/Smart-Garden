import asyncio
import random
from pymodbus.client import AsyncModbusSerialClient
from pymodbus.exceptions import ModbusException

# Constants for Modbus communication
DEFAULT_PORT = "/dev/ttyUSB0"
DEFAULT_BAUDRATE = 4800
REGISTER_START_ADDRESS = 0x0000  # Start register address for humidity

class Sensor:
    """
    Represents a soil moisture and temperature sensor using Modbus RTU protocol.
    Supports both simulation mode and real hardware communication.

    Attributes:
        simulation_mode (bool): If True, operates in simulated mode.
        simulated_value (float): The moisture level used in simulation mode.
        simulated_temperature (float): The temperature level used in simulation mode.
        port (str): Serial port for Modbus communication (e.g., '/dev/ttyUSB0').
        baudrate (int): Baud rate (Speed of communication in bits per second) for Modbus communication.
    """

    def __init__(
        self,
        simulation_mode=False,
        initial_moisture=30.0,
        port=DEFAULT_PORT,
        baudrate=DEFAULT_BAUDRATE,
        port_lock=None
    ):
        self.simulation_mode = simulation_mode
        self.simulated_value = initial_moisture
        self.simulated_temperature = 25.0  # Default temperature in simulation
        self.port = port
        self.baudrate = baudrate
        self._port_lock = port_lock  # asyncio.Lock shared per port

    async def read(self):
        """
        Reads moisture (and temperature if not simulated) from the sensor.

        Returns:
            float | tuple | None: If in simulation mode, returns moisture (float).
            Otherwise, returns (moisture, temperature) tuple or None on error.
        """
        if self.simulation_mode:
            # Return both moisture and temperature in simulation mode
            return float(self.simulated_value), float(self.simulated_temperature)
        
        return await self._read_modbus_data()
        
   
    async def _read_modbus_data(self):
        """
        Reads data from the physical Modbus sensor.

        Returns:
            tuple[float, float] | None: (moisture, temperature) in real units, or None on failure.
        """
        print(f"[SENSOR][CONNECT] port={self.port} id=1 baud={self.baudrate} parity=N timeout_s=1")
        
        # Serialize access to the serial port
        lock = self._port_lock
        if lock is None:
            # Fallback: create a private lock if not provided
            import asyncio
            lock = asyncio.Lock()

        async with lock:
            client = AsyncModbusSerialClient(
                port=self.port,
                baudrate=self.baudrate,
                parity='N',
                stopbits=1,
                bytesize=8,
                timeout=1,
            )

            # Connect to the Modbus client
            async with client as modbus_client:
                print(f"[SENSOR][STATUS] connected={bool(modbus_client.connected)}")
                
                if not modbus_client.connected:
                    print(f"❌ Could not connect to Modbus sensor on {self.port}")
                    return None
                
                try:
                    print(f"[SENSOR][READ] unit=1 addr=0 count=2")
                    
                    # Read two registers starting from address 1 (matching mbpoll command)
                    # Try without unit parameter first
                    result = await modbus_client.read_input_registers(
                        address=0,
                        count=2
                    )
                    
                    if result.isError():
                        print(f"❌ Modbus error: {result}")
                        return None
                    
                    print(f"[SENSOR][READ][OK]")
                    
                    # Process raw register values (matching mbpoll output)
                    register_1 = result.registers[0]
                    register_2 = result.registers[1]
                    
                    print(f"[SENSOR][REG] r1={register_1} r2={register_2}")
                    
                    # Convert to moisture and temperature (adjust these calculations based on your sensor)
                    # For now, using simple conversion - you may need to adjust based on your sensor specs
                    moisture = register_1 / 10.0 if register_1 > 0 else 0.0
                    temperature = register_2 / 10.0 if register_2 > 0 else 0.0
                    
                    print(f"[SENSOR][DATA] moisture={moisture:.1f}% temperature={temperature:.1f}C")
                    
                    return moisture, temperature
                
                except ModbusException as e:
                    print(f"[SENSOR][ERROR] modbus_exception err={e}")
                    return None
            

    def update_simulated_value(self, amount):
        """
        Increases the simulated moisture value by the given amount, up to 100%.

        Args:
            amount (float): The moisture percentage to add.
        """
        if self.simulation_mode:
            self.simulated_value = min(100.0, self.simulated_value + amount)  
            print(f"[SIMULATION] Sensor moisture updated: {self.simulated_value}%")

    def update_simulated_temperature(self, temperature):
        """
        Updates the simulated temperature value.

        Args:
            temperature (float): The temperature in Celsius to set.
        """
        if self.simulation_mode:
            self.simulated_temperature = temperature
            print(f"[SIMULATION] Sensor temperature updated: {self.simulated_temperature}°C")

    def generate_random_simulated_value(self):
        """
        Generates a random simulated moisture value between 20% and 80%.

        Returns:
            float: Simulated moisture value.
        """
        return round(random.uniform(20.0, 80.0), 2)
 


