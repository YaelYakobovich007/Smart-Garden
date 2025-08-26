# Smart Garden Raspberry Pi Controller

This is the Raspberry Pi controller component of the Smart Garden system. It connects to the main backend server via WebSocket and handles:

- 🌱 **Plant irrigation control**
- 📊 **Sensor data collection**
- 🔗 **Real-time communication** with the main server
- ⚙️ **Hardware management** (pumps, valves, sensors)

## 🏗️ Architecture

The Pi controller acts as a **WebSocket CLIENT** that connects to the main Smart Garden server (port 8080). It does NOT run its own server.

```
[Mobile App] ←→ [Main Server:8080] ←→ [Raspberry Pi Controller]
                                              ↓
                                    [Sensors & Irrigation Hardware]
```

## 🚀 Quick Start

### 1. Install Dependencies

```bash
pip3 install -r requirements.txt
```

### 2. Update Server IP Address

Edit the server URL in `run_pi_client.py` or set environment variable:

```bash
export SMART_GARDEN_SERVER_URL="ws://YOUR_SERVER_IP:8080"
```

### 3. Run the Controller

```bash
python3 run_pi_client.py
```

Or make it executable and run:

```bash
chmod +x run_pi_client.py
./run_pi_client.py
```

## 📁 File Structure

```
controller/
├── services/
│   ├── websocket_client.py     # Main WebSocket client
│   └── weather_service.py      # Weather data service
├── hardware/                   # Hardware control modules
├── engine/                     # Irrigation engine
├── models/                     # Data models
├── handlers/                   # Message handlers
├── run_pi_client.py           # Main startup script
├── requirements.txt           # Python dependencies
└── README.md                  # This file
```

## 🔧 Configuration

### Server Connection

The default server URL is . Update this in:

- `run_pi_client.py` (line with `server_url`)
- `services/websocket_client.py` (default parameter)
- Or use environment variable: `SMART_GARDEN_SERVER_URL`

### Hardware Setup

Update the sensor and valve assignments in `run_pi_client.py`:

```python
assignments = [
    {"type": "sensor", "sensor_id": "moisture_01", "plant_id": "plant_001"},
    {"type": "valve", "valve_id": "valve_01", "plant_id": "plant_001"},
    # Add your actual hardware mappings here
]
```

## 📡 Communication Protocol

### Initial Connection

1. Pi sends `HELLO_PI` message to identify itself
2. Server responds with `WELCOME` message
3. Pi sends sensor/valve assignments
4. Ready to receive commands

### Message Types

#### From Server → Pi:

- `IRRIGATE_PLANT` - Start irrigation for specific plant
- `GET_SENSOR_DATA` - Request sensor reading

#### From Pi → Server:

- `HELLO_PI` - Initial identification
- `SENSOR_ASSIGNED` - Notify sensor assignment
- `VALVE_ASSIGNED` - Notify valve assignment
- `IRRIGATION_COMPLETE` - Confirm irrigation finished
- `SENSOR_DATA` - Send sensor readings

## 🔄 Auto-Restart Setup

To run the controller automatically on boot, create a systemd service:

```bash
sudo nano /etc/systemd/system/smart-garden-pi.service
```

```ini
[Unit]
Description=Smart Garden Pi Controller
After=network.target

[Service]
Type=simple
User=pi
WorkingDirectory=/home/pi/Smart-Garden/controller
ExecStart=/usr/bin/python3 /home/pi/Smart-Garden/controller/run_pi_client.py
Restart=always
RestartSec=10
Environment=SMART_GARDEN_SERVER_URL=ws://192.168.68.74:8080

[Install]
WantedBy=multi-user.target
```

Enable and start:

```bash
sudo systemctl enable smart-garden-pi.service
sudo systemctl start smart-garden-pi.service
```

## 🐛 Troubleshooting

### Connection Issues

1. **Check server IP**: Ensure the server URL is correct
2. **Network connectivity**: Ping the server IP
3. **Server running**: Ensure main server is running on port 8080
4. **Firewall**: Check if port 8080 is accessible

### View Logs

```bash
# Real-time logs
python3 run_pi_client.py

# System service logs
sudo journalctl -u smart-garden-pi.service -f

# Log file (if configured)
tail -f /var/log/smart_garden_pi.log
```

### Test Connection

Use the test WebSocket file to verify server connectivity:

```bash
# From project root
open test-websocket.html
```

## 🔧 Development

### Adding New Sensors

1. Add hardware interface in `hardware/` directory
2. Update message handlers in `websocket_client.py`
3. Add sensor assignment in `run_pi_client.py`

### Adding New Commands

1. Add handler in `websocket_client.py`
2. Update `_setup_handlers()` method
3. Implement hardware control logic

## 🚨 Important Notes

- **Only ONE Pi client** should connect to the server at a time
- **Update IP addresses** when network changes
- **Test irrigation** commands manually before automation
- **Monitor logs** for connection issues
- The old `pi_server/websocket_server.py` is **no longer used**

## 📞 Support

If you encounter issues:

1. Check the logs for error messages
2. Verify network connectivity
3. Ensure server is running and accessible
4. Check hardware connections
