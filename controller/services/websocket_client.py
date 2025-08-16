import asyncio
import websockets
import json
import logging
from typing import Optional, Dict, Any
from controller.engine.smart_garden_engine import SmartGardenEngine

#my ip is 192.168.68.74
class SmartGardenPiClient:
    """
    Simplified WebSocket client for Raspberry Pi to connect to the main Smart Garden server.
    Handles only essential functionality: connection, add plant, and moisture requests.
    """


    #my ip is 192.168.68.74
    def __init__(self, server_url: str = "ws://192.168.68.74:8080", engine: SmartGardenEngine = None):
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
        
        # Update the engine's websocket client reference for logging
        if hasattr(self.engine, 'websocket_client'):
            self.engine.websocket_client = self
        if hasattr(self.engine.irrigation_algorithm, 'websocket_client'):
            self.engine.irrigation_algorithm.websocket_client = self
        
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
            
            # Log the message being sent
            self.logger.info(f"=== SENDING MESSAGE DEBUG ===")
            self.logger.info(f"Message type: {message_type}")
            self.logger.info(f"Full message: {message}")
            self.logger.info(f"Message keys: {list(message.keys())}")
            self.logger.info(f"Message data keys: {list(data.keys()) if data else 'No data'}")
            self.logger.info(f"Message data values: {data}")
            self.logger.info("=============================")
            
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
        """Handle add plant request from server."""
        try:
            from controller.handlers.add_plant_handler import AddPlantHandler
            
            self.logger.info(f"Received ADD_PLANT command from server")
            self.logger.info(f"Full message: {data}")
            self.logger.info(f"Parsed data: {data}")
            self.logger.info(f"Plant ID: {data.get('plant_id')}")
            self.logger.info(f"Desired Moisture: {data.get('desiredMoisture')}")
            self.logger.info(f"Water Limit: {data.get('waterLimit')}")
            
            # Create handler instance and call it
            handler = AddPlantHandler(self.engine)
            success, response = await handler.handle(data=data)
            
            # Send response back to server using DTO
            response_data = response.to_websocket_data()
            
            # Use server's plant_id as the main plant_id in response
            response_data["plant_id"] = data.get("plant_id")  # Use server's plant ID
            
            # Log the response message details
            self.logger.info("=== ADD_PLANT RESPONSE DEBUG ===")
            self.logger.info(f"Response success: {success}")
            self.logger.info(f"Response DTO: {response}")
            self.logger.info(f"Response data keys: {list(response_data.keys())}")
            self.logger.info(f"Response data values: {response_data}")
            self.logger.info("================================")
            
            await self.send_message("ADD_PLANT_RESPONSE", response_data)
            
            if success:
                self.logger.info(f"Successfully processed ADD_PLANT command")
            else:
                self.logger.error(f"Failed to process ADD_PLANT command: {response.error_message}")
                
        except Exception as e:
            self.logger.error(f"Error during add plant: {e}")
            # Create error DTO for unexpected exceptions
            from controller.dto.add_plant_request import AddPlantRequest
            error_result = AddPlantRequest.error(
                plant_id=data.get("plant_id", 0),
                error_message=str(e)
            )
            await self.send_message("ADD_PLANT_RESPONSE", error_result.to_websocket_data())

    async def handle_plant_moisture_request(self, data):
        """Handle single plant moisture request from server."""
        from controller.handlers.get_plant_moisture_handler import GetPlantMoistureHandler
        
        self.logger.info(f"Received GET_PLANT_MOISTURE command from server")
        
        # Create handler instance and call it
        handler = GetPlantMoistureHandler(self.engine)
        success, moisture_data = await handler.handle(data=data)
        
        # Handler always returns a DTO (success or error), so just use it
        response_data = moisture_data.to_websocket_data()
        await self.send_message("PLANT_MOISTURE_RESPONSE", response_data)
        
        if success:
            self.logger.info(f"Successfully sent plant moisture: Plant {data.get('plant_id')} = {moisture_data.moisture:.1f}%")
        else:
            self.logger.error(f"Failed to get moisture for plant {data.get('plant_id')}: {moisture_data.error_message}")

    async def handle_all_plants_moisture_request(self, data: Dict[Any, Any]):
        """Handle all plants moisture request from server."""
        from controller.handlers.get_all_plants_moisture_handler import GetAllPlantsMoistureHandler
        
        self.logger.info(f"Received GET_ALL_MOISTURE command from server")
        
        # Create handler instance and call it
        handler = GetAllPlantsMoistureHandler(self.engine)
        success, response_dto = await handler.handle(data=data)
        
        # Handler always returns a single AllPlantsMoistureResponse DTO, so just use it
        response_data = response_dto.to_websocket_data()
        await self.send_message("ALL_MOISTURE_RESPONSE", response_data)
        
        if success:
            self.logger.info(f"Successfully sent moisture for {response_dto.total_plants} plants")
        else:
            self.logger.error(f"Failed to get moisture for all plants: {response_dto.error_message}")

    async def handle_irrigate_plant_request(self, data):
        """Handle irrigation request from server."""
        try:
            plant_id = data.get("plant_id")
            if not plant_id:
                self.logger.error("No plant_id provided in irrigation request")
                return
            
            self.logger.info(f"Received IRRIGATE_PLANT request for plant {plant_id}")
            
            # Call the irrigation algorithm using the smart garden engine
            result = await self.engine.irrigate_plant(plant_id)
            
            # Send response back to server
            response_data = result.to_websocket_data()
            
            self.logger.info(f"=== IRRIGATION RESPONSE DEBUG ===")
            self.logger.info(f"Result status: {result.status}")
            self.logger.info(f"Result reason: {result.reason}")
            self.logger.info(f"Result error_message: {result.error_message}")
            self.logger.info(f"Response data keys: {list(response_data.keys())}")
            self.logger.info(f"Response data values: {response_data}")
            self.logger.info("====================================")
                
            await self.send_message("IRRIGATE_PLANT_RESPONSE", response_data)
            
            self.logger.info(f"Irrigation request completed for plant {plant_id}: {result.status}")
            
        except ValueError as e:
            self.logger.error(f"ValueError during irrigation: {e}")
            # Handle plant not found or other validation errors
            from controller.dto.irrigation_result import IrrigationResult
            error_result = IrrigationResult.error(
                plant_id=plant_id,
                error_message=str(e)
            )
            await self.send_message("IRRIGATE_PLANT_RESPONSE", error_result.to_websocket_data())
        except Exception as e:
            self.logger.error(f"Unexpected error during irrigation: {e}")
            # Create error DTO for unexpected exceptions
            from controller.dto.irrigation_result import IrrigationResult
            error_result = IrrigationResult.error(
                plant_id=plant_id,
                error_message=str(e)
            )
            await self.send_message("IRRIGATE_PLANT_RESPONSE", error_result.to_websocket_data())

    async def handle_open_valve_request(self, data):
        """Handle open valve request from server."""
        try:
            plant_id = data.get("plant_id")
            time_minutes = data.get("time_minutes")
            
            if not plant_id:
                self.logger.error("No plant_id provided in open valve request")
                return
            
            if not time_minutes:
                self.logger.error("No time_minutes provided in open valve request")
                return
            
            self.logger.info(f"Received OPEN_VALVE request for plant {plant_id}, duration: {time_minutes} minutes")
            
            # Call the open valve handler
            from controller.handlers.open_valve_handler import OpenValveHandler
            handler = OpenValveHandler(self.engine)
            result = await handler.handle(plant_id, time_minutes)
            
            # Send response back to server
            response_data = result.to_websocket_data()
            
            self.logger.info(f"=== OPEN_VALVE RESPONSE DEBUG ===")
            self.logger.info(f"Result status: {result.status}")
            self.logger.info(f"Result reason: {result.reason}")
            self.logger.info(f"Result error_message: {result.error_message}")
            self.logger.info(f"Response data keys: {list(response_data.keys())}")
            self.logger.info(f"Response data values: {response_data}")
            self.logger.info("====================================")
                
            await self.send_message("OPEN_VALVE_RESPONSE", response_data)
            
            self.logger.info(f"Open valve request completed for plant {plant_id}: {result.status}")
            
        except Exception as e:
            self.logger.error(f"Error during open valve: {e}")
            # Create error DTO for unexpected exceptions
            from controller.dto.open_valve_request import OpenValveResponse
            error_result = OpenValveResponse.error(
                plant_id=plant_id if 'plant_id' in locals() else 0,
                error_message=str(e)
            )
            await self.send_message("OPEN_VALVE_RESPONSE", error_result.to_websocket_data())

    async def handle_close_valve_request(self, data):
        """Handle close valve request from server."""
        try:
            plant_id = data.get("plant_id")
            if not plant_id:
                self.logger.error("No plant_id provided in close valve request")
                return
            
            self.logger.info(f"Received CLOSE_VALVE request for plant {plant_id}")
            
            # Call the close valve handler
            from controller.handlers.close_valve_handler import CloseValveHandler
            handler = CloseValveHandler(self.engine)
            result = await handler.handle(plant_id)
            
            # Send response back to server
            response_data = result.to_websocket_data()
            await self.send_message("CLOSE_VALVE_RESPONSE", response_data)
            
            if result.success:
                self.logger.info(f"Successfully closed valve for plant {plant_id}")
            else:
                self.logger.error(f"Failed to close valve for plant {plant_id}: {result.error_message}")
                
        except Exception as e:
            self.logger.error(f"Error during close valve: {e}")
            # Create error DTO for unexpected exceptions
            from controller.dto.close_valve_request import CloseValveResponse
            error_result = CloseValveResponse.error(
                plant_id=plant_id if 'plant_id' in locals() else 0,
                error_message=str(e)
            )
            await self.send_message("CLOSE_VALVE_RESPONSE", error_result.to_websocket_data())

    async def handle_get_valve_status_request(self, data):
        """Handle get valve status request from server."""
        try:
            plant_id = data.get("plant_id")
            if not plant_id:
                self.logger.error("No plant_id provided in get valve status request")
                return
            
            self.logger.info(f"Received GET_VALVE_STATUS request for plant {plant_id}")
            
            # Call the get valve status handler
            from controller.handlers.get_valve_status_handler import GetValveStatusHandler
            handler = GetValveStatusHandler(self.engine)
            result = await handler.handle(plant_id)
            
            # Send response back to server
            response_data = result.to_websocket_data()
            await self.send_message("VALVE_STATUS_RESPONSE", response_data)
            
            if result.success:
                self.logger.info(f"Successfully retrieved valve status for plant {plant_id}")
                self.logger.debug(f"Valve status: {result.status_data}")
            else:
                self.logger.error(f"Failed to get valve status for plant {plant_id}: {result.error_message}")
                
        except Exception as e:
            self.logger.error(f"Error during get valve status: {e}")
            # Create error DTO for unexpected exceptions
            from controller.dto.valve_status_response import ValveStatusResponse
            error_result = ValveStatusResponse.error(
                plant_id=plant_id if 'plant_id' in locals() else 0,
                error_message=str(e)
            )
            await self.send_message("VALVE_STATUS_RESPONSE", error_result.to_websocket_data())
    
    async def handle_valve_status_request(self, data):
        """Handle valve status request from server."""
        try:
            plant_id = data.get("plant_id")
            if not plant_id:
                self.logger.error("No plant_id provided in valve status request")
                return
            
            self.logger.info(f"Received VALVE_STATUS request for plant {plant_id}")
            
            # Get plant from engine
            if plant_id not in self.engine.plants:
                self.logger.error(f"Plant {plant_id} not found in engine")
                return
            
            plant = self.engine.plants[plant_id]
            valve = plant.valve
            
            # Get valve status
            status = valve.get_status()
            user_message = valve.get_user_friendly_status()
            
            # Create response data
            response_data = {
                "plant_id": plant_id,
                "valve_id": valve.valve_id,
                "is_blocked": valve.is_blocked,
                "is_open": valve.is_open,
                "status": status,
                "user_message": user_message,
                "can_irrigate": not valve.is_blocked
            }
            
            await self.send_message("VALVE_STATUS_RESPONSE", response_data)
            self.logger.info(f"Valve status sent for plant {plant_id}: {user_message}")
            
        except Exception as e:
            self.logger.error(f"Error during valve status request: {e}")
            error_response = {
                "plant_id": plant_id,
                "error": True,
                "error_message": f"Failed to get valve status: {str(e)}"
            }
            await self.send_message("VALVE_STATUS_RESPONSE", error_response)
    
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
            
            elif message_type == "IRRIGATE_PLANT":
                await self.handle_irrigate_plant_request(message_data)
            
            elif message_type == "OPEN_VALVE":
                await self.handle_open_valve_request(message_data)
            
            elif message_type == "CLOSE_VALVE":
                await self.handle_close_valve_request(message_data)
            
            elif message_type == "GET_VALVE_STATUS":
                await self.handle_get_valve_status_request(message_data)
            
            elif message_type == "VALVE_STATUS":
                await self.handle_valve_status_request(message_data)
            
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
            self.logger.info("  - IRRIGATE_PLANT: Smart irrigation for a specific plant")
            self.logger.info("  - OPEN_VALVE: Open valve for a specific plant for a given duration")
            self.logger.info("  - CLOSE_VALVE: Close valve for a specific plant")
            self.logger.info("  - GET_VALVE_STATUS: Get detailed valve status for a specific plant")
            
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