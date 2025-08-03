/**
 * Onboarding Image Component - Placeholder for Onboarding Illustrations
 * 
 * This component provides placeholder illustrations for the onboarding screens.
 * It creates simple, themed illustrations that match the Smart Garden app's
 * green/nature aesthetic until actual images are provided.
 */

import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Feather } from '@expo/vector-icons';

const OnboardingImage = ({ type, size = 200, color = '#4CAF50' }) => {
  /**
   * Render different illustrations based on type
   * @param {string} type - Type of illustration to render
   * @returns {JSX.Element} The illustration component
   */
  const renderIllustration = () => {
    switch (type) {
      case 'grow':
        return (
          <View style={[styles.illustration, { width: size, height: size }]}>
            <View style={styles.plantContainer}>
              <View style={styles.pot}>
                <View style={styles.potTop} />
                <View style={styles.potBody} />
              </View>
              <View style={styles.plant}>
                <View style={styles.leaf1} />
                <View style={styles.leaf2} />
                <View style={styles.leaf3} />
                <View style={styles.stem} />
              </View>
            </View>
            <Feather name="sun" size={size * 0.15} color={color} style={styles.sun} />
          </View>
        );
      
      case 'monitor':
        return (
          <View style={[styles.illustration, { width: size, height: size }]}>
            <View style={styles.phoneContainer}>
              <View style={styles.phone}>
                <View style={styles.screen}>
                  <View style={styles.appIcon} />
                  <View style={styles.dataBar} />
                  <View style={styles.dataBar} />
                  <View style={styles.dataBar} />
                </View>
              </View>
            </View>
            <View style={styles.sensorContainer}>
              <View style={styles.sensor} />
              <View style={styles.sensor} />
              <View style={styles.sensor} />
            </View>
          </View>
        );
      
      case 'notify':
        return (
          <View style={[styles.illustration, { width: size, height: size }]}>
            <View style={styles.notificationContainer}>
              <View style={styles.bell}>
                <View style={styles.bellBody} />
                <View style={styles.bellClapper} />
              </View>
              <View style={styles.notificationDot} />
            </View>
            <View style={styles.calendarContainer}>
              <View style={styles.calendar}>
                <View style={styles.calendarHeader} />
                <View style={styles.calendarBody}>
                  <View style={styles.calendarDay} />
                  <View style={styles.calendarDay} />
                  <View style={styles.calendarDay} />
                </View>
              </View>
            </View>
          </View>
        );
      
      default:
        return (
          <View style={[styles.illustration, { width: size, height: size }]}>
            <Feather name="leaf" size={size * 0.3} color={color} />
          </View>
        );
    }
  };

  return renderIllustration();
};

const styles = StyleSheet.create({
  illustration: {
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  // Grow illustration styles
  plantContainer: {
    position: 'relative',
    alignItems: 'center',
  },
  pot: {
    position: 'relative',
  },
  potTop: {
    width: 80,
    height: 20,
    backgroundColor: '#8D6E63',
    borderRadius: 40,
  },
  potBody: {
    width: 60,
    height: 40,
    backgroundColor: '#8D6E63',
    borderRadius: 30,
    marginTop: -10,
  },
  plant: {
    position: 'absolute',
    bottom: 50,
    alignItems: 'center',
  },
  stem: {
    width: 8,
    height: 60,
    backgroundColor: '#4CAF50',
    borderRadius: 4,
  },
  leaf1: {
    position: 'absolute',
    top: 10,
    left: -20,
    width: 30,
    height: 20,
    backgroundColor: '#66BB6A',
    borderRadius: 15,
    transform: [{ rotate: '-30deg' }],
  },
  leaf2: {
    position: 'absolute',
    top: 20,
    right: -15,
    width: 25,
    height: 15,
    backgroundColor: '#66BB6A',
    borderRadius: 12,
    transform: [{ rotate: '45deg' }],
  },
  leaf3: {
    position: 'absolute',
    top: 35,
    left: -10,
    width: 20,
    height: 12,
    backgroundColor: '#66BB6A',
    borderRadius: 10,
    transform: [{ rotate: '-15deg' }],
  },
  sun: {
    position: 'absolute',
    top: 20,
    right: 20,
  },
  // Monitor illustration styles
  phoneContainer: {
    position: 'relative',
  },
  phone: {
    width: 120,
    height: 200,
    backgroundColor: '#2C3E50',
    borderRadius: 20,
    padding: 10,
  },
  screen: {
    flex: 1,
    backgroundColor: '#ECF0F1',
    borderRadius: 10,
    padding: 15,
    alignItems: 'center',
  },
  appIcon: {
    width: 40,
    height: 40,
    backgroundColor: '#4CAF50',
    borderRadius: 8,
    marginBottom: 20,
  },
  dataBar: {
    width: '100%',
    height: 8,
    backgroundColor: '#BDC3C7',
    borderRadius: 4,
    marginBottom: 8,
  },
  sensorContainer: {
    position: 'absolute',
    right: -30,
    top: 50,
  },
  sensor: {
    width: 12,
    height: 12,
    backgroundColor: '#4CAF50',
    borderRadius: 6,
    marginBottom: 10,
  },
  // Notify illustration styles
  notificationContainer: {
    position: 'relative',
  },
  bell: {
    position: 'relative',
  },
  bellBody: {
    width: 60,
    height: 60,
    backgroundColor: '#4CAF50',
    borderRadius: 30,
    borderBottomLeftRadius: 5,
    borderBottomRightRadius: 5,
  },
  bellClapper: {
    position: 'absolute',
    bottom: -5,
    left: 25,
    width: 10,
    height: 15,
    backgroundColor: '#FF9800',
    borderRadius: 5,
  },
  notificationDot: {
    position: 'absolute',
    top: -5,
    right: -5,
    width: 20,
    height: 20,
    backgroundColor: '#F44336',
    borderRadius: 10,
  },
  calendarContainer: {
    position: 'absolute',
    bottom: 20,
    right: 20,
  },
  calendar: {
    width: 80,
    height: 60,
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  calendarHeader: {
    height: 20,
    backgroundColor: '#4CAF50',
    borderTopLeftRadius: 8,
    borderTopRightRadius: 8,
  },
  calendarBody: {
    flex: 1,
    flexDirection: 'row',
    padding: 5,
  },
  calendarDay: {
    flex: 1,
    height: 8,
    backgroundColor: '#E0E0E0',
    marginHorizontal: 2,
    borderRadius: 2,
  },
});

export default OnboardingImage; 