/**
 * Main App Component - Smart Garden Mobile Application
 * 
 * This is the root component of the Smart Garden app that handles:
 * - Navigation setup and routing
 * - Session management and authentication
 * - WebSocket connection management
 * - Font loading and app initialization
 * 
 * The app uses React Navigation for screen management and maintains
 * persistent user sessions like Instagram (90-day sessions).
 */

import React, { useEffect, useRef, useState } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { View, ActivityIndicator, Linking } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { useFonts as useNunito, Nunito_400Regular, Nunito_500Medium, Nunito_700Bold } from '@expo-google-fonts/nunito';

// Import context providers
import { IrrigationProvider } from './src/contexts/IrrigationContext';

// Import all screen components
import LoginScreen from './src/components/login/LoginScreen';
import ForgotPasswordScreen from './src/components/forgotPassword/ForgotPasswordScreen';
import EnterCodeScreen from './src/components/enterCode/EnterCodeScreen';
import ResetPasswordScreen from './src/components/resetPassword/ResetPasswordScreen';
import RegisterScreen from './src/components/register/RegisterScreen';
import MainScreen from './src/components/main/MainScreen';
import PlantDetail from './src/components/main/PlantDetail/PlantDetail';
import AddPlantScreen from './src/components/addPlant/AddPlantScreen';
import SensorPlacementScreen from './src/components/addPlant/SensorPlacement/SensorPlacementScreen';
import TapPlacementScreen from './src/components/addPlant/TapPlacement/TapPlacementScreen';
import SettingsScreen from './src/components/main/SettingsScreen/SettingsScreen';
import NotificationScreen from './src/components/notification/NotificationScreen';
import ArticleDetails from './src/components/main/Articles/ArticleDetails/ArticleDetails';
import ArticlesList from './src/components/main/Articles/ArticlesList/ArticlesList';
import OnboardingScreen from './src/components/onboarding/OnboardingScreen';
import ForecastScreen from './src/components/ForecastScreen/ForecastScreen';

// Import services
import websocketService from './src/services/websocketService';
import sessionService from './src/services/sessionService';
import onboardingService from './src/services/onboardingService';

const Stack = createNativeStackNavigator();

export default function App() {
  // State management for app initialization and connection status
  const [isConnected, setIsConnected] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [initialRoute, setInitialRoute] = useState('Login');
  const navigationRef = useRef(null);

  /**
   * Load Nunito fonts for consistent typography throughout the app
   * Uses Expo's font loading system for better performance
   */
  // Load Nunito fonts using the pattern from the user's example
  const [fontsLoaded] = useNunito({
    Nunito_400Regular,
    Nunito_500Medium,
    Nunito_700Bold
  });

  /**
   * Main app initialization effect
   * Handles session checking, WebSocket connection, and route determination
   */
  useEffect(() => {
    /**
     * Initialize the app by checking for existing sessions and establishing connections
     * This function determines whether to show Onboarding, Login, or Main screen based on state
     */
    const initializeApp = async () => {
      try {
        // First check if user has completed onboarding
        const onboardingCompleted = await onboardingService.isOnboardingCompleted();

        if (!onboardingCompleted) {
          console.log('App: Onboarding not completed, showing onboarding first');
          setInitialRoute('Onboarding');
          setIsLoading(false);
          return;
        }


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

          // Still try to connect WebSocket for when user logs in
          websocketService.connect();
        }
      } catch (error) {
        console.error('Error initializing app:', error);
        setInitialRoute('Login');
        setIsLoading(false);
      }
    };

    // Start app initialization
    initializeApp();

    /**
     * Handle WebSocket connection status changes
     * Updates the app's connection state for UI feedback
     */
    const handleConnectionChange = (connected) => {
      console.log('App: WebSocket connection status:', connected ? 'Connected' : 'Disconnected');
      setIsConnected(connected);
    };

    // Listen for WebSocket connection changes
    websocketService.onConnectionChange(handleConnectionChange);

    /**
     * Cleanup function to disconnect WebSocket when app is closed
     * Prevents memory leaks and ensures clean shutdown
     */
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

  /**
   * Show loading screen while checking session or loading fonts
   * Provides visual feedback during app initialization
   */
  if (isLoading || !fontsLoaded) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#F8F9FA' }}>
        <ActivityIndicator size="large" color="#4CAF50" />
      </View>
    );
  }

  /**
   * Main app render with navigation setup
   * Uses React Navigation for screen management with all app screens
   */
  return (
    <SafeAreaProvider>
      <IrrigationProvider>
        <NavigationContainer ref={navigationRef}>
        <Stack.Navigator
          screenOptions={{ headerShown: false }}
          initialRouteName={initialRoute}
        >
          <Stack.Screen name="Onboarding" component={OnboardingScreen} />
          <Stack.Screen name="Login" component={LoginScreen} />
          <Stack.Screen name="ForgotPassword" component={ForgotPasswordScreen} />
          <Stack.Screen name="EnterCode" component={EnterCodeScreen} />
          <Stack.Screen name="ResetPassword" component={ResetPasswordScreen} />
          <Stack.Screen name="Register" component={RegisterScreen} />
          <Stack.Screen name="Main" component={MainScreen} />
          <Stack.Screen name="PlantDetail" component={PlantDetail} />
          <Stack.Screen name="SensorPlacement" component={SensorPlacementScreen} />
          <Stack.Screen name="TapPlacement" component={TapPlacementScreen} />
          <Stack.Screen name="AddPlant" component={AddPlantScreen} />
          <Stack.Screen name="Settings" component={SettingsScreen} />
          <Stack.Screen name="Notification" component={NotificationScreen} />
          <Stack.Screen name="ArticleDetails" component={ArticleDetails} />
          <Stack.Screen name="ArticlesList" component={ArticlesList} />
          <Stack.Screen name="ForecastScreen" component={ForecastScreen} />
        </Stack.Navigator>
        </NavigationContainer>
      </IrrigationProvider>
    </SafeAreaProvider>

  );
}
