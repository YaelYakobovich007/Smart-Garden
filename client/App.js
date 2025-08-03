import React, { useEffect, useRef, useState } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { View, ActivityIndicator, Linking } from 'react-native';
import { useFonts as useNunito, Nunito_400Regular, Nunito_500Medium, Nunito_700Bold } from '@expo-google-fonts/nunito';

import LoginScreen from './src/components/login/LoginScreen';
import ForgotPasswordScreen from './src/components/forgotPassword/ForgotPasswordScreen';
import EnterCodeScreen from './src/components/enterCode/EnterCodeScreen';
import ResetPasswordScreen from './src/components/resetPassword/ResetPasswordScreen';
import RegisterScreen from './src/components/register/RegisterScreen';
import MainScreen from './src/components/main/MainScreen';
import PlantDetail from './src/components/main/PlantDetail/PlantDetail';
import AddPlantScreen from './src/components/addPlant/AddPlantScreen';
import SettingsScreen from './src/components/main/SettingsScreen/SettingsScreen';
import NotificationScreen from './src/components/notification/NotificationScreen';
import websocketService from './src/services/websocketService';
import sessionService from './src/services/sessionService';

const Stack = createNativeStackNavigator();

export default function App() {
  const [isConnected, setIsConnected] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [initialRoute, setInitialRoute] = useState('Login');
  const navigationRef = useRef(null);

  // Load Nunito fonts using the pattern from the user's example
  const [fontsLoaded] = useNunito({
    Nunito_400Regular,
    Nunito_500Medium,
    Nunito_700Bold
  });

  useEffect(() => {
    // Check for existing session and establish WebSocket connection
    const initializeApp = async () => {
      try {
        // Check if user is already logged in locally
        const isLoggedIn = await sessionService.isLoggedIn();

        // Establish WebSocket connection first
        console.log('App: Initializing WebSocket connection...');
        websocketService.connect();

        if (isLoggedIn) {
          console.log('App: Local session found, validating with server...');

          // Wait for WebSocket connection before validating session
          const checkConnection = () => {
            if (websocketService.isConnected()) {
              // Validate session with server by requesting user name
              websocketService.sendMessage({ type: 'GET_USER_NAME' });

              // Set up a timeout to handle server response
              const validationTimeout = setTimeout(() => {
                console.log('App: Session validation timeout, redirecting to login');
                setInitialRoute('Login');
                setIsLoading(false);
              }, 3000); // 3 second timeout

              // Listen for session validation response
              const handleValidation = (data) => {
                clearTimeout(validationTimeout);
                websocketService.offMessage('GET_USER_NAME_SUCCESS', handleValidation);
                websocketService.offMessage('GET_USER_NAME_FAIL', handleValidation);
                websocketService.offMessage('UNAUTHORIZED', handleUnauthorized);

                if (data.type === 'GET_USER_NAME_SUCCESS') {
                  console.log('App: Session validated successfully, navigating to Main');
                  setInitialRoute('Main');
                } else {
                  console.log('App: Session validation failed, redirecting to login');
                  sessionService.clearSession(); // Clear invalid session
                  setInitialRoute('Login');
                }
                setIsLoading(false);
              };

              const handleUnauthorized = (data) => {
                clearTimeout(validationTimeout);
                websocketService.offMessage('GET_USER_NAME_SUCCESS', handleValidation);
                websocketService.offMessage('GET_USER_NAME_FAIL', handleValidation);
                websocketService.offMessage('UNAUTHORIZED', handleUnauthorized);

                console.log('App: Unauthorized response, clearing session and redirecting to login');
                sessionService.clearSession(); // Clear invalid session
                setInitialRoute('Login');
                setIsLoading(false);
              };

              websocketService.onMessage('GET_USER_NAME_SUCCESS', handleValidation);
              websocketService.onMessage('GET_USER_NAME_FAIL', handleValidation);
              websocketService.onMessage('UNAUTHORIZED', handleUnauthorized);
            } else {
              // If not connected yet, try again in 500ms
              setTimeout(checkConnection, 500);
            }
          };

          checkConnection();
        } else {
          console.log('App: No local session found, navigating to Login');
          setInitialRoute('Login');
          setIsLoading(false);
        }
      } catch (error) {
        console.error('Error initializing app:', error);
        setInitialRoute('Login');
        setIsLoading(false);
      }
    };

    initializeApp();

    // Listen for connection status changes
    const handleConnectionChange = (connected) => {
      console.log('App: WebSocket connection status:', connected ? 'Connected' : 'Disconnected');
      setIsConnected(connected);
    };

    websocketService.onConnectionChange(handleConnectionChange);

    // Handle deep links
    const handleDeepLink = (url) => {
      if (url) {
        console.log('App: Received deep link:', url);
        // Extract token from URL
        const token = extractTokenFromUrl(url);
        if (token) {
          console.log('App: Token extracted from deep link:', token);
          // Navigate to reset password screen with token
          navigationRef.current?.navigate('ResetPassword', { token });
        }
      }
    };

    const extractTokenFromUrl = (url) => {
      try {
        const urlObj = new URL(url);
        return urlObj.searchParams.get('token');
      } catch (error) {
        console.error('Error extracting token from URL:', error);
        return null;
      }
    };

    // Set up deep link listeners
    const subscription = Linking.addEventListener('url', ({ url }) => {
      handleDeepLink(url);
    });

    // Check for initial deep link
    Linking.getInitialURL().then((url) => {
      if (url) {
        handleDeepLink(url);
      }
    });

    // Cleanup function to disconnect when app is closed
    return () => {
      console.log('App closing, disconnecting WebSocket...');
      websocketService.offConnectionChange(handleConnectionChange);
      websocketService.disconnect();
      subscription?.remove();
    };
  }, []);

  // Show loading screen while checking session or loading fonts
  if (isLoading || !fontsLoaded) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#F8F9FA' }}>
        <ActivityIndicator size="large" color="#4CAF50" />
      </View>
    );
  }

  return (
    <NavigationContainer ref={navigationRef}>
      <Stack.Navigator
        screenOptions={{ headerShown: false }}
        initialRouteName={initialRoute}
      >
        <Stack.Screen name="Login" component={LoginScreen} />
        <Stack.Screen name="ForgotPassword" component={ForgotPasswordScreen} />
        <Stack.Screen name="EnterCode" component={EnterCodeScreen} />
        <Stack.Screen name="ResetPassword" component={ResetPasswordScreen} />
        <Stack.Screen name="Register" component={RegisterScreen} />
        <Stack.Screen name="Main" component={MainScreen} />
        <Stack.Screen name="PlantDetail" component={PlantDetail} />
        <Stack.Screen name="AddPlant" component={AddPlantScreen} />
        <Stack.Screen name="Settings" component={SettingsScreen} />
        <Stack.Screen name="Notification" component={NotificationScreen} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}
