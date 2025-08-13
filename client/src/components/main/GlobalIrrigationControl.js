import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useIrrigation } from '../../contexts/IrrigationContext';

/**
 * Global Irrigation Control Component
 * Shows on main screen when irrigation is active, allowing global control
 */
const GlobalIrrigationControl = () => {
  const {
    isWateringActive,
    wateringTimeLeft,
    isManualMode,
    currentPlant,
    formatTime,
    handleStopWatering,
    pauseTimer,
    resumeTimer,
  } = useIrrigation();

  // Only show if irrigation is active
  if (!isManualMode && !isWateringActive) {
    return null;
  }

  return (
    <View style={styles.container}>
      <View style={styles.content}>
        {/* Plant Info */}
        <View style={styles.plantInfo}>
          <Feather name="droplet" size={20} color="#3B82F6" />
          <Text style={styles.plantName}>
            {currentPlant?.name || 'Plant'} Irrigation
          </Text>
        </View>

        {/* Timer Display */}
        <View style={styles.timerContainer}>
          <Text style={styles.timerText}>{formatTime(wateringTimeLeft)}</Text>
          <Text style={styles.timerLabel}>
            {isWateringActive ? 'Time remaining' : 'Timer paused'}
          </Text>
        </View>

        {/* Control Buttons */}
        <View style={styles.controls}>
          {isWateringActive ? (
            <TouchableOpacity style={styles.pauseButton} onPress={pauseTimer}>
              <Feather name="pause" size={16} color="#FFFFFF" />
              <Text style={styles.buttonText}>Pause</Text>
            </TouchableOpacity>
          ) : wateringTimeLeft > 0 ? (
            <TouchableOpacity style={styles.resumeButton} onPress={resumeTimer}>
              <Feather name="play" size={16} color="#FFFFFF" />
              <Text style={styles.buttonText}>Resume</Text>
            </TouchableOpacity>
          ) : null}

          <TouchableOpacity style={styles.stopButton} onPress={handleStopWatering}>
            <Feather name="square" size={16} color="#FFFFFF" />
            <Text style={styles.buttonText}>Stop</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: 20,
    left: 16,
    right: 16,
    zIndex: 1000,
  },
  content: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 8,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  plantInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  plantName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
    marginLeft: 8,
    fontFamily: 'Nunito_600SemiBold',
  },
  timerContainer: {
    alignItems: 'center',
    marginBottom: 16,
  },
  timerText: {
    fontSize: 24,
    fontWeight: '700',
    color: '#3B82F6',
    fontFamily: 'Nunito_700Bold',
  },
  timerLabel: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 4,
    fontFamily: 'Nunito_400Regular',
  },
  controls: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 12,
  },
  pauseButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F59E0B',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    gap: 6,
  },
  resumeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#10B981',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    gap: 6,
  },
  stopButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#EF4444',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    gap: 6,
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
    fontFamily: 'Nunito_600SemiBold',
  },
});

export default GlobalIrrigationControl;
