/**
 * Service to track irrigation requests waiting for Pi controller responses
 * Maps plant_id to client websocket and user email for delayed response
 */

const pendingIrrigations = new Map(); // Map<plant_id, { ws, email, plantData, timestamp }>
const pendingBySession = new Map(); // Map<sessionId, { ws, email, plantId, plantData, timestamp }>

/**
 * Add an irrigation request to pending list while waiting for Pi response
 * @param {number} plantId - The plant ID
 * @param {WebSocket} ws - Client websocket to respond to 
 * @param {string} email - User email
 * @param {Object} plantData - Plant data to include in response
 */
function addPendingIrrigation(plantId, ws, email, plantData) {
    const id = Number(plantId);
    const entry = {
        ws,
        email,
        plantId: id,
        plantData,
        timestamp: Date.now()
    };
    pendingIrrigations.set(id, entry);

    console.log(`Added irrigation request for plant ${id} to pending list (count=${pendingIrrigations.size})`);
}

/**
 * Get pending irrigation info without removing from pending list
 * @param {number} plantId - The plant ID
 * @returns {Object|null} Pending irrigation info or null if not found
 */
function getPendingIrrigation(plantId) {
    const id = Number(plantId);
    const pendingInfo = pendingIrrigations.get(id);
    if (pendingInfo) {
        return pendingInfo;
    }
    return null;
}

// Session-based APIs
function addPendingSession(sessionId, plantId, ws, email, plantData) {
    if (!sessionId) return;
    const id = String(sessionId);
    pendingBySession.set(id, {
        ws,
        email,
        plantId: Number(plantId),
        plantData,
        timestamp: Date.now()
    });
}

function getPendingBySession(sessionId) {
    if (!sessionId) return null;
    return pendingBySession.get(String(sessionId)) || null;
}

function completePendingBySession(sessionId) {
    if (!sessionId) return null;
    const key = String(sessionId);
    const info = pendingBySession.get(key) || null;
    if (info) pendingBySession.delete(key);
    return info;
}

/**
 * Get pending irrigation info and remove from pending list
 * @param {number} plantId - The plant ID
 * @returns {Object|null} Pending irrigation info or null if not found
 */
function completePendingIrrigation(plantId) {
    const id = Number(plantId);
    const pendingInfo = pendingIrrigations.get(id);
    if (pendingInfo) {
        pendingIrrigations.delete(id);
        console.log(`Completed pending irrigation for plant ${id} (remaining=${pendingIrrigations.size})`);
        return pendingInfo;
    }

    console.log(`Irrigation for plant ${id} not found in pending list`);
    return null;
}

/**
 * Check if an irrigation is pending for a plant
 * @param {number} plantId - The plant ID
 * @returns {boolean} True if irrigation is pending
 */
function isPendingIrrigation(plantId) {
    return pendingIrrigations.has(Number(plantId));
}

/**
 * Get all pending irrigation plant IDs (for debugging)
 * @returns {Array} Array of pending plant IDs
 */
function getPendingIrrigationIds() {
    return Array.from(pendingIrrigations.keys());
}

/**
 * Clean up old pending irrigations (irrigations waiting more than 2 minutes)
 * This prevents memory leaks from failed/disconnected requests
 */
function cleanupOldPendingIrrigations() {
    const twoMinutesAgo = Date.now() - (2 * 60 * 1000); // 2 minutes
    let cleanedCount = 0;

    for (const [plantId, info] of pendingIrrigations.entries()) {
        if (info.timestamp < twoMinutesAgo) {
            pendingIrrigations.delete(plantId);
            cleanedCount++;
            console.log(`🧹 Cleaned up old pending irrigation for plant ${plantId}`);
        }
    }

    if (cleanedCount > 0) {
        console.log(`🧹 Cleaned up ${cleanedCount} old pending irrigations`);
    }
}

// Clean up old pending irrigations every minute
setInterval(cleanupOldPendingIrrigations, 60 * 1000);

module.exports = {
    addPendingIrrigation,
    getPendingIrrigation,
    completePendingIrrigation,
    isPendingIrrigation,
    getPendingIrrigationIds,
    addPendingSession,
    getPendingBySession,
    completePendingBySession
};