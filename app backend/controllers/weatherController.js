/**
 * Weather Controller
 *
 * Fetches weather and forecast for the user's location using OpenWeatherMap.
 */
const axios = require('axios');
const { sendSuccess, sendError } = require('../utils/wsResponses');
const { getUser } = require('../models/userModel');
const { getEmailBySocket } = require('../models/userSessions');

const WEATHER_API_KEY = process.env.WEATHER_API_KEY;

/**
 * Normalize a city string to increase geocoding hit rate.
 */
function normalizeCityName(cityName) {
  return cityName
    .normalize('NFD') // Decompose Unicode characters
    .replace(/[\u0300-\u036f]/g, '') // Remove diacritics
    .replace(/[''′]/g, '') // Remove various apostrophe types
    .replace(/[^\w\s-]/g, '') // Keep only letters, numbers, spaces, and hyphens
    .trim();
}

/**
 * Try multiple city string variations to get coordinates from OWM Geo API.
 */
async function findCityCoordinates(cityName, countryName, apiKey) {
  const normalizedCity = normalizeCityName(cityName);

  // Try different variations
  const variations = [
    `${normalizedCity}, ${countryName}`,
    `${cityName}, ${countryName}`,
    `${normalizedCity}`,
    `${cityName}`,
    `${normalizedCity}, Israel`, // For Israeli cities
    `${cityName}, Israel`
  ];

  for (const variation of variations) {
    try {
      const geoUrl = `http://api.openweathermap.org/geo/1.0/direct?q=${encodeURIComponent(variation)}&limit=1&appid=${apiKey}`;
      const response = await axios.get(geoUrl);

      if (response.data.length > 0) {
        return response.data[0];
      }
    } catch (error) {
      console.log(`[WEATHER] Error: Failed to find city - variation="${variation}" error=${error.message}`);
    }
  }

  return null;
}

/**
 * Get current, daily and hourly weather for the requesting user.
 * @param {import('ws')} ws
 */
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
    if (!user) {
      return sendError(ws, 'GET_WEATHER_FAIL', 'User not found');
    }

    // Use default location if user doesn't have city/country set
    const city = user.city || 'New York';
    const country = user.country || 'United States';

    // Find city coordinates using multiple variations
    const cityData = await findCityCoordinates(city, country, WEATHER_API_KEY);
    if (!cityData) {
      return sendError(ws, 'GET_WEATHER_FAIL', 'Could not find coordinates for city');
    }

    const { lat, lon } = cityData;

    const url = `https://api.openweathermap.org/data/3.0/onecall?lat=${lat}&lon=${lon}&appid=${WEATHER_API_KEY}&exclude=minutely,alerts&units=metric`;
    const response = await axios.get(url);
    const dataWeather = response.data;

    const current = dataWeather.current;
    const today = dataWeather.daily[0];
    const weather_main = current.weather[0].main.toLowerCase();
    const rain_amount = today.rain || 0;
    const willRain = weather_main.includes('rain') || rain_amount > 0;

    sendSuccess(ws, 'WEATHER', {
      city: cityData.name || city, // Use the name returned by the API
      country: country,
      temp: current.temp,
      feels_like: current.feels_like,
      description: current.weather[0].description,
      weatherId: current.weather[0].id,
      humidity: current.humidity,
      wind_speed: current.wind_speed,
      pressure: current.pressure,
      uv_index: current.uvi,
      visibility: current.visibility,
      dew_point: current.dew_point,
      clouds: current.clouds,
      wind_gust: current.wind_gust,
      sunrise: today.sunrise,
      sunset: today.sunset,
      rain: rain_amount,
      willRain,
      daily_forecast: dataWeather.daily,
      hourly_forecast: dataWeather.hourly.slice(0, 24),
      current_conditions: current
    });
  } catch (err) {
    console.log(`[WEATHER] Error: Failed to fetch weather - ${err.message}`);
    sendError(ws, 'GET_WEATHER_FAIL', 'Failed to fetch weather');
  }
}

module.exports = {
  handleGetWeather
};