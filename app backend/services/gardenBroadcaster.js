const { getSocketByEmail } = require('../models/userSessions');
const { getGardenMembers } = require('../models/gardenModel');
const { sendSuccess } = require('../utils/wsResponses');

/**
 * Broadcast a message to all members of a garden
 * @param {number} gardenId - The garden ID
 * @param {string} messageType - The WebSocket message type
 * @param {Object} data - The data to send
 * @param {string} excludeEmail - Email to exclude from broadcast (usually the sender)
 */
async function broadcastToGarden(gardenId, messageType, data, excludeEmail = null) {
    try {
        // Get all garden members
        const members = await getGardenMembers(gardenId);

        if (!members || members.length === 0) {
            console.log(`No members found for garden ${gardenId}`);
            return;
        }

        let broadcastCount = 0;

        // Send message to each member
        for (const member of members) {
            // Skip the excluded email (usually the sender)
            if (excludeEmail && member.email.toLowerCase() === excludeEmail.toLowerCase()) {
                continue;
            }

            const ws = getSocketByEmail(member.email);
            if (ws && ws.readyState === 1) { // WebSocket.OPEN
                sendSuccess(ws, messageType, data);
                broadcastCount++;
                console.log(`📡 Broadcasted ${messageType} to ${member.email} for garden ${gardenId}`);
            } else {
                console.log(`⚠️ User ${member.email} not connected, skipping broadcast`);
            }
        }

        console.log(`📡 Broadcasted ${messageType} to ${broadcastCount} members of garden ${gardenId}`);
    } catch (error) {
        console.error(`Error broadcasting to garden ${gardenId}:`, error);
    }
}

/**
 * Broadcast plant added to all garden members
 * @param {number} gardenId - The garden ID
 * @param {Object} plant - The plant data
 * @param {string} excludeEmail - Email to exclude from broadcast
 */
async function broadcastPlantAdded(gardenId, plant, excludeEmail) {
    await broadcastToGarden(gardenId, 'PLANT_ADDED_TO_GARDEN', {
        plant: plant,
        message: `New plant "${plant.name}" was added to your garden`
    }, excludeEmail);
}

/**
 * Broadcast plant deleted to all garden members
 * @param {number} gardenId - The garden ID
 * @param {Object} plant - The plant data
 * @param {string} excludeEmail - Email to exclude from broadcast
 */
async function broadcastPlantDeleted(gardenId, plant, excludeEmail) {
    await broadcastToGarden(gardenId, 'PLANT_DELETED_FROM_GARDEN', {
        plant: plant,
        message: `Plant "${plant.name}" was removed from your garden`
    }, excludeEmail);
}

/**
 * Broadcast plant updated to all garden members
 * @param {number} gardenId - The garden ID
 * @param {Object} plant - The plant data
 * @param {string} excludeEmail - Email to exclude from broadcast
 */
async function broadcastPlantUpdated(gardenId, plant, excludeEmail) {
    await broadcastToGarden(gardenId, 'PLANT_UPDATED_IN_GARDEN', {
        plant: plant,
        message: `Plant "${plant.name}" was updated in your garden`
    }, excludeEmail);
}

/**
 * Broadcast moisture update to all garden members
 * @param {number} gardenId - The garden ID
 * @param {Object} moistureData - The moisture data
 * @param {string} excludeEmail - Email to exclude from broadcast
 */
async function broadcastMoistureUpdate(gardenId, moistureData, excludeEmail) {
    await broadcastToGarden(gardenId, 'GARDEN_MOISTURE_UPDATE', {
        moistureData: moistureData,
        message: 'Plant moisture levels have been updated'
    }, excludeEmail);
}

module.exports = {
    broadcastToGarden,
    broadcastPlantAdded,
    broadcastPlantDeleted,
    broadcastPlantUpdated,
    broadcastMoistureUpdate
};
