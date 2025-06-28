const hardwarePool = require('./hardwarePool');
const { pool } = require('../config/database');

// This module manages plant data storage and operations
// It uses in-memory storage for simplicity, but can be replaced with a database in production
// const plantStorage = new Map(); // Map<email, Array<Plant>>
// const plantIdIndex = new Map(); // Map<plantId, { plant, email }>

async function addPlant(userId, plantData) {
  // Check for duplicate plant name for this user
  const existing = await pool.query('SELECT plant_id FROM plants WHERE user_id = $1 AND name = $2', [userId, plantData.name]);
  if (existing.rows.length > 0) {
    return { error: 'DUPLICATE_NAME' };
  }

  // Assign hardware
  const sensorId = hardwarePool.assignSensor();
  const valveId = hardwarePool.assignValve();
  if (!sensorId || !valveId) {
    return { error: 'NO_HARDWARE' };
  }

  // Insert plant into DB
  const result = await pool.query(
    `INSERT INTO plants (user_id, name, ideal_moisture, water_limit, irrigation_days, irrigation_time, plant_type, image_url, sensor_id, valve_id, last_watered)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11) RETURNING *`,
    [
      userId,
      plantData.name,
      plantData.desiredMoisture,
      plantData.waterLimit,
      plantData.irrigation_days ? JSON.stringify(plantData.irrigation_days) : null,
      plantData.irrigation_time || null,
      plantData.plantType || null,
      plantData.image_url || null,
      sensorId,
      valveId,
      null
    ]
  );
  return { plant: result.rows[0] };
}

async function getPlantById(plantId) {
  const result = await pool.query('SELECT * FROM plants WHERE plant_id = $1', [plantId]);
  return result.rows[0] || null;
}

async function getPlantByName(userId, plantName) {
  const result = await pool.query('SELECT * FROM plants WHERE user_id = $1 AND name = $2', [userId, plantName]);
  return result.rows[0] || null;
}

async function getPlants(userId) {
  const result = await pool.query('SELECT * FROM plants WHERE user_id = $1', [userId]);
  return result.rows;
}

// Update irrigation schedule for a plant
async function updatePlantSchedule(plantId, days, time) {
  await pool.query(
    'UPDATE plants SET irrigation_days = $1, irrigation_time = $2, updated_at = CURRENT_TIMESTAMP WHERE plant_id = $3',
    [JSON.stringify(days), time, plantId]
  );
}

// Get current moisture and ideal moisture for a plant
async function getCurrentMoisture(plantId) {
  const currentMoisture = Math.floor(Math.random() * 61) + 20; // ערך אקראי בין 20 ל-80
  return currentMoisture;
  // TODO: integrate with actual hardware/logic
}

// Trigger irrigation for a plant (stub: here you can send to Pi or update status)
async function irrigatePlant(plantId) {
  // Example: just log, or send to hardware
  console.log(`Irrigation triggered for plant ${plantId}`);
  // TODO: integrate with actual hardware/logic
}

// Delete a plant by id
async function deletePlantById(plantId) {
  await pool.query('DELETE FROM plants WHERE plant_id = $1', [plantId]);
}

module.exports = {
  addPlant,
  getPlants,
  getPlantById,
  getPlantByName,
  updatePlantSchedule,
  getCurrentMoisture,
  irrigatePlant,
  deletePlantById
};
