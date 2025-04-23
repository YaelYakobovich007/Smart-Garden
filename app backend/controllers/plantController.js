// plantController.js
const { addPlant, getPlants } = require('../models/plantModel');
const { sendSuccess, sendError } = require('../utils/wsResponses');

function handlePlantMessage(data, ws, loggedInUsers) {
  try {
    const email = loggedInUsers.get(ws);

    if (!email) {
      sendError(ws, 'UNAUTHORIZED', 'User must be logged in to manage plants');
      return;
    }

    if (data.type === 'ADD_PLANT') {
        return handleAddPlant(data, ws, email);
    }

    if (data.type === 'GET_MY_PLANTS') {
        return handleGetMyPlants(ws, email);
    } 
     
  } catch (err) {
    console.error('Plant message handling error:', err);
    sendError(ws, 'PLANT_ERROR', 'Internal server error while processing plant request');
  }
}

function handleAddPlant(data, ws, email) {
    const { name, idealMoisture } = data;
  
    if (!name || idealMoisture == null) {
      sendError(ws, 'ADD_PLANT_FAIL', 'Missing plant data');
      return;
    }
  
    const plant = addPlant(email, { name, idealMoisture });
    sendSuccess(ws, 'ADD_PLANT_SUCCESS', { plant });
}
  
function handleGetMyPlants(ws, email) {
    const plants = getPlants(email);
    sendSuccess(ws, 'MY_PLANTS', { plants });
}    
  
module.exports = {
  handlePlantMessage
};
