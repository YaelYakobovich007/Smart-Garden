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

    // Handler for delete plant responses
    const handleDeleteSuccess = (data) => {
      Alert.alert('Success', 'Plant deleted successfully!', [
        { text: 'OK', onPress: () => navigation.goBack() }
      ]);
    };
    const handleDeleteFail = (data) => {
      Alert.alert('Error', data?.message || 'Failed to delete the plant.');
    };
    websocketService.onMessage('DELETE_PLANT_SUCCESS', handleDeleteSuccess);
    websocketService.onMessage('DELETE_PLANT_FAIL', handleDeleteFail);

    return () => {
      websocketService.onMessage('IRRIGATE_SUCCESS', () => { });
      websocketService.onMessage('IRRIGATE_FAIL', () => { });
      websocketService.onMessage('IRRIGATE_SKIPPED', () => { });
      websocketService.onMessage('DELETE_PLANT_SUCCESS', () => { });
      websocketService.onMessage('DELETE_PLANT_FAIL', () => { });
    };
  }, [navigation]);

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

  // Delete plant button handler
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
        {/* Plant Image and Info */}
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
            <Text style={styles.infoLabel}>Genus</Text>
            <Text style={styles.plantType}>{plant.type}</Text>
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
          </View>
        </View>

        {/* Actions */}
        <View style={styles.actionsContainer}>
          <Text style={styles.sectionTitle}>Actions</Text>
          <TouchableOpacity style={styles.waterButton} onPress={handleWaterPlant}>
            <Feather name="droplet" size={20} color="#FFFFFF" />
            <Text style={styles.waterButtonText}>Water Now</Text>
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