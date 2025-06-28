class WebSocketService {
  constructor() {
    this.ws = null;
    this.connected = false;
    this.messageHandlers = new Map();
    this.connectionHandlers = [];
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = 5;
    this.reconnectDelay = 1000; // Start with 1 second
    this.reconnectTimer = null;
    this.isReconnecting = false;
  }

  connect() {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      console.log('WebSocket already connected');
      return;
    }

    if (this.isReconnecting) {
      console.log('Already attempting to reconnect...');
      return;
    }

    console.log('Connecting to WebSocket server...');
    // Use your computer's IP address here
    // Replace 192.168.1.100 with your actual IP address from ipconfig
    this.ws = new WebSocket('ws://10.100.102.55:8080');

    this.ws.onopen = () => {
      console.log('WebSocket connected, sending HELLO_USER...');
      this.connected = true;
      this.isReconnecting = false;
      this.reconnectAttempts = 0;
      this.reconnectDelay = 1000; // Reset delay
      this.ws.send(JSON.stringify({ type: 'HELLO_USER' }));
      // Notify connection handlers immediately
      this.connectionHandlers.forEach(handler => handler(true));
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

    this.ws.onclose = (event) => {
      console.log('WebSocket disconnected, code:', event.code, 'reason:', event.reason);
      this.connected = false;
      this.connectionHandlers.forEach(handler => handler(false));

      // Attempt to reconnect if not a clean close
      if (event.code !== 1000 && !this.isReconnecting) {
        this.attemptReconnect();
      }
    };
  }

  attemptReconnect() {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.log('Max reconnection attempts reached');
      return;
    }

    this.isReconnecting = true;
    this.reconnectAttempts++;

    console.log(`Attempting to reconnect (${this.reconnectAttempts}/${this.maxReconnectAttempts}) in ${this.reconnectDelay}ms...`);

    this.reconnectTimer = setTimeout(() => {
      this.connect();
    }, this.reconnectDelay);

    // Exponential backoff
    this.reconnectDelay = Math.min(this.reconnectDelay * 2, 30000); // Max 30 seconds
  }

  disconnect() {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }

    this.isReconnecting = false;
    this.reconnectAttempts = 0;

    if (this.ws) {
      this.ws.close(1000, 'User initiated disconnect');
      this.ws = null;
    }
  }

  send(message) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(message));
    } else {
      console.error('WebSocket not connected, attempting to reconnect...');
      this.connect();
    }
  }

  sendMessage(message) {
    this.send(message);
  }

  onMessage(type, handler) {
    this.messageHandlers.set(type, handler);
  }

  offMessage(type, handler) {
    // Only remove if the handler matches the currently registered one
    if (this.messageHandlers.get(type) === handler) {
      this.messageHandlers.delete(type);
    }
  }

  onConnectionChange(handler) {
    this.connectionHandlers.push(handler);
  }

  offConnectionChange(handler) {
    const index = this.connectionHandlers.indexOf(handler);
    if (index > -1) {
      this.connectionHandlers.splice(index, 1);
    }
  }

  isConnected() {
    return this.connected && this.ws && this.ws.readyState === WebSocket.OPEN;
  }
}

const websocketService = new WebSocketService();
export default websocketService; 