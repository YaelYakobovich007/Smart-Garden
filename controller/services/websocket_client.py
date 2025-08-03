import asyncio
import websockets
import json
import logging
from typing import Optional, Dict, Any
from controller.engine.smart_garden_engine import SmartGardenEngine

class SmartGardenPiClient:
    """
    Simplified WebSocket client for Raspberry Pi to connect to the main Smart Garden server.
    Handles only essential functionality: connection, add plant, and moisture requests.
    """


    #my ip is 192.168.68.59
    def __init__(self, server_url: str = "ws://192.168.68.69:8080", engine: SmartGardenEngine = None):
        self.server_url = server_url
        self.websocket: Optional[websockets.WebSocketServerProtocol] = None
        self.device_id = "raspberrypi_main_controller"
        self.is_running = False
        
        # Setup logging first
        logging.basicConfig(
            level=logging.INFO,
            format='[%(asctime)s] %(levelname)s - %(message)s',
            datefmt='%Y-%m-%d %H:%M:%S'
        )
        self.logger = logging.getLogger(__name__)
        
        # Use provided engine instance (created once at startup)
        if engine is None:
            raise ValueError("SmartGardenEngine instance is required")
        self.engine = engine
        
        # No plant_id mapping needed - use server plant_id directly
    
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
    

    
    async def handle_add_plant_command(self, data: Dict[Any, Any]):
        """Handle add plant command from server using Smart Garden Engine."""
        from controller.handlers.add_plant_handler import handle
        
        self.logger.info(f"Received ADD_PLANT command from server")
        
        # Call the handler to do all the business logic
        success, response = handle(
            data=data,
            smart_engine=self.engine
        )
        
        # Send response back to server using DTO
        response_data = response.to_websocket_data()
        
        # Add server plant_id to response for server's reference
        response_data["server_plant_id"] = data.get("plant_id")
        
        await self.send_message("ADD_PLANT_COMPLETE", response_data)
        
        if success:
            self.logger.info(f"Successfully processed ADD_PLANT command")
        else:
            self.logger.error(f"Failed to process ADD_PLANT command: {response.error_message}")

    async def handle_plant_moisture_request(self, data: Dict[Any, Any]):
        """Handle single plant moisture request from server."""
        from controller.handlers.get_plant_moisture_handler import handle
        
        self.logger.info(f"Received GET_PLANT_MOISTURE command from server")
        
        # Call the handler to get single plant moisture
        success, moisture_data = await handle(
            data=data,
            smart_engine=self.engine
        )
        
        # Handler always returns a DTO (success or error), so just use it
        response_data = moisture_data.to_websocket_data()
        await self.send_message("PLANT_MOISTURE_RESPONSE", response_data)
        
        if success:
            self.logger.info(f"Successfully sent plant moisture: Plant {data.get('plant_id')} = {moisture_data.moisture:.1f}%")
        else:
            self.logger.error(f"Failed to get moisture for plant {data.get('plant_id')}: {moisture_data.error_message}")

    async def handle_all_plants_moisture_request(self, data: Dict[Any, Any]):
        """Handle all plants moisture request from server."""
        from controller.handlers.get_all_plants_moisture_handler import handle
        
        self.logger.info(f"Received GET_ALL_MOISTURE command from server")
        
        # Call the handler to get all plants moisture
        success, response_dto = await handle(
            data=data,
            smart_engine=self.engine
        )
        
        # Handler always returns a single AllPlantsMoistureResponse DTO, so just use it
        response_data = response_dto.to_websocket_data()
        await self.send_message("ALL_MOISTURE_RESPONSE", response_data)
        
        if success:
            self.logger.info(f"Successfully sent moisture for {response_dto.total_plants} plants")
        else:
            self.logger.error(f"Failed to get moisture for all plants: {response_dto.error_message}")
    
    async def handle_message(self, message: str):
        """Process incoming messages from the server."""
        try:
            data = json.loads(message)
            message_type = data.get("type")
            message_data = data.get("data", {})
            
            self.logger.info(f"Received {message_type} message")
            self.logger.info(f"Full message: {message}")
            self.logger.info(f"Parsed data: {data}")
            self.logger.info(f"Message type: {message_type}")
            self.logger.info(f"Message data: {message_data}")
            
            if message_type == "WELCOME":
                self.logger.info("Received welcome message from server")
            
            elif message_type == "ADD_PLANT":
                await self.handle_add_plant_command(message_data)
            
            elif message_type == "GET_PLANT_MOISTURE":
                await self.handle_plant_moisture_request(message_data)
            
            elif message_type == "GET_ALL_MOISTURE":
                await self.handle_all_plants_moisture_request(message_data)
            
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
            self.logger.info("Client is ready and listening for commands...")
            self.logger.info("Supported commands:")
            self.logger.info("  - WELCOME: Server welcome message")
            self.logger.info("  - ADD_PLANT: Add a new plant to the system")
            self.logger.info("  - GET_PLANT_MOISTURE: Get moisture for a specific plant")
            self.logger.info("  - GET_ALL_MOISTURE: Get moisture for all plants")
            
            # Start listening for messages
            await self.listen_for_messages()
            
        except KeyboardInterrupt:
            self.logger.info("Received shutdown signal")
        except Exception as e:
            self.logger.error(f"Client error: {e}")
        finally:
            await self.disconnect()
        
        return True

# For backward compatibility
WebSocketClient = SmartGardenPiClient