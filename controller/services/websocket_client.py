import asyncio
import websockets
import json
import logging
from typing import Optional, Dict, Any
from controller.engine.smart_garden_engine import SmartGardenEngine
from controller.dto.irrigation_result import IrrigationResult

#my ip is 192.168.68.74
class SmartGardenPiClient:
    """
    Simplified WebSocket client for Raspberry Pi to connect to the main Smart Garden server.
    Handles only essential functionality: connection, add plant, and moisture requests.
    """


    # For production, use Cloud Run URL
    def __init__(self, server_url: str = "wss://smart-garden-backend-1088783109508.europe-west1.run.app", 
                 family_code: str = None, engine: SmartGardenEngine = None):
        self.server_url = server_url
        self.websocket: Optional[websockets.WebSocketServerProtocol] = None
        self.device_id = "raspberrypi_main_controller"
        self.family_code = family_code
        self.is_running = False
        self.active_irrigations = {}
        self.garden_sync_data = None  # Store garden sync data received from server
        
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
    
    async def send_pi_connect(self):
        """Send PI_CONNECT message with family code to sync garden data."""
        if not self.family_code:
            self.logger.error("No family code configured - cannot connect to garden")
            return False
        
        self.logger.info("=== SENDING PI_CONNECT ===")
        self.logger.info(f"🔗 Attempting to connect to garden with invite code: {self.family_code}")
        self.logger.info(f"📤 Sending PI_CONNECT message to server...")
        
        success = await self.send_message("PI_CONNECT", {"family_code": self.family_code})
        
        if success:
            self.logger.info(f"✅ PI_CONNECT message sent successfully with family code: {self.family_code}")
            self.logger.info("⏳ Waiting for GARDEN_SYNC response from server...")
        else:
            self.logger.error(f"❌ Failed to send PI_CONNECT message with family code: {self.family_code}")
        
        return success
    

    
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

    async def handle_remove_plant(self, data: Dict[Any, Any]):
        """Handle remove plant request from server."""
        try:
            from controller.dto.remove_plant import RemovePlantRequest, RemovePlantResponse
            request = RemovePlantRequest.from_websocket_data({"data": data} if "data" not in data else data)
            plant_id = request.plant_id

            self.logger.info(f"Received REMOVE_PLANT request for plant {plant_id}")
            result = self.engine.remove_plant(int(plant_id))
            if result:
                response = RemovePlantResponse.success(int(plant_id))
            else:
                response = RemovePlantResponse.error(int(plant_id), "Plant not found")

            await self.send_message("REMOVE_PLANT_RESPONSE", response.to_websocket_data()["data"])
        except Exception as e:
            try:
                from controller.dto.remove_plant import RemovePlantResponse
                plant_id = data.get("plant_id", 0)
                response = RemovePlantResponse.error(int(plant_id) if isinstance(plant_id, int) or (isinstance(plant_id, str) and plant_id.isdigit()) else 0, str(e))
                await self.send_message("REMOVE_PLANT_RESPONSE", response.to_websocket_data()["data"])
            except Exception:
                await self.send_message("REMOVE_PLANT_RESPONSE", {
                    "plant_id": data.get("plant_id", 0),
                    "status": "error",
                    "error_message": str(e)
                })

    async def handle_irrigate_plant_request(self, data):
        """Handle irrigation request from server."""
        try:
            plant_id = data.get("plant_id")
            if not plant_id:
                self.logger.error("No plant_id provided in irrigation request")
                return
            
            self.logger.info(f"Received IRRIGATE_PLANT request for plant {plant_id}")
            
            # Start irrigation as a background task
            task = self.engine.start_irrigation(plant_id)
            if not task:
                error_result = IrrigationResult.error(
                    plant_id=plant_id,
                    error_message="Already irrigating or unknown plant"
                )
                await self.send_message("IRRIGATE_PLANT_RESPONSE", error_result.to_websocket_data())
                return
            
            # Store the task for tracking
            self.active_irrigations[plant_id] = task
            
            # Send immediate acceptance to free up the handler
            await self.send_message("IRRIGATE_PLANT_ACCEPTED", {"plant_id": plant_id})
            
            # Set up callback for when irrigation completes
            task.add_done_callback(
                lambda t: asyncio.create_task(self._send_irrigation_result(plant_id, t))
            )
            
            self.logger.info(f"Started background irrigation task for plant {plant_id}")
            
        except Exception as e:
            self.logger.error(f"Error starting irrigation: {e}")
            error_result = IrrigationResult.error(
                plant_id=plant_id if 'plant_id' in locals() else 0,
                error_message=str(e)
            )
            await self.send_message("IRRIGATE_PLANT_RESPONSE", error_result.to_websocket_data())

    async def _send_irrigation_result(self, plant_id: int, task: asyncio.Task):
        """Send the result of a completed irrigation task to the server."""
        try:
            result = task.result()
            await self.send_message("IRRIGATE_PLANT_RESPONSE", result.to_websocket_data())
            self.logger.info(f"Sent irrigation result for plant {plant_id}: {result.status}")
        except Exception as e:
            self.logger.error(f"Error processing irrigation result for plant {plant_id}: {e}")
            error_result = IrrigationResult.error(
                plant_id=plant_id,
                error_message=str(e)
            )
            await self.send_message("IRRIGATE_PLANT_RESPONSE", error_result.to_websocket_data())
        finally:
            # Clean up the task reference
            self.active_irrigations.pop(plant_id, None)

    async def handle_stop_irrigation_request(self, data):
        """Handle stop irrigation request from server."""
        try:
            print("\n=== HANDLING STOP IRRIGATION REQUEST ===")
            print("Step 1: Parsing request data...")
            
            # Parse request using DTO
            from controller.dto.stop_irrigation import StopIrrigation
            from controller.dto.stop_irrigation_response import StopIrrigationResponse
            
            request = StopIrrigation.from_websocket_data(data)
            plant_id = request.plant_id
            
            if not plant_id:
                print("ERROR: No plant_id provided in stop irrigation request")
                return
            
            print("\nStep 2: Checking current state...")
            print(f"Plant ID: {plant_id}")
            print(f"Active irrigation tasks: {list(self.engine.irrigation_tasks.keys())}")
            print(f"Is this plant being irrigated? {'Yes' if plant_id in self.engine.irrigation_tasks else 'No'}")
            
            print("\nStep 3: Creating stop irrigation handler...")
            from controller.handlers.stop_irrigation_handler import StopIrrigationHandler
            handler = StopIrrigationHandler(self.engine)
            
            print("\nStep 4: Calling handler to stop irrigation...")
            result = await handler.handle(plant_id)
            
            print("\nStep 5: Processing result...")
            response_data = result.to_websocket_data()
            print(f"Response data: {response_data}")
            
            print("\nStep 6: Sending response to server...")
            await self.send_message("STOP_IRRIGATION_RESPONSE", response_data)
            
            if result.status == "success":
                print("\nSTOP IRRIGATION SUCCESSFUL:")
                print(f"- Plant ID: {plant_id}")
                print(f"- Final moisture: {result.final_moisture}%")
                print(f"- Water added before stop: {result.water_added_liters}L")
                print(f"- Active tasks after stop: {list(self.engine.irrigation_tasks.keys())}")
            else:
                print("\nSTOP IRRIGATION FAILED:")
                print(f"- Plant ID: {plant_id}")
                print(f"- Error: {result.error_message}")
            
            print("=========================================\n")
            
        except Exception as e:
            print("\n=== ERROR DURING STOP IRRIGATION ===")
            print(f"Error message: {str(e)}")
            print("Creating error response...")
            
            # Create error DTO for unexpected exceptions
            error_response = StopIrrigationResponse.error(
                plant_id=plant_id if 'plant_id' in locals() else 0,
                error_message=str(e)
            )
            
            print("Sending error response to server...")
            await self.send_message("STOP_IRRIGATION_RESPONSE", error_response.to_websocket_data())
            print("=========================================\n")

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
            
            # Create handler instance and call it
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

    async def handle_update_plant_command(self, data: Dict[Any, Any]):
        """Handle update plant request from server."""
        try:
            from controller.handlers.update_plant_handler import UpdatePlantHandler
            
            self.logger.info(f"Received UPDATE_PLANT command from server")
            self.logger.info(f"Full message: {data}")
            
            # Create handler instance and call it
            handler = UpdatePlantHandler(self.engine)
            success, message = await handler.handle(data=data)
            
            # Extract plant_id from the nested data structure
            plant_data = data.get("data", {})
            plant_id = plant_data.get("plant_id")
            
            # Send response back to server
            response_data = {
                "plant_id": plant_id,
                "success": success,
                "message": message
            }
            
            await self.send_message("UPDATE_PLANT_RESPONSE", response_data)
            
            if success:
                self.logger.info(f"Successfully updated plant {plant_id}")
            else:
                self.logger.error(f"Failed to update plant {plant_id}: {message}")
                
        except Exception as e:
            self.logger.error(f"Error during update plant: {e}")
            # Extract plant_id from the nested data structure for error response
            plant_data = data.get("data", {})
            plant_id = plant_data.get("plant_id", 0)
            error_response = {
                "plant_id": plant_id,
                "success": False,
                "message": f"Error updating plant: {str(e)}"
            }
            await self.send_message("UPDATE_PLANT_RESPONSE", error_response)
    
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

    async def handle_restart_valve_request(self, data):
        """Handle restart valve request from server."""
        try:
            plant_id = data.get("plant_id")
            if not plant_id:
                self.logger.error("No plant_id provided in restart valve request")
                await self.send_message("RESTART_VALVE_RESPONSE", {"status": "error", "error_message": "Missing plant_id"})
                return

            self.logger.info(f"Received RESTART_VALVE request for plant {plant_id}")

            success = await self.engine.restart_valve(int(plant_id))
            if success:
                await self.send_message("RESTART_VALVE_RESPONSE", {"status": "success", "plant_id": int(plant_id)})
                self.logger.info(f"Successfully restarted valve for plant {plant_id}")
            else:
                await self.send_message("RESTART_VALVE_RESPONSE", {"status": "error", "plant_id": int(plant_id), "error_message": "restart_failed"})
                self.logger.error(f"Failed to restart valve for plant {plant_id}")
        except Exception as e:
            self.logger.error(f"Error during restart valve: {e}")
            await self.send_message("RESTART_VALVE_RESPONSE", {"status": "error", "plant_id": int(plant_id) if 'plant_id' in locals() else 0, "error_message": str(e)})
    
    async def handle_garden_sync(self, message: Dict[Any, Any]):
        """Handle GARDEN_SYNC message from server with garden and plants data."""
        try:
            self.logger.info("=== HANDLING GARDEN_SYNC ===")
            self.logger.info(f"Received garden sync message: {message}")
            
            # Extract garden and plants data from the message
            garden_data = message.get("garden", {})
            plants_data = message.get("plants", [])
            
            self.logger.info(f"Garden: {garden_data.get('name', 'Unknown')} (Code: {garden_data.get('invite_code', 'Unknown')})")
            self.logger.info(f"Plants to sync: {len(plants_data)}")
            
            # Store the sync data
            self.garden_sync_data = message
            
            # Add each plant to the engine
            for plant_data in plants_data:
                try:
                    # Coerce incoming types defensively
                    raw_plant_id = plant_data.get("plant_id")
                    plant_id = int(raw_plant_id) if raw_plant_id is not None else None
                    desired_moisture = float(plant_data.get("desiredMoisture", 60.0))
                    water_limit = float(plant_data.get("waterLimit", 1.0))
                    dripper_type = plant_data.get("dripperType", "2L/h")
                    schedule_data = plant_data.get("scheduleData")
                    sensor_port = plant_data.get("sensor_port")
                    raw_valve_id = plant_data.get("valve_id")
                    valve_id = int(raw_valve_id) if raw_valve_id is not None else None
                    
                    self.logger.info(f"Adding plant {plant_id} to engine:")
                    self.logger.info(f"  - Desired Moisture: {desired_moisture}%")
                    self.logger.info(f"  - Water Limit: {water_limit}L")
                    self.logger.info(f"  - Dripper Type: {dripper_type}")
                    self.logger.info(f"  - Schedule: {schedule_data}")
                    
                    # Convert schedule_data to engine format
                    engine_schedule_data = None
                    if schedule_data:
                        irrigation_days = schedule_data.get("irrigation_days")
                        irrigation_time = schedule_data.get("irrigation_time")
                        
                        if irrigation_days and irrigation_time:
                            engine_schedule_data = []
                            for day in irrigation_days:
                                engine_schedule_data.append({
                                    "day": day.lower(),
                                    "time": irrigation_time
                                })
                    
                    # Add plant to engine
                    await self.engine.add_plant(
                        plant_id=plant_id,
                        desired_moisture=desired_moisture,
                        schedule_data=engine_schedule_data,
                        water_limit=water_limit,
                        dripper_type=dripper_type,
                        sensor_port=sensor_port,
                        valve_id=valve_id
                    )
                    
                    self.logger.info(f"✅ Successfully added plant {plant_id} to engine")
                    
                except Exception as e:
                    self.logger.error(f"❌ Failed to add plant {plant_data.get('plant_id', 'Unknown')}: {e}")
            
            self.logger.info(f"=== GARDEN SYNC COMPLETE ===")
            self.logger.info(f"Total plants in engine: {len(self.engine.plants)}")
            for plant_id, plant in self.engine.plants.items():
                self.logger.info(f"  - Plant {plant_id}: {plant.desired_moisture}% target moisture")
            
        except Exception as e:
            self.logger.error(f"Error during garden sync: {e}")
    
    async def handle_message(self, message: str):
        """Process incoming messages from the server."""
        try:
            data = json.loads(message)
            message_type = data.get("type")
            message_data = data.get("data", {})
            
            self.logger.info(f"Received {message_type} message")
            self.logger.info(f"Full message: {message}")
            self.logger.info(f"Parsed data: {data}")
            self.logger.info(f"Message type: '{message_type}' (length: {len(message_type) if message_type else 0})")
            self.logger.info(f"Message data: {message_data}")
            
            # Debug: Check if message_type matches expected values
            expected_types = ["WELCOME", "ADD_PLANT", "GET_PLANT_MOISTURE", "GET_ALL_MOISTURE", 
                            "IRRIGATE_PLANT", "STOP_IRRIGATION", "OPEN_VALVE", "CLOSE_VALVE", 
                            "GET_VALVE_STATUS", "VALVE_STATUS", "UPDATE_PLANT", "UPDATE_PLANT_RESPONSE", "GARDEN_SYNC", "REMOVE_PLANT", "RESTART_VALVE"]
            if message_type not in expected_types:
                self.logger.warning(f"UNKNOWN MESSAGE TYPE: '{message_type}' (not in expected list)")
                self.logger.warning(f"Expected types: {expected_types}")
                # Additional debugging for unknown message types
                self.logger.warning(f"Message type bytes: {repr(message_type)}")
                self.logger.warning(f"Message type hex: {message_type.encode('utf-8').hex() if message_type else 'None'}")
                # Check for common issues
                if message_type and message_type.strip() != message_type:
                    self.logger.warning(f"Message type has leading/trailing whitespace!")
                if message_type and message_type.lower() == "update_plant":
                    self.logger.warning(f"Message type is lowercase - should be uppercase!")
            
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
            
            elif message_type == "STOP_IRRIGATION":
                await self.handle_stop_irrigation_request(message_data)
            
            elif message_type == "OPEN_VALVE":
                await self.handle_open_valve_request(message_data)
            
            elif message_type == "CLOSE_VALVE":
                await self.handle_close_valve_request(message_data)
            
            elif message_type == "RESTART_VALVE":
                await self.handle_restart_valve_request(message_data)
            
            elif message_type == "RESTART_VALVE":
                await self.handle_restart_valve_request(message_data)
            
            elif message_type == "GET_VALVE_STATUS":
                await self.handle_get_valve_status_request(message_data)
            
            elif message_type == "VALVE_STATUS":
                await self.handle_valve_status_request(message_data)
            
            elif message_type == "UPDATE_PLANT":
                await self.handle_update_plant_command(data)
            
            elif message_type == "UPDATE_PLANT_RESPONSE":
                self.logger.warning(f"Received UPDATE_PLANT_RESPONSE - this should not happen! This is likely an echo of our own response.")
                self.logger.warning(f"Full message: {data}")
                # Ignore this message as it's likely an echo
            
            elif message_type == "GARDEN_SYNC":
                await self.handle_garden_sync(data)
            
            elif message_type == "REMOVE_PLANT":
                await self.handle_remove_plant(message_data)
            
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
            
            # Send PI_CONNECT with family code if available
            if self.family_code:
                self.logger.info(f"Sending PI_CONNECT with family code: {self.family_code}")
                await self.send_pi_connect()
            else:
                self.logger.warning("No family code configured - Pi will not sync with any garden")
            
            # Wait a moment for garden sync response
            await asyncio.sleep(1)
            
            self.logger.info("Client is ready and listening for commands...")
            self.logger.info("Supported commands:")
            self.logger.info("  - WELCOME: Server welcome message")
            self.logger.info("  - ADD_PLANT: Add a new plant to the system")
            self.logger.info("  - GET_PLANT_MOISTURE: Get moisture for a specific plant")
            self.logger.info("  - GET_ALL_MOISTURE: Get moisture for all plants")
            self.logger.info("  - IRRIGATE_PLANT: Smart irrigation for a specific plant")
            self.logger.info("  - STOP_IRRIGATION: Stop smart irrigation for a specific plant")
            self.logger.info("  - OPEN_VALVE: Open valve for a specific plant for a given duration")
            self.logger.info("  - CLOSE_VALVE: Close valve for a specific plant")
            self.logger.info("  - GET_VALVE_STATUS: Get detailed valve status for a specific plant")
            self.logger.info("  - UPDATE_PLANT: Update an existing plant's configuration")
            self.logger.info("  - GARDEN_SYNC: Sync garden and plants data from server")
            
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