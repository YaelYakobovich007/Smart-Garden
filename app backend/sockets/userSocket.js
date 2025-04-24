const { handleAuthMessage } = require('../controllers/authController');
const { handlePlantMessage } = require('../controllers/plantController');
const { sendError } = require('../utils/wsResponses');
const {removeUserSession} = require('../models/userSessions');

function handleUserSocket(ws) {
  console.log('New USER connected');
  ws.clientType = 'USER';

  ws.on('message', (msg) => {
    let data;

    try {
      data = JSON.parse(msg);
    } catch (e) {
      return sendError(ws, 'ERROR', 'Invalid JSON format');
    }

    if (['REGISTER', 'LOGIN', 'LOGIN_GOOGLE'].includes(data.type)) {
      handleAuthMessage(data, ws);
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