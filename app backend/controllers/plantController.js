const { addPlant, getPlants, getPlantByName, deletePlantById } = require('../models/plantModel');
const { getUser } = require('../models/userModel');
const { sendSuccess, sendError } = require('../utils/wsResponses');
const { getEmailBySocket } = require('../models/userSessions');
const googleCloudStorage = require('../services/googleCloudStorage');
const piCommunication = require('../services/piCommunication');
const { addPendingPlant } = require('../services/pendingPlantsTracker');
const { addPendingMoistureRequest } = require('../services/pendingMoistureTracker');
const { broadcastPlantAdded, broadcastPlantDeleted, broadcastPlantUpdated } = require('../services/gardenBroadcaster');
const { storePendingUpdate } = require('../services/pendingUpdateTracker');

// Test mode flag - set to true to allow plant creation without Pi
const TEST_MODE = false

const plantHandlers = {
  ADD_PLANT: handleAddPlant,
  GET_MY_PLANTS: handleGetMyPlants,
  GET_PLANT_DETAILS: handleGetPlantDetails,
  DELETE_PLANT: handleDeletePlant,
  UPDATE_PLANT_DETAILS: handleUpdatePlantDetails,
  GET_PLANT_MOISTURE: handleGetPlantMoisture,
  GET_ALL_PLANTS_MOISTURE: handleGetAllPlantsMoisture
};

async function handlePlantMessage(data, ws) {
  try {
    const email = getEmailBySocket(ws);
    if (!email) {
      return sendError(ws, 'UNAUTHORIZED', 'User must be logged in to manage plants');
    }

    const handler = plantHandlers[data.type];
    if (handler) {
      await handler(data, ws, email);
    } else {
      sendError(ws, 'UNKNOWN_TYPE', `Unknown plant message type: ${data.type}`);
    }
  } catch (err) {
    console.log(`[PLANT] Error handling message: ${err.message}`);
    sendError(ws, 'PLANT_ERROR', 'Internal server error while processing plant request');
  }
}

