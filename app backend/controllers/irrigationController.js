/**
 * Irrigation Controller
 *
 * WebSocket handlers for irrigation operations: schedule updates, smart runs,
 * manual valve open/close, diagnostics, and fetching results.
 */
const { getUser } = require('../models/userModel');
const { getPlantByName, updatePlantSchedule, getCurrentMoisture, getUserGardenId, updateIrrigationState, getPlantById, updateValveStatus } = require('../models/plantModel');
const irrigationModel = require('../models/irrigationModel');
const { sendSuccess, sendError } = require('../utils/wsResponses');
const { getEmailBySocket } = require('../models/userSessions');
const piCommunication = require('../services/piCommunication');
const { addPendingIrrigation } = require('../services/pendingIrrigationTracker');
const { getControllerSocketByGardenId } = require('../services/controllerRegistry');
const { getPiSocket } = require('../sockets/piSocket');
const { broadcastToGarden } = require('../services/gardenBroadcaster');

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
  CHECK_SENSOR_CONNECTION: handleCheckSensorConnection,
  CHECK_VALVE_MECHANISM: handleCheckValveMechanism,
  GET_IRRIGATION_RESULT: handleGetIrrigationResult,
  GET_VALVE_STATUS: handleGetValveStatus,
  UNBLOCK_VALVE: handleUnblockValve,
  TEST_VALVE_BLOCK: handleTestValveBlock,
  CHECK_POWER_SUPPLY: handleCheckPowerSupply,
  UNBLOCK_VALVE: handleUnblockValve,
  TEST_VALVE_BLOCK: handleTestValveBlock
};

/**
 * Route irrigation message after authentication.
 * @param {Object} data
 * @param {import('ws')} ws
 */
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

/**
 * Ask Pi to run a power-supply health check.
 */
async function handleCheckPowerSupply(data, ws, email) {
  const { plantName } = data;
  if (!plantName) return sendError(ws, 'CHECK_POWER_SUPPLY_FAIL', 'Missing plantName');

  const user = await getUser(email);
  if (!user) return sendError(ws, 'CHECK_POWER_SUPPLY_FAIL', 'User not found');

  const plant = await getPlantByName(user.id, plantName);
  if (!plant) return sendError(ws, 'CHECK_POWER_SUPPLY_FAIL', 'Plant not found in your garden');

  const gardenId = plant.garden_id || await getUserGardenId(user.id);
  const result = piCommunication.checkPowerSupply(plant.plant_id, gardenId);
  if (result.success) {
    const { addPendingIrrigation } = require('../services/pendingIrrigationTracker');
    addPendingIrrigation(plant.plant_id, ws, email, { plant_id: plant.plant_id, plant_name: plant.name, request_type: 'CHECK_POWER_SUPPLY' });
  } else {
    return sendError(ws, 'CHECK_POWER_SUPPLY_FAIL', 'Pi controller not connected. Please try again when Pi is online.');
  }
}

/**
 * Update schedule in DB and push the change to Pi if connected.
 */
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

  // Push updated schedule to Pi immediately if connected
  try {
    const gardenId = plant.garden_id || await getUserGardenId(user.id);
    const result = piCommunication.updatePlant(
      plant.plant_id,
      gardenId,
      {
        plant_id: plant.plant_id,
        name: plant.name,
        ideal_moisture: plant.ideal_moisture,
        water_limit: plant.water_limit,
        dripper_type: plant.dripper_type
      }
    );
    const familySocket = gardenId ? getControllerSocketByGardenId(gardenId) : null;
    const piSocket = familySocket || getPiSocket();
    if (piSocket) {
      const schedulePayload = {
        type: 'UPDATE_SCHEDULE',
        data: {
          plant_id: plant.plant_id,
          scheduleData: {
            irrigation_days: Array.isArray(days) ? days : [],
            irrigation_time: time
          }
        }
      };
      try { piSocket.send(JSON.stringify(schedulePayload)); } catch { }
    }
  } catch (e) {
  }
}

/**
 * Start smart irrigation session for a plant; tracks by sessionId.
 */
