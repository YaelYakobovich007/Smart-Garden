import React, { useEffect, useState } from 'react';
import { View, Text } from 'react-native';
import * as Font from 'expo-font';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import styles from './styles';

function getWeatherIconName(weatherId) {
  if (weatherId >= 200 && weatherId < 300) return 'weather-lightning';
  if (weatherId >= 300 && weatherId < 500) return 'weather-partly-cloudy'; // safer fallback
  if (weatherId >= 500 && weatherId < 600) return 'weather-rainy';
  if (weatherId >= 600 && weatherId < 700) return 'weather-snowy';
  if (weatherId === 800) return 'weather-sunny';
  if (weatherId > 800 && weatherId < 900) return 'weather-cloudy';
  return 'weather-partly-cloudy'; 
}

const WeatherCard = ({ city, country, temp, description, weatherId }) => {
  const [fontsLoaded, setFontsLoaded] = useState(false);
  const iconName = getWeatherIconName(weatherId);

  useEffect(() => {
    Font.loadAsync({
      ...MaterialCommunityIcons.font,
    }).then(() => setFontsLoaded(true));
  }, []);

  if (!fontsLoaded) return null;

  return (
    <View style={styles.container}>
      <MaterialCommunityIcons name={iconName} size={64} color="#4A90E2" />
      <Text style={styles.temp}>{Math.round(temp)}°C</Text>
      <Text style={styles.description}>{description}</Text>
      <Text style={styles.location}>{city}, {country}</Text>
    </View>
  );
};

export default WeatherCard; 