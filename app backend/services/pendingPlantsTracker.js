/**
 * Service to track plants waiting for hardware assignment from Pi
 * Maps plant_id to client websocket and user email for delayed response
 */

const pendingPlants = new Map(); // Map<plant_id, { ws, email, plantData, timestamp }>

/**
 * Add a plant to pending list while waiting for Pi hardware assignment
 * @param {number} plantId - The plant ID
 * @param {WebSocket} ws - Client websocket to respond to 
 * @param {string} email - User email
 * @param {Object} plantData - Plant data to include in success response
 */
function addPendingPlant(plantId, ws, email, plantData) {
    pendingPlants.set(plantId, {
        ws,
        email,
        plantData,
        timestamp: Date.now()
    });

    console.log(`[HARDWARE] Added pending plant: id=${plantId} total=${pendingPlants.size}`);
}

/**
 * Get pending plant info and remove from pending list
 * @param {number} plantId - The plant ID
 * @returns {Object|null} Pending plant info or null if not found
 */
function completePendingPlant(plantId) {
    const pendingInfo = pendingPlants.get(plantId);
    if (pendingInfo) {
        pendingPlants.delete(plantId);
        console.log(`[HARDWARE] Completed plant assignment: id=${plantId} remaining=${pendingPlants.size}`);
        return pendingInfo;
    }

    console.log(`[HARDWARE] Plant not found in pending list: id=${plantId}`);
    return null;
}

/**
 * Check if a plant is pending hardware assignment
 * @param {number} plantId - The plant ID
 * @returns {boolean} True if plant is pending
 */
function isPendingPlant(plantId) {
    return pendingPlants.has(plantId);
}

/**
 * Get all pending plants (for debugging)
 * @returns {Array} Array of pending plant IDs
 */
function getPendingPlantIds() {
    return Array.from(pendingPlants.keys());
}

/**
 * Clean up old pending plants (plants waiting more than 5 minutes)
 * This prevents memory leaks from failed/disconnected requests
 */
function cleanupOldPendingPlants() {
    const fiveMinutesAgo = Date.now() - (5 * 60 * 1000); // 5 minutes
    let cleanedCount = 0;

    for (const [plantId, info] of pendingPlants.entries()) {
        if (info.timestamp < fiveMinutesAgo) {
            pendingPlants.delete(plantId);
            cleanedCount++;
            console.log(`[HARDWARE] Cleaned old pending plant: id=${plantId}`);
        }
    }

    if (cleanedCount > 0) {
        console.log(`[HARDWARE] Cleanup complete: removed=${cleanedCount} plants`);
    }
}

// Clean up old pending plants every 2 minutes
setInterval(cleanupOldPendingPlants, 2 * 60 * 1000);

module.exports = {
    addPendingPlant,
    completePendingPlant,
    isPendingPlant,
    getPendingPlantIds
};