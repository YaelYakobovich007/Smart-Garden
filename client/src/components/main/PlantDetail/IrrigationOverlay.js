import React, { useEffect, useRef } from 'react';
import { View, Text, Animated, StyleSheet, TouchableOpacity } from 'react-native';
import { Feather } from '@expo/vector-icons';

/**
 * Irrigation Overlay Component
 * Shows animated water drops and blue background when irrigation is active
 */
const IrrigationOverlay = ({ isActive, timeLeft, onStop }) => {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const dropAnim1 = useRef(new Animated.Value(-50)).current;
  const dropAnim2 = useRef(new Animated.Value(-50)).current;
  const dropAnim3 = useRef(new Animated.Value(-50)).current;

  useEffect(() => {
    if (isActive) {
      // Fade in the overlay
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 500,
        useNativeDriver: true,
      }).start();

      // Start water drop animations
      const animateDrops = () => {
        // Drop 1
        Animated.sequence([
          Animated.timing(dropAnim1, {
            toValue: 800,
            duration: 2000,
            useNativeDriver: true,
          }),
          Animated.timing(dropAnim1, {
            toValue: -50,
            duration: 0,
            useNativeDriver: true,
          }),
        ]).start();

        // Drop 2 (delayed)
        setTimeout(() => {
          Animated.sequence([
            Animated.timing(dropAnim2, {
              toValue: 800,
              duration: 2000,
              useNativeDriver: true,
            }),
            Animated.timing(dropAnim2, {
              toValue: -50,
              duration: 0,
              useNativeDriver: true,
            }),
          ]).start();
        }, 800);

        // Drop 3 (delayed)
        setTimeout(() => {
          Animated.sequence([
            Animated.timing(dropAnim3, {
              toValue: 800,
              duration: 2000,
              useNativeDriver: true,
            }),
            Animated.timing(dropAnim3, {
              toValue: -50,
              duration: 0,
              useNativeDriver: true,
            }),
          ]).start();
        }, 1600);
      };

      animateDrops();
      const dropInterval = setInterval(animateDrops, 2400);
      return () => clearInterval(dropInterval);
    } else {
      // Fade out the overlay
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }).start();
    }
  }, [isActive, fadeAnim, dropAnim1, dropAnim2, dropAnim3]);

  if (!isActive) return null;

  const formatTime = (seconds) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  return (
    <Animated.View style={[styles.overlay, { opacity: fadeAnim }]}>
      {/* Blue background */}
      <View style={styles.background} />
      
      {/* Water drops */}
      <Animated.View style={[styles.drop, styles.drop1, { transform: [{ translateY: dropAnim1 }] }]}>
        <Feather name="droplet" size={24} color="#3B82F6" />
      </Animated.View>
      
      <Animated.View style={[styles.drop, styles.drop2, { transform: [{ translateY: dropAnim2 }] }]}>
        <Feather name="droplet" size={20} color="#60A5FA" />
      </Animated.View>
      
      <Animated.View style={[styles.drop, styles.drop3, { transform: [{ translateY: dropAnim3 }] }]}>
        <Feather name="droplet" size={18} color="#93C5FD" />
      </Animated.View>

            {/* Combined status and control bar */}
      <View style={styles.combinedBar} pointerEvents="box-none">
        {/* Status section */}
        <View style={styles.statusSection}>
                     <View style={styles.statusLeft}>
             <Feather name="droplet" size={20} color="#FFFFFF" />
             <Text style={styles.statusText}>Irrigation in Progress</Text>
           </View>
          {timeLeft > 0 && (
            <Text style={styles.statusTimer}>{formatTime(timeLeft)}</Text>
          )}
        </View>
        
                 {/* Control section */}
         <View style={styles.controlSection}>
           <TouchableOpacity 
             style={[styles.controlButton, styles.stopButton]} 
             onPress={onStop}
             activeOpacity={0.7}
           >
             <Feather name="square" size={20} color="#FFFFFF" />
             <Text style={styles.controlButtonText}>Stop</Text>
           </TouchableOpacity>
         </View>
      </View>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 1000,
    pointerEvents: 'none', // This makes the overlay non-blocking
  },
  background: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'transparent', // No background overlay
  },
  drop: {
    position: 'absolute',
    top: 0,
  },
  drop1: {
    left: '20%',
  },
  drop2: {
    left: '50%',
  },
  drop3: {
    left: '80%',
  },
  combinedBar: {
    position: 'absolute',
    top: 100, // Position below the header
    left: 20,
    right: 20,
    backgroundColor: '#FFFFFF', // White background
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderRadius: 16,
    shadowColor: '#3B82F6',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 8,
    borderWidth: 1,
    borderColor: '#E3F2FD',
  },
  statusSection: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  statusLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statusText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1E40AF', // Blue text
    marginLeft: 8,
    fontFamily: 'Nunito_600SemiBold',
  },
  statusTimer: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1E40AF', // Blue text
    fontFamily: 'Nunito_700Bold',
  },
  controlSection: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  controlButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#3B82F6', // Darker blue background for better visibility
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 10,
    minWidth: 80,
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#1E40AF',
  },
  stopButton: {
    backgroundColor: '#EF4444', // Red background for stop button
    borderColor: '#DC2626',
  },
  controlButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF', // White text for better contrast
    marginLeft: 6,
    fontFamily: 'Nunito_600SemiBold',
  },
});

export default IrrigationOverlay;
