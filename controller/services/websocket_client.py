import asyncio
import websockets
import json
import logging
from typing import Optional, Dict, Any
from controller.engine.smart_garden_engine import SmartGardenEngine

class SmartGardenPiClient:
    """
    WebSocket client for Raspberry Pi to connect to the main Smart Garden server.
    Handles irrigation commands, sensor readings, and communication with the central server.
    """
    
    def __init__(self, server_url: str = "ws://192.168.68.59:8080", engine: SmartGardenEngine = None):
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
        
        # Map plant_id (string) to internal plant_id (int) for engine compatibility
        self.plant_id_map: Dict[str, int] = {}
        self.next_plant_id = 1
    
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
    
    def _get_or_create_plant_id(self, plant_id_str: str) -> int:
        """Convert string plant_id to internal integer plant_id, creating plant if needed."""
        if plant_id_str not in self.plant_id_map:
            internal_id = self.next_plant_id
            self.plant_id_map[plant_id_str] = internal_id
            self.next_plant_id += 1
            
            # Create plant in engine with default settings
            try:
                self.engine.add_plant(
                    plant_id=internal_id,
                    desired_moisture=60.0,  # Default 60% moisture
                    plant_lat=32.7940,      # Default coordinates (Israel)
                    plant_lon=34.9896,
                    pipe_diameter=1.0,
                    flow_rate=0.05,
                    water_limit=1.0
                )
                self.logger.info(f"Created new plant in engine: {plant_id_str} -> internal ID {internal_id}")
            except Exception as e:
                self.logger.error(f"Failed to create plant {plant_id_str}: {e}")
                return None
        
        return self.plant_id_map[plant_id_str]
    
    async def handle_irrigation_command(self, data: Dict[Any, Any]):
        """Handle irrigation command from server using Smart Garden Engine."""
        plant_id_str = data.get("plant_id")
        duration = data.get("duration", 30)  # Default 30 seconds
        
        self.logger.info(f"Starting irrigation for plant {plant_id_str} for {duration} seconds")
        
        try:
            # Get or create plant in engine
            internal_plant_id = self._get_or_create_plant_id(plant_id_str)
            if internal_plant_id is None:
                await self.send_irrigation_complete(plant_id_str, duration, "error")
                return
            
            # Use engine to water the plant
            await self.engine.water_plant(internal_plant_id)
            
            # Send completion notification
            await self.send_irrigation_complete(plant_id_str, duration, "success")
            self.logger.info(f"Irrigation completed for plant {plant_id_str}")
            
        except Exception as e:
            self.logger.error(f"Irrigation failed for plant {plant_id_str}: {e}")
            await self.send_irrigation_complete(plant_id_str, duration, "error")
    
    async def handle_add_plant_command(self, data: Dict[Any, Any]):
        """Handle add plant command from server using Smart Garden Engine."""
        from controller.handlers.add_plant_handler import handle
        
        self.logger.info(f"Received ADD_PLANT command from server")
        
        # Call the handler to do all the business logic
        success, response, updated_next_plant_id = handle(
            data=data,
            smart_engine=self.engine,
            plant_id_map=self.plant_id_map,
            next_plant_id=self.next_plant_id
        )
        
        # Update next_plant_id
        self.next_plant_id = updated_next_plant_id
        
        # Send response back to server using DTO
        response_data = response.to_websocket_data()
        
        # Add server plant_id to response for server's reference
        response_data["server_plant_id"] = data.get("plant_id")
        
        await self.send_message("ADD_PLANT_COMPLETE", response_data)
        
        if success:
            self.logger.info(f"✅ Successfully processed ADD_PLANT command")
        else:
            self.logger.error(f"❌ Failed to process ADD_PLANT command: {response.error_message}")

    async def handle_sensor_request(self, data: Dict[Any, Any]):
        """Handle sensor data request from server using Smart Garden Engine."""
        sensor_id = data.get("sensor_id")
        
        self.logger.info(f"Reading sensor data for {sensor_id}")
        
        try:
            # Update all plant moisture levels using the engine
            await self.engine.update_all_moisture()
            
            # Find plant associated with this sensor and get its moisture reading
            sensor_value = None
            plant_found = False
            
            for plant_id_str, internal_id in self.plant_id_map.items():
                if internal_id in self.engine.plants:
                    plant = self.engine.plants[internal_id]
                    # Check if this plant's sensor matches the requested sensor_id
                    if f"moisture_{internal_id:02d}" == sensor_id or f"sensor_{internal_id:02d}" == sensor_id:
                        sensor_value = await plant.sensor.get_moisture()
                        plant_found = True
                        self.logger.info(f"Found plant {plant_id_str} for sensor {sensor_id}")
                        break
            
            if not plant_found:
                # If sensor not found in existing plants, create a fallback reading
                self.logger.warning(f"Sensor {sensor_id} not associated with any plant, using fallback")
                # Try to read from sensor manager directly or simulate
                import random
                sensor_value = random.uniform(20.0, 80.0)  # Fallback simulation
            
            # Send sensor data back to server
            await self.send_sensor_data(sensor_id, sensor_value)
            self.logger.info(f"Sent sensor data: {sensor_id} = {sensor_value:.1f}%")
            
        except Exception as e:
            self.logger.error(f"Failed to read sensor {sensor_id}: {e}")
            # Send error response or fallback value
            await self.send_sensor_data(sensor_id, 0.0)
    
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
            
            elif message_type == "ADD_PLANT":
                await self.handle_add_plant_command(message_data)
            
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
            
            # Send initial sensor and valve assignments based on engine capabilities
            available_sensors = self.engine.get_available_sensors()
            available_valves = self.engine.get_available_valves()
            
            self.logger.info(f"Available sensors: {available_sensors}")
            self.logger.info(f"Available valves: {available_valves}")
            
            # Send sensor assignments
            for sensor_id in available_sensors:
                sensor_name = f"moisture_{sensor_id:02d}"
                await self.send_sensor_assignment(sensor_name, f"plant_{sensor_id:03d}")
                self.logger.info(f"Assigned sensor {sensor_name} to plant_{sensor_id:03d}")
            
            # Send valve assignments  
            for valve_id in available_valves:
                valve_name = f"valve_{valve_id:02d}"
                await self.send_valve_assignment(valve_name, f"plant_{valve_id:03d}")
                self.logger.info(f"Assigned valve {valve_name} to plant_{valve_id:03d}")
            
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