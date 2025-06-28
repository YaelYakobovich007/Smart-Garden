import React, { useEffect, useRef, useState } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { View, ActivityIndicator } from 'react-native';
import { useFonts as useNunito, Nunito_400Regular, Nunito_500Medium, Nunito_700Bold } from '@expo-google-fonts/nunito';

import LoginScreen from './src/components/login/LoginScreen';
import RegisterScreen from './src/components/register/RegisterScreen';
import MainScreen from './src/components/main/MainScreen';
import PlantDetail from './src/components/main/PlantDetail/PlantDetail';
import AddPlantScreen from './src/components/addPlant/AddPlantScreen';
import NotificationsScreen from './src/components/main/NotificationsScreen/NotificationsScreen';
import SettingsScreen from './src/components/main/SettingsScreen/SettingsScreen';
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
        // Check if user is already logged in
        const isLoggedIn = await sessionService.isLoggedIn();
        
        // Establish WebSocket connection
        websocketService.connect();

        // Set initial route based on login status
        setInitialRoute(isLoggedIn ? 'Main' : 'Login');
      } catch (error) {
        console.error('Error initializing app:', error);
        setInitialRoute('Login');
      } finally {
        setIsLoading(false);
      }
    };

    initializeApp();

    // Listen for connection status changes
    websocketService.onConnectionChange((connected) => {
      console.log('WebSocket connection status:', connected ? 'Connected' : 'Disconnected');
      setIsConnected(connected);
    });
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
        <Stack.Screen name="Register" component={RegisterScreen} />
        <Stack.Screen name="Main" component={MainScreen} />
        <Stack.Screen name="PlantDetail" component={PlantDetail} />
        <Stack.Screen name="AddPlant" component={AddPlantScreen} />
        <Stack.Screen name="Notifications" component={NotificationsScreen} />
        <Stack.Screen name="Settings" component={SettingsScreen} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}
