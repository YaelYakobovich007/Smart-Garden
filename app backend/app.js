require('dotenv').config();
const WebSocket = require('ws');
const { handleSocketConnection } = require('./sockets/index');
const { sendSuccess, sendError } = require('./utils/wsResponses');
const { testConnection } = require('./config/database');
// Test the database connection at startup
//const wss = new WebSocket.Server({ port: 8080 });
const port = process.env.PORT || 8080;

// Create WebSocket server
const wss = new WebSocket.Server({
  port: port,
  host: '0.0.0.0'
});
testConnection();

// Handle incoming WebSocket connections
wss.on('connection', (ws) => {
  console.log('[SERVER] New connection established');

  ws.once('message', (msg) => {
    let data;
    try {
      data = JSON.parse(msg);
      console.log(`[SERVER] First message: type=${data.type} device=${data.device_id || 'unknown'}`);
      handleSocketConnection(ws, data);
    } catch {
      console.log('[SERVER] Error: Invalid JSON in first message');
      sendError(ws, 'ERROR', 'Invalid JSON format');
      ws.close();
    }
  });

  ws.on('close', () => {
    console.log('[SERVER] Connection closed');
  });
});


console.log(`[SERVER] Started on port ${port}`);

