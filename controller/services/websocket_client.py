import asyncio
import websockets
import json
from typing import Optional, Dict, Any
from controller.engine.smart_garden_engine import SmartGardenEngine
from controller.dto.irrigation_result import IrrigationResult
from controller.dto.check_sensor_connection import (
    CheckSensorConnectionRequest,
    CheckSensorConnectionResponse,
)
from controller.dto.check_valve_mechanism import (
    CheckValveMechanismRequest,
    CheckValveMechanismResponse,
)
from controller.dto.check_power_supply import (
    CheckPowerSupplyRequest,
    CheckPowerSupplyResponse,
)

#my ip is 192.168.68.74
class SmartGardenPiClient:
    """
    Simplified WebSocket client for Raspberry Pi to connect to the main Smart Garden server.
    Handles only essential functionality: connection, add plant, and moisture requests.
    """

#str = "wss://smart-garden-backend-1088783109508.europe-west1.run.app"

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
            print(f"[WS-CLIENT] Connecting to WebSocket server: {self.server_url}")
            self.websocket = await websockets.connect(self.server_url)
            print("[WS-CLIENT] Successfully connected to server!")
            self.is_running = True
            
            return True
        except Exception as e:
            print(f"[WS-CLIENT] ERROR - Failed to connect: {e}")
            return False
    
    async def disconnect(self):
        """Gracefully disconnect from the server."""
        self.is_running = False
        if self.websocket:
            await self.websocket.close()
            print("[WS-CLIENT] Disconnected from server")
    
    async def send_message(self, message_type: str, data: Dict[Any, Any] = None):
        """Send a message to the server."""
        if not self.websocket:
            print("[WS-CLIENT] ERROR - No active connection to send message")
            return False
        
        try:
            message = {
                "type": message_type,
                "device_id": self.device_id
            }
            if data:
                message["data"] = data
            
            # Log the message being sent
            print(f"[WS-CLIENT] SEND type={message_type} keys={list(message.keys())} data_keys={list(data.keys()) if data else 'None'}")
            
            await self.websocket.send(json.dumps(message))
            print(f"[WS-CLIENT] Sent {message_type}")
            return True
        except Exception as e:
            print(f"[WS-CLIENT] ERROR - Failed to send message: {e}")
            return False
    
    async def send_hello(self):
        """Send initial HELLO_PI message to identify this device as a Raspberry Pi."""
        return await self.send_message("HELLO_PI")
    
    async def send_pi_connect(self):
        """Send PI_CONNECT message with family code to sync garden data."""
        if not self.family_code:
            print("[WS-CLIENT] ERROR - No family code configured - cannot connect to garden")
            return False
        
        print("[WS-CLIENT] === SENDING PI_CONNECT ===")
        print(f"[WS-CLIENT] Attempting to connect with invite code: {self.family_code}")
        print(f"[WS-CLIENT] Sending PI_CONNECT message to server...")
        
        success = await self.send_message("PI_CONNECT", {"family_code": self.family_code})
        
        if success:
            print(f"[WS-CLIENT] PI_CONNECT sent (family_code={self.family_code})")
            print("[WS-CLIENT] Waiting for GARDEN_SYNC response...")
        else:
            print(f"[WS-CLIENT] ERROR - Failed to send PI_CONNECT (family_code={self.family_code})")
        
        return success
    

    
    async def handle_add_plant_command(self, data: Dict[Any, Any]):
        """Handle add plant request from server."""
        try:
            from controller.handlers.add_plant_handler import AddPlantHandler
            
            print(f"[WS-CLIENT] CMD ADD_PLANT data={data}")
            
            # Create handler instance and call it
            handler = AddPlantHandler(self.engine)
            success, response = await handler.handle(data=data)
            
            # Send response back to server using DTO
            response_data = response.to_websocket_data()
            
            # Use server's plant_id as the main plant_id in response
            response_data["plant_id"] = data.get("plant_id")  # Use server's plant ID
            
            # Log the response message details
            print(f"[WS-CLIENT] ADD_PLANT_RESPONSE success={success} data={response_data}")
            
            await self.send_message("ADD_PLANT_RESPONSE", response_data)
            
            if success:
                print(f"[WS-CLIENT] ADD_PLANT processed")
            else:
                print(f"[WS-CLIENT] ERROR - ADD_PLANT failed: {response.error_message}")
                
        except Exception as e:
            print(f"[WS-CLIENT] ERROR - add plant: {e}")
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
        
        print(f"[WS-CLIENT] CMD GET_PLANT_MOISTURE data={data}")
        
        # Create handler instance and call it
        handler = GetPlantMoistureHandler(self.engine)
        success, moisture_data = await handler.handle(data=data)
        
        # Handler always returns a DTO (success or error), so just use it
        response_data = moisture_data.to_websocket_data()
        await self.send_message("PLANT_MOISTURE_RESPONSE", response_data)
        
        if success:
            print(f"[WS-CLIENT] PLANT_MOISTURE_RESPONSE ok plant={data.get('plant_id')} moisture={getattr(moisture_data,'moisture',None)}")
        else:
            print(f"[WS-CLIENT] ERROR - PLANT_MOISTURE_RESPONSE plant={data.get('plant_id')} err={moisture_data.error_message}")

    async def handle_all_plants_moisture_request(self, data: Dict[Any, Any]):
        """Handle all plants moisture request from server."""
        from controller.handlers.get_all_plants_moisture_handler import GetAllPlantsMoistureHandler
        
        print(f"[WS-CLIENT] CMD GET_ALL_MOISTURE data={data}")
        
        # Create handler instance and call it
        handler = GetAllPlantsMoistureHandler(self.engine)
        success, response_dto = await handler.handle(data=data)
        
        # Handler always returns a single AllPlantsMoistureResponse DTO, so just use it
        response_data = response_dto.to_websocket_data()
        await self.send_message("ALL_MOISTURE_RESPONSE", response_data)
        
        if success:
            print(f"[WS-CLIENT] ALL_MOISTURE_RESPONSE ok total={response_dto.total_plants}")
        else:
            print(f"[WS-CLIENT] ERROR - ALL_MOISTURE_RESPONSE err={response_dto.error_message}")

    async def handle_remove_plant(self, data: Dict[Any, Any]):
        """Handle remove plant request from server."""
        try:
            from controller.dto.remove_plant import RemovePlantRequest, RemovePlantResponse
            request = RemovePlantRequest.from_websocket_data({"data": data} if "data" not in data else data)
            plant_id = request.plant_id

            print(f"[WS-CLIENT] CMD REMOVE_PLANT plant={plant_id}")
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
            session_id = data.get("session_id")
            if not plant_id:
                print("[WS-CLIENT] ERROR - IRRIGATE_PLANT missing plant_id")
                return
            
            print(f"[WS-CLIENT] CMD IRRIGATE_PLANT plant={plant_id}")
            
            # Start irrigation as a background task
            task = self.engine.start_irrigation(plant_id, session_id=session_id)
            if not task:
                error_result = IrrigationResult.error(
                    plant_id=plant_id,
                    error_message="Already irrigating or unknown plant"
                )
                await self.send_message("IRRIGATE_PLANT_RESPONSE", error_result.to_websocket_data())
                return
            
            # Store the task and session for tracking
            self.active_irrigations[plant_id] = {"task": task, "session_id": session_id}
            
            # Send immediate acceptance to free up the handler
            await self.send_message("IRRIGATE_PLANT_ACCEPTED", {"plant_id": plant_id, "session_id": session_id})
            
            # Set up callback for when irrigation completes
            task.add_done_callback(
                lambda t: asyncio.create_task(self._send_irrigation_result(plant_id, t))
            )
            
            print(f"[WS-CLIENT] IRRIGATE_PLANT_ACCEPTED plant={plant_id}")
            
        except Exception as e:
            print(f"[WS-CLIENT] ERROR - start irrigation: {e}")
            error_result = IrrigationResult.error(
                plant_id=plant_id if 'plant_id' in locals() else 0,
                error_message=str(e)
            )
            await self.send_message("IRRIGATE_PLANT_RESPONSE", error_result.to_websocket_data())

    async def _send_irrigation_result(self, plant_id: int, task: asyncio.Task):
        """Send the result of a completed irrigation task to the server."""
        try:
            result = task.result()
            # Attach session_id if we tracked it
            try:
                tracked = self.active_irrigations.get(plant_id)
                if tracked and getattr(result, 'session_id', None) is None:
                    result.session_id = tracked.get('session_id')
            except Exception:
                pass
            await self.send_message("IRRIGATE_PLANT_RESPONSE", result.to_websocket_data())
            print(f"[WS-CLIENT] IRRIGATE_PLANT_RESPONSE plant={plant_id} status={result.status}")
        except Exception as e:
            print(f"[WS-CLIENT] ERROR - irrigation result for plant {plant_id}: {e}")
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
            # Stop irrigation request
            
            # Parse request using DTO
            from controller.dto.stop_irrigation import StopIrrigation
            from controller.dto.stop_irrigation_response import StopIrrigationResponse
            
            request = StopIrrigation.from_websocket_data(data)
            plant_id = request.plant_id
            
            if not plant_id:
                print("ERROR: No plant_id provided in stop irrigation request")
                return
            
            # Current state
            
            # Create handler
            from controller.handlers.stop_irrigation_handler import StopIrrigationHandler
            handler = StopIrrigationHandler(self.engine)
            
            # Call handler
            result = await handler.handle(plant_id)
            
            response_data = result.to_websocket_data()
            
            await self.send_message("STOP_IRRIGATION_RESPONSE", response_data)
            
            if result.status == "success":
                print(f"[WS-CLIENT] STOP_IRRIGATION ok plant={plant_id} final_moisture={result.final_moisture} water_added={result.water_added_liters}")
            else:
                print(f"[WS-CLIENT] ERROR - STOP_IRRIGATION plant={plant_id} err={result.error_message}")
            
        except Exception as e:
            print(f"[WS-CLIENT] ERROR - STOP IRRIGATION: {str(e)}")
            
            # Create error DTO for unexpected exceptions
            error_response = StopIrrigationResponse.error(
                plant_id=plant_id if 'plant_id' in locals() else 0,
                error_message=str(e)
            )
            
            await self.send_message("STOP_IRRIGATION_RESPONSE", error_response.to_websocket_data())

    async def handle_open_valve_request(self, data):
        """Handle open valve request from server."""
        try:
            plant_id = data.get("plant_id")
            time_minutes = data.get("time_minutes")
            
            if not plant_id:
                print("[WS-CLIENT] ERROR - OPEN_VALVE missing plant_id")
                return
            
            if not time_minutes:
                print("[WS-CLIENT] ERROR - OPEN_VALVE missing time_minutes")
                return
            
            print(f"[WS-CLIENT] CMD OPEN_VALVE plant={plant_id} minutes={time_minutes}")
            
            # Call the open valve handler
            from controller.handlers.open_valve_handler import OpenValveHandler
            handler = OpenValveHandler(self.engine)
            result = await handler.handle(plant_id, time_minutes)
            
            # Send response back to server
            response_data = result.to_websocket_data()
            
            print(f"[WS-CLIENT] OPEN_VALVE_RESPONSE status={result.status} reason={result.reason} err={result.error_message}")
                
            await self.send_message("OPEN_VALVE_RESPONSE", response_data)
            
            print(f"[WS-CLIENT] OPEN_VALVE done plant={plant_id} status={result.status}")
            
        except Exception as e:
            print(f"[WS-CLIENT] ERROR - OPEN_VALVE: {e}")
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
                print("[WS-CLIENT] ERROR - CLOSE_VALVE missing plant_id")
                return
            
            print(f"[WS-CLIENT] CMD CLOSE_VALVE plant={plant_id}")
            
            # Call the close valve handler
            from controller.handlers.close_valve_handler import CloseValveHandler
            handler = CloseValveHandler(self.engine)
            result = await handler.handle(plant_id)
            
            # Send response back to server
            response_data = result.to_websocket_data()
            await self.send_message("CLOSE_VALVE_RESPONSE", response_data)
            
            if result.success:
                print(f"[WS-CLIENT] CLOSE_VALVE_RESPONSE ok plant={plant_id}")
            else:
                print(f"[WS-CLIENT] ERROR - CLOSE_VALVE_RESPONSE plant={plant_id} err={result.error_message}")
                
        except Exception as e:
            print(f"[WS-CLIENT] ERROR - CLOSE_VALVE: {e}")
            # Create error DTO for unexpected exceptions
            from controller.dto.close_valve_request import CloseValveResponse
            error_result = CloseValveResponse.error(
                plant_id=plant_id if 'plant_id' in locals() else 0,
                error_message=str(e)
            )
            await self.send_message("", error_result.to_websocket_data())

    async def handle_get_valve_status_request(self, data):
        """Handle get valve status request from server."""
        try:
            plant_id = data.get("plant_id")
            if not plant_id:
                print("[WS-CLIENT] ERROR - GET_VALVE_STATUS missing plant_id")
                return
            
            print(f"[WS-CLIENT] CMD GET_VALVE_STATUS plant={plant_id}")
            
            # Create handler instance and call it
            from controller.handlers.get_valve_status_handler import GetValveStatusHandler
            handler = GetValveStatusHandler(self.engine)
            result = await handler.handle(plant_id)
            
            # Send response back to server
            response_data = result.to_websocket_data()
            await self.send_message("VALVE_STATUS_RESPONSE", response_data)
            
            if result.success:
                print(f"[WS-CLIENT] VALVE_STATUS_RESPONSE ok plant={plant_id}")
            else:
                print(f"[WS-CLIENT] ERROR - VALVE_STATUS_RESPONSE plant={plant_id} err={result.error_message}")
                
        except Exception as e:
            print(f"[WS-CLIENT] ERROR - GET_VALVE_STATUS: {e}")
            # Create error DTO for unexpected exceptions
            from controller.dto.valve_status_response import ValveStatusResponse
            error_result = ValveStatusResponse.error(
                plant_id=plant_id if 'plant_id' in locals() else 0,
                error_message=str(e)
            )
            await self.send_message("VALVE_STATUS_RESPONSE", error_result.to_websocket_data())

    async def handle_check_sensor_connection(self, data: Dict[Any, Any]):
        """Handle CHECK_SENSOR_CONNECTION request: attempt a live sensor read."""
        try:
            request = CheckSensorConnectionRequest.from_websocket_data(data or {})
            plant_id = request.plant_id
            if plant_id not in self.engine.plants:
                response = CheckSensorConnectionResponse.error(plant_id, "Plant not found")
                await self.send_message("CHECK_SENSOR_CONNECTION_RESPONSE", response.to_websocket_data())
                return

            # Ask engine for complete sensor data (moisture, temperature)
            sensor_data = await self.engine.get_plant_sensor_data(plant_id)
            try:
                sensor_port = self.engine.sensor_manager.get_sensor_port(str(plant_id))
            except Exception:
                sensor_port = None

            if sensor_data is None:
                response = CheckSensorConnectionResponse.error(plant_id, "sensor_read_failed", sensor_port=sensor_port)
            else:
                moisture, temperature = sensor_data
                response = CheckSensorConnectionResponse.success(
                    plant_id=plant_id,
                    moisture=moisture,
                    temperature=temperature,
                    sensor_port=sensor_port,
                    message="Sensor responded"
                )

            await self.send_message("CHECK_SENSOR_CONNECTION_RESPONSE", response.to_websocket_data())
        except Exception as e:
            try:
                plant_id = (data or {}).get("plant_id", 0)
                response = CheckSensorConnectionResponse.error(int(plant_id) if plant_id else 0, str(e))
                await self.send_message("CHECK_SENSOR_CONNECTION_RESPONSE", response.to_websocket_data())
            except Exception:
                await self.send_message("CHECK_SENSOR_CONNECTION_RESPONSE", {"plant_id": 0, "status": "error", "error_message": str(e)})

    async def handle_check_valve_mechanism(self, data: Dict[Any, Any]):
        """Handle CHECK_VALVE_MECHANISM: brief pulse open/close then report status."""
        try:
            request = CheckValveMechanismRequest.from_websocket_data(data or {})
            plant_id = request.plant_id
            if plant_id not in self.engine.plants:
                response = CheckValveMechanismResponse.error(plant_id, "Plant not found")
                await self.send_message("CHECK_VALVE_MECHANISM_RESPONSE", response.to_websocket_data())
                return

            # Perform a safe pulse using restart_valve
            success = await self.engine.restart_valve(plant_id)
            status_data = self.engine.get_detailed_valve_status(plant_id) or {}
            valve_id = None
            is_open = None
            is_blocked = None
            try:
                plant = self.engine.plants[plant_id]
                valve_id = getattr(plant.valve, 'valve_id', None)
                is_open = getattr(plant.valve, 'is_open', None)
                is_blocked = getattr(plant.valve, 'is_blocked', None)
            except Exception:
                pass

            if success:
                response = CheckValveMechanismResponse.success(
                    plant_id=plant_id,
                    valve_id=valve_id,
                    is_open=bool(is_open) if is_open is not None else False,
                    is_blocked=bool(is_blocked) if is_blocked is not None else False,
                    status_data=status_data,
                    message="Valve pulse completed"
                )
            else:
                response = CheckValveMechanismResponse.error(
                    plant_id=plant_id,
                    error_message="valve_pulse_failed",
                    status_data=status_data
                )

            await self.send_message("CHECK_VALVE_MECHANISM_RESPONSE", response.to_websocket_data())
        except Exception as e:
            try:
                plant_id = (data or {}).get("plant_id", 0)
                response = CheckValveMechanismResponse.error(int(plant_id) if plant_id else 0, str(e))
                await self.send_message("CHECK_VALVE_MECHANISM_RESPONSE", response.to_websocket_data())
            except Exception:
                await self.send_message("CHECK_VALVE_MECHANISM_RESPONSE", {"plant_id": 0, "status": "error", "error_message": str(e)})

    async def handle_check_power_supply(self, data: Dict[Any, Any]):
        """Handle CHECK_POWER_SUPPLY: read Pi throttled flags and report OK/Fail."""
        try:
            request = CheckPowerSupplyRequest.from_websocket_data(data or {})

            async def _read_throttled() -> Dict[str, Any]:
                import asyncio, re
                # vcgencmd path
                try:
                    proc = await asyncio.create_subprocess_exec(
                        'vcgencmd', 'get_throttled',
                        stdout=asyncio.subprocess.PIPE, stderr=asyncio.subprocess.PIPE
                    )
                    out, _ = await proc.communicate()
                    text = out.decode().strip()
                    m = re.search(r'throttled=0x([0-9a-fA-F]+)', text)
                    if m:
                        val = int(m.group(1), 16)
                        return {
                            'raw': val,
                            'under_voltage_now': bool(val & (1 << 0)),
                            'freq_capped_now': bool(val & (1 << 1)),
                            'throttled_now': bool(val & (1 << 2)),
                            'under_voltage_since_boot': bool(val & (1 << 16)),
                            'freq_capped_since_boot': bool(val & (1 << 17)),
                            'throttled_since_boot': bool(val & (1 << 18)),
                            'source': 'vcgencmd'
                        }
                except Exception:
                    pass

                # dmesg fallback
                try:
                    proc = await asyncio.create_subprocess_shell(
                        "dmesg | grep -i 'under-voltage' | tail -1",
                        stdout=asyncio.subprocess.PIPE, stderr=asyncio.subprocess.PIPE
                    )
                    out, _ = await proc.communicate()
                    hit = out.decode().strip()
                    return {
                        'raw': None,
                        'under_voltage_now': 'detected' in hit.lower(),
                        'freq_capped_now': None,
                        'throttled_now': None,
                        'under_voltage_since_boot': bool(hit),
                        'freq_capped_since_boot': None,
                        'throttled_since_boot': None,
                        'source': 'dmesg'
                    }
                except Exception:
                    return {'raw': None, 'source': 'none'}

            data_flags = await _read_throttled()
            ok = not bool(data_flags.get('under_voltage_now')) and not bool(data_flags.get('throttled_now'))
            message = 'Power supply OK' if ok else 'Power supply issue detected'
            response = CheckPowerSupplyResponse.success(ok=ok, data=data_flags, plant_id=request.plant_id, message=message)
            await self.send_message('CHECK_POWER_SUPPLY_RESPONSE', response.to_websocket_data())
        except Exception as e:
            try:
                plant_id = (data or {}).get('plant_id')
                response = CheckPowerSupplyResponse.error(str(e), plant_id=plant_id)
                await self.send_message('CHECK_POWER_SUPPLY_RESPONSE', response.to_websocket_data())
            except Exception:
                await self.send_message('CHECK_POWER_SUPPLY_RESPONSE', { 'status': 'error', 'ok': False, 'error_message': str(e) })

    async def handle_update_plant_command(self, data: Dict[Any, Any]):
        """Handle update plant request from server."""
        try:
            from controller.handlers.update_plant_handler import UpdatePlantHandler
            
            print(f"[WS-CLIENT] CMD UPDATE_PLANT data={data}")
            
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
                print(f"[WS-CLIENT] UPDATE_PLANT_RESPONSE ok plant={plant_id}")
            else:
                print(f"[WS-CLIENT] ERROR - UPDATE_PLANT_RESPONSE plant={plant_id} err={message}")
                
        except Exception as e:
            print(f"[WS-CLIENT] ERROR - UPDATE_PLANT: {e}")
            # Extract plant_id from the nested data structure for error response
            plant_data = data.get("data", {})
            plant_id = plant_data.get("plant_id", 0)
            error_response = {
                "plant_id": plant_id,
                "success": False,
                "message": f"Error updating plant: {str(e)}"
            }
            await self.send_message("UPDATE_PLANT_RESPONSE", error_response)

    async def handle_update_schedule_command(self, data: Dict[Any, Any]):
        """Handle live schedule update for a plant from server.

        Expected data:
          { plant_id: int, scheduleData: { irrigation_days: ["Sun",...], irrigation_time: "HH:MM[:SS]" } }
        """
        try:
            plant_id = data.get("plant_id")
            schedule_data = data.get("scheduleData") or {}

            if plant_id is None:
                print("[WS-CLIENT] ERROR - UPDATE_SCHEDULE missing plant_id")
                return

            if plant_id not in self.engine.plants:
                print(f"[WS-CLIENT] ERROR - UPDATE_SCHEDULE: Plant {plant_id} not found in engine")
                return

            # Normalize to engine format: list of {day: full-name, time: HH:MM}
            engine_entries = []
            days = (schedule_data or {}).get("irrigation_days") or []
            time_str = (schedule_data or {}).get("irrigation_time")
            if days and time_str:
                for d in days:
                    try:
                        engine_entries.append({"day": str(d), "time": str(time_str)})
                    except Exception:
                        pass

            plant = self.engine.plants[plant_id]
            if not engine_entries:
                # Clear any existing schedule
                if getattr(plant, 'schedule', None):
                    try:
                        plant.schedule.clear_schedules()
                    except Exception:
                        pass
                    plant.schedule = None
                print(f"[WS-CLIENT] UPDATE_SCHEDULE: Cleared schedule for plant {plant_id}")
                return

            # Create or update schedule
            if getattr(plant, 'schedule', None):
                try:
                    plant.schedule.update_schedule(engine_entries)
                    print(f"[WS-CLIENT] UPDATE_SCHEDULE: Updated schedule for plant {plant_id} with {len(engine_entries)} entries")
                except Exception as e:
                    print(f"[WS-CLIENT] ERROR - UPDATE_SCHEDULE update failed for plant {plant_id}: {e}")
            else:
                try:
                    from controller.irrigation.irrigation_schedule import IrrigationSchedule
                    plant.schedule = IrrigationSchedule(plant, engine_entries, self.engine.irrigation_algorithm)
                    print(f"[WS-CLIENT] UPDATE_SCHEDULE: Attached new schedule for plant {plant_id} with {len(engine_entries)} entries")
                except Exception as e:
                    print(f"[WS-CLIENT] ERROR - UPDATE_SCHEDULE attach failed for plant {plant_id}: {e}")

        except Exception as e:
            print(f"[WS-CLIENT] ERROR - UPDATE_SCHEDULE handler: {e}")
    
    async def handle_valve_status_request(self, data):
        """Handle valve status request from server."""
        try:
            plant_id = data.get("plant_id")
            if not plant_id:
                print("[WS-CLIENT] ERROR - VALVE_STATUS missing plant_id")
                return
            
            print(f"[WS-CLIENT] CMD VALVE_STATUS plant={plant_id}")
            
            # Get plant from engine
            if plant_id not in self.engine.plants:
                print(f"[WS-CLIENT] ERROR - Plant {plant_id} not found in engine")
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
            print(f"[WS-CLIENT] VALVE_STATUS_RESPONSE sent plant={plant_id} msg={user_message}")
            
        except Exception as e:
            print(f"[WS-CLIENT] ERROR - VALVE_STATUS request: {e}")
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
                print("[WS-CLIENT] ERROR - RESTART_VALVE missing plant_id")
                await self.send_message("RESTART_VALVE_RESPONSE", {"status": "error", "error_message": "Missing plant_id"})
                return

            print(f"[WS-CLIENT] CMD RESTART_VALVE plant={plant_id}")

            success = await self.engine.restart_valve(int(plant_id))
            if success:
                await self.send_message("RESTART_VALVE_RESPONSE", {"status": "success", "plant_id": int(plant_id)})
                print(f"[WS-CLIENT] RESTART_VALVE_RESPONSE ok plant={plant_id}")
            else:
                await self.send_message("RESTART_VALVE_RESPONSE", {"status": "error", "plant_id": int(plant_id), "error_message": "restart_failed"})
                print(f"[WS-CLIENT] ERROR - RESTART_VALVE_RESPONSE plant={plant_id}")
        except Exception as e:
            print(f"[WS-CLIENT] ERROR - RESTART_VALVE: {e}")
            await self.send_message("RESTART_VALVE_RESPONSE", {"status": "error", "plant_id": int(plant_id) if 'plant_id' in locals() else 0, "error_message": str(e)})
    
    async def handle_garden_sync(self, message: Dict[Any, Any]):
        """Handle GARDEN_SYNC message from server with garden and plants data."""
        try:
            print("[WS-CLIENT] === HANDLING GARDEN_SYNC ===")
            print(f"[WS-CLIENT] Received garden sync message: {message}")
            
            # Make sync idempotent: clear engine state before re-applying
            try:
                await self.engine.clear_all_plants()
                print("[WS-CLIENT] [GARDEN_SYNC] Cleared engine state before applying sync")
            except Exception as e:
                print(f"[WS-CLIENT] [GARDEN_SYNC] WARN - Failed to fully clear engine state: {e}")

            # Extract garden and plants data from the message
            garden_data = message.get("garden", {})
            plants_data = message.get("plants", [])
            
            print(f"[WS-CLIENT] Garden: {garden_data.get('name', 'Unknown')} (Code: {garden_data.get('invite_code', 'Unknown')})")
            print(f"[WS-CLIENT] Plants to sync: {len(plants_data)}")
            
            # Store the sync data
            self.garden_sync_data = message

            # Defensive: ensure all valves are closed before applying sync
            try:
                for plant in list(self.engine.plants.values()):
                    try:
                        if getattr(plant, 'valve', None):
                            plant.valve.request_close()
                    except Exception:
                        pass
            except Exception:
                pass

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
                    
                    # Lat/Lon from server if provided
                    plant_lat = float(plant_data.get("lat", 32.7940))
                    plant_lon = float(plant_data.get("lon", 34.9896))

                    print(f"[WS-CLIENT] ADD PLANT -> id={plant_id} target={desired_moisture}% limit={water_limit}L drip={dripper_type} schedule={schedule_data} loc={plant_lat},{plant_lon}")
                    
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
                        plant_lat=plant_lat,
                        plant_lon=plant_lon,
                        water_limit=water_limit,
                        dripper_type=dripper_type,
                        sensor_port=sensor_port,
                        valve_id=valve_id
                    )
                    
                    print(f"[WS-CLIENT] Added plant {plant_id} to engine")
                    
                except Exception as e:
                    print(f"[WS-CLIENT] ERROR - Failed to add plant {plant_data.get('plant_id', 'Unknown')}: {e}")
            
            print(f"[WS-CLIENT] === GARDEN SYNC COMPLETE ===")
            print(f"[WS-CLIENT] Total plants in engine: {len(self.engine.plants)}")
            for plant_id, plant in self.engine.plants.items():
                print(f"[WS-CLIENT]   - Plant {plant_id}: {plant.desired_moisture}% target moisture")
            
        except Exception as e:
            print(f"[WS-CLIENT] ERROR - Garden sync: {e}")
    
    async def handle_message(self, message: str):
        """Process incoming messages from the server."""
        try:
            data = json.loads(message)
            message_type = data.get("type")
            message_data = data.get("data", {})
            
            print(f"[WS-CLIENT] RX type={message_type}")
            
            # Debug: Check if message_type matches expected values
            expected_types = [
                "WELCOME", "ADD_PLANT", "GET_PLANT_MOISTURE", "GET_ALL_MOISTURE",
                "IRRIGATE_PLANT", "STOP_IRRIGATION", "OPEN_VALVE", "CLOSE_VALVE",
                "GET_VALVE_STATUS", "VALVE_STATUS",
                "CHECK_SENSOR_CONNECTION", "CHECK_VALVE_MECHANISM", "CHECK_POWER_SUPPLY",
                "UPDATE_PLANT", "UPDATE_SCHEDULE", "UPDATE_PLANT_LOCATION", "UPDATE_PLANT_RESPONSE",
                "GARDEN_SYNC", "REMOVE_PLANT", "RESTART_VALVE"
            ]
            if message_type not in expected_types:
                print(f"[WS-CLIENT] WARN - UNKNOWN MESSAGE TYPE: '{message_type}' not in {expected_types}")
                # Additional debugging for unknown message types
                print(f"[WS-CLIENT] WARN - bytes={repr(message_type)} hex={message_type.encode('utf-8').hex() if message_type else 'None'}")
                # Check for common issues
                if message_type and message_type.strip() != message_type:
                    print(f"[WS-CLIENT] WARN - type has leading/trailing whitespace")
                if message_type and message_type.lower() == "update_plant":
                    print(f"[WS-CLIENT] WARN - type is lowercase; expected uppercase")
            
            if message_type == "WELCOME":
                print("[WS-CLIENT] WELCOME from server")
            
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
            
            elif message_type == "CHECK_SENSOR_CONNECTION":
                await self.handle_check_sensor_connection(message_data)
            
            elif message_type == "CHECK_VALVE_MECHANISM":
                await self.handle_check_valve_mechanism(message_data)

            elif message_type == "CHECK_POWER_SUPPLY":
                await self.handle_check_power_supply(message_data)
            
            elif message_type == "UPDATE_PLANT":
                await self.handle_update_plant_command(data)

            elif message_type == "UPDATE_SCHEDULE":
                await self.handle_update_schedule_command(message_data)

            elif message_type == "UPDATE_PLANT_LOCATION":
                try:
                    plant_id = int((message_data or {}).get("plant_id"))
                    lat = float((message_data or {}).get("lat"))
                    lon = float((message_data or {}).get("lon"))
                    if plant_id in self.engine.plants:
                        plant = self.engine.plants[plant_id]
                        plant.lat = lat
                        plant.lon = lon
                        print(f"[WS-CLIENT] UPDATE_PLANT_LOCATION plant={plant_id} loc={lat},{lon}")
                except Exception as e:
                    print(f"[WS-CLIENT] ERROR - UPDATE_PLANT_LOCATION: {e}")
            
            elif message_type == "UPDATE_PLANT_RESPONSE":
                print(f"[WS-CLIENT] WARN - Unexpected UPDATE_PLANT_RESPONSE echo data={data}")
                # Ignore this message as it's likely an echo
            
            elif message_type == "GARDEN_SYNC":
                await self.handle_garden_sync(data)
            
            elif message_type == "REMOVE_PLANT":
                await self.handle_remove_plant(message_data)
            
            else:
                print(f"[WS-CLIENT] WARN - Unknown message type: {message_type}")
                
        except json.JSONDecodeError:
            print(f"[WS-CLIENT] ERROR - Failed to parse message: {message}")
        except Exception as e:
            print(f"[WS-CLIENT] ERROR - handle_message: {e}")
    
    async def listen_for_messages(self):
        """Listen for incoming messages from the server."""
        try:
            async for message in self.websocket:
                await self.handle_message(message)
        except websockets.exceptions.ConnectionClosed:
            print("[WS-CLIENT] WARN - Connection closed by server")
            self.is_running = False
        except Exception as e:
            print(f"[WS-CLIENT] ERROR - listen_for_messages: {e}")
            self.is_running = False
    
    async def run(self):
        """Main client loop."""
        print("[WS-CLIENT] Smart Garden Pi Client Starting...")
        
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
                print(f"[WS-CLIENT] Sending PI_CONNECT with family code: {self.family_code}")
                await self.send_pi_connect()
            else:
                print("[WS-CLIENT] WARN - No family code configured - Pi will not sync with any garden")
            
            # Wait a moment for garden sync response
            await asyncio.sleep(1)
            
            print("[WS-CLIENT] Client is ready and listening for commands...")
            print("[WS-CLIENT] Supported commands:")
            print("[WS-CLIENT]   - WELCOME: Server welcome message")
            print("[WS-CLIENT]   - ADD_PLANT: Add a new plant to the system")
            print("[WS-CLIENT]   - GET_PLANT_MOISTURE: Get moisture for a specific plant")
            print("[WS-CLIENT]   - GET_ALL_MOISTURE: Get moisture for all plants")
            print("[WS-CLIENT]   - IRRIGATE_PLANT: Smart irrigation for a specific plant")
            print("[WS-CLIENT]   - STOP_IRRIGATION: Stop smart irrigation for a specific plant")
            print("[WS-CLIENT]   - OPEN_VALVE: Open valve for a specific plant for a given duration")
            print("[WS-CLIENT]   - CLOSE_VALVE: Close valve for a specific plant")
            print("[WS-CLIENT]   - GET_VALVE_STATUS: Get detailed valve status for a specific plant")
            print("[WS-CLIENT]   - UPDATE_PLANT: Update an existing plant's configuration")
            print("[WS-CLIENT]   - GARDEN_SYNC: Sync garden and plants data from server")
            
            # Start listening for messages
            await self.listen_for_messages()
            
        except KeyboardInterrupt:
            print("[WS-CLIENT] Received shutdown signal")
        except Exception as e:
            print(f"[WS-CLIENT] ERROR - Client error: {e}")
        finally:
            await self.disconnect()
        
        return True

# For backward compatibility
WebSocketClient = SmartGardenPiClient