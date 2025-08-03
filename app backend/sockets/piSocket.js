const { sendSuccess, sendError } = require('../utils/wsResponses');
const { handleSensorAssigned, handleValveAssigned } = require('../controllers/plantAssignmentController');

let piSocket = null;

function handlePiSocket(ws) {
  piSocket = ws;
  console.log('Pi connected: raspberrypi_main_controller');
  sendSuccess(ws, 'WELCOME', { message: 'Hello Pi' });

  ws.on('message', (msg) => {
    let data;
    try {
      data = JSON.parse(msg);
      console.log(`📨 Pi message: ${data.type}`);
    } catch {
      console.error('❌ Invalid JSON from Pi:', msg);
      return sendError(ws, 'INVALID_JSON', 'Invalid JSON format');
    }

    if (data.type === 'SENSOR_ASSIGNED') {
      console.log(`Received sensor assignment: ${data.data?.sensor_id} for ${data.data?.plant_id}`);
      return handleSensorAssigned(data, ws);
    }

    if (data.type === 'VALVE_ASSIGNED') {
      console.log(`Received valve assignment: ${data.data?.valve_id} for ${data.data?.plant_id}`);
      return handleValveAssigned(data, ws);
    }

    // Handle ADD_PLANT_RESPONSE from Pi
    if (data.type === 'ADD_PLANT_RESPONSE') {
      const responseData = data.data || {};

      if (responseData.status === 'success') {
        console.log(`✅ Plant ${responseData.plant_id}: assigned sensor=${responseData.assigned_sensor}, valve=${responseData.assigned_valve}`);

        // Update plant in database with hardware IDs
        const { updatePlantHardware } = require('../models/plantModel');
        updatePlantHardware(responseData.plant_id, responseData.assigned_sensor, responseData.assigned_valve)
          .then(() => console.log(`✅ Plant ${responseData.plant_id} database updated`))
          .catch(err => console.error(`❌ Plant ${responseData.plant_id} database update failed:`, err));
      } else {
        console.error(`❌ Plant ${responseData.plant_id} hardware assignment failed: ${responseData.error_message}`);
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
