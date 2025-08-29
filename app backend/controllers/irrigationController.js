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

    console.log(`⏳ Irrigation request for plant ${plant.plant_id} (${plant.name}) sent to Pi controller...`);
    console.log(`📱 Will send irrigation start notification when Pi actually begins irrigation...`);
    // No immediate response - client will get IRRIGATION_STARTED when Pi actually starts irrigating
  } else {
    // Pi not connected - return error 
    return sendError(ws, 'IRRIGATE_FAIL',
      'Pi controller not connected. Cannot irrigate plant. Please try again when Pi is online.');
  }
}

// Stop smart irrigation for a specific plant
async function handleStopIrrigation(data, ws, email) {
  console.log('🛑 DEBUG - handleStopIrrigation received:', JSON.stringify(data));

  const { plantName } = data;

  if (!plantName) {
    console.log('❌ ERROR - Missing plantName');
    return sendError(ws, 'STOP_IRRIGATION_FAIL', 'Missing plantName');
  }

  console.log('🛑 DEBUG - Looking up user by email:', email);

  const user = await getUser(email);
  if (!user) {
    console.log('❌ ERROR - User not found for email:', email);
    return sendError(ws, 'STOP_IRRIGATION_FAIL', 'User not found');
  }

  console.log('🛑 DEBUG - Looking up plant by name:', plantName, 'for user:', user.id);
  const plant = await getPlantByName(user.id, plantName);
  if (!plant) {
    console.log('❌ ERROR - Plant not found:', plantName, 'for user:', user.id);
    return sendError(ws, 'STOP_IRRIGATION_FAIL', 'Plant not found');
  }

  console.log('🛑 DEBUG - Plant found:', plant.plant_id, plant.name);
  console.log('🛑 DEBUG - Calling piCommunication.stopIrrigation');

  // Best-effort: immediately clear persisted irrigation state
  try {
    const { updateIrrigationState } = require('../models/plantModel');
    await updateIrrigationState(plant.plant_id, { mode: 'none', startAt: null, endAt: null, sessionId: null });
  } catch (e) {
    console.log('Warning: failed to optimistically clear irrigation state on STOP request:', e?.message);
  }

  // Send stop irrigation request to Pi controller
  const piResult = piCommunication.stopIrrigation(plant.plant_id);

  console.log('🛑 DEBUG - piCommunication.stopIrrigation result:', piResult);

  if (piResult.success) {
    console.log('✅ Stop irrigation request sent to Pi');
    sendSuccess(ws, 'STOP_IRRIGATION_SUCCESS', {
      plantName: plantName,
      message: 'Stop request sent successfully'
    });
  } else {
    console.log('❌ Failed to send stop irrigation request:', piResult.error);
    sendError(ws, 'STOP_IRRIGATION_FAIL', piResult.error || 'Failed to stop irrigation');
  }

  // Add to pending list to handle response
  addPendingIrrigation(plant.plant_id, ws, email, {
    plant_id: plant.plant_id,
    plant_name: plant.name,
    ideal_moisture: parseFloat(plant.ideal_moisture || 0)
  });

  console.log(`⏳ Stop irrigation request for plant ${plant.plant_id} (${plant.name}) sent to Pi controller...`);
}

