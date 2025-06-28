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
import LightCircle from '../PlantList/LightCircle';
import websocketService from '../../../services/websocketService';

const PlantDetail = () => {
  const navigation = useNavigation();
  const route = useRoute();
  const { plant } = route.params || {};

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

  const getMoistureStatus = (moisture) => {
    if (moisture < 30) return 'Dry';
    if (moisture < 60) return 'Moderate';
    return 'Good';
  };

  if (!plant) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>Plant not found</Text>
        </View>
      </SafeAreaView>
    );
  }

  // Handler for irrigation responses
  useEffect(() => {
    const handleSuccess = (data) => {
      Alert.alert('Irrigation', data?.message || 'Irrigation performed successfully!');
    };
    const handleFail = (data) => {
      Alert.alert('Irrigation', data?.message || 'Failed to irrigate the plant.');
    };
    websocketService.onMessage('IRRIGATE_SUCCESS', handleSuccess);
    websocketService.onMessage('IRRIGATE_FAIL', handleFail);
    websocketService.onMessage('IRRIGATE_SKIPPED', handleFail);

    return () => {
      websocketService.onMessage('IRRIGATE_SUCCESS', () => {});
      websocketService.onMessage('IRRIGATE_FAIL', () => {});
      websocketService.onMessage('IRRIGATE_SKIPPED', () => {});
    };
  }, []);

  // Water plant button handler
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

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />
      
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Feather name="chevron-left" size={24} color="#2C3E50" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Plant Details</Text>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Plant Image */}
        <View style={styles.imageContainer}>
          <Image 
            source={getPlantImage(plant.type)} 
            style={styles.plantImage}
          />
        </View>

        {/* Plant Info */}
        <View style={styles.infoContainer}>
          <Text style={styles.plantName}>{plant.name}</Text>
          <Text style={styles.plantType}>{plant.type}</Text>
          <Text style={styles.plantLocation}>Location: {plant.location}</Text>
          
          {/* Status */}
          <View style={styles.statusContainer}>
            <View style={styles.statusIndicator}>
              <View 
                style={[
                  styles.statusDot, 
                  { backgroundColor: plant.isHealthy ? '#27AE60' : '#E74C3C' }
                ]} 
              />
              <Text style={styles.statusText}>
                {plant.isHealthy ? 'Healthy' : 'Needs Attention'}
              </Text>
            </View>
          </View>
        </View>

        {/* Stats */}
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

            <View style={styles.statCard}>
              <LightCircle percent={plant.lightLevel} />
              <Text style={styles.statLabel}>Light</Text>
            </View>
          </View>
        </View>

        {/* Actions */}
        <View style={styles.actionsContainer}>
          <Text style={styles.sectionTitle}>Actions</Text>
          
          <TouchableOpacity style={styles.waterButton} onPress={handleWaterPlant}>
            <Feather name="droplet" size={20} color="#FFFFFF" />
            <Text style={styles.waterButtonText}>Water Plant</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.scheduleButton}>
            <Feather name="calendar" size={20} color="#3498DB" />
            <Text style={styles.scheduleButtonText}>View Schedule</Text>
          </TouchableOpacity>
        </View>

        {/* Plant Description */}
        <View style={styles.descriptionContainer}>
          <Text style={styles.sectionTitle}>About {plant.name}</Text>
          <Text style={styles.descriptionText}>
            This is a {plant.type.toLowerCase()} plant located in {plant.location}. 
            It requires regular watering and monitoring to maintain optimal health. 
            The current conditions show {getMoistureStatus(plant.moisture).toLowerCase()} humidity levels.
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

export default PlantDetail; 