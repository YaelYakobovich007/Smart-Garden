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
  // Track plants we've already notified as skipped to avoid duplicate alerts
  const skipAlertedPlantIdsRef = useRef(new Set());
  // Track recently stopped plants to suppress subsequent IRRIGATE_FAIL popups
  const recentlyStoppedRef = useRef(new Map()); // plantId -> timestamp(ms)
  const STOP_SUPPRESSION_MS = 5000; // suppress fail popups within 5s of a stop

  // Update ref whenever state changes
  useEffect(() => {
    wateringPlantsRef.current = new Map(wateringPlants);
  }, [wateringPlants]);

  // Helpers to mark and check recent stops
  const markRecentlyStopped = (plantId) => {
    if (plantId == null) return;
    const now = Date.now();
    recentlyStoppedRef.current.set(plantId, now);
    // Auto-clean after window
    setTimeout(() => {
      const ts = recentlyStoppedRef.current.get(plantId);
      if (ts && Date.now() - ts >= STOP_SUPPRESSION_MS) {
        recentlyStoppedRef.current.delete(plantId);
      }
    }, STOP_SUPPRESSION_MS + 200);
  };

  const wasRecentlyStopped = (plantId) => {
    const now = Date.now();
    if (plantId != null) {
      const ts = recentlyStoppedRef.current.get(plantId);
      if (ts && now - ts < STOP_SUPPRESSION_MS) return true;
    }
    // Fallback: if we can't resolve plant id, suppress if any stop was very recent
    for (const ts of recentlyStoppedRef.current.values()) {
      if (now - ts < STOP_SUPPRESSION_MS) return true;
    }
    return false;
  };

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
      timerInterval: null,
      currentMode: null
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
        timerInterval: null,
        irrigationSessionId: null,
        currentMode: null
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

  // Rehydrate irrigation state for a list of plants fetched from server
  const rehydrateFromPlants = (plantsArray) => {
    if (!Array.isArray(plantsArray)) return;
    plantsArray.forEach((p) => {
      const plantId = Number(p?.id ?? p?.plant_id);
      if (!plantId) return;
      const mode = (p?.irrigation_mode || '').toLowerCase();
      const startAt = p?.irrigation_start_at ? new Date(p.irrigation_start_at).getTime() : null;
      const endAt = p?.irrigation_end_at ? new Date(p.irrigation_end_at).getTime() : null;
      const sessionId = p?.irrigation_session_id || null;
      if (mode === 'manual' && endAt && Date.now() < endAt) {
        const remainingSeconds = Math.max(0, Math.ceil((endAt - Date.now()) / 1000));
        updatePlantWateringState(plantId, {
          isManualMode: true,
          isSmartMode: false,
          isWateringActive: true,
          wateringTimeLeft: remainingSeconds,
          timerStartTime: startAt,
          timerEndTime: endAt,
          pendingValveRequest: false,
          currentPlant: p?.name || null,
          irrigationSessionId: null
        });
      } else if (mode === 'smart') {
        updatePlantWateringState(plantId, {
          isManualMode: false,
          isSmartMode: true,
          isWateringActive: true,
          pendingIrrigationRequest: false,
          currentPlant: p?.name || null,
          irrigationSessionId: sessionId || null
        });
      }
    });
  };

  // Programmatically mark a plant as started watering (used by broadcasts)
  const rehydrateIrrigationStarted = (plantId, mode = 'smart', durationMinutes = null) => {
    if (plantId == null) return;
    const now = Date.now();
    if (String(mode).toLowerCase() === 'manual') {
      const minutes = Number(durationMinutes || 0);
      const endAt = minutes > 0 ? now + minutes * 60 * 1000 : null;
      const remainingSeconds = endAt ? Math.max(0, Math.ceil((endAt - now) / 1000)) : 0;
      updatePlantWateringState(Number(plantId), {
        isManualMode: true,
        isSmartMode: false,
        isWateringActive: true,
        wateringTimeLeft: remainingSeconds,
        timerStartTime: now,
        timerEndTime: endAt,
        pendingValveRequest: false,
        pendingIrrigationRequest: false,
      });
    } else {
      updatePlantWateringState(Number(plantId), {
        isManualMode: false,
        isSmartMode: true,
        isWateringActive: true,
        pendingIrrigationRequest: false,
      });
    }
  };

  // Programmatically mark a plant as stopped watering (used by broadcasts)
  const rehydrateIrrigationStopped = (plantId) => {
    if (plantId == null) return;
    updatePlantWateringState(Number(plantId), {
      isManualMode: false,
      isSmartMode: false,
      isWateringActive: false,
      pendingIrrigationRequest: false,
      wateringTimeLeft: 0,
      timerStartTime: null,
      timerEndTime: null,
      timerInterval: null,
      currentPlant: null,
    });
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
      isManualMode: false, // set true only after valve actually opens
      selectedTime: timeMinutes,
      pendingValveRequest: true,
      currentPlant: plant.name // Store the plant name string for consistent stop handling
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
      
      // First clear any existing state
      updatePlantWateringState(plantId, {
        isManualMode: false,
        isSmartMode: false,
        isWateringActive: false,
        wateringTimeLeft: 0,
        timerStartTime: null,
        timerEndTime: null,
        timerInterval: null,
        currentPlant: null
      });
      
      // Then set the pending state
      setTimeout(() => {
        updatePlantWateringState(plantId, {
          isSmartMode: true,
          pendingIrrigationRequest: true,
          currentPlant: plant.name  // Store just the plant name string
        });
      }, 0);

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
    
    // Get plant name from state before clearing
    const isSmartIrrigation = state.isSmartMode;
    const plantName = state.currentPlant;  // currentPlant is the plant name string
    
    console.log('🛑 Stopping irrigation:', { plantId, plantName, state });
    // Mark this plant as recently stopped right away to suppress any in-flight IRRIGATE_FAIL
    markRecentlyStopped(plantId);
    
    // Clear all states immediately
    updatePlantWateringState(plantId, {
      isWateringActive: false,
      isManualMode: false,
      isSmartMode: false,
      wateringTimeLeft: 0,
      timerStartTime: null,
      timerEndTime: null,
      timerInterval: null,
      pendingIrrigationRequest: false,
      currentPlant: null
    });
    
    // Send appropriate stop message based on irrigation type
    if (plantName || plantId) {
      if (isSmartIrrigation) {
        // For smart irrigation, send STOP_IRRIGATION message
        console.log('🛑 Stopping smart irrigation for plant:', plantName);
        const payload = { type: 'STOP_IRRIGATION' };
        if (plantName) payload.plantName = plantName;
        if (plantId) payload.plantId = plantId;
        websocketService.sendMessage(payload);
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

  // Restart valve for a plant (attempt to clear blocked state)
  const restartValve = (plant) => {
    if (!plant?.name || plant?.valve_blocked == null) {
      Alert.alert('Restart Valve', 'Invalid plant selection');
      return;
    }
    if (!websocketService.isConnected()) {
      Alert.alert('Restart Valve', 'Not connected to server. Please try again.');
      return;
    }
    // Mark pending to disable actions (store in watering state map)
    updatePlantWateringState(plant.id, { pendingValveRequest: true });
    websocketService.sendMessage({ type: 'RESTART_VALVE', plantName: plant.name });
  };

  // WebSocket message handlers
  useEffect(() => {
    // Helper: resolve plant id prioritizing sessionId
    const resolveTargetPlantId = (sessionId, plantIdFromPayload, plantName) => {
      if (sessionId) {
        let found = null;
        wateringPlantsRef.current.forEach((state, pid) => {
          if (found == null && state.irrigationSessionId && state.irrigationSessionId === sessionId) {
            found = pid;
          }
        });
        if (found != null) return found;
      }
      if (plantIdFromPayload != null) return Number(plantIdFromPayload);
      if (plantName) {
        let foundByName = null;
        wateringPlantsRef.current.forEach((state, pid) => {
          if (foundByName == null && state.currentPlant === plantName) {
            foundByName = pid;
          }
        });
        if (foundByName != null) return foundByName;
      }
      return null;
    };

    const handleIrrigationDecision = (data) => {
      // Clear the "checking" loader when a decision is made
      const payload = data?.data || data;
      const plantIdFromServer = payload?.plant_id != null ? Number(payload?.plant_id) : null;
      const willIrrigate = payload?.will_irrigate;
      const sessionId = payload?.sessionId || payload?.session_id || null;

      let targetPlantId = resolveTargetPlantId(sessionId, plantIdFromServer, null);

      // Fallback: if plant id is missing, pick the one currently pending
      if (targetPlantId == null) {
        wateringPlantsRef.current.forEach((state, plantId) => {
          if (targetPlantId == null && state.pendingIrrigationRequest) {
            targetPlantId = plantId;
          }
        });
      }

      if (targetPlantId != null) {
        if (willIrrigate === false) {
          // Not needed → clear all smart irrigation UI state immediately
          updatePlantWateringState(targetPlantId, {
            isManualMode: false,
            isSmartMode: false,
            isWateringActive: false,
            pendingIrrigationRequest: false,
            wateringTimeLeft: 0,
            timerStartTime: null,
            timerEndTime: null,
            timerInterval: null,
            currentPlant: null,
            irrigationSessionId: null
          });

          // Show a clear user message and mark as notified to avoid duplicate alert on IRRIGATE_SKIPPED
          skipAlertedPlantIdsRef.current.add(targetPlantId);
          Alert.alert('Smart Irrigation', 'Irrigation is not required at this time.');
        } else {
          // Will irrigate → stop showing the checking loader; wait for IRRIGATION_STARTED
          updatePlantWateringState(targetPlantId, {
            pendingIrrigationRequest: false,
            irrigationSessionId: sessionId || wateringPlantsRef.current.get(targetPlantId)?.irrigationSessionId || null
          });
        }
      }
    };

    const handleOpenValveSuccess = (data) => {
      // Valve opened successfully
      // Prefer explicit plantId from payload
      const payload = data?.data || data;
      let targetPlantId = payload?.plantId != null ? Number(payload.plantId) : null;
      // Fallback: find any plant with pendingValveRequest
      if (targetPlantId == null) {
        wateringPlantsRef.current.forEach((state, plantId) => {
          if (state.pendingValveRequest) {
            targetPlantId = plantId;
          }
        });
      }
      
      if (targetPlantId) {
        const state = wateringPlantsRef.current.get(targetPlantId);
        if (state && state.pendingValveRequest) {
          const now = Date.now();
          const durationMinutes = Number(payload?.valve_data?.duration_minutes || state.selectedTime || 0);
          const durationMs = durationMinutes * 60 * 1000;
          
          updatePlantWateringState(targetPlantId, {
            timerStartTime: now,
            timerEndTime: now + durationMs,
            wateringTimeLeft: durationMinutes * 60,
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
      
      const payload = data?.data || data;
      const sessionId = payload?.sessionId || payload?.session_id || null;
      const plantName = payload?.plantName;
      const pidFromPayload = payload?.plantId != null ? Number(payload.plantId) : null;
      let targetPlantId = resolveTargetPlantId(sessionId, pidFromPayload, plantName);
      
      if (targetPlantId) {
        console.log('🚰 IrrigationContext: Setting isWateringActive: true for plant ID:', targetPlantId);
        // First clear the pending request to hide the loader
        updatePlantWateringState(targetPlantId, {
          pendingIrrigationRequest: false,
          irrigationSessionId: sessionId || wateringPlantsRef.current.get(targetPlantId)?.irrigationSessionId || null
        });
        
        // Then in the next tick, update the irrigation state
        setTimeout(() => {
          updatePlantWateringState(targetPlantId, {
            isSmartMode: true,               // Keep smart mode
            isWateringActive: true,          // Show irrigation overlay
            currentPlant: plantName || data.plantName     // Store plant name string
          });
        }, 0);
        
        console.log('🚰 IrrigationContext: Loading indicator should disappear, irrigation overlay should appear');
      } else {
        console.log('🚰 IrrigationContext: No target plant found for IRRIGATION_STARTED');
      }
    };

    const handleIrrigatePlantSuccess = (data) => {
      // Smart irrigation completed successfully
      console.log('🌿 Irrigation success:', data);
      const sessionId = data?.sessionId || data?.session_id || data?.result?.session_id;
      const plantIdFromPayload = data?.result?.plant_id ?? data?.plantId ?? data?.plant_id;
      const plantName = data?.plantName;

      // Try multiple ways to find the target plant
      let targetPlantId = resolveTargetPlantId(sessionId, plantIdFromPayload ?? null, plantName);

      // 1. Try by plant ID from payload
      if (targetPlantId == null) {
        // 2. Try by plant name if provided
        if (plantName) {
          wateringPlantsRef.current.forEach((state, plantId) => {
            if (state.currentPlant === plantName) {
              targetPlantId = plantId;
            }
          });
        }

        // 3. Try finding any smart-and-active plant
        if (targetPlantId == null) {
          wateringPlantsRef.current.forEach((state, plantId) => {
            if (state.isSmartMode && state.isWateringActive) {
              targetPlantId = plantId;
            }
          });
        }

        // 4. Last resort: find any plant in smart mode
        if (targetPlantId == null) {
          wateringPlantsRef.current.forEach((state, plantId) => {
            if (state.isSmartMode) {
              targetPlantId = plantId;
            }
          });
        }
      }

      console.log('🌿 Found target plant ID:', targetPlantId);

      // Clear state for the target plant
      if (targetPlantId != null) {
        console.log('🌿 Clearing irrigation state for plant:', targetPlantId);
        updatePlantWateringState(targetPlantId, {
          isManualMode: false,
          isSmartMode: false,
          isWateringActive: false,
          pendingIrrigationRequest: false,
          wateringTimeLeft: 0,
          timerStartTime: null,
          timerEndTime: null,
          timerInterval: null,
          currentPlant: null,
          irrigationSessionId: null
        });
      } else {
        // Failsafe: clear any plants that might be stuck
        console.log('🌿 No target plant found, checking for stuck plants...');
        wateringPlantsRef.current.forEach((state, plantId) => {
          if (state.isSmartMode || state.isWateringActive) {
            console.log('🌿 Found stuck plant:', plantId);
            updatePlantWateringState(plantId, {
              isManualMode: false,
              isSmartMode: false,
              isWateringActive: false,
              pendingIrrigationRequest: false,
              wateringTimeLeft: 0,
              timerStartTime: null,
              timerEndTime: null,
              timerInterval: null,
              currentPlant: null,
              irrigationSessionId: null
            });
          }
        });
      }

      Alert.alert('Smart Irrigation', data?.message || 'Smart irrigation completed successfully!');
    };

    const handleIrrigatePlantFail = (data) => {
      // Smart irrigation failed
      // Prefer reason over message (server sendError uses 'reason')
      const failureMessage = data?.message || data?.reason || 'Smart irrigation failed.';
      const sessionId = data?.sessionId || data?.session_id || data?.result?.session_id;

      // Try to identify a specific plant; if not, clear any active smart watering
      let anyCleared = false;
      let targetPlantId = resolveTargetPlantId(sessionId, null, null);
      if (targetPlantId == null) {
        wateringPlantsRef.current.forEach((state, plantId) => {
          if (targetPlantId == null && state.pendingIrrigationRequest) {
            targetPlantId = plantId;
          }
        });
      }

      if (wasRecentlyStopped(targetPlantId)) {
        console.log('🛑 Suppressing IRRIGATE_FAIL after recent STOP_IRRIGATION_SUCCESS:', data);
        return;
      }

      if (targetPlantId != null) {
        updatePlantWateringState(targetPlantId, {
          isSmartMode: false,
          isWateringActive: false,
          pendingIrrigationRequest: false,
          wateringTimeLeft: 0,
          timerStartTime: null,
          timerEndTime: null,
          timerInterval: null,
          currentPlant: null,
          irrigationSessionId: null
        });
        anyCleared = true;
      }

      // Failsafe: ensure no overlays/icons remain if we couldn't map the plant
      if (!anyCleared) {
        wateringPlantsRef.current.forEach((state, plantId) => {
          if (state.isSmartMode || state.isWateringActive || state.pendingIrrigationRequest) {
            updatePlantWateringState(plantId, {
              isSmartMode: false,
              isWateringActive: false,
              pendingIrrigationRequest: false,
              wateringTimeLeft: 0,
              timerStartTime: null,
              timerEndTime: null,
              timerInterval: null,
              currentPlant: null,
              irrigationSessionId: null
            });
          }
        });
      }

      Alert.alert('Smart Irrigation', failureMessage);
    };

    const handleValveBlocked = (data) => {
      const message = data?.message || 'The valve has been blocked. Irrigation has been stopped.';
      // Clear any active watering UI across plants to ensure overlays/icons disappear
      let clearedAny = false;
      wateringPlantsRef.current.forEach((state, plantId) => {
        if (state.isSmartMode || state.isWateringActive || state.pendingIrrigationRequest || state.pendingValveRequest) {
          updatePlantWateringState(plantId, {
            isManualMode: false,
            isSmartMode: false,
            isWateringActive: false,
            pendingIrrigationRequest: false,
            pendingValveRequest: false,
            wateringTimeLeft: 0,
            timerStartTime: null,
            timerEndTime: null,
            timerInterval: null,
            currentPlant: null
          });
          clearedAny = true;
        }
      });
      Alert.alert('Valve Blocked', message);
    };

    const handleIrrigatePlantSkipped = (data) => {
      // Smart irrigation was skipped (not necessary)
      console.log('🔄 IrrigationContext: Irrigation skipped:', data);
      const sessionId = data?.sessionId || data?.session_id;
      
      // Find the plant by name in the watering plants
      let targetPlantId = resolveTargetPlantId(sessionId, null, null);
      if (targetPlantId == null) {
        wateringPlantsRef.current.forEach((state, plantId) => {
          if (targetPlantId == null && (state.pendingIrrigationRequest || state.isSmartMode)) {
            targetPlantId = plantId;
          }
        });
      }
      
      if (targetPlantId) {
        console.log('🔄 IrrigationContext: Clearing irrigation state for skipped irrigation, plant ID:', targetPlantId);
        
        // Clear all irrigation states immediately
        updatePlantWateringState(targetPlantId, {
          isManualMode: false,
          isSmartMode: false,
          isWateringActive: false,
          pendingIrrigationRequest: false,
          wateringTimeLeft: 0,
          timerStartTime: null,
          timerEndTime: null,
          timerInterval: null,
          currentPlant: null,
          irrigationSessionId: null
        });
        
        console.log('🔄 IrrigationContext: State cleared - overlay should disappear');
        
        // Avoid duplicate alert if we already showed the decision message
        const alreadyNotified = skipAlertedPlantIdsRef.current.has(targetPlantId);
        if (alreadyNotified) {
          // Cleanup the marker for future cycles
          skipAlertedPlantIdsRef.current.delete(targetPlantId);
        } else {
          // Show alert for user feedback after a short delay to ensure UI has updated
          setTimeout(() => {
            Alert.alert('Smart Irrigation', data?.message || 'Irrigation was skipped - not necessary at this time.');
          }, 100);
        }
      } else {
        console.log('🔄 IrrigationContext: No target plant found for skipped irrigation');
      }
    };

    const handleIrrigationComplete = (data) => {
      // Smart irrigation completed (user notification)
      console.log('🌿 Irrigation complete:', data);
      const plantName = data?.plantName;
      const plantIdFromPayload = data?.result?.plant_id ?? data?.plantId ?? data?.plant_id;

      // Try multiple ways to find the target plant
      let targetPlantId = plantIdFromPayload ?? null;

      // 1. Try by plant ID from payload
      if (targetPlantId == null) {
        // 2. Try by plant name from IRRIGATION_STARTED
        if (plantName) {
          wateringPlantsRef.current.forEach((state, plantId) => {
            if (state.currentPlant === plantName) {
              targetPlantId = plantId;
            }
          });
        }

        // 3. Try finding any smart-and-active plant
        if (targetPlantId == null) {
          wateringPlantsRef.current.forEach((state, plantId) => {
            if (state.isSmartMode && state.isWateringActive) {
              targetPlantId = plantId;
            }
          });
        }

        // 4. Last resort: find any plant in smart mode
        if (targetPlantId == null) {
          wateringPlantsRef.current.forEach((state, plantId) => {
            if (state.isSmartMode) {
              targetPlantId = plantId;
            }
          });
        }
      }

      console.log('🌿 Found target plant ID:', targetPlantId);

      // Clear state for the target plant
      if (targetPlantId != null) {
        console.log('🌿 Clearing irrigation state for plant:', targetPlantId);
        updatePlantWateringState(targetPlantId, {
          isManualMode: false,
          isSmartMode: false,
          isWateringActive: false,
          pendingIrrigationRequest: false,
          wateringTimeLeft: 0,
          timerStartTime: null,
          timerEndTime: null,
          timerInterval: null,
          currentPlant: null
        });
      } else {
        // Failsafe: clear any plants that might be stuck
        console.log('🌿 No target plant found, checking for stuck plants...');
        wateringPlantsRef.current.forEach((state, plantId) => {
          if (state.isSmartMode || state.isWateringActive) {
            console.log('🌿 Found stuck plant:', plantId);
            updatePlantWateringState(plantId, {
              isManualMode: false,
              isSmartMode: false,
              isWateringActive: false,
              pendingIrrigationRequest: false,
              wateringTimeLeft: 0,
              timerStartTime: null,
              timerEndTime: null,
              timerInterval: null,
              currentPlant: null
            });
          }
        });
      }

      Alert.alert('Smart Irrigation', data?.message || 'Smart irrigation completed successfully!');
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
        const prevState = wateringPlantsRef.current.get(targetPlantId);
        updatePlantWateringState(targetPlantId, {
          isSmartMode: false,
          isWateringActive: false,
          pendingIrrigationRequest: false,
          currentPlant: null
        });
        // Mark this plant as recently stopped to suppress cancellation failures
        markRecentlyStopped(targetPlantId);

        // Show specific message if a scheduled run was stopped
        const wasScheduled = prevState?.currentMode === 'scheduled';
        if (wasScheduled) {
          Alert.alert('Scheduled Irrigation', 'Scheduled irrigation was stopped for today. It will run again on the next scheduled day.');
        } else {
          Alert.alert('Smart Irrigation', data?.message || 'Smart irrigation stopped successfully!');
        }
        // Clear stored mode
        updatePlantWateringState(targetPlantId, { currentMode: null });
      }
      
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
    // Store session id on acceptance so we can correlate later events
    const handleIrrigationAccepted = (msg) => {
      const payload = msg?.data || msg;
      const pid = payload?.plantId != null ? Number(payload.plantId) : null;
      const sessionId = payload?.sessionId;
      if (pid != null && sessionId) {
        updatePlantWateringState(pid, { irrigationSessionId: sessionId });
      }
    };

    websocketService.onMessage('IRRIGATION_REQUEST_ACCEPTED', handleIrrigationAccepted);
    websocketService.onMessage('IRRIGATION_STARTED', handleIrrigationStarted);
    websocketService.onMessage('IRRIGATE_SUCCESS', handleIrrigatePlantSuccess);
    websocketService.onMessage('IRRIGATE_FAIL', handleIrrigatePlantFail);
    websocketService.onMessage('IRRIGATE_SKIPPED', handleIrrigatePlantSkipped);
    websocketService.onMessage('IRRIGATION_SKIPPED', handleIrrigatePlantSkipped);  // Handle both message types
    websocketService.onMessage('IRRIGATION_DECISION', handleIrrigationDecision);
    websocketService.onMessage('IRRIGATION_COMPLETE', handleIrrigationComplete);
    websocketService.onMessage('STOP_IRRIGATION_SUCCESS', handleStopIrrigationSuccess);
    websocketService.onMessage('STOP_IRRIGATION_FAIL', handleStopIrrigationFail);
    websocketService.onMessage('VALVE_BLOCKED', handleValveBlocked);

    // Garden-wide broadcasts (scheduled/manual/smart started/stopped)
    const handleGardenIrrigationStarted = (message) => {
      const payload = message?.data || message;
      const pid = payload?.plantId != null ? Number(payload.plantId) : null;
      const mode = payload?.mode || 'smart';
      const duration = payload?.duration_minutes || null;
      const plantName = payload?.plantName || null;
      const sessionId = payload?.sessionId || payload?.session_id || null;
      if (pid != null) {
        // Store mode so Stop can show specific messaging for scheduled case
        updatePlantWateringState(pid, {
          currentMode: String(mode).toLowerCase(),
          currentPlant: plantName || null,
          irrigationSessionId: sessionId || null,
        });
        rehydrateIrrigationStarted(pid, mode, duration);
      }
    };
    const handleGardenIrrigationStopped = (message) => {
      const payload = message?.data || message;
      const pid = payload?.plantId != null ? Number(payload.plantId) : null;
      if (pid != null) rehydrateIrrigationStopped(pid);
    };
    websocketService.onMessage('GARDEN_IRRIGATION_STARTED', handleGardenIrrigationStarted);
    websocketService.onMessage('GARDEN_IRRIGATION_STOPPED', handleGardenIrrigationStopped);

    // Restart valve responses
    const handleRestartValveSuccess = (msg) => {
      const payload = msg?.data || msg;
      const pid = payload?.plantId != null ? Number(payload.plantId) : null;
      if (pid != null) {
        updatePlantWateringState(pid, {
          pendingValveRequest: false,
          // ensure any overlay is not shown
          isManualMode: false,
          isSmartMode: false,
          isWateringActive: false,
          wateringTimeLeft: 0,
          timerStartTime: null,
          timerEndTime: null,
          timerInterval: null,
          currentPlant: null
        });
      }
      Alert.alert('Restart Valve', payload?.message || 'Valve restarted successfully.');
    };

    const handleRestartValveFail = (msg) => {
      const reason = msg?.reason || msg?.message || 'Failed to restart valve';
      // Clear pending on any plant that was marked
      wateringPlantsRef.current.forEach((state, plantId) => {
        if (state.pendingValveRequest) {
          updatePlantWateringState(plantId, { pendingValveRequest: false });
        }
      });
      Alert.alert('Restart Valve', reason);
    };

    websocketService.onMessage('RESTART_VALVE_SUCCESS', handleRestartValveSuccess);
    websocketService.onMessage('RESTART_VALVE_FAIL', handleRestartValveFail);

    return () => {
      websocketService.offMessage('OPEN_VALVE_SUCCESS', handleOpenValveSuccess);
      websocketService.offMessage('OPEN_VALVE_FAIL', handleOpenValveFail);
      websocketService.offMessage('CLOSE_VALVE_SUCCESS', handleCloseValveSuccess);
      websocketService.offMessage('CLOSE_VALVE_FAIL', handleCloseValveFail);
      websocketService.offMessage('IRRIGATION_REQUEST_ACCEPTED', handleIrrigationAccepted);
      websocketService.offMessage('IRRIGATION_STARTED', handleIrrigationStarted);
      websocketService.offMessage('IRRIGATE_SUCCESS', handleIrrigatePlantSuccess);
      websocketService.offMessage('IRRIGATE_FAIL', handleIrrigatePlantFail);
      websocketService.offMessage('IRRIGATE_SKIPPED', handleIrrigatePlantSkipped);
      websocketService.offMessage('IRRIGATION_SKIPPED', handleIrrigatePlantSkipped);  // Handle both message types
      websocketService.offMessage('IRRIGATION_DECISION', handleIrrigationDecision);
      websocketService.offMessage('IRRIGATION_COMPLETE', handleIrrigationComplete);
      websocketService.offMessage('STOP_IRRIGATION_SUCCESS', handleStopIrrigationSuccess);
      websocketService.offMessage('STOP_IRRIGATION_FAIL', handleStopIrrigationFail);
      websocketService.offMessage('VALVE_BLOCKED', handleValveBlocked);
      websocketService.offMessage('GARDEN_IRRIGATION_STARTED', handleGardenIrrigationStarted);
      websocketService.offMessage('GARDEN_IRRIGATION_STOPPED', handleGardenIrrigationStopped);
      websocketService.offMessage('RESTART_VALVE_SUCCESS', handleRestartValveSuccess);
      websocketService.offMessage('RESTART_VALVE_FAIL', handleRestartValveFail);
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
    restartValve,
    pauseTimer,
    resumeTimer,
    resetTimer,
    formatTime,
    rehydrateFromPlants,
    rehydrateIrrigationStarted,
    rehydrateIrrigationStopped,
  };

  return (
    <IrrigationContext.Provider value={value}>
      {children}
    </IrrigationContext.Provider>
  );
};
