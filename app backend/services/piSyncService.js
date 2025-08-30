const { getGardenByInviteCode: getGardenByInviteCodeModel } = require('../models/gardenModel');
const { getPlantsByGardenId } = require('../models/plantModel');

/**
 * Get garden by invite code (family code)
 * @param {string} inviteCode - The invite code to search for
 * @returns {Promise<Object|null>} Garden object or null if not found
 */
async function getGardenByInviteCode(inviteCode) {
    try {
        console.log(`[SYNC] Looking for garden: code=${inviteCode}`);
        const garden = await getGardenByInviteCodeModel(inviteCode);

        if (garden) {
            console.log(`[SYNC] Found garden: name=${garden.name} id=${garden.id}`);
        } else {
            console.log(`[SYNC] Garden not found: code=${inviteCode}`);
        }

        return garden;
    } catch (error) {
        console.log(`[SYNC] Error: Failed to get garden - code=${inviteCode} error=${error.message}`);
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
        console.log(`[SYNC] Getting plants: garden=${gardenId}`);
        const plants = await getPlantsByGardenId(gardenId);

        // Filter only plants that have hardware assigned (sensor_port and valve_id)
        const plantsWithHardware = plants.filter(plant =>
            plant.sensor_port !== null &&
            plant.valve_id !== null
        );

        console.log(`[SYNC] Found plants: total=${plants.length} with_hardware=${plantsWithHardware.length}`);

        // Transform plants to the format expected by the Pi controller (same as ADD_PLANT)
        // Include hardware identifiers so the Pi can bind to the correct hardware
        const transformedPlants = plantsWithHardware.map(plant => ({
            plant_id: plant.plant_id,
            desiredMoisture: parseFloat(plant.ideal_moisture),
            waterLimit: parseFloat(plant.water_limit || 1.0),
            dripperType: plant.dripper_type || '2L/h',
            sensor_port: plant.sensor_port,
            valve_id: plant.valve_id,
            scheduleData: {
                irrigation_days: plant.irrigation_days || null,
                irrigation_time: plant.irrigation_time || null
            }
        }));

        // Log each plant's info
        transformedPlants.forEach(plant => {
            console.log(`[SYNC] Plant details: id=${plant.plant_id} moisture=${plant.desiredMoisture}% limit=${plant.waterLimit}L dripper=${plant.dripperType} schedule=${JSON.stringify(plant.scheduleData)}`);
        });

        return transformedPlants;
    } catch (error) {
        console.log(`[SYNC] Error: Failed to get plants - garden=${gardenId} error=${error.message}`);
        throw error;
    }
}

module.exports = {
    getGardenByInviteCode,
    getGardenPlantsWithHardware
};