async function handleAddPlant(data, ws, email) {
  // Only support new structure with plantData and imageData
  const { plantData, imageData } = data;

  if (!plantData) {
    return sendError(ws, 'ADD_PLANT_FAIL', 'Missing plantData in request. Expected structure: { plantData: {...}, imageData: {...} }');
  }

  if (typeof plantData !== 'object') {
    return sendError(ws, 'ADD_PLANT_FAIL', 'plantData must be an object');
  }

  const { plantName, desiredMoisture, waterLimit, irrigationDays, irrigationTime, plantType, dripperType } = plantData;

  if (!plantName || desiredMoisture == null || waterLimit == null) {
    return sendError(ws, 'ADD_PLANT_FAIL', 'Missing required plant data: plantName, desiredMoisture, and waterLimit are required');
  }

  // Validate imageData structure if provided
  if (imageData && typeof imageData !== 'object') {
    return sendError(ws, 'ADD_PLANT_FAIL', 'imageData must be an object');
  }

  if (imageData && (!imageData.base64 || !imageData.filename || !imageData.mimeType)) {
    return sendError(ws, 'ADD_PLANT_FAIL', 'imageData must contain base64, filename, and mimeType');
  }

  // Get user from DB to get userId
  const user = await getUser(email);
  if (!user) {
    return sendError(ws, 'ADD_PLANT_FAIL', 'User not found');
  }

  // Process image data if provided
  let imageUrl = null;
  if (imageData) {
    try {
      console.log(`[PLANT] Processing image: plant=${plantName} file=${imageData.filename} type=${imageData.mimeType} size=${imageData.base64?.length || 0}`);

      imageUrl = await processAndSaveImage(imageData, user.id, plantName);

      console.log(`[PLANT] Image uploaded: url=${imageUrl}`);
    } catch (imageError) {
      console.log(`[PLANT] Error: Failed to process image - ${imageError.message}`);
      return sendError(ws, 'ADD_PLANT_FAIL', 'Failed to process plant image');
    }
  }

  const plantDataToSave = {
    name: plantName,
    desiredMoisture,
    waterLimit,
    irrigation_days: irrigationDays || null,
    irrigation_time: irrigationTime || null,
    plantType: plantType || null,
    dripper_type: dripperType || '2L/h', // Default to 2L/h if not provided
    image_url: imageUrl // Add image URL to plant data
  };

  // Step 1: Save plant to database WITHOUT hardware IDs (get stable plant_id)
  const result = await addPlant(user.id, plantDataToSave);

  if (result.error === 'NO_GARDEN_MEMBERSHIP') {
    return sendError(ws, 'ADD_PLANT_FAIL', 'You must join a garden before adding plants. Please create or join a garden first.');

  }

  if (result.error === 'DUPLICATE_NAME') {
    return sendError(ws, 'ADD_PLANT_FAIL', 'A plant with this name already exists in your garden');
  }

  if (result.error === 'MAX_PLANTS_REACHED') {
    return sendError(ws, 'ADD_PLANT_FAIL', 'Your garden can only have up to 2 plants connected at the same time');
  }

  console.log(`[PLANT] Saved to database: name=${plantName} id=${result.plant.plant_id}`);

  // Step 2: Handle Pi connection based on test mode
  if (TEST_MODE) {
    // Test mode: Allow plant creation without Pi
    console.log(`[PLANT] Test mode: Created without Pi - name=${plantName}`);

    const plantWithImage = {
      ...result.plant,
      image_url: imageUrl
    };

    sendSuccess(ws, 'ADD_PLANT_SUCCESS', {
      plant: plantWithImage,
      message: `Plant "${plantName}" created successfully in test mode (no hardware assignment)`,
      testMode: true
    });

    // Broadcast plant addition to other garden members
    try {
      await broadcastPlantAdded(result.plant.garden_id, plantWithImage, email);
    } catch (broadcastError) {
      console.log(`[PLANT] Error: Failed to broadcast addition - ${broadcastError.message}`);
    }
  } else {
    // Production mode: Require Pi connection
    const piResult = piCommunication.addPlant(result.plant);

    if (piResult.success) {
      // Pi is connected - add to pending list and wait for hardware assignment
      addPendingPlant(result.plant.plant_id, ws, email, {
        ...result.plant,
        image_url: imageUrl
      });

      console.log(`[PLANT] Sent to Pi: id=${result.plant.plant_id} name=${result.plant.name}`);
      // No immediate response - client will get success only after hardware assignment
    } else {
      // Pi not connected - DELETE the plant we just saved and return error
      await deletePlantById(result.plant.plant_id, user.id);
      console.log(`[PLANT] Deleted from database: id=${result.plant.plant_id} reason=pi_not_connected`);

      return sendError(ws, 'ADD_PLANT_FAIL',
        'Pi controller not connected. Cannot assign hardware to plant. Please try again when Pi is online.');
    }
  }
}

async function handleGetPlantDetails(data, ws, email) {
  const { plantName } = data;
  if (!plantName) return sendError(ws, 'GET_PLANT_DETAILS_FAIL', 'Missing plantName');
  const user = await getUser(email);
  if (!user) return sendError(ws, 'GET_PLANT_DETAILS_FAIL', 'User not found');
  const plant = await getPlantByName(user.id, plantName);
  if (!plant) return sendError(ws, 'GET_PLANT_DETAILS_FAIL', 'Plant not found');

  // Ensure schedule fields are normalized for client
  try {
    if (plant && plant.irrigation_days && typeof plant.irrigation_days === 'string') {
      try { plant.irrigation_days = JSON.parse(plant.irrigation_days); } catch { }
    }
  } catch { }
  sendSuccess(ws, 'GET_PLANT_DETAILS_RESPONSE', { plant });
}

async function handleGetMyPlants(data, ws, email) {
  const user = await getUser(email);
  if (!user) return sendError(ws, 'GET_MY_PLANTS_FAIL', 'User not found');
  const plants = await getPlants(user.id);
  // Best-effort: normalize schedule array for client
  const normalized = (plants || []).map(p => {
    if (p && p.irrigation_days && typeof p.irrigation_days === 'string') {
      try { p.irrigation_days = JSON.parse(p.irrigation_days); } catch { }
    }
    return p;
  });
  sendSuccess(ws, 'GET_MY_PLANTS_RESPONSE', { plants: normalized });
}

