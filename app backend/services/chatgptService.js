const OpenAI = require('openai');

// Initialize OpenAI client
const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
});

/**
 * Get plant care recommendations from ChatGPT
 * @param {string} plantName - The name of the plant
 * @returns {Promise<Object>} Plant care recommendations
 */
async function getPlantCareFromChatGPT(plantName) {
    try {
        console.log(`[CHATGPT] Requesting care data: plant=${plantName}`);

        const prompt = `Provide plant care recommendations for "${plantName}". 
Return ONLY a JSON object with this exact format (no additional text):
{
  "optimalMoisture": number,
  "minMoisture": number,
  "maxMoisture": number,
  "wateringFrequency": "string",
  "wateringTips": "string",
  "lightNeeds": "string",
  "temperature": "string",
  "humidity": "string"
}

Focus on soil moisture levels for smart irrigation systems.`;

        const completion = await openai.chat.completions.create({
            model: "gpt-3.5-turbo",
            messages: [
                {
                    role: "system",
                    content: "You are a plant care expert. Provide accurate, practical care recommendations in the exact JSON format requested."
                },
                {
                    role: "user",
                    content: prompt
                }
            ],
            temperature: 0.3, // Lower temperature for more consistent responses
            max_tokens: 500
        });

        const response = completion.choices[0].message.content;
        console.log(`[CHATGPT] Raw response: ${response}`);

        // Try to parse the JSON response
        try {
            const careData = JSON.parse(response);

            // Validate the response has required fields
            if (!careData.optimalMoisture || !careData.wateringFrequency) {
                throw new Error('Invalid response format from ChatGPT');
            }

            console.log(`[CHATGPT] Care data received: plant=${plantName} moisture=${careData.optimalMoisture}%`);
            return {
                ...careData,
                source: 'chatgpt',
                plantName: plantName
            };

        } catch (parseError) {
            console.log(`[CHATGPT] Error: Failed to parse response - ${parseError.message}`);
            throw new Error('Invalid response format from ChatGPT');
        }

    } catch (error) {
        console.log(`[CHATGPT] Error: API request failed - plant=${plantName} error=${error.message}`);

        // Return fallback data if ChatGPT fails
        return {
            optimalMoisture: 60,
            minMoisture: 40,
            maxMoisture: 80,
            wateringFrequency: "Every 3-5 days",
            wateringTips: "Keep soil moderately moist. Water when top inch of soil feels dry.",
            lightNeeds: "Bright indirect light",
            temperature: "18-25°C",
            humidity: "Moderate",
            source: 'fallback',
            plantName: plantName
        };
    }
}

/**
 * Check if ChatGPT API is available
 * @returns {Promise<boolean>}
 */
async function isChatGPTAvailable() {
    try {
        if (!process.env.OPENAI_API_KEY) {
            console.log('[CHATGPT] Error: OpenAI API key not configured');
            return false;
        }

        // Test the API with a simple request
        const completion = await openai.chat.completions.create({
            model: "gpt-3.5-turbo",
            messages: [{ role: "user", content: "Hello" }],
            max_tokens: 5
        });

        return true;
    } catch (error) {
        console.log(`[CHATGPT] Error: API not available - ${error.message}`);
        return false;
    }
}

module.exports = {
    getPlantCareFromChatGPT,
    isChatGPTAvailable
};