async function handleIrrigatePlant(data, ws, email) {
  const { plantName } = data;
  if (!plantName) return sendError(ws, 'IRRIGATE_FAIL', 'Missing plantName');
  const user = await getUser(email);
  if (!user) return sendError(ws, 'IRRIGATE_FAIL', 'User not found');
  const plant = await getPlantByName(user.id, plantName);
  if (!plant) return sendError(ws, 'IRRIGATE_FAIL', 'Plant not found in your garden');

  // Generate sessionId for this irrigation run
  const { v4: uuidv4 } = require('uuid');
  const sessionId = uuidv4();

  try {
    await updateIrrigationState(plant.plant_id, { mode: 'smart', startAt: new Date(), endAt: null, sessionId });
  } catch (e) {
    console.warn('Failed to persist irrigation session start:', e.message);
  }

  // Send irrigation request to Pi controller with session id
  const gardenId = plant.garden_id || await getUserGardenId(user.id);
  const piResult = piCommunication.irrigatePlant(plant.plant_id, sessionId, gardenId);

  if (piResult.success) {
    // Pi is connected - add to pending list by both plant and session
    const { addPendingSession } = require('../services/pendingIrrigationTracker');
    addPendingIrrigation(plant.plant_id, ws, email, {
      plant_id: plant.plant_id,
      plant_name: plant.name,
      ideal_moisture: parseFloat(plant.ideal_moisture)
    });
    addPendingSession(sessionId, plant.plant_id, ws, email, {
      plant_id: plant.plant_id,
      plant_name: plant.name,
      ideal_moisture: parseFloat(plant.ideal_moisture)
    });

    console.log(`Irrigation request for plant ${plant.plant_id} (${plant.name}) sent to Pi with sessionId ${sessionId}`);
    addPendingSession(sessionId, plant.plant_id, ws, email, {
      plant_id: plant.plant_id,
      plant_name: plant.name,
      ideal_moisture: parseFloat(plant.ideal_moisture)
    });

    console.log(`Irrigation request for plant ${plant.plant_id} (${plant.name}) sent to Pi with sessionId ${sessionId}`);
    sendSuccess(ws, 'IRRIGATION_REQUEST_ACCEPTED', { plantId: plant.plant_id, plantName: plant.name, sessionId });
  } else {
    return sendError(ws, 'IRRIGATE_FAIL',
      'Pi controller not connected. Cannot irrigate plant. Please try again when Pi is online.');
  }
}

/**
 * Stop any active irrigation for the plant and clear state.
 */
