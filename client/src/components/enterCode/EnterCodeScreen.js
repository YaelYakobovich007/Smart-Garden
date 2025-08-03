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
import { useNavigation, useRoute } from '@react-navigation/native';

import { styles } from './styles';
import { connectAndSend } from '../../services/authService';
import websocketService from '../../services/websocketService';
import Logo from '../../../assets/images/Smart_Garden_Logo.png';

const EnterCodeScreen = () => {
    const navigation = useNavigation();
    const route = useRoute();

    const [resetCode, setResetCode] = useState('');
    const [message, setMessage] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [isConnected, setIsConnected] = useState(false);
    const [userEmail, setUserEmail] = useState('');

    // Error states
    const [codeError, setCodeError] = useState(false);
    const [codeErrorMessage, setCodeErrorMessage] = useState('');

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

    // --- GET EMAIL FROM ROUTE ---
    useEffect(() => {
        const email = route.params?.email;
        if (email) {
            setUserEmail(email);
        }
    }, [route.params]);

    // --- CODE VALIDATION ---
    const validateCode = (codeToValidate) => {
        console.log('validateCode called with:', codeToValidate);
        if (!isConnected) {
            setMessage('Not connected to server. Please wait...');
            console.log('Not connected to server.');
            return;
        }

        setIsLoading(true);
        console.log('Sending VALIDATE_RESET_TOKEN to server...');
        connectAndSend(
            { type: 'VALIDATE_RESET_TOKEN', token: codeToValidate },
            handleCodeValidationResponse,
            handleConnectionError
        );
    };

    const handleCodeValidationResponse = (data) => {
        setIsLoading(false);
        console.log('handleCodeValidationResponse:', data);
        if (data.type === 'VALIDATE_RESET_TOKEN_SUCCESS') {
            if (data.valid) {
                setMessage('Code is valid! Redirecting to password reset...');
                console.log('Code valid, navigating to ResetPassword with:', resetCode, data.email);
                navigation.navigate('ResetPassword', {
                    token: resetCode,
                    email: data.email
                });
            } else {
                setCodeError(true);
                setCodeErrorMessage('This reset code is invalid or has expired.');
                console.log('Code invalid or expired.');
            }
        } else {
            setMessage('Failed to validate reset code.');
            console.log('Failed to validate reset code:', data);
        }
    };

    const handleConnectionError = () => {
        setIsLoading(false);
        setMessage('Connection error. Please try again.');
    };

    const handleSubmitCode = () => {
        setMessage('');
        setCodeError(false);
        setCodeErrorMessage('');
        console.log('handleSubmitCode called with:', resetCode);
        // Validate code format
        if (!resetCode || resetCode.length !== 6) {
            setCodeError(true);
            setCodeErrorMessage('Please enter a 6-digit code');
            console.log('Code format error: not 6 digits');
            return;
        }

        if (!/^\d{6}$/.test(resetCode)) {
            setCodeError(true);
            setCodeErrorMessage('Code must contain only numbers');
            console.log('Code format error: not numeric');
            return;
        }

        console.log('Code format valid, calling validateCode...');
        validateCode(resetCode);
    };

    const handleResendCode = () => {
        if (!userEmail) {
            setMessage('Email not found. Please go back and try again.');
            return;
        }

        setIsLoading(true);
        setMessage('Sending new code...');

        connectAndSend(
            { type: 'FORGOT_PASSWORD', email: userEmail },
            (data) => {
                setIsLoading(false);
                if (data.type === 'FORGOT_PASSWORD_SUCCESS') {
                    setMessage('New code sent to your email!');
                    setResetCode('');
                    setCodeError(false);
                    setCodeErrorMessage('');
                } else {
                    setMessage(data.reason || 'Failed to send new code.');
                }
            },
            () => {
                setIsLoading(false);
                setMessage('Connection error. Please try again.');
            }
        );
    };

    const handleBackToForgotPassword = () => {
        navigation.navigate('ForgotPassword');
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
                        onPress={handleBackToForgotPassword}
                    >
                        <Feather name="arrow-left" size={24} color="#333" />
                    </TouchableOpacity>
                    <Image source={Logo} style={styles.logo} />
                    <Text style={styles.headerTitle}>Smart Garden</Text>
                </View>

                {/* Form Container */}
                <View style={styles.formContainer}>
                    <Text style={styles.welcomeTitle}>Enter Reset Code</Text>
                    <Text style={styles.welcomeSubtitle}>
                        {userEmail
                            ? `Enter the 6-digit code sent to ${userEmail}`
                            : 'Enter the 6-digit code from your email'
                        }
                    </Text>

                    {/* Reset Code Input */}
                    <View style={[
                        styles.inputContainer,
                        codeError && styles.inputError
                    ]}>
                        <Feather name="key" size={20} color={codeError ? "#D32F2F" : "#888"} style={styles.inputIcon} />
                        <TextInput
                            style={styles.input}
                            placeholder="Enter 6-digit code"
                            placeholderTextColor="#888"
                            value={resetCode}
                            onChangeText={(text) => {
                                setResetCode(text.replace(/[^0-9]/g, '').slice(0, 6));
                                if (codeError) {
                                    setCodeError(false);
                                    setCodeErrorMessage('');
                                }
                            }}
                            keyboardType="numeric"
                            maxLength={6}
                            editable={!isLoading}
                            autoFocus={true}
                        />
                    </View>
                    {codeErrorMessage ? <Text style={styles.fieldError}>{codeErrorMessage}</Text> : null}

                    {/* Submit Button */}
                    <TouchableOpacity
                        style={[
                            styles.signInButton,
                            (!isConnected || isLoading || resetCode.length !== 6) && styles.disabledButton
                        ]}
                        onPress={handleSubmitCode}
                        disabled={!isConnected || isLoading || resetCode.length !== 6}
                    >
                        <Text style={styles.signInButtonText}>
                            {isLoading ? 'Validating...' : 'Verify Code'}
                        </Text>
                    </TouchableOpacity>

                    {/* Resend Code Button */}
                    <TouchableOpacity
                        style={styles.resendButton}
                        onPress={handleResendCode}
                        disabled={isLoading}
                    >
                        <Text style={styles.resendButtonText}>
                            {isLoading ? 'Sending...' : 'Resend Code'}
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

export default EnterCodeScreen; 