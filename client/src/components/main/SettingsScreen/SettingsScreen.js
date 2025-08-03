import React from 'react';
import {
  View,
  Text,
  StatusBar,
  TouchableOpacity,
  ScrollView,
  Alert,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { styles } from './styles';
import sessionService from '../../../services/sessionService';
import onboardingService from '../../../services/onboardingService';

const SettingsScreen = () => {
  const navigation = useNavigation();

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

  const handleProfile = () => {
    Alert.alert('Profile', 'Profile settings will be implemented here');
  };

  const handleNotifications = () => {
    Alert.alert('Notifications', 'Notification settings will be implemented here');
  };

  const handlePrivacy = () => {
    Alert.alert('Privacy', 'Privacy settings will be implemented here');
  };

  const handleAbout = () => {
    Alert.alert('About', 'About Smart Garden - Version 1.0.0');
  };

  const handleHelp = () => {
    Alert.alert('Help', 'Help and support will be implemented here');
  };

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
    <View style={{ flex: 1, backgroundColor: '#F0F4F8' }}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />
      
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Feather name="arrow-left" size={24} color="#333" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Settings</Text>
        <View style={styles.headerSpacer} />
      </View>

      {/* Settings List */}
      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Profile Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Account</Text>
          <TouchableOpacity style={styles.settingItem} onPress={handleProfile}>
            <View style={styles.settingLeft}>
              <Feather name="user" size={20} color="#4CAF50" />
              <Text style={styles.settingText}>Profile</Text>
            </View>
            <Feather name="chevron-right" size={20} color="#BDC3C7" />
          </TouchableOpacity>
        </View>

        {/* Preferences Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Preferences</Text>
          <TouchableOpacity style={styles.settingItem} onPress={handleNotifications}>
            <View style={styles.settingLeft}>
              <Feather name="bell" size={20} color="#4CAF50" />
              <Text style={styles.settingText}>Notifications</Text>
            </View>
            <Feather name="chevron-right" size={20} color="#BDC3C7" />
          </TouchableOpacity>
          <TouchableOpacity style={styles.settingItem} onPress={handlePrivacy}>
            <View style={styles.settingLeft}>
              <Feather name="shield" size={20} color="#4CAF50" />
              <Text style={styles.settingText}>Privacy & Security</Text>
            </View>
            <Feather name="chevron-right" size={20} color="#BDC3C7" />
          </TouchableOpacity>
        </View>

        {/* Support Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Support</Text>
          <TouchableOpacity style={styles.settingItem} onPress={handleHelp}>
            <View style={styles.settingLeft}>
              <Feather name="help-circle" size={20} color="#4CAF50" />
              <Text style={styles.settingText}>Help & Support</Text>
            </View>
            <Feather name="chevron-right" size={20} color="#BDC3C7" />
          </TouchableOpacity>
          <TouchableOpacity style={styles.settingItem} onPress={handleAbout}>
            <View style={styles.settingLeft}>
              <Feather name="info" size={20} color="#4CAF50" />
              <Text style={styles.settingText}>About</Text>
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
          </TouchableOpacity>
          <TouchableOpacity style={[styles.settingItem, styles.clearSessionItem]} onPress={handleClearSession}>
            <View style={styles.settingLeft}>
              <Feather name="refresh-cw" size={20} color="#F39C12" />
              <Text style={[styles.settingText, styles.clearSessionText]}>Clear Session (Debug)</Text>
            </View>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.settingItem, styles.clearSessionItem]} onPress={handleResetOnboarding}>
            <View style={styles.settingLeft}>
              <Feather name="play-circle" size={20} color="#9B59B6" />
              <Text style={[styles.settingText, styles.clearSessionText]}>Reset Onboarding (Debug)</Text>
            </View>
          </TouchableOpacity>
        </View>
              </ScrollView>
      </View>
    );
};

export default SettingsScreen; 