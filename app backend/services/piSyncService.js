const { getGardenByInviteCode: getGardenByInviteCodeModel } = require('../models/gardenModel');
const { getPlantsByGardenId } = require('../models/plantModel');

/**
 * Get garden by invite code (family code)
 * @param {string} inviteCode - The invite code to search for
 * @returns {Promise<Object|null>} Garden object or null if not found
 */
async function getGardenByInviteCode(inviteCode) {
    try {
        console.log(`🔍 Looking for garden with invite code: ${inviteCode}`);
        const garden = await getGardenByInviteCodeModel(inviteCode);

        if (garden) {
            console.log(`✅ Found garden: ${garden.name} (ID: ${garden.id})`);
        } else {
            console.log(`❌ No garden found with invite code: ${inviteCode}`);
        }

        return garden;
    } catch (error) {
        console.error(`❌ Error getting garden by invite code ${inviteCode}:`, error);
        throw error;
    }
}

/**
 * Get all plants for a garden with their hardware assignments
 * @param {number} gardenId - The garden ID
 * @returns {Promise<Array>} Array of plants with hardware info
 */
async function getGardenPlantsWithHardware(gardenId) {
    try {
        console.log(`🌱 Getting plants for garden ID: ${gardenId}`);
        const plants = await getPlantsByGardenId(gardenId);

        // Filter only plants that have hardware assigned (sensor_port and valve_id)
        const plantsWithHardware = plants.filter(plant =>
            plant.sensor_port !== null &&
            plant.valve_id !== null
        );

        console.log(`📊 Found ${plants.length} total plants, ${plantsWithHardware.length} with hardware assigned`);

        // Transform plants to the format expected by the Pi controller (same as ADD_PLANT)
        const transformedPlants = plantsWithHardware.map(plant => ({
            plant_id: plant.plant_id,  // This is the server plant_id that Pi will use
            desiredMoisture: parseFloat(plant.ideal_moisture),
            waterLimit: parseFloat(plant.water_limit || 1.0),
            dripperType: plant.dripper_type || '2L/h',
            scheduleData: {
                irrigation_days: plant.irrigation_days || null,
                irrigation_time: plant.irrigation_time || null
            }
        }));

        // Log each plant's info
        transformedPlants.forEach(plant => {
            console.log(`   🌱 Plant ID: ${plant.plant_id}`);
            console.log(`      Desired Moisture: ${plant.desiredMoisture}%`);
            console.log(`      Water Limit: ${plant.waterLimit}L`);
            console.log(`      Dripper Type: ${plant.dripperType}`);
            console.log(`      Schedule: ${JSON.stringify(plant.scheduleData)}`);
        });

        return transformedPlants;
    } catch (error) {
        console.error(`❌ Error getting plants for garden ${gardenId}:`, error);
        throw error;
    }
}

module.exports = {
    getGardenByInviteCode,
    getGardenPlantsWithHardware
};
