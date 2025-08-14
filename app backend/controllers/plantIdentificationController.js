const { identifyPlantFromBase64 } = require('../services/plantIdentificationService');
const { sendSuccess, sendError } = require('../utils/wsResponses');

async function handlePlantIdentify(data, ws) {
    console.log('🎯 PLANT IDENTIFICATION REQUEST RECEIVED');
    console.log('Request data keys:', Object.keys(data));
    console.log('Image base64 length:', data?.imageBase64?.length || 'undefined');

    try {
        const base64 = data?.imageBase64;
        if (!base64 || typeof base64 !== 'string') {
            console.error('❌ INVALID REQUEST: imageBase64 is missing or not a string');
            console.log('Base64 value:', base64);
            console.log('Base64 type:', typeof base64);
            return sendError(ws, 'PLANT_IDENTIFY_FAIL', 'imageBase64 is required');
        }

        console.log('✅ VALID REQUEST - STARTING IDENTIFICATION');
        console.log('Base64 image length:', base64.length);
        console.log('Base64 starts with:', base64.substring(0, 50) + '...');

        const result = await identifyPlantFromBase64(base64);

        console.log('🎉 IDENTIFICATION COMPLETED SUCCESSFULLY');
        console.log('Final result to send to client:', JSON.stringify(result, null, 2));

        return sendSuccess(ws, 'PLANT_IDENTIFY_RESULT', result);
    } catch (error) {
        console.error('❌ PLANT IDENTIFICATION ERROR');
        console.error('Error message:', error.message);
        console.error('Error code:', error.code);
        console.error('Full error:', error);
        return sendError(ws, 'PLANT_IDENTIFY_FAIL', error.message || 'Identification failed');
    }
}

module.exports = {
    handlePlantIdentify,
};


