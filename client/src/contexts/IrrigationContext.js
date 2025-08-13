import React, { createContext, useContext, useState, useEffect } from 'react';
import { Alert } from 'react-native';
import websocketService from '../services/websocketService';

const IrrigationContext = createContext();

export const useIrrigation = () => {
  const context = useContext(IrrigationContext);
  if (!context) {
    throw new Error('useIrrigation must be used within an IrrigationProvider');
  }
  return context;
};

export const IrrigationProvider = ({ children }) => {
  // Global irrigation state
  const [isWateringActive, setIsWateringActive] = useState(false);
  const [wateringTimeLeft, setWateringTimeLeft] = useState(0);
  const [isManualMode, setIsManualMode] = useState(false);
  const [selectedTime, setSelectedTime] = useState(10);
  const [currentPlant, setCurrentPlant] = useState(null);
  const [timerInterval, setTimerInterval] = useState(null);
  const [pendingValveRequest, setPendingValveRequest] = useState(false);

  // Countdown timer effect
  useEffect(() => {
    let interval;
    if (isWateringActive && wateringTimeLeft > 0 && !pendingValveRequest) {
      interval = setInterval(() => {
        setWateringTimeLeft(prev => {
          if (prev <= 1) {
            setIsWateringActive(false);
            handleStopWatering();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
      setTimerInterval(interval);
    }
    return () => {
      if (interval) {
        clearInterval(interval);
      }
    };
  }, [isWateringActive, wateringTimeLeft, pendingValveRequest]);

  // Format time as MM:SS
  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // Start manual irrigation
  const startManualIrrigation = (plant, timeMinutes) => {
    if (!plant?.name) {
      Alert.alert('Error', 'Plant name is missing.');
      return;
    }

    if (!websocketService.isConnected()) {
      Alert.alert('Error', 'Not connected to server. Please check your connection and try again.');
      return;
    }

    setCurrentPlant(plant);
    setSelectedTime(timeMinutes);
    setPendingValveRequest(true);
    setIsManualMode(true);

    console.log('🔍 DEBUG - Starting manual irrigation:');
    console.log('   - Plant name:', plant.name);
    console.log('   - Selected time:', timeMinutes);
    console.log('   - WebSocket connected:', websocketService.isConnected());

    const message = {
      type: 'OPEN_VALVE',
      plantName: plant.name,
      timeMinutes: timeMinutes
    };

    console.log('📤 Sending OPEN_VALVE message:', JSON.stringify(message));
    websocketService.sendMessage(message);
  };

  // Stop irrigation
  const handleStopWatering = () => {
    console.log('🔴 handleStopWatering called');
    console.log('   - currentPlant:', currentPlant);
    console.log('   - isManualMode:', isManualMode);
    console.log('   - isWateringActive:', isWateringActive);
    
    setIsWateringActive(false);
    setIsManualMode(false);
    setWateringTimeLeft(0);
    setCurrentPlant(null);
    
    if (currentPlant?.name) {
      console.log('📤 Sending CLOSE_VALVE message for plant:', currentPlant.name);
      websocketService.sendMessage({
        type: 'CLOSE_VALVE',
        plantName: currentPlant.name
      });
    } else {
      console.log('⚠️ No current plant found, cannot send CLOSE_VALVE message');
    }
  };

  // Timer control functions
  const pauseTimer = () => {
    if (timerInterval) {
      clearInterval(timerInterval);
      setTimerInterval(null);
    }
    setIsWateringActive(false);
  };

  const resumeTimer = () => {
    setIsWateringActive(true);
    const interval = setInterval(() => {
      setWateringTimeLeft(prev => {
        if (prev <= 1) {
          setIsWateringActive(false);
          clearInterval(interval);
          setTimerInterval(null);
          handleStopWatering();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    setTimerInterval(interval);
  };

  const resetTimer = () => {
    if (timerInterval) {
      clearInterval(timerInterval);
      setTimerInterval(null);
    }
    setIsWateringActive(false);
    setWateringTimeLeft(0);
    handleStopWatering();
  };

  // WebSocket message handlers
  useEffect(() => {
    const handleOpenValveSuccess = (data) => {
      console.log('✅ OPEN_VALVE success:', data);
      
      if (pendingValveRequest) {
        setIsManualMode(true);
        setIsWateringActive(true);
        setWateringTimeLeft(selectedTime * 60);
        setPendingValveRequest(false);
        
        Alert.alert('Valve Control', data?.message || 'Valve opened successfully! Timer started.');
      }
    };

    const handleOpenValveFail = (data) => {
      console.log('❌ OPEN_VALVE failed:', data);
      
      setIsManualMode(false);
      setIsWateringActive(false);
      setWateringTimeLeft(0);
      setCurrentPlant(null);
      setPendingValveRequest(false);
      
      Alert.alert('Valve Control', data?.message || 'Failed to open valve. Timer not started.');
    };

    const handleCloseValveSuccess = (data) => {
      console.log('✅ CLOSE_VALVE success:', data);
      
      // Reset the irrigation state
      setIsManualMode(false);
      setIsWateringActive(false);
      setWateringTimeLeft(0);
      setCurrentPlant(null);
      
      // Clear any running timer
      if (timerInterval) {
        clearInterval(timerInterval);
        setTimerInterval(null);
      }
      
      Alert.alert('Valve Control', data?.message || 'Valve closed successfully!');
    };

    const handleCloseValveFail = (data) => {
      console.log('❌ CLOSE_VALVE failed:', data);
      Alert.alert('Valve Control', data?.message || 'Failed to close valve.');
    };

    websocketService.onMessage('OPEN_VALVE_SUCCESS', handleOpenValveSuccess);
    websocketService.onMessage('OPEN_VALVE_FAIL', handleOpenValveFail);
    websocketService.onMessage('CLOSE_VALVE_SUCCESS', handleCloseValveSuccess);
    websocketService.onMessage('CLOSE_VALVE_FAIL', handleCloseValveFail);

    return () => {
      websocketService.offMessage('OPEN_VALVE_SUCCESS', handleOpenValveSuccess);
      websocketService.offMessage('OPEN_VALVE_FAIL', handleOpenValveFail);
      websocketService.offMessage('CLOSE_VALVE_SUCCESS', handleCloseValveSuccess);
      websocketService.offMessage('CLOSE_VALVE_FAIL', handleCloseValveFail);
    };
  }, [pendingValveRequest, selectedTime]);

  const value = {
    // State
    isWateringActive,
    wateringTimeLeft,
    isManualMode,
    selectedTime,
    currentPlant,
    
    // Functions
    formatTime,
    startManualIrrigation,
    handleStopWatering,
    pauseTimer,
    resumeTimer,
    resetTimer,
  };

  return (
    <IrrigationContext.Provider value={value}>
      {children}
    </IrrigationContext.Provider>
  );
};
