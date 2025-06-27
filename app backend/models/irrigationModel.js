// app backend/models/irrigationModel.js
// Model for managing the irrigation_events table

const db = require('../config/database');

/**
 * Adds a new irrigation result to the irrigation_events table
 * @param {Object} irrigationResult - The irrigation result object
 * @returns {Promise<Object>} - The saved irrigation event
 */
async function addIrrigationResult(irrigationResult) {
  const {
    plant_id,
    status,
    reason,
    moisture,
    final_moisture,
    water_added_liters,
    irrigation_time,
    event_data
  } = irrigationResult;

  const query = `
    INSERT INTO irrigation_events
      (plant_id, status, reason, moisture, final_moisture, water_added_liters, irrigation_time, event_data)
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
    RETURNING *
  `;
  const values = [
    plant_id,
    status,
    reason,
    moisture,
    final_moisture,
    water_added_liters,
    irrigation_time,
    event_data ? JSON.stringify(event_data) : null
  ];
  const { rows } = await db.query(query, values);
  return rows[0];
}

/**
 * Gets all irrigation results for a specific plant by plant_id
 * @param {number} plantId - The plant's ID
 * @returns {Promise<Array>} - List of irrigation events for the plant
 */
async function getIrrigationResultsByPlantId(plantId) {
  const query = `SELECT * FROM irrigation_events WHERE plant_id = $1 ORDER BY irrigation_time DESC`;
  const { rows } = await db.query(query, [plantId]);
  return rows;
}

// Delete all irrigation events for a plant
async function deleteIrrigationResultsByPlantId(plantId) {
  await db.query('DELETE FROM irrigation_events WHERE plant_id = $1', [plantId]);
}

module.exports = {
  addIrrigationResult,
  getIrrigationResultsByPlantId,
  deleteIrrigationResultsByPlantId
};
