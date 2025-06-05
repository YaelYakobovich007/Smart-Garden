const { sendSuccess } = require('../utils/wsResponses');
const { getSocketByEmail } = require('../models/userSessions');

function notifyUserOfSensorUpdate({ plant, email }) {
  const ws = getSocketByEmail(email);
  if (ws) {
    sendSuccess(ws, 'SENSOR_ASSIGNED', { plantId: plant.id, sensorId: plant.sensorId });
  }
}

function notifyUserOfValveUpdate({ plant, email }) {
  const ws = getSocketByEmail(email);
  if (ws) {
    sendSuccess(ws, 'VALVE_ASSIGNED', { plantId: plant.id, valveId: plant.valveId });
  }
}

function notifyUserReadyToConnect(plantId, { sensorId, valveId, email }) {
  const ws = getSocketByEmail(email);
  if (ws) {
    sendSuccess(ws, 'READY_TO_CONNECT', { plantId, sensorId, valveId });
  }
}

module.exports = {
  notifyUserOfSensorUpdate,
  notifyUserOfValveUpdate,
  notifyUserReadyToConnect,
};