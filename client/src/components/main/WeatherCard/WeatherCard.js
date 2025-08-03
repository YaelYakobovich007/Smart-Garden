/**
 * Weather Card Component - Weather Information Display
 * 
 * This component displays current weather information in a compact card format.
 * It shows:
 * - Weather animation based on conditions
 * - Temperature display
 * - Weather description
 * - Location information
 * 
 * The component uses Lottie animations for weather visualization
 * and supports both compact and full-size display modes.
 */

import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import LottieView from 'lottie-react-native';
import { Feather } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import styles from './styles';

const WeatherCard = ({ 
  city, 
  country, 
  temp, 
  feels_like,
  description, 
  weatherId = 800, 
  humidity,
  wind_speed,
  pressure,
  uv_index,
  visibility,
  sunrise,
  sunset,
  daily_forecast,
  compact = false 
}) => {
  const navigation = useNavigation();
  console.log('WeatherCard props:', { city, country, temp, feels_like, description, weatherId, humidity, wind_speed, pressure, uv_index });
  /**
   * Get weather animation source based on weather ID
   * Maps OpenWeatherMap weather codes to Lottie animation files
   * @param {number} weatherId - OpenWeatherMap weather condition code
   * @returns {Object} Lottie animation source
   */
  const getAnimationSource = (weatherId) => {
    // Map weather conditions to animation files
    if (weatherId >= 200 && weatherId < 300) {
      return require('../../../../assets/animations/storm.json'); // Thunderstorm
    } else if (weatherId >= 300 && weatherId < 400) {
      return require('../../../../assets/animations/drizzle.json'); // Drizzle
    } else if (weatherId >= 500 && weatherId < 600) {
      return require('../../../../assets/animations/rain.json'); // Rain
    } else if (weatherId >= 600 && weatherId < 700) {
      return require('../../../../assets/animations/snow.json'); // Snow
    } else if (weatherId >= 700 && weatherId < 800) {
      return require('../../../../assets/animations/fog.json'); // Atmosphere (fog, mist, etc.)
    } else if (weatherId === 800) {
      return require('../../../../assets/animations/sunny.json'); // Clear sky
    } else if (weatherId === 801) {
      return require('../../../../assets/animations/partly-cloudy.json'); // Few clouds
    } else if (weatherId >= 802 && weatherId < 900) {
      return require('../../../../assets/animations/cloudy.json'); // Cloudy
    } else {
      return require('../../../../assets/animations/sunny.json'); // Default to sunny
    }
  };

  /**
   * Get weather description text
   * Capitalizes and formats the weather description for display
   * @param {string} description - Raw weather description
   * @returns {string} Formatted weather description
   */
  const getWeatherDescription = (description) => {
    if (!description) return 'Unknown';
    return description.charAt(0).toUpperCase() + description.slice(1);
  };

  // Get animation source based on weather condition
  const animationSource = getAnimationSource(weatherId);
  
  // Format weather description for display
  const formattedDescription = getWeatherDescription(description);

  /**
   * Handle navigation to detailed forecast screen
   * Passes all weather data to the forecast screen
   */
  const handlePress = () => {
    navigation.navigate('ForecastScreen', {
      weatherData: {
        city,
        country,
        temp,
        feels_like,
        description,
        weatherId,
        humidity,
        wind_speed,
        pressure,
        uv_index,
        visibility,
        sunrise,
        sunset,
        daily_forecast
      }
    });
  };

  /**
   * Render the weather card with animation and information
   * Displays weather animation on the left and text information on the right
   */
  return (
    <TouchableOpacity 
      style={[styles.container, compact && styles.compact]}
      onPress={handlePress}
      activeOpacity={0.9}
    >
      {/* Top Section - Animation and Temperature */}
      <View style={styles.topSection}>
        <View style={styles.animationContainer}>
          <LottieView
            source={animationSource}
            autoPlay
            loop
            style={styles.animation}
          />
        </View>
        <View style={styles.tempContainer}>
          <Text style={styles.temp}>{Math.round(temp)}°</Text>
          <Text style={styles.description}>{formattedDescription}</Text>
          <Text style={styles.location}>{city}, {country}</Text>
        </View>
      </View>

      {/* Bottom Section - Weather Stats */}
      <View style={styles.weatherStats}>
        {feels_like && (
          <View style={styles.statBox}>
            <View style={styles.statHeader}>
                              <Feather name="thermometer" size={14} color="#2E7D32" />
              <Text style={styles.statTitle}>Feels like</Text>
            </View>
            <Text style={styles.statValue}>{Math.round(feels_like)}°</Text>
          </View>
        )}
        {wind_speed && (
          <View style={styles.statBox}>
            <View style={styles.statHeader}>
                              <Feather name="wind" size={14} color="#2E7D32" />
              <Text style={styles.statTitle}>Wind</Text>
            </View>
            <Text style={styles.statValue}>{Math.round(wind_speed)} km/h</Text>
          </View>
        )}
      </View>
    </TouchableOpacity>
  );
};

export default WeatherCard;
