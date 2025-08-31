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
            console.log('[PI] Not connected - plant saved without hardware');
            return { success: false, error: 'Pi not connected' };
        }

        try {
            // Debug: Log the plantData structure
            console.log(`[PI] Add plant data: id=${plantData.plant_id} moisture=${plantData.ideal_moisture} limit=${plantData.water_limit}`);

            const request = {
                type: 'ADD_PLANT',
                data: {
                    plant_id: plantData.plant_id,
                    desiredMoisture: parseFloat(plantData.ideal_moisture),
                    waterLimit: parseFloat(plantData.water_limit),
                    dripperType: plantData.dripper_type || '2L/h',
                    lat: typeof plantData.lat === 'number' ? plantData.lat : undefined,
                    lon: typeof plantData.lon === 'number' ? plantData.lon : undefined,
                    scheduleData: {
                        irrigation_days: plantData.irrigation_days || null,
                        irrigation_time: plantData.irrigation_time || null
                    }
                }
            };

            console.log(`[PI] Sending ADD_PLANT: id=${request.data.plant_id} name=${plantData.name} moisture=${request.data.desiredMoisture} limit=${request.data.waterLimit} dripper=${request.data.dripperType} schedule=${JSON.stringify(request.data.scheduleData)}`);

            piSocket.send(JSON.stringify(request));

            return { success: true }; // Return success immediately

        } catch (error) {
            console.log(`[PI] Error sending ADD_PLANT: ${error.message}`);
            return { success: false, error: error.message };
        }
    }

    /**
     * Request moisture data for a single plant from Pi
     */
    getMoisture(plantId) {
        const piSocket = getPiSocket();
        if (!piSocket) {
            console.log('[PI] Not connected - cannot get moisture data');
            return { success: false, error: 'Pi not connected' };
        }

        try {
            const request = {
                type: 'GET_PLANT_MOISTURE',
                data: {
                    plant_id: plantId
                }
            };

            console.log(`[PI] Requesting moisture: plant=${plantId}`);
            piSocket.send(JSON.stringify(request));

            return { success: true };

        } catch (error) {
            console.log(`[PI] Error requesting moisture: ${error.message}`);
            return { success: false, error: error.message };
        }
    }

    /**
     * Request moisture data for all plants from Pi
     */
    getAllMoisture() {
        const piSocket = getPiSocket();
        if (!piSocket) {
            console.log('[PI] Not connected - cannot get moisture data');
            return { success: false, error: 'Pi not connected' };
        }

        try {
            const request = {
                type: 'GET_ALL_MOISTURE',
                data: {}
            };

            console.log('[PI] Requesting moisture for all plants');
            piSocket.send(JSON.stringify(request));

            return { success: true };

        } catch (error) {
            console.log(`[PI] Error requesting all moisture: ${error.message}`);
            return { success: false, error: error.message };
        }
    }

    /**
     * Send IRRIGATE_PLANT request to Pi (no waiting)
     */
    irrigatePlant(plantId, sessionId) {
        const piSocket = getPiSocket();
        if (!piSocket) {
            console.log('[PI] Not connected - cannot irrigate plant');
            return { success: false, error: 'Pi not connected' };
        }

        try {
            const request = {
                type: 'IRRIGATE_PLANT',
                data: {
                    plant_id: plantId,
                    session_id: sessionId
                }
            };

            console.log(`[PI] Sending IRRIGATE_PLANT: id=${plantId}`);

            piSocket.send(JSON.stringify(request));
            return { success: true };

        } catch (error) {
            console.log(`[PI] Error sending IRRIGATE_PLANT: ${error.message}`);
            return { success: false, error: error.message };
        }
    }



    /**
     * Send STOP_IRRIGATION request to Pi (no waiting)
     */
    stopIrrigation(plantId) {
        const piSocket = getPiSocket();
        if (!piSocket) {
            console.log('[PI] Not connected - cannot stop irrigation');
            return { success: false, error: 'Pi not connected' };
        }

        try {
            const request = {
                type: 'STOP_IRRIGATION',
                data: {
                    plant_id: plantId,
                    plant_name: plantId.toString()
                }
            };

            console.log(`[PI] Sending STOP_IRRIGATION: id=${plantId}`);
            piSocket.send(JSON.stringify(request));
            return { success: true };

        } catch (error) {
            console.log(`[PI] Error sending STOP_IRRIGATION: ${error.message}`);
            return { success: false, error: error.message };
        }
    }

    /**
     * Send CLOSE_VALVE request to Pi (no waiting)
     */
    closeValve(plantId) {
        console.log('🔍 DEBUG - piCommunication.closeValve called:');
        console.log('   - plantId:', plantId, '(type:', typeof plantId, ')');

        console.log('🔍 DEBUG - Getting Pi socket...');
        const piSocket = getPiSocket();
        console.log('🔍 DEBUG - Pi socket result:', piSocket ? 'Connected' : 'Not connected');

        if (!piSocket) {
            console.log('❌ Pi not connected - cannot close valve');
            return { success: false, error: 'Pi not connected' };
        }

        console.log('✅ DEBUG - Pi socket found, creating request...');

        try {
            const request = {
                type: 'CLOSE_VALVE',
                data: {
                    plant_id: plantId
                }
            };

            console.log('📤 DEBUG - Created request object:');
            console.log('   - type:', request.type);
            console.log('   - data.plant_id:', request.data.plant_id, '(type:', typeof request.data.plant_id, ')');
            console.log('   - Full JSON:', JSON.stringify(request));

            console.log('🔍 DEBUG - Converting to JSON string...');
            const jsonString = JSON.stringify(request);
            console.log('✅ DEBUG - JSON string created, length:', jsonString.length);

            console.log('🔍 DEBUG - Sending to Pi socket...');
            piSocket.send(jsonString);
            console.log('✅ DEBUG - CLOSE_VALVE message sent to Pi successfully');

            console.log('🔍 DEBUG - Returning success result');
            return { success: true };

        } catch (error) {
            console.error('❌ ERROR - Error sending CLOSE_VALVE to Pi:');
            console.error('   - Error message:', error.message);
            console.error('   - Error stack:', error.stack);
            return { success: false, error: error.message };
        }
    }

    /**
     * Send OPEN_VALVE request to Pi (no waiting)
     */
    openValve(plantId, timeMinutes) {
        console.log('🔍 DEBUG - piCommunication.openValve called:');
        console.log('   - plantId:', plantId, '(type:', typeof plantId, ')');
        console.log('   - timeMinutes:', timeMinutes, '(type:', typeof timeMinutes, ')');

        console.log('🔍 DEBUG - Getting Pi socket...');
        const piSocket = getPiSocket();
        console.log('🔍 DEBUG - Pi socket result:', piSocket ? 'Connected' : 'Not connected');

        if (!piSocket) {
            console.log('❌ Pi not connected - cannot open valve');
            return { success: false, error: 'Pi not connected' };
        }

        console.log('✅ DEBUG - Pi socket found, creating request...');

        try {
            const request = {
                type: 'OPEN_VALVE',
                data: {
                    plant_id: plantId,
                    time_minutes: timeMinutes
                }
            };

            console.log('📤 DEBUG - Created request object:');
            console.log('   - type:', request.type);
            console.log('   - data.plant_id:', request.data.plant_id, '(type:', typeof request.data.plant_id, ')');
            console.log('   - data.time_minutes:', request.data.time_minutes, '(type:', typeof request.data.time_minutes, ')');
            console.log('   - Full JSON:', JSON.stringify(request));

            console.log('🔍 DEBUG - Converting to JSON string...');
            const jsonString = JSON.stringify(request);
            console.log('✅ DEBUG - JSON string created, length:', jsonString.length);

            console.log('🔍 DEBUG - Sending to Pi socket...');
            piSocket.send(jsonString);
            console.log('✅ DEBUG - OPEN_VALVE message sent to Pi successfully');

            console.log('🔍 DEBUG - Returning success result');
            return { success: true };

        } catch (error) {
            console.error('❌ ERROR - Error sending OPEN_VALVE to Pi:');
            console.error('   - Error message:', error.message);
            console.error('   - Error stack:', error.stack);
            return { success: false, error: error.message };
        }
    }

    /**
     * Send GET_VALVE_STATUS request to Pi (no waiting)
     */
    getValveStatus(plantId) {
        console.log('🔍 DEBUG - piCommunication.getValveStatus called:');
        console.log('   - plantId:', plantId, '(type:', typeof plantId, ')');

        console.log('🔍 DEBUG - Getting Pi socket...');
        const piSocket = getPiSocket();
        console.log('🔍 DEBUG - Pi socket result:', piSocket ? 'Connected' : 'Not connected');

        if (!piSocket) {
            console.log('❌ Pi not connected - cannot get valve status');
            return { success: false, error: 'Pi not connected' };
        }

        console.log('✅ DEBUG - Pi socket found, creating request...');

        try {
            const request = {
                type: 'GET_VALVE_STATUS',
                data: {
                    plant_id: plantId
                }
            };

            console.log('📤 DEBUG - Created request object:');
            console.log('   - type:', request.type);
            console.log('   - data.plant_id:', request.data.plant_id, '(type:', typeof request.data.plant_id, ')');
            console.log('   - Full JSON:', JSON.stringify(request));

            console.log('🔍 DEBUG - Converting to JSON string...');
            const jsonString = JSON.stringify(request);
            console.log('✅ DEBUG - JSON string created, length:', jsonString.length);

            console.log('🔍 DEBUG - Sending to Pi socket...');
            piSocket.send(jsonString);
            console.log('✅ DEBUG - GET_VALVE_STATUS message sent to Pi successfully');

            console.log('🔍 DEBUG - Returning success result');
            return { success: true };

        } catch (error) {
            console.error('❌ ERROR - Error sending GET_VALVE_STATUS to Pi:');
            console.error('   - Error message:', error.message);
            console.error('   - Error stack:', error.stack);
            return { success: false, error: error.message };
        }
    }

    /**
     * Send CHECK_POWER_SUPPLY request to Pi (no waiting)
     */
    checkPowerSupply(plantId) {
        const piSocket = getPiSocket();
        if (!piSocket) {
            console.log('[PI] Not connected - cannot check power supply');
            return { success: false, error: 'Pi not connected' };
        }

        try {
            const request = {
                type: 'CHECK_POWER_SUPPLY',
                data: {
                    plant_id: plantId
                }
            };
            piSocket.send(JSON.stringify(request));
            return { success: true };
        } catch (error) {
            console.error('Error sending CHECK_POWER_SUPPLY to Pi:', error);
            return { success: false, error: error.message };
        }
    }

    /**
     * Send CHECK_SENSOR_CONNECTION request to Pi (no waiting)
     */
    checkSensorConnection(plantId, timeoutSeconds = 5) {
        const piSocket = getPiSocket();
        if (!piSocket) {
            console.log('[PI] Not connected - cannot check sensor connection');
            return { success: false, error: 'Pi not connected' };
        }

        try {
            const request = {
                type: 'CHECK_SENSOR_CONNECTION',
                data: {
                    plant_id: plantId,
                    timeout_seconds: timeoutSeconds
                }
            };
            piSocket.send(JSON.stringify(request));
            return { success: true };
        } catch (error) {
            console.error('Error sending CHECK_SENSOR_CONNECTION to Pi:', error);
            return { success: false, error: error.message };
        }
    }

    /**
     * Send CHECK_VALVE_MECHANISM request to Pi (no waiting)
     */
    checkValveMechanism(plantId, pulseSeconds = 0.6) {
        const piSocket = getPiSocket();
        if (!piSocket) {
            console.log('[PI] Not connected - cannot check valve mechanism');
            return { success: false, error: 'Pi not connected' };
        }

        try {
            const request = {
                type: 'CHECK_VALVE_MECHANISM',
                data: {
                    plant_id: plantId,
                    pulse_seconds: pulseSeconds
                }
            };
            piSocket.send(JSON.stringify(request));
            return { success: true };
        } catch (error) {
            console.error('Error sending CHECK_VALVE_MECHANISM to Pi:', error);
            return { success: false, error: error.message };
        }
    }

    /**
     * Send RESTART_VALVE request to Pi (no waiting)
     */
    restartValve(plantId) {
        const piSocket = getPiSocket();
        if (!piSocket) {
            console.log('Pi not connected - cannot restart valve');
            return { success: false, error: 'Pi not connected' };
        }

        try {
            const request = {
                type: 'RESTART_VALVE',
                data: {
                    plant_id: plantId
                }
            };

            console.log('Sending RESTART_VALVE to Pi:', JSON.stringify(request));
            piSocket.send(JSON.stringify(request));
            return { success: true };
        } catch (error) {
            console.error('Error sending RESTART_VALVE to Pi:', error);
            return { success: false, error: error.message };
        }
    }

    /**
     * Send UPDATE_PLANT request to Pi (no waiting)
     */
    updatePlant(plant) {
        console.log('🔍 DEBUG - piCommunication.updatePlant called:');
        console.log('   - plant:', plant);
        console.log('   - plant.plant_id:', plant.plant_id, '(type:', typeof plant.plant_id, ')');
        console.log('   - plant.name:', plant.name);
        console.log('   - plant.ideal_moisture:', plant.ideal_moisture);
        console.log('   - plant.water_limit:', plant.water_limit);
        console.log('   - plant.dripper_type:', plant.dripper_type);

        console.log('🔍 DEBUG - Getting Pi socket...');
        const piSocket = getPiSocket();
        console.log('🔍 DEBUG - Pi socket result:', piSocket ? 'Connected' : 'Not connected');

        if (!piSocket) {
            console.log('❌ Pi not connected - cannot update plant');
            return { success: false, error: 'Pi not connected' };
        }

        // Validate plant_id
        if (!plant.plant_id) {
            console.error('❌ ERROR - plant.plant_id is missing or falsy:', plant.plant_id);
            return { success: false, error: 'plant_id is required' };
        }

        console.log('✅ DEBUG - Pi socket found, creating request...');

        try {
            const request = {
                type: 'UPDATE_PLANT',
                data: {
                    plant_id: plant.plant_id,
                    plant_name: plant.name,
                    desired_moisture: parseFloat(plant.ideal_moisture),
                    water_limit: parseFloat(plant.water_limit),
                    dripper_type: plant.dripper_type
                }
            };

            console.log('📤 DEBUG - Created request object:');
            console.log('   - type:', request.type);
            console.log('   - data.plant_id:', request.data.plant_id, '(type:', typeof request.data.plant_id, ')');
            console.log('   - data.plant_name:', request.data.plant_name);
            console.log('   - data.desired_moisture:', request.data.desired_moisture);
            console.log('   - data.water_limit:', request.data.water_limit);
            console.log('   - data.dripper_type:', request.data.dripper_type);
            console.log('   - Full JSON:', JSON.stringify(request));

            console.log('🔍 DEBUG - Converting to JSON string...');
            const jsonString = JSON.stringify(request);
            console.log('✅ DEBUG - JSON string created, length:', jsonString.length);

            console.log('🔍 DEBUG - Sending to Pi socket...');
            piSocket.send(jsonString);
            console.log('✅ DEBUG - UPDATE_PLANT message sent to Pi successfully');

            console.log('🔍 DEBUG - Returning success result');
            return { success: true };

        } catch (error) {
            console.error('❌ ERROR - Error sending UPDATE_PLANT to Pi:');
            console.error('   - Error message:', error.message);
            console.error('   - Error stack:', error.stack);
            return { success: false, error: error.message };
        }
    }

    /**
     * Send REMOVE_PLANT request to Pi (no waiting)
     */
    removePlant(plantId) {
        const piSocket = getPiSocket();
        if (!piSocket) {
            console.log('Pi not connected - cannot remove plant');
            return { success: false, error: 'Pi not connected' };
        }

        try {
            const request = {
                type: 'REMOVE_PLANT',
                data: {
                    plant_id: plantId
                }
            };

            console.log('Sending REMOVE_PLANT to Pi:', JSON.stringify(request));
            piSocket.send(JSON.stringify(request));
            return { success: true };
        } catch (error) {
            console.error('Error sending REMOVE_PLANT to Pi:', error);
            return { success: false, error: error.message };
        }
    }
}

// Create single instance
const piCommunication = new PiCommunication();

module.exports = piCommunication;