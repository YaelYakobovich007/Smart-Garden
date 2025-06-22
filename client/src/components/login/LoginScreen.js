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
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { Feather } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useAuthRequest } from 'expo-auth-session/providers/google';

import { styles } from './styles';
import { connectAndSend } from '../../services/authService';
import websocketService from '../../services/websocketService';
import Logo from '../../../assets/images/Smart_Garden_Logo.png';
import GoogleLogo from '../../../assets/images/Google_Logo.png';
import Constants from 'expo-constants';

const GOOGLE_CLIENT_ID = Constants.expoConfig.extra.GOOGLE_CLIENT_ID;

const LoginScreen = () => {
  // --- STATE MANAGEMENT ---
  // Store user inputs, messages, and navigation state
  const navigation = useNavigation();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [message, setMessage] = useState('');
  const [secureTextEntry, setSecureTextEntry] = useState(true);
  const [isConnected, setIsConnected] = useState(false);
  const [emailError, setEmailError] = useState(false);
  const [passwordError, setPasswordError] = useState(false);
  const [emailErrorMessage, setEmailErrorMessage] = useState('');
  const [passwordErrorMessage, setPasswordErrorMessage] = useState('');

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

  // --- AUTHENTICATION LOGIC ---
  // Handles responses from the backend after an auth attempt
  const handleAuthResponse = (data) => {
    if (data.type === 'LOGIN_SUCCESS') {
      setMessage('Login successful!');
      // Navigate to the main app screen
      navigation.navigate('Main');
    } else if (data.type === 'LOGIN_FAIL') {
      setMessage(data.reason || 'Login failed.');
    }
  };

  // Handles any WebSocket connection errors
  const handleConnectionError = () => {
      setMessage('Connection error. Please try again.');
  }

  // Validates inputs and sends login request to the backend
  const handleLogin = () => {
    setMessage('');
    let hasError = false;

    // Only validate empty fields locally
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

    if (hasError) {
      return;
    }

    if (!isConnected) {
      setMessage('Not connected to server. Please wait...');
      return;
    }

    // Send to server for validation and authentication
    connectAndSend({ type: 'LOGIN', email, password }, handleAuthResponse, handleConnectionError);
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
  // Renders the login form
  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <StatusBar style="dark" />
        <View style={styles.header}>
          <Image source={Logo} style={styles.logo} />
          <Text style={styles.headerTitle}>Smart Garden</Text>
          <Text style={styles.headerSubtitle}>Grow smarter. Care easier</Text>
        </View>

        <View style={styles.formContainer}>
            <Text style={styles.welcomeTitle}>Welcome</Text>
            <Text style={styles.welcomeSubtitle}>Sign in to your garden</Text>

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

            <TouchableOpacity>
                <Text style={styles.forgotPassword}>Forgot Password?</Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={[styles.signInButton, !isConnected && styles.disabledButton]} 
              onPress={handleLogin}
              disabled={!isConnected}
            >
                <Text style={styles.signInButtonText}>Sign In</Text>
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
        <View style={styles.footer}>
            <Text style={styles.footerText}>Don't have an account? </Text>
            <TouchableOpacity onPress={() => navigation.navigate('Register')}>
                <Text style={styles.signUpText}>Sign Up</Text>
            </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

export default LoginScreen; 