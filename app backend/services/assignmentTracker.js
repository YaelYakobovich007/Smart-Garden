/**
 * Assignment Tracker Service
 *
 * Temporarily accumulates partial assignment data (sensor/valve/email) for a
 * plant. When all required fields exist, invokes the callback and clears it.
 */
const assignedParts = new Map();

/**
 * Update assignment context for a plant and call `callback` once complete.
 * @param {number} plantId
 * @param {{sensorPort?:string,valveId?:string,email?:string}} update
 * @param {(plantId:number, data:object)=>void} callback
 */
function updateAssignedParts(plantId, update, callback) {
  const current = assignedParts.get(plantId) || {};
  const merged = { ...current, ...update };
  assignedParts.set(plantId, merged);

  if (merged.sensorPort && merged.valveId && merged.email) {
    callback(plantId, merged);
    assignedParts.delete(plantId);
  }
}

module.exports = { updateAssignedParts };
