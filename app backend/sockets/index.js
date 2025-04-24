const handleUserSocket = require('./userSocket');
const handlePiSocket = require('./piSocket');

function handleSocketConnection(ws, firstMessage) {
  if (firstMessage.type === 'HELLO_PI') {
    handlePiSocket(ws);
  } else if (firstMessage.type === 'HELLO_USER') {
    handleUserSocket(ws);
  } else {
    sendError(ws, 'ERROR', 'Unknown socket type');
    ws.close(); 
  }
}

module.exports = { handleSocketConnection };
