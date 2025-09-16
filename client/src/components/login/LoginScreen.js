/**
 * Login Screen Component - User Authentication Interface
 * 
 * This component provides the primary authentication interface for the Smart Garden app.
 * It handles:
 * - Email/password authentication
 * - Form validation and error handling
 * - WebSocket connection management
 * - Session creation and storage
 * - Navigation to registration and main app
 * 
 * The component supports email/password login.
 */

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

import { styles } from './styles';
import { connectAndSend } from '../../services/authService';
import websocketService from '../../services/websocketService';
import sessionService from '../../services/sessionService';
import Logo from '../../../assets/images/Smart_Garden_Logo.png';

const LoginScreen = () => {
  const navigation = useNavigation();

  // Form input state management
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState(''); // 'success' | 'error' | ''
  const [secureTextEntry, setSecureTextEntry] = useState(true);

  // Connection and error state management
  const [isConnected, setIsConnected] = useState(false);
  const [emailError, setEmailError] = useState(false);
  const [passwordError, setPasswordError] = useState(false);
  const [emailErrorMessage, setEmailErrorMessage] = useState('');
  const [passwordErrorMessage, setPasswordErrorMessage] = useState('');



  /**
   * Monitor WebSocket connection status
   * Updates UI based on connection state and shows appropriate messages
   */
  useEffect(() => {
    // Check initial connection status
    setIsConnected(websocketService.isConnected());

    /**
     * Handle WebSocket connection changes
     * Updates connection state and shows user feedback
     * @param {boolean} connected - Current connection status
     */
    const handleConnectionChange = (connected) => {
      setIsConnected(connected);
      if (!connected) {
        setMessage('Connection lost. Please check your network.');
      }
    };

    websocketService.onConnectionChange(handleConnectionChange);
  }, []);


  /**
   * Handle email input changes
   * Updates email state and clears any existing email errors
   * @param {string} text - New email value
   */
  const handleEmailChange = (text) => {
    setEmail(text);
    if (emailError) {
      setEmailError(false);
      setEmailErrorMessage('');
    }
  };

  /**
   * Handle password input changes
   * Updates password state and clears any existing password errors
   * @param {string} text - New password value
   */
  const handlePasswordChange = (text) => {
    setPassword(text);
    if (passwordError) {
      setPasswordError(false);
      setPasswordErrorMessage('');
    }
  };

  /**
   * Handle authentication responses from server
   * Processes login success/failure and manages user session
   * @param {Object} data - Server response data
   */
  const handleAuthResponse = async (data) => {
    if (data.type === 'LOGIN_SUCCESS') {
      setMessageType('success');
      setMessage('Login successful!');


      // Save user session with authentication data
      const userData = {
        email: data.userId || email,
        name: data.name || 'User',
        timestamp: new Date().toISOString()
      };
      await sessionService.saveSession(userData);

      setTimeout(() => {
        navigation.navigate('Main');
      }, 1200);
    } else if (data.type === 'LOGIN_FAIL') {
      setMessageType('error');
      setMessage(data.reason || 'Login failed.');
    }
  };

  /**
   * Handle WebSocket connection errors
   * Shows user-friendly error message for connection issues
   */
  const handleConnectionError = () => {
    setMessageType('error');
    setMessage('Connection error. Please try again.');
  }

  /**
   * Handle email/password login submission
   * Validates form inputs and sends authentication request to server
   */
  const handleLogin = () => {
    setMessage('');
    setMessageType('');
    let hasError = false;

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

    connectAndSend({ type: 'LOGIN', email, password }, handleAuthResponse, handleConnectionError);
  };


  /**
   * Render the login screen with form and authentication options
   * Includes email/password form, Google OAuth, and navigation links
   */
  return (
    <View style={{ flex: 1, backgroundColor: '#F0F4F8' }}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <StatusBar style="dark" />

        {/* App Header with Logo and Title */}
        <View style={styles.header}>
          <Image source={Logo} style={styles.logo} />
          <Text style={styles.headerTitle}>Smart Garden</Text>
          <Text style={styles.headerSubtitle}>Grow smarter. Care easier</Text>
        </View>

        {/* Login Form Container */}
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

          <TouchableOpacity onPress={() => navigation.navigate('ForgotPassword')}>
            <Text style={styles.forgotPassword}>Forgot Password?</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.signInButton, !isConnected && styles.disabledButton]}
            onPress={handleLogin}
            disabled={!isConnected}
          >
            <Text style={styles.signInButtonText}>Sign In</Text>
          </TouchableOpacity>
          {message ? (
            <Text
              style={[
                styles.message,
                messageType === 'success' ? styles.messageSuccess : styles.messageError,
              ]}
            >
              {message}
            </Text>
          ) : null}
        </View>

        {/* Footer with Registration Link */}
        <View style={styles.footer}>
          <Text style={styles.footerText}>Don't have an account? </Text>
          <TouchableOpacity onPress={() => navigation.navigate('Register')}>
            <Text style={styles.signUpText}>Sign Up</Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </View>
  );
};

export default LoginScreen; 