// Delete plant (and its irrigation events)
async function handleDeletePlant(data, ws, email) {
  const { plantName } = data;
  if (!plantName) return sendError(ws, 'DELETE_PLANT_FAIL', 'Missing plantName');

  const user = await getUser(email);
  if (!user) return sendError(ws, 'DELETE_PLANT_FAIL', 'User not found');

  const plant = await getPlantByName(user.id, plantName);
  if (!plant) return sendError(ws, 'DELETE_PLANT_FAIL', 'Plant not found');

  // Best-effort: cancel any pending trackers for this plant
  try {
    const { getPendingIrrigation } = require('../services/pendingIrrigationTracker');
    const pending = getPendingIrrigation(plant.plant_id);
    if (pending) {
      console.log(`[PLANT] Cancelling pending irrigation: plant=${plant.plant_id}`);
    }
  } catch (e) {
    console.log(`[PLANT] Warning: Failed to clear pending trackers - ${e?.message}`);
  }

  // Inform Pi (non-blocking): remove plant and free hardware
  try {
    const piResult = piCommunication.removePlant(plant.plant_id);
    if (!piResult.success) {
      console.log(`[PLANT] Warning: Failed to send remove request to Pi - ${piResult.error}`);
    }
  } catch (e) {
    console.log(`[PLANT] Error: Failed to send remove request to Pi - ${e?.message}`);
  }

  // Delete irrigation events first
  await require('../models/irrigationModel').deleteIrrigationResultsByPlantId(plant.plant_id);

  // Best-effort: clear schedule rows if you keep a separate table (ignore if not used)
  try {
    const { deleteScheduleByPlantId } = require('../models/plantScheduleModel');
    if (deleteScheduleByPlantId) {
      await deleteScheduleByPlantId(plant.plant_id);
    }
  } catch { }

  // Delete the plant with optimistic locking
  const deleteResult = await deletePlantById(plant.plant_id, user.id);

  if (deleteResult.error === 'PLANT_NOT_FOUND') {
    return sendError(ws, 'DELETE_PLANT_FAIL', 'Plant not found in your garden');
  }

  if (deleteResult.error === 'CONCURRENT_MODIFICATION') {
    return sendError(ws, 'DELETE_PLANT_FAIL', 'Plant was modified by another user. Please refresh and try again.');
  }

  if (deleteResult.error) {
    return sendError(ws, 'DELETE_PLANT_FAIL', 'Failed to delete plant. Please try again.');
  }

  sendSuccess(ws, 'DELETE_PLANT_SUCCESS', { message: 'Plant and its irrigation events deleted' });

  // Broadcast plant deletion to other garden members
  try {
    const gardenId = await require('../models/plantModel').getUserGardenId(user.id);
    if (gardenId) {
      await broadcastPlantDeleted(gardenId, plant, email);
    }
  } catch (broadcastError) {
    console.log(`[PLANT] Error: Failed to broadcast deletion - ${broadcastError.message}`);
  }
}

