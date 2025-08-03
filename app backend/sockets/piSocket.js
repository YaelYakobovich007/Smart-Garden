const { sendSuccess, sendError } = require('../utils/wsResponses');
const {handleSensorAssigned, handleValveAssigned} = require('../controllers/plantAssignmentController');

let piSocket = null;

function handlePiSocket(ws) {
  piSocket = ws;
  console.log('Pi connected: raspberrypi_main_controller');
  sendSuccess(ws, 'WELCOME', { message: 'Hello Pi' });
  
  ws.on('message', (msg) => {
    let data;
    try {
      data = JSON.parse(msg);
    } catch {
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

    if (data.type === 'ADD_PLANT_COMPLETE') {
      console.log(`Received add plant completion: Plant ${data.data?.plant_id} (${data.data?.plant_name}) - Status: ${data.data?.status}`);
      if (data.data?.status === 'success') {
        console.log(`  ✅ Plant successfully added to Pi with internal ID ${data.data?.internal_plant_id}`);
        console.log(`  📊 Assigned sensor: ${data.data?.assigned_sensor}, valve: ${data.data?.assigned_valve}`);
      } else {
        console.error(`  ❌ Failed to add plant to Pi: ${data.data?.error_message}`);
      }
      return; // No response needed for this notification
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
