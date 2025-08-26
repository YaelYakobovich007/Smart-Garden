/**
 * Add Plant Screen Component - Plant Registration and Configuration
 * 
 * This component allows users to add new plants to their smart garden.
 * It handles:
 * - Plant information input (name, type, care settings)
 * - Image capture and selection
 * - Watering schedule configuration
 * - Form validation and error handling
 * - WebSocket communication for plant creation
 * 
 * The component provides a comprehensive form for plant setup
 * with real-time validation and server communication.
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Image,
  Alert,
  Switch,
  Modal,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute } from '@react-navigation/native';
import { useCameraPermissions } from 'expo-camera';
import * as ImagePicker from 'expo-image-picker';
import DateTimePicker from '@react-native-community/datetimepicker';
import { Feather } from '@expo/vector-icons';
import styles from './styles';
import websocketService from '../../services/websocketService';
import HelpTooltip from './HelpTooltip';

// Days of the week for schedule configuration
const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export default function AddPlantScreen() {
  const navigation = useNavigation();
  const route = useRoute();

  // Form data state management
  const [formData, setFormData] = useState({
    plantName: '',
    plantType: '',
    humidity: 60,
    waterLimit: 1.0,
    dripperType: '2L/h', // Default dripper type
    image: null,
    useSchedule: false,
    schedule: {
      days: [false, false, false, false, false, false, false],
      time: new Date(),
    },
  });

  // UI state management
  const [errors, setErrors] = useState({});
  const [showImagePicker, setShowImagePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [cameraPermission, requestCameraPermission] = useCameraPermissions();

  // Handle identified plant type from scan
  useEffect(() => {
    if (route.params?.identifiedPlantType) {
      const { identifiedPlantType, confidence } = route.params;
      setFormData(prev => ({
        ...prev,
        plantType: identifiedPlantType
      }));

      // Show success message
      Alert.alert(
        'Plant Identified!',
        `Successfully identified as: ${identifiedPlantType} (${confidence}% confidence)`,
        [{ text: 'OK' }]
      );

      // Clear the parameter to prevent setting it again
      navigation.setParams({ identifiedPlantType: undefined, confidence: undefined });
    }
  }, [route.params?.identifiedPlantType]);

  /**
   * Set up WebSocket message handlers for plant creation responses
   * Handles success and failure responses from the server
   */
  useEffect(() => {
    /**
     * Handle successful plant creation
     * Navigates directly to sensor placement screen
     * @param {Object} data - Server response data
     */
    const handleSuccess = (data) => {
      setIsSaving(false);
      // Navigate directly to sensor placement screen with sensor port from response
      // The server sends sensor_port in the hardware object
      const sensorPort = data?.hardware?.sensor_port || data?.sensor_port || route.params?.sensorId || "/dev/ttyUSB0";
      navigation.navigate('SensorPlacement', { sensorId: sensorPort });
    };

    /**
     * Handle failed plant creation
     * Shows error alert to user
     * @param {Object} data - Server response data
     */
    const handleFail = (data) => {
      setIsSaving(false);
      Alert.alert(
        'Failed to Add Plant',
        data?.reason || data?.message || 'An error occurred while adding the plant',
        [
          { text: 'OK' }
        ]
      );
    };

    // Register WebSocket message handlers
    websocketService.onMessage('ADD_PLANT_SUCCESS', handleSuccess);
    websocketService.onMessage('ADD_PLANT_FAIL', handleFail);

    /**
     * Cleanup function to remove message handlers
     * Prevents memory leaks when component unmounts
     */
    return () => {
      websocketService.offMessage('ADD_PLANT_SUCCESS', handleSuccess);
      websocketService.offMessage('ADD_PLANT_FAIL', handleFail);
    };
  }, [navigation]);

  /**
   * Validate form data before submission
   * Checks required fields and value ranges
   * @returns {boolean} True if form is valid
   */
  const validateForm = () => {
    const newErrors = {};

    // Validate plant name (required)
    if (!formData.plantName.trim()) {
      newErrors.plantName = 'Plant name is required';
    }

    // Validate humidity range (0-100%)
    if (formData.humidity < 0 || formData.humidity > 100) {
      newErrors.humidity = 'Humidity must be between 0-100%';
    }

    // Validate water limit (must be positive)
    if (formData.waterLimit <= 0) {
      newErrors.waterLimit = 'Water limit must be greater than 0';
    }

    // Validate dripper type (must be one of the allowed values)
    const allowedDripperTypes = ['1L/h', '2L/h', '4L/h', '8L/h'];
    if (!allowedDripperTypes.includes(formData.dripperType)) {
      newErrors.dripperType = 'Please select a valid dripper type';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  /**
   * Handle form submission and plant creation
   * Validates form, processes image, and sends data to server
   */
  const handleSave = async () => {
    if (validateForm()) {
      setIsSaving(true);
      try {
        // Prepare irrigation schedule data if enabled
        let irrigationDays = null;
        let irrigationTime = null;
        if (formData.useSchedule) {
          irrigationDays = DAYS.filter((day, idx) => formData.schedule.days[idx]);
          // Format time as 'HH:mm'
          const t = formData.schedule.time;
          const pad = (n) => n.toString().padStart(2, '0');
          irrigationTime = `${pad(t.getHours())}:${pad(t.getMinutes())}`;
        }

        // Process image data if an image is selected
        let imageData = null;
        if (formData.image) {
          try {
            // Convert image to base64 for server transmission
            const response = await fetch(formData.image);
            const blob = await response.blob();

            // Check image size (limit to 5MB)
            const maxSize = 5 * 1024 * 1024; // 5MB in bytes
            if (blob.size > maxSize) {
              Alert.alert(
                'Image Too Large',
                'Please select an image smaller than 5MB.',
                [{ text: 'OK' }]
              );
              setIsSaving(false);
              return;
            }

            // Convert blob to base64
            const base64 = await new Promise((resolve, reject) => {
              const reader = new FileReader();
              reader.onload = () => resolve(reader.result);
              reader.onerror = reject;
              reader.readAsDataURL(blob);
            });

            // Extract filename and mime type from image
            const filename = formData.image.split('/').pop() || 'plant_image.jpg';
            const mimeType = blob.type || 'image/jpeg';

            imageData = {
              base64: base64,
              filename: filename,
              mimeType: mimeType
            };

            console.log('Image prepared for upload:', {
              filename: imageData.filename,
              mimeType: imageData.mimeType,
              size: Math.round(blob.size / 1024) + ' KB'
            });
          } catch (imageError) {
            console.error('Error processing image:', imageError);
            Alert.alert(
              'Image Error',
              'Failed to process the selected image. Please try selecting a different image.',
              [{ text: 'OK' }]
            );
            setIsSaving(false);
            return;
          }
        }

        // Prepare message for server
        const message = {
          type: 'ADD_PLANT',
          plantData: {
            plantName: formData.plantName,
            plantType: formData.plantType,
            desiredMoisture: formData.humidity,
            waterLimit: formData.waterLimit,
            dripperType: formData.dripperType,
            irrigationDays,
            irrigationTime
          },
          imageData: imageData // Include image data if available
        };

        console.log('Sending plant creation request with image:', !!imageData);
        websocketService.sendMessage(message);
      } catch (error) {
        console.error('Error in handleSave:', error);
        Alert.alert(
          'Error',
          'An unexpected error occurred. Please try again.',
          [{ text: 'OK' }]
        );
        setIsSaving(false);
      }
    }
  };

  /**
   * Launch image picker to select image from gallery
   * Allows user to choose an existing photo from their device
   */
  const pickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1], // Square aspect ratio
      quality: 0.8, // 80% quality for file size optimization
    });

    if (!result.canceled) {
      setFormData({ ...formData, image: result.assets[0].uri });
    }
    setShowImagePicker(false);
  };

  /**
   * Launch camera to take a new photo
   * Handles camera permissions and captures new plant image
   */
  const takePhoto = async () => {
    // Check camera permissions
    if (!cameraPermission?.granted) {
      const permission = await requestCameraPermission();
      if (!permission.granted) {
        Alert.alert('Permission needed', 'Camera permission is required to take photos');
        return;
      }
    }

    const result = await ImagePicker.launchCameraAsync({
      allowsEditing: true,
      aspect: [1, 1], // Square aspect ratio
      quality: 0.8, // 80% quality for file size optimization
    });

    if (!result.canceled) {
      setFormData({ ...formData, image: result.assets[0].uri });
    }
    setShowImagePicker(false);
  };

  /**
   * Toggle day selection in watering schedule
   * Updates the schedule days array when user selects/deselects days
   * @param {number} index - Index of the day to toggle
   */
  const toggleDay = (index) => {
    const newDays = [...formData.schedule.days];
    newDays[index] = !newDays[index];
    setFormData({
      ...formData,
      schedule: { ...formData.schedule, days: newDays },
    });
  };

  /**
   * Handle time picker changes
   * Updates the watering time in the schedule
   * @param {Object} event - Time picker event
   * @param {Date} selectedTime - Selected time from picker
   */
  const handleTimeChange = (event, selectedTime) => {
    setShowTimePicker(Platform.OS === 'ios');
    if (selectedTime) {
      setFormData({
        ...formData,
        schedule: { ...formData.schedule, time: selectedTime },
      });
    }
  };

  /**
   * Update form data fields
   * Generic function to update any form field
   * @param {string} field - Field name to update
   * @param {any} value - New value for the field
   */
  const updateFormData = (field, value) => {
    setFormData({ ...formData, [field]: value });
  };

  /**
   * Update schedule-specific form data
   * Updates nested schedule object fields
   * @param {string} field - Schedule field name
   * @param {any} value - New value for the field
   */
  const updateSchedule = (field, value) => {
    setFormData({
      ...formData,
      schedule: { ...formData.schedule, [field]: value },
    });
  };

  /**
   * Render the add plant screen with form sections
   * Includes plant info, care settings, image, and schedule
   */
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#EAF5E4' }}>
      {/* Header with back button and title */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => (navigation.canGoBack() ? navigation.goBack() : navigation.navigate('Main'))} style={styles.backButton}>
          <Feather name="chevron-left" size={24} color="#2C3E50" />
        </TouchableOpacity>
        <View style={styles.headerTitleContainer}>
          <Text style={styles.headerTitle}>🌿 Add New Plant</Text>
        </View>
        <View style={styles.headerSpacer} />
      </View>



      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {/* Plant Basic Information Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Plant Information</Text>

          <View style={styles.inputContainer}>
            <View style={styles.labelRow}>
              <Text style={styles.label}>
                Plant Name <Text style={styles.required}>*</Text>
              </Text>
              <HelpTooltip
                title="Plant Name"
                description="Give your plant a unique name to easily identify it in your garden. This name will be displayed in the app and used for notifications."
              />
            </View>
            <TextInput
              style={[styles.input, errors.plantName && styles.inputError]}
              value={formData.plantName}
              onChangeText={(text) => updateFormData('plantName', text)}
              placeholder="Enter plant name"
              placeholderTextColor="#9CA3AF"
            />
            {errors.plantName && (
              <View style={styles.errorContainer}>
                <Feather name="alert-circle" size={16} color="#EF4444" />
                <Text style={styles.errorText}>{errors.plantName}</Text>
              </View>
            )}
          </View>

          <View style={styles.inputContainer}>
            <View style={styles.labelRow}>
              <Text style={styles.label}>Plant Type</Text>
              <HelpTooltip
                title="Plant Type"
                description="Specify the type of plant (e.g., Succulent, Herb, Flower). This helps the system provide better care recommendations and watering schedules."
              />
            </View>
            <View style={styles.scanButtonContainer}>
              <TextInput
                style={[styles.input, styles.inputWithScan]}
                value={formData.plantType}
                onChangeText={(text) => updateFormData('plantType', text)}
                placeholder="e.g., Succulent, Herb, Flower"
                placeholderTextColor="#9CA3AF"
              />
              <TouchableOpacity
                style={styles.scanButton}
                onPress={() => navigation.navigate('Main', {
                  openIdentifyPlant: true,
                  fromAddPlant: true
                })}
              >
                <Feather name="camera" size={20} color="#4CAF50" />
                <Text style={styles.scanButtonText}>Scan</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>

        {/* Plant Care Settings Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Care Settings</Text>

          <View style={styles.inputContainer}>
            <View style={styles.labelRow}>
              <View style={styles.labelContainer}>
                <Feather name="thermometer" size={20} color="#4CAF50" />
                <Text style={styles.label}>
                  Optimal Humidity <Text style={styles.required}>*</Text>
                </Text>
              </View>
              <HelpTooltip
                title="Optimal Humidity"
                description="This is the target soil moisture level (0-100%) that your plant prefers. The system will automatically water your plant when the soil moisture drops below this level. Most plants thrive at 60-80% humidity."
              />
            </View>
            <View style={styles.sliderContainer}>
              <TextInput
                style={[styles.numberInput, errors.humidity && styles.inputError]}
                value={formData.humidity.toString()}
                onChangeText={(text) => {
                  const value = parseInt(text) || 0;
                  updateFormData('humidity', Math.min(100, Math.max(0, value)));
                }}
                keyboardType="numeric"
                maxLength={3}
              />
              <Text style={styles.unit}>%</Text>
            </View>
            {errors.humidity && (
              <View style={styles.errorContainer}>
                <Feather name="alert-circle" size={16} color="#EF4444" />
                <Text style={styles.errorText}>{errors.humidity}</Text>
              </View>
            )}
          </View>

          <View style={styles.inputContainer}>
            <View style={styles.labelRow}>
              <View style={styles.labelContainer}>
                <Feather name="droplet" size={20} color="#4CAF50" />
                <Text style={styles.label}>
                  Water Limit <Text style={styles.required}>*</Text>
                </Text>
              </View>
              <HelpTooltip
                title="Water Limit"
                description="This is the maximum amount of water (in liters) that can be given to your plant in a single watering session. This prevents overwatering and helps conserve water. For most plants, 0.5-2 liters is sufficient."
              />
            </View>
            <View style={styles.sliderContainer}>
              <TextInput
                style={[styles.numberInput, errors.waterLimit && styles.inputError]}
                value={formData.waterLimit.toString()}
                onChangeText={(text) => {
                  // More permissive input handling for decimal values
                  // Allow typing decimal point even if it results in incomplete number
                  if (text === '' || text === '.') {
                    updateFormData('waterLimit', text === '.' ? 0 : 0);
                    return;
                  }

                  // Allow decimal numbers with proper validation
                  const cleanText = text.replace(/[^0-9.]/g, '');

                  // Handle multiple decimal points - keep only the first one
                  const parts = cleanText.split('.');
                  if (parts.length > 2) {
                    const firstPart = parts[0];
                    const secondPart = parts[1];
                    const validText = firstPart + '.' + secondPart;
                    const value = parseFloat(validText) || 0;
                    updateFormData('waterLimit', Math.max(0, value));
                    return;
                  }

                  // Handle single decimal point
                  if (parts.length === 2) {
                    // Allow typing like "0." or "1.5"
                    const value = parseFloat(cleanText) || 0;
                    updateFormData('waterLimit', Math.max(0, value));
                    return;
                  }

                  // Handle whole numbers
                  const value = parseInt(cleanText) || 0;
                  updateFormData('waterLimit', Math.max(0, value));
                }}
                keyboardType="decimal-pad"
                placeholder="0.0"
                returnKeyType="done"
                maxLength={10}
              />
              <Text style={styles.unit}>L</Text>
            </View>
            <Text style={styles.hintText}>Enter value in liters (e.g., 0.5 for half a liter)</Text>
            {errors.waterLimit && (
              <View style={styles.errorContainer}>
                <Feather name="alert-circle" size={16} color="#EF4444" />
                <Text style={styles.errorText}>{errors.waterLimit}</Text>
              </View>
            )}
          </View>

          {/* Dripper Type Section */}
          <View style={styles.inputContainer}>
            <View style={styles.labelRow}>
              <View style={styles.labelContainer}>
                <Feather name="droplet" size={20} color="#4CAF50" />
                <Text style={styles.label}>
                  Dripper Type <Text style={styles.required}>*</Text>
                </Text>
              </View>
              <HelpTooltip
                title="Dripper Type"
                description="Select the flow rate of your irrigation dripper. This determines how much water flows per hour. Choose based on your plant's water needs and pot size. 2L/h is suitable for most plants."
              />
            </View>
            <View style={styles.dripperOptionsContainer}>
              {['1L/h', '2L/h', '4L/h', '8L/h'].map((option) => (
                <TouchableOpacity
                  key={option}
                  style={[
                    styles.dripperOption,
                    formData.dripperType === option && styles.dripperOptionSelected
                  ]}
                  onPress={() => updateFormData('dripperType', option)}
                >
                  <View style={[
                    styles.dripperRadio,
                    formData.dripperType === option && styles.dripperRadioSelected
                  ]}>
                    {formData.dripperType === option && (
                      <View style={styles.dripperRadioDot} />
                    )}
                  </View>
                  <Text style={[
                    styles.dripperOptionText,
                    formData.dripperType === option && styles.dripperOptionTextSelected
                  ]}>
                    {option}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
            <Text style={styles.hintText}>Select the flow rate of your dripper system</Text>
            {errors.dripperType && (
              <View style={styles.errorContainer}>
                <Feather name="alert-circle" size={16} color="#EF4444" />
                <Text style={styles.errorText}>{errors.dripperType}</Text>
              </View>
            )}
          </View>
        </View>

        {/* Plant Image Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Plant Photo</Text>
          <TouchableOpacity
            style={styles.imageContainer}
            onPress={() => setShowImagePicker(true)}
          >
            {formData.image ? (
              <Image source={{ uri: formData.image }} style={styles.plantImage} />
            ) : (
              <View style={styles.imagePlaceholder}>
                <Feather name="camera" size={32} color="#9CA3AF" />
                <Text style={styles.imagePlaceholderText}>Add a photo of your plant</Text>
              </View>
            )}
          </TouchableOpacity>
        </View>

        {/* Watering Schedule Section */}
        <View style={styles.section}>
          <View style={styles.scheduleHeader}>
            <View style={styles.labelContainer}>
              <Feather name="calendar" size={20} color="#4CAF50" />
              <Text style={styles.sectionTitle}>Watering Schedule</Text>
            </View>
            <Switch
              value={formData.useSchedule}
              onValueChange={(value) => updateFormData('useSchedule', value)}
              trackColor={{ false: '#D1D5DB', true: '#22C55E' }}
              thumbColor={formData.useSchedule ? '#FFFFFF' : '#F9FAFB'}
            />
          </View>

          {formData.useSchedule && (
            <>
              <Text style={styles.scheduleDescription}>
                Select the days when you want your plant to be watered
              </Text>

              <View style={styles.daysContainer}>
                {DAYS.map((day, index) => (
                  <TouchableOpacity
                    key={day}
                    style={[
                      styles.dayButton,
                      formData.schedule.days[index] && styles.dayButtonActive,
                    ]}
                    onPress={() => toggleDay(index)}
                  >
                    <Text
                      style={[
                        styles.dayText,
                        formData.schedule.days[index] && styles.dayTextActive,
                      ]}
                    >
                      {day}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <TouchableOpacity
                style={styles.timeContainer}
                onPress={() => setShowTimePicker(true)}
              >
                <View style={styles.labelContainer}>
                  <Feather name="clock" size={20} color="#4CAF50" />
                  <Text style={styles.label}>Watering Time</Text>
                </View>
                <Text style={styles.timeText}>
                  {formData.schedule.time.toLocaleTimeString([], {
                    hour: '2-digit',
                    minute: '2-digit',
                    hour12: true
                  }).replace('.', '').toUpperCase()}
                </Text>
              </TouchableOpacity>
            </>
          )}

          {!formData.useSchedule && (
            <Text style={styles.algorithmText}>
              Your plant will be watered using our smart algorithm based on humidity levels and plant needs.
            </Text>
          )}
        </View>

        {/* Save Button */}
        <TouchableOpacity
          style={[styles.saveButton, isSaving && styles.saveButtonDisabled]}
          onPress={handleSave}
          disabled={isSaving}
        >
          {isSaving ? (
            <>
              <Feather name="loader" size={20} color="#FFFFFF" style={{ opacity: 0.7 }} />
              <Text style={styles.saveButtonText}>Adding Plant...</Text>
            </>
          ) : (
            <>
              <Feather name="check" size={20} color="#FFFFFF" />
              <Text style={styles.saveButtonText}>Add Plant to Garden</Text>
            </>
          )}
        </TouchableOpacity>
      </ScrollView>

      {/* Image Picker Modal */}
      <Modal
        visible={showImagePicker}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowImagePicker(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Add Plant Photo</Text>
            <TouchableOpacity style={styles.modalButton} onPress={takePhoto}>
              <Feather name="camera" size={24} color="#16A34A" />
              <Text style={styles.modalButtonText}>Take Photo</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.modalButton} onPress={pickImage}>
              <Feather name="image" size={24} color="#16A34A" />
              <Text style={styles.modalButtonText}>Choose from Gallery</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.modalButton, styles.cancelButton]}
              onPress={() => setShowImagePicker(false)}
            >
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Time Picker Component */}
      {showTimePicker && (
        <DateTimePicker
          value={formData.schedule.time}
          mode="time"
          is24Hour={true}
          display="default"
          onChange={handleTimeChange}
        />
      )}
    </SafeAreaView>
  );
}