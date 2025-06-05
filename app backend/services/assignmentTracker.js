const assignedParts = new Map();

function updateAssignedParts(plantId, update, callback) {
  const current = assignedParts.get(plantId) || {};
  const merged = { ...current, ...update };
  assignedParts.set(plantId, merged);

  if (merged.sensorId && merged.valveId && merged.email) {
    callback(plantId, merged);
    assignedParts.delete(plantId);
  }
}

module.exports = { updateAssignedParts };
