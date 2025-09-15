/**
 * Plant Assignment Controller
 *
 * Persists hardware assignments arriving from the Pi and notifies users.
 */
const { assignSensor, assignValve } = require('../models/plantModel');
const { sendError } = require('../utils/wsResponses');
const { notifyUserOfSensorUpdate, notifyUserOfValveUpdate } = require('../services/userNotifier');
const { updateAssignedParts } = require('../services/assignmentTracker');

/**
 * Persist assigned sensor port for a plant and notify initiating user.
 * @param {{plantId:number, sensorPort:string}} data
 */
async function handleSensorAssigned(data, ws) {
  const { plantId, sensorPort } = data;
  if (!plantId || !sensorPort) {
    return sendError(ws, 'ASSIGN_SENSOR_FAIL', 'Missing plantId or sensorPort');
  }

  try {
    const updated = await assignSensor(plantId, sensorPort);
    if (!updated) return sendError(ws, 'SENSOR_ASSIGN_FAIL', 'Plant not found');
    notifyUserOfSensorUpdate(updated);
    updateAssignedParts(plantId, { sensorPort, email: updated.email });
  } catch (err) {
    return sendError(ws, 'SENSOR_ASSIGN_FAIL', 'Database error');
  }
}

/**
 * Persist assigned valve id for a plant and notify initiating user.
 * @param {{plantId:number, valveId:string}} data
 */
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