async function handleUpdatePlantDetails(data, ws, email) {
  try {
    console.log(`[PLANT] Update request received: ${JSON.stringify(data)}`);
    const { plantName, newPlantName, desiredMoisture, waterLimit, dripperType, imageData } = data;

    // Validate required fields
    if (!plantName) {
      return sendError(ws, 'UPDATE_PLANT_DETAILS_FAIL', 'Plant name is required');
    }

    // Validate new plant name (if provided)
    if (newPlantName && (newPlantName.trim().length < 1 || newPlantName.trim().length > 50)) {
      return sendError(ws, 'UPDATE_PLANT_DETAILS_FAIL', 'New plant name must be 1-50 characters');
    }

    // Validate desired moisture (0-100)
    if (desiredMoisture !== undefined && (desiredMoisture < 0 || desiredMoisture > 100)) {
      return sendError(ws, 'UPDATE_PLANT_DETAILS_FAIL', 'Desired moisture must be between 0-100');
    }

    // Validate water limit (positive number)
    if (waterLimit !== undefined && waterLimit <= 0) {
      return sendError(ws, 'UPDATE_PLANT_DETAILS_FAIL', 'Water limit must be a positive number');
    }

    // Validate dripper type (if provided)
    const validDripperTypes = ['2L/h', '4L/h', '8L/h'];
    if (dripperType && !validDripperTypes.includes(dripperType)) {
      return sendError(ws, 'UPDATE_PLANT_DETAILS_FAIL', 'Invalid dripper type. Must be 2L/h, 4L/h, or 8L/h');
    }

    // Get user ID from email
    const user = await getUser(email);
    if (!user) {
      return sendError(ws, 'UPDATE_PLANT_DETAILS_FAIL', 'User not found');
    }

    // Find the plant by name
    const plant = await getPlantByName(user.id, plantName);
    if (!plant) {
      return sendError(ws, 'UPDATE_PLANT_DETAILS_FAIL', 'Plant not found in your garden');
    }

    let imageUrlToSave;
    if (imageData) {
      if (typeof imageData !== 'object' || !imageData.base64 || !imageData.filename) {
        return sendError(ws, 'UPDATE_PLANT_DETAILS_FAIL', 'imageData must contain base64 and filename');
      }
      try {
        const generatedName = googleCloudStorage.generateFileName(user.id, imageData.filename);
        imageUrlToSave = await googleCloudStorage.uploadBase64Image(imageData.base64, generatedName);
      } catch (e) {
        console.log(`[PLANT] Error: Failed to update image - ${e.message}`);
        return sendError(ws, 'UPDATE_PLANT_DETAILS_FAIL', 'Failed to upload new image');
      }
    }

    // Update plant details
    const updatedPlant = await require('../models/plantModel').updatePlantDetails(user.id, plant.plant_id, {
      plantName: newPlantName?.trim(),
      desiredMoisture,
      waterLimit,
      dripperType,
      imageUrl: imageUrlToSave
    });

    if (updatedPlant.error === 'NO_GARDEN_MEMBERSHIP') {
      return sendError(ws, 'UPDATE_PLANT_DETAILS_FAIL', 'You must be a member of a garden to update plants');
    }

    if (updatedPlant.error === 'PLANT_NOT_FOUND') {
      return sendError(ws, 'UPDATE_PLANT_DETAILS_FAIL', 'Plant not found in your garden');
    }

    if (updatedPlant.error === 'DUPLICATE_NAME') {
      return sendError(ws, 'UPDATE_PLANT_DETAILS_FAIL', 'A plant with this name already exists in your garden');
    }

    if (updatedPlant.error === 'CONCURRENT_MODIFICATION') {
      return sendError(ws, 'UPDATE_PLANT_DETAILS_FAIL', 'Plant was updated by another user. Please refresh and try again.');
    }

    if (updatedPlant.error === 'DATABASE_ERROR') {
      return sendError(ws, 'UPDATE_PLANT_DETAILS_FAIL', 'Failed to update plant details. Please try again.');
    }

    if (!updatedPlant) {
      return sendError(ws, 'UPDATE_PLANT_DETAILS_FAIL', 'Update failed');
    }

    // Send update to Pi controller if plant has hardware IDs
    if (updatedPlant.sensor_port && updatedPlant.valve_id) {
      try {
        console.log(`[PLANT] Sending update to Pi: id=${updatedPlant.plant_id} name=${updatedPlant.name} moisture=${updatedPlant.ideal_moisture} limit=${updatedPlant.water_limit} dripper=${updatedPlant.dripper_type}`);

        // Ensure plant_id is available
        if (!updatedPlant.plant_id) {
          console.log(`[PLANT] Warning: Missing plant_id in update, using original: ${plant.plant_id}`);
          updatedPlant.plant_id = plant.plant_id;
        }

        // Store pending update to track the response
        storePendingUpdate(updatedPlant.plant_id, ws, email, {
          newPlantName,
          desiredMoisture,
          waterLimit,
          dripperType,
          imageData
        });

        const piResult = piCommunication.updatePlant(updatedPlant);
        if (!piResult.success) {
          console.log(`[PLANT] Warning: Failed to update on Pi - ${piResult.error}`);
          // Remove pending update since Pi update failed
          const { getPendingUpdate } = require('../services/pendingUpdateTracker');
          getPendingUpdate(updatedPlant.plant_id);
        }
      } catch (piError) {
        console.log(`[PLANT] Error: Failed to update on Pi - ${piError.message}`);
        // Remove pending update since Pi update failed
        const { getPendingUpdate } = require('../services/pendingUpdateTracker');
        getPendingUpdate(updatedPlant.plant_id);
      }
    } else {
      // Plant doesn't have hardware IDs, send success immediately
      sendSuccess(ws, 'UPDATE_PLANT_DETAILS_SUCCESS', {
        plant: updatedPlant,
        message: 'Plant details updated successfully'
      });
    }

    // Broadcast plant update to other garden members
    try {
      const gardenId = await require('../models/plantModel').getUserGardenId(user.id);
      if (gardenId) {
        await broadcastPlantUpdated(gardenId, updatedPlant, email);
      }
    } catch (broadcastError) {
      console.log(`[PLANT] Error: Failed to broadcast update - ${broadcastError.message}`);
    }

  } catch (err) {
    console.log(`[PLANT] Error: Failed to update details - ${err.message}`);
    sendError(ws, 'UPDATE_PLANT_DETAILS_FAIL', 'Failed to update plant details');
  }
}

