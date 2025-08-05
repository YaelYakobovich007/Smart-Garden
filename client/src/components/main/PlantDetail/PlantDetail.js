/**
 * Plant Detail Component - Individual Plant Information and Management
 * 
 * This component displays detailed information about a specific plant including:
 * - Plant image with overlay information
 * - Plant type/genus information
 * - Current conditions (humidity, temperature)
 * - Plant management actions (water, schedule, delete)
 * 
 * The component handles WebSocket communication for plant management
 * and provides a comprehensive view for individual plant care.
 */

import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  SafeAreaView,
  StatusBar,
  TouchableOpacity,
  Image,
  Alert,
  ScrollView,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useNavigation, useRoute } from '@react-navigation/native';
import { styles } from './styles';
import MoistureCircle from '../PlantList/MoistureCircle';
import TempCircle from '../PlantList/TempCircle';
import websocketService from '../../../services/websocketService';

const PlantDetail = () => {
  const navigation = useNavigation();
  const route = useRoute();
  const { plant } = route.params || {};

  // State for real-time sensor data
  const [currentMoisture, setCurrentMoisture] = useState(plant?.moisture || 0);
  const [currentTemperature, setCurrentTemperature] = useState(plant?.temperature || 0);

  /**
   * Get plant image based on plant type
   * Maps plant types to local image assets for display
   * @param {string} plantType - Type of plant
   * @returns {Object} Image source object
   */
  const getPlantImage = (plantType) => {
    // Use actual plant images based on plant type
    switch (plantType.toLowerCase()) {
      case 'rose':
        return require('../../../data/plants/rose_plant.png');
      case 'basil':
        return require('../../../data/plants/basil_plant.png');
      case 'monstera':
        return require('../../../data/plants/monstera_plant.png');
      case 'petunia':
        return require('../../../data/plants/Petunia_plant.png');
      case 'marigold':
        return require('../../../data/plants/marigold_plant.png');
      case 'cyclamen':
        return require('../../../data/plants/cyclamen_plant.png');
      case 'sansevieria':
        return require('../../../data/plants/sansevieria_plant.png');
      default:
        // Fallback to the original image if plant type doesn't match
        return require('../../../../assets/images/Branch_With_Leafs.png');
    }
  };

  /**
   * Render error state when plant data is not available
   * Shows error message when plant parameter is missing
   */
  if (!plant) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>Plant not found</Text>
        </View>
      </SafeAreaView>
    );
  }

  /**
   * Set up WebSocket message handlers for plant management
   * Handles irrigation responses and plant deletion responses
   */
  useEffect(() => {
    /**
     * Handle successful irrigation response
     * Shows success alert to user
     * @param {Object} data - Server response data
     */
    const handleSuccess = (data) => {
      Alert.alert('Irrigation', data?.message || 'Irrigation performed successfully!');
    };

    /**
     * Handle failed irrigation response
     * Shows error alert to user
     * @param {Object} data - Server response data
     */
    const handleFail = (data) => {
      Alert.alert('Irrigation', data?.message || 'Failed to irrigate the plant.');
    };

    /**
     * Handle skipped irrigation response
     * Shows info alert to user
     * @param {Object} data - Server response data
     */
    const handleSkipped = (data) => {
      Alert.alert('Irrigation', data?.message || 'Irrigation was skipped.');
    };

    /**
     * Handle successful plant deletion response
     * Shows success alert and navigates back
     * @param {Object} data - Server response data
     */
    const handleDeleteSuccess = (data) => {
      Alert.alert('Delete Plant', data?.message || 'Plant deleted successfully!', [
        { text: 'OK', onPress: () => navigation.goBack() }
      ]);
    };

    /**
     * Handle failed plant deletion response
     * Shows error alert to user
     * @param {Object} data - Server response data
     */
    const handleDeleteFail = (data) => {
      Alert.alert('Delete Plant', data?.message || 'Failed to delete plant.');
    };

    /**
     * Handle successful moisture response
     * Updates the moisture and temperature circles with real-time data
     * @param {Object} data - Server response data
     */
    const handleMoistureSuccess = (data) => {
      if (data.moisture !== undefined) {
        setCurrentMoisture(data.moisture);
        console.log(`📊 Updated moisture for ${plant.name}: ${data.moisture}%`);
      }
      
      if (data.temperature !== undefined) {
        setCurrentTemperature(data.temperature);
        console.log(`🌡️ Updated temperature for ${plant.name}: ${data.temperature}°C`);
      }
      
      // Show success alert
      Alert.alert(
        'Sensor Data Updated', 
        `Current moisture: ${data.moisture?.toFixed(1) || 'N/A'}%\nCurrent temperature: ${data.temperature?.toFixed(1) || 'N/A'}°C`,
        [{ text: 'OK' }]
      );
    };

    /**
     * Handle failed moisture response
     * Shows error alert to user
     * @param {Object} data - Server response data
     */
    const handleMoistureFail = (data) => {
      Alert.alert('Sensor Error', data?.message || 'Failed to get sensor data.');
    };

    // Register WebSocket message handlers
    websocketService.onMessage('IRRIGATE_SUCCESS', handleSuccess);
    websocketService.onMessage('IRRIGATE_FAIL', handleFail);
    websocketService.onMessage('IRRIGATE_SKIPPED', handleSkipped);
    websocketService.onMessage('DELETE_PLANT_SUCCESS', handleDeleteSuccess);
    websocketService.onMessage('DELETE_PLANT_FAIL', handleDeleteFail);
    websocketService.onMessage('PLANT_MOISTURE_RESPONSE', handleMoistureSuccess);
    websocketService.onMessage('GET_MOISTURE_SUCCESS', handleMoistureSuccess);
    websocketService.onMessage('GET_MOISTURE_FAIL', handleMoistureFail);

    /**
     * Cleanup function to remove message handlers
     * Prevents memory leaks when component unmounts
     */
    return () => {
      websocketService.onMessage('IRRIGATE_SUCCESS', () => { });
      websocketService.onMessage('IRRIGATE_FAIL', () => { });
      websocketService.onMessage('IRRIGATE_SKIPPED', () => { });
      websocketService.onMessage('DELETE_PLANT_SUCCESS', () => { });
      websocketService.onMessage('DELETE_PLANT_FAIL', () => { });
      websocketService.onMessage('PLANT_MOISTURE_RESPONSE', () => { });
      websocketService.onMessage('GET_MOISTURE_SUCCESS', () => { });
      websocketService.onMessage('GET_MOISTURE_FAIL', () => { });
    };
  }, [navigation, plant.name]);

  /**
   * Handle plant watering action
   * Sends irrigation command to server via WebSocket
   */
  const handleWaterPlant = () => {
    if (!plant?.name) {
      Alert.alert('Error', 'Plant name is missing.');
      return;
    }
    websocketService.sendMessage({
      type: 'IRRIGATE_PLANT',
      plantName: plant.name,
    });
    Alert.alert('Irrigation', 'Irrigation command sent. Please wait for result.');
  };

  /**
   * Handle get current sensor data action
   * Requests current moisture and temperature for the specific plant
   */
  const handleGetCurrentHumidity = () => {
    if (!plant?.name) {
      Alert.alert('Error', 'Plant name is missing.');
      return;
    }
    
    if (!websocketService.isConnected()) {
      Alert.alert('Error', 'Not connected to server. Please check your connection and try again.');
      return;
    }

    // Request moisture for this specific plant using plant name
    websocketService.sendMessage({
      type: 'GET_PLANT_MOISTURE',
      plantName: plant.name
    });
    Alert.alert('Sensor Request', 'Requesting current moisture and temperature data. Please wait...');
  };

  /**
   * Handle plant deletion action
   * Shows confirmation dialog and sends deletion command
   */
  const handleDeletePlant = () => {
    if (!plant?.name) {
      Alert.alert('Error', 'Plant name is missing.');
      return;
    }

    Alert.alert(
      'Delete Plant',
      `Are you sure you want to delete "${plant.name}"? This action cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Delete', 
          style: 'destructive',
          onPress: () => {
            websocketService.sendMessage({
              type: 'DELETE_PLANT',
              plantName: plant.name
            });
          }
        }
      ]
    );
  };

  /**
   * Main render function for the PlantDetail component
   * Includes header, plant image, information, and action buttons
   */
  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />

      {/* Header with back button and title */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Feather name="chevron-left" size={24} color="#2C3E50" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Plant Details</Text>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Plant Image and Name Overlay */}
        <View style={styles.imageContainer}>
          {console.log('PlantDetail image debug:', {
            plantName: plant.name,
            image_url: plant.image_url,
            type: plant.type,
            hasImageUrl: !!plant.image_url
          })}
          <Image
            source={
              plant.image_url
                ? {
                  uri: plant.image_url,
                  headers: {
                    'Accept': 'image/*',
                    'Cache-Control': 'no-cache'
                  }
                }
                : getPlantImage(plant.type)
            }
            style={styles.plantImage}
            onLoad={() => console.log('PlantDetail image loaded successfully for:', plant.name)}
            onError={(error) => console.log('PlantDetail image load error for:', plant.name, error.nativeEvent)}
          />
          <View style={styles.infoOverlay}>
            <View style={styles.separator} />
            <Text style={styles.infoLabel}>Plant Name</Text>
            <Text style={styles.plantName}>{plant.name}</Text>
          </View>
        </View>

        {/* Plant Type Information */}
        <View style={styles.plantTypeContainer}>
          <Text style={styles.infoLabel}>Genus</Text>
          <Text style={styles.plantType}>{plant.type}</Text>
        </View>

        {/* Current Conditions Section */}
        <View style={styles.statsContainer}>
          <Text style={styles.sectionTitle}>Current Conditions</Text>

          <View style={styles.statsGrid}>
            <View style={styles.statCard}>
              <MoistureCircle percent={currentMoisture} />
              <Text style={styles.statLabel}>Moisture</Text>
            </View>

            <View style={styles.statCard}>
              <TempCircle value={currentTemperature} />
              <Text style={styles.statLabel}>Temperature</Text>
            </View>
          </View>
        </View>

        {/* Plant Management Actions */}
        <View style={styles.actionsContainer}>
          <Text style={styles.sectionTitle}>Actions</Text>
          
          <TouchableOpacity style={styles.waterButton} onPress={handleWaterPlant}>
            <Feather name="droplet" size={20} color="#FFFFFF" />
            <Text style={styles.waterButtonText}>Water Now</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.humidityButton} onPress={handleGetCurrentHumidity}>
            <Feather name="thermometer" size={20} color="#FFFFFF" />
            <Text style={styles.humidityButtonText}>Get Current Sensor Data</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.scheduleButton}>
            <Feather name="calendar" size={20} color="#FFFFFF" />
            <Text style={styles.scheduleButtonText}>View Schedule</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.deleteButton} onPress={handleDeletePlant}>
            <Feather name="trash-2" size={20} color="#FFFFFF" />
            <Text style={styles.deleteButtonText}>Delete Plant</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

export default PlantDetail; 