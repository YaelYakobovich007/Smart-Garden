import asyncio
import websockets
import json
import logging
from typing import Optional, Dict, Any

class SmartGardenPiClient:
    """
    WebSocket client for Raspberry Pi to connect to the main Smart Garden server.
    Handles irrigation commands, sensor readings, and communication with the central server.
    """
    
    def __init__(self, server_url: str = "ws://192.168.68.59:8080"):
        self.server_url = server_url
        self.websocket: Optional[websockets.WebSocketServerProtocol] = None
        self.device_id = "raspberrypi_main_controller"
        self.is_running = False
        
        # Setup logging
        logging.basicConfig(
            level=logging.INFO,
            format='[%(asctime)s] %(levelname)s - %(message)s',
            datefmt='%Y-%m-%d %H:%M:%S'
        )
        self.logger = logging.getLogger(__name__)
    
    async def connect(self):
        """Establish WebSocket connection to the server."""
        try:
            self.logger.info(f"Connecting to WebSocket server: {self.server_url}")
            self.websocket = await websockets.connect(self.server_url)
            self.logger.info("Successfully connected to server!")
            self.is_running = True
            return True
        except Exception as e:
            self.logger.error(f"Failed to connect: {e}")
            return False
    
    async def disconnect(self):
        """Gracefully disconnect from the server."""
        self.is_running = False
        if self.websocket:
            await self.websocket.close()
            self.logger.info("Disconnected from server")
    
    async def send_message(self, message_type: str, data: Dict[Any, Any] = None):
        """Send a message to the server."""
        if not self.websocket:
            self.logger.error("No active connection to send message")
            return False
        
        try:
            message = {
                "type": message_type,
                "device_id": self.device_id
            }
            if data:
                message["data"] = data
            
            await self.websocket.send(json.dumps(message))
            self.logger.info(f"Sent {message_type} message")
            return True
        except Exception as e:
            self.logger.error(f"Failed to send message: {e}")
            return False
    
    async def send_hello(self):
        """Send initial HELLO_PI message to identify this device as a Raspberry Pi."""
        return await self.send_message("HELLO_PI")
    
    async def send_sensor_assignment(self, sensor_id: str, plant_id: str):
        """Inform server about a sensor assignment."""
        data = {
            "sensor_id": sensor_id,
            "plant_id": plant_id
        }
        return await self.send_message("SENSOR_ASSIGNED", data)
    
    async def send_valve_assignment(self, valve_id: str, plant_id: str):
        """Inform server about a valve assignment."""
        data = {
            "valve_id": valve_id,
            "plant_id": plant_id
        }
        return await self.send_message("VALVE_ASSIGNED", data)
    
    async def send_sensor_data(self, sensor_id: str, value: float, unit: str = "percentage"):
        """Send sensor reading data to the server."""
        data = {
            "sensor_id": sensor_id,
            "value": value,
            "unit": unit,
            "timestamp": asyncio.get_event_loop().time()
        }
        return await self.send_message("SENSOR_DATA", data)
    
    async def send_irrigation_complete(self, plant_id: str, duration: int, status: str = "success"):
        """Notify server that irrigation has completed."""
        data = {
            "plant_id": plant_id,
            "duration": duration,
            "status": status,
            "timestamp": asyncio.get_event_loop().time()
        }
        return await self.send_message("IRRIGATION_COMPLETE", data)
    
    async def handle_irrigation_command(self, data: Dict[Any, Any]):
        """Handle irrigation command from server."""
        plant_id = data.get("plant_id")
        duration = data.get("duration", 30)  # Default 30 seconds
        
        self.logger.info(f"Starting irrigation for plant {plant_id} for {duration} seconds")
        
        # TODO: Replace with actual hardware control
        # Example: Turn on pump/valve for specified plant
        # gpio_controller.start_irrigation(plant_id, duration)
        
        # Simulate irrigation process
        await asyncio.sleep(2)  # Simulate hardware operation
        
        # Send completion notification
        await self.send_irrigation_complete(plant_id, duration)
        self.logger.info(f"Irrigation completed for plant {plant_id}")
    
    async def handle_sensor_request(self, data: Dict[Any, Any]):
        """Handle sensor data request from server."""
        sensor_id = data.get("sensor_id")
        
        self.logger.info(f"Reading sensor data for {sensor_id}")
        
        # TODO: Replace with actual sensor reading
        # Example: sensor_value = sensor_controller.read_sensor(sensor_id)
        
        # Simulate sensor reading
        import random
        sensor_value = random.uniform(20.0, 80.0)  # Random moisture percentage
        
        # Send sensor data back to server
        await self.send_sensor_data(sensor_id, sensor_value)
        self.logger.info(f"Sent sensor data: {sensor_id} = {sensor_value}%")
    
    async def handle_message(self, message: str):
        """Process incoming messages from the server."""
        try:
            data = json.loads(message)
            message_type = data.get("type")
            message_data = data.get("data", {})
            
            self.logger.info(f"Received {message_type} message")
            
            if message_type == "WELCOME":
                self.logger.info("Received welcome message from server")
            
            elif message_type == "IRRIGATE_PLANT":
                await self.handle_irrigation_command(message_data)
            
            elif message_type == "GET_SENSOR_DATA":
                await self.handle_sensor_request(message_data)
            
            else:
                self.logger.warning(f"Unknown message type: {message_type}")
                
        except json.JSONDecodeError:
            self.logger.error(f"Failed to parse message: {message}")
        except Exception as e:
            self.logger.error(f"Error handling message: {e}")
    
    async def listen_for_messages(self):
        """Listen for incoming messages from the server."""
        try:
            async for message in self.websocket:
                await self.handle_message(message)
        except websockets.exceptions.ConnectionClosed:
            self.logger.warning("Connection closed by server")
            self.is_running = False
        except Exception as e:
            self.logger.error(f"Error listening for messages: {e}")
            self.is_running = False
    
    async def run(self):
        """Main client loop."""
        self.logger.info("Smart Garden Pi Client Starting...")
        
        # Connect to server
        if not await self.connect():
            return False
        
        try:
            # Send initial hello message
            await self.send_hello()
            
            # Wait a moment for welcome response
            await asyncio.sleep(1)
            
            # Send initial sensor and valve assignments
            # TODO: Replace with actual hardware discovery
            await self.send_sensor_assignment("moisture_01", "plant_001")
            await self.send_valve_assignment("valve_01", "plant_001")
            
            self.logger.info("Client is ready and listening for commands...")
            
            # Start listening for messages
            await self.listen_for_messages()
            
        except KeyboardInterrupt:
            self.logger.info("Received shutdown signal")
        except Exception as e:
            self.logger.error(f"Client error: {e}")
        finally:
            await self.disconnect()
        
        return True