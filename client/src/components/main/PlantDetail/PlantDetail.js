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

    // Register WebSocket message handlers
    websocketService.onMessage('IRRIGATE_SUCCESS', handleSuccess);
    websocketService.onMessage('IRRIGATE_FAIL', handleFail);
    websocketService.onMessage('IRRIGATE_SKIPPED', handleFail);

    /**
     * Handle successful plant deletion
     * Shows success alert and navigates back to main screen
     * @param {Object} data - Server response data
     */
    const handleDeleteSuccess = (data) => {
      Alert.alert('Success', 'Plant deleted successfully!', [
        { text: 'OK', onPress: () => navigation.goBack() }
      ]);
    };

    /**
     * Handle failed plant deletion
     * Shows error alert to user
     * @param {Object} data - Server response data
     */
    const handleDeleteFail = (data) => {
      Alert.alert('Error', data?.message || 'Failed to delete the plant.');
    };

    // Register deletion message handlers
    websocketService.onMessage('DELETE_PLANT_SUCCESS', handleDeleteSuccess);
    websocketService.onMessage('DELETE_PLANT_FAIL', handleDeleteFail);

    /**
     * Handle successful moisture response
     * Shows current humidity level to user
     * @param {Object} data - Server response data
     */
    const handleMoistureSuccess = (data) => {
      if (data.moisture !== undefined) {
        Alert.alert(
          'Current Humidity', 
          `The current humidity level for ${plant.name} is ${data.moisture.toFixed(1)}%`,
          [{ text: 'OK' }]
        );
      } else {
        Alert.alert('Humidity Data', data?.message || 'Humidity data received successfully!');
      }
    };

    /**
     * Handle failed moisture response
     * Shows error alert to user
     * @param {Object} data - Server response data
     */
    const handleMoistureFail = (data) => {
      Alert.alert('Humidity Error', data?.message || 'Failed to get humidity data.');
    };

    // Register moisture message handlers
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
  }, [navigation]);

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
   * Handle get current humidity action
   * Requests current moisture level for the specific plant
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
    Alert.alert('Humidity Request', 'Requesting current humidity level. Please wait...');
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
              plantName: plant.name,
            });
          }
        }
      ]
    );
  };

  /**
   * Render the plant detail screen
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
              <MoistureCircle percent={plant.moisture} />
              <Text style={styles.statLabel}>Humidity</Text>
            </View>

            <View style={styles.statCard}>
              <TempCircle value={plant.temperature} />
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
            <Text style={styles.humidityButtonText}>Get Current Humidity</Text>
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