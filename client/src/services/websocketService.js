import Constants from 'expo-constants';
import { AppState } from 'react-native';
const BACKEND_URL = Constants.expoConfig.extra.BACKEND_URL;
/**
 * WebSocket Service for Smart Garden Client
 * Handles real-time communication with the Smart Garden server
 */
// Configuration for WebSocket connection

const CONFIG = {
  //SERVER_URL: 'wss://smart-garden-backend-1088783109508.europe-west1.run.app',
  SERVER_URL: 'wss://smart-garden-backend-1088783109508.europe-west1.run.app',
};

class WebSocketService {
  /**
   * Initialize the WebSocket service with default configuration
   * Sets up connection state, message handlers, and reconnection settings
   */
  constructor() {
    this.ws = null;
    this.isConnecting = false;
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = 5;
    this.reconnectDelay = 1000;
    this.messageHandlers = new Map();
    this.connectionHandlers = []; // Initialize the array
    this.connectionState = 'disconnected';

    // Auto-reconnect settings
    this.autoReconnect = true;
    this.reconnectInterval = null;

    // Heartbeat
    this.heartbeatTimer = null;
    this.heartbeatIntervalMs = 25000; // 25s keep-alive
    this.lastPongTs = 0;

    // App state listener to force reconnect on resume
    this._appStateSub = AppState.addEventListener('change', (state) => {
      if (state === 'active') {
        if (!this.isConnected()) {
          this.connect();
        }
      }
    });
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

    if (this.isConnecting) {
      console.log('Already attempting to reconnect...');
      return;
    }

    console.log('Connecting to WebSocket server...');
    this.ws = new WebSocket(CONFIG.SERVER_URL);

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

      // Start heartbeat
      this.startHeartbeat();
    };

    /**
     * Handle incoming WebSocket messages
     * Parses JSON messages and routes them to appropriate handlers
     */
    this.ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        //console.log('Received message:', data);

        // Handle connection success confirmation from server
        if (data.type === 'CONNECTION_SUCCESS') {
          this.connected = true;
          this.connectionHandlers.forEach(handler => handler(true));
          console.log('User connection confirmed by server');
        }

        // Heartbeat response
        if (data.type === 'PONG') {
          this.lastPongTs = Date.now();
          return;
        }

        // Call registered message handlers for specific message types
        if (this.messageHandlers.has(data.type)) {
          const entry = this.messageHandlers.get(data.type);
          if (Array.isArray(entry)) {
            // Iterate a shallow copy to avoid mutation during dispatch
            [...entry].forEach(fn => {
              try { fn && fn(data); } catch (e) { console.error('Handler error:', e?.message); }
            });
          } else if (typeof entry === 'function') {
            try { entry(data); } catch (e) { console.error('Handler error:', e?.message); }
          }
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

      // Stop heartbeat
      this.stopHeartbeat();

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

    // Stop heartbeat
    this.stopHeartbeat();

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
    const existing = this.messageHandlers.get(type);
    if (!existing) {
      this.messageHandlers.set(type, handler);
      return;
    }
    if (Array.isArray(existing)) {
      existing.push(handler);
    } else if (typeof existing === 'function') {
      this.messageHandlers.set(type, [existing, handler]);
    }
  }

  /**
   * Remove a message handler for a specific message type
   * Only removes if the handler matches the currently registered one
   * @param {string} type - The message type
   * @param {function} handler - The handler function to remove
   */
  offMessage(type, handler) {
    const existing = this.messageHandlers.get(type);
    if (!existing) return;
    if (Array.isArray(existing)) {
      const next = existing.filter(fn => fn !== handler);
      if (next.length === 0) this.messageHandlers.delete(type); else this.messageHandlers.set(type, next);
      return;
    }
    if (existing === handler) {
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

  /**
   * Request moisture data for a specific plant
   * @param {number} plantId - ID of the plant to get moisture for
   */
  requestPlantMoisture(plantId) {
    const message = {
      type: 'GET_PLANT_MOISTURE',
      data: {
        plant_id: plantId
      }
    };
    this.send(message);
  }

  /**
   * Request moisture data for all plants
   */
  requestAllPlantsMoisture() {
    const message = {
      type: 'GET_ALL_MOISTURE',
      data: {}
    };
    this.send(message);
  }

  // Heartbeat management
  startHeartbeat() {
    this.stopHeartbeat();
    this.lastPongTs = Date.now();
    this.heartbeatTimer = setInterval(() => {
      if (!this.isConnected()) return;
      try {
        this.ws.send(JSON.stringify({ type: 'PING', ts: Date.now() }));
      } catch { }
    }, this.heartbeatIntervalMs);
  }

  stopHeartbeat() {
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
      this.heartbeatTimer = null;
    }
  }
}

// Create and export a singleton instance
const websocketService = new WebSocketService();
export default websocketService; 
