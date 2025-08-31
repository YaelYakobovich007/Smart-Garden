/**
 * Garden Screen
 * 
 * This screen displays garden information and management options:
 * - Garden details (name, member count, invite code)
 * - Member list with roles
 * - Admin actions (manage members, settings)
 * - Quick actions (view plants, invite members)
 * 
 * Different views for admin vs regular members
 */

import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    TouchableOpacity,
    ScrollView,
    Alert,
    ActivityIndicator,
    Share,
    Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute } from '@react-navigation/native';
import { Feather } from '@expo/vector-icons';

// Import services
import websocketService from '../../../services/websocketService';
import locationService from '../../../services/locationService';
import { Picker } from '@react-native-picker/picker';

// Import styles
import styles from './styles';

const GardenScreen = () => {
    const navigation = useNavigation();
    const route = useRoute();

    // Get garden data from route params
    const { garden } = route.params || {};

    // State management
    const [gardenData, setGardenData] = useState(garden);
    const [members, setMembers] = useState([]);
    const [loading, setLoading] = useState(false);
    const [userRole, setUserRole] = useState('member'); // 'admin' or 'member'

    // Location update state (admin-only)
    const [showLocationModal, setShowLocationModal] = useState(false);
    const [selectedCountry, setSelectedCountry] = useState('');
    const [selectedCity, setSelectedCity] = useState('');
    const [countries, setCountries] = useState([]);
    const [cities, setCities] = useState([]);
    const [savingLocation, setSavingLocation] = useState(false);
    const [showCountryPicker, setShowCountryPicker] = useState(false);
    const [showCityPicker, setShowCityPicker] = useState(false);

    /**
     * Load garden details and members
     */
    useEffect(() => {
        if (gardenData && gardenData.id) {
            loadGardenDetails();
            loadGardenMembers();
        }
        if (garden?.role) {
            setUserRole(garden.role);
        }
    }, []); // Only run once when component mounts



    /**
     * Load garden details
     */
    const loadGardenDetails = () => {
        if (!websocketService.isConnected()) return;

        websocketService.sendMessage({
            type: 'GET_GARDEN_DETAILS',
            gardenId: gardenData.id
        });
    };

    /**
     * Load garden members list
     */
    const loadGardenMembers = () => {
        if (!websocketService.isConnected()) return;

        websocketService.sendMessage({
            type: 'GET_GARDEN_MEMBERS',
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
            } else {
                // If no garden data, user might not be a member anymore
                Alert.alert(
                    'Access Denied',
                    'You are no longer a member of this garden.',
                    [
                        {
                            text: 'OK',
                            onPress: () => {
                                navigation.goBack();
                            }
                        }
                    ]
                );
            }
        };

        const handleGardenMembers = (data) => {
            console.log('Garden members received:', data);
            setLoading(false);
            if (data.members) {
                setMembers(data.members);
            }
        };

        const handleGardenError = (data) => {
            console.error('Garden operation failed:', data);
            setLoading(false);

            let errorMessage = 'An error occurred. Please try again.';
            let shouldNavigateBack = false;

            if (data.reason) {
                switch (data.reason) {
                    case 'Garden not found':
                    case 'You are not a member of this garden':
                    case 'You are no longer a member of this garden':
                        errorMessage = 'You are no longer a member of this garden.';
                        shouldNavigateBack = true;
                        break;
                    case 'Garden ID is required':
                        errorMessage = 'Invalid garden information.';
                        shouldNavigateBack = true;
                        break;
                    case 'User not found':
                        errorMessage = 'User session expired. Please log in again.';
                        shouldNavigateBack = true;
                        break;
                    case 'Internal server error while fetching garden details':
                    case 'Internal server error while fetching garden members':
                        errorMessage = 'Server error occurred. Please try again later.';
                        break;
                    case 'NOT_MEMBER':
                        errorMessage = 'You are not a member of this garden.';
                        shouldNavigateBack = true;
                        break;
                    case 'ADMIN_CANNOT_LEAVE':
                        errorMessage = 'Admins cannot leave the garden. Please transfer ownership first.';
                        break;
                    default:
                        errorMessage = data.reason || errorMessage;
                }
            }

            if (shouldNavigateBack) {
                Alert.alert(
                    'Access Denied',
                    errorMessage,
                    [
                        {
                            text: 'OK',
                            onPress: () => {
                                navigation.goBack();
                            }
                        }
                    ]
                );
            } else {
                Alert.alert('Error', errorMessage);
            }
        };

        const handleLeaveGardenSuccess = (data) => {
            console.log('Successfully left garden:', data);
            setLoading(false);
            Alert.alert(
                'Success',
                'You have successfully left the garden.',
                [
                    {
                        text: 'OK',
                        onPress: () => {
                            // Navigate back to main screen
                            navigation.goBack();
                        }
                    }
                ]
            );
        };

        // Update handlers for garden location updates
        const handleUpdateGardenSuccess = (d) => {
            setSavingLocation(false);
            if (d?.garden) setGardenData(d.garden);
            setShowLocationModal(false);
        };

        const handleUpdateGardenFail = (d) => {
            setSavingLocation(false);
            Alert.alert('Update Failed', d?.reason || 'Failed to update garden location');
        };

        // Register message handlers
        websocketService.onMessage('GET_GARDEN_DETAILS_SUCCESS', handleGardenDetails);
        websocketService.onMessage('GET_GARDEN_DETAILS_FAIL', handleGardenError);
        websocketService.onMessage('GET_GARDEN_MEMBERS_SUCCESS', handleGardenMembers);
        websocketService.onMessage('GET_GARDEN_MEMBERS_FAIL', handleGardenError);
        websocketService.onMessage('LEAVE_GARDEN_SUCCESS', handleLeaveGardenSuccess);
        websocketService.onMessage('LEAVE_GARDEN_FAIL', handleGardenError);
        websocketService.onMessage('UPDATE_GARDEN_SUCCESS', handleUpdateGardenSuccess);
        websocketService.onMessage('UPDATE_GARDEN_FAIL', handleUpdateGardenFail);

        // Cleanup
        return () => {
            websocketService.offMessage('GET_GARDEN_DETAILS_SUCCESS', handleGardenDetails);
            websocketService.offMessage('GET_GARDEN_DETAILS_FAIL', handleGardenError);
            websocketService.offMessage('GET_GARDEN_MEMBERS_SUCCESS', handleGardenMembers);
            websocketService.offMessage('GET_GARDEN_MEMBERS_FAIL', handleGardenError);
            websocketService.offMessage('LEAVE_GARDEN_SUCCESS', handleLeaveGardenSuccess);
            websocketService.offMessage('LEAVE_GARDEN_FAIL', handleGardenError);
            websocketService.offMessage('UPDATE_GARDEN_SUCCESS', handleUpdateGardenSuccess);
            websocketService.offMessage('UPDATE_GARDEN_FAIL', handleUpdateGardenFail);
        };
    }, []);

    /**
     * Share invite code
     */
    const handleShareInviteCode = async () => {
        if (!gardenData?.invite_code) {
            Alert.alert('Error', 'Invite code not available');
            return;
        }

        try {
            await Share.share({
                message: `Join my Smart Garden! Use invite code: ${gardenData.invite_code}`,
                title: `Join ${gardenData.name}`,
            });
        } catch (error) {
            console.error('Error sharing invite code:', error);
            Alert.alert('Error', 'Failed to share invite code');
        }
    };

    /**
     * Copy invite code to clipboard
     */
    const handleCopyInviteCode = () => {
        if (!gardenData?.invite_code) {
            Alert.alert('Error', 'Invite code not available');
            return;
        }

        // Note: In a real app, you'd use Clipboard API
        Alert.alert(
            'Invite Code Copied!',
            `Invite code: ${gardenData.invite_code}`,
            [{ text: 'OK' }]
        );
    };

    // Open location modal (admin only)
    const openLocationModal = () => {
        try {
            const list = locationService.getCountries();
            setCountries(list || []);
        } catch {
            setCountries([]);
        }
        // Prefill with current garden location
        setSelectedCountry(gardenData?.country || '');
        setSelectedCity(gardenData?.city || '');
        // Preload cities for selected country
        if (gardenData?.country) {
            try {
                const cityList = locationService.getCitiesForCountry(gardenData.country) || [];
                setCities(cityList);
            } catch {
                setCities([]);
            }
        } else {
            setCities([]);
        }
        setShowLocationModal(true);
    };

    // Save updated garden location
    const handleSaveLocation = () => {
        if (!selectedCountry || !selectedCity) return;
        if (!websocketService.isConnected()) {
            Alert.alert('Error', 'Not connected to server. Please try again.');
            return;
        }
        setSavingLocation(true);
        websocketService.sendMessage({
            type: 'UPDATE_GARDEN',
            gardenId: gardenData.id,
            country: selectedCountry,
            city: selectedCity
        });
    };





    /**
     * Navigate to view plants
     */
    const handleViewPlants = () => {
        navigation.goBack(); // Go back to main screen which shows plants
    };

    /**
     * Leave garden confirmation
     */
    const handleLeaveGarden = () => {
        Alert.alert(
            'Leave Garden',
            'Are you sure you want to leave this garden? You will lose access to all plants and data.',
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Leave',
                    style: 'destructive',
                    onPress: () => {
                        if (!websocketService.isConnected()) {
                            Alert.alert('Error', 'Not connected to server. Please check your connection and try again.');
                            return;
                        }

                        setLoading(true);
                        websocketService.sendMessage({
                            type: 'LEAVE_GARDEN',
                            gardenId: gardenData.id
                        });
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
                    <Text style={styles.loadingText}>Loading garden details...</Text>
                </View>
            </SafeAreaView>
        );
    }

    return (
        <SafeAreaView style={styles.container}>
            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
                    <Feather name="arrow-left" size={24} color="#2C3E50" />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>{gardenData.name}</Text>
                <View style={styles.headerSpacer} />
            </View>

            <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
                {/* Garden Info Card */}
                <View style={styles.gardenInfoCard}>
                    <View style={styles.gardenHeader}>
                        <View style={styles.gardenIconContainer}>
                            <Feather name="users" size={20} color="#22C55E" />
                        </View>
                        <View style={styles.gardenTitleContainer}>
                            <Text style={styles.gardenTitle}>{gardenData.name}</Text>
                            <Text style={styles.gardenSubtitle}>
                                {members.length} member{members.length !== 1 ? 's' : ''} • Created {new Date(gardenData.created_at).toLocaleDateString()}
                            </Text>
                            {(gardenData.city || gardenData.country) && (
                                <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 4 }}>
                                    <Feather name="map-pin" size={14} color="#7F8C8D" />
                                    <Text style={{ marginLeft: 6, fontSize: 12, color: '#7F8C8D' }}>
                                        {[gardenData.city, gardenData.country].filter(Boolean).join(', ')}
                                    </Text>
                                </View>
                            )}
                        </View>
                    </View>

                    {/* Invite Code Section */}
                    <View style={styles.inviteCodeSection}>
                        <Text style={styles.sectionTitle}>Invite Code</Text>
                        <View style={styles.inviteCodeContainer}>
                            <Text style={styles.inviteCode}>{gardenData.invite_code || 'Loading...'}</Text>
                            <View style={styles.inviteCodeActions}>
                                <TouchableOpacity onPress={handleCopyInviteCode} style={styles.inviteCodeButton}>
                                    <Feather name="copy" size={16} color="#4CAF50" />
                                    <Text style={styles.inviteCodeButtonText}>Copy</Text>
                                </TouchableOpacity>
                            </View>
                        </View>
                    </View>

                    {/* Quick Actions (same design as section below) */}
                    <View style={styles.quickActionsSection}>
                        <Text style={styles.sectionTitle}>Quick Actions</Text>
                        <View style={styles.quickActionsGrid}>
                            <TouchableOpacity style={styles.quickActionCard} onPress={handleViewPlants}>
                                <View style={styles.quickActionIcon}>
                                    <Feather name="grid" size={18} color="#22C55E" />
                                </View>
                                <Text style={styles.quickActionText}>View Plants</Text>
                            </TouchableOpacity>

                            <TouchableOpacity style={styles.quickActionCard} onPress={handleShareInviteCode}>
                                <View style={styles.quickActionIcon}>
                                    <Feather name="share" size={18} color="#22C55E" />
                                </View>
                                <Text style={styles.quickActionText}>Invite Friends</Text>
                            </TouchableOpacity>

                            {userRole === 'admin' && (
                                <TouchableOpacity style={styles.quickActionCard} onPress={() => openLocationModal()}>
                                    <View style={styles.quickActionIcon}>
                                        <Feather name="map-pin" size={18} color="#22C55E" />
                                    </View>
                                    <Text style={styles.quickActionText}>Change Location</Text>
                                </TouchableOpacity>
                            )}
                        </View>
                    </View>
                </View>


                {/* Members Section */}
                <View style={styles.membersSection}>
                    <View style={styles.sectionHeader}>
                        <Text style={styles.sectionTitle}>Members</Text>
                    </View>

                    {members.length === 0 ? (
                        <View style={styles.emptyMembers}>
                            <Feather name="users" size={32} color="#BDC3C7" />
                            <Text style={styles.emptyMembersText}>No members found</Text>
                        </View>
                    ) : (
                        <View style={styles.membersList}>
                            {members.map((member, index) => (
                                <View key={member.id || index} style={styles.memberCard}>
                                    <View style={styles.memberInfo}>
                                        <View style={styles.memberAvatar}>
                                            <Feather name="user" size={18} color="#22C55E" />
                                        </View>
                                        <View style={styles.memberDetails}>
                                            <Text style={styles.memberName}>{member.full_name || 'Unknown User'}</Text>
                                            <Text style={styles.memberRole}>
                                                {member.role === 'admin' ? 'Admin' : 'Member'}
                                            </Text>
                                        </View>
                                    </View>
                                    <Text style={styles.memberJoined}>
                                        Joined {new Date(member.joined_at).toLocaleDateString()}
                                    </Text>
                                </View>
                            ))}
                        </View>
                    )}
                </View>

                {/* Danger Zone */}
                <View style={styles.dangerZone}>
                    <Text style={styles.sectionTitle}>Danger Zone</Text>
                    <TouchableOpacity style={styles.leaveButton} onPress={handleLeaveGarden}>
                        <Feather name="log-out" size={20} color="#E74C3C" />
                        <Text style={styles.leaveButtonText}>Leave Garden</Text>
                    </TouchableOpacity>
                </View>
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

            {/* Update Location Modal (Admin Only) */}
            <Modal visible={showLocationModal} transparent animationType="slide">
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <View style={styles.modalHeader}>
                            <Text style={styles.modalTitle}>Update Garden Location</Text>
                            <TouchableOpacity onPress={() => setShowLocationModal(false)}>
                                <Feather name="x" size={24} color="#333" />
                            </TouchableOpacity>
                        </View>

                        <Text style={styles.inputLabel}>Country</Text>
                        <View style={{ borderWidth: 1, borderColor: '#E0E0E0', borderRadius: 8, marginBottom: 16 }}>
                            <Picker
                                selectedValue={selectedCountry}
                                onValueChange={(val) => {
                                    setSelectedCountry(val);
                                    setSelectedCity('');
                                    try {
                                        const list = locationService.getCitiesForCountry(val) || [];
                                        setCities(list);
                                    } catch {
                                        setCities([]);
                                    }
                                }}
                                style={styles.modalPicker}
                            >
                                <Picker.Item label="Select Country" value="" />
                                {(countries || []).map((c) => (
                                    <Picker.Item key={c.code} label={c.name} value={c.name} />
                                ))}
                            </Picker>
                        </View>

                        <Text style={styles.inputLabel}>City</Text>
                        <View style={{ borderWidth: 1, borderColor: '#E0E0E0', borderRadius: 8, marginBottom: 16 }}>
                            <Picker
                                enabled={!!selectedCountry}
                                selectedValue={selectedCity}
                                onValueChange={(val) => setSelectedCity(val)}
                                style={styles.modalPicker}
                            >
                                <Picker.Item label={selectedCountry ? 'Select City' : 'Select a country first'} value="" />
                                {(cities || []).map((city) => (
                                    <Picker.Item key={city} label={city} value={city} />
                                ))}
                            </Picker>
                        </View>

                        <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                            <TouchableOpacity onPress={() => setShowLocationModal(false)} style={[styles.inviteCodeButton, { borderColor: '#BDC3C7' }]}>
                                <Text style={[styles.inviteCodeButtonText, { color: '#607D8B' }]}>Cancel</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                onPress={handleSaveLocation}
                                disabled={!selectedCountry || !selectedCity || savingLocation}
                                style={[styles.inviteCodeButton, { borderColor: (!selectedCountry || !selectedCity || savingLocation) ? '#BDC3C7' : '#4CAF50' }]}
                            >
                                <Text style={[styles.inviteCodeButtonText, { color: (!selectedCountry || !selectedCity || savingLocation) ? '#BDC3C7' : '#4CAF50' }]}>
                                    {savingLocation ? 'Saving...' : 'Save'}
                                </Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>

            {/* Removed separate pickers; both controls live in the main modal above */}
        </SafeAreaView>
    );
};

export default GardenScreen;
