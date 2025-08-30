const { identifyPlantFromBase64 } = require('../services/plantIdentificationService');
const { sendSuccess, sendError } = require('../utils/wsResponses');

async function handlePlantIdentify(data, ws) {
    console.log(`[IDENTIFY] Request received: keys=${Object.keys(data)} image_size=${data?.imageBase64?.length || 'undefined'}`);

    try {
        const base64 = data?.imageBase64;
        if (!base64 || typeof base64 !== 'string') {
            console.log(`[IDENTIFY] Error: Invalid request - base64=${base64} type=${typeof base64}`);
            return sendError(ws, 'PLANT_IDENTIFY_FAIL', 'imageBase64 is required');
        }

        console.log(`[IDENTIFY] Starting identification: size=${base64.length} prefix=${base64.substring(0, 50)}...`);

        const result = await identifyPlantFromBase64(base64);

        console.log(`[IDENTIFY] Success: result=${JSON.stringify(result)}`);

        return sendSuccess(ws, 'PLANT_IDENTIFY_RESULT', result);
    } catch (error) {
        console.log(`[IDENTIFY] Error: Failed to identify - code=${error.code} message=${error.message}`);
        return sendError(ws, 'PLANT_IDENTIFY_FAIL', error.message || 'Identification failed');
    }
}

module.exports = {
    handlePlantIdentify,
};


