import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
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
  // Per-plant irrigation state - each plant has its own watering state
  const [wateringPlants, setWateringPlants] = useState(new Map()); // Map of plantId -> watering state
  const [pendingValveRequests, setPendingValveRequests] = useState(new Set()); // Set of plantIds with pending requests
  
  // Use ref to track current state without causing re-renders
  const wateringPlantsRef = useRef(new Map());

  // Update ref whenever state changes
  useEffect(() => {
    wateringPlantsRef.current = new Map(wateringPlants);
  }, [wateringPlants]);

  // Helper function to get watering state for a specific plant
  const getPlantWateringState = (plantId) => {
    return wateringPlants.get(plantId) || {
      isWateringActive: false,
      wateringTimeLeft: 0,
      isManualMode: false,
      isSmartMode: false,
      pendingIrrigationRequest: false,
      selectedTime: 0,
      timerStartTime: null,
      timerEndTime: null,
      timerInterval: null
    };
  };

  // Helper function to update watering state for a specific plant
  const updatePlantWateringState = (plantId, updates) => {
    setWateringPlants(prev => {
      const newMap = new Map(prev);
      const currentState = newMap.get(plantId) || {
        isWateringActive: false,
        wateringTimeLeft: 0,
        isManualMode: false,
        isSmartMode: false,
        pendingIrrigationRequest: false,
        selectedTime: 0,
        timerStartTime: null,
        timerEndTime: null,
        timerInterval: null
      };
      const newState = { ...currentState, ...updates };
      newMap.set(plantId, newState);
      return newMap;
    });
  };

  // Helper function to remove watering state for a specific plant
  const removePlantWateringState = (plantId) => {
    setWateringPlants(prev => {
      const newMap = new Map(prev);
      newMap.delete(plantId);
      return newMap;
    });
  };

  // Check if any plant is currently being watered
  const isAnyPlantWatering = () => {
    return Array.from(wateringPlants.values()).some(state => state.isWateringActive);
  };

  // Get all currently watering plants
  const getWateringPlants = () => {
    return Array.from(wateringPlants.entries())
      .filter(([_, state]) => state.isWateringActive)
      .map(([plantId, state]) => ({ plantId, ...state }));
  };

  // Timer accuracy improvements
  const [timerStartTime, setTimerStartTime] = useState(null);
  const [timerEndTime, setTimerEndTime] = useState(null);

  // Countdown timer effect with improved accuracy
  useEffect(() => {
    const intervals = new Map();
    
    // Function to check and manage timers for all watering plants
    const checkAndManageTimers = () => {
      const currentWateringPlants = wateringPlantsRef.current;
      
      currentWateringPlants.forEach((state, plantId) => {
        if (state.isWateringActive && state.wateringTimeLeft > 0 && !state.pendingValveRequest && state.timerStartTime && state.timerEndTime) {
          // Only create interval if one doesn't exist
          if (!intervals.has(plantId)) {
            const interval = setInterval(() => {
              const now = Date.now();
              const remainingTime = Math.max(0, Math.ceil((state.timerEndTime - now) / 1000));
              
              if (remainingTime <= 0) {
                console.log(`⏰ Timer completed for plant ${plantId} - valve should be closed`);
                updatePlantWateringState(plantId, {
                  isWateringActive: false,
                  wateringTimeLeft: 0,
                  timerStartTime: null,
                  timerEndTime: null,
                  timerInterval: null
                });
                handleStopWatering(plantId);
                // Clear this interval
                if (intervals.has(plantId)) {
                  clearInterval(intervals.get(plantId));
                  intervals.delete(plantId);
                }
              } else {
                updatePlantWateringState(plantId, { wateringTimeLeft: remainingTime });
              }
            }, 100); // Update more frequently for better accuracy
            
            intervals.set(plantId, interval);
            updatePlantWateringState(plantId, { timerInterval: interval });
          }
        } else {
          // Clear interval if plant is no longer watering
          if (intervals.has(plantId)) {
            clearInterval(intervals.get(plantId));
            intervals.delete(plantId);
          }
        }
      });
    };
    
    // Check for new watering plants every second
    const checkInterval = setInterval(checkAndManageTimers, 1000);
    
    // Initial check
    checkAndManageTimers();
    
    return () => {
      // Clean up all intervals
      intervals.forEach((interval) => {
        if (interval) {
          clearInterval(interval);
        }
      });
      clearInterval(checkInterval);
    };
  }, []); // Empty dependency array - no infinite loop

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

    const plantId = plant.id; // Assuming plant object has an 'id' property
    updatePlantWateringState(plantId, {
      isManualMode: true,
      selectedTime: timeMinutes,
      pendingValveRequest: true,
      currentPlant: plant // Store the plant reference
    });

    // Starting manual irrigation for plant

    const message = {
      type: 'OPEN_VALVE',
      plantName: plant.name,
      timeMinutes: timeMinutes
    };

    websocketService.sendMessage(message);
  };

  // Start smart irrigation
  const startSmartIrrigation = (plant) => {
    console.log('🚰 startSmartIrrigation called for plant:', plant?.name, 'ID:', plant?.id);
    
    if (!plant?.name) {
      Alert.alert('Error', 'Plant name is missing.');
      return;
    }

    if (!websocketService.isConnected()) {
      Alert.alert('Error', 'Not connected to server. Please check your connection and try again.');
      return;
    }

    const plantId = plant.id;
    console.log('🚰 Setting watering state for plant ID:', plantId);
    
    updatePlantWateringState(plantId, {
      isManualMode: false,
      isSmartMode: true,
      pendingIrrigationRequest: true,
      currentPlant: plant,
      isWateringActive: false  // Don't show overlay until we know irrigation is needed
    });

    const message = {
      type: 'IRRIGATE_PLANT',
      plantName: plant.name
    };

    console.log('🚰 Sending IRRIGATE_PLANT message:', message);
    websocketService.sendMessage(message);
  };

  // Stop irrigation for a specific plant
  const handleStopWatering = (plantId) => {
    const state = getPlantWateringState(plantId);
    
    console.log('🛑 handleStopWatering called for plant ID:', plantId);
    console.log('🛑 Current state:', state);
    console.log('🛑 isSmartMode before clearing:', state.isSmartMode);
    console.log('🛑 isManualMode before clearing:', state.isManualMode);
    
    // IMPORTANT: Check irrigation mode BEFORE clearing the state
    const isSmartIrrigation = state.isSmartMode;
    const plantName = state.currentPlant?.name;
    
    // Clear the watering state
    updatePlantWateringState(plantId, {
      isWateringActive: false,
      isManualMode: false,
      isSmartMode: false,
      wateringTimeLeft: 0,
      timerStartTime: null,
      timerEndTime: null,
      timerInterval: null,
      pendingIrrigationRequest: false
    });
    
    // Send appropriate stop message based on irrigation type
    if (plantName) {
      if (isSmartIrrigation) {
        // For smart irrigation, send STOP_IRRIGATION message
        console.log('🛑 Stopping smart irrigation for plant:', plantName);
        websocketService.sendMessage({
          type: 'STOP_IRRIGATION',
          plantName: plantName
        });
        
        // SAFETY: Also send CLOSE_VALVE as a fallback to ensure valve closure
        console.log('🛑 Safety: Also sending CLOSE_VALVE to ensure valve closes');
        websocketService.sendMessage({
          type: 'CLOSE_VALVE',
          plantName: plantName
        });
      } else {
        // For manual irrigation, send CLOSE_VALVE message
        console.log('🛑 Stopping manual irrigation (closing valve) for plant:', plantName);
        websocketService.sendMessage({
          type: 'CLOSE_VALVE',
          plantName: plantName
        });
      }
    } else {
      console.log('🛑 No plant name available, only updating local state');
      console.log('🛑 ERROR: Cannot send stop message without plant name!');
    }
  };

  // Timer control functions
  const pauseTimer = (plantId) => {
    const state = getPlantWateringState(plantId);
    if (state.timerInterval) {
      clearInterval(state.timerInterval);
      updatePlantWateringState(plantId, { timerInterval: null });
    }
    updatePlantWateringState(plantId, { isWateringActive: false });
  };

  const resumeTimer = (plantId) => {
    const state = getPlantWateringState(plantId);
    if (state.timerStartTime && state.timerEndTime) {
      const now = Date.now();
      const remainingTime = Math.max(0, Math.ceil((state.timerEndTime - now) / 1000));
      
      if (remainingTime > 0) {
        updatePlantWateringState(plantId, { wateringTimeLeft: remainingTime, isWateringActive: true });
      } else {
        // Timer has expired
        updatePlantWateringState(plantId, { isWateringActive: false, wateringTimeLeft: 0, timerStartTime: null, timerEndTime: null });
        handleStopWatering(plantId);
      }
    }
  };

  const resetTimer = (plantId) => {
    const state = getPlantWateringState(plantId);
    if (state.timerInterval) {
      clearInterval(state.timerInterval);
      updatePlantWateringState(plantId, { timerInterval: null });
    }
    updatePlantWateringState(plantId, { isWateringActive: false, wateringTimeLeft: 0, timerStartTime: null, timerEndTime: null });
    handleStopWatering(plantId);
  };

  // WebSocket message handlers
  useEffect(() => {
    const handleOpenValveSuccess = (data) => {
      // Valve opened successfully
      
      // Find the plant by name in the watering plants
      let targetPlantId = null;
      wateringPlantsRef.current.forEach((state, plantId) => {
        if (state.pendingValveRequest) {
          targetPlantId = plantId;
        }
      });
      
      if (targetPlantId) {
        const state = wateringPlantsRef.current.get(targetPlantId);
        if (state && state.pendingValveRequest) {
          const now = Date.now();
          const durationMs = state.selectedTime * 60 * 1000; // Convert minutes to milliseconds
          
          updatePlantWateringState(targetPlantId, {
            timerStartTime: now,
            timerEndTime: now + durationMs,
            wateringTimeLeft: state.selectedTime * 60,
            pendingValveRequest: false,
            isManualMode: true,
            isWateringActive: true
          });
          
          Alert.alert('Valve Control', data?.message || 'Valve opened successfully! Timer started.');
        }
      }
    };

    const handleOpenValveFail = (data) => {
      // Failed to open valve
      
      // Find the plant by name in the watering plants
      let targetPlantId = null;
      wateringPlantsRef.current.forEach((state, plantId) => {
        if (state.pendingValveRequest) {
          targetPlantId = plantId;
        }
      });
      
      if (targetPlantId) {
        updatePlantWateringState(targetPlantId, {
          isManualMode: false,
          isWateringActive: false,
          wateringTimeLeft: 0,
          currentPlant: null,
          pendingValveRequest: false
        });
      }
      
      Alert.alert('Valve Control', data?.message || 'Failed to open valve. Timer not started.');
    };

    const handleCloseValveSuccess = (data) => {
      // Valve closed successfully
      
      // Find the plant by name in the watering plants
      let targetPlantId = null;
      wateringPlantsRef.current.forEach((state, plantId) => {
        if (state.isWateringActive || state.isManualMode) {
          targetPlantId = plantId;
        }
      });
      
      if (targetPlantId) {
        updatePlantWateringState(targetPlantId, {
          isManualMode: false,
          isWateringActive: false,
          wateringTimeLeft: 0,
          currentPlant: null,
          timerStartTime: null,
          timerEndTime: null,
          timerInterval: null
        });
      }
      
      Alert.alert('Valve Control', data?.message || 'Valve closed successfully!');
    };

    const handleCloseValveFail = (data) => {
      // Failed to close valve
      Alert.alert('Valve Control', data?.message || 'Failed to close valve.');
    };

    const handleIrrigationStarted = (data) => {
      // Smart irrigation actually started (backend now only sends this when irrigation really begins)
      console.log('🚰 IrrigationContext: IRRIGATION_STARTED received (irrigation actually began):', data);
      
      // Find the plant by name in the watering plants
      let targetPlantId = null;
      wateringPlantsRef.current.forEach((state, plantId) => {
        if (state.pendingIrrigationRequest || state.isSmartMode) {
          targetPlantId = plantId;
        }
      });
      
      if (targetPlantId) {
        console.log('🚰 IrrigationContext: Setting isWateringActive: true for plant ID:', targetPlantId);
        // First clear the pending request to hide the loader
        updatePlantWateringState(targetPlantId, {
          pendingIrrigationRequest: false
        });
        
        // Then in the next tick, update the irrigation state
        setTimeout(() => {
          updatePlantWateringState(targetPlantId, {
            isSmartMode: true,               // Keep smart mode
            isWateringActive: true,          // Show irrigation overlay
            currentPlant: data.plantName     // Update current plant
          });
        }, 0);
        
        console.log('🚰 IrrigationContext: Loading indicator should disappear, irrigation overlay should appear');
      } else {
        console.log('🚰 IrrigationContext: No target plant found for IRRIGATION_STARTED');
      }
    };

    const handleIrrigatePlantSuccess = (data) => {
      // Smart irrigation completed successfully
      
      // Find the plant by name in the watering plants
      let targetPlantId = null;
      wateringPlantsRef.current.forEach((state, plantId) => {
        if (state.isSmartMode && state.isWateringActive) {
          targetPlantId = plantId;
        }
      });
      
      if (targetPlantId) {
        updatePlantWateringState(targetPlantId, {
          isSmartMode: false,
          isWateringActive: false,
          pendingIrrigationRequest: false,
          currentPlant: null
        });
      }
      
      Alert.alert('Smart Irrigation', data?.message || 'Smart irrigation completed successfully!');
    };

    const handleIrrigatePlantFail = (data) => {
      // Smart irrigation failed
      
      // Find the plant by name in the watering plants
      let targetPlantId = null;
      wateringPlantsRef.current.forEach((state, plantId) => {
        if (state.pendingIrrigationRequest) {
          targetPlantId = plantId;
        }
      });
      
      if (targetPlantId) {
        updatePlantWateringState(targetPlantId, {
          isSmartMode: false,
          isWateringActive: false,
          pendingIrrigationRequest: false,
          currentPlant: null
        });
      }
      
      Alert.alert('Smart Irrigation', data?.message || 'Smart irrigation failed.');
    };

    const handleIrrigatePlantSkipped = (data) => {
      // Smart irrigation was skipped (not necessary)
      console.log('🔄 IrrigationContext: Irrigation skipped:', data);
      
      // Find the plant by name in the watering plants
      let targetPlantId = null;
      wateringPlantsRef.current.forEach((state, plantId) => {
        if (state.pendingIrrigationRequest || state.isSmartMode) {
          targetPlantId = plantId;
        }
      });
      
      if (targetPlantId) {
        console.log('🔄 IrrigationContext: Clearing irrigation state for skipped irrigation, plant ID:', targetPlantId);
        updatePlantWateringState(targetPlantId, {
          isSmartMode: false,
          isWateringActive: false,
          pendingIrrigationRequest: false,
          currentPlant: null
        });
        console.log('🔄 IrrigationContext: State cleared - overlay should disappear');
      } else {
        console.log('🔄 IrrigationContext: No target plant found for skipped irrigation');
      }
      
      // Show alert for user feedback
      Alert.alert('Smart Irrigation', data?.message || 'Irrigation was skipped - not necessary at this time.');
    };

    const handleIrrigationComplete = (data) => {
      // Smart irrigation completed
      
      // Find the plant by name in the watering plants
      let targetPlantId = null;
      wateringPlantsRef.current.forEach((state, plantId) => {
        if (state.isSmartMode && state.isWateringActive) {
          targetPlantId = plantId;
        }
      });
      
      if (targetPlantId) {
        updatePlantWateringState(targetPlantId, {
          isSmartMode: false,
          isWateringActive: false,
          pendingIrrigationRequest: false,
          currentPlant: null
        });
      }
    };

    const handleStopIrrigationSuccess = (data) => {
      // Smart irrigation stopped successfully
      console.log('🛑 Stop irrigation success:', data);
      
      // Find the plant by name in the watering plants
      let targetPlantId = null;
      wateringPlantsRef.current.forEach((state, plantId) => {
        if (state.isSmartMode && state.isWateringActive) {
          targetPlantId = plantId;
        }
      });
      
      if (targetPlantId) {
        updatePlantWateringState(targetPlantId, {
          isSmartMode: false,
          isWateringActive: false,
          pendingIrrigationRequest: false,
          currentPlant: null
        });
      }
      
      Alert.alert('Smart Irrigation', data?.message || 'Smart irrigation stopped successfully!');
    };

    const handleStopIrrigationFail = (data) => {
      // Smart irrigation stop failed
      console.log('🛑 Stop irrigation failed:', data);
      
      Alert.alert('Smart Irrigation', data?.message || 'Failed to stop smart irrigation.');
    };

    websocketService.onMessage('OPEN_VALVE_SUCCESS', handleOpenValveSuccess);
    websocketService.onMessage('OPEN_VALVE_FAIL', handleOpenValveFail);
    websocketService.onMessage('CLOSE_VALVE_SUCCESS', handleCloseValveSuccess);
    websocketService.onMessage('CLOSE_VALVE_FAIL', handleCloseValveFail);
    websocketService.onMessage('IRRIGATION_STARTED', handleIrrigationStarted);
    websocketService.onMessage('IRRIGATE_SUCCESS', handleIrrigatePlantSuccess);
    websocketService.onMessage('IRRIGATE_FAIL', handleIrrigatePlantFail);
    websocketService.onMessage('IRRIGATE_SKIPPED', handleIrrigatePlantSkipped);
    websocketService.onMessage('IRRIGATION_SKIPPED', handleIrrigatePlantSkipped);  // Handle both message types
    websocketService.onMessage('IRRIGATION_COMPLETE', handleIrrigationComplete);
    websocketService.onMessage('STOP_IRRIGATION_SUCCESS', handleStopIrrigationSuccess);
    websocketService.onMessage('STOP_IRRIGATION_FAIL', handleStopIrrigationFail);

    return () => {
      websocketService.offMessage('OPEN_VALVE_SUCCESS', handleOpenValveSuccess);
      websocketService.offMessage('OPEN_VALVE_FAIL', handleOpenValveFail);
      websocketService.offMessage('CLOSE_VALVE_SUCCESS', handleCloseValveSuccess);
      websocketService.offMessage('CLOSE_VALVE_FAIL', handleCloseValveFail);
      websocketService.offMessage('IRRIGATION_STARTED', handleIrrigationStarted);
      websocketService.offMessage('IRRIGATE_SUCCESS', handleIrrigatePlantSuccess);
      websocketService.offMessage('IRRIGATE_FAIL', handleIrrigatePlantFail);
      websocketService.offMessage('IRRIGATE_SKIPPED', handleIrrigatePlantSkipped);
      websocketService.offMessage('IRRIGATION_SKIPPED', handleIrrigatePlantSkipped);  // Handle both message types
      websocketService.offMessage('IRRIGATION_COMPLETE', handleIrrigationComplete);
      websocketService.offMessage('STOP_IRRIGATION_SUCCESS', handleStopIrrigationSuccess);
      websocketService.offMessage('STOP_IRRIGATION_FAIL', handleStopIrrigationFail);
    };
  }, []); // Empty dependency array - no infinite loop

  const value = {
    // State
    wateringPlants,
    getPlantWateringState,
    getWateringPlants,
    isAnyPlantWatering,
    
    // Functions
    startManualIrrigation,
    startSmartIrrigation,
    handleStopWatering,
    pauseTimer,
    resumeTimer,
    resetTimer,
    formatTime,
  };

  return (
    <IrrigationContext.Provider value={value}>
      {children}
    </IrrigationContext.Provider>
  );
};
