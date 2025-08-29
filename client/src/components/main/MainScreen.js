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
  ActivityIndicator,
  Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useFocusEffect, useRoute } from '@react-navigation/native';
import { Feather, MaterialCommunityIcons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { useCameraPermissions } from 'expo-camera';

// Import components
import PlantList from './PlantList/PlantList';
import BottomToolbar from './BottomToolbar/BottomToolbar';
import WeatherCard from './WeatherCard/WeatherCard';
import ArticlesSection from './Articles/ArticlesSection/ArticlesSection';

// Import services
import websocketService from '../../services/websocketService';
import sessionService from '../../services/sessionService';
import { useIrrigation } from '../../contexts/IrrigationContext';
import styles from './styles';

const MainScreen = () => {
  const navigation = useNavigation();
  const route = useRoute();

  // Get irrigation state from context
  const { getPlantWateringState, getWateringPlants, rehydrateFromPlants } = useIrrigation();

  // State management for screen data and UI
  const [plants, setPlants] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [userName, setUserName] = useState(''); // Empty string for generic greeting
  const [isConnected, setIsConnected] = useState(websocketService.isConnected());
  const [weather, setWeather] = useState(null);
  const [weatherError, setWeatherError] = useState(false);
  const [weatherLoading, setWeatherLoading] = useState(true);
  const [loading, setLoading] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState('');
  const [showImagePicker, setShowImagePicker] = useState(false);
  const [cameraPermission, requestCameraPermission] = useCameraPermissions();

  // Garden state
  const [garden, setGarden] = useState(null);
  const [gardenLoading, setGardenLoading] = useState(true);

  // Check if we should open plant identification from navigation params
  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', () => {
      const params = route.params;
      if (params?.openIdentifyPlant) {
        // Clear the parameter to prevent opening again
        navigation.setParams({ openIdentifyPlant: undefined });
        // Open plant identification
        handleIdentifyPlant();
      }
    });

    return unsubscribe;
  }, [navigation, route.params]);

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
   * Handle plant added to garden (broadcast from other users)
   * Refreshes the plant list to show the new plant
   * @param {Object} data - Broadcast data
   */
  const handlePlantAddedToGarden = (data) => {
    console.log('Plant added to garden by another user:', data);

    // Show notification to user
    if (data.message) {
      Alert.alert('Garden Update', data.message, [{ text: 'OK' }]);
    }

    // Refresh plant list to show the new plant
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
   * Handle plant deleted from garden (broadcast from other users)
   * Refreshes the plant list to remove the deleted plant
   * @param {Object} data - Broadcast data
   */
  const handlePlantDeletedFromGarden = (data) => {
    console.log('Plant deleted from garden by another user:', data);

    // Show notification to user
    if (data.message) {
      Alert.alert('Garden Update', data.message, [{ text: 'OK' }]);
    }

    // Refresh plant list to remove the deleted plant
    if (websocketService.isConnected()) {
      websocketService.sendMessage({ type: 'GET_MY_PLANTS' });
    }
  };

  /**
   * Handle plant updated in garden (broadcast from other users)
   * Refreshes the plant list to show the updated plant
   * @param {Object} data - Broadcast data
   */
  const handlePlantUpdatedInGarden = (data) => {
    console.log('Plant updated in garden by another user:', data);

    // Show notification to user
    if (data.message) {
      Alert.alert('Garden Update', data.message, [{ text: 'OK' }]);
    }

    // Refresh plant list to show the updated plant
    if (websocketService.isConnected()) {
      websocketService.sendMessage({ type: 'GET_MY_PLANTS' });
    }
  };

  /**
   * Handle valve blocking - refresh plant list to show updated valve status
   * @param {Object} data - Valve blocking data
   */
  const handleValveBlocked = (data) => {
    console.log('MainScreen: Valve blocked, refreshing plant list...');
    console.log('MainScreen: Valve blocked data:', data);
    // Refresh plant list to show updated valve_blocked status
    if (websocketService.isConnected()) {
      websocketService.sendMessage({ type: 'GET_MY_PLANTS' });
    }
  };

  /**
   * Handle plant data received from server
   * Transforms server data to match local plant format
   * @param {Object} data - Server plant data
   */
  const handlePlantsReceived = (data) => {
    console.log('🌿 GET_MY_PLANTS_RESPONSE:', data);
    if (data.plants) {
      // Transform server data to match our plant format
      // Preserve existing sensor data to prevent flicker
      setPlants(prevPlants => {
        const transformedPlants = data.plants.map(plant => {
          // Find existing plant data to preserve sensor values
          const existingPlant = prevPlants.find(p => p.id === plant.plant_id);
          console.log(`🌿 Transforming plant ${plant.name}:`, plant);

          // Normalize schedule fields from backend (DB columns: irrigation_days, irrigation_time)
          let normalizedDays = null;
          if (plant.irrigation_days) {
            if (Array.isArray(plant.irrigation_days)) {
              normalizedDays = plant.irrigation_days;
            } else {
              try {
                const parsed = JSON.parse(plant.irrigation_days);
                normalizedDays = Array.isArray(parsed) ? parsed : null;
              } catch (e) {
                normalizedDays = null;
              }
            }
          }
          const normalizedTime = plant.irrigation_time || null;
          const inferredMode = (normalizedDays && normalizedDays.length > 0 && normalizedTime) ? 'scheduled' : 'smart';

          const transformed = {
            id: plant.plant_id,
            name: plant.name,
            type: plant.plant_type || 'Unknown',
            image_url: plant.image_url,
            location: 'Garden',
            moisture: existingPlant?.moisture ?? null,
            temperature: existingPlant?.temperature ?? null,
            lightLevel: existingPlant?.lightLevel ?? 0,
            isHealthy: true,
            valve_blocked: plant.valve_blocked || false,
            sensor_port: plant.sensor_port || null,
            valve_id: plant.valve_id || null,
            // Include config fields for PlantDetail
            ideal_moisture: plant.ideal_moisture,
            water_limit: plant.water_limit,
            dripper_type: plant.dripper_type,
            // Schedule-related fields
            watering_mode: plant.watering_mode || inferredMode,
            schedule_days: normalizedDays,
            schedule_time: normalizedTime,
            // Persisted irrigation state (for rehydration)
            irrigation_mode: plant.irrigation_mode || 'none',
            irrigation_start_at: plant.irrigation_start_at || null,
            irrigation_end_at: plant.irrigation_end_at || null,
            irrigation_session_id: plant.irrigation_session_id || null,
          };
          console.log(`🌿 Transformed plant ${plant.name}:`, transformed);
          return transformed;
        });
        return transformedPlants;
      });

      // Rehydrate irrigation state from persisted fields AFTER plants state update commits
      try {
        setTimeout(() => {
          rehydrateFromPlants(data.plants);
        }, 0);
      } catch (e) {
        console.log('rehydrateFromPlants error:', e?.message);
      }
    }
  };

  /**
   * Handle moisture response for a specific plant
   * Updates the plant's moisture value with real data from server
   * @param {Object} data - Server moisture response data
   */
  const handlePlantMoistureResponse = (data) => {
    if (data.plant_id && data.moisture !== undefined) {
      setPlants(prevPlants =>
        prevPlants.map(plant =>
          plant.id === data.plant_id
            ? { ...plant, moisture: data.moisture }
            : plant
        )
      );
      console.log('Updated moisture for plant:', data.plant_id, 'to:', data.moisture);
    }
  };

  /**
   * Handle moisture response for all plants
   * Updates all plants' moisture and temperature values with real data from server
   * @param {Object} data - Server moisture response data
   */
  const handleAllPlantsMoistureResponse = (data) => {
    console.log('📊 MainScreen: Received ALL_PLANTS_MOISTURE_RESPONSE:', data);
    if (data.plants && Array.isArray(data.plants)) {
      console.log(`📊 MainScreen: Processing ${data.plants.length} plants with sensor data`);
      setPlants(prevPlants =>
        prevPlants.map(plant => {
          const sensorData = data.plants.find(p => p.plant_id === plant.id);
          if (sensorData) {
            const updatedPlant = { ...plant };
            if (sensorData.moisture !== undefined) {
              updatedPlant.moisture = sensorData.moisture;
              console.log(`💧 Plant ${plant.name}: moisture updated to ${sensorData.moisture}%`);
            }
            if (sensorData.temperature !== undefined) {
              updatedPlant.temperature = sensorData.temperature;
              console.log(`🌡️ Plant ${plant.name}: temperature updated to ${sensorData.temperature}°C`);
            }
            return updatedPlant;
          }
          return plant;
        })
      );
      console.log('✅ MainScreen: Updated moisture and temperature for all plants');
    } else {
      console.log('MainScreen: No plants data in response or invalid format');
    }
  };

  /**
   * Handle garden moisture update (broadcast from other users)
   * Updates plant moisture when another user requests moisture data
   * @param {Object} data - Broadcast moisture data
   */
  const handleGardenMoistureUpdate = (data) => {
    console.log('Garden moisture update from another user:', data);
    if (data.moistureData && data.moistureData.plant_id) {
      setPlants(prevPlants =>
        prevPlants.map(plant =>
          plant.id === data.moistureData.plant_id
            ? { ...plant, moisture: data.moistureData.moisture }
            : plant
        )
      );
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
      // Now that we're authenticated, request plants and garden data
      websocketService.sendMessage({ type: 'GET_MY_PLANTS' });
      websocketService.sendMessage({ type: 'GET_USER_GARDENS' });
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
   * Handle garden data received from server
   * Updates garden state with user's garden information
   * @param {Object} data - Server garden data
   */
  const handleGardenReceived = (data) => {
    console.log('Garden data received:', data);
    if (data.gardens && data.gardens.length > 0) {
      console.log('Setting garden from GET_USER_GARDENS_SUCCESS response:', data.gardens[0]);
      setGarden(data.gardens[0]); // User can only be in one garden
      setGardenLoading(false);
    } else {
      console.log('No gardens found for user');
      setGarden(null);
      setGardenLoading(false);
    }
  };

  /**
   * Handle garden creation success
   * Updates garden state with newly created garden
   * @param {Object} data - Garden creation response data
   */
  const handleGardenCreated = (data) => {
    console.log('Garden created successfully:', data);
    if (data.garden) {
      setGarden(data.garden);
    }
    // Refresh garden data
    websocketService.sendMessage({ type: 'GET_USER_GARDENS' });
  };

  /**
   * Handle garden joining success
   * Updates garden state with joined garden
   * @param {Object} data - Garden joining response data
   */
  const handleGardenJoined = (data) => {
    console.log('Garden joined successfully:', data);
    if (data.garden) {
      console.log('Setting garden state to:', data.garden);
      setGarden(data.garden);
    }
    // Refresh garden data
    websocketService.sendMessage({ type: 'GET_USER_GARDENS' });
  };

  /**
   * Handle garden leaving success
   * Clears garden state when user leaves garden
   * @param {Object} data - Garden leaving response data
   */
  const handleGardenLeft = (data) => {
    console.log('Garden left successfully:', data);
    setGarden(null);
    // Refresh garden data to confirm no gardens
    websocketService.sendMessage({ type: 'GET_USER_GARDENS' });
  };

  /**
   * Refresh garden data when screen comes into focus
   * This ensures garden state is up-to-date when returning from other screens
   */
  useFocusEffect(
    React.useCallback(() => {
      if (websocketService.isConnected()) {
        websocketService.sendMessage({ type: 'GET_USER_GARDENS' });
      }
    }, [])
  );

  /**
   * Set up WebSocket message handlers and connection management
   * Registers handlers for various server messages and manages connection state
   */
  useEffect(() => {
    console.log('MainScreen: Setting up WebSocket handlers...');
    websocketService.onMessage('ADD_PLANT_SUCCESS', handlePlantAdded);
    websocketService.onMessage('DELETE_PLANT_SUCCESS', handlePlantDeleted);
    websocketService.onMessage('PLANT_ADDED_TO_GARDEN', handlePlantAddedToGarden);
    websocketService.onMessage('PLANT_DELETED_FROM_GARDEN', handlePlantDeletedFromGarden);
    websocketService.onMessage('PLANT_UPDATED_IN_GARDEN', handlePlantUpdatedInGarden);
    websocketService.onMessage('GARDEN_MOISTURE_UPDATE', handleGardenMoistureUpdate);
    websocketService.onMessage('GET_MY_PLANTS_RESPONSE', handlePlantsReceived);
    websocketService.onMessage('GET_MY_PLANTS_FAIL', handlePlantsError);
    websocketService.onMessage('GET_USER_DETAILS_SUCCESS', handleUserNameReceived);
    websocketService.onMessage('GET_USER_DETAILS_FAIL', handleUserNameError);
    websocketService.onMessage('UNAUTHORIZED', handleUnauthorized);
    websocketService.onMessage('PLANT_MOISTURE_RESPONSE', handlePlantMoistureResponse);
    websocketService.onMessage('ALL_MOISTURE_RESPONSE', handleAllPlantsMoistureResponse);
    websocketService.onMessage('ALL_PLANTS_MOISTURE_RESPONSE', handleAllPlantsMoistureResponse);
    websocketService.onMessage('PLANT_IDENTIFY_RESULT', handlePlantIdentified);
    websocketService.onMessage('PLANT_IDENTIFY_FAIL', handlePlantIdentified);
    websocketService.onMessage('GET_USER_GARDENS_SUCCESS', handleGardenReceived);
    websocketService.onMessage('CREATE_GARDEN_SUCCESS', handleGardenCreated);
    websocketService.onMessage('JOIN_GARDEN_SUCCESS', handleGardenJoined);
    websocketService.onMessage('LEAVE_GARDEN_SUCCESS', handleGardenLeft);
    websocketService.onMessage('VALVE_BLOCKED', handleValveBlocked);
    // Garden-wide irrigation broadcasts
    const handleGardenIrrigationStarted = (message) => {
      const payload = message?.data || message;
      const pid = payload?.plantId != null ? Number(payload.plantId) : null;
      const mode = payload?.mode || 'smart';
      const duration = payload?.duration_minutes || null;
      try {
        // Immediate local UI update without waiting for DB fetch
        rehydrateIrrigationStarted(pid, mode, duration);
      } catch {}
    };
    const handleGardenIrrigationStopped = (message) => {
      const payload = message?.data || message;
      const pid = payload?.plantId != null ? Number(payload.plantId) : null;
      try {
        rehydrateIrrigationStopped(pid);
      } catch {}
    };
    websocketService.onMessage('GARDEN_IRRIGATION_STARTED', handleGardenIrrigationStarted);
    websocketService.onMessage('GARDEN_IRRIGATION_STOPPED', handleGardenIrrigationStopped);


    /**
     * Handle WebSocket connection status changes
     * Updates UI state and requests user data when connected
     * @param {boolean} connected - Connection status
     */
    const handleConnectionChange = (connected) => {
      setIsConnected(connected);
      if (connected) {
        // First check if we're authenticated by requesting user name
        websocketService.sendMessage({ type: 'GET_USER_DETAILS' });
      }
    };

    websocketService.onConnectionChange(handleConnectionChange);

    // Request user name from server if already connected
    if (websocketService.isConnected()) {
      websocketService.sendMessage({ type: 'GET_USER_DETAILS' });
    } else {
      websocketService.connect();
    }

    // Check connection after a short delay to ensure WebSocket has time to connect
    const connectionTimer = setTimeout(() => {
      if (websocketService.isConnected()) {
        websocketService.sendMessage({ type: 'GET_USER_DETAILS' });
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
      websocketService.offMessage('PLANT_ADDED_TO_GARDEN', handlePlantAddedToGarden);
      websocketService.offMessage('PLANT_DELETED_FROM_GARDEN', handlePlantDeletedFromGarden);
      websocketService.offMessage('PLANT_UPDATED_IN_GARDEN', handlePlantUpdatedInGarden);
      websocketService.offMessage('GARDEN_MOISTURE_UPDATE', handleGardenMoistureUpdate);
      websocketService.offMessage('GET_MY_PLANTS_RESPONSE', handlePlantsReceived);
      websocketService.offMessage('GET_MY_PLANTS_FAIL', handlePlantsError);
      websocketService.offMessage('GET_USER_DETAILS_SUCCESS', handleUserNameReceived);
      websocketService.offMessage('GET_USER_DETAILS_FAIL', handleUserNameError);
      websocketService.offMessage('UNAUTHORIZED', handleUnauthorized);
      websocketService.offMessage('PLANT_MOISTURE_RESPONSE', handlePlantMoistureResponse);
      websocketService.offMessage('ALL_MOISTURE_RESPONSE', handleAllPlantsMoistureResponse);
      websocketService.offMessage('ALL_PLANTS_MOISTURE_RESPONSE', handleAllPlantsMoistureResponse);
      websocketService.offMessage('PLANT_IDENTIFY_RESULT', handlePlantIdentified);
      websocketService.offMessage('PLANT_IDENTIFY_FAIL', handlePlantIdentified);
      websocketService.offMessage('GET_USER_GARDENS_SUCCESS', handleGardenReceived);
      websocketService.offMessage('CREATE_GARDEN_SUCCESS', handleGardenCreated);
      websocketService.offMessage('JOIN_GARDEN_SUCCESS', handleGardenJoined);
      websocketService.offMessage('LEAVE_GARDEN_SUCCESS', handleGardenLeft);
      websocketService.offMessage('VALVE_BLOCKED', handleValveBlocked);
      websocketService.offMessage('GARDEN_IRRIGATION_STARTED', handleGardenIrrigationStarted);
      websocketService.offMessage('GARDEN_IRRIGATION_STOPPED', handleGardenIrrigationStopped);
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
        console.log('🔄 MainScreen: Screen focused, requesting data...');
        websocketService.sendMessage({ type: 'GET_MY_PLANTS' });
        // Request moisture and temperature data for all plants
        console.log('🌡️ MainScreen: Requesting moisture and temperature for all plants...');
        websocketService.sendMessage({ type: 'GET_ALL_PLANTS_MOISTURE' });
        // Refresh session when user is active
        sessionService.refreshSession();
      } else {
        console.log('❌ MainScreen: WebSocket not connected, cannot request data');
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
   * Handle garden navigation
   * Navigates to garden management screen
   */
  const handleGarden = () => {
    console.log('handleGarden called, garden state:', garden);
    if (garden) {
      console.log('Navigating to Garden screen with garden:', garden);
      navigation.navigate('Garden', { garden });
    } else {
      console.log('Navigating to CreateOrJoinGarden screen');
      navigation.navigate('CreateOrJoinGarden');
    }
  };

  /**
   * Handle garden settings
   * Navigates to garden settings screen
   */
  const handleGardenSettings = () => {
    if (garden) {
      navigation.navigate('GardenSettings', { garden });
    }
  };

  /**
   * Handle create or join garden
   * Navigates to garden creation/joining screen
   */
  const handleCreateOrJoinGarden = () => {
    navigation.navigate('CreateOrJoinGarden');
  };

  /**
   * Handle plant identification
   * Shows modal to choose between camera and gallery
   */
  const handleIdentifyPlant = () => {
    setShowImagePicker(true);
  };

  /**
   * Launch image picker to select image from gallery
   * Allows user to choose an existing photo from their device
   */
  const pickImage = async () => {
    try {
      // Request camera roll permissions
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission needed', 'Please grant camera roll permissions to identify plants.');
        return;
      }

      // Launch image picker with higher compression for plant identification
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.6, // Lower quality for smaller file size
        base64: true,
      });

      if (!result.canceled && result.assets && result.assets[0]) {
        await processImageForIdentification(result.assets[0]);
      }
    } catch (error) {
      console.error('Error picking image:', error);
      Alert.alert('Error', 'Failed to pick image. Please try again.');
    }
    setShowImagePicker(false);
  };

  /**
   * Launch camera to take a new photo
   * Handles camera permissions and captures new plant image
   */
  const takePhoto = async () => {
    try {
      // Check camera permissions
      if (!cameraPermission?.granted) {
        const permission = await requestCameraPermission();
        if (!permission.granted) {
          Alert.alert('Permission needed', 'Camera permission is required to take photos');
          return;
        }
      }

      const result = await ImagePicker.launchCameraAsync({
        allowsEditing: true,
        aspect: [1, 1], // Square aspect ratio
        quality: 0.6, // Lower quality for smaller file size
        base64: true,
      });

      if (!result.canceled && result.assets && result.assets[0]) {
        await processImageForIdentification(result.assets[0]);
      }
    } catch (error) {
      console.error('Error taking photo:', error);
      Alert.alert('Error', 'Failed to take photo. Please try again.');
    }
    setShowImagePicker(false);
  };

  /**
   * Process image for plant identification
   * Handles image validation and sends to backend
   * @param {Object} imageAsset - Image asset from picker
   */
  const processImageForIdentification = async (imageAsset) => {
    const base64Image = imageAsset.base64;

    // Check image size before sending (5MB limit)
    const imageSizeBytes = Math.ceil((base64Image.length * 3) / 4);
    const maxSizeBytes = 5 * 1024 * 1024; // 5MB

    if (imageSizeBytes > maxSizeBytes) {
      Alert.alert(
        'Image Too Large',
        'The selected image is too large. Please try with a smaller image or lower quality.',
        [{ text: 'OK' }]
      );
      return;
    }

    console.log(`Image size: ${Math.round(imageSizeBytes / 1024 / 1024 * 100) / 100}MB`);

    if (!websocketService.isConnected()) {
      Alert.alert('Error', 'Not connected to server. Please check your connection and try again.');
      return;
    }

    // Show loading state
    setLoading(true);
    setLoadingMessage('Identifying plant... This may take 10-15 seconds');

    // Send image to backend for identification
    websocketService.sendMessage({
      type: 'PLANT_IDENTIFY',
      imageBase64: base64Image
    });

    console.log('Plant identification request sent');
  };

  /**
   * Handle plant identification response
   * Shows alert with identified plant type
   * @param {Object} data - Plant identification response data
   */
  const handlePlantIdentified = (message) => {
    console.log('🌱 Plant identification response received:', message);

    // Hide loading state
    setLoading(false);
    setLoadingMessage('');

    // Extract the actual data from the message
    const data = message.data || message;

    if (message.type === 'PLANT_IDENTIFY_FAIL') {
      console.log('❌ Plant identification failed:', message.message);
      Alert.alert('Identification Failed', message.message || 'Unable to identify the plant. Please try again.');
      return;
    }

    if (data.species && data.probability) {
      const confidence = Math.round(data.probability * 100);
      console.log('✅ High confidence identification:', data.species, confidence + '%');

      // Check if we came from AddPlantScreen
      if (route.params?.fromAddPlant) {
        // Navigate back to AddPlantScreen with the identified plant type and care data
        navigation.navigate('AddPlant', {
          identifiedPlantType: data.species,
          confidence: data.probability, // Pass the raw probability (0-1)
          careData: data.careData // Pass the care data if available
        });
      } else {
        // Show enhanced alert with care data if available
        let message = `This appears to be a ${data.species} (${confidence}% confidence)`;
        if (data.careData) {
          message += `\n\n🌱 Care Tips:\n• Optimal Moisture: ${data.careData.optimalMoisture}%\n• Watering: ${data.careData.wateringFrequency}\n• ${data.careData.wateringTips}`;
        }

        Alert.alert(
          'Plant Identified!',
          message,
          [{ text: 'OK' }]
        );
      }
    } else if (data.suggestions && data.suggestions.length > 0) {
      const topSuggestion = data.suggestions[0];
      const confidence = Math.round(topSuggestion.probability * 100);
      console.log('✅ Suggestion-based identification:', topSuggestion.species, confidence + '%');
      Alert.alert(
        'Plant Identified!',
        `This might be a ${topSuggestion.species} (${confidence}% confidence)`,
        [{ text: 'OK' }]
      );
    } else {
      console.log('❌ No identification results found');
      Alert.alert('Identification Failed', 'Unable to identify the plant. Please try with a clearer image.');
    }
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
    <SafeAreaView style={{ flex: 1, backgroundColor: '#FFFFFF' }}>
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

          {/* Garden Status Banner */}
          {!gardenLoading && (
            <View style={styles.gardenStatusContainer}>
              {garden ? (
                <View style={styles.gardenActiveBanner}>
                  <View style={styles.gardenInfo}>
                    <View style={styles.gardenIconContainerActive}>
                      <Feather name="users" size={18} color="#22C55E" />
                    </View>
                    <Text style={styles.gardenStatusText}>
                      Garden: {garden.name} • {garden.member_count || 1} member{garden.member_count !== 1 ? 's' : ''}
                    </Text>
                  </View>
                  <TouchableOpacity onPress={handleGardenSettings} style={styles.gardenSettingsButton}>
                    <Feather name="settings" size={18} color="#22C55E" />
                  </TouchableOpacity>
                </View>
              ) : (
                <View style={styles.gardenInactiveBanner}>
                  <TouchableOpacity onPress={handleCreateOrJoinGarden} style={styles.gardenInfo}>
                    <View style={styles.gardenIconContainerInactive}>
                      <Feather name="plus" size={18} color="#F59E0B" />
                    </View>
                    <Text style={styles.gardenStatusTextClickable}>
                      Join a garden to start managing plants
                    </Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>
          )}

          {/* Plants List Section */}
          <View style={styles.plantsSection}>
            <Text style={styles.sectionTitle}>
              {garden ? `${garden.name} Plants` : 'My Plants'}
            </Text>
            <View style={styles.titleSeparator} />
            <PlantList
              plants={plants}
              onWaterPlant={handleWaterPlant}
              onAddPlant={garden ? handleAddPlant : handleCreateOrJoinGarden}
              getPlantWateringState={getPlantWateringState}
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
        onGarden={handleGarden}
        onAddPlant={handleAddPlant}
        onIdentifyPlant={handleIdentifyPlant}
        onSettings={handleSettings}
        onHelp={handleHelp}
      />

      {/* Image Picker Modal */}
      <Modal
        visible={showImagePicker}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowImagePicker(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Identify Plant</Text>
            <TouchableOpacity style={styles.modalButton} onPress={takePhoto}>
              <Feather name="camera" size={24} color="#16A34A" />
              <Text style={styles.modalButtonText}>Take Photo</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.modalButton} onPress={pickImage}>
              <Feather name="image" size={24} color="#16A34A" />
              <Text style={styles.modalButtonText}>Choose from Gallery</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.modalButton, styles.cancelButton]}
              onPress={() => setShowImagePicker(false)}
            >
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Loading Overlay */}
      {loading && (
        <View style={styles.loadingOverlay}>
          <View style={styles.loadingCard}>
            <ActivityIndicator size="large" color="#4A90E2" />
            <Text style={styles.loadingText}>{loadingMessage}</Text>
          </View>
        </View>
      )}
    </SafeAreaView>
  );
};

export default MainScreen;