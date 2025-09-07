import React, { useEffect, useState } from 'react';
import {
    View,
    Text,
    StatusBar,
    TouchableOpacity,
    ScrollView,
    Alert,
    TextInput,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { styles } from './styles';
import sessionService from '../../../../services/sessionService';
import onboardingService from '../../../../services/onboardingService';

const SettingsScreen = () => {
    const navigation = useNavigation();

    // No inline profile form; use dedicated screens

    const handleLogout = async () => {
        Alert.alert(
            'Logout',
            'Are you sure you want to logout?',
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Logout',
                    style: 'destructive',
                    onPress: async () => {
                        // Clear user session
                        await sessionService.clearSession();
                        // Navigate to login screen
                        navigation.navigate('Login');
                    }
                }
            ]
        );
    };

    const handleClearSession = async () => {
        Alert.alert(
            'Clear Session',
            'This will clear your current session and redirect you to login. Use this if you\'re having authentication issues.',
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Clear Session',
                    style: 'destructive',
                    onPress: async () => {
                        // Clear user session
                        await sessionService.clearSession();
                        // Navigate to login screen
                        navigation.navigate('Login');
                    }
                }
            ]
        );
    };

    // Navigation handlers for dedicated profile screens
    const openChangeName = () => navigation.navigate('ProfileSettings', { initialSection: 'name' });
    const openChangeLocation = () => navigation.navigate('ProfileSettings', { initialSection: 'location' });
    const openChangePassword = () => navigation.navigate('ProfileSettings', { initialSection: 'password' });

    // Preferences-related items removed

    const handleResetOnboarding = async () => {
        Alert.alert(
            'Reset Onboarding',
            'This will reset the onboarding screens so you can see them again. Are you sure?',
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Reset',
                    style: 'destructive',
                    onPress: async () => {
                        await onboardingService.resetOnboarding();
                        Alert.alert('Success', 'Onboarding has been reset. Please restart the app to see the onboarding screens again.');
                    }
                }
            ]
        );
    };

    return (
        <SafeAreaView style={styles.container}>
            <StatusBar barStyle="dark-content" backgroundColor="transparent" />

            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
                    <Feather name="arrow-left" size={24} color="#FFFFFF" />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Settings</Text>
                <View style={styles.headerSpacer} />
            </View>

            {/* Settings Container */}
            <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
                <View style={styles.settingsContainer}>
                    {/* Profile navigation items */}
                    <View style={styles.section}>
                        <Text style={styles.sectionTitle}>Profile</Text>
                        <TouchableOpacity style={styles.settingItem} onPress={openChangeName}>
                            <View style={styles.settingLeft}>
                                <Feather name="user" size={20} color="#4CAF50" />
                                <Text style={styles.settingText}>Change Name</Text>
                            </View>
                            <Feather name="chevron-right" size={20} color="#BDC3C7" />
                        </TouchableOpacity>
                        <TouchableOpacity style={styles.settingItem} onPress={openChangeLocation}>
                            <View style={styles.settingLeft}>
                                <Feather name="map-pin" size={20} color="#4CAF50" />
                                <Text style={styles.settingText}>Change Location</Text>
                            </View>
                            <Feather name="chevron-right" size={20} color="#BDC3C7" />
                        </TouchableOpacity>
                        <TouchableOpacity style={styles.settingItem} onPress={openChangePassword}>
                            <View style={styles.settingLeft}>
                                <Feather name="lock" size={20} color="#4CAF50" />
                                <Text style={styles.settingText}>Change Password</Text>
                            </View>
                            <Feather name="chevron-right" size={20} color="#BDC3C7" />
                        </TouchableOpacity>
                    </View>

                    {/* Preferences Section removed */}

                    {/* Support Section (removed Help & About) */}

                    {/* Debug Section */}
                    <View style={styles.section}>
                        <Text style={styles.sectionTitle}>Debug</Text>
                        <TouchableOpacity style={styles.settingItem} onPress={handleClearSession}>
                            <View style={styles.settingLeft}>
                                <Feather name="refresh-cw" size={20} color="#F39C12" />
                                <Text style={[styles.settingText, styles.clearSessionText]}>Clear Session</Text>
                            </View>
                            <Feather name="chevron-right" size={20} color="#BDC3C7" />
                        </TouchableOpacity>
                        <TouchableOpacity style={styles.settingItem} onPress={handleResetOnboarding}>
                            <View style={styles.settingLeft}>
                                <Feather name="play-circle" size={20} color="#9B59B6" />
                                <Text style={[styles.settingText, styles.clearSessionText]}>Reset Onboarding</Text>
                            </View>
                            <Feather name="chevron-right" size={20} color="#BDC3C7" />
                        </TouchableOpacity>
                    </View>

                    {/* Logout Section */}
                    <View style={styles.section}>
                        <TouchableOpacity style={[styles.settingItem, styles.logoutItem]} onPress={handleLogout}>
                            <View style={styles.settingLeft}>
                                <Feather name="log-out" size={20} color="#E74C3C" />
                                <Text style={[styles.settingText, styles.logoutText]}>Logout</Text>
                            </View>
                            <Feather name="chevron-right" size={20} color="#BDC3C7" />
                        </TouchableOpacity>
                    </View>
                </View>
            </ScrollView>
        </SafeAreaView>
    );
};

export default SettingsScreen; 