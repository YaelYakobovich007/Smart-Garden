const { getUser } = require('../models/userModel');
const { getPlantByName, updatePlantSchedule, getCurrentMoisture } = require('../models/plantModel');
const irrigationModel = require('../models/irrigationModel');
const { sendSuccess, sendError } = require('../utils/wsResponses');
const { getEmailBySocket } = require('../models/userSessions');
const piCommunication = require('../services/piCommunication');
const { addPendingIrrigation } = require('../services/pendingIrrigationTracker');

const SIMULATION_MODE = process.env.SIMULATION_MODE === 'true';
const VERBOSE_LOGS = process.env.VERBOSE_LOGS === 'true';
const vLog = (...args) => { if (VERBOSE_LOGS) console.log(...args); };

const irrigationHandlers = {
  UPDATE_PLANT_SCHEDULE: handleUpdatePlantSchedule,
  IRRIGATE_PLANT: handleIrrigatePlant,
  STOP_IRRIGATION: handleStopIrrigation,
  STOP_IRRIGATION: handleStopIrrigation,
  OPEN_VALVE: handleOpenValve,
  CLOSE_VALVE: handleCloseValve,
  RESTART_VALVE: handleRestartValve,
  GET_IRRIGATION_RESULT: handleGetIrrigationResult,
  GET_VALVE_STATUS: handleGetValveStatus,
  UNBLOCK_VALVE: handleUnblockValve,
  TEST_VALVE_BLOCK: handleTestValveBlock,
  UNBLOCK_VALVE: handleUnblockValve,
  TEST_VALVE_BLOCK: handleTestValveBlock
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
    console.log(`[IRRIGATION] Error handling message: ${err.message}`);
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
  if (!plant) return sendError(ws, 'UPDATE_SCHEDULE_FAIL', 'Plant not found in your garden');
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
  if (!plant) return sendError(ws, 'IRRIGATE_FAIL', 'Plant not found in your garden');

  // Send irrigation request to Pi controller (let Pi decide if irrigation is needed)
  const piResult = piCommunication.irrigatePlant(plant.plant_id);

  if (piResult.success) {
    // Pi is connected - add to pending list and wait for irrigation result
    addPendingIrrigation(plant.plant_id, ws, email, {
      plant_id: plant.plant_id,
      plant_name: plant.name,
      ideal_moisture: parseFloat(plant.ideal_moisture)
    });

    console.log(`[IRRIGATION] Request sent: plant=${plant.plant_id} name=${plant.name}`);
    console.log(`[IRRIGATION] Waiting for Pi to start irrigation`);
    // No immediate response - client will get IRRIGATION_STARTED when Pi actually starts irrigating
  } else {
    // Pi not connected - return error 
    return sendError(ws, 'IRRIGATE_FAIL',
      'Pi controller not connected. Cannot irrigate plant. Please try again when Pi is online.');
  }
}

// Stop smart irrigation for a specific plant
async function handleStopIrrigation(data, ws, email) {
  console.log(`[IRRIGATION] Stop request received: ${JSON.stringify(data)}`);

  const { plantName } = data;

  if (!plantName) {
    console.log('[IRRIGATION] Error: Missing plantName');
    return sendError(ws, 'STOP_IRRIGATION_FAIL', 'Missing plantName');
  }

  console.log(`[IRRIGATION] Looking up user: ${email}`);

  const user = await getUser(email);
  if (!user) {
    console.log(`[IRRIGATION] Error: User not found - email=${email}`);
    return sendError(ws, 'STOP_IRRIGATION_FAIL', 'User not found');
  }

  console.log(`[IRRIGATION] Looking up plant: name=${plantName} user=${user.id}`);
  const plant = await getPlantByName(user.id, plantName);
  if (!plant) {
    console.log(`[IRRIGATION] Error: Plant not found - name=${plantName} user=${user.id}`);
    return sendError(ws, 'STOP_IRRIGATION_FAIL', 'Plant not found');
  }

  console.log(`[IRRIGATION] Plant found: id=${plant.plant_id} name=${plant.name}`);
  console.log('[IRRIGATION] Sending stop request to Pi');

  // Best-effort: immediately clear persisted irrigation state
  try {
    const { updateIrrigationState } = require('../models/plantModel');
    await updateIrrigationState(plant.plant_id, { mode: 'none', startAt: null, endAt: null, sessionId: null });
  } catch (e) {
    console.log(`[IRRIGATION] Warning: Failed to clear state - ${e?.message}`);
  }

  // Send stop irrigation request to Pi controller
  const piResult = piCommunication.stopIrrigation(plant.plant_id);

  console.log(`[IRRIGATION] Stop request result: ${JSON.stringify(piResult)}`);

  if (piResult.success) {
    console.log('[IRRIGATION] Stop request sent successfully');
    sendSuccess(ws, 'STOP_IRRIGATION_SUCCESS', {
      plantName: plantName,
      message: 'Stop request sent successfully'
    });
  } else {
    console.log(`[IRRIGATION] Error: Failed to send stop request - ${piResult.error}`);
    sendError(ws, 'STOP_IRRIGATION_FAIL', piResult.error || 'Failed to stop irrigation');
  }

  // Add to pending list to handle response
  addPendingIrrigation(plant.plant_id, ws, email, {
    plant_id: plant.plant_id,
    plant_name: plant.name,
    ideal_moisture: parseFloat(plant.ideal_moisture || 0)
  });

  console.log(`[IRRIGATION] Added to pending: plant=${plant.plant_id} name=${plant.name}`);
}

