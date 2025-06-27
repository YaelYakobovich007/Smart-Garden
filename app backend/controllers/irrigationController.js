const { getUser } = require('../models/userModel');
const { getPlantByName, updatePlantSchedule, getCurrentMoisture, irrigatePlant } = require('../models/plantModel');
const { sendSuccess, sendError } = require('../utils/wsResponses');
const { getEmailBySocket } = require('../models/userSessions');

const irrigationHandlers = {
  UPDATE_PLANT_SCHEDULE: handleUpdatePlantSchedule,
  SHOULD_IRRIGATE: handleShouldIrrigate,
  IRRIGATE_PLANT: handleIrrigatePlant
};

async function handleIrrigationMessage(data, ws) {
  try {
    const email = getEmailBySocket(ws);
    if (!email) {
      return sendError(ws, 'UNAUTHORIZED', 'User must be logged in');
    }
    const handler = irrigationHandlers[data.type];
    if (handler) {
      await handler(data, ws, email);
    } else {
      sendError(ws, 'UNKNOWN_TYPE', `Unknown irrigation message type: ${data.type}`);
    }
  } catch (err) {
    console.error('Irrigation message error:', err);
    sendError(ws, 'IRRIGATION_ERROR', 'Internal server error');
  }
}

// Update irrigation schedule
async function handleUpdatePlantSchedule(data, ws, email) {
  const { plantName, days, time } = data;
  if (!plantName || !days || !time) {
    return sendError(ws, 'UPDATE_SCHEDULE_FAIL', 'Missing required data');
  }
  const user = await getUser(email);
  if (!user) return sendError(ws, 'UPDATE_SCHEDULE_FAIL', 'User not found');
  const plant = await getPlantByName(user.id, plantName);
  if (!plant) return sendError(ws, 'UPDATE_SCHEDULE_FAIL', 'Plant not found');
  await updatePlantSchedule(plant.plant_id, days, time);
  sendSuccess(ws, 'UPDATE_SCHEDULE_SUCCESS', { message: 'Schedule updated' });
}

// Should irrigate?
async function handleShouldIrrigate(data, ws, email) {
  const { plantName } = data;
  if (!plantName) return sendError(ws, 'SHOULD_IRRIGATE_FAIL', 'Missing plantName');
  const user = await getUser(email);
  if (!user) return sendError(ws, 'SHOULD_IRRIGATE_FAIL', 'User not found');
  const plant = await getPlantByName(user.id, plantName);
  if (!plant) return sendError(ws, 'SHOULD_IRRIGATE_FAIL', 'Plant not found');
  const { currentMoisture, ideal_moisture } = await getCurrentMoisture(plant.plant_id);
  const shouldIrrigate = currentMoisture < ideal_moisture;
  sendSuccess(ws, 'SHOULD_IRRIGATE_RESULT', { shouldIrrigate, currentMoisture, idealMoisture: ideal_moisture });
}

// Irrigate plant
async function handleIrrigatePlant(data, ws, email) {
  const { plantName } = data;
  if (!plantName) return sendError(ws, 'IRRIGATE_FAIL', 'Missing plantName');
  const user = await getUser(email);
  if (!user) return sendError(ws, 'IRRIGATE_FAIL', 'User not found');
  const plant = await getPlantByName(user.id, plantName);
  if (!plant) return sendError(ws, 'IRRIGATE_FAIL', 'Plant not found');
  await irrigatePlant(plant.plant_id);
  sendSuccess(ws, 'IRRIGATE_SUCCESS', { message: 'Irrigation command sent' });
}

module.exports = {
  handleIrrigationMessage
};
