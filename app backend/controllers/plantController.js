// plantController.js
const { addPlant, getPlants } = require('../models/plantModel');

function handlePlantMessage(data, ws, loggedInUsers) {
  try {
    const email = loggedInUsers.get(ws);

    if (!email) {
      ws.send(JSON.stringify({type: 'UNAUTHORIZED', reason: 'User must be logged in to manage plants'}));
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
    ws.send(JSON.stringify({type: 'PLANT_ERROR', reason: 'Internal server error while processing plant request'}));
  }
}

function handleAddPlant(data, ws, email) {
    const { name, idealMoisture } = data;
  
    if (!name || idealMoisture == null) {
      ws.send(JSON.stringify({ type: 'ADD_PLANT_FAIL', reason: 'Missing plant data' }));
      return;
    }
  
    const plant = addPlant(email, { name, idealMoisture });
    ws.send(JSON.stringify({ type: 'ADD_PLANT_SUCCESS', plant }));
}
  
function handleGetMyPlants(ws, email) {
    const plants = getPlants(email);
    ws.send(JSON.stringify({ type: 'MY_PLANTS', plants }));
}    
  
module.exports = {
  handlePlantMessage
};
