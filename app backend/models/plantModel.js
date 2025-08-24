const hardwarePool = require('./hardwarePool');
const { pool } = require('../config/database');

// This module manages plant data storage and operations
// It uses in-memory storage for simplicity, but can be replaced with a database in production
// const plantStorage = new Map(); // Map<email, Array<Plant>>
// const plantIdIndex = new Map(); // Map<plantId, { plant, email }>

// Get user's garden ID
async function getUserGardenId(userId) {
  const result = await pool.query(
    'SELECT garden_id FROM user_gardens WHERE user_id = $1 AND is_active = true',
    [userId]
  );
  return result.rows[0]?.garden_id || null;
}

// Check for duplicate plant name within a garden
async function checkDuplicatePlantNameInGarden(gardenId, plantName) {
  const existing = await pool.query(
    'SELECT plant_id FROM plants WHERE garden_id = $1 AND name = $2',
    [gardenId, plantName]
  );
  return existing.rows.length > 0;
}

// Check for duplicate plant name (separate function for pre-validation) - DEPRECATED
async function checkDuplicatePlantName(userId, plantName) {
  const existing = await pool.query('SELECT plant_id FROM plants WHERE user_id = $1 AND name = $2', [userId, plantName]);
  return existing.rows.length > 0;
}

async function addPlant(userId, plantData) {
  // Get user's garden ID
  const gardenId = await getUserGardenId(userId);
  if (!gardenId) {
    return { error: 'NO_GARDEN_MEMBERSHIP' };
  }

  // Enforce max 2 plants per garden (due to 2 sensors limitation)
  const countRes = await pool.query('SELECT COUNT(*)::int AS count FROM plants WHERE garden_id = $1', [gardenId]);
  const existingCount = countRes.rows[0]?.count || 0;
  if (existingCount >= 2) {
    return { error: 'MAX_PLANTS_REACHED' };
  }

  // Check for duplicate plant name within the garden
  const isDuplicate = await checkDuplicatePlantNameInGarden(gardenId, plantData.name);
  if (isDuplicate) {
    return { error: 'DUPLICATE_NAME' };
  }

  // Insert plant into DB without hardware IDs (will be assigned by Pi)
  const result = await pool.query(
    `INSERT INTO plants (user_id, garden_id, name, ideal_moisture, water_limit, irrigation_days, irrigation_time, plant_type, image_url, sensor_port, valve_id, last_watered)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12) RETURNING *`,
    [
      userId,
      gardenId,
      plantData.name,
      plantData.desiredMoisture,
      plantData.waterLimit,
      plantData.irrigation_days ? JSON.stringify(plantData.irrigation_days) : null,
      plantData.irrigation_time || null,
      plantData.plantType || null,
      plantData.image_url || null,
      null, // sensor_port - will be assigned by Pi
      null, // valve_id - will be assigned by Pi
      null
    ]
  );
  return { plant: result.rows[0] };
}

async function getPlantById(plantId) {
  const result = await pool.query('SELECT * FROM plants WHERE plant_id = $1', [plantId]);
  return result.rows[0] || null;
}

// Get plant by name within user's garden
async function getPlantByName(userId, plantName) {
  const gardenId = await getUserGardenId(userId);
  if (!gardenId) {
    return null;
  }

  const result = await pool.query(
    'SELECT * FROM plants WHERE garden_id = $1 AND name = $2',
    [gardenId, plantName]
  );
  return result.rows[0] || null;
}

// Get all plants in user's garden
async function getPlants(userId) {
  const gardenId = await getUserGardenId(userId);
  if (!gardenId) {
    return [];
  }

  const result = await pool.query(
    'SELECT * FROM plants WHERE garden_id = $1 ORDER BY created_at DESC',
    [gardenId]
  );
  return result.rows;
}

// Update irrigation schedule for a plant
async function updatePlantSchedule(plantId, days, time) {
  await pool.query(
    'UPDATE plants SET irrigation_days = $1, irrigation_time = $2, updated_at = CURRENT_TIMESTAMP WHERE plant_id = $3',
    [JSON.stringify(days), time, plantId]
  );
}