// Open valve for a specific duration
async function handleOpenValve(data, ws, email) {
  console.log(`[VALVE] Open request received: ${JSON.stringify(data)}`);

  const { plantName, timeMinutes } = data;
  console.log(`[VALVE] Request data: plant=${plantName} time=${timeMinutes}min`);

  if (!plantName) {
    console.log('[IRRIGATION] Error: Missing plantName');
    return sendError(ws, 'OPEN_VALVE_FAIL', 'Missing plantName');
  }
  if (!timeMinutes || timeMinutes <= 0) {
    console.log(`[VALVE] Error: Invalid time=${timeMinutes}min`);
    return sendError(ws, 'OPEN_VALVE_FAIL', 'Invalid timeMinutes');
  }

  console.log(`[VALVE] Validation passed: plant=${plantName} time=${timeMinutes}min`);

  const user = await getUser(email);
  if (!user) {
    console.log(`[IRRIGATION] Error: User not found - email=${email}`);
    return sendError(ws, 'OPEN_VALVE_FAIL', 'User not found');
  }
  console.log(`[VALVE] User found: id=${user.id} email=${user.email}`);

  vLog('DEBUG - Looking up plant by name:', plantName, 'for user:', user.id);
  const plant = await getPlantByName(user.id, plantName);
  if (!plant) {
    console.log(`[IRRIGATION] Error: Plant not found - name=${plantName} user=${user.id}`);
    return sendError(ws, 'OPEN_VALVE_FAIL', 'Plant not found in your garden');
  }

  console.log(`[VALVE] Plant found: id=${plant.plant_id} name=${plant.name} user=${plant.user_id}`);

  console.log(`[VALVE] Opening: plant=${plant.plant_id} time=${timeMinutes}min`);

  // Send open valve request to Pi controller
  const piResult = piCommunication.openValve(plant.plant_id, timeMinutes);

  console.log(`[VALVE] Open result: ${JSON.stringify(piResult)}`);

  if (piResult.success) {
    console.log('[VALVE] Open request sent successfully');
    // Pi is connected - add to pending list and wait for open valve result
    addPendingIrrigation(plant.plant_id, ws, email, {
      plant_id: plant.plant_id,
      plant_name: plant.name,
      ideal_moisture: parseFloat(plant.ideal_moisture)
    });

    console.log(`[VALVE] Added to pending: plant=${plant.plant_id} name=${plant.name} time=${timeMinutes}min`);
    // No immediate response - client will get success/failure when Pi responds with open valve result
  } else {
    console.log(`[VALVE] Error: Pi communication failed - ${piResult.error}`);
    // Pi not connected - return error 
    return sendError(ws, 'OPEN_VALVE_FAIL',
      'Pi controller not connected. Cannot open valve. Please try again when Pi is online.');
  }
}

