const axios = require('axios');

/**
 * Plant identification service using Plant.id API
 */

async function identifyPlantFromBase64(imageBase64) {
    const apiKey = process.env.PLANT_ID_API_KEY;
    if (!apiKey) {
        throw new Error('PLANT_ID_API_KEY is not configured');
    }

    // Remove data URL prefix if present
    const base64Image = imageBase64.replace(/^data:image\/[a-zA-Z]+;base64,/, '');

    const payload = {
        images: [base64Image]
    };

    try {
        const { data } = await axios.post('https://plant.id/api/v3/identification', payload, {
            headers: {
                'Api-Key': apiKey,
                'Content-Type': 'application/json',
            }
        });

        console.log('🌱 Plant.id API Response:');
        console.log(JSON.stringify(data, null, 2));

        // Extract the first suggestion
        const suggestions = data?.result?.classification?.suggestions || [];
        if (suggestions.length > 0) {
            const top = suggestions[0];
            console.log('✅ Top suggestion:', top.name, 'with', Math.round(top.probability * 100) + '% confidence');
            return {
                species: top.name,
                probability: top.probability
            };
        }

        console.log('❌ No suggestions found');
        return { species: null, probability: null };
    } catch (error) {
        console.log('❌ Plant.id API Error:');
        console.log('Error message:', error.message);
        console.log('Response data:', error.response?.data);
        throw new Error(error?.response?.data?.message || error?.message || 'Identification failed');
    }
}

module.exports = {
    identifyPlantFromBase64,
};


