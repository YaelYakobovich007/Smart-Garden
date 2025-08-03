/**
 * WebSocket Service - Real-time Communication Handler
 * 
 * This service manages the WebSocket connection between the client and server.
 * It handles:
 * - Connection establishment and reconnection logic
 * - Message sending and receiving
 * - Connection status monitoring
 * - Automatic reconnection with exponential backoff
 * 
 * The service provides a robust communication layer for real-time features
 * like plant monitoring, weather updates, and irrigation commands.
 */

// WebSocket server configuration
const WS_CONFIG = {
  // Change this to your server's IP address or hostname
  // For local development, use 'localhost'
  // For production, use your server's actual IP address
  SERVER_URL: 'ws://192.168.68.69:8080',
  
  // Alternative configurations for different environments:
  // LOCAL: 'ws://localhost:8080'
  // PRODUCTION: 'ws://your-server-ip:8080'
  // DOCKER: 'ws://host.docker.internal:8080'
};

class WebSocketService {
  /**
   * Initialize the WebSocket service with default configuration
   * Sets up connection state, message handlers, and reconnection settings
   */
  constructor() {
    this.ws = null; // WebSocket instance
    this.connected = false; // Connection status flag
    this.messageHandlers = new Map(); // Registered message handlers
    this.connectionHandlers = []; // Connection status change handlers
    this.reconnectAttempts = 0; // Current reconnection attempt count
    this.maxReconnectAttempts = 5; // Maximum reconnection attempts
    this.reconnectDelay = 1000; // Initial reconnection delay (1 second)
    this.reconnectTimer = null; // Timer for reconnection attempts
    this.isReconnecting = false; // Flag to prevent multiple reconnection attempts
  }

  /**
   * Establish WebSocket connection to the server
   * Handles connection setup, event listeners, and initial handshake
   */
  connect() {
    // Prevent multiple connection attempts
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      console.log('WebSocket already connected');
      return;
    }

    if (this.isReconnecting) {
      console.log('Already attempting to reconnect...');
      return;
    }

    console.log('Connecting to WebSocket server...');
    this.ws = new WebSocket(WS_CONFIG.SERVER_URL);

    /**
     * Handle successful WebSocket connection
     * Resets reconnection state and sends initial handshake message
     */
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

    /**
     * Handle incoming WebSocket messages
     * Parses JSON messages and routes them to appropriate handlers
     */
    this.ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        console.log('Received message:', data);

        // Handle connection success confirmation from server
        if (data.type === 'CONNECTION_SUCCESS') {
          this.connected = true;
          this.connectionHandlers.forEach(handler => handler(true));
          console.log('User connection confirmed by server');
        }

        // Call registered message handlers for specific message types
        if (this.messageHandlers.has(data.type)) {
          this.messageHandlers.get(data.type)(data);
        }
      } catch (error) {
        console.error('Error parsing WebSocket message:', error);
      }
    };

    /**
     * Handle WebSocket errors
     * Logs errors but doesn't immediately mark as disconnected
     * to prevent rapid connection/disconnection cycles
     */
    this.ws.onerror = (error) => {
      console.error('WebSocket error:', error);
      // Don't immediately mark as disconnected on error - let onclose handle it
      // This prevents rapid connection/disconnection cycles
    };

    /**
     * Handle WebSocket connection closure
     * Manages reconnection logic and notifies handlers of disconnection
     */
    this.ws.onclose = (event) => {
      console.log('WebSocket disconnected, code:', event.code, 'reason:', event.reason);
      this.connected = false;
      this.connectionHandlers.forEach(handler => handler(false));

      // Only attempt to reconnect if not a clean close and we haven't reached max attempts
      if (event.code !== 1000 && !this.isReconnecting && this.reconnectAttempts < this.maxReconnectAttempts) {
        this.attemptReconnect();
      }
    };
  }

  /**
   * Attempt to reconnect to the WebSocket server
   * Uses exponential backoff to prevent overwhelming the server
   */
  attemptReconnect() {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.log('Max reconnection attempts reached');
      return;
    }

    this.isReconnecting = true;
    this.reconnectAttempts++;

    console.log(`Attempting to reconnect (${this.reconnectAttempts}/${this.maxReconnectAttempts}) in ${this.reconnectDelay}ms...`);

    // Clear any existing timer
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
    }

    this.reconnectTimer = setTimeout(() => {
      this.isReconnecting = false; // Reset flag before attempting connection
      this.connect();
    }, this.reconnectDelay);

    // Exponential backoff with jitter to prevent thundering herd
    this.reconnectDelay = Math.min(this.reconnectDelay * 1.5, 30000); // Max 30 seconds
  }

  /**
   * Cleanly disconnect from the WebSocket server
   * Clears timers and resets connection state
   */
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

  /**
   * Send a message to the WebSocket server
   * Only sends if connection is open, otherwise logs the attempt
   */
  send(message) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(message));
    } else {
      console.log('WebSocket not connected, message queued for when connection is restored');
      // Don't immediately try to reconnect on every send - let the existing reconnection logic handle it
      // This prevents spam reconnection attempts when the server is down
    }
  }

 
  //send message to server 
  sendMessage(message) {
    this.send(message);
  }

  /**
   * Register a message handler for a specific message type
   * @param {string} type - The message type to handle
   * @param {function} handler - The handler function to call
   */
  onMessage(type, handler) {
    this.messageHandlers.set(type, handler);
  }

  /**
   * Remove a message handler for a specific message type
   * Only removes if the handler matches the currently registered one
   * @param {string} type - The message type
   * @param {function} handler - The handler function to remove
   */
  offMessage(type, handler) {
    // Only remove if the handler matches the currently registered one
    if (this.messageHandlers.get(type) === handler) {
      this.messageHandlers.delete(type);
    }
  }

  /**
   * Register a connection status change handler
   * @param {function} handler - The handler function to call on connection changes
   */
  onConnectionChange(handler) {
    this.connectionHandlers.push(handler);
  }

  /**
   * Remove a connection status change handler
   * @param {function} handler - The handler function to remove
   */
  offConnectionChange(handler) {
    const index = this.connectionHandlers.indexOf(handler);
    if (index > -1) {
      this.connectionHandlers.splice(index, 1);
    }
  }

  /**
   * Check if the WebSocket is currently connected
   * @returns {boolean} True if connected and ready
   */
  isConnected() {
    return this.connected && this.ws && this.ws.readyState === WebSocket.OPEN;
  }
}

// Create and export a singleton instance
const websocketService = new WebSocketService();
export default websocketService; 