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

import React, { useEffect, useState, useRef } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import IrrigationOverlay from './IrrigationOverlay';
import SmartIrrigationLoader from './SmartIrrigationLoader';
import { useIrrigation } from '../../../contexts/IrrigationContext';
import {
  View,
  Text,
  Image,
  TextInput,
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
import mainStyles from '../styles';
import MoistureCircle from '../PlantList/MoistureCircle';
import TempCircle from '../PlantList/TempCircle';
import websocketService from '../../../services/websocketService';
import { useUI } from '../../ui/UIProvider';
import CircularTimePicker from './CircularTimePicker';
import * as ImagePicker from 'expo-image-picker';
import { useCameraPermissions } from 'expo-camera';

const PlantDetail = () => {
  const navigation = useNavigation();
  const route = useRoute();
  const { plant: initialPlant } = route.params || {};
  const { showAlert } = useUI();
  // Track if user explicitly requested to stop irrigation to avoid confusing alerts
  const stoppingRef = useRef(false);

  // State for plant data to allow updates
  const [plant, setPlant] = useState(initialPlant);

  // State for real-time sensor data
  const [currentMoisture, setCurrentMoisture] = useState(plant?.moisture || 0);
  const [currentTemperature, setCurrentTemperature] = useState(plant?.temperature || 0);

  // Local state for UI
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [showScheduleModal, setShowScheduleModal] = useState(false);
  const [showImageSourceSheet, setShowImageSourceSheet] = useState(false);
  const [cameraPermission, requestCameraPermission] = useCameraPermissions();
  const [showDripperModal, setShowDripperModal] = useState(false);
  const [pendingDripperType, setPendingDripperType] = useState(null);
  const [showWaterLimitModal, setShowWaterLimitModal] = useState(false);
  const [waterLimitInput, setWaterLimitInput] = useState('');
  const [showNameModal, setShowNameModal] = useState(false);
  const [nameInput, setNameInput] = useState('');
  const [showHumidityModal, setShowHumidityModal] = useState(false);
  const [humidityInput, setHumidityInput] = useState('');

  // Global irrigation state
  const {
    getPlantWateringState,
    startManualIrrigation,
    startSmartIrrigation,
    handleStopWatering,
    restartValve,
    pauseTimer,
    resumeTimer,
    resetTimer,
    formatTime,
    rehydrateFromPlants,
  } = useIrrigation();

  // Get this plant's specific watering state
  const plantWateringState = getPlantWateringState(plant?.id);
  const {
    isWateringActive,
    wateringTimeLeft,
    isManualMode,
    isSmartMode,
    selectedTime,
    pendingIrrigationRequest,
    pendingValveRequest,
  } = plantWateringState;

  // Helper function to round sensor values
  const roundSensorValue = (value, decimals = 1) => {
    if (typeof value !== 'number' || isNaN(value)) return 0;
    return Math.round(value * Math.pow(10, decimals)) / Math.pow(10, decimals);
  };

  // Refresh plant data (including target humidity) when screen gains focus
  useFocusEffect(
    React.useCallback(() => {
      if (plant?.name && websocketService.isConnected()) {
        // Get fresh moisture data
        websocketService.sendMessage({
          type: 'GET_PLANT_MOISTURE',
          plantName: plant.name
        });

        // Get fresh plant details to ensure target humidity is current
        websocketService.sendMessage({
          type: 'GET_PLANT_DETAILS',
          plantName: plant.name
        });
      }
    }, [plant?.name])
  );

  // Set up WebSocket message handlers for plant updates and irrigation progress
  useEffect(() => {
    const handlePlantDetailsResponse = (message) => {
      const data = message?.data || message;
      const incoming = data?.plant;
      if (incoming) {
        // Normalize schedule fields and watering mode using existing DB columns
        let normalizedDays = null;
        if (incoming.irrigation_days != null) {
          if (Array.isArray(incoming.irrigation_days)) {
            normalizedDays = incoming.irrigation_days;
          } else {
            try {
              const parsedDays = JSON.parse(incoming.irrigation_days);
              normalizedDays = Array.isArray(parsedDays) ? parsedDays : null;
            } catch {
              normalizedDays = null;
            }
          }
        } else if (incoming.schedule_days != null) {
          normalizedDays = Array.isArray(incoming.schedule_days) ? incoming.schedule_days : null;
        }

        const normalizedTime = incoming.irrigation_time || incoming.schedule_time || null;
        const inferredMode = (normalizedDays && normalizedDays.length > 0 && normalizedTime) ? 'scheduled' : 'smart';
        const normalizedMode = (typeof incoming.watering_mode === 'string' && incoming.watering_mode)
          ? incoming.watering_mode
          : inferredMode;

        const normalized = {
          ...incoming,
          id: incoming.plant_id != null ? Number(incoming.plant_id) : (plant?.id ?? incoming.id),
          type: incoming.plant_type || incoming.type || plant?.type,
          image_url: incoming.image_url != null ? incoming.image_url : plant?.image_url,
          // Expose unified schedule fields for UI
          schedule_days: normalizedDays,
          schedule_time: normalizedTime,
          watering_mode: normalizedMode,
        };
        setPlant(normalized);
        try {
          rehydrateFromPlants([normalized]);
        } catch { }
      }
    };

    websocketService.onMessage('GET_PLANT_DETAILS_RESPONSE', handlePlantDetailsResponse);
    websocketService.onMessage('UPDATE_PLANT_DETAILS_SUCCESS', handlePlantUpdateSuccess);
    websocketService.onMessage('UPDATE_PLANT_DETAILS_FAIL', handlePlantUpdateError);

    // Live algorithm progress → update moisture/temperature circles in real time
    const handleIrrigationProgress = (msg) => {
      const data = msg?.data || msg;
      const progressPlantId = data?.plant_id;
      const matchesId = progressPlantId != null && plant?.id != null && Number(progressPlantId) === Number(plant.id);
      const matchesName = data?.plantName && plant?.name && data.plantName === plant.name;
      if (!matchesId && !matchesName) return;
      console.log('IRRIGATION_PROGRESS → PlantDetail:', data);
      if (data?.current_moisture != null) {
        setCurrentMoisture(roundSensorValue(Number(data.current_moisture)));
      }
      if (data?.temperature != null) {
        setCurrentTemperature(roundSensorValue(Number(data.temperature)));
      }
    };
    websocketService.onMessage('IRRIGATION_PROGRESS', handleIrrigationProgress);

    return () => {
      websocketService.offMessage('GET_PLANT_DETAILS_RESPONSE', handlePlantDetailsResponse);
      websocketService.offMessage('UPDATE_PLANT_DETAILS_SUCCESS', handlePlantUpdateSuccess);
      websocketService.offMessage('UPDATE_PLANT_DETAILS_FAIL', handlePlantUpdateError);
      websocketService.offMessage('IRRIGATION_PROGRESS', handleIrrigationProgress);
    };
  }, [plant?.id]);

  // After settings modal closes, show the image source sheet
  useEffect(() => {
    if (!showSettingsModal && showImageSourceSheet) {
      // no-op; sheet visibility already true
    }
  }, [showSettingsModal, showImageSourceSheet]);

  // Handle successful plant update
  const handlePlantUpdateSuccess = (data) => {
    console.log('🌿 Plant update success:', data);
    console.log('🌿 Current plant state:', plant);
    Alert.alert('Success', data.message || 'Plant updated successfully');
    // Update the plant data to refresh the UI
    if (data.plant) {
      console.log('🌿 Updating to new plant data:', data.plant);
      // Update the plant data in the route params
      navigation.setParams({ plant: data.plant });
      // Update the local state to trigger re-render
      setPlant(data.plant);
    }
  };

  // Handle plant update error
  const handlePlantUpdateError = (data) => {
    Alert.alert('Error', data.message || 'Failed to update plant');
    // Update the plant data even on error if it's provided (in case the update was partially successful)
    if (data.plant) {
      navigation.setParams({ plant: data.plant });
      setPlant(data.plant);
    }
  };

  // Available irrigation times (in minutes) – same intervals as before, but without 0 on the dial
  const irrigationTimes = [60, 5, 10, 15, 20, 30, 45];

  // Render schedule content for the modal
  const renderScheduleContent = (p) => {
    const mode = p?.watering_mode;
    const days = p?.schedule_days;
    const time = p?.schedule_time;

    // More robust schedule detection
    const hasSchedule = Array.isArray(days) ? days.length > 0 : !!days;
    const hasTime = !!time;
    const isScheduledMode = (mode && typeof mode === 'string' && mode.toLowerCase() === 'scheduled') || (hasSchedule && hasTime);

    // Debug logging removed

    if (!isScheduledMode) {
      return (
        <View>
          <Text style={styles.scheduleSubtitle}>
            Smart irrigation is enabled. Watering times are decided automatically based on soil
            moisture and conditions. No fixed schedule is configured.
          </Text>
        </View>
      );
    }

    // Format days and time
    const dayMap = {
      0: 'Sun', 1: 'Mon', 2: 'Tue', 3: 'Wed', 4: 'Thu', 5: 'Fri', 6: 'Sat'
    };
    const dayLabels = Array.isArray(days)
      ? days.map(d => (dayMap[d] || d)).join(', ')
      : String(days);

    return (
      <View>
        <Text style={styles.scheduleSubtitle}>Scheduled irrigation:</Text>
        <View style={styles.scheduleChipsRow}>
          {dayLabels.split(',').map((d, idx) => (
            <View key={`${d}-${idx}`} style={styles.scheduleChip}>
              <Text style={styles.scheduleChipText}>{d.trim()}</Text>
            </View>
          ))}
        </View>
        <View style={styles.scheduleTimeRow}>
          <Feather name="clock" size={16} color="#059669" />
          <Text style={styles.scheduleTimeText}>{time}</Text>
        </View>
        <Text style={styles.scheduleNote}>Times shown are in your device's timezone.</Text>
      </View>
    );
  };

  // Smart irrigation handler
  const handleSmartIrrigation = () => {
    startSmartIrrigation(plant);
  };

  // Manual irrigation handlers
  const handleManualIrrigation = () => {
    setShowTimePicker(true);
  };

  // Plant settings handlers
  const handleChangePlantName = () => {
    setNameInput(String(plant?.name || ''));
    setShowNameModal(true);
  };

  const handleChangeDesiredHumidity = () => {
    const current = (plant?.ideal_moisture ?? plant?.desiredMoisture ?? 50);
    setHumidityInput(String(current));
    setShowHumidityModal(true);
  };

  const handleChangeDripper = () => {
    // Open a dedicated modal to support all platforms (Android alerts are limited to 3 buttons)
    setPendingDripperType(String(plant?.dripper_type || '2L/h'));
    setShowDripperModal(true);
  };

  const handleChangeWaterLimit = () => {
    // Use a dedicated modal for consistent UI across platforms
    const current = (plant?.water_limit ?? plant?.waterLimit ?? 1.0);
    setWaterLimitInput(String(current));
    setShowWaterLimitModal(true);
  };

  const handleChangeImage = async () => {
    try {
      // Ensure media library permission is granted
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission needed', 'Media library permission is required to change the plant image.');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
        base64: true,
      });

      if (!result.canceled && result.assets[0]) {
        const asset = result.assets[0];
        const base64 = asset.base64;
        if (!base64) {
          Alert.alert('Error', 'Failed to read selected image. Please try again.');
          setShowImageSourceSheet(false);
          return;
        }
        const filename = `plant_${plant?.id}_${Date.now()}.jpg`;

        updatePlantDetails({
          imageData: {
            base64,
            filename,
            mimeType: asset.mimeType || 'image/jpeg'
          }
        });
        setShowImageSourceSheet(false);
      } else {
        // Close the sheet even if canceled for consistent UX
        setShowImageSourceSheet(false);
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to select image');
      setShowImageSourceSheet(false);
    }
  };

  const handleTakePhoto = async () => {
    try {
      if (!cameraPermission?.granted) {
        const permission = await requestCameraPermission();
        if (!permission.granted) {
          Alert.alert('Permission needed', 'Camera permission is required to take photos');
          return;
        }
      }

      const result = await ImagePicker.launchCameraAsync({
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
        base64: true,
      });

      if (!result.canceled && result.assets[0]) {
        const asset = result.assets[0];
        const base64 = asset.base64;
        if (!base64) {
          Alert.alert('Error', 'Failed to read captured image. Please try again.');
          setShowImageSourceSheet(false);
          return;
        }
        const filename = `plant_${plant?.id}_${Date.now()}.jpg`;

        updatePlantDetails({
          imageData: {
            base64,
            filename,
            mimeType: asset.mimeType || 'image/jpeg'
          }
        });
        setShowImageSourceSheet(false);
      } else {
        setShowImageSourceSheet(false);
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to take photo');
      setShowImageSourceSheet(false);
    }
  };

  // Function to update plant details
  const updatePlantDetails = (updateData) => {
    if (!websocketService.isConnected()) {
      Alert.alert('Error', 'Not connected to server. Please check your connection and try again.');
      return;
    }

    websocketService.sendMessage({
      type: 'UPDATE_PLANT_DETAILS',
      plant_id: plant.id,
      plantName: plant.name, // Keep for backward compatibility
      ...updateData
    });
  };

  const handleTimeSelected = (timeMinutes) => {
    startManualIrrigation(plant, timeMinutes);
    setShowTimePicker(false);
  };

  // Existing handlers
  const handleWaterPlant = () => {
    startSmartIrrigation(plant);
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

    showAlert({
      title: 'Delete Plant',
      message: `Are you sure you want to delete "${plant.name}"? This action cannot be undone.`,
      okText: 'Delete',
      cancelText: 'Cancel',
      variant: 'error',
      iconName: 'leaf',
      onOk: () => {
        websocketService.sendMessage({ type: 'DELETE_PLANT', plantName: plant.name });
      },
    });
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
    // Default to Rose image if none or unknown type
    return plantImages[plantType] || plantImages['Rose'];
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
      // Suppress duplicate popup; completion is handled centrally in IrrigationContext
      console.log('Irrigation success (suppressed local alert):', data);
    };

    const handleFail = (data) => {
      // Suppress here; the styled popup is handled globally in IrrigationContext
      if (stoppingRef.current) {
        stoppingRef.current = false;
        console.log('IRRIGATE_FAIL received after stop request, suppressing alert:', data);
        return;
      }
    };

    const handleSkipped = (data) => {
      // This is now handled by IrrigationContext, but keep local handler for any additional PlantDetail-specific logic
      console.log('🔄 PlantDetail: Irrigation skipped for', plant.name);
    };

    const handleDeleteSuccess = (data) => {
      const plantName = plant?.name || 'Plant';
      Alert.alert('Delete Plant', data?.message || `"${plantName}" was deleted successfully.`, [
        { text: 'OK', onPress: () => navigation.goBack() }
      ]);
    };

    const handleDeleteFail = (data) => {
      // Show error only; keep user on screen to try again
      const errorMessage = data?.reason || data?.message || 'Failed to delete plant.';
      Alert.alert('Delete Plant', errorMessage, [{ text: 'OK' }]);
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
      // Use data?.reason (backend error message) instead of data?.message
      const errorMessage = data?.reason || 'Failed to get sensor data.';
      Alert.alert('Sensor Error', errorMessage);
    };

    const handleUpdateSuccess = (data) => {
      Alert.alert('Update Plant', data?.message || 'Plant details updated successfully!');
    };

    const handleUpdateFail = (data) => {
      // Use data?.reason (backend error message) instead of data?.message
      const errorMessage = data?.reason || 'Failed to update plant details.';
      Alert.alert('Update Plant', errorMessage);
    };

    const handleUnblockSuccess = (data) => {
      Alert.alert('Valve Unblocked', data?.message || 'Valve has been unblocked successfully!');
      // Refresh the plant data or navigate back
      navigation.goBack();
    };

    const handleUnblockFail = (data) => {
      Alert.alert('Unblock Failed', data?.message || 'Failed to unblock valve.');
    };

    const handleValveBlocked = (data) => {
      console.log('PlantDetail: Valve blocked message received:', data);
      Alert.alert('Valve Blocked', data?.message || 'The valve has been blocked and cannot be operated.');
      // Refresh the plant data to show the blocked status
      // This will trigger a re-render with the updated valve_blocked status
    };

    const handleTestValveBlockSuccess = (data) => {
      console.log('PlantDetail: Test valve block success:', data);
      Alert.alert('Test Success', data?.message || 'Valve has been blocked for testing. Please refresh the plant list to see the changes.');
      // Navigate back to refresh the plant list
      navigation.goBack();
    };

    const handleStopIrrigationSuccess = (data) => {
      console.log('🛑 Stop irrigation success:', data);
      // No need for alert since IrrigationContext will handle the state
      stoppingRef.current = false;
      Alert.alert('Smart Irrigation', 'Smart irrigation has been stopped at your request.');
    };

    const handleStopIrrigationFail = (data) => {
      console.log('❌ Stop irrigation failed:', data);
      Alert.alert('Stop Failed', data?.message || 'Failed to stop irrigation. Please try again.');
      stoppingRef.current = false;
    };

    websocketService.onMessage('IRRIGATE_SUCCESS', handleSuccess);
    websocketService.onMessage('IRRIGATE_FAIL', handleFail);
    websocketService.onMessage('IRRIGATE_SKIPPED', handleSkipped);
    websocketService.onMessage('IRRIGATION_SKIPPED', handleSkipped);  // Handle both message types
    websocketService.onMessage('DELETE_PLANT_SUCCESS', handleDeleteSuccess);
    websocketService.onMessage('DELETE_PLANT_FAIL', handleDeleteFail);
    websocketService.onMessage('PLANT_MOISTURE_RESPONSE', handleMoistureSuccess);
    websocketService.onMessage('GET_MOISTURE_SUCCESS', handleMoistureSuccess);
    websocketService.onMessage('GET_MOISTURE_FAIL', handleMoistureFail);
    websocketService.onMessage('UNBLOCK_VALVE_SUCCESS', handleUnblockSuccess);
    websocketService.onMessage('UNBLOCK_VALVE_FAIL', handleUnblockFail);
    websocketService.onMessage('VALVE_BLOCKED', handleValveBlocked);
    websocketService.onMessage('TEST_VALVE_BLOCK_SUCCESS', handleTestValveBlockSuccess);
    websocketService.onMessage('STOP_IRRIGATION_SUCCESS', handleStopIrrigationSuccess);
    websocketService.onMessage('STOP_IRRIGATION_FAIL', handleStopIrrigationFail);

    // Valve restart/unblocked handlers to clear blocked banner immediately
    const handleRestartValveSuccessDetail = (message) => {
      const payload = message?.data || message;
      const pid = payload?.plantId != null ? Number(payload.plantId) : null;
      const pname = payload?.plantName || payload?.plant_name;
      const idMatches = pid != null && plant?.id != null && Number(pid) === Number(plant.id);
      const nameMatches = pname && plant?.name && String(pname) === String(plant.name);
      if (idMatches || nameMatches) {
        setPlant(prev => ({ ...prev, valve_blocked: false }));
      }
    };
    const handleGardenValveUnblocked = (message) => {
      const payload = message?.data || message;
      const pid = payload?.plantId != null ? Number(payload.plantId) : null;
      const pname = payload?.plantName || payload?.plant_name;
      const idMatches = pid != null && plant?.id != null && Number(pid) === Number(plant.id);
      const nameMatches = pname && plant?.name && String(pname) === String(plant.name);
      if (idMatches || nameMatches) {
        setPlant(prev => ({ ...prev, valve_blocked: false }));
      }
    };
    websocketService.onMessage('RESTART_VALVE_SUCCESS', handleRestartValveSuccessDetail);
    websocketService.onMessage('GARDEN_VALVE_UNBLOCKED', handleGardenValveUnblocked);

    return () => {
      websocketService.offMessage('IRRIGATE_SUCCESS', handleSuccess);
      websocketService.offMessage('IRRIGATE_FAIL', handleFail);
      websocketService.offMessage('IRRIGATE_SKIPPED', handleSkipped);
      websocketService.offMessage('IRRIGATION_SKIPPED', handleSkipped);  // Handle both message types
      websocketService.offMessage('DELETE_PLANT_SUCCESS', handleDeleteSuccess);
      websocketService.offMessage('DELETE_PLANT_FAIL', handleDeleteFail);
      websocketService.offMessage('PLANT_MOISTURE_RESPONSE', handleMoistureSuccess);
      websocketService.offMessage('GET_MOISTURE_SUCCESS', handleMoistureSuccess);
      websocketService.offMessage('GET_MOISTURE_FAIL', handleMoistureFail);
      websocketService.offMessage('UNBLOCK_VALVE_SUCCESS', handleUnblockSuccess);
      websocketService.offMessage('UNBLOCK_VALVE_FAIL', handleUnblockFail);
      websocketService.offMessage('VALVE_BLOCKED', handleValveBlocked);
      websocketService.offMessage('TEST_VALVE_BLOCK_SUCCESS', handleTestValveBlockSuccess);
      websocketService.offMessage('STOP_IRRIGATION_SUCCESS', handleStopIrrigationSuccess);
      websocketService.offMessage('STOP_IRRIGATION_FAIL', handleStopIrrigationFail);
      websocketService.offMessage('RESTART_VALVE_SUCCESS', handleRestartValveSuccessDetail);
      websocketService.offMessage('GARDEN_VALVE_UNBLOCKED', handleGardenValveUnblocked);
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
        <TouchableOpacity onPress={() => setShowSettingsModal(true)} style={styles.headerSettingsButton}>
          <Feather name="settings" size={24} color="#2C3E50" />
        </TouchableOpacity>
      </View>

      {/* Irrigation Control Bar - hidden when overlay is active to avoid layered green background */}
      {(isWateringActive || isManualMode) && !(isWateringActive && !pendingIrrigationRequest && (isManualMode || isSmartMode)) && (
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

        {/* Plant Configuration */}
        <View style={styles.plantConfigContainer}>
          <Text style={styles.sectionTitle}>Plant Configuration</Text>
          <View style={styles.configGrid}>
            <View style={styles.configItem}>
              <View style={styles.configIconContainer}>
                <Feather name="activity" size={16} color="#4CAF50" />
              </View>
              <View style={styles.configInfo}>
                <Text style={styles.configLabel}>Dripper Type</Text>
                <Text style={styles.configValue}>{plant.dripper_type || '2L/h'}</Text>
              </View>
            </View>
            <View style={styles.configItem}>
              <View style={styles.configIconContainer}>
                <Feather name="droplet" size={16} color="#4CAF50" />
              </View>
              <View style={styles.configInfo}>
                <Text style={styles.configLabel}>Target Moisture</Text>
                <Text style={styles.configValue}>{plant.ideal_moisture || plant.desiredMoisture || 50}%</Text>
              </View>
            </View>
            <View style={styles.configItem}>
              <View style={styles.configIconContainer}>
                <Feather name="bar-chart-2" size={16} color="#4CAF50" />
              </View>
              <View style={styles.configInfo}>
                <Text style={styles.configLabel}>Water Limit</Text>
                <Text style={styles.configValue}>{plant.water_limit}L</Text>
              </View>
            </View>
          </View>
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

        {/* Valve Blocked Warning */}
        {plant.valve_blocked && (
          <View style={styles.valveBlockedContainer}>
            <View style={styles.valveBlockedHeader}>
              <Feather name="alert-triangle" size={24} color="#F59E0B" />
              <Text style={styles.valveBlockedTitle}>Tap is Blocked</Text>
            </View>
            <Text style={styles.valveBlockedDescription}>
              The valve for this plant is currently blocked and cannot be operated.
              Please troubleshoot the hardware issue to restore irrigation functionality.
            </Text>
            <View style={{ flexDirection: 'row', gap: 12, justifyContent: 'flex-end' }}>
              <TouchableOpacity
                style={styles.troubleshootButton}
                onPress={() => navigation.navigate('ValveTroubleshooting', { plant })}
              >
                <Feather name="tool" size={20} color="#FFFFFF" />
                <Text style={styles.troubleshootButtonText}>Diagnose</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}



        {/* 2. Smart Irrigation Section */}
        <View style={styles.sectionContainer}>
          <Text style={styles.sectionTitle}>Smart Irrigation</Text>
          <Text style={styles.sectionDescription}>
            Smart irrigation automatically waters your plant based on soil moisture levels and optimal conditions.
          </Text>
          <TouchableOpacity
            style={[styles.primaryButton, (isWateringActive || plant.valve_blocked) && styles.disabledButton]}
            onPress={handleSmartIrrigation}
            disabled={isWateringActive || plant.valve_blocked}
          >
            <Feather name="zap" size={20} color="#FFFFFF" />
            <Text style={styles.primaryButtonText}>
              {plant.valve_blocked ? 'Valve Blocked' : 'Start Smart Irrigation'}
            </Text>
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
              style={[
                styles.primaryButton,
                styles.halfButton,
                (isWateringActive || isManualMode || pendingValveRequest || plant.valve_blocked) && styles.disabledButton
              ]}
              onPress={() => {
                // Open Valve button pressed
                handleManualIrrigation();
              }}
              disabled={isWateringActive || isManualMode || pendingValveRequest || plant.valve_blocked}
            >
              <Feather name="droplet" size={20} color="#FFFFFF" />
              <Text style={styles.primaryButtonText}>
                Open Valve
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.stopButton, styles.halfButton, (!isManualMode || plant.valve_blocked) && styles.disabledButton]}
              onPress={() => {
                // Close Valve button pressed
                handleStopWatering(plant.id);
              }}
              disabled={!isManualMode || plant.valve_blocked}
            >
              <Feather name="square" size={20} color="#FFFFFF" />
              <Text style={styles.stopButtonText}>
                {plant.valve_blocked ? 'Valve Blocked' : 'Close Valve'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* 4. Active Watering Status - removed (overlay already shows status) */}


        {/* 5. Additional Actions */}
        <View style={styles.sectionContainer}>
          <Text style={styles.sectionTitle}>Additional Actions</Text>

          <TouchableOpacity
            style={styles.secondaryButton}
            onPress={() => setShowScheduleModal(true)}
          >
            <Feather name="calendar" size={20} color="#4CAF50" />
            <Text style={styles.secondaryButtonText}>View Schedule</Text>
          </TouchableOpacity>

          {/* Delete Plant moved into Settings modal */}
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

      {/* 7. Smart Irrigation Loader */}
      <SmartIrrigationLoader
        isVisible={pendingIrrigationRequest}
      />

      {/* 8. Irrigation Overlay */}
      <IrrigationOverlay
        isActive={isWateringActive && !pendingIrrigationRequest && (isManualMode || isSmartMode)}
        timeLeft={wateringTimeLeft}
        onStop={() => {
          // Delegate to context stop; it routes CLOSE_VALVE for manual and STOP_IRRIGATION for smart
          handleStopWatering(plant.id);
        }}
      />

      {/* 9. Settings Modal */}
      <Modal
        visible={showSettingsModal}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowSettingsModal(false)}
      >
        <SafeAreaView style={styles.modalContainer}>
          {/* Modal Header */}
          <View style={styles.modalHeader}>
            <TouchableOpacity
              onPress={() => setShowSettingsModal(false)}
              style={styles.modalCloseButton}
            >
              <Feather name="x" size={24} color="#2C3E50" />
            </TouchableOpacity>
            <Text style={styles.modalTitle}>Plant Settings</Text>
            <View style={styles.modalSpacer} />
          </View>

          {/* Modal Content */}
          <ScrollView style={styles.modalContent} showsVerticalScrollIndicator={false}>
            <View style={styles.settingsSection}>
              <Text style={styles.settingsSectionTitle}>Plant Configuration</Text>

              <TouchableOpacity
                style={styles.settingsItem}
                onPress={() => {
                  setShowSettingsModal(false);
                  handleChangePlantName();
                }}
              >
                <View style={styles.settingsItemIcon}>
                  <Feather name="edit-3" size={20} color="#4CAF50" />
                </View>
                <View style={styles.settingsItemContent}>
                  <Text style={styles.settingsItemTitle}>Change Name</Text>
                  <Text style={styles.settingsItemSubtitle}>Update plant name</Text>
                </View>
                <Feather name="chevron-right" size={20} color="#C7C7CC" />
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.settingsItem}
                onPress={() => {
                  setShowSettingsModal(false);
                  handleChangeDesiredHumidity();
                }}
              >
                <View style={styles.settingsItemIcon}>
                  <Feather name="droplet" size={20} color="#4CAF50" />
                </View>
                <View style={styles.settingsItemContent}>
                  <Text style={styles.settingsItemTitle}>Change Desired Humidity</Text>
                  <Text style={styles.settingsItemSubtitle}>Set target moisture level</Text>
                </View>
                <Feather name="chevron-right" size={20} color="#C7C7CC" />
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.settingsItem}
                onPress={() => {
                  setShowSettingsModal(false);
                  handleChangeDripper();
                }}
              >
                <View style={styles.settingsItemIcon}>
                  <Feather name="sliders" size={20} color="#4CAF50" />
                </View>
                <View style={styles.settingsItemContent}>
                  <Text style={styles.settingsItemTitle}>Change Dripper</Text>
                  <Text style={styles.settingsItemSubtitle}>Select dripper type</Text>
                </View>
                <Feather name="chevron-right" size={20} color="#C7C7CC" />
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.settingsItem}
                onPress={() => {
                  setShowSettingsModal(false);
                  handleChangeWaterLimit();
                }}
              >
                <View style={styles.settingsItemIcon}>
                  <Feather name="maximize-2" size={20} color="#4CAF50" />
                </View>
                <View style={styles.settingsItemContent}>
                  <Text style={styles.settingsItemTitle}>Change Water Limit</Text>
                  <Text style={styles.settingsItemSubtitle}>Set maximum water amount</Text>
                </View>
                <Feather name="chevron-right" size={20} color="#C7C7CC" />
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.settingsItem}
                onPress={() => {
                  setShowSettingsModal(false);
                  setTimeout(() => setShowImageSourceSheet(true), 150);
                }}
              >
                <View style={styles.settingsItemIcon}>
                  <Feather name="image" size={20} color="#4CAF50" />
                </View>
                <View style={styles.settingsItemContent}>
                  <Text style={styles.settingsItemTitle}>Change Image</Text>
                  <Text style={styles.settingsItemSubtitle}>Update plant photo</Text>
                </View>
                <Feather name="chevron-right" size={20} color="#C7C7CC" />
              </TouchableOpacity>

              {/* Delete Plant moved into Settings */}
              <TouchableOpacity
                style={styles.settingsItem}
                onPress={() => {
                  setShowSettingsModal(false);
                  handleDeletePlant();
                }}
              >
                <View style={styles.settingsItemIcon}>
                  <Feather name="trash-2" size={20} color="#EF4444" />
                </View>
                <View style={styles.settingsItemContent}>
                  <Text style={styles.settingsItemTitle}>Delete Plant</Text>
                  <Text style={styles.settingsItemSubtitle}>Remove this plant from your garden</Text>
                </View>
                <Feather name="chevron-right" size={20} color="#C7C7CC" />
              </TouchableOpacity>
            </View>
          </ScrollView>
        </SafeAreaView>
      </Modal>
      {/* Dripper Type Selection Modal */}
      <Modal
        visible={showDripperModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowDripperModal(false)}
      >
        <View style={mainStyles.modalOverlay}>
          <View style={mainStyles.modalContent}>
            <Text style={mainStyles.modalTitle}>Select Dripper Type</Text>
            {['2L/h', '4L/h', '8L/h'].map((opt) => (
              <TouchableOpacity
                key={opt}
                style={mainStyles.modalButton}
                onPress={() => setPendingDripperType(opt)}
              >
                <Feather name={pendingDripperType === opt ? 'check-circle' : 'circle'} size={24} color="#16A34A" />
                <Text style={mainStyles.modalButtonText}>{opt}</Text>
              </TouchableOpacity>
            ))}
            <View style={{ flexDirection: 'row', gap: 12, width: '100%', marginTop: 4 }}>
              <TouchableOpacity
                style={[mainStyles.modalButton, { flex: 1, marginBottom: 0 }]}
                onPress={() => {
                  if (pendingDripperType) {
                    updatePlantDetails({ dripperType: pendingDripperType });
                  }
                  setShowDripperModal(false);
                }}
              >
                <Feather name="save" size={24} color="#16A34A" />
                <Text style={mainStyles.modalButtonText}>Save</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[mainStyles.modalButton, mainStyles.cancelButton, { flex: 1, marginBottom: 0 }]}
                onPress={() => setShowDripperModal(false)}
              >
                <Text style={mainStyles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
      {/* Water Limit Modal */}
      <Modal
        visible={showWaterLimitModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowWaterLimitModal(false)}
      >
        <View style={mainStyles.modalOverlay}>
          <View style={mainStyles.modalContent}>
            <Text style={mainStyles.modalTitle}>Change Water Limit</Text>
            <View style={{ width: '100%', marginVertical: 8 }}>
              <TextInput
                value={waterLimitInput}
                onChangeText={setWaterLimitInput}
                keyboardType="numeric"
                placeholder="Enter liters (e.g., 1.5)"
                style={{
                  borderWidth: 1,
                  borderColor: '#D1D5DB',
                  borderRadius: 10,
                  paddingHorizontal: 14,
                  paddingVertical: 10,
                  fontSize: 16,
                  color: '#111827'
                }}
              />
            </View>
            <View style={{ flexDirection: 'row', gap: 12, width: '100%', marginTop: 4 }}>
              <TouchableOpacity
                style={[mainStyles.modalButton, { flex: 1, marginBottom: 0 }]}
                onPress={() => {
                  const limitValue = parseFloat(String(waterLimitInput).replace(',', '.'));
                  if (!isNaN(limitValue) && limitValue > 0) {
                    updatePlantDetails({ waterLimit: limitValue });
                    setShowWaterLimitModal(false);
                  } else {
                    Alert.alert('Invalid Input', 'Please enter a positive number');
                  }
                }}
              >
                <Feather name="save" size={24} color="#16A34A" />
                <Text style={mainStyles.modalButtonText}>Save</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[mainStyles.modalButton, mainStyles.cancelButton, { flex: 1, marginBottom: 0 }]}
                onPress={() => setShowWaterLimitModal(false)}
              >
                <Text style={mainStyles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
      {/* Change Name Modal */}
      <Modal
        visible={showNameModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowNameModal(false)}
      >
        <View style={mainStyles.modalOverlay}>
          <View style={mainStyles.modalContent}>
            <Text style={mainStyles.modalTitle}>Change Plant Name</Text>
            <View style={{ width: '100%', marginVertical: 8 }}>
              <TextInput
                value={nameInput}
                onChangeText={setNameInput}
                placeholder="Enter plant name"
                style={{
                  borderWidth: 1,
                  borderColor: '#D1D5DB',
                  borderRadius: 10,
                  paddingHorizontal: 14,
                  paddingVertical: 10,
                  fontSize: 16,
                  color: '#111827'
                }}
              />
            </View>
            <View style={{ flexDirection: 'row', gap: 12, width: '100%', marginTop: 4 }}>
              <TouchableOpacity
                style={[mainStyles.modalButton, { flex: 1, marginBottom: 0 }]}
                onPress={() => {
                  const newName = String(nameInput || '').trim();
                  if (newName.length >= 1 && newName.length <= 50) {
                    updatePlantDetails({ newPlantName: newName });
                    setShowNameModal(false);
                  } else {
                    Alert.alert('Invalid Name', 'Name must be 1–50 characters.');
                  }
                }}
              >
                <Feather name="save" size={24} color="#16A34A" />
                <Text style={mainStyles.modalButtonText}>Save</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[mainStyles.modalButton, mainStyles.cancelButton, { flex: 1, marginBottom: 0 }]}
                onPress={() => setShowNameModal(false)}
              >
                <Text style={mainStyles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
      {/* Desired Humidity Modal */}
      <Modal
        visible={showHumidityModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowHumidityModal(false)}
      >
        <View style={mainStyles.modalOverlay}>
          <View style={mainStyles.modalContent}>
            <Text style={mainStyles.modalTitle}>Change Desired Humidity</Text>
            <View style={{ width: '100%', marginVertical: 8 }}>
              <TextInput
                value={humidityInput}
                onChangeText={setHumidityInput}
                keyboardType="numeric"
                placeholder="Enter 0-100"
                style={{
                  borderWidth: 1,
                  borderColor: '#D1D5DB',
                  borderRadius: 10,
                  paddingHorizontal: 14,
                  paddingVertical: 10,
                  fontSize: 16,
                  color: '#111827'
                }}
              />
            </View>
            <View style={{ flexDirection: 'row', gap: 12, width: '100%', marginTop: 4 }}>
              <TouchableOpacity
                style={[mainStyles.modalButton, { flex: 1, marginBottom: 0 }]}
                onPress={() => {
                  const value = parseFloat(String(humidityInput).replace(',', '.'));
                  if (!isNaN(value) && value >= 0 && value <= 100) {
                    updatePlantDetails({ desiredMoisture: value });
                    setShowHumidityModal(false);
                  } else {
                    Alert.alert('Invalid Input', 'Please enter a number between 0 and 100');
                  }
                }}
              >
                <Feather name="save" size={24} color="#16A34A" />
                <Text style={mainStyles.modalButtonText}>Save</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[mainStyles.modalButton, mainStyles.cancelButton, { flex: 1, marginBottom: 0 }]}
                onPress={() => setShowHumidityModal(false)}
              >
                <Text style={mainStyles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* 10. Schedule Modal */}
      {/* Image Source Bottom Sheet */}
      <Modal
        visible={showImageSourceSheet}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowImageSourceSheet(false)}
      >
        <View style={mainStyles.modalOverlay}>
          <View style={mainStyles.modalContent}>
            <Text style={mainStyles.modalTitle}>Change Plant Image</Text>
            <TouchableOpacity style={mainStyles.modalButton} onPress={handleTakePhoto}>
              <Feather name="camera" size={24} color="#16A34A" />
              <Text style={mainStyles.modalButtonText}>Take Photo</Text>
            </TouchableOpacity>
            <TouchableOpacity style={mainStyles.modalButton} onPress={handleChangeImage}>
              <Feather name="image" size={24} color="#16A34A" />
              <Text style={mainStyles.modalButtonText}>Choose from Gallery</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[mainStyles.modalButton, mainStyles.cancelButton]} onPress={() => setShowImageSourceSheet(false)}>
              <Text style={mainStyles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
      <Modal
        visible={showScheduleModal}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowScheduleModal(false)}
      >
        <SafeAreaView style={styles.modalContainer}>
          {/* Modal Header */}
          <View style={styles.modalHeader}>
            <TouchableOpacity
              onPress={() => setShowScheduleModal(false)}
              style={styles.modalCloseButton}
            >
              <Feather name="x" size={24} color="#2C3E50" />
            </TouchableOpacity>
            <Text style={styles.modalTitle}>Irrigation Schedule</Text>
            <View style={styles.modalSpacer} />
          </View>

          {/* Modal Content */}
          <ScrollView style={styles.modalContent} showsVerticalScrollIndicator={false}>
            <View style={styles.scheduleCard}>
              <View style={styles.scheduleHeader}>
                <View style={styles.scheduleHeaderLeft}>
                  <Feather name="calendar" size={18} color="#059669" />
                </View>
                <Text style={styles.scheduleTitle}>This Plant's Irrigation</Text>
              </View>

              {renderScheduleContent(plant)}
            </View>
          </ScrollView>
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
};

export default PlantDetail; 