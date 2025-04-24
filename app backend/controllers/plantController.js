// plantController.js
const { addPlant, getPlants } = require('../models/plantModel');
const { sendSuccess, sendError } = require('../utils/wsResponses');
const { getPiSocket } = require('../sockets/piSocket');
const { getEmailBySocket} = require('../models/userSessions');

const plantHandlers = {
  ADD_PLANT: handleAddPlant,
  GET_MY_PLANTS: handleGetMyPlants
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
    const {name, idealMoisture } = data;
  
    if (!name || idealMoisture == null) {
      sendError(ws, 'ADD_PLANT_FAIL', 'Missing plant data');
      return;
    }
  
    const plant = addPlant(email, { name, idealMoisture });
    
    sendSuccess(ws, 'ADD_PLANT_SUCCESS', { plant });
    
    const piSocket = getPiSocket();

    if (piSocket) {
      piSocket.send(JSON.stringify({type: 'REQUEST_SENSOR', plantId: plant.id, needValve: true }));
    } else {
      console.error('Pi socket not connected, unable to send new plant data');
    }
}

function handleGetMyPlants(data, ws, email) {
    const plants = getPlants(email);
    sendSuccess(ws, 'MY_PLANTS', { plants });
}    
  
module.exports = {
  handlePlantMessage
};
