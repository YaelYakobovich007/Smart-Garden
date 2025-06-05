const { assignSensor, assignValve } = require('../models/plantModel');
const { sendError} = require('../utils/wsResponses');
const { notifyUserOfSensorUpdate, notifyUserOfValveUpdate} = require('../services/userNotifier');
const { updateAssignedParts } = require('../services/assignmentTracker');

function handleSensorAssigned(data, ws) {
  const { plantId, sensorId } = data;
  if (!plantId || !sensorId) {
    return sendError(ws, 'ASSIGN_SENSOR_FAIL', 'Missing plantId or sensorId');
  }

  const updated = assignSensor(plantId, sensorId);
  if (!updated) return sendError(ws, 'SENSOR_ASSIGN_FAIL', 'Plant not found');

  notifyUserOfSensorUpdate(updated);
  updateAssignedParts(plantId, { sensorId, email: updated.email });
}

function handleValveAssigned(data, ws) {
  const { plantId, valveId } = data;
  if (!plantId || !valveId) {
    return sendError(ws, 'ASSIGN_VALVE_FAIL', 'Missing plantId or valveId');
  }

  const updated = assignValve(plantId, valveId);
  if (!updated) return sendError(ws, 'VALVE_ASSIGN_FAIL', 'Plant not found');

  notifyUserOfValveUpdate(updated);
  updateAssignedParts(plantId, { valveId, email: updated.email });
}

module.exports = {
  handleSensorAssigned,
  handleValveAssigned
};
