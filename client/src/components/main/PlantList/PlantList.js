/**
 * Plant List Component - Plant Display and Management
 * 
 * This component displays a list of user's plants in a horizontal scrollable format.
 * It handles:
 * - Plant data display with images and status indicators
 * - Empty state when no plants are present
 * - Plant interaction (watering, navigation to details)
 * - Plant status visualization (moisture, temperature, health)
 * 
 * The component supports both individual plant cards and an empty state
 * with an "Add your first plant" button.
 */

import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Image,
  FlatList,
  Dimensions,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { styles } from './styles';
import MoistureCircle from './MoistureCircle';
import TempCircle from './TempCircle';
import websocketService from '../../../services/websocketService';

// Calculate card width based on screen dimensions for responsive design
const CARD_WIDTH = Math.floor(Dimensions.get('window').width * 0.65);

const PlantList = ({ plants, onWaterPlant, onAddPlant }) => {
  const navigation = useNavigation();

  /**
   * Get color for moisture level visualization
   * Returns appropriate color based on moisture percentage
   * @param {number} moisture - Moisture percentage (0-100)
   * @returns {string} Color hex code
   */
  const getMoistureColor = (moisture) => {
    if (moisture < 30) return '#EF4444'; // Red for dry
    if (moisture < 60) return '#F59E0B'; // Orange for moderate
    return '#10B981'; // Green for good
  };

  /**
   * Get text status for moisture level
   * Returns human-readable status based on moisture percentage
   * @param {number} moisture - Moisture percentage (0-100)
   * @returns {string} Status text
   */
  const getMoistureStatus = (moisture) => {
    if (moisture < 30) return 'Dry';
    if (moisture < 60) return 'Moderate';
    return 'Good';
  };

  /**
   * Determine overall plant health status
   * Combines moisture, health, and other factors for status determination
   * @param {Object} plant - Plant object with health data
   * @returns {string} Plant status
   */
  const getPlantStatus = (plant) => {
    if (plant.moisture < 30) return 'critical';
    if (plant.moisture < 60) return 'needs-water';
    if (!plant.isHealthy) return 'needs-attention';
    return 'healthy';
  };

  /**
   * Get color scheme for plant status indicators
   * Returns colors for text, background, and border based on status
   * @param {string} status - Plant status
   * @returns {Object} Color scheme object
   */
  const getStatusColor = (status) => {
    switch (status) {
      case 'healthy': return { text: '#059669', bg: '#D1FAE5', border: '#A7F3D0' };
      case 'needs-water': return { text: '#2563EB', bg: '#DBEAFE', border: '#93C5FD' };
      case 'needs-attention': return { text: '#D97706', bg: '#FEF3C7', border: '#FCD34D' };
      case 'critical': return { text: '#DC2626', bg: '#FEE2E2', border: '#FCA5A5' };
    }
  };

  /**
   * Get icon for plant status visualization
   * Returns appropriate Feather icon based on plant status
   * @param {string} status - Plant status
   * @returns {JSX.Element} Icon component
   */
  const getStatusIcon = (status) => {
    switch (status) {
      case 'healthy': return <Feather name="check-circle" size={16} color="#059669" />;
      case 'needs-water': return <Feather name="droplets" size={16} color="#2563EB" />;
      case 'needs-attention': return <Feather name="clock" size={16} color="#D97706" />;
      case 'critical': return <Feather name="alert-triangle" size={16} color="#DC2626" />;
    }
  };

  /**
   * Get text description for plant status
   * Returns human-readable status text
   * @param {string} status - Plant status
   * @returns {string} Status text
   */
  const getStatusText = (status) => {
    switch (status) {
      case 'healthy': return 'Healthy';
      case 'needs-water': return 'Needs Water';
      case 'needs-attention': return 'Needs Attention';
      case 'critical': return 'Critical';
    }
  };

  /**
   * Get plant image based on plant type
   * Maps plant types to local image assets
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
   * Handle plant watering action
   * Triggers watering command and logs the action
   * @param {string} plantId - ID of the plant to water
   */
  const handleWaterPlant = (plantId) => {
    if (onWaterPlant) {
      onWaterPlant(plantId);
    }
    // TODO: Send watering command to server
    console.log('Watering plant:', plantId);
  };

  /**
   * Handle plant card press
   * Navigates to plant detail screen with plant data
   * @param {Object} plant - Plant object to view details for
   */
  const handlePlantPress = (plant) => {
    // Navigate to plant detail screen
    navigation.navigate('PlantDetail', { plant });
  };

  /**
   * Handle moisture request for a specific plant
   * Sends WebSocket request to get current moisture data
   * @param {number} plantId - ID of the plant to get moisture for
   */
  const handleMoistureRequest = (plantId) => {
    if (websocketService.isConnected()) {
      websocketService.requestPlantMoisture(plantId);
      console.log('Requested moisture for plant:', plantId);
    } else {
      console.log('WebSocket not connected, cannot request moisture');
    }
  };

  /**
   * Render empty state when no plants are present
   * Shows encouraging message and add plant button
   */
  if (plants.length === 0) {
    return (
      <View style={styles.emptyState}>
        <Image
          source={require('../../../../assets/images/leaves.png')}
          style={styles.emptyStateIcon}
        />
        <Text style={styles.emptyStateText}>No plants yet</Text>
        <Text style={styles.emptyStateSubtext}>
          Add your first plant to start building your smart garden ecosystem.
        </Text>
        <TouchableOpacity
          style={styles.addFirstPlantButton}
          onPress={onAddPlant}
        >
          <Text style={styles.addFirstPlantButtonText}>Add Your First Plant+</Text>
        </TouchableOpacity>
      </View>
    );
  }

  /**
   * Render plant list with horizontal scrolling
   * Displays plant cards in a FlatList for smooth scrolling
   */
  return (
    <View style={styles.plantsSection}>
      <FlatList
        data={plants}
        keyExtractor={(item) => item.id.toString()}
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ paddingHorizontal: 16 }}
        snapToInterval={CARD_WIDTH + 16}
        decelerationRate="fast"
        style={{ height: 320 }}
        renderItem={({ item: plant }) => (
          <TouchableOpacity
            key={plant.id}
            style={[styles.plantCard, { width: CARD_WIDTH }]}
            onPress={() => handlePlantPress(plant)}
          >
            {/* Plant Image Container */}
            <View style={styles.plantImageContainer}>
              {console.log('Plant image debug:', {
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
                onLoad={() => console.log('Image loaded successfully for:', plant.name)}
                onError={(error) => console.log('Image load error for:', plant.name, error.nativeEvent)}
              />
            </View>

            {/* Plant Information */}
            <View style={styles.plantContent}>
              <Text style={styles.plantName}>{plant.name}</Text>
              <Text style={styles.plantType}>{plant.type}</Text>
            </View>

            {/* Plant Status Indicators */}
            <View style={styles.plantStats}>
              <View style={styles.statItem}>
                <MoistureCircle percent={plant.moisture} />
              </View>
              <View style={styles.statItem}>
                <TempCircle value={plant.temperature} />
              </View>
            </View>

            {/* Moisture Request Button */}
            <View style={styles.moistureButtonContainer}>
              <TouchableOpacity
                style={styles.moistureButton}
                onPress={() => handleMoistureRequest(plant.id)}
              >
                <Feather name="refresh-cw" size={16} color="#2563EB" />
                <Text style={styles.moistureButtonText}>Get Moisture</Text>
              </TouchableOpacity>
            </View>
          </TouchableOpacity>
        )}
      />
    </View>
  );
};

export default PlantList; 