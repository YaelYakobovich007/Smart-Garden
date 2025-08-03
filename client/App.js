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
import { View, ActivityIndicator } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { useFonts as useNunito, Nunito_400Regular, Nunito_500Medium, Nunito_700Bold } from '@expo-google-fonts/nunito';

// Import all screen components
import LoginScreen from './src/components/login/LoginScreen';
import RegisterScreen from './src/components/register/RegisterScreen';
import MainScreen from './src/components/main/MainScreen';
import PlantDetail from './src/components/main/PlantDetail/PlantDetail';
import AddPlantScreen from './src/components/addPlant/AddPlantScreen';
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
        
        // Check if user is already logged in locally using session service
        const isLoggedIn = await sessionService.isLoggedIn();
        
        if (isLoggedIn) {
          console.log('App: Local session found, navigating to Main immediately');
          // Navigate to Main immediately if we have a local session (like Instagram)
          setInitialRoute('Main');
          setIsLoading(false);
          
          // Try to establish WebSocket connection in background for real-time features
          console.log('App: Attempting WebSocket connection in background...');
          websocketService.connect();
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
    return () => {
      console.log('App closing, disconnecting WebSocket...');
      websocketService.offConnectionChange(handleConnectionChange);
      websocketService.disconnect();
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
      <NavigationContainer ref={navigationRef}>
        <Stack.Navigator
          screenOptions={{ headerShown: false }}
          initialRouteName={initialRoute}
        >
          <Stack.Screen name="Onboarding" component={OnboardingScreen} />
          <Stack.Screen name="Login" component={LoginScreen} />
          <Stack.Screen name="Register" component={RegisterScreen} />
          <Stack.Screen name="Main" component={MainScreen} />
          <Stack.Screen name="PlantDetail" component={PlantDetail} />
          <Stack.Screen name="AddPlant" component={AddPlantScreen} />
          <Stack.Screen name="Settings" component={SettingsScreen} />
          <Stack.Screen name="Notification" component={NotificationScreen} />
          <Stack.Screen name="ArticleDetails" component={ArticleDetails} />
          <Stack.Screen name="ArticlesList" component={ArticlesList} />
          <Stack.Screen name="ForecastScreen" component={ForecastScreen} />
        </Stack.Navigator>
      </NavigationContainer>
    </SafeAreaProvider>
  );
}
