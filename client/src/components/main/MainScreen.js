import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  Alert,
  StatusBar,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { Feather, MaterialCommunityIcons } from '@expo/vector-icons';

import PlantList from './PlantList/PlantList';
import BottomToolbar from './BottomToolbar/BottomToolbar';
import WeatherCard from './WeatherCard/WeatherCard';
import websocketService from '../../services/websocketService';
import sessionService from '../../services/sessionService';
import styles from './styles';

const MainScreen = () => {
  const navigation = useNavigation();
  const [plants, setPlants] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [userName, setUserName] = useState(''); // Empty string for generic greeting
  const [isConnected, setIsConnected] = useState(websocketService.isConnected());
  const [weather, setWeather] = useState(null);
  const [weatherError, setWeatherError] = useState(false);
  const [weatherLoading, setWeatherLoading] = useState(true);

  // Define handlers before useEffect
  const handlePlantAdded = (data) => {
    // Refresh plant list after adding a new plant
    if (websocketService.isConnected()) {
      websocketService.sendMessage({ type: 'GET_MY_PLANTS' });
    }
  };

  const handlePlantDeleted = (data) => {
    // Refresh plant list after deleting a plant
    if (websocketService.isConnected()) {
      websocketService.sendMessage({ type: 'GET_MY_PLANTS' });
    } else {
      console.log('MainScreen: WebSocket not connected, cannot refresh plants');
    }
  };

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

  const handlePlantsError = (data) => {
    console.error('Failed to fetch plants:', data.message);
    setPlants([]);
  };

  const handleUnauthorized = (data) => {
    // Clear the session and redirect to login
    sessionService.clearSession().then(() => {
      navigation.navigate('Login');
    });
  };

  const handleUserNameReceived = (data) => {
    if (data.fullName) {
      setUserName(data.fullName);
      // Now that we're authenticated, request plants
      websocketService.sendMessage({ type: 'GET_MY_PLANTS' });
    } else {
      console.log('No fullName in response data');
    }
  };

  const handleUserNameError = (data) => {
    console.error('Failed to fetch user name:', data.message);
    // If we can't get user name, we're not authenticated
    console.log('MainScreen: Authentication failed, redirecting to login');
    sessionService.clearSession().then(() => {
      navigation.navigate('Login');
    });
  };

  // Set up WebSocket message handlers
  useEffect(() => {
    console.log('MainScreen: Setting up WebSocket handlers...');
    websocketService.onMessage('ADD_PLANT_SUCCESS', handlePlantAdded);
    websocketService.onMessage('DELETE_PLANT_SUCCESS', handlePlantDeleted);
    websocketService.onMessage('GET_MY_PLANTS_RESPONSE', handlePlantsReceived);
    websocketService.onMessage('GET_MY_PLANTS_FAIL', handlePlantsError);
    websocketService.onMessage('GET_USER_NAME_SUCCESS', handleUserNameReceived);
    websocketService.onMessage('GET_USER_NAME_FAIL', handleUserNameError);
    websocketService.onMessage('UNAUTHORIZED', handleUnauthorized);

    // Listen for connection changes
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

    // Cleanup function
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

  // Fetch weather on mount and on connection
  useEffect(() => {
    function handleWeather(data) {
      setWeather(data);
      setWeatherError(false);
      setWeatherLoading(false);
    }
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

    // Cleanup
    return () => {
      websocketService.offMessage('WEATHER', handleWeather);
      websocketService.offMessage('GET_WEATHER_FAIL', handleWeatherFail);
    };
  }, []);

  // Refresh plants when screen comes into focus
  useFocusEffect(
    React.useCallback(() => {
      if (websocketService.isConnected()) {
        websocketService.sendMessage({ type: 'GET_MY_PLANTS' });
      }
    }, [])
  );

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

  const handleAddPlant = () => {
    navigation.navigate('AddPlant');
  };

  const handleNotifications = () => {
    navigation.navigate('Notification');
  };

  const handleSchedule = () => {
    Alert.alert(
      'Schedule',
      'Schedule functionality will be implemented here',
      [{ text: 'OK' }]
    );
  };

  const handleSettings = () => {
    navigation.navigate('Settings');
  };

  const handleHelp = () => {
    Alert.alert(
      'Help',
      'Help functionality will be implemented here',
      [{ text: 'OK' }]
    );
  };

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

  return (
    <SafeAreaView style={styles.container}>
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

      {/* Top Illustration */}
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

      {/* Main Content Card */}
      <View style={styles.mainContentCard}>
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
                description={weather.description}
                weatherId={weather.weatherId || 800}
                compact
              />
            ) : null}
          </View>
        </View>

        {/* Connection Status */}
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

        {/* Plants List */}
        <View style={styles.plantsSection}>
          <Text style={styles.sectionTitle}>My Plants</Text>
          <View style={styles.titleSeparator} />
          <PlantList
            plants={plants}
            onWaterPlant={handleWaterPlant}
            onAddPlant={handleAddPlant}
          />
        </View>
      </View>
      {/* Bottom Toolbar - moved outside mainContentCard for fixed bottom position */}
      <BottomToolbar
        onAddPlant={handleAddPlant}
        onSchedule={handleSchedule}
        onSettings={handleSettings}
        onHelp={handleHelp}
      />
    </SafeAreaView>
  );
};

export default MainScreen;