// Updated function for image processing with Google Cloud Storage
async function processAndSaveImage(imageData, userId, plantName) {
  try {
    console.log(`[PLANT] Processing image: user=${userId} plant=${plantName}`);

    // Generate unique filename
    const fileName = googleCloudStorage.generateFileName(userId, imageData.filename);

    // Upload to Google Cloud Storage
    const imageUrl = await googleCloudStorage.uploadBase64Image(
      imageData.base64,
      fileName
    );

    console.log(`[PLANT] Image uploaded: url=${imageUrl}`);

    return imageUrl;
  } catch (error) {
    console.log(`[PLANT] Error: Failed to process and save image - ${error.message}`);
    throw new Error('Failed to upload image to cloud storage');
  }
}

// Handle request for single plant moisture
async function handleGetPlantMoisture(data, ws, email) {
  const { plantName } = data;

  if (!plantName) {
    return sendError(ws, 'GET_MOISTURE_FAIL', 'Plant name is required');
  }

  try {
    const user = await getUser(email);
    if (!user) {
      return sendError(ws, 'GET_MOISTURE_FAIL', 'User not found');
    }

    const plant = await getPlantByName(user.id, plantName);
    if (!plant) {
      return sendError(ws, 'GET_MOISTURE_FAIL', 'Plant not found');
    }

    // Add pending moisture request
    addPendingMoistureRequest(plant.plant_id, ws, data);

    // Request moisture from Pi
    const piResult = piCommunication.getMoisture(plant.plant_id);

    if (piResult.success) {
      sendSuccess(ws, 'GET_MOISTURE_SUCCESS', {
        message: 'Moisture request sent to Pi',
        plantName: plantName,
        plantId: plant.plant_id
      });
    } else {
      sendError(ws, 'GET_MOISTURE_FAIL', piResult.error || 'Failed to request moisture from Pi');
    }
  } catch (error) {
    console.log(`[PLANT] Error: Failed to get moisture - ${error.message}`);
    sendError(ws, 'GET_MOISTURE_FAIL', 'Internal server error');
  }
}

// Handle request for all plants moisture
async function handleGetAllPlantsMoisture(data, ws, email) {
  try {
    const user = await getUser(email);
    if (!user) {
      return sendError(ws, 'GET_ALL_MOISTURE_FAIL', 'User not found');
    }

    // Request all moisture from Pi
    const piResult = piCommunication.getAllMoisture();

    if (piResult.success) {
      sendSuccess(ws, 'GET_ALL_MOISTURE_SUCCESS', {
        message: 'All plants moisture request sent to Pi'
      });
    } else {
      sendError(ws, 'GET_ALL_MOISTURE_FAIL', piResult.error || 'Failed to request moisture from Pi');
    }
  } catch (error) {
    console.log(`[PLANT] Error: Failed to get all moisture - ${error.message}`);
    sendError(ws, 'GET_ALL_MOISTURE_FAIL', 'Internal server error');
  }
}

module.exports = {
  handlePlantMessage
};
