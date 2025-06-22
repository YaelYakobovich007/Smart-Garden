// plantController.js
const { addPlant, getPlants, getPlantByName } = require('../models/plantModel');
const { sendSuccess, sendError } = require('../utils/wsResponses');
const { getPiSocket } = require('../sockets/piSocket');
const { getEmailBySocket} = require('../models/userSessions');


const plantHandlers = {
  ADD_PLANT: handleAddPlant,
  GET_MY_PLANTS: handleGetMyPlants,
  GET_PLANT_DETAILS: handleGetPlantDetails
};

function handlePlantMessage(data, ws) {
  try {
    const email = getEmailBySocket(ws);
    if (!email) {
      return sendError(ws, 'UNAUTHORIZED', 'User must be logged in to manage plants');
    }

    const handler = plantHandlers[data.type];
    if (handler) {
      handler(data, ws, email);
    } else {
      sendError(ws, 'UNKNOWN_TYPE', `Unknown plant message type: ${data.type}`);
    }
  } catch (err) {
    console.error('Plant message handling error:', err);
    sendError(ws, 'PLANT_ERROR', 'Internal server error while processing plant request');
  }
}

function handleAddPlant(data, ws, email) {
    const { plantName, desiredMoisture, irrigationSchedule } = data;
  
    if (!plantName || desiredMoisture == null || !irrigationSchedule) {
      sendError(ws, 'ADD_PLANT_FAIL', 'Missing plant data');
      return;
    }
  
    const result = addPlant(email, { plantName, desiredMoisture, irrigationSchedule });
    if (result.error === 'DUPLICATE_NAME') {
      sendError(ws, 'ADD_PLANT_FAIL', 'You already have a plant with this name');
      return;
    }
    if (result.error === 'NO_HARDWARE') {
      sendError(ws, 'ADD_PLANT_FAIL', 'No available hardware for this plant');
      return;
    }

    sendSuccess(ws, 'ADD_PLANT_SUCCESS', { message: 'Plant added successfully' });
    
    //const piSocket = getPiSocket();

    //if (piSocket) {
      //piSocket.send(JSON.stringify({type: 'REQUEST_SENSOR', plantId: plant.id, needValve: true }));
    //} else {
      //console.error('Pi socket not connected, unable to send new plant data');
    //}
}

function handleGetPlantDetails(data, ws, email) {
  const { plantName } = data;
  if (!plantName) {
    sendError(ws, 'GET_PLANT_DETAILS_FAIL', 'Missing plantName');
    return;
  }
  const plant = getPlantByName(email, plantName);
  if (!plant) {
    sendError(ws, 'GET_PLANT_DETAILS_FAIL', 'Plant not found');
    return;
  }

  const simulatedMoisture = Math.floor(Math.random() * 61) + 20;
  const plantWithMoisture = { ...plant, currentMoisture: simulatedMoisture };

  sendSuccess(ws, 'PLANT_DETAILS', { plant: plantWithMoisture });
}

function handleGetMyPlants(data, ws, email) {
    const plants = getPlants(email);
    sendSuccess(ws, 'MY_PLANTS', { plants });
}    
  
module.exports = {
  handlePlantMessage
};
