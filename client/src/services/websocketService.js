class WebSocketService {
  constructor() {
    this.ws = null;
    this.connected = false;
    this.messageHandlers = new Map();
    this.connectionHandlers = [];
  }

  connect() {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      console.log('WebSocket already connected');
      return;
    }

    console.log('Connecting to WebSocket server...');
    this.ws = new WebSocket('ws://192.168.68.104:8080');

    this.ws.onopen = () => {
      console.log('WebSocket connected, sending HELLO_USER...');
      this.ws.send(JSON.stringify({ type: 'HELLO_USER' }));
    };

    this.ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        console.log('Received message:', data);

        // Handle connection success
        if (data.type === 'CONNECTION_SUCCESS') {
          this.connected = true;
          this.connectionHandlers.forEach(handler => handler(true));
          console.log('User connection confirmed by server');
        }

        // Call registered message handlers
        if (this.messageHandlers.has(data.type)) {
          this.messageHandlers.get(data.type)(data);
        }
      } catch (error) {
        console.error('Error parsing WebSocket message:', error);
      }
    };

    this.ws.onerror = (error) => {
      console.error('WebSocket error:', error);
      this.connected = false;
      this.connectionHandlers.forEach(handler => handler(false));
    };

    this.ws.onclose = () => {
      console.log('WebSocket disconnected');
      this.connected = false;
      this.connectionHandlers.forEach(handler => handler(false));
    };
  }

  send(message) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(message));
    } else {
      console.error('WebSocket not connected');
    }
  }

  sendMessage(message) {
    this.send(message);
  }

  onMessage(type, handler) {
    this.messageHandlers.set(type, handler);
  }

  onConnectionChange(handler) {
    this.connectionHandlers.push(handler);
  }

  isConnected() {
    return this.connected;
  }
}

const websocketService = new WebSocketService();
export default websocketService; 