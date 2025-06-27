const { handleAuthMessage } = require('../controllers/authController');
const { handlePlantMessage } = require('../controllers/plantController');
const { handleGetWeather } = require('../controllers/weatherController');
const { sendError, sendSuccess } = require('../utils/wsResponses');
const {removeUserSession} = require('../models/userSessions');
const { handleIrrigationMessage } = require('../controllers/irrigationController');
const { handleUserMessage } = require('../controllers/userController');


function handleUserSocket(ws) {
  console.log('New USER connected');
  ws.clientType = 'USER';
  
  // Send confirmation that user connection is established
  sendSuccess(ws, 'CONNECTION_SUCCESS', 'User connection established');

  ws.on('message', (msg) => {
    let data;

    try {
      data = JSON.parse(msg);
    } catch (e) {
      return sendError(ws, 'ERROR', 'Invalid JSON format');
    }
    
    if (['REGISTER', 'LOGIN', 'LOGIN_GOOGLE'].includes(data.type)) {
      handleAuthMessage(data, ws);
    } else if (data.type === 'GET_WEATHER') {
      handleGetWeather(ws); 
    } else if (['UPDATE_PLANT_SCHEDULE', 'GET_IRRIGATION_RESULT', 'IRRIGATE_PLANT'].includes(data.type)) {
      handleIrrigationMessage(data, ws);
    } else if (['GET_USER_NAME'].includes(data.type)) {
      handleUserMessage(data, ws);
    } else {
      handlePlantMessage(data, ws);
    }
  });

  ws.on('close', () => {
    console.log('USER disconnected');
    removeUserSession(ws);
  });
}

module.exports = {
  handleUserSocket
};