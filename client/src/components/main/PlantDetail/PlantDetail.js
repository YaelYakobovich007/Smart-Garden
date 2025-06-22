import React from 'react';
import {
  View,
  Text,
  SafeAreaView,
  StatusBar,
  TouchableOpacity,
  Image,
  ScrollView,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useNavigation, useRoute } from '@react-navigation/native';
import { styles } from './styles';

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

  const getMoistureColor = (moisture) => {
    if (moisture < 30) return '#E74C3C';
    if (moisture < 60) return '#F39C12';
    return '#27AE60';
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
              <Feather name="droplets" size={24} color="#3498DB" />
              <Text style={styles.statLabel}>Humidity</Text>
              <Text style={styles.statValue}>{plant.moisture}%</Text>
              <Text style={styles.statStatus}>{getMoistureStatus(plant.moisture)}</Text>
            </View>

            <View style={styles.statCard}>
              <Feather name="thermometer" size={24} color="#E67E22" />
              <Text style={styles.statLabel}>Temperature</Text>
              <Text style={styles.statValue}>{plant.temperature}°C</Text>
            </View>

            <View style={styles.statCard}>
              <Feather name="sun" size={24} color="#F1C40F" />
              <Text style={styles.statLabel}>Light Level</Text>
              <Text style={styles.statValue}>{plant.lightLevel}%</Text>
            </View>
          </View>
        </View>

        {/* Actions */}
        <View style={styles.actionsContainer}>
          <Text style={styles.sectionTitle}>Actions</Text>
          
          <TouchableOpacity style={styles.waterButton}>
            <Feather name="droplets" size={20} color="#FFFFFF" />
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