// Close valve for a specific plant
async function handleCloseValve(data, ws, email) {
  console.log(`[VALVE] Close request received: ${JSON.stringify(data)}`);

  const { plantName } = data;
  console.log(`[VALVE] Request data: plant=${plantName}`);

  if (!plantName) {
    console.log('[IRRIGATION] Error: Missing plantName');
    return sendError(ws, 'CLOSE_VALVE_FAIL', 'Missing plantName');
  }

  console.log(`[VALVE] Validation passed: plant=${plantName}`);
  console.log(`[IRRIGATION] Looking up user: ${email}`);

  const user = await getUser(email);
  if (!user) {
    console.log(`[IRRIGATION] Error: User not found - email=${email}`);
    return sendError(ws, 'CLOSE_VALVE_FAIL', 'User not found');
  }
  console.log('DEBUG - User found:', user.id, user.email);

  console.log(`[IRRIGATION] Looking up plant: name=${plantName} user=${user.id}`);
  const plant = await getPlantByName(user.id, plantName);
  if (!plant) {
    console.log(`[IRRIGATION] Error: Plant not found - name=${plantName} user=${user.id}`);
    return sendError(ws, 'CLOSE_VALVE_FAIL', 'Plant not found in your garden');
  }

  console.log(`[VALVE] Plant found: id=${plant.plant_id} name=${plant.name} user=${plant.user_id}`);

  console.log(`[VALVE] Closing: plant=${plant.plant_id}`);

  // Best-effort: immediately clear persisted irrigation state
  try {
    const { updateIrrigationState } = require('../models/plantModel');
    await updateIrrigationState(plant.plant_id, { mode: 'none', startAt: null, endAt: null, sessionId: null });
  } catch (e) {
    console.log(`[VALVE] Warning: Failed to clear state - ${e?.message}`);
  }

  // Send close valve request to Pi controller
  const piResult = piCommunication.closeValve(plant.plant_id);

  console.log(`[VALVE] Close result: ${JSON.stringify(piResult)}`);

  if (piResult.success) {
    console.log('[VALVE] Close request sent successfully');
    // Pi is connected - add to pending list and wait for close valve result
    addPendingIrrigation(plant.plant_id, ws, email, {
      plant_id: plant.plant_id,
      plant_name: plant.name,
      ideal_moisture: plant.ideal_moisture
    });

    console.log(`[VALVE] Added to pending: plant=${plant.plant_id} name=${plant.name}`);
    // No immediate response - client will get success/failure when Pi responds with close valve result
  } else {
    console.log(`[VALVE] Error: Pi communication failed - ${piResult.error}`);
    // Pi not connected - return error 
    return sendError(ws, 'CLOSE_VALVE_FAIL',
      'Pi controller not connected. Cannot close valve. Please try again when Pi is online.');
  }
}

// Restart valve (attempt to unblock and test)
async function handleRestartValve(data, ws, email) {
  const { plantName } = data;
  if (!plantName) return sendError(ws, 'RESTART_VALVE_FAIL', 'Missing plantName');
  const user = await getUser(email);
  if (!user) return sendError(ws, 'RESTART_VALVE_FAIL', 'User not found');
  const plant = await require('../models/plantModel').getPlantByName(user.id, plantName);
  if (!plant) return sendError(ws, 'RESTART_VALVE_FAIL', 'Plant not found');

  // Disallow during active irrigation (best-effort check is on Pi too)
  // Forward to Pi
  const result = require('../services/piCommunication').restartValve(plant.plant_id);
  if (!result.success) {
    return sendError(ws, 'RESTART_VALVE_FAIL', result.error || 'Pi not connected');
  }

  // Track pending using irrigation tracker to route response
  const { addPendingIrrigation } = require('../services/pendingIrrigationTracker');
  addPendingIrrigation(plant.plant_id, ws, email, { plant_id: plant.plant_id, plant_name: plant.name });
}

// Get irrigation result for a specific plant
async function handleGetIrrigationResult(data, ws, email) {
  console.log(`[IRRIGATION] Get result request: ${JSON.stringify(data)}`);
  const { plantName } = data;

  if (!plantName) {
    console.log('[IRRIGATION] Error: Missing plantName');
    return sendError(ws, 'GET_IRRIGATION_RESULT_FAIL', 'Missing plantName');
  }

  const user = await getUser(email);
  if (!user) {
    console.log(`[IRRIGATION] Error: User not found - email=${email}`);
    return sendError(ws, 'GET_IRRIGATION_RESULT_FAIL', 'User not found');
  }

  const plant = await getPlantByName(user.id, plantName);
  if (!plant) {
    console.log(`[IRRIGATION] Error: Plant not found - name=${plantName} user=${user.id}`);
    return sendError(ws, 'GET_IRRIGATION_RESULT_FAIL', 'Plant not found in your garden');
  }

  console.log(`[IRRIGATION] Getting results: plant=${plant.plant_id}`);
  const results = await irrigationModel.getIrrigationResultsByPlantId(plant.plant_id);
  console.log(`[IRRIGATION] Found ${results.length} results`);

  sendSuccess(ws, 'GET_IRRIGATION_RESULT_SUCCESS', {
    plantName: plantName,
    results: results
  });
  console.log(`[IRRIGATION] Sent results: plant=${plantName}`);
}

