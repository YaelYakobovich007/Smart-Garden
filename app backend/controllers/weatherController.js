const axios = require('axios');
const { sendSuccess, sendError } = require('../utils/wsResponses');
const { getUser } = require('../models/userModel');
const { getEmailBySocket} = require('../models/userSessions');

const WEATHER_API_KEY = process.env.WEATHER_API_KEY; 

async function handleGetWeather(ws) {
  try {
    const email = getEmailBySocket(ws);
    if (!email) {
        return sendError(ws, 'UNAUTHORIZED', 'User must be logged in to get weather');
    }
    
    if (!WEATHER_API_KEY) {
      return sendError(ws, 'GET_WEATHER_FAIL', 'Weather API key is not configured');
    }

    const user = await getUser(email);
    if (!user || !user.city || !user.country) {
      return sendError(ws, 'GET_WEATHER_FAIL', 'User city or country not found');
    }

    const geoUrl = `http://api.openweathermap.org/geo/1.0/direct?q=${encodeURIComponent(user.city)},${encodeURIComponent(user.country)}&limit=1&appid=${WEATHER_API_KEY}`;
    const geoRes = await axios.get(geoUrl);
    if (!geoRes.data.length) {
      return sendError(ws, 'GET_WEATHER_FAIL', 'Could not find coordinates for city');
    }
    const { lat, lon } = geoRes.data[0];

    const url = `https://api.openweathermap.org/data/3.0/onecall?lat=${lat}&lon=${lon}&appid=${WEATHER_API_KEY}&exclude=minutely,hourly,alerts&units=metric`;
    const response = await axios.get(url);
    const dataWeather = response.data;

    const today = dataWeather.daily[0];
    const weather_main = today.weather[0].main.toLowerCase();
    const rain_amount = today.rain || 0;
    const willRain = weather_main.includes('rain') || rain_amount > 0;

    sendSuccess(ws, 'WEATHER', {
      city: user.city,
      country: user.country,
      temp: today.temp.day,
      description: today.weather[0].description,
      rain: rain_amount,
      willRain
    });
  } catch (err) {
    console.error('Weather fetch error:', err.message);
    sendError(ws, 'GET_WEATHER_FAIL', 'Failed to fetch weather');
  }
}

module.exports = {
  handleGetWeather
};