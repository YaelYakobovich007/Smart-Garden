const { getUser } = require('../models/userModel');
const { getPlantByName, updatePlantSchedule, getCurrentMoisture } = require('../models/plantModel');
const irrigationModel = require('../models/irrigationModel');
const { sendSuccess, sendError } = require('../utils/wsResponses');
const { getEmailBySocket } = require('../models/userSessions');

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

  // Get current and ideal moisture
  const currentMoisture = await getCurrentMoisture(plant.plant_id);
  const idealMoisture = plant.ideal_moisture;
  
  // TODO: integrate with real hardware to get current moisture, and check if irrigation is needed should be in hardware
  // Check if irrigation is needed
  if (currentMoisture >= idealMoisture) {
    // Insert skipped event
    const result = await irrigationModel.addIrrigationResult({
      plant_id: plant.plant_id,
      status: 'skipped',
      reason: 'Moisture sufficient',
      moisture: currentMoisture,
      final_moisture: currentMoisture,
      water_added_liters: 0,
      irrigation_time: new Date(),
      event_data: { simulation: SIMULATION_MODE }
    });
    return sendSuccess(ws, 'IRRIGATE_SKIPPED', { message: 'Irrigation not needed', result });
  }

  // Perform irrigation (simulation or real)
  let irrigationResult;
  if (SIMULATION_MODE) {
    // Simulate irrigation result
    const added = 0.2; // liters
    const finalMoisture = currentMoisture + 10;
    irrigationResult = await irrigationModel.addIrrigationResult({
      plant_id: plant.plant_id,
      status: 'success',
      reason: 'Simulated irrigation',
      moisture: currentMoisture,
      final_moisture: finalMoisture,
      water_added_liters: added,
      irrigation_time: new Date(),
      event_data: { simulation: true }
    });
  } else {
    // TODO: Real hardware integration should be implemented here
    // For now, do nothing (no irrigation event is inserted)
    irrigationResult = null;
  }
  sendSuccess(ws, 'IRRIGATE_SUCCESS', { message: 'Irrigation performed', result: irrigationResult });
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
  sendSuccess(ws, 'GET_IRRIGATION_RESULT_SUCCESS', { name: plant.name, results });
}

module.exports = {
  handleIrrigationMessage
};