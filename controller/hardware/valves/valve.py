from typing import Optional, Dict
from datetime import datetime
from controller.hardware.relay_controller import RelayController

class Valve:
    """
    Represents a water valve in the irrigation system, supporting both simulation and real hardware control.

    Attributes:
        valve_id (int): Unique identifier for the valve.
        pipe_diameter (float): Diameter of the pipe connected to the valve (mm or inches).
        water_limit (float): Maximum amount of water allowed to pass through the valve per irrigation cycle (liters).
        flow_rate (float): Water flow rate through the valve (liters per second).
        last_irrigation_time (Optional[datetime]): Timestamp of the last irrigation event (None if never irrigated).
        is_blocked (bool): Whether the valve is blocked (cannot be opened).
        relay_controller (Optional[RelayController]): Hardware relay controller for real operation (None if simulation).
        simulation_mode (bool): If True, operates in simulation mode (no hardware control).
    """
    def __init__(
        self,
        valve_id: int,
        pipe_diameter: float,
        water_limit: float,
        flow_rate: float,
        relay_controller: Optional[RelayController],
        simulation_mode: bool = True
    ) -> None:
        self.valve_id: int = valve_id
        self.pipe_diameter: float = pipe_diameter
        self.water_limit: float = water_limit
        self.flow_rate: float = flow_rate
        self.last_irrigation_time: Optional[datetime] = None
        self.is_blocked: bool = False
        self.relay_controller: Optional[RelayController] = relay_controller
        self.simulation_mode: bool = simulation_mode
        
        # Add state tracking for debugging
        self.is_open: bool = False
        self.open_time: Optional[datetime] = None
        self.close_time: Optional[datetime] = None

    def calculate_open_time(self, water_amount: float) -> float:
        """
        Calculates the time (in seconds) needed to deliver a given amount of water.
        Args:
            water_amount (float): Amount of water to deliver (liters).
        Returns:
            float: Required time to keep the valve open (seconds).
        """
        return water_amount / self.flow_rate

    def request_open(self) -> None:
        """
        Opens the valve for irrigation. If the valve is blocked, raises an error.
        In simulation mode, only prints a message. Otherwise, activates the hardware relay.
        """
        print(f"DEBUG - Valve.request_open() valve={self.valve_id} is_blocked={self.is_blocked} simulation_mode={self.simulation_mode} current_state={'OPEN' if self.is_open else 'CLOSED'}")
        
        if self.is_blocked:
            print(f"❌ ERROR - Valve {self.valve_id} is blocked")
            raise RuntimeError(f"Error: Valve {self.valve_id} is blocked")

        if self.simulation_mode:
            print(f"[SIMULATION] Valve {self.valve_id} ON")
        elif self.relay_controller:
            print(f"DEBUG - Calling relay_controller.turn_on({self.valve_id})")
            self.relay_controller.turn_on(self.valve_id)
            print(f"DEBUG - relay_controller.turn_on() completed")
        else:
            print(f"ERROR - No RelayController connected to Valve {self.valve_id}")
            raise RuntimeError(f"Error: No RelayController connected to Valve {self.valve_id}!")

        # Update state tracking
        self.is_open = True
        self.open_time = datetime.now()
        self.last_irrigation_time = datetime.now()
        print(f"DEBUG - Valve {self.valve_id} opened at {self.open_time}")

    def request_close(self) -> None:
        """
        Closes the valve. If blocked, raises an error.
        In simulation mode, only prints a message. Otherwise, deactivates the hardware relay.
        """
        print(f"DEBUG - Valve.request_close() valve={self.valve_id} is_blocked={self.is_blocked} simulation_mode={self.simulation_mode} current_state={'OPEN' if self.is_open else 'CLOSED'}")
        
        if self.is_blocked:
            print(f"ERROR - Valve {self.valve_id} is blocked")
            raise RuntimeError(f"Error: Valve {self.valve_id} is blocked")
        if self.simulation_mode:
            print(f"[SIMULATION] Valve {self.valve_id} OFF")
        elif self.relay_controller:
            print(f"DEBUG - Calling relay_controller.turn_off({self.valve_id})")
            self.relay_controller.turn_off(self.valve_id)
            print(f"DEBUG - relay_controller.turn_off() completed")
        else:
            print(f"ERROR - No RelayController connected to Valve {self.valve_id}")
            raise RuntimeError(f"Error: No RelayController connected to Valve {self.valve_id}")
        
        # Update state tracking
        self.is_open = False
        self.close_time = datetime.now()
        print(f"DEBUG - Valve {self.valve_id} closed at {self.close_time}")
        
        # Log duration if valve was open
        if self.open_time:
            duration = self.close_time - self.open_time
            print(f"DEBUG - Valve {self.valve_id} open duration: {duration.total_seconds():.2f}s")

    def block(self) -> None:
        """
        Blocks the valve, preventing it from being opened until unblocked.
        """
        self.is_blocked = True

    def unblock(self) -> None:
        """
        Unblocks the valve, allowing it to be operated again.
        """
        self.is_blocked = False

    def get_status(self) -> Dict:
        """
        Get the current status of the valve.
        
        Returns:
            Dict: Current valve status information
        """
        return {
            'valve_id': self.valve_id,
            'is_open': self.is_open,
            'is_blocked': self.is_blocked,
            'simulation_mode': self.simulation_mode,
            'open_time': self.open_time.isoformat() if self.open_time else None,
            'close_time': self.close_time.isoformat() if self.close_time else None,
            'last_irrigation_time': self.last_irrigation_time.isoformat() if self.last_irrigation_time else None
        }

    def get_user_friendly_status(self) -> str:
        """
        Get a user-friendly status message for the valve.
        
        Returns:
            str: Human-readable status message
        """
        if self.is_blocked:
            return f"Valve {self.valve_id} is BLOCKED and cannot be opened. Please check the valve manually and unblock it if needed."
        elif self.is_open:
            return f"Valve {self.valve_id} is currently OPEN and watering."
        else:
            return f"Valve {self.valve_id} is CLOSED and ready for operation."


