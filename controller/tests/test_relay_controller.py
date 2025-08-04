"""
Simple test for RelayController - activates switches 1-4
"""

import sys
import os
import time

# Add the current directory to Python path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from hardware.relay_controller import RelayController

def test_relay_switches():
    """Test relay controller by activating switches 1-4"""
    print("Testing RelayController - Activating switches 1-4")
    print("=" * 50)
    
    # Create relay controller in simulation mode
    relay = RelayController(simulation_mode=False)
    print("Relay controller created in simulation mode")
    
    # Test switches 1-4
    for switch_num in range(1, 5):
        print(f"\nTesting switch {switch_num}:")
        
        # Turn on switch
        print(f"  Turning ON switch {switch_num}")
        relay.turn_on(switch_num)
        
        # Wait a moment
        time.sleep(0.5)
        
        # Turn off switch
        print(f"  Turning OFF switch {switch_num}")
        relay.turn_off(switch_num)
        
        # Wait between switches
        time.sleep(0.5)
    
    print("\nAll switches tested successfully!")
    return True

if __name__ == "__main__":
    success = test_relay_switches()
    
    if success:
        print("Relay controller test completed successfully!")
    else:
        print("Relay controller test failed!")
        sys.exit(1) 