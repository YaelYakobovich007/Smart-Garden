const hardwarePool = require('./hardwarePool');

// This module manages plant data storage and operations
// It uses in-memory storage for simplicity, but can be replaced with a database in production
const plantStorage = new Map(); // Map<email, Array<Plant>>
const plantIdIndex = new Map(); // Map<plantId, { plant, email }>

function addPlant(email, plantData) {
  const userPlants = plantStorage.get(email) || [];
  if (userPlants.some(plant => plant.name === plantData.name)) {
    // Check for duplicate plant name
    return { error: 'DUPLICATE_NAME' };
  }

  const sensorId = hardwarePool.assignSensor();
  const valveId = hardwarePool.assignValve();

  if (!sensorId || !valveId) {
    return { error: 'NO_HARDWARE' };
  }

  const newPlant = {
    id: Date.now(),
    sensorId,
    valveId,
    name: plantData.name,
    desiredMoisture: plantData.desiredMoisture,
    irrigationSchedule: plantData.irrigationSchedule
  };

  userPlants.push(newPlant);
  plantStorage.set(email, userPlants);
  plantIdIndex.set(newPlant.id, { plant: newPlant, email });

  return { plant: newPlant };
}

function getPlantById(plantId) {
  const record = plantIdIndex.get(plantId);
  return record ? record.plant : null;
}

function getPlantByName(email, plantName) {
  const userPlants = plantStorage.get(email) || [];
  return userPlants.find(plant => plant.name === plantName) || null;
}

function assignSensor(plantId, sensorId) {
  const record = plantIdIndex.get(plantId);
  if (!record) return null;

  record.plant.sensorId = sensorId;
  return record; // { plant, email }
}

function assignValve(plantId, valveId) {
  const record = plantIdIndex.get(plantId);
  if (!record) return null;

  record.plant.valveId = valveId;
  return record; // { plant, email }
}

function getPlants(email) {
  return plantStorage.get(email) || [];
}

module.exports = {
  addPlant,
  getPlants,
  assignSensor,
  assignValve,
  getPlantById,
  getPlantByName
};
