// Map<email, Array of plants>
const plantStorage = new Map();

function addPlant(email, plantData) {
  const userPlants = plantStorage.get(email) || [];
  const newPlant = {id: Date.now(),...plantData};
  userPlants.push(newPlant);
  plantStorage.set(email, userPlants);

  return newPlant;
}

function getPlants(email) {
  return plantStorage.get(email) || [];
}

module.exports = {
  addPlant,
  getPlants
};
