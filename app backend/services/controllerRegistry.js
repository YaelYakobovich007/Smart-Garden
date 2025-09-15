/**
 * Controller Registry Service
 *
 * Tracks the WebSocket for each garden's Raspberry Pi controller and provides
 * helpers to look it up, heartbeat it, and remove stale entries.
 */

const registry = new Map(); // gardenId (number) -> { ws, lastSeen, familyCode }

/** Register/replace the controller socket for a garden */
function setControllerForGarden(gardenId, ws, familyCode) {
    const key = Number(gardenId);
    const existing = registry.get(key);
    if (existing && existing.ws && existing.ws !== ws) {
        try { existing.ws.close(4001, 'Controller replaced'); } catch { }
    }
    ws._gardenId = key;
    ws._familyCode = familyCode;
    registry.set(key, { ws, lastSeen: Date.now(), familyCode });
}

/** Get raw registry entry for a garden */
function getControllerEntry(gardenId) {
    return registry.get(Number(gardenId)) || null;
}

/** Return OPEN WebSocket for a garden or null */
function getControllerSocketByGardenId(gardenId) {
    const entry = getControllerEntry(gardenId);
    if (!entry) return null;
    const { ws } = entry;
    if (!ws || ws.readyState !== 1) return null; // 1 = OPEN
    return ws;
}

/** Update lastSeen for a controller if socket matches */
function updateHeartbeat(gardenId, ws) {
    const entry = registry.get(Number(gardenId));
    if (entry && entry.ws === ws) entry.lastSeen = Date.now();
}

/** Remove controller entry for a garden (optionally only if socket matches) */
function removeControllerByGardenId(gardenId, ws) {
    const entry = registry.get(Number(gardenId));
    if (entry && (!ws || entry.ws === ws)) {
        registry.delete(Number(gardenId));
    }
}

/** Remove controller by socket reference */
function removeBySocket(ws) {
    const gid = ws?._gardenId;
    if (gid != null) {
        const entry = registry.get(Number(gid));
        if (entry && entry.ws === ws) registry.delete(Number(gid));
    }
}


module.exports = {
    setControllerForGarden,
    getControllerEntry,
    getControllerSocketByGardenId,
    updateHeartbeat,
    removeControllerByGardenId,
    removeBySocket,
};


