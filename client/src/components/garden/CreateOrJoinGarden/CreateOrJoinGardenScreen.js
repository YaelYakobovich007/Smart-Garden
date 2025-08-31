/**
 * Create or Join Garden Screen
 * 
 * This screen allows users to:
 * - Create a new garden (becomes admin)
 * - Join an existing garden using invite code
 * 
 * The screen handles both creation and joining flows
 * with proper validation and error handling.
 */

import React, { useState } from 'react';
import {
    View,
    Text,
    TouchableOpacity,
    TextInput,
    Alert,
    ScrollView,
    ActivityIndicator,
    Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { Feather } from '@expo/vector-icons';

// Import services
import websocketService from '../../../services/websocketService';
import locationService from '../../../services/locationService';
import { Picker } from '@react-native-picker/picker';



// Import styles
import styles from './styles';

const CreateOrJoinGardenScreen = () => {
    const navigation = useNavigation();

    // State management
    const [activeTab, setActiveTab] = useState('join'); // 'create' or 'join'
    const [loading, setLoading] = useState(false);
    const [loadingMessage, setLoadingMessage] = useState('');

    // Create garden form
    const [gardenName, setGardenName] = useState('');
    const [selectedCountry, setSelectedCountry] = useState('');
    const [selectedCity, setSelectedCity] = useState('');
    const [countries, setCountries] = useState([]);
    const [cities, setCities] = useState([]);
    const [showCountryPicker, setShowCountryPicker] = useState(false);
    const [showCityPicker, setShowCityPicker] = useState(false);

    // Join garden form
    const [inviteCode, setInviteCode] = useState('');

    /**
     * Handle garden creation
     * Sends create garden request to server
     */
    const handleCreateGarden = async () => {
        if (!gardenName.trim()) {
            Alert.alert('Error', 'Please enter a garden name');
            return;
        }

        if (!selectedCountry) {
            Alert.alert('Error', 'Please select a country');
            return;
        }

        if (!selectedCity) {
            Alert.alert('Error', 'Please select a city');
            return;
        }

        if (!websocketService.isConnected()) {
            Alert.alert('Error', 'Not connected to server. Please check your connection and try again.');
            return;
        }

        setLoading(true);
        setLoadingMessage('Creating garden...');

        try {
            websocketService.sendMessage({
                type: 'CREATE_GARDEN',
                gardenName: gardenName.trim(),
                country: selectedCountry,
                city: selectedCity
            });
        } catch (error) {
            console.error('Error creating garden:', error);
            setLoading(false);
            Alert.alert('Error', 'Failed to create garden. Please try again.');
        }
    };

    /**
     * Handle garden joining
     * Sends join garden request to server
     */
    const handleJoinGarden = async () => {
        if (!inviteCode.trim()) {
            Alert.alert('Error', 'Please enter an invite code');
            return;
        }

        if (!websocketService.isConnected()) {
            Alert.alert('Error', 'Not connected to server. Please check your connection and try again.');
            return;
        }

        setLoading(true);
        setLoadingMessage('Joining garden...');

        try {
            websocketService.sendMessage({
                type: 'JOIN_GARDEN',
                inviteCode: inviteCode.trim()
            });
        } catch (error) {
            console.error('Error joining garden:', error);
            setLoading(false);
            Alert.alert('Error', 'Failed to join garden. Please try again.');
        }
    };

    /**
     * Handle WebSocket responses
     */
    React.useEffect(() => {
        const handleGardenCreated = (data) => {
            setLoading(false);
            console.log('Garden created successfully:', data);
            const createdGardenName = data.garden?.name || gardenName;
            Alert.alert(
                'Success!',
                `Garden "${createdGardenName}" created successfully! You are now the admin.`,
                [
                    {
                        text: 'OK',
                        onPress: () => navigation.goBack()
                    }
                ]
            );
        };

        const handleGardenJoined = (data) => {
            setLoading(false);
            console.log('Garden joined successfully:', data);
            const gardenName = data.garden?.name || 'the garden';
            Alert.alert(
                'Success!',
                `You have successfully joined ${gardenName}!`,
                [
                    {
                        text: 'OK',
                        onPress: () => navigation.goBack()
                    }
                ]
            );
        };

        const handleGardenError = (data) => {
            setLoading(false);
            console.error('Garden operation failed:', data);

            const errorMessage = data.reason || 'An error occurred. Please try again.';
            Alert.alert('Error', errorMessage);
        };

        // Register message handlers
        websocketService.onMessage('CREATE_GARDEN_SUCCESS', handleGardenCreated);
        websocketService.onMessage('JOIN_GARDEN_SUCCESS', handleGardenJoined);
        websocketService.onMessage('CREATE_GARDEN_FAIL', handleGardenError);
        websocketService.onMessage('JOIN_GARDEN_FAIL', handleGardenError);

        // Cleanup
        return () => {
            websocketService.offMessage('CREATE_GARDEN_SUCCESS', handleGardenCreated);
            websocketService.offMessage('JOIN_GARDEN_SUCCESS', handleGardenJoined);
            websocketService.offMessage('CREATE_GARDEN_FAIL', handleGardenError);
            websocketService.offMessage('JOIN_GARDEN_FAIL', handleGardenError);
        };
    }, [navigation, gardenName]);

    // Load countries on mount
    React.useEffect(() => {
        try {
            const list = locationService.getCountries();
            setCountries(list || []);
        } catch (e) {
            setCountries([]);
        }
    }, []);

    // Load cities when country changes
    React.useEffect(() => {
        if (!selectedCountry) {
            setCities([]);
            setSelectedCity('');
            return;
        }
        try {
            const list = locationService.getCitiesForCountry(selectedCountry) || [];
            setCities(list);
            // reset city if it no longer exists
            if (list.length && !list.includes(selectedCity)) setSelectedCity('');
        } catch (e) {
            setCities([]);
            setSelectedCity('');
        }
    }, [selectedCountry]);

    return (
        <SafeAreaView style={styles.container}>
            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
                    <Feather name="arrow-left" size={24} color="#2C3E50" />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Garden Setup</Text>
                <View style={styles.headerSpacer} />
            </View>

            <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
                {/* Tab Selector */}
                <View style={styles.tabContainer}>
                    <TouchableOpacity
                        style={[styles.tab, activeTab === 'join' && styles.activeTab]}
                        onPress={() => setActiveTab('join')}
                    >
                        <Feather name="users" size={20} color={activeTab === 'join' ? '#4CAF50' : '#7F8C8D'} />
                        <Text style={[styles.tabText, activeTab === 'join' && styles.activeTabText]}>
                            Join Garden
                        </Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                        style={[styles.tab, activeTab === 'create' && styles.activeTab]}
                        onPress={() => setActiveTab('create')}
                    >
                        <Feather name="plus-circle" size={20} color={activeTab === 'create' ? '#4CAF50' : '#7F8C8D'} />
                        <Text style={[styles.tabText, activeTab === 'create' && styles.activeTabText]}>
                            Create Garden
                        </Text>
                    </TouchableOpacity>
                </View>

                {/* Join Garden Form */}
                {activeTab === 'join' && (
                    <View style={styles.formContainer}>
                        <View style={styles.formHeader}>
                            <Feather name="users" size={32} color="#4CAF50" />
                            <Text style={styles.formTitle}>Join an Existing Garden</Text>
                            <Text style={styles.formSubtitle}>
                                Enter the invite code provided by the garden admin to join their garden.
                            </Text>
                        </View>

                        <View style={styles.inputContainer}>
                            <Text style={styles.inputLabel}>Invite Code</Text>
                            <TextInput
                                style={styles.textInput}
                                value={inviteCode}
                                onChangeText={setInviteCode}
                                placeholder="Enter invite code (e.g., ABC123)"
                                placeholderTextColor="#95A5A6"
                                autoCapitalize="characters"
                                autoCorrect={false}
                                maxLength={20}
                            />
                        </View>

                        <TouchableOpacity
                            style={[styles.submitButton, !inviteCode.trim() && styles.submitButtonDisabled]}
                            onPress={handleJoinGarden}
                            disabled={!inviteCode.trim() || loading}
                        >
                            <Text style={styles.submitButtonText}>Join Garden</Text>
                        </TouchableOpacity>
                    </View>
                )}

                {/* Create Garden Form */}
                {activeTab === 'create' && (
                    <View style={styles.formContainer}>
                        <View style={styles.formHeader}>
                            <Feather name="plus-circle" size={32} color="#4CAF50" />
                            <Text style={styles.formTitle}>Create a New Garden</Text>
                            <Text style={styles.formSubtitle}>
                                Create your own garden and become the admin. You can invite others using the generated invite code.
                            </Text>
                        </View>

                        <View style={styles.inputContainer}>
                            <Text style={styles.inputLabel}>Garden Name</Text>
                            <TextInput
                                style={styles.textInput}
                                value={gardenName}
                                onChangeText={setGardenName}
                                placeholder="Enter garden name"
                                placeholderTextColor="#95A5A6"
                                autoCapitalize="words"
                                maxLength={50}
                            />
                        </View>

                        {/* Country selector */}
                        <View style={styles.inputContainer}>
                            <Text style={styles.inputLabel}>Country</Text>
                            <TouchableOpacity
                                style={styles.textInput}
                                onPress={() => setShowCountryPicker(true)}
                                activeOpacity={0.8}
                            >
                                <Text style={{ color: selectedCountry ? '#2C3E50' : '#95A5A6' }}>
                                    {selectedCountry || 'Select Country'}
                                </Text>
                            </TouchableOpacity>
                        </View>

                        {/* City selector */}
                        <View style={styles.inputContainer}>
                            <Text style={styles.inputLabel}>City</Text>
                            <TouchableOpacity
                                style={styles.textInput}
                                onPress={() => setShowCityPicker(true)}
                                disabled={!selectedCountry}
                                activeOpacity={0.8}
                            >
                                <Text style={{ color: selectedCity ? '#2C3E50' : '#95A5A6' }}>
                                    {selectedCity || (selectedCountry ? 'Select City' : 'Select a country first')}
                                </Text>
                            </TouchableOpacity>
                        </View>

                        <TouchableOpacity
                            style={[
                                styles.submitButton,
                                (!gardenName.trim() || !selectedCountry || !selectedCity) && styles.submitButtonDisabled
                            ]}
                            onPress={handleCreateGarden}
                            disabled={!gardenName.trim() || !selectedCountry || !selectedCity || loading}
                        >
                            <Text style={styles.submitButtonText}>Create Garden</Text>
                        </TouchableOpacity>
                    </View>
                )}
            </ScrollView>

            {/* Loading Overlay */}
            {loading && (
                <View style={styles.loadingOverlay}>
                    <View style={styles.loadingCard}>
                        <ActivityIndicator size="large" color="#4CAF50" />
                        <Text style={styles.loadingText}>{loadingMessage}</Text>
                    </View>
                </View>
            )}

            {/* Country Picker Modal */}
            <Modal visible={showCountryPicker} transparent animationType="slide">
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <View style={styles.modalHeader}>
                            <Text style={styles.modalTitle}>Select Country</Text>
                            <TouchableOpacity onPress={() => setShowCountryPicker(false)}>
                                <Feather name="x" size={24} color="#333" />
                            </TouchableOpacity>
                        </View>
                        <Picker
                            selectedValue={selectedCountry}
                            onValueChange={(val) => { setSelectedCountry(val); setShowCountryPicker(false); }}
                            style={styles.modalPicker}
                        >
                            <Picker.Item label="Select Country" value="" />
                            {(countries || []).map((c) => (
                                <Picker.Item key={c.code} label={c.name} value={c.name} />
                            ))}
                        </Picker>
                    </View>
                </View>
            </Modal>

            {/* City Picker Modal */}
            <Modal visible={showCityPicker} transparent animationType="slide">
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <View style={styles.modalHeader}>
                            <Text style={styles.modalTitle}>Select City</Text>
                            <TouchableOpacity onPress={() => setShowCityPicker(false)}>
                                <Feather name="x" size={24} color="#333" />
                            </TouchableOpacity>
                        </View>
                        <Picker
                            selectedValue={selectedCity}
                            onValueChange={(val) => { setSelectedCity(val); setShowCityPicker(false); }}
                            style={styles.modalPicker}
                        >
                            <Picker.Item label={selectedCountry ? 'Select City' : 'Select a country first'} value="" />
                            {(cities || []).map((city) => (
                                <Picker.Item key={city} label={city} value={city} />
                            ))}
                        </Picker>
                    </View>
                </View>
            </Modal>
        </SafeAreaView>
    );
};

export default CreateOrJoinGardenScreen;
