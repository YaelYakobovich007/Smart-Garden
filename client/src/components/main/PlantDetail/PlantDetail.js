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
  Modal,
  PanResponder
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { Feather } from '@expo/vector-icons';
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
  
  // New state for enhanced features
  const [isWateringActive, setIsWateringActive] = useState(false);
  const [wateringTimeLeft, setWateringTimeLeft] = useState(0); // in seconds
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [selectedTime, setSelectedTime] = useState(10); // default 10 minutes
  const [isManualMode, setIsManualMode] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [timerInterval, setTimerInterval] = useState(null);

  // Available irrigation times (in minutes) - using the enhanced timer options
  const irrigationTimes = [5, 10, 15, 20, 30, 45, 60];

  // Get angle from duration (matching the enhanced timer logic)
  const getAngleFromDuration = (duration) => {
    const index = irrigationTimes.indexOf(duration);
    return (index * (360 / irrigationTimes.length)) - 90; // Evenly spaced around circle, starting from top
  };

  // Get duration from angle (matching the enhanced timer logic)
  const getDurationFromAngle = (angle) => {
    // Normalize angle to 0-360
    let normalizedAngle = ((angle + 90) % 360 + 360) % 360;
    
    // Find the closest time option
    const segmentSize = 360 / irrigationTimes.length;
    const segmentIndex = Math.round(normalizedAngle / segmentSize) % irrigationTimes.length;
    return irrigationTimes[segmentIndex];
  };

  // Format duration for display
  const formatDuration = (minutes) => {
    if (minutes >= 60) {
      return '1h';
    }
    return `${minutes}m`;
  };

  // Interactive circular dial state
  const [dialCenter, setDialCenter] = useState({ x: 100, y: 100 });
  const [dialRadius, setDialRadius] = useState(80);
  const [draggablePoint, setDraggablePoint] = useState({ x: 100, y: 20 }); // Start at top (10 minutes)

  // Handle time selection
  const handleTimeSelection = (time) => {
    setSelectedTime(time);
  };

  // PanResponder for draggable point
  const panResponder = PanResponder.create({
    onStartShouldSetPanResponder: () => true,
    onMoveShouldSetPanResponder: () => true,
    onPanResponderGrant: (evt, gestureState) => {
      // Store initial position
    },
    onPanResponderMove: (evt, gestureState) => {
      const { moveX, moveY } = gestureState;
      
      // Calculate angle from center
      const deltaX = moveX - dialCenter.x;
      const deltaY = moveY - dialCenter.y;
      const angle = Math.atan2(deltaY, deltaX) * (180 / Math.PI);
      
      // Calculate new point position on circle
      const newX = dialCenter.x + dialRadius * Math.cos(angle * Math.PI / 180);
      const newY = dialCenter.y + dialRadius * Math.sin(angle * Math.PI / 180);
      
      setDraggablePoint({ x: newX, y: newY });
      
      // Update selected time using the React code logic
      const newTime = getDurationFromAngle(angle);
      setSelectedTime(newTime);
    },
    onPanResponderRelease: (evt, gestureState) => {
      // Snap to nearest time marker
      const { moveX, moveY } = gestureState;
      const deltaX = moveX - dialCenter.x;
      const deltaY = moveY - dialCenter.y;
      const angle = Math.atan2(deltaY, deltaX) * (180 / Math.PI);
      
      const snappedTime = getDurationFromAngle(angle);
      setSelectedTime(snappedTime);
      
      // Update point position to snapped position
      const snappedAngle = getAngleFromDuration(snappedTime);
      const snappedX = dialCenter.x + dialRadius * Math.cos(snappedAngle * Math.PI / 180);
      const snappedY = dialCenter.y + dialRadius * Math.sin(snappedAngle * Math.PI / 180);
      setDraggablePoint({ x: snappedX, y: snappedY });
    }
  });

  // Countdown timer effect
  useEffect(() => {
    let interval;
    if (isWateringActive && wateringTimeLeft > 0) {
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
  }, [isWateringActive, wateringTimeLeft]);

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

  const handleStartManualIrrigation = () => {
    setShowTimePicker(false);
    setIsManualMode(true);
    setIsWateringActive(true);
    setWateringTimeLeft(selectedTime * 60); // Convert minutes to seconds
    
    // Debug: Check connection and plant data
    console.log('🔍 DEBUG - Starting manual irrigation:');
    console.log('   - Plant name:', plant.name);
    console.log('   - Selected time:', selectedTime);
    console.log('   - WebSocket connected:', websocketService.isConnected());
    
    // Send OPEN_VALVE command to server
    const message = {
      type: 'OPEN_VALVE',
      plantName: plant.name,
      timeMinutes: selectedTime
    };
    
    console.log('📤 Sending OPEN_VALVE message:', JSON.stringify(message));
    websocketService.sendMessage(message);
  };

  const handleStopWatering = () => {
    setIsWateringActive(false);
    setIsManualMode(false);
    setWateringTimeLeft(0);
    
    // Send stop irrigation command
    websocketService.sendMessage({
      type: 'STOP_IRRIGATION',
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
      Alert.alert('Valve Control', data?.message || 'Valve opened successfully!');
    };

    const handleOpenValveFail = (data) => {
      Alert.alert('Valve Control', data?.message || 'Failed to open valve.');
    };

    websocketService.onMessage('IRRIGATE_SUCCESS', handleSuccess);
    websocketService.onMessage('IRRIGATE_FAIL', handleFail);
    websocketService.onMessage('IRRIGATE_SKIPPED', handleSkipped);
    websocketService.onMessage('OPEN_VALVE_SUCCESS', handleOpenValveSuccess);
    websocketService.onMessage('OPEN_VALVE_FAIL', handleOpenValveFail);
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
                {wateringTimeLeft > 0 ? 'Change Timer' : 'Set Timer'}
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

      {/* 6. Manual Irrigation Time Picker Modal */}
      <Modal
        visible={showTimePicker}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowTimePicker(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            {/* Header with Clock Icon */}
            <View style={styles.modalHeader}>
              <View style={styles.clockIconContainer}>
                <Feather name="clock" size={28} color="#FFFFFF" />
              </View>
              <Text style={styles.modalTitle}>Set Timer</Text>
              <Text style={styles.modalSubtitle}>Drag the handle to select your desired duration</Text>
              <TouchableOpacity 
                style={styles.closeButton}
                onPress={() => setShowTimePicker(false)}
              >
                <Feather name="x" size={20} color="#666" />
              </TouchableOpacity>
            </View>
            
            {/* Circular Time Picker */}
            <View style={styles.circularPickerContainer}>
              <View style={styles.circularDial}>
                {/* Time Markers - Small grey dots around the circle */}
                {irrigationTimes.map((time, index) => {
                  const angle = (index * (360 / irrigationTimes.length)) - 90; // Evenly spaced around circle, starting from top
                  const radian = (angle * Math.PI) / 180;
                  const radius = 130; // Outer radius for dots
                  const x = Math.cos(radian) * radius;
                  const y = Math.sin(radian) * radius;
                  
                  return (
                    <View
                      key={time}
                      style={[
                        styles.timeMarkerDot,
                        {
                          transform: [
                            { translateX: x },
                            { translateY: y }
                          ]
                        }
                      ]}
                    />
                  );
                })}
                
                {/* Time Labels - Positioned outside the circle */}
                {irrigationTimes.map((time, index) => {
                  const angle = (index * (360 / irrigationTimes.length)) - 90;
                  const radian = (angle * Math.PI) / 180;
                  const radius = 110; // Inner radius for labels
                  const x = Math.cos(radian) * radius;
                  const y = Math.sin(radian) * radius;
                  
                  return (
                    <View
                      key={`label-${time}`}
                      style={[
                        styles.timeLabel,
                        {
                          transform: [
                            { translateX: x },
                            { translateY: y }
                          ]
                        }
                      ]}
                    >
                      <Text style={styles.timeLabelText}>
                        {formatDuration(time)}
                      </Text>
                    </View>
                  );
                })}
                
                {/* Progress Arc - Filled wedge from center to selected time */}
                <View style={styles.progressWedgeContainer}>
                  <View style={[
                    styles.progressWedge,
                    { 
                      transform: [
                        { rotate: `${getAngleFromDuration(selectedTime)}deg` }
                      ] 
                    }
                  ]} />
                </View>
                
                {/* Center Clock Icon */}
                <View style={styles.centerIcon}>
                  <Feather name="clock" size={24} color="#22C55E" />
                </View>
                
                {/* Draggable Point */}
                <View 
                  {...panResponder.panHandlers}
                  style={[
                    styles.draggablePoint,
                    {
                      transform: [
                        { translateX: draggablePoint.x - dialCenter.x },
                        { translateY: draggablePoint.y - dialCenter.y }
                      ]
                    }
                  ]}
                />
              </View>
              
              {/* Selected Duration Display */}
              <View style={styles.selectedDurationContainer}>
                <Text style={styles.selectedDurationValue}>{formatDuration(selectedTime)}</Text>
                <Text style={styles.selectedDurationLabel}>Selected duration</Text>
              </View>
            </View>

            {/* Action Button */}
            <TouchableOpacity 
              style={styles.startIrrigationButton}
              onPress={handleStartManualIrrigation}
            >
              <Text style={styles.startIrrigationButtonText}>Start Timer</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

export default PlantDetail; 