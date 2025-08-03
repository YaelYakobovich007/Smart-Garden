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
import { useNavigation, useRoute } from '@react-navigation/native';

import { styles } from './styles';
import { connectAndSend } from '../../services/authService';
import websocketService from '../../services/websocketService';
import Logo from '../../../assets/images/Smart_Garden_Logo.png';

const ResetPasswordScreen = () => {
    const navigation = useNavigation();
    const route = useRoute();

    const [token, setToken] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [message, setMessage] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [isConnected, setIsConnected] = useState(false);
    const [isTokenValid, setIsTokenValid] = useState(false);
    const [userEmail, setUserEmail] = useState('');

    // Password visibility
    const [showNewPassword, setShowNewPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);

    // Error states
    const [passwordError, setPasswordError] = useState(false);
    const [confirmPasswordError, setConfirmPasswordError] = useState(false);
    const [passwordErrorMessage, setPasswordErrorMessage] = useState('');
    const [confirmPasswordErrorMessage, setConfirmPasswordErrorMessage] = useState('');

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

    // --- TOKEN EXTRACTION ---
    useEffect(() => {
        // Extract token from route params
        const routeToken = route.params?.token;
        const routeEmail = route.params?.email;

        if (routeToken) {
            setToken(routeToken);
            setIsTokenValid(true); // Code was already validated in EnterCodeScreen
        }

        if (routeEmail) {
            setUserEmail(routeEmail);
        }
    }, [route.params]);

    // --- PASSWORD VALIDATION ---
    const validatePassword = (password) => {
        if (password.length < 8) {
            return 'Password must be at least 8 characters long';
        }
        if (!/[a-zA-Z]/.test(password)) {
            return 'Password must contain at least one letter';
        }
        if (!/[0-9]/.test(password)) {
            return 'Password must contain at least one number';
        }
        return null;
    };

    const handleNewPasswordChange = (text) => {
        setNewPassword(text);
        if (passwordError) {
            setPasswordError(false);
            setPasswordErrorMessage('');
        }
    };

    const handleConfirmPasswordChange = (text) => {
        setConfirmPassword(text);
        if (confirmPasswordError) {
            setConfirmPasswordError(false);
            setConfirmPasswordErrorMessage('');
        }
    };

    // --- RESET PASSWORD LOGIC ---
    const handleResetPasswordResponse = (data) => {
        setIsLoading(false);

        if (data.type === 'RESET_PASSWORD_SUCCESS') {
            setMessage('Password has been reset successfully!');
            Alert.alert(
                'Success',
                'Your password has been reset successfully. You can now log in with your new password.',
                [
                    {
                        text: 'OK',
                        onPress: () => navigation.navigate('Login')
                    }
                ]
            );
        } else if (data.type === 'RESET_PASSWORD_FAIL') {
            setMessage(data.reason || 'Failed to reset password.');
        }
    };

    const handleConnectionError = () => {
        setIsLoading(false);
        setMessage('Connection error. Please try again.');
    };

    const handleResetPassword = () => {
        setMessage('');
        let hasError = false;

        // Validate new password
        const passwordValidation = validatePassword(newPassword);
        if (passwordValidation) {
            setPasswordError(true);
            setPasswordErrorMessage(passwordValidation);
            hasError = true;
        }

        // Validate confirm password
        if (newPassword !== confirmPassword) {
            setConfirmPasswordError(true);
            setConfirmPasswordErrorMessage('Passwords do not match');
            hasError = true;
        }

        if (hasError) {
            return;
        }

        if (!isConnected) {
            setMessage('Not connected to server. Please wait...');
            return;
        }

        if (!isTokenValid) {
            setMessage('Invalid reset token. Please request a new one.');
            return;
        }

        setIsLoading(true);

        // Send reset password request
        connectAndSend(
            {
                type: 'RESET_PASSWORD',
                token: token,
                newPassword: newPassword
            },
            handleResetPasswordResponse,
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
                    <Text style={styles.welcomeTitle}>Reset Password</Text>
                    <Text style={styles.welcomeSubtitle}>
                        {isTokenValid
                            ? `Enter your new password for ${userEmail}`
                            : 'Please enter your new password'
                        }
                    </Text>

                    {isTokenValid ? (
                        <>
                            {/* New Password Input */}
                            <View style={[
                                styles.inputContainer,
                                passwordError && styles.inputError
                            ]}>
                                <Feather name="lock" size={20} color={passwordError ? "#D32F2F" : "#888"} style={styles.inputIcon} />
                                <TextInput
                                    style={styles.input}
                                    placeholder="New password"
                                    placeholderTextColor="#888"
                                    value={newPassword}
                                    onChangeText={handleNewPasswordChange}
                                    secureTextEntry={!showNewPassword}
                                    editable={!isLoading}
                                />
                                <TouchableOpacity onPress={() => setShowNewPassword(!showNewPassword)}>
                                    <Feather name={showNewPassword ? 'eye-off' : 'eye'} size={20} color={passwordError ? "#D32F2F" : "#888"} />
                                </TouchableOpacity>
                            </View>
                            {passwordErrorMessage ? <Text style={styles.fieldError}>{passwordErrorMessage}</Text> : null}

                            {/* Confirm Password Input */}
                            <View style={[
                                styles.inputContainer,
                                confirmPasswordError && styles.inputError
                            ]}>
                                <Feather name="lock" size={20} color={confirmPasswordError ? "#D32F2F" : "#888"} style={styles.inputIcon} />
                                <TextInput
                                    style={styles.input}
                                    placeholder="Confirm new password"
                                    placeholderTextColor="#888"
                                    value={confirmPassword}
                                    onChangeText={handleConfirmPasswordChange}
                                    secureTextEntry={!showConfirmPassword}
                                    editable={!isLoading}
                                />
                                <TouchableOpacity onPress={() => setShowConfirmPassword(!showConfirmPassword)}>
                                    <Feather name={showConfirmPassword ? 'eye-off' : 'eye'} size={20} color={confirmPasswordError ? "#D32F2F" : "#888"} />
                                </TouchableOpacity>
                            </View>
                            {confirmPasswordErrorMessage ? <Text style={styles.fieldError}>{confirmPasswordErrorMessage}</Text> : null}

                            {/* Submit Button */}
                            <TouchableOpacity
                                style={[
                                    styles.signInButton,
                                    (!isConnected || isLoading) && styles.disabledButton
                                ]}
                                onPress={handleResetPassword}
                                disabled={!isConnected || isLoading}
                            >
                                <Text style={styles.signInButtonText}>
                                    {isLoading ? 'Resetting...' : 'Reset Password'}
                                </Text>
                            </TouchableOpacity>
                        </>
                    ) : (
                        <View style={styles.loadingContainer}>
                            <Text style={styles.loadingText}>Please enter your new password</Text>
                        </View>
                    )}

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

export default ResetPasswordScreen; 