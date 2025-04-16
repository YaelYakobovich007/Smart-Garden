const express = require('express');
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
});
