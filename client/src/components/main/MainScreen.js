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

  // Load simulation data
  useEffect(() => {
    if (isSimulationMode) {
      // Load plants and notifications from simulation data
      setPlants(getSimulatedPlants());
      setNotifications(getSimulatedNotifications());
    }
  }, [isSimulationMode]);

  const handleWaterPlant = (plantId) => {
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
            <Text style={styles.greeting}>Hello, {userName}</Text>
            <Text style={styles.headerTitle}>Smart Garden</Text>
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