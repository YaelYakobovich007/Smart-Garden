#!/usr/bin/env python3
"""
Smart Garden Raspberry Pi Client Startup Script

This script starts the WebSocket client that connects the Raspberry Pi 
to the main Smart Garden server for irrigation control and sensor monitoring.

Usage:
    python3 run_pi_client.py
    
Or make it executable and run directly:
    chmod +x run_pi_client.py
    ./run_pi_client.py
"""

import sys
import os
import asyncio
import signal
import logging

# Add the project root directory to Python path so we can import the controller package
project_root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, project_root)

from controller.services.websocket_client import SmartGardenPiClient

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler('smart_garden_pi.log'),
        logging.StreamHandler()
    ]
)

logger = logging.getLogger(__name__)

class PiClientRunner:
    def __init__(self, server_url: str = "wss://smart-garden-backend-1088783109508.europe-west1.run.app", 
                 family_code: str = None, total_valves: int = 2, total_sensors: int = 2):
        self.server_url = server_url
        self.family_code = family_code
        self.total_valves = total_valves
        self.total_sensors = total_sensors
        self.client = None
        self.running = False
        
        # Create the Smart Garden Engine ONCE at startup (not per connection)
        logger.info(f"Initializing Smart Garden Engine with {total_valves} valves and {total_sensors} sensors")
        from controller.engine.smart_garden_engine import SmartGardenEngine
        self.engine = SmartGardenEngine(total_valves=total_valves, total_sensors=total_sensors)
        logger.info(f"Smart Garden Engine initialized and ready")
        
        if family_code:
            logger.info(f"Family code configured: {family_code}")
        else:
            logger.warning("No family code configured - Pi will not sync with any garden")
        
    async def start(self):
        """Start the Pi client and handle reconnections"""
        self.running = True
        
        while self.running:
            try:
                logger.info("=== Starting Smart Garden WebSocket Client ===")
                logger.info(f"Connecting to server using existing engine instance")
                
                # Create WebSocket client with the SAME engine instance (no recreation)
                self.client = SmartGardenPiClient(self.server_url, family_code=self.family_code, engine=self.engine)
                
                # Update the engine's websocket client reference for logging
                if hasattr(self.engine, 'websocket_client'):
                    self.engine.websocket_client = self.client
                if hasattr(self.engine.irrigation_algorithm, 'websocket_client'):
                    self.engine.irrigation_algorithm.websocket_client = self.client
                
                # Run the client (includes connection, hello, assignments, and message listening)
                await self.client.run()
                
                if self.running:  # Only try to reconnect if we weren't manually stopped
                    logger.warning("Connection lost. Retrying in 5 seconds...")
                    await asyncio.sleep(5)
                    
            except Exception as e:
                logger.error(f"Pi client error: {e}")
                if self.running:
                    logger.info("Retrying in 10 seconds...")
                    await asyncio.sleep(10)
    
    async def _send_initial_assignments(self):
        """Send initial sensor and valve assignments to server"""
        try:
            # Example assignments - update these based on your actual hardware setup
            assignments = [
                {"type": "sensor", "sensor_id": "moisture_01", "plant_id": "plant_001"},
                {"type": "sensor", "sensor_id": "moisture_02", "plant_id": "plant_002"},
                {"type": "valve", "valve_id": "valve_01", "plant_id": "plant_001"},
                {"type": "valve", "valve_id": "valve_02", "plant_id": "plant_002"}
            ]
            
            for assignment in assignments:
                if assignment["type"] == "sensor":
                    await self.client.send_sensor_assigned(
                        assignment["sensor_id"], 
                        assignment["plant_id"]
                    )
                elif assignment["type"] == "valve":
                    await self.client.send_valve_assigned(
                        assignment["valve_id"], 
                        assignment["plant_id"]
                    )
                
                # Small delay between assignments
                await asyncio.sleep(0.5)
                
        except Exception as e:
            logger.error(f"Failed to send initial assignments: {e}")
    
    async def stop(self):
        """Stop the Pi client gracefully"""
        logger.info("Stopping Smart Garden Pi Client...")
        self.running = False
        
        if self.client:
            await self.client.disconnect()
        
        logger.info("Pi Client stopped successfully")


# Global client runner instance
client_runner = None

def signal_handler(signum, frame):
    """Handle shutdown signals gracefully"""
    logger.info(f"Received signal {signum}. Shutting down...")
    if client_runner:
        try:
            # Best-effort: close valves and stop irrigations first
            if getattr(client_runner, 'engine', None):
                loop = asyncio.get_event_loop()
                loop.create_task(client_runner.engine.stop_all_irrigations_and_close_valves())
        except Exception as e:
            logger.warning(f"Shutdown cleanup failed: {e}")
        asyncio.create_task(client_runner.stop())

async def main():
    global client_runner
    
    # Register signal handlers for graceful shutdown
    signal.signal(signal.SIGINT, signal_handler)
    signal.signal(signal.SIGTERM, signal_handler)
    
    # Configuration
    server_url = "wss://smart-garden-backend-1088783109508.europe-west1.run.app"
    
    # Override with environment variable if set
    server_url = os.getenv('SMART_GARDEN_SERVER_URL', server_url)
    family_code = os.getenv('SMART_GARDEN_FAMILY_CODE', None)
    total_valves = int(os.getenv('SMART_GARDEN_TOTAL_VALVES', '2'))
    total_sensors = int(os.getenv('SMART_GARDEN_TOTAL_SENSORS', '2'))
    
    logger.info(f"Smart Garden Pi Client starting...")
    logger.info(f"Server URL: {server_url}")
    logger.info(f"Family Code: {family_code or 'Not configured'}")
    logger.info(f"Total Valves: {total_valves}")
    logger.info(f"Total Sensors: {total_sensors}")
    
    client_runner = PiClientRunner(server_url, family_code=family_code, total_valves=total_valves, total_sensors=total_sensors)
    
    try:
        await client_runner.start()
    except KeyboardInterrupt:
        logger.info("Shutdown requested by user")
    except Exception as e:
        logger.error(f"Fatal error: {e}")
    finally:
        if client_runner:
            await client_runner.stop()

if __name__ == "__main__":
    try:
        asyncio.run(main())
    except KeyboardInterrupt:
        print("\nSmart Garden Pi Client stopped")
    except Exception as e:
        print(f"Error: {e}")
        sys.exit(1)