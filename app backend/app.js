const WebSocket = require('ws');

// Start WebSocket server for communication with clients
const wss = new WebSocket.Server({ port: 8080 });
const { handleAuthMessage } = require('./controllers/authController');

console.log('WebSocket server running on ws://localhost:8080');

const userClients = new Set();
const piClients = new Set();

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

      if (data.type === 'REGISTER') {
        handleAuthMessage(data, ws);
        return;
      }

      if (data.type === 'HELLO_PI') {
        piClients.add(ws);
        ws.send(JSON.stringify({ type: 'WELCOME', message: 'Hello, Raspberry Pi!' }));
      }
    });
  
    ws.on('close', () => {
      userClients.delete(ws);
      piClients.delete(ws);
      console.log('Client disconnected');
    });
  });






/* const express = require('express');
const WebSocket = require('ws');
const { setPiSocket } = require('./ws/piConnection');
const plantRoutes = require('./routes/plantRoutes');

const app = express();
const PORT = 3000;

app.use(express.json());
app.use('/api', plantRoutes);

// Start HTTP server
app.listen(PORT, () => {
    console.log(`🚀 HTTP server listening on port ${PORT}`);
});

// Start WebSocket server for Pi
const wss = new WebSocket.Server({ port: 3001 });

wss.on('connection', (ws) => {
    console.log('📡 Raspberry Pi connected via WebSocket');

    ws.on('message', (msg) => {
        const data = JSON.parse(msg);
        if (data.type === 'register_pi') {
            setPiSocket(ws);
            console.log('✅ Raspberry Pi registered!');
        } else {
            console.log('📩 Message from Pi:', data);
        }
    });

    ws.on('close', () => {
        console.log('🔌 Raspberry Pi disconnected');
        setPiSocket(null);
    });
}); */
