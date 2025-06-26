const { assignSensor, assignValve } = require('../models/plantModel');
const { sendError } = require('../utils/wsResponses');
const { notifyUserOfSensorUpdate, notifyUserOfValveUpdate } = require('../services/userNotifier');
const { updateAssignedParts } = require('../services/assignmentTracker');

// הפונקציות כעת אסינכרוניות ועובדות מול הדאטהבייס
async function handleSensorAssigned(data, ws) {
  const { plantId, sensorId } = data;
  if (!plantId || !sensorId) {
    return sendError(ws, 'ASSIGN_SENSOR_FAIL', 'Missing plantId or sensorId');
  }

  try {
    const updated = await assignSensor(plantId, sensorId);
    if (!updated) return sendError(ws, 'SENSOR_ASSIGN_FAIL', 'Plant not found');
    notifyUserOfSensorUpdate(updated);
    updateAssignedParts(plantId, { sensorId, email: updated.email });
  } catch (err) {
    return sendError(ws, 'SENSOR_ASSIGN_FAIL', 'Database error');
  }
}

async function handleValveAssigned(data, ws) {
  const { plantId, valveId } = data;
  if (!plantId || !valveId) {
    return sendError(ws, 'ASSIGN_VALVE_FAIL', 'Missing plantId or valveId');
  }

  try {
    const updated = await assignValve(plantId, valveId);
    if (!updated) return sendError(ws, 'VALVE_ASSIGN_FAIL', 'Plant not found');
    notifyUserOfValveUpdate(updated);
    updateAssignedParts(plantId, { valveId, email: updated.email });
  } catch (err) {
    return sendError(ws, 'VALVE_ASSIGN_FAIL', 'Database error');
  }
}

module.exports = {
  handleSensorAssigned,
  handleValveAssigned
};