// Update plant details - now checks garden membership
async function updatePlantDetails(userId, plantId, updateData) {
  try {
    // Get user's garden ID
    const gardenId = await getUserGardenId(userId);
    if (!gardenId) {
      return { error: 'NO_GARDEN_MEMBERSHIP' };
    }

    // Verify the plant belongs to the user's garden
    const plantCheck = await pool.query(
      'SELECT * FROM plants WHERE plant_id = $1 AND garden_id = $2',
      [plantId, gardenId]
    );

    if (plantCheck.rows.length === 0) {
      return { error: 'PLANT_NOT_FOUND' }; // Plant not found or doesn't belong to user's garden
    }

    const plant = plantCheck.rows[0];

    // Check for duplicate name within the garden if name is being updated
    if (updateData.plantName && updateData.plantName !== plant.name) {
      const duplicateCheck = await pool.query(
        'SELECT plant_id FROM plants WHERE garden_id = $1 AND name = $2 AND plant_id != $3',
        [gardenId, updateData.plantName, plantId]
      );

      if (duplicateCheck.rows.length > 0) {
        return { error: 'DUPLICATE_NAME' };
      }
    }

    // Build update query dynamically
    const updateFields = [];
    const updateValues = [];
    let paramIndex = 1;

    if (updateData.plantName !== undefined) {
      updateFields.push(`name = $${paramIndex++}`);
      updateValues.push(updateData.plantName);
    }

    if (updateData.desiredMoisture !== undefined) {
      updateFields.push(`ideal_moisture = $${paramIndex++}`);
      updateValues.push(updateData.desiredMoisture);
    }

    if (updateData.waterLimit !== undefined) {
      updateFields.push(`water_limit = $${paramIndex++}`);
      updateValues.push(updateData.waterLimit);
    }

    if (updateData.imageUrl !== undefined) {
      updateFields.push(`image_url = $${paramIndex++}`);
      updateValues.push(updateData.imageUrl);
    }

    // Add updated_at timestamp
    updateFields.push(`updated_at = CURRENT_TIMESTAMP`);

    // Add plant_id to values
    updateValues.push(plantId);

    if (updateFields.length === 1) {
      // Only updated_at was added, no actual changes
      return plant;
    }

    const updateQuery = `
      UPDATE plants 
      SET ${updateFields.join(', ')}
      WHERE plant_id = $${paramIndex}
      RETURNING *
    `;

    const result = await pool.query(updateQuery, updateValues);
    return result.rows[0];

  } catch (error) {
    console.error('Error updating plant details:', error);
    return { error: 'DATABASE_ERROR' };
  }
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

// Delete a plant by id - now checks garden membership
async function deletePlantById(plantId, userId) {
  // Get user's garden ID
  const gardenId = await getUserGardenId(userId);
  if (!gardenId) {
    return { error: 'NO_GARDEN_MEMBERSHIP' };
  }

  // Verify the plant belongs to the user's garden
  const plantCheck = await pool.query(
    'SELECT plant_id FROM plants WHERE plant_id = $1 AND garden_id = $2',
    [plantId, gardenId]
  );

  if (plantCheck.rows.length === 0) {
    return { error: 'PLANT_NOT_FOUND' };
  }

  await pool.query('DELETE FROM plants WHERE plant_id = $1', [plantId]);
  return { success: true };
}

// Update plant with hardware IDs from Pi
async function updatePlantHardware(plantId, sensorPort, valveId) {
  await pool.query(
    'UPDATE plants SET sensor_port = $1, valve_id = $2, updated_at = CURRENT_TIMESTAMP WHERE plant_id = $3',
    [sensorPort, valveId, plantId]
  );
}

module.exports = {
  addPlant,
  checkDuplicatePlantName,
  checkDuplicatePlantNameInGarden,
  getUserGardenId,
  getPlants,
  getPlantById,
  getPlantByName,
  updatePlantSchedule,
  getCurrentMoisture,
  irrigatePlant,
  deletePlantById,
  updatePlantDetails,
  updatePlantHardware,
};
