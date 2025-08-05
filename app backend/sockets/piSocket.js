const { sendSuccess, sendError } = require('../utils/wsResponses');
const { handleSensorAssigned, handleValveAssigned } = require('../controllers/plantAssignmentController');
const { completePendingPlant } = require('../services/pendingPlantsTracker');
const { completePendingIrrigation } = require('../services/pendingIrrigationTracker');
const { completePendingMoistureRequest } = require('../services/pendingMoistureTracker');

let piSocket = null;

function handlePiSocket(ws) {
  piSocket = ws;
  console.log('Pi connected: raspberrypi_main_controller');
  sendSuccess(ws, 'WELCOME', { message: 'Hello Pi' });

  ws.on('message', async (msg) => {
    let data;
    try {
      data = JSON.parse(msg);
      console.log(`📨 Pi message: ${data.type}`);
    } catch {
      console.error('❌ Invalid JSON from Pi:', msg);
      return sendError(ws, 'INVALID_JSON', 'Invalid JSON format');
    }

    if (data.type === 'SENSOR_ASSIGNED') {
      console.log(`Received sensor assignment: ${data.data?.sensor_port} for ${data.data?.plant_id}`);
      return handleSensorAssigned(data, ws);
    }

    if (data.type === 'VALVE_ASSIGNED') {
      console.log(`Received valve assignment: ${data.data?.valve_id} for ${data.data?.plant_id}`);
      return handleValveAssigned(data, ws);
    }

    // Handle ADD_PLANT_RESPONSE from Pi
    if (data.type === 'ADD_PLANT_RESPONSE') {
      const responseData = data.data || {};
      const plantId = responseData.plant_id; // This is the real database plant_id

      // Get pending plant info (websocket + plant data)
      const pendingInfo = completePendingPlant(plantId);

      if (responseData.status === 'success') {
        console.log(`✅ Plant ${plantId}: assigned sensor_port=${responseData.sensor_port}, valve=${responseData.assigned_valve}`);

        // Update plant in database with hardware IDs
        const { updatePlantHardware } = require('../models/plantModel');

        try {
          await updatePlantHardware(plantId, responseData.sensor_port, responseData.assigned_valve);
          console.log(`✅ Plant ${plantId} database updated with hardware assignments`);

          // Notify client of successful plant creation with hardware assignment
          if (pendingInfo && pendingInfo.ws) {
            sendSuccess(pendingInfo.ws, 'ADD_PLANT_SUCCESS', {
              message: `Plant "${pendingInfo.name}" added successfully! Assigned to sensor ${responseData.sensor_port} and valve ${responseData.assigned_valve}`,
              plant: {
                ...pendingInfo,
                sensor_port: responseData.sensor_port,
                valve_id: responseData.assigned_valve
              },
              hardware: {
                sensor_port: responseData.sensor_port,
                valve_id: responseData.assigned_valve
              }
            });
            console.log(`🎉 Notified client: Plant ${pendingInfo.name} successfully added with hardware!`);
          } else {
            console.log(`⚠️ No pending client found for plant ${plantId} - hardware assigned but client not notified`);
          }

        } catch (err) {
          console.error(`❌ Plant ${plantId} database update failed:`, err);

          // Database update failed - delete the plant and notify client
          const { deletePlantById } = require('../models/plantModel');
          await deletePlantById(plantId);
          console.log(`🗑️ Deleted plant ${plantId} from database (update failed)`);

          if (pendingInfo && pendingInfo.ws) {
            sendError(pendingInfo.ws, 'ADD_PLANT_FAIL',
              `Hardware assigned but database update failed. Plant removed. Please try again.`);
          }
        }

      } else {
        // Hardware assignment failed
        console.error(`❌ Plant ${plantId} hardware assignment failed: ${responseData.error_message}`);

        // Delete the plant from database since hardware assignment failed
        const { deletePlantById } = require('../models/plantModel');
        await deletePlantById(plantId);
        console.log(`🗑️ Deleted plant ${plantId} from database (hardware assignment failed)`);

        // Notify client of hardware assignment failure
        if (pendingInfo && pendingInfo.ws) {
          sendError(pendingInfo.ws, 'ADD_PLANT_FAIL',
            `Hardware assignment failed: ${responseData.error_message || 'Unknown error'}. Plant removed.`);
        }
      }
      return;
    }

    // Handle IRRIGATE_PLANT_RESPONSE from Pi
    if (data.type === 'IRRIGATE_PLANT_RESPONSE') {
      const responseData = data.data || {};
      const plantId = responseData.plant_id;

      // Get pending irrigation info (websocket + plant data)
      const pendingInfo = completePendingIrrigation(plantId);

      if (responseData.status === 'success') {
        console.log(`✅ Plant ${plantId} irrigation completed successfully`);
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

          console.log(`✅ Irrigation result saved to database for plant ${plantId}`);

          // Notify client of successful irrigation
          if (pendingInfo && pendingInfo.ws) {
            sendSuccess(pendingInfo.ws, 'IRRIGATE_SUCCESS', {
              message: `Plant "${pendingInfo.plantData.plant_name}" irrigated successfully! Added ${responseData.water_added_liters}L of water.`,
              result: irrigationResult,
              irrigation_data: {
                water_added_liters: responseData.water_added_liters,
                final_moisture: responseData.final_moisture,
                initial_moisture: responseData.moisture
              }
            });
            console.log(`🎉 Notified client: Plant ${pendingInfo.plantData.plant_name} irrigation successful!`);
          } else {
            console.log(`⚠️ No pending client found for plant ${plantId} irrigation - result saved but client not notified`);
          }

        } catch (err) {
          console.error(`❌ Failed to save irrigation result for plant ${plantId}:`, err);

          if (pendingInfo && pendingInfo.ws) {
            sendError(pendingInfo.ws, 'IRRIGATE_FAIL',
              `Irrigation completed but failed to save result: ${err.message}`);
          }
        }

      } else if (responseData.status === 'skipped') {
        console.log(`⏭️ Plant ${plantId} irrigation skipped: ${responseData.reason}`);

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
            sendSuccess(pendingInfo.ws, 'IRRIGATE_SKIPPED', {
              message: `Plant "${pendingInfo.plantData.plant_name}" irrigation skipped: ${responseData.reason}`,
              result: irrigationResult,
              reason: responseData.reason
            });
            console.log(`ℹ️ Notified client: Plant ${pendingInfo.plantData.plant_name} irrigation skipped`);
          }

        } catch (err) {
          console.error(`❌ Failed to save skipped irrigation result for plant ${plantId}:`, err);
        }

      } else {
        // Irrigation failed
        console.error(`❌ Plant ${plantId} irrigation failed: ${responseData.error_message}`);

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

          // Notify client of irrigation failure
          if (pendingInfo && pendingInfo.ws) {
            sendError(pendingInfo.ws, 'IRRIGATE_FAIL',
              `Plant "${pendingInfo.plantData.plant_name}" irrigation failed: ${responseData.error_message || 'Unknown error'}`);
          }

        } catch (err) {
          console.error(`❌ Failed to save error irrigation result for plant ${plantId}:`, err);
        }
      }
      return;
    }

    // Handle PLANT_MOISTURE_RESPONSE from Pi
    if (data.type === 'PLANT_MOISTURE_RESPONSE') {
      const responseData = data.data || {};

      if (responseData.status === 'success') {
        console.log(`🌿 Plant ${responseData.plant_id}: moisture=${responseData.moisture}%, temperature=${responseData.temperature}°C`);
        
        // Get pending moisture request info
        const pendingInfo = completePendingMoistureRequest(responseData.plant_id);
        
        if (pendingInfo && pendingInfo.ws) {
          // Send moisture data to requesting client
          sendSuccess(pendingInfo.ws, 'PLANT_MOISTURE_RESPONSE', {
            plant_id: responseData.plant_id,
            moisture: responseData.moisture,
            temperature: responseData.temperature,
            status: 'success',
            message: `Moisture data received for plant ${responseData.plant_id}`
          });
          console.log(`📊 Sent moisture data to client for plant ${responseData.plant_id}`);
        } else {
          console.log(`⚠️ No pending client found for plant ${responseData.plant_id} moisture request`);
        }
      } else {
        console.error(`❌ Plant ${responseData.plant_id} moisture read failed: ${responseData.error_message}`);
        
        // Get pending moisture request info
        const pendingInfo = completePendingMoistureRequest(responseData.plant_id);
        
        if (pendingInfo && pendingInfo.ws) {
          // Send error to requesting client
          sendError(pendingInfo.ws, 'PLANT_MOISTURE_FAIL', {
            plant_id: responseData.plant_id,
            error_message: responseData.error_message || 'Failed to read moisture data'
          });
          console.log(`❌ Sent moisture error to client for plant ${responseData.plant_id}`);
        }
      }
      return;
    }

    // Handle ALL_PLANTS_MOISTURE_RESPONSE from Pi
    if (data.type === 'ALL_PLANTS_MOISTURE_RESPONSE') {
      const responseData = data.data || {};

      if (responseData.status === 'success') {
        console.log(`🌿 All plants moisture: ${responseData.total_plants} plants received`);
        responseData.plants?.forEach(plant => {
          console.log(`   Plant ${plant.plant_id}: moisture=${plant.moisture}%, temperature=${plant.temperature}°C`);
        });
        
        // Broadcast to all connected clients (for now, we'll implement this later)
        // For now, just log that we received the data
        console.log(`📊 Received all plants moisture data - ${responseData.total_plants} plants`);
      } else {
        console.error(`❌ All plants moisture request failed: ${responseData.error_message}`);
      }
      return;
    }

    sendError(ws, 'UNKNOWN_TYPE', `Unknown message type: ${data.type}`);
  });

  ws.on('close', () => {
    console.log('Pi disconnected: raspberrypi_main_controller');
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
