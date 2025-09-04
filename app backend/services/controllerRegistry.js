// Simple in-memory registry for family/garden → controller socket

const registry = new Map(); // gardenId (number) -> { ws, lastSeen, familyCode }

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

function getControllerEntry(gardenId) {
    return registry.get(Number(gardenId)) || null;
}

function getControllerSocketByGardenId(gardenId) {
    const entry = getControllerEntry(gardenId);
    if (!entry) return null;
    const { ws } = entry;
    if (!ws || ws.readyState !== 1) return null; // 1 = OPEN
    return ws;
}

function updateHeartbeat(gardenId, ws) {
    const entry = registry.get(Number(gardenId));
    if (entry && entry.ws === ws) entry.lastSeen = Date.now();
}

function removeControllerByGardenId(gardenId, ws) {
    const entry = registry.get(Number(gardenId));
    if (entry && (!ws || entry.ws === ws)) {
        registry.delete(Number(gardenId));
    }
}

function removeBySocket(ws) {
    const gid = ws?._gardenId;
    if (gid != null) {
        const entry = registry.get(Number(gid));
        if (entry && entry.ws === ws) registry.delete(Number(gid));
    }
}

// Optional stale eviction disabled to avoid unintended disconnects of active controllers.
// To re-enable, gate behind an env flag and tune timeouts conservatively.
// const STALE_MS = 15 * 60 * 1000; // 15 minutes
// if (process.env.CONTROLLER_EVICTION_ENABLED === 'true') {
//   setInterval(() => {
//     const cutoff = Date.now() - STALE_MS;
//     for (const [gid, entry] of registry.entries()) {
//       const notOpen = !entry.ws || entry.ws.readyState !== 1;
//       if (notOpen || entry.lastSeen < cutoff) {
//         try { if (entry.ws && entry.ws.readyState === 1) entry.ws.close(4000, 'Stale'); } catch { }
//         registry.delete(gid);
//       }
//     }
//   }, 30_000);
// }

module.exports = {
    setControllerForGarden,
    getControllerEntry,
    getControllerSocketByGardenId,
    updateHeartbeat,
    removeControllerByGardenId,
    removeBySocket,
};


