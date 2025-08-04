const { sendSuccess, sendError } = require('../utils/wsResponses');
const { handleSensorAssigned, handleValveAssigned } = require('../controllers/plantAssignmentController');
const { completePendingPlant } = require('../services/pendingPlantsTracker');

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

    // Handle PLANT_MOISTURE_RESPONSE from Pi
    if (data.type === 'PLANT_MOISTURE_RESPONSE') {
      const responseData = data.data || {};

      if (responseData.status === 'success') {
        console.log(`🌿 Plant ${responseData.plant_id}: moisture=${responseData.moisture}%`);
        // TODO: Send moisture data to requesting client
      } else {
        console.error(`❌ Plant ${responseData.plant_id} moisture read failed: ${responseData.error_message}`);
      }
      return;
    }

    // Handle ALL_PLANTS_MOISTURE_RESPONSE from Pi
    if (data.type === 'ALL_PLANTS_MOISTURE_RESPONSE') {
      const responseData = data.data || {};

      if (responseData.status === 'success') {
        console.log(`🌿 All plants moisture: ${responseData.total_plants} plants received`);
        responseData.plants?.forEach(plant => {
          console.log(`   Plant ${plant.plant_id}: ${plant.moisture}%`);
        });
        // TODO: Send all moisture data to requesting client
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
