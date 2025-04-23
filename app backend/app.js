require('dotenv').config();

// Start WebSocket server for communication with clients
const WebSocket = require('ws');
const wss = new WebSocket.Server({ port: 8080 });

const { handleAuthMessage } = require('./controllers/authController');
const { handlePlantMessage } = require('./controllers/plantController');


console.log('WebSocket server running on ws://localhost:8080');

const piClients = new Set();
const loggedInUsers = new Map();

wss.on('connection', (ws) => {
    console.log('New client connected');
  
    ws.on('message', (message) => {
      let data;
      try {
        data = JSON.parse(message);
      } catch (err) {
        console.log('Invalid JSON:', message);
        return;
      }
  
      console.log('Message:', data);

      if (['REGISTER', 'LOGIN', 'LOGIN_GOOGLE'].includes(data.type)) {
        handleAuthMessage(data, ws, loggedInUsers);
        return;
      }

      if (['ADD_PLANT', 'GET_MY_PLANTS'].includes(data.type)) {
        handlePlantMessage(data, ws, loggedInUsers);
        return;
      }
      
      if (data.type === 'HELLO_PI') {
        piClients.add(ws);
        ws.send(JSON.stringify({ type: 'WELCOME', message: 'Hello, Raspberry Pi!' }));
      }
    });
  
    ws.on('close', () => {
      piClients.delete(ws);
      loggedInUsers.delete(ws);
      console.log('Client disconnected');
    });
  });

