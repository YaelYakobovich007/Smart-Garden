const { sendSuccess, sendError } = require('../utils/wsResponses');
let piSocket = null;

function handlePiSocket(ws) {
  piSocket = ws;
  sendSuccess(ws, 'WELCOME', { message: 'Hello Pi' });
  
  ws.on('message', (msg) => {
    let data;
    try {
      data = JSON.parse(msg);
    } catch {
      return;
    }

    if (data.type === 'SENSOR_ASSIGNED') {
      // תטפלי כאן בעדכון הצמח
    }
  });

  ws.on('close', () => {
    piSocket = null;
  });
}

function getPiSocket() {
  return piSocket;
}

module.exports = handlePiSocket;
