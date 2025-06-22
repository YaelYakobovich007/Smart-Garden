import React, { useState, useEffect } from 'react';
import {
  Text,
  View,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  SafeAreaView,
  Image,
  ScrollView,
  Modal,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { Feather } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useAuthRequest } from 'expo-auth-session/providers/google';
import { Picker } from '@react-native-picker/picker';

import { styles } from './styles';
import { connectAndSend } from '../../services/authService';
import websocketService from '../../services/websocketService';
import locationService from '../../services/locationService';
import BranchImage from '../../../assets/images/Branch_With_Leafs.png';
import GoogleLogo from '../../../assets/images/Google_Logo.png';
import Constants from 'expo-constants';
const GOOGLE_CLIENT_ID = Constants.expoConfig.extra.GOOGLE_CLIENT_ID;

const RegisterScreen = () => {
  // --- STATE MANAGEMENT ---
  // Store user inputs, messages, and navigation state
  const navigation = useNavigation();
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [selectedCountry, setSelectedCountry] = useState('');
  const [selectedCity, setSelectedCity] = useState('');
  const [message, setMessage] = useState('');
  const [secureTextEntry, setSecureTextEntry] = useState(true);
  const [isConnected, setIsConnected] = useState(false);
  const [fullNameError, setFullNameError] = useState(false);
  const [emailError, setEmailError] = useState(false);
  const [passwordError, setPasswordError] = useState(false);
  const [countryError, setCountryError] = useState(false);
  const [cityError, setCityError] = useState(false);
  const [fullNameErrorMessage, setFullNameErrorMessage] = useState('');
  const [emailErrorMessage, setEmailErrorMessage] = useState('');
  const [passwordErrorMessage, setPasswordErrorMessage] = useState('');
  const [countryErrorMessage, setCountryErrorMessage] = useState('');
  const [cityErrorMessage, setCityErrorMessage] = useState('');

  // Location data state
  const [countries, setCountries] = useState([]);
  const [cities, setCities] = useState([]);

  // Picker modal state
  const [showCountryPicker, setShowCountryPicker] = useState(false);
  const [showCityPicker, setShowCityPicker] = useState(false);

  // Google Auth Request - clean approach
  const [request, response, promptAsync] = useAuthRequest({
    clientId: GOOGLE_CLIENT_ID,
    scopes: ['profile', 'email'],
  });

  // --- CONNECTION STATUS ---
  useEffect(() => {
    // Check initial connection status
    setIsConnected(websocketService.isConnected());
    
    // Listen for connection changes
    const handleConnectionChange = (connected) => {
      setIsConnected(connected);
      if (!connected) {
        setMessage('Connection lost. Please check your network.');
      }
    };
    
    websocketService.onConnectionChange(handleConnectionChange);
  }, []);

  // Handle Google Auth Response
  useEffect(() => {
    if (response?.type === 'success') {
      const { access_token } = response.params;
      if (access_token) {
        connectAndSend({ type: 'LOGIN_GOOGLE', googleToken: access_token }, handleAuthResponse, handleConnectionError);
      }
    } else if (response?.type === 'error') {
      setMessage('Google login was cancelled or failed.');
    }
  }, [response]);

  // Load countries on component mount
  useEffect(() => {
    loadCountries();
  }, []);

  // Reset city when country changes
  useEffect(() => {
    setSelectedCity('');
    setCities([]);
    if (cityError) {
      setCityError(false);
      setCityErrorMessage('');
    }
    
    if (selectedCountry) {
      loadCitiesForCountry(selectedCountry);
    }
  }, [selectedCountry]);

  // Load countries from package
  const loadCountries = () => {
    try {
      const countriesList = locationService.getCountries();
      setCountries(countriesList);
    } catch (error) {
      console.error('Error loading countries:', error);
      setMessage('Error loading countries. Please try again.');
    }
  };

  // Load cities for selected country
  const loadCitiesForCountry = (country) => {
    try {
      const citiesList = locationService.getCitiesForCountry(country);
      setCities(citiesList);
    } catch (error) {
      console.error('Error loading cities:', error);
      setMessage('Error loading cities. Please try again.');
    }
  };

  const handleFullNameChange = (text) => {
    setFullName(text);
    if (fullNameError) {
      setFullNameError(false);
      setFullNameErrorMessage('');
    }
  };

  const handleEmailChange = (text) => {
    setEmail(text);
    if (emailError) {
      setEmailError(false);
      setEmailErrorMessage('');
    }
  };

  const handlePasswordChange = (text) => {
    setPassword(text);
    if (passwordError) {
      setPasswordError(false);
      setPasswordErrorMessage('');
    }
  };

  const handleCountryChange = (country) => {
    setSelectedCountry(country);
    setShowCountryPicker(false);
    if (countryError) {
      setCountryError(false);
      setCountryErrorMessage('');
    }
  };

  const handleCityChange = (city) => {
    setSelectedCity(city);
    setShowCityPicker(false);
    if (cityError) {
      setCityError(false);
      setCityErrorMessage('');
    }
  };

  // --- AUTHENTICATION LOGIC ---
  // Handles responses from the backend after an auth attempt
  const handleAuthResponse = (data) => {
    if (data.type === 'REGISTER_SUCCESS') {
      setMessage('Registration successful! You can now log in.');
      setTimeout(() => navigation.navigate('Login'), 2000);
    } else if (data.type === 'LOGIN_SUCCESS') {
      setMessage('Login successful!');
      // Navigate directly to main screen if login is successful
      navigation.navigate('Main');
    } else if (data.type === 'REGISTER_FAIL' || data.type === 'LOGIN_FAIL') {
      setMessage(data.reason || 'An error occurred.');
    }
  };

  // Handles any WebSocket connection errors
  const handleConnectionError = () => {
    setMessage('Connection error. Please try again.');
  };

  // Validates inputs and sends registration request to the backend
  const handleRegister = () => {
    setMessage('');
    let hasError = false;

    // Only validate empty fields locally
    if (!fullName.trim()) {
      setFullNameError(true);
      setFullNameErrorMessage('Full name field is required');
      hasError = true;
    }

    if (!email.trim()) {
      setEmailError(true);
      setEmailErrorMessage('Email field is required');
      hasError = true;
    }

    if (!password.trim()) {
      setPasswordError(true);
      setPasswordErrorMessage('Password field is required');
      hasError = true;
    }

    if (!selectedCountry) {
      setCountryError(true);
      setCountryErrorMessage('Please select a country');
      hasError = true;
    }

    if (!selectedCity) {
      setCityError(true);
      setCityErrorMessage('Please select a city');
      hasError = true;
    }

    if (hasError) {
      return;
    }

    if (!isConnected) {
      setMessage('Not connected to server. Please wait...');
      return;
    }

    // Send to server for validation and registration
    connectAndSend({ 
      type: 'REGISTER', 
      email, 
      password,
      country: selectedCountry,
      city: selectedCity
    }, handleAuthResponse, handleConnectionError);
  };

  // Clean Google sign-in flow using useAuthRequest
  const handleGoogleLogin = async () => {
    setMessage('');
    if (!isConnected) {
      setMessage('Not connected to server. Please wait...');
      return;
    }
    
    try {
      await promptAsync({ useProxy: true });
    } catch (error) {
      console.error('Google login error:', error);
      setMessage('An error occurred during Google login.');
    }
  };

  // --- UI RENDERING ---
  // Renders the registration form
  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView contentContainerStyle={{ flexGrow: 1 }}>
            <Image source={BranchImage} style={styles.branchImage} />
            <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
                <Feather name="chevron-left" size={30} color="#333" />
            </TouchableOpacity>
            <View style={styles.header}>
              <Text style={styles.headerTitle}>Register</Text>
              <Text style={styles.headerSubtitle}>Create your new account</Text>
            </View>

            <View style={styles.formContainer}>
                <View style={[
                  styles.inputContainer,
                  fullNameError && styles.inputError
                ]}>
                    <Feather name="user" size={20} color={fullNameError ? "#D32F2F" : "#888"} style={styles.inputIcon} />
                    <TextInput
                        style={styles.input}
                        placeholder="Full Name"
                        placeholderTextColor="#888"
                        value={fullName}
                        onChangeText={handleFullNameChange}
                    />
                </View>
                {fullNameErrorMessage ? <Text style={styles.fieldError}>{fullNameErrorMessage}</Text> : null}

                <View style={[
                  styles.inputContainer,
                  emailError && styles.inputError
                ]}>
                  <Feather name="mail" size={20} color={emailError ? "#D32F2F" : "#888"} style={styles.inputIcon} />
                  <TextInput
                    style={styles.input}
                    placeholder="Email address"
                    placeholderTextColor="#888"
                    value={email}
                    onChangeText={handleEmailChange}
                    keyboardType="email-address"
                    autoCapitalize="none"
                  />
                </View>
                {emailErrorMessage ? <Text style={styles.fieldError}>{emailErrorMessage}</Text> : null}

                <View style={[
                  styles.inputContainer,
                  passwordError && styles.inputError
                ]}>
                    <Feather name="lock" size={20} color={passwordError ? "#D32F2F" : "#888"} style={styles.inputIcon} />
                    <TextInput
                        style={styles.input}
                        placeholder="Password"
                        placeholderTextColor="#888"
                        value={password}
                        onChangeText={handlePasswordChange}
                        secureTextEntry={secureTextEntry}
                    />
                    <TouchableOpacity onPress={() => setSecureTextEntry(!secureTextEntry)}>
                        <Feather name={secureTextEntry ? 'eye-off' : 'eye'} size={20} color={passwordError ? "#D32F2F" : "#888"} />
                    </TouchableOpacity>
                </View>
                {passwordErrorMessage ? <Text style={styles.fieldError}>{passwordErrorMessage}</Text> : null}
                
                <TouchableOpacity 
                  style={[
                    styles.pickerContainer,
                    countryError && styles.inputError
                  ]}
                  onPress={() => setShowCountryPicker(true)}
                >
                    <Feather name="map-pin" size={20} color={countryError ? "#D32F2F" : "#888"} style={styles.inputIcon} />
                    <View style={styles.pickerWrapper}>
                        <Text style={[
                          styles.pickerDisplayText,
                          !selectedCountry && styles.pickerPlaceholder
                        ]}>
                            {selectedCountry || 'Select Country'}
                        </Text>
                        <Feather name="chevron-down" size={20} color="#888" style={styles.pickerIcon} />
                    </View>
                </TouchableOpacity>
                {countryErrorMessage ? <Text style={styles.fieldError}>{countryErrorMessage}</Text> : null}
                
                <TouchableOpacity 
                  style={[
                    styles.pickerContainer,
                    cityError && styles.inputError
                  ]}
                  onPress={() => selectedCountry && setShowCityPicker(true)}
                  disabled={!selectedCountry}
                >
                    <Feather name="map-pin" size={20} color={cityError ? "#D32F2F" : "#888"} style={styles.inputIcon} />
                    <View style={styles.pickerWrapper}>
                        <Text style={[
                          styles.pickerDisplayText,
                          !selectedCity && styles.pickerPlaceholder
                        ]}>
                            {selectedCity || (selectedCountry ? 'Select City' : 'Select Country First')}
                        </Text>
                        <Feather name="chevron-down" size={20} color="#888" style={styles.pickerIcon} />
                    </View>
                </TouchableOpacity>
                {cityErrorMessage ? <Text style={styles.fieldError}>{cityErrorMessage}</Text> : null}

                <TouchableOpacity 
                  style={[styles.registerButton, !isConnected && styles.disabledButton]} 
                  onPress={handleRegister}
                  disabled={!isConnected}
                >
                    <Text style={styles.registerButtonText}>Register</Text>
                </TouchableOpacity>

                <View style={styles.separatorContainer}>
                    <View style={styles.separatorLine} />
                    <Text style={styles.separatorText}>or</Text>
                    <View style={styles.separatorLine} />
                </View>

                <TouchableOpacity 
                  style={[styles.googleButton, !isConnected && styles.disabledButton]} 
                  onPress={handleGoogleLogin}
                  disabled={!isConnected || !request}
                >
                    <Image source={GoogleLogo} style={styles.googleIcon} />
                    <Text style={styles.googleButtonText}>Continue with Google</Text>
                </TouchableOpacity>

                {message ? <Text style={styles.message}>{message}</Text> : null}
            </View>
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Country Picker Modal */}
      <Modal
        visible={showCountryPicker}
        transparent={true}
        animationType="slide"
      >
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
              onValueChange={handleCountryChange}
              style={styles.modalPicker}
            >
              <Picker.Item label="Select Country" value="" />
              {countries.map((country) => (
                <Picker.Item key={country.code} label={country.name} value={country.name} />
              ))}
            </Picker>
          </View>
        </View>
      </Modal>

      {/* City Picker Modal */}
      <Modal
        visible={showCityPicker}
        transparent={true}
        animationType="slide"
      >
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
              onValueChange={handleCityChange}
              style={styles.modalPicker}
            >
              <Picker.Item label="Select City" value="" />
              {cities.map((city) => (
                <Picker.Item key={city} label={city} value={city} />
              ))}
            </Picker>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

export default RegisterScreen; 