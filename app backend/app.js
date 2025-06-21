const WebSocket = require('ws');
const { handleSocketConnection } = require('./sockets/index');
const { sendSuccess, sendError } = require('./utils/wsResponses');
<<<<<<< HEAD
const { testConnection } = require('./config/database'); 
// Test the database connection at startup
const wss = new WebSocket.Server({ port: 8080 });
testConnection();

// Handle incoming WebSocket connections
=======
const wss = new WebSocket.Server({ port: 8080 });

>>>>>>> building_Login_screen
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
