/**
 * Garden Broadcaster
 *
 * Sends a WebSocket message to all connected members of a garden, optionally
 * excluding the initiating user's email.
 */
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

        if (!members || members.length === 0) return;

        let broadcastCount = 0;

        // Send message to each member
        for (const member of members) {
            // Skip the excluded email (usually the sender)
            if (excludeEmail && member.email.toLowerCase() === excludeEmail.toLowerCase()) {
                continue;
            }

            const ws = getSocketByEmail(member.email);
            if (ws && ws.readyState === 1) {
                sendSuccess(ws, messageType, data);
                broadcastCount++;
                console.log(`[BROADCAST] Sent: type=${messageType} email=${member.email} garden=${gardenId}`);
            } else {
                console.log(`[BROADCAST] Skipped: email=${member.email} reason=not_connected`);
            }
        }

        console.log(`[BROADCAST] Summary: type=${messageType} garden=${gardenId} count=${broadcastCount}`);
    } catch (error) {
        console.log(`[BROADCAST] Error: Failed to send - garden=${gardenId} error=${error.message}`);
    }
}


module.exports = {
    broadcastToGarden
};
