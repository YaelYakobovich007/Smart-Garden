from enum import Enum
from typing import Dict, Union

class DripperType(Enum):
    """
    Enum representing different dripper types with their flow rates.
    Flow rates are in Liters per Hour (L/h).
    """
    TYPE_1LH = "1L/h"      # 1 Liter per hour
    TYPE_2LH = "2L/h"      # 2 Liters per hour  
    TYPE_4LH = "4L/h"      # 4 Liters per hour
    TYPE_8LH = "8L/h"      # 8 Liters per hour

    @property
    def flow_rate_lh(self) -> float:
        """
        Get the flow rate in Liters per Hour.
        
        Returns:
            float: Flow rate in L/h
        """
        flow_rates = {
            DripperType.TYPE_1LH: 1.0,
            DripperType.TYPE_2LH: 2.0,
            DripperType.TYPE_4LH: 4.0,
            DripperType.TYPE_8LH: 8.0
        }
        return flow_rates[self]
    
    @property
    def flow_rate_ls(self) -> float:
        """
        Get the flow rate in Liters per Second.
        
        Returns:
            float: Flow rate in L/s
        """
        return self.flow_rate_lh / 3600  # Convert L/h to L/s
    
    @property
    def display_name(self) -> str:
        """
        Get a user-friendly display name for the dripper type.
        
        Returns:
            str: Display name
        """
        return self.value
    
    @classmethod
    def from_string(cls, dripper_str: str) -> 'DripperType':
        """
        Create a DripperType from a string value.
        
        Args:
            dripper_str: String representation of the dripper type
            
        Returns:
            DripperType: The corresponding dripper type
            
        Raises:
            ValueError: If the string doesn't match any dripper type
        """
        for dripper_type in cls:
            if dripper_type.value == dripper_str:
                return dripper_type
        raise ValueError(f"Invalid dripper type: {dripper_str}")
    
    @classmethod
    def get_all_options(cls) -> Dict[str, Dict[str, Union[str, float]]]:
        """
        Get all dripper type options with their properties.
        
        Returns:
            Dict: Dictionary with dripper type information
        """
        return {
            dripper_type.value: {
                "display_name": dripper_type.display_name,
                "flow_rate_lh": dripper_type.flow_rate_lh,
                "flow_rate_ls": dripper_type.flow_rate_ls
            }
            for dripper_type in cls
        }

    def calculate_water_amount(self, watering_time_seconds: float) -> float:
        """
        Calculate the amount of water delivered in a given time period.
        
        Args:
            watering_time_seconds: Time in seconds the dripper is active
            
        Returns:
            float: Amount of water in liters
        """
        return (watering_time_seconds * self.flow_rate_ls)