// Open valve for a specific duration
async function handleOpenValve(data, ws, email) {
  vLog('DEBUG - handleOpenValve received:', JSON.stringify(data));

  const { plantName, timeMinutes } = data;
  vLog('DEBUG - Extracted data:');
  vLog('   - plantName:', plantName, '(type:', typeof plantName, ')');
  vLog('   - timeMinutes:', timeMinutes, '(type:', typeof timeMinutes, ')');

  if (!plantName) {
    console.log('❌ ERROR - Missing plantName');
    return sendError(ws, 'OPEN_VALVE_FAIL', 'Missing plantName');
  }
  if (!timeMinutes || timeMinutes <= 0) {
    console.log('❌ ERROR - Invalid timeMinutes:', timeMinutes);
    return sendError(ws, 'OPEN_VALVE_FAIL', 'Invalid timeMinutes');
  }

  vLog('DEBUG - Data validation passed');
  vLog('DEBUG - Looking up user by email:', email);

  const user = await getUser(email);
  if (!user) {
    console.log('❌ ERROR - User not found for email:', email);
    return sendError(ws, 'OPEN_VALVE_FAIL', 'User not found');
  }
  vLog('DEBUG - User found:', user.id, user.email);

  vLog('DEBUG - Looking up plant by name:', plantName, 'for user:', user.id);
  const plant = await getPlantByName(user.id, plantName);
  if (!plant) {
    console.log('❌ ERROR - Plant not found:', plantName, 'for user:', user.id);
    return sendError(ws, 'OPEN_VALVE_FAIL', 'Plant not found in your garden');
  }

  vLog('DEBUG - Plant found:');
  vLog('   - plant_id:', plant.plant_id, '(type:', typeof plant.plant_id, ')');
  vLog('   - name:', plant.name);
  vLog('   - user_id:', plant.user_id);

  vLog('DEBUG - Calling piCommunication.openValve with:');
  vLog('   - plant_id:', plant.plant_id);
  vLog('   - timeMinutes:', timeMinutes);

  // Send open valve request to Pi controller
  const piResult = piCommunication.openValve(plant.plant_id, timeMinutes);

  vLog('DEBUG - piCommunication.openValve result:', piResult);

  if (piResult.success) {
    vLog('DEBUG - Pi communication successful');
    // Pi is connected - add to pending list and wait for open valve result
    addPendingIrrigation(plant.plant_id, ws, email, {
      plant_id: plant.plant_id,
      plant_name: plant.name,
      ideal_moisture: parseFloat(plant.ideal_moisture)
    });

    vLog(`Open valve request for plant ${plant.plant_id} (${plant.name}) for ${timeMinutes} minutes sent to Pi controller...`);
    vLog('DEBUG - Added to pending irrigation list');
    // No immediate response - client will get success/failure when Pi responds with open valve result
  } else {
    console.log('❌ ERROR - Pi communication failed:', piResult.error);
    // Pi not connected - return error 
    return sendError(ws, 'OPEN_VALVE_FAIL',
      'Pi controller not connected. Cannot open valve. Please try again when Pi is online.');
  }
}

// Close valve for a specific plant
async function handleCloseValve(data, ws, email) {
  console.log('🔍 DEBUG - handleCloseValve received:', JSON.stringify(data));

  const { plantName } = data;
  console.log('🔍 DEBUG - Extracted data:');
  console.log('   - plantName:', plantName, '(type:', typeof plantName, ')');

  if (!plantName) {
    console.log('❌ ERROR - Missing plantName');
    return sendError(ws, 'CLOSE_VALVE_FAIL', 'Missing plantName');
  }

  console.log('🔍 DEBUG - Data validation passed');
  console.log('🔍 DEBUG - Looking up user by email:', email);

  const user = await getUser(email);
  if (!user) {
    console.log('❌ ERROR - User not found for email:', email);
    return sendError(ws, 'CLOSE_VALVE_FAIL', 'User not found');
  }
  console.log('✅ DEBUG - User found:', user.id, user.email);

  console.log('🔍 DEBUG - Looking up plant by name:', plantName, 'for user:', user.id);
  const plant = await getPlantByName(user.id, plantName);
  if (!plant) {
    console.log('❌ ERROR - Plant not found:', plantName, 'for user:', user.id);
    return sendError(ws, 'CLOSE_VALVE_FAIL', 'Plant not found in your garden');
  }

  console.log('✅ DEBUG - Plant found:');
  console.log('   - plant_id:', plant.plant_id, '(type:', typeof plant.plant_id, ')');
  console.log('   - name:', plant.name);
  console.log('   - user_id:', plant.user_id);

  console.log('🔍 DEBUG - Calling piCommunication.closeValve with:');
  console.log('   - plant_id:', plant.plant_id);

  // Best-effort: immediately clear persisted irrigation state
  try {
    const { updateIrrigationState } = require('../models/plantModel');
    await updateIrrigationState(plant.plant_id, { mode: 'none', startAt: null, endAt: null, sessionId: null });
  } catch (e) {
    console.log('Warning: failed to optimistically clear irrigation state on CLOSE request:', e?.message);
  }

  // Send close valve request to Pi controller
  const piResult = piCommunication.closeValve(plant.plant_id);

  console.log('🔍 DEBUG - piCommunication.closeValve result:', piResult);

  if (piResult.success) {
    console.log('✅ DEBUG - Pi communication successful');
    // Pi is connected - add to pending list and wait for close valve result
    addPendingIrrigation(plant.plant_id, ws, email, {
      plant_id: plant.plant_id,
      plant_name: plant.name,
      ideal_moisture: plant.ideal_moisture
    });

    console.log(`⏳ Close valve request for plant ${plant.plant_id} (${plant.name}) sent to Pi controller...`);
    console.log('✅ DEBUG - Added to pending irrigation list');
    // No immediate response - client will get success/failure when Pi responds with close valve result
  } else {
    console.log('❌ ERROR - Pi communication failed:', piResult.error);
    // Pi not connected - return error 
    return sendError(ws, 'CLOSE_VALVE_FAIL',
      'Pi controller not connected. Cannot close valve. Please try again when Pi is online.');
  }
}

