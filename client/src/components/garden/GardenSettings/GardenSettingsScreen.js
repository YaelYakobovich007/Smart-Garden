/**
 * Garden Settings Screen
 * 
 * This screen allows garden admins to:
 * - Edit garden name
 * - Change maximum members
 * - Manage garden settings
 * - Delete garden (admin only)
 * 
 * Regular members can view settings but not modify them
 */

import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    TouchableOpacity,
    TextInput,
    Alert,
    ScrollView,
    ActivityIndicator,
    Switch,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute } from '@react-navigation/native';
import { Feather } from '@expo/vector-icons';

// Import services
import websocketService from '../../../services/websocketService';

// Import styles
import styles from './styles';

const GardenSettingsScreen = () => {
    const navigation = useNavigation();
    const route = useRoute();

    // Get garden data from route params
    const { garden } = route.params || {};

    // State management
    const [gardenData, setGardenData] = useState(garden);
    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);
    const [userRole, setUserRole] = useState('member'); // 'admin' or 'member'

    // Form state
    const [gardenName, setGardenName] = useState(garden?.name || '');
    const [maxMembers, setMaxMembers] = useState(garden?.max_members?.toString() || '5');
    const [isActive, setIsActive] = useState(garden?.is_active !== false);
    const [autoIrrigation, setAutoIrrigation] = useState(true);
    const [notifications, setNotifications] = useState(true);

    /**
     * Determine user role and load garden details
     */
    useEffect(() => {
        if (gardenData) {
            loadGardenDetails();
        }
    }, [gardenData]);

    /**
     * Load detailed garden information
     */
    const loadGardenDetails = () => {
        if (!websocketService.isConnected()) return;

        websocketService.sendMessage({
            type: 'GET_GARDEN_DETAILS',
            gardenId: gardenData.id
        });
    };

    /**
     * Handle WebSocket responses
     */
    useEffect(() => {
        const handleGardenDetails = (data) => {
            console.log('Garden details received:', data);
            if (data.garden) {
                setGardenData(data.garden);
                setGardenName(data.garden.name || '');
                setMaxMembers(data.garden.max_members?.toString() || '5');
                setIsActive(data.garden.is_active !== false);

                // Determine user role
                if (data.garden.admin_user_id === data.current_user_id) {
                    setUserRole('admin');
                } else {
                    setUserRole('member');
                }
            }
        };

        const handleGardenUpdated = (data) => {
            setSaving(false);
            console.log('Garden updated successfully:', data);
            Alert.alert(
                'Success!',
                'Garden settings updated successfully.',
                [{ text: 'OK' }]
            );
        };

        const handleGardenError = (data) => {
            setSaving(false);
            console.error('Garden operation failed:', data);

            let errorMessage = 'An error occurred. Please try again.';

            if (data.reason) {
                switch (data.reason) {
                    case 'Garden not found':
                        errorMessage = 'Garden not found. It may have been deleted.';
                        break;
                    case 'Garden ID is required':
                        errorMessage = 'Invalid garden information.';
                        break;
                    case 'User not found':
                        errorMessage = 'User session expired. Please log in again.';
                        break;
                    case 'You are not a member of this garden':
                        errorMessage = 'You are no longer a member of this garden.';
                        break;
                    case 'NO_UPDATES':
                        errorMessage = 'No changes were made to update.';
                        break;
                    case 'Internal server error while fetching garden details':
                    case 'Internal server error while updating garden':
                        errorMessage = 'Server error occurred. Please try again later.';
                        break;
                    default:
                        errorMessage = data.reason || errorMessage;
                }
            }

            Alert.alert('Error', errorMessage);
        };

        // Register message handlers
        websocketService.onMessage('GET_GARDEN_DETAILS_RESPONSE', handleGardenDetails);
        websocketService.onMessage('UPDATE_GARDEN_SUCCESS', handleGardenUpdated);
        websocketService.onMessage('GET_GARDEN_DETAILS_FAIL', handleGardenError);
        websocketService.onMessage('UPDATE_GARDEN_FAIL', handleGardenError);

        // Cleanup
        return () => {
            websocketService.offMessage('GET_GARDEN_DETAILS_RESPONSE', handleGardenDetails);
            websocketService.offMessage('UPDATE_GARDEN_SUCCESS', handleGardenUpdated);
            websocketService.offMessage('GET_GARDEN_DETAILS_FAIL', handleGardenError);
            websocketService.offMessage('UPDATE_GARDEN_FAIL', handleGardenError);
        };
    }, []);

    /**
     * Save garden settings
     */
    const handleSaveSettings = () => {
        if (!gardenName.trim()) {
            Alert.alert('Error', 'Please enter a garden name');
            return;
        }

        if (!websocketService.isConnected()) {
            Alert.alert('Error', 'Not connected to server. Please check your connection and try again.');
            return;
        }

        setSaving(true);

        try {
            websocketService.sendMessage({
                type: 'UPDATE_GARDEN',
                gardenId: gardenData.id,
                name: gardenName.trim(),
                max_members: parseInt(maxMembers) || 5,
                is_active: isActive
            });
        } catch (error) {
            console.error('Error updating garden:', error);
            setSaving(false);
            Alert.alert('Error', 'Failed to update garden settings. Please try again.');
        }
    };

    /**
     * Delete garden confirmation
     */
    const handleDeleteGarden = () => {
        Alert.alert(
            'Delete Garden',
            'Are you sure you want to delete this garden? This action cannot be undone and all plants and data will be permanently lost.',
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Delete',
                    style: 'destructive',
                    onPress: () => {
                        // TODO: Implement delete garden functionality
                        Alert.alert('Not Implemented', 'Delete garden functionality will be implemented soon.');
                    }
                }
            ]
        );
    };

    /**
     * Reset settings to original values
     */
    const handleResetSettings = () => {
        Alert.alert(
            'Reset Settings',
            'Are you sure you want to reset all settings to their original values?',
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Reset',
                    onPress: () => {
                        setGardenName(gardenData?.name || '');
                        setMaxMembers(gardenData?.max_members?.toString() || '5');
                        setIsActive(gardenData?.is_active !== false);
                        setAutoIrrigation(true);
                        setNotifications(true);
                    }
                }
            ]
        );
    };

    if (!gardenData) {
        return (
            <SafeAreaView style={styles.container}>
                <View style={styles.loadingContainer}>
                    <ActivityIndicator size="large" color="#4CAF50" />
                    <Text style={styles.loadingText}>Loading garden settings...</Text>
                </View>
            </SafeAreaView>
        );
    }

    const isAdmin = userRole === 'admin';
    const hasChanges =
        gardenName !== gardenData.name ||
        maxMembers !== gardenData.max_members?.toString() ||
        isActive !== (gardenData.is_active !== false);

    return (
        <SafeAreaView style={styles.container}>
            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
                    <Feather name="arrow-left" size={24} color="#2C3E50" />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Garden Settings</Text>
                <View style={styles.headerSpacer} />
            </View>

            <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
                {/* Role Indicator */}
                <View style={styles.roleIndicator}>
                    <Feather name={isAdmin ? "shield" : "user"} size={16} color={isAdmin ? "#4CAF50" : "#7F8C8D"} />
                    <Text style={[styles.roleText, isAdmin && styles.roleTextAdmin]}>
                        {isAdmin ? 'Garden Admin' : 'Garden Member'}
                    </Text>
                </View>

                {/* Basic Settings */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Basic Settings</Text>

                    <View style={styles.settingItem}>
                        <Text style={styles.settingLabel}>Garden Name</Text>
                        <TextInput
                            style={[styles.textInput, !isAdmin && styles.textInputDisabled]}
                            value={gardenName}
                            onChangeText={setGardenName}
                            placeholder="Enter garden name"
                            placeholderTextColor="#95A5A6"
                            editable={isAdmin}
                            maxLength={50}
                        />
                    </View>

                    <View style={styles.settingItem}>
                        <Text style={styles.settingLabel}>Maximum Members</Text>
                        <TextInput
                            style={[styles.textInput, !isAdmin && styles.textInputDisabled]}
                            value={maxMembers}
                            onChangeText={setMaxMembers}
                            placeholder="5"
                            placeholderTextColor="#95A5A6"
                            keyboardType="numeric"
                            editable={isAdmin}
                            maxLength={2}
                        />
                        <Text style={styles.settingHint}>Maximum number of members (including you)</Text>
                    </View>

                    <View style={styles.settingItem}>
                        <Text style={styles.settingLabel}>Garden Active</Text>
                        <Switch
                            value={isActive}
                            onValueChange={setIsActive}
                            disabled={!isAdmin}
                            trackColor={{ false: '#BDC3C7', true: '#4CAF50' }}
                            thumbColor={isActive ? '#FFFFFF' : '#FFFFFF'}
                        />
                        <Text style={styles.settingHint}>When disabled, garden operations are paused</Text>
                    </View>
                </View>

                {/* Garden Features */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Garden Features</Text>

                    <View style={styles.settingItem}>
                        <Text style={styles.settingLabel}>Auto Irrigation</Text>
                        <Switch
                            value={autoIrrigation}
                            onValueChange={setAutoIrrigation}
                            trackColor={{ false: '#BDC3C7', true: '#4CAF50' }}
                            thumbColor={autoIrrigation ? '#FFFFFF' : '#FFFFFF'}
                        />
                        <Text style={styles.settingHint}>Automatically water plants based on schedule</Text>
                    </View>

                    <View style={styles.settingItem}>
                        <Text style={styles.settingLabel}>Notifications</Text>
                        <Switch
                            value={notifications}
                            onValueChange={setNotifications}
                            trackColor={{ false: '#BDC3C7', true: '#4CAF50' }}
                            thumbColor={notifications ? '#FFFFFF' : '#FFFFFF'}
                        />
                        <Text style={styles.settingHint}>Receive notifications about garden activities</Text>
                    </View>
                </View>

                {/* Garden Info */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Garden Information</Text>

                    <View style={styles.infoItem}>
                        <Text style={styles.infoLabel}>Garden ID</Text>
                        <Text style={styles.infoValue}>{gardenData.id}</Text>
                    </View>

                    <View style={styles.infoItem}>
                        <Text style={styles.infoLabel}>Invite Code</Text>
                        <Text style={styles.infoValue}>{gardenData.invite_code}</Text>
                    </View>

                    <View style={styles.infoItem}>
                        <Text style={styles.infoLabel}>Created</Text>
                        <Text style={styles.infoValue}>
                            {new Date(gardenData.created_at).toLocaleDateString()}
                        </Text>
                    </View>

                    <View style={styles.infoItem}>
                        <Text style={styles.infoLabel}>Last Updated</Text>
                        <Text style={styles.infoValue}>
                            {new Date(gardenData.updated_at).toLocaleDateString()}
                        </Text>
                    </View>
                </View>

                {/* Action Buttons */}
                {isAdmin && (
                    <View style={styles.section}>
                        <Text style={styles.sectionTitle}>Actions</Text>

                        <TouchableOpacity
                            style={[styles.actionButton, styles.saveButton, !hasChanges && styles.actionButtonDisabled]}
                            onPress={handleSaveSettings}
                            disabled={!hasChanges || saving}
                        >
                            <Feather name="save" size={20} color="#FFFFFF" />
                            <Text style={styles.actionButtonText}>
                                {saving ? 'Saving...' : 'Save Changes'}
                            </Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                            style={[styles.actionButton, styles.resetButton]}
                            onPress={handleResetSettings}
                            disabled={!hasChanges}
                        >
                            <Feather name="refresh-cw" size={20} color="#7F8C8D" />
                            <Text style={[styles.actionButtonText, styles.resetButtonText]}>Reset to Default</Text>
                        </TouchableOpacity>
                    </View>
                )}

                {/* Danger Zone */}
                {isAdmin && (
                    <View style={styles.section}>
                        <Text style={styles.sectionTitle}>Danger Zone</Text>

                        <TouchableOpacity style={styles.dangerButton} onPress={handleDeleteGarden}>
                            <Feather name="trash-2" size={20} color="#E74C3C" />
                            <Text style={styles.dangerButtonText}>Delete Garden</Text>
                        </TouchableOpacity>
                    </View>
                )}
            </ScrollView>

            {/* Loading Overlay */}
            {loading && (
                <View style={styles.loadingOverlay}>
                    <View style={styles.loadingCard}>
                        <ActivityIndicator size="large" color="#4CAF50" />
                        <Text style={styles.loadingText}>Loading...</Text>
                    </View>
                </View>
            )}
        </SafeAreaView>
    );
};

export default GardenSettingsScreen;
