/**
 * Pending Update Tracker
 *
 * Tracks plant detail updates awaiting confirmation from the Pi.
 */
const pendingUpdates = new Map();

/** Store pending update request */
function storePendingUpdate(plantId, ws, email, updateData) {
  pendingUpdates.set(plantId, {
    ws,
    email,
    updateData,
    timestamp: Date.now()
  });
  console.log(`[UPDATE] Added pending: plant=${plantId}`);
}

/** Get and remove pending update request */
function getPendingUpdate(plantId) {
  const pending = pendingUpdates.get(plantId);
  if (pending) {
    pendingUpdates.delete(plantId);
    console.log(`[UPDATE] Retrieved pending: plant=${plantId}`);
  }
  return pending;
}

/** Clean up old pending updates (older than 5 minutes) */
function cleanupOldUpdates() {
  const now = Date.now();
  const fiveMinutes = 5 * 60 * 1000;

  for (const [plantId, pending] of pendingUpdates.entries()) {
    if (now - pending.timestamp > fiveMinutes) {
      pendingUpdates.delete(plantId);
      console.log(`[UPDATE] Cleaned old pending: plant=${plantId}`);
    }
  }
}

// Clean up old updates every minute
setInterval(cleanupOldUpdates, 60 * 1000);

module.exports = {
  storePendingUpdate,
  getPendingUpdate,
  cleanupOldUpdates
};