// Get irrigation result for a specific plant
async function handleGetIrrigationResult(data, ws, email) {
  console.log('🔔 Backend: handleGetIrrigationResult called with:', data);
  const { plantName } = data;

  if (!plantName) {
    console.log('🔔 Backend: Missing plantName');
    return sendError(ws, 'GET_IRRIGATION_RESULT_FAIL', 'Missing plantName');
  }

  const user = await getUser(email);
  if (!user) {
    console.log('🔔 Backend: User not found for email:', email);
    return sendError(ws, 'GET_IRRIGATION_RESULT_FAIL', 'User not found');
  }

  const plant = await getPlantByName(user.id, plantName);
  if (!plant) {
    console.log('🔔 Backend: Plant not found:', plantName, 'for user:', user.id);
    return sendError(ws, 'GET_IRRIGATION_RESULT_FAIL', 'Plant not found in your garden');
  }

  console.log('🔔 Backend: Getting irrigation results for plant:', plant.plant_id);
  const results = await irrigationModel.getIrrigationResultsByPlantId(plant.plant_id);
  console.log('🔔 Backend: Found', results.length, 'irrigation results');

  sendSuccess(ws, 'GET_IRRIGATION_RESULT_SUCCESS', {
    plantName: plantName,
    results: results
  });
  console.log('🔔 Backend: Sent GET_IRRIGATION_RESULT_SUCCESS response');
}

// Get valve status for debugging
async function handleGetValveStatus(data, ws, email) {
  console.log('🔍 DEBUG - handleGetValveStatus received:', JSON.stringify(data));

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
    console.log('✅ DEBUG - Pi communication successful for valve status');

    // Pi is connected - add to pending list and wait for valve status result
    addPendingIrrigation(plant.plant_id, ws, email, {
      plant_id: plant.plant_id,
      plant_name: plant.name,
      request_type: 'GET_VALVE_STATUS'
    });

    console.log(`⏳ Valve status request for plant ${plant.plant_id} (${plant.name}) sent to Pi controller...`);
    // No immediate response - client will get status when Pi responds
  } else {
    console.log('❌ ERROR - Pi communication failed for valve status:', piResult.error);
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

    console.log(`✅ Valve unblocked for plant ${plant.plant_id} (${plant.name})`);

    sendSuccess(ws, 'UNBLOCK_VALVE_SUCCESS', {
      message: `Valve for "${plant.name}" has been unblocked successfully!`,
      plantName: plant.name
    });

  } catch (err) {
    console.error(`Failed to unblock valve for plant ${plant.plant_id}:`, err);
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

    console.log(`✅ Valve blocked for testing - plant ${plant.plant_id} (${plant.name})`);

    sendSuccess(ws, 'TEST_VALVE_BLOCK_SUCCESS', {
      message: `Valve for "${plant.name}" has been blocked for testing. Refresh the plant list to see the changes.`,
      plantName: plant.name
    });

  } catch (err) {
    console.error(`Failed to test valve block for plant ${plant.plant_id}:`, err);
    sendError(ws, 'TEST_VALVE_BLOCK_FAIL', 'Failed to test valve block. Please try again.');
  }
}

module.exports = {
  handleIrrigationMessage,
  handleTestValveBlock
};