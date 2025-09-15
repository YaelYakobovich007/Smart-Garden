/**
 * Pending Deletion Tracker
 *
 * Tracks plant deletions that were initiated on the client and are waiting for
 * confirmation from the Pi. Stores WebSocket, email and plant snapshot.
 */
const pendingDeletions = new Map();

/** Store pending deletion request */
function storePendingDeletion(plantId, ws, email, plantData) {
    pendingDeletions.set(plantId, {
        ws,
        email,
        plantData,
        timestamp: Date.now()
    });
    console.log(`[DELETION] Added pending: plant=${plantId} name="${plantData.name}"`);
}

/** Get and remove pending deletion request */
function getPendingDeletion(plantId) {
    const pending = pendingDeletions.get(plantId);
    if (pending) {
        pendingDeletions.delete(plantId);
        console.log(`[DELETION] Retrieved pending: plant=${plantId}`);
    }
    return pending;
}

/** Clean up old pending deletions (older than 5 minutes) */
function cleanupOldDeletions() {
    const now = Date.now();
    const fiveMinutes = 5 * 60 * 1000;

    for (const [plantId, pending] of pendingDeletions.entries()) {
        if (now - pending.timestamp > fiveMinutes) {
            pendingDeletions.delete(plantId);
            console.log(`[DELETION] Cleaned old pending: plant=${plantId}`);
        }
    }
}

// Clean up old deletions every minute
setInterval(cleanupOldDeletions, 60 * 1000);

module.exports = {
    storePendingDeletion,
    getPendingDeletion,
    cleanupOldDeletions
};
