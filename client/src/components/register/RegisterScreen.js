import React, { useState } from 'react';
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
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { Feather } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import * as AuthSession from 'expo-auth-session';

import { styles } from './styles';
import { connectAndSend } from '../../services/authService';
import BranchImage from '../../../assets/images/Branch_With_Leafs.png';
import GoogleLogo from '../../../assets/images/Google_Logo.png';

const GOOGLE_CLIENT_ID = 'YOUR_GOOGLE_CLIENT_ID.apps.googleusercontent.com'; // TODO: Replace with your client ID

const RegisterScreen = () => {
  // --- STATE MANAGEMENT ---
  // Store user inputs, messages, and navigation state
  const navigation = useNavigation();
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [country, setCountry] = useState('');
  const [city, setCity] = useState('');
  const [message, setMessage] = useState('');
  const [secureTextEntry, setSecureTextEntry] = useState(true);

  // --- AUTHENTICATION LOGIC ---
  // Handles responses from the backend after an auth attempt
  const handleAuthResponse = (data) => {
    if (data.type === 'REGISTER_SUCCESS' || data.type === 'LOGIN_SUCCESS') {
      setMessage('Success! You can now log in.');
      setTimeout(() => navigation.navigate('Login'), 2000);
    } else if (data.type === 'REGISTER_FAIL' || data.type === 'LOGIN_FAIL') {
      setMessage(data.reason || 'An error occurred.');
    }
  };

  // Handles any WebSocket connection errors
  const handleConnectionError = () => {
    setMessage('Connection error.');
  };

  // Validates inputs and sends registration request to the backend
  const handleRegister = () => {
    setMessage('');
    if (!fullName || !email || !password || !country || !city) {
      setMessage('Please fill in all fields.');
      return;
    }
    connectAndSend({ type: 'REGISTER', email, password }, handleAuthResponse, handleConnectionError);
  };

  // Initiates Google sign-in flow and sends the token to the backend
  const handleGoogleLogin = async () => {
    setMessage('');
    try {
      const redirectUri = AuthSession.makeRedirectUri({ useProxy: true });
      const result = await AuthSession.startAsync({
        authUrl:
          `https://accounts.google.com/o/oauth2/v2/auth?` +
          `client_id=${GOOGLE_CLIENT_ID}` +
          `&redirect_uri=${encodeURIComponent(redirectUri)}` +
          `&response_type=token` +
          `&scope=profile%20email`,
      });

      if (result.type === 'success' && result.params.access_token) {
        connectAndSend({ type: 'LOGIN_GOOGLE', googleToken: result.params.access_token }, handleAuthResponse, handleConnectionError);
      } else {
        setMessage('Google login was cancelled or failed.');
      }
    } catch (error) {
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
                <View style={styles.inputContainer}>
                    <Feather name="user" size={20} color="#888" style={styles.inputIcon} />
                    <TextInput
                        style={styles.input}
                        placeholder="Full Name"
                        placeholderTextColor="#888"
                        value={fullName}
                        onChangeText={setFullName}
                    />
                </View>

                <View style={styles.inputContainer}>
                  <Feather name="mail" size={20} color="#888" style={styles.inputIcon} />
                  <TextInput
                    style={styles.input}
                    placeholder="Email address"
                    placeholderTextColor="#888"
                    value={email}
                    onChangeText={setEmail}
                    keyboardType="email-address"
                    autoCapitalize="none"
                  />
                </View>

                <View style={styles.inputContainer}>
                    <Feather name="lock" size={20} color="#888" style={styles.inputIcon} />
                    <TextInput
                        style={styles.input}
                        placeholder="Password"
                        placeholderTextColor="#888"
                        value={password}
                        onChangeText={setPassword}
                        secureTextEntry={secureTextEntry}
                    />
                    <TouchableOpacity onPress={() => setSecureTextEntry(!secureTextEntry)}>
                        <Feather name={secureTextEntry ? 'eye-off' : 'eye'} size={20} color="#888" />
                    </TouchableOpacity>
                </View>
                
                <View style={styles.inputContainer}>
                    <Feather name="map-pin" size={20} color="#888" style={styles.inputIcon} />
                    <TextInput
                        style={styles.input}
                        placeholder="Country"
                        placeholderTextColor="#888"
                        value={country}
                        onChangeText={setCountry}
                    />
                </View>
                
                <View style={styles.inputContainer}>
                    <Feather name="map-pin" size={20} color="#888" style={styles.inputIcon} />
                    <TextInput
                        style={styles.input}
                        placeholder="City"
                        placeholderTextColor="#888"
                        value={city}
                        onChangeText={setCity}
                    />
                </View>

                <TouchableOpacity style={styles.registerButton} onPress={handleRegister}>
                    <Text style={styles.registerButtonText}>Register</Text>
                </TouchableOpacity>

                <View style={styles.separatorContainer}>
                    <View style={styles.separatorLine} />
                    <Text style={styles.separatorText}>or</Text>
                    <View style={styles.separatorLine} />
                </View>

                <TouchableOpacity style={styles.googleButton} onPress={handleGoogleLogin}>
                    <Image source={GoogleLogo} style={styles.googleIcon} />
                    <Text style={styles.googleButtonText}>Continue with Google</Text>
                </TouchableOpacity>

                {message ? <Text style={styles.message}>{message}</Text> : null}
            </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

export default RegisterScreen; 