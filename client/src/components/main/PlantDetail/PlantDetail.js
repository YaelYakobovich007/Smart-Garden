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
  
  // New state for enhanced features
  const [isWateringActive, setIsWateringActive] = useState(false);
  const [wateringTimeLeft, setWateringTimeLeft] = useState(0); // in seconds
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [selectedTime, setSelectedTime] = useState(10); // default 10 minutes
  const [isManualMode, setIsManualMode] = useState(false);
  const [timerInterval, setTimerInterval] = useState(null);
  const [pendingValveRequest, setPendingValveRequest] = useState(false);

  // Available irrigation times (in minutes)
  const irrigationTimes = [0, 5, 10, 15, 20, 30, 45, 60];

  // Countdown timer effect
  useEffect(() => {
    let interval;
    // Only start timer if watering is active, has time left, and there's no pending valve request
    if (isWateringActive && wateringTimeLeft > 0 && !pendingValveRequest) {
      interval = setInterval(() => {
        setWateringTimeLeft(prev => {
          if (prev <= 1) {
            setIsWateringActive(false);
            // Stop irrigation automatically
            handleStopWatering();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
      setTimerInterval(interval);
    }
    return () => {
      if (interval) {
        clearInterval(interval);
      }
    };
  }, [isWateringActive, wateringTimeLeft, pendingValveRequest]);

  // Format time as MM:SS
  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

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
    // Store the selected time but don't start timer yet
    setSelectedTime(timeMinutes);
    setPendingValveRequest(true);
    
    // Debug: Check connection and plant data
    console.log('🔍 DEBUG - Requesting valve opening:');
    console.log('   - Plant name:', plant.name);
    console.log('   - Selected time:', timeMinutes);
    console.log('   - WebSocket connected:', websocketService.isConnected());
    
    // Send OPEN_VALVE command to server
    const message = {
      type: 'OPEN_VALVE',
      plantName: plant.name,
      timeMinutes: timeMinutes
    };
    
    console.log('📤 Sending OPEN_VALVE message:', JSON.stringify(message));
    websocketService.sendMessage(message);
  };

  const handleStopWatering = () => {
    setIsWateringActive(false);
    setIsManualMode(false);
    setWateringTimeLeft(0);
    
    // Send close valve command
    websocketService.sendMessage({
      type: 'CLOSE_VALVE',
      plantName: plant.name
    });
  };

  // Timer control functions
  const pauseTimer = () => {
    if (timerInterval) {
      clearInterval(timerInterval);
      setTimerInterval(null);
    }
    setIsWateringActive(false);
  };

  const resumeTimer = () => {
    setIsWateringActive(true);
    const interval = setInterval(() => {
      setWateringTimeLeft(prev => {
        if (prev <= 1) {
          setIsWateringActive(false);
          clearInterval(interval);
          setTimerInterval(null);
          handleStopWatering();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    setTimerInterval(interval);
  };

  const resetTimer = () => {
    if (timerInterval) {
      clearInterval(timerInterval);
      setTimerInterval(null);
    }
    setIsWateringActive(false);
    setWateringTimeLeft(0);
    handleStopWatering();
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
        setCurrentMoisture(data.moisture);
        console.log(`📊 Updated moisture for ${plant.name}: ${data.moisture}%`);
      }
      
      if (data.temperature !== undefined) {
        setCurrentTemperature(data.temperature);
        console.log(`🌡️ Updated temperature for ${plant.name}: ${data.temperature}°C`);
      }
    };

    const handleMoistureFail = (data) => {
      Alert.alert('Sensor Error', data?.message || 'Failed to get sensor data.');
    };

    const handleOpenValveSuccess = (data) => {
      console.log('✅ OPEN_VALVE success:', data);
      
      // Only start timer if we have a pending request
      if (pendingValveRequest) {
        // Now start the timer since valve opened successfully
        setIsManualMode(true);
        setIsWateringActive(true);
        setWateringTimeLeft(selectedTime * 60); // Convert minutes to seconds
        setPendingValveRequest(false);
        
        Alert.alert('Valve Control', data?.message || 'Valve opened successfully! Timer started.');
      }
    };

    const handleOpenValveFail = (data) => {
      console.log('❌ OPEN_VALVE failed:', data);
      
      // Reset state since valve opening failed
      setIsManualMode(false);
      setIsWateringActive(false);
      setWateringTimeLeft(0);
      setSelectedTime(10); // Reset to default
      setPendingValveRequest(false);
      
      Alert.alert('Valve Control', data?.message || 'Failed to open valve. Timer not started.');
    };

    const handleCloseValveSuccess = (data) => {
      console.log('✅ CLOSE_VALVE success:', data);
      // No alert needed - just update the UI state
    };

    const handleCloseValveFail = (data) => {
      Alert.alert('Valve Control', data?.message || 'Failed to close valve.');
    };

    websocketService.onMessage('IRRIGATE_SUCCESS', handleSuccess);
    websocketService.onMessage('IRRIGATE_FAIL', handleFail);
    websocketService.onMessage('IRRIGATE_SKIPPED', handleSkipped);
    websocketService.onMessage('OPEN_VALVE_SUCCESS', handleOpenValveSuccess);
    websocketService.onMessage('OPEN_VALVE_FAIL', handleOpenValveFail);
    websocketService.onMessage('CLOSE_VALVE_SUCCESS', handleCloseValveSuccess);
    websocketService.onMessage('CLOSE_VALVE_FAIL', handleCloseValveFail);
    websocketService.onMessage('DELETE_PLANT_SUCCESS', handleDeleteSuccess);
    websocketService.onMessage('DELETE_PLANT_FAIL', handleDeleteFail);
    websocketService.onMessage('PLANT_MOISTURE_RESPONSE', handleMoistureSuccess);
    websocketService.onMessage('GET_MOISTURE_SUCCESS', handleMoistureSuccess);
    websocketService.onMessage('GET_MOISTURE_FAIL', handleMoistureFail);

    return () => {
      websocketService.offMessage('IRRIGATE_SUCCESS', handleSuccess);
      websocketService.offMessage('IRRIGATE_FAIL', handleFail);
      websocketService.offMessage('IRRIGATE_SKIPPED', handleSkipped);
      websocketService.offMessage('OPEN_VALVE_SUCCESS', handleOpenValveSuccess);
      websocketService.offMessage('OPEN_VALVE_FAIL', handleOpenValveFail);
      websocketService.offMessage('CLOSE_VALVE_SUCCESS', handleCloseValveSuccess);
      websocketService.offMessage('CLOSE_VALVE_FAIL', handleCloseValveFail);
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
              onPress={handleManualIrrigation}
              disabled={isWateringActive}
            >
              <Feather name="droplet" size={20} color="#FFFFFF" />
              <Text style={styles.primaryButtonText}>
                {wateringTimeLeft > 0 ? 'Change Timer' : 'Open Valve'}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={[styles.stopButton, styles.halfButton, !isWateringActive && styles.disabledButton]} 
              onPress={handleStopWatering}
              disabled={!isWateringActive}
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
                  onPress={pauseTimer}
                >
                  <Feather name="pause" size={18} color="#FFFFFF" />
                  <Text style={styles.pauseButtonText}>Pause</Text>
                </TouchableOpacity>
              ) : wateringTimeLeft > 0 ? (
                <TouchableOpacity
                  style={styles.resumeButton}
                  onPress={resumeTimer}
                >
                  <Feather name="play" size={18} color="#FFFFFF" />
                  <Text style={styles.resumeButtonText}>Resume</Text>
                </TouchableOpacity>
              ) : null}
              
              <TouchableOpacity
                style={styles.resetButton}
                onPress={resetTimer}
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
    </SafeAreaView>
  );
};

export default PlantDetail; 