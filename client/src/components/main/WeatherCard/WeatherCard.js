import React, { useEffect, useState } from 'react';
import { View, Text, ActivityIndicator } from 'react-native';
import LottieView from 'lottie-react-native';
import styles from './styles';

function getWeatherAnimation(weatherId) {
  // Return Lottie animation source based on weather ID
  if (weatherId >= 200 && weatherId < 300) {
    return require('../../../../assets/animations/storm.json'); // Thunderstorm
  }
  if (weatherId >= 300 && weatherId < 500) {
    return require('../../../../assets/animations/drizzle.json'); // Drizzle
  }
  if (weatherId >= 500 && weatherId < 600) {
    return require('../../../../assets/animations/rain.json'); // Rain
  }
  if (weatherId >= 600 && weatherId < 700) {
    return require('../../../../assets/animations/snow.json'); // Snow
  }
  if (weatherId >= 700 && weatherId < 800) {
    return require('../../../../assets/animations/fog.json'); // Atmosphere
  }
  if (weatherId === 800) {
    return require('../../../../assets/animations/sunny.json'); // Clear
  }
  if (weatherId === 801) {
    return require('../../../../assets/animations/partly-cloudy.json'); // Partly cloudy
  }
  if (weatherId >= 802 && weatherId < 900) {
    return require('../../../../assets/animations/cloudy.json'); // Cloudy
  }
  return require('../../../../assets/animations/partly-cloudy.json'); // Default
}

const WeatherCard = ({ city, country, temp, description, weatherId, compact }) => {
  const [animationSource, setAnimationSource] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    try {
      const source = getWeatherAnimation(weatherId || 800);
      setAnimationSource(source);
      setLoading(false);
    } catch (error) {
      console.log('Animation not found, using default');
      setAnimationSource(require('../../../../assets/animations/sunny.json'));
      setLoading(false);
    }
  }, [weatherId]);

  if (loading) {
    return (
      <View style={[styles.container, compact && styles.compact]}> 
        <ActivityIndicator size="small" color="#4CAF50" />
        <Text style={styles.loadingText}>Loading weather...</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={[styles.container, compact && styles.compact]}> 
        <Text style={styles.loadingText}>Error: {error}</Text>
      </View>
    );
  }

  return (
    <View style={[styles.container, compact && styles.compact]}> 
      <View style={styles.leftSection}>
        <LottieView
          source={animationSource}
          autoPlay
          loop
          style={styles.animation}
        />
        <Text style={styles.temp}>{Math.round(temp)}°</Text>
        <Text style={styles.description}>{description}</Text>
        <Text style={styles.location}>{city}, {country}</Text>
      </View>
    </View>
  );
};

export default WeatherCard;

