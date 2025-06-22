import React from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Image,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { styles } from './styles';
import MoistureCircle from './MoistureCircle';
import TempCircle from './TempCircle';
import LightCircle from './LightCircle';

const PlantList = ({ plants, isSimulationMode, onWaterPlant }) => {
  const navigation = useNavigation();

  const getMoistureColor = (moisture) => {
    if (moisture < 30) return '#EF4444';
    if (moisture < 60) return '#F59E0B';
    return '#10B981';
  };

  const getMoistureStatus = (moisture) => {
    if (moisture < 30) return 'Dry';
    if (moisture < 60) return 'Moderate';
    return 'Good';
  };

  const getPlantStatus = (plant) => {
    if (plant.moisture < 30) return 'critical';
    if (plant.moisture < 60) return 'needs-water';
    if (!plant.isHealthy) return 'needs-attention';
    return 'healthy';
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'healthy': return { text: '#059669', bg: '#D1FAE5', border: '#A7F3D0' };
      case 'needs-water': return { text: '#2563EB', bg: '#DBEAFE', border: '#93C5FD' };
      case 'needs-attention': return { text: '#D97706', bg: '#FEF3C7', border: '#FCD34D' };
      case 'critical': return { text: '#DC2626', bg: '#FEE2E2', border: '#FCA5A5' };
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'healthy': return <Feather name="check-circle" size={16} color="#059669" />;
      case 'needs-water': return <Feather name="droplets" size={16} color="#2563EB" />;
      case 'needs-attention': return <Feather name="clock" size={16} color="#D97706" />;
      case 'critical': return <Feather name="alert-triangle" size={16} color="#DC2626" />;
    }
  };

  const getStatusText = (status) => {
    switch (status) {
      case 'healthy': return 'Healthy';
      case 'needs-water': return 'Needs Water';
      case 'needs-attention': return 'Needs Attention';
      case 'critical': return 'Critical';
    }
  };

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

  const handleWaterPlant = (plantId) => {
    if (onWaterPlant) {
      onWaterPlant(plantId);
    }
    // TODO: Send watering command to server
    console.log('Watering plant:', plantId);
  };

  const handlePlantPress = (plant) => {
    // Navigate to plant detail screen
    navigation.navigate('PlantDetail', { plant });
  };

  if (plants.length === 0) {
    return (
      <View style={styles.emptyState}>
        <Feather name="leaf" size={48} color="#BDC3C7" />
        <Text style={styles.emptyStateText}>No plants added yet</Text>
        <Text style={styles.emptyStateSubtext}>
          Add your first plant to get started
        </Text>
      </View>
    );
  }

  return (
    <ScrollView 
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.horizontalScrollContainer}
    >
      {plants.map((plant) => (
        <TouchableOpacity
          key={plant.id}
          style={styles.plantCard}
          onPress={() => handlePlantPress(plant)}
        >
          <View style={styles.plantImageContainer}>
            <Image 
              source={getPlantImage(plant.type)} 
              style={styles.plantImage}
            />
          </View>

          <View style={styles.plantContent}>
            <View style={styles.plantHeader}>
              <Text style={styles.plantName}>{plant.name}</Text>
              <Text style={styles.plantType}>{plant.type}</Text>
            </View>

            <View style={styles.plantStats}>
              <View style={styles.statItem}>
                <MoistureCircle percent={plant.moisture} />
              </View>

              <View style={styles.statItem}>
                <TempCircle value={plant.temperature} />
              </View>

              <View style={styles.statItem}>
                <LightCircle percent={plant.lightLevel} />
              </View>
            </View>
          </View>
        </TouchableOpacity>
      ))}
    </ScrollView>
  );
};

export default PlantList; 