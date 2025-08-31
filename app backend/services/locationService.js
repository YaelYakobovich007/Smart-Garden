const axios = require('axios');

const WEATHER_API_KEY = process.env.WEATHER_API_KEY;

function normalizeCityName(cityName) {
    return (cityName || '')
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[\'’′]/g, '')
        .replace(/[^\w\s-]/g, '')
        .trim();
}

async function findCityCoordinates(cityName, countryName) {
    if (!WEATHER_API_KEY) {
        return null;
    }

    const normalizedCity = normalizeCityName(cityName);
    const variations = [
        `${normalizedCity}, ${countryName}`,
        `${cityName}, ${countryName}`,
        `${normalizedCity}`,
        `${cityName}`,
        `${normalizedCity}, Israel`,
        `${cityName}, Israel`
    ];

    for (const variation of variations) {
        try {
            const geoUrl = `http://api.openweathermap.org/geo/1.0/direct?q=${encodeURIComponent(variation)}&limit=1&appid=${WEATHER_API_KEY}`;
            const response = await axios.get(geoUrl);
            if (Array.isArray(response.data) && response.data.length > 0) {
                return response.data[0];
            }
        } catch (e) {
            // swallow and try next variation
        }
    }
    return null;
}

async function getLatLonForCountryCity(country, city) {
    try {
        const data = await findCityCoordinates(city, country);
        if (!data) return null;
        const lat = typeof data.lat === 'string' ? parseFloat(data.lat) : data.lat;
        const lon = typeof data.lon === 'string' ? parseFloat(data.lon) : data.lon;
        if (Number.isFinite(lat) && Number.isFinite(lon)) {
            return { lat, lon };
        }
        return null;
    } catch {
        return null;
    }
}

module.exports = {
    getLatLonForCountryCity
};


