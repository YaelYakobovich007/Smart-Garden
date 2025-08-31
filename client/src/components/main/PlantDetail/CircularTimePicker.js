import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Dimensions,
  TouchableOpacity,
  Modal,
  PanResponder,
} from 'react-native';
import Svg, { Circle, Path } from 'react-native-svg';
import { Feather } from '@expo/vector-icons';

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

const CircularTimePicker = ({ 
  visible, 
  onClose, 
  onTimeSelected, 
  initialTime = 60,
  // Clock-style: 60 at top, then ascending 5..55 clockwise back to 60
  timeOptions = [60, 5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55]
}) => {
  const [selectedDuration, setSelectedDuration] = useState(initialTime === 0 ? 60 : initialTime);
  const [isDragging, setIsDragging] = useState(false);

  const circleRadius = 120;
  const centerX = 160;
  const centerY = 160;

  // Place 60 at the top (-90 degrees), advance clockwise by equal segments
  const BASE_ANGLE = -90; // degrees (top)
  const getAngleFromDuration = (duration) => {
    const index = Math.max(0, timeOptions.indexOf(duration));
    return BASE_ANGLE + (index * (360 / timeOptions.length));
  };

  const getDurationFromAngle = (angle) => {
    const segmentSize = 360 / timeOptions.length;
    // Normalize so that BASE_ANGLE maps to index 0
    let normalized = (angle - BASE_ANGLE) % 360;
    normalized = (normalized + 360) % 360;
    const segmentIndex = Math.round(normalized / segmentSize) % timeOptions.length;
    return timeOptions[segmentIndex];
  };

  const updateDurationFromTouch = (x, y) => {
    const angle = Math.atan2(y - centerY, x - centerX) * (180 / Math.PI);
    const newDuration = getDurationFromAngle(angle);
    setSelectedDuration(newDuration);
  };

  const panResponder = PanResponder.create({
    onStartShouldSetPanResponder: () => true,
    onMoveShouldSetPanResponder: () => true,
    onPanResponderGrant: (evt) => {
      setIsDragging(true);
      const { locationX, locationY } = evt.nativeEvent;
      updateDurationFromTouch(locationX, locationY);
    },
    onPanResponderMove: (evt) => {
      const { locationX, locationY } = evt.nativeEvent;
      updateDurationFromTouch(locationX, locationY);
    },
    onPanResponderRelease: () => {
      setIsDragging(false);
    },
  });

  const formatDuration = (minutes) => {
    if (minutes >= 60) return '60m';
    if (minutes % 5 === 0) return `${minutes}m`;
    return `${minutes}m`;
  };

  const handleStartTimer = () => {
    // No explicit 0; 60 acts as the top like a regular clock
    onTimeSelected(selectedDuration);
    onClose();
  };

  // Reset selection each time the modal opens
  useEffect(() => {
    if (visible) {
      // Start with no selection (0) so the dial shows only the base circle
      setSelectedDuration(0);
    }
  }, [visible, initialTime]);

  const renderCircularPicker = () => {
    const angle = getAngleFromDuration(selectedDuration);
    const radian = (angle * Math.PI) / 180;
    const handleX = Math.cos(radian) * circleRadius + centerX;
    const handleY = Math.sin(radian) * circleRadius + centerY;

    // Selection arc path
    const startAngle = BASE_ANGLE;
    const endAngle = getAngleFromDuration(selectedDuration);
    const startRadian = (startAngle * Math.PI) / 180;
    const endRadian = (endAngle * Math.PI) / 180;
    
    const startX = centerX + Math.cos(startRadian) * circleRadius;
    const startY = centerY + Math.sin(startRadian) * circleRadius;
    const endX = centerX + Math.cos(endRadian) * circleRadius;
    const endY = centerY + Math.sin(endRadian) * circleRadius;
    
    let angleDiff = endAngle - startAngle;
    if (angleDiff < 0) angleDiff += 360;
    
    const largeArcFlag = angleDiff > 180 ? 1 : 0;
    
    const pathData = [
      `M ${centerX} ${centerY}`,
      `L ${startX} ${startY}`,
      `A ${circleRadius} ${circleRadius} 0 ${largeArcFlag} 1 ${endX} ${endY}`,
      'Z'
    ].join(' ');

    return (
      <View style={styles.circularPicker} {...panResponder.panHandlers}>
        <View style={styles.outerCircle} />
        
        {/* Time markers and labels (60 at top, descending clockwise) */}
        {timeOptions.map((time, index) => {
          const markerAngle = BASE_ANGLE + (index * (360 / timeOptions.length));
          const markerRadian = (markerAngle * Math.PI) / 180;
          const markerRadius = 130;
          const markerX = Math.cos(markerRadian) * markerRadius + centerX;
          const markerY = Math.sin(markerRadian) * markerRadius + centerY;
          
          const labelRadius = 105;
          const labelX = Math.cos(markerRadian) * labelRadius + centerX;
          const labelY = Math.sin(markerRadian) * labelRadius + centerY;
          
          return (
            <View key={time}>
              <View
                style={[
                  styles.timeMarker,
                  {
                    left: markerX - 4,
                    top: markerY - 4,
                  }
                ]}
              />
              <Text
                style={[
                  styles.timeLabel,
                  {
                    left: labelX - 12,
                    top: labelY - 6,
                  }
                ]}
              >
                {formatDuration(time)}
              </Text>
            </View>
          );
        })}
        
        {/* Selection arc - show for any selected duration */}
        {selectedDuration > 0 && (
          <Svg style={styles.svgOverlay} width={320} height={320}>
            <Path
              d={pathData}
              fill="rgba(76, 175, 80, 0.15)"
              stroke="#4CAF50"
              strokeWidth="2"
            />
          </Svg>
        )}
        
        {/* Full circle for 1 hour (60 minutes) */}
        {selectedDuration === 60 && (
          <Svg style={styles.svgOverlay} width={320} height={320}>
            <Circle
              cx="160"
              cy="160"
              r="120"
              fill="rgba(76, 175, 80, 0.15)"
              stroke="#4CAF50"
              strokeWidth="2"
            />
          </Svg>
        )}
        
        {/* Draggable handle - only show if a valid time is selected */}
        {selectedDuration > 0 && (
          <View
            style={[
              styles.handle,
              {
                left: handleX - 16,
                top: handleY - 16,
                backgroundColor: isDragging ? '#43A047' : '#4CAF50',
                transform: [{ scale: isDragging ? 1.25 : 1 }],
              }
            ]}
          >
            <View style={styles.handleInner} />
          </View>
        )}
        
        {/* Center indicator */}
        <View style={styles.centerIndicator}>
          <Feather name="clock" size={20} color="#FFFFFF" />
        </View>
      </View>
    );
  };

  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <TouchableOpacity
            style={styles.closeButton}
            onPress={onClose}
          >
            <Text style={styles.closeButtonText}>✕</Text>
          </TouchableOpacity>
          
          <View style={styles.modalHeader}>
            <View style={styles.iconContainer}>
              <Feather name="clock" size={28} color="#4CAF50" />
            </View>
            <Text style={styles.modalTitle}>Set Timer</Text>
            <Text style={styles.modalSubtitle}>Drag the handle to select your desired duration</Text>
          </View>
          
          {renderCircularPicker()}
          
                      <View style={styles.durationDisplay}>
              {selectedDuration === 0 ? (
                <>
                  <Text style={[styles.durationText, { color: '#6b7280' }]}>Select a time</Text>
                  <Text style={styles.durationLabel}>Drag the handle to choose duration</Text>
                </>
              ) : (
                <>
                  <Text style={styles.durationText}>{formatDuration(selectedDuration)}</Text>
                  <Text style={styles.durationLabel}>Selected duration</Text>
                </>
              )}
            </View>
          
                      <TouchableOpacity 
              style={[
                styles.startButton, 
                selectedDuration === 0 && styles.disabledButton
              ]} 
              onPress={handleStartTimer}
              disabled={selectedDuration === 0}
            >
              <Text style={[
                styles.startButtonText,
                selectedDuration === 0 && styles.disabledButtonText
              ]}>
                {selectedDuration === 0 ? 'Select a time first' : 'Start Timer'}
              </Text>
            </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  modalContent: {
    backgroundColor: 'white',
    borderRadius: 24,
    padding: 32,
    width: '100%',
    maxWidth: 400,
    position: 'relative',
  },
  closeButton: {
    position: 'absolute',
    top: 16,
    right: 16,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#f3f4f6',
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeButtonText: {
    fontSize: 16,
    color: '#6b7280',
  },
  modalHeader: {
    alignItems: 'center',
    marginBottom: 32,
  },
  iconContainer: {
    width: 64,
    height: 64,
    borderRadius: 32,
    // Soft green tint using the app's green
    backgroundColor: 'rgba(76, 175, 80, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#111827',
    marginBottom: 8,
    fontFamily: 'Nunito_700Bold',
  },
  modalSubtitle: {
    fontSize: 16,
    color: '#6b7280',
    textAlign: 'center',
    fontFamily: 'Nunito_400Regular',
  },
  circularPicker: {
    width: 320,
    height: 320,
    alignSelf: 'center',
    marginBottom: 32,
    position: 'relative',
  },
  outerCircle: {
    position: 'absolute',
    width: 320,
    height: 320,
    borderRadius: 160,
    borderWidth: 8,
    borderColor: '#f3f4f6',
    backgroundColor: 'white',
  },
  timeMarker: {
    position: 'absolute',
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#d1d5db',
  },
  timeLabel: {
    position: 'absolute',
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    width: 24,
    textAlign: 'center',
    lineHeight: 14,
    fontFamily: 'Nunito_600SemiBold',
  },
  svgOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
  },
  handle: {
    position: 'absolute',
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 4,
    borderColor: 'white',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  handleInner: {
    flex: 1,
    borderRadius: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    margin: 2,
  },
  centerIndicator: {
    position: 'absolute',
    top: 136,
    left: 136,
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#4CAF50',
    borderWidth: 0,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 4,
  },
  durationDisplay: {
    alignItems: 'center',
    marginBottom: 24,
  },
  durationText: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#111827',
    marginBottom: 4,
    fontFamily: 'Nunito_700Bold',
  },
  durationLabel: {
    fontSize: 14,
    color: '#6b7280',
    fontFamily: 'Nunito_400Regular',
  },
  startButton: {
    backgroundColor: '#4CAF50',
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 12,
    alignItems: 'center',
  },
  startButtonText: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
    fontFamily: 'Nunito_700Bold',
  },
  disabledButton: {
    backgroundColor: '#d1d5db',
  },
  disabledButtonText: {
    color: '#9ca3af',
  },
});

export default CircularTimePicker; 