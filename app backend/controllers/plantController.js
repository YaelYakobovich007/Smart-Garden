const { addPlant, getPlants, getPlantByName } = require('../models/plantModel');
const { getUser } = require('../models/userModel');
const { sendSuccess, sendError } = require('../utils/wsResponses');
const { getPiSocket } = require('../sockets/piSocket');
const { getEmailBySocket } = require('../models/userSessions');

const plantHandlers = {
  ADD_PLANT: handleAddPlant,
  GET_MY_PLANTS: handleGetMyPlants,
  GET_PLANT_DETAILS: handleGetPlantDetails
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
  const { plantName, desiredMoisture, waterLimit, irrigationSchedule, plantType } = data;

  if (!plantName || desiredMoisture == null || waterLimit == null) {
    return sendError(ws, 'ADD_PLANT_FAIL', 'Missing required plant data');
  }

  // Get user from DB to get userId
  const user = await getUser(email);
  if (!user) {
    return sendError(ws, 'ADD_PLANT_FAIL', 'User not found');
  }

  const plantData = {
    name: plantName,
    desiredMoisture,
    waterLimit,
    irrigationSchedule: irrigationSchedule || null,
    plantType: plantType || null
  };

  const result = await addPlant(user.id, plantData);
  if (result.error === 'DUPLICATE_NAME') {
    return sendError(ws, 'ADD_PLANT_FAIL', 'You already have a plant with this name');
  }
  if (result.error === 'NO_HARDWARE') {
    return sendError(ws, 'ADD_PLANT_FAIL', 'No available hardware for this plant');
  }

  sendSuccess(ws, 'ADD_PLANT_SUCCESS', { message: 'Plant added successfully' });

  // Optional: Notify Pi socket
  // const piSocket = getPiSocket();
  // if (piSocket) {
  //   piSocket.send(JSON.stringify({type: 'REQUEST_SENSOR', plantId: result.plant.plant_id, needValve: true }));
  // } else {
  //   console.error('Pi socket not connected, unable to send new plant data');
  // }
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
    return sendError(ws, 'MY_PLANTS_FAIL', 'User not found');
  }

  const plants = await getPlants(user.id);
  sendSuccess(ws, 'MY_PLANTS', { plants });
}

module.exports = {
  handlePlantMessage 
}; 