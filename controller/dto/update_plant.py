from typing import Dict, Any, Optional
from controller.models.dripper_type import DripperType

class UpdatePlant:
    """
    Data Transfer Object for plant update requests.
    """
    
    def __init__(
        self,
        plant_id: int,
        plant_name: Optional[str] = None,
        desired_moisture: Optional[float] = None,
        water_limit: Optional[float] = None,
        dripper_type: Optional[str] = None
    ):
        self.plant_id = plant_id
        self.plant_name = plant_name
        self.desired_moisture = desired_moisture
        self.water_limit = water_limit
        self.dripper_type = dripper_type
    
    @classmethod
    def from_websocket_data(cls, data: Dict[Any, Any]) -> 'UpdatePlant':
        """
        Create UpdatePlant instance from WebSocket data.
        
        Args:
            data: Dictionary containing plant update data
            
        Returns:
            UpdatePlant instance
            
        Raises:
            ValueError: If required fields are missing or invalid
        """
        # Extract data from the nested structure
        plant_data = data.get('data', {})
        
        # Validate required fields
        if 'plant_id' not in plant_data:
            raise ValueError("plant_id is required")
        
        plant_id = plant_data['plant_id']
        if not isinstance(plant_id, int):
            raise ValueError("plant_id must be an integer")
        
        # Extract optional fields
        plant_name = plant_data.get('plant_name')
        desired_moisture = plant_data.get('desired_moisture')
        water_limit = plant_data.get('water_limit')
        dripper_type = plant_data.get('dripper_type')
        
        # Validate optional fields if provided
        if desired_moisture is not None:
            if not isinstance(desired_moisture, (int, float)) or desired_moisture < 0 or desired_moisture > 100:
                raise ValueError("desired_moisture must be a number between 0 and 100")
        
        if water_limit is not None:
            if not isinstance(water_limit, (int, float)) or water_limit <= 0:
                raise ValueError("water_limit must be a positive number")
        
        if dripper_type is not None:
            valid_types = ['2L/h', '4L/h', '8L/h']
            if dripper_type not in valid_types:
                raise ValueError(f"dripper_type must be one of: {valid_types}")
        
        return cls(
            plant_id=plant_id,
            plant_name=plant_name,
            desired_moisture=desired_moisture,
            water_limit=water_limit,
            dripper_type=dripper_type
        )
    
    def to_dict(self) -> Dict[str, Any]:
        """
        Convert to dictionary representation.
        
        Returns:
            Dictionary representation of the UpdatePlant
        """
        result = {
            'plant_id': self.plant_id
        }
        
        if self.plant_name is not None:
            result['plant_name'] = self.plant_name
        if self.desired_moisture is not None:
            result['desired_moisture'] = self.desired_moisture
        if self.water_limit is not None:
            result['water_limit'] = self.water_limit
        if self.dripper_type is not None:
            result['dripper_type'] = self.dripper_type
        
        return result
    
    def __str__(self) -> str:
        return f"UpdatePlant(plant_id={self.plant_id}, plant_name={self.plant_name}, desired_moisture={self.desired_moisture}, water_limit={self.water_limit}, dripper_type={self.dripper_type})"
    
    def __repr__(self) -> str:
        return self.__str__()
