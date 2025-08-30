/**
 * Service to track pending moisture requests from clients
 * Maps plant_id to client WebSocket and request details
 */

const pendingMoistureRequests = new Map();

/**
 * Add a pending moisture request
 * @param {number} plantId - The plant ID
 * @param {Object} ws - Client WebSocket
 * @param {Object} requestData - Original request data
 */
function addPendingMoistureRequest(plantId, ws, requestData) {
  pendingMoistureRequests.set(plantId, {
    ws,
    requestData,
    timestamp: Date.now()
  });
  console.log(`Added pending moisture request for plant ${plantId}`);
}

/**
 * Complete a pending moisture request and return the client info
 * @param {number} plantId - The plant ID
 * @returns {Object|null} - Client info or null if not found
 */
function completePendingMoistureRequest(plantId) {
  const pendingInfo = pendingMoistureRequests.get(plantId);
  if (pendingInfo) {
    pendingMoistureRequests.delete(plantId);
    console.log(`Completed pending moisture request for plant ${plantId}`);
    return pendingInfo;
  }
  return null;
}

/**
 * Get all pending moisture request IDs
 * @returns {Array} - Array of plant IDs with pending requests
 */
function getPendingMoistureRequestIds() {
  return Array.from(pendingMoistureRequests.keys());
}

/**
 * Check if a moisture request is pending for a plant
 * @param {number} plantId - The plant ID
 * @returns {boolean} - True if request is pending
 */
function isMoistureRequestPending(plantId) {
  return pendingMoistureRequests.has(plantId);
}

/**
 * Clean up old pending requests (older than 5 minutes)
 */
function cleanupOldPendingRequests() {
  const now = Date.now();
  const fiveMinutes = 5 * 60 * 1000;

  for (const [plantId, requestInfo] of pendingMoistureRequests.entries()) {
    if (now - requestInfo.timestamp > fiveMinutes) {
      pendingMoistureRequests.delete(plantId);
      console.log(`🧹 Cleaned up old pending moisture request for plant ${plantId}`);
    }
  }
}

// Clean up old requests every 2 minutes
setInterval(cleanupOldPendingRequests, 2 * 60 * 1000);

module.exports = {
  addPendingMoistureRequest,
  completePendingMoistureRequest,
  getPendingMoistureRequestIds,
  isMoistureRequestPending,
  cleanupOldPendingRequests
}; 