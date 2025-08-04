const { getUser } = require('../models/userModel');
const { getPlantByName, updatePlantSchedule, getCurrentMoisture } = require('../models/plantModel');
const irrigationModel = require('../models/irrigationModel');
const { sendSuccess, sendError } = require('../utils/wsResponses');
const { getEmailBySocket } = require('../models/userSessions');
const piCommunication = require('../services/piCommunication');
const { addPendingIrrigation } = require('../services/pendingIrrigationTracker');

const SIMULATION_MODE = process.env.SIMULATION_MODE === 'true';

const irrigationHandlers = {
  UPDATE_PLANT_SCHEDULE: handleUpdatePlantSchedule,
  IRRIGATE_PLANT: handleIrrigatePlant,
  GET_IRRIGATION_RESULT: handleGetIrrigationResult
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

// Irrigate plant
async function handleIrrigatePlant(data, ws, email) {
  const { plantName } = data;
  if (!plantName) return sendError(ws, 'IRRIGATE_FAIL', 'Missing plantName');
  const user = await getUser(email);
  if (!user) return sendError(ws, 'IRRIGATE_FAIL', 'User not found');
  const plant = await getPlantByName(user.id, plantName);
  if (!plant) return sendError(ws, 'IRRIGATE_FAIL', 'Plant not found');

  // Send irrigation request to Pi controller (let Pi decide if irrigation is needed)
  const piResult = piCommunication.irrigatePlant(plant.plant_id);

  if (piResult.success) {
    // Pi is connected - add to pending list and wait for irrigation result
    addPendingIrrigation(plant.plant_id, ws, email, {
      plant_id: plant.plant_id,
      plant_name: plant.name,
      ideal_moisture: plant.ideal_moisture
    });

    console.log(`⏳ Irrigation request for plant ${plant.plant_id} (${plant.name}) sent to Pi controller...`);
    // No immediate response - client will get success/failure when Pi responds with irrigation result
  } else {
    // Pi not connected - return error 
    return sendError(ws, 'IRRIGATE_FAIL',
      'Pi controller not connected. Cannot irrigate plant. Please try again when Pi is online.');
  }
}

// Get all irrigation results for a plant by name
async function handleGetIrrigationResult(data, ws, email) {
  const { plantName } = data;
  if (!plantName) return sendError(ws, 'GET_IRRIGATION_RESULT_FAIL', 'Missing plantName');
  const user = await getUser(email);
  if (!user) return sendError(ws, 'GET_IRRIGATION_RESULT_FAIL', 'User not found');
  const plant = await getPlantByName(user.id, plantName);
  if (!plant) return sendError(ws, 'GET_IRRIGATION_RESULT_FAIL', 'Plant not found');
  const results = await irrigationModel.getIrrigationResultsByPlantId(plant.plant_id);
  // Return both the plant name and the results array
  sendSuccess(ws, 'GET_IRRIGATION_RESULT_SUCCESS', { plantName: plant.name, results });
}

module.exports = {
  handleIrrigationMessage
};