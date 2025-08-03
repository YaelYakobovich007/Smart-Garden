const { getPiSocket } = require('../sockets/piSocket');

/**
 * Service for communicating with Raspberry Pi
 */
class PiCommunication {
    /**
     * Send ADD_PLANT request to Pi (no waiting)
     */
    addPlant(plantData) {
        const piSocket = getPiSocket();
        if (!piSocket) {
            console.log('Pi not connected - plant saved without hardware assignment');
            return { success: false, error: 'Pi not connected' };
        }

        try {
            // Debug: Log the plantData structure
            console.log('🔍 DEBUG - plantData received:', JSON.stringify(plantData, null, 2));
            console.log('🔍 DEBUG - plantData keys:', Object.keys(plantData));
            console.log('🔍 DEBUG - plant_id value:', plantData.plant_id);
            console.log('🔍 DEBUG - ideal_moisture value:', plantData.ideal_moisture);
            console.log('🔍 DEBUG - water_limit value:', plantData.water_limit);

            const request = {
                type: 'ADD_PLANT',
                plantId: plantData.plant_id,
                desiredMoisture: plantData.ideal_moisture,
                waterLimit: plantData.water_limit,
                scheduleData: {
                    irrigation_days: plantData.irrigation_days || null,
                    irrigation_time: plantData.irrigation_time || null
                }
            };

            console.log('🚀 Sending ADD_PLANT to Pi:');
            console.log(`   - Plant ID: ${request.plantId} (type: ${typeof request.plantId})`);
            console.log(`   - Desired Moisture: ${request.desiredMoisture} (type: ${typeof request.desiredMoisture})`);
            console.log(`   - Water Limit: ${request.waterLimit} (type: ${typeof request.waterLimit})`);
            console.log(`   - Schedule Data: ${request.scheduleData} (type: ${typeof request.scheduleData})`);
            console.log(`   - Full JSON: ${JSON.stringify(request)}`);

            piSocket.send(JSON.stringify(request));

            return { success: true }; // Return success immediately

        } catch (error) {
            console.error('Error sending to Pi:', error);
            return { success: false, error: error.message };
        }
    }
}

// Create single instance
const piCommunication = new PiCommunication();

module.exports = piCommunication;