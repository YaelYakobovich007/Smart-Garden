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
                data: {
                    plantId: plantData.plant_id,
                    desiredMoisture: plantData.ideal_moisture,
                    waterLimit: plantData.water_limit,
                    scheduleData: {
                        irrigation_days: plantData.irrigation_days || null,
                        irrigation_time: plantData.irrigation_time || null
                    }
                }
            };

            console.log('Sending ADD_PLANT to Pi:');
            console.log(`   - Plant ID: ${request.data.plantId} (type: ${typeof request.data.plantId})`);
            console.log(`   - Plant Name: ${plantData.name}`);
            console.log(`   - Desired Moisture: ${request.data.desiredMoisture} (type: ${typeof request.data.desiredMoisture})`);
            console.log(`   - Water Limit: ${request.data.waterLimit} (type: ${typeof request.data.waterLimit})`);
            console.log(`   - Schedule Data: ${JSON.stringify(request.data.scheduleData)} (type: ${typeof request.data.scheduleData})`);
            console.log(`   - Full JSON: ${JSON.stringify(request)}`);

            piSocket.send(JSON.stringify(request));

            return { success: true }; // Return success immediately

        } catch (error) {
            console.error('Error sending to Pi:', error);
            return { success: false, error: error.message };
        }
    }

    /**
     * Request moisture data for a single plant from Pi
     */
    getMoisture(plantId) {
        const piSocket = getPiSocket();
        if (!piSocket) {
            console.log('Pi not connected - cannot get moisture data');
            return { success: false, error: 'Pi not connected' };
        }

        try {
            const request = {
                type: 'GET_PLANT_MOISTURE',
                data: {
                    plant_id: plantId
                }
            };

            console.log(`Requesting moisture for plant ${plantId}`);
            piSocket.send(JSON.stringify(request));

            return { success: true };

        } catch (error) {
            console.error('Error requesting moisture from Pi:', error);
            return { success: false, error: error.message };
        }
    }

    /**
     * Request moisture data for all plants from Pi
     */
    getAllMoisture() {
        const piSocket = getPiSocket();
        if (!piSocket) {
            console.log('Pi not connected - cannot get moisture data');
            return { success: false, error: 'Pi not connected' };
        }

        try {
            const request = {
                type: 'GET_ALL_MOISTURE',
                data: {}
            };

            console.log('Requesting moisture for all plants');
            piSocket.send(JSON.stringify(request));

            return { success: true };

        } catch (error) {
            console.error('Error requesting all moisture from Pi:', error);
            return { success: false, error: error.message };
        }
    }

    /**
     * Send IRRIGATE_PLANT request to Pi (no waiting)
     */
    irrigatePlant(plantId) {
        const piSocket = getPiSocket();
        if (!piSocket) {
            console.log('Pi not connected - cannot irrigate plant');
            return { success: false, error: 'Pi not connected' };
        }

        try {
            const request = {
                type: 'IRRIGATE_PLANT',
                data: {
                    plantId: plantId
                }
            };

            console.log('Sending IRRIGATE_PLANT to Pi:');
            console.log(`   - Plant ID: ${plantId} (type: ${typeof plantId})`);
            console.log(`   - Full JSON: ${JSON.stringify(request)}`);

            piSocket.send(JSON.stringify(request));
            return { success: true };

        } catch (error) {
            console.error('Error sending IRRIGATE_PLANT to Pi:', error);
            return { success: false, error: error.message };
        }
    }

    /**
     * Send OPEN_VALVE request to Pi (no waiting)
     */
    openValve(plantId, timeMinutes) {
        const piSocket = getPiSocket();
        if (!piSocket) {
            console.log('Pi not connected - cannot open valve');
            return { success: false, error: 'Pi not connected' };
        }

        try {
            const request = {
                type: 'OPEN_VALVE',
                data: {
                    plant_id: plantId,
                    time_minutes: timeMinutes
                }
            };

            console.log('Sending OPEN_VALVE to Pi:');
            console.log(`   - Plant ID: ${plantId} (type: ${typeof plantId})`);
            console.log(`   - Time Minutes: ${timeMinutes} (type: ${typeof timeMinutes})`);
            console.log(`   - Full JSON: ${JSON.stringify(request)}`);

            piSocket.send(JSON.stringify(request));
            return { success: true };

        } catch (error) {
            console.error('Error sending OPEN_VALVE to Pi:', error);
            return { success: false, error: error.message };
        }
    }
}

// Create single instance
const piCommunication = new PiCommunication();

module.exports = piCommunication;