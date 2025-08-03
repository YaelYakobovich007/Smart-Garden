const { addPlant, getPlants, getPlantByName, deletePlant } = require('../models/plantModel');
const { getUser } = require('../models/userModel');
const { sendSuccess, sendError } = require('../utils/wsResponses');
const { getPiSocket } = require('../sockets/piSocket');
const { getEmailBySocket } = require('../models/userSessions');
const googleCloudStorage = require('../services/googleCloudStorage');

const plantHandlers = {
  ADD_PLANT: handleAddPlant,
  GET_MY_PLANTS: handleGetMyPlants,
  GET_PLANT_DETAILS: handleGetPlantDetails,
  DELETE_PLANT: handleDeletePlant,
  UPDATE_PLANT_DETAILS: handleUpdatePlantDetails
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
    console.error('Plant message handling error:', err);
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

  const { plantName, desiredMoisture, waterLimit, irrigationDays, irrigationTime, plantType } = plantData;

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
      console.log('Processing image upload for plant:', plantName);
      console.log('Image data received:', {
        filename: imageData.filename,
        mimeType: imageData.mimeType,
        base64Length: imageData.base64 ? imageData.base64.length : 0
      });

      imageUrl = await processAndSaveImage(imageData, user.id, plantName);

      console.log('Image processed successfully, URL:', imageUrl);
    } catch (imageError) {
      console.error('Error processing image:', imageError);
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
    image_url: imageUrl // Add image URL to plant data
  };

  const result = await addPlant(user.id, plantDataToSave);
  if (result.error === 'DUPLICATE_NAME') {
    return sendError(ws, 'ADD_PLANT_FAIL', 'You already have a plant with this name');
  }
  if (result.error === 'NO_HARDWARE') {
    return sendError(ws, 'ADD_PLANT_FAIL', 'No available hardware for this plant');
  }

  // Return success with plant data including image URL
  sendSuccess(ws, 'ADD_PLANT_SUCCESS', {
    message: 'Plant added successfully',
    plant: {
      ...result.plant,
      image_url: imageUrl
    }
  });

  // Notify Pi socket about the new plant
  const piSocket = getPiSocket();
  if (piSocket) {
    const addPlantMessage = {
      type: 'ADD_PLANT',
      data: {
        plant_id: result.plant.plant_id,
        plant_name: plantName,
        desired_moisture: desiredMoisture,
        water_limit: waterLimit,
        irrigation_days: irrigationDays,
        irrigation_time: irrigationTime,
        plant_type: plantType || 'default',
        // Convert irrigation schedule to the format expected by Pi
        schedule_data: irrigationDays && irrigationTime ? 
          irrigationDays.map(day => ({
            day: day,
            time: irrigationTime,
            valve_number: result.plant.valve_id || 1
          })) : null
      }
    };
    
    try {
      piSocket.send(JSON.stringify(addPlantMessage));
      console.log(`Sent ADD_PLANT message to Pi for plant ${plantName} (ID: ${result.plant.plant_id})`);
    } catch (error) {
      console.error('Error sending ADD_PLANT message to Pi:', error);
    }
  } else {
    console.warn('Pi socket not connected, unable to send new plant data');
  }
}

async function handleGetPlantDetails(data, ws, email) {
  const { plantName } = data;
  if (!plantName) {
    return sendError(ws, 'GET_PLANT_DETAILS_FAIL', 'Missing plantName');
  }

  // Get user to get userId
  const user = await getUser(email);
  if (!user) {
    return sendError(ws, 'GET_PLANT_DETAILS_FAIL', 'User not found');
  }

  const plant = await getPlantByName(user.id, plantName);
  if (!plant) {
    return sendError(ws, 'GET_PLANT_DETAILS_FAIL', 'Plant not found');
  }

  const simulatedMoisture = Math.floor(Math.random() * 61) + 20;
  const plantWithMoisture = { ...plant, currentMoisture: simulatedMoisture };

  sendSuccess(ws, 'PLANT_DETAILS', { plant: plantWithMoisture });
}

async function handleGetMyPlants(data, ws, email) {
  // Get user to get userId
  const user = await getUser(email);
  if (!user) {
    return sendError(ws, 'GET_MY_PLANTS_FAIL', 'User not found');
  }

  const plants = await getPlants(user.id);
  sendSuccess(ws, 'GET_MY_PLANTS_RESPONSE', { plants });
}

// Delete plant (and its irrigation events)
async function handleDeletePlant(data, ws, email) {
  const { plantName } = data;
  if (!plantName) return sendError(ws, 'DELETE_PLANT_FAIL', 'Missing plantName');
  const user = await getUser(email);
  if (!user) return sendError(ws, 'DELETE_PLANT_FAIL', 'User not found');
  const plant = await getPlantByName(user.id, plantName);
  if (!plant) return sendError(ws, 'DELETE_PLANT_FAIL', 'Plant not found');

  // Delete irrigation events first
  await require('../models/irrigationModel').deleteIrrigationResultsByPlantId(plant.plant_id);
  // Delete the plant
  await require('../models/plantModel').deletePlantById(plant.plant_id);

  sendSuccess(ws, 'DELETE_PLANT_SUCCESS', { message: 'Plant and its irrigation events deleted' });
}

async function handleUpdatePlantDetails(data, ws, email) {
  try {
    const { plantName, newPlantName, desiredMoisture, waterLimit } = data;

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

    // Get user ID from email
    const user = await getUser(email);
    if (!user) {
      return sendError(ws, 'UPDATE_PLANT_DETAILS_FAIL', 'User not found');
    }

    // Find the plant by name
    const plant = await getPlantByName(user.id, plantName);
    if (!plant) {
      return sendError(ws, 'UPDATE_PLANT_DETAILS_FAIL', 'Plant not found');
    }

    // Update plant details
    const updatedPlant = await updatePlantDetails(user.id, plant.plant_id, {
      plantName: newPlantName?.trim(),
      desiredMoisture,
      waterLimit
    });

    if (!updatedPlant) {
      return sendError(ws, 'UPDATE_PLANT_DETAILS_FAIL', 'Update failed');
    }

    if (updatedPlant.error === 'DUPLICATE_NAME') {
      return sendError(ws, 'UPDATE_PLANT_DETAILS_FAIL', 'You already have a plant with this name');
    }

    sendSuccess(ws, 'UPDATE_PLANT_DETAILS_SUCCESS', {
      plant: updatedPlant,
      message: 'Plant details updated successfully'
    });

  } catch (err) {
    console.error('Update plant details error:', err);
    sendError(ws, 'UPDATE_PLANT_DETAILS_FAIL', 'Failed to update plant details');
  }
}

// Updated function for image processing with Google Cloud Storage
async function processAndSaveImage(imageData, userId, plantName) {
  try {
    console.log('Processing image for user:', userId, 'plant:', plantName);

    // Generate unique filename
    const fileName = googleCloudStorage.generateFileName(userId, imageData.filename);

    // Upload to Google Cloud Storage
    const imageUrl = await googleCloudStorage.uploadBase64Image(
      imageData.base64,
      fileName
    );

    console.log('Image uploaded successfully to:', imageUrl);

    return imageUrl;
  } catch (error) {
    console.error('Error in processAndSaveImage:', error);
    throw new Error('Failed to upload image to cloud storage');
  }
}

module.exports = {
  handlePlantMessage
};