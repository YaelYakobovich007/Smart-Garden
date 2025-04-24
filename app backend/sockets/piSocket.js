const { sendSuccess, sendError } = require('../utils/wsResponses');
const {handleSensorAssigned, handleValveAssigned} = require('../controllers/plantAssignmentController');

let piSocket = null;

function handlePiSocket(ws) {
  piSocket = ws;
  sendSuccess(ws, 'WELCOME', { message: 'Hello Pi' });
  
  ws.on('message', (msg) => {
    let data;
    try {
      data = JSON.parse(msg);
    } catch {
      return sendError(ws, 'INVALID_JSON', 'Invalid JSON format');
    }

    if (data.type === 'SENSOR_ASSIGNED') {
      return handleSensorAssigned(data, ws);
    }

    if (data.type === 'VALVE_ASSIGNED') {
      return handleValveAssigned(data, ws);
    }

    sendError(ws, 'UNKNOWN_TYPE', `Unknown message type: ${data.type}`);
  });

  ws.on('close', () => {
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
