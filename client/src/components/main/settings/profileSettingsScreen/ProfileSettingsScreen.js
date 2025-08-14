import React, { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, ScrollView, TextInput, ActivityIndicator, Alert } from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { Feather } from '@expo/vector-icons';
import websocketService from '../../../../services/websocketService';
import locationService from '../../../../services/locationService';
import { Picker } from '@react-native-picker/picker';
import { styles } from './styles';

const ProfileSettingsScreen = () => {
  const navigation = useNavigation();
  const route = useRoute();
  const initialSection = route.params?.initialSection || 'name';

  const [newFullName, setNewFullName] = useState('');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [loadingAction, setLoadingAction] = useState(null);

  // Location state
  const [selectedCountry, setSelectedCountry] = useState('');
  const [selectedCity, setSelectedCity] = useState('');
  const [countries, setCountries] = useState([]);
  const [cities, setCities] = useState([]);

  // Local picker modal state (inline full-width pickers)
  const [showCountryPicker, setShowCountryPicker] = useState(false);
  const [showCityPicker, setShowCityPicker] = useState(false);

  useEffect(() => {
    websocketService.connect();
  }, []);

  useEffect(() => {
    try {
      const list = locationService.getCountries();
      setCountries(list);
    } catch (e) {
      console.error('Error loading countries', e);
    }
  }, []);

  useEffect(() => {
    setSelectedCity('');
    setCities([]);
    if (selectedCountry) {
      try {
        const list = locationService.getCitiesForCountry(selectedCountry);
        setCities(list);
      } catch (e) {
        console.error('Error loading cities', e);
      }
    }
  }, [selectedCountry]);

  const sendWithOneTimeHandler = (successType, failType, payload, onSuccess, onFail) => {
    const handler = (data) => {
      websocketService.offMessage(successType, handler);
      websocketService.offMessage(failType, handler);
      if (data.type === successType) {
        onSuccess && onSuccess(data);
      } else {
        onFail && onFail(data);
      }
    };
    websocketService.onMessage(successType, handler);
    websocketService.onMessage(failType, handler);
    websocketService.send(payload);
  };

  const submitUpdateName = () => {
    if (!newFullName || newFullName.trim().length < 2) {
      Alert.alert('Invalid Name', 'Please enter your full name (2-50 letters).');
      return;
    }
    setLoadingAction('name');
    sendWithOneTimeHandler(
      'UPDATE_FULL_NAME_SUCCESS',
      'UPDATE_FULL_NAME_FAIL',
      { type: 'UPDATE_FULL_NAME', newName: newFullName.trim() },
      () => {
        setLoadingAction(null);
        setNewFullName('');
        Alert.alert('Success', 'Your name has been updated.');
      },
      (err) => {
        setLoadingAction(null);
        Alert.alert('Update Failed', err?.reason || 'Could not update your name.');
      }
    );
  };

  const submitUpdateLocation = () => {
    if (!selectedCountry || !selectedCity) {
      Alert.alert('Invalid Location', 'Please select both country and city.');
      return;
    }
    setLoadingAction('location');
    sendWithOneTimeHandler(
      'UPDATE_LOCATION_SUCCESS',
      'UPDATE_LOCATION_FAIL',
      { type: 'UPDATE_LOCATION', country: selectedCountry, city: selectedCity },
      () => {
        setLoadingAction(null);
        Alert.alert('Success', 'Your location has been updated.');
      },
      (err) => {
        setLoadingAction(null);
        Alert.alert('Update Failed', err?.reason || 'Could not update your location.');
      }
    );
  };

  const submitChangePassword = () => {
    if (!currentPassword || !newPassword) {
      Alert.alert('Missing Fields', 'Please enter both your current and new password.');
      return;
    }
    setLoadingAction('password');
    sendWithOneTimeHandler(
      'UPDATE_PASSWORD_SUCCESS',
      'UPDATE_PASSWORD_FAIL',
      { type: 'UPDATE_PASSWORD', currentPassword, newPassword },
      () => {
        setLoadingAction(null);
        setCurrentPassword('');
        setNewPassword('');
        Alert.alert('Success', 'Your password has been updated.');
      },
      (err) => {
        setLoadingAction(null);
        Alert.alert(
          'Could not update password',
          `${err?.reason || 'Update failed.'}\nIf you forgot your password, go to Login and tap "Forgot Password".`,
          [
            { text: 'OK' },
            { text: 'Go to Login', onPress: () => navigation.navigate('Login') }
          ]
        );
      }
    );
  };

  return (
    <View style={{ flex: 1, backgroundColor: '#F0F4F8' }}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Feather name="arrow-left" size={24} color="#333" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Profile Settings</Text>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {/* Full Name */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Full Name</Text>
          <View style={styles.inputRow}>
            <Feather name="user" size={20} color="#888" style={styles.inputIcon} />
            <TextInput
              style={styles.input}
              placeholder="Enter your full name"
              value={newFullName}
              onChangeText={setNewFullName}
              autoCapitalize="words"
            />
          </View>
          <TouchableOpacity style={[styles.button, styles.buttonPrimary]} onPress={submitUpdateName} disabled={loadingAction === 'name'}>
            {loadingAction === 'name' ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>Save Name</Text>}
          </TouchableOpacity>
        </View>

        {/* Location */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Location</Text>
          <TouchableOpacity style={styles.pickerContainer} onPress={() => setShowCountryPicker(true)}>
            <Feather name="map-pin" size={20} color="#888" style={styles.inputIcon} />
            <View style={styles.pickerWrapper}>
              <Text style={[styles.pickerDisplayText, !selectedCountry && styles.pickerPlaceholder]}>
                {selectedCountry || 'Select Country'}
              </Text>
              <Feather name="chevron-down" size={20} color="#888" style={styles.pickerIcon} />
            </View>
          </TouchableOpacity>
          <TouchableOpacity style={styles.pickerContainer} onPress={() => selectedCountry && setShowCityPicker(true)} disabled={!selectedCountry}>
            <Feather name="map-pin" size={20} color="#888" style={styles.inputIcon} />
            <View style={styles.pickerWrapper}>
              <Text style={[styles.pickerDisplayText, !selectedCity && styles.pickerPlaceholder]}>
                {selectedCity || (selectedCountry ? 'Select City' : 'Select Country First')}
              </Text>
              <Feather name="chevron-down" size={20} color="#888" style={styles.pickerIcon} />
            </View>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.button, styles.buttonPrimary]} onPress={submitUpdateLocation} disabled={loadingAction === 'location'}>
            {loadingAction === 'location' ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>Save Location</Text>}
          </TouchableOpacity>

          {/* Country Picker Inline Modal */}
          {showCountryPicker && (
            <View style={styles.inlinePicker}>
              <Picker selectedValue={selectedCountry} onValueChange={(val) => { setSelectedCountry(val); setShowCountryPicker(false); }}>
                <Picker.Item label="Select Country" value="" />
                {countries.map((c) => (
                  <Picker.Item key={c.code} label={c.name} value={c.name} />
                ))}
              </Picker>
            </View>
          )}

          {/* City Picker Inline Modal */}
          {showCityPicker && (
            <View style={styles.inlinePicker}>
              <Picker selectedValue={selectedCity} onValueChange={(val) => { setSelectedCity(val); setShowCityPicker(false); }}>
                <Picker.Item label="Select City" value="" />
                {cities.map((city) => (
                  <Picker.Item key={city} label={city} value={city} />
                ))}
              </Picker>
            </View>
          )}
        </View>

        {/* Password */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Change Password</Text>
          <View style={styles.inputRow}>
            <Feather name="lock" size={20} color="#888" style={styles.inputIcon} />
            <TextInput
              style={styles.input}
              placeholder="Current password"
              value={currentPassword}
              onChangeText={setCurrentPassword}
              secureTextEntry
            />
          </View>
          <View style={styles.inputRow}>
            <Feather name="lock" size={20} color="#888" style={styles.inputIcon} />
            <TextInput
              style={styles.input}
              placeholder="New password"
              value={newPassword}
              onChangeText={setNewPassword}
              secureTextEntry
            />
          </View>
          <TouchableOpacity style={[styles.button, styles.buttonPrimary]} onPress={submitChangePassword} disabled={loadingAction === 'password'}>
            {loadingAction === 'password' ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>Save Password</Text>}
          </TouchableOpacity>
          <Text style={styles.hintText}>If you forgot your password, go to Login and tap "Forgot Password"</Text>
        </View>
      </ScrollView>
    </View>
  );
};

export default ProfileSettingsScreen;


