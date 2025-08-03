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
    Alert,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { Feather } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';

import { styles } from './styles';
import { connectAndSend } from '../../services/authService';
import websocketService from '../../services/websocketService';
import Logo from '../../../assets/images/Smart_Garden_Logo.png';

const ForgotPasswordScreen = () => {
    const navigation = useNavigation();
    const [email, setEmail] = useState('');
    const [message, setMessage] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [isConnected, setIsConnected] = useState(false);
    const [emailError, setEmailError] = useState(false);
    const [emailErrorMessage, setEmailErrorMessage] = useState('');

    // --- CONNECTION STATUS ---
    useEffect(() => {
        setIsConnected(websocketService.isConnected());

        const handleConnectionChange = (connected) => {
            setIsConnected(connected);
            if (!connected) {
                setMessage('Connection lost. Please check your network.');
            }
        };

        websocketService.onConnectionChange(handleConnectionChange);
    }, []);

    const handleEmailChange = (text) => {
        setEmail(text);
        if (emailError) {
            setEmailError(false);
            setEmailErrorMessage('');
        }
    };

    // --- FORGOT PASSWORD LOGIC ---
    const handleForgotPasswordResponse = (data) => {
        console.log('handleForgotPasswordResponse called with:', data);
        setIsLoading(false);
        console.log('aa');

        if (data.type === 'FORGOT_PASSWORD_SUCCESS') {
            setMessage('Password reset code has been sent to your email.');
            console.log('Navigating to EnterCode with email:', email.trim());
            navigation.navigate('EnterCode', { email: email.trim() });
        } else if (data.type === 'FORGOT_PASSWORD_FAIL') {
            setMessage(data.reason || 'Failed to send password reset code.');
        }
    };

    const handleConnectionError = () => {
        setIsLoading(false);
        setMessage('Connection error. Please try again.');
    };

    const handleForgotPassword = () => {
        setMessage('');
        let hasError = false;

        // Validate email
        if (!email.trim()) {
            setEmailError(true);
            setEmailErrorMessage('Email field is required');
            hasError = true;
        } else if (!email.includes('@')) {
            setEmailError(true);
            setEmailErrorMessage('Please enter a valid email address');
            hasError = true;
        }

        if (hasError) {
            return;
        }

        if (!isConnected) {
            setMessage('Not connected to server. Please wait...');
            return;
        }

        setIsLoading(true);

        // Send forgot password request
        connectAndSend(
            { type: 'FORGOT_PASSWORD', email: email.trim() },
            handleForgotPasswordResponse,
            handleConnectionError
        );
    };

    const handleBackToLogin = () => {
        navigation.navigate('Login');
    };

    // --- UI RENDERING ---
    return (
        <SafeAreaView style={styles.container}>
            <KeyboardAvoidingView
                style={{ flex: 1 }}
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            >
                <StatusBar style="dark" />

                {/* Header */}
                <View style={styles.header}>
                    <TouchableOpacity
                        style={styles.backButton}
                        onPress={handleBackToLogin}
                    >
                        <Feather name="arrow-left" size={24} color="#333" />
                    </TouchableOpacity>
                    <Image source={Logo} style={styles.logo} />
                    <Text style={styles.headerTitle}>Smart Garden</Text>
                </View>

                {/* Form Container */}
                <View style={styles.formContainer}>
                    <Text style={styles.welcomeTitle}>Forgot Password</Text>
                    <Text style={styles.welcomeSubtitle}>
                        Enter your email address and we'll send you a link to reset your password
                    </Text>

                    {/* Email Input */}
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
                            editable={!isLoading}
                        />
                    </View>
                    {emailErrorMessage ? <Text style={styles.fieldError}>{emailErrorMessage}</Text> : null}

                    {/* Submit Button */}
                    <TouchableOpacity
                        style={[
                            styles.signInButton,
                            (!isConnected || isLoading) && styles.disabledButton
                        ]}
                        onPress={handleForgotPassword}
                        disabled={!isConnected || isLoading}
                    >
                        <Text style={styles.signInButtonText}>
                            {isLoading ? 'Sending...' : 'Send Reset Link'}
                        </Text>
                    </TouchableOpacity>

                    {/* Message */}
                    {message ? <Text style={styles.message}>{message}</Text> : null}

                    {/* Back to Login */}
                    <TouchableOpacity
                        style={styles.backToLoginButton}
                        onPress={handleBackToLogin}
                    >
                        <Text style={styles.backToLoginText}>Back to Login</Text>
                    </TouchableOpacity>
                </View>
            </KeyboardAvoidingView>
        </SafeAreaView>
    );
};

export default ForgotPasswordScreen; 