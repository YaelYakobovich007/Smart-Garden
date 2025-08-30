/**
 * Service to track irrigation requests waiting for Pi controller responses
 * Maps plant_id to client websocket and user email for delayed response
 */

const pendingIrrigations = new Map(); // Map<plant_id, { ws, email, plantData, timestamp }>

/**
 * Add an irrigation request to pending list while waiting for Pi response
 * @param {number} plantId - The plant ID
 * @param {WebSocket} ws - Client websocket to respond to 
 * @param {string} email - User email
 * @param {Object} plantData - Plant data to include in response
 */
function addPendingIrrigation(plantId, ws, email, plantData) {
    const id = Number(plantId);
    pendingIrrigations.set(id, {
        ws,
        email,
        plantData,
        timestamp: Date.now()
    });

    console.log(`[PENDING] Added irrigation request: plant=${id} total=${pendingIrrigations.size}`);
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
        console.log(`[PENDING] Completed irrigation: plant=${id} remaining=${pendingIrrigations.size}`);
        return pendingInfo;
    }

    console.log(`[PENDING] Not found: plant=${id}`);
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
            console.log(`[PENDING] Cleaned old request: plant=${plantId}`);
        }
    }

    if (cleanedCount > 0) {
        console.log(`[PENDING] Cleanup complete: removed=${cleanedCount}`);
    }
}

// Clean up old pending irrigations every minute
setInterval(cleanupOldPendingIrrigations, 60 * 1000);

module.exports = {
    addPendingIrrigation,
    getPendingIrrigation,
    completePendingIrrigation,
    isPendingIrrigation,
    getPendingIrrigationIds
};