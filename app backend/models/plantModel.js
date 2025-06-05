const plantStorage = new Map(); // Map<email, Array<Plant>>
const plantIdIndex = new Map(); // Map<plantId, { plant, email }>

function addPlant(email, plantData) {
  const userPlants = plantStorage.get(email) || [];

  const newPlant = {
    id: Date.now(),
    sensorId: null,
    valveId: null,
    ...plantData
  };

  userPlants.push(newPlant);
  plantStorage.set(email, userPlants);
  plantIdIndex.set(newPlant.id, { plant: newPlant, email });

  return newPlant;
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
  assignValve
};
