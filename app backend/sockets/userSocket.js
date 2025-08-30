const { handleAuthMessage } = require('../controllers/authController');
const { handlePlantMessage } = require('../controllers/plantController');
const { handleGetWeather } = require('../controllers/weatherController');
const { sendError, sendSuccess } = require('../utils/wsResponses');
const { removeUserSession } = require('../models/userSessions');
const { handleIrrigationMessage } = require('../controllers/irrigationController');
const { handleUserMessage } = require('../controllers/userController');
const { handlePlantIdentify } = require('../controllers/plantIdentificationController');
const { handleGardenMessage } = require('../controllers/gardenController');
const { handleArticleMessage } = require('../controllers/articleController');


function handleUserSocket(ws) {
  console.log('USER connected');
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

    // Heartbeat
    if (data.type === 'PING') {
      return sendSuccess(ws, 'PONG', { ts: Date.now() });
    }

    if (['REGISTER', 'LOGIN', 'LOGIN_GOOGLE'].includes(data.type)) {
      handleAuthMessage(data, ws);
    } else if (data.type === 'GET_WEATHER') {
      handleGetWeather(ws);
    } else if (data.type === 'PLANT_IDENTIFY') {
      console.log('Received PLANT_IDENTIFY message in userSocket');
      handlePlantIdentify(data, ws);
    } else if (['UPDATE_PLANT_SCHEDULE', 'GET_IRRIGATION_RESULT', 'IRRIGATE_PLANT', 'STOP_IRRIGATION', 'OPEN_VALVE', 'CLOSE_VALVE', 'GET_VALVE_STATUS', 'UNBLOCK_VALVE', 'TEST_VALVE_BLOCK', 'RESTART_VALVE'].includes(data.type)) {
      handleIrrigationMessage(data, ws);
    } else if (['GET_USER_DETAILS', 'GET_USER_NAME', 'UPDATE_USER_DETAILS', 'FORGOT_PASSWORD', 'RESET_PASSWORD', 'VALIDATE_RESET_TOKEN'].includes(data.type)) {
      handleUserMessage(data, ws);
    } else if (['ADD_PLANT', 'GET_MY_PLANTS', 'GET_PLANT_DETAILS', 'DELETE_PLANT', 'UPDATE_PLANT_DETAILS', 'GET_PLANT_MOISTURE', 'GET_ALL_PLANTS_MOISTURE'].includes(data.type)) {
      handlePlantMessage(data, ws);
    } else if (['CREATE_GARDEN', 'GET_USER_GARDENS', 'GET_GARDEN_DETAILS', 'SEARCH_GARDEN_BY_CODE', 'JOIN_GARDEN', 'GET_GARDEN_MEMBERS', 'LEAVE_GARDEN', 'UPDATE_GARDEN'].includes(data.type)) {
      handleGardenMessage(data, ws);
    } else if (['GET_ALL_ARTICLES', 'GET_ARTICLE_BY_ID', 'GET_ARTICLES_BY_CATEGORY', 'GET_ARTICLE_CATEGORIES'].includes(data.type)) {
      handleArticleMessage(data, ws);
    } else {
      sendError(ws, 'UNKNOWN_TYPE', `Unknown message type: ${data.type}`);
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