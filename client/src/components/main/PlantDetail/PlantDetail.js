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
import IrrigationOverlay from './IrrigationOverlay';
import { useIrrigation } from '../../../contexts/IrrigationContext';
import {
  View,
  Text,
  Image,
  TouchableOpacity,
  ScrollView,
  SafeAreaView,
  StatusBar,
  Alert,
  Modal
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { Feather } from '@expo/vector-icons';
import { styles } from './styles';
import MoistureCircle from '../PlantList/MoistureCircle';
import TempCircle from '../PlantList/TempCircle';
import websocketService from '../../../services/websocketService';
import CircularTimePicker from './CircularTimePicker';

const PlantDetail = () => {
  const navigation = useNavigation();
  const route = useRoute();
  const { plant } = route.params || {};

  // State for real-time sensor data
  const [currentMoisture, setCurrentMoisture] = useState(plant?.moisture || 0);
  const [currentTemperature, setCurrentTemperature] = useState(plant?.temperature || 0);
  
  // Local state for UI
  const [showTimePicker, setShowTimePicker] = useState(false);
  
  // Global irrigation state
  const {
    getPlantWateringState,
    startManualIrrigation,
    handleStopWatering,
    pauseTimer,
    resumeTimer,
    resetTimer,
    formatTime,
  } = useIrrigation();

  // Get this plant's specific watering state
  const plantWateringState = getPlantWateringState(plant?.id);
  const {
    isWateringActive,
    wateringTimeLeft,
    isManualMode,
    selectedTime,
  } = plantWateringState;

  // Helper function to round sensor values
  const roundSensorValue = (value, decimals = 1) => {
    if (typeof value !== 'number' || isNaN(value)) return 0;
    return Math.round(value * Math.pow(10, decimals)) / Math.pow(10, decimals);
  };

  // Request latest sensor data when component mounts
  useEffect(() => {
    if (plant?.name && websocketService.isConnected()) {
      websocketService.sendMessage({
        type: 'GET_PLANT_MOISTURE',
        plantName: plant.name
      });
    }
  }, [plant?.name]);

  // Available irrigation times (in minutes)
  const irrigationTimes = [0, 5, 10, 15, 20, 30, 45, 60];

  // Smart irrigation handler
  const handleSmartIrrigation = () => {
    if (!plant?.name) {
      Alert.alert('Error', 'Plant name is missing.');
      return;
    }

    if (!websocketService.isConnected()) {
      Alert.alert('Error', 'Not connected to server. Please check your connection and try again.');
      return;
    }

    websocketService.sendMessage({
      type: 'IRRIGATE_PLANT',
      plantName: plant.name
    });
  };

  // Manual irrigation handlers
  const handleManualIrrigation = () => {
    setShowTimePicker(true);
  };

  const handleTimeSelected = (timeMinutes) => {
    startManualIrrigation(plant, timeMinutes);
    setShowTimePicker(false);
  };

  // Existing handlers
  const handleWaterPlant = () => {
    if (!plant?.name) {
      Alert.alert('Error', 'Plant name is missing.');
      return;
    }

    if (!websocketService.isConnected()) {
      Alert.alert('Error', 'Not connected to server. Please check your connection and try again.');
      return;
    }

    websocketService.sendMessage({
      type: 'IRRIGATE_PLANT',
      plantName: plant.name
    });
  };

  const handleGetCurrentHumidity = () => {
    if (!plant?.name) {
      Alert.alert('Error', 'Plant name is missing.');
      return;
    }

    if (!websocketService.isConnected()) {
      Alert.alert('Error', 'Not connected to server. Please check your connection and try again.');
      return;
    }

    // Manual request for sensor data
    websocketService.sendMessage({
      type: 'GET_PLANT_MOISTURE',
      plantName: plant.name
    });
  };

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

  const getPlantImage = (plantType) => {
    const plantImages = {
      'Basil': require('../../../data/plants/basil_plant.png'),
      'Cyclamen': require('../../../data/plants/cyclamen_plant.png'),
      'Marigold': require('../../../data/plants/marigold_plant.png'),
      'Monstera': require('../../../data/plants/monstera_plant.png'),
      'Petunia': require('../../../data/plants/Petunia_plant.png'),
      'Rose': require('../../../data/plants/rose_plant.png'),
      'Sansevieria': require('../../../data/plants/sansevieria_plant.png'),
    };
    return plantImages[plantType] || plantImages['Basil'];
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

  useEffect(() => {
    const handleSuccess = (data) => {
      Alert.alert('Irrigation', data?.message || 'Irrigation performed successfully!');
    };

    const handleFail = (data) => {
      Alert.alert('Irrigation', data?.message || 'Failed to irrigate the plant.');
    };

    const handleSkipped = (data) => {
      Alert.alert('Irrigation', data?.message || 'Irrigation was skipped.');
    };

    const handleDeleteSuccess = (data) => {
      Alert.alert('Delete Plant', data?.message || 'Plant deleted successfully!', [
        { text: 'OK', onPress: () => navigation.goBack() }
      ]);
    };

    const handleDeleteFail = (data) => {
      Alert.alert('Delete Plant', data?.message || 'Failed to delete plant.');
    };

    const handleMoistureSuccess = (data) => {
      if (data.moisture !== undefined) {
        setCurrentMoisture(roundSensorValue(data.moisture));
        // Updated moisture
      }
      
      if (data.temperature !== undefined) {
        setCurrentTemperature(roundSensorValue(data.temperature));
        // Updated temperature
      }
    };

    const handleMoistureFail = (data) => {
      Alert.alert('Sensor Error', data?.message || 'Failed to get sensor data.');
    };

    websocketService.onMessage('IRRIGATE_SUCCESS', handleSuccess);
    websocketService.onMessage('IRRIGATE_FAIL', handleFail);
    websocketService.onMessage('IRRIGATE_SKIPPED', handleSkipped);
    websocketService.onMessage('DELETE_PLANT_SUCCESS', handleDeleteSuccess);
    websocketService.onMessage('DELETE_PLANT_FAIL', handleDeleteFail);
    websocketService.onMessage('PLANT_MOISTURE_RESPONSE', handleMoistureSuccess);
    websocketService.onMessage('GET_MOISTURE_SUCCESS', handleMoistureSuccess);
    websocketService.onMessage('GET_MOISTURE_FAIL', handleMoistureFail);

    return () => {
      websocketService.offMessage('IRRIGATE_SUCCESS', handleSuccess);
      websocketService.offMessage('IRRIGATE_FAIL', handleFail);
      websocketService.offMessage('IRRIGATE_SKIPPED', handleSkipped);
      websocketService.offMessage('DELETE_PLANT_SUCCESS', handleDeleteSuccess);
      websocketService.offMessage('DELETE_PLANT_FAIL', handleDeleteFail);
      websocketService.offMessage('PLANT_MOISTURE_RESPONSE', handleMoistureSuccess);
      websocketService.offMessage('GET_MOISTURE_SUCCESS', handleMoistureSuccess);
      websocketService.offMessage('GET_MOISTURE_FAIL', handleMoistureFail);
    };
  }, [navigation, plant.name]);

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

      {/* Irrigation Control Bar - Shows when watering is active */}
      {(isWateringActive || isManualMode) && (
        <View style={styles.irrigationControlBar}>
          <View style={styles.irrigationStatus}>
            <View style={styles.wateringIndicator}>
              <View style={styles.wateringDot} />
            </View>
            <Text style={styles.irrigationStatusText}>
              Watering {plant.name} • {formatTime(wateringTimeLeft)}
            </Text>
          </View>
          <View style={styles.irrigationActions}>
            {isWateringActive ? (
              <TouchableOpacity
                style={styles.irrigationActionButton}
                onPress={() => pauseTimer(plant.id)}
              >
                <Feather name="pause" size={16} color="#FFFFFF" />
                <Text style={styles.irrigationActionText}>Pause</Text>
              </TouchableOpacity>
            ) : wateringTimeLeft > 0 ? (
              <TouchableOpacity
                style={styles.irrigationActionButton}
                onPress={() => resumeTimer(plant.id)}
              >
                <Feather name="play" size={16} color="#FFFFFF" />
                <Text style={styles.irrigationActionText}>Resume</Text>
              </TouchableOpacity>
            ) : null}
            <TouchableOpacity
              style={styles.irrigationActionButton}
              onPress={() => resetTimer(plant.id)}
            >
              <Feather name="rotate-ccw" size={16} color="#FFFFFF" />
              <Text style={styles.irrigationActionText}>Reset</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.irrigationActionButton, styles.stopButton]}
              onPress={() => handleStopWatering(plant.id)}
            >
              <Feather name="square" size={16} color="#FFFFFF" />
              <Text style={styles.irrigationActionText}>Stop</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* 1. Plant Information Section */}
        <View style={styles.imageContainer}>
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
          />
          <View style={styles.infoOverlay}>
            <View style={styles.separator} />
            <Text style={styles.infoLabel}>Plant Name</Text>
            <Text style={styles.plantName}>{plant.name}</Text>
          </View>
        </View>

        <View style={styles.plantTypeContainer}>
          <Text style={styles.infoLabel}>Genus</Text>
          <Text style={styles.plantType}>{plant.type}</Text>
        </View>

        {/* Current Conditions */}
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

        {/* 2. Smart Irrigation Section */}
        <View style={styles.sectionContainer}>
          <Text style={styles.sectionTitle}>Smart Irrigation</Text>
          <Text style={styles.sectionDescription}>
            Smart irrigation automatically waters your plant based on soil moisture levels and optimal conditions.
          </Text>
          <TouchableOpacity 
            style={[styles.primaryButton, isWateringActive && styles.disabledButton]} 
            onPress={handleSmartIrrigation}
            disabled={isWateringActive}
          >
            <Feather name="zap" size={20} color="#FFFFFF" />
            <Text style={styles.primaryButtonText}>Start Smart Irrigation</Text>
          </TouchableOpacity>
        </View>

        {/* 3. Manual Controls Section */}
        <View style={styles.sectionContainer}>
          <Text style={styles.sectionTitle}>Manual Controls</Text>
          
          <TouchableOpacity 
            style={styles.secondaryButton} 
            onPress={handleGetCurrentHumidity}
          >
            <Feather name="thermometer" size={20} color="#4CAF50" />
            <Text style={styles.secondaryButtonText}>Moisture Request</Text>
          </TouchableOpacity>

          <View style={styles.valveButtonsContainer}>
            <TouchableOpacity 
              style={[styles.primaryButton, styles.halfButton, isWateringActive && styles.disabledButton]} 
              onPress={() => {
                        // Open Valve button pressed
                handleManualIrrigation();
              }}
              disabled={isWateringActive}
            >
              <Feather name="droplet" size={20} color="#FFFFFF" />
              <Text style={styles.primaryButtonText}>
                {wateringTimeLeft > 0 ? 'Change Timer' : 'Open Valve'}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={[styles.stopButton, styles.halfButton, !isManualMode && styles.disabledButton]} 
              onPress={() => {
                        // Close Valve button pressed
                handleStopWatering(plant.id);
              }}
              disabled={!isManualMode}
            >
              <Feather name="square" size={20} color="#FFFFFF" />
              <Text style={styles.stopButtonText}>Close Valve</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* 4. Active Watering Status */}
        {isWateringActive && (
          <View style={styles.wateringStatusContainer}>
            <Text style={styles.sectionTitle}>Active Watering</Text>
            <View style={styles.wateringIndicator}>
              <View style={styles.wateringDot} />
              <Text style={styles.wateringText}>Watering in progress</Text>
            </View>
            <Text style={styles.countdownText}>{formatTime(wateringTimeLeft)}</Text>
          </View>
        )}

        {/* Timer Display with Progress Ring */}
        {(isWateringActive || wateringTimeLeft > 0) && (
          <View style={styles.timerDisplayContainer}>
            <View style={styles.timerDisplay}>
              <Text style={styles.timerTime}>{formatTime(wateringTimeLeft)}</Text>
              <Text style={styles.timerStatus}>
                {isWateringActive ? 'Time remaining' : 'Timer finished'}
              </Text>
            </View>
            
            {/* Progress Ring */}
            <View style={styles.progressRingContainer}>
              <View style={styles.progressRing}>
                <View style={styles.progressRingBackground} />
                <View style={[
                  styles.progressRingFill,
                  {
                    transform: [{
                      rotate: `${-90 + (360 * (wateringTimeLeft / (selectedTime * 60)))}deg`
                    }]
                  }
                ]} />
                <View style={styles.progressRingCenter}>
                  <Text style={styles.progressRingText}>
                    {Math.round(((selectedTime * 60 - wateringTimeLeft) / (selectedTime * 60)) * 100)}%
                  </Text>
                </View>
              </View>
            </View>
            
            {/* Timer Controls */}
            <View style={styles.timerControls}>
              {isWateringActive ? (
                <TouchableOpacity
                  style={styles.pauseButton}
                  onPress={() => pauseTimer(plant.id)}
                >
                  <Feather name="pause" size={18} color="#FFFFFF" />
                  <Text style={styles.pauseButtonText}>Pause</Text>
                </TouchableOpacity>
              ) : wateringTimeLeft > 0 ? (
                <TouchableOpacity
                  style={styles.resumeButton}
                  onPress={() => resumeTimer(plant.id)}
                >
                  <Feather name="play" size={18} color="#FFFFFF" />
                  <Text style={styles.resumeButtonText}>Resume</Text>
                </TouchableOpacity>
              ) : null}
              
              <TouchableOpacity
                style={styles.resetButton}
                onPress={() => resetTimer(plant.id)}
              >
                <Feather name="rotate-ccw" size={18} color="#FFFFFF" />
                <Text style={styles.resetButtonText}>Reset</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* 5. Additional Actions */}
        <View style={styles.sectionContainer}>
          <Text style={styles.sectionTitle}>Additional Actions</Text>
          
          <TouchableOpacity style={styles.secondaryButton}>
            <Feather name="calendar" size={20} color="#4CAF50" />
            <Text style={styles.secondaryButtonText}>View Schedule</Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={styles.deleteButton} 
            onPress={handleDeletePlant}
          >
            <Feather name="trash-2" size={20} color="#FFFFFF" />
            <Text style={styles.deleteButtonText}>Delete Plant</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* 6. Circular Time Picker */}
      <CircularTimePicker
        visible={showTimePicker}
        onClose={() => setShowTimePicker(false)}
        onTimeSelected={handleTimeSelected}
        initialTime={0}
        timeOptions={irrigationTimes}
      />

      {/* 7. Irrigation Overlay */}
      <IrrigationOverlay 
        isActive={isWateringActive || isManualMode}
        timeLeft={wateringTimeLeft}
        onPause={() => pauseTimer(plant.id)}
        onResume={() => resumeTimer(plant.id)}
        onStop={() => handleStopWatering(plant.id)}
      />
    </SafeAreaView>
  );
};

export default PlantDetail; 