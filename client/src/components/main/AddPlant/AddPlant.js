import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    SafeAreaView,
    StatusBar,
    TouchableOpacity,
    TextInput,
    ScrollView,
    Alert,
    Image,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { styles } from './styles';
import websocketService from '../../../services/websocketService';

const AddPlant = () => {
    const navigation = useNavigation();
    const [formData, setFormData] = useState({
        plantName: '',
        plantType: '',
        desiredMoisture: '',
        waterLimit: '',
        location: '',
        irrigationFrequency: 'manual',
    });
    const [isLoading, setIsLoading] = useState(false);
    const [isConnected, setIsConnected] = useState(websocketService.isConnected());

    const plantTypes = [
        { id: 'rose', name: 'Rose', image: require('../../../data/plants/rose_plant.png') },
        { id: 'basil', name: 'Basil', image: require('../../../data/plants/basil_plant.png') },
        { id: 'monstera', name: 'Monstera', image: require('../../../data/plants/monstera_plant.png') },
        { id: 'petunia', name: 'Petunia', image: require('../../../data/plants/Petunia_plant.png') },
        { id: 'marigold', name: 'Marigold', image: require('../../../data/plants/marigold_plant.png') },
        { id: 'cyclamen', name: 'Cyclamen', image: require('../../../data/plants/cyclamen_plant.png') },
        { id: 'sansevieria', name: 'Sansevieria', image: require('../../../data/plants/sansevieria_plant.png') },
    ];

    const irrigationFrequencies = [
        { id: 'daily', name: 'Daily', description: 'Water every day at 8:00 AM' },
        { id: 'every_other_day', name: 'Every Other Day', description: 'Water every 2 days at 8:00 AM' },
        { id: 'weekly', name: 'Weekly', description: 'Water once a week at 8:00 AM' },
        { id: 'manual', name: 'Manual Only', description: 'Water manually when needed (recommended)' },
    ];

    useEffect(() => {
        // Set up WebSocket message handlers
        websocketService.onMessage('ADD_PLANT_SUCCESS', handleAddPlantSuccess);
        websocketService.onMessage('ADD_PLANT_FAIL', handleAddPlantError);

        // Listen for connection changes
        websocketService.onConnectionChange((connected) => {
            setIsConnected(connected);
        });

        // Cleanup handlers on unmount
        return () => {
            // Note: In a real app, you'd want to remove specific handlers
            // For now, we'll rely on the service to handle cleanup
        };
    }, []);

    const handleAddPlantSuccess = (data) => {
        setIsLoading(false);
        Alert.alert(
            'Success',
            'Plant added successfully!',
            [
                {
                    text: 'OK',
                    onPress: () => navigation.goBack()
                }
            ]
        );
    };

    const handleAddPlantError = (data) => {
        setIsLoading(false);
        Alert.alert('Error', data.message || 'Failed to add plant. Please try again.');
    };

    const handleInputChange = (field, value) => {
        setFormData(prev => ({
            ...prev,
            [field]: value
        }));
    };

    const validateForm = () => {
        if (!formData.plantName.trim()) {
            Alert.alert('Error', 'Please enter a plant name');
            return false;
        }

        // Plant type is optional - no validation needed

        // Check if desiredMoisture is a valid number
        const moisture = parseFloat(formData.desiredMoisture);
        if (isNaN(moisture) || moisture < 0 || moisture > 100) {
            Alert.alert('Error', 'Please enter a valid desired moisture level (0-100)');
            return false;
        }

        // Check if waterLimit is a valid number
        const waterLimit = parseFloat(formData.waterLimit);
        if (isNaN(waterLimit) || waterLimit <= 0 || waterLimit > 999.99) {
            Alert.alert('Error', 'Please enter a valid water limit (0.01-999.99 liters)');
            return false;
        }

        return true;
    };

    const handleSubmit = async () => {
        if (!validateForm()) return;

        if (!websocketService.isConnected()) {
            Alert.alert('Error', 'Not connected to server. Please check your connection and try again.');
            return;
        }

        setIsLoading(true);
        try {
            // Create irrigation schedule based on selected frequency (optional)
            let irrigationSchedule = null;


            if (formData.irrigationFrequency !== 'manual') {
                irrigationSchedule = {
                    enabled: true,
                    frequency: formData.irrigationFrequency,
                    time: '08:00', // default morning time
                    days: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday']
                };
            }

            const message = {
                type: 'ADD_PLANT',
                plantName: formData.plantName.trim(),
                plantType: formData.plantType,
                desiredMoisture: parseFloat(formData.desiredMoisture),
                waterLimit: parseFloat(formData.waterLimit),
                irrigationSchedule: irrigationSchedule,
            };

            websocketService.sendMessage(message);

            // Note: We'll handle the response in the WebSocket message handlers
            // No need to show success alert here anymore
        } catch (error) {
            console.error('Error adding plant:', error);
            setIsLoading(false);
            Alert.alert('Error', 'Failed to add plant. Please try again.');
        }
    };

    return (
        <SafeAreaView style={styles.container}>
            <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />

            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
                    <Feather name="chevron-left" size={24} color="#2C3E50" />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Add New Plant</Text>
                <View style={styles.headerSpacer} />
            </View>

            {/* Connection Status */}
            {!isConnected && (
                <View style={styles.connectionWarning}>
                    <Feather name="wifi-off" size={16} color="#E74C3C" />
                    <Text style={styles.connectionWarningText}>
                        Offline mode - connect to add plants
                    </Text>
                </View>
            )}

            <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
                {/* Offline Message */}
                {!isConnected && (
                    <View style={styles.offlineMessage}>
                        <Feather name="info" size={20} color="#3498DB" />
                        <Text style={styles.offlineMessageText}>
                            You need to be connected to the server to add plants. Please check your connection and try again.
                        </Text>
                    </View>
                )}

                {/* Plant Type Selection */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Choose Plant Type (Optional)</Text>
                    <Text style={styles.sectionSubtitle}>
                        Select a plant type to get better care recommendations
                    </Text>
                    <View style={styles.plantTypeGrid}>
                        {plantTypes.map((type) => (
                            <TouchableOpacity
                                key={type.id}
                                style={[
                                    styles.plantTypeCard,
                                    formData.plantType === type.id && styles.selectedPlantType
                                ]}
                                onPress={() => handleInputChange('plantType', type.id)}
                                disabled={!isConnected}
                            >
                                <Image source={type.image} style={styles.plantTypeImage} />
                                <Text style={[
                                    styles.plantTypeText,
                                    formData.plantType === type.id && styles.selectedPlantTypeText
                                ]}>
                                    {type.name}
                                </Text>
                            </TouchableOpacity>
                        ))}
                        <TouchableOpacity
                            style={[
                                styles.plantTypeCard,
                                !formData.plantType && styles.selectedPlantType
                            ]}
                            onPress={() => handleInputChange('plantType', '')}
                            disabled={!isConnected}
                        >
                            <View style={styles.skipContainer}>
                                <Feather name="x-circle" size={40} color="#95A5A6" />
                            </View>
                            <Text style={[
                                styles.plantTypeText,
                                !formData.plantType && styles.selectedPlantTypeText
                            ]}>
                                Skip
                            </Text>
                        </TouchableOpacity>
                    </View>
                </View>

                {/* Plant Details Form */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Plant Details</Text>

                    <View style={styles.inputGroup}>
                        <Text style={styles.inputLabel}>Plant Name</Text>
                        <TextInput
                            style={[styles.textInput, !isConnected && styles.textInputDisabled]}
                            value={formData.plantName}
                            onChangeText={(value) => handleInputChange('plantName', value)}
                            placeholder="Enter plant name"
                            placeholderTextColor="#95A5A6"
                            editable={isConnected}
                        />
                    </View>

                    <View style={styles.inputGroup}>
                        <Text style={styles.inputLabel}>Location (Optional)</Text>
                        <TextInput
                            style={[styles.textInput, !isConnected && styles.textInputDisabled]}
                            value={formData.location}
                            onChangeText={(value) => handleInputChange('location', value)}
                            placeholder="e.g., Backyard, Balcony, Living Room"
                            placeholderTextColor="#95A5A6"
                            editable={isConnected}
                        />
                    </View>

                    <View style={styles.inputGroup}>
                        <Text style={styles.inputLabel}>Desired Moisture Level (%)</Text>
                        <TextInput
                            style={[styles.textInput, !isConnected && styles.textInputDisabled]}
                            value={formData.desiredMoisture}
                            onChangeText={(value) => handleInputChange('desiredMoisture', value)}
                            placeholder="0-100"
                            placeholderTextColor="#95A5A6"
                            keyboardType="numeric"
                            editable={isConnected}
                        />
                        <Text style={styles.inputHint}>
                            Recommended: 60-80% for most plants (0-100 range)
                        </Text>
                    </View>

                    <View style={styles.inputGroup}>
                        <Text style={styles.inputLabel}>Water Limit (Liters)</Text>
                        <TextInput
                            style={[styles.textInput, !isConnected && styles.textInputDisabled]}
                            value={formData.waterLimit}
                            onChangeText={(value) => handleInputChange('waterLimit', value)}
                            placeholder="Maximum water per irrigation"
                            placeholderTextColor="#95A5A6"
                            keyboardType="numeric"
                            editable={isConnected}
                        />
                        <Text style={styles.inputHint}>
                            Recommended: 0.5-2 liters depending on plant size (0.01-999.99 range)
                        </Text>
                    </View>

                    <View style={styles.inputGroup}>
                        <Text style={styles.inputLabel}>Irrigation Frequency (Optional)</Text>
                        <Text style={styles.inputHint}>
                            Choose automatic irrigation schedule or manual watering
                        </Text>
                        <View style={styles.frequencyGrid}>
                            {irrigationFrequencies.map((frequency) => (
                                <TouchableOpacity
                                    key={frequency.id}
                                    style={[
                                        styles.frequencyCard,
                                        formData.irrigationFrequency === frequency.id && styles.selectedFrequency
                                    ]}
                                    onPress={() => handleInputChange('irrigationFrequency', frequency.id)}
                                    disabled={!isConnected}
                                >
                                    <Text style={[
                                        styles.frequencyName,
                                        formData.irrigationFrequency === frequency.id && styles.selectedFrequencyText
                                    ]}>
                                        {frequency.name}
                                    </Text>
                                    <Text style={[
                                        styles.frequencyDescription,
                                        formData.irrigationFrequency === frequency.id && styles.selectedFrequencyText
                                    ]}>
                                        {frequency.description}
                                    </Text>
                                </TouchableOpacity>
                            ))}
                        </View>
                    </View>
                </View>

                {/* Submit Button */}
                <View style={styles.submitContainer}>
                    <TouchableOpacity
                        style={[
                            styles.submitButton,
                            (isLoading || !isConnected) && styles.submitButtonDisabled
                        ]}
                        onPress={handleSubmit}
                        disabled={isLoading || !isConnected}
                    >
                        {isLoading ? (
                            <Text style={styles.submitButtonText}>Adding Plant...</Text>
                        ) : !isConnected ? (
                            <Text style={styles.submitButtonText}>Connect to Add Plant</Text>
                        ) : (
                            <>
                                <Feather name="plus" size={20} color="#FFFFFF" />
                                <Text style={styles.submitButtonText}>Add Plant</Text>
                            </>
                        )}
                    </TouchableOpacity>
                </View>
            </ScrollView>
        </SafeAreaView>
    );
};

export default AddPlant; 