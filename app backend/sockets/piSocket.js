const { sendSuccess, sendError } = require('../utils/wsResponses');
const { handleSensorAssigned, handleValveAssigned } = require('../controllers/plantAssignmentController');
const { completePendingPlant } = require('../services/pendingPlantsTracker');
const { completePendingIrrigation } = require('../services/pendingIrrigationTracker');
const { completePendingMoistureRequest } = require('../services/pendingMoistureTracker');
const { broadcastToGarden } = require('../services/gardenBroadcaster');
const { getPendingDeletion } = require('../services/pendingDeletionTracker');
const { deletePlantById, getUserGardenId } = require('../models/plantModel');
const { getUser } = require('../models/userModel');
const { setControllerForGarden, updateHeartbeat, removeBySocket } = require('../services/controllerRegistry');


let piSocket = null;
const VERBOSE_LOGS = process.env.VERBOSE_LOGS === 'true';
const vLog = (...args) => console.log(...args);

function handlePiSocket(ws) {
  piSocket = ws;
  console.log('[PI] Connected: raspberrypi_main_controller');
  sendSuccess(ws, 'WELCOME', { message: 'Hello Pi' });

  ws.on('message', async (msg) => {
    let data;
    try {
      data = JSON.parse(msg);
      console.log(`[PI] Message received: ${data.type}`);
    } catch {
      console.log(`[PI] Error: Invalid JSON message - ${msg}`);
      return sendError(ws, 'INVALID_JSON', 'Invalid JSON format');
    }

    if (data.type === 'SENSOR_ASSIGNED') {
      console.log(`[HARDWARE] Sensor assigned: port=${data.data?.sensor_port} plant=${data.data?.plant_id}`);
      return handleSensorAssigned(data, ws);
    }

    if (data.type === 'VALVE_ASSIGNED') {
      console.log(`[HARDWARE] Valve assigned: valve=${data.data?.valve_id} plant=${data.data?.plant_id}`);
      return handleValveAssigned(data, ws);
    }

    if (data.type === 'PI_CONNECT') {
      const connectData = data.data || {};
      const familyCode = connectData.family_code;

      if (!familyCode) {
        console.log('[PI] Connection failed: missing family code');
        return sendError(ws, 'PI_CONNECT_FAIL', 'Family code is required');
      }

      console.log(`[PI] Connecting with family code: ${familyCode}`);

      try {
        // Get garden by invite code
        const { getGardenByInviteCode, getGardenPlantsWithHardware } = require('../services/piSyncService');
        const garden = await getGardenByInviteCode(familyCode);

        if (!garden) {
          console.log(`[PI] Connection failed: garden not found for code ${familyCode}`);
          return sendError(ws, 'PI_CONNECT_FAIL', 'Garden not found for this family code');
        }

        // Register this controller under the garden
        setControllerForGarden(garden.id, ws, familyCode);

        // Get all plants for this garden
        const plants = await getGardenPlantsWithHardware(garden.id);

        // Send garden sync data to Pi
        console.log(`[PI] Connected to garden: ${garden.name}`);
        console.log(`[PI] Syncing ${plants.length} plants`);

        sendSuccess(ws, 'GARDEN_SYNC', {
          garden: { name: garden.name, invite_code: garden.invite_code },
          plants: plants
        });

        // Log plant details for debugging (match payload fields)
        plants.forEach(plant => {
          console.log(`[PI] Plant ${plant.plant_id}: moisture=${plant.desiredMoisture}% sensor=${plant.sensor_port} valve=${plant.valve_id} schedule=${JSON.stringify(plant.scheduleData)}`);
        });

      } catch (error) {
        console.log(`[PI] Error: Connection failed - ${error.message}`);
        return sendError(ws, 'PI_CONNECT_FAIL', 'Failed to sync garden data');
      }
    }
    // Heartbeat from controller
    if (data.type === 'PING') {
      const gid = ws._gardenId;
      if (gid != null) updateHeartbeat(gid, ws);
      return sendSuccess(ws, 'PONG', { ts: Date.now() });
    }

    // Handle ADD_PLANT_RESPONSE from Pi
    if (data.type === 'ADD_PLANT_RESPONSE') {
      const responseData = data.data || {};
      const plantId = responseData.plant_id; // This is the real database plant_id

      // Get pending plant info (websocket + plant data)
      const pendingInfo = completePendingPlant(plantId);

      if (responseData.status === 'success') {
        console.log(`Plant ${plantId}: assigned sensor_port=${responseData.sensor_port}, valve=${responseData.assigned_valve}`);

        // Update plant in database with hardware IDs
        const { updatePlantHardware } = require('../models/plantModel');

        try {
          await updatePlantHardware(plantId, responseData.sensor_port, responseData.assigned_valve);
          console.log(`Plant ${plantId} database updated with hardware assignments`);

          // Notify client of successful plant creation with hardware assignment
          if (pendingInfo) {
            const { ws, email, plantData } = pendingInfo;
            sendSuccess(ws, 'ADD_PLANT_SUCCESS', {
              plant: {
                ...plantData,
                sensor_port: responseData.sensor_port,
                valve_id: responseData.assigned_valve
              },
              message: `Plant "${plantData.name}" created successfully with hardware assignment`
            });

            // Broadcast plant addition to other garden members
            try {
              // pendingInfo does not include userId; resolve via email
              const { getUser } = require('../models/userModel');
              const user = await getUser(email);
              const gardenId = user ? await require('../models/plantModel').getUserGardenId(user.id) : null;
              if (gardenId) {
                await broadcastToGarden(gardenId, 'PLANT_ADDED_TO_GARDEN', {
                  plant: {
                    ...plantData,
                    sensor_port: responseData.sensor_port,
                    valve_id: responseData.assigned_valve
                  },
                  message: `New plant "${plantData.name}" was added to your garden`
                }, email);
                console.log(`[BROADCAST] Plant addition sent: plant="${plantData.name}" garden=${gardenId}`);
              }
            } catch (broadcastError) {
              console.log(`[BROADCAST] Error: Failed to send plant addition - ${broadcastError.message}`);
            }
          }
        } catch (dbError) {
          console.error(`Failed to update plant ${plantId} in database:`, dbError);
          // Notify client of database error
          if (pendingInfo) {
            sendError(pendingInfo.ws, 'ADD_PLANT_FAIL', 'Failed to save hardware assignment to database');
          }
        }
      } else {
        console.log(`Plant ${plantId}: hardware assignment failed - ${responseData.error_message}`);
        // Notify client of hardware assignment failure
        if (pendingInfo) {
          sendError(pendingInfo.ws, 'ADD_PLANT_FAIL', `Hardware assignment failed: ${responseData.error_message}`);
        }
      }
    }

    // Handle UPDATE_PLANT_RESPONSE from Pi
    if (data.type === 'UPDATE_PLANT_RESPONSE') {
      const responseData = data.data || {};
      const rawPlantId = responseData.plant_id;
      const plantId = Number(rawPlantId);

      // Get pending update info
      const { getPendingUpdate } = require('../services/pendingUpdateTracker');
      const pendingInfo = getPendingUpdate(plantId);

      if (responseData.success) {
        console.log(`Plant ${plantId} updated successfully on Pi: ${responseData.message}`);

        // Send success response to frontend and broadcast to garden
        if (pendingInfo) {
          const { sendSuccess } = require('../utils/wsResponses');
          // Get the updated plant data from the database
          const { getPlantById } = require('../models/plantModel');
          try {
            const updatedPlant = await getPlantById(plantId);
            sendSuccess(pendingInfo.ws, 'UPDATE_PLANT_DETAILS_SUCCESS', {
              plant: updatedPlant,
              message: `Plant updated successfully on hardware: ${responseData.message}`
            });
          } catch (error) {
            console.error('Error getting updated plant data:', error);
            sendSuccess(pendingInfo.ws, 'UPDATE_PLANT_DETAILS_SUCCESS', {
              message: `Plant updated successfully on hardware: ${responseData.message}`
            });
          }
        }
      } else {
        console.warn(`Failed to update plant ${plantId} on Pi: ${responseData.message}`);

        // Send error response to frontend
        if (pendingInfo) {
          const { sendError } = require('../utils/wsResponses');
          // Get the updated plant data from the database even on error (in case the update was partially successful)
          const { getPlantById } = require('../models/plantModel');
          try {
            const updatedPlant = await getPlantById(plantId);
            sendError(pendingInfo.ws, 'UPDATE_PLANT_DETAILS_FAIL', {
              plant: updatedPlant,
              message: `Hardware update failed: ${responseData.message}`
            });
          } catch (error) {
            console.error('Error getting updated plant data:', error);
            sendError(pendingInfo.ws, 'UPDATE_PLANT_DETAILS_FAIL', `Hardware update failed: ${responseData.message}`);
          }
        }
      }
    }

    // Handle PI_LOG messages from Pi
    if (data.type === 'PI_LOG') {
      console.log('DEBUG - Received PI_LOG message:');
      console.log('   - Full data:', JSON.stringify(data));
      console.log('   - data.data:', data.data);
      console.log('   - data.data.message:', data.data?.message);

      const logData = data.data || {};
      const timestamp = logData.timestamp || new Date().toISOString();
      const message = logData.message || 'No message';


      console.log(`[PI LOG - ${timestamp}] ${message}`);
      // You could also broadcast this to connected clients if needed
      // For now, just log to server console
      return;
    }

    // Handle IRRIGATION_DECISION messages from Pi
    if (data.type === 'IRRIGATION_DECISION') {
      const decisionData = data.data || {};
      const plantId = Number(decisionData.plant_id);
      const sessionId = decisionData.session_id;
      console.log(`[IRRIGATION DECISION] Plant ${plantId}`);
      console.log(`Current Moisture: ${decisionData.current_moisture}%`);
      console.log(`Target Moisture: ${decisionData.target_moisture}%`);
      console.log(`Moisture Gap: ${decisionData.moisture_gap}%`);
      console.log(`Will Irrigate: ${decisionData.will_irrigate}`);
      console.log(`Reason: ${decisionData.reason}`);

      // Get pending irrigation info to send notification
      const { getPendingIrrigation, getPendingBySession } = require('../services/pendingIrrigationTracker');
      const pendingInfo = getPendingBySession(sessionId) || getPendingIrrigation(plantId);
      if (pendingInfo) {
        // If irrigation will start, notify the client
        if (decisionData.will_irrigate) {
          if (pendingInfo?.ws) {
            sendSuccess(pendingInfo.ws, 'IRRIGATION_STARTED', {
              message: `Starting irrigation for plant "${pendingInfo.plantData.plant_name}"`,
              plantName: pendingInfo.plantData.plant_name,
              plantId: plantId,
              sessionId,
              currentMoisture: decisionData.current_moisture,
              targetMoisture: decisionData.target_moisture
            });
          }
          // Persist irrigation state: smart started
          try {
            const { updateIrrigationState } = require('../models/plantModel');
            await updateIrrigationState(Number(plantId), { mode: 'smart', startAt: new Date(), endAt: null, sessionId });
          } catch (e) {
            console.warn('Failed to persist smart irrigation start:', e.message);
          }
          // Broadcast to other garden members that irrigation started (smart)
          try {
            const { getPlantById } = require('../models/plantModel');
            const plant = await getPlantById(Number(plantId));
            if (plant?.garden_id) {

              await broadcastToGarden(plant.garden_id, 'GARDEN_IRRIGATION_STARTED', {
                plantId: Number(plantId),
                plantName: plant.name || pendingInfo.plantData.plant_name,
                mode: 'smart'
              }, pendingInfo.email);
            }
          } catch (e) {
            console.warn('Broadcast GARDEN_IRRIGATION_STARTED failed:', e.message);
          }
        } else {
          // If irrigation will be skipped, notify the client
          if (pendingInfo.ws) {
            sendSuccess(pendingInfo.ws, 'IRRIGATION_SKIPPED', {
              message: `Irrigation skipped for plant "${pendingInfo.plantData.plant_name}": ${decisionData.reason}`,
              plantName: pendingInfo.plantData.plant_name,
              plantId: plantId,
              reason: decisionData.reason
            });
          }
          // Persist irrigation state: ensure mode is cleared on decision skip
          try {
            const { updateIrrigationState } = require('../models/plantModel');
            await updateIrrigationState(Number(plantId), { mode: 'none', startAt: null, endAt: null, sessionId: null });
          } catch (e) {
            console.warn('Failed to clear irrigation state on decision skip:', e.message);
          }
        }

        // Send email notification if available
        if (pendingInfo.email) {
          const { notifyUserOfIrrigationStart } = require('../services/userNotifier');
          notifyUserOfIrrigationStart({
            plantName: pendingInfo.plantData.plant_name,
            email: pendingInfo.email,
            initialMoisture: decisionData.current_moisture,
            targetMoisture: decisionData.target_moisture
          });
          console.log(`Sent irrigation start notification to user ${pendingInfo.email} for plant ${pendingInfo.plantData.plant_name}`);
        }
      }

      return;
    }

    // Handle IRRIGATION_STARTED (scheduled runs) from Pi
    if (data.type === 'IRRIGATION_STARTED') {
      try {
        const payload = data.data || data;
        const plantId = Number(payload.plant_id ?? payload.plantId);
        const sessionId = payload.session_id || payload.sessionId || null;
        const mode = payload.mode || 'scheduled';

        if (Number.isFinite(plantId)) {
          const { getPlantById } = require('../models/plantModel');
          const plant = await getPlantById(plantId);
          if (plant?.garden_id) {
            await broadcastToGarden(plant.garden_id, 'GARDEN_IRRIGATION_STARTED', {
              plantId: plantId,
              plantName: plant.name,
              mode: mode,
              sessionId: sessionId
            }, null);
          }
        }
      } catch (e) {
        console.warn('Failed to handle IRRIGATION_STARTED from Pi:', e.message);
      }
      return;
    }

    // Handle IRRIGATION_PROGRESS messages from Pi
    if (data.type === 'IRRIGATION_PROGRESS') {
      const progressData = data.data || {};
      const plantId = progressData.plant_id;
      const sessionId = progressData.session_id;
      const stage = progressData.stage;
      const timestamp = progressData.timestamp || new Date().toISOString();


      console.log(`[IRRIGATION PROGRESS - ${timestamp}] Plant ${plantId} - ${stage.toUpperCase()}`);
      console.log(`   Current Moisture: ${progressData.current_moisture}%`);
      console.log(`   Target Moisture: ${progressData.target_moisture}%`);
      console.log(`   Moisture Gap: ${progressData.moisture_gap}%`);
      console.log(`   Total Water Used: ${progressData.total_water_used}L`);
      console.log(`   Pulse Number: ${progressData.pulse_number || 'N/A'}`);
      console.log(`   Water Limit: ${progressData.water_limit || 'N/A'}L`);
      console.log(`   Status: ${progressData.status}`);
      console.log(`   Message: ${progressData.message}`);


      // Display details object if it exists
      if (progressData.details) {
        console.log(`   Details:`);
        Object.entries(progressData.details).forEach(([key, value]) => {
          console.log(`      ${key}: ${value}`);
        });
      }

      // Check if this is the first pulse (irrigation actually starting)
      if (stage === 'pulse' && progressData.pulse_number === 1) {

        console.log(`First pulse detected - irrigation actually started for plant ${plantId}`);

        // Get pending irrigation info to send notification
        const { getPendingIrrigation } = require('../services/pendingIrrigationTracker');
        const pendingInfo = getPendingIrrigation(plantId);

        if (pendingInfo && pendingInfo.email) {
          const { notifyUserOfIrrigationStart } = require('../services/userNotifier');
          notifyUserOfIrrigationStart({
            plantName: pendingInfo.plantData.plant_name,
            email: pendingInfo.email,
            initialMoisture: progressData.current_moisture || 0,
            targetMoisture: progressData.target_moisture || pendingInfo.plantData.ideal_moisture
          });
          console.log(`Sent irrigation start notification to user ${pendingInfo.email} for plant ${pendingInfo.plantData.plant_name}`);
        } else {
          console.log(`No pending irrigation found for plant ${plantId} - cannot send start notification`);
        }
      }

      // Forward live progress to the requesting client so the app can update the UI in real-time
      try {
        const { getPendingIrrigation, getPendingBySession } = require('../services/pendingIrrigationTracker');
        const pendingInfo = getPendingBySession(sessionId) || getPendingIrrigation(plantId);
        if (pendingInfo && pendingInfo.ws) {
          sendSuccess(pendingInfo.ws, 'IRRIGATION_PROGRESS', progressData);
        }
      } catch (err) {
        console.error('Failed to forward IRRIGATION_PROGRESS to client:', err);
      }

      return;
    }

    // Handle IRRIGATE_PLANT_RESPONSE from Pi
    if (data.type === 'IRRIGATE_PLANT_RESPONSE') {
      const responseData = data.data || {};
      const rawPlantId = responseData.plant_id;
      const plantId = Number(rawPlantId);

      // Get pending irrigation info (websocket + plant data)
      const pendingInfo = completePendingIrrigation(plantId);

      if (responseData.status === 'success') {
        console.log(`Plant ${plantId} irrigation completed successfully`);
        console.log(`   - Water added: ${responseData.water_added_liters}L`);
        console.log(`   - Final moisture: ${responseData.final_moisture}%`);

        // Save irrigation result to database
        const irrigationModel = require('../models/irrigationModel');

        try {
          const irrigationResult = await irrigationModel.addIrrigationResult({
            plant_id: plantId,
            status: responseData.status,
            reason: responseData.reason || 'Pi irrigation completed',
            moisture: responseData.moisture,
            final_moisture: responseData.final_moisture,
            water_added_liters: responseData.water_added_liters,
            irrigation_time: responseData.irrigation_time ? new Date(responseData.irrigation_time) : new Date(),
            event_data: responseData.event_data || {}
          });

          console.log(`Irrigation result saved to database for plant ${plantId}`);

          // Notify client of successful irrigation
          if (pendingInfo && pendingInfo.ws) {
            const liters = Number(responseData.water_added_liters || 0).toFixed(2);
            sendSuccess(pendingInfo.ws, 'IRRIGATE_SUCCESS', {
              message: `Plant "${pendingInfo.plantData.plant_name}" irrigated successfully! Added ${liters}L of water.`,
              result: irrigationResult,
              irrigation_data: {
                water_added_liters: Number(liters),
                final_moisture: responseData.final_moisture,
                initial_moisture: responseData.moisture
              },
              reason: responseData.reason || null
            });
            console.log(`Notified client: Plant ${pendingInfo.plantData.plant_name} irrigation successful!`);
          } else {
            console.log(`No pending client found for plant ${plantId} irrigation - result saved but client not notified`);
          }

          // Send user notification about irrigation completion
          if (pendingInfo && pendingInfo.email) {
            const { notifyUserOfIrrigationComplete } = require('../services/userNotifier');
            notifyUserOfIrrigationComplete({
              plantName: pendingInfo.plantData.plant_name,
              email: pendingInfo.email,
              irrigationData: {
                water_added_liters: responseData.water_added_liters,
                final_moisture: responseData.final_moisture,
                initial_moisture: responseData.moisture
              }
            });
            console.log(`[NOTIFY] Sent irrigation completion notification to user ${pendingInfo.email}`);
          }

        } catch (err) {
          console.error(`Failed to save irrigation result for plant ${plantId}:`, err);

          if (pendingInfo && pendingInfo.ws) {
            sendError(pendingInfo.ws, 'IRRIGATE_FAIL',
              `Irrigation completed but failed to save result: ${err.message}`);
          }
        }

        // Persist irrigation state: clear smart mode on success
        try {
          const { updateIrrigationState } = require('../models/plantModel');
          await updateIrrigationState(Number(plantId), { mode: 'none', startAt: null, endAt: null, sessionId: null });
        } catch (e) {
          console.warn('Failed to clear smart irrigation state on success:', e.message);
        }

      } else if (responseData.status === 'cancelled') {
        console.log(` Plant ${plantId} irrigation cancelled by user`);

        // Save cancelled result to database
        const irrigationModel = require('../models/irrigationModel');

        try {
          const irrigationResult = await irrigationModel.addIrrigationResult({
            plant_id: plantId,
            status: 'cancelled',
            reason: responseData.reason || 'Smart irrigation cancelled by user',
            moisture: responseData.moisture || null,
            final_moisture: responseData.final_moisture || responseData.moisture || null,
            water_added_liters: responseData.water_added_liters || 0,
            irrigation_time: new Date(),
            event_data: responseData.event_data || {}
          });

          if (pendingInfo && pendingInfo.ws) {
            sendSuccess(pendingInfo.ws, 'IRRIGATION_CANCELLED', {
              message: `Smart irrigation for "${pendingInfo.plantData.plant_name}" was cancelled by user.`,
              result: irrigationResult,
              plantName: pendingInfo.plantData.plant_name,
              plantId: plantId
            });
            console.log(` Notified client: Plant ${pendingInfo.plantData.plant_name} irrigation cancelled`);
          }
        } catch (err) {
          console.error(` Failed to save cancelled irrigation result for plant ${plantId}:`, err);
        }

        // Persist irrigation state: clear smart mode
        try {
          const { updateIrrigationState } = require('../models/plantModel');
          await updateIrrigationState(Number(plantId), { mode: 'none', startAt: null, endAt: null, sessionId: null });
        } catch (e) {
          console.warn('Failed to clear smart irrigation state on cancel:', e.message);
        }

      } else if (responseData.status === 'skipped') {
        console.log(`Plant ${plantId} irrigation skipped: ${responseData.reason}`);

        // Save skipped result to database
        const irrigationModel = require('../models/irrigationModel');

        try {
          const irrigationResult = await irrigationModel.addIrrigationResult({
            plant_id: plantId,
            status: 'skipped',
            reason: responseData.reason || 'Pi skipped irrigation',
            moisture: responseData.moisture,
            final_moisture: responseData.moisture, // Same as initial for skipped
            water_added_liters: 0,
            irrigation_time: new Date(),
            event_data: responseData.event_data || {}
          });

          // Notify client that irrigation was skipped
          if (pendingInfo && pendingInfo.ws) {
            // First send IRRIGATION_DECISION to clear the checking screen
            sendSuccess(pendingInfo.ws, 'IRRIGATION_DECISION', {
              plant_id: plantId,
              current_moisture: responseData.moisture,
              target_moisture: pendingInfo.plantData.ideal_moisture,
              moisture_gap: pendingInfo.plantData.ideal_moisture - responseData.moisture,
              will_irrigate: false,
              reason: responseData.reason
            });

            // Then send IRRIGATE_SKIPPED for the final status
            setTimeout(() => {
              sendSuccess(pendingInfo.ws, 'IRRIGATE_SKIPPED', {
                message: `Plant "${pendingInfo.plantData.plant_name}" irrigation skipped: ${responseData.reason}`,
                result: irrigationResult,
                reason: responseData.reason,
                plantName: pendingInfo.plantData.plant_name,
                plantId: plantId
              });
            }, 500);

            console.log(`[NOTIFY] Notified client: Plant ${pendingInfo.plantData.plant_name} irrigation skipped`);
          }

          // Send user notification about irrigation being skipped
          if (pendingInfo && pendingInfo.email) {
            const { notifyUserOfIrrigationSkipped } = require('../services/userNotifier');
            notifyUserOfIrrigationSkipped({
              plantName: pendingInfo.plantData.plant_name,
              email: pendingInfo.email,
              reason: responseData.reason
            });
            console.log(`[NOTIFY] Sent irrigation skipped notification to user ${pendingInfo.email}`);
          }

        } catch (err) {
          console.error(`[ERROR] Failed to save skipped irrigation result for plant ${plantId}:`, err);
        }

        // Persist irrigation state: clear smart mode on final skip
        try {
          const { updateIrrigationState } = require('../models/plantModel');
          await updateIrrigationState(Number(plantId), { mode: 'none', startAt: null, endAt: null, sessionId: null });
          console.log(`[STATE] Cleared irrigation_state for plant ${plantId} on final skip (mode=none)`);
        } catch (e) {
          console.warn('Failed to clear irrigation state on skip:', e.message);
        }

      } else {
        // Irrigation failed
        console.error(`[ERROR] Plant ${plantId} irrigation failed: ${responseData.error_message}`);

        // Check if it's a valve blocking error - more specific detection
        const isValveBlocked = responseData.error_message &&
          (responseData.error_message.toLowerCase().includes('valve is blocked') ||
            responseData.error_message.toLowerCase().includes('blocked') ||
            responseData.error_message.toLowerCase().includes('overwatered') ||
            responseData.error_message.toLowerCase().includes('water limit reached'));

        // Save error result to database
        const irrigationModel = require('../models/irrigationModel');

        try {
          const irrigationResult = await irrigationModel.addIrrigationResult({
            plant_id: plantId,
            status: 'error',
            reason: responseData.error_message || 'Pi irrigation failed',
            moisture: responseData.moisture || null,
            final_moisture: responseData.moisture || null,
            water_added_liters: 0,
            irrigation_time: new Date(),
            event_data: responseData
          });

          // Notify client of irrigation failure with appropriate message
          if (pendingInfo && pendingInfo.ws) {
            if (responseData.error_message === 'water_limit_reached_target_not_met') {
              // Specific problem message and block state already handled in DB updates below
              const userMessage = `Water limit reached but desired moisture was not achieved. The valve has been blocked to prevent overwatering. Please check sensor placement/readings or possible leaks.`;
              // Send fail popup for context
              sendError(pendingInfo.ws, 'IRRIGATE_FAIL', userMessage);
              // Also send explicit valve-blocked event to the initiating client so UI updates immediately
              try {
                sendError(pendingInfo.ws, 'VALVE_BLOCKED', { plantId: Number(plantId), message: userMessage });
              } catch (e) {
                console.warn('Failed to send VALVE_BLOCKED to initiator:', e?.message);
              }
            } else if (isValveBlocked) {
              // For valve blocking, send a more specific message
              let userMessage = responseData.error_message;
              if (responseData.error_message.includes('Water limit reached')) {
                userMessage = `Irrigation completed but the water limit was reached before achieving the desired moisture level. The plant received ${responseData.water_added_liters || 0}L of water but the soil moisture only increased from ${responseData.moisture}% to ${responseData.final_moisture}%. The valve has been blocked to prevent overwatering.`;
              } else if (responseData.error_message.includes('overwatered')) {
                userMessage = `Irrigation blocked: The plant is already overwatered with ${responseData.moisture}% moisture. The valve has been blocked to prevent further damage.`;
              } else if (responseData.error_message.includes('valve is blocked')) {
                userMessage = `Irrigation failed: The valve is physically blocked and cannot be opened. Please check the valve manually and unblock it if needed.`;
              }

              sendError(pendingInfo.ws, 'VALVE_BLOCKED', userMessage);
            } else {
              sendError(pendingInfo.ws, 'IRRIGATE_FAIL',
                `Plant "${pendingInfo.plantData.plant_name}" irrigation failed: ${responseData.error_message || 'Unknown error'}`);
            }
          }

          // Send user notification about irrigation error
          if (pendingInfo && pendingInfo.email) {
            const { notifyUserOfIrrigationError } = require('../services/userNotifier');
            notifyUserOfIrrigationError({
              plantName: pendingInfo.plantData.plant_name,
              email: pendingInfo.email,
              errorMessage: responseData.error_message || 'Unknown error'
            });
            console.log(` Sent irrigation error notification to user ${pendingInfo.email}`);
          }

          // Update valve status in database if it's a valve blocking error
          if (isValveBlocked || responseData.error_message === 'water_limit_reached_target_not_met') {
            const { updateValveStatus, getPlantById } = require('../models/plantModel');
            try {
              await updateValveStatus(plantId, true);
              console.log(` Updated plant ${plantId} valve status to BLOCKED in database`);
            } catch (err) {
              console.error(`Failed to update valve status for plant ${plantId}:`, err);
            }

            // Clear any persisted irrigation state so clients rehydrate to a stopped UI
            try {
              const { updateIrrigationState } = require('../models/plantModel');
              await updateIrrigationState(Number(plantId), { mode: 'none', startAt: null, endAt: null, sessionId: null });
            } catch (e) {
              console.warn('Failed to clear irrigation state on error:', e.message);
            }

            // Broadcast stop to garden members so overlays/icons clear in real-time
            try {
              const plant = await getPlantById(Number(plantId));
              if (plant?.garden_id) {
                // Broadcast explicit valve blocked event for immediate UI update across devices
                try {
                  await broadcastToGarden(plant.garden_id, 'GARDEN_VALVE_BLOCKED', { plantId: Number(plantId) }, pendingInfo?.email);
                } catch (e) {
                  console.warn('Broadcast GARDEN_VALVE_BLOCKED failed:', e.message);
                }
                await broadcastToGarden(plant.garden_id, 'GARDEN_IRRIGATION_STOPPED', {
                  plantId: Number(plantId),
                  plantName: plant.name || pendingInfo?.plantData?.plant_name
                }, pendingInfo?.email);
              }
            } catch (e) {
              console.warn('Broadcast GARDEN_IRRIGATION_STOPPED on error failed:', e.message);
            }
          }

        } catch (err) {
          console.error(`Failed to save error irrigation result for plant ${plantId}:`, err);
        }
      }
      return;
    }

    // Handle STOP_IRRIGATION_RESPONSE from Pi
    if (data.type === 'STOP_IRRIGATION_RESPONSE') {
      // Normalize nested payloads: data or data.data may hold the real fields
      const envelope = data.data || data;
      const responseData = envelope?.data || envelope || {};
      const rawPlantId = responseData.plant_id ?? responseData.plantId;
      const plantId = Number(rawPlantId);

      // Get pending irrigation info (websocket + plant data)
      const pendingInfo = completePendingIrrigation(plantId);

      if (responseData.status === 'success') {
        console.log(` Plant ${plantId} irrigation stopped successfully`);
        console.log(`   - Reason: ${responseData.reason}`);

        // Save stop irrigation result to database
        const irrigationModel = require('../models/irrigationModel');

        try {
          const irrigationResult = await irrigationModel.addIrrigationResult({
            plant_id: plantId,
            status: 'stopped',
            reason: responseData.reason || 'Smart irrigation stopped by user',
            moisture: responseData.moisture,
            final_moisture: responseData.final_moisture || responseData.moisture,
            water_added_liters: responseData.water_added_liters || 0,
            irrigation_time: new Date(),
            event_data: responseData.event_data || {}
          });

          console.log(`Stop irrigation result saved to database for plant ${plantId}`);

          // Notify client of successful irrigation stop
          if (pendingInfo?.ws) {
            sendSuccess(pendingInfo.ws, 'STOP_IRRIGATION_SUCCESS', {
              plantId: plantId,
              plantName: pendingInfo?.plantData?.plant_name,
              moisture: responseData.moisture,
              final_moisture: responseData.final_moisture,
              water_added_liters: responseData.water_added_liters,
              message: `Plant "${pendingInfo?.plantData?.plant_name || plantId}" irrigation stopped successfully!`,
              result: irrigationResult
            });
            console.log(` Notified client: Plant ${pendingInfo?.plantData?.plant_name || plantId} irrigation stopped!`);
          } else {
            console.log(`No pending client found for plant ${plantId} stop irrigation - result saved but client not notified`);
          }

        } catch (err) {
          console.error(`Failed to save stop irrigation result for plant ${plantId}:`, err);

          if (pendingInfo && pendingInfo.ws) {
            sendError(pendingInfo.ws, 'STOP_IRRIGATION_FAIL',
              `Irrigation stopped but failed to save result: ${err.message}`);
          }
        }

        // Persist irrigation state: clear smart mode on stop
        try {
          const { updateIrrigationState } = require('../models/plantModel');
          await updateIrrigationState(Number(plantId), { mode: 'none', startAt: null, endAt: null, sessionId: null });
        } catch (e) {
          console.warn('Failed to clear smart irrigation state on stop:', e.message);
        }

        // Broadcast stop to garden members
        try {
          const { getPlantById } = require('../models/plantModel');
          const plant = await getPlantById(Number(plantId));
          if (plant?.garden_id) {

            await broadcastToGarden(plant.garden_id, 'GARDEN_IRRIGATION_STOPPED', {
              plantId: Number(plantId),
              plantName: plant.name || pendingInfo?.plantData?.plant_name
            }, pendingInfo?.email);
          }
        } catch (e) {
          console.warn('Broadcast GARDEN_IRRIGATION_STOPPED failed:', e.message);
        }

      } else {
        // Stop irrigation failed
        console.error(`Plant ${plantId} stop irrigation failed: ${responseData.error_message}`);

        // Notify client of stop irrigation failure
        if (pendingInfo && pendingInfo.ws) {
          sendError(pendingInfo.ws, 'STOP_IRRIGATION_FAIL',
            `Failed to stop irrigation: ${responseData.error_message || 'Unknown error'}`);
        }
      }
      return;
    }

    // Handle OPEN_VALVE_RESPONSE from Pi
    if (data.type === 'OPEN_VALVE_RESPONSE') {
      vLog('DEBUG - Received OPEN_VALVE_RESPONSE from Pi:');
      vLog('   - Full data:', JSON.stringify(data));

      const responseData = data.data || {};
      const plantId = responseData.plant_id;
      const timeMinutes = responseData.time_minutes;

      vLog('DEBUG - Extracted response data:');
      vLog('   - plantId:', plantId, '(type:', typeof plantId, ')');
      vLog('   - timeMinutes:', timeMinutes, '(type:', typeof timeMinutes, ')');
      vLog('   - status:', responseData.status);

      // Get pending irrigation info (websocket + plant data)
      vLog('DEBUG - Getting pending irrigation info for plantId:', plantId);
      let pendingInfo = completePendingIrrigation(plantId);
      vLog('DEBUG - Pending info result:', pendingInfo ? 'Found' : 'Not found');

      if (responseData.status === 'success') {
        vLog(`DEBUG - Plant ${plantId} valve opened successfully for ${timeMinutes} minutes`);
        vLog(`   - Duration: ${timeMinutes} minutes`);
        vLog(`   - Reason: ${responseData.reason}`);
        // Persist irrigation state: manual mode started
        try {
          const { updateIrrigationState } = require('../models/plantModel');
          const now = new Date();
          const minutes = Number(responseData.time_minutes || responseData.timeMinutes || 0);
          const endAt = minutes > 0 ? new Date(now.getTime() + (minutes * 60 * 1000)) : null;
          await updateIrrigationState(Number(plantId), { mode: 'manual', startAt: now, endAt, sessionId: null });
        } catch (e) {
          console.warn('Failed to persist manual irrigation state:', e.message);
        }

        // Save valve operation result to database
        const irrigationModel = require('../models/irrigationModel');

        try {
          const irrigationResult = await irrigationModel.addIrrigationResult({
            plant_id: plantId,
            status: 'valve_opened',
            reason: responseData.reason || 'Pi valve opened',
            moisture: responseData.moisture || null,
            final_moisture: responseData.moisture || null,
            water_added_liters: 0, // No water added during valve opening
            irrigation_time: new Date(),
            event_data: {
              ...responseData.event_data || {},
              valve_operation: 'open',
              duration_minutes: timeMinutes
            }
          });

          console.log(`Valve operation result saved to database for plant ${plantId}`);

          // Notify client of successful valve opening
          if (pendingInfo && pendingInfo.ws) {
            sendSuccess(pendingInfo.ws, 'OPEN_VALVE_SUCCESS', {
              message: `Plant "${pendingInfo.plantData.plant_name}" valve opened successfully for ${timeMinutes} minutes!`,
              plantId: plantId,
              result: irrigationResult,
              valve_data: {
                duration_minutes: timeMinutes,
                operation: 'open'
              }
            });
            console.log(`Notified client: Plant ${pendingInfo.plantData.plant_name} valve opened successfully!`);
          } else {
            console.log(`No pending client found for plant ${plantId} valve operation - result saved but client not notified`);
          }

          // Broadcast manual irrigation start to other garden members
          try {
            const { getPlantById } = require('../models/plantModel');
            const plant = await getPlantById(Number(plantId));
            if (plant?.garden_id) {

              await broadcastToGarden(plant.garden_id, 'GARDEN_IRRIGATION_STARTED', {
                plantId: Number(plantId),
                plantName: plant.name || pendingInfo?.plantData?.plant_name,
                mode: 'manual',
                duration_minutes: timeMinutes
              }, pendingInfo?.email);
            }
          } catch (e) {
            console.warn('Broadcast GARDEN_IRRIGATION_STARTED (manual) failed:', e.message);
          }

        } catch (err) {
          console.error(` Failed to save valve operation result for plant ${plantId}:`, err);

          if (pendingInfo && pendingInfo.ws) {
            sendError(pendingInfo.ws, 'OPEN_VALVE_FAIL',
              `Valve opened but failed to save result: ${err.message}`);
          }
        }

      } else {
        // Valve opening failed
        console.error(` Plant ${plantId} valve opening failed: ${responseData.error_message}`);

        // Save error result to database
        const irrigationModel = require('../models/irrigationModel');

        try {
          const irrigationResult = await irrigationModel.addIrrigationResult({
            plant_id: plantId,
            status: 'error',
            reason: responseData.error_message || 'Pi valve opening failed',
            moisture: responseData.moisture || null,
            final_moisture: responseData.moisture || null,
            water_added_liters: 0,
            irrigation_time: new Date(),
            event_data: {
              ...responseData.event_data || {},
              valve_operation: 'open_failed',
              duration_minutes: timeMinutes
            }
          });

          // Notify client of valve opening failure
          if (pendingInfo && pendingInfo.ws) {
            sendError(pendingInfo.ws, 'OPEN_VALVE_FAIL',
              `Valve opening failed: ${responseData.error_message || 'Unknown error'}`);
          }

        } catch (err) {
          console.error(` Failed to save valve operation error result for plant ${plantId}:`, err);
        }
      }
      return;
    }

    // Handle CLOSE_VALVE_RESPONSE from Pi
    if (data.type === 'CLOSE_VALVE_RESPONSE') {
      vLog('DEBUG - Received CLOSE_VALVE_RESPONSE from Pi:');
      vLog('   - Full data:', JSON.stringify(data));

      // Normalize nested payloads: data or data.data may hold the real fields
      const envelope = data.data || data;
      const responseData = envelope?.data || envelope || {};
      const rawPlantId = responseData.plant_id ?? responseData.plantId;
      const plantId = Number(rawPlantId);
      const status = responseData.status;
      const reason = responseData.reason || responseData.message || null;

      vLog('DEBUG - Extracted response data:');
      vLog('   - plantId:', plantId, '(type:', typeof plantId, ')');
      vLog('   - status:', status);

      // Get pending irrigation info (websocket + plant data)
      vLog('DEBUG - Getting pending irrigation info for plantId:', plantId);
      let pendingInfo = completePendingIrrigation(plantId);
      vLog('DEBUG - Pending info result:', pendingInfo ? 'Found' : 'Not found');

      if (status === 'success') {
        vLog(`DEBUG - Plant ${plantId} valve closed successfully`);
        vLog(`   - Reason: ${reason}`);

        // Persist irrigation state: manual mode cleared
        try {
          const { updateIrrigationState } = require('../models/plantModel');
          await updateIrrigationState(Number(plantId), { mode: 'none', startAt: null, endAt: null, sessionId: null });
        } catch (e) {
          console.warn('Failed to clear manual irrigation state:', e.message);
        }

        // Save valve operation result to database
        const irrigationModel = require('../models/irrigationModel');

        try {
          const irrigationResult = await irrigationModel.addIrrigationResult({
            plant_id: plantId,
            status: 'valve_closed',
            reason: reason || 'Pi valve closed',
            moisture: responseData.moisture || null,
            final_moisture: responseData.moisture || null,
            water_added_liters: 0, // No water added during valve closing
            irrigation_time: new Date(),
            event_data: {
              ...responseData.event_data || {},
              valve_operation: 'close'
            }
          });

          console.log(`Valve operation result saved to database for plant ${plantId}`);

          // Notify client of successful valve closing
          if (pendingInfo && pendingInfo.ws) {
            sendSuccess(pendingInfo.ws, 'CLOSE_VALVE_SUCCESS', {
              message: `Plant "${pendingInfo.plantData.plant_name}" valve closed successfully!`,
              plantId: plantId,
              result: irrigationResult,
              valve_data: {
                operation: 'close'
              }
            });
            console.log(`Notified client: Plant ${pendingInfo.plantData.plant_name} valve closed successfully!`);
          } else {
            console.log(`No pending client found for plant ${plantId} valve operation - result saved but client not notified`);
            // Fallback: broadcast stop to garden so UI clears
            try {
              const { getPlantById } = require('../models/plantModel');
              const plant = await getPlantById(Number(plantId));
              if (plant?.garden_id) {
                await broadcastToGarden(plant.garden_id, 'GARDEN_IRRIGATION_STOPPED', {
                  plantId: Number(plantId),
                  plantName: plant.name
                }, null);
              }
            } catch (e) { }
          }

          // Broadcast manual irrigation stop to other garden members
          try {
            const { getPlantById } = require('../models/plantModel');
            const plant = await getPlantById(Number(plantId));
            if (plant?.garden_id) {

              await broadcastToGarden(plant.garden_id, 'GARDEN_IRRIGATION_STOPPED', {
                plantId: Number(plantId),
                plantName: plant.name || pendingInfo?.plantData?.plant_name
              }, pendingInfo?.email);
            }
          } catch (e) {
            console.warn('Broadcast GARDEN_IRRIGATION_STOPPED (manual) failed:', e.message);
          }

        } catch (err) {
          console.error(` Failed to save valve operation result for plant ${plantId}:`, err);

          if (pendingInfo && pendingInfo.ws) {
            sendError(pendingInfo.ws, 'CLOSE_VALVE_FAIL',
              `Valve closed but failed to save result: ${err.message}`);
          }
        }

      } else {
        // Valve closing failed
        console.error(` Plant ${plantId} valve closing failed: ${responseData.error_message}`);

        // Save error result to database
        const irrigationModel = require('../models/irrigationModel');

        try {
          const irrigationResult = await irrigationModel.addIrrigationResult({
            plant_id: plantId,
            status: 'error',
            reason: responseData.error_message || 'Pi valve closing failed',
            moisture: responseData.moisture || null,
            final_moisture: responseData.moisture || null,
            water_added_liters: 0,
            irrigation_time: new Date(),
            event_data: {
              ...responseData.event_data || {},
              valve_operation: 'close_failed'
            }
          });

          // Notify client of valve closing failure
          if (pendingInfo && pendingInfo.ws) {
            sendError(pendingInfo.ws, 'CLOSE_VALVE_FAIL',
              `Valve closing failed: ${responseData.error_message || 'Unknown error'}`);
          }

        } catch (err) {
          console.error(`Failed to save valve operation error result for plant ${plantId}:`, err);
        }
      }
      return;
    }

    // Handle RESTART_VALVE_RESPONSE from Pi
    if (data.type === 'RESTART_VALVE_RESPONSE') {
      const responseData = data.data || data;
      const plantId = Number(responseData.plant_id);

      // Get pending irrigation info (websocket + plant data)
      const pendingInfo = completePendingIrrigation(plantId);

      if (responseData.status === 'success') {
        // Clear blocked flag in DB
        try {
          const { updateValveStatus } = require('../models/plantModel');
          await updateValveStatus(plantId, false);
        } catch (e) {
          console.warn('Failed to clear valve_blocked after restart:', e.message);
        }

        if (pendingInfo?.ws) {
          sendSuccess(pendingInfo.ws, 'RESTART_VALVE_SUCCESS', {
            plantId,
            plantName: pendingInfo?.plantData?.plant_name,
            message: `Valve for "${pendingInfo?.plantData?.plant_name || plantId}" restarted successfully.`
          });
        }

        // Optional broadcast: unblocked
        try {
          const { getPlantById } = require('../models/plantModel');
          const plant = await getPlantById(plantId);
          if (plant?.garden_id) {

            await broadcastToGarden(plant.garden_id, 'GARDEN_VALVE_UNBLOCKED', { plantId });
          }
        } catch { }

      } else {
        // Keep blocked; notify initiator
        if (pendingInfo?.ws) {
          const reason = responseData.error_message || 'Restart failed';
          sendError(pendingInfo.ws, 'RESTART_VALVE_FAIL', reason);
        }
      }
      return;
    }

    // Handle PLANT_MOISTURE_RESPONSE from Pi
    if (data.type === 'PLANT_MOISTURE_RESPONSE') {
      const responseData = data.data || {};

      if (responseData.status === 'success') {
        console.log(`[PI] Plant ${responseData.plant_id}: moisture=${responseData.moisture}%, temperature=${responseData.temperature}°C`);

        // Get pending moisture request info
        const pendingInfo = completePendingMoistureRequest(responseData.plant_id);

        if (pendingInfo && pendingInfo.ws) {
          const moistureData = {
            plant_id: responseData.plant_id,
            moisture: responseData.moisture,
            temperature: responseData.temperature,
            status: 'success',
            message: `Moisture data received for plant ${responseData.plant_id}`
          };

          // Send moisture data to requesting client
          sendSuccess(pendingInfo.ws, 'PLANT_MOISTURE_RESPONSE', moistureData);
          console.log(`[PI] Sent moisture data: plant=${responseData.plant_id}`);

          // Broadcast moisture update to other garden members
          try {
            const { getPlantById } = require('../models/plantModel');
            const plant = await getPlantById(responseData.plant_id);
            if (plant && plant.garden_id) {
              await broadcastToGarden(plant.garden_id, 'GARDEN_MOISTURE_UPDATE', {
                moistureData: moistureData,
                message: 'Plant moisture levels have been updated'
              }, pendingInfo.email);
            }
          } catch (broadcastError) {
            console.log(`[BROADCAST] Error: Failed to send moisture update - ${broadcastError.message}`);
          }
        } else {
          console.log(`[PI] Warning: No pending client for moisture request - plant=${responseData.plant_id}`);
        }
      } else {
        console.log(`[PI] Error: Moisture read failed - plant=${responseData.plant_id} error=${responseData.error_message}`);

        // Get pending moisture request info
        const pendingInfo = completePendingMoistureRequest(responseData.plant_id);

        if (pendingInfo && pendingInfo.ws) {
          // Send error to requesting client
          sendError(pendingInfo.ws, 'PLANT_MOISTURE_FAIL', {
            plant_id: responseData.plant_id,
            error_message: responseData.error_message || 'Failed to read moisture data'
          });
          console.log(`[PI] Sent error to client: plant=${responseData.plant_id}`);
        }
      }
      return;
    }

    // Handle ALL_MOISTURE_RESPONSE from Pi
    if (data.type === 'ALL_MOISTURE_RESPONSE') {
      const responseData = data.data || {};

      if (responseData.status === 'success') {
        console.log(`[PI] Message received: ALL_MOISTURE_RESPONSE`);
        responseData.plants?.forEach(plant => {
          console.log(`[PI] Plant ${plant.plant_id}: moisture=${plant.moisture}%, temperature=${plant.temperature}°C`);
        });

        // Broadcast to all connected clients
        const { getAllUserSockets } = require('../models/userSessions');
        const userSockets = getAllUserSockets();

        userSockets.forEach(userSocket => {
          try {
            sendSuccess(userSocket, 'ALL_PLANTS_MOISTURE_RESPONSE', responseData);
          } catch (error) {
            console.log(`[BROADCAST] Error: Failed to send moisture data - ${error.message}`);
          }
        });

        console.log(`[BROADCAST] Moisture data sent to ${userSockets.length} clients`);
      } else {
        console.log(`[PI] Error: Moisture request failed - ${responseData.error_message}`);
      }
      return;
    }

    // Handle VALVE_STATUS_RESPONSE from Pi
    if (data.type === 'VALVE_STATUS_RESPONSE') {
      const responseData = data.data || {};
      const plantId = responseData.plant_id;

      if (responseData.error) {
        console.log(`[VALVE] Error: Status request failed - plant=${plantId} error=${responseData.error_message}`);
      } else {
        console.log(`[VALVE] Status: plant=${plantId} valve=${responseData.valve_id} blocked=${responseData.is_blocked} open=${responseData.is_open} can_irrigate=${responseData.can_irrigate} message="${responseData.user_message}"`);

        // Get pending irrigation info to notify client
        const pendingInfo = completePendingIrrigation(plantId);

        if (pendingInfo && pendingInfo.ws) {
          if (responseData.is_blocked) {
            sendError(pendingInfo.ws, 'VALVE_BLOCKED', {
              plant_id: plantId,
              valve_id: responseData.valve_id,
              message: responseData.user_message,
              can_irrigate: false
            });
          } else {
            sendSuccess(pendingInfo.ws, 'VALVE_STATUS', {
              plant_id: plantId,
              valve_id: responseData.valve_id,
              message: responseData.user_message,
              can_irrigate: true,
              status: responseData.status
            });
          }
        }
      }
      return;
    }

    // Handle CHECK_POWER_SUPPLY_RESPONSE from Pi
    if (data.type === 'CHECK_POWER_SUPPLY_RESPONSE') {
      const responseData = data.data || {};
      const plantId = Number(responseData.plant_id || 0);
      const pendingInfo = completePendingIrrigation(plantId || 0);

      if (pendingInfo && pendingInfo.ws) {
        if (responseData.status === 'success') {
          const ok = !!responseData.ok;
          if (ok) {
            sendSuccess(pendingInfo.ws, 'CHECK_POWER_SUPPLY_SUCCESS', responseData);
          } else {
            sendError(pendingInfo.ws, 'CHECK_POWER_SUPPLY_FAIL', responseData);
          }
        } else {
          sendError(pendingInfo.ws, 'CHECK_POWER_SUPPLY_FAIL', responseData);
        }
      }
      return;
    }

    // Handle CHECK_SENSOR_CONNECTION_RESPONSE from Pi
    if (data.type === 'CHECK_SENSOR_CONNECTION_RESPONSE') {
      const responseData = data.data || {};
      const plantId = Number(responseData.plant_id);
      const pendingInfo = completePendingIrrigation(plantId);

      if (pendingInfo && pendingInfo.ws) {
        if (responseData.status === 'success') {
          sendSuccess(pendingInfo.ws, 'CHECK_SENSOR_CONNECTION_SUCCESS', {
            plant_id: plantId,
            moisture: responseData.moisture,
            temperature: responseData.temperature,
            sensor_port: responseData.sensor_port,
            is_connected: responseData.is_connected,
            message: responseData.message
          });
        } else {
          sendError(pendingInfo.ws, 'CHECK_SENSOR_CONNECTION_FAIL', {
            plant_id: plantId,
            error_message: responseData.error_message || 'sensor_read_failed'
          });
        }
      }
      return;
    }

    // Handle CHECK_VALVE_MECHANISM_RESPONSE from Pi
    if (data.type === 'CHECK_VALVE_MECHANISM_RESPONSE') {
      const responseData = data.data || {};
      const plantId = Number(responseData.plant_id);
      const pendingInfo = completePendingIrrigation(plantId);

      if (pendingInfo && pendingInfo.ws) {
        if (responseData.status === 'success') {
          sendSuccess(pendingInfo.ws, 'CHECK_VALVE_MECHANISM_SUCCESS', {
            plant_id: plantId,
            valve_id: responseData.valve_id,
            is_open: responseData.is_open,
            is_blocked: responseData.is_blocked,
            status_data: responseData.status_data,
            message: responseData.message
          });
        } else {
          sendError(pendingInfo.ws, 'CHECK_VALVE_MECHANISM_FAIL', {
            plant_id: plantId,
            error_message: responseData.error_message || 'valve_pulse_failed',
            status_data: responseData.status_data
          });
        }
      }
      return;
    }

    // Handle REMOVE_PLANT_RESPONSE from Pi
    if (data.type === 'REMOVE_PLANT_RESPONSE') {
      const responseData = data.data || {};
      const plantId = responseData.plant_id;

      // Get pending deletion request
      const pendingDeletion = getPendingDeletion(plantId);

      if (!pendingDeletion) {
        console.log(`[PI] Warning: No pending deletion found for plant ${plantId}`);
        return;
      }

      const { ws, email, plantData } = pendingDeletion;

      if (responseData.status === 'success') {
        console.log(`[PI] Plant removed: id=${plantId}`);

        // Pi confirmed removal - now delete from database
        try {

          const user = await getUser(email);
          const deleteResult = await deletePlantById(plantId, user.id);

          if (deleteResult.error) {
            console.log(`[PI] Error: Failed to delete from DB after Pi success - ${deleteResult.error}`);
            return sendError(ws, 'DELETE_PLANT_FAIL', 'Pi removed plant but database deletion failed');
          }

          // Best-effort: delete irrigation history after plant deletion (no-op if not present)
          try {
            const { deleteIrrigationResultsByPlantId } = require('../models/irrigationModel');
            await deleteIrrigationResultsByPlantId(plantId);
          } catch (historyErr) {
            console.log(`[PI] Warning: Failed to delete irrigation history for plant ${plantId} - ${historyErr.message}`);
          }

          // Broadcast successful deletion
          try {
            const gardenId = await getUserGardenId(user.id);
            if (gardenId) {
              await broadcastToGarden(gardenId, 'PLANT_DELETED_FROM_GARDEN', {
                plant: plantData,
                message: `Plant "${plantData.name}" was removed from your garden`
              }, null); // Send to all users including the one who deleted
              console.log(`[BROADCAST] Plant deletion sent: plant="${plantData.name}" garden=${gardenId}`);
            }
          } catch (broadcastError) {
            console.log(`[PI] Error: Failed to broadcast deletion - ${broadcastError.message}`);
          }

          // Send success to client
          sendSuccess(ws, 'DELETE_PLANT_SUCCESS', { message: 'Plant deleted successfully' });

        } catch (dbError) {
          console.log(`[PI] Error: Database deletion failed - ${dbError.message}`);
          sendError(ws, 'DELETE_PLANT_FAIL', 'Failed to complete plant deletion');
        }

      } else {
        console.log(`[PI] Error: Failed to remove plant - id=${plantId} error=${responseData.error_message}`);
        // Pi failed to remove - send error to client
        sendError(ws, 'DELETE_PLANT_FAIL', `Pi failed to remove plant: ${responseData.error_message}`);
      }
      return;
    }

    sendError(ws, 'UNKNOWN_TYPE', `Unknown message type: ${data.type}`);
  });

  ws.on('close', () => {
    console.log('[PI] Disconnected: raspberrypi_main_controller');
    removeBySocket(ws);
    piSocket = null;
  });
}

function getPiSocket() {
  return piSocket;
}

module.exports = {
  getPiSocket,
  handlePiSocket
}