async function handleStopIrrigation(data, ws, email) {
  console.log(`[IRRIGATION] Stop request received: ${JSON.stringify(data)}`);

  const { plantName, plantId } = data;

  if (!plantName && (plantId == null)) {
    console.log('[IRRIGATION] Error: Missing plantName/plantId');
    return sendError(ws, 'STOP_IRRIGATION_FAIL', 'Missing plant identifier');
  }

  console.log(`[IRRIGATION] Looking up user: ${email}`);

  const user = await getUser(email);
  if (!user) {
    console.log(`[IRRIGATION] Error: User not found - email=${email}`);
    return sendError(ws, 'STOP_IRRIGATION_FAIL', 'User not found');
  }

  let plant;
  if (plantId != null) {
    console.log(`[IRRIGATION] Looking up plant by id=${plantId} user=${user.id}`);
    plant = await getPlantById(Number(plantId));
  } else {
    console.log(`[IRRIGATION] Looking up plant: name=${plantName} user=${user.id}`);
    plant = await getPlantByName(user.id, plantName);
  }
  if (!plant) {
    console.log(`[IRRIGATION] Error: Plant not found - ${plantName || plantId} user=${user.id}`);
    return sendError(ws, 'STOP_IRRIGATION_FAIL', 'Plant not found');
  }

  console.log(`[IRRIGATION] Plant found: id=${plant.plant_id} name=${plant.name}`);
  console.log('[IRRIGATION] Sending stop request to Pi');

  try {
    await updateIrrigationState(plant.plant_id, { mode: 'none', startAt: null, endAt: null, sessionId: null });
  } catch (e) {
    console.log(`[IRRIGATION] Warning: Failed to clear state - ${e?.message}`);
  }

  // Send stop irrigation request to Pi controller
  const gardenId = plant.garden_id || await getUserGardenId(user.id);
  const piResult = piCommunication.stopIrrigation(plant.plant_id, gardenId);

  console.log(`[IRRIGATION] Stop request result: ${JSON.stringify(piResult)}`);

  if (piResult.success) {
    console.log('[IRRIGATION] Stop request sent successfully');
    sendSuccess(ws, 'STOP_IRRIGATION_SUCCESS', {
      plantId: plant.plant_id,
      plantName: plant.name,
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

/**
 * Open valve manually for a duration in minutes.
 */
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
  const gardenId = plant.garden_id || await getUserGardenId(user.id);
  try {
    addPendingIrrigation(plant.plant_id, ws, email, {
      plant_id: plant.plant_id,
      plant_name: plant.name,
      ideal_moisture: parseFloat(plant.ideal_moisture)
    });
  } catch { }
  const piResult = piCommunication.openValve(plant.plant_id, timeMinutes, gardenId);

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
  } else {
    console.log(`[VALVE] Error: Pi communication failed - ${piResult.error}`);
    return sendError(ws, 'OPEN_VALVE_FAIL',
      'Pi controller not connected. Cannot open valve. Please try again when Pi is online.');
  }
}

/**
 * Close valve manually for a plant.
 */
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

  try {
    const { updateIrrigationState } = require('../models/plantModel');
    await updateIrrigationState(plant.plant_id, { mode: 'none', startAt: null, endAt: null, sessionId: null });
  } catch (e) {
    console.log(`[VALVE] Warning: Failed to clear state - ${e?.message}`);
  }

  // Send close valve request to Pi controller
  const gardenId = plant.garden_id || await getUserGardenId(user.id);
  try {
    addPendingIrrigation(plant.plant_id, ws, email, {
      plant_id: plant.plant_id,
      plant_name: plant.name,
      ideal_moisture: parseFloat(plant.ideal_moisture || 0)
    });
  } catch { }
  const piResult = piCommunication.closeValve(plant.plant_id, gardenId);

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
  } else {
    console.log(`[VALVE] Error: Pi communication failed - ${piResult.error}`);
    return sendError(ws, 'CLOSE_VALVE_FAIL',
      'Pi controller not connected. Cannot close valve. Please try again when Pi is online.');
  }
}

/**
 * Ask Pi to restart/unblock a valve; updates DB and notifies on result.
 */
async function handleRestartValve(data, ws, email) {
  const { plantName } = data;
  if (!plantName) return sendError(ws, 'RESTART_VALVE_FAIL', 'Missing plantName');
  const user = await getUser(email);
  if (!user) return sendError(ws, 'RESTART_VALVE_FAIL', 'User not found');
  const plant = await require('../models/plantModel').getPlantByName(user.id, plantName);
  if (!plant) return sendError(ws, 'RESTART_VALVE_FAIL', 'Plant not found');

  // Forward to Pi
  const gardenId = plant.garden_id || await getUserGardenId(user.id);
  const result = piCommunication.restartValve(plant.plant_id, gardenId);
  if (!result.success) {
    return sendError(ws, 'RESTART_VALVE_FAIL', result.error || 'Pi not connected');
  }

  // Track pending using irrigation tracker to route response
  addPendingIrrigation(plant.plant_id, ws, email, { plant_id: plant.plant_id, plant_name: plant.name });
}

/**
 * Return irrigation history for a plant.
 */
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

/**
 * Request current valve status from Pi.
 */
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
  const gardenId = plant.garden_id || await getUserGardenId(user.id);
  const piResult = piCommunication.getValveStatus(plant.plant_id, gardenId);

  if (piResult.success) {
    console.log('[VALVE] Status request sent successfully');

    // Pi is connected - add to pending list and wait for valve status result
    addPendingIrrigation(plant.plant_id, ws, email, {
      plant_id: plant.plant_id,
      plant_name: plant.name,
      request_type: 'GET_VALVE_STATUS'
    });

    console.log(`[VALVE] Added to pending: plant=${plant.plant_id} name=${plant.name} type=status`);
  } else {
    console.log(`[VALVE] Error: Failed to get status - ${piResult.error}`);
    return sendError(ws, 'GET_VALVE_STATUS_FAIL',
      'Pi controller not connected. Cannot get valve status. Please try again when Pi is online.');
  }
}

/**
 * Ask Pi to test sensor connectivity and return moisture/temperature.
 */
