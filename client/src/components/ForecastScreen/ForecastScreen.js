/**
 * ForecastScreen.js - Beautiful Weather Forecast Screen
 * 
 * A stunning full-screen weather display featuring:
 * - Dynamic gradient background based on time of day
 * - Large temperature and condition display
 * - Curved SVG sun timeline with moving time indicator
 * - Complete week forecast with horizontal scrolling
 * - Real-time sun position calculation
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StatusBar,
  Dimensions,
  ScrollView,
} from 'react-native';
import { Feather, MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { Svg, Path, Circle } from 'react-native-svg';
import LottieView from 'lottie-react-native';
import styles from './styles';

// Layout constants
const { width } = Dimensions.get('window');
const CARD_WIDTH_SINGLE = width - 30;
const CURVE_HEIGHT = 40;
const CURVE_GAP = 20;
const FORECAST_HEIGHT = 400;

/**
 * ForecastScreen component
 * Beautiful full-screen weather display with gradient and SVG curves
 */
const ForecastScreen = ({ navigation, route }) => {
  const { weatherData } = route.params || {};

  /**
   * Toggle simulation mode on/off
   */
  const toggleSimulation = () => { };

  /**
   * Toggle auto-cycle mode
   */
  const toggleAutoCycle = () => { };

  /**
   * Cycle to next hour in simulation
   */
  const nextHour = () => { };

  /**
   * Get sunrise/sunset times from weather API data
   * The OpenWeatherMap API already provides accurate, location-based times
   */
  const getSunTimes = () => {
    if (weatherData?.sunrise && weatherData?.sunset) {
      const sunriseTime = new Date(weatherData.sunrise * 1000).toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: false
      });
      const sunsetTime = new Date(weatherData.sunset * 1000).toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: false
      });

      console.log('ForecastScreen: Using OpenWeatherMap sunrise/sunset:', `${sunriseTime} -> ${sunsetTime}`);
      return {
        sunrise: weatherData.sunrise,
        sunset: weatherData.sunset,
        sunriseTime,
        sunsetTime,
        source: 'weather_api'
      };
    }

    // Fallback to reasonable defaults if no API data
    const today = new Date();
    const fallbackSunrise = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 7, 0, 0);
    const fallbackSunset = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 19, 0, 0);

    return {
      sunrise: fallbackSunrise.getTime() / 1000,
      sunset: fallbackSunset.getTime() / 1000,
      sunriseTime: '07:00',
      sunsetTime: '19:00',
      source: 'fallback'
    };
  };

  /**
   * Get time period name for display
   */
  const getTimePeriodName = (hour) => {
    // Debug: Check what weatherData contains
    console.log('ForecastScreen: weatherData:', {
      hasWeatherData: !!weatherData,
      sunrise: weatherData?.sunrise,
      sunset: weatherData?.sunset,
      sunriseDate: weatherData?.sunrise ? new Date(weatherData.sunrise * 1000) : 'N/A',
      sunsetDate: weatherData?.sunset ? new Date(weatherData.sunset * 1000) : 'N/A'
    });

    const sunTimes = getSunTimes();
    console.log('ForecastScreen: getSunTimes result:', sunTimes);

    const sunriseTime = sunTimes.sunriseTime || new Date(sunTimes.sunrise * 1000).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false });
    const sunsetTime = sunTimes.sunsetTime || new Date(sunTimes.sunset * 1000).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false });

    if (hour >= 0 && hour < 5) return `${hour}:00 - Deep Night 🌌\n☀️ ${sunriseTime} → 🌙 ${sunsetTime}`;
    if (hour >= 5 && hour < 6) return `${hour}:00 - Pre-Dawn 🌆\n☀️ ${sunriseTime} → 🌙 ${sunsetTime}`;
    if (hour >= 6 && hour < 8) return `${hour}:00 - Early Morning 🌅\n☀️ ${sunriseTime} → 🌙 ${sunsetTime}`;
    if (hour >= 8 && hour < 12) return `${hour}:00 - Mid Morning ☀️\n☀️ ${sunriseTime} → 🌙 ${sunsetTime}`;
    if (hour >= 12 && hour < 15) return `${hour}:00 - Day Time 🌞\n☀️ ${sunriseTime} → 🌙 ${sunsetTime}`;
    if (hour >= 15 && hour < 17) return `${hour}:00 - Late Afternoon 🌤️\n☀️ ${sunriseTime} → 🌙 ${sunsetTime}`;
    if (hour >= 17 && hour < 19) return `${hour}:00 - Sunset 🌇\n☀️ ${sunriseTime} → 🌙 ${sunsetTime}`;
    if (hour >= 19 && hour < 21) return `${hour}:00 - Evening 🌆\n☀️ ${sunriseTime} → 🌙 ${sunsetTime}`;
    return `${hour}:00 - Night 🌙\n☀️ ${sunriseTime} → 🌙 ${sunsetTime}`;
  };

  /**
   * Auto-cycle effect
   */
  useEffect(() => {
    let interval;
    return () => {
      if (interval) clearInterval(interval);
    };
  }, []);

  /**
   * Calculate time-based gradient colors
   * Returns different gradients for morning, day, evening, night with smooth transitions
   */
  const getTimeBasedGradient = () => {
    let currentTime;
    let sunrise, sunset;

    currentTime = Date.now() / 1000;
    const sunTimes = getSunTimes();
    sunrise = sunTimes.sunrise;
    sunset = sunTimes.sunset;

    // Calculate time periods
    const earlyMorning = sunrise - 1800;
    const midMorning = sunrise + 1800;
    const midDay = sunrise + (sunset - sunrise) / 2;
    const lateAfternoon = sunset - 3600;
    const lateEvening = sunset + 1800;

    if (currentTime < earlyMorning) {
      // Deep Night - Purple with stars
      return ['#2D1B69', '#11998e', '#38004c'];
    } else if (currentTime < sunrise) {
      // Pre-dawn - Dark purple to deep blue
      return ['#4B0082', '#483D8B', '#2F4F4F'];
    } else if (currentTime < midMorning) {
      // Early Morning - Yellow orange sunrise
      return ['#FF6B35', '#F7931E', '#FFD700'];
    } else if (currentTime < midDay) {
      // Mid Morning - Warm golden
      return ['#FFD700', '#FFA500', '#87CEEB'];
    } else if (currentTime < lateAfternoon) {
      // Day - Light blue (current day colors)
      return ['#57C4E5', '#A4DEE3', '#FDFBEA'];
    } else if (currentTime < sunset) {
      // Late Afternoon - Warm pre-sunset
      return ['#FF8C00', '#FF6347', '#FF69B4'];
    } else if (currentTime < lateEvening) {
      // Sunset/Early Evening - Darker warm colors
      return ['#8B0000', '#4B0082', '#2F4F4F'];
    } else {
      // Night - Purple with deep blue
      return ['#2D1B69', '#11998e', '#38004c'];
    }
  };

  /**
   * Calculate sun position progress (0 = sunrise/left, 1 = sunset/right)
   * This determines where the dot appears on the curved timeline
   */
  const calculateSunProgress = () => {
    let currentTime;
    let sunrise, sunset;

    currentTime = Date.now() / 1000;
    const sunTimes = getSunTimes();
    sunrise = sunTimes.sunrise;
    sunset = sunTimes.sunset;

    // Before sunrise - dot at left (0)
    if (currentTime < sunrise) return 0;

    // After sunset - dot at right (1) 
    if (currentTime > sunset) return 1;

    // During the day - calculate position between sunrise and sunset
    const elapsed = currentTime - sunrise;
    const dayDuration = sunset - sunrise;
    const progress = elapsed / dayDuration;

    // Ensure progress stays between 0 and 1
    return Math.max(0, Math.min(progress, 1));
  };

  /**
   * Get day name from timestamp
   */
  const getDayName = (timestamp) => {
    return new Date(timestamp * 1000).toLocaleDateString('en-US', {
      weekday: 'short'
    }).toUpperCase();
  };

  /**
   * Get weather animation source based on weather ID
   * Maps OpenWeatherMap weather codes to Lottie animation files
   * @param {number} weatherId - OpenWeatherMap weather condition code
   * @returns {Object} Lottie animation source
   */
  const getAnimationSource = (weatherId) => {
    // Map weather conditions to animation files
    if (weatherId >= 200 && weatherId < 300) {
      return require('../../../assets/animations/storm.json'); // Thunderstorm
    } else if (weatherId >= 300 && weatherId < 400) {
      return require('../../../assets/animations/drizzle.json'); // Drizzle
    } else if (weatherId >= 500 && weatherId < 600) {
      return require('../../../assets/animations/rain.json'); // Rain
    } else if (weatherId >= 600 && weatherId < 700) {
      return require('../../../assets/animations/snow.json'); // Snow
    } else if (weatherId >= 700 && weatherId < 800) {
      return require('../../../assets/animations/fog.json'); // Atmosphere (fog, mist, etc.)
    } else if (weatherId === 800) {
      return require('../../../assets/animations/sunny.json'); // Clear sky
    } else if (weatherId === 801) {
      return require('../../../assets/animations/partly-cloudy.json'); // Few clouds
    } else if (weatherId >= 802 && weatherId < 900) {
      return require('../../../assets/animations/cloudy.json'); // Cloudy
    } else {
      return require('../../../assets/animations/sunny.json'); // Default to sunny
    }
  };

  /**
   * Get MaterialCommunityIcons icon name for forecast
   */
  const getMaterialWeatherIcon = (weatherId) => {
    if (weatherId >= 200 && weatherId < 300) {
      return 'weather-lightning'; // Thunderstorm
    } else if (weatherId >= 300 && weatherId < 400) {
      return 'weather-rainy'; // Drizzle
    } else if (weatherId >= 500 && weatherId < 600) {
      return 'weather-rainy'; // Rain
    } else if (weatherId >= 600 && weatherId < 700) {
      return 'weather-snowy'; // Snow
    } else if (weatherId >= 700 && weatherId < 800) {
      return 'weather-fog'; // Atmosphere
    } else if (weatherId === 800) {
      return 'weather-sunny'; // Clear sky - original sun icon
    } else if (weatherId === 801) {
      return 'weather-partly-cloudy'; // Few clouds
    } else if (weatherId >= 802 && weatherId < 900) {
      return 'weather-cloudy'; // Cloudy
    } else {
      return 'weather-sunny'; // Default - original sun icon
    }
  };

  // Calculate gradient colors and sun position
  const gradientColors = getTimeBasedGradient();
  const sunProgress = calculateSunProgress();

  // Check if it's night time for stars
  let currentTime, sunrise, sunset;

  currentTime = Date.now() / 1000;
  const sunTimesTop = getSunTimes();
  sunrise = sunTimesTop.sunrise;
  sunset = sunTimesTop.sunset;

  const isNightTime = currentTime < sunrise || currentTime > sunset + 1800;

  // Get animation source based on weather condition
  const animationSource = getAnimationSource(weatherData?.weatherId || 800);

  // Clamp progress between 0 and 1
  const clamped = Math.max(0, Math.min(sunProgress, 1));
  // Calculate x-position of the dot (subtract radius to center it)
  const dotX = CARD_WIDTH_SINGLE * clamped - 6;
  // Calculate Y position on the curve for the given progress (quadratic Bezier curve)
  const curveY = CURVE_HEIGHT * (1 - 2 * clamped + 2 * clamped * clamped);

  // Debug: Log dot position to verify it's updating
  console.log(
    'ForecastScreen: Glowing dot position:',
    `x=${Math.round(dotX)}`,
    `y=${Math.round(curveY)}`,
    `progress=${Math.round(clamped * 100)}%`
  );

  // Generate current date/time
  const currentDateTime = new Date().toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric'
  }) + ' · ' + new Date().toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false
  });

  // Generate forecast data - show all available days
  const forecastData = (() => {
    // Use real forecast data if available, otherwise fallback to default
    if (weatherData?.daily_forecast && weatherData.daily_forecast.length > 0) {
      return weatherData.daily_forecast.map((day, index) => ({
        day: index === 0 ? 'TODAY' : getDayName(day.dt),
        icon: getMaterialWeatherIcon(day.weather[0].id),
        high: Math.round(day.temp.max),
        low: Math.round(day.temp.min)
      }));
    }
    // Extended default forecast data (7 days)
    return [
      { day: 'TODAY', icon: 'weather-sunny', high: 36, low: 18 },
      { day: 'TUE', icon: 'weather-sunny', high: 34, low: 15 },
      { day: 'WED', icon: 'weather-partly-cloudy', high: 29, low: 12 },
      { day: 'THU', icon: 'weather-windy-variant', high: 31, low: 16 },
      { day: 'FRI', icon: 'weather-rainy', high: 28, low: 14 },
      { day: 'SAT', icon: 'weather-cloudy', high: 32, low: 17 },
      { day: 'SUN', icon: 'weather-partly-cloudy', high: 35, low: 19 },
    ];
  })();

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />

      {/* Background Gradient - Full Screen */}
      <LinearGradient
        colors={gradientColors}
        style={styles.fullScreenGradient}
        start={{ x: 0, y: 0 }}
        end={{ x: 0, y: 1 }}
      >

        {/* Stars for night time */}
        {isNightTime && (
          <View style={styles.starsContainer}>
            {/* Create multiple small stars across the screen */}
            {[...Array(20)].map((_, index) => (
              <View
                key={index}
                style={[
                  styles.star,
                  {
                    left: `${Math.random() * 90 + 5}%`,
                    top: `${Math.random() * 40 + 10}%`,
                    opacity: 0.3 + Math.random() * 0.7,
                  }
                ]}
              />
            ))}
          </View>
        )}

        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => navigation.goBack()}
          >
            <Feather name="arrow-left" size={24} color="white" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Weather Forecast</Text>
          <View style={{ width: 32 }} />
        </View>

        {/* Simulation controls removed */}

        {/* Beautiful Weather Card Content */}
        <View style={styles.weatherCardContainer}>

          {/* Top section with temperature, condition, city, and time */}
          <View style={styles.topSection}>
            <Text style={styles.temperatureText}>
              {Math.round(weatherData?.temp || 21)}°
            </Text>

            {/* Weather Animation */}
            <View style={styles.animationContainer}>
              <LottieView
                source={animationSource}
                autoPlay
                loop
                style={styles.weatherAnimation}
              />
            </View>

            <Text style={styles.conditionText}>
              {weatherData?.description || 'Sunny'}
            </Text>
            <Text style={styles.cityText}>
              {weatherData?.city || 'MADRID'}
            </Text>
            <Text style={styles.dateText}>{currentDateTime}</Text>
          </View>

          {/* Spacer to push the forecast area to the bottom */}
          <View style={{ flex: 1 }} />

          {/* Forecast area with a curved white background, line, and dot */}
          <View style={styles.forecastContainer}>
            {/* Sunrise and Sunset time labels */}
            <View style={styles.sunTimesContainer}>
              <View style={styles.sunTimeLeft}>
                <Text style={styles.sunTimeText}>
                  {getSunTimes().sunriseTime || 'N/A'}
                </Text>
              </View>
              <View style={styles.sunTimeRight}>
                <Text style={styles.sunTimeText}>
                  {getSunTimes().sunsetTime || 'N/A'}
                </Text>
              </View>
            </View>

            <Svg
              width={CARD_WIDTH_SINGLE}
              height={CURVE_HEIGHT + CURVE_GAP + FORECAST_HEIGHT}
              style={styles.svgStyle}
            >
              {/* White section with curved top and gap below the line */}
              <Path
                d={`M0 ${CURVE_HEIGHT + CURVE_GAP} Q ${CARD_WIDTH_SINGLE / 2} ${CURVE_GAP} ${CARD_WIDTH_SINGLE} ${CURVE_HEIGHT + CURVE_GAP} L ${CARD_WIDTH_SINGLE} ${CURVE_HEIGHT + CURVE_GAP + FORECAST_HEIGHT} L 0 ${CURVE_HEIGHT + CURVE_GAP + FORECAST_HEIGHT} Z`}
                fill="#fff"
              />
              {/* Curved line marking the day arc */}
              <Path
                d={`M0 ${CURVE_HEIGHT} Q ${CARD_WIDTH_SINGLE / 2} 0 ${CARD_WIDTH_SINGLE} ${CURVE_HEIGHT}`}
                stroke="#fff"
                strokeWidth={2}
                fill="none"
              />

              {/* White glowing halo effect - multiple layers with high opacity */}
              <Circle
                cx={dotX + 6}
                cy={curveY}
                r="20"
                fill="rgba(255, 255, 255, 0.4)"
              />
              <Circle
                cx={dotX + 6}
                cy={curveY}
                r="15"
                fill="rgba(255, 255, 255, 0.5)"
              />
              <Circle
                cx={dotX + 6}
                cy={curveY}
                r="12"
                fill="rgba(255, 255, 255, 0.6)"
              />
              <Circle
                cx={dotX + 6}
                cy={curveY}
                r="8"
                fill="rgba(255, 255, 255, 0.7)"
              />
              <Circle
                cx={dotX + 6}
                cy={curveY}
                r="6"
                fill="rgba(255, 255, 255, 0.8)"
              />

              {/* Main small bright white dot */}
              <Circle
                cx={dotX + 6}
                cy={curveY}
                r="4"
                fill="#ffffff"
                stroke="rgba(255, 255, 255, 0.9)"
                strokeWidth="2"
              />
            </Svg>

            {/* Scrollable Content Section */}
            <View style={styles.forecastSection}>
              <ScrollView
                style={styles.detailsScrollView}
                contentContainerStyle={styles.detailsScrollContent}
                showsVerticalScrollIndicator={false}
              >
                {/* Weekly Forecast - Horizontal Scrollable */}
                <View style={styles.weeklyForecastContainer}>
                  <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={styles.forecastScrollContent}
                    style={styles.forecastScrollView}
                  >
                    {forecastData.map((item, idx) => (
                      <View key={idx} style={styles.forecastItem}>
                        <Text style={styles.forecastDay}>{item.day}</Text>
                        <MaterialCommunityIcons
                          name={item.icon}
                          size={20}
                          color="#555"
                          style={styles.forecastIcon}
                        />
                        <Text style={styles.forecastTemp}>{item.high}°</Text>
                        <Text style={styles.forecastLow}>{item.low}°</Text>
                      </View>
                    ))}
                  </ScrollView>
                </View>

                {/* Weather Details Section */}
                <View style={styles.weatherDetailsSection}>
                  <Text style={styles.detailsTitle}>Today's Details</Text>

                  <View style={styles.detailsGrid}>
                    <View style={styles.detailItem}>
                      <Feather name="thermometer" size={20} color="#4FC3F7" />
                      <Text style={styles.detailLabel}>Feels like</Text>
                      <Text style={styles.detailValue}>
                        {Math.round(weatherData?.feels_like || 0)}°
                      </Text>
                    </View>

                    <View style={styles.detailItem}>
                      <Feather name="wind" size={20} color="#66BB6A" />
                      <Text style={styles.detailLabel}>Wind</Text>
                      <Text style={styles.detailValue}>
                        {Math.round(weatherData?.wind_speed || 0)} km/h
                      </Text>
                    </View>

                    <View style={styles.detailItem}>
                      <Feather name="droplet" size={20} color="#42A5F5" />
                      <Text style={styles.detailLabel}>Humidity</Text>
                      <Text style={styles.detailValue}>
                        {weatherData?.humidity || 0}%
                      </Text>
                    </View>

                    <View style={styles.detailItem}>
                      <Feather name="activity" size={20} color="#AB47BC" />
                      <Text style={styles.detailLabel}>Pressure</Text>
                      <Text style={styles.detailValue}>
                        {weatherData?.pressure || 0} hPa
                      </Text>
                    </View>

                    <View style={styles.detailItem}>
                      <Feather name="sun" size={20} color="#FFA726" />
                      <Text style={styles.detailLabel}>UV Index</Text>
                      <Text style={styles.detailValue}>
                        {weatherData?.uv_index || 0}
                      </Text>
                    </View>

                    <View style={styles.detailItem}>
                      <Feather name="eye" size={20} color="#78909C" />
                      <Text style={styles.detailLabel}>Visibility</Text>
                      <Text style={styles.detailValue}>
                        {weatherData?.visibility ? `${(weatherData.visibility / 1000).toFixed(1)} km` : 'N/A'}
                      </Text>
                    </View>
                  </View>
                </View>
              </ScrollView>
            </View>
          </View>
        </View>
      </LinearGradient>
    </View>
  );
};

export default ForecastScreen;