// Get valve status for debugging
async function handleGetValveStatus(data, ws, email) {
  console.log(`[VALVE] Status request received: ${JSON.stringify(data)}`);

  const { plantName } = data;

  if (!plantName) {
    return sendError(ws, 'GET_VALVE_STATUS_FAIL', 'Missing plantName');
  }

  const user = await getUser(email);
  if (!user) {
    return sendError(ws, 'GET_VALVE_STATUS_FAIL', 'User not found');
  }

  const plant = await getPlantByName(user.id, plantName);
  if (!plant) {
    return sendError(ws, 'GET_VALVE_STATUS_FAIL', 'Plant not found in your garden');
  }

  // Get valve status from Pi controller
  const piResult = piCommunication.getValveStatus(plant.plant_id);

  if (piResult.success) {
    console.log('[VALVE] Status request sent successfully');

    // Pi is connected - add to pending list and wait for valve status result
    addPendingIrrigation(plant.plant_id, ws, email, {
      plant_id: plant.plant_id,
      plant_name: plant.name,
      request_type: 'GET_VALVE_STATUS'
    });

    console.log(`[VALVE] Added to pending: plant=${plant.plant_id} name=${plant.name} type=status`);
    // No immediate response - client will get status when Pi responds
  } else {
    console.log(`[VALVE] Error: Failed to get status - ${piResult.error}`);
    return sendError(ws, 'GET_VALVE_STATUS_FAIL',
      'Pi controller not connected. Cannot get valve status. Please try again when Pi is online.');
  }
}

// Unblock valve for a specific plant
async function handleUnblockValve(data, ws, email) {
  const { plantName } = data;
  if (!plantName) return sendError(ws, 'UNBLOCK_VALVE_FAIL', 'Missing plantName');

  const user = await getUser(email);
  if (!user) return sendError(ws, 'UNBLOCK_VALVE_FAIL', 'User not found');

  const plant = await getPlantByName(user.id, plantName);
  if (!plant) return sendError(ws, 'UNBLOCK_VALVE_FAIL', 'Plant not found');

  try {
    // Update valve status in database
    const { updateValveStatus } = require('../models/plantModel');
    await updateValveStatus(plant.plant_id, false);

    console.log(`[VALVE] Unblocked: plant=${plant.plant_id} name=${plant.name}`);

    sendSuccess(ws, 'UNBLOCK_VALVE_SUCCESS', {
      message: `Valve for "${plant.name}" has been unblocked successfully!`,
      plantName: plant.name
    });

    // Broadcast unblocked to other garden members
    try {
      const { broadcastToGarden } = require('../services/gardenBroadcaster');
      if (plant.garden_id) {
        await broadcastToGarden(plant.garden_id, 'GARDEN_VALVE_UNBLOCKED', { plantId: plant.plant_id }, email);
      }
    } catch (e) {
      console.log(`[VALVE] Warning: Failed to broadcast unblock - ${e?.message}`);
    }

  } catch (err) {
    console.log(`[VALVE] Error: Failed to unblock plant=${plant.plant_id} - ${err.message}`);
    sendError(ws, 'UNBLOCK_VALVE_FAIL', 'Failed to unblock valve. Please try again.');
  }
}

// Test valve block for a specific plant (for testing purposes)
async function handleTestValveBlock(data, ws, email) {
  const { plantName } = data;
  if (!plantName) return sendError(ws, 'TEST_VALVE_BLOCK_FAIL', 'Missing plantName');

  const user = await getUser(email);
  if (!user) return sendError(ws, 'TEST_VALVE_BLOCK_FAIL', 'User not found');

  const plant = await getPlantByName(user.id, plantName);
  if (!plant) return sendError(ws, 'TEST_VALVE_BLOCK_FAIL', 'Plant not found');

  try {
    // Update valve status in database to blocked (for testing)
    const { updateValveStatus } = require('../models/plantModel');
    await updateValveStatus(plant.plant_id, true);

    console.log(`[VALVE] Test block: plant=${plant.plant_id} name=${plant.name}`);

    sendSuccess(ws, 'TEST_VALVE_BLOCK_SUCCESS', {
      message: `Valve for "${plant.name}" has been blocked for testing. Refresh the plant list to see the changes.`,
      plantName: plant.name
    });

  } catch (err) {
    console.log(`[VALVE] Error: Failed to test block plant=${plant.plant_id} - ${err.message}`);
    sendError(ws, 'TEST_VALVE_BLOCK_FAIL', 'Failed to test valve block. Please try again.');
  }
}

module.exports = {
  handleIrrigationMessage,
  handleTestValveBlock
};