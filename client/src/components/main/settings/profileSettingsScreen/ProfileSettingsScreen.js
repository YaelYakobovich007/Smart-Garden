import React, { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, ScrollView, TextInput, ActivityIndicator, Alert, KeyboardAvoidingView, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
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
  const [dirty, setDirty] = useState(false);
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);

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

  // Load current user details
  useEffect(() => {
    const handleUser = (data) => {
      if (data.fullName) setNewFullName((prev) => prev || data.fullName);
      if (data.country) setSelectedCountry((prev) => prev || data.country);
      if (data.city) setSelectedCity((prev) => prev || data.city);
    };
    websocketService.onMessage('GET_USER_NAME_SUCCESS', handleUser);
    websocketService.onMessage('GET_USER_DETAILS_SUCCESS', handleUser);
    websocketService.send({ type: 'GET_USER_DETAILS' });
    return () => {
      websocketService.offMessage('GET_USER_NAME_SUCCESS', handleUser);
      websocketService.offMessage('GET_USER_DETAILS_SUCCESS', handleUser);
    };
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
      'UPDATE_USER_DETAILS_SUCCESS',
      'UPDATE_USER_DETAILS_FAIL',
      { type: 'UPDATE_USER_DETAILS', newName: newFullName.trim() },
      () => {
        setLoadingAction(null);
        setNewFullName('');
        websocketService.send({ type: 'GET_USER_DETAILS' });
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
      'UPDATE_USER_DETAILS_SUCCESS',
      'UPDATE_USER_DETAILS_FAIL',
      { type: 'UPDATE_USER_DETAILS', country: selectedCountry, city: selectedCity },
      () => {
        setLoadingAction(null);
        websocketService.send({ type: 'GET_USER_DETAILS' });
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
      'UPDATE_USER_DETAILS_SUCCESS',
      'UPDATE_USER_DETAILS_FAIL',
      { type: 'UPDATE_USER_DETAILS', currentPassword, newPassword },
      () => {
        setLoadingAction(null);
        setCurrentPassword('');
        setNewPassword('');
        // Silent success
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
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Feather name="arrow-left" size={24} color="#333" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Profile Settings</Text>
        <View style={styles.headerSpacer} />
      </View>

      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
          {/* Hero */}
          <View style={styles.heroCard}>
            <View style={styles.heroIconWrap}>
              <Feather name="user" size={22} color="#2C7A4B" />
            </View>
            <View style={styles.heroTextWrap}>
              <Text style={styles.heroTitle}>Manage your profile</Text>
              <Text style={styles.heroSubtitle}>Update your name, location and password</Text>
            </View>
          </View>
          <View style={styles.panelContainer}>
            {/* Full Name */}
            <View style={styles.sectionUnified}>
              <Text style={styles.cardTitle}>Full Name</Text>
              <Text style={styles.cardSubtitle}>This is how your name will appear across the app</Text>
              <View style={styles.inputRow}>
                <Feather name="user" size={20} color="#888" style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  placeholder="Enter your full name"
                  value={newFullName}
                  autoCapitalize="words"
                  onChangeText={(t) => { setNewFullName(t); setDirty(true); }}
                />
              </View>
            </View>

            {/* Location */}
            <View style={styles.sectionUnified}>
              <Text style={styles.cardTitle}>Location</Text>
              <Text style={styles.cardSubtitle}>We use this to personalize weather and tips</Text>
              <TouchableOpacity style={styles.pickerContainer} onPress={() => { setShowCountryPicker(true); }}>
                <Feather name="map-pin" size={20} color="#888" style={styles.inputIcon} />
                <View style={styles.pickerWrapper}>
                  <Text style={[styles.pickerDisplayText, !selectedCountry && styles.pickerPlaceholder]}>
                    {selectedCountry || 'Select Country'}
                  </Text>
                  <Feather name="chevron-down" size={20} color="#888" style={styles.pickerIcon} />
                </View>
              </TouchableOpacity>
              <TouchableOpacity style={styles.pickerContainer} onPress={() => { if (selectedCountry) { setShowCityPicker(true); } }} disabled={!selectedCountry}>
                <Feather name="map-pin" size={20} color="#888" style={styles.inputIcon} />
                <View style={styles.pickerWrapper}>
                  <Text style={[styles.pickerDisplayText, !selectedCity && styles.pickerPlaceholder]}>
                    {selectedCity || (selectedCountry ? 'Select City' : 'Select Country First')}
                  </Text>
                  <Feather name="chevron-down" size={20} color="#888" style={styles.pickerIcon} />
                </View>
              </TouchableOpacity>
            </View>

            {/* Country Picker Inline Modal */}
            {showCountryPicker && (
              <View style={styles.inlinePicker}>
                <Picker selectedValue={selectedCountry} onValueChange={(val) => { setSelectedCountry(val); setDirty(true); setShowCountryPicker(false); }}>
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
                <Picker selectedValue={selectedCity} onValueChange={(val) => { setSelectedCity(val); setDirty(true); setShowCityPicker(false); }}>
                  <Picker.Item label="Select City" value="" />
                  {cities.map((city) => (
                    <Picker.Item key={city} label={city} value={city} />
                  ))}
                </Picker>
              </View>
            )}
            {/* Password */}
            <View style={[styles.sectionUnified, styles.lastSection]}>
              <Text style={styles.cardTitle}>Change Password</Text>
              <Text style={styles.cardSubtitle}>Use a strong password you don’t use elsewhere</Text>
              <View style={styles.inputRow}>
                <Feather name="lock" size={20} color="#888" style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  placeholder="Current password"
                  value={currentPassword}
                  onChangeText={(t) => { setCurrentPassword(t); setDirty(true); }}
                  secureTextEntry={!showCurrent}
                  autoCapitalize="none"
                  autoCorrect={false}
                  autoComplete="off"
                  textContentType="oneTimeCode"
                  importantForAutofill="no"
                />
                <TouchableOpacity onPress={() => setShowCurrent(!showCurrent)}>
                  <Feather name={showCurrent ? 'eye' : 'eye-off'} size={20} color="#888" />
                </TouchableOpacity>
              </View>
              <View style={styles.inputRow}>
                <Feather name="lock" size={20} color="#888" style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  placeholder="New password"
                  value={newPassword}
                  onChangeText={(t) => { setNewPassword(t); setDirty(true); }}
                  secureTextEntry={!showNew}
                  autoCapitalize="none"
                  autoCorrect={false}
                  autoComplete="off"
                  textContentType="oneTimeCode"
                  importantForAutofill="no"
                />
                <TouchableOpacity onPress={() => setShowNew(!showNew)}>
                  <Feather name={showNew ? 'eye' : 'eye-off'} size={20} color="#888" />
                </TouchableOpacity>
              </View>
              <Text style={styles.hintText}>If you forgot your password, go to Login and tap "Forgot Password"</Text>
              <View style={styles.buttonRow}>
                <TouchableOpacity onPress={() => navigation.navigate('Login')} style={styles.linkButton}>
                  <Text style={styles.linkText}>Go to Login</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.button, styles.buttonPrimary, !dirty && { opacity: 0.5 }]}
                  onPress={() => {
                    const payload = { type: 'UPDATE_USER_DETAILS' };
                    if (newFullName.trim()) payload.newName = newFullName.trim();
                    if (selectedCountry && selectedCity) {
                      payload.country = selectedCountry;
                      payload.city = selectedCity;
                    }
                    if (currentPassword && newPassword) {
                      payload.currentPassword = currentPassword;
                      payload.newPassword = newPassword;
                    }
                    if (!payload.newName && !payload.country && !payload.city && !payload.currentPassword) return;

                    const handler = (data) => {
                      websocketService.offMessage('UPDATE_USER_DETAILS_SUCCESS', handler);
                      websocketService.offMessage('UPDATE_USER_DETAILS_FAIL', handler);
                      if (data.type === 'UPDATE_USER_DETAILS_SUCCESS') {
                        websocketService.send({ type: 'GET_USER_DETAILS' });
                        setDirty(false);
                        setNewFullName('');
                        setCurrentPassword('');
                        setNewPassword('');
                        Alert.alert('Success', 'Your profile has been updated.');
                      } else {
                        Alert.alert('Update Failed', data.reason || 'Could not update your profile.');
                      }
                    };
                    websocketService.onMessage('UPDATE_USER_DETAILS_SUCCESS', handler);
                    websocketService.onMessage('UPDATE_USER_DETAILS_FAIL', handler);
                    websocketService.send(payload);
                  }}
                  disabled={!dirty}
                >
                  <Text style={styles.buttonText}>Save Changes</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

export default ProfileSettingsScreen;


