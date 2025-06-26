import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  SafeAreaView,
  StatusBar,
  Alert,
  TouchableOpacity,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { styles } from './styles';
import websocketService from '../../services/websocketService';

// Import components from their new folder locations
import NotificationArea from './NotificationArea/NotificationArea';
import PlantList from './PlantList/PlantList';
import BottomToolbar from './BottomToolbar/BottomToolbar';

// Import simulation data from data folder
import {
  getSimulatedPlants,
  getSimulatedNotifications,
  simulationConfig
} from '../../data';

const MainScreen = () => {
  const navigation = useNavigation();
  const [isSimulationMode] = useState(simulationConfig.isEnabled);
  const [plants, setPlants] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [userName] = useState('John'); // TODO: Get from user profile/authentication
  const [isConnected, setIsConnected] = useState(websocketService.isConnected());

  // Load simulation data
  useEffect(() => {
    if (isSimulationMode) {
      // Load plants and notifications from simulation data
      setPlants(getSimulatedPlants());
      setNotifications(getSimulatedNotifications());
    }
  }, [isSimulationMode]);

  // Set up WebSocket message handlers
  useEffect(() => {
    websocketService.onMessage('ADD_PLANT_SUCCESS', handlePlantAdded);
    websocketService.onMessage('GET_MY_PLANTS_RESPONSE', handlePlantsReceived);
    websocketService.onMessage('GET_MY_PLANTS_FAIL', handlePlantsError);

    // Listen for connection changes
    websocketService.onConnectionChange((connected) => {
      setIsConnected(connected);
      if (connected) {
        // Request plants when connection is established
        websocketService.sendMessage({ type: 'GET_MY_PLANTS' });
      }
    });

    // Request plants from server if already connected
    if (websocketService.isConnected()) {
      websocketService.sendMessage({ type: 'GET_MY_PLANTS' });
    }
  }, []);

  const handlePlantAdded = (data) => {
    // Refresh plant list after adding a new plant
    if (websocketService.isConnected()) {
      websocketService.sendMessage({ type: 'GET_MY_PLANTS' });
    }
  };

  const handlePlantsReceived = (data) => {
    if (data.plants) {
      // Transform server data to match our plant format
      const transformedPlants = data.plants.map(plant => ({
        id: plant.plant_id,
        name: plant.name,
        type: plant.plant_type || 'Unknown',
        location: 'Garden', // Default location
        moisture: Math.floor(Math.random() * 61) + 20, // Simulated moisture
        temperature: Math.floor(Math.random() * 15) + 20, // Simulated temperature
        lightLevel: Math.floor(Math.random() * 41) + 40, // Simulated light level
        isHealthy: true, // Default to healthy
      }));
      setPlants(transformedPlants);
    }
  };

  const handlePlantsError = (data) => {
    console.error('Failed to fetch plants:', data.message);
    // Keep using simulation data if server fails
    if (isSimulationMode) {
      setPlants(getSimulatedPlants());
    }
  };

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

  const handleSchedule = () => {
    Alert.alert(
      'Schedule',
      'Schedule functionality will be implemented here',
      [{ text: 'OK' }]
    );
  };

  const handleSettings = () => {
    Alert.alert(
      'Settings',
      'Settings functionality will be implemented here',
      [{ text: 'OK' }]
    );
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
          onPress: () => navigation.navigate('Login')
        }
      ]
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />

      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerContent}>
          <View style={styles.headerLeft}>
            <Text style={styles.greeting}>Hello, {userName}!</Text>
            <Text style={styles.subtitle}>How are your plants today?</Text>
          </View>
          <View style={styles.headerActions}>
            {isSimulationMode && (
              <View style={styles.simulationBadge}>
                <Feather name="play" size={12} color="#FFFFFF" />
                <Text style={styles.simulationText}>Simulation</Text>
              </View>
            )}
            <TouchableOpacity onPress={handleLogout} style={styles.logoutButton}>
              <Feather name="log-out" size={20} color="#7F8C8D" />
            </TouchableOpacity>
          </View>
        </View>
      </View>

      {/* Connection Status */}
      {!isConnected && (
        <View style={styles.connectionWarning}>
          <Feather name="wifi-off" size={16} color="#E74C3C" />
          <Text style={styles.connectionWarningText}>
            Offline mode - using simulation data
          </Text>
        </View>
      )}

      {/* Plants List */}
      <View style={styles.plantsSection}>
        <Text style={styles.sectionTitle}>My Plants</Text>
        <PlantList
          plants={plants}
          isSimulationMode={isSimulationMode}
          onWaterPlant={handleWaterPlant}
        />
      </View>

      {/* Notifications Area */}
      <View style={styles.notificationsSection}>
        <Text style={styles.sectionTitle}>Recent Activity</Text>
        <NotificationArea
          notifications={notifications}
          isSimulationMode={isSimulationMode}
        />
      </View>

      {/* Bottom Toolbar */}
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