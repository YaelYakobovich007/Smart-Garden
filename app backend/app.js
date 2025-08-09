require('dotenv').config();
const WebSocket = require('ws');
const { handleSocketConnection } = require('./sockets/index');
const { sendSuccess, sendError } = require('./utils/wsResponses');
const { testConnection } = require('./config/database');
// Test the database connection at startup
//const wss = new WebSocket.Server({ port: 8080 });
const port = process.env.PORT || 8080;
const wss = new WebSocket.Server({ port: port, host: '0.0.0.0' });
testConnection();

// Handle incoming WebSocket connections
wss.on('connection', (ws) => {
  console.log('New WebSocket connection established');

  ws.once('message', (msg) => {
    let data;
    try {
      data = JSON.parse(msg);
      console.log(`Received first message: ${data.type} from ${data.device_id || 'unknown device'}`);
      handleSocketConnection(ws, data);
    } catch {
      console.log('Invalid JSON received from client');
      sendError(ws, 'ERROR', 'Invalid JSON format');
      ws.close();
    }
  });

  ws.on('close', () => {
    console.log('WebSocket connection closed');
  });
});

console.log(`🚀 WebSocket server running on port ${port}`);
