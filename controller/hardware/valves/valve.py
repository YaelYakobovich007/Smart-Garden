from typing import Optional
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
        if self.is_blocked:
            raise RuntimeError(f"Error: Valve {self.valve_id} is blocked")

        if self.simulation_mode:
            print(f"[SIMULATION] Valve {self.valve_id} ON")
        elif self.relay_controller:
            self.relay_controller.turn_on(self.valve_id)
        else:
            raise RuntimeError(f"Error: No RelayController connected to Valve {self.valve_id}!")

        self.last_irrigation_time = datetime.now()

    def request_close(self) -> None:
        """
        Closes the valve. If blocked, raises an error.
        In simulation mode, only prints a message. Otherwise, deactivates the hardware relay.
        """
        if self.is_blocked:
            raise RuntimeError(f"Error: Valve {self.valve_id} is blocked")
        if self.simulation_mode:
            print(f"[SIMULATION] Valve {self.valve_id} OFF")
        elif self.relay_controller:
            self.relay_controller.turn_off(self.valve_id)
        else:
            raise RuntimeError(f"Error: No RelayController connected to Valve {self.valve_id}")

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