async function handleCheckSensorConnection(data, ws, email) {
  const { plantName, timeoutSeconds } = data;
  if (!plantName) return sendError(ws, 'CHECK_SENSOR_CONNECTION_FAIL', 'Missing plantName');

  const user = await getUser(email);
  if (!user) return sendError(ws, 'CHECK_SENSOR_CONNECTION_FAIL', 'User not found');

  const plant = await getPlantByName(user.id, plantName);
  if (!plant) return sendError(ws, 'CHECK_SENSOR_CONNECTION_FAIL', 'Plant not found in your garden');

  const gardenId = plant.garden_id || await getUserGardenId(user.id);
  const result = piCommunication.checkSensorConnection(plant.plant_id, Number(timeoutSeconds) || 5, gardenId);
  if (result.success) {
    const { addPendingIrrigation } = require('../services/pendingIrrigationTracker');
    addPendingIrrigation(plant.plant_id, ws, email, { plant_id: plant.plant_id, plant_name: plant.name, request_type: 'CHECK_SENSOR_CONNECTION' });
  } else {
    return sendError(ws, 'CHECK_SENSOR_CONNECTION_FAIL', 'Pi controller not connected. Please try again when Pi is online.');
  }
}

/**
 * Ask Pi to pulse the valve briefly to verify the mechanism.
 */
async function handleCheckValveMechanism(data, ws, email) {
  const { plantName, pulseSeconds } = data;
  if (!plantName) return sendError(ws, 'CHECK_VALVE_MECHANISM_FAIL', 'Missing plantName');

  const user = await getUser(email);
  if (!user) return sendError(ws, 'CHECK_VALVE_MECHANISM_FAIL', 'User not found');

  const plant = await getPlantByName(user.id, plantName);
  if (!plant) return sendError(ws, 'CHECK_VALVE_MECHANISM_FAIL', 'Plant not found in your garden');

  const gardenId = plant.garden_id || await getUserGardenId(user.id);
  const result = piCommunication.checkValveMechanism(plant.plant_id, typeof pulseSeconds === 'number' ? pulseSeconds : 0.6, gardenId);
  if (result.success) {
    const { addPendingIrrigation } = require('../services/pendingIrrigationTracker');
    addPendingIrrigation(plant.plant_id, ws, email, { plant_id: plant.plant_id, plant_name: plant.name, request_type: 'CHECK_VALVE_MECHANISM' });
  } else {
    return sendError(ws, 'CHECK_VALVE_MECHANISM_FAIL', 'Pi controller not connected. Please try again when Pi is online.');
  }
}

/**
 * Mark a valve as unblocked in DB and broadcast to garden clients.
 */
async function handleUnblockValve(data, ws, email) {
  const { plantName } = data;
  if (!plantName) return sendError(ws, 'UNBLOCK_VALVE_FAIL', 'Missing plantName');

  const user = await getUser(email);
  if (!user) return sendError(ws, 'UNBLOCK_VALVE_FAIL', 'User not found');

  const plant = await getPlantByName(user.id, plantName);
  if (!plant) return sendError(ws, 'UNBLOCK_VALVE_FAIL', 'Plant not found');

  try {
    // Update valve status in database
    await updateValveStatus(plant.plant_id, false);

    console.log(`[VALVE] Unblocked: plant=${plant.plant_id} name=${plant.name}`);

    sendSuccess(ws, 'UNBLOCK_VALVE_SUCCESS', {
      message: `Valve for "${plant.name}" has been unblocked successfully!`,
      plantName: plant.name
    });

    // Broadcast unblocked to other garden members
    try {
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

/**
 * Testing helper: mark valve as blocked in DB.
 */
async function handleTestValveBlock(data, ws, email) {
  const { plantName } = data;
  if (!plantName) return sendError(ws, 'TEST_VALVE_BLOCK_FAIL', 'Missing plantName');

  const user = await getUser(email);
  if (!user) return sendError(ws, 'TEST_VALVE_BLOCK_FAIL', 'User not found');

  const plant = await getPlantByName(user.id, plantName);
  if (!plant) return sendError(ws, 'TEST_VALVE_BLOCK_FAIL', 'Plant not found');

  try {
    // Update valve status in database to blocked (for testing)
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