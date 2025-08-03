/**
 * Main Screen Component - Smart Garden Home Dashboard
 * 
 * This is the primary screen of the Smart Garden app that displays:
 * - User greeting and weather information
 * - Plant list with real-time status
 * - Connection status and offline mode handling
 * - Gardening tips and articles section
 * 
 * The screen manages WebSocket connections, session persistence,
 * and provides the main user interface for garden management.
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  Alert,
  StatusBar,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { Feather, MaterialCommunityIcons } from '@expo/vector-icons';

// Import components
import PlantList from './PlantList/PlantList';
import BottomToolbar from './BottomToolbar/BottomToolbar';
import WeatherCard from './WeatherCard/WeatherCard';
import ArticlesSection from './Articles/ArticlesSection/ArticlesSection';

// Import services
import websocketService from '../../services/websocketService';
import sessionService from '../../services/sessionService';
import styles from './styles';

const MainScreen = () => {
  const navigation = useNavigation();
  
  // State management for screen data and UI
  const [plants, setPlants] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [userName, setUserName] = useState(''); // Empty string for generic greeting
  const [isConnected, setIsConnected] = useState(websocketService.isConnected());
  const [weather, setWeather] = useState(null);
  const [weatherError, setWeatherError] = useState(false);
  const [weatherLoading, setWeatherLoading] = useState(true);

  /**
   * Handle successful plant addition from server
   * Refreshes the plant list to show the new plant
   * @param {Object} data - Server response data
   */
  const handlePlantAdded = (data) => {
    // Refresh plant list after adding a new plant
    if (websocketService.isConnected()) {
      websocketService.sendMessage({ type: 'GET_MY_PLANTS' });
    }
  };

  /**
   * Handle successful plant deletion from server
   * Refreshes the plant list to remove the deleted plant
   * @param {Object} data - Server response data
   */
  const handlePlantDeleted = (data) => {
    // Refresh plant list after deleting a plant
    if (websocketService.isConnected()) {
      websocketService.sendMessage({ type: 'GET_MY_PLANTS' });
    } else {
      console.log('MainScreen: WebSocket not connected, cannot refresh plants');
    }
  };

  /**
   * Handle plant data received from server
   * Transforms server data to match local plant format
   * @param {Object} data - Server plant data
   */
  const handlePlantsReceived = (data) => {
    if (data.plants) {
      // Transform server data to match our plant format
      const transformedPlants = data.plants.map(plant => {
        const transformed = {
          id: plant.plant_id,
          name: plant.name,
          type: plant.plant_type || 'Unknown',
          image_url: plant.image_url, // Add image_url from server
          location: 'Garden', // Default location
          moisture: Math.floor(Math.random() * 61) + 20, // Simulated moisture
          temperature: Math.floor(Math.random() * 15) + 20, // Simulated temperature
          lightLevel: Math.floor(Math.random() * 41) + 40, // Simulated light level
          isHealthy: true, // Default to healthy
        };
        return transformed;
      });
      setPlants(transformedPlants);
    } else {
      console.log('MainScreen: No plants data in response');
    }
  };

  /**
   * Handle plant data fetch errors
   * Clears plant list on error
   * @param {Object} data - Error response data
   */
  const handlePlantsError = (data) => {
    console.error('Failed to fetch plants:', data.message);
    setPlants([]);
  };

  /**
   * Handle unauthorized responses from server
   * Clears session and redirects to login
   * @param {Object} data - Unauthorized response data
   */
  const handleUnauthorized = (data) => {
    // Only clear the session and redirect to login on explicit UNAUTHORIZED from server
    console.log('MainScreen: Received UNAUTHORIZED from server, clearing session');
    sessionService.clearSession().then(() => {
      navigation.navigate('Login');
    });
  };

  /**
   * Handle user name received from server
   * Updates user name and requests plant data
   * @param {Object} data - User name response data
   */
  const handleUserNameReceived = (data) => {
    if (data.fullName) {
      setUserName(data.fullName);
      // Now that we're authenticated, request plants
      websocketService.sendMessage({ type: 'GET_MY_PLANTS' });
    } else {
      console.log('No fullName in response data');
    }
  };

  /**
   * Handle user name fetch errors
   * Logs error but doesn't force logout (resilient design)
   * @param {Object} data - Error response data
   */
  const handleUserNameError = (data) => {
    console.error('Failed to fetch user name:', data.message);
    // Don't force logout on connection issues - just log the error
    console.log('MainScreen: User name fetch failed, but keeping user logged in');
  };

  /**
   * Set up WebSocket message handlers and connection management
   * Registers handlers for various server messages and manages connection state
   */
  useEffect(() => {
    console.log('MainScreen: Setting up WebSocket handlers...');
    websocketService.onMessage('ADD_PLANT_SUCCESS', handlePlantAdded);
    websocketService.onMessage('DELETE_PLANT_SUCCESS', handlePlantDeleted);
    websocketService.onMessage('GET_MY_PLANTS_RESPONSE', handlePlantsReceived);
    websocketService.onMessage('GET_MY_PLANTS_FAIL', handlePlantsError);
    websocketService.onMessage('GET_USER_NAME_SUCCESS', handleUserNameReceived);
    websocketService.onMessage('GET_USER_NAME_FAIL', handleUserNameError);
    websocketService.onMessage('UNAUTHORIZED', handleUnauthorized);

    /**
     * Handle WebSocket connection status changes
     * Updates UI state and requests user data when connected
     * @param {boolean} connected - Connection status
     */
    const handleConnectionChange = (connected) => {
      setIsConnected(connected);
      if (connected) {
        // First check if we're authenticated by requesting user name
        websocketService.sendMessage({ type: 'GET_USER_NAME' });
      }
    };

    websocketService.onConnectionChange(handleConnectionChange);

    // Request user name from server if already connected
    if (websocketService.isConnected()) {
      websocketService.sendMessage({ type: 'GET_USER_NAME' });
    } else {
      websocketService.connect();
    }

    // Check connection after a short delay to ensure WebSocket has time to connect
    const connectionTimer = setTimeout(() => {
      if (websocketService.isConnected()) {
        websocketService.sendMessage({ type: 'GET_USER_NAME' });
      }
    }, 2000);

    /**
     * Cleanup function to remove message handlers and clear timers
     * Prevents memory leaks and ensures clean component unmounting
     */
    return () => {
      clearTimeout(connectionTimer);
      websocketService.offMessage('ADD_PLANT_SUCCESS', handlePlantAdded);
      websocketService.offMessage('DELETE_PLANT_SUCCESS', handlePlantDeleted);
      websocketService.offMessage('GET_MY_PLANTS_RESPONSE', handlePlantsReceived);
      websocketService.offMessage('GET_MY_PLANTS_FAIL', handlePlantsError);
      websocketService.offMessage('GET_USER_NAME_SUCCESS', handleUserNameReceived);
      websocketService.offMessage('GET_USER_NAME_FAIL', handleUserNameError);
      websocketService.offMessage('UNAUTHORIZED', handleUnauthorized);
      websocketService.offConnectionChange(handleConnectionChange);
    };
  }, []);

  /**
   * Fetch weather data and handle weather-related messages
   * Sets up weather data fetching and error handling
   */
  useEffect(() => {
    /**
     * Handle successful weather data received
     * Updates weather state and clears loading/error states
     * @param {Object} data - Weather data from server
     */
    function handleWeather(data) {
      console.log('Weather data received:', data);
      setWeather(data);
      setWeatherError(false);
      setWeatherLoading(false);
    }

    /**
     * Handle weather data fetch errors
     * Sets error state and clears loading state
     */
    function handleWeatherFail() {
      setWeather(null);
      setWeatherError(true);
      setWeatherLoading(false);
    }

    websocketService.onMessage('WEATHER', handleWeather);
    websocketService.onMessage('GET_WEATHER_FAIL', handleWeatherFail);

    if (websocketService.isConnected()) {
      setWeatherLoading(true);
      websocketService.sendMessage({ type: 'GET_WEATHER' });
    }

    // Cleanup weather message handlers
    return () => {
      websocketService.offMessage('WEATHER', handleWeather);
      websocketService.offMessage('GET_WEATHER_FAIL', handleWeatherFail);
    };
  }, []);

  /**
   * Refresh plants when screen comes into focus
   * Ensures data is up-to-date when user returns to the screen
   */
  useFocusEffect(
    React.useCallback(() => {
      if (websocketService.isConnected()) {
        websocketService.sendMessage({ type: 'GET_MY_PLANTS' });
        // Refresh session when user is active
        sessionService.refreshSession();
      }
    }, [])
  );

  /**
   * Periodic session refresh to keep user logged in
   * Refreshes session every 5 minutes to maintain login state
   */
  useEffect(() => {
    const sessionRefreshInterval = setInterval(() => {
      sessionService.refreshSession();
    }, 5 * 60 * 1000); // Refresh every 5 minutes

    return () => {
      clearInterval(sessionRefreshInterval);
    };
  }, []);

  /**
   * Handle plant watering action
   * Sends irrigation command to server via WebSocket
   * @param {string} plantId - ID of the plant to water
   */
  const handleWaterPlant = (plantId) => {
    if (!websocketService.isConnected()) {
      Alert.alert('Error', 'Not connected to server. Please check your connection and try again.');
      return;
    }

    // TODO: Send watering command to server via WebSocket
    Alert.alert(
      'Watering Plant',
      'Watering command sent to the plant!',
      [{ text: 'OK' }]
    );
  };

  /**
   * Navigate to add plant screen
   */
  const handleAddPlant = () => {
    navigation.navigate('AddPlant');
  };

  /**
   * Navigate to notifications screen
   */
  const handleNotifications = () => {
    navigation.navigate('Notification');
  };

  /**
   * Handle schedule button press
   * Shows placeholder alert for future implementation
   */
  const handleSchedule = () => {
    Alert.alert(
      'Schedule',
      'Schedule functionality will be implemented here',
      [{ text: 'OK' }]
    );
  };

  /**
   * Navigate to settings screen
   */
  const handleSettings = () => {
    navigation.navigate('Settings');
  };

  /**
   * Handle help button press
   * Shows placeholder alert for future implementation
   */
  const handleHelp = () => {
    Alert.alert(
      'Help',
      'Help functionality will be implemented here',
      [{ text: 'OK' }]
    );
  };

  /**
   * Handle user logout
   * Shows confirmation dialog and clears session on confirmation
   */
  const handleLogout = () => {
    Alert.alert(
      'Logout',
      'Are you sure you want to logout?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Logout',
          style: 'destructive',
          onPress: async () => {
            // Clear the session
            await sessionService.clearSession();
            // Navigate to login
            navigation.navigate('Login');
          }
        }
      ]
    );
  };

  /**
   * Render the main screen with all components
   * Includes header, weather, plants, articles, and bottom toolbar
   */
  return (
    <View style={{ flex: 1, backgroundColor: '#FFFFFF' }}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />

      {/* Thin Top Bar with Logo, App Name, and Notification Icon */}
      <View style={styles.topBar}>
        <View style={styles.topBarLeft}>
          <Image
            source={require('../../../assets/images/Smart_Garden_Logo.png')}
            style={styles.topBarLogo}
          />
          <Text style={styles.topBarTitle}>Smart Garden</Text>
        </View>
        <TouchableOpacity onPress={handleNotifications} style={styles.topBarNotification}>
          <Feather name="bell" size={20} color="#7F8C8D" />
          {notifications.filter(n => !n.isRead).length > 0 && (
            <View style={styles.notificationBadge}>
              <Text style={styles.notificationBadgeText}>
                {notifications.filter(n => !n.isRead).length}
              </Text>
            </View>
          )}
        </TouchableOpacity>
      </View>

      {/* Top Illustration with Greeting */}
      <View style={styles.topImageContainer}>
        <Image
          source={require('../../../assets/images/main_screen.png')}
          style={styles.topImage}
          resizeMode="cover"
        />
        <View style={styles.greetingOverlay}>
          <Text style={styles.greetingWhite}>
            {userName ? `Hello ${userName}!` : 'Hello!'}
          </Text>
        </View>
      </View>

      {/* Main Content Card with ScrollView */}
      <View style={styles.mainContentCard}>
        <ScrollView 
          style={styles.scrollView}
          contentContainerStyle={styles.scrollViewContent}
          showsVerticalScrollIndicator={false}
        >
          {/* Weather and Subtitle Row */}
          <View style={styles.weatherRow}>
            <View style={styles.weatherSubtitleContainer}>
              <Text style={styles.weatherSubtitle}>{'How are your\nplants today?'}</Text>
            </View>
            <View style={styles.weatherCardContainer}>
              {weatherLoading ? (
                <View style={{ alignItems: 'center', margin: 10 }}>
                  <MaterialCommunityIcons name="cloud-refresh" size={32} color="#4A90E2" />
                  <Text style={{ color: '#888', marginTop: 4, fontSize: 12 }}>Loading weather...</Text>
                </View>
              ) : weatherError ? (
                <View style={{ alignItems: 'center', margin: 10 }}>
                  <MaterialCommunityIcons name="cloud-off-outline" size={32} color="#E74C3C" />
                  <Text style={{ color: '#E74C3C', marginTop: 4, fontSize: 12 }}>Unable to fetch weather</Text>
                </View>
              ) : weather ? (
                <WeatherCard
                  city={weather.city}
                  country={weather.country}
                  temp={weather.temp}
                  feels_like={weather.feels_like}
                  description={weather.description}
                  weatherId={weather.weatherId || 800}
                  humidity={weather.humidity}
                  wind_speed={weather.wind_speed}
                  pressure={weather.pressure}
                  uv_index={weather.uv_index}
                  visibility={weather.visibility}
                  sunrise={weather.sunrise}
                  sunset={weather.sunset}
                  daily_forecast={weather.daily_forecast}
                  compact
                />
              ) : null}
            </View>
          </View>

          {/* Connection Status Warning */}
          {!isConnected && (
            <View style={styles.connectionWarning}>
              <Feather name="wifi-off" size={16} color="#E74C3C" />
              <Text style={styles.connectionWarningText}>
                Offline mode - no data available
              </Text>
              <TouchableOpacity
                style={styles.retryButton}
                onPress={() => {
                  console.log('Manual retry: attempting to connect...');
                  websocketService.connect();
                }}
              >
                <Text style={styles.retryButtonText}>Retry</Text>
              </TouchableOpacity>
            </View>
          )}

          {/* Plants List Section */}
          <View style={styles.plantsSection}>
            <Text style={styles.sectionTitle}>My Plants</Text>
            <View style={styles.titleSeparator} />
            <PlantList
              plants={plants}
              onWaterPlant={handleWaterPlant}
              onAddPlant={handleAddPlant}
            />
          </View>

          {/* Articles Section */}
          <View style={styles.articlesSection}>
            <ArticlesSection />
          </View>
        </ScrollView>
      </View>
      
      {/* Bottom Toolbar - moved outside mainContentCard for fixed bottom position */}
      <BottomToolbar
        onAddPlant={handleAddPlant}
        onSchedule={handleSchedule}
        onSettings={handleSettings}
        onHelp={handleHelp}
      />
    </View>
  );
};

export default MainScreen;