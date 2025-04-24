const WebSocket = require('ws');
const { handleSocketConnection } = require('./sockets');
const { sendSuccess, sendError } = require('./utils/wsResponses');
const wss = new WebSocket.Server({ port: 8080 });

wss.on('connection', (ws) => {
  ws.once('message', (msg) => {
    let data;
    try {
      data = JSON.parse(msg);
      handleSocketConnection(ws, data);
    } catch {
      sendError(ws, 'ERROR', 'Invalid JSON format');
      ws.close();
    }
  });
});

console.log('WebSocket server running on ws://localhost:8080');
