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
import { useNavigation } from '@react-navigation/native';
import { useCameraPermissions } from 'expo-camera';
import * as ImagePicker from 'expo-image-picker';
import DateTimePicker from '@react-native-community/datetimepicker';
import { Feather } from '@expo/vector-icons';
import styles from './styles';
import websocketService from '../../services/websocketService';

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export default function AddPlantScreen() {
  const navigation = useNavigation();
  const [formData, setFormData] = useState({
    plantName: '',
    plantType: '',
    humidity: 60,
    waterLimit: 1.0,
    image: null,
    useSchedule: false,
    schedule: {
      days: [false, false, false, false, false, false, false],
      time: new Date(),
    },
  });

  const [errors, setErrors] = useState({});
  const [showImagePicker, setShowImagePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [cameraPermission, requestCameraPermission] = useCameraPermissions();

  useEffect(() => {
    // Handler for success
    const handleSuccess = (data) => {
      setIsSaving(false);
      Alert.alert(
        'Success!',
        data?.message || 'Plant added successfully to your garden',
        [
          {
            text: 'OK',
            onPress: () => navigation.goBack(),
          },
        ]
      );
    };
    // Handler for failure
    const handleFail = (data) => {
      setIsSaving(false);
      Alert.alert(
        'Failed to Add Plant',
        data?.message || 'An error occurred while adding the plant',
        [
          { text: 'OK' }
        ]
      );
    };
    websocketService.onMessage('ADD_PLANT_SUCCESS', handleSuccess);
    websocketService.onMessage('ADD_PLANT_FAIL', handleFail);
    return () => {
      // Remove handlers on unmount
      websocketService.offMessage('ADD_PLANT_SUCCESS', handleSuccess);
      websocketService.offMessage('ADD_PLANT_FAIL', handleFail);
    };
  }, [navigation]);

  const validateForm = () => {
    const newErrors = {};

    if (!formData.plantName.trim()) {
      newErrors.plantName = 'Plant name is required';
    }

    if (formData.humidity < 0 || formData.humidity > 100) {
      newErrors.humidity = 'Humidity must be between 0-100%';
    }

    if (formData.waterLimit <= 0) {
      newErrors.waterLimit = 'Water limit must be greater than 0';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSave = async () => {
    if (validateForm()) {
      setIsSaving(true);
      try {
        // Prepare irrigationDays and irrigationTime if schedule is enabled
        let irrigationDays = null;
        let irrigationTime = null;
        if (formData.useSchedule) {
          irrigationDays = DAYS.filter((day, idx) => formData.schedule.days[idx]);
          // Format time as 'HH:mm'
          const t = formData.schedule.time;
          const pad = (n) => n.toString().padStart(2, '0');
          irrigationTime = `${pad(t.getHours())}:${pad(t.getMinutes())}`;
        }

        // Prepare image data if an image is selected
        let imageData = null;
        if (formData.image) {
          try {
            // Convert image to base64
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
            
            const base64 = await new Promise((resolve, reject) => {
              const reader = new FileReader();
              reader.onload = () => resolve(reader.result);
              reader.onerror = reject;
              reader.readAsDataURL(blob);
            });

            // Extract filename from URI
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

        const message = {
          type: 'ADD_PLANT',
          plantData: {
            plantName: formData.plantName,
            plantType: formData.plantType,
            desiredMoisture: formData.humidity,
            waterLimit: formData.waterLimit,
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

  const pickImage = async () => {
    // TODO: Optionally upload selected image to server
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });

    if (!result.canceled) {
      setFormData({ ...formData, image: result.assets[0].uri });
    }
    setShowImagePicker(false);
  };

  const takePhoto = async () => {
    if (!cameraPermission?.granted) {
      const permission = await requestCameraPermission();
      if (!permission.granted) {
        Alert.alert('Permission needed', 'Camera permission is required to take photos');
        return;
      }
    }

    // TODO: Optionally upload taken photo to server
    const result = await ImagePicker.launchCameraAsync({
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });

    if (!result.canceled) {
      setFormData({ ...formData, image: result.assets[0].uri });
    }
    setShowImagePicker(false);
  };

  const toggleDay = (index) => {
    const newDays = [...formData.schedule.days];
    newDays[index] = !newDays[index];
    setFormData({
      ...formData,
      schedule: { ...formData.schedule, days: newDays },
    });
  };

  const handleTimeChange = (event, selectedTime) => {
    setShowTimePicker(Platform.OS === 'ios');
    if (selectedTime) {
      setFormData({
        ...formData,
        schedule: { ...formData.schedule, time: selectedTime },
      });
    }
  };

  const updateFormData = (field, value) => {
    // TODO: Optionally sync or validate field with server
    setFormData({ ...formData, [field]: value });
  };

  const updateSchedule = (field, value) => {
    // TODO: Optionally sync or validate schedule with server
    setFormData({
      ...formData,
      schedule: { ...formData.schedule, [field]: value },
    });
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Feather name="chevron-left" size={24} color="#2C3E50" />
        </TouchableOpacity>
        <View style={styles.headerTitleContainer}>
          <Feather name="leaf" size={20} color="#4CAF50" />
          <Text style={styles.headerTitle}>Add New Plant</Text>
        </View>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {/* Plant Basic Info */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Plant Information</Text>
          
          <View style={styles.inputContainer}>
            <Text style={styles.label}>
              Plant Name <Text style={styles.required}>*</Text>
            </Text>
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
            <Text style={styles.label}>Plant Type</Text>
            <TextInput
              style={styles.input}
              value={formData.plantType}
              onChangeText={(text) => updateFormData('plantType', text)}
              placeholder="e.g., Succulent, Herb, Flower"
              placeholderTextColor="#9CA3AF"
            />
          </View>
        </View>

        {/* Plant Care Settings */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Care Settings</Text>
          
          <View style={styles.inputContainer}>
            <View style={styles.labelContainer}>
              <Feather name="thermometer" size={20} color="#4CAF50" />
              <Text style={styles.label}>
                Optimal Humidity <Text style={styles.required}>*</Text>
              </Text>
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
            <View style={styles.labelContainer}>
              <Feather name="droplet" size={20} color="#4CAF50" />
              <Text style={styles.label}>
                Water Limit <Text style={styles.required}>*</Text>
              </Text>
            </View>
            <View style={styles.sliderContainer}>
            <TextInput
                style={[styles.numberInput, errors.waterLimit && styles.inputError]}
                value={formData.waterLimit.toString()}
                onChangeText={(text) => {
                  const value = parseFloat(text) || 0;
                  updateFormData('waterLimit', Math.max(0, value));
                }}
              keyboardType="numeric"
                placeholder="0.0"
            />
              <Text style={styles.unit}>L</Text>
            </View>
            {errors.waterLimit && (
              <View style={styles.errorContainer}>
                <Feather name="alert-circle" size={16} color="#EF4444" />
                <Text style={styles.errorText}>{errors.waterLimit}</Text>
              </View>
            )}
          </View>
        </View>

        {/* Plant Image */}
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

        {/* Watering Schedule */}
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

      {/* Time Picker */}
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